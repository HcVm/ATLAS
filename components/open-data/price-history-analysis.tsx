"use client"

import { useState, useEffect } from "react"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

interface PriceHistoryAnalysisProps {
  period: string
}

interface PriceAnalysis {
  product: string
  currentPrice: number
  previousPrice: number
  change: number
  changePercent: number
  trend: "up" | "down" | "stable"
  orders: number
}

export function PriceHistoryAnalysis({ period }: PriceHistoryAnalysisProps) {
  const [data, setData] = useState<PriceAnalysis[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/open-data/price-analysis?period=${period}`)
        const result = await response.json()

        if (result.success) {
          setData(result.data)
        }
      } catch (error) {
        console.error("Error loading price analysis:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [period])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "PEN",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-red-500" />
      case "down":
        return <TrendingDown className="h-4 w-4 text-green-500" />
      default:
        return <Minus className="h-4 w-4 text-slate-500" />
    }
  }

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case "up":
        return "text-red-600 bg-red-50 dark:bg-red-950"
      case "down":
        return "text-green-600 bg-green-50 dark:bg-green-950"
      default:
        return "text-slate-600 bg-slate-50 dark:bg-slate-950"
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="animate-pulse flex items-center justify-between p-3 border rounded-lg">
            <div className="flex-1">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-2/3 mb-2"></div>
              <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/3"></div>
            </div>
            <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-16"></div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {data.slice(0, 8).map((item, index) => (
        <div
          key={index}
          className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{item.product}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground">{item.orders} órdenes</span>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground">Anterior: {formatCurrency(item.previousPrice)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="text-sm font-semibold">{formatCurrency(item.currentPrice)}</p>
              <div className="flex items-center gap-1">
                {getTrendIcon(item.trend)}
                <span className={`text-xs font-medium ${getTrendColor(item.trend).split(" ")[0]}`}>
                  {item.changePercent > 0 ? "+" : ""}
                  {item.changePercent.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
