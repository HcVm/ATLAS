"use client"

import { DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useState, useEffect } from "react"
import { Search, Filter, User, Edit, Trash2, Users, Mail, Calendar, Building2, MoreHorizontal, LayoutGrid, List } from "lucide-react"
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function UsersPage() {
  const { user } = useAuth()
  const { selectedCompany } = useCompany()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [viewMode, setViewMode] = useState<"table" | "grid">("grid")
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
      let query = supabase
        .from("profiles")
        .select(`
          *,
          departments!profiles_department_id_fkey (name),
          companies!profiles_company_id_fkey (id, name, code, color)
        `)
        .order("created_at", { ascending: false })

      if (selectedCompany) {
        query = query.eq("company_id", selectedCompany.id)
      }

      const { data, error } = await query

      if (error) {
        toast({
          title: "Error al cargar usuarios",
          description: error.message,
          variant: "destructive",
        })
        throw error
      }
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
        return <Badge className="bg-gradient-to-r from-slate-600 to-slate-700 text-white shadow-sm">Administrador</Badge>
      case "supervisor":
        return <Badge className="bg-gradient-to-r from-slate-500 to-slate-600 text-white shadow-sm">Supervisor</Badge>
      case "user":
        return <Badge variant="secondary" className="bg-gradient-to-r from-slate-100 to-slate-200 text-slate-700 shadow-sm">Usuario</Badge>
      default:
        return <Badge variant="outline">{role}</Badge>
    }
  }

  const getCompanyBadge = (company: any) => {
    if (!company) return <Badge variant="outline">Sin empresa</Badge>
    return (
      <Badge
        className="inline-flex items-center gap-1.5"
        style={{
          backgroundColor: company.color ? `${company.color}20` : "#e2e8f0",
          color: company.color || "#475569",
        }}
      >
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: company.color || "#475569" }}></span>
        {company.code || company.name}
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

      const { data: documents } = await supabase.from("documents").select("id").eq("created_by", deleteDialog.user.id).limit(1)
      if (documents && documents.length > 0) {
        toast({ title: "No se puede eliminar", description: "Este usuario tiene documentos asociados. Transfiere o elimina los documentos primero.", variant: "destructive" })
        setDeleteDialog((prev) => ({ ...prev, isDeleting: false }))
        return
      }

      const { data: movements } = await supabase.from("document_movements").select("id").eq("moved_by", deleteDialog.user.id).limit(1)
      if (movements && movements.length > 0) {
        toast({ title: "No se puede eliminar", description: "Este usuario tiene movimientos de documentos asociados.", variant: "destructive"})
        setDeleteDialog((prev) => ({ ...prev, isDeleting: false }))
        return
      }

      const { error } = await supabase.from("profiles").delete().eq("id", deleteDialog.user.id)
      if (error) throw error

      setUsers(users.filter((u) => u.id !== deleteDialog.user.id))
      toast({ title: "Usuario eliminado", description: "El usuario ha sido eliminado correctamente."})
      setDeleteDialog({ open: false, user: null, isDeleting: false })
    } catch (error: any) {
      console.error("Error deleting user:", error)
      toast({ title: "Error al eliminar", description: "No se pudo eliminar el usuario: " + error.message, variant: "destructive" })
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
    <div className="min-h-screen space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600 dark:from-white dark:via-slate-200 dark:to-slate-400 bg-clip-text text-transparent">
            Usuarios del Sistema
          </h1>
          <p className="text-base text-slate-500 dark:text-slate-400 mt-1">
            {selectedCompany ? `Gestión de usuarios para ${selectedCompany.name}` : "Administración global de usuarios"}
          </p>
        </div>
        <div className="text-sm bg-blue-50/50 backdrop-blur-sm border border-blue-200/50 rounded-xl p-4 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800/30 shadow-sm">
          <p className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Los usuarios deben registrarse desde la página pública de registro.
          </p>
        </div>
      </div>

      <Card className="shadow-xl border-slate-200/60 dark:border-slate-800/60 bg-white/50 dark:bg-slate-950/50 backdrop-blur-xl overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center gap-4 mb-8">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por nombre, email, empresa o departamento..."
                className="pl-10 h-10 bg-white/50 dark:bg-slate-900/50 border-slate-200/50 dark:border-slate-800/50 focus:ring-2 focus:ring-slate-500/20 transition-all duration-300 rounded-xl"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
                <div className="bg-slate-100/50 dark:bg-slate-800/50 p-1 rounded-xl border border-slate-200/50 dark:border-slate-800/50 flex">
                    <Button
                        variant={viewMode === "table" ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => setViewMode("table")}
                        className={`h-8 w-8 p-0 rounded-lg ${viewMode === "table" ? "bg-white dark:bg-slate-700 shadow-sm" : "hover:bg-slate-200/50 dark:hover:bg-slate-700/50"}`}
                        title="Vista de lista"
                    >
                        <List className="h-4 w-4" />
                    </Button>
                    <Button
                        variant={viewMode === "grid" ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => setViewMode("grid")}
                        className={`h-8 w-8 p-0 rounded-lg ${viewMode === "grid" ? "bg-white dark:bg-slate-700 shadow-sm" : "hover:bg-slate-200/50 dark:hover:bg-slate-700/50"}`}
                        title="Vista de tarjetas"
                    >
                        <LayoutGrid className="h-4 w-4" />
                    </Button>
                </div>
                <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-xl border-slate-200/50 bg-white/50 hover:bg-slate-50 dark:border-slate-800/50 dark:bg-slate-900/50 dark:hover:bg-slate-800 transition-all duration-200 shadow-sm"
                onClick={fetchUsers}
                >
                <Filter className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                </Button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600 dark:border-slate-400 mx-auto"></div>
              <p className="mt-4 text-slate-500 dark:text-slate-400 animate-pulse">Cargando usuarios...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-20 bg-slate-50/30 dark:bg-slate-900/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
              <div className="p-4 rounded-full bg-slate-100/80 dark:bg-slate-800/80 w-20 h-20 mx-auto mb-4 flex items-center justify-center shadow-sm">
                <Users className="h-10 w-10 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                No se encontraron usuarios
              </h3>
              <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                {searchTerm
                  ? "Intenta ajustar los términos de búsqueda para encontrar lo que buscas."
                  : selectedCompany
                    ? `No hay usuarios registrados en ${selectedCompany.name}.`
                    : "No hay usuarios en el sistema actualmente."}
              </p>
            </div>
          ) : (
            <div>
              {/* === VISTA DE ESCRITORIO (md y superior) === */}
              {viewMode === "table" ? (
                <>
                <div className="hidden md:block rounded-xl border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-sm bg-white/40 dark:bg-slate-900/40">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-200/60 dark:border-slate-800/60 hover:bg-slate-100/50 dark:hover:bg-slate-800/50">
                        <TableHead className="font-semibold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wider py-4">Usuario</TableHead>
                        <TableHead className="font-semibold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wider py-4">Email</TableHead>
                        <TableHead className="font-semibold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wider py-4">Departamento</TableHead>
                        <TableHead className="font-semibold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wider py-4">Empresa</TableHead>
                        <TableHead className="font-semibold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wider py-4">Rol</TableHead>
                        <TableHead className="font-semibold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wider py-4">Registro</TableHead>
                        <TableHead className="text-right font-semibold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wider py-4">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((userItem) => (
                        <TableRow key={userItem.id} className="border-b border-slate-100/60 dark:border-slate-800/60 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors duration-200 group">
                          <TableCell className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="relative flex-shrink-0">
                                <Avatar className="h-10 w-10 ring-2 ring-white dark:ring-slate-950 shadow-sm transition-transform group-hover:scale-105 duration-300">
                                  <AvatarImage src={userItem.avatar_url || ""} />
                                  <AvatarFallback className="bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900 dark:to-purple-900 text-indigo-700 dark:text-indigo-200 font-bold text-xs">
                                    {userItem.full_name?.split(" ").map((n: string) => n[0]).join("").toUpperCase() || "??"}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900 shadow-sm"></div>
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="font-semibold text-slate-900 dark:text-slate-100 text-sm truncate">{userItem.full_name || "Sin nombre"}</div>
                                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                  <User className="h-3 w-3" />
                                  <span className="truncate font-mono opacity-70">ID: {userItem.id.slice(0, 8)}...</span>
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="p-4">
                            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                              <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"><Mail className="h-3.5 w-3.5" /></div>
                              <span className="truncate max-w-[180px] font-medium">{userItem.email}</span>
                            </div>
                          </TableCell>
                          <TableCell className="p-4">
                            {userItem.departments ? (
                                <div className="flex items-center gap-2">
                                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500"></div>
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{userItem.departments.name}</span>
                                </div>
                            ) : (
                                <span className="text-slate-400 text-sm italic flex items-center gap-1.5">
                                    <span className="h-1.5 w-1.5 rounded-full bg-slate-300"></span>
                                    Sin asignar
                                </span>
                            )}
                          </TableCell>
                          <TableCell className="p-4">{getCompanyBadge(userItem.companies)}</TableCell>
                          <TableCell className="p-4">{getRoleBadge(userItem.role)}</TableCell>
                          <TableCell className="p-4">
                            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                <Calendar className="h-3.5 w-3.5 opacity-70" />
                                <span>{new Date(userItem.created_at).toLocaleDateString("es-ES", { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right p-4">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all">
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48 p-1 shadow-xl border-slate-200/60 dark:border-slate-800/60 bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl rounded-xl">
                                <DropdownMenuItem onClick={() => router.push(`/users/edit/${userItem.id}`)} className="rounded-lg focus:bg-slate-100 dark:focus:bg-slate-800 cursor-pointer py-2">
                                    <Edit className="mr-2 h-4 w-4 text-blue-500" />
                                    <span className="font-medium">Editar Perfil</span>
                                </DropdownMenuItem>
                                {userItem.id !== user?.id && (
                                    <>
                                        <DropdownMenuSeparator className="bg-slate-200/50 dark:bg-slate-800/50" />
                                        <DropdownMenuItem onClick={() => handleDeleteClick(userItem)} className="rounded-lg text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/30 cursor-pointer py-2">
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            <span className="font-medium">Eliminar Usuario</span>
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
              <div className="grid grid-cols-1 gap-4 md:hidden">
                {filteredUsers.map((userItem) => (
                  <div key={userItem.id} className="rounded-xl border border-slate-200/60 dark:border-slate-800/60 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md p-5 space-y-4 shadow-sm">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="relative flex-shrink-0">
                            <Avatar className="h-12 w-12 ring-2 ring-white dark:ring-slate-950 shadow-sm">
                                <AvatarImage src={userItem.avatar_url || ""} />
                                <AvatarFallback className="bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900 dark:to-purple-900 text-indigo-700 dark:text-indigo-200 font-bold">{userItem.full_name?.split(" ").map((n: string) => n[0]).join("").toUpperCase() || "??"}</AvatarFallback>
                            </Avatar>
                            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900"></div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base leading-tight truncate mb-1">{userItem.full_name || "Sin nombre"}</h3>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                             <Mail className="h-3 w-3" />
                             <span className="truncate">{userItem.email}</span>
                          </div>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="-mt-1 -mr-1 h-8 w-8 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 shadow-xl border-slate-200/60 dark:border-slate-800/60 bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl rounded-xl">
                          <DropdownMenuItem onClick={() => router.push(`/users/edit/${userItem.id}`)} className="py-2.5"><Edit className="mr-2 h-4 w-4 text-blue-500" /> Editar</DropdownMenuItem>
                          {userItem.id !== user?.id && (<><DropdownMenuSeparator /><DropdownMenuItem onClick={() => handleDeleteClick(userItem)} className="text-red-600 focus:text-red-600 focus:bg-red-50 py-2.5"><Trash2 className="mr-2 h-4 w-4" /> Eliminar</DropdownMenuItem></>)}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <div className="bg-slate-50/50 dark:bg-slate-800/30 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                             <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Rol</span>
                             {getRoleBadge(userItem.role)}
                        </div>
                         <div className="bg-slate-50/50 dark:bg-slate-800/30 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                             <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Empresa</span>
                             {getCompanyBadge(userItem.companies)}
                        </div>
                    </div>

                    <div className="border-t border-slate-100/60 dark:border-slate-800/60 pt-3 space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" /> Departamento</span>
                            {userItem.departments ? (<span className="font-medium text-slate-700 dark:text-slate-200">{userItem.departments.name}</span>) : (<span className="text-slate-400 italic">N/A</span>)}
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Registrado</span>
                            <span className="font-medium text-slate-700 dark:text-slate-200">{new Date(userItem.created_at).toLocaleDateString("es-ES")}</span>
                        </div>
                    </div>
                  </div>
                ))}
              </div>
              </>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredUsers.map((userItem) => (
                        <div key={userItem.id} className="group relative bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-2xl overflow-hidden border border-slate-200/60 dark:border-slate-800/60 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                            {/* Decorative Header */}
                            <div className="h-24 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 relative overflow-hidden">
                                <div className="absolute inset-0 opacity-30 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay"></div>
                                <div className="absolute top-0 right-0 p-3">
                                    {getRoleBadge(userItem.role)}
                                </div>
                            </div>
                            
                            {/* Avatar */}
                            <div className="absolute top-12 left-1/2 -translate-x-1/2">
                                <div className="relative">
                                    <Avatar className="h-24 w-24 ring-4 ring-white dark:ring-slate-950 shadow-xl">
                                        <AvatarImage src={userItem.avatar_url || ""} />
                                        <AvatarFallback className="text-3xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900 dark:to-purple-900 text-indigo-700 dark:text-indigo-200 font-bold">
                                            {userItem.full_name?.split(" ").map((n: string) => n[0]).join("").toUpperCase() || "??"}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="absolute bottom-1 right-1 w-5 h-5 bg-emerald-500 rounded-full border-4 border-white dark:border-slate-900" title="Activo"></div>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="pt-16 pb-6 px-6 flex flex-col items-center text-center space-y-3">
                                <div>
                                    <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 leading-tight">
                                        {userItem.full_name || "Sin nombre"}
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
                                        {userItem.email}
                                    </p>
                                </div>

                                <div className="w-full space-y-2 pt-2">
                                    <div className="flex items-center justify-between text-sm py-1 border-b border-slate-100/50 dark:border-slate-800/50">
                                        <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" /> Dept.</span>
                                        <span className="font-medium text-slate-700 dark:text-slate-200 truncate max-w-[120px]">{userItem.departments?.name || "N/A"}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm py-1">
                                        <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Reg.</span>
                                        <span className="font-medium text-slate-700 dark:text-slate-200">{new Date(userItem.created_at).toLocaleDateString("es-ES")}</span>
                                    </div>
                                </div>

                                <div className="pt-2">
                                    {getCompanyBadge(userItem.companies)}
                                </div>
                            </div>

                            {/* Actions Footer */}
                            <div className="bg-slate-50/80 dark:bg-slate-800/50 p-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                                <span className="text-[10px] text-slate-400 font-mono">ID: {userItem.id.slice(0, 8)}</span>
                                <div className="flex gap-2">
                                    <Button 
                                        size="sm" 
                                        variant="ghost" 
                                        className="h-8 w-8 p-0 rounded-full hover:bg-white hover:text-blue-600 hover:shadow-sm dark:hover:bg-slate-700 dark:hover:text-blue-400"
                                        onClick={() => router.push(`/users/edit/${userItem.id}`)}
                                        title="Editar"
                                    >
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    {userItem.id !== user?.id && (
                                        <Button 
                                            size="sm" 
                                            variant="ghost" 
                                            className="h-8 w-8 p-0 rounded-full hover:bg-white hover:text-red-600 hover:shadow-sm dark:hover:bg-slate-700 dark:hover:text-red-400"
                                            onClick={() => handleDeleteClick(userItem)}
                                            title="Eliminar"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
              )}

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
