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

    // Consulta principal: Rankings por catálogo y número de parte
    const { data, error } = await supabase
      .from("open_data_entries")
      .select(`
        catalogo,
        codigo_acuerdo_marco,
        acuerdo_marco,
        nro_parte,
        descripcion_ficha_producto,
        marca_ficha_producto,
        cantidad_entrega,
        precio_unitario,
        monto_total_entrega,
        categoria,
        fecha_publicacion
      `)
      .gte("fecha_publicacion", startDate.toISOString().split("T")[0])
      .not("catalogo", "is", null)
      .not("nro_parte", "is", null)
      .not("cantidad_entrega", "is", null)
      .gt("cantidad_entrega", 0)

    if (error) {
      console.error("Error fetching rankings by catalog:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    // Procesar datos por catálogo
    const catalogMap = new Map()

    data.forEach((item) => {
      const catalogKey = item.catalogo
      const partKey = `${item.nro_parte}-${item.descripcion_ficha_producto}`

      if (!catalogMap.has(catalogKey)) {
        catalogMap.set(catalogKey, {
          catalog: item.catalogo,
          codigo_acuerdo_marco: item.codigo_acuerdo_marco,
          acuerdo_marco: item.acuerdo_marco,
          products: new Map(),
          totalUnits: 0,
          totalAmount: 0,
          totalOrders: 0,
        })
      }

      const catalog = catalogMap.get(catalogKey)

      if (!catalog.products.has(partKey)) {
        catalog.products.set(partKey, {
          nro_parte: item.nro_parte,
          descripcion: item.descripcion_ficha_producto,
          marca: item.marca_ficha_producto,
          categoria: item.categoria,
          totalUnits: 0,
          totalAmount: 0,
          orders: 0,
          avgPrice: 0,
          minPrice: Number.MAX_VALUE,
          maxPrice: 0,
        })
      }

      const product = catalog.products.get(partKey)
      const units = Number(item.cantidad_entrega) || 0
      const amount = Number(item.monto_total_entrega) || 0
      const price = Number(item.precio_unitario) || 0

      // Actualizar producto
      product.totalUnits += units
      product.totalAmount += amount
      product.orders += 1
      product.avgPrice = product.totalAmount / product.totalUnits
      product.minPrice = Math.min(product.minPrice, price > 0 ? price : product.minPrice)
      product.maxPrice = Math.max(product.maxPrice, price)

      // Actualizar catálogo
      catalog.totalUnits += units
      catalog.totalAmount += amount
      catalog.totalOrders += 1
    })

    // Convertir a array y ordenar
    const catalogRankings = Array.from(catalogMap.values())
      .map((catalog) => ({
        ...catalog,
        products: Array.from(catalog.products.values())
          .sort((a, b) => b.totalUnits - a.totalUnits)
          .slice(0, 10), // Top 10 productos por catálogo
      }))
      .sort((a, b) => b.totalUnits - a.totalUnits)

    // Estadísticas generales
    const totalCatalogs = catalogRankings.length
    const totalProducts = catalogRankings.reduce((sum, cat) => sum + cat.products.length, 0)
    const totalUnits = catalogRankings.reduce((sum, cat) => sum + cat.totalUnits, 0)
    const totalAmount = catalogRankings.reduce((sum, cat) => sum + cat.totalAmount, 0)

    return NextResponse.json({
      success: true,
      data: {
        rankings: catalogRankings.slice(0, 20), // Top 20 catálogos
        stats: {
          totalCatalogs,
          totalProducts,
          totalUnits,
          totalAmount,
          period,
        },
      },
    })
  } catch (error) {
    console.error("Error in rankings by catalog API:", error)
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
