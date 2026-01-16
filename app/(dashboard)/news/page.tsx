"use client"

import { useState, useEffect } from "react"
import { Plus, Search, Newspaper, Edit, Trash2, Eye, Calendar, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { useCompany } from "@/lib/company-context"
import { toast } from "@/hooks/use-toast"
import Link from "next/link"

export default function NewsPage() {
  const { user } = useAuth()
  const { selectedCompany } = useCompany()
  const [news, setNews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean
    newsItem: any | null
    isDeleting: boolean
  }>({
    open: false,
    newsItem: null,
    isDeleting: false,
  })

  useEffect(() => {
    if (user && (user.role === "admin" || user.role === "supervisor")) {
      fetchNews()
    }
  }, [user, selectedCompany])

  const fetchNews = async () => {
    try {
      let query = supabase
        .from("news")
        .select(`
          *,
          profiles!news_created_by_fkey (full_name)
        `)
        .order("created_at", { ascending: false })

      // Filtrar por empresa seleccionada si el usuario es admin
      if (user?.role === "admin" && selectedCompany) {
        query = query.eq("company_id", selectedCompany.id)
      }
      // Si no es admin, aplicar filtros normales de permisos
      else if (user && user.role !== "admin" && user.company_id) {
        query = query.eq("company_id", user.company_id)
      }

      const { data, error } = await query

      if (error) throw error
      setNews(data || [])
    } catch (error) {
      console.error("Error fetching news:", error)
    } finally {
      setLoading(false)
    }
  }

  const togglePublished = async (id: string, published: boolean) => {
    try {
      const { error } = await supabase.from("news").update({ published: !published }).eq("id", id)

      if (error) throw error

      setNews(news.map((item) => (item.id === id ? { ...item, published: !published } : item)))

      toast({
        title: published ? "Noticia despublicada" : "Noticia publicada",
        description: `La noticia ha sido ${published ? "despublicada" : "publicada"} correctamente.`,
      })
    } catch (error) {
      console.error("Error updating news:", error)
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado de la noticia.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteClick = (newsItem: any) => {
    setDeleteDialog({
      open: true,
      newsItem,
      isDeleting: false,
    })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.newsItem) return

    try {
      setDeleteDialog((prev) => ({ ...prev, isDeleting: true }))

      const response = await fetch(`/api/news/${deleteDialog.newsItem.id}`, {
        method: "DELETE",
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Error al eliminar la noticia")
      }

      setNews(news.filter((item) => item.id !== deleteDialog.newsItem.id))

      toast({
        title: "Noticia eliminada",
        description: "La noticia ha sido eliminada correctamente.",
      })

      setDeleteDialog({
        open: false,
        newsItem: null,
        isDeleting: false,
      })
    } catch (error: any) {
      console.error("Error deleting news:", error)
      toast({
        title: "Error al eliminar",
        description: error.message || "No se pudo eliminar la noticia",
        variant: "destructive",
      })
      setDeleteDialog((prev) => ({ ...prev, isDeleting: false }))
    }
  }

  const filteredNews = news.filter(
    (item) =>
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.content.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  if (user?.role !== "admin" && user?.role !== "supervisor") {
    return (
      <div className="text-center py-10">
        <h1 className="text-2xl font-bold">Acceso Denegado</h1>
        <p className="text-muted-foreground">No tienes permisos para acceder a esta página.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 bg-clip-text text-transparent">
            {selectedCompany ? `Noticias - ${selectedCompany.name}` : "Noticias"}
          </h1>
          <p className="text-base text-slate-500 dark:text-slate-400 mt-1">Gestiona y publica comunicados importantes para la organización.</p>
        </div>
        <Button
          asChild
          className="w-full sm:w-auto bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white shadow-lg hover:shadow-orange-500/20 transition-all duration-300 hover:-translate-y-0.5 rounded-xl"
        >
          <Link href="/news/create">
            <Plus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Nueva Noticia</span>
            <span className="sm:hidden">Crear</span>
          </Link>
        </Button>
      </div>

      <Card className="shadow-xl border-slate-200/60 dark:border-slate-800/60 bg-white/50 dark:bg-slate-950/50 backdrop-blur-xl overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar noticias por título o contenido..."
                className="pl-10 h-10 bg-white/50 dark:bg-slate-900/50 border-slate-200/50 dark:border-slate-800/50 focus:ring-2 focus:ring-orange-500/20 transition-all duration-300 rounded-xl"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
              <p className="mt-4 text-slate-500 dark:text-slate-400 animate-pulse">Cargando noticias...</p>
            </div>
          ) : filteredNews.length === 0 ? (
            <div className="text-center py-20 bg-slate-50/30 dark:bg-slate-900/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
              <div className="p-4 rounded-full bg-orange-100/50 dark:bg-orange-900/20 w-20 h-20 mx-auto mb-4 flex items-center justify-center shadow-sm">
                <Newspaper className="h-10 w-10 text-orange-600 dark:text-orange-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">No hay noticias publicadas</h3>
              <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                No se encontraron noticias en el sistema. ¡Crea la primera para mantener informado al equipo!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredNews.map((item) => (
                <div key={item.id} className="group relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col h-full hover:-translate-y-1">
                  {/* Image Area */}
                  <div className="relative h-48 w-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    {item.image_url ? (
                        <img 
                            src={item.image_url} 
                            alt={item.title} 
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900">
                            <Newspaper className="h-12 w-12 text-slate-300 dark:text-slate-600" />
                        </div>
                    )}
                    <div className="absolute top-3 right-3">
                        <Badge
                            variant={item.published ? "default" : "secondary"}
                            className={`cursor-pointer backdrop-blur-md border-0 ${
                              item.published
                                ? "bg-emerald-500/90 hover:bg-emerald-600/90 text-white"
                                : "bg-slate-500/90 hover:bg-slate-600/90 text-white"
                            }`}
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                togglePublished(item.id, item.published)
                            }}
                          >
                            {item.published ? "Publicado" : "Borrador"}
                        </Badge>
                    </div>
                  </div>

                  {/* Content Area */}
                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-3">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{new Date(item.created_at).toLocaleDateString("es-ES", { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    </div>
                    
                    <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 mb-2 line-clamp-2 leading-tight group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                        {item.title}
                    </h3>
                    
                    <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3 mb-4 flex-1">
                        {item.content || "Sin contenido de texto..."}
                    </p>

                    <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800 mt-auto">
                        <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-gradient-to-br from-orange-100 to-red-100 dark:from-orange-900/30 dark:to-red-900/30 flex items-center justify-center text-orange-700 dark:text-orange-300 text-xs font-bold">
                                {item.profiles?.full_name?.charAt(0) || "U"}
                            </div>
                            <span className="text-xs font-medium text-slate-600 dark:text-slate-300 truncate max-w-[100px]">
                                {item.profiles?.full_name}
                            </span>
                        </div>

                        <div className="flex gap-1">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                asChild
                            >
                                <Link href={`/news/view/${item.id}`}>
                                    <Eye className="h-4 w-4" />
                                </Link>
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 rounded-lg text-slate-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                                asChild
                            >
                                <Link href={`/news/edit/${item.id}`}>
                                    <Edit className="h-4 w-4" />
                                </Link>
                            </Button>
                            {(user?.role === "admin" || user?.role === "supervisor") && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                    onClick={() => handleDeleteClick(item)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <DeleteConfirmationDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog((prev) => ({ ...prev, open }))}
        onConfirm={handleDeleteConfirm}
        title="Eliminar Noticia"
        description="¿Estás seguro de que deseas eliminar esta noticia? Esta acción eliminará permanentemente la noticia y no se podrá recuperar."
        itemName={deleteDialog.newsItem?.title}
        isDeleting={deleteDialog.isDeleting}
      />
    </div>
  )
}
