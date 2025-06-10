"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { ArrowRight, FileText, Search, RefreshCw } from "lucide-react"

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

// Componente para mostrar departamento con color
const DepartmentBadge = ({ department, isDestination = false }: { department: any; isDestination?: boolean }) => {
  if (!department) {
    return (
      <div className="bg-muted px-3 py-1 rounded-md text-sm">
        {isDestination ? "Destino desconocido" : "Origen desconocido"}
      </div>
    )
  }

  const backgroundColor = department.color || "#6B7280"
  const textColor = getTextColor(backgroundColor)

  return (
    <div
      className={`px-3 py-1 rounded-md text-sm font-medium ${isDestination ? "ring-2 ring-offset-1" : ""}`}
      style={{
        backgroundColor,
        color: textColor,
        ringColor: isDestination ? backgroundColor : undefined,
      }}
    >
      {department.name}
    </div>
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
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
            <h3 className="mt-4 text-lg font-medium">Cargando...</h3>
            <p className="text-muted-foreground">Verificando autenticación...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Movimientos de Documentos</h1>
          <p className="text-muted-foreground">Historial de todos los movimientos de documentos entre departamentos</p>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Actualizando..." : "Actualizar"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar movimientos..."
            className="pl-8"
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
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: department.color || "#6B7280" }} />
                  {department.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="text-sm text-muted-foreground flex items-center">
          Total: {filteredMovements.length} movimientos
        </div>
      </div>

      {/* Leyenda de colores */}
      {departments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Leyenda de Departamentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {departments.map((department) => (
                <DepartmentBadge key={department.id} department={department} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-5 bg-gray-200 rounded w-1/3"></div>
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredMovements.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
            <h3 className="mt-4 text-lg font-medium">
              {movements.length === 0 ? "No hay movimientos registrados" : "No se encontraron movimientos"}
            </h3>
            <p className="text-muted-foreground">
              {searchQuery || departmentFilter !== "all"
                ? "Intente con otros criterios de búsqueda"
                : "Los movimientos aparecerán aquí cuando se muevan documentos entre departamentos"}
            </p>
            {movements.length === 0 && (
              <Button onClick={handleRefresh} className="mt-4" variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualizar
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredMovements.map((movement) => (
            <Card key={movement.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">
                      {movement.documents ? (
                        <Link
                          href={`/documents/${movement.document_id}`}
                          className="hover:underline hover:text-primary"
                        >
                          {movement.documents.title || "Documento sin título"}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">Documento eliminado</span>
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
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <DepartmentBadge department={movement.from_departments} />
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                    <DepartmentBadge department={movement.to_departments} isDestination={true} />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Movido por {movement.profiles?.full_name || "Usuario desconocido"}
                  </div>
                  {movement.notes && (
                    <div className="mt-2 text-sm bg-muted p-3 rounded-md">
                      <p className="font-medium">Notas:</p>
                      <p className="whitespace-pre-line">{movement.notes}</p>
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
