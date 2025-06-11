"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Plus, Search, Eye, Edit, Trash2, FileText, MoreHorizontal, Loader2, RefreshCw } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { toast } from "@/hooks/use-toast"

export default function DocumentsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [documents, setDocuments] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all")
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean
    document: any | null
    isDeleting: boolean
  }>({
    open: false,
    document: null,
    isDeleting: false,
  })

  useEffect(() => {
    if (user) {
      fetchDocuments()
      fetchDepartments()
    }
  }, [user])

  const fetchDocuments = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError(null)

      // Primero intentar con la relación específica
      let query = supabase
        .from("documents")
        .select(`
          *,
          profiles!documents_created_by_fkey (id, full_name, email),
          departments!documents_current_department_id_fkey (id, name)
        `)
        .order("created_at", { ascending: false })

      // Users can see:
      // 1. Documents from their department (if they have one)
      // 2. Documents they created themselves
      // Admins can see all documents
      if (user && user.role !== "admin") {
        if (user.department_id) {
          // Documents from their department OR documents they created
          query = query.or(`current_department_id.eq.${user.department_id},created_by.eq.${user.id}`)
        } else {
          // Only documents they created if they don't have a department
          query = query.eq("created_by", user.id)
        }
      }

      const { data, error } = await query

      if (error) {
        console.error("Error with specific relationship, trying fallback:", error)

        // Fallback: intentar sin la relación específica
        let fallbackQuery = supabase
          .from("documents")
          .select(`
            *,
            profiles!documents_created_by_fkey (id, full_name, email)
          `)
          .order("created_at", { ascending: false })

        if (user && user.role !== "admin") {
          if (user.department_id) {
            fallbackQuery = fallbackQuery.or(`current_department_id.eq.${user.department_id},created_by.eq.${user.id}`)
          } else {
            fallbackQuery = fallbackQuery.eq("created_by", user.id)
          }
        }

        const { data: fallbackData, error: fallbackError } = await fallbackQuery

        if (fallbackError) {
          throw fallbackError
        }

        // Obtener departamentos por separado
        const { data: deptData } = await supabase.from("departments").select("id, name")
        const deptMap = new Map(deptData?.map((d) => [d.id, d]) || [])

        // Combinar datos manualmente
        const combinedData =
          fallbackData?.map((doc) => ({
            ...doc,
            departments: doc.current_department_id ? deptMap.get(doc.current_department_id) : null,
          })) || []

        setDocuments(combinedData)
      } else {
        setDocuments(data || [])
      }
    } catch (error: any) {
      console.error("Error fetching documents:", error)
      setError("Error al cargar los documentos: " + error.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase.from("departments").select("*").order("name")

      if (error) throw error
      setDepartments(data || [])
    } catch (error) {
      console.error("Error fetching departments:", error)
    }
  }

  const handleRefresh = () => {
    fetchDocuments(true)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            Pendiente
          </Badge>
        )
      case "in_progress":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            En Progreso
          </Badge>
        )
      case "completed":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            Completado
          </Badge>
        )
      case "cancelled":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            Cancelado
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getDocumentBadge = (document: any) => {
    if (document.created_by === user?.id) {
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 ml-2">
          Creado por mí
        </Badge>
      )
    }
    if (user?.department_id && document.current_department_id === user.department_id) {
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 ml-2">
          Mi departamento
        </Badge>
      )
    }
    return null
  }

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.document_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesDepartment = selectedDepartment === "all" || doc.current_department_id === selectedDepartment
    const matchesStatus = selectedStatus === "all" || doc.status === selectedStatus

    return matchesSearch && matchesDepartment && matchesStatus
  })

  const handleDeleteClick = (document: any) => {
    setDeleteDialog({
      open: true,
      document,
      isDeleting: false,
    })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.document) return

    try {
      setDeleteDialog((prev) => ({ ...prev, isDeleting: true }))

      const { error } = await supabase.from("documents").delete().eq("id", deleteDialog.document.id)

      if (error) throw error

      setDocuments(documents.filter((doc) => doc.id !== deleteDialog.document.id))

      toast({
        title: "Documento eliminado",
        description: "El documento ha sido eliminado correctamente.",
      })

      setDeleteDialog({
        open: false,
        document: null,
        isDeleting: false,
      })
    } catch (error: any) {
      console.error("Error deleting document:", error)
      toast({
        title: "Error al eliminar",
        description: "No se pudo eliminar el documento: " + error.message,
        variant: "destructive",
      })
      setDeleteDialog((prev) => ({ ...prev, isDeleting: false }))
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Cargando documentos...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Documentos</h1>
          <p className="text-muted-foreground">
            {user?.role === "admin"
              ? "Gestiona todos los documentos del sistema"
              : "Documentos de tu departamento y los que has creado"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing} className="flex items-center gap-2">
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Actualizando..." : "Actualizar"}
          </Button>
          <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md">
            <Link href="/documents/new">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Documento
            </Link>
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Busca y filtra documentos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar por título, número o descripción..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            {user?.role === "admin" && (
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Departamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los departamentos</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="pending">Pendiente</SelectItem>
                <SelectItem value="in_progress">En Progreso</SelectItem>
                <SelectItem value="completed">Completado</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Documentos</CardTitle>
          <CardDescription>{filteredDocuments.length} documento(s) encontrado(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredDocuments.length === 0 ? (
            <div className="text-center py-10">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
              <h3 className="mt-4 text-lg font-medium">No hay documentos</h3>
              <p className="text-muted-foreground">
                {searchTerm || selectedDepartment !== "all" || selectedStatus !== "all"
                  ? "No se encontraron documentos con los filtros aplicados."
                  : "Comienza creando tu primer documento."}
              </p>
              {!searchTerm && selectedDepartment === "all" && selectedStatus === "all" && (
                <Button asChild className="mt-4 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md">
                  <Link href="/documents/new">
                    <Plus className="h-4 w-4 mr-2" />
                    Crear Documento
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Número</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead>Creado por</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map((document) => (
                    <TableRow key={document.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center">
                          {document.title || "Sin título"}
                          {getDocumentBadge(document)}
                        </div>
                      </TableCell>
                      <TableCell>{document.document_number || "Sin número"}</TableCell>
                      <TableCell>{getStatusBadge(document.status)}</TableCell>
                      <TableCell>{document.departments?.name || "Sin departamento"}</TableCell>
                      <TableCell>{document.profiles?.full_name || "Usuario desconocido"}</TableCell>
                      <TableCell>
                        {document.created_at
                          ? format(new Date(document.created_at), "dd/MM/yyyy", { locale: es })
                          : "Sin fecha"}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Abrir menú de acciones</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => router.push(`/documents/${document.id}`)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Ver detalles
                            </DropdownMenuItem>
                            {(user?.role === "admin" || document.created_by === user?.id) && (
                              <DropdownMenuItem onClick={() => router.push(`/documents/edit/${document.id}`)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                            )}
                            {user?.role === "admin" && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDeleteClick(document)}
                                  className="text-red-600 focus:text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Eliminar
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
        title="Eliminar Documento"
        description="¿Estás seguro de que deseas eliminar este documento? Se eliminarán también todos sus movimientos y archivos adjuntos."
        itemName={deleteDialog.document?.title || deleteDialog.document?.document_number}
        isDeleting={deleteDialog.isDeleting}
      />
    </div>
  )
}
