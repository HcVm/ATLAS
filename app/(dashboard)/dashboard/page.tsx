"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileText, Users, TrendingUp, ArrowRight, Activity, RefreshCw, Clock } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { es } from "date-fns/locale"

import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { NewsCarousel } from "@/components/news/news-carousel"
import { useCompany } from "@/lib/company-context"
import { AttendanceWidget } from "@/components/attendance/attendance-widget"

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
    presentToday: 0,
    lateToday: 0,
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

      let shouldFilterByCompany = false
      let companyFilter = null

      if (user?.role === "admin") {
        if (selectedCompany) {
          shouldFilterByCompany = true
          companyFilter = selectedCompany.id
        }
      } else {
        if (user?.company_id) {
          shouldFilterByCompany = true
          companyFilter = user.company_id
        }
      }

      let documentsCountQuery = supabase.from("documents").select("id", { count: "exact", head: true })
      let pendingCountQuery = supabase
        .from("documents")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending")
      let completedCountQuery = supabase
        .from("documents")
        .select("id", { count: "exact", head: true })
        .eq("status", "completed")

      if (shouldFilterByCompany && companyFilter) {
        documentsCountQuery = documentsCountQuery.eq("company_id", companyFilter)
        pendingCountQuery = pendingCountQuery.eq("company_id", companyFilter)
        completedCountQuery = completedCountQuery.eq("company_id", companyFilter)
      }

      const today = new Date().toISOString().split("T")[0]
      let attendanceTodayQuery = supabase
        .from("attendance")
        .select("id", { count: "exact", head: true })
        .eq("attendance_date", today)

      let lateTodayQuery = supabase
        .from("attendance")
        .select("id", { count: "exact", head: true })
        .eq("attendance_date", today)
        .eq("is_late", true)

      if (shouldFilterByCompany && companyFilter) {
        attendanceTodayQuery = attendanceTodayQuery.eq("company_id", companyFilter)
        lateTodayQuery = lateTodayQuery.eq("company_id", companyFilter)
      }

      const [documentsRes, usersRes, departmentsRes, pendingRes, completedRes, attendanceRes, lateRes] =
        await Promise.all([
          documentsCountQuery,
          supabase.from("profiles").select("id", { count: "exact", head: true }),
          supabase.from("departments").select("id", { count: "exact", head: true }),
          pendingCountQuery,
          completedCountQuery,
          attendanceTodayQuery,
          lateTodayQuery,
        ])

      let allMovements: any[] = []
      const isAdmin = user?.role === "admin" || user?.role === "supervisor"

      if (user && !isAdmin && user.department_id) {
        const baseSelect = `
          *,
          documents!inner (title, document_number, company_id, created_by, current_department_id),
          from_departments:departments!document_movements_from_department_id_fkey (name, color),
          to_departments:departments!document_movements_to_department_id_fkey (name, color),
          profiles!document_movements_moved_by_fkey (full_name)
        `

        const [userCreatedRes, fromDeptRes, toDeptRes] = await Promise.all([
          supabase
            .from("document_movements")
            .select(baseSelect)
            .eq("documents.created_by", user.id)
            .eq(
              shouldFilterByCompany && companyFilter ? "documents.company_id" : "id",
              shouldFilterByCompany && companyFilter ? companyFilter : "dummy",
            )
            .limit(10),

          supabase
            .from("document_movements")
            .select(baseSelect)
            .eq("from_department_id", user.department_id)
            .eq(
              shouldFilterByCompany && companyFilter ? "documents.company_id" : "id",
              shouldFilterByCompany && companyFilter ? companyFilter : "dummy",
            )
            .limit(10),

          supabase
            .from("document_movements")
            .select(baseSelect)
            .eq("to_department_id", user.department_id)
            .eq(
              shouldFilterByCompany && companyFilter ? "documents.company_id" : "id",
              shouldFilterByCompany && companyFilter ? companyFilter : "dummy",
            )
            .limit(10),
        ])

        const combinedMovements = [
          ...(userCreatedRes.data || []),
          ...(fromDeptRes.data || []),
          ...(toDeptRes.data || []),
        ]

        allMovements = combinedMovements
          .filter((movement, index, self) => index === self.findIndex((m) => m.id === movement.id))
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 5)
      } else if (user && !isAdmin && !user.department_id) {
        const { data } = await supabase
          .from("document_movements")
          .select(`
            *,
            documents!inner (title, document_number, company_id, created_by, current_department_id),
            from_departments:departments!document_movements_from_department_id_fkey (name, color),
            to_departments:departments!document_movements_to_department_id_fkey (name, color),
            profiles!document_movements_moved_by_fkey (full_name)
          `)
          .eq("documents.created_by", user.id)
          .eq(
            shouldFilterByCompany && companyFilter ? "documents.company_id" : "id",
            shouldFilterByCompany && companyFilter ? companyFilter : "dummy",
          )
          .order("created_at", { ascending: false })
          .limit(5)

        allMovements = data || []
      } else {
        let movementsQuery = supabase.from("document_movements").select(`
          *,
          documents!inner (title, document_number, company_id),
          from_departments:departments!document_movements_from_department_id_fkey (name, color),
          to_departments:departments!document_movements_to_department_id_fkey (name, color),
          profiles!document_movements_moved_by_fkey (full_name)
        `)

        if (shouldFilterByCompany && companyFilter) {
          movementsQuery = movementsQuery.eq("documents.company_id", companyFilter)
        }

        const { data: movements } = await movementsQuery.order("created_at", { ascending: false }).limit(5)
        allMovements = movements || []
      }

      setStats({
        totalDocuments: documentsRes.count || 0,
        totalUsers: usersRes.count || 0,
        totalDepartments: departmentsRes.count || 0,
        pendingDocuments: pendingRes.count || 0,
        completedDocuments: completedRes.count || 0,
        recentMovements: allMovements.length || 0,
        presentToday: attendanceRes.count || 0,
        lateToday: lateRes.count || 0,
      })

      setRecentDocuments(documentsRes.data || [])
      setRecentMovements(allMovements)
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
            className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/50 dark:to-yellow-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 shadow-sm"
          >
            Pendiente
          </Badge>
        )
      case "in_progress":
        return (
          <Badge
            variant="outline"
            className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900/50 dark:to-slate-800/50 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 shadow-sm"
          >
            En Progreso
          </Badge>
        )
      case "completed":
        return (
          <Badge
            variant="outline"
            className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/50 dark:to-green-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 shadow-sm"
          >
            Completado
          </Badge>
        )
      case "cancelled":
        return (
          <Badge
            variant="outline"
            className="bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-950/50 dark:to-rose-950/50 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800 shadow-sm"
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
          backgroundColor: department.color ? `${department.color}20` : "#f1f5f9",
          color: department.color || "#475569",
          borderColor: department.color || "#cbd5e1",
        }}
      >
        {department.name}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen p-4 sm:p-6">
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600 dark:border-slate-400"></div>
            <p className="text-slate-600 dark:text-slate-300">Cargando dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-slate-700 via-slate-600 to-slate-500 dark:from-slate-200 dark:via-slate-300 dark:to-slate-400 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 mt-1">
            Bienvenido de vuelta, {user?.full_name || "Usuario"}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={refreshing}
          className="w-full sm:w-auto bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 hover:shadow-md transition-all duration-300 hover:scale-105"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          <span>{refreshing ? "Actualizando..." : "Actualizar"}</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="shadow-lg border-slate-200 dark:border-slate-700 bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-900/50 hover:shadow-xl transition-all duration-300 hover:scale-105">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  Total Documentos
                </CardTitle>
                <FileText className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">{stats.totalDocuments}</div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {stats.pendingDocuments} pendientes, {stats.completedDocuments} completados
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-slate-200 dark:border-slate-700 bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-900/50 hover:shadow-xl transition-all duration-300 hover:scale-105">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-300">Usuarios</CardTitle>
                <Users className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">{stats.totalUsers}</div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Total en el sistema</p>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-slate-200 dark:border-slate-700 bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-900/50 hover:shadow-xl transition-all duration-300 hover:scale-105">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-300">Departamentos</CardTitle>
                <TrendingUp className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">{stats.totalDepartments}</div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Áreas activas</p>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-slate-200 dark:border-slate-700 bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-900/50 hover:shadow-xl transition-all duration-300 hover:scale-105">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-300">Actividad</CardTitle>
                <Activity className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">{stats.recentMovements}</div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Movimientos recientes</p>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-slate-200 dark:border-slate-700 bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-900/50 hover:shadow-xl transition-all duration-300 hover:scale-105">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-300">Presentes Hoy</CardTitle>
                <Clock className="h-4 w-4 text-green-500 dark:text-green-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">{stats.presentToday}</div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Asistencias registradas</p>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-slate-200 dark:border-slate-700 bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-900/50 hover:shadow-xl transition-all duration-300 hover:scale-105">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-300">Tardanzas Hoy</CardTitle>
                <Clock className="h-4 w-4 text-amber-500 dark:text-amber-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">{stats.lateToday}</div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Llegadas tarde</p>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="lg:col-span-1">
          <AttendanceWidget />
        </div>
      </div>

      <Card className="shadow-lg border-slate-200 dark:border-slate-700 bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-900/50 hover:shadow-xl transition-all duration-300">
        <CardHeader className="border-b border-slate-100 dark:border-slate-700 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600">
                <FileText className="h-5 w-5 text-slate-600 dark:text-slate-300" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-slate-800 dark:text-slate-200">Noticias</CardTitle>
                <CardDescription className="text-sm text-slate-600 dark:text-slate-400">
                  Últimas actualizaciones del sistema
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <NewsCarousel />
        </CardContent>
      </Card>

      <Card className="shadow-lg border-slate-200 dark:border-slate-700 bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-900/50 hover:shadow-xl transition-all duration-300">
        <CardContent className="p-4 sm:p-6">
          <Tabs defaultValue="documents" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700">
              <TabsTrigger
                value="documents"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-slate-600 data-[state=active]:to-slate-700 data-[state=active]:text-white transition-all duration-300 text-sm text-slate-700 dark:text-slate-300"
              >
                <FileText className="h-4 w-4 mr-2" />
                <span className="sm:hidden">Docs</span>
                <span className="hidden sm:inline">Documentos Recientes</span>
              </TabsTrigger>
              <TabsTrigger
                value="movements"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-slate-600 data-[state=active]:to-slate-700 data-[state=active]:text-white transition-all duration-300 text-sm text-slate-700 dark:text-slate-300"
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                <span className="sm:hidden">Movs</span>
                <span className="hidden sm:inline">Movimientos</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="documents" className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Documentos Recientes</h3>
                <Button asChild size="sm" variant="outline" className="w-full sm:w-auto bg-slate-50 dark:bg-slate-800">
                  <Link href="/documents">
                    <span className="sm:hidden">Ver todos</span>
                    <span className="hidden sm:inline">Ver todos los documentos</span>
                  </Link>
                </Button>
              </div>
              {recentDocuments.length === 0 ? (
                <div className="text-center py-8">
                  <div className="flex flex-col items-center gap-4">
                    <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800">
                      <FileText className="h-8 w-8 text-slate-400 dark:text-slate-500" />
                    </div>
                    <div>
                      <p className="text-slate-600 dark:text-slate-300 font-medium">No hay documentos recientes</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Los documentos que crees o que pasen por tu departamento aparecerán aquí
                      </p>
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <Link href="/documents/new">Crear documento</Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50/50 to-white dark:from-slate-800/50 dark:to-slate-900/50 hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-slate-800 dark:text-slate-200 truncate">{doc.title}</h4>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">#{doc.document_number}</p>
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                              {getStatusBadge(doc.status)}
                              {doc.departments && getDepartmentBadge(doc.departments)}
                            </div>
                          </div>
                          <div className="flex flex-col sm:items-end gap-1">
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Creado por {doc.profiles?.full_name || "Usuario"}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {format(new Date(doc.created_at), "dd MMM yyyy", { locale: es })}
                            </p>
                          </div>
                        </div>
                      </div>
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="w-full sm:w-auto flex-shrink-0 bg-transparent"
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
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Movimientos Recientes</h3>
                <Button asChild size="sm" variant="outline" className="w-full sm:w-auto bg-slate-50 dark:bg-slate-800">
                  <Link href="/movements">
                    <span className="sm:hidden">Ver todos</span>
                    <span className="hidden sm:inline">Ver todos los movimientos</span>
                  </Link>
                </Button>
              </div>
              {recentMovements.length === 0 ? (
                <div className="text-center py-8">
                  <div className="flex flex-col items-center gap-4">
                    <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800">
                      <ArrowRight className="h-8 w-8 text-slate-400 dark:text-slate-500" />
                    </div>
                    <div>
                      <p className="text-slate-600 dark:text-slate-300 font-medium">No hay movimientos recientes</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Los movimientos de documentos aparecerán aquí
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentMovements.map((movement) => (
                    <div
                      key={movement.id}
                      className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50/50 to-white dark:from-slate-800/50 dark:to-slate-900/50 hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <ArrowRight className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                            <h4 className="font-medium text-slate-800 dark:text-slate-200 truncate">
                              {movement.documents?.title || "Documento"}
                            </h4>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            {movement.from_departments && (
                              <span className="text-xs px-2 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                                De: {movement.from_departments.name}
                              </span>
                            )}
                            <ArrowRight className="h-3 w-3 text-slate-400" />
                            {movement.to_departments && (
                              <span className="text-xs px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                                A: {movement.to_departments.name}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <span>Por: {movement.profiles?.full_name || "Usuario"}</span>
                            <span className="hidden sm:inline">•</span>
                            <span>{format(new Date(movement.created_at), "dd MMM yyyy HH:mm", { locale: es })}</span>
                          </div>
                          {movement.notes && (
                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 italic">"{movement.notes}"</p>
                          )}
                        </div>
                        {movement.documents && (
                          <Button
                            asChild
                            size="sm"
                            variant="outline"
                            className="w-full sm:w-auto flex-shrink-0 bg-transparent"
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
