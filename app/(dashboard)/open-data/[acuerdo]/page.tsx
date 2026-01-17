import { notFound } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Building, Package, DollarSign, Calendar, TrendingUp } from "lucide-react"
import Link from "next/link"
import { createServerClient } from "@/lib/supabase-server"
import { OpenDataTable } from "@/components/open-data/open-data-table"
import { OpenDataFilters } from "@/components/open-data/open-data-filters"
import { ExportButtons } from "@/components/open-data/export-buttons"
import { motion } from "framer-motion"

// Definir los acuerdos marco válidos
const ACUERDOS_MARCO = {
  "EXT-CE-2024-11 MOBILIARIO EN GENERAL": {
    id: "EXT-CE-2024-11",
    name: "Mobiliario en General",
    description: "Datos de compras de mobiliario y equipamiento para oficinas y espacios públicos",
    color: "from-blue-500 to-cyan-500",
    bgLight: "bg-blue-50 dark:bg-blue-900/20",
    icon: "🪑",
    fullName: "EXT-CE-2024-11 MOBILIARIO EN GENERAL",
    status: "inactive",
  },
  "EXT-CE-2025-11 MOBILIARIO EN GENERAL": {
    id: "EXT-CE-2025-11",
    name: "Mobiliario en General (2025)",
    description: "Acuerdo marco para la adquisición de mobiliario en general",
    color: "from-blue-600 to-indigo-600",
    bgLight: "bg-blue-50 dark:bg-blue-900/20",
    icon: "🪑",
    status: "active",
  },
  "EXT-CE-2024-12 TUBERIAS, PINTURAS, CERAMICOS, SANITARIOS, ACCESORIOS Y COMPLEMENTOS EN GENERAL": {
    id: "EXT-CE-2024-12",
    name: "Tuberías y Acabados",
    description: "Acuerdo marco para tuberías, pinturas, cerámicos, sanitarios y complementos",
    color: "from-amber-500 to-orange-500",
    bgLight: "bg-amber-50 dark:bg-amber-900/20",
    icon: "🔧",
    status: "active",
  },
  "EXT-CE-2024-3 MATERIALES E INSUMOS DE LIMPIEZA, PAPELES PARA ASEO Y LIMPIEZA": {
    id: "EXT-CE-2024-3",
    name: "Materiales de Limpieza",
    description: "Acuerdo marco para materiales e insumos de limpieza",
    color: "from-green-500 to-emerald-600",
    bgLight: "bg-green-50 dark:bg-green-900/20",
    icon: "🧹",
    status: "active",
  },
  "EXT-CE-2024-16 ACCESORIOS DOMÉSTICOS Y BIENES PARA USOS DIVERSOS": {
    id: "EXT-CE-2024-16",
    name: "Accesorios Domésticos",
    description: "Accesorios domésticos y bienes para usos diversos en instituciones públicas",
    color: "from-teal-500 to-emerald-500",
    bgLight: "bg-teal-50 dark:bg-teal-900/20",
    icon: "🏠",
    status: "active",
  },
  "EXT-CE-2024-26 MAQUINAS, EQUIPOS Y HERRAMIENTAS PARA JARDINERIA, SILVICULTURA Y AGRICULTURA": {
    id: "EXT-CE-2024-26",
    name: "Jardinería y Agricultura",
    description: "Máquinas, equipos y herramientas para jardinería, silvicultura y agricultura",
    color: "from-orange-500 to-red-500",
    bgLight: "bg-orange-50 dark:bg-orange-900/20",
    icon: "🌱",
    status: "active",
  },
}

interface PageProps {
  params: {
    acuerdo: string
  }
  searchParams: {
    page?: string
    search?: string
    entidad?: string
    proveedor?: string
    fecha_desde?: string
    fecha_hasta?: string
    download?: string
  }
}

