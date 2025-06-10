"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight } from "lucide-react"
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
          {currentNews.image_url && (
            <div className="relative h-48 w-full bg-gray-100 overflow-hidden rounded-t-lg">
              <Image
                src={currentNews.image_url || "/placeholder.svg"}
                alt={currentNews.title}
                fill
                className="object-contain transition-transform duration-300 hover:scale-105"
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.style.display = "none"
                }}
              />
            </div>
          )}

          <div className="p-6">
            <h3 className="text-lg font-semibold mb-2 line-clamp-2">{currentNews.title}</h3>
            <p className="text-muted-foreground text-sm line-clamp-3">{currentNews.content}</p>
            <div className="flex items-center justify-between mt-4">
              <p className="text-xs text-muted-foreground">
                {new Date(currentNews.created_at).toLocaleDateString("es-ES", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
              <div className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">Publicado</div>
            </div>
          </div>

          {news.length > 1 && (
            <>
              <Button
                variant="outline"
                size="icon"
                className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white"
                onClick={prevSlide}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white"
                onClick={nextSlide}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>

        {news.length > 1 && (
          <div className="flex justify-center space-x-2 p-4">
            {news.map((_, index) => (
              <button
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentIndex ? "bg-primary" : "bg-gray-300"
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
