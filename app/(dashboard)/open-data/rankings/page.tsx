import { Suspense } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TrendingUp, BarChart3, Package, Building2, Users, Award } from "lucide-react"
import Link from "next/link"
import { RankingsFilters } from "@/components/open-data/rankings-filters"
import { RankingsTable } from "@/components/open-data/rankings-table"
import { RankingsStats } from "@/components/open-data/rankings-stats"

interface PageProps {
  searchParams: Promise<{
    type?: string
    acuerdo?: string
    categoria?: string
    catalogo?: string
    fecha_desde?: string
    fecha_hasta?: string
    limit?: string
  }>
}

const RANKING_TYPES = [
  {
    id: "productos",
    name: "Productos",
    description: "Productos más vendidos por monto total",
    icon: Package,
    color: "bg-blue-500",
  },
  {
    id: "categorias",
    name: "Categorías",
    description: "Categorías con mayor volumen de ventas",
    icon: BarChart3,
    color: "bg-green-500",
  },
  {
    id: "catalogos",
    name: "Catálogos",
    description: "Catálogos más utilizados en compras",
    icon: Award,
    color: "bg-purple-500",
  },
  {
    id: "marcas",
    name: "Marcas",
    description: "Marcas con mayor participación",
    icon: TrendingUp,
    color: "bg-orange-500",
  },
  {
    id: "proveedores",
    name: "Proveedores",
    description: "Proveedores con mayores ventas",
    icon: Building2,
    color: "bg-red-500",
  },
  {
    id: "entidades",
    name: "Entidades",
    description: "Entidades con mayor volumen de compras",
    icon: Users,
    color: "bg-indigo-500",
  },
]

export default async function RankingsPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams
  const currentType = resolvedSearchParams.type || "productos"
  const currentRankingType = RANKING_TYPES.find((type) => type.id === currentType) || RANKING_TYPES[0]

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200 mb-2">Rankings de Mercado</h1>
          <p className="text-slate-600 dark:text-slate-400 text-lg">
            Análisis de tendencias y productos más vendidos en compras públicas del Perú
          </p>
        </div>
        <Link href="/open-data">
          <Button variant="outline">Volver a Datos Abiertos</Button>
        </Link>
      </div>

      {/* Tipos de Ranking */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {RANKING_TYPES.map((type) => {
          const Icon = type.icon
          const isActive = currentType === type.id

          return (
            <Link
              key={type.id}
              href={`/open-data/rankings?type=${type.id}`}
              className={`block transition-all duration-200 hover:scale-105 ${isActive ? "ring-2 ring-blue-500" : ""}`}
            >
              <Card className={`h-full ${isActive ? "border-blue-500 bg-blue-50 dark:bg-blue-950" : ""}`}>
                <CardContent className="p-4 text-center">
                  <div
                    className={`w-12 h-12 rounded-lg ${type.color} flex items-center justify-center text-white mx-auto mb-3`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-semibold text-sm mb-1">{type.name}</h3>
                  <p className="text-xs text-muted-foreground">{type.description}</p>
                  {isActive && (
                    <Badge variant="secondary" className="mt-2 text-xs">
                      Activo
                    </Badge>
                  )}
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      {/* Estadísticas */}
      <Suspense fallback={<div>Cargando estadísticas...</div>}>
        <RankingsStats searchParams={resolvedSearchParams} />
      </Suspense>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <currentRankingType.icon className="h-5 w-5" />
            Filtros para {currentRankingType.name}
          </CardTitle>
          <CardDescription>{currentRankingType.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <RankingsFilters />
        </CardContent>
      </Card>

      {/* Tabla de Rankings */}
      <Card>
        <CardHeader>
          <CardTitle>Ranking de {currentRankingType.name}</CardTitle>
          <CardDescription>
            Los {currentRankingType.name.toLowerCase()} ordenados por monto total de ventas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div>Cargando rankings...</div>}>
            <RankingsTable searchParams={resolvedSearchParams} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}
