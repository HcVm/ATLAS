"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight, FileText, Pause, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"
import type { Database } from "@/lib/supabase"

type News = Database["public"]["Tables"]["news"]["Row"]

export function NewsCarousel() {
  const [news, setNews] = useState<News[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    fetchNews()
  }, [])

  // Auto-play functionality
  useEffect(() => {
    if (!isAutoPlaying || news.length <= 1 || isPaused) return

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex === news.length - 1 ? 0 : prevIndex + 1))
    }, 5000) // Cambia cada 5 segundos

    return () => clearInterval(interval)
  }, [isAutoPlaying, news.length, isPaused])

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

  const toggleAutoPlay = () => {
    setIsPaused(!isPaused)
  }

  if (loading) {
    return (
      <Card className="h-80">
        <CardContent className="p-6 h-full flex items-center justify-center">
          <div className="animate-pulse text-center w-full">
            <div className="h-6 bg-gray-200 rounded w-3/4 mx-auto mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/3 mx-auto"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (news.length === 0) {
    return (
      <Card className="h-80">
        <CardContent className="p-6 h-full flex flex-col items-center justify-center text-center">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No hay noticias disponibles</p>
        </CardContent>
      </Card>
    )
  }

  const currentNews = news[currentIndex]

  return (
    <Card
      className="h-80 overflow-hidden group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <CardContent className="p-0 h-full relative">
        <div className="h-full flex flex-col">
          {/* Área de imagen - altura aumentada */}
          <div className="h-48 relative bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
            {currentNews.image_url ? (
              <Image
                src={currentNews.image_url || "/placeholder.svg"}
                alt={currentNews.title}
                fill
                className="object-contain p-3"
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
              />
            ) : (
              <FileText className="h-16 w-16 text-blue-500" />
            )}

            {/* Degradado de transición en la parte inferior */}
            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none" />
          </div>

          {/* Área de contenido - con degradado superior */}
          <div className="flex-1 relative">
            {/* Degradado de transición en la parte superior */}
            <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-white/60 to-transparent pointer-events-none z-10" />

            <div className="p-6 pt-2 h-full flex flex-col justify-center text-center">
              <h3 className="text-lg font-semibold mb-3 line-clamp-2">{currentNews.title}</h3>
              <p className="text-muted-foreground text-sm line-clamp-2 mb-4">{currentNews.content}</p>

              {/* Footer con fecha y estado */}
              <div className="flex items-center justify-between mt-auto">
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
          </div>
        </div>

        {/* Controles de navegación - solo visibles al hacer hover */}
        {news.length > 1 && (
          <>
            <Button
              variant="outline"
              size="icon"
              className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white shadow-lg z-20 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={prevSlide}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white shadow-lg z-20 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={nextSlide}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            {/* Botón de play/pause */}
            <Button
              variant="outline"
              size="icon"
              className="absolute top-2 right-2 bg-white/90 hover:bg-white shadow-lg z-20 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={toggleAutoPlay}
            >
              {isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
            </Button>
          </>
        )}

        {/* Indicadores de puntos con barra de progreso */}
        {news.length > 1 && (
          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-2 z-20">
            {news.map((_, index) => (
              <button
                key={index}
                className={`relative w-2 h-2 rounded-full transition-all duration-200 ${
                  index === currentIndex ? "bg-white w-6 shadow-md" : "bg-white/60 hover:bg-white/80"
                }`}
                onClick={() => setCurrentIndex(index)}
              >
                {/* Barra de progreso para el slide actual */}
                {index === currentIndex && !isPaused && (
                  <div
                    className="absolute top-0 left-0 h-full bg-blue-500 rounded-full animate-pulse"
                    style={{
                      animation: "progress 5s linear infinite",
                    }}
                  />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Indicador de auto-play activo */}
        {news.length > 1 && !isPaused && (
          <div className="absolute top-2 left-2 px-2 py-1 bg-green-500/80 text-white text-xs rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20">
            Auto
          </div>
        )}
      </CardContent>

      <style jsx>{`
        @keyframes progress {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </Card>
  )
}
