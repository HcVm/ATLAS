"use client"

import { useState, useEffect } from "react"
import { Plus, Search, Newspaper, Edit, Trash2, Eye } from "lucide-react"
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
import { toast } from "@/hooks/use-toast"
import Link from "next/link"

export default function NewsPage() {
  const { user } = useAuth()
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
  }, [user])

  const fetchNews = async () => {
    try {
      const { data, error } = await supabase
        .from("news")
        .select(`
          *,
          profiles!news_created_by_fkey (full_name)
        `)
        .order("created_at", { ascending: false })

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

      const { error } = await supabase.from("news").delete().eq("id", deleteDialog.newsItem.id)

      if (error) throw error

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
        description: "No se pudo eliminar la noticia: " + error.message,
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Noticias</h1>
          <p className="text-muted-foreground">Gestiona las noticias de la empresa</p>
        </div>
        <Button asChild>
          <Link href="/news/create">
            <Plus className="h-4 w-4 mr-2" />
            Nueva Noticia
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar noticias..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-10">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Cargando noticias...</p>
            </div>
          ) : filteredNews.length === 0 ? (
            <div className="text-center py-10">
              <Newspaper className="h-12 w-12 text-muted-foreground mx-auto" />
              <h3 className="mt-4 text-lg font-medium">No hay noticias</h3>
              <p className="text-muted-foreground">No se encontraron noticias en el sistema.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Autor</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredNews.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.title}</div>
                          <div className="text-sm text-muted-foreground line-clamp-2">
                            {item.content.substring(0, 100)}...
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{item.profiles?.full_name}</TableCell>
                      <TableCell>
                        <Badge
                          variant={item.published ? "default" : "secondary"}
                          className="cursor-pointer"
                          onClick={() => togglePublished(item.id, item.published)}
                        >
                          {item.published ? "Publicado" : "Borrador"}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(item.created_at).toLocaleDateString("es-ES")}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
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
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/news/view/${item.id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                <span>Ver</span>
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/news/edit/${item.id}`}>
                                <Edit className="mr-2 h-4 w-4" />
                                <span>Editar</span>
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => togglePublished(item.id, item.published)}>
                              <span>{item.published ? "Despublicar" : "Publicar"}</span>
                            </DropdownMenuItem>
                            {user?.role === "admin" && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDeleteClick(item)}
                                  className="text-red-600 focus:text-red-600"
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
