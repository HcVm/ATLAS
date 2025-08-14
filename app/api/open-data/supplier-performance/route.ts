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
        razon_social_proveedor,
        ruc_proveedor,
        monto_total_entrega,
        orden_electronica,
        descripcion_ficha_producto,
        ruc_entidad,
        estado_orden_electronica
      `)
      .gte("fecha_publicacion", startDateStr)
      .not("razon_social_proveedor", "is", null)
      .not("ruc_proveedor", "is", null)
      .not("monto_total_entrega", "is", null)

    if (error) {
      console.error("Error fetching supplier performance:", error)
      return NextResponse.json({ success: false, error: "Error consultando datos" }, { status: 500 })
    }

    const supplierMap = new Map<
      string,
      {
        name: string
        ruc: string
        totalAmount: number
        orders: Set<string>
        products: Set<string>
        entities: Set<string>
        completedOrders: number
        totalOrders: number
      }
    >()

    const totalMarketAmount =
      rawData?.reduce((sum, item) => {
        return sum + (Number.parseFloat(item.monto_total_entrega?.toString() || "0") || 0)
      }, 0) || 0

    rawData?.forEach((item) => {
      const ruc = item.ruc_proveedor?.toString().trim() || ""
      const name = item.razon_social_proveedor?.trim() || "Sin Nombre"
      const amount = Number.parseFloat(item.monto_total_entrega?.toString() || "0") || 0
      const order = item.orden_electronica?.toString() || ""
      const product = item.descripcion_ficha_producto?.trim() || ""
      const entity = item.ruc_entidad?.toString() || ""
      const status = item.estado_orden_electronica?.toString().toLowerCase() || ""

      if (!ruc) return

      if (!supplierMap.has(ruc)) {
        supplierMap.set(ruc, {
          name,
          ruc,
          totalAmount: 0,
          orders: new Set(),
          products: new Set(),
          entities: new Set(),
          completedOrders: 0,
          totalOrders: 0,
        })
      }

      const supplierData = supplierMap.get(ruc)!
      supplierData.totalAmount += amount
      if (order) {
        supplierData.orders.add(order)
        supplierData.totalOrders++

        // Considerar órdenes completadas/entregadas para calcular confiabilidad
        if (status.includes("entregado") || status.includes("completado") || status.includes("aceptado")) {
          supplierData.completedOrders++
        }
      }
      if (product) supplierData.products.add(product)
      if (entity) supplierData.entities.add(entity)
    })

    const result = Array.from(supplierMap.entries())
      .map(([ruc, data]) => {
        const avgOrderValue = data.orders.size > 0 ? data.totalAmount / data.orders.size : 0
        const marketShare = totalMarketAmount > 0 ? (data.totalAmount / totalMarketAmount) * 100 : 0
        const reliability = data.totalOrders > 0 ? (data.completedOrders / data.totalOrders) * 100 : 0

        return {
          name: data.name,
          ruc: data.ruc,
          totalAmount: Math.round(data.totalAmount),
          orders: data.orders.size,
          products: data.products.size,
          entities: data.entities.size,
          avgOrderValue: Math.round(avgOrderValue),
          marketShare: Math.round(marketShare * 10) / 10,
          reliability: Math.round(reliability * 10) / 10,
        }
      })
      .filter((supplier) => supplier.orders >= 5) // Solo proveedores con al menos 5 órdenes
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 20) // Top 20 proveedores

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error("Error in supplier-performance API:", error)
    return NextResponse.json({ success: false, error: "Error interno del servidor" }, { status: 500 })
  }
}
