"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { ChevronDown, ChevronUp, AlertCircle } from "lucide-react"

interface Product {
  nro_parte: string
  descripcion: string
  marca: string
  categoria: string
  totalUnits: number
  totalAmount: number
  orders: number
  avgPrice: number
  minPrice: number
  maxPrice: number
}

interface CatalogRanking {
  catalog: string
  codigo_acuerdo_marco: string
  acuerdo_marco: string
  products: Product[]
  totalUnits: number
  totalAmount: number
  totalOrders: number
}

interface RankingsByCatalogProps {
  period: string
}

export function RankingsByCatalog({ period }: RankingsByCatalogProps) {
  const [data, setData] = useState<{
    rankings: CatalogRanking[]
    stats: any
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedCatalogs, setExpandedCatalogs] = useState<Set<string>>(new Set())
  const [orderStates, setOrderStates] = useState<Record<string, number>>({})

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/open-data/rankings-by-catalog?period=${period}`)
        const result = await response.json()
        if (result.success) {
          setData(result.data)
          setOrderStates(result.data.stats.orderStates || {})
          setError(null)
        } else {
          setError(result.error || "Error fetching data")
        }
      } catch (error) {
        console.error("[v0] Error fetching rankings by catalog:", error)
        setError("Error al cargar los rankings")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [period])

  const toggleCatalogExpansion = (catalog: string) => {
    const newExpanded = new Set(expandedCatalogs)
    if (newExpanded.has(catalog)) {
      newExpanded.delete(catalog)
    } else {
      newExpanded.add(catalog)
    }
    setExpandedCatalogs(newExpanded)
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-slate-500">Cargando rankings por catálogo...</div>
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

  const topCatalogsChart = data.rankings.slice(0, 8).map((catalog) => ({
    name: catalog.catalog.length > 25 ? catalog.catalog.substring(0, 25) + "..." : catalog.catalog,
    fullName: catalog.catalog,
    units: catalog.totalUnits,
    amount: Math.round((catalog.totalAmount / 1000000) * 10) / 10, // Millions
    acuerdo: catalog.codigo_acuerdo_marco,
  }))

  const agreementDistribution = data.rankings.reduce(
    (acc, catalog) => {
      const agreement = catalog.codigo_acuerdo_marco
      if (!acc[agreement]) {
        acc[agreement] = { name: agreement, value: 0, catalogs: 0, amount: 0 }
      }
      acc[agreement].value += catalog.totalUnits
      acc[agreement].catalogs += 1
      acc[agreement].amount += catalog.totalAmount
      return acc
    },
    {} as Record<string, any>,
  )

  const agreementChartData = Object.values(agreementDistribution).slice(0, 6)
  const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4", "#84CC16", "#F97316"]

  const stateChartData = Object.entries(orderStates)
    .map(([state, count]) => ({
      name: state || "SIN ESTADO",
      value: count as number,
      percentage: data.stats.totalRecords > 0 ? (((count as number) / data.stats.totalRecords) * 100).toFixed(1) : "0",
    }))
    .sort((a, b) => (b.value as number) - (a.value as number))

  return (
    <div className="space-y-6">
      {/* Main Stats Section */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
          <CardContent className="p-4">
            <div className="text-3xl font-bold text-blue-600">{data.stats.totalCatalogs}</div>
            <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Catálogos Activos</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
          <CardContent className="p-4">
            <div className="text-3xl font-bold text-green-600">{data.stats.totalProducts.toLocaleString()}</div>
            <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Productos Únicos</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
          <CardContent className="p-4">
            <div className="text-3xl font-bold text-purple-600">{(data.stats.totalUnits / 1000).toFixed(0)}K</div>
            <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Unidades Vendidas</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900">
          <CardContent className="p-4">
            <div className="text-3xl font-bold text-orange-600">
              S/ {(data.stats.totalAmount / 1000000).toFixed(1)}M
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Monto Total</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Analysis - Three Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Top Catalogs */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Top 8 Catálogos por Unidades</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={topCatalogsChart} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#fff", border: "1px solid #ccc" }}
                  formatter={(value, name) => [
                    name === "units"
                      ? `${(value as number).toLocaleString()} unidades`
                      : `S/ ${(value as number).toFixed(1)}M`,
                    name === "units" ? "Unidades" : "Monto",
                  ]}
                  labelFormatter={(label) => topCatalogsChart.find((item) => item.name === label)?.fullName || label}
                />
                <Bar dataKey="units" fill="#3B82F6" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Right Column - Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Distribución por Acuerdo</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={agreementChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {agreementChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${(value as number).toLocaleString()} unidades`, "Total"]} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Estados de Orden Analysis */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Análisis de Estados de Orden - {data.stats.totalRecords.toLocaleString()} Registros Totales
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {stateChartData.map((state) => (
              <div
                key={state.name}
                className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700"
              >
                <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                  {(state.value as number).toLocaleString()}
                </div>
                <div className="text-sm font-medium text-slate-600 dark:text-slate-400 mt-1">{state.name}</div>
                <div className="text-xs text-slate-500 mt-1">{state.percentage}% del total</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Rankings Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Catálogos Detallados (Total: {data.rankings.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.rankings.map((catalog, index) => (
              <div
                key={`${catalog.codigo_acuerdo_marco}-${catalog.catalog}`}
                className="border rounded-lg p-4 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3 flex-1">
                    <Badge className="text-base font-bold">#{index + 1}</Badge>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-800 dark:text-slate-200">{catalog.catalog}</h3>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {catalog.codigo_acuerdo_marco}
                        </Badge>
                        <span className="text-xs text-slate-600 dark:text-slate-400">•</span>
                        <span className="text-xs text-slate-600 dark:text-slate-400">
                          {catalog.totalUnits.toLocaleString()} unidades
                        </span>
                        <span className="text-xs text-slate-600 dark:text-slate-400">•</span>
                        <span className="text-xs text-slate-600 dark:text-slate-400">
                          S/ {(catalog.totalAmount / 1000000).toFixed(2)}M
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleCatalogExpansion(`${catalog.codigo_acuerdo_marco}-${catalog.catalog}`)}
                  >
                    {expandedCatalogs.has(`${catalog.codigo_acuerdo_marco}-${catalog.catalog}`) ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {expandedCatalogs.has(`${catalog.codigo_acuerdo_marco}-${catalog.catalog}`) && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Top 5 Productos:</h4>
                    <div className="space-y-2">
                      {catalog.products.slice(0, 5).map((product, productIndex) => (
                        <div
                          key={`${product.nro_parte}-${productIndex}`}
                          className="text-sm p-3 bg-slate-50 dark:bg-slate-800 rounded"
                        >
                          <div className="flex justify-between mb-1">
                            <div>
                              <span className="font-medium text-slate-800 dark:text-slate-200">
                                {productIndex + 1}. {product.nro_parte}
                              </span>
                              {product.marca && (
                                <Badge variant="secondary" className="ml-2 text-xs">
                                  {product.marca}
                                </Badge>
                              )}
                            </div>
                            <span className="font-bold text-blue-600">{product.totalUnits.toLocaleString()} un.</span>
                          </div>
                          <div className="text-xs text-slate-600 dark:text-slate-400">
                            {product.descripcion.substring(0, 80)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
