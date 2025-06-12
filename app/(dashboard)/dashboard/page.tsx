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
      {/* Header with gradient text */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Dashboard
          </h1>
          <p className="text-muted-foreground text-lg">Bienvenido de vuelta, {user.full_name}</p>
        </div>
        <Button asChild className="shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
          <Link href="/documents/new">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Documento
          </Link>
        </Button>
      </div>

      {/* Stats Cards - Similar to statistics page */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-blue-600/5"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-medium">Total Documentos</CardTitle>
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <FileText className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold text-blue-600">{stats.totalDocuments}</div>
            <p className="text-xs text-muted-foreground">Documentos en el sistema</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-orange-600/5"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <TrendingUp className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold text-orange-600">{stats.pendingDocuments}</div>
            <p className="text-xs text-muted-foreground">Documentos pendientes</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-green-600/5"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-medium">Completados</CardTitle>
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Users className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold text-green-600">{stats.completedDocuments}</div>
            <p className="text-xs text-muted-foreground">Documentos completados</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-purple-600/5"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-medium">Movimientos</CardTitle>
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Activity className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold text-purple-600">{stats.totalMovements}</div>
            <p className="text-xs text-muted-foreground">Total de movimientos</p>
          </CardContent>
        </Card>
      </div>

      {/* News Carousel */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Noticias de la Empresa
        </h2>
        <NewsCarousel />
      </div>

      {/* Recent Documents and Activity */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 hover:shadow-lg transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Documentos Recientes
            </CardTitle>
            <CardDescription>Últimos documentos registrados en el sistema</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <div className="h-12 w-12 rounded-lg bg-muted animate-pulse" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-muted rounded animate-pulse" />
                      <div className="h-3 bg-muted rounded w-2/3 animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : stats.recentDocuments.length === 0 ? (
              <div className="text-center py-6">
                <div className="p-4 bg-muted/50 rounded-2xl w-fit mx-auto mb-4">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
                </div>
                <p className="text-muted-foreground">No hay documentos disponibles</p>
              </div>
            ) : (
              <div className="space-y-4">
                {stats.recentDocuments.map((doc: any) => (
                  <div
                    key={doc.id}
                    className="group flex items-center space-x-4 p-3 rounded-lg hover:bg-muted/50 transition-colors duration-300"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors duration-300">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <div className="space-y-1 flex-1">
                      <p className="text-sm font-medium leading-none">{doc.title}</p>
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

        <Card className="col-span-3 hover:shadow-lg transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-600" />
              Actividad Reciente
            </CardTitle>
            <CardDescription>Últimos movimientos del sistema</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 bg-muted rounded animate-pulse" />
                    <div className="h-3 bg-muted rounded w-3/4 animate-pulse" />
                  </div>
                ))}
              </div>
            ) : stats.recentActivity.length === 0 ? (
              <div className="text-center py-6">
                <div className="p-4 bg-muted/50 rounded-2xl w-fit mx-auto mb-4">
                  <Activity className="h-12 w-12 text-muted-foreground mx-auto" />
                </div>
                <p className="text-muted-foreground">No hay actividad registrada</p>
              </div>
            ) : (
              <div className="space-y-4">
                {stats.recentActivity.map((activity: any) => (
                  <div
                    key={activity.id}
                    className="group p-3 rounded-lg hover:bg-muted/50 transition-colors duration-300"
                  >
                    <p className="text-sm font-medium">{activity.documents?.title}</p>
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
