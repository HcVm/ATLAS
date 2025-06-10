"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Edit, ArrowLeft, Calendar, User } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import Image from "next/image"
import Link from "next/link"

export default function ViewNewsPage({ params }: { params: { id: string } }) {
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [news, setNews] = useState<any>(null)

  useEffect(() => {
    fetchNewsItem()
  }, [params.id])

  const fetchNewsItem = async () => {
    try {
      const { data, error } = await supabase
        .from("news")
        .select(`
          *,
          profiles!news_created_by_fkey (full_name)
        `)
        .eq("id", params.id)
        .single()

      if (error) throw error

      setNews(data)
    } catch (error: any) {
      setError(`Error al cargar la noticia: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-10">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Cargando noticia...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Ver Noticia</h1>
          <p className="text-muted-foreground">Detalles de la noticia</p>
        </div>
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button variant="outline" asChild>
          <Link href="/news">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a Noticias
          </Link>
        </Button>
      </div>
    )
  }

  if (!news) {
    return (
      <div className="text-center py-10">
        <h1 className="text-2xl font-bold">Noticia no encontrada</h1>
        <p className="text-muted-foreground">La noticia que buscas no existe o ha sido eliminada.</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/news">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a Noticias
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Ver Noticia</h1>
          <p className="text-muted-foreground">Detalles de la noticia</p>
        </div>
        <div className="flex gap-2">
          {(user?.role === "admin" || user?.role === "supervisor") && (
            <Button asChild>
              <Link href={`/news/edit/${news.id}`}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Link>
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link href="/news">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{news.title}</CardTitle>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-1" />
              {new Date(news.created_at).toLocaleDateString("es-ES")}
            </div>
            <div className="flex items-center">
              <User className="h-4 w-4 mr-1" />
              {news.profiles?.full_name}
            </div>
            <div
              className={`px-2 py-1 text-xs rounded-full ${
                news.published ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
              }`}
            >
              {news.published ? "Publicado" : "Borrador"}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {news.image_url && (
            <div className="relative h-[400px] w-full bg-gray-100 rounded-lg overflow-hidden">
              <Image
                src={news.image_url || "/placeholder.svg"}
                alt={news.title}
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 60vw"
                priority
              />
            </div>
          )}

          <div className="prose max-w-none">
            {news.content.split("\n").map((paragraph: string, i: number) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
