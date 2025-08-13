import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertTriangle, TrendingUp, Clock } from "lucide-react"
import Link from "next/link"

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

async function getBrandAlertsPreview() {
  try {
    console.log("Fetching brand alerts preview from API...")
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/brand-alerts`, {
      next: { revalidate: 6400 }, // Ensure fresh data
    })
    const result = await response.json()

    if (!response.ok) {
      console.error("Error fetching brand alerts from API:", result.error)
      return {
        totalAlerts: 0,
        pendingAlerts: 0,
        attendedAlerts: 0,
        brandCounts: {},
        recentAlerts: [],
      }
    }

    const alerts: BrandAlert[] = result.data || []
    console.log("API response for preview:", alerts.length, "alerts")

    const totalAlerts = alerts.length
    const pendingAlerts = alerts.filter((alert) => alert.status === "pending").length
    const attendedAlerts = alerts.filter((alert) => alert.status === "attended").length

    // Contar por marca
    const brandCounts = alerts.reduce((acc: Record<string, number>, alert) => {
      const brand = alert.brand_name || "Unknown"
      acc[brand] = (acc[brand] || 0) + 1
      return acc
    }, {})

    // Alertas recientes (últimas 5)
    const recentAlerts = alerts.slice(0, 5)

    const previewResult = {
      totalAlerts,
      pendingAlerts,
      attendedAlerts,
      brandCounts,
      recentAlerts,
    }

    console.log("Brand alerts preview result:", previewResult)
    return previewResult
  } catch (error) {
    console.error("Error in getBrandAlertsPreview:", error)
    return {
      totalAlerts: 0,
      pendingAlerts: 0,
      attendedAlerts: 0,
      brandCounts: {},
      recentAlerts: [],
    }
  }
}

const BRAND_COLORS: Record<string, string> = {
  WORLDLIFE: "bg-blue-500",
  "HOPE LIFE": "bg-green-500",
  ZEUS: "bg-purple-500",
  VALHALLA: "bg-orange-500",
}

export async function BrandAlertsPreview() {
  const stats = await getBrandAlertsPreview()

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Resumen de Alertas */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-medium">
            <TrendingUp className="h-4 w-4 inline mr-2" />
            Resumen de Alertas
          </CardTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalAlerts}</div>
          <p className="text-xs text-muted-foreground mb-4">Estado actual de las alertas de marca</p>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-semibold text-blue-600">{stats.totalAlerts}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-orange-600">{stats.pendingAlerts}</div>
              <div className="text-xs text-muted-foreground">Pendientes</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-green-600">{stats.attendedAlerts}</div>
              <div className="text-xs text-muted-foreground">Atendidas</div>
            </div>
          </div>

          {Object.keys(stats.brandCounts).length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium mb-2">Por Marca:</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(stats.brandCounts).map(([brand, count]) => (
                  <Badge
                    key={brand}
                    variant="secondary"
                    className={`${BRAND_COLORS[brand] || "bg-gray-500"} text-white`}
                  >
                    {brand}: {count}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <Button asChild className="w-full mt-4" size="sm">
            <Link href="/open-data/brand-alerts">Ver todas las alertas</Link>
          </Button>
        </CardContent>
      </Card>

      {/* Alertas Recientes */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-medium">
            <Clock className="h-4 w-4 inline mr-2" />
            Alertas Recientes
          </CardTitle>
          <Badge variant="outline">{stats.recentAlerts.length}</Badge>
        </CardHeader>
        <CardContent>
          {stats.recentAlerts.length > 0 ? (
            <div className="space-y-3">
              {stats.recentAlerts.map((alert, index) => (
                <div
                  key={alert.id || index}
                  className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className={`${BRAND_COLORS[alert.brand_name] || "bg-gray-500"} text-white text-xs`}
                      >
                        {alert.brand_name}
                      </Badge>
                      <Badge variant={alert.status === "pending" ? "destructive" : "default"} className="text-xs">
                        {alert.status === "pending"
                          ? "Pendiente"
                          : alert.status === "attended"
                            ? "Atendida"
                            : "Rechazada"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{alert.orden_electronica}</p>
                  </div>
                  <div className="text-xs text-muted-foreground">{new Date(alert.created_at).toLocaleDateString()}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No hay alertas recientes</p>
              <p className="text-xs text-muted-foreground mt-1">
                Las alertas aparecerán cuando se detecten las marcas monitoreadas
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
