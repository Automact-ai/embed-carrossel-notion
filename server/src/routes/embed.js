const express = require('express');
const router = express.Router();
const path = require('path');

const db = require('../services/database');

// GET /embed/:id - Servir dados do carrossel para o widget
router.get('/:id/data', async (req, res) => {
  try {
    const { id } = req.params;
    
    const carousel = await db.getCarouselById(id);
    
    if (!carousel || !carousel.isActive) {
      return res.status(404).json({ error: 'Carrossel não encontrado ou inativo' });
    }
    
    // Registrar visualização (opcional, só se quiser analytics)
    const viewData = {
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      referer: req.get('Referer')
    };
    
    // Não aguardar o registro da view para não atrasar a resposta
    db.recordView(id, viewData).catch(console.error);
    
    // Preparar dados para o widget
    const widgetData = {
      id: carousel.id,
      title: carousel.title,
      caption: carousel.caption,
      images: carousel.images.map(image => ({
        id: image.id,
        url: `/uploads/${image.filename}`,
        optimizedUrl: `/uploads/${image.filename.replace(path.extname(image.filename), '-optimized.webp')}`,
        thumbnailUrl: `/uploads/${image.filename.replace(path.extname(image.filename), '-thumb.webp')}`,
        originalName: image.originalName
      }))
    };
    
    // Headers para permitir embed cross-origin
    res.set({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Cache-Control': 'public, max-age=300', // Cache por 5 minutos
      'Content-Type': 'application/json'
    });
    
    res.json(widgetData);
    
  } catch (error) {
    console.error('Erro ao buscar dados do embed:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /embed/:id - Servir iframe do carrossel (alternativa ao widget JS)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const carousel = await db.getCarouselById(id);
    
    if (!carousel || !carousel.isActive) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Carrossel não encontrado</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background: #f5f5f5;
            }
            .error {
              text-align: center;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="error">
            <h3>Carrossel não encontrado</h3>
            <p>Este carrossel pode ter sido removido ou está inativo.</p>
          </div>
        </body>
        </html>
      `);
    }
    
    // Registrar visualização
    const viewData = {
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      referer: req.get('Referer')
    };
    
    db.recordView(id, viewData).catch(console.error);
    
    // HTML do iframe com o carrossel
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>${carousel.title}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: #fff;
            overflow: hidden;
          }
          
          .carousel-container {
            position: relative;
            width: 100%;
            max-width: 614px;
            margin: 0 auto;
            background: #fff;
            border: 1px solid #dbdbdb;
            border-radius: 8px;
            overflow: hidden;
          }
          
          .carousel-header {
            padding: 16px;
            border-bottom: 1px solid #efefef;
          }
          
          .carousel-title {
            font-weight: 600;
            font-size: 14px;
            line-height: 18px;
            color: #262626;
          }
          
          .carousel-images-wrapper {
            position: relative;
            width: 100%;
            aspect-ratio: 1;
            overflow: hidden;
            background: #000;
          }
          
          .carousel-images {
            position: relative;
            width: 100%;
            height: 100%;
            display: flex;
            transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
          }
          
          .carousel-slide {
            position: relative;
            width: 100%;
            height: 100%;
            flex-shrink: 0;
          }
          
          .carousel-slide img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
          }
          
          .carousel-nav {
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            background: rgba(0, 0, 0, 0.3);
            border: none;
            color: white;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
            z-index: 10;
          }
          
          .carousel-nav:hover {
            background: rgba(0, 0, 0, 0.6);
            transform: translateY(-50%) scale(1.1);
          }
          
          .carousel-nav:active {
            transform: translateY(-50%) scale(0.95);
          }
          
          .carousel-nav.prev {
            left: 16px;
          }
          
          .carousel-nav.next {
            right: 16px;
          }
          
          .carousel-nav svg {
            width: 16px;
            height: 16px;
            fill: white;
          }
          
          .carousel-indicators {
            display: flex;
            justify-content: center;
            gap: 4px;
            position: absolute;
            bottom: 16px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 10;
          }
          
          .carousel-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.4);
            cursor: pointer;
            transition: all 0.2s ease;
          }
          
          .carousel-dot.active {
            background: rgba(255, 255, 255, 1);
            transform: scale(1.2);
          }
          
          .carousel-caption {
            padding: 16px;
            font-size: 14px;
            line-height: 18px;
            color: #262626;
            white-space: pre-line;
          }
          
          .hidden {
            display: none !important;
          }
          
          /* Esconder controles quando há apenas uma imagem */
          .single-image .carousel-nav,
          .single-image .carousel-indicators {
            display: none;
          }
        </style>
      </head>
      <body>
        <div class="carousel-container ${carousel.images.length === 1 ? 'single-image' : ''}">
          <div class="carousel-header">
            <div class="carousel-title">${carousel.title}</div>
          </div>
          
          <div class="carousel-images-wrapper">
            <div class="carousel-images" id="carousel-images">
              ${carousel.images.map((image, index) => `
                <div class="carousel-slide" data-index="${index}">
                  <img src="/uploads/${image.filename.replace(path.extname(image.filename), '-optimized.webp')}" 
                       alt="${image.originalName}" 
                       loading="${index === 0 ? 'eager' : 'lazy'}">
                </div>
              `).join('')}
            </div>
            
            ${carousel.images.length > 1 ? `
              <button class="carousel-nav prev" id="prev-btn">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                </svg>
              </button>
              <button class="carousel-nav next" id="next-btn">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z"/>
                </svg>
              </button>
              
              <div class="carousel-indicators">
                ${carousel.images.map((_, index) => `
                  <div class="carousel-dot ${index === 0 ? 'active' : ''}" 
                       data-index="${index}"></div>
                `).join('')}
              </div>
            ` : ''}
          </div>
          
          ${carousel.caption ? `
            <div class="carousel-caption">${carousel.caption}</div>
          ` : ''}
        </div>
        
        <script>
          let currentSlide = 0;
          const totalSlides = ${carousel.images.length};
          const imagesContainer = document.getElementById('carousel-images');
          const dots = document.querySelectorAll('.carousel-dot');
          
          function updateCarouselPosition() {
            const translateX = -currentSlide * 100;
            imagesContainer.style.transform = \`translateX(\${translateX}%)\`;
            
            // Atualizar indicadores
            dots.forEach((dot, index) => {
              dot.classList.toggle('active', index === currentSlide);
            });
          }
          
          function showSlide(index) {
            if (index < 0) {
              currentSlide = totalSlides - 1;
            } else if (index >= totalSlides) {
              currentSlide = 0;
            } else {
              currentSlide = index;
            }
            
            updateCarouselPosition();
          }
          
          function nextSlide() {
            showSlide(currentSlide + 1);
          }
          
          function previousSlide() {
            showSlide(currentSlide - 1);
          }
          
          function goToSlide(index) {
            showSlide(index);
          }
          
          // Adicionar event listeners após o DOM carregar
          document.addEventListener('DOMContentLoaded', function() {
            // Botões de navegação
            const prevBtn = document.getElementById('prev-btn');
            const nextBtn = document.getElementById('next-btn');
            
            if (prevBtn) {
              prevBtn.addEventListener('click', previousSlide);
            }
            
            if (nextBtn) {
              nextBtn.addEventListener('click', nextSlide);
            }
            
            // Indicadores (dots)
            dots.forEach((dot, index) => {
              dot.addEventListener('click', () => goToSlide(index));
            });
          });
          
          // Auto-resize do iframe
          function resizeIframe() {
            const height = document.body.scrollHeight;
            if (window.parent && window.parent.postMessage) {
              window.parent.postMessage({
                type: 'carousel-resize',
                height: height,
                carouselId: '${id}'
              }, '*');
            }
          }
          
          // Redimensionar quando as imagens carregarem
          window.addEventListener('load', resizeIframe);
          
          // Navegação por teclado
          document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') {
              e.preventDefault();
              previousSlide();
            }
            if (e.key === 'ArrowRight') {
              e.preventDefault();
              nextSlide();
            }
          });
          
          // Touch events para mobile
          let startX = null;
          let startY = null;
          let isDragging = false;
          
          imagesContainer.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            isDragging = false;
          }, { passive: true });
          
          imagesContainer.addEventListener('touchmove', (e) => {
            if (!startX || !startY) return;
            
            const currentX = e.touches[0].clientX;
            const currentY = e.touches[0].clientY;
            
            const diffX = Math.abs(currentX - startX);
            const diffY = Math.abs(currentY - startY);
            
            // Se movimento horizontal é maior que vertical, é um swipe
            if (diffX > diffY && diffX > 10) {
              isDragging = true;
              e.preventDefault(); // Previne scroll da página
            }
          }, { passive: false });
          
          imagesContainer.addEventListener('touchend', (e) => {
            if (!startX || !isDragging) return;
            
            const endX = e.changedTouches[0].clientX;
            const diff = startX - endX;
            
            // Threshold mínimo para considerar um swipe
            if (Math.abs(diff) > 50) {
              if (diff > 0) {
                nextSlide();
              } else {
                previousSlide();
              }
            }
            
            startX = null;
            startY = null;
            isDragging = false;
          }, { passive: true });
          
          // Prevenir clique acidental após swipe
          imagesContainer.addEventListener('click', (e) => {
            if (isDragging) {
              e.preventDefault();
              e.stopPropagation();
            }
          });
        </script>
      </body>
      </html>
    `;
    
    res.set({
      'Content-Type': 'text/html; charset=utf-8',
      'X-Frame-Options': 'ALLOWALL',
      'Cache-Control': 'public, max-age=300'
    });
    
    res.send(html);
    
  } catch (error) {
    console.error('Erro ao servir embed:', error);
    res.status(500).send('Erro interno do servidor');
  }
});

module.exports = router; 