import { Suspense } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Package, Award, BarChart3, FolderOpen, Filter, Download, Printer, LineChart, PieChart, TrendingUp, Target } from "lucide-react"
import Link from "next/link"
import { RankingsByCatalog } from "@/components/open-data/rankings-by-catalog"
import { RankingsByAgreement } from "@/components/open-data/rankings-by-agreement"
import { RankingsByCategory } from "@/components/open-data/rankings-by-category"
import BrandRankings from "@/components/open-data/brand-rankings"
import { MarketTrendChart } from "@/components/open-data/market-trend-chart"
import { OpportunityMatrix } from "@/components/open-data/opportunity-matrix"
import { MarketStatsDashboard } from "@/components/open-data/market-stats-dashboard"

interface PageProps {
  searchParams: Promise<{
    period?: string
    tab?: string
  }>
}

export default async function RankingsPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams
  const period = resolvedSearchParams.period || "6months"
  const tab = resolvedSearchParams.tab || "overview"

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
      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
            Inteligencia de Mercado
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Análisis estratégico de compras públicas y tendencias de consumo.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2 hidden sm:flex">
            <Printer className="h-4 w-4" />
            Imprimir
          </Button>
          <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20">
            <Download className="h-4 w-4" />
            Exportar Informe
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
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
            <Link key={opt.value} href={`/open-data/rankings?period=${opt.value}&tab=${tab}`}>
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

      {/* Overview Section - Always Visible */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
           <MarketTrendChart period={period} />
        </div>
        <div className="lg:col-span-1">
           <MarketStatsDashboard />
        </div>
      </div>

      {/* Advanced Analysis Tabs */}
      <Tabs value={tab} className="w-full" defaultValue="overview">
        <div className="flex items-center justify-between mb-6">
           <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <LineChart className="h-5 w-5 text-indigo-500" />
              Explorador de Datos
           </h2>
           <TabsList className="bg-slate-100 dark:bg-slate-800">
             <Link href={`/open-data/rankings?period=${period}&tab=overview`}>
               <TabsTrigger value="overview" className="gap-2">
                 <Target className="h-4 w-4" /> Oportunidades
               </TabsTrigger>
             </Link>
             <Link href={`/open-data/rankings?period=${period}&tab=brands`}>
               <TabsTrigger value="brands" className="gap-2">
                 <Award className="h-4 w-4" /> Marcas
               </TabsTrigger>
             </Link>
             <Link href={`/open-data/rankings?period=${period}&tab=categories`}>
               <TabsTrigger value="categories" className="gap-2">
                 <BarChart3 className="h-4 w-4" /> Categorías
               </TabsTrigger>
             </Link>
             <Link href={`/open-data/rankings?period=${period}&tab=catalogs`}>
               <TabsTrigger value="catalogs" className="gap-2">
                 <Package className="h-4 w-4" /> Catálogos
               </TabsTrigger>
             </Link>
             <Link href={`/open-data/rankings?period=${period}&tab=agreements`}>
               <TabsTrigger value="agreements" className="gap-2">
                 <FolderOpen className="h-4 w-4" /> Acuerdos
               </TabsTrigger>
             </Link>
           </TabsList>
        </div>

        {/* Opportunity Matrix Tab (Default) */}
        <TabsContent value="overview" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
           <div className="grid grid-cols-1 gap-6">
              <OpportunityMatrix period={period} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <Card className="bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/20">
                    <CardHeader>
                       <CardTitle className="text-emerald-700 dark:text-emerald-400 text-lg">¿Cómo leer este gráfico?</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-emerald-800 dark:text-emerald-300 space-y-2">
                       <p>• <strong>Eje X (Volumen):</strong> Cantidad de órdenes de compra emitidas.</p>
                       <p>• <strong>Eje Y (Ticket):</strong> Valor promedio por cada orden (S/).</p>
                       <p>• <strong>Tamaño (Monto):</strong> Monto total transaccionado en el periodo.</p>
                       <p className="pt-2 font-semibold">Busque burbujas grandes en la parte superior derecha: Alta demanda y alto valor.</p>
                    </CardContent>
                 </Card>
                 <Card className="bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-900/20">
                    <CardHeader>
                       <CardTitle className="text-indigo-700 dark:text-indigo-400 text-lg">Estrategia Sugerida</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-indigo-800 dark:text-indigo-300 space-y-2">
                       <p>• <strong>Cuadrante Superior Derecho:</strong> Productos "Estrella". Priorizar stock y marketing.</p>
                       <p>• <strong>Cuadrante Inferior Derecho:</strong> Productos de "Flujo". Alta rotación, margen ajustado. Optimizar logística.</p>
                       <p>• <strong>Cuadrante Superior Izquierdo:</strong> Productos de "Nicho". Baja rotación, alto margen. Venta consultiva.</p>
                    </CardContent>
                 </Card>
              </div>
           </div>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Suspense fallback={<div className="h-64 flex items-center justify-center bg-slate-50 dark:bg-slate-900 rounded-xl">Cargando análisis de categorías...</div>}>
            <RankingsByCategory period={period} />
          </Suspense>
        </TabsContent>

        {/* Brands Tab */}
        <TabsContent value="brands" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {brandData ? (
            <Suspense fallback={<div className="h-64 flex items-center justify-center bg-slate-50 dark:bg-slate-900 rounded-xl">Cargando análisis de marcas...</div>}>
              <BrandRankings data={brandData} />
            </Suspense>
          ) : (
            <div className="h-64 flex items-center justify-center bg-slate-50 dark:bg-slate-900 rounded-xl text-slate-500">
              Cargando datos de marcas...
            </div>
          )}
        </TabsContent>

        {/* Catalogs Tab */}
        <TabsContent value="catalogs" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Suspense fallback={<div className="h-64 flex items-center justify-center bg-slate-50 dark:bg-slate-900 rounded-xl">Cargando análisis de catálogos...</div>}>
            <RankingsByCatalog period={period} />
          </Suspense>
        </TabsContent>

        {/* Agreements Tab */}
        <TabsContent value="agreements" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Suspense fallback={<div className="h-64 flex items-center justify-center bg-slate-50 dark:bg-slate-900 rounded-xl">Cargando análisis de acuerdos...</div>}>
            <RankingsByAgreement period={period} />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  )
}
