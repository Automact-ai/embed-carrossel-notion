import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

export function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('pt-BR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function generateEmbedCode(carouselId: string, type: 'iframe' | 'script' = 'iframe') {
  const baseUrl = process.env.NODE_ENV === 'production' 
    ? 'https://your-domain.com' 
    : 'http://localhost:3001'

  if (type === 'iframe') {
    return `<iframe 
  src="${baseUrl}/embed/${carouselId}" 
  width="100%" 
  height="auto" 
  frameborder="0" 
  style="max-width: 614px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"
  allow="fullscreen">
</iframe>`
  }

  // TODO: Implementar widget script quando criar o widget
  return `<div id="carousel-${carouselId}"></div>
<script>
  // Widget JS será implementado
  console.log('Widget será carregado aqui');
</script>`
}

export function copyToClipboard(text: string) {
  if (navigator.clipboard) {
    return navigator.clipboard.writeText(text)
  } else {
    // Fallback para navegadores mais antigos
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    textArea.style.top = '-999999px'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    return new Promise<void>((resolve, reject) => {
      if (document.execCommand('copy')) {
        resolve()
      } else {
        reject(new Error('Falha ao copiar'))
      }
      document.body.removeChild(textArea)
    })
  }
} 