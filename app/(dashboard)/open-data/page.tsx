import { Suspense } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Database, FileText, Eye, Calendar, AlertTriangle, TrendingUp, ArrowUpRight, FileSpreadsheet, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { createServerClient } from "@/lib/supabase-server"
import { BrandAlertsPreview } from "@/components/open-data/brand-alerts-preview"
import { SettingsDialog } from "./_components/settings-dialog"
import { OpenDataCatalog } from "@/types/open-data"

export const dynamic = "force-dynamic"

// Fallback data in case DB is empty
const DEFAULT_ACUERDOS_MARCO: OpenDataCatalog[] = [
  {
    id: "EXT-CE-2024-11",
    name: "Mobiliario en General",
    description: "Datos de compras de mobiliario y equipamiento para oficinas y espacios públicos",
    color: "from-blue-500 to-cyan-500",
    icon: "🪑",
    full_name: "EXT-CE-2024-11 MOBILIARIO EN GENERAL",
    status: "inactive",
  },
  {
    id: "EXT-CE-2025-11",
    name: "Mobiliario en General",
    description: "Acuerdo marco reemplazante para mobiliario en general (vigente 2025)",
    color: "from-blue-600 to-indigo-600",
    icon: "🪑",
    full_name: "EXT-CE-2025-11 MOBILIARIO EN GENERAL",
    status: "active",
  },
  {
    id: "EXT-CE-2024-12",
    name: "Tuberías y Acabados",
    description: "Acuerdo marco para materiales de construcción y acabados",
    color: "from-amber-500 to-orange-500",
    icon: "🔧",
    full_name: "EXT-CE-2024-12 TUBERIAS, PINTURAS, CERAMICOS, SANITARIOS, ACCESORIOS Y COMPLEMENTOS EN GENERAL",
    status: "active",
  },
  {
    id: "EXT-CE-2024-3",
    name: "Materiales de Limpieza",
    description: "Acuerdo marco para materiales e insumos de limpieza, papeles para aseo y limpieza",
    color: "from-emerald-500 to-green-600",
    icon: "🧹",
    full_name: "EXT-CE-2024-3 MATERIALES E INSUMOS DE LIMPIEZA, PAPELES PARA ASEO Y LIMPIEZA",
    status: "active",
  },
  {
    id: "EXT-CE-2024-16",
    name: "Accesorios Domésticos",
    description: "Accesorios domésticos y bienes para usos diversos en instituciones públicas",
    color: "from-teal-500 to-emerald-500",
    icon: "🏠",
    full_name: "EXT-CE-2024-16 ACCESORIOS DOMÉSTICOS Y BIENES PARA USOS DIVERSOS",
    status: "active",
  },
  {
    id: "EXT-CE-2024-26",
    name: "Jardinería y Agricultura",
    description: "Máquinas, equipos y herramientas para jardinería, silvicultura y agricultura",
    color: "from-orange-500 to-red-500",
    icon: "🌱",
    full_name: "EXT-CE-2024-26 MAQUINAS, EQUIPOS Y HERRAMIENTAS PARA JARDINERIA, SILVICULTURA Y AGRICULTURA",
    status: "active",
  },
]

