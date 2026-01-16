"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { AlertCircle, Layers, DollarSign, FileText, ShoppingCart } from "lucide-react"

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

const renderGradients = () => (
  <defs>
    <linearGradient id="colorCategoryAmount" x1="0" y1="0" x2="1" y2="0">
      <stop offset="5%" stopColor="#10B981" stopOpacity={0.8} />
      <stop offset="95%" stopColor="#10B981" stopOpacity={0.1} />
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

  const chartData = data.rankings.slice(0, 10).map((category) => ({
    name: category.categoria.length > 20 ? category.categoria.substring(0, 20) + "..." : category.categoria,
    fullName: category.categoria,
    amount: Math.round((category.totalAmount / 1000000) * 10) / 10,
  }))

  // Cálculo de Pareto
  const totalAmount = data.rankings.reduce((sum, item) => sum + item.totalAmount, 0)
  let cumulativeAmount = 0
  const categoriesWithShare = data.rankings.map(item => {
     cumulativeAmount += item.totalAmount
     return {
        ...item,
        share: (item.totalAmount / totalAmount) * 100,
        cumulativeShare: (cumulativeAmount / totalAmount) * 100
     }
  })

  const top80Count = categoriesWithShare.filter(c => c.cumulativeShare <= 80).length
  const paretoText = `El 80% del valor transaccionado se concentra en solo ${top80Count} categorías (de ${data.rankings.length}).`

  return (
    <div className="space-y-6">
       {/* Insight Banner */}
       <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
             <div>
                <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                   <AlertCircle className="h-6 w-6" /> Análisis de Concentración (Pareto)
                </h3>
                <p className="text-emerald-50 text-base max-w-2xl">
                   {paretoText} Enfocar esfuerzos en estas categorías maximizará el impacto comercial.
                </p>
             </div>
             <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20 min-w-[200px] text-center">
                <div className="text-3xl font-bold">{(categoriesWithShare[0]?.share || 0).toFixed(1)}%</div>
                <div className="text-xs text-emerald-100 uppercase tracking-wider">Share de la Categoría Líder</div>
                <div className="text-sm font-medium mt-1 truncate max-w-[180px] mx-auto">{categoriesWithShare[0]?.categoria}</div>
             </div>
          </div>
       </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white/60 dark:bg-slate-950/60 backdrop-blur-xl border-slate-200/60 dark:border-slate-800/60 shadow-lg hover:shadow-xl transition-all duration-300 group">
          <CardContent className="p-5">
            <div className="flex justify-between items-start mb-2">
               <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg group-hover:scale-110 transition-transform">
                  <Layers className="h-5 w-5 text-blue-600 dark:text-blue-400" />
               </div>
            </div>
            <div className="text-3xl font-bold text-slate-800 dark:text-slate-100">{data.stats.totalCategories}</div>
            <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">Categorías</div>
          </CardContent>
        </Card>

        <Card className="bg-white/60 dark:bg-slate-950/60 backdrop-blur-xl border-slate-200/60 dark:border-slate-800/60 shadow-lg hover:shadow-xl transition-all duration-300 group">
          <CardContent className="p-5">
            <div className="flex justify-between items-start mb-2">
               <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg group-hover:scale-110 transition-transform">
                  <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
               </div>
            </div>
            <div className="text-3xl font-bold text-slate-800 dark:text-slate-100">{(data.stats.totalAmount / 1000000).toFixed(1)}M</div>
            <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">Monto Total</div>
          </CardContent>
        </Card>

        <Card className="bg-white/60 dark:bg-slate-950/60 backdrop-blur-xl border-slate-200/60 dark:border-slate-800/60 shadow-lg hover:shadow-xl transition-all duration-300 group">
          <CardContent className="p-5">
            <div className="flex justify-between items-start mb-2">
               <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg group-hover:scale-110 transition-transform">
                  <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
               </div>
            </div>
            <div className="text-3xl font-bold text-slate-800 dark:text-slate-100">{data.stats.totalRecords.toLocaleString()}</div>
            <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">Registros Totales</div>
          </CardContent>
        </Card>

        <Card className="bg-white/60 dark:bg-slate-950/60 backdrop-blur-xl border-slate-200/60 dark:border-slate-800/60 shadow-lg hover:shadow-xl transition-all duration-300 group">
          <CardContent className="p-5">
            <div className="flex justify-between items-start mb-2">
               <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg group-hover:scale-110 transition-transform">
                  <ShoppingCart className="h-5 w-5 text-orange-600 dark:text-orange-400" />
               </div>
            </div>
            <div className="text-3xl font-bold text-slate-800 dark:text-slate-100">{data.rankings.length}</div>
            <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">Categorías Únicas</div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white/50 dark:bg-slate-950/50 backdrop-blur-xl border-slate-200/60 dark:border-slate-800/60 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg text-slate-800 dark:text-slate-200">Top 10 Categorías por Monto</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
              {renderGradients()}
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" horizontal={true} vertical={false} />
              <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis dataKey="name" type="category" width={180} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }} />
              <Bar dataKey="amount" name="Monto" fill="url(#colorCategoryAmount)" radius={[0, 6, 6, 0]} barSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="bg-white/50 dark:bg-slate-950/50 backdrop-blur-xl border-slate-200/60 dark:border-slate-800/60 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg text-slate-800 dark:text-slate-200">Detalle de Categorías (Total: {data.rankings.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.rankings.map((category, index) => (
              <div key={category.categoria} className="border border-slate-100 dark:border-slate-800 rounded-xl p-4 bg-white/40 dark:bg-slate-900/40 hover:bg-white/80 dark:hover:bg-slate-900/80 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                       <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-base">
                         #{index + 1} - {category.categoria}
                       </h3>
                       {index < top80Count && (
                          <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white border-none">Top 80%</Badge>
                       )}
                    </div>
                    
                    {/* Barra de progreso visual del share */}
                    <div className="w-full max-w-md h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mb-3 overflow-hidden">
                       <div 
                          className="h-full bg-emerald-500 rounded-full" 
                          style={{ width: `${(category.totalAmount / totalAmount) * 100}%` }} 
                       />
                    </div>

                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Badge variant="outline" className="text-xs border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                        {category.totalCatalogs} catálogos
                      </Badge>
                      <Badge variant="outline" className="text-xs border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                        {category.totalBrands} marcas
                      </Badge>
                      <Badge variant="outline" className="text-xs border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                        {category.totalSuppliers} proveedores
                      </Badge>
                      <Badge variant="outline" className="text-xs border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                        {category.totalOrders.toLocaleString()} órdenes
                      </Badge>
                      <Badge variant="secondary" className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                         Ticket Prom: S/ {(category.totalAmount / category.totalOrders).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right whitespace-nowrap pl-4">
                    <div className="text-xl font-bold text-green-600 dark:text-green-400">
                      S/ {(category.totalAmount / 1000000).toFixed(2)}M
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{category.totalUnits.toLocaleString()} unidades</div>
                    <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                       {((category.totalAmount / totalAmount) * 100).toFixed(1)}% Share
                    </div>
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
