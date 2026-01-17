import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertTriangle, TrendingUp, Clock, ArrowRight } from "lucide-react"
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

import { createServerClient } from "@/lib/supabase-server"

async function getBrandAlertsPreview() {
  const supabase = createServerClient()

  try {
    // Fetch only necessary fields for stats to minimize payload
    const { data: alertsData, error: statsError } = await supabase
      .from("brand_alerts")
      .select("id, brand_name, status")

    // Fetch recent alerts with full details, limited to 5
    const { data: recentData, error: recentError } = await supabase
      .from("brand_alerts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5)

    if (statsError || recentError) {
      console.error("Error fetching brand alerts:", statsError || recentError)
      return {
        totalAlerts: 0,
        pendingAlerts: 0,
        attendedAlerts: 0,
        brandCounts: {},
        recentAlerts: [],
      }
    }

    const alerts = alertsData || []
    const totalAlerts = alerts.length
    const pendingAlerts = alerts.filter((alert) => alert.status === "pending").length
    const attendedAlerts = alerts.filter((alert) => alert.status === "attended").length

    const brandCounts = alerts.reduce((acc: Record<string, number>, alert) => {
      const brand = alert.brand_name || "Unknown"
      acc[brand] = (acc[brand] || 0) + 1
      return acc
    }, {})

    return {
      totalAlerts,
      pendingAlerts,
      attendedAlerts,
      brandCounts,
      recentAlerts: (recentData as BrandAlert[]) || [],
    }
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
      <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden h-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/20">
          <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
              <TrendingUp className="h-4 w-4" />
            </div>
            Resumen de Alertas
          </CardTitle>
          <AlertTriangle className="h-4 w-4 text-slate-400" />
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-end justify-between mb-6">
            <div>
              <div className="text-4xl font-bold text-slate-900 dark:text-white">{stats.totalAlerts}</div>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mt-1">Total Detectado</p>
            </div>
            <div className="flex gap-2">
              <div className="text-center px-3 py-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-100 dark:border-orange-900/30">
                <div className="text-xl font-bold text-orange-600 dark:text-orange-400 leading-none">{stats.pendingAlerts}</div>
                <div className="text-[10px] text-orange-600/80 dark:text-orange-400/80 font-medium mt-1">Pendientes</div>
              </div>
              <div className="text-center px-3 py-2 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-900/30">
                <div className="text-xl font-bold text-green-600 dark:text-green-400 leading-none">{stats.attendedAlerts}</div>
                <div className="text-[10px] text-green-600/80 dark:text-green-400/80 font-medium mt-1">Atendidas</div>
              </div>
            </div>
          </div>

          {Object.keys(stats.brandCounts).length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Por Marca</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(stats.brandCounts).map(([brand, count]) => (
                  <Badge
                    key={brand}
                    variant="secondary"
                    className={`${BRAND_COLORS[brand] || "bg-slate-500"} text-white hover:opacity-90 transition-opacity border-0 py-1 px-3`}
                  >
                    {brand}: {count}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <Button asChild className="w-full mt-6 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 transition-all shadow-lg shadow-slate-900/10" size="sm">
            <Link href="/open-data/brand-alerts">
              Ver Detalles Completos
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Alertas Recientes */}
      <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden h-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/20">
          <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              <Clock className="h-4 w-4" />
            </div>
            Alertas Recientes
          </CardTitle>
          <Badge variant="outline" className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
            {stats.recentAlerts.length} nuevas
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          {stats.recentAlerts.length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {stats.recentAlerts.map((alert, index) => (
                <div
                  key={alert.id || index}
                  className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className={`${BRAND_COLORS[alert.brand_name] || "bg-slate-500"} text-white text-[10px] h-5 border-0`}
                      >
                        {alert.brand_name}
                      </Badge>
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        {alert.orden_electronica}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${alert.status === "pending" ? "bg-orange-500" :
                          alert.status === "attended" ? "bg-green-500" : "bg-red-500"
                        }`} />
                      <span className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                        {alert.status === "pending" ? "Pendiente" :
                          alert.status === "attended" ? "Atendida" : "Rechazada"}
                      </span>
                    </div>
                  </div>
                  <div className="text-[10px] font-medium text-slate-400 whitespace-nowrap bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                    {new Date(alert.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                <AlertTriangle className="h-6 w-6 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-200">No hay alertas recientes</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-[200px]">
                El sistema te notificará cuando se detecten movimientos de las marcas monitoreadas.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
