/**
 * Utilidades para procesamiento de imágenes
 * Incluye conversión a WebP y redimensionamiento
 */

export interface ImageProcessingOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
  format?: "webp" | "jpeg" | "png"
}

/**
 * Convierte una imagen a WebP y la redimensiona si es necesario
 */
export async function processImage(
  file: File,
  options: ImageProcessingOptions = {},
): Promise<{ blob: Blob; fileName: string }> {
  const { maxWidth = 800, maxHeight = 600, quality = 0.8, format = "webp" } = options

  return new Promise((resolve, reject) => {
    const img = new Image()
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")

    if (!ctx) {
      reject(new Error("No se pudo crear el contexto del canvas"))
      return
    }

    img.onload = () => {
      // Calcular nuevas dimensiones manteniendo la proporción
      let { width, height } = img

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height)
        width = Math.floor(width * ratio)
        height = Math.floor(height * ratio)
      }

      // Configurar canvas
      canvas.width = width
      canvas.height = height

      // Dibujar imagen redimensionada
      ctx.drawImage(img, 0, 0, width, height)

      // Convertir a blob
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Error al procesar la imagen"))
            return
          }

          // Generar nuevo nombre de archivo
          const originalName = file.name.split(".")[0]
          const fileName = `${originalName}.webp`

          resolve({ blob, fileName })
        },
        `image/${format}`,
        quality,
      )
    }

    img.onerror = () => {
      reject(new Error("Error al cargar la imagen"))
    }

    // Cargar imagen
    img.src = URL.createObjectURL(file)
  })
}

/**
 * Valida si un archivo es una imagen válida
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Validar tipo
  const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"]
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: "Tipo de archivo no permitido. Use JPG, PNG, GIF o WebP.",
    }
  }

  // Validar tamaño (10MB máximo para el archivo original)
  const maxSize = 10 * 1024 * 1024 // 10MB
  if (file.size > maxSize) {
    return {
      valid: false,
      error: "El archivo es demasiado grande. Máximo 10MB.",
    }
  }

  return { valid: true }
}

/**
 * Calcula el porcentaje de compresión logrado
 */
export function calculateCompressionRatio(originalSize: number, compressedSize: number): number {
  return Math.round(((originalSize - compressedSize) / originalSize) * 100)
}

/**
 * Formatea el tamaño de archivo en formato legible
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes"

  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}
