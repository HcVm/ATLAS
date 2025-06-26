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

      const [documentsRes, usersRes, departmentsRes, pendingRes, completedRes] = await Promise.all([
        documentsCountQuery,
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("departments").select("id", { count: "exact", head: true }),
        pendingCountQuery,
        completedCountQuery,
      ])

      let documentsQuery = supabase
        .from("documents")
        .select(
          `
        *,
        profiles!documents_created_by_fkey (full_name),
        departments!documents_current_department_id_fkey (name, color)
      `
        )
        .order("created_at", { ascending: false })
        .limit(5)

      if (shouldFilterByCompany && companyFilter) {
        documentsQuery = documentsQuery.eq("company_id", companyFilter)
      }

      if (user && user.role !== "admin") {
        if (user.department_id) {
          documentsQuery = documentsQuery.or(`current_department_id.eq.${user.department_id},created_by.eq.${user.id}`)
        } else {
          documentsQuery = documentsQuery.eq("created_by", user.id)
        }
      }

      const { data: documents } = await documentsQuery

      let movementsQuery = supabase.from("document_movements").select(
        `
      *,
      documents!inner (title, document_number, company_id),
      from_departments:departments!document_movements_from_department_id_fkey (name, color),
      to_departments:departments!document_movements_to_department_id_fkey (name, color),
      profiles!document_movements_moved_by_fkey (full_name)
    `
      )

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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {/* Stats Cards ... */}
      </div>

      <Card className="shadow-lg border-slate-200 dark:border-slate-700 bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-900/50 hover:shadow-xl transition-all duration-300">
        <CardHeader className="border-b border-slate-100 dark:border-slate-700 p-4 sm:p-6">
           {/* ... Contenido del header de News ... */}
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <NewsCarousel />
        </CardContent>
      </Card>
      
      <Card className="shadow-lg border-slate-200 dark:border-slate-700 bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-900/50 hover:shadow-xl transition-all duration-300">
        <CardContent className="p-4 sm:p-6">
          <Tabs defaultValue="documents" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700">
              <TabsTrigger value="documents" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-slate-600 data-[state=active]:to-slate-700 data-[state=active]:text-white transition-all duration-300 text-sm text-slate-700 dark:text-slate-300">
                <FileText className="h-4 w-4 mr-2" />
                <span className="sm:hidden">Docs</span>
                <span className="hidden sm:inline">Documentos Recientes</span>
              </TabsTrigger>
              <TabsTrigger value="movements" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-slate-600 data-[state=active]:to-slate-700 data-[state=active]:text-white transition-all duration-300 text-sm text-slate-700 dark:text-slate-300">
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
                  {/* ... Placeholder ... */}
                </div>
              ) : (
                <div className="space-y-3">
                  {recentDocuments.map((doc) => (
                    <div key={doc.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border">
                      <div className="flex-1 min-w-0">
                        {/* ... Contenido del doc ... */}
                      </div>
                      <Button asChild size="sm" variant="outline" className="w-full sm:w-auto flex-shrink-0">
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
                  {/* ... Placeholder ... */}
                </div>
              ) : (
                <div className="space-y-3">
                  {recentMovements.map((movement) => (
                    <div key={movement.id} className="p-4 rounded-lg border">
                       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                            {/* ... Contenido del movement ... */}
                        </div>
                        {movement.documents && (
                          <Button asChild size="sm" variant="outline" className="w-full sm:w-auto flex-shrink-0">
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