async function getAcuerdoData(acuerdoMarcoFullString: string, searchParams: any, exportAll = false) {
  const supabase = createServerClient()

  try {
    const acuerdoInfo = ACUERDOS_MARCO[acuerdoMarcoFullString as keyof typeof ACUERDOS_MARCO]
    if (!acuerdoInfo) {
      return { data: [], count: 0, error: "Acuerdo marco no válido", currentPage: 1, totalPages: 0 }
    }
    const codigoAcuerdoMarco = acuerdoInfo.id

    let query = supabase
      .from("open_data_entries")
      .select("*", { count: "exact" })
      .eq("codigo_acuerdo_marco", codigoAcuerdoMarco)
      .order("fecha_aceptacion", { ascending: false })

    if (searchParams.search && searchParams.search.trim()) {
      const searchTerm = searchParams.search.trim()
      query = query.or(
        `descripcion_ficha_producto.ilike.%${searchTerm}%,razon_social_entidad.ilike.%${searchTerm}%,razon_social_proveedor.ilike.%${searchTerm}%`,
      )
    }

    if (searchParams.entidad && searchParams.entidad.trim()) {
      query = query.ilike("razon_social_entidad", `%${searchParams.entidad.trim()}%`)
    }

    if (searchParams.proveedor && searchParams.proveedor.trim()) {
      query = query.ilike("razon_social_proveedor", `%${searchParams.proveedor.trim()}%`)
    }

    if (searchParams.fecha_desde) {
      query = query.gte("fecha_publicacion", searchParams.fecha_desde)
    }

    if (searchParams.fecha_hasta) {
      query = query.lte("fecha_publicacion", searchParams.fecha_hasta)
    }

    if (exportAll) {
      const { data, error, count } = await query

      if (error) {
        console.error("Supabase error:", error)
        return { data: [], count: 0, error: error.message }
      }

      return {
        data: data || [],
        count: count || 0,
        error: null,
        currentPage: 1,
        totalPages: 1,
      }
    }

    const page = Math.max(1, Number.parseInt(searchParams.page || "1"))
    const pageSize = 50
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, error, count } = await query.range(from, to)

    if (error) {
      console.error("Supabase error:", error)
      return { data: [], count: 0, error: error.message }
    }

    return {
      data: data || [],
      count: count || 0,
      error: null,
      currentPage: page,
      totalPages: Math.ceil((count || 0) / pageSize),
    }
  } catch (error) {
    console.error("Error in getAcuerdoData:", error)
    return { data: [], count: 0, error: "Error interno del servidor", currentPage: 1, totalPages: 0 }
  }
}

async function getAcuerdoStats(acuerdoMarcoFullString: string) {
  const supabase = createServerClient()

  try {
    const acuerdoInfo = ACUERDOS_MARCO[acuerdoMarcoFullString as keyof typeof ACUERDOS_MARCO]
    if (!acuerdoInfo) {
      return { totalMonto: 0, totalEntidades: 0, totalProveedores: 0, ordersLastMonth: 0 }
    }
    const codigoAcuerdoMarco = acuerdoInfo.id

    const { data, error } = await supabase
      .from("open_data_entries")
      .select("monto_total_entrega, razon_social_entidad, razon_social_proveedor, fecha_aceptacion")
      .eq("codigo_acuerdo_marco", codigoAcuerdoMarco)

    if (error) {
      console.error("Error fetching stats:", error)
      return { totalMonto: 0, totalEntidades: 0, totalProveedores: 0, ordersLastMonth: 0 }
    }

    const totalMonto = data?.reduce((sum, item) => sum + (Number(item.monto_total_entrega) || 0), 0) || 0
    const entidadesUnicas = new Set(data?.map((item) => item.razon_social_entidad).filter(Boolean)).size
    const proveedoresUnicos = new Set(data?.map((item) => item.razon_social_proveedor).filter(Boolean)).size

    // Calculate orders last month (simple approximation)
    const now = new Date()
    const lastMonth = new Date(now.setMonth(now.getMonth() - 1))
    const ordersLastMonth = data?.filter(item => new Date(item.fecha_aceptacion) > lastMonth).length || 0

    return {
      totalMonto,
      totalEntidades: entidadesUnicas,
      totalProveedores: proveedoresUnicos,
      ordersLastMonth
    }
  } catch (error) {
    console.error("Error in getAcuerdoStats:", error)
    return { totalMonto: 0, totalEntidades: 0, totalProveedores: 0, ordersLastMonth: 0 }
  }
}

