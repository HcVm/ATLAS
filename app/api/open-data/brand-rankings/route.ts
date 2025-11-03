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

function getCacheKey(period: string): string {
  return `brand-rankings:${period}`
}

// === NORMALIZACIÓN DE MARCAS (MEJORADA) ===
const BRAND_NORMALIZATION: Record<string, string> = {
  "WORLD LIFE": "WORLDLIFE",
  "HOPE LIFE": "HOPELIFE",
  "HOPELIFE": "HOPELIFE",
  "VALHALLA": "VALHALLA",
  "ZEUS": "ZEUS",
  "WORLDIFE": "WORLDLIFE",
  "WORLIFE": "WORLDLIFE",
  "MARCA:HOPE LIFE": "HOPELIFE",
  "MARCA:HOPELIFE": "HOPELIFE",
  "MARCA: HOPE LIFE": "HOPELIFE",
  "MARCA: HOPELIFE": "HOPELIFE",
  "MARCA:VALHALLA": "VALHALLA",
  "MARCA: VALHALLA": "VALHALLA",
  "MARCA:ZEUS": "ZEUS",
  "MARCA: ZEUS": "ZEUS",
  "MARCA:WORLDLIFE": "WORLDLIFE",
  "MARCA: WORLDLIFE": "WORLDLIFE",
}

function normalizeBrand(raw: string): string {
  if (!raw) return ""
  const upper = raw.trim().toUpperCase()

  // Buscar coincidencia exacta o parcial
  for (const [key, value] of Object.entries(BRAND_NORMALIZATION)) {
    if (upper.includes(key)) return value
  }

  // Si no hay coincidencia, devolver el original en mayúsculas
  return upper
}

