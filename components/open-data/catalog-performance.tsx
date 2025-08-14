"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts"
import { BarChart3, TrendingUp, Award, Target } from "lucide-react"

interface CatalogPerformance {
  catalogo: string
  codigo_acuerdo_marco: string
  acuerdo_marco: string
  categories: string[]
  suppliers: string[]
  totalUnits: number
  totalAmount: number
  totalOrders: number
  avgOrderValue: number
  avgUnitPrice: number
  efficiency: number
  monthlyTrend: Array<{
    month: string
    units: number
    amount: number
    orders: number
  }>
}

interface AgreementPerformance {
  codigo_acuerdo_marco: string
  acuerdo_marco: string
  catalogs: CatalogPerformance[]
  totalCatalogs: number
  avgEfficiency: number
  totalUnits: number
  totalAmount: number
}

interface CatalogPerformanceProps {
  period: string
}

export function CatalogPerformance({ period }: CatalogPerformanceProps) {
  const [data, setData] = useState<{
    catalogPerformance: CatalogPerformance[]
    agreementPerformance: AgreementPerformance[]
    stats: any
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/open-data/catalog-performance?period=${period}`)
        const result = await response.json()
        if (result.success) {
          setData(result.data)
        }
      } catch (error) {
        console.error("Error fetching catalog performance:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [period])

  if (loading) {
    return <div className="flex items-center justify-center h-64">Cargando performance de catálogos...</div>
  }

  if (!data) {
    return <div className="text-center text-slate-500">No se pudieron cargar los datos</div>
  }

  // Preparar datos para gráficos
  const topCatalogsChart = data.catalogPerformance.slice(0, 10).map((catalog) => ({
    name: catalog.catalogo.length > 20 ? catalog.catalogo.substring(0, 20) + "..." : catalog.catalogo,
    fullName: catalog.catalogo,
    efficiency: Math.round(catalog.efficiency),
    units: catalog.totalUnits,
    acuerdo: catalog.codigo_acuerdo_marco,
  }))

  const agreementChart = data.agreementPerformance.slice(0, 8).map((agreement) => ({
    name: agreement.codigo_acuerdo_marco,
    efficiency: Math.round(agreement.avgEfficiency),
    catalogs: agreement.totalCatalogs,
    units: agreement.totalUnits,
  }))

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 80) return "text-green-600 bg-green-100"
    if (efficiency >= 60) return "text-yellow-600 bg-yellow-100"
    return "text-red-600 bg-red-100"
  }

  const getEfficiencyLabel = (efficiency: number) => {
    if (efficiency >= 80) return "Excelente"
    if (efficiency >= 60) return "Bueno"
    if (efficiency >= 40) return "Regular"
    return "Bajo"
  }

  return (
    <div className="space-y-6">
      {/* Estadísticas Generales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{data.stats.totalCatalogs}</div>
                <div className="text-sm text-slate-600">Catálogos Analizados</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-green-500" />
              <div>
                <div className="text-2xl font-bold">{data.stats.avgEfficiency}%</div>
                <div className="text-sm text-slate-600">Eficiencia Promedio</div>
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
                <div className="text-sm text-slate-600">Unidades Totales</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-orange-500" />
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
        {/* Top Catálogos por Eficiencia */}
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Catálogos por Eficiencia</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topCatalogsChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis domain={[0, 100]} />
                <Tooltip
                  formatter={(value, name) => [
                    name === "efficiency" ? `${value}%` : value.toLocaleString(),
                    name === "efficiency" ? "Eficiencia" : "Unidades",
                  ]}
                  labelFormatter={(label) => topCatalogsChart.find((item) => item.name === label)?.fullName || label}
                />
                <Bar dataKey="efficiency" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Performance por Acuerdo Marco */}
        <Card>
          <CardHeader>
            <CardTitle>Eficiencia por Acuerdo Marco</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={agreementChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} />
                <Tooltip
                  formatter={(value, name) => [
                    name === "efficiency" ? `${value}%` : value,
                    name === "efficiency" ? "Eficiencia Promedio" : "Catálogos",
                  ]}
                />
                <Bar dataKey="efficiency" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Rankings Detallados de Catálogos */}
      <Card>
        <CardHeader>
          <CardTitle>Ranking Detallado de Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.catalogPerformance.slice(0, 15).map((catalog, index) => (
              <div key={`${catalog.catalogo}-${catalog.codigo_acuerdo_marco}`} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-lg font-bold">
                      #{index + 1}
                    </Badge>
                    <div>
                      <h3 className="font-semibold">{catalog.catalogo}</h3>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Badge variant="secondary">{catalog.codigo_acuerdo_marco}</Badge>
                        <span>•</span>
                        <span>{catalog.categories.length} categorías</span>
                        <span>•</span>
                        <span>{catalog.suppliers.length} proveedores</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className={`${getEfficiencyColor(catalog.efficiency)} border-0`}>
                      {Math.round(catalog.efficiency)}% {getEfficiencyLabel(catalog.efficiency)}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3">
                  <div>
                    <div className="text-sm text-slate-600">Unidades Vendidas</div>
                    <div className="font-bold text-blue-600">{catalog.totalUnits.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-600">Monto Total</div>
                    <div className="font-bold text-green-600">S/ {catalog.totalAmount.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-600">Valor Promedio Orden</div>
                    <div className="font-bold text-purple-600">S/ {catalog.avgOrderValue.toFixed(0)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-600">Precio Unitario Promedio</div>
                    <div className="font-bold text-orange-600">S/ {catalog.avgUnitPrice.toFixed(2)}</div>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span>Eficiencia General</span>
                    <span>{Math.round(catalog.efficiency)}%</span>
                  </div>
                  <Progress value={catalog.efficiency} className="h-2" />
                </div>

                {catalog.monthlyTrend.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium text-sm text-slate-700 mb-2">Tendencia Mensual:</h4>
                    <ResponsiveContainer width="100%" height={150}>
                      <LineChart data={catalog.monthlyTrend}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip formatter={(value) => [value.toLocaleString(), "Unidades"]} />
                        <Line type="monotone" dataKey="units" stroke="#3B82F6" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance por Acuerdo Marco Detallado */}
      <Card>
        <CardHeader>
          <CardTitle>Performance por Acuerdo Marco</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.agreementPerformance.slice(0, 8).map((agreement, index) => (
              <div key={agreement.codigo_acuerdo_marco} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-lg font-bold">
                      #{index + 1}
                    </Badge>
                    <div>
                      <h3 className="font-semibold">{agreement.codigo_acuerdo_marco}</h3>
                      <div className="text-sm text-slate-600">{agreement.acuerdo_marco}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-blue-600">{Math.round(agreement.avgEfficiency)}%</div>
                    <div className="text-sm text-slate-600">Eficiencia Promedio</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                  <div>
                    <div className="text-sm text-slate-600">Catálogos Activos</div>
                    <div className="font-bold">{agreement.totalCatalogs}</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-600">Unidades Totales</div>
                    <div className="font-bold text-green-600">{agreement.totalUnits.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-600">Monto Total</div>
                    <div className="font-bold text-purple-600">S/ {agreement.totalAmount.toLocaleString()}</div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-sm text-slate-700 mb-2">Top Catálogos:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {agreement.catalogs.slice(0, 4).map((catalog) => (
                      <div
                        key={catalog.catalogo}
                        className="flex items-center justify-between p-2 bg-slate-50 rounded text-sm"
                      >
                        <span className="truncate">{catalog.catalogo}</span>
                        <Badge variant="outline" className="text-xs">
                          {Math.round(catalog.efficiency)}%
                        </Badge>
                      </div>
                    ))}
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
