import { Suspense } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Database, FileText, Eye, Calendar, AlertTriangle, TrendingUp } from "lucide-react"
import Link from "next/link"
import { createServerClient } from "@/lib/supabase-server"
import { BrandAlertsPreview } from "@/components/open-data/brand-alerts-preview"

// Definir los 3 acuerdos marco específicos
const ACUERDOS_MARCO = [
  {
    id: "EXT-CE-2024-11",
    name: "Mobiliario en General",
    description: "Datos de compras de mobiliario y equipamiento para oficinas y espacios públicos",
    color: "bg-blue-500",
    icon: "🪑",
    fullName: "EXT-CE-2024-11 MOBILIARIO EN GENERAL",
    status: "inactive", // Marcado como inactivo
  },
  {
    id: "EXT-CE-2025-11",
    name: "Mobiliario en General",
    description: "Acuerdo marco reemplazante para mobiliario en general (vigente 2025)",
    color: "bg-blue-600",
    icon: "🪑",
    fullName: "EXT-CE-2025-11 MOBILIARIO EN GENERAL",
    status: "active",
  },
  {
    id: "EXT-CE-2024-12",
    name: "Tuberías, Pinturas, Cerámicos, Sanitarios, Accesorios y Complementos",
    description: "Acuerdo marco para materiales de construcción y acabados",
    color: "bg-amber-500",
    icon: "🔧",
    fullName: "EXT-CE-2024-12 TUBERIAS, PINTURAS, CERAMICOS, SANITARIOS, ACCESORIOS Y COMPLEMENTOS EN GENERAL",
    status: "active",
  },
  {
    id: "EXT-CE-2024-3",
    name: "Materiales e Insumos de Limpieza",
    description: "Acuerdo marco para materiales e insumos de limpieza, papeles para aseo y limpieza",
    color: "bg-green-600",
    icon: "🧹",
    fullName: "EXT-CE-2024-3 MATERIALES E INSUMOS DE LIMPIEZA, PAPELES PARA ASEO Y LIMPIEZA",
    status: "active",
  },
  {
    id: "EXT-CE-2024-16",
    name: "Accesorios Domésticos y Bienes Diversos",
    description: "Accesorios domésticos y bienes para usos diversos en instituciones públicas",
    color: "bg-green-500",
    icon: "🏠",
    fullName: "EXT-CE-2024-16 ACCESORIOS DOMÉSTICOS Y BIENES PARA USOS DIVERSOS",
    status: "active",
  },
  {
    id: "EXT-CE-2024-26",
    name: "Máquinas y Equipos de Jardinería",
    description: "Máquinas, equipos y herramientas para jardinería, silvicultura y agricultura",
    color: "bg-orange-500",
    icon: "🌱",
    fullName: "EXT-CE-2024-26 MAQUINAS, EQUIPOS Y HERRAMIENTAS PARA JARDINERIA, SILVICULTURA Y AGRICULTURA",
    status: "active",
  },
]

async function getOpenDataStats() {
  const supabase = createServerClient()

  try {
    const { count: totalCount, error: countError } = await supabase
      .from("open_data_entries")
      .select("*", { count: "exact", head: true })

    if (countError) {
      console.error("Error fetching total count:", countError)
    }

    const acuerdosCount: Record<string, number> = {}

    for (const acuerdo of ACUERDOS_MARCO) {
      const { count, error } = await supabase
        .from("open_data_entries")
        .select("*", { count: "exact", head: true })
        .eq("codigo_acuerdo_marco", acuerdo.id)

      if (error) {
        console.error(`Error fetching count for ${acuerdo.id}:`, error)
        acuerdosCount[acuerdo.id] = 0
      } else {
        acuerdosCount[acuerdo.id] = count || 0
      }
    }

    return {
      totalRecords: totalCount || 0,
      acuerdosDisponibles: Object.keys(acuerdosCount).filter((key) => acuerdosCount[key] > 0),
      acuerdosCount,
    }
  } catch (error) {
    console.error("Error in getOpenDataStats:", error)
    return { totalRecords: 0, acuerdosDisponibles: [], acuerdosCount: {} }
  }
}

