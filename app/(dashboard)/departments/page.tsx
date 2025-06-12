"use client"

import { DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

import { useState, useEffect } from "react"
import { Plus, Search, Building2, Edit, Trash2, Users } from "lucide-react"
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

  useEffect(() => {
    if (user && user.role === "admin") {
      fetchDepartments()
    }
  }, [user])

  const fetchDepartments = async () => {
    try {
      // First get all departments
      const { data: departmentsData, error: deptError } = await supabase.from("departments").select("*").order("name")

      if (deptError) throw deptError

      // Then get user counts for each department
      const departmentsWithCounts = await Promise.all(
        (departmentsData || []).map(async (dept) => {
          const { count, error: countError } = await supabase
            .from("profiles")
            .select("*", { count: "exact", head: true })
            .eq("department_id", dept.id)

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
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 lg:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-emerald-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
            Departamentos
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Gestiona todos los departamentos de la organización
          </p>
        </div>
        <Button
          onClick={() => router.push("/departments/new")}
          className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
        >
          <Plus className="h-4 w-4 mr-2" />
          <span className="sm:hidden">Nuevo Depto</span>
          <span className="hidden sm:inline">Nuevo Departamento</span>
        </Button>
      </div>

      <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50/50 hover:shadow-xl transition-all duration-300">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar departamentos..."
                className="pl-8 border-gray-200 focus:border-emerald-400 focus:ring-emerald-400/20 transition-all duration-300"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-10">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Cargando departamentos...</p>
            </div>
          ) : filteredDepartments.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <div className="p-3 sm:p-4 rounded-full bg-gradient-to-br from-emerald-100 to-blue-100 w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 flex items-center justify-center">
                <Building2 className="h-6 w-6 sm:h-8 sm:w-8 text-emerald-600" />
              </div>
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">No hay departamentos</h3>
              <p className="text-sm sm:text-base text-muted-foreground">
                No se encontraron departamentos en el sistema.
              </p>
            </div>
          ) : (
            <div className="rounded-md border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100/50 border-gray-200">
                      <TableHead className="font-semibold text-gray-700 text-xs sm:text-sm">Departamento</TableHead>
                      <TableHead className="font-semibold text-gray-700 text-xs sm:text-sm hidden md:table-cell">
                        Descripción
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700 text-xs sm:text-sm hidden sm:table-cell">
                        Color
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700 text-xs sm:text-sm">Usuarios</TableHead>
                      <TableHead className="font-semibold text-gray-700 text-xs sm:text-sm hidden lg:table-cell">
                        Fecha de creación
                      </TableHead>
                      <TableHead className="text-right font-semibold text-gray-700 text-xs sm:text-sm">
                        Acciones
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDepartments.map((dept) => (
                      <TableRow
                        key={dept.id}
                        className="border-gray-100 hover:bg-gradient-to-r hover:from-emerald-50/50 hover:to-blue-50/50 transition-all duration-300"
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
                              <div className="font-medium text-gray-900 text-sm sm:text-base truncate">{dept.name}</div>
                              <div className="md:hidden text-xs text-muted-foreground mt-1 truncate">
                                {dept.description || "Sin descripción"}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-600 text-sm hidden md:table-cell p-2 sm:p-4">
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
                            <div className="p-1 rounded-md bg-gradient-to-br from-blue-100 to-purple-100">
                              <Users className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
                            </div>
                            <span className="font-medium text-gray-700 text-sm">{dept.userCount || 0}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-600 text-sm hidden lg:table-cell p-2 sm:p-4">
                          {new Date(dept.created_at).toLocaleDateString("es-ES")}
                        </TableCell>
                        <TableCell className="text-right p-2 sm:p-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="hover:bg-gray-100 transition-colors duration-200 h-8 w-8"
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
                            <DropdownMenuContent align="end" className="shadow-lg border-gray-200">
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
