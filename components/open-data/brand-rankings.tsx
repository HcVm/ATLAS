"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts"
import { Award, TrendingUp, Package, Star, RefreshCw, ShoppingCart, DollarSign, Trophy, PieChart as PieChartIcon, Activity, Target } from "lucide-react"

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
  brand: string
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

const renderGradients = () => (
  <defs>
    <linearGradient id="colorBrandUnits" x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1} />
    </linearGradient>
  </defs>
)

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/60 dark:border-slate-800/60 rounded-xl p-3 shadow-xl">
        <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-xs mb-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
            <span className="text-slate-500 dark:text-slate-400">{entry.name}:</span>
            <span className="font-bold text-slate-700 dark:text-slate-300">
               {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value} {entry.name === 'units' ? 'un.' : ''}
            </span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

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
          (window as any).__BRAND_DATA__ = result.data
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
       <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-pulse">
          {[...Array(4)].map((_, i) => (
             <div key={i} className="h-32 bg-slate-100 dark:bg-slate-800 rounded-xl"></div>
          ))}
       </div>
    )
  }

  if (error || !data && !(window as any).__BRAND_DATA__) {
    return (
      <Card className="border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800">
        <CardContent className="p-8 text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">Error al cargar datos</p>
          <button onClick={() => window.location.reload()} className="inline-flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shadow-sm">
            <RefreshCw className="h-4 w-4" /> Reintentar
          </button>
        </CardContent>
      </Card>
    )
  }

  const finalData = data || (window as any).__BRAND_DATA__
  if (!finalData) return <div className="text-center text-slate-500 dark:text-slate-400">Sin datos</div>

  // === CÁLCULOS DE INTELIGENCIA DE MERCADO ===
  const totalMarketAmount = finalData.stats.totalAmount
  const topBrandsByShare = finalData.allBrands
    .map((b: BrandRanking) => ({
      ...b,
      marketShare: (b.totalAmount / totalMarketAmount) * 100,
      avgTicket: b.totalOrders > 0 ? b.totalAmount / b.totalOrders : 0
    }))
    .sort((a: any, b: any) => b.marketShare - a.marketShare)

  const marketConcentration = topBrandsByShare.slice(0, 3).reduce((acc: number, curr: any) => acc + curr.marketShare, 0)
  const marketType = marketConcentration > 70 ? "Altamente Concentrado" : marketConcentration > 40 ? "Moderado" : "Fragmentado"

  // === TOP PRODUCTOS POR ORDEN DE COMPRA ===
  const topProductsByOC = finalData.ourBrands
    .flatMap((b: BrandRanking) => b.topProducts.map(p => ({ ...p, brand: b.brand })))
    .sort((a: any, b: any) => b.orders - a.orders)
    .slice(0, 10)

  // === ÓRDENES MÁS GRANDES ===
  const topOrders = (finalData.topOrders || []).slice(0, 5)

  // === PARTICIPACIÓN POR CATÁLOGO ===
  const catalogShare = (finalData.catalogShare || []).slice(0, 8)

  const PIE_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']

  return (
    <div className="space-y-6">
      {/* Market Insight Banner */}
      <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 opacity-10">
           <Activity size={200} />
        </div>
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6">
           <div>
              <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
                 <Target className="h-5 w-5" /> Estructura del Mercado
              </h3>
              <p className="text-indigo-100 text-sm">
                 El mercado está <strong>{marketType}</strong>. Las 3 principales marcas controlan el <strong>{marketConcentration.toFixed(1)}%</strong> del valor total transaccionado.
              </p>
           </div>
           <div>
              <h3 className="text-lg font-semibold mb-1">Líder del Mercado</h3>
              <div className="text-3xl font-bold">{topBrandsByShare[0]?.brand}</div>
              <div className="text-indigo-100 text-sm">
                 {topBrandsByShare[0]?.marketShare.toFixed(1)}% de participación
              </div>
           </div>
           <div>
              <h3 className="text-lg font-semibold mb-1">Ticket Promedio Global</h3>
              <div className="text-3xl font-bold">S/ {(finalData.stats.totalAmount / finalData.stats.totalOrders || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
              <div className="text-indigo-100 text-sm">Por orden de compra</div>
           </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white/60 dark:bg-slate-950/60 backdrop-blur-xl border-slate-200/60 dark:border-slate-800/60 shadow-lg hover:shadow-xl transition-all duration-300 group">
           <CardContent className="p-5">
              <div className="flex justify-between items-start mb-2">
                 <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg group-hover:scale-110 transition-transform">
                    <Award className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                 </div>
              </div>
              <div className="text-3xl font-bold text-slate-800 dark:text-slate-100">{finalData.stats.totalBrands}</div>
              <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">Marcas Activas</div>
           </CardContent>
        </Card>

        <Card className="bg-white/60 dark:bg-slate-950/60 backdrop-blur-xl border-slate-200/60 dark:border-slate-800/60 shadow-lg hover:shadow-xl transition-all duration-300 group">
           <CardContent className="p-5">
              <div className="flex justify-between items-start mb-2">
                 <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg group-hover:scale-110 transition-transform">
                    <Star className="h-5 w-5 text-green-600 dark:text-green-400" />
                 </div>
              </div>
              <div className="text-3xl font-bold text-slate-800 dark:text-slate-100">{finalData.stats.ourBrandsCount}</div>
              <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">Nuestras Marcas</div>
           </CardContent>
        </Card>

        <Card className="bg-white/60 dark:bg-slate-950/60 backdrop-blur-xl border-slate-200/60 dark:border-slate-800/60 shadow-lg hover:shadow-xl transition-all duration-300 group">
           <CardContent className="p-5">
              <div className="flex justify-between items-start mb-2">
                 <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg group-hover:scale-110 transition-transform">
                    <Package className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                 </div>
              </div>
              <div className="text-3xl font-bold text-slate-800 dark:text-slate-100">{finalData.stats.totalUnits.toLocaleString()}</div>
              <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">Unidades</div>
           </CardContent>
        </Card>

        <Card className="bg-white/60 dark:bg-slate-950/60 backdrop-blur-xl border-slate-200/60 dark:border-slate-800/60 shadow-lg hover:shadow-xl transition-all duration-300 group">
           <CardContent className="p-5">
              <div className="flex justify-between items-start mb-2">
                 <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg group-hover:scale-110 transition-transform">
                    <TrendingUp className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                 </div>
              </div>
              <div className="text-3xl font-bold text-slate-800 dark:text-slate-100">S/ {(finalData.stats.totalAmount / 1e6).toFixed(1)}M</div>
              <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">Monto Total</div>
           </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-5 bg-slate-100/50 dark:bg-slate-800/50 backdrop-blur-sm p-1 rounded-xl mb-6">
          <TabsTrigger value="all" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm transition-all">Todas</TabsTrigger>
          <TabsTrigger value="our" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm transition-all">Nuestras</TabsTrigger>
          <TabsTrigger value="competitors" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm transition-all">Competidores</TabsTrigger>
          <TabsTrigger value="orders" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm transition-all">Órdenes</TabsTrigger>
          <TabsTrigger value="catalogs" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm transition-all">Catálogos</TabsTrigger>
        </TabsList>

        {/* === TODAS LAS MARCAS === */}
        <TabsContent value="all" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             {/* Gráfico de Barras (Ranking) */}
             <Card className="lg:col-span-2 bg-white/50 dark:bg-slate-950/50 backdrop-blur-xl border-slate-200/60 dark:border-slate-800/60 shadow-lg">
               <CardHeader>
                  <CardTitle className="text-slate-800 dark:text-slate-200">Ranking por Participación de Mercado (Valor)</CardTitle>
               </CardHeader>
               <CardContent>
                 <ResponsiveContainer width="100%" height={350}>
                   <BarChart data={topBrandsByShare.slice(0, 10)} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                     {renderGradients()}
                     <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" vertical={false} />
                     <XAxis dataKey="brand" angle={-45} textAnchor="end" height={80} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} interval={0} />
                     <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(value) => `S/ ${value / 1e6}M`} />
                     <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }} />
                     <Bar dataKey="totalAmount" name="Monto" fill="url(#colorBrandUnits)" radius={[4, 4, 0, 0]} />
                   </BarChart>
                 </ResponsiveContainer>
               </CardContent>
             </Card>

             {/* Gráfico de Torta (Share) */}
             <Card className="bg-white/50 dark:bg-slate-950/50 backdrop-blur-xl border-slate-200/60 dark:border-slate-800/60 shadow-lg">
                <CardHeader>
                   <CardTitle className="text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <PieChartIcon className="h-5 w-5 text-indigo-500" /> Distribución
                   </CardTitle>
                </CardHeader>
                <CardContent>
                   <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                         <PieChart>
                            <Pie
                               data={topBrandsByShare.slice(0, 5).concat({ brand: 'Otros', totalAmount: totalMarketAmount - topBrandsByShare.slice(0, 5).reduce((acc: number, b: any) => acc + b.totalAmount, 0) })}
                               cx="50%"
                               cy="50%"
                               innerRadius={60}
                               outerRadius={80}
                               paddingAngle={5}
                               dataKey="totalAmount"
                               nameKey="brand"
                            >
                               {topBrandsByShare.slice(0, 5).map((entry: any, index: number) => (
                                  <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                               ))}
                               <Cell fill="#94a3b8" />
                            </Pie>
                            <Tooltip formatter={(value: number) => `S/ ${(value / 1e6).toFixed(2)}M`} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                            <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '12px' }} />
                         </PieChart>
                      </ResponsiveContainer>
                   </div>
                   <div className="mt-4 space-y-3">
                      {topBrandsByShare.slice(0, 5).map((brand: any, i: number) => (
                         <div key={i} className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                               <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }} />
                               {brand.brand}
                            </span>
                            <span className="font-bold text-slate-800 dark:text-slate-100">{brand.marketShare.toFixed(1)}%</span>
                         </div>
                      ))}
                   </div>
                </CardContent>
             </Card>
          </div>
        </TabsContent>

        {/* === NUESTRAS MARCAS === */}
        <TabsContent value="our" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {finalData.ourBrands.map((brand: BrandRanking) => {
              const brandShare = ((brand.totalAmount / totalMarketAmount) * 100).toFixed(1)
              const brandAvgTicket = brand.totalOrders > 0 ? brand.totalAmount / brand.totalOrders : 0
              
              return (
              <Card key={brand.brand} className="bg-white/50 dark:bg-slate-950/50 backdrop-blur-xl border-slate-200/60 dark:border-slate-800/60 shadow-lg border-l-4 border-l-green-500">
                <CardHeader className="pb-2">
                   <div className="flex justify-between items-start">
                      <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-200 text-xl">
                         <Star className="h-6 w-6 text-green-500 fill-green-500" />
                         {brand.brand}
                      </CardTitle>
                      <Badge variant="outline" className="text-sm bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800">
                         {brandShare}% del Mercado
                      </Badge>
                   </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 mb-6 mt-2">
                    <div className="p-3 bg-green-50/50 dark:bg-green-900/10 rounded-xl text-center">
                       <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Unidades</div>
                       <div className="text-xl font-bold text-green-600 dark:text-green-400">{brand.totalUnits.toLocaleString()}</div>
                    </div>
                    <div className="p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl text-center">
                       <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Monto Total</div>
                       <div className="text-xl font-bold text-blue-600 dark:text-blue-400">S/ {(brand.totalAmount / 1e6).toFixed(2)}M</div>
                    </div>
                    <div className="p-3 bg-purple-50/50 dark:bg-purple-900/10 rounded-xl text-center">
                       <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Ticket Prom.</div>
                       <div className="text-xl font-bold text-purple-600 dark:text-purple-400">S/ {brandAvgTicket.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-3 text-slate-700 dark:text-slate-300 flex items-center gap-2">
                       <Trophy className="h-4 w-4 text-yellow-500" /> Productos Estrella
                    </h4>
                    {brand.topProducts.slice(0, 3).map((p, i) => (
                      <div key={i} className="flex justify-between items-center p-3 bg-white dark:bg-slate-900/40 rounded-xl mb-2 text-sm border border-slate-100 dark:border-slate-800 shadow-sm">
                        <div className="flex-1 min-w-0 pr-3">
                           <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">{p.nro_parte}</span>
                           <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{p.descripcion}</div>
                        </div>
                        <div className="text-right whitespace-nowrap">
                           <div className="font-bold text-slate-700 dark:text-slate-300">{p.totalUnits.toLocaleString()} un.</div>
                           <div className="text-xs text-green-600 dark:text-green-400 font-medium">S/ {p.totalAmount.toLocaleString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )})}
          </div>

          {/* TOP PRODUCTOS POR ORDEN DE COMPRA */}
          <Card className="bg-white/50 dark:bg-slate-950/50 backdrop-blur-xl border-slate-200/60 dark:border-slate-800/60 shadow-lg">
            <CardHeader><CardTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-200"><ShoppingCart className="h-5 w-5 text-purple-500" />Top Productos por Órdenes de Compra</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topProductsByOC.map((p: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 border border-slate-100 dark:border-slate-800 rounded-xl hover:bg-purple-50/50 dark:hover:bg-purple-900/10 transition-colors">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-200 border-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-800">#{i + 1}</Badge>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-slate-800 dark:text-slate-200 truncate">{p.nro_parte} • {p.brand}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{p.descripcion}</div>
                      </div>
                    </div>
                    <div className="text-right pl-2 whitespace-nowrap">
                      <div className="font-bold text-purple-600 dark:text-purple-400">{p.orders} órdenes</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{p.totalUnits.toLocaleString()} un.</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === COMPETIDORES (CON TOP PRODUCTOS) === */}
        <TabsContent value="competitors" className="space-y-6">
          <Card className="bg-white/50 dark:bg-slate-950/50 backdrop-blur-xl border-slate-200/60 dark:border-slate-800/60 shadow-lg">
            <CardHeader><CardTitle className="text-slate-800 dark:text-slate-200">Top Competidores</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {finalData.competitorBrands.map((brand: BrandRanking, i: number) => (
                  <div key={i} className="border border-slate-100 dark:border-slate-800 rounded-xl p-4 hover:bg-red-50/30 dark:hover:bg-red-900/10 transition bg-white/40 dark:bg-slate-900/40">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Badge variant="destructive" className="text-base font-bold h-8 w-8 flex items-center justify-center rounded-full">#{i + 1}</Badge>
                        <div>
                          <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-200">{brand.brand}</h3>
                          <div className="text-sm text-slate-500 dark:text-slate-400">{brand.categories.length} cat • {brand.topProducts.length} prod</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-red-600 dark:text-red-400">{brand.totalUnits.toLocaleString()} un.</div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">S/ {brand.totalAmount.toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="mt-3 pl-11">
                      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Top 3 productos:</h4>
                      <div className="space-y-1.5">
                        {brand.topProducts.slice(0, 3).map((p, pi) => (
                          <div key={pi} className="text-xs p-2 bg-red-50/50 dark:bg-red-900/10 rounded-lg flex justify-between items-center border border-red-100 dark:border-red-900/20">
                            <span className="text-slate-700 dark:text-slate-300 truncate flex-1 pr-2">{p.nro_parte}: {p.descripcion}</span>
                            <span className="font-medium text-red-700 dark:text-red-300 whitespace-nowrap">{p.totalUnits.toLocaleString()} un.</span>
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
          <Card className="bg-white/50 dark:bg-slate-950/50 backdrop-blur-xl border-slate-200/60 dark:border-slate-800/60 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Órdenes de Compra Más Grandes por Catálogo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {finalData.topOrders.length > 0 ? (
                  finalData.topOrders.map((cat: any, i: number) => (
                    <div key={i} className="border border-slate-100 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-900/50">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-semibold text-slate-800 dark:text-slate-200">{cat.catalog}</h4>
                        <div className="text-right">
                          <Badge variant={cat.ourShare > 30 ? "default" : "secondary"}>
                            {cat.ourShare.toFixed(1)}% nuestras
                          </Badge>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            S/ {cat.totalAmount.toLocaleString()} total
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* TOP GENERAL */}
                        <div>
                          <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1">
                            Top 3 Órdenes (General)
                          </h5>
                          <div className="space-y-2">
                            {cat.topGeneral.map((o: any, j: number) => (
                              <div key={j} className="flex items-center justify-between p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 text-xs shadow-sm">
                                <div className="flex items-center gap-2">
                                  <Badge className="bg-yellow-500 text-white text-[10px] px-1.5 h-5">#{j + 1}</Badge>
                                  <div>
                                    <div className="font-medium text-slate-800 dark:text-slate-200">{o.orderId}</div>
                                    <div className="text-slate-500 dark:text-slate-400">{o.brand}</div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-bold text-yellow-600 dark:text-yellow-500">S/ {o.amount.toLocaleString()}</div>
                                  <div className="text-xs text-slate-500 dark:text-slate-400">{o.units.toLocaleString()} un.</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* TOP NUESTRAS */}
                        <div>
                          <h5 className="text-sm font-medium text-green-700 dark:text-green-400 mb-2 flex items-center gap-1">
                            Top 3 Nuestras
                          </h5>
                          {cat.topOur.length > 0 ? (
                            <div className="space-y-2">
                              {cat.topOur.map((o: any, j: number) => (
                                <div key={j} className="flex items-center justify-between p-2 bg-green-50/50 dark:bg-green-900/10 rounded-lg border border-green-100 dark:border-green-900/20 text-xs">
                                  <div className="flex items-center gap-2">
                                    <Badge className="bg-green-500 text-white text-[10px] px-1.5 h-5">#{j + 1}</Badge>
                                    <div>
                                      <div className="font-medium text-slate-800 dark:text-slate-200">{o.orderId}</div>
                                      <div className="text-green-600 dark:text-green-400 font-medium">{o.brand}</div>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="font-bold text-green-600 dark:text-green-400">S/ {o.amount.toLocaleString()}</div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400">{o.units.toLocaleString()} un.</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center text-slate-500 dark:text-slate-400 text-xs py-4 bg-slate-100/50 dark:bg-slate-800/50 rounded-lg border border-dashed border-slate-200 dark:border-slate-700">
                              No tenemos órdenes en este catálogo
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-slate-500 dark:text-slate-400 py-8">No hay datos de órdenes</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === PARTICIPACIÓN POR CATÁLOGO Y MARCA === */}
        <TabsContent value="catalogs" className="space-y-6">
          <Card className="bg-white/50 dark:bg-slate-950/50 backdrop-blur-xl border-slate-200/60 dark:border-slate-800/60 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                <DollarSign className="h-5 w-5 text-orange-500" />
                Participación por Catálogo y Marca
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {catalogShare.length > 0 ? (
                  catalogShare.map((c: any, i: number) => (
                    <div key={i} className="border border-slate-100 dark:border-slate-800 rounded-xl p-4 bg-white/40 dark:bg-slate-900/40">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200">{c.catalog}</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            <span className="text-green-600 dark:text-green-400 font-medium">{c.brand}</span>: S/ {c.ourAmount.toLocaleString()}
                          </p>
                        </div>
                        <Badge variant={c.ourShare > 30 ? "default" : c.ourShare > 10 ? "secondary" : "outline"}>
                          {c.ourShare.toFixed(1)}%
                        </Badge>
                      </div>

                      <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
                        <span>vs</span>
                        <span className="text-red-600 dark:text-red-400">
                          {c.topCompetitor}: S/ {c.topCompetitorAmount.toLocaleString()}
                        </span>
                      </div>

                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all duration-1000 ease-out"
                          style={{ width: `${Math.min(c.ourShare, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-slate-500 dark:text-slate-400 py-8">No hay datos de catálogos</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
