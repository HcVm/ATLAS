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

    const [
      totalAmountResult,
      totalOrdersResult,
      totalProductsResult,
      totalSuppliersResult,
      totalEntitiesResult,
      totalAgreementsResult,
    ] = await Promise.all([
      // Monto total
      supabase
        .from("open_data_entries")
        .select("monto_total_entrega")
        .gte("fecha_publicacion", startDateStr),

      // Total de órdenes
      supabase
        .from("open_data_entries")
        .select("orden_electronica")
        .gte("fecha_publicacion", startDateStr),

      // Total de productos únicos
      supabase
        .from("open_data_entries")
        .select("descripcion_ficha_producto")
        .gte("fecha_publicacion", startDateStr),

      // Total de proveedores únicos
      supabase
        .from("open_data_entries")
        .select("ruc_proveedor")
        .gte("fecha_publicacion", startDateStr),

      // Total de entidades únicas
      supabase
        .from("open_data_entries")
        .select("ruc_entidad")
        .gte("fecha_publicacion", startDateStr),

      // Total de acuerdos únicos
      supabase
        .from("open_data_entries")
        .select("codigo_acuerdo_marco")
        .gte("fecha_publicacion", startDateStr),
    ])

    const totalAmount =
      totalAmountResult.data?.reduce(
        (sum, item) => sum + (Number.parseFloat(item.monto_total_entrega?.toString() || "0") || 0),
        0,
      ) || 0

    const uniqueOrders = new Set(totalOrdersResult.data?.map((item) => item.orden_electronica).filter(Boolean))
    const totalOrders = uniqueOrders.size

    const uniqueProducts = new Set(
      totalProductsResult.data?.map((item) => item.descripcion_ficha_producto).filter(Boolean),
    )
    const totalProducts = uniqueProducts.size

    const uniqueSuppliers = new Set(totalSuppliersResult.data?.map((item) => item.ruc_proveedor).filter(Boolean))
    const totalSuppliers = uniqueSuppliers.size

    const uniqueEntities = new Set(totalEntitiesResult.data?.map((item) => item.ruc_entidad).filter(Boolean))
    const totalEntities = uniqueEntities.size

    const uniqueAgreements = new Set(
      totalAgreementsResult.data?.map((item) => item.codigo_acuerdo_marco).filter(Boolean),
    )
    const totalAgreements = uniqueAgreements.size

    const avgOrderValue = totalOrders > 0 ? totalAmount / totalOrders : 0

    const previousStartDate = new Date(startDate)
    switch (period) {
      case "3months":
        previousStartDate.setMonth(previousStartDate.getMonth() - 3)
        break
      case "1year":
        previousStartDate.setFullYear(previousStartDate.getFullYear() - 1)
        break
      default: // 6months
        previousStartDate.setMonth(previousStartDate.getMonth() - 6)
    }

    const { data: previousData } = await supabase
      .from("open_data_entries")
      .select("monto_total_entrega")
      .gte("fecha_publicacion", previousStartDate.toISOString().split("T")[0])
      .lt("fecha_publicacion", startDateStr)

    const previousAmount =
      previousData?.reduce(
        (sum, item) => sum + (Number.parseFloat(item.monto_total_entrega?.toString() || "0") || 0),
        0,
      ) || 0

    const growthRate = previousAmount > 0 ? ((totalAmount - previousAmount) / previousAmount) * 100 : 0

    const data = {
      totalAmount: Math.round(totalAmount),
      totalOrders,
      totalProducts,
      totalSuppliers,
      totalEntities,
      totalAgreements,
      avgOrderValue: Math.round(avgOrderValue),
      growthRate: Math.round(growthRate * 100) / 100,
    }

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error) {
    console.error("Error in market-stats API:", error)
    return NextResponse.json({ success: false, error: "Error interno del servidor" }, { status: 500 })
  }
}
