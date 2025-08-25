"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { FileUp, Save, ImageIcon, Trash2, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { v4 as uuidv4 } from "uuid"
import Image from "next/image"
import { processImage, validateImageFile, calculateCompressionRatio, formatFileSize } from "@/lib/image-utils"

export default function EditNewsPage({ params }: { params: { id: string } }) {
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [compressionInfo, setCompressionInfo] = useState<{
    originalSize: number
    compressedSize: number
    ratio: number
  } | null>(null)
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    published: false,
    image_url: "",
  })

  useEffect(() => {
    if (user && (user.role === "admin" || user.role === "supervisor")) {
      fetchNewsItem()
    }
  }, [user, params.id])

  const fetchNewsItem = async () => {
    try {
      const { data, error } = await supabase.from("news").select("*").eq("id", params.id).single()

      if (error) throw error

      setFormData({
        title: data.title,
        content: data.content,
        published: data.published,
        image_url: data.image_url,
      })

      if (data.image_url) {
        setImagePreview(data.image_url)
      }
    } catch (error: any) {
      setError(`Error al cargar la noticia: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validation = validateImageFile(file)
    if (!validation.valid) {
      setError(validation.error || "Error de validación")
      return
    }

    setProcessing(true)
    setCompressionInfo(null)
    setError("")

    try {
      const { blob, fileName } = await processImage(file, {
        maxWidth: 1200,
        maxHeight: 800,
        quality: 0.85,
        format: "webp",
      })

      const originalSize = file.size
      const compressedSize = blob.size
      const ratio = calculateCompressionRatio(originalSize, compressedSize)

      setCompressionInfo({
        originalSize,
        compressedSize,
        ratio,
      })

      const processedFile = new File([blob], fileName, { type: "image/webp" })
      setImageFile(processedFile)

      const previewUrl = URL.createObjectURL(blob)
      setImagePreview(previewUrl)

      if (ratio > 0) {
        setSuccess(
          `Imagen optimizada: ${formatFileSize(originalSize)} → ${formatFileSize(compressedSize)} (${ratio}% menos)`,
        )
      }
    } catch (error: any) {
      console.error("Error processing image:", error)
      setError("Error al procesar la imagen: " + error.message)
      setCompressionInfo(null)
    } finally {
      setProcessing(false)
    }
  }

  const handleRemoveImage = () => {
    setImageFile(null)
    setImagePreview(null)
    setCompressionInfo(null)
    setFormData({ ...formData, image_url: "" })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess("")

    try {
      if (!user) {
        throw new Error("Usuario no autenticado")
      }

      if (!formData.title || !formData.content) {
        throw new Error("Por favor completa los campos requeridos")
      }

      let imageUrl = formData.image_url

      if (imageFile) {
        const fileName = `${uuidv4()}.webp`
        const filePath = `news/${fileName}`

        const { error: uploadError, data: uploadData } = await supabase.storage
          .from("images")
          .upload(filePath, imageFile, {
            cacheControl: "3600",
            contentType: "image/webp",
          })

        if (uploadError) {
          throw new Error(`Error al subir la imagen: ${uploadError.message}`)
        }

        const { data: urlData } = supabase.storage.from("images").getPublicUrl(filePath)
        imageUrl = urlData.publicUrl
      }

      const { data, error } = await supabase
        .from("news")
        .update({
          title: formData.title,
          content: formData.content,
          image_url: imageUrl,
          published: formData.published,
          updated_at: new Date().toISOString(),
        })
        .eq("id", params.id)
        .select()

      if (error) throw new Error(`Error al actualizar la noticia: ${error.message}`)

      setSuccess("Noticia actualizada exitosamente")
      setTimeout(() => {
        router.push("/news")
      }, 2000)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  if (user?.role !== "admin" && user?.role !== "supervisor") {
    return (
      <div className="text-center py-10">
        <h1 className="text-2xl font-bold">Acceso Denegado</h1>
        <p className="text-muted-foreground">No tienes permisos para acceder a esta página.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Editar Noticia</h1>
        <p className="text-muted-foreground">Actualiza los detalles de la noticia</p>
      </div>

      {loading ? (
        <div className="text-center py-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Cargando noticia...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Información de la Noticia</CardTitle>
                <CardDescription>Actualiza los detalles de la noticia</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  {success && (
                    <Alert>
                      <AlertDescription>{success}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="title">Título de la Noticia</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        required
                        disabled={loading}
                      />
                    </div>

                    <div>
                      <Label htmlFor="content">Contenido</Label>
                      <Textarea
                        id="content"
                        value={formData.content}
                        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                        disabled={loading}
                        rows={8}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="image">Imagen</Label>
                      <div className="mt-1 flex items-center">
                        <label
                          htmlFor="image-upload"
                          className="cursor-pointer rounded-md font-medium text-primary hover:text-primary/80 flex items-center"
                        >
                          <FileUp className="h-4 w-4 mr-2" />
                          <span>{processing ? "Procesando..." : "Cambiar imagen"}</span>
                          <input
                            id="image-upload"
                            name="image-upload"
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            onChange={handleImageChange}
                            disabled={loading || processing}
                          />
                        </label>
                        {imagePreview && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="ml-4 text-red-500"
                            onClick={handleRemoveImage}
                            disabled={processing}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Eliminar
                          </Button>
                        )}
                      </div>
                      {compressionInfo && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-2">
                          <div className="flex items-center gap-2 text-green-800">
                            <span className="text-sm font-medium">Imagen Optimizada</span>
                          </div>
                          <div className="text-xs text-green-700 mt-1 space-y-1">
                            <p>Tamaño original: {formatFileSize(compressionInfo.originalSize)}</p>
                            <p>Tamaño optimizado: {formatFileSize(compressionInfo.compressedSize)}</p>
                            <p>Ahorro: {compressionInfo.ratio}% menos espacio</p>
                          </div>
                        </div>
                      )}
                      {processing && (
                        <div className="flex items-center mt-2 text-sm text-gray-600">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Optimizando imagen...
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="published"
                        checked={formData.published}
                        onCheckedChange={(checked) => setFormData({ ...formData, published: checked })}
                        disabled={loading}
                      />
                      <Label htmlFor="published">Publicado</Label>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" disabled={loading || processing}>
                      {loading ? (
                        "Guardando..."
                      ) : processing ? (
                        "Procesando..."
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Guardar Cambios
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>Vista Previa</CardTitle>
                <CardDescription>Así se verá la noticia</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <div className="w-full rounded-lg overflow-hidden">
                  {imagePreview ? (
                    <div className="relative h-48 w-full bg-gray-100 rounded-lg overflow-hidden">
                      <Image
                        src={imagePreview || "/placeholder.svg"}
                        alt="Vista previa"
                        fill
                        className="object-contain"
                        sizes="(max-width: 768px) 100vw, 50vw"
                      />
                    </div>
                  ) : (
                    <div className="h-48 bg-muted flex items-center justify-center rounded-lg">
                      <ImageIcon className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="text-lg font-semibold mb-2">{formData.title || "Título de la noticia"}</h3>
                    <p className="text-muted-foreground text-sm line-clamp-3">
                      {formData.content || "Contenido de la noticia..."}
                    </p>
                    <div className="flex items-center justify-between mt-4">
                      <p className="text-xs text-muted-foreground">{new Date().toLocaleDateString("es-ES")}</p>
                      <div
                        className={`px-2 py-1 text-xs rounded-full ${
                          formData.published ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {formData.published ? "Publicado" : "Borrador"}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
