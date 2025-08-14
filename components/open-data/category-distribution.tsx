"use client"

import { useState, useEffect } from "react"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"
import { Package, BarChart3, PieChartIcon } from "lucide-react"

interface CategoryDistributionProps {
  period: string
}

interface CategoryData {
  category: string
  productCount: number
  totalAmount: number
  percentage: number
  orders: number
}

const COLORS = [
  "#2563eb",
  "#7c3aed",
  "#dc2626",
  "#ea580c",
  "#16a34a",
  "#0891b2",
  "#be185d",
  "#4338ca",
  "#059669",
  "#7c2d12",
]

export function CategoryDistribution({ period }: CategoryDistributionProps) {
  const [data, setData] = useState<CategoryData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/open-data/category-distribution?period=${period}`)
        const result = await response.json()

        if (result.success) {
          setData(result.data)
        }
      } catch (error) {
        console.error("Error loading category distribution:", error)
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

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-4"></div>
              <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded"></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-4"></div>
              <div className="space-y-3">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="h-12 bg-slate-200 dark:bg-slate-700 rounded"></div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Preparar datos para PieChart
  const pieChartData = data.slice(0, 8).map((category, index) => ({
    name: category.category.length > 20 ? category.category.substring(0, 20) + "..." : category.category,
    fullName: category.category,
    value: category.totalAmount,
    percentage: category.percentage,
    fill: COLORS[index % COLORS.length],
  }))

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de barras horizontales */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Gasto por Categoría
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={data.slice(0, 8)} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} />
                <YAxis
                  dataKey="category"
                  type="category"
                  width={120}
                  tickFormatter={(value) => (value.length > 15 ? value.substring(0, 15) + "..." : value)}
                />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), "Monto Total"]}
                  labelFormatter={(label) => `Categoría: ${label}`}
                />
                <Bar dataKey="totalAmount" fill="#2563eb" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* PieChart para visualización proporcional */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-purple-600" />
              Distribución por Categorías
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), "Monto Total"]}
                  labelFormatter={(label) => `Categoría: ${label}`}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Lista detallada con métricas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-green-600" />
            Ranking Detallado de Categorías
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <div className="space-y-3">
              {data.map((category, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 rounded-lg border hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex items-center justify-center w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full">
                      <span className="text-sm font-bold text-blue-600 dark:text-blue-400">#{index + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm mb-2">{category.category}</h4>
                      <div className="flex items-center gap-3 mb-2">
                        <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-950">
                          {formatNumber(category.productCount)} productos
                        </Badge>
                        <Badge variant="outline" className="text-xs bg-green-50 dark:bg-green-950">
                          {formatNumber(category.orders)} órdenes
                        </Badge>
                        <Badge variant="outline" className="text-xs bg-purple-50 dark:bg-purple-950">
                          {category.percentage.toFixed(1)}% del total
                        </Badge>
                      </div>
                      <Progress value={category.percentage} className="h-2 w-full" />
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-lg font-bold text-green-600">{formatCurrency(category.totalAmount)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(category.totalAmount / category.orders)} promedio/orden
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(category.totalAmount / category.productCount)} promedio/producto
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
