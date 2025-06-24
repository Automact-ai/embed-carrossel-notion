const express = require('express');
const router = express.Router();

const db = require('../services/database');
const { upload, processImages } = require('../middlewares/upload');
const { 
  validateCreateCarousel, 
  validateUpdateCarousel,
  handleValidationErrors 
} = require('../middlewares/validation');

// GET /api/carousels - Listar carrosséis
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    const result = await db.getCarousels(page, limit);
    res.json(result);
  } catch (error) {
    console.error('Erro ao buscar carrosséis:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/carousels/:id - Buscar carrossel específico
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const carousel = await db.getCarouselById(id);
    
    if (!carousel) {
      return res.status(404).json({ error: 'Carrossel não encontrado' });
    }
    
    res.json(carousel);
  } catch (error) {
    console.error('Erro ao buscar carrossel:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/carousels/:id/stats - Buscar estatísticas do carrossel
router.get('/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar se carrossel existe
    const carousel = await db.getCarouselById(id);
    if (!carousel) {
      return res.status(404).json({ error: 'Carrossel não encontrado' });
    }
    
    const stats = await db.getStats(id);
    res.json(stats);
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/carousels - Criar novo carrossel
router.post('/', upload, processImages, validateCreateCarousel, async (req, res) => {
  try {
    const { title, caption } = req.body;
    
    if (!req.processedFiles || req.processedFiles.length === 0) {
      return res.status(400).json({ error: 'Pelo menos uma imagem é obrigatória' });
    }
    
    // Criar carrossel
    const carousel = await db.createCarousel({
      title,
      caption
    });
    
    // Adicionar imagens
    await db.addImagesToCarousel(carousel.id, req.processedFiles);
    
    // Buscar carrossel completo
    const completeCarousel = await db.getCarouselById(carousel.id);
    
    res.status(201).json({
      message: 'Carrossel criado com sucesso',
      carousel: completeCarousel
    });
  } catch (error) {
    console.error('Erro ao criar carrossel:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/carousels/:id - Atualizar carrossel
router.put('/:id', validateUpdateCarousel, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Verificar se carrossel existe
    const existingCarousel = await db.getCarouselById(id);
    if (!existingCarousel) {
      return res.status(404).json({ error: 'Carrossel não encontrado' });
    }
    
    const updatedCarousel = await db.updateCarousel(id, updateData);
    
    res.json({
      message: 'Carrossel atualizado com sucesso',
      carousel: updatedCarousel
    });
  } catch (error) {
    console.error('Erro ao atualizar carrossel:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/carousels/:id/images - Adicionar imagens ao carrossel
router.post('/:id/images', upload, processImages, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar se carrossel existe
    const carousel = await db.getCarouselById(id);
    if (!carousel) {
      return res.status(404).json({ error: 'Carrossel não encontrado' });
    }
    
    // Verificar limite de 10 imagens
    const currentImageCount = carousel.images.length;
    const newImageCount = req.processedFiles ? req.processedFiles.length : 0;
    
    if (currentImageCount + newImageCount > 10) {
      return res.status(400).json({ 
        error: `Limite de 10 imagens excedido. Atual: ${currentImageCount}, tentando adicionar: ${newImageCount}` 
      });
    }
    
    if (!req.processedFiles || req.processedFiles.length === 0) {
      return res.status(400).json({ error: 'Nenhuma imagem foi enviada' });
    }
    
    await db.addImagesToCarousel(id, req.processedFiles);
    
    // Buscar carrossel atualizado
    const updatedCarousel = await db.getCarouselById(id);
    
    res.json({
      message: 'Imagens adicionadas com sucesso',
      carousel: updatedCarousel
    });
  } catch (error) {
    console.error('Erro ao adicionar imagens:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// DELETE /api/carousels/:id/images/:imageId - Remover imagem específica
router.delete('/:id/images/:imageId', async (req, res) => {
  try {
    const { id, imageId } = req.params;
    
    // Verificar se carrossel existe
    const carousel = await db.getCarouselById(id);
    if (!carousel) {
      return res.status(404).json({ error: 'Carrossel não encontrado' });
    }
    
    // Verificar se a imagem pertence ao carrossel
    const imageExists = carousel.images.some(img => img.id === imageId);
    if (!imageExists) {
      return res.status(404).json({ error: 'Imagem não encontrada neste carrossel' });
    }
    
    await db.removeImageFromCarousel(imageId);
    
    res.json({ message: 'Imagem removida com sucesso' });
  } catch (error) {
    console.error('Erro ao remover imagem:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/carousels/:id/images/reorder - Reordenar imagens
router.put('/:id/images/reorder', async (req, res) => {
  try {
    const { id } = req.params;
    const { imageUpdates } = req.body;
    
    if (!Array.isArray(imageUpdates)) {
      return res.status(400).json({ error: 'imageUpdates deve ser um array' });
    }
    
    // Verificar se carrossel existe
    const carousel = await db.getCarouselById(id);
    if (!carousel) {
      return res.status(404).json({ error: 'Carrossel não encontrado' });
    }
    
    await db.reorderImages(imageUpdates);
    
    // Buscar carrossel atualizado
    const updatedCarousel = await db.getCarouselById(id);
    
    res.json({
      message: 'Imagens reordenadas com sucesso',
      carousel: updatedCarousel
    });
  } catch (error) {
    console.error('Erro ao reordenar imagens:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// DELETE /api/carousels/:id - Deletar carrossel
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await db.deleteCarousel(id);
    
    res.json({ message: 'Carrossel deletado com sucesso' });
  } catch (error) {
    if (error.message === 'Carrossel não encontrado') {
      return res.status(404).json({ error: error.message });
    }
    
    console.error('Erro ao deletar carrossel:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router; 