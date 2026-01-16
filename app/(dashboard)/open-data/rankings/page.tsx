import { Suspense } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Package, Award, BarChart3, FolderOpen, Filter, Download, Printer, LineChart, PieChart, TrendingUp, Target, Map, MapPin, Building2, Truck } from "lucide-react"
import Link from "next/link"
import { RankingsByCatalog } from "@/components/open-data/rankings-by-catalog"
import { RankingsByAgreement } from "@/components/open-data/rankings-by-agreement"
import { RankingsByCategory } from "@/components/open-data/rankings-by-category"
import BrandRankings from "@/components/open-data/brand-rankings"
import { MarketTrendChart } from "@/components/open-data/market-trend-chart"
import { OpportunityMatrix } from "@/components/open-data/opportunity-matrix"
import { MarketStatsDashboard } from "@/components/open-data/market-stats-dashboard"
import { GeographicHeatmap } from "@/components/open-data/geographic-heatmap"
import { Leaderboard } from "@/components/open-data/leaderboard"

import { getMarketStats, type Period } from "@/lib/open-data"

interface PageProps {
  searchParams: Promise<{
    period?: string
    tab?: string
    view?: string
  }>
}

export default async function RankingsPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams
  const period = (resolvedSearchParams.period || "6months") as Period
  const tab = resolvedSearchParams.tab || "overview"
  const view = resolvedSearchParams.view || "executive" // 'executive' or 'analyst'

  // Fetch initial stats for the Executive Dashboard DIRECTLY (No Fetch API)
  const marketStats = await getMarketStats(period)

  // === FETCH DE MARCAS (solo cuando sea necesario) ===
  let brandData = null
  if (tab === "brands") {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/open-data/brand-rankings?period=${period}`,
        { cache: "no-store" }
      )
      if (res.ok) {
        const json = await res.json()
        brandData = json.data
      }
    } catch (e) {
      console.error("Error fetching brands:", e)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-[1600px] space-y-8">
      {/* Top Navigation: Executive vs Analyst */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
            Inteligencia de Mercado
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Plataforma estratégica de compras públicas
          </p>
        </div>
        
        <div className="bg-slate-100 dark:bg-slate-900 p-1 rounded-xl flex gap-1">
            <Link href={`/open-data/rankings?period=${period}&view=executive`}>
                <Button variant={view === "executive" ? "white" : "ghost"} className={`rounded-lg ${view === "executive" ? "shadow-sm bg-white dark:bg-slate-800 text-indigo-600" : "text-slate-500"}`}>
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Vista Ejecutiva
                </Button>
            </Link>
            <Link href={`/open-data/rankings?period=${period}&view=analyst`}>
                <Button variant={view === "analyst" ? "white" : "ghost"} className={`rounded-lg ${view === "analyst" ? "shadow-sm bg-white dark:bg-slate-800 text-indigo-600" : "text-slate-500"}`}>
                    <LineChart className="h-4 w-4 mr-2" />
                    Vista de Analista
                </Button>
            </Link>
        </div>
      </div>

      {/* Common Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-1 bg-slate-100/50 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-800/60 backdrop-blur-sm">
        <div className="flex items-center gap-2 px-3 py-2">
          <Filter className="h-4 w-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Periodo de Análisis:</span>
        </div>
        <div className="flex gap-1 p-1">
          {[
            { label: "Trimestral", value: "3months" },
            { label: "Semestral", value: "6months" },
            { label: "Anual", value: "1year" }
          ].map((opt) => (
            <Link key={opt.value} href={`/open-data/rankings?period=${opt.value}&view=${view}&tab=${tab}`}>
              <Button 
                variant={period === opt.value ? "secondary" : "ghost"} 
                size="sm"
                className={`rounded-lg text-xs ${period === opt.value ? "bg-white dark:bg-slate-700 shadow-sm" : "text-slate-500"}`}
              >
                {opt.label}
              </Button>
            </Link>
          ))}
        </div>
      </div>

      {/* === EXECUTIVE VIEW === */}
      {view === "executive" && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* 1. Market Pulse & Trends */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <MarketTrendChart period={period} />
                </div>
                <div className="lg:col-span-1">
                    <MarketStatsDashboard />
                </div>
            </div>

            {/* 2. Geographic & Leaderboards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                    <GeographicHeatmap data={marketStats?.topRegions || []} />
                </div>
                <div className="lg:col-span-2">
                    <Leaderboard 
                        entities={marketStats?.topEntities || []} 
                        suppliers={marketStats?.topSuppliers || []} 
                    />
                </div>
            </div>
        </div>
      )}

      {/* === ANALYST VIEW === */}
      {view === "analyst" && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Tabs value={tab} className="w-full" defaultValue="overview">
                <div className="flex items-center justify-between mb-6">
                <TabsList className="bg-slate-100 dark:bg-slate-800">
                    <Link href={`/open-data/rankings?period=${period}&view=analyst&tab=overview`}>
                    <TabsTrigger value="overview" className="gap-2">
                        <Target className="h-4 w-4" /> Matriz de Oportunidad
                    </TabsTrigger>
                    </Link>
                    <Link href={`/open-data/rankings?period=${period}&view=analyst&tab=brands`}>
                    <TabsTrigger value="brands" className="gap-2">
                        <Award className="h-4 w-4" /> Análisis de Marcas
                    </TabsTrigger>
                    </Link>
                    <Link href={`/open-data/rankings?period=${period}&view=categories`}>
                    <TabsTrigger value="categories" className="gap-2">
                        <BarChart3 className="h-4 w-4" /> Categorías
                    </TabsTrigger>
                    </Link>
                    <Link href={`/open-data/rankings?period=${period}&view=analyst&tab=catalogs`}>
                    <TabsTrigger value="catalogs" className="gap-2">
                        <Package className="h-4 w-4" /> Catálogos
                    </TabsTrigger>
                    </Link>
                    <Link href={`/open-data/rankings?period=${period}&view=analyst&tab=agreements`}>
                    <TabsTrigger value="agreements" className="gap-2">
                        <FolderOpen className="h-4 w-4" /> Acuerdos Marco
                    </TabsTrigger>
                    </Link>
                </TabsList>
                </div>

                <TabsContent value="overview" className="space-y-6">
                    <OpportunityMatrix period={period} />
                </TabsContent>

                <TabsContent value="categories" className="space-y-6">
                    <Suspense fallback={<div>Cargando...</div>}><RankingsByCategory period={period} /></Suspense>
                </TabsContent>

                <TabsContent value="brands" className="space-y-6">
                    {brandData ? <BrandRankings data={brandData} /> : <div>Cargando...</div>}
                </TabsContent>

                <TabsContent value="catalogs" className="space-y-6">
                    <Suspense fallback={<div>Cargando...</div>}><RankingsByCatalog period={period} /></Suspense>
                </TabsContent>

                <TabsContent value="agreements" className="space-y-6">
                    <Suspense fallback={<div>Cargando...</div>}><RankingsByAgreement period={period} /></Suspense>
                </TabsContent>
            </Tabs>
        </div>
      )}
    </div>
  )
}