function StatsCards({ stats, colorClass, bgClass }: { stats: any, colorClass: string, bgClass: string }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <Card className="border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl shadow-sm hover:shadow-md transition-all">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl bg-gradient-to-br ${colorClass} text-white shadow-lg`}>
              <DollarSign className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Monto Total</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">S/ {(stats.totalMonto / 1000000).toFixed(1)}M</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl shadow-sm hover:shadow-md transition-all">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${bgClass} text-slate-700 dark:text-slate-200`}>
              <Building className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Entidades</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalEntidades}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl shadow-sm hover:shadow-md transition-all">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${bgClass} text-slate-700 dark:text-slate-200`}>
              <Package className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Proveedores</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalProveedores}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl shadow-sm hover:shadow-md transition-all">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${bgClass} text-slate-700 dark:text-slate-200`}>
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Último Mes</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.ordersLastMonth}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default async function AcuerdoMarcoPage({ params, searchParams }: PageProps) {
  const acuerdoMarco = decodeURIComponent(params.acuerdo)
  const resolvedSearchParams = await searchParams

  if (!ACUERDOS_MARCO[acuerdoMarco as keyof typeof ACUERDOS_MARCO]) {
    notFound()
  }

  const acuerdoInfo = ACUERDOS_MARCO[acuerdoMarco as keyof typeof ACUERDOS_MARCO]
  const isInactive = acuerdoInfo?.status === "inactive"

  const [result, stats] = await Promise.all([
    getAcuerdoData(acuerdoMarco, resolvedSearchParams),
    getAcuerdoStats(acuerdoMarco),
  ])

  const { data, count, error, currentPage, totalPages } = result

  if (error) {
    return (
      <div className="container mx-auto p-6 flex flex-col items-center justify-center min-h-[50vh]">
        <div className="p-4 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 mb-4">
          <ArrowLeft className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Error al cargar los datos</h2>
        <p className="text-slate-600 dark:text-slate-400 max-w-md text-center mb-6">{error}</p>
        <Button asChild>
          <Link href="/open-data">Volver a Datos Abiertos</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="w-full p-6 space-y-8 pb-20">
      {/* Header */}
      <div className="mb-8 relative overflow-hidden rounded-3xl bg-slate-900 text-white p-8 md:p-12 shadow-2xl">
        <div className={`absolute inset-0 bg-gradient-to-br ${acuerdoInfo.color} opacity-20`} />
        <div className="absolute inset-0 bg-[url('/patterns/grid.svg')] opacity-10" />

        <div className="relative z-10">
          <Button asChild variant="ghost" size="sm" className="text-slate-300 hover:text-white hover:bg-white/10 mb-6 -ml-2">
            <Link href="/open-data">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver al Catálogo
            </Link>
          </Button>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="flex items-start gap-6">
              <div className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br ${acuerdoInfo.color} flex items-center justify-center text-4xl shadow-lg shadow-black/20`}>
                {acuerdoInfo.icon}
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <Badge variant="outline" className="border-white/20 text-white/80 bg-white/5 backdrop-blur-md">
                    {acuerdoInfo.id}
                  </Badge>
                  {isInactive ? (
                    <Badge className="bg-amber-500/20 text-amber-200 border-amber-500/50">Histórico</Badge>
                  ) : (
                    <Badge className="bg-emerald-500/20 text-emerald-200 border-emerald-500/50">Activo</Badge>
                  )}
                </div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{acuerdoInfo.name}</h1>
                <p className="text-lg text-slate-300 max-w-2xl leading-relaxed">{acuerdoInfo.description}</p>
              </div>
            </div>

            {!isInactive && (
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-1">
                <ExportButtons
                  data={data}
                  acuerdoMarco={acuerdoInfo.name}
                  searchParams={resolvedSearchParams}
                  acuerdoMarcoFullString={acuerdoMarco}
                  variant="ghost"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <StatsCards stats={stats} colorClass={acuerdoInfo.color} bgClass={acuerdoInfo.bgLight} />

      {/* Filtros y Tabla */}
      <Card className="border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl shadow-sm overflow-hidden">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-slate-500" />
                Registro de Operaciones
              </CardTitle>
              <CardDescription className="mt-1">
                {count.toLocaleString()} transacciones registradas en el sistema
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <OpenDataFilters searchParams={resolvedSearchParams} />
          <div className="mt-6 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-950">
            <OpenDataTable data={data} currentPage={currentPage || 1} totalPages={totalPages || 1} totalRecords={count} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
