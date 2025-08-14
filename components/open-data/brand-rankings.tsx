"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Award, TrendingUp, Package, Star } from "lucide-react"

interface Product {
  nro_parte: string
  descripcion: string
  categoria: string
  catalogo: string
  totalUnits: number
  totalAmount: number
  orders: number
  avgPrice: number
}

interface BrandRanking {
  brand: string
  categories: string[]
  catalogs: string[]
  agreements: string[]
  totalUnits: number
  totalAmount: number
  totalOrders: number
  avgPrice: number
  topProducts: Product[]
}

interface BrandRankingsProps {
  period: string
}

export function BrandRankings({ period }: BrandRankingsProps) {
  const [data, setData] = useState<{
    ourBrands: BrandRanking[]
    competitorBrands: BrandRanking[]
    allBrands: BrandRanking[]
    stats: any
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/open-data/brand-rankings?period=${period}`)
        const result = await response.json()
        if (result.success) {
          setData(result.data)
        }
      } catch (error) {
        console.error("Error fetching brand rankings:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [period])

  if (loading) {
    return <div className="flex items-center justify-center h-64">Cargando rankings de marcas...</div>
  }

  if (!data) {
    return <div className="text-center text-slate-500">No se pudieron cargar los datos</div>
  }

  // Preparar datos para gráficos
  const topBrandsChart = data.allBrands.slice(0, 10).map((brand) => ({
    name: brand.brand.length > 15 ? brand.brand.substring(0, 15) + "..." : brand.brand,
    fullName: brand.brand,
    units: brand.totalUnits,
    amount: brand.totalAmount,
  }))

  const ourBrandsChart = data.ourBrands.map((brand) => ({
    name: brand.brand,
    units: brand.totalUnits,
    amount: brand.totalAmount,
    categories: brand.categories.length,
  }))

  return (
    <div className="space-y-6">
      {/* Estadísticas Generales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{data.stats.totalBrands}</div>
                <div className="text-sm text-slate-600">Marcas Activas</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-green-500" />
              <div>
                <div className="text-2xl font-bold">{data.stats.ourBrandsCount}</div>
                <div className="text-sm text-slate-600">Nuestras Marcas</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-purple-500" />
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

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">Todas las Marcas</TabsTrigger>
          <TabsTrigger value="our">Nuestras Marcas</TabsTrigger>
          <TabsTrigger value="competitors">Competidores</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-6">
          {/* Gráfico Top Marcas */}
          <Card>
            <CardHeader>
              <CardTitle>Top 10 Marcas por Unidades Vendidas</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topBrandsChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip
                    formatter={(value, name) => [
                      name === "units" ? `${value.toLocaleString()} unidades` : `S/ ${value.toLocaleString()}`,
                      name === "units" ? "Unidades" : "Monto",
                    ]}
                    labelFormatter={(label) => topBrandsChart.find((item) => item.name === label)?.fullName || label}
                  />
                  <Bar dataKey="units" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Lista Detallada */}
          <Card>
            <CardHeader>
              <CardTitle>Ranking Completo de Marcas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.allBrands.slice(0, 15).map((brand, index) => (
                  <div key={brand.brand} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-lg font-bold">
                        #{index + 1}
                      </Badge>
                      <div>
                        <h3 className="font-semibold">{brand.brand}</h3>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <span>{brand.categories.length} categorías</span>
                          <span>•</span>
                          <span>{brand.catalogs.length} catálogos</span>
                          <span>•</span>
                          <span>{brand.agreements.length} acuerdos</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-blue-600">{brand.totalUnits.toLocaleString()} unidades</div>
                      <div className="text-sm text-slate-600">S/ {brand.totalAmount.toLocaleString()}</div>
                      <div className="text-xs text-slate-500">S/ {brand.avgPrice.toFixed(2)} promedio</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="our" className="space-y-6">
          {data.ourBrands.length > 0 ? (
            <>
              {/* Gráfico Nuestras Marcas */}
              <Card>
                <CardHeader>
                  <CardTitle>Performance de Nuestras Marcas</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={ourBrandsChart}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`${value.toLocaleString()} unidades`, "Unidades"]} />
                      <Bar dataKey="units" fill="#10B981" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Detalle de Nuestras Marcas */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {data.ourBrands.map((brand) => (
                  <Card key={brand.brand} className="border-l-4 border-l-green-500">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Star className="h-5 w-5 text-green-500" />
                        {brand.brand}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-2xl font-bold text-green-600">{brand.totalUnits.toLocaleString()}</div>
                            <div className="text-sm text-slate-600">Unidades Vendidas</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-blue-600">
                              S/ {brand.totalAmount.toLocaleString()}
                            </div>
                            <div className="text-sm text-slate-600">Monto Total</div>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-medium mb-2">Top Productos:</h4>
                          <div className="space-y-2">
                            {brand.topProducts.slice(0, 3).map((product, index) => (
                              <div key={product.nro_parte} className="flex items-center justify-between text-sm">
                                <div>
                                  <span className="font-medium">{product.nro_parte}</span>
                                  <div className="text-xs text-slate-500">
                                    {product.descripcion.substring(0, 40)}...
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-medium">{product.totalUnits.toLocaleString()}</div>
                                  <div className="text-xs text-slate-500">unidades</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1">
                          {brand.categories.slice(0, 3).map((category) => (
                            <Badge key={category} variant="secondary" className="text-xs">
                              {category}
                            </Badge>
                          ))}
                          {brand.categories.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{brand.categories.length - 3} más
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="text-slate-500">No se encontraron nuestras marcas en el período seleccionado</div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="competitors" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Marcas Competidoras</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.competitorBrands.slice(0, 10).map((brand, index) => (
                  <div key={brand.brand} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-lg font-bold">
                        #{index + 1}
                      </Badge>
                      <div>
                        <h3 className="font-semibold">{brand.brand}</h3>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <span>{brand.categories.length} categorías</span>
                          <span>•</span>
                          <span>{brand.topProducts.length} productos principales</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-red-600">{brand.totalUnits.toLocaleString()} unidades</div>
                      <div className="text-sm text-slate-600">S/ {brand.totalAmount.toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
