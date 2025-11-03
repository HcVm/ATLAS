import { Suspense } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Package, Award, BarChart3, FolderOpen, Filter } from "lucide-react"
import Link from "next/link"
import { RankingsByCatalog } from "@/components/open-data/rankings-by-catalog"
import { RankingsByAgreement } from "@/components/open-data/rankings-by-agreement"
import { RankingsByCategory } from "@/components/open-data/rankings-by-category"
import BrandRankings from "@/components/open-data/brand-rankings" // <-- IMPORT CORRECTO

interface PageProps {
  searchParams: Promise<{
    period?: string
    tab?: string
  }>
}

export default async function RankingsPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams
  const period = resolvedSearchParams.period || "6months"
  const tab = resolvedSearchParams.tab || "catalogs"

  // === FETCH DE MARCAS (solo cuando sea necesario) ===
  let brandData = null
  if (tab === "brands") {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/open-data/brand-rankings?period=${period}`,
      { cache: "no-store" }
    )
    if (res.ok) {
      const json = await res.json()
      brandData = json.data // <-- EXTRAER data
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-slate-800 dark:text-slate-200 mb-2">Rankings de Mercado</h1>
        <p className="text-slate-600 dark:text-slate-400 text-lg">
          Análisis detallado de 6,918+ registros: tendencias de compra, proveedores líderes, productos más demandados y
          categorías principales en contrataciones públicas.
        </p>
      </div>

      {/* Period Filter */}
      <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-5 w-5 text-slate-600 dark:text-slate-400" />
          <h2 className="font-semibold text-slate-800 dark:text-slate-200">Filtros de Período</h2>
        </div>
        <div className="flex gap-2 mb-6 flex-wrap">
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
            <Button variant="outline" className="ml-auto bg-transparent">
              Volver a Datos Abiertos
            </Button>
          </Link>
        </div>
      </div>

      {/* Tabs for Different Analysis Views */}
      <Tabs value={tab} className="w-full" defaultValue="catalogs">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <Link href={`/open-data/rankings?period=${period}&tab=catalogs`}>
            <TabsTrigger value="catalogs" asChild className="cursor-pointer flex items-center gap-2">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                <span className="hidden sm:inline">Catálogos</span>
              </div>
            </TabsTrigger>
          </Link>
          <Link href={`/open-data/rankings?period=${period}&tab=agreements`}>
            <TabsTrigger value="agreements" asChild className="cursor-pointer flex items-center gap-2">
              <div className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4" />
                <span className="hidden sm:inline">Acuerdos</span>
              </div>
            </TabsTrigger>
          </Link>
          <Link href={`/open-data/rankings?period=${period}&tab=categories`}>
            <TabsTrigger value="categories" asChild className="cursor-pointer flex items-center gap-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Categorías</span>
              </div>
            </TabsTrigger>
          </Link>
          <Link href={`/open-data/rankings?period=${period}&tab=brands`}>
            <TabsTrigger value="brands" asChild className="cursor-pointer flex items-center gap-2">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4" />
                <span className="hidden sm:inline">Marcas</span>
              </div>
            </TabsTrigger>
          </Link>
        </TabsList>

        {/* Catalogs Tab */}
        <TabsContent value="catalogs" className="space-y-6">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-6 w-6 text-blue-500" />
                Rankings por Catálogo
              </CardTitle>
              <CardDescription>
                Análisis detallado de productos por catálogo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div className="text-center py-8 text-slate-500">Cargando...</div>}>
                <RankingsByCatalog period={period} />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Agreements Tab */}
        <TabsContent value="agreements" className="space-y-6">
          <Card className="border-l-4 border-l-green-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="h-6 w-6 text-green-500" />
                Rankings por Acuerdo Marco
              </CardTitle>
              <CardDescription>
                Distribución y análisis de compras por cada acuerdo marco.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div className="text-center py-8 text-slate-500">Cargando...</div>}>
                <RankingsByAgreement period={period} />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-6">
          <Card className="border-l-4 border-l-purple-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-6 w-6 text-purple-500" />
                Rankings por Categoría
              </CardTitle>
              <CardDescription>
                Análisis de demanda y gasto por categoría de producto.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div className="text-center py-8 text-slate-500">Cargando...</div>}>
                <RankingsByCategory period={period} />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Brands Tab - CON FETCH Y DATA */}
        <TabsContent value="brands" className="space-y-6">
          <Card className="border-l-4 border-l-orange-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-6 w-6 text-orange-500" />
                Rankings de Marcas
              </CardTitle>
              <CardDescription>
                Cuáles marcas venden más en contrataciones públicas y qué productos específicos lideran.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {brandData ? (
                <Suspense fallback={<div className="text-center py-8 text-slate-500">Cargando...</div>}>
                  <BrandRankings data={brandData} />
                </Suspense>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <div className="text-lg">Cargando datos de marcas...</div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}