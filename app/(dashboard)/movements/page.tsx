"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { ArrowRight, FileText, Search, RefreshCw, Filter, ArrowUpRight, User, Calendar, MessageSquare, Info } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { useCompany } from "@/lib/company-context"
import { cn } from "@/lib/utils"

// Variantes de animación
const containerVariants = {
   hidden: { opacity: 0 },
   visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
   }
}

const itemVariants = {
   hidden: { opacity: 0, y: 20 },
   visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4 }
   }
}

// Departamentos hardcodeados con sus colores estándar
const STANDARD_DEPARTMENTS = [
   { id: "admin", name: "Administración", color: "#FF8C00" },
   { id: "almacen", name: "Almacén", color: "#20B2AA" },
   { id: "certificaciones", name: "Certificaciones", color: "#9370DB" },
   { id: "contabilidad", name: "Contabilidad", color: "#4169E1" },
   { id: "legal", name: "Legal", color: "#8A2BE2" },
   { id: "operaciones", name: "Operaciones", color: "#9ACD32" },
   { id: "recursos-humanos", name: "Recursos Humanos", color: "#FF6347" },
   { id: "tecnologia", name: "Tecnología", color: "#00CED1" },
]

// Función para obtener el color de texto basado en el color de fondo
const getTextColor = (backgroundColor: string) => {
   const hex = backgroundColor.replace("#", "")
   const r = Number.parseInt(hex.substr(0, 2), 16)
   const g = Number.parseInt(hex.substr(2, 2), 16)
   const b = Number.parseInt(hex.substr(4, 2), 16)
   const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
   return luminance > 0.5 ? "#000000" : "#FFFFFF"
}

const DepartmentBadge = ({ department, isDestination = false }: { department: any; isDestination?: boolean }) => {
   if (!department) {
      return (
         <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
            {isDestination ? "Destino desconocido" : "Origen desconocido"}
         </Badge>
      )
   }

   const backgroundColor = department.color || "#6B7280"
   const textColor = getTextColor(backgroundColor)

   return (
      <Badge
         className={cn(
            "transition-all duration-200 shadow-sm hover:shadow-md border-0 px-3 py-1 text-xs font-medium",
            isDestination && "ring-2 ring-offset-1 dark:ring-offset-slate-900"
         )}
         style={{
            backgroundColor,
            color: textColor,
            // borderColor: isDestination ? backgroundColor : undefined,
            // Forzamos el color del anillo para que coincida con el fondo si es destino
            boxShadow: isDestination ? `0 0 0 2px ${backgroundColor}` : undefined
         }}
      >
         {department.name}
         {isDestination && <ArrowUpRight className="ml-1 h-3 w-3 opacity-80" />}
      </Badge>
   )
}

