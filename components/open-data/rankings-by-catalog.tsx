"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { ChevronDown, ChevronUp, AlertCircle, Package, Layers, ShoppingCart, DollarSign } from "lucide-react"

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

const renderGradients = () => (
  <defs>
    <linearGradient id="colorUnits" x1="0" y1="0" x2="0" y2="1">
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
               {entry.name === "Monto" ? `S/ ${entry.value}M` : entry.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    )
  }
  return null
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
    return (
       <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-pulse">
          {[...Array(4)].map((_, i) => (
             <div key={i} className="h-32 bg-slate-100 dark:bg-slate-800 rounded-xl"></div>
          ))}
       </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400">
        <AlertCircle className="h-5 w-5" />
        <div>
          <h4 className="font-semibold">Error al cargar datos</h4>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    )
  }

  if (!data || data.rankings.length === 0) {
    return (
      <Card className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border-slate-200/60 dark:border-slate-800/60">
         <CardContent className="p-12 text-center text-slate-500 dark:text-slate-400">
            No hay datos disponibles para el período seleccionado
         </CardContent>
      </Card>
    )
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white/60 dark:bg-slate-950/60 backdrop-blur-xl border-slate-200/60 dark:border-slate-800/60 shadow-lg hover:shadow-xl transition-all duration-300 group">
          <CardContent className="p-5">
            <div className="flex justify-between items-start mb-2">
               <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg group-hover:scale-110 transition-transform">
                  <Layers className="h-5 w-5 text-blue-600 dark:text-blue-400" />
               </div>
               <span className="text-xs font-medium px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">Total</span>
            </div>
            <div className="text-3xl font-bold text-slate-800 dark:text-slate-100">{data.stats.totalCatalogs}</div>
            <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">Catálogos Activos</div>
          </CardContent>
        </Card>

        <Card className="bg-white/60 dark:bg-slate-950/60 backdrop-blur-xl border-slate-200/60 dark:border-slate-800/60 shadow-lg hover:shadow-xl transition-all duration-300 group">
          <CardContent className="p-5">
            <div className="flex justify-between items-start mb-2">
               <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg group-hover:scale-110 transition-transform">
                  <Package className="h-5 w-5 text-green-600 dark:text-green-400" />
               </div>
            </div>
            <div className="text-3xl font-bold text-slate-800 dark:text-slate-100">{data.stats.totalProducts.toLocaleString()}</div>
            <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">Productos Únicos</div>
          </CardContent>
        </Card>

        <Card className="bg-white/60 dark:bg-slate-950/60 backdrop-blur-xl border-slate-200/60 dark:border-slate-800/60 shadow-lg hover:shadow-xl transition-all duration-300 group">
          <CardContent className="p-5">
            <div className="flex justify-between items-start mb-2">
               <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg group-hover:scale-110 transition-transform">
                  <ShoppingCart className="h-5 w-5 text-purple-600 dark:text-purple-400" />
               </div>
            </div>
            <div className="text-3xl font-bold text-slate-800 dark:text-slate-100">{(data.stats.totalUnits / 1000).toFixed(0)}K</div>
            <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">Unidades Vendidas</div>
          </CardContent>
        </Card>

        <Card className="bg-white/60 dark:bg-slate-950/60 backdrop-blur-xl border-slate-200/60 dark:border-slate-800/60 shadow-lg hover:shadow-xl transition-all duration-300 group">
          <CardContent className="p-5">
            <div className="flex justify-between items-start mb-2">
               <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg group-hover:scale-110 transition-transform">
                  <DollarSign className="h-5 w-5 text-orange-600 dark:text-orange-400" />
               </div>
            </div>
            <div className="text-3xl font-bold text-slate-800 dark:text-slate-100">
              S/ {(data.stats.totalAmount / 1000000).toFixed(1)}M
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">Monto Total</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Analysis - Three Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Top Catalogs */}
        <Card className="lg:col-span-2 bg-white/50 dark:bg-slate-950/50 backdrop-blur-xl border-slate-200/60 dark:border-slate-800/60 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg text-slate-800 dark:text-slate-200">Top 8 Catálogos por Unidades</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={topCatalogsChart} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                {renderGradients()}
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" horizontal={true} vertical={false} />
                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" width={140} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }} />
                <Bar dataKey="units" name="Unidades" fill="url(#colorUnits)" radius={[0, 6, 6, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Right Column - Distribution */}
        <Card className="bg-white/50 dark:bg-slate-950/50 backdrop-blur-xl border-slate-200/60 dark:border-slate-800/60 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg text-slate-800 dark:text-slate-200">Distribución por Acuerdo</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={agreementChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {agreementChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 justify-center mt-4">
               {agreementChartData.map((entry, index) => (
                  <div key={index} className="flex items-center gap-1.5 text-xs">
                     <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                     <span className="text-slate-600 dark:text-slate-400">{entry.name}</span>
                  </div>
               ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Estados de Orden Analysis */}
      <Card className="bg-white/50 dark:bg-slate-950/50 backdrop-blur-xl border-slate-200/60 dark:border-slate-800/60 shadow-lg border-l-4 border-l-blue-500">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 text-slate-800 dark:text-slate-200">
            <AlertCircle className="h-5 w-5 text-blue-500" />
            Análisis de Estados de Orden
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {stateChartData.map((state) => (
              <div
                key={state.name}
                className="p-4 bg-white/40 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-white/60 dark:hover:bg-slate-900/60 transition-colors"
              >
                <div className="flex justify-between items-start">
                   <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                     {(state.value as number).toLocaleString()}
                   </div>
                   <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {state.percentage}%
                   </Badge>
                </div>
                <div className="text-sm font-medium text-slate-600 dark:text-slate-400 mt-2">{state.name}</div>
                <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mt-3 overflow-hidden">
                   <div 
                     className="h-full bg-blue-500 rounded-full" 
                     style={{ width: `${state.percentage}%` }}
                   />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Rankings Table */}
      <Card className="bg-white/50 dark:bg-slate-950/50 backdrop-blur-xl border-slate-200/60 dark:border-slate-800/60 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg text-slate-800 dark:text-slate-200">Catálogos Detallados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.rankings.map((catalog, index) => (
              <div
                key={`${catalog.codigo_acuerdo_marco}-${catalog.catalog}`}
                className="border border-slate-100 dark:border-slate-800 rounded-xl p-4 bg-white/40 dark:bg-slate-900/40 hover:bg-white/80 dark:hover:bg-slate-900/80 transition-all duration-200"
              >
                <div className="flex items-start justify-between mb-3 cursor-pointer" onClick={() => toggleCatalogExpansion(`${catalog.codigo_acuerdo_marco}-${catalog.catalog}`)}>
                  <div className="flex items-start gap-4 flex-1">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-sm">
                       {index + 1}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-base">{catalog.catalog}</h3>
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <Badge variant="outline" className="text-xs border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                          {catalog.codigo_acuerdo_marco}
                        </Badge>
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                           <Package className="h-3 w-3" />
                           {catalog.totalUnits.toLocaleString()} un.
                        </div>
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                           <DollarSign className="h-3 w-3" />
                           S/ {(catalog.totalAmount / 1000000).toFixed(2)}M
                        </div>
                        <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-200 border-none">
                           S/ {(catalog.totalAmount / catalog.totalOrders).toLocaleString(undefined, { maximumFractionDigits: 0 })} / orden
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 rounded-full"
                  >
                    {expandedCatalogs.has(`${catalog.codigo_acuerdo_marco}-${catalog.catalog}`) ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {expandedCatalogs.has(`${catalog.codigo_acuerdo_marco}-${catalog.catalog}`) && (
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                       <Package className="h-4 w-4 text-blue-500" /> Top 5 Productos
                    </h4>
                    <div className="space-y-2">
                      {catalog.products.slice(0, 5).map((product, productIndex) => (
                        <div
                          key={`${product.nro_parte}-${productIndex}`}
                          className="text-sm p-3 bg-slate-50/50 dark:bg-slate-800/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <div className="flex justify-between items-start mb-1 gap-4">
                            <div className="flex-1">
                              <span className="font-medium text-slate-800 dark:text-slate-200 block">
                                {productIndex + 1}. {product.nro_parte}
                              </span>
                              <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5 line-clamp-1">
                                 {product.descripcion}
                              </span>
                            </div>
                            <div className="text-right whitespace-nowrap">
                               <span className="font-bold text-blue-600 dark:text-blue-400 block">{product.totalUnits.toLocaleString()} un.</span>
                               {product.marca && (
                                 <Badge variant="secondary" className="mt-1 text-[10px] h-5">
                                   {product.marca}
                                 </Badge>
                               )}
                            </div>
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
