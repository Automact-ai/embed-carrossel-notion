const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

class DatabaseService {
  // Criar carrossel
  async createCarousel(data) {
    return await prisma.carousel.create({
      data,
      include: {
        images: {
          orderBy: { order: 'asc' }
        },
        _count: {
          select: { views: true }
        }
      }
    });
  }

  // Buscar todos os carrosséis
  async getCarousels(page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    
    const [carousels, total] = await Promise.all([
      prisma.carousel.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          images: {
            orderBy: { order: 'asc' },
            take: 1 // Apenas primeira imagem para preview
          },
          _count: {
            select: { views: true }
          }
        }
      }),
      prisma.carousel.count()
    ]);

    return {
      carousels,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  // Buscar carrossel por ID
  async getCarouselById(id) {
    return await prisma.carousel.findUnique({
      where: { id },
      include: {
        images: {
          orderBy: { order: 'asc' }
        },
        _count: {
          select: { views: true }
        }
      }
    });
  }

  // Atualizar carrossel
  async updateCarousel(id, data) {
    return await prisma.carousel.update({
      where: { id },
      data,
      include: {
        images: {
          orderBy: { order: 'asc' }
        },
        _count: {
          select: { views: true }
        }
      }
    });
  }

  // Deletar carrossel
  async deleteCarousel(id) {
    // Primeiro buscar as imagens para deletar os arquivos físicos
    const carousel = await prisma.carousel.findUnique({
      where: { id },
      include: { images: true }
    });

    if (!carousel) {
      throw new Error('Carrossel não encontrado');
    }

    // Deletar arquivos físicos
    for (const image of carousel.images) {
      const filesToDelete = [
        path.join(__dirname, '../../uploads', image.filename),
        path.join(__dirname, '../../uploads', image.filename.replace(path.extname(image.filename), '-optimized.webp')),
        path.join(__dirname, '../../uploads', image.filename.replace(path.extname(image.filename), '-thumb.webp'))
      ];

      filesToDelete.forEach(filePath => {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
    }

    // Deletar do banco (cascade delete cuida das imagens)
    return await prisma.carousel.delete({
      where: { id }
    });
  }

  // Adicionar imagens ao carrossel
  async addImagesToCarousel(carouselId, images) {
    const imageData = images.map((image, index) => ({
      carouselId,
      filename: image.filename,
      originalName: image.originalname,
      mimeType: image.mimetype,
      size: image.size,
      order: index
    }));

    return await prisma.carouselImage.createMany({
      data: imageData
    });
  }

  // Remover imagem do carrossel
  async removeImageFromCarousel(imageId) {
    const image = await prisma.carouselImage.findUnique({
      where: { id: imageId }
    });

    if (!image) {
      throw new Error('Imagem não encontrada');
    }

    // Deletar arquivos físicos
    const filesToDelete = [
      path.join(__dirname, '../../uploads', image.filename),
      path.join(__dirname, '../../uploads', image.filename.replace(path.extname(image.filename), '-optimized.webp')),
      path.join(__dirname, '../../uploads', image.filename.replace(path.extname(image.filename), '-thumb.webp'))
    ];

    filesToDelete.forEach(filePath => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });

    return await prisma.carouselImage.delete({
      where: { id: imageId }
    });
  }

  // Reordenar imagens
  async reorderImages(imageUpdates) {
    const updatePromises = imageUpdates.map(({ id, order }) =>
      prisma.carouselImage.update({
        where: { id },
        data: { order }
      })
    );

    return await Promise.all(updatePromises);
  }

  // Registrar visualização
  async recordView(carouselId, viewData) {
    return await prisma.carouselView.create({
      data: {
        carouselId,
        ...viewData
      }
    });
  }

  // Buscar estatísticas
  async getStats(carouselId) {
    const [totalViews, viewsToday, viewsThisWeek] = await Promise.all([
      prisma.carouselView.count({
        where: { carouselId }
      }),
      prisma.carouselView.count({
        where: {
          carouselId,
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      }),
      prisma.carouselView.count({
        where: {
          carouselId,
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      })
    ]);

    return {
      totalViews,
      viewsToday,
      viewsThisWeek
    };
  }
}

module.exports = new DatabaseService(); 