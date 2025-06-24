'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Eye, Edit, Trash2, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'

import { carouselApi, getImageUrl } from '../../lib/api'
import { useCarouselActions } from '../../lib/store'
import { formatDate } from '../../lib/utils'
import type { Carousel } from '../../lib/types'

export default function DashboardPage() {
  const { carousels, loading, error, setCarousels, removeCarousel, withLoading } = useCarouselActions()
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const loadCarousels = async (page = 1) => {
    const result = await withLoading(async () => {
      const data = await carouselApi.getCarousels(page, 10)
      setCarousels(data.carousels)
      setTotalPages(data.pagination.pages)
      setCurrentPage(page)
      return data
    })
    
    if (!result) {
      toast.error('Erro ao carregar carrosséis')
    }
  }

  const handleDelete = async (carousel: Carousel) => {
    if (!confirm(`Tem certeza que deseja deletar o carrossel "${carousel.title}"?`)) {
      return
    }

    const result = await withLoading(async () => {
      await carouselApi.deleteCarousel(carousel.id)
      removeCarousel(carousel.id)
      return true
    })

    if (result) {
      toast.success('Carrossel deletado com sucesso!')
    } else {
      toast.error('Erro ao deletar carrossel')
    }
  }

  useEffect(() => {
    loadCarousels()
  }, [])

  if (loading && carousels.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Gerencie seus carrosséis embedáveis</p>
        </div>
        <Link
          href="/carousel/new"
          className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Carrossel
        </Link>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Lista de carrosséis */}
      {carousels.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Nenhum carrossel encontrado
          </h3>
          <p className="text-gray-600 mb-6">
            Crie seu primeiro carrossel para começar
          </p>
          <Link
            href="/carousel/new"
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Criar Primeiro Carrossel
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {carousels.map((carousel) => (
            <div key={carousel.id} className="bg-white rounded-lg shadow border hover:shadow-md transition-shadow">
              {/* Preview da primeira imagem */}
              <div className="aspect-square relative overflow-hidden rounded-t-lg bg-gray-100">
                {carousel.images[0] ? (
                  <img
                    src={getImageUrl(carousel.images[0].filename, 'thumbnail')}
                    alt={carousel.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    <div className="text-center">
                      <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-gray-200 flex items-center justify-center">
                        <Plus className="w-6 h-6" />
                      </div>
                      <p className="text-sm">Sem imagens</p>
                    </div>
                  </div>
                )}
                
                {/* Badge de contagem de imagens */}
                {carousel.images.length > 1 && (
                  <div className="absolute top-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                    {carousel.images.length} fotos
                  </div>
                )}

                {/* Badge de status */}
                <div className={`absolute top-2 left-2 text-xs px-2 py-1 rounded ${
                  carousel.isActive 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {carousel.isActive ? 'Ativo' : 'Inativo'}
                </div>
              </div>

              {/* Conteúdo */}
              <div className="p-4">
                <h3 className="font-semibold text-lg text-gray-900 mb-2 truncate">
                  {carousel.title}
                </h3>
                
                {carousel.caption && (
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                    {carousel.caption}
                  </p>
                )}

                <div className="flex items-center text-sm text-gray-500 mb-4">
                  <Eye className="w-4 h-4 mr-1" />
                  <span>{carousel._count.views} visualizações</span>
                  <span className="mx-2">•</span>
                  <span>{formatDate(carousel.createdAt)}</span>
                </div>

                {/* Ações */}
                <div className="flex space-x-2">
                  <Link
                    href={`/carousel/${carousel.id}`}
                    className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Editar
                  </Link>
                  
                  <a
                    href={`http://localhost:3001/embed/${carousel.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-md transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  
                  <button
                    onClick={() => handleDelete(carousel)}
                    className="inline-flex items-center justify-center px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 text-sm font-medium rounded-md transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex justify-center space-x-2 mt-8">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => loadCarousels(page)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                page === currentPage
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {page}
            </button>
          ))}
        </div>
      )}
    </div>
  )
} 