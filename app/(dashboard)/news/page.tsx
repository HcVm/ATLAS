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
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 lg:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 bg-clip-text text-transparent">
            {selectedCompany ? `Noticias - ${selectedCompany.name}` : "Noticias"}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">Gestiona las noticias de la empresa</p>
        </div>
        <Button
          asChild
          className="w-full sm:w-auto bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
        >
          <Link href="/news/create">
            <Plus className="h-4 w-4 mr-2" />
            <span className="sm:hidden">Nueva Noticia</span>
            <span className="hidden sm:inline">Nueva Noticia</span>
          </Link>
        </Button>
      </div>

      <Card className="shadow-lg border-0 bg-card hover:shadow-xl transition-all duration-300">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar noticias..."
                className="pl-8 border-border focus:border-orange-400 focus:ring-orange-400/20 transition-all duration-300"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-10">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Cargando noticias...</p>
            </div>
          ) : filteredNews.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <div className="p-3 sm:p-4 rounded-full bg-gradient-to-br from-orange-100 to-red-100 dark:from-orange-900/20 dark:to-red-900/20 w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 flex items-center justify-center">
                <Newspaper className="h-6 w-6 sm:h-8 sm:w-8 text-orange-600" />
              </div>
              <h3 className="text-base sm:text-lg font-medium text-foreground mb-2">No hay noticias</h3>
              <p className="text-sm sm:text-base text-muted-foreground">No se encontraron noticias en el sistema.</p>
            </div>
          ) : (
            <div className="rounded-md border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 border-border">
                      <TableHead className="font-semibold text-foreground text-xs sm:text-sm">Título</TableHead>
                      <TableHead className="font-semibold text-foreground text-xs sm:text-sm hidden md:table-cell">
                        Autor
                      </TableHead>
                      <TableHead className="font-semibold text-foreground text-xs sm:text-sm">Estado</TableHead>
                      <TableHead className="font-semibold text-foreground text-xs sm:text-sm hidden sm:table-cell">
                        Fecha
                      </TableHead>
                      <TableHead className="text-right font-semibold text-foreground text-xs sm:text-sm">
                        Acciones
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredNews.map((item) => (
                      <TableRow key={item.id} className="border-border hover:bg-muted/50 transition-all duration-300">
                        <TableCell className="p-2 sm:p-4">
                          <div>
                            <div className="font-medium text-foreground text-sm sm:text-base truncate">
                              {item.title}
                            </div>
                            <div className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mt-1">
                              {item.content.substring(0, 100)}...
                            </div>
                            <div className="md:hidden flex items-center gap-2 mt-2">
                              <div className="p-1 rounded-md bg-gradient-to-br from-orange-100 to-red-100 dark:from-orange-900/20 dark:to-red-900/20">
                                <User className="h-3 w-3 text-orange-600" />
                              </div>
                              <span className="text-xs text-muted-foreground">{item.profiles?.full_name}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell p-2 sm:p-4">
                          <div className="flex items-center gap-2">
                            <div className="p-1 rounded-md bg-gradient-to-br from-orange-100 to-red-100 dark:from-orange-900/20 dark:to-red-900/20">
                              <User className="h-3 w-3 text-orange-600" />
                            </div>
                            <span className="text-muted-foreground text-sm">{item.profiles?.full_name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="p-2 sm:p-4">
                          <Badge
                            variant={item.published ? "default" : "secondary"}
                            className={`cursor-pointer transition-all duration-300 hover:scale-105 text-xs ${
                              item.published
                                ? "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-sm"
                                : "bg-muted hover:bg-muted/80 text-muted-foreground shadow-sm"
                            }`}
                            onClick={() => togglePublished(item.id, item.published)}
                          >
                            {item.published ? "Publicado" : "Borrador"}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell p-2 sm:p-4">
                          <div className="flex items-center gap-2">
                            <div className="p-1 rounded-md bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/20 dark:to-cyan-900/20">
                              <Calendar className="h-3 w-3 text-blue-600" />
                            </div>
                            <span className="text-muted-foreground text-sm">
                              {new Date(item.created_at).toLocaleDateString("es-ES")}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right p-2 sm:p-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="hover:bg-muted transition-colors duration-200 h-8 w-8"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="lucide lucide-more-horizontal"
                                >
                                  <circle cx="12" cy="12" r="1" />
                                  <circle cx="19" cy="12" r="1" />
                                  <circle cx="5" cy="12" r="1" />
                                </svg>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="shadow-lg border-border bg-popover">
                              <DropdownMenuItem asChild>
                                <Link
                                  href={`/news/view/${item.id}`}
                                  className="hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors duration-200"
                                >
                                  <Eye className="mr-2 h-4 w-4 text-blue-600" />
                                  <span>Ver</span>
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link
                                  href={`/news/edit/${item.id}`}
                                  className="hover:bg-green-50 dark:hover:bg-green-950/50 transition-colors duration-200"
                                >
                                  <Edit className="mr-2 h-4 w-4 text-green-600" />
                                  <span>Editar</span>
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => togglePublished(item.id, item.published)}
                                className="hover:bg-yellow-50 dark:hover:bg-yellow-950/50 transition-colors duration-200"
                              >
                                <span className="text-yellow-600">{item.published ? "Despublicar" : "Publicar"}</span>
                              </DropdownMenuItem>
                              {(user?.role === "admin" || user?.role === "supervisor") && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleDeleteClick(item)}
                                    className="text-red-600 focus:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors duration-200"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    <span>Eliminar</span>
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
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
