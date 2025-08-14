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

    // Consulta principal: Rankings de marcas
    const { data, error } = await supabase
      .from("open_data_entries")
      .select(`
        marca_ficha_producto,
        nro_parte,
        descripcion_ficha_producto,
        categoria,
        catalogo,
        codigo_acuerdo_marco,
        cantidad_entrega,
        precio_unitario,
        monto_total_entrega,
        fecha_publicacion
      `)
      .gte("fecha_publicacion", startDate.toISOString().split("T")[0])
      .not("marca_ficha_producto", "is", null)
      .not("cantidad_entrega", "is", null)
      .gt("cantidad_entrega", 0)

    if (error) {
      console.error("Error fetching brand rankings:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    // Procesar datos por marca
    const brandMap = new Map()

    data.forEach((item) => {
      const brand = item.marca_ficha_producto?.trim().toUpperCase()
      if (!brand) return

      const productKey = `${item.nro_parte}-${item.descripcion_ficha_producto}`

      if (!brandMap.has(brand)) {
        brandMap.set(brand, {
          brand: item.marca_ficha_producto,
          products: new Map(),
          categories: new Set(),
          catalogs: new Set(),
          agreements: new Set(),
          totalUnits: 0,
          totalAmount: 0,
          totalOrders: 0,
          avgPrice: 0,
        })
      }

      const brandData = brandMap.get(brand)

      if (!brandData.products.has(productKey)) {
        brandData.products.set(productKey, {
          nro_parte: item.nro_parte,
          descripcion: item.descripcion_ficha_producto,
          categoria: item.categoria,
          catalogo: item.catalogo,
          totalUnits: 0,
          totalAmount: 0,
          orders: 0,
          avgPrice: 0,
        })
      }

      const product = brandData.products.get(productKey)
      const units = Number(item.cantidad_entrega) || 0
      const amount = Number(item.monto_total_entrega) || 0

      // Actualizar producto
      product.totalUnits += units
      product.totalAmount += amount
      product.orders += 1
      product.avgPrice = product.totalAmount / product.totalUnits

      // Actualizar marca
      brandData.totalUnits += units
      brandData.totalAmount += amount
      brandData.totalOrders += 1
      brandData.categories.add(item.categoria)
      brandData.catalogs.add(item.catalogo)
      brandData.agreements.add(item.codigo_acuerdo_marco)
    })

    // Convertir a array y calcular métricas finales
    const brandRankings = Array.from(brandMap.values())
      .map((brand) => ({
        ...brand,
        avgPrice: brand.totalAmount / brand.totalUnits,
        categories: Array.from(brand.categories),
        catalogs: Array.from(brand.catalogs),
        agreements: Array.from(brand.agreements),
        topProducts: Array.from(brand.products.values())
          .sort((a, b) => b.totalUnits - a.totalUnits)
          .slice(0, 5), // Top 5 productos por marca
      }))
      .sort((a, b) => b.totalUnits - a.totalUnits)

    // Identificar marcas objetivo (nuestras marcas)
    const targetBrands = ["WORLDLIFE", "HOPE LIFE", "HOPELIFE", "ZEUS", "VALHALLA"]
    const ourBrands = brandRankings.filter((brand) =>
      targetBrands.some((target) => brand.brand.toUpperCase().includes(target)),
    )

    // Top marcas competidoras
    const competitorBrands = brandRankings
      .filter((brand) => !targetBrands.some((target) => brand.brand.toUpperCase().includes(target)))
      .slice(0, 15)

    // Estadísticas generales
    const totalBrands = brandRankings.length
    const totalUnits = brandRankings.reduce((sum, brand) => sum + brand.totalUnits, 0)
    const totalAmount = brandRankings.reduce((sum, brand) => sum + brand.totalAmount, 0)

    return NextResponse.json({
      success: true,
      data: {
        ourBrands,
        competitorBrands,
        allBrands: brandRankings.slice(0, 20), // Top 20 marcas
        stats: {
          totalBrands,
          totalUnits,
          totalAmount,
          ourBrandsCount: ourBrands.length,
          period,
        },
      },
    })
  } catch (error) {
    console.error("Error in brand rankings API:", error)
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
