import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const period = searchParams.get("period") || "6months"

  const supabase = createServerClient()

  try {
    // Calcular fecha de inicio basada en el período
    const now = new Date()
    const startDate = new Date()

    switch (period) {
      case "3months":
        startDate.setMonth(now.getMonth() - 3)
        break
      case "1year":
        startDate.setFullYear(now.getFullYear() - 1)
        break
      default: // 6months
        startDate.setMonth(now.getMonth() - 6)
        break
    }

    // Consulta principal: Performance de catálogos
    const { data, error } = await supabase
      .from("open_data_entries")
      .select(`
        catalogo,
        codigo_acuerdo_marco,
        acuerdo_marco,
        categoria,
        cantidad_entrega,
        monto_total_entrega,
        precio_unitario,
        razon_social_proveedor,
        fecha_publicacion
      `)
      .gte("fecha_publicacion", startDate.toISOString().split("T")[0])
      .not("catalogo", "is", null)
      .not("cantidad_entrega", "is", null)
      .gt("cantidad_entrega", 0)

    if (error) {
      console.error("Error fetching catalog performance:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    // Procesar performance por catálogo y acuerdo marco
    const performanceMap = new Map()

    data.forEach((item) => {
      const key = `${item.catalogo}-${item.codigo_acuerdo_marco}`

      if (!performanceMap.has(key)) {
        performanceMap.set(key, {
          catalogo: item.catalogo,
          codigo_acuerdo_marco: item.codigo_acuerdo_marco,
          acuerdo_marco: item.acuerdo_marco,
          categories: new Set(),
          suppliers: new Set(),
          totalUnits: 0,
          totalAmount: 0,
          totalOrders: 0,
          avgOrderValue: 0,
          avgUnitPrice: 0,
          efficiency: 0,
          monthlyData: new Map(),
        })
      }

      const performance = performanceMap.get(key)
      const units = Number(item.cantidad_entrega) || 0
      const amount = Number(item.monto_total_entrega) || 0
      const price = Number(item.precio_unitario) || 0

      // Actualizar métricas generales
      performance.totalUnits += units
      performance.totalAmount += amount
      performance.totalOrders += 1
      performance.categories.add(item.categoria)
      performance.suppliers.add(item.razon_social_proveedor)

      // Datos mensuales para tendencias
      const month = item.fecha_publicacion?.substring(0, 7) // YYYY-MM
      if (month) {
        if (!performance.monthlyData.has(month)) {
          performance.monthlyData.set(month, { units: 0, amount: 0, orders: 0 })
        }
        const monthData = performance.monthlyData.get(month)
        monthData.units += units
        monthData.amount += amount
        monthData.orders += 1
      }
    })

    // Calcular métricas finales y eficiencia
    const catalogPerformance = Array.from(performanceMap.values())
      .map((perf) => {
        perf.avgOrderValue = perf.totalAmount / perf.totalOrders
        perf.avgUnitPrice = perf.totalAmount / perf.totalUnits

        // Calcular eficiencia basada en: volumen de ventas, diversidad de categorías, número de proveedores
        const volumeScore = Math.min(perf.totalUnits / 1000, 100) // Normalizar a 100
        const diversityScore = Math.min(perf.categories.size * 10, 100) // Más categorías = más eficiente
        const supplierScore = Math.min(perf.suppliers.size * 5, 100) // Más proveedores = más competitivo

        perf.efficiency = (volumeScore + diversityScore + supplierScore) / 3

        // Convertir sets a arrays
        perf.categories = Array.from(perf.categories)
        perf.suppliers = Array.from(perf.suppliers)

        // Convertir datos mensuales a array ordenado
        perf.monthlyTrend = Array.from(perf.monthlyData.entries())
          .map(([month, data]) => ({ month, ...data }))
          .sort((a, b) => a.month.localeCompare(b.month))

        delete perf.monthlyData // Limpiar el Map original

        return perf
      })
      .sort((a, b) => b.efficiency - a.efficiency)

    // Agrupar por acuerdo marco para análisis comparativo
    const agreementMap = new Map()
    catalogPerformance.forEach((catalog) => {
      const agreement = catalog.codigo_acuerdo_marco
      if (!agreementMap.has(agreement)) {
        agreementMap.set(agreement, {
          codigo_acuerdo_marco: agreement,
          acuerdo_marco: catalog.acuerdo_marco,
          catalogs: [],
          totalCatalogs: 0,
          avgEfficiency: 0,
          totalUnits: 0,
          totalAmount: 0,
        })
      }

      const agreementData = agreementMap.get(agreement)
      agreementData.catalogs.push(catalog)
      agreementData.totalCatalogs += 1
      agreementData.totalUnits += catalog.totalUnits
      agreementData.totalAmount += catalog.totalAmount
    })

    // Calcular eficiencia promedio por acuerdo
    const agreementPerformance = Array.from(agreementMap.values())
      .map((agreement) => {
        agreement.avgEfficiency =
          agreement.catalogs.reduce((sum, cat) => sum + cat.efficiency, 0) / agreement.catalogs.length
        agreement.catalogs = agreement.catalogs.sort((a, b) => b.efficiency - a.efficiency).slice(0, 5) // Top 5 catálogos por acuerdo
        return agreement
      })
      .sort((a, b) => b.avgEfficiency - a.avgEfficiency)

    // Estadísticas generales
    const totalCatalogs = catalogPerformance.length
    const avgEfficiency = catalogPerformance.reduce((sum, cat) => sum + cat.efficiency, 0) / totalCatalogs
    const totalUnits = catalogPerformance.reduce((sum, cat) => sum + cat.totalUnits, 0)
    const totalAmount = catalogPerformance.reduce((sum, cat) => sum + cat.totalAmount, 0)

    return NextResponse.json({
      success: true,
      data: {
        catalogPerformance: catalogPerformance.slice(0, 20), // Top 20 catálogos
        agreementPerformance: agreementPerformance.slice(0, 10), // Top 10 acuerdos
        stats: {
          totalCatalogs,
          avgEfficiency: Math.round(avgEfficiency * 100) / 100,
          totalUnits,
          totalAmount,
          period,
        },
      },
    })
  } catch (error) {
    console.error("Error in catalog performance API:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
