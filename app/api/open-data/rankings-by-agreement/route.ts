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
const STALE_TTL = 30 * 60 * 1000 // 30 minutos (máximo stale)

function getCacheKey(period: string, acuerdo: string | null): string {
  return `agreement-rankings:${period}:${acuerdo || "all"}`
}

// === FUNCIÓN PARA OBTENER DATOS (con paginación) ===
async function fetchAgreementRankings(
  supabase: any,
  period: string,
  acuerdo: string | null,
  startDate: Date,
): Promise<any> {
  let query = supabase
    .from("open_data_entries")
    .select(`
      codigo_acuerdo_marco,
      acuerdo_marco,
      catalogo,
      categoria,
      cantidad_entrega,
      monto_total_entrega
    `)
    .gte("fecha_publicacion", startDate.toISOString().split("T")[0])
    .not("codigo_acuerdo_marco", "is", null)

  if (acuerdo && acuerdo !== "all" && acuerdo.trim() !== "") {
    query = query.eq("codigo_acuerdo_marco", acuerdo)
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
        totalAgreements: 0,
        totalCatalogs: 0,
        totalAmount: 0,
        totalRecords: 0,
        period,
      },
    }
  }

  const agreementMap = new Map()

  allData.forEach((item) => {
    const key = item.codigo_acuerdo_marco
    if (!agreementMap.has(key)) {
      agreementMap.set(key, {
        codigo: item.codigo_acuerdo_marco,
        nombre: item.acuerdo_marco,
        catalogs: new Set(),
        categories: new Set(),
        totalUnits: 0,
        totalAmount: 0,
        totalOrders: 0,
      })
    }
    const agg = agreementMap.get(key)!
    agg.catalogs.add(item.catalogo)
    agg.categories.add(item.categoria)
    agg.totalUnits += Number(item.cantidad_entrega) || 0
    agg.totalAmount += Number(item.monto_total_entrega) || 0
    agg.totalOrders += 1
  })

  const rankings = Array.from(agreementMap.values())
    .map((agg) => ({
      codigo_acuerdo_marco: agg.codigo,
      acuerdo_marco: agg.nombre,
      totalCatalogs: agg.catalogs.size,
      totalCategories: agg.categories.size,
      totalUnits: agg.totalUnits,
      totalAmount: agg.totalAmount,
      totalOrders: agg.totalOrders,
      avgOrderValue: agg.totalOrders > 0 ? Math.round(agg.totalAmount / agg.totalOrders) : 0,
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount)

  const totalUniqueCatalogs = new Set(allData.map(d => d.catalogo)).size

  return {
    rankings,
    stats: {
      totalAgreements: rankings.length,
      totalCatalogs: totalUniqueCatalogs,
      totalAmount: rankings.reduce((sum, r) => sum + r.totalAmount, 0),
      totalRecords: allData.length,
      period,
    },
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const period = searchParams.get("period") || "6months"
  const acuerdo = searchParams.get("acuerdo")

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

    const cacheKey = getCacheKey(period, acuerdo)
    const nowMs = Date.now()

    // === 1. ¿Hay caché fresco? → devolver inmediatamente
    const cached = CACHE.get(cacheKey)
    if (cached && nowMs - cached.timestamp < CACHE_TTL) {
      console.log(`[CACHE HIT] Fresh data for ${cacheKey}`)
      return NextResponse.json({ success: true, data: cached.data })
    }

    // === 2. ¿Hay caché stale? → devolver + actualizar en background
    if (cached && nowMs - cached.timestamp < STALE_TTL) {
      console.log(`[CACHE STALE] Serving stale + revalidating ${cacheKey}`)

      // Devolver caché viejo
      const response = NextResponse.json({ success: true, data: cached.data })

      // Revalidar en background
      if (!cached.fetching) {
        cached.fetching = fetchAgreementRankings(supabase, period, acuerdo, startDate)
          .then((freshData) => {
            CACHE.set(cacheKey, { data: freshData, timestamp: Date.now() })
            console.log(`[CACHE UPDATED] ${cacheKey} refreshed`)
          })
          .catch((err) => {
            console.error(`[CACHE UPDATE FAILED] ${cacheKey}`, err)
          })
          .finally(() => {
            const entry = CACHE.get(cacheKey)
            if (entry) delete entry.fetching
          })
        CACHE.set(cacheKey, cached)
      }

      return response
    }

    // === 3. No hay caché → fetch completo
    console.log(`[CACHE MISS] Fetching fresh data for ${cacheKey}`)
    const freshData = await fetchAgreementRankings(supabase, period, acuerdo, startDate)

    CACHE.set(cacheKey, { data: freshData, timestamp: Date.now() })
    return NextResponse.json({ success: true, data: freshData })

  } catch (error) {
    console.error("Error in rankings by agreement API:", error)
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