"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, ShoppingCart, Package, Building2, Users, TrendingUp, Calendar, Award } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts"

interface MarketStatsDashboardProps {
  period: string
}

interface MarketStats {
  totalAmount: number
  totalOrders: number
  totalProducts: number
  totalSuppliers: number
  totalEntities: number
  totalAgreements: number
  avgOrderValue: number
  growthRate: number
  monthlyTrend: Array<{
    month: string
    amount: number
    orders: number
  }>
  topCategories: Array<{
    category: string
    amount: number
    percentage: number
  }>
}

export function MarketStatsDashboard({ period }: MarketStatsDashboardProps) {
  const [stats, setStats] = useState<MarketStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadStats = async () => {
      setLoading(true)
      try {
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

  const formatPercentage = (num: number) => {
    return `${num > 0 ? "+" : ""}${num.toFixed(1)}%`
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mb-2"></div>
                  <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-4"></div>
                  <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!stats) {
    return null
  }

  const mainStats = [
    {
      title: "Monto Total Contratado",
      value: formatCurrency(stats.totalAmount),
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-950",
      description: "Valor total de todas las compras públicas",
    },
    {
      title: "Órdenes de Compra",
      value: formatNumber(stats.totalOrders),
      icon: ShoppingCart,
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950",
      description: "Número total de órdenes procesadas",
    },
    {
      title: "Productos Únicos",
      value: formatNumber(stats.totalProducts),
      icon: Package,
      color: "text-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-950",
      description: "Diferentes productos adquiridos",
    },
    {
      title: "Proveedores Activos",
      value: formatNumber(stats.totalSuppliers),
      icon: Building2,
      color: "text-orange-600",
      bgColor: "bg-orange-50 dark:bg-orange-950",
      description: "Empresas que han vendido al Estado",
    },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {mainStats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                    <Icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-sm">{stat.title}</p>
                  <p className="text-xs text-muted-foreground">{stat.description}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tendencia mensual */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Tendencia de Compras Mensuales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats.monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => formatCurrency(value)} />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), "Monto"]}
                  labelFormatter={(label) => `Mes: ${label}`}
                />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="#2563eb"
                  strokeWidth={3}
                  dot={{ fill: "#2563eb", strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top categorías */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-purple-600" />
              Categorías con Mayor Gasto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.topCategories} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} />
                <YAxis dataKey="category" type="category" width={120} />
                <Tooltip formatter={(value: number) => [formatCurrency(value), "Monto"]} />
                <Bar dataKey="amount" fill="#7c3aed" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <Users className="h-8 w-8 text-indigo-600 mx-auto mb-2" />
            <p className="text-2xl font-bold">{formatNumber(stats.totalEntities)}</p>
            <p className="text-sm font-medium">Entidades Compradoras</p>
            <p className="text-xs text-muted-foreground">Instituciones públicas</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <Award className="h-8 w-8 text-red-600 mx-auto mb-2" />
            <p className="text-2xl font-bold">{formatNumber(stats.totalAgreements)}</p>
            <p className="text-sm font-medium">Acuerdos Marco</p>
            <p className="text-xs text-muted-foreground">Contratos vigentes</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <Calendar className="h-8 w-8 text-teal-600 mx-auto mb-2" />
            <p className="text-2xl font-bold">{formatCurrency(stats.avgOrderValue)}</p>
            <p className="text-sm font-medium">Valor Promedio</p>
            <p className="text-xs text-muted-foreground">Por orden de compra</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <TrendingUp
              className={`h-8 w-8 mx-auto mb-2 ${stats.growthRate >= 0 ? "text-green-600" : "text-red-600"}`}
            />
            <p className="text-2xl font-bold">{formatPercentage(stats.growthRate)}</p>
            <p className="text-sm font-medium">Crecimiento</p>
            <p className="text-xs text-muted-foreground">Respecto al período anterior</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
