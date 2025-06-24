export interface CarouselImage {
  id: string
  filename: string
  originalName: string
  mimeType: string
  size: number
  order: number
  createdAt: string
  carouselId: string
}

export interface Carousel {
  id: string
  title: string
  caption?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  images: CarouselImage[]
  _count: {
    views: number
  }
}

export interface CarouselStats {
  totalViews: number
  viewsToday: number
  viewsThisWeek: number
}

export interface CreateCarouselData {
  title: string
  caption?: string
}

export interface UpdateCarouselData {
  title?: string
  caption?: string
  isActive?: boolean
}

export interface PaginatedCarousels {
  carousels: Carousel[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export interface ApiResponse<T = any> {
  message?: string
  error?: string
  data?: T
}

// Para o upload de imagens
export interface UploadedFile {
  file: File
  preview: string
  id: string
}

// Para o estado do formulário
export interface CarouselFormData {
  title: string
  caption: string
  images: UploadedFile[]
}

// Para o estado da aplicação
export interface AppState {
  carousels: Carousel[]
  currentCarousel: Carousel | null
  loading: boolean
  error: string | null
  
  // Actions
  setCarousels: (carousels: Carousel[]) => void
  setCurrentCarousel: (carousel: Carousel | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  addCarousel: (carousel: Carousel) => void
  updateCarousel: (id: string, data: Partial<Carousel>) => void
  removeCarousel: (id: string) => void
} 