export default function MovementsPage() {
   const { user } = useAuth()
   const { selectedCompany } = useCompany()
   const { toast } = useToast()

   const [movements, setMovements] = useState<any[]>([])
   const [departments, setDepartments] = useState<any[]>([])
   const [loading, setLoading] = useState(true)
   const [refreshing, setRefreshing] = useState(false)
   const [searchQuery, setSearchQuery] = useState("")
   const [departmentFilter, setDepartmentFilter] = useState<string>("all")

   useEffect(() => {
      if (user) {
         fetchMovements()
         fetchDepartments()
      }
   }, [user, selectedCompany])

   const fetchMovements = async (showRefreshing = false) => {
      try {
         if (showRefreshing) setRefreshing(true)
         else setLoading(true)

         // Determinar filtro de empresa
         const isAdmin = user?.role === "admin" || user?.role === "supervisor"
         const shouldFilterByCompany = !isAdmin || selectedCompany !== null
         const companyFilter = isAdmin ? selectedCompany?.id : user?.company_id

         // Para usuarios no admin, necesitamos hacer múltiples consultas debido a las limitaciones de Supabase
         let allMovements: any[] = []

         if (user && !isAdmin && user.department_id) {
            // Consulta 1: Movimientos donde el usuario creó el documento
            const { data: userCreatedMovements } = await supabase
               .from("document_movements")
               .select(`
            *,
            documents!inner (id, title, document_number, status, company_id, created_by, current_department_id),
            from_departments:departments!document_movements_from_department_id_fkey (id, name, color),
            to_departments:departments!document_movements_to_department_id_fkey (id, name, color),
            profiles!document_movements_moved_by_fkey (id, full_name, email)
          `)
               .eq("documents.created_by", user.id)
               .eq(shouldFilterByCompany && companyFilter ? "documents.company_id" : "id", shouldFilterByCompany && companyFilter ? companyFilter : "dummy") // Simplificado para evitar error en primera carga vacía

            // Consulta 2: Movimientos desde el departamento del usuario
            const { data: fromDeptMovements } = await supabase
               .from("document_movements")
               .select(`
             *,
             documents!inner (id, title, document_number, status, company_id, created_by, current_department_id),
             from_departments:departments!document_movements_from_department_id_fkey (id, name, color),
             to_departments:departments!document_movements_to_department_id_fkey (id, name, color),
             profiles!document_movements_moved_by_fkey (id, full_name, email)
          `)
               .eq("from_department_id", user.department_id)
               .eq(shouldFilterByCompany && companyFilter ? "documents.company_id" : "id", shouldFilterByCompany && companyFilter ? companyFilter : "dummy")

            // Consulta 3: Movimientos hacia el departamento del usuario
            const { data: toDeptMovements } = await supabase
               .from("document_movements")
               .select(`
             *,
             documents!inner (id, title, document_number, status, company_id, created_by, current_department_id),
             from_departments:departments!document_movements_from_department_id_fkey (id, name, color),
             to_departments:departments!document_movements_to_department_id_fkey (id, name, color),
             profiles!document_movements_moved_by_fkey (id, full_name, email)
          `)
               .eq("to_department_id", user.department_id)
               .eq(shouldFilterByCompany && companyFilter ? "documents.company_id" : "id", shouldFilterByCompany && companyFilter ? companyFilter : "dummy")

            const combinedMovements = [
               ...(userCreatedMovements || []),
               ...(fromDeptMovements || []),
               ...(toDeptMovements || []),
            ]

            // Eliminar duplicados basado en el ID
            const uniqueMovements = combinedMovements.filter(
               (movement, index, self) => index === self.findIndex((m) => m.id === movement.id),
            )
            allMovements = uniqueMovements

         } else if (user && !isAdmin && !user.department_id) {
            // Usuario sin departamento: solo documentos que creó
            const { data } = await supabase
               .from("document_movements")
               .select(`
             *,
             documents!inner (id, title, document_number, status, company_id, created_by, current_department_id),
             from_departments:departments!document_movements_from_department_id_fkey (id, name, color),
             to_departments:departments!document_movements_to_department_id_fkey (id, name, color),
             profiles!document_movements_moved_by_fkey (id, full_name, email)
          `)
               .eq("documents.created_by", user.id)
               .eq(shouldFilterByCompany && companyFilter ? "documents.company_id" : "id", shouldFilterByCompany && companyFilter ? companyFilter : "dummy")

            allMovements = data || []
         } else {
            // Admin: ver todos los movimientos
            let query = supabase.from("document_movements").select(`
           *,
           documents!inner (id, title, document_number, status, company_id, created_by, current_department_id),
           from_departments:departments!document_movements_from_department_id_fkey (id, name, color),
           to_departments:departments!document_movements_to_department_id_fkey (id, name, color),
           profiles!document_movements_moved_by_fkey (id, full_name, email)
        `)

            if (shouldFilterByCompany && companyFilter) {
               query = query.eq("documents.company_id", companyFilter)
            }

            const { data, error } = await query
            if (error) throw error
            allMovements = data || []
         }

         // Ordenar por fecha de creación (más reciente primero)
         allMovements.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
         setMovements(allMovements)
      } catch (error: any) {
         console.error("Error fetching movements:", error)
         toast({ title: "Error", description: "No se pudieron cargar los movimientos.", variant: "destructive" })
      } finally {
         setLoading(false)
         setRefreshing(false)
      }
   }

   const fetchDepartments = async () => {
      try {
         const isAdmin = user?.role === "admin" || user?.role === "supervisor"
         const shouldFilterByCompany = !isAdmin || selectedCompany !== null
         const companyFilter = isAdmin ? selectedCompany?.id : user?.company_id

         let query = supabase.from("departments").select("id, name, color, company_id").order("name")

         if (shouldFilterByCompany && companyFilter) {
            query = query.eq("company_id", companyFilter)
         }

         const { data } = await query

         // Eliminar duplicados usando Map
         const uniqueDepartmentsMap = new Map()
         data?.forEach((dept) => {
            if (!uniqueDepartmentsMap.has(dept.id)) uniqueDepartmentsMap.set(dept.id, dept)
         })

         setDepartments(Array.from(uniqueDepartmentsMap.values()).sort((a, b) => a.name.localeCompare(b.name)))
      } catch (error) {
         console.error("Error fetching departments:", error)
      }
   }

   const filteredMovements = movements.filter((movement) => {
      const matchesSearch =
         searchQuery === "" ||
         movement.documents?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
         movement.documents?.document_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
         movement.from_departments?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
         movement.to_departments?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
         movement.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesDepartment =
         departmentFilter === "all" ||
         movement.from_department_id === departmentFilter ||
         movement.to_department_id === departmentFilter

      return matchesSearch && matchesDepartment
   })

   const getPageTitle = () => {
      const isAdmin = user?.role === "admin" || user?.role === "supervisor"
      if (isAdmin) {
         if (selectedCompany === null) return "Movimientos - Vista General"
         else if (selectedCompany) return `Movimientos - ${selectedCompany.name}`
      }
      return "Movimientos de Documentos"
   }

   if (!user) {
      return (
         <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
            <div className="flex flex-col items-center gap-4">
               <RefreshCw className="h-8 w-8 animate-spin text-indigo-500" />
               <p className="text-slate-500">Verificando sesión...</p>
            </div>
         </div>
      )
   }

   return (
      <motion.div
         initial="hidden"
         animate="visible"
         variants={containerVariants}
         className="p-4 sm:p-6 lg:p-8 w-full max-w-full mx-auto space-y-8 min-h-[calc(100vh-4rem)]"
      >
         {/* Header */}
         <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
               <h1 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-slate-900 via-slate-700 to-slate-600 dark:from-white dark:via-slate-200 dark:to-slate-400 bg-clip-text text-transparent flex items-center gap-3">
                  <ArrowRight className="h-8 w-8 text-indigo-500" />
                  {getPageTitle()}
               </h1>
               <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1">
                  Rastreo y auditoría de flujo de documentos
               </p>
            </div>
            <Button
               onClick={() => fetchMovements(true)}
               disabled={refreshing}
               variant="outline"
               className="rounded-xl border-slate-200 dark:border-slate-700 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800"
            >
               <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
               {refreshing ? "Actualizando..." : "Actualizar Lista"}
            </Button>
         </motion.div>

         {/* Filters Card */}
         <motion.div variants={itemVariants}>
            <Card className="border-none shadow-md bg-white/50 dark:bg-slate-900/50 backdrop-blur-md rounded-2xl overflow-hidden">
               <CardHeader className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30">
                  <div className="flex items-center justify-between">
                     <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-700 dark:text-slate-200">
                        <Filter className="h-4 w-4" /> Filtros
                     </CardTitle>
                     <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                        {filteredMovements.length} movimientos
                     </Badge>
                  </div>
               </CardHeader>
               <CardContent className="p-4 sm:p-6 bg-slate-50/30 dark:bg-slate-900/30">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                        <Input
                           placeholder="Buscar por título, número, persona..."
                           className="pl-10 h-11 rounded-xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500/20"
                           value={searchQuery}
                           onChange={(e) => setSearchQuery(e.target.value)}
                        />
                     </div>
                     <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                        <SelectTrigger className="h-11 rounded-xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                           <SelectValue placeholder="Todos los departamentos" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                           <SelectItem value="all">Todos los departamentos</SelectItem>
                           {departments.map((department) => (
                              <SelectItem key={department.id} value={department.id}>
                                 <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: department.color || "#6B7280" }} />
                                    {department.name}
                                 </div>
                              </SelectItem>
                           ))}
                        </SelectContent>
                     </Select>
                  </div>
               </CardContent>
            </Card>
         </motion.div>

         {/* Legend Card */}
         <motion.div variants={itemVariants}>
            <Card className="border-none shadow-sm bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm rounded-xl">
               <CardContent className="p-4">
                  <div className="flex flex-wrap gap-2 items-center">
                     <span className="text-xs font-semibold text-slate-500 uppercase mr-2">Departamentos:</span>
                     {STANDARD_DEPARTMENTS.map((department) => (
                        <DepartmentBadge key={`legend-${department.id}`} department={department} />
                     ))}
                  </div>
               </CardContent>
            </Card>
         </motion.div>

         {/* Content */}
         <motion.div variants={itemVariants} className="space-y-4">
            {loading ? (
               Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i} className="border-none shadow-sm bg-white/60 dark:bg-slate-900/60 rounded-xl overflow-hidden">
                     <CardContent className="p-6 flex gap-4">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="space-y-2 flex-1">
                           <Skeleton className="h-4 w-[200px]" />
                           <Skeleton className="h-4 w-[150px]" />
                        </div>
                     </CardContent>
                  </Card>
               ))
            ) : filteredMovements.length === 0 ? (
               <Card className="border-none shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl p-12 text-center">
                  <div className="flex flex-col items-center justify-center gap-4">
                     <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full">
                        <RefreshCw className="h-8 w-8 text-slate-400" />
                     </div>
                     <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-200">No se encontraron movimientos</h3>
                     <p className="text-slate-500 max-w-md mx-auto">
                        No hay registros que coincidan con tus filtros. Intenta ajustar la búsqueda o actualizar la lista.
                     </p>
                     <Button variant="outline" onClick={() => { setSearchQuery(""); setDepartmentFilter("all"); }} className="mt-4 rounded-xl">
                        Limpiar Filtros
                     </Button>
                  </div>
               </Card>
            ) : (
               <AnimatePresence>
                  {filteredMovements.map((movement, index) => (
                     <motion.div
                        key={movement.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                     >
                        <Card className="group border-none shadow-md hover:shadow-lg transition-all duration-300 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-xl overflow-hidden hover:-translate-y-[2px]">
                           <CardContent className="p-0">
                              <div className="flex flex-col md:flex-row">
                                 {/* Left Status Stripe */}
                                 <div className="w-full md:w-2 bg-slate-200 dark:bg-slate-700 group-hover:bg-indigo-500 transition-colors" />

                                 <div className="flex-1 p-5 sm:p-6">
                                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                                       <div className="space-y-1">
                                          {movement.documents ? (
                                             <Link href={`/documents/${movement.document_id}`} className="flex items-center gap-2 group/link">
                                                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 group-hover/link:text-indigo-600 transition-colors">
                                                   {movement.documents.title || "Documento sin título"}
                                                </h3>
                                                <ArrowUpRight className="h-4 w-4 text-slate-400 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                                             </Link>
                                          ) : (
                                             <span className="text-slate-400 italic">Documento eliminado</span>
                                          )}
                                          <div className="flex items-center gap-3 text-sm text-slate-500">
                                             <Badge variant="outline" className="font-mono text-[10px] h-5">
                                                #{movement.documents?.document_number || "S/N"}
                                             </Badge>
                                             <span className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                {format(new Date(movement.created_at), "dd MMM, HH:mm", { locale: es })}
                                             </span>
                                          </div>
                                       </div>

                                       {movement.documents && (
                                          <Button variant="ghost" size="sm" asChild className="rounded-lg text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20">
                                             <Link href={`/documents/${movement.document_id}`}>
                                                Ver Detalles
                                             </Link>
                                          </Button>
                                       )}
                                    </div>

                                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-800/50 mb-4">
                                       <div className="flex flex-wrap items-center gap-3 justify-center sm:justify-start">
                                          <DepartmentBadge department={movement.from_departments} />
                                          <ArrowRight className="h-4 w-4 text-slate-400" />
                                          <DepartmentBadge department={movement.to_departments} isDestination />
                                       </div>
                                    </div>

                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-sm">
                                       <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                                          <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                                             <User className="h-3 w-3" />
                                          </div>
                                          <span className="font-medium">{movement.profiles?.full_name || "Usuario desconocido"}</span>
                                       </div>

                                       {movement.notes && (
                                          <div className="flex items-start gap-2 max-w-md bg-amber-50 dark:bg-amber-900/10 text-amber-800 dark:text-amber-200 px-3 py-1.5 rounded-lg text-xs">
                                             <MessageSquare className="h-3 w-3 mt-0.5 shrink-0" />
                                             <span className="italic line-clamp-1">{movement.notes}</span>
                                          </div>
                                       )}
                                    </div>
                                 </div>
                              </div>
                           </CardContent>
                        </Card>
                     </motion.div>
                  ))}
               </AnimatePresence>
            )}
         </motion.div>
      </motion.div>
   )
}