async function getOpenDataStats() {
  const supabase = createServerClient()

  try {
    // 1. Fetch Global Stats
    const { count: totalCount } = await supabase
      .from("open_data_entries")
      .select("*", { count: "exact", head: true })

    // 2. Fetch Configuration (Year)
    const { data: yearData } = await supabase
      .from("system_config")
      .select("value")
      .eq("key", "current_fiscal_year")
      .single()

    // 3. Fetch Catalogs
    const { data: dbCatalogs } = await supabase
      .from("open_data_catalogs")
      .select("*")
      .order("created_at", { ascending: false })

    // Use DB data or Fallback
    const currentYear = yearData?.value || "2026"
    const catalogs = (dbCatalogs && dbCatalogs.length > 0)
      ? dbCatalogs as OpenDataCatalog[]
      : DEFAULT_ACUERDOS_MARCO

    // 4. Calculate stats for each catalog
    const agreementsPromises = catalogs.map(async (acuerdo) => {
      const { count } = await supabase
        .from("open_data_entries")
        .select("*", { count: "exact", head: true })
        .eq("codigo_acuerdo_marco", acuerdo.id)

      return {
        id: acuerdo.id,
        count: count || 0
      }
    })

    const results = await Promise.all(agreementsPromises)
    const acuerdosCount: Record<string, number> = {}
    results.forEach(r => acuerdosCount[r.id] = r.count)

    return {
      totalRecords: totalCount || 0,
      acuerdosCount,
      catalogs,
      currentYear
    }

  } catch (error) {
    console.warn("Error fetching open data stats, using fallback", error)
    return {
      totalRecords: 0,
      acuerdosCount: {},
      catalogs: DEFAULT_ACUERDOS_MARCO,
      currentYear: "2026"
    }
  }
}

