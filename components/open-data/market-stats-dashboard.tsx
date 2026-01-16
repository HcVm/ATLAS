"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, ShoppingCart, Package, Building2, Users, TrendingUp, Calendar, Award } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts"

export function MarketStatsDashboard() {
  const [stats, setStats] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadStats = async () => {
      setLoading(true)
      try {
        // Use a client-side fetch wrapper or ensure the API endpoint exists
        // But better yet, since the parent is fetching, let's accept props or refetch
        const searchParams = new URLSearchParams(window.location.search)
        const period = searchParams.get("period") || "6months"
        
        const response = await fetch(`/api/open-data/market-stats?period=${period}`)
        const result = await response.json()

        if (result.success) {
          setStats(result.data)
        }
      } catch (error) {
        console.error("Error loading market stats:", error)
      } finally {
        setLoading(false)
      }
    }

    loadStats()
  }, []) // Depend on nothing, just load once on mount

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

  const formatPercentage = (num: number) => {
    return `${num > 0 ? "+" : ""}${num.toFixed(1)}%`
  }

  if (loading) {
    return <div className="h-[400px] flex items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-indigo-500 rounded-full border-t-transparent"></div></div>
  }

  if (!stats) {
    return <div className="text-center p-4">No data available</div>
  }

  return (
    <div className="space-y-4">
      <Card className="bg-indigo-600 text-white border-none shadow-xl shadow-indigo-500/20">
        <CardContent className="p-6">
           <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-white/20 rounded-lg"><DollarSign className="h-5 w-5 text-white" /></div>
              <span className="text-indigo-100 font-medium text-sm">Monto Total</span>
           </div>
           <div className="text-3xl font-bold mb-1">{formatCurrency(stats.totalAmount)}</div>
           <div className="flex items-center gap-1 text-indigo-100 text-sm">
              <TrendingUp className="h-3 w-3" />
              <span className={stats.growthRate >= 0 ? "text-emerald-300 font-bold" : "text-red-300 font-bold"}>
                 {formatPercentage(stats.growthRate)}
              </span>
              <span className="opacity-80"> vs periodo anterior</span>
           </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-white/50 dark:bg-slate-900/50 backdrop-blur border-slate-200/50 dark:border-slate-800/50">
           <CardContent className="p-4">
              <div className="text-slate-500 dark:text-slate-400 text-xs mb-1 uppercase font-bold tracking-wider">Órdenes</div>
              <div className="text-xl font-bold text-slate-800 dark:text-slate-200">{formatNumber(stats.totalOrders)}</div>
           </CardContent>
        </Card>
        <Card className="bg-white/50 dark:bg-slate-900/50 backdrop-blur border-slate-200/50 dark:border-slate-800/50">
           <CardContent className="p-4">
              <div className="text-slate-500 dark:text-slate-400 text-xs mb-1 uppercase font-bold tracking-wider">Proveedores</div>
              <div className="text-xl font-bold text-slate-800 dark:text-slate-200">{formatNumber(stats.totalSuppliers)}</div>
           </CardContent>
        </Card>
        <Card className="bg-white/50 dark:bg-slate-900/50 backdrop-blur border-slate-200/50 dark:border-slate-800/50">
           <CardContent className="p-4">
              <div className="text-slate-500 dark:text-slate-400 text-xs mb-1 uppercase font-bold tracking-wider">Entidades</div>
              <div className="text-xl font-bold text-slate-800 dark:text-slate-200">{formatNumber(stats.totalEntities)}</div>
           </CardContent>
        </Card>
        <Card className="bg-white/50 dark:bg-slate-900/50 backdrop-blur border-slate-200/50 dark:border-slate-800/50">
           <CardContent className="p-4">
              <div className="text-slate-500 dark:text-slate-400 text-xs mb-1 uppercase font-bold tracking-wider">Ticket Prom</div>
              <div className="text-xl font-bold text-slate-800 dark:text-slate-200">{formatCurrency(stats.avgOrderValue)}</div>
           </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-md bg-white dark:bg-slate-950">
        <CardHeader className="pb-2">
           <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300">Top 5 Categorías</CardTitle>
        </CardHeader>
        <CardContent>
           <div className="space-y-3">
              {stats.topCategories && stats.topCategories.slice(0, 5).map((cat: any, i: number) => (
                 <div key={i} className="flex items-center justify-between text-sm">
                    <span className="truncate max-w-[150px] text-slate-600 dark:text-slate-400" title={cat.category}>{cat.category}</span>
                    <span className="font-medium text-slate-900 dark:text-slate-100">{formatCurrency(cat.amount)}</span>
                 </div>
              ))}
           </div>
        </CardContent>
      </Card>
    </div>
  )
}
