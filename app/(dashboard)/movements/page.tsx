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
  }, [user])

  const fetchMovements = async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      // Consulta con colores de departamentos
      const { data, error } = await supabase
        .from("document_movements")
        .select(`
          *,
          documents!inner (
            id, 
            title, 
            document_number,
            status
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
        .order("created_at", { ascending: false })

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
      const { data, error } = await supabase.from("departments").select("id, name, color").order("name")

      if (error) {
        console.error("Error fetching departments:", error)
        return
      }

      setDepartments(data || [])
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
    <div className="space-y-6 p-6">
      {/* Header with gradient text */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent mb-2">
            Movimientos de Documentos
          </h1>
          <p className="text-muted-foreground">Historial de todos los movimientos de documentos entre departamentos</p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={refreshing}
          variant="outline"
          className="shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Actualizando..." : "Actualizar"}
        </Button>
      </div>

      {/* Filters */}
      <Card className="hover:shadow-lg transition-shadow duration-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-blue-600" />
            Filtros de Búsqueda
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                      {department.name}
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
          <CardHeader>
            <CardTitle className="text-sm">Leyenda de Departamentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
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
              <CardHeader>
                <div className="h-5 bg-muted rounded w-1/3"></div>
                <div className="h-4 bg-muted rounded w-1/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-muted rounded w-full mb-2"></div>
                <div className="h-4 bg-muted rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredMovements.length === 0 ? (
        <Card className="hover:shadow-lg transition-shadow duration-300">
          <CardContent className="p-12 text-center">
            <div className="p-6 bg-muted/50 rounded-2xl w-fit mx-auto mb-6">
              <FileText className="h-16 w-16 text-muted-foreground mx-auto" />
            </div>
            <h3 className="text-xl font-semibold mb-2">
              {movements.length === 0 ? "No hay movimientos registrados" : "No se encontraron movimientos"}
            </h3>
            <p className="text-muted-foreground mb-6">
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
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg group-hover:text-primary transition-colors duration-300">
                      {movement.documents ? (
                        <Link
                          href={`/documents/${movement.document_id}`}
                          className="hover:underline flex items-center gap-2"
                        >
                          <FileText className="h-5 w-5" />
                          {movement.documents.title || "Documento sin título"}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground flex items-center gap-2">
                          <FileText className="h-5 w-5" />
                          Documento eliminado
                        </span>
                      )}
                    </CardTitle>
                    <CardDescription>
                      {movement.documents?.document_number && `#${movement.documents.document_number} • `}
                      {format(new Date(movement.created_at), "PPP 'a las' p", { locale: es })}
                    </CardDescription>
                  </div>
                  {movement.documents && (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/documents/${movement.document_id}`}>Ver Documento</Link>
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                    <DepartmentBadge department={movement.from_departments} />
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                    <DepartmentBadge department={movement.to_departments} isDestination={true} />
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    Movido por {movement.profiles?.full_name || "Usuario desconocido"}
                  </div>
                  {movement.notes && (
                    <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border-l-4 border-blue-500">
                      <p className="font-medium text-blue-800 dark:text-blue-200 mb-1">Notas:</p>
                      <p className="text-sm text-blue-700 dark:text-blue-300 whitespace-pre-line">{movement.notes}</p>
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
