// app/api/brand-alerts/report-pdf/route.ts
import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { normalizeBrand } from "@/lib/brand-utils"

export async function POST(request: NextRequest) {
  try {
    const { brands, dateRange } = await request.json()
    if (!brands?.length) {
      return NextResponse.json({ error: "Selecciona al menos una marca" }, { status: 400 })
    }

    const normalizedBrands = brands.map(normalizeBrand)
    const uniqueBrands = [...new Set(normalizedBrands)]

    const { data: alerts, error: alertsError } = await supabase
      .from("brand_alerts")
      .select("id, status, brand_name, orden_electronica, created_at")
      .in("brand_name", uniqueBrands)
      .gte("created_at", dateRange?.start || "1900-01-01")
      .lte("created_at", dateRange?.end || "2100-01-01")

    if (alertsError) throw alertsError
    if (!alerts?.length) {
      return NextResponse.json({ success: true, message: "No hay datos" })
    }

    const ordenes = [...new Set(alerts.map(a => a.orden_electronica))]

    const { data: entries, error: entriesError } = await supabase
      .from("open_data_entries")
      .select(`
        orden_electronica,
        acuerdo_marco,
        ruc_proveedor,
        razon_social_proveedor,
        estado_orden_electronica,
        fecha_publicacion,
        monto_total_entrega,
        nro_parte,
        descripcion_ficha_producto,
        marca_ficha_producto,
        cantidad_entrega,
        precio_unitario
      `)
      .in("orden_electronica", ordenes)
      .gt("cantidad_entrega", 0)

    if (entriesError) throw entriesError

    const ordersMap = new Map<string, any>()

    entries.forEach(entry => {
      const key = entry.orden_electronica
      if (!ordersMap.has(key)) {
        ordersMap.set(key, {
          orden_electronica: key,
          acuerdo_marco: entry.acuerdo_marco || "",
          ruc_proveedor: entry.ruc_proveedor,
          razon_social_proveedor: entry.razon_social_proveedor,
          estado_orden_electronica: entry.estado_orden_electronica,
          fecha_publicacion: entry.fecha_publicacion,
          total_sin_igv: 0,
          igv: 0,
          total_con_igv: 0,
          items: [],
        })
      }

      const order = ordersMap.get(key)!
      const subtotal = Number(entry.cantidad_entrega) * Number(entry.precio_unitario)
      const igvItem = subtotal * 0.18
      const totalItem = subtotal + igvItem

      order.total_sin_igv += subtotal
      order.igv += igvItem
      order.total_con_igv += totalItem

      order.items.push({
        nro_parte: entry.nro_parte || "S/N",
        descripcion: entry.descripcion_ficha_producto || "Sin descripción",
        marca: entry.marca_ficha_producto || "Marcas",
        cantidad: Number(entry.cantidad_entrega),
        precio_unitario: Number(entry.precio_unitario),
        subtotal,
        igv: igvItem,
        monto_total: totalItem,
      })
    })

    alerts.forEach(alert => {
      const order = ordersMap.get(alert.orden_electronica)
      if (order) {
        order.alert = { id: alert.id, status: alert.status, brand_name: alert.brand_name }
      }
    })

    const frameworks: Record<string, any> = {}
    ordersMap.forEach(order => {
      const fwKey = order.acuerdo_marco || "SIN ACUERDO"
      if (!frameworks[fwKey]) {
        frameworks[fwKey] = { orders: [], totalAmount: 0, totalOrders: 0 }
      }
      frameworks[fwKey].orders.push(order)
      frameworks[fwKey].totalAmount += order.total_con_igv
      frameworks[fwKey].totalOrders += 1
    })

    return NextResponse.json({
      success: true,
      data: {
        brands: uniqueBrands,
        dateRange,
        frameworks,
      },
    })

  } catch (error: any) {
    console.error("ERROR en report-pdf:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}