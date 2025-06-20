"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Upload, X, ImageIcon } from "lucide-react"
import { createClient } from "@/lib/supabase"
import { toast } from "sonner"

interface ProductImageUploadProps {
  value?: string
  onChange: (url: string | null) => void
  productCode?: string
  disabled?: boolean
}

export function ProductImageUpload({
  value,
  onChange,
  productCode = "TEMP",
  disabled = false,
}: ProductImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const handleFileUpload = async (file: File) => {
    if (!file) return

    // Validar tipo de archivo
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      toast.error("Tipo de archivo no permitido. Use JPG, PNG, GIF o WebP.")
      return
    }

    // Validar tamaño (5MB máximo)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("El archivo es demasiado grande. Máximo 5MB.")
      return
    }

    setUploading(true)

    try {
      // Generar nombre único para el archivo
      const timestamp = Date.now()
      const fileExtension = file.name.split(".").pop()
      const fileName = `${productCode}-${timestamp}.${fileExtension}`
      const filePath = `products/${fileName}`

      // Subir archivo a Supabase Storage
      const { data, error } = await supabase.storage.from("images").upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      })

      if (error) {
        console.error("Error uploading file:", error)
        toast.error("Error al subir la imagen: " + error.message)
        return
      }

      // Obtener URL pública
      const {
        data: { publicUrl },
      } = supabase.storage.from("images").getPublicUrl(filePath)

      onChange(filePath) // Guardamos el path, no la URL completa
      toast.success("Imagen subida exitosamente")
    } catch (error) {
      console.error("Error:", error)
      toast.error("Error inesperado al subir la imagen")
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveImage = async () => {
    if (!value) return

    try {
      // Eliminar archivo del storage
      const { error } = await supabase.storage.from("images").remove([value])

      if (error) {
        console.error("Error removing file:", error)
        // No mostramos error si el archivo no existe
      }

      onChange(null)
      toast.success("Imagen eliminada")
    } catch (error) {
      console.error("Error:", error)
      toast.error("Error al eliminar la imagen")
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (disabled || uploading) return

    const files = e.dataTransfer.files
    if (files && files[0]) {
      handleFileUpload(files[0])
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files[0]) {
      handleFileUpload(files[0])
    }
  }

  const getImageUrl = (path: string) => {
    if (!path) return null

    // Si ya es una URL completa, devolverla tal como está
    if (path.startsWith("http")) return path

    // Si es un path, construir la URL pública
    const {
      data: { publicUrl },
    } = supabase.storage.from("images").getPublicUrl(path)

    return publicUrl
  }

  return (
    <div className="space-y-4">
      <Label>Imagen del Producto</Label>

      {value ? (
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <img
                src={getImageUrl(value) || "/placeholder.svg?height=200&width=200"}
                alt="Imagen del producto"
                className="w-full h-48 object-cover rounded-lg"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.src = "/placeholder.svg?height=200&width=200"
                }}
              />
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2"
                onClick={handleRemoveImage}
                disabled={disabled || uploading}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card
          className={`border-2 border-dashed transition-colors ${
            dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <CardContent className="p-8">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="p-4 bg-muted rounded-full">
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-medium">Subir imagen del producto</h3>
                <p className="text-sm text-muted-foreground">
                  Arrastra y suelta una imagen aquí, o haz clic para seleccionar
                </p>
                <p className="text-xs text-muted-foreground">JPG, PNG, GIF o WebP (máx. 5MB)</p>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || uploading}
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploading ? "Subiendo..." : "Seleccionar imagen"}
              </Button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleFileSelect}
                className="hidden"
                disabled={disabled || uploading}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