function OpenDataStatsCard({ stats }: { stats: any }) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Estadísticas de Datos Abiertos
        </CardTitle>
        <CardDescription>Información general sobre los acuerdos marco disponibles</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <div className="text-2xl font-bold text-slate-700 dark:text-slate-200">
              {stats.totalRecords.toLocaleString()}
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">Total de Registros</div>
          </div>
          <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <div className="text-2xl font-bold text-slate-700 dark:text-slate-200">{ACUERDOS_MARCO.length}</div>
            <div className="text-sm text-slate-500 dark:text-slate-400">Acuerdos Marco</div>
          </div>
          <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <div className="text-2xl font-bold text-slate-700 dark:text-slate-200">
              <Calendar className="h-5 w-5 inline mr-1" />
              2025
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">Año Vigente</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function AcuerdoMarcoCard({ acuerdo, stats }: { acuerdo: any; stats: any }) {
  const count = stats.acuerdosCount?.[acuerdo.id] || 0
  const isAvailable = count > 0
  const isActive = acuerdo.status === "active"

  return (
    <Card
      className={`transition-all duration-200 ${isAvailable ? "hover:shadow-lg hover:scale-105" : "opacity-60"} ${!isActive && "border-red-300 dark:border-red-800"}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-lg ${acuerdo.color} flex items-center justify-center text-white text-xl`}
            >
              {acuerdo.icon}
            </div>
            <div>
              <CardTitle className="text-lg">{acuerdo.name}</CardTitle>
              <CardDescription className="text-sm mt-1">{acuerdo.description}</CardDescription>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-mono">{acuerdo.id}</div>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {!isActive && (
              <Badge variant="destructive" className="bg-red-500 text-white">
                Inactivo
              </Badge>
            )}
            {isAvailable && isActive && (
              <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                Disponible
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <FileText className="h-4 w-4" />
            <span>{count.toLocaleString()} registros</span>
          </div>
          <div className="flex gap-2">
            {isAvailable && isActive ? (
              <>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/open-data/${encodeURIComponent(acuerdo.fullName)}`}>
                    <Eye className="h-4 w-4 mr-1" />
                    Ver Datos
                  </Link>
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" disabled title={!isActive ? "Acuerdo inactivo" : "Sin datos"}>
                {!isActive ? "Inactivo" : "Sin datos"}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default async function OpenDataPage() {
  const stats = await getOpenDataStats()

  return (
    <div className="mx-auto p-6 max-w-8xl">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200 mb-2">Datos Abiertos</h1>
            <p className="text-slate-600 dark:text-slate-400 text-lg">
              Accede a los datos públicos de contrataciones por acuerdo marco. Información transparente sobre las
              compras gubernamentales del año 2025.
            </p>
          </div>
          <Button asChild>
            <Link href="/open-data/upload">
              <Database className="h-4 w-4 mr-2" />
              Subir Archivo
            </Link>
          </Button>
        </div>
      </div>

      <Suspense
        fallback={
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/4 mb-4"></div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="h-20 bg-slate-200 dark:bg-slate-700 rounded"></div>
                  <div className="h-20 bg-slate-200 dark:bg-slate-700 rounded"></div>
                  <div className="h-20 bg-slate-200 dark:bg-slate-700 rounded"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        }
      >
        <OpenDataStatsCard stats={stats} />
      </Suspense>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {ACUERDOS_MARCO.map((acuerdo) => (
          <AcuerdoMarcoCard key={acuerdo.id} acuerdo={acuerdo} stats={stats} />
        ))}
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Alertas de Marca</h2>
            <p className="text-slate-600 dark:text-slate-400">
              Monitoreo automático de ventas de las marcas WORLDLIFE, HOPE LIFE, ZEUS y VALHALLA
            </p>
          </div>
          <Button asChild>
            <Link href="/open-data/brand-alerts">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Ver todas las alertas
            </Link>
          </Button>
        </div>

        <Suspense fallback={<div>Cargando alertas...</div>}>
          <BrandAlertsPreview />
        </Suspense>
      </div>

      <div className="mt-8">
        <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border-purple-200 dark:border-purple-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-purple-500 flex items-center justify-center text-white text-xl">
                  📊
                </div>
                <div>
                  <CardTitle className="text-xl">Rankings de Mercado</CardTitle>
                  <CardDescription>
                    Analiza tendencias y productos más vendidos por acuerdo marco, categoría y proveedor
                  </CardDescription>
                </div>
              </div>
              <Button asChild>
                <Link href="/open-data/rankings">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Ver Rankings
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-white/50 dark:bg-slate-800/50 rounded-lg">
                <div className="text-lg font-bold text-purple-700 dark:text-purple-300">🏆</div>
                <div className="text-sm font-medium">Productos Top</div>
                <div className="text-xs text-slate-500">Por monto total</div>
              </div>
              <div className="text-center p-3 bg-white/50 dark:bg-slate-800/50 rounded-lg">
                <div className="text-lg font-bold text-purple-700 dark:text-purple-300">🏢</div>
                <div className="text-sm font-medium">Proveedores</div>
                <div className="text-xs text-slate-500">Más exitosos</div>
              </div>
              <div className="text-center p-3 bg-white/50 dark:bg-slate-800/50 rounded-lg">
                <div className="text-lg font-bold text-purple-700 dark:text-purple-300">🏛️</div>
                <div className="text-sm font-medium">Entidades</div>
                <div className="text-xs text-slate-500">Mayor volumen</div>
              </div>
              <div className="text-center p-3 bg-white/50 dark:bg-slate-800/50 rounded-lg">
                <div className="text-lg font-bold text-purple-700 dark:text-purple-300">📈</div>
                <div className="text-sm font-medium">Tendencias</div>
                <div className="text-xs text-slate-500">Por categoría</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Información sobre los Acuerdos Marco</CardTitle>
        </CardHeader>
        <CardContent className="prose dark:prose-invert max-w-none">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-3">¿Qué son los Acuerdos Marco?</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Los acuerdos marco son instrumentos de contratación pública que establecen las condiciones generales
                bajo las cuales se realizarán las contrataciones específicas durante un período determinado.
              </p>
              <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                <li>• Contratos de suministro de bienes y servicios</li>
                <li>• Condiciones preestablecidas de precio y calidad</li>
                <li>• Transparencia en el proceso de contratación</li>
                <li>• Eficiencia en las compras públicas</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-3">Acuerdos Disponibles 2025</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Actualmente disponemos de información detallada sobre tres acuerdos marco vigentes para el año 2025, con
                datos actualizados sobre las contrataciones realizadas.
              </p>
              <div className="space-y-2">
                {ACUERDOS_MARCO.map((acuerdo) => (
                  <div key={acuerdo.id} className="flex items-center gap-2 text-sm">
                    <span className="text-lg">{acuerdo.icon}</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">{acuerdo.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
