import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get("period") || "6months"

    const supabase = createServerClient()

    const now = new Date()
    let startDate: Date

    switch (period) {
      case "3months":
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())
        break
      case "1year":
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
        break
      default: // 6months
        startDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate())
    }

    const startDateStr = startDate.toISOString().split("T")[0]

    const { data: rawData, error } = await supabase
      .from("open_data_entries")
      .select(`
        catalogo,
        descripcion_ficha_producto,
        cantidad_entregada,
        precio_unitario,
        monto_total_entrega,
        orden_electronica
      `)
      .gte("fecha_publicacion", startDateStr)
      .not("catalogo", "is", null)
      .not("descripcion_ficha_producto", "is", null)
      .not("cantidad_entregada", "is", null)
      .gt("cantidad_entregada", 0)

    if (error) {
      console.error("Error fetching products by catalog:", error)
      return NextResponse.json({ success: false, error: "Error consultando datos" }, { status: 500 })
    }

    const productMap = new Map<
      string,
      {
        catalog: string
        totalUnits: number
        avgPrice: number
        totalAmount: number
        orders: number
        priceHistory: number[]
      }
    >()

    rawData?.forEach((item) => {
      const catalog = item.catalogo?.trim() || "Sin Catálogo"
      const product = item.descripcion_ficha_producto?.trim() || "Sin Descripción"
      const units = Number.parseFloat(item.cantidad_entregada?.toString() || "0") || 0
      const unitPrice = Number.parseFloat(item.precio_unitario?.toString() || "0") || 0
      const totalAmount = Number.parseFloat(item.monto_total_entrega?.toString() || "0") || 0

      const key = `${catalog}|${product}`

      if (!productMap.has(key)) {
        productMap.set(key, {
          catalog,
          totalUnits: 0,
          avgPrice: 0,
          totalAmount: 0,
          orders: 0,
          priceHistory: [],
        })
      }

      const productData = productMap.get(key)!
      productData.totalUnits += units
      productData.totalAmount += totalAmount
      productData.orders += 1
      if (unitPrice > 0) {
        productData.priceHistory.push(unitPrice)
      }
    })

    const result = Array.from(productMap.entries())
      .map(([key, data]) => {
        const [catalog, product] = key.split("|")
        const avgPrice =
          data.priceHistory.length > 0
            ? data.priceHistory.reduce((sum, price) => sum + price, 0) / data.priceHistory.length
            : data.totalAmount / data.totalUnits

        return {
          product,
          catalog,
          totalUnits: Math.round(data.totalUnits),
          avgPrice: Math.round(avgPrice * 100) / 100,
          totalAmount: Math.round(data.totalAmount),
          orders: data.orders,
          priceRange:
            data.priceHistory.length > 1
              ? {
                  min: Math.min(...data.priceHistory),
                  max: Math.max(...data.priceHistory),
                }
              : null,
        }
      })
      .sort((a, b) => b.totalUnits - a.totalUnits) // Ordenar por unidades vendidas
      .slice(0, 20) // Top 20 productos más vendidos

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error("Error in products-by-catalog API:", error)
    return NextResponse.json({ success: false, error: "Error interno del servidor" }, { status: 500 })
  }
}