// === FUNCIÓN DE FETCH (CORREGIDA) ===
async function fetchBrandRankings(
  supabase: any,
  period: string,
  startDate: Date,
): Promise<any> {
  const query = supabase
    .from("open_data_entries")
    .select(`
      marca_ficha_producto,
      nro_parte,
      descripcion_ficha_producto,
      categoria,
      catalogo,
      codigo_acuerdo_marco,
      cantidad_entrega,
      precio_unitario,
      monto_total_entrega,
      estado_orden_electronica
    `)
    .gte("fecha_publicacion", startDate.toISOString().split("T")[0])
    .not("marca_ficha_producto", "is", null)
    .not("cantidad_entrega", "is", null)
    .gt("cantidad_entrega", 0)

  const allData: any[] = []
  const pageSize = 1000
  let from = 0

  do {
    const { data: page, error } = await query.range(from, from + pageSize - 1)
    if (error) throw error
    if (!page || page.length === 0) break
    allData.push(...page)
    from += pageSize
  } while (true)

  if (allData.length === 0) {
    return {
      ourBrands: [],
      competitorBrands: [],
      allBrands: [],
      stats: {
        totalBrands: 0,
        totalUnits: 0,
        totalAmount: 0,
        ourBrandsCount: 0,
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

  // === Agrupación por marca (NORMALIZADA) ===
  const brandMap = new Map<string, {
    brand: string
    totalUnits: number
    totalAmount: number
    totalOrders: number
    categories: Set<string>
    catalogs: Set<string>
    agreements: Set<string>
    products: Map<string, {
      nro_parte: string
      descripcion: string
      categoria: string
      catalogo: string
      totalUnits: number
      totalAmount: number
      orders: number
      avgPrice: number
    }>
  }>()

  allData.forEach((item) => {
    const rawBrand = item.marca_ficha_producto?.trim()
    if (!rawBrand) return

    const brandKey = normalizeBrand(rawBrand)
    if (!brandKey) return

    const productKey = `${item.nro_parte}-${item.descripcion_ficha_producto}`

    if (!brandMap.has(brandKey)) {
      brandMap.set(brandKey, {
        // AQUÍ ESTABA EL ERROR: usaba `rawBrand`, ahora usa `brandKey`
        brand: brandKey,
        totalUnits: 0,
        totalAmount: 0,
        totalOrders: 0,
        categories: new Set(),
        catalogs: new Set(),
        agreements: new Set(),
        products: new Map(),
      })
    }

    const brandData = brandMap.get(brandKey)!
    const product = brandData.products.get(productKey) || {
      nro_parte: item.nro_parte,
      descripcion: item.descripcion_ficha_producto,
      categoria: item.categoria,
      catalogo: item.catalogo,
      totalUnits: 0,
      totalAmount: 0,
      orders: 0,
      avgPrice: 0,
    }

    const units = Number(item.cantidad_entrega) || 0
    const amount = Number(item.monto_total_entrega) || 0

    product.totalUnits += units
    product.totalAmount += amount
    product.orders += 1
    product.avgPrice = product.totalUnits > 0 ? product.totalAmount / product.totalUnits : 0

    brandData.products.set(productKey, product)
    brandData.totalUnits += units
    brandData.totalAmount += amount
    brandData.totalOrders += 1
    brandData.categories.add(item.categoria)
    brandData.catalogs.add(item.catalogo)
    brandData.agreements.add(item.codigo_acuerdo_marco)
  })

  // === Rankings finales ===
  const ourBrandKeys = new Set(["WORLDLIFE", "HOPELIFE", "VALHALLA", "ZEUS"])
  const isOurBrand = (key: string) => ourBrandKeys.has(key.toUpperCase())

  const brandRankings = Array.from(brandMap.values())
    .map((b) => ({
      ...b,
      avgPrice: b.totalUnits > 0 ? b.totalAmount / b.totalUnits : 0,
      categories: Array.from(b.categories),
      catalogs: Array.from(b.catalogs),
      agreements: Array.from(b.agreements),
      topProducts: Array.from(b.products.values())
        .sort((a, b) => b.totalUnits - a.totalUnits)
        .slice(0, 5),
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount)

  const ourBrands = brandRankings
    .filter((b) => isOurBrand(b.brand))
    .sort((a, b) => b.totalAmount - a.totalAmount)

  const competitorBrands = brandRankings
    .filter((b) => !isOurBrand(b.brand))
    .slice(0, 15)

  const totalUnits = brandRankings.reduce((sum, b) => sum + b.totalUnits, 0)
  const totalAmount = brandRankings.reduce((sum, b) => sum + b.totalAmount, 0)

  // === TOP ÓRDENES POR CATÁLOGO (GENERAL + NUESTRAS) ===
const catalogOrderMap = new Map<string, any[]>()

allData.forEach(item => {
  const cat = item.catalogo?.trim()
  if (!cat) return

  const orderId = item.id || `OC-${item.nro_parte}-${item.fecha_publicacion}`
  const brand = normalizeBrand(item.marca_ficha_producto)
  const amount = Number(item.monto_total_entrega) || 0
  const units = Number(item.cantidad_entrega) || 0
  const date = item.fecha_publicacion

  if (amount <= 0) return

  const order = {
    orderId,
    date,
    amount,
    units,
    brand,
    product: item.nro_parte,
    description: item.descripcion_ficha_producto,
  }

  if (!catalogOrderMap.has(cat)) {
    catalogOrderMap.set(cat, [])
  }
  catalogOrderMap.get(cat)!.push(order)
})

// === CONSTRUIR topOrdersByCatalog ===
const topOrdersByCatalog: any[] = []

for (const [catalog, orders] of catalogOrderMap.entries()) {
  const sorted = orders.sort((a, b) => b.amount - a.amount)

  const topGeneral = sorted.slice(0, 3)
  const topOur = sorted
    .filter(o => ourBrandKeys.has(o.brand))
    .slice(0, 3)

  const totalAmount = orders.reduce((s, o) => s + o.amount, 0)
  const ourAmount = topOur.reduce((s, o) => s + o.amount, 0)
  const ourShare = totalAmount > 0 ? (ourAmount / totalAmount) * 100 : 0

  topOrdersByCatalog.push({
    catalog,
    topGeneral,
    topOur,
    totalOrders: orders.length,
    totalAmount,
    ourAmount,
    ourShare,
  })
}

// Ordenar por ingresos totales del catálogo
topOrdersByCatalog.sort((a, b) => b.totalAmount - a.totalAmount)

// === PARTICIPACIÓN POR CATÁLOGO Y POR MARCA ===
const catalogBrandMap = new Map<string, Map<string, { amount: number }>>()

allData.forEach(item => {
  const cat = item.catalogo?.trim()
  const rawBrand = item.marca_ficha_producto?.trim()
  if (!cat || !rawBrand) return

  const brand = normalizeBrand(rawBrand)
  const amount = Number(item.monto_total_entrega) || 0
  if (amount <= 0) return

  if (!catalogBrandMap.has(cat)) {
    catalogBrandMap.set(cat, new Map())
  }
  const brandMap = catalogBrandMap.get(cat)!
  brandMap.set(brand, { amount: (brandMap.get(brand)?.amount || 0) + amount })
})

// === CONSTRUIR catalogShare POR MARCA ===
const catalogShare: any[] = []

for (const [catalog, brandMap] of catalogBrandMap.entries()) {
  const ourBrandsInCatalog = Array.from(brandMap.entries())
    .filter(([brand]) => ourBrandKeys.has(brand))
    .sort((a, b) => b[1].amount - a[1].amount)

  const competitorBrandsInCatalog = Array.from(brandMap.entries())
    .filter(([brand]) => !ourBrandKeys.has(brand))
    .sort((a, b) => b[1].amount - a[1].amount)

  const topCompetitor = competitorBrandsInCatalog[0]
  const totalInCatalog = Array.from(brandMap.values()).reduce((s, v) => s + v.amount, 0)

  ourBrandsInCatalog.forEach(([brand, data]) => {
    const ourShare = totalInCatalog > 0 ? (data.amount / totalInCatalog) * 100 : 0
    catalogShare.push({
      catalog,
      brand,
      ourAmount: data.amount,
      ourShare,
      topCompetitor: topCompetitor?.[0] || "N/A",
      topCompetitorAmount: topCompetitor?.[1].amount || 0,
      totalInCatalog,
    })
  })
}

// Ordenar: primero los catálogos con más ingresos nuestros
catalogShare.sort((a, b) => b.ourAmount - a.ourAmount)

// === RETURN FINAL (REEMPLAZA el return anterior) ===
return {
  ourBrands,
  competitorBrands,
  allBrands: brandRankings.slice(0, 20),
  topOrders: topOrdersByCatalog,
  catalogShare, // ← AHORA ES POR MARCA
  stats: {
    totalBrands: brandRankings.length,
    totalUnits,
    totalAmount,
    ourBrandsCount: ourBrands.length,
    totalRecords: allData.length,
    orderStates: stateDistribution,
    period,
  },
}
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const period = searchParams.get("period") || "6months"

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

    const cacheKey = getCacheKey(period)
    const nowMs = Date.now()

    // === 1. Caché fresco
    const cached = CACHE.get(cacheKey)
    if (cached && nowMs - cached.timestamp < CACHE_TTL) {
      console.log(`[CACHE HIT] Fresh brand rankings: ${cacheKey}`)
      return NextResponse.json({ success: true, data: cached.data })
    }

    // === 2. Caché stale → servir + revalidar
    if (cached && nowMs - cached.timestamp < STALE_TTL) {
      console.log(`[CACHE STALE] Serving stale + revalidating: ${cacheKey}`)
      const response = NextResponse.json({ success: true, data: cached.data })

      if (!cached.fetching) {
        cached.fetching = fetchBrandRankings(supabase, period, startDate)
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
    console.log(`[CACHE MISS] Fetching fresh brand rankings: ${cacheKey}`)
    const freshData = await fetchBrandRankings(supabase, period, startDate)

    CACHE.set(cacheKey, { data: freshData, timestamp: Date.now() })
    return NextResponse.json({ success: true, data: freshData })

  } catch (error) {
    console.error("Error in brand rankings API:", error)
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