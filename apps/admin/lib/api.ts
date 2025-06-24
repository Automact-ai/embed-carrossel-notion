import axios from 'axios'
import type { 
  Carousel, 
  CarouselStats, 
  CreateCarouselData, 
  UpdateCarouselData, 
  PaginatedCarousels 
} from './types'

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-api-domain.com' 
  : 'http://localhost:3001'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Interceptor para logs de debug
api.interceptors.request.use((config) => {
  console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`)
  return config
})

api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.status} ${response.config.url}`)
    return response
  },
  (error) => {
    console.error(`❌ API Error: ${error.response?.status} ${error.config?.url}`, error.response?.data)
    return Promise.reject(error)
  }
)

export const carouselApi = {
  // Listar carrosséis
  getCarousels: async (page = 1, limit = 10): Promise<PaginatedCarousels> => {
    const response = await api.get(`/api/carousels?page=${page}&limit=${limit}`)
    return response.data
  },

  // Buscar carrossel específico
  getCarousel: async (id: string): Promise<Carousel> => {
    const response = await api.get(`/api/carousels/${id}`)
    return response.data
  },

  // Criar carrossel
  createCarousel: async (data: CreateCarouselData, images: File[]): Promise<Carousel> => {
    const formData = new FormData()
    formData.append('title', data.title)
    if (data.caption) {
      formData.append('caption', data.caption)
    }
    
    images.forEach((image) => {
      formData.append('images', image)
    })

    const response = await api.post('/api/carousels', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    
    return response.data.carousel
  },

  // Atualizar carrossel
  updateCarousel: async (id: string, data: UpdateCarouselData): Promise<Carousel> => {
    const response = await api.put(`/api/carousels/${id}`, data)
    return response.data.carousel
  },

  // Deletar carrossel
  deleteCarousel: async (id: string): Promise<void> => {
    await api.delete(`/api/carousels/${id}`)
  },

  // Adicionar imagens ao carrossel
  addImages: async (id: string, images: File[]): Promise<Carousel> => {
    const formData = new FormData()
    images.forEach((image) => {
      formData.append('images', image)
    })

    const response = await api.post(`/api/carousels/${id}/images`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    
    return response.data.carousel
  },

  // Remover imagem específica
  removeImage: async (carouselId: string, imageId: string): Promise<void> => {
    await api.delete(`/api/carousels/${carouselId}/images/${imageId}`)
  },

  // Reordenar imagens
  reorderImages: async (id: string, imageUpdates: Array<{id: string, order: number}>): Promise<Carousel> => {
    const response = await api.put(`/api/carousels/${id}/images/reorder`, {
      imageUpdates
    })
    return response.data.carousel
  },

  // Buscar estatísticas
  getStats: async (id: string): Promise<CarouselStats> => {
    const response = await api.get(`/api/carousels/${id}/stats`)
    return response.data
  }
}

// Utilitários para URLs de imagens
export const getImageUrl = (filename: string, type: 'original' | 'optimized' | 'thumbnail' = 'optimized') => {
  const baseUrl = API_BASE_URL
  
  if (type === 'original') {
    return `${baseUrl}/uploads/${filename}`
  }
  
  const ext = filename.split('.').pop()
  const nameWithoutExt = filename.replace(`.${ext}`, '')
  
  if (type === 'thumbnail') {
    return `${baseUrl}/uploads/${nameWithoutExt}-thumb.webp`
  }
  
  // optimized
  return `${baseUrl}/uploads/${nameWithoutExt}-optimized.webp`
}

export default api 