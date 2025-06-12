"use client"

import { useState, useEffect } from "react"
import { Plus, FileText, Activity, TrendingUp, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { NewsCarousel } from "@/components/news/news-carousel"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import Link from "next/link"

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState({
    totalDocuments: 0,
    totalMovements: 0,
    pendingDocuments: 0,
    completedDocuments: 0,
    recentDocuments: [],
    recentActivity: [],
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchDashboardData()
    }
  }, [user])

  const fetchDashboardData = async () => {
    try {
      // Fetch total documents based on user role
      let documentsQuery = supabase.from("documents").select("*")

      if (user?.role === "user") {
        documentsQuery = documentsQuery.or(`created_by.eq.${user.id},current_department_id.eq.${user.department_id}`)
      }

      const { data: documents } = await documentsQuery

      // Calculate stats
      const totalDocuments = documents?.length || 0
      const pendingDocuments = documents?.filter((doc) => doc.status === "pending").length || 0
      const completedDocuments = documents?.filter((doc) => doc.status === "completed").length || 0

      // Fetch total movements
      const { count: movementsCount } = await supabase
        .from("document_movements")
        .select("*", { count: "exact", head: true })

      // Fetch recent documents - try with specific relationship first
      try {
        let recentDocsQuery = supabase
          .from("documents")
          .select(`
            *,
            profiles!documents_created_by_fkey (full_name),
            departments!documents_current_department_id_fkey (name)
          `)
          .order("created_at", { ascending: false })
          .limit(5)

        if (user?.role === "user") {
          recentDocsQuery = recentDocsQuery.or(
            `created_by.eq.${user.id},current_department_id.eq.${user.department_id}`,
          )
        }

        const { data: recentDocs, error } = await recentDocsQuery

        if (error) {
          throw error
        }

        // Fetch recent activity
        const { data: recentActivity } = await supabase
          .from("document_movements")
          .select(`
            *,
            documents (title, document_number),
            profiles!document_movements_moved_by_fkey (full_name),
            departments!document_movements_to_department_id_fkey (name)
          `)
          .order("created_at", { ascending: false })
          .limit(5)

        setStats({
          totalDocuments,
          totalMovements: movementsCount || 0,
          pendingDocuments,
          completedDocuments,
          recentDocuments: recentDocs || [],
          recentActivity: recentActivity || [],
        })
      } catch (error) {
        console.error("Error with specific relationship, trying fallback:", error)

        // Fallback: fetch documents and departments separately
        let recentDocsQuery = supabase
          .from("documents")
          .select(`
            *,
            profiles!documents_created_by_fkey (full_name)
          `)
          .order("created_at", { ascending: false })
          .limit(5)

        if (user?.role === "user") {
          recentDocsQuery = recentDocsQuery.or(
            `created_by.eq.${user.id},current_department_id.eq.${user.department_id}`,
          )
        }

        const { data: recentDocs } = await recentDocsQuery

        // Fetch departments separately
        const { data: departments } = await supabase.from("departments").select("id, name")
        const departmentsMap = new Map(departments?.map((d) => [d.id, d]) || [])

        // Combine data manually
        const combinedDocs =
          recentDocs?.map((doc) => ({
            ...doc,
            departments: doc.current_department_id
              ? { name: departmentsMap.get(doc.current_department_id)?.name }
              : null,
          })) || []

        // Fetch recent activity
        const { data: recentActivity } = await supabase
          .from("document_movements")
          .select(`
            *,
            documents (title, document_number),
            profiles!document_movements_moved_by_fkey (full_name),
            departments!document_movements_to_department_id_fkey (name)
          `)
          .order("created_at", { ascending: false })
          .limit(5)

        setStats({
          totalDocuments,
          totalMovements: movementsCount || 0,
          pendingDocuments,
          completedDocuments,
          recentDocuments: combinedDocs || [],
          recentActivity: recentActivity || [],
        })
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 p-6">
      {/* Header with gradient background */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-purple-600 to-blue-800 p-8 text-white">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-2">Dashboard</h1>
            <p className="text-blue-100 text-lg">Bienvenido de vuelta, {user.full_name}</p>
          </div>
          <Button
            asChild
            className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm transition-all duration-300 hover:scale-105 shadow-lg"
          >
            <Link href="/documents/new">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Documento
            </Link>
          </Button>
        </div>
        {/* Decorative elements */}
        <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
        <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-purple-400/20 rounded-full blur-2xl"></div>
      </div>

      {/* Stats Cards with modern effects */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/30 hover:shadow-xl hover:shadow-blue-500/25 transition-all duration-300 hover:-translate-y-1">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Documentos</CardTitle>
            <div className="p-2 bg-blue-500 rounded-lg shadow-lg">
              <FileText className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.totalDocuments}</div>
            <p className="text-xs text-blue-600/70 dark:text-blue-400/70">Documentos en el sistema</p>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/50 dark:to-amber-900/30 hover:shadow-xl hover:shadow-amber-500/25 transition-all duration-300 hover:-translate-y-1">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium text-amber-700 dark:text-amber-300">Pendientes</CardTitle>
            <div className="p-2 bg-amber-500 rounded-lg shadow-lg">
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">{stats.pendingDocuments}</div>
            <p className="text-xs text-amber-600/70 dark:text-amber-400/70">Documentos pendientes</p>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/30 hover:shadow-xl hover:shadow-green-500/25 transition-all duration-300 hover:-translate-y-1">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">Completados</CardTitle>
            <div className="p-2 bg-green-500 rounded-lg shadow-lg">
              <Users className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.completedDocuments}</div>
            <p className="text-xs text-green-600/70 dark:text-green-400/70">Documentos completados</p>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/50 dark:to-purple-900/30 hover:shadow-xl hover:shadow-purple-500/25 transition-all duration-300 hover:-translate-y-1">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300">Movimientos</CardTitle>
            <div className="p-2 bg-purple-500 rounded-lg shadow-lg">
              <Activity className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">{stats.totalMovements}</div>
            <p className="text-xs text-purple-600/70 dark:text-purple-400/70">Total de movimientos</p>
          </CardContent>
        </Card>
      </div>

      {/* News Carousel with enhanced styling */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
            <FileText className="h-5 w-5 text-white" />
          </div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Noticias de la Empresa
          </h2>
        </div>
        <NewsCarousel />
      </div>

      {/* Recent Documents and Activity with modern cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 border-0 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/50 dark:to-slate-800/30 shadow-xl hover:shadow-2xl transition-all duration-300">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Documentos Recientes
            </CardTitle>
            <CardDescription className="text-blue-100">Últimos documentos registrados en el sistema</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {loading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-200 to-blue-300 animate-pulse" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-gradient-to-r from-slate-200 to-slate-300 rounded animate-pulse" />
                      <div className="h-3 bg-gradient-to-r from-slate-200 to-slate-300 rounded w-2/3 animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : stats.recentDocuments.length === 0 ? (
              <div className="text-center py-8">
                <div className="p-4 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-2xl w-fit mx-auto mb-4">
                  <FileText className="h-12 w-12 text-blue-500 mx-auto" />
                </div>
                <p className="text-muted-foreground">No hay documentos disponibles</p>
              </div>
            ) : (
              <div className="space-y-4">
                {stats.recentDocuments.map((doc: any) => (
                  <div
                    key={doc.id}
                    className="group flex items-center space-x-4 p-3 rounded-xl hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 dark:hover:from-blue-950/30 dark:hover:to-purple-950/30 transition-all duration-300"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <FileText className="h-6 w-6 text-white" />
                    </div>
                    <div className="space-y-1 flex-1">
                      <p className="text-sm font-medium leading-none group-hover:text-blue-600 transition-colors duration-300">
                        {doc.title}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {doc.document_number} • {doc.departments?.name || "Sin departamento"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium capitalize">{doc.status}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(doc.created_at).toLocaleDateString("es-ES")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-3 border-0 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/50 dark:to-slate-800/30 shadow-xl hover:shadow-2xl transition-all duration-300">
          <CardHeader className="bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Actividad Reciente
            </CardTitle>
            <CardDescription className="text-green-100">Últimos movimientos del sistema</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {loading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 bg-gradient-to-r from-slate-200 to-slate-300 rounded animate-pulse" />
                    <div className="h-3 bg-gradient-to-r from-slate-200 to-slate-300 rounded w-3/4 animate-pulse" />
                  </div>
                ))}
              </div>
            ) : stats.recentActivity.length === 0 ? (
              <div className="text-center py-8">
                <div className="p-4 bg-gradient-to-br from-green-100 to-blue-100 dark:from-green-900/30 dark:to-blue-900/30 rounded-2xl w-fit mx-auto mb-4">
                  <Activity className="h-12 w-12 text-green-500 mx-auto" />
                </div>
                <p className="text-muted-foreground">No hay actividad registrada</p>
              </div>
            ) : (
              <div className="space-y-4">
                {stats.recentActivity.map((activity: any) => (
                  <div
                    key={activity.id}
                    className="group p-3 rounded-xl hover:bg-gradient-to-r hover:from-green-50 hover:to-blue-50 dark:hover:from-green-950/30 dark:hover:to-blue-950/30 transition-all duration-300"
                  >
                    <p className="text-sm font-medium group-hover:text-green-600 transition-colors duration-300">
                      {activity.documents?.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Movido por {activity.profiles?.full_name} a {activity.departments?.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(activity.created_at).toLocaleDateString("es-ES")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
