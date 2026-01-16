"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { ArrowLeft, Loader2, Newspaper, ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { useCompany } from "@/lib/company-context"
import Link from "next/link"
import { createNotification } from "@/lib/notifications"
import { processImage, validateImageFile, calculateCompressionRatio, formatFileSize } from "@/lib/image-utils"

const formSchema = z
  .object({
    title: z.string().min(3, {
      message: "El título debe tener al menos 3 caracteres.",
    }),
    content: z.string().optional(),
    image: z.instanceof(File).optional(),
  })
  .refine(
    (data) => {
      return data.content || data.image
    },
    {
      message: "Debe proporcionar al menos contenido de texto o una imagen.",
      path: ["content"],
    },
  )

export default function CreateNewsPage() {
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [compressionInfo, setCompressionInfo] = useState<{
    originalSize: number
    compressedSize: number
    ratio: number
  } | null>(null)
  const { toast } = useToast()
  const router = useRouter()
  const { user } = useAuth()
  const { selectedCompany } = useCompany()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      content: "",
    },
  })

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file
    const validation = validateImageFile(file)
    if (!validation.valid) {
      toast({
        title: "Error",
        description: validation.error,
        variant: "destructive",
      })
      return
    }

    setProcessing(true)
    setCompressionInfo(null)

    try {
      // Process image (convert to WebP and resize)
      const { blob, fileName } = await processImage(file, {
        maxWidth: 1200,
        maxHeight: 800,
        quality: 0.85,
        format: "webp",
      })

      // Calculate compression info
      const originalSize = file.size
      const compressedSize = blob.size
      const ratio = calculateCompressionRatio(originalSize, compressedSize)

      setCompressionInfo({
        originalSize,
        compressedSize,
        ratio,
      })

      // Create File object from blob for form
      const processedFile = new File([blob], fileName, { type: "image/webp" })
      form.setValue("image", processedFile)

      // Create preview URL
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(blob)

      // Show compression info
      if (ratio > 0) {
        toast({
          title: "Imagen optimizada",
          description: `${formatFileSize(originalSize)} → ${formatFileSize(compressedSize)} (${ratio}% menos)`,
        })
      }
    } catch (error: any) {
      console.error("Error processing image:", error)
      toast({
        title: "Error",
        description: "Error al procesar la imagen: " + error.message,
        variant: "destructive",
      })
      setCompressionInfo(null)
    } finally {
      setProcessing(false)
    }
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || (user.role !== "admin" && user.role !== "supervisor")) {
      toast({
        title: "Error",
        description: "No tienes permisos para crear noticias.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      let imageUrl = null

      // Subir imagen si existe
      if (values.image) {
        const fileName = `${Math.random().toString(36).substring(2, 15)}.webp`
        const filePath = `news/${fileName}`

        const { error: uploadError, data: uploadData } = await supabase.storage
          .from("images")
          .upload(filePath, values.image, {
            cacheControl: "3600",
            contentType: "image/webp",
          })

        if (uploadError) throw uploadError

        // Obtener URL pública
        const { data: urlData } = supabase.storage.from("images").getPublicUrl(filePath)
        imageUrl = urlData.publicUrl
      }

      // Determinar la empresa para la noticia
      const companyId = user.role === "admin" ? selectedCompany?.id : user.company_id

      // Crear noticia
      const { data: news, error } = await supabase
        .from("news")
        .insert({
          title: values.title,
          content: values.content,
          image_url: imageUrl,
          created_by: user.id,
          published: true,
          company_id: companyId, // Asignar la empresa seleccionada o la del usuario
        })
        .select()
        .single()

      if (error) throw error

      // Crear notificación para el creador
      await createNotification({
        userId: user.id,
        title: "Noticia publicada con éxito",
        message: `Has publicado la noticia "${values.title}"`,
        type: "news_published",
        relatedId: news.id,
      })

      // Notificar a todos los usuarios sobre la nueva noticia
      // Si hay una empresa seleccionada, solo notificar a usuarios de esa empresa
      let userQuery = supabase.from("profiles").select("id").neq("id", user.id) // Excluir al creador

      if (companyId) {
        userQuery = userQuery.eq("company_id", companyId)
      }

      const { data: allUsers } = await userQuery

      if (allUsers && allUsers.length > 0) {
        for (const userToNotify of allUsers) {
          await createNotification({
            userId: userToNotify.id,
            title: "Nueva noticia disponible",
            message: `Se ha publicado una nueva noticia: "${values.title}"`,
            type: "news_published",
            relatedId: news.id,
          })
        }
      }

      toast({
        title: "Noticia creada",
        description: "La noticia se ha creado y publicado correctamente.",
      })

      router.push("/news")
    } catch (error: any) {
      console.error("Error creating news:", error)
      toast({
        title: "Error",
        description: error.message || "No se pudo crear la noticia.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <Button 
            variant="ghost" 
            onClick={() => router.push("/news")}
            className="group pl-0 hover:pl-2 transition-all duration-300 hover:bg-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
        >
          <ArrowLeft className="h-4 w-4 mr-2 transition-transform group-hover:-translate-x-1" />
          Volver a Noticias
        </Button>
      </div>

      <div className="flex flex-col gap-2 mb-4">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 bg-clip-text text-transparent">
            Crear Nueva Noticia
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
             {selectedCompany
                ? `Publicando para: ${selectedCompany.name}`
                : "Publicación global para toda la organización"}
          </p>
      </div>

      {/* Form Card */}
      <Card className="shadow-xl border-slate-200/60 dark:border-slate-800/60 bg-white/50 dark:bg-slate-950/50 backdrop-blur-xl">
        <CardHeader className="border-b border-slate-100/60 dark:border-slate-800/60 pb-6">
          <CardTitle className="flex items-center gap-2 text-xl text-slate-900 dark:text-slate-100">
            <Newspaper className="h-5 w-5 text-orange-500" />
            <span>Contenido de la Noticia</span>
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            Completa los detalles para informar a tu equipo.
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {/* Title Field */}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700 dark:text-slate-300 font-medium text-base">Título de la Noticia</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ej: Nuevo horario de atención por feriados..." 
                        {...field} 
                        className="h-12 text-lg bg-white/50 dark:bg-slate-900/50 border-slate-200/60 dark:border-slate-800/60 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 dark:focus:border-orange-600 transition-all"
                      />
                    </FormControl>
                    <FormDescription className="text-slate-400 text-xs">
                      Debe ser claro y conciso (mínimo 3 caracteres).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Content Field */}
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700 dark:text-slate-300 font-medium text-base">Cuerpo del Mensaje</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Escribe aquí todos los detalles..."
                        className="min-h-[200px] resize-y bg-white/50 dark:bg-slate-900/50 border-slate-200/60 dark:border-slate-800/60 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 dark:focus:border-orange-600 transition-all text-base leading-relaxed p-4"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="text-slate-400 text-xs">
                      Opcional si subes una imagen explicativa.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Image Field */}
              <FormField
                control={form.control}
                name="image"
                render={({ field }) => (
                  <FormItem className="bg-slate-50/50 dark:bg-slate-900/30 p-6 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-orange-400 dark:hover:border-orange-600 transition-colors">
                    <FormLabel className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium text-base mb-4 cursor-pointer">
                      <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg text-orange-600 dark:text-orange-400">
                        <ImageIcon className="h-5 w-5" />
                      </div>
                      Imagen Destacada
                      <span className="text-xs font-normal text-slate-400 ml-auto bg-white dark:bg-slate-800 px-2 py-1 rounded-full border border-slate-200 dark:border-slate-700">Opcional</span>
                    </FormLabel>
                    <FormControl>
                      <div className="space-y-4">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 dark:file:bg-orange-900/30 dark:file:text-orange-300 cursor-pointer bg-transparent border-0 h-auto p-0"
                          disabled={processing || loading}
                        />

                        {compressionInfo && (
                          <div className="bg-emerald-50/80 dark:bg-emerald-900/20 border border-emerald-200/60 dark:border-emerald-800/60 rounded-xl p-4 flex items-start gap-3">
                            <div className="p-1.5 bg-emerald-100 dark:bg-emerald-800/50 rounded-full text-emerald-600 dark:text-emerald-400 mt-0.5">
                                <ImageIcon className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">Imagen Optimizada con Éxito</p>
                                <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex gap-4 font-mono">
                                    <span>Original: {formatFileSize(compressionInfo.originalSize)}</span>
                                    <span>Final: {formatFileSize(compressionInfo.compressedSize)}</span>
                                    <span className="font-bold">Ahorro: {compressionInfo.ratio}%</span>
                                </div>
                            </div>
                          </div>
                        )}

                        {processing && (
                          <div className="flex items-center justify-center h-40 bg-slate-100/50 dark:bg-slate-800/50 rounded-xl animate-pulse">
                            <div className="flex flex-col items-center gap-2 text-slate-500">
                                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                                <span className="text-sm font-medium">Optimizando imagen...</span>
                            </div>
                          </div>
                        )}

                        {imagePreview && !processing && (
                          <div className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-md max-w-md mx-auto">
                            <img
                              src={imagePreview || "/placeholder.svg"}
                              alt="Preview"
                              className="w-full h-auto object-cover max-h-[400px]"
                            />
                            <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-full font-medium shadow-sm">
                              Vista Previa
                            </div>
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-end gap-4 pt-6 border-t border-slate-100/60 dark:border-slate-800/60">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => router.back()}
                  className="w-full sm:w-auto h-11 border-slate-200/60 bg-white/50 hover:bg-slate-50 dark:border-slate-800/60 dark:bg-slate-900/50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={loading || processing}
                  className="w-full sm:w-auto h-11 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white shadow-lg shadow-orange-500/20 rounded-xl font-medium px-8"
                >
                  {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Newspaper className="mr-2 h-5 w-5" />}
                  <span>{processing ? "Procesando..." : "Publicar Noticia"}</span>
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
