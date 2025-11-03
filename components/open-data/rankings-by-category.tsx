"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { AlertCircle } from "lucide-react"

interface CategoryRanking {
  categoria: string
  totalUnits: number
  totalAmount: number
  totalOrders: number
  totalCatalogs: number
  totalBrands: number
  totalSuppliers: number
  avgOrderValue: number
}

interface RankingsByCategoryProps {
  period: string
}

export function RankingsByCategory({ period }: RankingsByCategoryProps) {
  const [data, setData] = useState<{
    rankings: CategoryRanking[]
    stats: any
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/open-data/rankings-by-category?period=${period}`)
        const result = await response.json()
        if (result.success) {
          setData(result.data)
          setError(null)
        } else {
          setError(result.error || "Error fetching data")
        }
      } catch (error) {
        console.error("[v0] Error fetching rankings by category:", error)
        setError("Error al cargar los rankings")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [period])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">Cargando rankings por categoría...</div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
        <AlertCircle className="h-5 w-5" />
        <div>
          <h4 className="font-semibold">Error al cargar datos</h4>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    )
  }

  if (!data || data.rankings.length === 0) {
    return <div className="text-center text-slate-500 py-8">No hay datos disponibles para el período seleccionado</div>
  }

  const chartData = data.rankings.slice(0, 10).map((category) => ({
    name: category.categoria.length > 20 ? category.categoria.substring(0, 20) + "..." : category.categoria,
    fullName: category.categoria,
    amount: Math.round((category.totalAmount / 1000000) * 10) / 10,
  }))

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-4">
            <div className="text-3xl font-bold text-blue-600">{data.stats.totalCategories}</div>
            <div className="text-xs text-slate-600 mt-1">Categorías</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-4">
            <div className="text-3xl font-bold text-green-600">{(data.stats.totalAmount / 1000000).toFixed(1)}M</div>
            <div className="text-xs text-slate-600 mt-1">Monto Total</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="p-4">
            <div className="text-3xl font-bold text-purple-600">{data.stats.totalRecords.toLocaleString()}</div>
            <div className="text-xs text-slate-600 mt-1">Registros Totales</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100">
          <CardContent className="p-4">
            <div className="text-3xl font-bold text-orange-600">{data.rankings.length}</div>
            <div className="text-xs text-slate-600 mt-1">Categorías Únicas</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top 10 Categorías por Monto</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={200} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => [`S/ ${(value as number).toFixed(1)}M`, "Monto"]} />
              <Bar dataKey="amount" fill="#10B981" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Detalle de Categorías (Total: {data.rankings.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.rankings.map((category, index) => (
              <div key={category.categoria} className="border rounded-lg p-4 hover:bg-slate-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-800">
                      #{index + 1} - {category.categoria}
                    </h3>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        {category.totalCatalogs} catálogos
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {category.totalBrands} marcas
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {category.totalSuppliers} proveedores
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {category.totalOrders.toLocaleString()} órdenes
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600">
                      S/ {(category.totalAmount / 1000000).toFixed(2)}M
                    </div>
                    <div className="text-xs text-slate-600 mt-1">{category.totalUnits.toLocaleString()} unidades</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
