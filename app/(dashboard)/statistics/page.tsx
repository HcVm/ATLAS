"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw, TrendingUp, BarChart3, PieChart, Calendar } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  Area,
  AreaChart,
} from "recharts"

interface StatisticsData {
  documentsByDepartment: Array<{ name: string; value: number; color: string }>
  documentsByStatus: Array<{ name: string; value: number; color: string }>
  documentsByMonth: Array<{ name: string; value: number; month: string }>
  movementsByDepartment: Array<{ name: string; value: number; color: string }>
  totalStats: {
    totalDocuments: number
    totalMovements: number
    totalDepartments: number
    totalUsers: number
  }
  recentActivity: Array<{
    date: string
    documents: number
    movements: number
  }>
}

export default function StatisticsPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [stats, setStats] = useState<StatisticsData>({
    documentsByDepartment: [],
    documentsByStatus: [],
    documentsByMonth: [],
    movementsByDepartment: [],
    totalStats: {
      totalDocuments: 0,
      totalMovements: 0,
      totalDepartments: 0,
      totalUsers: 0,
    },
    recentActivity: [],
  })

  useEffect(() => {
    if (user) {
      fetchStatistics()
    }
  }, [user])

  const fetchStatistics = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    try {
      // Obtener departamentos con colores
      const { data: departments, error: deptError } = await supabase.from("departments").select("id, name, color")

      if (deptError) throw deptError

      // Obtener documentos con información completa
      let documentsQuery = supabase.from("documents").select(`
        id, department_id, status, created_at,
        departments (name, color)
      `)

      // Filtrar por permisos de usuario
      if (user?.role === "user") {
        documentsQuery = documentsQuery.or(`created_by.eq.${user.id},department_id.eq.${user.department_id}`)
      }

      const { data: documents, error: docsError } = await documentsQuery
      if (docsError) throw docsError

      // Obtener movimientos
      const { data: movements, error: movError } = await supabase.from("document_movements").select(`
          id, to_department_id, created_at,
          departments!document_movements_to_department_id_fkey (name, color)
        `)

      if (movError) throw movError

      // Obtener totales
      const { count: totalUsers } = await supabase.from("profiles").select("*", { count: "exact", head: true })

      // Procesar estadísticas
      const processedStats = processStatistics(documents || [], movements || [], departments || [], totalUsers || 0)
      setStats(processedStats)
    } catch (error) {
      console.error("Error fetching statistics:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const processStatistics = (
    documents: any[],
    movements: any[],
    departments: any[],
    totalUsers: number,
  ): StatisticsData => {
    // Documentos por departamento
    const documentsByDepartment = departments
      .map((dept) => {
        const count = documents.filter((doc) => doc.department_id === dept.id).length
        return {
          name: dept.name,
          value: count,
          color: dept.color || getDefaultColor(dept.name),
        }
      })
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value)

    // Documentos por estado
    const statusColors = {
      pending: "#F59E0B",
      in_progress: "#3B82F6",
      completed: "#10B981",
      cancelled: "#EF4444",
    }

    const statusLabels = {
      pending: "Pendiente",
      in_progress: "En Progreso",
      completed: "Completado",
      cancelled: "Cancelado",
    }

    const statusCounts = {
      pending: 0,
      in_progress: 0,
      completed: 0,
      cancelled: 0,
    }

    documents.forEach((doc) => {
      if (statusCounts[doc.status as keyof typeof statusCounts] !== undefined) {
        statusCounts[doc.status as keyof typeof statusCounts]++
      }
    })

    const documentsByStatus = Object.entries(statusCounts)
      .map(([status, count]) => ({
        name: statusLabels[status as keyof typeof statusLabels],
        value: count,
        color: statusColors[status as keyof typeof statusColors],
      }))
      .filter((item) => item.value > 0)

    // Documentos por mes (últimos 6 meses)
    const now = new Date()
    const months = []
    for (let i = 5; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push({
        name: month.toLocaleDateString("es-ES", { month: "short", year: "2-digit" }),
        month: month.getMonth(),
        year: month.getFullYear(),
        fullName: month.toLocaleDateString("es-ES", { month: "long", year: "numeric" }),
      })
    }

    const documentsByMonth = months.map((monthData) => {
      const count = documents.filter((doc) => {
        const docDate = new Date(doc.created_at)
        return docDate.getMonth() === monthData.month && docDate.getFullYear() === monthData.year
      }).length
      return {
        name: monthData.name,
        value: count,
        month: monthData.fullName,
      }
    })

    // Movimientos por departamento
    const movementsByDepartment = departments
      .map((dept) => {
        const count = movements.filter((mov) => mov.to_department_id === dept.id).length
        return {
          name: dept.name,
          value: count,
          color: dept.color || getDefaultColor(dept.name),
        }
      })
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value)

    // Actividad reciente (últimos 7 días)
    const recentActivity = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split("T")[0]

      const docsCount = documents.filter((doc) => doc.created_at.startsWith(dateStr)).length

      const movCount = movements.filter((mov) => mov.created_at.startsWith(dateStr)).length

      recentActivity.push({
        date: date.toLocaleDateString("es-ES", { weekday: "short", day: "numeric" }),
        documents: docsCount,
        movements: movCount,
      })
    }

    return {
      documentsByDepartment,
      documentsByStatus,
      documentsByMonth,
      movementsByDepartment,
      totalStats: {
        totalDocuments: documents.length,
        totalMovements: movements.length,
        totalDepartments: departments.length,
        totalUsers,
      },
      recentActivity,
    }
  }

  const getDefaultColor = (name: string): string => {
    const colors = ["#EF4444", "#10B981", "#3B82F6", "#8B5CF6", "#F59E0B", "#06B6D4", "#84CC16", "#EC4899"]
    let hash = 0
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash)
    }
    return colors[Math.abs(hash) % colors.length]
  }

  const handleRefresh = () => {
    fetchStatistics(true)
  }

  if (!user) {
    return <div>Cargando...</div>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando estadísticas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-8 w-8" />
            Estadísticas
          </h1>
          <p className="text-muted-foreground">Análisis y métricas del sistema de documentos</p>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing} variant="outline" className="gap-2">
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Actualizando..." : "Actualizar"}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Documentos</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStats.totalDocuments}</div>
            <p className="text-xs text-muted-foreground">Documentos en el sistema</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Movimientos</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStats.totalMovements}</div>
            <p className="text-xs text-muted-foreground">Movimientos registrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Departamentos</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStats.totalDepartments}</div>
            <p className="text-xs text-muted-foreground">Departamentos activos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuarios</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">Usuarios registrados</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Documentos por Departamento */}
        <Card>
          <CardHeader>
            <CardTitle>Documentos por Departamento</CardTitle>
            <CardDescription>Distribución de documentos por departamento</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {stats.documentsByDepartment.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={stats.documentsByDepartment}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {stats.documentsByDepartment.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </RechartsPieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No hay datos disponibles
              </div>
            )}
          </CardContent>
        </Card>

        {/* Documentos por Estado */}
        <Card>
          <CardHeader>
            <CardTitle>Documentos por Estado</CardTitle>
            <CardDescription>Distribución de documentos por estado</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {stats.documentsByStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={stats.documentsByStatus}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {stats.documentsByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </RechartsPieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No hay datos disponibles
              </div>
            )}
          </CardContent>
        </Card>

        {/* Documentos por Mes */}
        <Card>
          <CardHeader>
            <CardTitle>Documentos por Mes</CardTitle>
            <CardDescription>Documentos creados en los últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.documentsByMonth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip
                  labelFormatter={(label, payload) => {
                    const item = stats.documentsByMonth.find((d) => d.name === label)
                    return item ? item.month : label
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#3B82F6"
                  fill="#3B82F6"
                  fillOpacity={0.3}
                  name="Documentos"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Movimientos por Departamento */}
        <Card>
          <CardHeader>
            <CardTitle>Movimientos por Departamento</CardTitle>
            <CardDescription>Distribución de movimientos por departamento destino</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {stats.movementsByDepartment.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.movementsByDepartment} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip />
                  <Bar dataKey="value" name="Movimientos">
                    {stats.movementsByDepartment.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No hay datos disponibles
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Actividad Reciente */}
      <Card>
        <CardHeader>
          <CardTitle>Actividad de los Últimos 7 Días</CardTitle>
          <CardDescription>Documentos creados y movimientos realizados por día</CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stats.recentActivity}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="documents" stroke="#10B981" strokeWidth={2} name="Documentos Creados" />
              <Line type="monotone" dataKey="movements" stroke="#3B82F6" strokeWidth={2} name="Movimientos" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
