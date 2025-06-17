"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileText, Users, TrendingUp, ArrowRight, Activity, RefreshCw } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { es } from "date-fns/locale"

import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { NewsCarousel } from "@/components/news/news-carousel"
import { useCompany } from "@/lib/company-context"

export default function DashboardPage() {
  const { user } = useAuth()
  const { selectedCompany } = useCompany()
  const [stats, setStats] = useState({
    totalDocuments: 0,
    totalUsers: 0,
    totalDepartments: 0,
    pendingDocuments: 0,
    completedDocuments: 0,
    recentMovements: 0,
  })
  const [recentDocuments, setRecentDocuments] = useState<any[]>([])
  const [recentMovements, setRecentMovements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (user) {
      fetchDashboardData()
    }
  }, [user, selectedCompany])

  const fetchDashboardData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      // Determinar qué empresa usar para filtrar
      let shouldFilterByCompany = false
      let companyFilter = null

      if (user?.role === "admin") {
        // Admin: si hay empresa seleccionada, filtrar por ella. Si no (modo general), no filtrar
        if (selectedCompany) {
          shouldFilterByCompany = true
          companyFilter = selectedCompany.id
        }
      } else {
        // Usuario normal: siempre filtrar por su empresa asignada
        if (user?.company_id) {
          shouldFilterByCompany = true
          companyFilter = user.company_id
        }
      }

      // Construir queries base
      let documentsCountQuery = supabase.from("documents").select("id", { count: "exact", head: true })
      let pendingCountQuery = supabase
        .from("documents")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending")
      let completedCountQuery = supabase
        .from("documents")
        .select("id", { count: "exact", head: true })
        .eq("status", "completed")

      // Aplicar filtro de empresa solo si es necesario
      if (shouldFilterByCompany && companyFilter) {
        documentsCountQuery = documentsCountQuery.eq("company_id", companyFilter)
        pendingCountQuery = pendingCountQuery.eq("company_id", companyFilter)
        completedCountQuery = completedCountQuery.eq("company_id", companyFilter)
      }

      // Fetch statistics
      const [documentsRes, usersRes, departmentsRes, pendingRes, completedRes] = await Promise.all([
        documentsCountQuery,
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("departments").select("id", { count: "exact", head: true }),
        pendingCountQuery,
        completedCountQuery,
      ])

      // Fetch recent documents
      let documentsQuery = supabase
        .from("documents")
        .select(`
        *,
        profiles!documents_created_by_fkey (full_name),
        departments!documents_current_department_id_fkey (name, color)
      `)
        .order("created_at", { ascending: false })
        .limit(5)

      // Aplicar filtro de empresa a documentos recientes
      if (shouldFilterByCompany && companyFilter) {
        documentsQuery = documentsQuery.eq("company_id", companyFilter)
      }

      // Aplicar filtros adicionales para usuarios no-admin
      if (user && user.role !== "admin") {
        if (user.department_id) {
          documentsQuery = documentsQuery.or(`current_department_id.eq.${user.department_id},created_by.eq.${user.id}`)
        } else {
          documentsQuery = documentsQuery.eq("created_by", user.id)
        }
      }

      const { data: documents } = await documentsQuery

      // Fetch recent movements
      let movementsQuery = supabase.from("document_movements").select(`
      *,
      documents!inner (title, document_number, company_id),
      from_departments:departments!document_movements_from_department_id_fkey (name, color),
      to_departments:departments!document_movements_to_department_id_fkey (name, color),
      profiles!document_movements_moved_by_fkey (full_name)
    `)

      // Aplicar filtro de empresa a movimientos
      if (shouldFilterByCompany && companyFilter) {
        movementsQuery = movementsQuery.eq("documents.company_id", companyFilter)
      }

      const { data: movements } = await movementsQuery.order("created_at", { ascending: false }).limit(5)

      setStats({
        totalDocuments: documentsRes.count || 0,
        totalUsers: usersRes.count || 0,
        totalDepartments: departmentsRes.count || 0,
        pendingDocuments: pendingRes.count || 0,
        completedDocuments: completedRes.count || 0,
        recentMovements: movements?.length || 0,
      })

      setRecentDocuments(documents || [])
      setRecentMovements(movements || [])
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    fetchDashboardData(true)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge
            variant="outline"
            className="bg-gradient-to-r from-yellow-50 to-orange-50 text-yellow-700 border-yellow-200 shadow-sm"
          >
            Pendiente
          </Badge>
        )
      case "in_progress":
        return (
          <Badge
            variant="outline"
            className="bg-gradient-to-r from-blue-50 to-cyan-50 text-blue-700 border-blue-200 shadow-sm"
          >
            En Progreso
          </Badge>
        )
      case "completed":
        return (
          <Badge
            variant="outline"
            className="bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border-green-200 shadow-sm"
          >
            Completado
          </Badge>
        )
      case "cancelled":
        return (
          <Badge
            variant="outline"
            className="bg-gradient-to-r from-red-50 to-rose-50 text-red-700 border-red-200 shadow-sm"
          >
            Cancelado
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getDepartmentBadge = (department: any) => {
    if (!department) return null
    return (
      <span
        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium shadow-sm"
        style={{
          backgroundColor: department.color ? `${department.color}20` : "#f3f4f6",
          color: department.color || "#6b7280",
          borderColor: department.color || "#d1d5db",
        }}
      >
        {department.name}
      </span>
    )
  }

  const completionRate = stats.totalDocuments > 0 ? (stats.completedDocuments / stats.totalDocuments) * 100 : 0

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-3 sm:p-4 lg:p-6">
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="text-muted-foreground">Cargando dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
            Dashboard
            {user?.role === "admin" && selectedCompany && (
              <span className="text-lg font-normal text-muted-foreground ml-2">- {selectedCompany.name}</span>
            )}
            {user?.role === "admin" && !selectedCompany && (
              <span className="text-lg font-normal text-muted-foreground ml-2">- Vista General</span>
            )}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Bienvenido de vuelta, {user?.full_name || "Usuario"}
            {user?.role === "admin" && selectedCompany && (
              <span className="block text-xs">Viendo datos de: {selectedCompany.name}</span>
            )}
            {user?.role === "admin" && !selectedCompany && (
              <span className="block text-xs">Viendo datos de todas las empresas</span>
            )}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={refreshing}
          className="w-full sm:w-auto hover:shadow-md transition-all duration-300 hover:scale-105"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          <span className="sm:hidden">{refreshing ? "Actualizando..." : "Actualizar"}</span>
          <span className="hidden sm:inline">{refreshing ? "Actualizando..." : "Actualizar"}</span>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-blue-600/5"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative p-3 sm:p-4 lg:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Documentos</CardTitle>
            <div className="p-1.5 sm:p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <FileText className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent className="relative p-3 sm:p-4 lg:p-6 pt-0">
            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600">{stats.totalDocuments}</div>
            <p className="text-xs text-muted-foreground">Documentos en el sistema</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-orange-600/5"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative p-3 sm:p-4 lg:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Pendientes</CardTitle>
            <div className="p-1.5 sm:p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent className="relative p-3 sm:p-4 lg:p-6 pt-0">
            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-orange-600">{stats.pendingDocuments}</div>
            <p className="text-xs text-muted-foreground">Documentos pendientes</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-green-600/5"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative p-3 sm:p-4 lg:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Completados</CardTitle>
            <div className="p-1.5 sm:p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Users className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent className="relative p-3 sm:p-4 lg:p-6 pt-0">
            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600">{stats.completedDocuments}</div>
            <p className="text-xs text-muted-foreground">Documentos completados</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-purple-600/5"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative p-3 sm:p-4 lg:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Movimientos</CardTitle>
            <div className="p-1.5 sm:p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Activity className="h-3 w-3 sm:h-4 sm:w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent className="relative p-3 sm:p-4 lg:p-6 pt-0">
            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-purple-600">{stats.recentMovements}</div>
            <p className="text-xs text-muted-foreground">Total de movimientos</p>
          </CardContent>
        </Card>
      </div>

      {/* News Carousel */}
      <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50/50 hover:shadow-xl transition-all duration-300">
        <CardHeader className="border-b border-gray-100 p-4 sm:p-6">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-red-100 to-pink-100">
              <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
            </div>
            <div>
              <CardTitle className="text-base sm:text-lg text-gray-900">Noticias Recientes</CardTitle>
              <CardDescription className="text-sm">Últimas actualizaciones y anuncios</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <NewsCarousel />
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50/50 hover:shadow-xl transition-all duration-300">
        <CardContent className="p-4 sm:p-6">
          <Tabs defaultValue="documents" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-gradient-to-r from-blue-100 to-purple-100">
              <TabsTrigger
                value="documents"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white transition-all duration-300 text-xs sm:text-sm"
              >
                <FileText className="h-4 w-4 mr-2" />
                <span className="sm:hidden">Docs</span>
                <span className="hidden sm:inline">Documentos Recientes</span>
              </TabsTrigger>
              <TabsTrigger
                value="movements"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white transition-all duration-300 text-xs sm:text-sm"
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                <span className="sm:hidden">Movs</span>
                <span className="hidden sm:inline">Movimientos</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="documents" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Documentos Recientes</h3>
                <Button variant="outline" size="sm" asChild className="hover:scale-105 transition-all duration-300">
                  <Link href="/documents">
                    <span className="sm:hidden">Ver todos</span>
                    <span className="hidden sm:inline">Ver todos los documentos</span>
                  </Link>
                </Button>
              </div>

              {recentDocuments.length === 0 ? (
                <div className="text-center py-8">
                  <div className="p-4 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <FileText className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-muted-foreground">No hay documentos recientes</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border border-gray-200 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-purple-50/50 transition-all duration-300 hover:shadow-md"
                    >
                      <div className="flex-1 min-w-0 mb-3 sm:mb-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium text-gray-900 truncate text-sm sm:text-base">
                            {doc.title || "Sin título"}
                          </h4>
                          {getStatusBadge(doc.status)}
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                          <span>#{doc.document_number || "Sin número"}</span>
                          <span className="hidden sm:inline">•</span>
                          <span>Por {doc.profiles?.full_name || "Usuario desconocido"}</span>
                          <span className="hidden sm:inline">•</span>
                          <span>{format(new Date(doc.created_at), "dd/MM/yyyy", { locale: es })}</span>
                        </div>
                        {doc.departments && <div className="mt-2">{getDepartmentBadge(doc.departments)}</div>}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="w-full sm:w-auto hover:scale-105 transition-all duration-300"
                      >
                        <Link href={`/documents/${doc.id}`}>
                          <span className="sm:hidden">Ver</span>
                          <span className="hidden sm:inline">Ver documento</span>
                        </Link>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="movements" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Movimientos Recientes</h3>
                <Button variant="outline" size="sm" asChild className="hover:scale-105 transition-all duration-300">
                  <Link href="/movements">
                    <span className="sm:hidden">Ver todos</span>
                    <span className="hidden sm:inline">Ver todos los movimientos</span>
                  </Link>
                </Button>
              </div>

              {recentMovements.length === 0 ? (
                <div className="text-center py-8">
                  <div className="p-4 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <ArrowRight className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-muted-foreground">No hay movimientos recientes</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentMovements.map((movement) => (
                    <div
                      key={movement.id}
                      className="p-4 rounded-lg border border-gray-200 hover:bg-gradient-to-r hover:from-green-50/50 hover:to-emerald-50/50 transition-all duration-300 hover:shadow-md"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 truncate text-sm sm:text-base">
                            {movement.documents?.title || "Documento eliminado"}
                          </h4>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-2">
                            <div className="flex items-center gap-2">
                              {movement.from_departments && (
                                <span
                                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                                  style={{
                                    backgroundColor: movement.from_departments.color
                                      ? `${movement.from_departments.color}20`
                                      : "#f3f4f6",
                                    color: movement.from_departments.color || "#6b7280",
                                  }}
                                >
                                  {movement.from_departments.name}
                                </span>
                              )}
                              <ArrowRight className="h-3 w-3 text-muted-foreground" />
                              {movement.to_departments && (
                                <span
                                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ring-2 ring-offset-1"
                                  style={{
                                    backgroundColor: movement.to_departments.color
                                      ? `${movement.to_departments.color}20`
                                      : "#f3f4f6",
                                    color: movement.to_departments.color || "#6b7280",
                                    borderColor: movement.to_departments.color || "#d1d5db",
                                  }}
                                >
                                  {movement.to_departments.name}
                                </span>
                              )}
                            </div>
                          </div>
                          <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                            Por {movement.profiles?.full_name || "Usuario desconocido"} •{" "}
                            {format(new Date(movement.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
                          </p>
                        </div>
                        {movement.documents && (
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                            className="w-full sm:w-auto hover:scale-105 transition-all duration-300"
                          >
                            <Link href={`/documents/${movement.document_id}`}>
                              <span className="sm:hidden">Ver</span>
                              <span className="hidden sm:inline">Ver documento</span>
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
