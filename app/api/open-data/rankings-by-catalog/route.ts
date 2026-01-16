import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

// === CACHÉ EN MEMORIA (SWR) ===
interface CacheEntry {
  data: any
  timestamp: number
  fetching?: Promise<any>
}

const CACHE = new Map<string, CacheEntry>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutos
const STALE_TTL = 30 * 60 * 1000 // 30 minutos

function getCacheKey(period: string, acuerdo: string | null, catalogo: string | null): string {
  return `catalog-rankings:${period}:${acuerdo || "all"}:${catalogo || "all"}`
}

// === FUNCIÓN DE FETCH (con paginación) ===
async function fetchCatalogRankings(
  supabase: any,
  period: string,
  acuerdo: string | null,
  catalogo: string | null,
  startDate: Date,
): Promise<any> {
  let query = supabase
    .from("open_data_entries")
    .select(`
      catalogo,
      codigo_acuerdo_marco,
      acuerdo_marco,
      nro_parte,
      descripcion_ficha_producto,
      marca_ficha_producto,
      categoria,
      cantidad_entrega,
      precio_unitario,
      monto_total_entrega,
      estado_orden_electronica
    `)
    .gte("fecha_publicacion", startDate.toISOString().split("T")[0])
    .not("catalogo", "is", null)
    .not("nro_parte", "is", null)
    .not("cantidad_entrega", "is", null)
    .gt("cantidad_entrega", 0)

  if (acuerdo && acuerdo !== "all" && acuerdo.trim() !== "") {
    query = query.eq("codigo_acuerdo_marco", acuerdo)
  }

  if (catalogo && catalogo !== "all" && catalogo.trim() !== "") {
    query = query.eq("catalogo", catalogo)
  }

  const allData: any[] = []
  const pageSize = 1000
  let from = 0

  // Increased limit for comprehensive analysis
  const MAX_RECORDS = 50000

  do {
    if (allData.length >= MAX_RECORDS) break
    const { data: page, error } = await query.range(from, from + pageSize - 1)
    if (error) throw error
    if (!page || page.length === 0) break
    allData.push(...page)
    from += pageSize
  } while (true)

  if (allData.length === 0) {
    return {
      rankings: [],
      stats: {
        totalCatalogs: 0,
        totalProducts: 0,
        totalUnits: 0,
        totalAmount: 0,
        totalRecords: 0,
        orderStates: {},
        period,
      },
    }
  }

  // === Estados de orden ===
  const stateDistribution: Record<string, number> = {}
  allData.forEach((item) => {
    const state = item.estado_orden_electronica || "DESCONOCIDO"
    stateDistribution[state] = (stateDistribution[state] || 0) + 1
  })

  // === Agrupación por catálogo y producto ===
  const catalogMap = new Map<string, {
    catalog: string
    codigo_acuerdo_marco: string
    acuerdo_marco: string
    products: Map<string, {
      nro_parte: string
      descripcion: string
      marca: string
      categoria: string
      totalUnits: number
      totalAmount: number
      orders: number
      avgPrice: number
      minPrice: number
      maxPrice: number
      precios: number[]
    }>
    totalUnits: number
    totalAmount: number
    totalOrders: number
  }>()

  allData.forEach((item) => {
    const catalogKey = item.catalogo
    const partKey = `${item.nro_parte}-${item.descripcion_ficha_producto}`

    if (!catalogMap.has(catalogKey)) {
      catalogMap.set(catalogKey, {
        catalog: item.catalogo,
        codigo_acuerdo_marco: item.codigo_acuerdo_marco,
        acuerdo_marco: item.acuerdo_marco,
        products: new Map(),
        totalUnits: 0,
        totalAmount: 0,
        totalOrders: 0,
      })
    }

    const catalog = catalogMap.get(catalogKey)!
    const product = catalog.products.get(partKey) || {
      nro_parte: item.nro_parte,
      descripcion: item.descripcion_ficha_producto,
      marca: item.marca_ficha_producto,
      categoria: item.categoria,
      totalUnits: 0,
      totalAmount: 0,
      orders: 0,
      avgPrice: 0,
      minPrice: Number.MAX_VALUE,
      maxPrice: 0,
      precios: [],
    }

    const units = Number(item.cantidad_entrega) || 0
    const amount = Number(item.monto_total_entrega) || 0
    const price = Number(item.precio_unitario) || 0

    product.totalUnits += units
    product.totalAmount += amount
    product.orders += 1
    if (price > 0) product.precios.push(price)
    product.minPrice = Math.min(product.minPrice, price > 0 ? price : product.minPrice)
    product.maxPrice = Math.max(product.maxPrice, price)

    catalog.products.set(partKey, product)
    catalog.totalUnits += units
    catalog.totalAmount += amount
    catalog.totalOrders += 1
  })

  const catalogRankings = Array.from(catalogMap.values())
    .map((catalog) => {
      const products = Array.from(catalog.products.values())
      return {
        ...catalog,
        products: products
          .map((p) => ({
            ...p,
            avgPrice: p.precios.length > 0 ? p.precios.reduce((a, b) => a + b, 0) / p.precios.length : 0,
            precios: undefined,
            minPrice: p.minPrice === Number.MAX_VALUE ? 0 : p.minPrice,
          }))
          .sort((a, b) => b.totalUnits - a.totalUnits),
      }
    })
    .sort((a, b) => b.totalUnits - a.totalUnits)

  const totalCatalogs = catalogRankings.length
  const totalProducts = catalogRankings.reduce((sum, cat) => sum + cat.products.length, 0)
  const totalUnits = catalogRankings.reduce((sum, cat) => sum + cat.totalUnits, 0)
  const totalAmount = catalogRankings.reduce((sum, cat) => sum + cat.totalAmount, 0)

  return {
    rankings: catalogRankings,
    stats: {
      totalCatalogs,
      totalProducts,
      totalUnits,
      totalAmount,
      totalRecords: allData.length,
      orderStates: stateDistribution,
      period,
    },
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const period = searchParams.get("period") || "6months"
  const acuerdo = searchParams.get("acuerdo")
  const catalogo = searchParams.get("catalogo")

  const supabase = createServerClient()

  try {
    const now = new Date()
    const startDate = new Date()

    switch (period) {
      case "3months":
        startDate.setMonth(now.getMonth() - 3)
        break
      case "1year":
        startDate.setFullYear(now.getFullYear() - 1)
        break
      default:
        startDate.setMonth(now.getMonth() - 6)
        break
    }

    const cacheKey = getCacheKey(period, acuerdo, catalogo)
    const nowMs = Date.now()

    // === 1. Caché fresco
    const cached = CACHE.get(cacheKey)
    if (cached && nowMs - cached.timestamp < CACHE_TTL) {
      console.log(`[CACHE HIT] Fresh catalog rankings: ${cacheKey}`)
      return NextResponse.json({ success: true, data: cached.data })
    }

    // === 2. Caché stale → servir + revalidar
    if (cached && nowMs - cached.timestamp < STALE_TTL) {
      console.log(`[CACHE STALE] Serving stale + revalidating: ${cacheKey}`)
      const response = NextResponse.json({ success: true, data: cached.data })

      if (!cached.fetching) {
        cached.fetching = fetchCatalogRankings(supabase, period, acuerdo, catalogo, startDate)
          .then((fresh) => {
            CACHE.set(cacheKey, { data: fresh, timestamp: Date.now() })
            console.log(`[CACHE UPDATED] ${cacheKey}`)
          })
          .catch((err) => console.error(`[CACHE UPDATE FAILED] ${cacheKey}`, err))
          .finally(() => {
            const entry = CACHE.get(cacheKey)
            if (entry) delete entry.fetching
          })
        CACHE.set(cacheKey, cached)
      }

      return response
    }

    // === 3. Sin caché → fetch completo
    console.log(`[CACHE MISS] Fetching fresh catalog rankings: ${cacheKey}`)
    const freshData = await fetchCatalogRankings(supabase, period, acuerdo, catalogo, startDate)

    CACHE.set(cacheKey, { data: freshData, timestamp: Date.now() })
    return NextResponse.json({ success: true, data: freshData })

  } catch (error) {
    console.error("Error in rankings by catalog API:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}