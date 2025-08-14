import { Suspense } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TrendingUp, BarChart3, Package, Building2, Award, Target } from "lucide-react"
import Link from "next/link"
import { MarketStatsDashboard } from "@/components/open-data/market-stats-dashboard"
import { TopProductsByAgreement } from "@/components/open-data/top-products-by-agreement"
import { TopProductsByCatalog } from "@/components/open-data/top-products-by-catalog"
import { CategoryDistribution } from "@/components/open-data/category-distribution"
import { PriceHistoryAnalysis } from "@/components/open-data/price-history-analysis"
import { SupplierPerformance } from "@/components/open-data/supplier-performance"

interface PageProps {
  searchParams: Promise<{
    period?: string
  }>
}

export default async function MarketAnalyticsPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams
  const period = resolvedSearchParams.period || "6months"

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200 mb-2">Análisis de Mercado</h1>
          <p className="text-slate-600 dark:text-slate-400 text-lg">
            Métricas y estadísticas clave del mercado de compras públicas
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/open-data/rankings?period=3months`}>
            <Button variant={period === "3months" ? "default" : "outline"} size="sm">
              3 Meses
            </Button>
          </Link>
          <Link href={`/open-data/rankings?period=6months`}>
            <Button variant={period === "6months" ? "default" : "outline"} size="sm">
              6 Meses
            </Button>
          </Link>
          <Link href={`/open-data/rankings?period=1year`}>
            <Button variant={period === "1year" ? "default" : "outline"} size="sm">
              1 Año
            </Button>
          </Link>
          <Link href="/open-data">
            <Button variant="outline">Volver a Datos Abiertos</Button>
          </Link>
        </div>
      </div>

      {/* Métricas Generales */}
      <Suspense fallback={<div>Cargando métricas generales...</div>}>
        <MarketStatsDashboard period={period} />
      </Suspense>

      {/* Grid de Análisis Principales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Productos más vendidos por Acuerdo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-blue-500" />
              Top Productos por Acuerdo Marco
            </CardTitle>
            <CardDescription>Los productos más vendidos organizados por acuerdo marco</CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div>Cargando productos por acuerdo...</div>}>
              <TopProductsByAgreement period={period} />
            </Suspense>
          </CardContent>
        </Card>

        {/* Productos más vendidos por Catálogo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-green-500" />
              Top Productos por Catálogo
            </CardTitle>
            <CardDescription>Los productos más vendidos organizados por catálogo</CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div>Cargando productos por catálogo...</div>}>
              <TopProductsByCatalog period={period} />
            </Suspense>
          </CardContent>
        </Card>
      </div>

      {/* Distribución por Categorías */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-purple-500" />
            Distribución por Categorías
          </CardTitle>
          <CardDescription>Número de productos y volumen de ventas por categoría</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div>Cargando distribución por categorías...</div>}>
            <CategoryDistribution period={period} />
          </Suspense>
        </CardContent>
      </Card>

      {/* Grid de Análisis Secundarios */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Análisis de Precios */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-orange-500" />
              Análisis de Precios
            </CardTitle>
            <CardDescription>Histórico y tendencias de precios de productos principales</CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div>Cargando análisis de precios...</div>}>
              <PriceHistoryAnalysis period={period} />
            </Suspense>
          </CardContent>
        </Card>

        {/* Performance de Proveedores */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-red-500" />
              Performance de Proveedores
            </CardTitle>
            <CardDescription>Métricas de rendimiento de los principales proveedores</CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div>Cargando performance de proveedores...</div>}>
              <SupplierPerformance period={period} />
            </Suspense>
          </CardContent>
        </Card>
      </div>

      {/* Insights y Recomendaciones */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-500" />
            Insights del Mercado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">Oportunidades de Mercado</h4>
              <p className="text-sm text-blue-600 dark:text-blue-300">
                Identifica productos con alta demanda pero pocos proveedores
              </p>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
              <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2">Tendencias de Precios</h4>
              <p className="text-sm text-green-600 dark:text-green-300">
                Monitorea variaciones de precios para optimizar compras
              </p>
            </div>
            <div className="p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
              <h4 className="font-semibold text-purple-800 dark:text-purple-200 mb-2">Eficiencia de Proveedores</h4>
              <p className="text-sm text-purple-600 dark:text-purple-300">
                Evalúa el rendimiento y confiabilidad de proveedores
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