function OpenDataStatsCard({ stats, totalRecords, year, totalCatalogs }: { stats: any, totalRecords: number, year: string, totalCatalogs: number }) {
  return (
    <Card className="border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl shadow-sm mb-8 overflow-hidden">
      <div className="absolute top-0 right-0 p-3 opacity-10">
        <Database className="w-32 h-32" />
      </div>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Database className="h-5 w-5 text-blue-500" />
          Estadísticas Generales
        </CardTitle>
        <CardDescription>Resumen de datos procesados del sistema</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex flex-col items-center justify-center p-6 bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 backdrop-blur-sm group hover:scale-105 transition-transform duration-300">
            <div className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">
              {totalRecords.toLocaleString()}
            </div>
            <div className="text-sm font-medium text-slate-600 dark:text-slate-400">Total de Registros</div>
          </div>
          <div className="flex flex-col items-center justify-center p-6 bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 backdrop-blur-sm group hover:scale-105 transition-transform duration-300">
            <div className="text-4xl font-bold text-indigo-600 dark:text-indigo-400 mb-2">{totalCatalogs}</div>
            <div className="text-sm font-medium text-slate-600 dark:text-slate-400">Acuerdos Marco</div>
          </div>
          <div className="flex flex-col items-center justify-center p-6 bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 backdrop-blur-sm group hover:scale-105 transition-transform duration-300">
            <div className="flex items-center gap-2 text-4xl font-bold text-emerald-600 dark:text-emerald-400 mb-2">
              <Calendar className="h-8 w-8" />
              {year}
            </div>
            <div className="text-sm font-medium text-slate-600 dark:text-slate-400">Año Vigente</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function AcuerdoMarcoCard({ acuerdo, count }: { acuerdo: OpenDataCatalog; count: number }) {
  const isAvailable = count > 0 // This logic could change if we want to show everything
  const isActive = acuerdo.status === "active"

  return (
    <Link href={`/open-data/${encodeURIComponent(acuerdo.full_name)}`} className={isActive ? "block h-full" : "block h-full cursor-pointer"}>
      <Card
        className={`group relative h-full transition-all duration-300 overflow-hidden border-slate-200/60 dark:border-slate-800/60 ${isActive
          ? "hover:shadow-xl hover:-translate-y-1 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md"
          : "bg-slate-50/50 dark:bg-slate-900/20 grayscale opacity-80 hover:opacity-100 hover:grayscale-0"
          }`}
      >
        <div className={`absolute inset-0 bg-gradient-to-br ${acuerdo.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />

        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${acuerdo.color} flex items-center justify-center text-2xl shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform duration-300`}>
              {acuerdo.icon}
            </div>
            <div className="flex flex-col gap-2 items-end">
              {!isActive && (
                <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200">
                  Histórico
                </Badge>
              )}
              {isActive && (
                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-0">
                  Activo
                </Badge>
              )}
            </div>
          </div>
          <CardTitle className="mt-4 text-lg font-bold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {acuerdo.name}
          </CardTitle>
          <CardDescription className="line-clamp-2 min-h-[40px]">
            {acuerdo.description}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800/50">
            <div className="flex flex-col">
              <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Registros</span>
              <span className="text-lg font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                {count.toLocaleString()}
                <FileText className="h-3 w-3 text-slate-400" />
              </span>
            </div>

            <Button
              size="sm"
              variant={isActive ? "default" : "secondary"}
              className={`rounded-full px-4 ${isActive ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900" : ""}`}
            >
              {isActive ? (
                <>
                  Ver Datos <ArrowUpRight className="ml-1 h-3 w-3" />
                </>
              ) : (
                "Consultar"
              )}
            </Button>
          </div>
          <div className="mt-3 text-[10px] text-slate-400 font-mono truncate px-1">
            {acuerdo.id}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

export default async function OpenDataPage() {
  const { catalogs, currentYear, totalRecords, acuerdosCount } = await getOpenDataStats()

  return (
    <div className="w-full p-6 space-y-8 pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
            Datos Abiertos
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl">
            Transparencia en contrataciones públicas. Accede y analiza la información detallada de los Acuerdos Marco {currentYear}.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SettingsDialog initialConfig={{ year: currentYear, catalogs }} />
          <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 transition-all hover:scale-105">
            <Link href="/open-data/upload">
              <Database className="h-4 w-4 mr-2" />
              Subir Nuevo Dataset
            </Link>
          </Button>
        </div>
      </div>

      <Suspense
        fallback={
          <Card className="mb-6 bg-white/50 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-1/4"></div>
                <div className="grid grid-cols-3 gap-6">
                  <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
                  <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
                  <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        }
      >
        <OpenDataStatsCard
          stats={acuerdosCount}
          totalRecords={totalRecords}
          year={currentYear}
          totalCatalogs={catalogs.length}
        />
      </Suspense>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-1 bg-blue-500 rounded-full" />
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Catálogo de Acuerdos</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {catalogs.map((acuerdo) => (
            <AcuerdoMarcoCard key={acuerdo.id} acuerdo={acuerdo} count={acuerdosCount[acuerdo.id] || 0} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12">
        {/* Brand Alerts Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <AlertTriangle className="h-6 w-6 text-amber-500" />
                Alertas de Marca
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Monitoreo en tiempo real de marcas estratégicas
              </p>
            </div>
            <Button variant="outline" asChild className="hover:bg-amber-50 dark:hover:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400">
              <Link href="/open-data/brand-alerts">
                Ver Todo
              </Link>
            </Button>
          </div>
          <div className="bg-white/50 dark:bg-slate-900/50 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 p-4 backdrop-blur-sm">
            <Suspense fallback={<div className="p-4 text-center text-slate-500">Cargando alertas...</div>}>
              <BrandAlertsPreview />
            </Suspense>
          </div>
        </div>

        {/* Rankings Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <TrendingUp className="h-6 w-6 text-purple-500" />
                Rankings de Mercado
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Análisis de tendencias y competidores
              </p>
            </div>
            <Button variant="outline" asChild className="hover:bg-purple-50 dark:hover:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-400">
              <Link href="/open-data/rankings">
                Explorar
              </Link>
            </Button>
          </div>

          <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-slate-900 dark:to-slate-900 border-purple-100 dark:border-slate-800">
            <CardContent className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <Link href="/open-data/rankings?tab=products" className="group p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm hover:shadow-md transition-all hover:scale-[1.02] border border-purple-100 dark:border-slate-700">
                  <div className="text-2xl mb-2 group-hover:scale-105 transition-transform">🏆</div>
                  <div className="font-bold text-slate-800 dark:text-slate-200">Productos Top</div>
                  <div className="text-xs text-slate-500">Más vendidos por monto</div>
                </Link>
                <Link href="/open-data/rankings?tab=suppliers" className="group p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm hover:shadow-md transition-all hover:scale-[1.02] border border-purple-100 dark:border-slate-700">
                  <div className="text-2xl mb-2 group-hover:scale-105 transition-transform">🏢</div>
                  <div className="font-bold text-slate-800 dark:text-slate-200">Proveedores</div>
                  <div className="text-xs text-slate-500">Líderes del mercado</div>
                </Link>
                <Link href="/open-data/rankings?tab=entities" className="group p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm hover:shadow-md transition-all hover:scale-[1.02] border border-purple-100 dark:border-slate-700">
                  <div className="text-2xl mb-2 group-hover:scale-105 transition-transform">🏛️</div>
                  <div className="font-bold text-slate-800 dark:text-slate-200">Entidades</div>
                  <div className="text-xs text-slate-500">Mayores compradores</div>
                </Link>
                <Link href="/open-data/rankings?tab=trends" className="group p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm hover:shadow-md transition-all hover:scale-[1.02] border border-purple-100 dark:border-slate-700">
                  <div className="text-2xl mb-2 group-hover:scale-105 transition-transform">📈</div>
                  <div className="font-bold text-slate-800 dark:text-slate-200">Tendencias</div>
                  <div className="text-xs text-slate-500">Análisis mensual</div>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-8">
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-900 border-blue-100 dark:border-slate-800">
          <CardContent className="p-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                  <FileSpreadsheet className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    Análisis Semanal de Ventas
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Módulo de inteligencia de negocios
                  </p>
                </div>
              </div>
              <p className="text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
                Genera informes automáticos subiendo tus archivos Excel/CSV de ventas.
                Analiza tu participación de mercado, competidores y evolución de precios
                semana a semana.
              </p>
              <div className="flex gap-4 pt-2">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Comparativa Competencia
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Análisis de Precios
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Share de Mercado
                </div>
              </div>
            </div>

            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 whitespace-nowrap min-w-[200px]" asChild>
              <Link href="/open-data/weekly-analysis">
                Comenzar Análisis
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 mt-12">
        <CardContent className="p-8">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="flex-1 space-y-4">
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">Sobre los Acuerdos Marco</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Los Acuerdos Marco son una modalidad de contratación que permite a las entidades públicas adquirir bienes y servicios de manera ágil y eficiente. A través de este portal de Datos Abiertos, ATLAS proporciona transparencia total sobre las transacciones realizadas, permitiendo a proveedores y ciudadanos analizar el comportamiento del mercado público.
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                <Badge variant="outline" className="bg-white dark:bg-slate-800">Transparencia</Badge>
                <Badge variant="outline" className="bg-white dark:bg-slate-800">Eficiencia</Badge>
                <Badge variant="outline" className="bg-white dark:bg-slate-800">Datos en Tiempo Real</Badge>
              </div>
            </div>
            <div className="w-full md:w-1/3 bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <h4 className="font-semibold mb-4 text-slate-800 dark:text-slate-200">Enlaces Rápidos</h4>
              <ul className="space-y-3 text-sm">
                <li>
                  <Link href="https://www.perucompras.gob.pe" target="_blank" className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-2">
                    <ArrowUpRight className="h-3 w-3" /> Perú Compras Oficial
                  </Link>
                </li>
                <li>
                  <Link href="/documentation" className="text-slate-600 dark:text-slate-400 hover:text-blue-600 transition-colors flex items-center gap-2">
                    <FileText className="h-3 w-3" /> Documentación API
                  </Link>
                </li>
                <li>
                  <Link href="/support" className="text-slate-600 dark:text-slate-400 hover:text-blue-600 transition-colors flex items-center gap-2">
                    <Eye className="h-3 w-3" /> Reportar Incidencia
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
