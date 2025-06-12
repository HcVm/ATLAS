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

const formSchema = z.object({
  title: z.string().min(3, {
    message: "El título debe tener al menos 3 caracteres.",
  }),
  content: z.string().min(10, {
    message: "El contenido debe tener al menos 10 caracteres.",
  }),
  image: z.instanceof(File).optional(),
})

export default function CreateNewsPage() {
  const [loading, setLoading] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      form.setValue("image", file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
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
        const fileExt = values.image.name.split(".").pop()
        const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`
        const filePath = `news/${fileName}`

        const { error: uploadError, data: uploadData } = await supabase.storage
          .from("media")
          .upload(filePath, values.image)

        if (uploadError) throw uploadError

        // Obtener URL pública
        const { data: urlData } = supabase.storage.from("media").getPublicUrl(filePath)
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
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto p-3 sm:p-4 lg:p-6">
        {/* Header - Responsive */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
          <Button variant="outline" size="icon" asChild className="self-start">
            <Link href="/news">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold">Crear Nueva Noticia</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              {selectedCompany
                ? `Creando noticia para ${selectedCompany.name}`
                : "Completa el formulario para crear una nueva noticia"}
            </p>
          </div>
        </div>

        {/* Form Card - Responsive */}
        <Card className="shadow-lg">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex flex-col sm:flex-row sm:items-center gap-2 text-lg sm:text-xl">
              <Newspaper className="h-5 w-5 self-start sm:self-center" />
              <span>Nueva Noticia</span>
            </CardTitle>
            <CardDescription className="text-sm sm:text-base mt-2">
              Completa el formulario para crear una nueva noticia
            </CardDescription>
          </CardHeader>

          <CardContent className="p-4 sm:p-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
                {/* Title Field */}
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título</FormLabel>
                      <FormControl>
                        <Input placeholder="Título de la noticia" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs sm:text-sm">
                        El título debe tener al menos 3 caracteres.
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
                      <FormLabel>Contenido</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Contenido de la noticia"
                          className="min-h-[120px] sm:min-h-[150px] resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="text-xs sm:text-sm">
                        El contenido debe tener al menos 10 caracteres.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Image Field - Responsive */}
                <FormField
                  control={form.control}
                  name="image"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <ImageIcon className="h-4 w-4" />
                        Imagen (Opcional)
                      </FormLabel>
                      <FormControl>
                        <div className="space-y-3">
                          <Input type="file" accept="image/*" onChange={handleImageChange} className="text-sm" />
                          {imagePreview && (
                            <div className="relative">
                              <img
                                src={imagePreview || "/placeholder.svg"}
                                alt="Preview"
                                className="w-full max-w-md h-32 sm:h-48 object-cover rounded-lg border"
                              />
                              <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                                Vista previa
                              </div>
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormDescription className="text-xs sm:text-sm">
                        Sube una imagen para la noticia (JPG, PNG, GIF - máximo 5MB).
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Action Buttons - Responsive */}
                <CardFooter className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 px-0 pt-4 sm:pt-6">
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => router.back()}
                    className="w-full sm:w-auto order-2 sm:order-1"
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={loading} className="w-full sm:w-auto order-1 sm:order-2">
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    <span className="hidden sm:inline">Publicar Noticia</span>
                    <span className="sm:hidden">Publicar</span>
                  </Button>
                </CardFooter>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
