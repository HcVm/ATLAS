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

      // Fetch recent documents
      let recentDocsQuery = supabase
        .from("documents")
        .select(`
          *,
          profiles!documents_created_by_fkey (full_name),
          departments (name)
        `)
        .order("created_at", { ascending: false })
        .limit(5)

      if (user?.role === "user") {
        recentDocsQuery = recentDocsQuery.or(`created_by.eq.${user.id},current_department_id.eq.${user.department_id}`)
      }

      const { data: recentDocs } = await recentDocsQuery

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
      console.error("Error fetching dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return <div>Cargando...</div>
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Bienvenido de vuelta, {user.full_name}</p>
        </div>
        <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md">
          <Link href="/documents/new">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Documento
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Documentos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDocuments}</div>
            <p className="text-xs text-muted-foreground">Documentos en el sistema</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingDocuments}</div>
            <p className="text-xs text-muted-foreground">Documentos pendientes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completados</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedDocuments}</div>
            <p className="text-xs text-muted-foreground">Documentos completados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Movimientos</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMovements}</div>
            <p className="text-xs text-muted-foreground">Total de movimientos</p>
          </CardContent>
        </Card>
      </div>

      {/* News Carousel */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight">Noticias de la Empresa</h2>
        <NewsCarousel />
      </div>

      {/* Recent Documents and Activity */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Documentos Recientes</CardTitle>
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
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No hay documentos disponibles</p>
              </div>
            ) : (
              <div className="space-y-4">
                {stats.recentDocuments.map((doc: any) => (
                  <div key={doc.id} className="flex items-center space-x-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <div className="space-y-1 flex-1">
                      <p className="text-sm font-medium leading-none">{doc.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {doc.document_number} • {doc.departments?.name}
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

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Actividad Reciente</CardTitle>
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
                <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No hay actividad registrada</p>
              </div>
            ) : (
              <div className="space-y-4">
                {stats.recentActivity.map((activity: any) => (
                  <div key={activity.id} className="space-y-1">
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
