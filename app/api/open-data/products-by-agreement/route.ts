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
        acuerdo_marco,
        descripcion_ficha_producto,
        cantidad_entregada,
        precio_unitario,
        monto_total_entrega,
        orden_electronica,
        ruc_proveedor
      `)
      .gte("fecha_publicacion", startDateStr)
      .not("acuerdo_marco", "is", null)
      .not("descripcion_ficha_producto", "is", null)
      .not("cantidad_entregada", "is", null)
      .gt("cantidad_entregada", 0)

    if (error) {
      console.error("Error fetching products by agreement:", error)
      return NextResponse.json({ success: false, error: "Error consultando datos" }, { status: 500 })
    }

    const productMap = new Map<
      string,
      {
        agreement: string
        totalUnits: number
        totalAmount: number
        orders: number
        suppliers: Set<string>
        minPrice: number
        maxPrice: number
        priceSum: number
        priceCount: number
      }
    >()

    rawData?.forEach((item) => {
      const agreement = item.acuerdo_marco?.trim() || "Sin Acuerdo"
      const product = item.descripcion_ficha_producto?.trim() || "Sin Descripción"
      const units = Number.parseFloat(item.cantidad_entregada?.toString() || "0") || 0
      const unitPrice = Number.parseFloat(item.precio_unitario?.toString() || "0") || 0
      const totalAmount = Number.parseFloat(item.monto_total_entrega?.toString() || "0") || 0
      const supplier = item.ruc_proveedor?.toString() || ""

      const key = `${agreement}|${product}`

      if (!productMap.has(key)) {
        productMap.set(key, {
          agreement,
          totalUnits: 0,
          totalAmount: 0,
          orders: 0,
          suppliers: new Set(),
          minPrice: Number.MAX_VALUE,
          maxPrice: 0,
          priceSum: 0,
          priceCount: 0,
        })
      }

      const productData = productMap.get(key)!
      productData.totalUnits += units
      productData.totalAmount += totalAmount
      productData.orders += 1
      if (supplier) productData.suppliers.add(supplier)
      if (unitPrice > 0) {
        productData.priceSum += unitPrice
        productData.priceCount += 1
        productData.minPrice = Math.min(productData.minPrice, unitPrice)
        productData.maxPrice = Math.max(productData.maxPrice, unitPrice)
      }
    })

    const result = Array.from(productMap.entries())
      .map(([key, data]) => {
        const [agreement, product] = key.split("|")
        const avgPrice =
          data.priceCount > 0
            ? data.priceSum / data.priceCount
            : data.totalAmount / data.totalUnits

        return {
          product,
          agreement,
          totalUnits: Math.round(data.totalUnits),
          avgPrice: Math.round(avgPrice * 100) / 100,
          totalAmount: Math.round(data.totalAmount),
          orders: data.orders,
          suppliers: data.suppliers.size,
          priceRange:
            data.priceCount > 1
              ? {
                  min: data.minPrice,
                  max: data.maxPrice,
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
    console.error("Error in products-by-agreement API:", error)
    return NextResponse.json({ success: false, error: "Error interno del servidor" }, { status: 500 })
  }
}
