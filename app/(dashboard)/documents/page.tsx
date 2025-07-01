"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Plus, Search, Eye, Edit, Trash2, FileText, MoreHorizontal, Loader2, RefreshCw, Filter } from "lucide-react"
import { format, differenceInDays } from "date-fns"
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
import { useCompany } from "@/lib/company-context"
import { toast } from "@/hooks/use-toast"

// Función para determinar el estado del semáforo basado en días transcurridos desde el último movimiento
const getTrafficLightStatus = (createdAt: string, status: string, lastMovementDate?: string) => {
  // Solo aplicar semáforo a documentos pendientes o en progreso
  if (status === "completed" || status === "cancelled") {
    return null
  }

  // Usar la fecha del último movimiento si existe, sino usar la fecha de creación
  const referenceDate = lastMovementDate || createdAt
  const daysPassed = differenceInDays(new Date(), new Date(referenceDate))

  if (daysPassed >= 3) {
    return {
      color: "bg-red-500",
      textColor: "text-red-700",
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
      message: "¡URGENTE! Sin respuesta por más de 3 días",
      icon: "🔴",
    }
  } else if (daysPassed >= 1) {
    return {
      color: "bg-yellow-500",
      textColor: "text-yellow-700",
      bgColor: "bg-yellow-50",
      borderColor: "border-yellow-200",
      message: "Pendiente de respuesta",
      icon: "🟡",
    }
  } else {
    // Documentos nuevos o recién movidos (menos de 1 día)
    return {
      color: "bg-green-500",
      textColor: "text-green-700",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
      message: lastMovementDate ? "Recién movido a este departamento" : "Documento recién creado",
      icon: "🟢",
    }
  }
}

// Función helper para obtener la fecha del último movimiento al departamento actual
const getLastMovementToCurrentDepartment = (document: any) => {
  if (!document.document_movements || document.document_movements.length === 0) {
    return null
  }

  // Buscar el último movimiento hacia el departamento actual
  const movementsToCurrentDept = document.document_movements
    .filter((movement: any) => movement.to_department_id === document.current_department_id)
    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return movementsToCurrentDept.length > 0 ? movementsToCurrentDept[0].created_at : null
}

