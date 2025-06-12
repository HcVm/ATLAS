"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Plus, Search, Eye, Edit, Trash2, FileText, MoreHorizontal, Loader2, RefreshCw, Filter } from "lucide-react"
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
          <Badge
            variant="outline"
            className="bg-gradient-to-r from-yellow-50 to-orange-50 text-yellow-700 border-yellow-200 shadow-sm"
          >
            Pendiente
          </Badge>
        )
      case "in_progress":
        return (
          <Badge
            variant="outline"
            className="bg-gradient-to-r from-blue-50 to-cyan-50 text-blue-700 border-blue-200 shadow-sm"
          >
            En Progreso
          </Badge>
        )
      case "completed":
        return (
          <Badge
            variant="outline"
            className="bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border-green-200 shadow-sm"
          >
            Completado
          </Badge>
        )
      case "cancelled":
        return (
          <Badge
            variant="outline"
            className="bg-gradient-to-r from-red-50 to-rose-50 text-red-700 border-red-200 shadow-sm"
          >
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
        <Badge
          variant="outline"
          className="bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border-green-200 ml-2 shadow-sm"
        >
          Creado por mí
        </Badge>
      )
    }
    if (user?.department_id && document.current_department_id === user.department_id) {
      return (
        <Badge
          variant="outline"
          className="bg-gradient-to-r from-blue-50 to-cyan-50 text-blue-700 border-blue-200 ml-2 shadow-sm"
        >
          Mi departamento
        </Badge>
      )
    }
    return null
  }

  const getDepartmentBadge = (department: any) => {
    if (!department) return null

    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-800 border border-blue-200 shadow-sm">
        {department.name}
      </span>
    )
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
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2 text-muted-foreground">Cargando documentos...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent">
            Documentos
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            {user?.role === "admin"
              ? "Gestiona todos los documentos del sistema"
              : "Documentos de tu departamento y los que has creado"}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 hover:shadow-md transition-all duration-300 hover:scale-105 w-full sm:w-auto"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            <span className="sm:hidden">{refreshing ? "Actualizando..." : "Actualizar"}</span>
            <span className="hidden sm:inline">{refreshing ? "Actualizando..." : "Actualizar"}</span>
          </Button>
          <Button
            asChild
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 w-full sm:w-auto"
          >
            <Link href="/documents/new">
              <Plus className="h-4 w-4 mr-2" />
              <span className="sm:hidden">Nuevo Doc</span>
              <span className="hidden sm:inline">Nuevo Documento</span>
            </Link>
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="border-red-200 bg-red-50">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50/50 hover:shadow-xl transition-all duration-300">
        <CardHeader className="border-b border-gray-100 p-4 sm:p-6">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-100 to-purple-100">
              <Filter className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-base sm:text-lg text-gray-900">Filtros</CardTitle>
              <CardDescription className="text-sm">Busca y filtra documentos</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar por título, número o descripción..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-gray-200 focus:border-blue-400 focus:ring-blue-400/20 transition-all duration-300"
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              {user?.role === "admin" && (
                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                  <SelectTrigger className="w-full border-gray-200 focus:border-blue-400 focus:ring-blue-400/20 transition-all duration-300">
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
                <SelectTrigger className="w-full border-gray-200 focus:border-blue-400 focus:ring-blue-400/20 transition-all duration-300">
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
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50/50 hover:shadow-xl transition-all duration-300">
        <CardHeader className="border-b border-gray-100 p-4 sm:p-6">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-green-100 to-blue-100">
              <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
            </div>
            <div>
              <CardTitle className="text-base sm:text-lg text-gray-900">Lista de Documentos</CardTitle>
              <CardDescription className="text-sm">
                {filteredDocuments.length} documento(s) encontrado(s)
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredDocuments.length === 0 ? (
            <div className="text-center py-8 sm:py-12 px-4 sm:px-6">
              <div className="p-3 sm:p-4 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 flex items-center justify-center">
                <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400" />
              </div>
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">No hay documentos</h3>
              <p className="text-sm sm:text-base text-muted-foreground mb-4">
                {searchTerm || selectedDepartment !== "all" || selectedStatus !== "all"
                  ? "No se encontraron documentos con los filtros aplicados."
                  : "Comienza creando tu primer documento."}
              </p>
              {!searchTerm && selectedDepartment === "all" && selectedStatus === "all" && (
                <Button
                  asChild
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                >
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
                  <TableRow className="border-gray-100">
                    <TableHead className="font-semibold text-gray-700 text-xs sm:text-sm">Título</TableHead>
                    <TableHead className="font-semibold text-gray-700 text-xs sm:text-sm hidden sm:table-cell">
                      Número
                    </TableHead>
                    <TableHead className="font-semibold text-gray-700 text-xs sm:text-sm">Estado</TableHead>
                    <TableHead className="font-semibold text-gray-700 text-xs sm:text-sm hidden lg:table-cell">
                      Departamento
                    </TableHead>
                    <TableHead className="font-semibold text-gray-700 text-xs sm:text-sm hidden md:table-cell">
                      Creado por
                    </TableHead>
                    <TableHead className="font-semibold text-gray-700 text-xs sm:text-sm hidden sm:table-cell">
                      Fecha
                    </TableHead>
                    <TableHead className="text-right font-semibold text-gray-700 text-xs sm:text-sm">
                      Acciones
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map((document) => (
                    <TableRow
                      key={document.id}
                      className="border-gray-100 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-purple-50/50 transition-all duration-300"
                    >
                      <TableCell className="font-medium p-2 sm:p-4">
                        <div className="flex flex-col">
                          <div className="flex items-center">
                            <span className="truncate max-w-[120px] sm:max-w-none text-sm">
                              {document.title || "Sin título"}
                            </span>
                            {getDocumentBadge(document)}
                          </div>
                          <div className="sm:hidden text-xs text-muted-foreground mt-1">
                            {document.document_number || "Sin número"}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-600 text-sm hidden sm:table-cell p-2 sm:p-4">
                        {document.document_number || "Sin número"}
                      </TableCell>
                      <TableCell className="p-2 sm:p-4">{getStatusBadge(document.status)}</TableCell>
                      <TableCell className="hidden lg:table-cell p-2 sm:p-4">
                        {document.departments ? (
                          getDepartmentBadge(document.departments)
                        ) : (
                          <span className="text-muted-foreground text-sm">Sin departamento</span>
                        )}
                      </TableCell>
                      <TableCell className="text-gray-600 text-sm hidden md:table-cell p-2 sm:p-4">
                        {document.profiles?.full_name || "Usuario desconocido"}
                      </TableCell>
                      <TableCell className="text-gray-600 text-sm hidden sm:table-cell p-2 sm:p-4">
                        {document.created_at
                          ? format(new Date(document.created_at), "dd/MM/yyyy", { locale: es })
                          : "Sin fecha"}
                      </TableCell>
                      <TableCell className="text-right p-2 sm:p-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              className="h-8 w-8 p-0 hover:bg-gray-100 transition-colors duration-200"
                            >
                              <span className="sr-only">Abrir menú de acciones</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 shadow-lg border-gray-200">
                            <DropdownMenuItem
                              onClick={() => router.push(`/documents/${document.id}`)}
                              className="hover:bg-blue-50 transition-colors duration-200"
                            >
                              <Eye className="h-4 w-4 mr-2 text-blue-600" />
                              Ver detalles
                            </DropdownMenuItem>
                            {(user?.role === "admin" || document.created_by === user?.id) && (
                              <DropdownMenuItem
                                onClick={() => router.push(`/documents/edit/${document.id}`)}
                                className="hover:bg-green-50 transition-colors duration-200"
                              >
                                <Edit className="h-4 w-4 mr-2 text-green-600" />
                                Editar
                              </DropdownMenuItem>
                            )}
                            {user?.role === "admin" && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDeleteClick(document)}
                                  className="text-red-600 focus:text-red-600 hover:bg-red-50 transition-colors duration-200"
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
