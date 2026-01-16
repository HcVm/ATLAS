"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { AlertCircle, FileText, Layers, ShoppingCart, DollarSign } from "lucide-react"

interface AgreementRanking {
  codigo_acuerdo_marco: string
  acuerdo_marco: string
  totalCatalogs: number
  totalCategories: number
  totalUnits: number
  totalAmount: number
  totalOrders: number
  avgOrderValue: number
}

interface RankingsByAgreementProps {
  period: string
}

const renderGradients = () => (
  <defs>
    <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
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

export function RankingsByAgreement({ period }: RankingsByAgreementProps) {
  const [data, setData] = useState<{
    rankings: AgreementRanking[]
    stats: any
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/open-data/rankings-by-agreement?period=${period}`)
        const result = await response.json()
        if (result.success) {
          setData(result.data)
          setError(null)
        } else {
          setError(result.error || "Error fetching data")
        }
      } catch (error) {
        console.error("[v0] Error fetching rankings by agreement:", error)
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

  const chartData = data.rankings.map((agreement) => ({
    name: agreement.codigo_acuerdo_marco,
    fullName: agreement.acuerdo_marco,
    amount: Math.round((agreement.totalAmount / 1000000) * 10) / 10,
    units: agreement.totalUnits,
  }))

  const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white/60 dark:bg-slate-950/60 backdrop-blur-xl border-slate-200/60 dark:border-slate-800/60 shadow-lg hover:shadow-xl transition-all duration-300 group">
          <CardContent className="p-5">
            <div className="flex justify-between items-start mb-2">
               <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg group-hover:scale-110 transition-transform">
                  <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
               </div>
            </div>
            <div className="text-3xl font-bold text-slate-800 dark:text-slate-100">{data.stats.totalAgreements}</div>
            <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">Acuerdos Marco</div>
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
                  <Layers className="h-5 w-5 text-purple-600 dark:text-purple-400" />
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
            <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">Acuerdos Únicos</div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white/50 dark:bg-slate-950/50 backdrop-blur-xl border-slate-200/60 dark:border-slate-800/60 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg text-slate-800 dark:text-slate-200">Acuerdos Marco - Top por Monto</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              {renderGradients()}
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} dy={10} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }} />
              <Bar dataKey="amount" name="Monto" fill="url(#colorAmount)" radius={[8, 8, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="bg-white/50 dark:bg-slate-950/50 backdrop-blur-xl border-slate-200/60 dark:border-slate-800/60 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg text-slate-800 dark:text-slate-200">Detalles por Acuerdo Marco</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.rankings.map((agreement) => (
              <div key={agreement.codigo_acuerdo_marco} className="border border-slate-100 dark:border-slate-800 rounded-xl p-4 bg-white/40 dark:bg-slate-900/40 hover:bg-white/80 dark:hover:bg-slate-900/80 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-lg">{agreement.codigo_acuerdo_marco}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">{agreement.acuerdo_marco}</p>
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      <Badge variant="outline" className="text-xs border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                        {agreement.totalCatalogs} catálogos
                      </Badge>
                      <Badge variant="outline" className="text-xs border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                        {agreement.totalCategories} categorías
                      </Badge>
                      <Badge variant="outline" className="text-xs border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                        {agreement.totalOrders.toLocaleString()} órdenes
                      </Badge>
                      <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-none">
                         Ticket Prom: S/ {(agreement.totalAmount / agreement.totalOrders).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right whitespace-nowrap pl-4">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      S/ {(agreement.totalAmount / 1000000).toFixed(2)}M
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{agreement.totalUnits.toLocaleString()} unidades</div>
                    <div className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mt-2 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded-lg inline-block">
                       S/ {(agreement.totalAmount / agreement.totalCatalogs / 1e6).toFixed(2)}M / cat
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
