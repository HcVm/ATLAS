"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"
import type { Database } from "@/lib/supabase"

type News = Database["public"]["Tables"]["news"]["Row"]

export function NewsCarousel() {
  const [news, setNews] = useState<News[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchNews()
  }, [])

  const fetchNews = async () => {
    try {
      const { data, error } = await supabase
        .from("news")
        .select("*")
        .eq("published", true)
        .order("created_at", { ascending: false })
        .limit(5)

      if (error) throw error
      setNews(data || [])
    } catch (error) {
      console.error("Error fetching news:", error)
    } finally {
      setLoading(false)
    }
  }

  const nextSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex === news.length - 1 ? 0 : prevIndex + 1))
  }

  const prevSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex === 0 ? news.length - 1 : prevIndex - 1))
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-48 bg-gray-200 rounded-lg mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (news.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No hay noticias disponibles</p>
        </CardContent>
      </Card>
    )
  }

  const currentNews = news[currentIndex]

  return (
    <Card>
      <CardContent className="p-0">
        <div className="relative">
          {/* Solo mostrar contenedor de imagen si existe image_url */}
          {currentNews.image_url && (
            <div className="relative h-48 w-full bg-gray-100 overflow-hidden rounded-t-lg">
              <Image
                src={currentNews.image_url || "/placeholder.svg"}
                alt={currentNews.title}
                fill
                className="object-cover transition-transform duration-300 hover:scale-105"
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.style.display = "none"
                }}
              />
            </div>
          )}

          {/* Si no hay imagen, agregar un icono decorativo */}
          {!currentNews.image_url && (
            <div className="flex items-center justify-center h-16 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg">
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          )}

          <div className="p-6">
            <h3 className="text-lg font-semibold mb-3 line-clamp-2">{currentNews.title}</h3>
            <p className="text-muted-foreground text-sm line-clamp-4 mb-4">{currentNews.content}</p>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {new Date(currentNews.created_at).toLocaleDateString("es-ES", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
              <div className="px-3 py-1 text-xs rounded-full bg-green-100 text-green-800 font-medium">Publicado</div>
            </div>
          </div>

          {/* Botones de navegación */}
          {news.length > 1 && (
            <>
              <Button
                variant="outline"
                size="icon"
                className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white shadow-md"
                onClick={prevSlide}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white shadow-md"
                onClick={nextSlide}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>

        {/* Indicadores de puntos */}
        {news.length > 1 && (
          <div className="flex justify-center space-x-2 p-4">
            {news.map((_, index) => (
              <button
                key={index}
                className={`w-2 h-2 rounded-full transition-all duration-200 ${
                  index === currentIndex ? "bg-primary w-6" : "bg-gray-300 hover:bg-gray-400"
                }`}
                onClick={() => setCurrentIndex(index)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
