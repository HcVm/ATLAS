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

function getCacheKey(period: string, categoria: string | null): string {
  return `category-rankings:${period}:${categoria || "all"}`
}

// === FUNCIÓN DE FETCH (con paginación) ===
async function fetchCategoryRankings(
  supabase: any,
  period: string,
  categoria: string | null,
  startDate: Date,
): Promise<any> {
  let query = supabase
    .from("open_data_entries")
    .select(`
      categoria,
      catalogo,
      marca_ficha_producto,
      razon_social_proveedor,
      cantidad_entrega,
      monto_total_entrega
    `)
    .gte("fecha_publicacion", startDate.toISOString().split("T")[0])
    .not("categoria", "is", null)

  if (categoria && categoria !== "all" && categoria.trim() !== "") {
    query = query.eq("categoria", categoria)
  }

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
      rankings: [],
      stats: {
        totalCategories: 0,
        totalAmount: 0,
        totalRecords: 0,
        period,
      },
    }
  }

  const categoryMap = new Map<string, {
    categoria: string
    totalUnits: number
    totalAmount: number
    totalOrders: number
    catalogs: Set<string>
    brands: Set<string>
    suppliers: Set<string>
  }>()

  allData.forEach((item) => {
    const key = item.categoria
    if (!categoryMap.has(key)) {
      categoryMap.set(key, {
        categoria: item.categoria,
        totalUnits: 0,
        totalAmount: 0,
        totalOrders: 0,
        catalogs: new Set(),
        brands: new Set(),
        suppliers: new Set(),
      })
    }

    const cat = categoryMap.get(key)!
    cat.catalogs.add(item.catalogo)
    cat.brands.add(item.marca_ficha_producto)
    cat.suppliers.add(item.razon_social_proveedor)
    cat.totalUnits += Number(item.cantidad_entrega) || 0
    cat.totalAmount += Number(item.monto_total_entrega) || 0
    cat.totalOrders += 1
  })

  const rankings = Array.from(categoryMap.values())
    .map((cat) => ({
      categoria: cat.categoria,
      totalUnits: cat.totalUnits,
      totalAmount: cat.totalAmount,
      totalOrders: cat.totalOrders,
      totalCatalogs: cat.catalogs.size,
      totalBrands: cat.brands.size,
      totalSuppliers: cat.suppliers.size,
      avgOrderValue: cat.totalOrders > 0 ? Math.round(cat.totalAmount / cat.totalOrders) : 0,
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount)

  return {
    rankings,
    stats: {
      totalCategories: rankings.length,
      totalAmount: rankings.reduce((sum, r) => sum + r.totalAmount, 0),
      totalRecords: allData.length,
      period,
    },
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const period = searchParams.get("period") || "6months"
  const categoria = searchParams.get("categoria")

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

    const cacheKey = getCacheKey(period, categoria)
    const nowMs = Date.now()

    // === 1. Caché fresco
    const cached = CACHE.get(cacheKey)
    if (cached && nowMs - cached.timestamp < CACHE_TTL) {
      console.log(`[CACHE HIT] Fresh category rankings: ${cacheKey}`)
      return NextResponse.json({ success: true, data: cached.data })
    }

    // === 2. Caché stale → servir + revalidar
    if (cached && nowMs - cached.timestamp < STALE_TTL) {
      console.log(`[CACHE STALE] Serving stale + revalidating: ${cacheKey}`)

      const response = NextResponse.json({ success: true, data: cached.data })

      if (!cached.fetching) {
        cached.fetching = fetchCategoryRankings(supabase, period, categoria, startDate)
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
    console.log(`[CACHE MISS] Fetching fresh category rankings: ${cacheKey}`)
    const freshData = await fetchCategoryRankings(supabase, period, categoria, startDate)

    CACHE.set(cacheKey, { data: freshData, timestamp: Date.now() })
    return NextResponse.json({ success: true, data: freshData })

  } catch (error) {
    console.error("Error in rankings by category API:", error)
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