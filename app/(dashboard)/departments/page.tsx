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
import { Plus, Search, Building2, Edit, Trash2, Users, Home, AlertCircle, MoreHorizontal, Calendar } from "lucide-react"
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
      setLoading(true)
      const currentCompanyId = selectedCompany?.id

      let query = supabase.from("departments").select(`
      *,
      companies!departments_company_id_fkey(
        id,
        name,
        code
      )
    `)

      if (currentCompanyId && !isGeneralView) {
        query = query.eq("company_id", currentCompanyId)
      }

      const { data: departmentsData, error: deptError } = await query.order("name")
      if (deptError) throw deptError

      const departmentsWithCounts = await Promise.all(
        (departmentsData || []).map(async (dept) => {
          let countQuery = supabase
            .from("profiles")
            .select("*", { count: "exact", head: true })
            .eq("department_id", dept.id)

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

      const { error } = await supabase.from("departments").delete().eq("id", deleteDialog.department.id)
      if (error) throw error

      setDepartments(departments.filter((dept) => dept.id !== deleteDialog.department.id))
      toast({
        title: "Departamento eliminado",
        description: "El departamento ha sido eliminado correctamente.",
      })

      setDeleteDialog({ open: false, department: null, isDeleting: false })
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

  // Group departments by company
  const groupedDepartments = filteredDepartments.reduce((acc, dept) => {
    const companyId = dept.companies?.id || "unknown"
    const companyName = dept.companies?.name || "Sin Empresa Asignada"
    const companyCode = dept.companies?.code
    
    if (!acc[companyId]) {
      acc[companyId] = {
        name: companyName,
        code: companyCode,
        departments: []
      }
    }
    acc[companyId].departments.push(dept)
    return acc
  }, {} as Record<string, { name: string, code?: string, departments: any[] }>)

  const sortedCompanyIds = Object.keys(groupedDepartments).sort((a, b) => {
    // Put "Sin Empresa" at the end
    if (a === "unknown") return 1
    if (b === "unknown") return -1
    return groupedDepartments[a].name.localeCompare(groupedDepartments[b].name)
  })

  if (user?.role !== "admin") {
    return (
      <div className="text-center py-10">
        <h1 className="text-2xl font-bold">Acceso Denegado</h1>
        <p className="text-muted-foreground">No tienes permisos para acceder a esta página.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen space-y-6 p-4 sm:p-6 lg:p-8">
      <Breadcrumb className="hidden md:flex">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard" className="flex items-center gap-2 hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
              <Home className="h-4 w-4" />
              Dashboard
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="flex items-center gap-2 font-medium">
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
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600 dark:from-white dark:via-slate-200 dark:to-slate-400 bg-clip-text text-transparent">
            Departamentos
          </h1>
          <p className="text-base text-slate-500 dark:text-slate-400 mt-1">
            {isGeneralView
              ? "Gestiona todos los departamentos de todas las empresas"
              : `Gestiona los departamentos de ${selectedCompany?.name || "la empresa seleccionada"}`}
          </p>
        </div>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Button
                  onClick={handleCreateDepartment}
                  disabled={!canCreateDepartment}
                  className={`w-full sm:w-auto shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl ${
                    canCreateDepartment
                      ? "bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-900 hover:to-black dark:from-white dark:to-slate-200 dark:hover:from-slate-200 dark:hover:to-slate-300 text-white dark:text-slate-900 hover:scale-105"
                      : "bg-slate-200 text-slate-500 cursor-not-allowed dark:bg-slate-800 dark:text-slate-600"
                  }`}
                >
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

      {isGeneralView && (
        <Card className="border-amber-200/60 bg-amber-50/50 dark:bg-amber-900/10 dark:border-amber-800/30 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-400">Vista General Activa</p>
                <p className="text-xs text-amber-700 dark:text-amber-500/80 mt-1">
                  Para crear departamentos, selecciona una empresa específica en el selector de empresas.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-xl border-slate-200/60 dark:border-slate-800/60 bg-white/50 dark:bg-slate-950/50 backdrop-blur-xl overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar departamentos..."
                className="pl-10 h-10 bg-white/50 dark:bg-slate-900/50 border-slate-200/50 dark:border-slate-800/50 focus:ring-2 focus:ring-slate-500/20 transition-all duration-300 rounded-xl"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600 dark:border-slate-400 mx-auto"></div>
              <p className="mt-4 text-slate-500 dark:text-slate-400 animate-pulse">Cargando departamentos...</p>
            </div>
          ) : filteredDepartments.length === 0 ? (
            <div className="text-center py-20 bg-slate-50/30 dark:bg-slate-900/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
              <div className="p-4 rounded-full bg-slate-100/80 dark:bg-slate-800/80 w-20 h-20 mx-auto mb-4 flex items-center justify-center shadow-sm">
                <Building2 className="h-10 w-10 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                No hay departamentos
              </h3>
              <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                {isGeneralView
                  ? "No se encontraron departamentos en el sistema."
                  : `No hay departamentos para ${selectedCompany?.name || "esta empresa"}.`}
              </p>
            </div>
          ) : (
            <div className="space-y-10">
              {sortedCompanyIds.map((companyId) => {
                const group = groupedDepartments[companyId]
                return (
                  <div key={companyId} className="space-y-4">
                    {/* Company Header - Only show if in General View or if there are multiple companies (which shouldn't happen in single view but safe to keep) */}
                    {isGeneralView && (
                      <div className="flex items-center gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                        <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                           <Building2 className="h-4 w-4" />
                        </div>
                        <div>
                           <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                             {group.name}
                             <Badge variant="secondary" className="text-xs font-normal bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                {group.departments.length}
                             </Badge>
                           </h3>
                           {group.code && <p className="text-xs text-slate-400 font-mono">{group.code}</p>}
                        </div>
                      </div>
                    )}

                    {/* Vista de Tabla para Escritorio (md y superior) */}
                    <div className="hidden md:block rounded-xl border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-sm bg-white/40 dark:bg-slate-900/40">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-200/60 dark:border-slate-800/60 hover:bg-slate-100/50 dark:hover:bg-slate-800/50">
                              <TableHead className="font-semibold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wider py-4 pl-6">
                                Departamento
                              </TableHead>
                              <TableHead className="font-semibold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wider py-4">
                                Descripción
                              </TableHead>
                              <TableHead className="font-semibold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wider py-4">
                                Color
                              </TableHead>
                              <TableHead className="font-semibold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wider py-4">
                                Usuarios
                              </TableHead>
                              <TableHead className="font-semibold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wider py-4">
                                Fecha de creación
                              </TableHead>
                              <TableHead className="text-right font-semibold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wider py-4 pr-6">
                                Acciones
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {group.departments.map((dept) => (
                              <TableRow
                                key={dept.id}
                                className="border-b border-slate-100/60 dark:border-slate-800/60 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors duration-200 group"
                              >
                                <TableCell className="p-4 pl-6">
                                  <div className="flex items-center space-x-3">
                                    <div
                                      className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-lg shadow-black/10 transition-transform duration-300 group-hover:scale-105 flex-shrink-0"
                                      style={{
                                        background: `linear-gradient(135deg, ${dept.color || "#6B7280"}, ${dept.color ? dept.color + "dd" : "#4B5563"})`,
                                      }}
                                    >
                                      <Building2 className="h-5 w-5" />
                                    </div>
                                    <div className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                                      {dept.name}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-slate-500 dark:text-slate-400 text-sm p-4 max-w-xs truncate font-medium">
                                  {dept.description || <span className="text-slate-300 dark:text-slate-600 italic">Sin descripción</span>}
                                </TableCell>
                                <TableCell className="p-4">
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="w-4 h-4 rounded-full border border-slate-200 dark:border-slate-800 shadow-sm ring-1 ring-white dark:ring-slate-950"
                                      style={{ backgroundColor: dept.color || "#6B7280" }}
                                    />
                                    <span className="text-xs text-slate-500 dark:text-slate-400 font-mono hidden lg:inline bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                      {dept.color || "#6B7280"}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell className="p-4">
                                  <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                      <Users className="h-3.5 w-3.5" />
                                    </div>
                                    <span className="font-semibold text-slate-700 dark:text-slate-200 text-sm">
                                      {dept.userCount || 0}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-slate-500 dark:text-slate-400 text-xs p-4">
                                  <div className="flex items-center gap-2">
                                      <Calendar className="h-3.5 w-3.5 opacity-70" />
                                      {new Date(dept.created_at).toLocaleDateString("es-ES", { day: '2-digit', month: 'short', year: 'numeric' })}
                                  </div>
                                </TableCell>
                                <TableCell className="text-right p-4 pr-6">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                                      >
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                      align="end"
                                      className="w-48 p-1 shadow-xl border-slate-200/60 dark:border-slate-800/60 bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl rounded-xl"
                                    >
                                      <DropdownMenuItem
                                        onClick={() => router.push(`/departments/edit/${dept.id}`)}
                                        className="rounded-lg focus:bg-slate-100 dark:focus:bg-slate-800 cursor-pointer py-2"
                                      >
                                        <Edit className="mr-2 h-4 w-4 text-blue-500" />
                                        <span className="font-medium">Editar</span>
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator className="bg-slate-200/50 dark:bg-slate-800/50" />
                                      <DropdownMenuItem
                                        onClick={() => handleDeleteClick(dept)}
                                        className="rounded-lg text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/30 cursor-pointer py-2"
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        <span className="font-medium">Eliminar</span>
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

                    {/* Vista de Tarjetas para Móvil (hasta md) */}
                    <div className="grid grid-cols-1 gap-4 md:hidden">
                      {group.departments.map((dept) => (
                        <div key={dept.id} className="rounded-xl border border-slate-200/60 dark:border-slate-800/60 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md p-5 space-y-4 shadow-sm">
                          <div className="flex justify-between items-start gap-4">
                            <div className="flex items-center gap-3 font-bold">
                              <div
                                className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-lg flex-shrink-0"
                                style={{
                                  background: `linear-gradient(135deg, ${dept.color || "#6B7280"}, ${dept.color ? dept.color + "dd" : "#4B5563"})`,
                                }}
                              >
                                <Building2 className="h-5 w-5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                  <h3 className="flex-1 break-words text-base font-bold text-slate-900 dark:text-slate-100 leading-tight">{dept.name}</h3>
                                  {dept.description && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">{dept.description}</p>}
                              </div>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="-mt-1 -mr-1 h-8 w-8 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48 shadow-xl border-slate-200/60 dark:border-slate-800/60 bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl rounded-xl">
                                <DropdownMenuItem onClick={() => router.push(`/departments/edit/${dept.id}`)} className="py-2.5">
                                  <Edit className="mr-2 h-4 w-4 text-blue-500" /> Editar
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDeleteClick(dept)}
                                  className="text-red-600 focus:text-red-600 focus:bg-red-50 py-2.5"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          <div className="border-t border-slate-100/60 dark:border-slate-800/60 pt-3 space-y-2 text-sm">
                            <div className="flex justify-between items-center">
                              <span className="text-slate-500 dark:text-slate-400 text-xs flex items-center gap-1.5">
                                <Users className="h-3.5 w-3.5" />
                                Usuarios
                              </span>
                              <span className="font-medium text-slate-700 dark:text-slate-200">{dept.userCount || 0}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-slate-500 dark:text-slate-400 text-xs flex items-center gap-1.5">
                                  <Calendar className="h-3.5 w-3.5" />
                                  Creado
                              </span>
                              <span className="font-medium text-slate-700 dark:text-slate-200">{new Date(dept.created_at).toLocaleDateString("es-ES")}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
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