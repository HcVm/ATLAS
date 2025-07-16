"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, X, ImageIcon, Loader2, Info } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { toast } from "sonner"
import { processImage, validateImageFile, calculateCompressionRatio, formatFileSize } from "@/lib/image-utils"

interface ProductImageUploadProps {
  currentImageUrl?: string | null
  onImageChange: (imageUrl: string | null) => void
  productCode?: string
  disabled?: boolean
}

export default function ProductImageUpload({
  currentImageUrl,
  onImageChange,
  productCode,
  disabled = false,
}: ProductImageUploadProps) {
  const { user } = useAuth()
  const [uploading, setUploading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null)
  const [compressionInfo, setCompressionInfo] = useState<{
    originalSize: number
    compressedSize: number
    ratio: number
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user) return

    // Validar archivo
    const validation = validateImageFile(file)
    if (!validation.valid) {
      toast.error(validation.error)
      return
    }

    setProcessing(true)
    setCompressionInfo(null)

    try {
      // Procesar imagen (convertir a WebP y redimensionar)
      const { blob, fileName } = await processImage(file, {
        maxWidth: 800,
        maxHeight: 600,
        quality: 0.85,
        format: "webp",
      })

      // Calcular información de compresión
      const originalSize = file.size
      const compressedSize = blob.size
      const ratio = calculateCompressionRatio(originalSize, compressedSize)

      setCompressionInfo({
        originalSize,
        compressedSize,
        ratio,
      })

      // Mostrar información de compresión
      if (ratio > 0) {
        toast.success(
          `Imagen optimizada: ${formatFileSize(originalSize)} → ${formatFileSize(compressedSize)} (${ratio}% menos)`,
        )
      }

      setProcessing(false)
      setUploading(true)

      // Generar nombre único para el archivo
      const timestamp = Date.now()
      const finalFileName = `${productCode || "product"}-${timestamp}.webp`
      const filePath = `products/${finalFileName}`

      // Eliminar imagen anterior si existe
      if (currentImageUrl) {
        const oldPath = currentImageUrl.split("/").pop()
        if (oldPath) {
          await supabase.storage.from("images").remove([`products/${oldPath}`])
        }
      }

      // Subir imagen procesada
      const { data, error } = await supabase.storage.from("images").upload(filePath, blob, {
        cacheControl: "3600",
        upsert: false,
        contentType: "image/webp",
      })

      if (error) throw error

      // Obtener URL pública
      const {
        data: { publicUrl },
      } = supabase.storage.from("images").getPublicUrl(filePath)

      setPreviewUrl(publicUrl)
      onImageChange(publicUrl)
      toast.success("Imagen subida exitosamente")
    } catch (error: any) {
      console.error("Error processing/uploading image:", error)
      toast.error("Error al procesar la imagen: " + error.message)
      setCompressionInfo(null)
    } finally {
      setProcessing(false)
      setUploading(false)
      // Limpiar input
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleRemoveImage = async () => {
    if (!currentImageUrl) return

    try {
      // Extraer path del archivo de la URL
      const urlParts = currentImageUrl.split("/")
      const fileName = urlParts[urlParts.length - 1]
      const filePath = `products/${fileName}`

      // Eliminar del storage
      const { error } = await supabase.storage.from("images").remove([filePath])

      if (error) throw error

      setPreviewUrl(null)
      setCompressionInfo(null)
      onImageChange(null)
      toast.success("Imagen eliminada exitosamente")
    } catch (error: any) {
      console.error("Error removing image:", error)
      toast.error("Error al eliminar la imagen: " + error.message)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (disabled || uploading || processing) return

    const files = e.dataTransfer.files
    if (files && files[0]) {
      // Simular evento de input para reutilizar la lógica
      const mockEvent = {
        target: { files: [files[0]] },
      } as React.ChangeEvent<HTMLInputElement>

      handleFileSelect(mockEvent)
    }
  }

  const isLoading = uploading || processing

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ImageIcon className="h-4 w-4" />
          Imagen del Producto
        </CardTitle>
        <CardDescription>Las imágenes se optimizan automáticamente a formato WebP (máximo 10MB)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Preview de la imagen */}
        {previewUrl && (
          <div className="relative group">
            <div className="relative overflow-hidden rounded-lg border bg-gray-50">
              <img
                src={previewUrl || "/placeholder.svg"}
                alt="Preview del producto"
                className="w-full h-48 object-contain bg-white"
                style={{
                  objectFit: "contain",
                  objectPosition: "center",
                }}
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.src = "/placeholder.svg?height=200&width=200"
                }}
                onLoad={(e) => {
                  const target = e.target as HTMLImageElement
                  console.log("Image loaded successfully:", target.src)
                }}
              />
              {!disabled && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={handleRemoveImage}
                  disabled={isLoading}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Información de compresión */}
        {compressionInfo && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-green-800">
              <Info className="h-4 w-4" />
              <span className="text-sm font-medium">Imagen Optimizada</span>
            </div>
            <div className="text-xs text-green-700 mt-1 space-y-1">
              <p>Tamaño original: {formatFileSize(compressionInfo.originalSize)}</p>
              <p>Tamaño optimizado: {formatFileSize(compressionInfo.compressedSize)}</p>
              <p>Ahorro: {compressionInfo.ratio}% menos espacio</p>
            </div>
          </div>
        )}

        {/* Área de subida */}
        {!previewUrl && (
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors"
            onDragOver={handleDrag}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
          >
            <div className="space-y-4">
              <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                <ImageIcon className="h-6 w-6 text-gray-400" />
              </div>

              <div>
                <p className="text-sm font-medium">
                  {processing ? "Procesando imagen..." : "Arrastra una imagen aquí o"}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={disabled || isLoading}
                  className="mt-2"
                >
                  {processing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Optimizando...
                    </>
                  ) : uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Subiendo...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Seleccionar archivo
                    </>
                  )}
                </Button>
              </div>

              <div className="text-xs text-gray-500 space-y-1">
                <p>JPG, PNG, GIF o WebP (máx. 10MB)</p>
                <p>Se convertirá automáticamente a WebP para optimizar el tamaño</p>
              </div>
            </div>
          </div>
        )}

        {/* Input oculto */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled || isLoading}
        />

        {/* Información adicional */}
        {!disabled && (
          <div className="text-xs text-muted-foreground space-y-1">
            <p>
              • <strong>Optimización automática:</strong> Las imágenes se convierten a WebP
            </p>
            <p>
              • <strong>Redimensionamiento:</strong> Máximo 800x600px manteniendo proporción
            </p>
            <p>
              • <strong>Compresión:</strong> Calidad 85% para balance tamaño/calidad
            </p>
            <p>
              • <strong>Ahorro típico:</strong> 60-80% menos espacio que JPG/PNG
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
