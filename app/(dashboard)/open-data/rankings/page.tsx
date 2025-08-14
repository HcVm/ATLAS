import { Suspense } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Package, Award, BarChart3, TrendingUp, Target } from "lucide-react"
import Link from "next/link"
import { RankingsByCatalog } from "@/components/open-data/rankings-by-catalog"
import { BrandRankings } from "@/components/open-data/brand-rankings"
import { CatalogPerformance } from "@/components/open-data/catalog-performance"

interface PageProps {
  searchParams: Promise<{
    period?: string
  }>
}

export default async function RankingsPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams
  const period = resolvedSearchParams.period || "6months"

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200 mb-2">Rankings de Productos y Marcas</h1>
          <p className="text-slate-600 dark:text-slate-400 text-lg">
            Rankings organizados por catálogo, número de parte y performance de marcas
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/open-data/rankings?period=3months`}>
            <Button variant={period === "3months" ? "default" : "outline"} size="sm">
              3 Meses
            </Button>
          </Link>
          <Link href={`/dashboard/open-data/rankings?period=6months`}>
            <Button variant={period === "6months" ? "default" : "outline"} size="sm">
              6 Meses
            </Button>
          </Link>
          <Link href={`/dashboard/open-data/rankings?period=1year`}>
            <Button variant={period === "1year" ? "default" : "outline"} size="sm">
              1 Año
            </Button>
          </Link>
          <Link href="/dashboard/open-data">
            <Button variant="outline">Volver a Datos Abiertos</Button>
          </Link>
        </div>
      </div>

      {/* Rankings por Catálogo - Sección Principal */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-6 w-6 text-blue-500" />
            Rankings por Número de Parte - Organizados por Catálogo
          </CardTitle>
          <CardDescription>
            Productos más vendidos por unidades, organizados por código de catálogo y vinculados a acuerdos marco
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div>Cargando rankings por catálogo...</div>}>
            <RankingsByCatalog period={period} />
          </Suspense>
        </CardContent>
      </Card>

      {/* Grid de Análisis Secundarios */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rankings de Marcas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-green-500" />
              Rankings de Marcas
            </CardTitle>
            <CardDescription>Cuáles marcas venden más y qué productos específicos</CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div>Cargando rankings de marcas...</div>}>
              <BrandRankings period={period} />
            </Suspense>
          </CardContent>
        </Card>

        {/* Performance de Catálogos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-purple-500" />
              Performance de Catálogos
            </CardTitle>
            <CardDescription>Eficiencia y métricas de cada catálogo por acuerdo marco</CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div>Cargando performance de catálogos...</div>}>
              <CatalogPerformance period={period} />
            </Suspense>
          </CardContent>
        </Card>
      </div>

      {/* Métricas Clave */}
      <Card className="bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-950 dark:to-green-950">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            Métricas Clave del Período
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
              <div className="text-2xl font-bold text-blue-600 mb-1">Top 1</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Producto más vendido</div>
            </div>
            <div className="text-center p-4 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
              <div className="text-2xl font-bold text-green-600 mb-1">Top 1</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Marca líder</div>
            </div>
            <div className="text-center p-4 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
              <div className="text-2xl font-bold text-purple-600 mb-1">Top 1</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Catálogo más activo</div>
            </div>
            <div className="text-center p-4 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
              <div className="text-2xl font-bold text-orange-600 mb-1">Top 1</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Acuerdo marco líder</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Insights y Recomendaciones */}
      <Card className="border-l-4 border-l-green-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-500" />
            Insights de Rankings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">Productos Estrella</h4>
              <p className="text-sm text-blue-600 dark:text-blue-300">
                Identifica los números de parte con mayor demanda por catálogo
              </p>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
              <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2">Marcas Dominantes</h4>
              <p className="text-sm text-green-600 dark:text-green-300">
                Descubre qué marcas lideran cada categoría de productos
              </p>
            </div>
            <div className="p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
              <h4 className="font-semibold text-purple-800 dark:text-purple-200 mb-2">Catálogos Eficientes</h4>
              <p className="text-sm text-purple-600 dark:text-purple-300">
                Evalúa qué catálogos generan más ventas por acuerdo marco
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
