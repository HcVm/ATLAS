import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const type = searchParams.get("type") || "productos"
  const acuerdo = searchParams.get("acuerdo")
  const categoria = searchParams.get("categoria")
  const catalogo = searchParams.get("catalogo")
  const fechaInicio = searchParams.get("fechaInicio")
  const fechaFin = searchParams.get("fechaFin")
  const period = searchParams.get("period") || "6months"
  const limit = Number.parseInt(searchParams.get("limit") || "50")

  const supabase = createServerClient()

  console.log(`[Rankings API] Fetching: type=${type}, acuerdo=${acuerdo}, catalogo=${catalogo}, period=${period}`)

  try {
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

    let query = supabase.from("open_data_entries").select("*")

    const dateFilter = fechaInicio || startDate.toISOString().split("T")[0]
    query = query.gte("fecha_publicacion", dateFilter)

    if (fechaFin) {
      query = query.lte("fecha_publicacion", fechaFin)
    }

    if (acuerdo && acuerdo !== "all" && acuerdo.trim() !== "") {
      console.log(`[Rankings API] Applying acuerdo filter: ${acuerdo}`)
      query = query.eq("codigo_acuerdo_marco", acuerdo)
    }

    if (categoria && categoria !== "all" && categoria.trim() !== "") {
      console.log(`[Rankings API] Applying categoria filter: ${categoria}`)
      query = query.eq("categoria", categoria)
    }

    if (catalogo && catalogo !== "all" && catalogo.trim() !== "") {
      console.log(`[Rankings API] Applying catalogo filter: ${catalogo}`)
      query = query.eq("catalogo", catalogo)
    }

    // Only accepted orders
    query = query.eq("estado_orden_electronica", "ACEPTADA")

    const { data, error } = await query

    if (error) {
      console.error("Error fetching data:", error)
      return NextResponse.json({ error: "Error fetching data", details: error.message }, { status: 500 })
    }

    console.log(`[Rankings API] Found ${data?.length || 0} records after filtering`)

    if (!data || data.length === 0) {
      return NextResponse.json({
        success: false,
        data: [],
        total: 0,
        message: "No se encontraron datos para los filtros aplicados",
        appliedFilters: { acuerdo, categoria, catalogo, period },
      })
    }

    let rankings: any[] = []

    switch (type) {
      case "productos":
        rankings = generateProductRankings(data, limit)
        break
      case "categorias":
        rankings = generateCategoryRankings(data, limit)
        break
      case "catalogos":
        rankings = generateCatalogRankings(data, limit)
        break
      case "marcas":
        rankings = generateBrandRankings(data, limit)
        break
      case "proveedores":
        rankings = generateSupplierRankings(data, limit)
        break
      case "entidades":
        rankings = generateEntityRankings(data, limit)
        break
      default:
        rankings = generateProductRankings(data, limit)
    }

    rankings = rankings.map((item, index) => ({
      ...item,
      ranking: index + 1,
    }))

    return NextResponse.json({
      success: true,
      data: rankings,
      total: data.length,
      type,
      filters: {
        acuerdo,
        categoria,
        catalogo,
        fechaInicio,
        fechaFin,
        limit,
        period,
      },
    })
  } catch (error) {
    console.error("Error in rankings API:", error)
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

function generateProductRankings(data: any[], limit: number) {
  const productMap = new Map()

  data.forEach((item) => {
    const key = `${item.descripcion_ficha_producto || "Sin descripción"}_${item.marca_ficha_producto || "Sin marca"}`

    if (!productMap.has(key)) {
      productMap.set(key, {
        descripcion: item.descripcion_ficha_producto || "Sin descripción",
        marca: item.marca_ficha_producto || "Sin marca",
        categoria: item.categoria || "Sin categoría",
        catalogo: item.catalogo || "Sin catálogo",
        monto_total: 0,
        cantidad_total: 0,
        numero_ordenes: 0,
        entidades_compradoras: new Set(),
        proveedores_vendedores: new Set(),
        precios: [],
      })
    }

    const product = productMap.get(key)
    const monto = Number.parseFloat(item.monto_total_entrega) || 0
    const cantidad = Number.parseFloat(item.cantidad_entrega) || 0
    const precioUnitario = Number.parseFloat(item.precio_unitario) || 0

    product.monto_total += monto
    product.cantidad_total += cantidad
    product.numero_ordenes += 1
    product.entidades_compradoras.add(item.razon_social_entidad)
    product.proveedores_vendedores.add(item.razon_social_proveedor)
    if (precioUnitario > 0) {
      product.precios.push(precioUnitario)
    }
  })

  return Array.from(productMap.values())
    .map((product) => ({
      descripcion: product.descripcion,
      marca: product.marca,
      categoria: product.categoria,
      catalogo: product.catalogo,
      cantidad_total: Math.round(product.cantidad_total),
      monto_total: Math.round(product.monto_total),
      numero_ordenes: product.numero_ordenes,
      entidades_compradoras: product.entidades_compradoras.size,
      proveedores_vendedores: product.proveedores_vendedores.size,
      precio_promedio:
        product.precios.length > 0 ? product.precios.reduce((a, b) => a + b, 0) / product.precios.length : 0,
    }))
    .sort((a, b) => b.monto_total - a.monto_total)
    .slice(0, limit)
}

function generateCategoryRankings(data: any[], limit: number) {
  const categoryMap = new Map()

  data.forEach((item) => {
    const key = item.categoria || "Sin categoría"

    if (!categoryMap.has(key)) {
      categoryMap.set(key, {
        categoria: key,
        monto_total: 0,
        cantidad_total: 0,
        numero_ordenes: 0,
        productos_unicos: new Set(),
        entidades_compradoras: new Set(),
        proveedores_vendedores: new Set(),
      })
    }

    const category = categoryMap.get(key)
    const monto = Number.parseFloat(item.monto_total_entrega) || 0
    const cantidad = Number.parseFloat(item.cantidad_entrega) || 0

    category.monto_total += monto
    category.cantidad_total += cantidad
    category.numero_ordenes += 1
    category.productos_unicos.add(item.descripcion_ficha_producto)
    category.entidades_compradoras.add(item.razon_social_entidad)
    category.proveedores_vendedores.add(item.razon_social_proveedor)
  })

  return Array.from(categoryMap.values())
    .map((category) => ({
      categoria: category.categoria,
      monto_total: Math.round(category.monto_total),
      cantidad_total: Math.round(category.cantidad_total),
      numero_ordenes: category.numero_ordenes,
      productos_unicos: category.productos_unicos.size,
      entidades_compradoras: category.entidades_compradoras.size,
      proveedores_vendedores: category.proveedores_vendedores.size,
    }))
    .sort((a, b) => b.monto_total - a.monto_total)
    .slice(0, limit)
}

function generateCatalogRankings(data: any[], limit: number) {
  const catalogMap = new Map()

  data.forEach((item) => {
    const key = item.catalogo || "Sin catálogo"

    if (!catalogMap.has(key)) {
      catalogMap.set(key, {
        catalogo: key,
        monto_total: 0,
        cantidad_total: 0,
        numero_ordenes: 0,
        productos_unicos: new Set(),
        entidades_compradoras: new Set(),
        proveedores_vendedores: new Set(),
      })
    }

    const catalog = catalogMap.get(key)
    const monto = Number.parseFloat(item.monto_total_entrega) || 0
    const cantidad = Number.parseFloat(item.cantidad_entrega) || 0

    catalog.monto_total += monto
    catalog.cantidad_total += cantidad
    catalog.numero_ordenes += 1
    catalog.productos_unicos.add(item.descripcion_ficha_producto)
    catalog.entidades_compradoras.add(item.razon_social_entidad)
    catalog.proveedores_vendedores.add(item.razon_social_proveedor)
  })

  return Array.from(catalogMap.values())
    .map((catalog) => ({
      catalogo: catalog.catalogo,
      monto_total: Math.round(catalog.monto_total),
      cantidad_total: Math.round(catalog.cantidad_total),
      numero_ordenes: catalog.numero_ordenes,
      productos_unicos: catalog.productos_unicos.size,
      entidades_compradoras: catalog.entidades_compradoras.size,
      proveedores_vendedores: catalog.proveedores_vendedores.size,
    }))
    .sort((a, b) => b.monto_total - a.monto_total)
    .slice(0, limit)
}

function generateBrandRankings(data: any[], limit: number) {
  const brandMap = new Map()

  data.forEach((item) => {
    const key = item.marca_ficha_producto || "Sin marca"

    if (!brandMap.has(key)) {
      brandMap.set(key, {
        marca: key,
        monto_total: 0,
        cantidad_total: 0,
        numero_ordenes: 0,
        productos_unicos: new Set(),
        entidades_compradoras: new Set(),
        proveedores_vendedores: new Set(),
      })
    }

    const brand = brandMap.get(key)
    const monto = Number.parseFloat(item.monto_total_entrega) || 0
    const cantidad = Number.parseFloat(item.cantidad_entrega) || 0

    brand.monto_total += monto
    brand.cantidad_total += cantidad
    brand.numero_ordenes += 1
    brand.productos_unicos.add(item.descripcion_ficha_producto)
    brand.entidades_compradoras.add(item.razon_social_entidad)
    brand.proveedores_vendedores.add(item.razon_social_proveedor)
  })

  return Array.from(brandMap.values())
    .map((brand) => ({
      marca: brand.marca,
      monto_total: Math.round(brand.monto_total),
      cantidad_total: Math.round(brand.cantidad_total),
      numero_ordenes: brand.numero_ordenes,
      productos_unicos: brand.productos_unicos.size,
      entidades_compradoras: brand.entidades_compradoras.size,
      proveedores_vendedores: brand.proveedores_vendedores.size,
    }))
    .sort((a, b) => b.monto_total - a.monto_total)
    .slice(0, limit)
}

function generateSupplierRankings(data: any[], limit: number) {
  const supplierMap = new Map()

  data.forEach((item) => {
    const key = item.razon_social_proveedor || "Sin proveedor"

    if (!supplierMap.has(key)) {
      supplierMap.set(key, {
        razon_social: key,
        ruc: item.ruc_proveedor || "Sin RUC",
        monto_total: 0,
        cantidad_total: 0,
        numero_ordenes: 0,
        productos_unicos: new Set(),
        entidades_clientes: new Set(),
        marcas: new Set(),
      })
    }

    const supplier = supplierMap.get(key)
    const monto = Number.parseFloat(item.monto_total_entrega) || 0
    const cantidad = Number.parseFloat(item.cantidad_entrega) || 0

    supplier.monto_total += monto
    supplier.cantidad_total += cantidad
    supplier.numero_ordenes += 1
    supplier.productos_unicos.add(item.descripcion_ficha_producto)
    supplier.entidades_clientes.add(item.razon_social_entidad)
    supplier.marcas.add(item.marca_ficha_producto)
  })

  return Array.from(supplierMap.values())
    .map((supplier) => ({
      razon_social: supplier.razon_social,
      ruc: supplier.ruc,
      monto_total: Math.round(supplier.monto_total),
      cantidad_total: Math.round(supplier.cantidad_total),
      numero_ordenes: supplier.numero_ordenes,
      productos_unicos: supplier.productos_unicos.size,
      entidades_clientes: supplier.entidades_clientes.size,
      marcas: supplier.marcas.size,
    }))
    .sort((a, b) => b.monto_total - a.monto_total)
    .slice(0, limit)
}

function generateEntityRankings(data: any[], limit: number) {
  const entityMap = new Map()

  data.forEach((item) => {
    const key = item.razon_social_entidad || "Sin entidad"

    if (!entityMap.has(key)) {
      entityMap.set(key, {
        razon_social: key,
        ruc: item.ruc_entidad || "Sin RUC",
        unidad_ejecutora: item.unidad_ejecutora || "Sin unidad",
        monto_total: 0,
        cantidad_total: 0,
        numero_ordenes: 0,
        productos_unicos: new Set(),
        proveedores_vendedores: new Set(),
        marcas: new Set(),
      })
    }

    const entity = entityMap.get(key)
    const monto = Number.parseFloat(item.monto_total_entrega) || 0
    const cantidad = Number.parseFloat(item.cantidad_entrega) || 0

    entity.monto_total += monto
    entity.cantidad_total += cantidad
    entity.numero_ordenes += 1
    entity.productos_unicos.add(item.descripcion_ficha_producto)
    entity.proveedores_vendedores.add(item.razon_social_proveedor)
    entity.marcas.add(item.marca_ficha_producto)
  })

  return Array.from(entityMap.values())
    .map((entity) => ({
      razon_social: entity.razon_social,
      ruc: entity.ruc,
      unidad_ejecutora: entity.unidad_ejecutora,
      monto_total: Math.round(entity.monto_total),
      cantidad_total: Math.round(entity.cantidad_total),
      numero_ordenes: entity.numero_ordenes,
      productos_unicos: entity.productos_unicos.size,
      proveedores_vendedores: entity.proveedores_vendedores.size,
      marcas: entity.marcas.size,
    }))
    .sort((a, b) => b.monto_total - a.monto_total)
    .slice(0, limit)
}
