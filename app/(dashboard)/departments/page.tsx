"use client"

import { DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

import { useState, useEffect } from "react"
import { Plus, Search, Building2, Edit, Trash2, Users, Home, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { toast } from "@/hooks/use-toast"
import { useCompany } from "@/lib/company-context"

export default function DepartmentsPage() {
  const { user } = useAuth()
  const [departments, setDepartments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean
    department: any | null
    isDeleting: boolean
  }>({
    open: false,
    department: null,
    isDeleting: false,
  })
  const router = useRouter()
  const { selectedCompany } = useCompany()

  // Determinar si estamos en vista general
  const isGeneralView = !selectedCompany || selectedCompany.code === "general" || !selectedCompany.id
  const canCreateDepartment = !isGeneralView && selectedCompany?.id

  useEffect(() => {
    if (user && user.role === "admin") {
      fetchDepartments()
    }
  }, [user, selectedCompany])

  const fetchDepartments = async () => {
    try {
      // Get current company from context
      const currentCompanyId = selectedCompany?.id

      let query = supabase.from("departments").select(`
      *,
      companies(
        id,
        name,
        code
      )
    `)

      // Filter by company if a specific company is selected
      if (currentCompanyId && !isGeneralView) {
        query = query.eq("company_id", currentCompanyId)
      }

      const { data: departmentsData, error: deptError } = await query.order("name")

      if (deptError) throw deptError

      console.log("=== DEBUG BADGES ===")
      console.log("Selected company:", selectedCompany)
      console.log("Is general view:", isGeneralView)
      console.log("Can create department:", canCreateDepartment)

      // Then get user counts for each department
      const departmentsWithCounts = await Promise.all(
        (departmentsData || []).map(async (dept) => {
          let countQuery = supabase
            .from("profiles")
            .select("*", { count: "exact", head: true })
            .eq("department_id", dept.id)

          // Also filter user count by company if specific company is selected
          if (currentCompanyId && !isGeneralView) {
            countQuery = countQuery.eq("company_id", currentCompanyId)
          }

          const { count, error: countError } = await countQuery

          if (countError) {
            console.error(`Error counting users for department ${dept.id}:`, countError)
            return { ...dept, userCount: 0 }
          }

          return { ...dept, userCount: count || 0 }
        }),
      )

      setDepartments(departmentsWithCounts)
    } catch (error) {
      console.error("Error fetching departments:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateDepartment = () => {
    if (!canCreateDepartment) {
      toast({
        title: "Selecciona una empresa",
        description: "Debes seleccionar una empresa específica para crear departamentos.",
        variant: "destructive",
      })
      return
    }
    router.push("/departments/new")
  }

  const handleDeleteClick = (department: any) => {
    setDeleteDialog({
      open: true,
      department,
      isDeleting: false,
    })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.department) return

    try {
      setDeleteDialog((prev) => ({ ...prev, isDeleting: true }))

      // Check if department has users
      const { data: users } = await supabase
        .from("profiles")
        .select("id")
        .eq("department_id", deleteDialog.department.id)
        .limit(1)

      if (users && users.length > 0) {
        toast({
          title: "No se puede eliminar",
          description: "Este departamento tiene usuarios asignados. Reasigna o elimina los usuarios primero.",
          variant: "destructive",
        })
        setDeleteDialog((prev) => ({ ...prev, isDeleting: false }))
        return
      }

      // Check if department has documents
      const { data: documents } = await supabase
        .from("documents")
        .select("id")
        .eq("department_id", deleteDialog.department.id)
        .limit(1)

      if (documents && documents.length > 0) {
        toast({
          title: "No se puede eliminar",
          description: "Este departamento tiene documentos asociados. Reasigna o elimina los documentos primero.",
          variant: "destructive",
        })
        setDeleteDialog((prev) => ({ ...prev, isDeleting: false }))
        return
      }

      // Delete the department
      const { error } = await supabase.from("departments").delete().eq("id", deleteDialog.department.id)

      if (error) throw error

      setDepartments(departments.filter((dept) => dept.id !== deleteDialog.department.id))

      toast({
        title: "Departamento eliminado",
        description: "El departamento ha sido eliminado correctamente.",
      })

      setDeleteDialog({
        open: false,
        department: null,
        isDeleting: false,
      })
    } catch (error: any) {
      console.error("Error deleting department:", error)
      toast({
        title: "Error al eliminar",
        description: "No se pudo eliminar el departamento: " + error.message,
        variant: "destructive",
      })
      setDeleteDialog((prev) => ({ ...prev, isDeleting: false }))
    }
  }

  const filteredDepartments = departments.filter(
    (dept) =>
      dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (dept.description && dept.description.toLowerCase().includes(searchTerm.toLowerCase())),
  )

  if (user?.role !== "admin") {
    return (
      <div className="text-center py-10">
        <h1 className="text-2xl font-bold">Acceso Denegado</h1>
        <p className="text-muted-foreground">No tienes permisos para acceder a esta página.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen space-y-4 sm:space-y-6 p-3 sm:p-4 lg:p-6">
      {/* Breadcrumbs */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard" className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              Dashboard
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Departamentos
              {isGeneralView && (
                <Badge variant="outline" className="ml-2 bg-blue-50 text-blue-700 border-blue-200">
                  Vista General
                </Badge>
              )}
              {!isGeneralView && selectedCompany && (
                <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 border-green-200">
                  {selectedCompany.name}
                </Badge>
              )}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-slate-700 via-slate-600 to-slate-500 bg-clip-text text-transparent">
            Departamentos
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            {isGeneralView
              ? "Gestiona todos los departamentos de todas las empresas"
              : `Gestiona los departamentos de ${selectedCompany?.name || "la empresa seleccionada"}`}
          </p>
        </div>

        {/* Botón de crear con validación */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Button
                  onClick={handleCreateDepartment}
                  disabled={!canCreateDepartment}
                  className={`w-full sm:w-auto shadow-lg hover:shadow-xl transition-all duration-300 ${
                    canCreateDepartment
                      ? "bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white hover:scale-105"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  {!canCreateDepartment && <AlertCircle className="h-4 w-4 mr-2" />}
                  <Plus className="h-4 w-4 mr-2" />
                  <span className="sm:hidden">Nuevo Depto</span>
                  <span className="hidden sm:inline">Nuevo Departamento</span>
                </Button>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              {canCreateDepartment
                ? `Crear nuevo departamento para ${selectedCompany?.name}`
                : "Selecciona una empresa específica para crear departamentos"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Mensaje informativo en vista general */}
      {isGeneralView && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800">Vista General Activa</p>
                <p className="text-xs text-amber-700 mt-1">
                  Para crear departamentos, selecciona una empresa específica en el selector de empresas.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-700/50 hover:shadow-xl transition-all duration-300 border-slate-200 dark:border-slate-700">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar departamentos..."
                className="pl-8 border-slate-200 dark:border-slate-700 focus:border-slate-400 focus:ring-slate-400/20 transition-all duration-300"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-10">
              <div className="animate-spin rounded-full h-12 w-12 border-slate-600 dark:border-slate-300 mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Cargando departamentos...</p>
            </div>
          ) : filteredDepartments.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <div className="p-3 sm:p-4 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-600 dark:to-slate-700 w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 flex items-center justify-center">
                <Building2 className="h-6 w-6 sm:h-8 sm:w-8 text-slate-600 dark:text-slate-300" />
              </div>
              <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">
                No hay departamentos
              </h3>
              <p className="text-sm sm:text-base text-muted-foreground">
                {isGeneralView
                  ? "No se encontraron departamentos en el sistema."
                  : `No hay departamentos para ${selectedCompany?.name || "esta empresa"}.`}
              </p>
            </div>
          ) : (
            <div className="rounded-md border border-gray-200 dark:border-slate-600 overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-slate-200 dark:border-slate-700">
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-200 text-xs sm:text-sm">
                        Departamento
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-200 text-xs sm:text-sm hidden md:table-cell">
                        Descripción
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-200 text-xs sm:text-sm hidden sm:table-cell">
                        Color
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-200 text-xs sm:text-sm">
                        Usuarios
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-200 text-xs sm:text-sm hidden lg:table-cell">
                        Fecha de creación
                      </TableHead>
                      <TableHead className="text-right font-semibold text-slate-700 dark:text-slate-200 text-xs sm:text-sm">
                        Acciones
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDepartments.map((dept) => (
                      <TableRow
                        key={dept.id}
                        className="border-gray-100 dark:border-gray-700 hover:bg-gradient-to-r hover:from-slate-50/50 hover:to-slate-100/50 dark:hover:from-slate-700/50 dark:hover:to-slate-600/50 transition-all duration-300"
                      >
                        <TableCell className="p-2 sm:p-4">
                          <div className="flex items-center space-x-2 sm:space-x-3">
                            <div
                              className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl text-white shadow-lg transition-transform duration-300 hover:scale-110"
                              style={{
                                background: `linear-gradient(135deg, ${dept.color || "#6B7280"}, ${dept.color || "#6B7280"}dd)`,
                              }}
                            >
                              <Building2 className="h-3 w-3 sm:h-5 sm:w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <div className="font-medium text-gray-900 dark:text-slate-100 text-sm sm:text-base truncate">
                                  {dept.name}
                                </div>
                                {/* BADGE DEFINITIVO - Solo en vista general y no para departamentos temporales */}
                                {isGeneralView &&
                                  dept.name !== "Sin empresa" &&
                                  dept.name !== "ASIGNAR" &&
                                  dept.companies && (
                                    <Badge
                                      variant="outline"
                                      className="bg-blue-50 text-blue-700 border-blue-200 text-xs"
                                    >
                                      {dept.companies.name || dept.companies.code || "Empresa"}
                                    </Badge>
                                  )}
                              </div>
                              <div className="md:hidden text-xs text-muted-foreground mt-1 truncate">
                                {dept.description || "Sin descripción"}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-600 dark:text-slate-300 text-sm hidden md:table-cell p-2 sm:p-4">
                          {dept.description || "Sin descripción"}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell p-2 sm:p-4">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 border-white shadow-md transition-transform duration-300 hover:scale-125"
                              style={{ backgroundColor: dept.color || "#6B7280" }}
                            />
                            <span className="text-xs sm:text-sm text-muted-foreground font-mono hidden lg:inline">
                              {dept.color || "#6B7280"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="p-2 sm:p-4">
                          <div className="flex items-center gap-2">
                            <div className="p-1 rounded-md bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-600 dark:to-slate-700">
                              <Users className="h-3 w-3 sm:h-4 sm:w-4 text-slate-600 dark:text-slate-300" />
                            </div>
                            <span className="font-medium text-gray-700 dark:text-slate-200 text-sm">
                              {dept.userCount || 0}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-600 dark:text-slate-300 text-sm hidden lg:table-cell p-2 sm:p-4">
                          {new Date(dept.created_at).toLocaleDateString("es-ES")}
                        </TableCell>
                        <TableCell className="text-right p-2 sm:p-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors duration-200 h-8 w-8"
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
                            <DropdownMenuContent
                              align="end"
                              className="shadow-lg border-gray-200 dark:border-slate-600"
                            >
                              <DropdownMenuItem
                                onClick={() => router.push(`/departments/edit/${dept.id}`)}
                                className="hover:bg-blue-50 transition-colors duration-200"
                              >
                                <Edit className="mr-2 h-4 w-4 text-blue-600" />
                                <span>Editar</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDeleteClick(dept)}
                                className="text-red-600 focus:text-red-600 hover:bg-red-50 transition-colors duration-200"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>Eliminar</span>
                              </DropdownMenuItem>
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
        title="Eliminar Departamento"
        description="¿Estás seguro de que deseas eliminar este departamento? Se verificará que no tenga usuarios o documentos asociados antes de proceder."
        itemName={deleteDialog.department?.name}
        isDeleting={deleteDialog.isDeleting}
      />
    </div>
  )
}
