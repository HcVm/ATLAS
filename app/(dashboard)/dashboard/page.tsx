"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileText, Users, TrendingUp, ArrowRight, Activity, RefreshCw, Clock, Search } from 'lucide-react'
import Link from "next/link"
import { format } from "date-fns"
import { es } from "date-fns/locale"

import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { useCompany } from "@/lib/company-context"
import { NewsCarousel } from "@/components/news/news-carousel"
import { AttendanceWidget } from "@/components/attendance/attendance-widget"
import { UpcomingEventsWidget } from "@/components/calendar/upcoming-events-widget"
import { DocumentSearchDialog } from "@/components/documents/document-search-dialog"
import { PhotocheckCard } from "@/components/dashboard/photocheck-card"

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
  const [documentSearchOpen, setDocumentSearchOpen] = useState(false)
  const [department, setDepartment] = useState<any>(null)

  // Datos para el gráfico
  const chartData = [
    { name: "Pendientes", value: stats.pendingDocuments, color: "#f59e0b" }, // Amber-500
    { name: "Completados", value: stats.completedDocuments, color: "#10b981" }, // Emerald-500
  ]

  // Saludo basado en la hora
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "Buenos días"
    if (hour < 18) return "Buenas tardes"
    return "Buenas noches"
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100
      }
    }
  }

  useEffect(() => {
    if (user) {
      fetchDashboardData()
      fetchUserDepartment()
    }
  }, [user, selectedCompany])

  const fetchUserDepartment = async () => {
    if (user?.department_id) {
      const { data } = await supabase.from("departments").select("name").eq("id", user.department_id).single()
      if (data) setDepartment(data)
    }
  }

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

      // Apply filters for non-admins
      const isAdmin = user?.role === "admin" || user?.role === "supervisor"

      if (!isAdmin && user) {
        // Ensure we filter by company if not already handled
        if (user.company_id) {
          documentsCountQuery = documentsCountQuery.eq("company_id", user.company_id)
          pendingCountQuery = pendingCountQuery.eq("company_id", user.company_id)
          completedCountQuery = completedCountQuery.eq("company_id", user.company_id)
        }

        if (user.department_id) {
          // Filter: Created by me OR Currently in my department
          const filterCondition = `current_department_id.eq.${user.department_id},created_by.eq.${user.id}`
          documentsCountQuery = documentsCountQuery.or(filterCondition)
          pendingCountQuery = pendingCountQuery.or(filterCondition)
          completedCountQuery = completedCountQuery.or(filterCondition)
        } else {
          documentsCountQuery = documentsCountQuery.eq("created_by", user.id)
          pendingCountQuery = pendingCountQuery.eq("created_by", user.id)
          completedCountQuery = completedCountQuery.eq("created_by", user.id)
        }
      } else if (shouldFilterByCompany && companyFilter) {
        // Only apply generic company filter if we haven't already applied specific user filters 
        // (though user filters above are stricter/orthogonal, let's keep it safe)
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
    <motion.div
      className="space-y-6 w-full"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div
        variants={itemVariants}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm p-6 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm"
      >
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-slate-800 via-slate-600 to-slate-500 dark:from-white dark:via-slate-200 dark:to-slate-400 bg-clip-text text-transparent">
            {getGreeting()}, {user?.full_name?.split(" ")[0] || "Usuario"}
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-2 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
          </p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <Button
            onClick={() => setDocumentSearchOpen(true)}
            className="flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all duration-300 hover:-translate-y-0.5"
          >
            <Search className="h-4 w-4 mr-2" />
            <span className="sm:hidden">Buscar</span>
            <span className="hidden sm:inline">Buscar Documento</span>
          </Button>
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex-1 sm:flex-none w-full sm:w-auto border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-300"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            <span className="sm:hidden">{refreshing ? "..." : "Act"}</span>
            <span className="hidden sm:inline">{refreshing ? "Actualizando..." : "Actualizar"}</span>
          </Button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div variants={itemVariants} className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white relative group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <FileText className="h-24 w-24" />
              </div>
              <CardHeader className="pb-2 relative z-10">
                <CardTitle className="text-sm font-medium text-indigo-100">
                  {user?.role === "admin" ? "Total Documentos" : "Documentos de mi Área"}
                </CardTitle>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-3xl font-bold">{stats.totalDocuments}</div>
                <div className="mt-2 h-1 w-full bg-indigo-900/30 rounded-full overflow-hidden">
                  <div className="h-full bg-white/50 w-3/4 rounded-full" />
                </div>
              </CardContent>
            </Card>

            {(user?.role === "admin" || user?.role === "supervisor") && (
              <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white relative group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Users className="h-24 w-24" />
                </div>
                <CardHeader className="pb-2 relative z-10">
                  <CardTitle className="text-sm font-medium text-emerald-100">Usuarios Activos</CardTitle>
                </CardHeader>
                <CardContent className="relative z-10">
                  <div className="text-3xl font-bold">{stats.totalUsers}</div>
                  <p className="text-xs text-emerald-100 mt-1">En {stats.totalDepartments} departamentos</p>
                </CardContent>
              </Card>
            )}

            <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-orange-500 to-amber-600 text-white relative group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Activity className="h-24 w-24" />
              </div>
              <CardHeader className="pb-2 relative z-10">
                <CardTitle className="text-sm font-medium text-orange-100">Actividad</CardTitle>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-3xl font-bold">{stats.recentMovements}</div>
                <p className="text-xs text-orange-100 mt-1">Movimientos recientes</p>
              </CardContent>
            </Card>

            {/* Mini Stats Row */}
            <Card className="sm:col-span-2 lg:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-md">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Pendientes</p>
                  <p className="text-lg font-bold text-slate-800 dark:text-slate-200">{stats.pendingDocuments}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600 dark:text-green-400">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Completados</p>
                  <p className="text-lg font-bold text-slate-800 dark:text-slate-200">{stats.completedDocuments}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Asistencia</p>
                  <p className="text-lg font-bold text-slate-800 dark:text-slate-200">{stats.presentToday}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg text-amber-600 dark:text-amber-400">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Tardanzas</p>
                  <p className="text-lg font-bold text-slate-800 dark:text-slate-200">{stats.lateToday}</p>
                </div>
              </div>
            </Card>
          </div>

          <Card className="shadow-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
            <CardHeader className="border-b border-slate-100 dark:border-slate-700 p-4 sm:p-6 bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                      Noticias Corporativas
                    </CardTitle>
                    <CardDescription className="text-sm text-slate-600 dark:text-slate-400">
                      Mantente informado con las últimas actualizaciones
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <NewsCarousel />
            </CardContent>
          </Card>

          <UpcomingEventsWidget />
        </motion.div>

        <motion.div variants={itemVariants} className="lg:col-span-1 space-y-6">
          <AttendanceWidget />

          {/* Identity Card */}
          <PhotocheckCard
            user={user}
            profile={{
              full_name: user?.full_name || "",
              email: user?.email || "",
              avatar_url: user?.avatar_url || "",
            }}
            department={department}
            selectedCompany={selectedCompany}
            className="shadow-lg border-0"
            compact={true}
          />

          {/* Chart Widget */}
          <Card className="shadow-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-300">
                Estado de Documentos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center">
                <PieChart width={300} height={200}>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "rgba(255, 255, 255, 0.9)",
                      borderRadius: "8px",
                      border: "none",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                    }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div variants={itemVariants}>
        <Card className="shadow-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:shadow-xl transition-all duration-300">
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
                                {format(new Date(doc.created_at || new Date()), "dd MMM yyyy", { locale: es })}
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
      </motion.div>

      <DocumentSearchDialog open={documentSearchOpen} onOpenChange={setDocumentSearchOpen} />
    </motion.div>
  )
}
