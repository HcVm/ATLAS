"use client"

import { DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

import { useState, useEffect } from "react"
import { Search, Filter, User, Edit, Trash2, Users, Mail, Calendar, Building2 } from "lucide-react"
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
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { useCompany } from "@/lib/company-context"
import { useRouter } from "next/navigation"
import { toast } from "@/hooks/use-toast"

export default function UsersPage() {
  const { user } = useAuth()
  const { selectedCompany } = useCompany()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean
    user: any | null
    isDeleting: boolean
  }>({
    open: false,
    user: null,
    isDeleting: false,
  })
  const router = useRouter()

  useEffect(() => {
    if (user && user.role === "admin") {
      fetchUsers()
    }
  }, [user, selectedCompany])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      console.log("Fetching users for company:", selectedCompany?.id || "all")

      // Construimos la consulta base
      let query = supabase
        .from("profiles")
        .select(`
          *,
          departments!profiles_department_id_fkey (name),
          companies!profiles_company_id_fkey (id, name, code, color)
        `)
        .order("created_at", { ascending: false })

      // Aplicamos el filtro solo si hay una empresa seleccionada
      if (selectedCompany) {
        // Filtrar exactamente por el ID de la empresa seleccionada
        query = query.eq("company_id", selectedCompany.id)
      }

      const { data, error } = await query

      if (error) {
        console.error("Error fetching users:", error)
        toast({
          title: "Error al cargar usuarios",
          description: error.message,
          variant: "destructive",
        })
        throw error
      }

      console.log(`Loaded ${data?.length || 0} users`)
      setUsers(data || [])
    } catch (error) {
      console.error("Error fetching users:", error)
    } finally {
      setLoading(false)
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return (
          <Badge className="bg-gradient-to-r from-slate-600 to-slate-700 text-white shadow-sm">Administrador</Badge>
        )
      case "supervisor":
        return <Badge className="bg-gradient-to-r from-slate-500 to-slate-600 text-white shadow-sm">Supervisor</Badge>
      case "user":
        return (
          <Badge variant="secondary" className="bg-gradient-to-r from-slate-100 to-slate-200 text-slate-700 shadow-sm">
            Usuario
          </Badge>
        )
      default:
        return <Badge variant="outline">{role}</Badge>
    }
  }

  const getCompanyBadge = (company: any) => {
    if (!company) return <Badge variant="outline">Sin empresa</Badge>
    return (
      <Badge
        className="flex items-center gap-1"
        style={{
          backgroundColor: `${company.color}20`,
          color: company.color,
          borderColor: company.color,
        }}
      >
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: company.color }}></span>
        {company.code}
      </Badge>
    )
  }

  const handleDeleteClick = (userToDelete: any) => {
    setDeleteDialog({
      open: true,
      user: userToDelete,
      isDeleting: false,
    })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.user) return

    try {
      setDeleteDialog((prev) => ({ ...prev, isDeleting: true }))

      // First, check if user has any documents or movements
      const { data: documents } = await supabase
        .from("documents")
        .select("id")
        .eq("created_by", deleteDialog.user.id)
        .limit(1)

      const { data: movements } = await supabase
        .from("document_movements")
        .select("id")
        .eq("moved_by", deleteDialog.user.id)
        .limit(1)

      if (documents && documents.length > 0) {
        toast({
          title: "No se puede eliminar",
          description: "Este usuario tiene documentos asociados. Transfiere o elimina los documentos primero.",
          variant: "destructive",
        })
        setDeleteDialog((prev) => ({ ...prev, isDeleting: false }))
        return
      }

      if (movements && movements.length > 0) {
        toast({
          title: "No se puede eliminar",
          description: "Este usuario tiene movimientos de documentos asociados.",
          variant: "destructive",
        })
        setDeleteDialog((prev) => ({ ...prev, isDeleting: false }))
        return
      }

      // Delete the user profile
      const { error } = await supabase.from("profiles").delete().eq("id", deleteDialog.user.id)

      if (error) throw error

      setUsers(users.filter((u) => u.id !== deleteDialog.user.id))

      toast({
        title: "Usuario eliminado",
        description: "El usuario ha sido eliminado correctamente.",
      })

      setDeleteDialog({
        open: false,
        user: null,
        isDeleting: false,
      })
    } catch (error: any) {
      console.error("Error deleting user:", error)
      toast({
        title: "Error al eliminar",
        description: "No se pudo eliminar el usuario: " + error.message,
        variant: "destructive",
      })
      setDeleteDialog((prev) => ({ ...prev, isDeleting: false }))
    }
  }

  const filteredUsers = users.filter(
    (user) =>
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.departments?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.companies?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.companies?.code?.toLowerCase().includes(searchTerm.toLowerCase()),
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-slate-700 via-slate-600 to-slate-500 bg-clip-text text-transparent">
            Usuarios
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            {selectedCompany ? `Usuarios de ${selectedCompany.name}` : "Todos los usuarios del sistema"}
          </p>
        </div>
        <div className="text-sm bg-blue-50 border border-blue-200 rounded-md p-3 text-blue-700">
          <p>Los usuarios deben registrarse desde la página pública de registro.</p>
        </div>
      </div>

      <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-700/50 hover:shadow-xl transition-all duration-300 border-slate-200 dark:border-slate-700">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar usuarios..."
                className="pl-8 border-slate-200 dark:border-slate-700 focus:border-slate-400 focus:ring-slate-400/20 transition-all duration-300"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              className="hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors duration-200 flex-shrink-0"
              onClick={fetchUsers}
            >
              <Filter className="h-4 w-4" />
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-10">
              <div className="animate-spin rounded-full h-12 w-12 border-slate-600 mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Cargando usuarios...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <div className="p-3 sm:p-4 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-600 dark:to-slate-700 w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 flex items-center justify-center">
                <Users className="h-6 w-6 sm:h-8 sm:w-8 text-slate-600 dark:text-slate-300" />
              </div>
              <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">
                No hay usuarios
              </h3>
              <p className="text-sm sm:text-base text-muted-foreground">
                {searchTerm
                  ? "No se encontraron usuarios con ese criterio de búsqueda."
                  : selectedCompany
                    ? `No hay usuarios en la empresa ${selectedCompany.name}.`
                    : "No se encontraron usuarios en el sistema."}
              </p>
            </div>
          ) : (
            <div className="rounded-md border border-gray-200 dark:border-slate-600 overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-slate-200 dark:border-slate-700">
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-200 text-xs sm:text-sm">
                        Usuario
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-200 text-xs sm:text-sm hidden md:table-cell">
                        Email
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-200 text-xs sm:text-sm hidden lg:table-cell">
                        Departamento
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-200 text-xs sm:text-sm">
                        Empresa
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-200 text-xs sm:text-sm">
                        Rol
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-200 text-xs sm:text-sm hidden sm:table-cell">
                        Fecha de registro
                      </TableHead>
                      <TableHead className="text-right font-semibold text-slate-700 dark:text-slate-200 text-xs sm:text-sm">
                        Acciones
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((userItem) => (
                      <TableRow
                        key={userItem.id}
                        className="border-gray-100 hover:bg-gradient-to-r hover:from-slate-50/50 hover:to-slate-100/50 dark:hover:from-slate-700/50 dark:hover:to-slate-600/50 transition-all duration-300"
                      >
                        <TableCell className="p-2 sm:p-4">
                          <div className="flex items-center space-x-2 sm:space-x-3">
                            <div className="relative flex-shrink-0">
                              <Avatar className="h-8 w-8 sm:h-10 sm:w-10 ring-2 ring-white shadow-md">
                                <AvatarImage src={userItem.avatar_url || ""} />
                                <AvatarFallback className="bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-600 dark:to-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs sm:text-sm">
                                  {userItem.full_name
                                    ? userItem.full_name
                                        .split(" ")
                                        .map((n: string) => n[0])
                                        .join("")
                                        .toUpperCase()
                                    : "??"}
                                </AvatarFallback>
                              </Avatar>
                              <div className="absolute -bottom-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 bg-green-500 rounded-full border-2 border-white"></div>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-gray-900 dark:text-slate-100 text-sm sm:text-base truncate">
                                {userItem.full_name || "Sin nombre"}
                              </div>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <User className="h-3 w-3" />
                                <span className="truncate">ID: {userItem.id.slice(0, 8)}...</span>
                              </div>
                              <div className="md:hidden text-xs text-muted-foreground mt-1 truncate">
                                {userItem.email}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell p-2 sm:p-4">
                          <div className="flex items-center gap-2">
                            <div className="p-1 rounded-md bg-gradient-to-br from-blue-100 to-cyan-100">
                              <Mail className="h-3 w-3 text-blue-600" />
                            </div>
                            <span className="text-gray-600 dark:text-slate-300 text-sm truncate max-w-[150px] lg:max-w-none">
                              {userItem.email}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell p-2 sm:p-4">
                          {userItem.departments ? (
                            <span className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 border border-emerald-200 shadow-sm">
                              {userItem.departments.name}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-sm">Sin departamento</span>
                          )}
                        </TableCell>
                        <TableCell className="p-2 sm:p-4">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-3 w-3 text-gray-500" />
                            {getCompanyBadge(userItem.companies)}
                          </div>
                        </TableCell>
                        <TableCell className="p-2 sm:p-4">{getRoleBadge(userItem.role)}</TableCell>
                        <TableCell className="hidden sm:table-cell p-2 sm:p-4">
                          <div className="flex items-center gap-2">
                            <div className="p-1 rounded-md bg-gradient-to-br from-gray-100 to-gray-200">
                              <Calendar className="h-3 w-3 text-gray-600 dark:text-slate-300" />
                            </div>
                            <span className="text-gray-600 dark:text-slate-300 text-sm">
                              {new Date(userItem.created_at).toLocaleDateString("es-ES")}
                            </span>
                          </div>
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
                                onClick={() => router.push(`/users/edit/${userItem.id}`)}
                                className="hover:bg-blue-50 transition-colors duration-200"
                              >
                                <Edit className="mr-2 h-4 w-4 text-blue-600" />
                                <span>Editar</span>
                              </DropdownMenuItem>
                              {userItem.id !== user?.id && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleDeleteClick(userItem)}
                                    className="text-red-600 focus:text-red-600 hover:bg-red-50 transition-colors duration-200"
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
        title="Eliminar Usuario"
        description="¿Estás seguro de que deseas eliminar este usuario? Se verificará que no tenga documentos o movimientos asociados antes de proceder."
        itemName={deleteDialog.user?.full_name}
        isDeleting={deleteDialog.isDeleting}
      />
    </div>
  )
}
