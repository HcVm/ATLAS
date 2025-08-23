"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight, FileText, Pause, Play, ZoomIn, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { supabase } from "@/lib/supabase"
import { useCompany } from "@/lib/company-context"
import { useAuth } from "@/lib/auth-context"
import type { Database } from "@/lib/supabase"

type News = Database["public"]["Tables"]["news"]["Row"]

export function NewsCarousel() {
  const { user } = useAuth()
  const { selectedCompany } = useCompany()
  const [news, setNews] = useState<News[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)
  const [isPaused, setIsPaused] = useState(false)
  const [isImageZoomed, setIsImageZoomed] = useState(false)
  const [zoomedImageUrl, setZoomedImageUrl] = useState<string>("")

  useEffect(() => {
    fetchNews()
  }, [selectedCompany])

  useEffect(() => {
    if (!isAutoPlaying || news.length <= 1 || isPaused) return

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex === news.length - 1 ? 0 : prevIndex + 1))
    }, 5000)

    return () => clearInterval(interval)
  }, [isAutoPlaying, news.length, isPaused])

  const fetchNews = async () => {
    try {
      setLoading(true)
      console.log("Fetching news for company:", selectedCompany?.id || "all")

      let query = supabase
        .from("news")
        .select(`
          *,
          profiles!news_created_by_fkey (full_name)
        `)
        .eq("published", true)
        .order("created_at", { ascending: false })

      if (selectedCompany && user?.role === "admin") {
        query = query.eq("company_id", selectedCompany.id)
      } else if (user?.company_id && user?.role !== "admin") {
        query = query.eq("company_id", user.company_id)
      }

      const { data, error } = await query.limit(5)

      if (error) {
        console.error("Error fetching news:", error)
        throw error
      }

      console.log(`Loaded ${data?.length || 0} news items`)
      setNews(data || [])

      setCurrentIndex(0)
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

  const openImageZoom = (imageUrl: string) => {
    setZoomedImageUrl(imageUrl)
    setIsImageZoomed(true)
  }

  const closeImageZoom = () => {
    setIsImageZoomed(false)
    setZoomedImageUrl("")
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
          <p className="text-muted-foreground">
            {selectedCompany
              ? `No hay noticias disponibles para ${selectedCompany.name}`
              : "No hay noticias disponibles"}
          </p>
        </CardContent>
      </Card>
    )
  }

  const currentNews = news[currentIndex]
  const isImageOnly = currentNews.image_url && (!currentNews.content || currentNews.content.trim() === "")

  return (
    <>
      <Card
        className="min-h-[32rem] overflow-hidden group"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <CardContent className="p-0 relative">
          <div className="flex flex-col">
            <div
              className={`relative bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center ${
                isImageOnly ? "h-[28rem]" : "h-48"
              }`}
            >
              {currentNews.image_url ? (
                <>
                  <Image
                    src={currentNews.image_url || "/placeholder.svg"}
                    alt={currentNews.title}
                    fill
                    className={`${isImageOnly ? "object-contain" : "object-contain p-3"}`}
                    sizes="(max-width: 768px) 100vw, 50vw"
                    priority
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="absolute top-2 left-2 bg-white/90 hover:bg-white shadow-lg z-20 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => openImageZoom(currentNews.image_url!)}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <FileText className="h-16 w-16 text-blue-500" />
              )}

              {!isImageOnly && (
                <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none" />
              )}
            </div>

            {!isImageOnly && (
              <div className="relative h-80">
                <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-white/60 to-transparent pointer-events-none z-10" />

                <div className="p-6 pt-2 text-center h-full flex flex-col">
                  <h3 className="text-lg font-semibold mb-3 flex-shrink-0">{currentNews.title}</h3>

                  <div className="flex-1 overflow-y-auto mb-4 px-2 -mx-2">
                    <div className="text-muted-foreground text-sm leading-relaxed">
                      {currentNews.content?.split("\n").map((paragraph: string, i: number) => (
                        <p key={i} className="mb-2 last:mb-0">
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-100 flex-shrink-0">
                    <p className="text-xs text-muted-foreground">
                      {new Date(currentNews.created_at).toLocaleDateString("es-ES", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                    <div className="px-3 py-1 text-xs rounded-full bg-green-100 text-green-800 font-medium">
                      Publicado
                    </div>
                  </div>
                </div>
              </div>
            )}

            {isImageOnly && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6">
                <h3 className="text-xl font-bold text-white mb-2">{currentNews.title}</h3>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-white/90">
                    {new Date(currentNews.created_at).toLocaleDateString("es-ES", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                  <div className="px-3 py-1 text-xs rounded-full bg-green-500/80 text-white font-medium">Publicado</div>
                </div>
              </div>
            )}
          </div>

          {news.length > 1 && (
            <>
              <Button
                variant="outline"
                size="icon"
                className={`absolute left-2 bg-white/90 hover:bg-white shadow-lg z-20 opacity-0 group-hover:opacity-100 transition-opacity ${
                  isImageOnly ? "top-1/2 -translate-y-1/2" : "top-24"
                }`}
                onClick={prevSlide}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className={`absolute right-2 bg-white/90 hover:bg-white shadow-lg z-20 opacity-0 group-hover:opacity-100 transition-opacity ${
                  isImageOnly ? "top-1/2 -translate-y-1/2" : "top-24"
                }`}
                onClick={nextSlide}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>

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

          {news.length > 1 && !isPaused && (
            <div className="absolute top-2 left-2 px-2 py-1 bg-green-500/80 text-white text-xs rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20">
              Auto
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isImageZoomed} onOpenChange={setIsImageZoomed}>
        <DialogTitle className="text-white text-lg font-bold">Imagen ampliada</DialogTitle>
          <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none">
            <div className="relative w-full h-[95vh] flex items-center justify-center">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 z-30 text-white hover:bg-white/20"
                onClick={closeImageZoom}
              >
                <X className="h-6 w-6" />
              </Button>

              {zoomedImageUrl && (
                <div className="relative w-full h-full p-8">
                  <Image
                    src={zoomedImageUrl || "/placeholder.svg"}
                    alt="Imagen ampliada"
                    fill
                    className="object-contain"
                    sizes="95vw"
                    priority
                  />
                </div>
              )}
            </div>
          </DialogContent>
      </Dialog>
    </>
  )
}
