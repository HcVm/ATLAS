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
        ringColor: isDestination ? backgroundColor : undefined,
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
      })

      // Construir query base
      let query = supabase.from("document_movements").select(`
          *,
          documents!inner (
            id, 
            title, 
            document_number,
            status,
            company_id
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

      const { data, error } = await query.order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching movements:", error)
        toast({
          title: "Error",
          description: "No se pudieron cargar los movimientos. Intente nuevamente.",
          variant: "destructive",
        })
        return
      }

      console.log("Movements fetched:", data?.length || 0)
      setMovements(data || [])
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
      // Obtener departamentos únicos sin duplicados
      const { data, error } = await supabase.from("departments").select("id, name, color").order("name")

      if (error) {
        console.error("Error fetching departments:", error)
        return
      }

      // Eliminar duplicados por nombre y ID
      const uniqueDepartments =
        data?.filter((dept, index, self) => index === self.findIndex((d) => d.id === dept.id)) || []

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
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 lg:p-6">
      {/* Header with gradient text */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent mb-2">
            {getPageTitle()}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Historial de todos los movimientos de documentos entre departamentos
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={refreshing}
          variant="outline"
          className="w-full sm:w-auto shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          <span className="sm:hidden">{refreshing ? "Actualizando..." : "Actualizar"}</span>
          <span className="hidden sm:inline">{refreshing ? "Actualizando..." : "Actualizar"}</span>
        </Button>
      </div>

      {/* Filters */}
      <Card className="hover:shadow-lg transition-shadow duration-300">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Filter className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
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
            <div className="flex items-center justify-center bg-muted rounded-lg px-4 py-2 text-sm font-medium">
              Total: {filteredMovements.length} movimientos
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leyenda de colores */}
      {departments.length > 0 && (
        <Card className="hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-sm">Leyenda de Departamentos</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {departments.map((department) => (
                <DepartmentBadge key={department.id} department={department} />
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Los badges con 📍 indican el departamento de destino en los movimientos
            </p>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="p-4 sm:p-6">
                <div className="h-4 sm:h-5 bg-muted rounded w-1/3"></div>
                <div className="h-3 sm:h-4 bg-muted rounded w-1/4"></div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                <div className="h-3 sm:h-4 bg-muted rounded w-full mb-2"></div>
                <div className="h-3 sm:h-4 bg-muted rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredMovements.length === 0 ? (
        <Card className="hover:shadow-lg transition-shadow duration-300">
          <CardContent className="p-8 sm:p-12 text-center">
            <div className="p-4 sm:p-6 bg-muted/50 rounded-2xl w-fit mx-auto mb-6">
              <FileText className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground mx-auto" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold mb-2">
              {movements.length === 0 ? "No hay movimientos registrados" : "No se encontraron movimientos"}
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground mb-6">
              {searchQuery || departmentFilter !== "all"
                ? "Intente con otros criterios de búsqueda"
                : "Los movimientos aparecerán aquí cuando se muevan documentos entre departamentos"}
            </p>
            {movements.length === 0 && (
              <Button onClick={handleRefresh} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualizar
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredMovements.map((movement) => (
            <Card key={movement.id} className="group hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
              <CardHeader className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base sm:text-lg group-hover:text-primary transition-colors duration-300">
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
                    <CardDescription className="text-xs sm:text-sm">
                      {movement.documents?.document_number && `#${movement.documents.document_number} • `}
                      {format(new Date(movement.created_at), "PPP 'a las' p", { locale: es })}
                    </CardDescription>
                  </div>
                  {movement.documents && (
                    <Button variant="outline" size="sm" asChild className="w-full sm:w-auto">
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
                    <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></div>
                    <span className="truncate">Movido por {movement.profiles?.full_name || "Usuario desconocido"}</span>
                  </div>
                  {movement.notes && (
                    <div className="mt-4 p-3 sm:p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border-l-4 border-blue-500">
                      <p className="font-medium text-blue-800 dark:text-blue-200 mb-1 text-sm">Notas:</p>
                      <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-300 whitespace-pre-line break-words">
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
