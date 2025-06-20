"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, X, ImageIcon, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { toast } from "sonner"

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
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user) return

    // Validar tipo de archivo
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor selecciona un archivo de imagen válido")
      return
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("La imagen no puede ser mayor a 5MB")
      return
    }

    setUploading(true)

    try {
      // Generar nombre único para el archivo
      const timestamp = Date.now()
      const fileExt = file.name.split(".").pop()
      const fileName = `${productCode || "product"}-${timestamp}.${fileExt}`
      const filePath = `products/${fileName}`

      // Eliminar imagen anterior si existe
      if (currentImageUrl) {
        const oldPath = currentImageUrl.split("/").pop()
        if (oldPath) {
          await supabase.storage.from("images").remove([`products/${oldPath}`])
        }
      }

      // Subir nueva imagen
      const { data, error } = await supabase.storage.from("images").upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
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
      console.error("Error uploading image:", error)
      toast.error("Error al subir la imagen: " + error.message)
    } finally {
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

    if (disabled || uploading) return

    const files = e.dataTransfer.files
    if (files && files[0]) {
      // Simular evento de input para reutilizar la lógica
      const mockEvent = {
        target: { files: [files[0]] },
      } as React.ChangeEvent<HTMLInputElement>

      handleFileSelect(mockEvent)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ImageIcon className="h-4 w-4" />
          Imagen del Producto
        </CardTitle>
        <CardDescription>Sube una imagen para el producto (máximo 5MB)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Preview de la imagen */}
        {previewUrl && (
          <div className="relative">
            <img
              src={previewUrl || "/placeholder.svg"}
              alt="Preview del producto"
              className="w-full h-48 object-cover rounded-lg border"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.src = "/placeholder.svg?height=200&width=200"
              }}
            />
            {!disabled && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2"
                onClick={handleRemoveImage}
                disabled={uploading}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
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
                <p className="text-sm font-medium">Arrastra una imagen aquí o</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={disabled || uploading}
                  className="mt-2"
                >
                  {uploading ? (
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

              <p className="text-xs text-gray-500">JPG, PNG, GIF o WebP (máx. 5MB)</p>
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
          disabled={disabled || uploading}
        />

        {/* Información adicional */}
        {!disabled && (
          <div className="text-xs text-muted-foreground">
            <p>• Formatos soportados: JPG, PNG, GIF, WebP</p>
            <p>• Tamaño máximo: 5MB</p>
            <p>• La imagen se redimensionará automáticamente</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
