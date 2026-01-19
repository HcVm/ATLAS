"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Edit, ArrowLeft, Calendar, User } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import Image from "next/image"
import Link from "next/link"

export default function ViewNewsPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params)
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [news, setNews] = useState<any>(null)

  useEffect(() => {
    fetchNewsItem()
  }, [unwrappedParams.id])

  const fetchNewsItem = async () => {
    try {
      const { data, error } = await supabase
        .from("news")
        .select(`
          *,
          profiles!news_created_by_fkey (full_name)
        `)
        .eq("id", unwrappedParams.id)
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
    <div className="min-h-screen space-y-6 p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Header Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Button
          variant="ghost"
          onClick={() => router.push("/news")}
          className="group pl-0 hover:pl-2 transition-all duration-300 hover:bg-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
        >
          <ArrowLeft className="h-4 w-4 mr-2 transition-transform group-hover:-translate-x-1" />
          Volver a Noticias
        </Button>

        <div className="flex gap-3">
          {(user?.role === "admin" || user?.role === "supervisor") && (
            <Button
              asChild
              className="bg-white/50 hover:bg-white border-slate-200/60 text-slate-700 shadow-sm backdrop-blur-sm dark:bg-slate-900/50 dark:hover:bg-slate-900 dark:border-slate-800/60 dark:text-slate-200"
              variant="outline"
            >
              <Link href={`/news/edit/${news.id}`}>
                <Edit className="h-4 w-4 mr-2" />
                Editar Noticia
              </Link>
            </Button>
          )}
        </div>
      </div>

      <Card className="shadow-2xl border-slate-200/60 dark:border-slate-800/60 bg-white/50 dark:bg-slate-950/50 backdrop-blur-xl overflow-hidden rounded-2xl">
        {/* Hero Image */}
        {news.image_url && (
          <div className="relative w-full h-[400px] bg-slate-100 dark:bg-slate-900 group">
            <Image
              src={news.image_url || "/placeholder.svg"}
              alt={news.title}
              fill
              className="object-cover transition-transform duration-700 hover:scale-105"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60"></div>
          </div>
        )}

        <CardHeader className={`relative z-10 ${news.image_url ? "-mt-20 text-white" : "pb-4"}`}>
          <div className="flex flex-wrap gap-3 mb-4">
            <div className={`px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md shadow-sm border border-white/20 flex items-center gap-1.5 ${news.published
              ? "bg-emerald-500/90 text-white"
              : "bg-slate-500/90 text-white"
              }`}>
              {news.published ? "Publicado" : "Borrador"}
            </div>

            <div className={`px-3 py-1 rounded-full text-xs font-medium backdrop-blur-md shadow-sm border border-white/20 flex items-center gap-1.5 ${news.image_url ? "bg-black/40 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
              }`}>
              <Calendar className="h-3.5 w-3.5" />
              {new Date(news.created_at).toLocaleDateString("es-ES", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>

          <CardTitle className={`text-3xl sm:text-4xl md:text-5xl font-bold leading-tight ${news.image_url ? "text-white drop-shadow-lg" : "text-slate-900 dark:text-slate-100 bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent"}`}>
            {news.title}
          </CardTitle>

          <div className={`flex items-center gap-3 mt-6 ${news.image_url ? "text-white/90" : "text-slate-500 dark:text-slate-400"}`}>
            <div className={`h-10 w-10 rounded-full flex items-center justify-center text-lg font-bold shadow-md ${news.image_url
              ? "bg-white/20 backdrop-blur-md border border-white/30 text-white"
              : "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400"
              }`}>
              {news.profiles?.full_name?.charAt(0) || <User className="h-5 w-5" />}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold">Por {news.profiles?.full_name || "Usuario Desconocido"}</span>
              <span className="text-xs opacity-80">Autor</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-8 sm:p-10 space-y-8">
          <div className="prose prose-lg dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 leading-relaxed">
            {news.content.split("\n").map((paragraph: string, i: number) => (
              paragraph.trim() && <p key={i} className="mb-4">{paragraph}</p>
            ))}
          </div>

          <div className="pt-8 mt-8 border-t border-slate-100 dark:border-slate-800 flex justify-center">
            <p className="text-sm text-slate-400 italic">Fin de la noticia</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
