"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { ArrowLeft, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
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

      // Crear noticia
      const { data: news, error } = await supabase
        .from("news")
        .insert({
          title: values.title,
          content: values.content,
          image_url: imageUrl,
          created_by: user.id,
          published: true,
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
      const { data: allUsers } = await supabase.from("profiles").select("id").neq("id", user.id) // Excluir al creador que ya recibió notificación

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
    <div className="max-w-4xl mx-auto py-10 px-6">
      <div className="flex items-center gap-2 mb-6">
        <Button variant="outline" size="icon" asChild>
          <Link href="/news">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Crear Nueva Noticia</h1>
          <p className="text-muted-foreground">Completa el formulario para crear una nueva noticia</p>
        </div>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex">Noticia</CardTitle>
          <CardDescription>Completa el formulario para crear una nueva noticia</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título</FormLabel>
                    <FormControl>
                      <Input placeholder="Título de la noticia" {...field} />
                    </FormControl>
                    <FormDescription>El título debe tener al menos 3 caracteres.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contenido</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Contenido de la noticia" {...field} />
                    </FormControl>
                    <FormDescription>El contenido debe tener al menos 10 caracteres.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="image"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Imagen</FormLabel>
                    <FormControl>
                      <Input type="file" onChange={handleImageChange} />
                    </FormControl>
                    <FormDescription>Sube una imagen para la noticia.</FormDescription>
                    {imagePreview && (
                      <img
                        src={imagePreview || "/placeholder.svg"}
                        alt="Preview"
                        className="mt-2 w-full h-48 object-cover"
                      />
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <CardFooter className="flex justify-between">
                <Button variant="outline" type="button" onClick={() => router.back()}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Publicar Noticia
                </Button>
              </CardFooter>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
