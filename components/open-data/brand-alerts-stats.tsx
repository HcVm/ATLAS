import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, CheckCircle, XCircle, Clock, TrendingUp, Calendar } from "lucide-react"

interface BrandAlert {
  id: string
  orden_electronica: string
  acuerdo_marco: string
  brand_name: string
  status: "pending" | "attended" | "rejected"
  notes: string | null
  created_at: string
  updated_at: string
}

async function getBrandAlertsStats() {
  try {
    console.log("Fetching brand alerts stats from API...")
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/brand-alerts`, {
      cache: "no-store", // Ensure fresh data
    })
    const result = await response.json()

    if (!response.ok) {
      console.error("Error fetching brand alerts from API:", result.error)
      return {
        totalAlerts: 0,
        pendingAlerts: 0,
        attendedAlerts: 0,
        rejectedAlerts: 0,
        recentAlerts: 0,
        brandCounts: {},
      }
    }

    const alerts: BrandAlert[] = result.data || []
    console.log("API response for stats:", alerts.length, "alerts")

    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // Calcular estadísticas
    const totalAlerts = alerts.length
    const pendingAlerts = alerts.filter((alert) => alert.status === "pending").length
    const attendedAlerts = alerts.filter((alert) => alert.status === "attended").length
    const rejectedAlerts = alerts.filter((alert) => alert.status === "rejected").length

    // Alertas recientes (últimos 7 días)
    const recentAlerts = alerts.filter((alert) => new Date(alert.created_at) >= sevenDaysAgo).length

    // Contar por marca
    const brandCounts = alerts.reduce((acc: Record<string, number>, alert) => {
      acc[alert.brand_name] = (acc[alert.brand_name] || 0) + 1
      return acc
    }, {})

    const statsResult = {
      totalAlerts,
      pendingAlerts,
      attendedAlerts,
      rejectedAlerts,
      recentAlerts,
      brandCounts,
    }

    console.log("Brand alerts stats result:", statsResult)
    return statsResult
  } catch (error) {
    console.error("Error in getBrandAlertsStats:", error)
    return {
      totalAlerts: 0,
      pendingAlerts: 0,
      attendedAlerts: 0,
      rejectedAlerts: 0,
      recentAlerts: 0,
      brandCounts: {},
    }
  }
}

function getBrandBadge(brandName: string) {
  const colors = {
    WORLDLIFE: "bg-blue-500 text-white",
    "HOPE LIFE": "bg-green-500 text-white",
    ZEUS: "bg-purple-500 text-white",
    VALHALLA: "bg-orange-500 text-white",
  }

  return <Badge className={colors[brandName as keyof typeof colors] || "bg-gray-500 text-white"}>{brandName}</Badge>
}

export async function BrandAlertsStats() {
  const stats = await getBrandAlertsStats()

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Total de alertas */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Alertas</CardTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalAlerts}</div>
          <p className="text-xs text-muted-foreground">Alertas detectadas</p>
        </CardContent>
      </Card>

      {/* Alertas pendientes */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
          <Clock className="h-4 w-4 text-yellow-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-yellow-600">{stats.pendingAlerts}</div>
          <p className="text-xs text-muted-foreground">Requieren atención</p>
        </CardContent>
      </Card>

      {/* Alertas atendidas */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Atendidas</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{stats.attendedAlerts}</div>
          <p className="text-xs text-muted-foreground">Procesadas correctamente</p>
        </CardContent>
      </Card>

      {/* Alertas rechazadas */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Rechazadas</CardTitle>
          <XCircle className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{stats.rejectedAlerts}</div>
          <p className="text-xs text-muted-foreground">No procesadas</p>
        </CardContent>
      </Card>

      {/* Distribución por marca */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Distribución por Marca
          </CardTitle>
          <CardDescription>Número de alertas por cada marca monitoreada</CardDescription>
        </CardHeader>
        <CardContent>
          {Object.keys(stats.brandCounts).length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay alertas por marca disponibles</p>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(stats.brandCounts).map(([brand, count]) => (
                <div key={brand} className="flex items-center justify-between">
                  {getBrandBadge(brand)}
                  <span className="text-lg font-bold">{count}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actividad reciente */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Actividad Reciente
          </CardTitle>
          <CardDescription>Alertas detectadas recientemente</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{stats.recentAlerts}</div>
          <p className="text-sm text-muted-foreground">
            {stats.recentAlerts === 0
              ? "No hay alertas nuevas"
              : `${stats.recentAlerts} alerta${stats.recentAlerts > 1 ? "s" : ""} detectada${
                  stats.recentAlerts > 1 ? "s" : ""
                }`}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