export default function DocumentsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { selectedCompany } = useCompany()
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
  }, [user, selectedCompany])

  const fetchDocuments = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError(null)

      // Primero intentar con la relación específica incluyendo movimientos
      let query = supabase
        .from("documents")
        .select(`
    *,
    profiles!documents_created_by_fkey (id, full_name, email, company_id),
    departments!documents_current_department_id_fkey (id, name),
    document_movements!document_movements_document_id_fkey (
      id, 
      created_at, 
      to_department_id
    )
  `)
        .order("created_at", { ascending: false })

      // Filtrar por empresa seleccionada si el usuario es admin
      if (user?.role === "admin" && selectedCompany) {
        query = query.eq("company_id", selectedCompany.id)
      }
      // Si no es admin, aplicar filtros normales de permisos
      else if (user && user.role !== "admin") {
        if (user.department_id) {
          // Documents from their department OR documents they created
          query = query.or(`current_department_id.eq.${user.department_id},created_by.eq.${user.id}`)
        } else {
          // Only documents they created if they don't have a department
          query = query.eq("created_by", user.id)
        }

        // Además, filtrar por la empresa del usuario
        if (user.company_id) {
          query = query.eq("company_id", user.company_id)
        }
      }

      const { data, error } = await query

      if (error) {
        console.error("Error with specific relationship, trying fallback:", error)

        // Fallback: intentar sin la relación específica pero con movimientos
        let fallbackQuery = supabase
          .from("documents")
          .select(`
    *,
    profiles!documents_created_by_fkey (id, full_name, email, company_id),
    document_movements!document_movements_document_id_fkey (
      id, 
      created_at, 
      to_department_id
    )
  `)
          .order("created_at", { ascending: false })

        // Aplicar los mismos filtros de empresa
        if (user?.role === "admin" && selectedCompany) {
          fallbackQuery = fallbackQuery.eq("company_id", selectedCompany.id)
        } else if (user && user.role !== "admin") {
          if (user.department_id) {
            fallbackQuery = fallbackQuery.or(`current_department_id.eq.${user.department_id},created_by.eq.${user.id}`)
          } else {
            fallbackQuery = fallbackQuery.eq("created_by", user.id)
          }

          if (user.company_id) {
            fallbackQuery = fallbackQuery.eq("company_id", user.company_id)
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
      let query = supabase.from("departments").select("*").order("name")

      // Filtrar por empresa seleccionada si el usuario es admin
      if (user?.role === "admin" && selectedCompany) {
        query = query.eq("company_id", selectedCompany.id)
      }
      // Si no es admin, filtrar por la empresa del usuario
      else if (user && user.role !== "admin" && user.company_id) {
        query = query.eq("company_id", user.company_id)
      }

      const { data, error } = await query

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
            className="bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-700 border-amber-200 shadow-sm"
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
            className="bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 border-emerald-200 shadow-sm"
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
        return (
          <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">
            {status}
          </Badge>
        )
    }
  }

  const getDocumentBadge = (document: any) => {
    if (document.created_by === user?.id) {
      return (
        <Badge
          variant="outline"
          className="bg-gradient-to-r from-slate-50 to-slate-100 text-slate-700 border-slate-200 ml-2 shadow-sm"
        >
          Creado por mí
        </Badge>
      )
    }
    if (user?.department_id && document.current_department_id === user.department_id) {
      return (
        <Badge
          variant="outline"
          className="bg-gradient-to-r from-slate-100 to-slate-200 text-slate-700 border-slate-300 ml-2 shadow-sm"
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
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-slate-50 to-slate-100 text-slate-700 border border-slate-200 shadow-sm">
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

      console.log("Attempting to delete document:", deleteDialog.document.id)

      // Con las políticas RLS y CASCADE configuradas, solo necesitamos eliminar el documento
      // Las tablas relacionadas se eliminarán automáticamente por CASCADE
      const { error } = await supabase.from("documents").delete().eq("id", deleteDialog.document.id)

      if (error) {
        console.error("Delete error:", error)
        throw error
      }

      console.log("Document deleted successfully")

      // Actualizar la lista local inmediatamente
      setDocuments(documents.filter((doc) => doc.id !== deleteDialog.document.id))

      toast({
        title: "Documento eliminado",
        description: "El documento y todos sus datos relacionados han sido eliminados correctamente.",
      })

      setDeleteDialog({
        open: false,
        document: null,
        isDeleting: false,
      })

      // Refrescar la lista después de un momento para verificar
      setTimeout(() => {
        fetchDocuments(true)
      }, 1000)
    } catch (error: any) {
      console.error("Error deleting document:", error)

      let errorMessage = "No se pudo eliminar el documento."

      if (error.code === "42501") {
        errorMessage = "No tienes permisos para eliminar este documento."
      } else if (error.code === "23503") {
        errorMessage = "No se puede eliminar el documento porque tiene datos relacionados."
      } else if (error.message) {
        errorMessage = error.message
      }

      toast({
        title: "Error al eliminar",
        description: errorMessage,
        variant: "destructive",
      })

      setDeleteDialog((prev) => ({ ...prev, isDeleting: false }))
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen  p-6 space-y-6">
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-slate-600 dark:text-slate-300" />
          <span className="ml-2 text-slate-600 dark:text-slate-300">Cargando documentos...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-slate-700 via-slate-600 to-slate-500 bg-clip-text text-transparent">
            Documentos
          </h1>
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1">
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
            className="flex items-center gap-2 bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:shadow-md transition-all duration-300 hover:scale-105 w-full sm:w-auto"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            <span className="sm:hidden">{refreshing ? "Actualizando..." : "Actualizar"}</span>
            <span className="hidden sm:inline">{refreshing ? "Actualizando..." : "Actualizar"}</span>
          </Button>
          <Button
            asChild
            className="bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 w-full sm:w-auto"
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
          <AlertDescription className="text-red-700">{error}</AlertDescription>
        </Alert>
      )}

      {/* Alerta para documentos urgentes */}
      {(() => {
        const urgentDocs = filteredDocuments.filter((doc) => {
          const lastMovementDate = getLastMovementToCurrentDepartment(doc)
          const trafficLight = getTrafficLightStatus(doc.created_at, doc.status, lastMovementDate)
          return trafficLight && trafficLight.icon === "🔴"
        })

        return urgentDocs.length > 0 ? (
          <Alert className="border-red-200 bg-red-50">
            <AlertDescription className="text-red-700">
              <div className="flex items-center gap-2">
                <span className="text-lg">🚨</span>
                <span>
                  Tienes <strong>{urgentDocs.length}</strong> documento(s) urgente(s) sin respuesta por más de 3 días.
                </span>
              </div>
            </AlertDescription>
          </Alert>
        ) : null
      })()}

      <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-700/50 hover:shadow-xl transition-all duration-300">
        <CardHeader className="border-b border-slate-100 dark:border-slate-600 p-4 sm:p-6">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-slate-100 dark:bg-slate-700 to-slate-200">
              <Filter className="h-4 w-4 sm:h-5 sm:w-5 text-slate-600 dark:text-slate-300" />
            </div>
            <div>
              <CardTitle className="text-base sm:text-lg text-slate-800 dark:text-slate-100">Filtros</CardTitle>
              <CardDescription className="text-sm text-slate-600 dark:text-slate-300">
                Busca y filtra documentos
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500 h-4 w-4" />
                <Input
                  placeholder="Buscar por título, número o descripción..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-slate-200 dark:border-slate-700 focus:border-slate-400 focus:ring-slate-400/20 transition-all duration-300 bg-white dark:bg-slate-800"
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              {user?.role === "admin" && (
                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                  <SelectTrigger className="w-full border-slate-200 dark:border-slate-700 focus:border-slate-400 focus:ring-slate-400/20 transition-all duration-300 bg-white dark:bg-slate-800">
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
                <SelectTrigger className="w-full border-slate-200 dark:border-slate-700 focus:border-slate-400 focus:ring-slate-400/20 transition-all duration-300 bg-white dark:bg-slate-800">
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

      <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-700/50 hover:shadow-xl transition-all duration-300">
        <CardHeader className="border-b border-slate-100 dark:border-slate-600 p-4 sm:p-6">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-slate-100 dark:bg-slate-700 to-slate-200">
              <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-slate-600 dark:text-slate-300" />
            </div>
            <div>
              <CardTitle className="text-base sm:text-lg text-slate-800 dark:text-slate-100">
                Lista de Documentos
              </CardTitle>
              <CardDescription className="text-sm text-slate-600 dark:text-slate-300">
                {filteredDocuments.length} documento(s) encontrado(s)
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredDocuments.length === 0 ? (
            <div className="text-center py-8 sm:py-12 px-4 sm:px-6">
              <div className="p-3 sm:p-4 rounded-full bg-gradient-to-br from-slate-100 dark:bg-slate-700 to-slate-200 w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 flex items-center justify-center">
                <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-slate-400 dark:text-slate-500" />
              </div>
              <h3 className="text-base sm:text-lg font-medium text-slate-800 dark:text-slate-100 mb-2">
                No hay documentos
              </h3>
              <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mb-4">
                {searchTerm || selectedDepartment !== "all" || selectedStatus !== "all"
                  ? "No se encontraron documentos con los filtros aplicados."
                  : "Comienza creando tu primer documento."}
              </p>
              {!searchTerm && selectedDepartment === "all" && selectedStatus === "all" && (
                <Button
                  asChild
                  className="bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
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
                  <TableRow className="border-slate-100 dark:border-slate-600">
                    <TableHead className="font-semibold text-slate-700 dark:text-slate-200 text-xs sm:text-sm">
                      Título
                    </TableHead>
                    <TableHead className="font-semibold text-slate-700 dark:text-slate-200 text-xs sm:text-sm hidden sm:table-cell">
                      Número
                    </TableHead>
                    <TableHead className="font-semibold text-slate-700 dark:text-slate-200 text-xs sm:text-sm">
                      Estado
                    </TableHead>
                    <TableHead className="font-semibold text-slate-700 dark:text-slate-200 text-xs sm:text-sm hidden lg:table-cell">
                      Departamento
                    </TableHead>
                    <TableHead className="font-semibold text-slate-700 dark:text-slate-200 text-xs sm:text-sm hidden md:table-cell">
                      Creado por
                    </TableHead>
                    <TableHead className="font-semibold text-slate-700 dark:text-slate-200 text-xs sm:text-sm hidden sm:table-cell">
                      Fecha
                    </TableHead>
                    <TableHead className="text-right font-semibold text-slate-700 dark:text-slate-200 text-xs sm:text-sm">
                      Acciones
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map((document) => (
                    <TableRow
                      key={document.id}
                      className="border-slate-100 dark:border-slate-600 hover:bg-gradient-to-r hover:from-slate-50/50 hover:to-slate-100/50 transition-all duration-300"
                    >
                      <TableCell className="font-medium p-2 sm:p-4">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="truncate max-w-[120px] sm:max-w-none text-sm text-slate-700 dark:text-slate-200">
                              {document.title || "Sin título"}
                            </span>
                            {getDocumentBadge(document)}
                            {(() => {
                              const lastMovementDate = getLastMovementToCurrentDepartment(document)
                              const trafficLight = getTrafficLightStatus(
                                document.created_at,
                                document.status,
                                lastMovementDate,
                              )
                              return trafficLight ? (
                                <div
                                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${trafficLight.bgColor} ${trafficLight.textColor} ${trafficLight.borderColor} border shadow-sm`}
                                  title={trafficLight.message}
                                >
                                  <span className="mr-1">{trafficLight.icon}</span>
                                  {trafficLight.message}
                                </div>
                              ) : null
                            })()}
                          </div>
                          <div className="sm:hidden text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {document.document_number || "Sin número"}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-600 dark:text-slate-300 text-sm hidden sm:table-cell p-2 sm:p-4">
                        {document.document_number || "Sin número"}
                      </TableCell>
                      <TableCell className="p-2 sm:p-4">{getStatusBadge(document.status)}</TableCell>
                      <TableCell className="hidden lg:table-cell p-2 sm:p-4">
                        {document.departments ? (
                          getDepartmentBadge(document.departments)
                        ) : (
                          <span className="text-slate-500 dark:text-slate-400 text-sm">Sin departamento</span>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-600 dark:text-slate-300 text-sm hidden md:table-cell p-2 sm:p-4">
                        {document.profiles?.full_name || "Usuario desconocido"}
                      </TableCell>
                      <TableCell className="text-slate-600 dark:text-slate-300 text-sm hidden sm:table-cell p-2 sm:p-4">
                        {document.created_at
                          ? format(new Date(document.created_at), "dd/MM/yyyy", { locale: es })
                          : "Sin fecha"}
                      </TableCell>
                      <TableCell className="text-right p-2 sm:p-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              className="h-8 w-8 p-0 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors duration-200"
                            >
                              <span className="sr-only">Abrir menú de acciones</span>
                              <MoreHorizontal className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="w-48 shadow-lg border-slate-200 dark:border-slate-700"
                          >
                            <DropdownMenuItem
                              onClick={() => router.push(`/documents/${document.id}`)}
                              className="hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors duration-200"
                            >
                              <Eye className="h-4 w-4 mr-2 text-slate-600 dark:text-slate-300" />
                              Ver detalles
                            </DropdownMenuItem>
                            {(user?.role === "admin" || document.created_by === user?.id) && (
                              <DropdownMenuItem
                                onClick={() => router.push(`/documents/edit/${document.id}`)}
                                className="hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors duration-200"
                              >
                                <Edit className="h-4 w-4 mr-2 text-slate-600 dark:text-slate-300" />
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
