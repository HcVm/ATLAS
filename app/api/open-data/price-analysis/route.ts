import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get("period") || "6months"

    const supabase = createServerClient()

    const now = new Date()
    let currentStartDate: Date
    let previousStartDate: Date

    switch (period) {
      case "3months":
        currentStartDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())
        previousStartDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate())
        break
      case "1year":
        currentStartDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
        previousStartDate = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate())
        break
      default: // 6months
        currentStartDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate())
        previousStartDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
    }

    const currentStartDateStr = currentStartDate.toISOString().split("T")[0]
    const previousStartDateStr = previousStartDate.toISOString().split("T")[0]

    // Obtener datos del período actual
    const { data: currentData, error: currentError } = await supabase
      .from("open_data_entries")
      .select(`
        descripcion_ficha_producto,
        precio_unitario,
        orden_electronica,
        fecha_publicacion
      `)
      .gte("fecha_publicacion", currentStartDateStr)
      .not("descripcion_ficha_producto", "is", null)
      .not("precio_unitario", "is", null)
      .gt("precio_unitario", 0)

    if (currentError) {
      console.error("Error fetching current price data:", currentError)
      return NextResponse.json({ success: false, error: "Error consultando datos actuales" }, { status: 500 })
    }

    // Obtener datos del período anterior
    const { data: previousData, error: previousError } = await supabase
      .from("open_data_entries")
      .select(`
        descripcion_ficha_producto,
        precio_unitario,
        fecha_publicacion
      `)
      .gte("fecha_publicacion", previousStartDateStr)
      .lt("fecha_publicacion", currentStartDateStr)
      .not("descripcion_ficha_producto", "is", null)
      .not("precio_unitario", "is", null)
      .gt("precio_unitario", 0)

    if (previousError) {
      console.error("Error fetching previous price data:", previousError)
      return NextResponse.json({ success: false, error: "Error consultando datos anteriores" }, { status: 500 })
    }

    // Procesar datos actuales
    const currentPrices = new Map<string, { prices: number[]; orders: Set<string> }>()
    currentData?.forEach((item) => {
      const product = item.descripcion_ficha_producto?.trim() || ""
      const price = Number.parseFloat(item.precio_unitario?.toString() || "0")
      const order = item.orden_electronica?.toString() || ""

      if (product && price > 0) {
        if (!currentPrices.has(product)) {
          currentPrices.set(product, { prices: [], orders: new Set() })
        }
        const productData = currentPrices.get(product)!
        productData.prices.push(price)
        if (order) productData.orders.add(order)
      }
    })

    // Procesar datos anteriores
    const previousPrices = new Map<string, number[]>()
    previousData?.forEach((item) => {
      const product = item.descripcion_ficha_producto?.trim() || ""
      const price = Number.parseFloat(item.precio_unitario?.toString() || "0")

      if (product && price > 0) {
        if (!previousPrices.has(product)) {
          previousPrices.set(product, [])
        }
        previousPrices.get(product)!.push(price)
      }
    })

    // Calcular análisis de precios
    const result = Array.from(currentPrices.entries())
      .map(([product, currentData]) => {
        const currentAvgPrice = currentData.prices.reduce((sum, price) => sum + price, 0) / currentData.prices.length
        const previousProductPrices = previousPrices.get(product) || []
        const previousAvgPrice =
          previousProductPrices.length > 0
            ? previousProductPrices.reduce((sum, price) => sum + price, 0) / previousProductPrices.length
            : currentAvgPrice

        const change = currentAvgPrice - previousAvgPrice
        const changePercent = previousAvgPrice > 0 ? (change / previousAvgPrice) * 100 : 0

        let trend: "up" | "down" | "stable"
        if (Math.abs(changePercent) < 2) {
          trend = "stable"
        } else if (changePercent > 0) {
          trend = "up"
        } else {
          trend = "down"
        }

        return {
          product,
          currentPrice: Math.round(currentAvgPrice * 100) / 100,
          previousPrice: Math.round(previousAvgPrice * 100) / 100,
          change: Math.round(change * 100) / 100,
          changePercent: Math.round(changePercent * 10) / 10,
          trend,
          orders: currentData.orders.size,
        }
      })
      .filter((item) => item.orders >= 5) // Solo productos con al menos 5 órdenes
      .sort((a, b) => b.orders - a.orders)
      .slice(0, 20) // Top 20 productos más comprados

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error("Error in price-analysis API:", error)
    return NextResponse.json({ success: false, error: "Error interno del servidor" }, { status: 500 })
  }
}
