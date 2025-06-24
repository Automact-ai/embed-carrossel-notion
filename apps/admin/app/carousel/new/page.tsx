'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Upload, X, Plus } from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import toast from 'react-hot-toast'

import { carouselApi } from '../../../lib/api'
import { useCarouselActions } from '../../../lib/store'
import { formatBytes } from '../../../lib/utils'
import type { UploadedFile } from '../../../lib/types'

export default function NewCarouselPage() {
  const router = useRouter()
  const { addCarousel, withLoading } = useCarouselActions()
  
  const [formData, setFormData] = useState({
    title: '',
    caption: ''
  })
  const [images, setImages] = useState<UploadedFile[]>([])
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    maxSize: 5 * 1024 * 1024, // 5MB
    maxFiles: 10 - images.length,
    onDrop: (acceptedFiles, rejectedFiles) => {
      // Processar arquivos rejeitados
      rejectedFiles.forEach((file) => {
        if (file.errors.some(e => e.code === 'file-too-large')) {
          toast.error(`${file.file.name}: Arquivo muito grande (máx 5MB)`)
        } else if (file.errors.some(e => e.code === 'file-invalid-type')) {
          toast.error(`${file.file.name}: Tipo de arquivo não suportado`)
        }
      })

      // Processar arquivos aceitos
      const newImages: UploadedFile[] = acceptedFiles.map(file => ({
        file,
        preview: URL.createObjectURL(file),
        id: Math.random().toString(36).substring(7)
      }))

      setImages(prev => [...prev, ...newImages])
    }
  })

  const removeImage = (id: string) => {
    setImages(prev => {
      const imageToRemove = prev.find(img => img.id === id)
      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.preview)
      }
      return prev.filter(img => img.id !== id)
    })
  }

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    if (draggedIndex === null) return

    const newImages = [...images]
    const draggedImage = newImages[draggedIndex]
    
    newImages.splice(draggedIndex, 1)
    newImages.splice(dropIndex, 0, draggedImage)
    
    setImages(newImages)
    setDraggedIndex(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title.trim()) {
      toast.error('Título é obrigatório')
      return
    }

    if (images.length === 0) {
      toast.error('Pelo menos uma imagem é obrigatória')
      return
    }

    const result = await withLoading(async () => {
      const carousel = await carouselApi.createCarousel(
        {
          title: formData.title.trim(),
          caption: formData.caption.trim() || undefined
        },
        images.map(img => img.file)
      )
      
      addCarousel(carousel)
      return carousel
    })

    if (result) {
      toast.success('Carrossel criado com sucesso!')
      
      // Limpar previews
      images.forEach(img => URL.revokeObjectURL(img.preview))
      
      router.push('/dashboard')
    } else {
      toast.error('Erro ao criar carrossel')
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Novo Carrossel</h1>
          <p className="text-gray-600">Crie um carrossel embedável estilo Instagram</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Informações básicas */}
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Informações Básicas</h2>
          
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
        </div>

        {/* Upload de imagens */}
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Imagens</h2>
            <span className="text-sm text-gray-500">
              {images.length}/10 imagens
            </span>
          </div>

          {/* Drop zone */}
          {images.length < 10 && (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                isDragActive 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium text-gray-900 mb-2">
                {isDragActive ? 'Solte as imagens aqui' : 'Arraste imagens ou clique para selecionar'}
              </p>
              <p className="text-gray-500">
                JPEG, PNG, WebP até 5MB cada • Máximo 10 imagens
              </p>
            </div>
          )}

          {/* Preview das imagens */}
          {images.length > 0 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Arraste para reordenar as imagens
              </p>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {images.map((image, index) => (
                  <div
                    key={image.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, index)}
                    className="relative group aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-move"
                  >
                    <img
                      src={image.preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Overlay com informações */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity text-center text-white">
                        <p className="text-xs font-medium">{image.file.name}</p>
                        <p className="text-xs">{formatBytes(image.file.size)}</p>
                      </div>
                    </div>

                    {/* Botão de remover */}
                    <button
                      type="button"
                      onClick={() => removeImage(image.id)}
                      className="absolute top-2 right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>

                    {/* Número da ordem */}
                    <div className="absolute top-2 left-2 w-6 h-6 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                      {index + 1}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Botões de ação */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!formData.title.trim() || images.length === 0}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
          >
            Criar Carrossel
          </button>
        </div>
      </form>
    </div>
  )
} 