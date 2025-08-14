"use client"

import { useState, useEffect } from "react"
import { Progress } from "@/components/ui/progress"
import { Star } from "lucide-react"

interface SupplierPerformanceProps {
  period: string
}

interface SupplierData {
  name: string
  ruc: string
  totalAmount: number
  orders: number
  products: number
  entities: number
  avgOrderValue: number
  marketShare: number
  reliability: number
}

export function SupplierPerformance({ period }: SupplierPerformanceProps) {
  const [data, setData] = useState<SupplierData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/open-data/supplier-performance?period=${period}`)
        const result = await response.json()

        if (result.success) {
          setData(result.data)
        }
      } catch (error) {
        console.error("Error loading supplier performance:", error)
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
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("es-PE").format(num)
  }

  const getReliabilityColor = (reliability: number) => {
    if (reliability >= 90) return "text-green-600"
    if (reliability >= 75) return "text-yellow-600"
    return "text-red-600"
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse p-4 border rounded-lg">
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-2/3 mb-2"></div>
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/3"></div>
              </div>
              <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-20"></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[...Array(3)].map((_, j) => (
                <div key={j} className="h-3 bg-slate-200 dark:bg-slate-700 rounded"></div>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {data.slice(0, 6).map((supplier, index) => (
        <div key={index} className="p-4 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
          <div className="flex justify-between items-start mb-3">
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm truncate">{supplier.name}</h4>
              <p className="text-xs text-muted-foreground">RUC: {supplier.ruc}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold">{formatCurrency(supplier.totalAmount)}</p>
              <div className="flex items-center gap-1">
                <Star className={`h-3 w-3 ${getReliabilityColor(supplier.reliability)}`} />
                <span className={`text-xs font-medium ${getReliabilityColor(supplier.reliability)}`}>
                  {supplier.reliability.toFixed(0)}%
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <div>
              <p className="text-xs text-muted-foreground">Órdenes</p>
              <p className="text-sm font-medium">{formatNumber(supplier.orders)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Productos</p>
              <p className="text-sm font-medium">{formatNumber(supplier.products)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Entidades</p>
              <p className="text-sm font-medium">{formatNumber(supplier.entities)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Valor Promedio</p>
              <p className="text-sm font-medium">{formatCurrency(supplier.avgOrderValue)}</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span>Participación de Mercado</span>
              <span>{supplier.marketShare.toFixed(2)}%</span>
            </div>
            <Progress value={supplier.marketShare} className="h-1" />
          </div>
        </div>
      ))}
    </div>
  )
}
