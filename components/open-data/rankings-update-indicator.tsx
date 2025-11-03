"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { RefreshCw, Check, AlertCircle, Clock } from "lucide-react"

interface RankingsUpdateIndicatorProps {
  period?: string
}

export function RankingsUpdateIndicator({ period = "6months" }: RankingsUpdateIndicatorProps) {
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [status, setStatus] = useState<"idle" | "updating" | "success" | "error">("idle")

  useEffect(() => {
    // Set initial update time
    setLastUpdate(new Date())

    // Simulate auto-refresh every 5 minutes
    const interval = setInterval(
      () => {
        setLastUpdate(new Date())
      },
      5 * 60 * 1000,
    )

    return () => clearInterval(interval)
  }, [])

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)

    if (seconds < 60) return "hace unos segundos"
    if (seconds < 3600) return `hace ${Math.floor(seconds / 60)} minutos`
    if (seconds < 86400) return `hace ${Math.floor(seconds / 3600)} horas`
    return `hace ${Math.floor(seconds / 86400)} días`
  }

  const handleManualRefresh = async () => {
    setIsRefreshing(true)
    setStatus("updating")

    try {
      // Simulate refresh delay
      await new Promise((resolve) => setTimeout(resolve, 1000))
      setLastUpdate(new Date())
      setStatus("success")

      // Reset to idle after 3 seconds
      setTimeout(() => setStatus("idle"), 3000)
    } catch (error) {
      setStatus("error")
      setTimeout(() => setStatus("idle"), 3000)
    } finally {
      setIsRefreshing(false)
    }
  }

  const getStatusMessage = () => {
    switch (status) {
      case "updating":
        return "Actualizando rankings..."
      case "success":
        return "Rankings actualizados correctamente"
      case "error":
        return "Error al actualizar los rankings"
      default:
        return lastUpdate ? `Última actualización: ${formatTimeAgo(lastUpdate)}` : "Sin actualizar"
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case "updating":
        return <RefreshCw className="h-4 w-4 animate-spin" />
      case "success":
        return <Check className="h-4 w-4 text-green-600" />
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-blue-600" />
    }
  }

  return (
    <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Estado de los Rankings</p>
              <p className="text-xs text-slate-600 dark:text-slate-400">{getStatusMessage()}</p>
            </div>
          </div>

          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-lg transition-colors disabled:opacity-50"
            title="Actualizar rankings manualmente"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
        </div>

        <div className="mt-3 text-xs text-slate-600 dark:text-slate-400 space-y-1 pt-3 border-t border-blue-200 dark:border-blue-800">
          <p>
            Período seleccionado:{" "}
            <span className="font-semibold">
              {period === "3months" ? "3 Meses" : period === "1year" ? "1 Año" : "6 Meses"}
            </span>
          </p>
          <p>Los rankings se actualizan automáticamente cada 5 minutos cuando hay nuevos datos disponibles.</p>
        </div>
      </CardContent>
    </Card>
  )
}
