import { notFound } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Building, Package, DollarSign } from "lucide-react"
import Link from "next/link"
import { createServerClient } from "@/lib/supabase-server"
import { OpenDataTable } from "@/components/open-data/open-data-table"
import { OpenDataFilters } from "@/components/open-data/open-data-filters"
import { ExportButtons } from "@/components/open-data/export-buttons"

// Definir los acuerdos marco válidos
const ACUERDOS_MARCO = {
  "EXT-CE-2024-11 MOBILIARIO EN GENERAL": {
    id: "EXT-CE-2024-11",
    name: "Mobiliario en General",
    description: "Datos de compras de mobiliario y equipamiento para oficinas y espacios públicos",
    color: "bg-blue-500",
    icon: "🪑",
  },
  "EXT-CE-2024-16 ACCESORIOS DOMÉSTICOS Y BIENES PARA USOS DIVERSOS": {
    id: "EXT-CE-2024-16",
    name: "Accesorios Domésticos y Bienes Diversos",
    description: "Accesorios domésticos y bienes para usos diversos en instituciones públicas",
    color: "bg-green-500",
    icon: "🏠",
  },
  "EXT-CE-2024-26 MAQUINAS, EQUIPOS Y HERRAMIENTAS PARA JARDINERIA, SILVICULTURA Y AGRICULTURA": {
    id: "EXT-CE-2024-26",
    name: "Máquinas y Equipos de Jardinería",
    description: "Máquinas, equipos y herramientas para jardinería, silvicultura y agricultura",
    color: "bg-orange-500",
    icon: "🌱",
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
    console.log("Fetching data for acuerdo:", acuerdoMarcoFullString)
    console.log("Search params:", searchParams)

    // Obtener el ID del acuerdo marco a partir del nombre completo
    const acuerdoInfo = ACUERDOS_MARCO[acuerdoMarcoFullString as keyof typeof ACUERDOS_MARCO]
    if (!acuerdoInfo) {
      console.error("Acuerdo marco no encontrado en la definición:", acuerdoMarcoFullString)
      return { data: [], count: 0, error: "Acuerdo marco no válido", currentPage: 1, totalPages: 0 }
    }
    const codigoAcuerdoMarco = acuerdoInfo.id // Usar el ID (código corto) para la consulta

    // Construir la consulta base - ORDENAR POR FECHA DE ACEPTACIÓN
    let query = supabase
      .from("open_data_entries")
      .select("*", { count: "exact" })
      .eq("codigo_acuerdo_marco", codigoAcuerdoMarco) // CAMBIO: Filtrar por codigo_acuerdo_marco
      .order("fecha_aceptacion", { ascending: false })

    // Aplicar filtros de búsqueda
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

    // Configurar paginación solo si no es exportación
    const page = Math.max(1, Number.parseInt(searchParams.page || "1"))
    const pageSize = 50
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    console.log(`Pagination: page=${page}, from=${from}, to=${to}`)

    // Ejecutar la consulta con paginación
    const { data, error, count } = await query.range(from, to)

    if (error) {
      console.error("Supabase error:", error)
      return { data: [], count: 0, error: error.message }
    }

    console.log(`Found ${count} total records, returning ${data?.length || 0} records`)

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
      console.error("Acuerdo marco no encontrado en la definición para stats:", acuerdoMarcoFullString)
      return { totalMonto: 0, totalEntidades: 0, totalProveedores: 0 }
    }
    const codigoAcuerdoMarco = acuerdoInfo.id // Usar el ID (código corto) para la consulta de stats

    const { data, error } = await supabase
      .from("open_data_entries")
      .select("monto_total_entrega, razon_social_entidad, razon_social_proveedor")
      .eq("codigo_acuerdo_marco", codigoAcuerdoMarco) // CAMBIO: Filtrar por codigo_acuerdo_marco

    if (error) {
      console.error("Error fetching stats:", error)
      return { totalMonto: 0, totalEntidades: 0, totalProveedores: 0 }
    }

    const totalMonto = data?.reduce((sum, item) => sum + (Number(item.monto_total_entrega) || 0), 0) || 0
    const entidadesUnicas = new Set(data?.map((item) => item.razon_social_entidad).filter(Boolean)).size
    const proveedoresUnicos = new Set(data?.map((item) => item.razon_social_proveedor).filter(Boolean)).size

    return {
      totalMonto,
      totalEntidades: entidadesUnicas,
      totalProveedores: proveedoresUnicos,
    }
  } catch (error) {
    console.error("Error in getAcuerdoStats:", error)
    return { totalMonto: 0, totalEntidades: 0, totalProveedores: 0 }
  }
}

function StatsCards({ stats }: { stats: any }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Monto Total</p>
              <p className="text-xl font-bold">S/ {stats.totalMonto.toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Building className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Entidades</p>
              <p className="text-xl font-bold">{stats.totalEntidades}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <Package className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Proveedores</p>
              <p className="text-xl font-bold">{stats.totalProveedores}</p>
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

  console.log("Page params:", params)
  console.log("Search params:", resolvedSearchParams)
  console.log("Decoded acuerdo marco:", acuerdoMarco)

  // Verificar si el acuerdo marco es válido
  if (!ACUERDOS_MARCO[acuerdoMarco as keyof typeof ACUERDOS_MARCO]) {
    console.log("Acuerdo marco not found:", acuerdoMarco)
    console.log("Available acuerdos:", Object.keys(ACUERDOS_MARCO))
    notFound()
  }

  const acuerdoInfo = ACUERDOS_MARCO[acuerdoMarco as keyof typeof ACUERDOS_MARCO]

  const [result, stats] = await Promise.all([
    getAcuerdoData(acuerdoMarco, resolvedSearchParams),
    getAcuerdoStats(acuerdoMarco),
  ])

  const { data, count, error, currentPage, totalPages } = result

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-red-600 mb-2">Error al cargar los datos</h2>
          <p className="text-slate-600 dark:text-slate-400">{error}</p>
          <Button asChild className="mt-4">
            <Link href="/open-data">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a Datos Abiertos
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  console.log(`Rendering page ${currentPage} of ${totalPages} with ${data.length} records`)

  return (
    <div className="container mx-auto p-6 max-w-8xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Button asChild variant="outline" size="sm">
            <Link href="/open-data">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg ${acuerdoInfo.color} flex items-center justify-center text-white text-lg`}
            >
              {acuerdoInfo.icon}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">{acuerdoInfo.name}</h1>
              <p className="text-slate-600 dark:text-slate-400">{acuerdoInfo.description}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Badge variant="secondary" className="font-mono text-xs">
            {acuerdoInfo.id}
          </Badge>
          <ExportButtons
            data={data}
            acuerdoMarco={acuerdoInfo.name}
            searchParams={resolvedSearchParams}
            acuerdoMarcoFullString={acuerdoMarco}
          />
        </div>
      </div>

      {/* Stats */}
      <StatsCards stats={stats} />

      {/* Filtros y Tabla */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Datos del Acuerdo Marco</span>
            <Badge variant="outline">{count.toLocaleString()} registros</Badge>
          </CardTitle>
          <CardDescription>
            Información detallada sobre las contrataciones realizadas bajo este acuerdo marco (ordenado por fecha de
            aceptación)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OpenDataFilters searchParams={resolvedSearchParams} />
          <OpenDataTable data={data} currentPage={currentPage || 1} totalPages={totalPages || 1} totalRecords={count} />
        </CardContent>
      </Card>
    </div>
  )
}
