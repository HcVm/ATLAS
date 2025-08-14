"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { Package, TrendingUp, Award, ChevronDown, ChevronUp } from "lucide-react"

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
  const [expandedCatalogs, setExpandedCatalogs] = useState<Set<string>>(new Set())

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/open-data/rankings-by-catalog?period=${period}`)
        const result = await response.json()
        if (result.success) {
          setData(result.data)
        }
      } catch (error) {
        console.error("Error fetching rankings by catalog:", error)
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
    return <div className="flex items-center justify-center h-64">Cargando rankings por catálogo...</div>
  }

  if (!data) {
    return <div className="text-center text-slate-500">No se pudieron cargar los datos</div>
  }

  // Preparar datos para gráficos
  const topCatalogsChart = data.rankings.slice(0, 10).map((catalog) => ({
    name: catalog.catalog.length > 20 ? catalog.catalog.substring(0, 20) + "..." : catalog.catalog,
    fullName: catalog.catalog,
    units: catalog.totalUnits,
    amount: catalog.totalAmount,
    acuerdo: catalog.codigo_acuerdo_marco,
  }))

  const agreementDistribution = data.rankings.reduce(
    (acc, catalog) => {
      const agreement = catalog.codigo_acuerdo_marco
      if (!acc[agreement]) {
        acc[agreement] = { name: agreement, value: 0, catalogs: 0 }
      }
      acc[agreement].value += catalog.totalUnits
      acc[agreement].catalogs += 1
      return acc
    },
    {} as Record<string, any>,
  )

  const agreementChartData = Object.values(agreementDistribution).slice(0, 8)
  const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4", "#84CC16", "#F97316"]

  return (
    <div className="space-y-6">
      {/* Estadísticas Generales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{data.stats.totalCatalogs}</div>
                <div className="text-sm text-slate-600">Catálogos Activos</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-green-500" />
              <div>
                <div className="text-2xl font-bold">{data.stats.totalProducts.toLocaleString()}</div>
                <div className="text-sm text-slate-600">Productos Únicos</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-500" />
              <div>
                <div className="text-2xl font-bold">{data.stats.totalUnits.toLocaleString()}</div>
                <div className="text-sm text-slate-600">Unidades Vendidas</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-orange-500" />
              <div>
                <div className="text-2xl font-bold">S/ {(data.stats.totalAmount / 1000000).toFixed(1)}M</div>
                <div className="text-sm text-slate-600">Monto Total</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Catálogos por Unidades */}
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Catálogos por Unidades Vendidas</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topCatalogsChart} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} />
                <Tooltip
                  formatter={(value, name) => [
                    name === "units" ? `${value.toLocaleString()} unidades` : `S/ ${value.toLocaleString()}`,
                    name === "units" ? "Unidades" : "Monto",
                  ]}
                  labelFormatter={(label) => topCatalogsChart.find((item) => item.name === label)?.fullName || label}
                />
                <Bar dataKey="units" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Distribución por Acuerdo Marco */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución por Acuerdo Marco</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={agreementChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {agreementChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value.toLocaleString()} unidades`, "Total"]} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Rankings Detallados por Catálogo */}
      <Card>
        <CardHeader>
          <CardTitle>Rankings Detallados por Catálogo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.rankings.slice(0, 10).map((catalog, index) => (
              <div key={catalog.catalog} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-lg font-bold">
                      #{index + 1}
                    </Badge>
                    <div>
                      <h3 className="font-semibold text-lg">{catalog.catalog}</h3>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Badge variant="secondary">{catalog.codigo_acuerdo_marco}</Badge>
                        <span>•</span>
                        <span>{catalog.totalUnits.toLocaleString()} unidades</span>
                        <span>•</span>
                        <span>S/ {catalog.totalAmount.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => toggleCatalogExpansion(catalog.catalog)}>
                    {expandedCatalogs.has(catalog.catalog) ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {expandedCatalogs.has(catalog.catalog) && (
                  <div className="mt-4 space-y-2">
                    <h4 className="font-medium text-sm text-slate-700 mb-2">Top Productos por Número de Parte:</h4>
                    {catalog.products.slice(0, 5).map((product, productIndex) => (
                      <div
                        key={product.nro_parte}
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              #{productIndex + 1}
                            </Badge>
                            <span className="font-medium text-sm">{product.nro_parte}</span>
                            {product.marca && (
                              <Badge variant="secondary" className="text-xs">
                                {product.marca}
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-slate-600 mb-1">
                            {product.descripcion.length > 60
                              ? product.descripcion.substring(0, 60) + "..."
                              : product.descripcion}
                          </div>
                          <div className="text-xs text-slate-500">{product.categoria}</div>
                        </div>
                        <div className="text-right ml-4">
                          <div className="font-bold text-sm text-blue-600">
                            {product.totalUnits.toLocaleString()} unidades
                          </div>
                          <div className="text-xs text-slate-600">S/ {product.avgPrice.toFixed(2)} promedio</div>
                          <div className="text-xs text-slate-500">{product.orders} órdenes</div>
                        </div>
                      </div>
                    ))}
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
