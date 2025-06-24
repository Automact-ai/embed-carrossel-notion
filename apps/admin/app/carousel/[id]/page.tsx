'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Upload, X, Eye, Copy, ExternalLink, Trash2, BarChart3 } from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import toast from 'react-hot-toast'

import { carouselApi, getImageUrl } from '../../../lib/api'
import { useCarouselActions } from '../../../lib/store'
import { formatBytes, formatDate, generateEmbedCode, copyToClipboard } from '../../../lib/utils'
import type { Carousel, CarouselStats, UploadedFile } from '../../../lib/types'

export default function EditCarouselPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { currentCarousel, setCurrentCarousel, updateCarousel, withLoading } = useCarouselActions()
  
  const [formData, setFormData] = useState({
    title: '',
    caption: '',
    isActive: true
  })
  const [newImages, setNewImages] = useState<UploadedFile[]>([])
  const [stats, setStats] = useState<CarouselStats | null>(null)
  const [showEmbed, setShowEmbed] = useState(false)
  const [embedType, setEmbedType] = useState<'iframe' | 'script'>('iframe')

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    maxSize: 5 * 1024 * 1024, // 5MB
    maxFiles: 10 - (currentCarousel?.images.length || 0) - newImages.length,
    onDrop: (acceptedFiles, rejectedFiles) => {
      rejectedFiles.forEach((file) => {
        if (file.errors.some(e => e.code === 'file-too-large')) {
          toast.error(`${file.file.name}: Arquivo muito grande (máx 5MB)`)
        } else if (file.errors.some(e => e.code === 'file-invalid-type')) {
          toast.error(`${file.file.name}: Tipo de arquivo não suportado`)
        }
      })

      const newImgs: UploadedFile[] = acceptedFiles.map(file => ({
        file,
        preview: URL.createObjectURL(file),
        id: Math.random().toString(36).substring(7)
      }))

      setNewImages(prev => [...prev, ...newImgs])
    }
  })

  const loadCarousel = async () => {
    const result = await withLoading(async () => {
      const carousel = await carouselApi.getCarousel(params.id)
      setCurrentCarousel(carousel)
      setFormData({
        title: carousel.title,
        caption: carousel.caption || '',
        isActive: carousel.isActive
      })
      return carousel
    })

    if (!result) {
      toast.error('Carrossel não encontrado')
      router.push('/dashboard')
    }
  }

  const loadStats = async () => {
    try {
      const carouselStats = await carouselApi.getStats(params.id)
      setStats(carouselStats)
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error)
    }
  }

  const handleUpdateBasicInfo = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title.trim()) {
      toast.error('Título é obrigatório')
      return
    }

    const result = await withLoading(async () => {
      const updatedCarousel = await carouselApi.updateCarousel(params.id, {
        title: formData.title.trim(),
        caption: formData.caption.trim() || undefined,
        isActive: formData.isActive
      })
      
      updateCarousel(params.id, updatedCarousel)
      setCurrentCarousel(updatedCarousel)
      return updatedCarousel
    })

    if (result) {
      toast.success('Carrossel atualizado com sucesso!')
    } else {
      toast.error('Erro ao atualizar carrossel')
    }
  }

  const handleAddImages = async () => {
    if (newImages.length === 0) {
      toast.error('Selecione pelo menos uma imagem')
      return
    }

    const result = await withLoading(async () => {
      const updatedCarousel = await carouselApi.addImages(
        params.id,
        newImages.map(img => img.file)
      )
      
      updateCarousel(params.id, updatedCarousel)
      setCurrentCarousel(updatedCarousel)
      return updatedCarousel
    })

    if (result) {
      toast.success('Imagens adicionadas com sucesso!')
      
      // Limpar previews
      newImages.forEach(img => URL.revokeObjectURL(img.preview))
      setNewImages([])
    } else {
      toast.error('Erro ao adicionar imagens')
    }
  }

  const handleRemoveImage = async (imageId: string) => {
    if (!confirm('Tem certeza que deseja remover esta imagem?')) {
      return
    }

    const result = await withLoading(async () => {
      await carouselApi.removeImage(params.id, imageId)
      
      const updatedCarousel = await carouselApi.getCarousel(params.id)
      updateCarousel(params.id, updatedCarousel)
      setCurrentCarousel(updatedCarousel)
      return true
    })

    if (result) {
      toast.success('Imagem removida com sucesso!')
    } else {
      toast.error('Erro ao remover imagem')
    }
  }

  const handleCopyEmbed = async () => {
    try {
      const embedCode = generateEmbedCode(params.id, embedType)
      await copyToClipboard(embedCode)
      toast.success('Código copiado para a área de transferência!')
    } catch (error) {
      toast.error('Erro ao copiar código')
    }
  }

  const removeNewImage = (id: string) => {
    setNewImages(prev => {
      const imageToRemove = prev.find(img => img.id === id)
      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.preview)
      }
      return prev.filter(img => img.id !== id)
    })
  }

  useEffect(() => {
    loadCarousel()
    loadStats()
  }, [params.id])

  if (!currentCarousel) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const totalImages = currentCarousel.images.length + newImages.length

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Editar Carrossel</h1>
            <p className="text-gray-600">Criado em {formatDate(currentCarousel.createdAt)}</p>
          </div>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={() => setShowEmbed(!showEmbed)}
            className="inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
          >
            <Eye className="w-4 h-4 mr-2" />
            {showEmbed ? 'Ocultar' : 'Visualizar'} Embed
          </button>
          
          <a
            href={`http://localhost:3001/embed/${currentCarousel.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Abrir Embed
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Informações básicas */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Informações Básicas</h2>
            
            <form onSubmit={handleUpdateBasicInfo} className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                  Título *
                </label>
                <input
                  type="text"
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Digite o título do carrossel"
                  maxLength={100}
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  {formData.title.length}/100 caracteres
                </p>
              </div>

              <div>
                <label htmlFor="caption" className="block text-sm font-medium text-gray-700 mb-2">
                  Legenda
                </label>
                <textarea
                  id="caption"
                  value={formData.caption}
                  onChange={(e) => setFormData(prev => ({ ...prev, caption: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Digite a legenda do carrossel (opcional)"
                  maxLength={2200}
                />
                <p className="text-sm text-gray-500 mt-1">
                  {formData.caption.length}/2200 caracteres
                </p>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                  Carrossel ativo (visível publicamente)
                </label>
              </div>

              <button
                type="submit"
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Atualizar Informações
              </button>
            </form>
          </div>

          {/* Gerenciar imagens */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Imagens</h2>
              <span className="text-sm text-gray-500">
                {totalImages}/10 imagens
              </span>
            </div>

            {/* Imagens existentes */}
            {currentCarousel.images.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Imagens atuais</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {currentCarousel.images.map((image, index) => (
                    <div key={image.id} className="relative group aspect-square bg-gray-100 rounded-lg overflow-hidden">
                      <img
                        src={getImageUrl(image.filename, 'thumbnail')}
                        alt={image.originalName}
                        className="w-full h-full object-cover"
                      />
                      
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity text-center text-white">
                          <p className="text-xs font-medium">{image.originalName}</p>
                          <p className="text-xs">{formatBytes(image.size)}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleRemoveImage(image.id)}
                        className="absolute top-2 right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>

                      <div className="absolute top-2 left-2 w-6 h-6 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                        {index + 1}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Adicionar novas imagens */}
            {totalImages < 10 && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-700">Adicionar novas imagens</h3>
                
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
                    isDragActive 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <input {...getInputProps()} />
                  <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm font-medium text-gray-900 mb-1">
                    {isDragActive ? 'Solte as imagens aqui' : 'Arraste imagens ou clique para selecionar'}
                  </p>
                  <p className="text-xs text-gray-500">
                    JPEG, PNG, WebP até 5MB cada
                  </p>
                </div>

                {/* Preview das novas imagens */}
                {newImages.length > 0 && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {newImages.map((image, index) => (
                        <div key={image.id} className="relative group aspect-square bg-gray-100 rounded-lg overflow-hidden">
                          <img
                            src={image.preview}
                            alt={`Nova ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity text-center text-white">
                              <p className="text-xs font-medium">{image.file.name}</p>
                              <p className="text-xs">{formatBytes(image.file.size)}</p>
                            </div>
                          </div>

                          <button
                            onClick={() => removeNewImage(image.id)}
                            className="absolute top-2 right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-4 h-4" />
                          </button>

                          <div className="absolute top-2 left-2 w-6 h-6 bg-green-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                            +
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={handleAddImages}
                      className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                    >
                      Adicionar {newImages.length} imagem{newImages.length > 1 ? 's' : ''}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Estatísticas */}
          {stats && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center mb-4">
                <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">Estatísticas</h2>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total de visualizações:</span>
                  <span className="font-medium">{stats.totalViews}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Hoje:</span>
                  <span className="font-medium">{stats.viewsToday}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Esta semana:</span>
                  <span className="font-medium">{stats.viewsThisWeek}</span>
                </div>
              </div>
            </div>
          )}

          {/* Código de embed */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Código de Embed</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de embed:
                </label>
                <select
                  value={embedType}
                  onChange={(e) => setEmbedType(e.target.value as 'iframe' | 'script')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="iframe">Iframe (Recomendado)</option>
                  <option value="script">Script Widget</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Código:
                </label>
                <textarea
                  readOnly
                  value={generateEmbedCode(currentCarousel.id, embedType)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm font-mono resize-none"
                  rows={6}
                />
              </div>

              <button
                onClick={handleCopyEmbed}
                className="w-full inline-flex items-center justify-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copiar Código
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Preview do embed */}
      {showEmbed && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Preview do Embed</h2>
          <div className="border rounded-lg overflow-hidden">
            <iframe
              src={`http://localhost:3001/embed/${currentCarousel.id}`}
              width="100%"
              height="600"
              frameBorder="0"
              className="w-full"
            />
          </div>
        </div>
      )}
    </div>
  )
} 