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
        categoria,
        descripcion_ficha_producto,
        monto_total_entrega,
        orden_electronica
      `)
      .gte("fecha_publicacion", startDateStr)
      .not("categoria", "is", null)
      .not("monto_total_entrega", "is", null)

    if (error) {
      console.error("Error fetching category distribution:", error)
      return NextResponse.json({ success: false, error: "Error consultando datos" }, { status: 500 })
    }

    const categoryMap = new Map<string, { products: Set<string>; amount: number; orders: Set<string> }>()

    rawData?.forEach((item) => {
      const category = item.categoria?.trim() || "Sin Categoría"
      const product = item.descripcion_ficha_producto?.trim() || ""
      const amount = Number.parseFloat(item.monto_total_entrega?.toString() || "0") || 0
      const order = item.orden_electronica?.toString() || ""

      if (!categoryMap.has(category)) {
        categoryMap.set(category, {
          products: new Set(),
          amount: 0,
          orders: new Set(),
        })
      }

      const categoryData = categoryMap.get(category)!
      if (product) categoryData.products.add(product)
      categoryData.amount += amount
      if (order) categoryData.orders.add(order)
    })

    const totalAmount = Array.from(categoryMap.values()).reduce((sum, data) => sum + data.amount, 0)

    const result = Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        productCount: data.products.size,
        totalAmount: Math.round(data.amount),
        percentage: totalAmount > 0 ? Math.round((data.amount / totalAmount) * 1000) / 10 : 0,
        orders: data.orders.size,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount)

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error("Error in category-distribution API:", error)
    return NextResponse.json({ success: false, error: "Error interno del servidor" }, { status: 500 })
  }
}
