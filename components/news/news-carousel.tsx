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
      <Card className="min-h-80">
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
      <Card className="min-h-80">
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
      className="min-h-120 overflow-hidden group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <CardContent className="p-0 relative">
        <div className="flex flex-col">
          {/* Área de imagen - altura fija */}
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

          {/* Área de contenido - altura fija */}
          <div className="relative h-80">
            {/* Degradado de transición en la parte superior */}
            <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-white/60 to-transparent pointer-events-none z-10" />

            <div className="p-6 pt-2 text-center h-full flex flex-col">
              <h3 className="text-lg font-semibold mb-3 flex-shrink-0">{currentNews.title}</h3>

              {/* Área de contenido con scroll */}
              <div className="flex-1 overflow-y-auto mb-4 px-2 -mx-2">
                <div className="text-muted-foreground text-sm leading-relaxed">
                  {currentNews.content.split("\n").map((paragraph: string, i: number) => (
                    <p key={i} className="mb-2 last:mb-0">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>

              {/* Footer con fecha y estado - siempre visible */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-100 flex-shrink-0">
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

        {/* Controles de navegación - posicionados relativos al contenido */}
        {news.length > 1 && (
          <>
            <Button
              variant="outline"
              size="icon"
              className="absolute left-2 top-24 bg-white/90 hover:bg-white shadow-lg z-20 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={prevSlide}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="absolute right-2 top-24 bg-white/90 hover:bg-white shadow-lg z-20 opacity-0 group-hover:opacity-100 transition-opacity"
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

        {/* Indicadores de puntos - posicionados en la parte inferior del contenido */}
        {news.length > 1 && (
          <div className="flex justify-center space-x-2 pb-4">
            {news.map((_, index) => (
              <button
                key={index}
                className={`relative w-2 h-2 rounded-full transition-all duration-200 ${
                  index === currentIndex ? "bg-primary w-6 shadow-md" : "bg-gray-400 hover:bg-gray-500"
                }`}
                onClick={() => setCurrentIndex(index)}
              >
                {/* Barra de progreso para el slide actual */}
                {index === currentIndex && !isPaused && (
                  <div
                    className="absolute top-0 left-0 h-full bg-blue-500 rounded-full"
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

        .overflow-y-auto::-webkit-scrollbar {
          width: 6px;
        }

        .overflow-y-auto::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 3px;
        }

        .overflow-y-auto::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
        }

        .overflow-y-auto::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </Card>
  )
}
