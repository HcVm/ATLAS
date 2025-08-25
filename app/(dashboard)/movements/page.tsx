"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { ArrowRight, FileText, Search, RefreshCw, Filter } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { useCompany } from "@/lib/company-context"

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
  // Convertir hex a RGB
  const hex = backgroundColor.replace("#", "")
  const r = Number.parseInt(hex.substr(0, 2), 16)
  const g = Number.parseInt(hex.substr(2, 2), 16)
  const b = Number.parseInt(hex.substr(4, 2), 16)

  // Calcular luminancia
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

  // Retornar blanco para fondos oscuros, negro para fondos claros
  return luminance > 0.5 ? "#000000" : "#FFFFFF"
}

// Componente mejorado para mostrar departamento con badges elegantes
const DepartmentBadge = ({ department, isDestination = false }: { department: any; isDestination?: boolean }) => {
  if (!department) {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
        {isDestination ? "Destino desconocido" : "Origen desconocido"}
      </span>
    )
  }

  const backgroundColor = department.color || "#6B7280"
  const textColor = getTextColor(backgroundColor)

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
        isDestination ? "ring-2 ring-offset-2 shadow-sm" : "shadow-sm hover:shadow-md"
      }`}
      style={{
        backgroundColor,
        color: textColor,
        borderColor: isDestination ? backgroundColor : undefined,
      }}
    >
      {department.name}
      {isDestination && <span className="ml-1 text-xs opacity-75">📍</span>}
    </span>
  )
}

export default function MovementsPage() {
  const { user } = useAuth()
  const { selectedCompany } = useCompany()
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
      if (showRefreshing) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      // Determinar filtro de empresa
      const isAdmin = user?.role === "admin" || user?.role === "supervisor"
      const shouldFilterByCompany = !isAdmin || selectedCompany !== null
      const companyFilter = isAdmin ? selectedCompany?.id : user?.company_id

      console.log("Movement filtering:", {
        isAdmin,
        shouldFilterByCompany,
        companyFilter,
        selectedCompany: selectedCompany?.name || "null",
        userCompany: user?.company_id,
        userDepartment: user?.department_id,
        userRole: user?.role,
      })

      // Para usuarios no admin, necesitamos hacer múltiples consultas debido a las limitaciones de Supabase
      let allMovements: any[] = []

      if (user && !isAdmin && user.department_id) {
        // Consulta 1: Movimientos donde el usuario creó el documento
        const { data: userCreatedMovements } = await supabase
          .from("document_movements")
          .select(`
            *,
            documents!inner (
              id, 
              title, 
              document_number,
              status,
              company_id,
              created_by,
              current_department_id
            ),
            from_departments:departments!document_movements_from_department_id_fkey (
              id, 
              name,
              color
            ),
            to_departments:departments!document_movements_to_department_id_fkey (
              id, 
              name,
              color
            ),
            profiles!document_movements_moved_by_fkey (
              id, 
              full_name, 
              email
            )
          `)
          .eq("documents.created_by", user.id)
          .eq(
            shouldFilterByCompany && companyFilter ? "documents.company_id" : "id",
            shouldFilterByCompany && companyFilter ? companyFilter : movements.length > 0 ? movements[0].id : "dummy",
          )

        // Consulta 2: Movimientos desde el departamento del usuario
        const { data: fromDeptMovements } = await supabase
          .from("document_movements")
          .select(`
            *,
            documents!inner (
              id, 
              title, 
              document_number,
              status,
              company_id,
              created_by,
              current_department_id
            ),
            from_departments:departments!document_movements_from_department_id_fkey (
              id, 
              name,
              color
            ),
            to_departments:departments!document_movements_to_department_id_fkey (
              id, 
              name,
              color
            ),
            profiles!document_movements_moved_by_fkey (
              id, 
              full_name, 
              email
            )
          `)
          .eq("from_department_id", user.department_id)
          .eq(
            shouldFilterByCompany && companyFilter ? "documents.company_id" : "id",
            shouldFilterByCompany && companyFilter ? companyFilter : movements.length > 0 ? movements[0].id : "dummy",
          )

        // Consulta 3: Movimientos hacia el departamento del usuario
        const { data: toDeptMovements } = await supabase
          .from("document_movements")
          .select(`
            *,
            documents!inner (
              id, 
              title, 
              document_number,
              status,
              company_id,
              created_by,
              current_department_id
            ),
            from_departments:departments!document_movements_from_department_id_fkey (
              id, 
              name,
              color
            ),
            to_departments:departments!document_movements_to_department_id_fkey (
              id, 
              name,
              color
            ),
            profiles!document_movements_moved_by_fkey (
              id, 
              full_name, 
              email
            )
          `)
          .eq("to_department_id", user.department_id)
          .eq(
            shouldFilterByCompany && companyFilter ? "documents.company_id" : "id",
            shouldFilterByCompany && companyFilter ? companyFilter : movements.length > 0 ? movements[0].id : "dummy",
          )

        // Combinar y eliminar duplicados
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
            documents!inner (
              id, 
              title, 
              document_number,
              status,
              company_id,
              created_by,
              current_department_id
            ),
            from_departments:departments!document_movements_from_department_id_fkey (
              id, 
              name,
              color
            ),
            to_departments:departments!document_movements_to_department_id_fkey (
              id, 
              name,
              color
            ),
            profiles!document_movements_moved_by_fkey (
              id, 
              full_name, 
              email
            )
          `)
          .eq("documents.created_by", user.id)
          .eq(
            shouldFilterByCompany && companyFilter ? "documents.company_id" : "id",
            shouldFilterByCompany && companyFilter ? companyFilter : movements.length > 0 ? movements[0].id : "dummy",
          )

        allMovements = data || []
      } else {
        // Admin: ver todos los movimientos
        let query = supabase.from("document_movements").select(`
          *,
          documents!inner (
            id, 
            title, 
            document_number,
            status,
            company_id,
            created_by,
            current_department_id
          ),
          from_departments:departments!document_movements_from_department_id_fkey (
            id, 
            name,
            color
          ),
          to_departments:departments!document_movements_to_department_id_fkey (
            id, 
            name,
            color
          ),
          profiles!document_movements_moved_by_fkey (
            id, 
            full_name, 
            email
          )
        `)

        // Aplicar filtro de empresa si es necesario
        if (shouldFilterByCompany && companyFilter) {
          query = query.eq("documents.company_id", companyFilter)
        }

        const { data, error } = await query

        if (error) {
          console.error("Error fetching movements:", error)
          toast({
            title: "Error",
            description: "No se pudieron cargar los movimientos. Intente nuevamente.",
            variant: "destructive",
          })
          return
        }

        allMovements = data || []
      }

      // Ordenar por fecha de creación (más reciente primero)
      allMovements.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      console.log("Movements fetched:", allMovements.length)
      setMovements(allMovements)
    } catch (error) {
      console.error("Error fetching movements:", error)
      toast({
        title: "Error",
        description: "Error inesperado al cargar los movimientos.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const fetchDepartments = async () => {
    try {
      // Determinar filtro de empresa
      const isAdmin = user?.role === "admin" || user?.role === "supervisor"
      const shouldFilterByCompany = !isAdmin || selectedCompany !== null
      const companyFilter = isAdmin ? selectedCompany?.id : user?.company_id

      let query = supabase.from("departments").select("id, name, color, company_id").order("name")

      // Aplicar filtro de empresa si es necesario
      if (shouldFilterByCompany && companyFilter) {
        query = query.eq("company_id", companyFilter)
      }

      const { data, error } = await query

      if (error) {
        console.error("Error fetching departments:", error)
        return
      }

      // Usar Map para eliminar duplicados de manera más efectiva
      const uniqueDepartmentsMap = new Map()

      data?.forEach((dept) => {
        // Usar el ID como clave única para evitar duplicados
        if (!uniqueDepartmentsMap.has(dept.id)) {
          uniqueDepartmentsMap.set(dept.id, dept)
        }
      })

      // Convertir Map de vuelta a array y ordenar por nombre
      const uniqueDepartments = Array.from(uniqueDepartmentsMap.values()).sort((a, b) => a.name.localeCompare(b.name))

      console.log(
        "Unique departments:",
        uniqueDepartments.length,
        uniqueDepartments.map((d) => d.name),
      )
      setDepartments(uniqueDepartments)
    } catch (error) {
      console.error("Error fetching departments:", error)
    }
  }

  const handleRefresh = () => {
    fetchMovements(true)
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

  // Determinar el título según el contexto
  const getPageTitle = () => {
    const isAdmin = user?.role === "admin" || user?.role === "supervisor"
    if (isAdmin) {
      if (selectedCompany === null) {
        return "Movimientos de Documentos - Vista General"
      } else if (selectedCompany) {
        return `Movimientos de Documentos - ${selectedCompany.name}`
      }
    }
    return "Movimientos de Documentos"
  }

  const getPageDescription = () => {
    const isAdmin = user?.role === "admin" || user?.role === "supervisor"
    if (isAdmin) {
      return "Historial de todos los movimientos de documentos entre departamentos"
    }
    return "Historial de movimientos de documentos relacionados con tu área y documentos creados por ti"
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verificando autenticación...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen space-y-4 sm:space-y-6 p-3 sm:p-4 lg:p-6">
      {/* Header with gradient text */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-foreground via-foreground/80 to-foreground/60 bg-clip-text text-transparent mb-2">
            {getPageTitle()}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">{getPageDescription()}</p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={refreshing}
          variant="outline"
          className="w-full sm:w-auto shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 bg-transparent"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          <span className="sm:hidden">{refreshing ? "Actualizando..." : "Actualizar"}</span>
          <span className="hidden sm:inline">{refreshing ? "Actualizando..." : "Actualizar"}</span>
        </Button>
      </div>

      {/* Filters */}
      <Card className="hover:shadow-lg transition-shadow duration-300 bg-card border-border">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg text-foreground">
            <Filter className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
            Filtros de Búsqueda
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar movimientos..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={departmentFilter} onValueChange={(value) => setDepartmentFilter(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por departamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los departamentos</SelectItem>
                {departments.map((department) => (
                  <SelectItem key={department.id} value={department.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: department.color || "#6B7280" }}
                      />
                      <span className="truncate">{department.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center justify-center bg-muted rounded-lg px-4 py-2 text-sm font-medium text-foreground">
              Total: {filteredMovements.length} movimientos
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leyenda de colores - Hardcodeada */}
      <Card className="hover:shadow-lg transition-shadow duration-300 bg-card border-border">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-sm flex items-center gap-2 text-foreground">
            <div className="w-3 h-3 bg-gradient-to-r from-muted-foreground to-foreground rounded-full"></div>
            Leyenda de Departamentos ({STANDARD_DEPARTMENTS.length} departamentos)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {STANDARD_DEPARTMENTS.map((department) => (
              <DepartmentBadge key={`legend-${department.id}`} department={department} />
            ))}
          </div>
          <div className="mt-4 p-3 bg-muted border-l-4 border-l-muted-foreground rounded-lg">
            <p className="text-xs text-foreground flex items-center gap-2">
              <span>💡</span>
              <span>Los badges con 📍 indican el departamento de destino en los movimientos</span>
            </p>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="p-4 sm:p-6">
                <div className="h-4 sm:h-5 bg-slate-200 rounded w-1/3"></div>
                <div className="h-3 sm:h-4 bg-slate-200 rounded w-1/4"></div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                <div className="h-3 sm:h-4 bg-slate-200 rounded w-full mb-2"></div>
                <div className="h-3 sm:h-4 bg-slate-200 rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredMovements.length === 0 ? (
        <Card className="hover:shadow-lg transition-shadow duration-300">
          <CardContent className="p-8 sm:p-12 text-center">
            <div className="p-4 sm:p-6 bg-slate-100 rounded-2xl w-fit mx-auto mb-6">
              <FileText className="h-12 w-12 sm:h-16 sm:w-16 text-slate-400 mx-auto" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold mb-2 text-slate-800">
              {movements.length === 0 ? "No hay movimientos registrados" : "No se encontraron movimientos"}
            </h3>
            <p className="text-sm sm:text-base text-slate-600 mb-6">
              {searchQuery || departmentFilter !== "all"
                ? "Intente con otros criterios de búsqueda"
                : user?.role === "admin" || user?.role === "supervisor"
                  ? "Los movimientos aparecerán aquí cuando se muevan documentos entre departamentos"
                  : "Los movimientos de documentos relacionados con tu área aparecerán aquí"}
            </p>
            {movements.length === 0 && (
              <Button
                onClick={handleRefresh}
                variant="outline"
                className="border-slate-200 hover:bg-slate-100 text-slate-700 bg-transparent"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualizar
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredMovements.map((movement) => (
            <Card
              key={movement.id}
              className="group hover:shadow-lg hover:-translate-y-1 transition-all duration-300 bg-card border-border"
            >
              <CardHeader className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base sm:text-lg group-hover:text-primary transition-colors duration-300 text-foreground">
                      {movement.documents ? (
                        <Link
                          href={`/documents/${movement.document_id}`}
                          className="hover:underline flex items-center gap-2"
                        >
                          <FileText className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                          <span className="truncate">{movement.documents.title || "Documento sin título"}</span>
                        </Link>
                      ) : (
                        <span className="text-muted-foreground flex items-center gap-2">
                          <FileText className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                          <span>Documento eliminado</span>
                        </span>
                      )}
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm text-muted-foreground">
                      {movement.documents?.document_number && `#${movement.documents.document_number} • `}
                      {format(new Date(movement.created_at), "PPP 'a las' p", { locale: es })}
                    </CardDescription>
                  </div>
                  {movement.documents && (
                    <Button variant="outline" size="sm" asChild className="w-full sm:w-auto bg-transparent">
                      <Link href={`/documents/${movement.document_id}`}>
                        <span className="sm:hidden">Ver Doc</span>
                        <span className="hidden sm:inline">Ver Documento</span>
                      </Link>
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-3 sm:p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
                      <DepartmentBadge department={movement.from_departments} />
                      <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
                      <DepartmentBadge department={movement.to_departments} isDestination={true} />
                    </div>
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2">
                    <div className="w-2 h-2 bg-muted-foreground rounded-full flex-shrink-0"></div>
                    <span className="truncate">Movido por {movement.profiles?.full_name || "Usuario desconocido"}</span>
                  </div>
                  {movement.notes && (
                    <div className="mt-4 p-3 sm:p-4 bg-muted border-l-4 border-l-muted-foreground rounded-lg">
                      <p className="font-medium text-foreground mb-1 text-sm">Notas:</p>
                      <p className="text-xs sm:text-sm text-foreground whitespace-pre-line break-words">
                        {movement.notes}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
