"use client"

import { useState, useEffect } from "react"
import { Plus, Search, Building2, Edit, Trash2 } from "lucide-react"
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
      const { data, error } = await supabase
        .from("departments")
        .select(`
          *,
          profiles!profiles_department_id_fkey (count)
        `)
        .order("name")

      if (error) throw error
      setDepartments(data || [])
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Departamentos</h1>
          <p className="text-muted-foreground">Gestiona todos los departamentos de la organización</p>
        </div>
        <Button onClick={() => router.push("/departments/new")}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Departamento
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar departamentos..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-10">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Cargando departamentos...</p>
            </div>
          ) : filteredDepartments.length === 0 ? (
            <div className="text-center py-10">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto" />
              <h3 className="mt-4 text-lg font-medium">No hay departamentos</h3>
              <p className="text-muted-foreground">No se encontraron departamentos en el sistema.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Departamento</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead>Usuarios</TableHead>
                    <TableHead>Fecha de creación</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDepartments.map((dept) => (
                    <TableRow key={dept.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
                            style={{ backgroundColor: dept.color || "#6B7280" }}
                          >
                            <Building2 className="h-4 w-4" />
                          </div>
                          <div className="font-medium">{dept.name}</div>
                        </div>
                      </TableCell>
                      <TableCell>{dept.description || "Sin descripción"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded-full border"
                            style={{ backgroundColor: dept.color || "#6B7280" }}
                          />
                          <span className="text-sm text-muted-foreground">{dept.color || "#6B7280"}</span>
                        </div>
                      </TableCell>
                      <TableCell>{dept.profiles?.length || 0}</TableCell>
                      <TableCell>{new Date(dept.created_at).toLocaleDateString("es-ES")}</TableCell>
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
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-4 w-4" />
                              <span>Editar</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDeleteClick(dept)}
                              className="text-red-600 focus:text-red-600"
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
