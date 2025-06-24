import { create } from 'zustand'
import type { AppState, Carousel } from './types'

export const useCarouselStore = create<AppState>((set, get) => ({
  carousels: [],
  currentCarousel: null,
  loading: false,
  error: null,

  setCarousels: (carousels) => set({ carousels }),
  
  setCurrentCarousel: (carousel) => set({ currentCarousel: carousel }),
  
  setLoading: (loading) => set({ loading }),
  
  setError: (error) => set({ error }),
  
  addCarousel: (carousel) => set((state) => ({
    carousels: [carousel, ...state.carousels]
  })),
  
  updateCarousel: (id, data) => set((state) => ({
    carousels: state.carousels.map(carousel => 
      carousel.id === id ? { ...carousel, ...data } : carousel
    ),
    currentCarousel: state.currentCarousel?.id === id 
      ? { ...state.currentCarousel, ...data }
      : state.currentCarousel
  })),
  
  removeCarousel: (id) => set((state) => ({
    carousels: state.carousels.filter(carousel => carousel.id !== id),
    currentCarousel: state.currentCarousel?.id === id ? null : state.currentCarousel
  }))
}))

// Hook personalizado para ações assíncronas
export const useCarouselActions = () => {
  const store = useCarouselStore()
  
  return {
    ...store,
    
    // Wrapper para operações que precisam de loading/error handling
    withLoading: async <T>(operation: () => Promise<T>): Promise<T | null> => {
      try {
        store.setLoading(true)
        store.setError(null)
        const result = await operation()
        return result
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
        store.setError(errorMessage)
        return null
      } finally {
        store.setLoading(false)
      }
    }
  }
} 