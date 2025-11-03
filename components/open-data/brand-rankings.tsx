// components/open-data/brand-rankings.tsx
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { Award, TrendingUp, Package, Star, RefreshCw, ShoppingCart, DollarSign, Trophy } from "lucide-react"

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

interface Order {
  orderId: string
  date: string
  amount: number
  units: number
  brand: string
  product: string
}

interface CatalogShare {
  catalog: string
  ourAmount: number
  topCompetitor: string
  topCompetitorAmount: number
  ourShare: number
}

interface BrandRankingsProps {
  data?: {
    ourBrands: BrandRanking[]
    competitorBrands: BrandRanking[]
    allBrands: BrandRanking[]
    stats: any
    topOrders?: Order[]
    catalogShare?: CatalogShare[]
  }
}

const COLORS = ["#10B981", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6"]

export default function BrandRankings({ data }: BrandRankingsProps) {
  const [loading, setLoading] = useState(!data)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (data) {
      setLoading(false)
      return
    }

    const fetchData = async () => {
      try {
        setLoading(true)
        const url = new URL("/api/open-data/rankings-by-brand", window.location.origin)
        url.searchParams.set("period", "6months")
        const res = await fetch(url)
        const result = await res.json()
        if (result.success) {
          window.__BRAND_DATA__ = result.data
        } else {
          setError(true)
        }
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [data])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500"></div>
        <p className="text-slate-600">Cargando análisis de marcas...</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <Card className="border-red-200">
        <CardContent className="p-8 text-center">
          <p className="text-slate-600 mb-4">Error al cargar datos</p>
          <button onClick={() => window.location.reload()} className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600">
            <RefreshCw className="h-4 w-4" /> Reintentar
          </button>
        </CardContent>
      </Card>
    )
  }

  const finalData = data || (window as any).__BRAND_DATA__
  if (!finalData) return <div className="text-center text-slate-500">Sin datos</div>

  // === TOP PRODUCTOS POR ORDEN DE COMPRA ===
  const topProductsByOC = finalData.ourBrands
    .flatMap((b: BrandRanking) => b.topProducts.map(p => ({ ...p, brand: b.brand })))
    .sort((a: any, b: any) => b.orders - a.orders)
    .slice(0, 10)

  // === ÓRDENES MÁS GRANDES ===
  const topOrders = (finalData.topOrders || []).slice(0, 5)

  // === PARTICIPACIÓN POR CATÁLOGO ===
  const catalogShare = (finalData.catalogShare || []).slice(0, 8)

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-blue-200"><CardContent className="p-4"><div className="flex items-center gap-2"><Award className="h-5 w-5 text-blue-500" /><div><div className="text-2xl font-bold">{finalData.stats.totalBrands}</div><div className="text-sm text-slate-600">Marcas Activas</div></div></div></CardContent></Card>
        <Card className="border-green-200"><CardContent className="p-4"><div className="flex items-center gap-2"><Star className="h-5 w-5 text-green-500" /><div><div className="text-2xl font-bold">{finalData.stats.ourBrandsCount}</div><div className="text-sm text-slate-600">Nuestras Marcas</div></div></div></CardContent></Card>
        <Card className="border-purple-200"><CardContent className="p-4"><div className="flex items-center gap-2"><Package className="h-5 w-5 text-purple-500" /><div><div className="text-2xl font-bold">{finalData.stats.totalUnits.toLocaleString()}</div><div className="text-sm text-slate-600">Unidades</div></div></div></CardContent></Card>
        <Card className="border-orange-200"><CardContent className="p-4"><div className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-orange-500" /><div><div className="text-2xl font-bold">S/ {(finalData.stats.totalAmount / 1e6).toFixed(1)}M</div><div className="text-sm text-slate-600">Monto Total</div></div></div></CardContent></Card>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-5 bg-slate-100">
          <TabsTrigger value="all" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">Todas</TabsTrigger>
          <TabsTrigger value="our" className="data-[state=active]:bg-green-500 data-[state=active]:text-white">Nuestras</TabsTrigger>
          <TabsTrigger value="competitors" className="data-[state=active]:bg-red-500 data-[state=active]:text-white">Competidores</TabsTrigger>
          <TabsTrigger value="orders" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">Órdenes</TabsTrigger>
          <TabsTrigger value="catalogs" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">Catálogos</TabsTrigger>
        </TabsList>

        {/* === TODAS LAS MARCAS === */}
        <TabsContent value="all" className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Top 10 Marcas por Unidades</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={finalData.allBrands.slice(0, 10).map((b: any) => ({ name: b.brand.length > 15 ? b.brand.slice(0, 12) + "..." : b.brand, units: b.totalUnits }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip formatter={(v) => `${v.toLocaleString()} un.`} />
                  <Bar dataKey="units" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === NUESTRAS MARCAS === */}
        <TabsContent value="our" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {finalData.ourBrands.map((brand: BrandRanking) => (
              <Card key={brand.brand} className="border-l-4 border-l-green-500">
                <CardHeader><CardTitle className="flex items-center gap-2"><Star className="h-5 w-5 text-green-500" />{brand.brand}</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div><div className="text-2xl font-bold text-green-600">{brand.totalUnits.toLocaleString()}</div><div className="text-sm text-slate-600">Unidades</div></div>
                    <div><div className="text-2xl font-bold text-blue-600">S/ {brand.totalAmount.toLocaleString()}</div><div className="text-sm text-slate-600">Monto</div></div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Top Productos:</h4>
                    {brand.topProducts.slice(0, 3).map((p, i) => (
                      <div key={i} className="flex justify-between p-2 bg-green-50 rounded mb-1 text-sm">
                        <div><span className="font-medium">{p.nro_parte}</span><div className="text-xs text-slate-600">{p.descripcion.substring(0, 40)}...</div></div>
                        <div className="text-right"><div className="font-medium">{p.totalUnits.toLocaleString()} un.</div></div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* TOP PRODUCTOS POR ORDEN DE COMPRA */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><ShoppingCart className="h-5 w-5 text-purple-500" />Top Productos por Órdenes de Compra</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topProductsByOC.map((p: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 border rounded-lg hover:bg-purple-50">
                    <div className="flex items-center gap-3">
                      <Badge className="bg-purple-500 text-white">#{i + 1}</Badge>
                      <div>
                        <div className="font-medium">{p.nro_parte} • {p.brand}</div>
                        <div className="text-xs text-slate-600">{p.descripcion.substring(0, 50)}...</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-purple-600">{p.orders} órdenes</div>
                      <div className="text-xs">{p.totalUnits.toLocaleString()} un.</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === COMPETIDORES (CON TOP PRODUCTOS) === */}
        <TabsContent value="competitors" className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Top Competidores</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {finalData.competitorBrands.map((brand: BrandRanking, i: number) => (
                  <div key={i} className="border rounded-lg p-4 hover:bg-red-50 transition">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Badge variant="destructive" className="text-lg">#{i + 1}</Badge>
                        <div>
                          <h3 className="font-semibold text-lg">{brand.brand}</h3>
                          <div className="text-sm text-slate-600">{brand.categories.length} cat • {brand.topProducts.length} prod</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-red-600">{brand.totalUnits.toLocaleString()} un.</div>
                        <div className="text-sm">S/ {brand.totalAmount.toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="mt-3 pl-10">
                      <h4 className="text-sm font-medium text-slate-700 mb-1">Top 3 productos:</h4>
                      <div className="space-y-1">
                        {brand.topProducts.slice(0, 3).map((p, pi) => (
                          <div key={pi} className="text-xs p-1 bg-red-50 rounded flex justify-between">
                            <span>{p.nro_parte}: {p.descripcion.substring(0, 35)}...</span>
                            <span className="font-medium">{p.totalUnits.toLocaleString()} un.</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === ÓRDENES POR CATÁLOGO === */}
        <TabsContent value="orders" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Órdenes de Compra Más Grandes por Catálogo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {finalData.topOrders.length > 0 ? (
                  finalData.topOrders.map((cat: any, i: number) => (
                    <div key={i} className="border rounded-lg p-4 bg-slate-50">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-semibold">{cat.catalog}</h4>
                        <div className="text-right">
                          <Badge variant={cat.ourShare > 30 ? "default" : "secondary"}>
                            {cat.ourShare.toFixed(1)}% nuestras
                          </Badge>
                          <div className="text-xs text-slate-600">
                            S/ {cat.totalAmount.toLocaleString()} total
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* TOP GENERAL */}
                        <div>
                          <h5 className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-1">
                            Top 3 Órdenes (General)
                          </h5>
                          <div className="space-y-2">
                            {cat.topGeneral.map((o: any, j: number) => (
                              <div key={j} className="flex items-center justify-between p-2 bg-white rounded border text-xs">
                                <div className="flex items-center gap-2">
                                  <Badge className="bg-yellow-500 text-white text-xs">#{j + 1}</Badge>
                                  <div>
                                    <div className="font-medium">{o.orderId}</div>
                                    <div className="text-slate-600">{o.brand}</div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-bold text-yellow-600">S/ {o.amount.toLocaleString()}</div>
                                  <div className="text-xs">{o.units.toLocaleString()} un.</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* TOP NUESTRAS */}
                        <div>
                          <h5 className="text-sm font-medium text-green-700 mb-2 flex items-center gap-1">
                            Top 3 Nuestras
                          </h5>
                          {cat.topOur.length > 0 ? (
                            <div className="space-y-2">
                              {cat.topOur.map((o: any, j: number) => (
                                <div key={j} className="flex items-center justify-between p-2 bg-green-50 rounded border text-xs">
                                  <div className="flex items-center gap-2">
                                    <Badge className="bg-green-500 text-white text-xs">#{j + 1}</Badge>
                                    <div>
                                      <div className="font-medium">{o.orderId}</div>
                                      <div className="text-green-600 font-medium">{o.brand}</div>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="font-bold text-green-600">S/ {o.amount.toLocaleString()}</div>
                                    <div className="text-xs">{o.units.toLocaleString()} un.</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-center text-slate-500 text-xs py-4">
                              No tenemos órdenes en este catálogo
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-slate-500 py-8">No hay datos de órdenes</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === PARTICIPACIÓN POR CATÁLOGO Y MARCA === */}
        <TabsContent value="catalogs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-orange-500" />
                Participación por Catálogo y Marca
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {catalogShare.length > 0 ? (
                  catalogShare.map((c: any, i: number) => (
                    <div key={i} className="border rounded-lg p-4 bg-slate-50">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold text-sm">{c.catalog}</h4>
                          <p className="text-xs text-slate-600 mt-1">
                            <span className="text-green-600 font-medium">{c.brand}</span>: S/ {c.ourAmount.toLocaleString()}
                          </p>
                        </div>
                        <Badge variant={c.ourShare > 30 ? "default" : c.ourShare > 10 ? "secondary" : "outline"}>
                          {c.ourShare.toFixed(1)}%
                        </Badge>
                      </div>

                      <div className="flex justify-between text-xs text-slate-600 mb-2">
                        <span>vs</span>
                        <span className="text-red-600">
                          {c.topCompetitor}: S/ {c.topCompetitorAmount.toLocaleString()}
                        </span>
                      </div>

                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all"
                          style={{ width: `${Math.min(c.ourShare, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-slate-500 py-8">No hay datos de catálogos</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}