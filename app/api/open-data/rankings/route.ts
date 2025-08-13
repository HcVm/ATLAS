import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const type = searchParams.get("type") || "products"
  const acuerdo = searchParams.get("acuerdo")
  const categoria = searchParams.get("categoria")
  const catalogo = searchParams.get("catalogo")
  const fechaInicio = searchParams.get("fechaInicio")
  const fechaFin = searchParams.get("fechaFin")
  const limit = Number.parseInt(searchParams.get("limit") || "50")

  const supabase = createServerClient()

  try {
    console.log(`Fetching rankings: type=${type}, acuerdo=${acuerdo}, limit=${limit}`)

    let query = supabase.from("open_data_entries").select("*")

    // Aplicar filtros
    if (acuerdo && acuerdo !== "all") {
      query = query.eq("codigo_acuerdo_marco", acuerdo)
    }
    if (categoria && categoria !== "all") {
      query = query.eq("categoria", categoria)
    }
    if (catalogo && catalogo !== "all") {
      query = query.eq("catalogo", catalogo)
    }
    if (fechaInicio) {
      query = query.gte("fecha_publicacion", fechaInicio)
    }
    if (fechaFin) {
      query = query.lte("fecha_publicacion", fechaFin)
    }

    // Solo órdenes aceptadas
    query = query.eq("estado_orden_electronica", "ACEPTADA")

    const { data, error } = await query

    if (error) {
      console.error("Error fetching data:", error)
      return NextResponse.json({ error: "Error fetching data", details: error.message }, { status: 500 })
    }

    console.log(`Found ${data?.length || 0} records`)

    if (!data || data.length === 0) {
      return NextResponse.json({
        rankings: [],
        total: 0,
        message: "No se encontraron datos para los filtros aplicados",
      })
    }

    let rankings: any[] = []

    switch (type) {
      case "products":
        rankings = generateProductRankings(data, limit)
        break
      case "categories":
        rankings = generateCategoryRankings(data, limit)
        break
      case "catalogs":
        rankings = generateCatalogRankings(data, limit)
        break
      case "brands":
        rankings = generateBrandRankings(data, limit)
        break
      case "suppliers":
        rankings = generateSupplierRankings(data, limit)
        break
      case "entities":
        rankings = generateEntityRankings(data, limit)
        break
      default:
        rankings = generateProductRankings(data, limit)
    }

    console.log(`Generated ${rankings.length} rankings`)

    return NextResponse.json({
      rankings,
      total: data.length,
      type,
      filters: {
        acuerdo,
        categoria,
        catalogo,
        fechaInicio,
        fechaFin,
        limit,
      },
    })
  } catch (error) {
    console.error("Error in rankings API:", error)
    return NextResponse.json(
      {
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
        montoTotal: 0,
        cantidadTotal: 0,
        numeroOrdenes: 0,
        entidades: new Set(),
        proveedores: new Set(),
        precios: [],
      })
    }

    const product = productMap.get(key)
    const monto = Number.parseFloat(item.monto_total_entrega) || 0
    const cantidad = Number.parseFloat(item.cantidad_entrega) || 0
    const precioUnitario = Number.parseFloat(item.precio_unitario_ficha_producto) || 0

    product.montoTotal += monto
    product.cantidadTotal += cantidad
    product.numeroOrdenes += 1
    product.entidades.add(item.razon_social_entidad)
    product.proveedores.add(item.razon_social_proveedor)
    if (precioUnitario > 0) {
      product.precios.push(precioUnitario)
    }
  })

  return Array.from(productMap.values())
    .map((product) => ({
      ...product,
      entidades: product.entidades.size,
      proveedores: product.proveedores.size,
      precioPromedio:
        product.precios.length > 0 ? product.precios.reduce((a, b) => a + b, 0) / product.precios.length : 0,
    }))
    .sort((a, b) => b.montoTotal - a.montoTotal)
    .slice(0, limit)
}

function generateCategoryRankings(data: any[], limit: number) {
  const categoryMap = new Map()

  data.forEach((item) => {
    const key = item.categoria || "Sin categoría"

    if (!categoryMap.has(key)) {
      categoryMap.set(key, {
        categoria: key,
        montoTotal: 0,
        cantidadTotal: 0,
        numeroOrdenes: 0,
        productos: new Set(),
        entidades: new Set(),
        proveedores: new Set(),
      })
    }

    const category = categoryMap.get(key)
    const monto = Number.parseFloat(item.monto_total_entrega) || 0
    const cantidad = Number.parseFloat(item.cantidad_entrega) || 0

    category.montoTotal += monto
    category.cantidadTotal += cantidad
    category.numeroOrdenes += 1
    category.productos.add(item.descripcion_ficha_producto)
    category.entidades.add(item.razon_social_entidad)
    category.proveedores.add(item.razon_social_proveedor)
  })

  return Array.from(categoryMap.values())
    .map((category) => ({
      ...category,
      productos: category.productos.size,
      entidades: category.entidades.size,
      proveedores: category.proveedores.size,
    }))
    .sort((a, b) => b.montoTotal - a.montoTotal)
    .slice(0, limit)
}

function generateCatalogRankings(data: any[], limit: number) {
  const catalogMap = new Map()

  data.forEach((item) => {
    const key = item.catalogo || "Sin catálogo"

    if (!catalogMap.has(key)) {
      catalogMap.set(key, {
        catalogo: key,
        montoTotal: 0,
        cantidadTotal: 0,
        numeroOrdenes: 0,
        productos: new Set(),
        entidades: new Set(),
        proveedores: new Set(),
      })
    }

    const catalog = catalogMap.get(key)
    const monto = Number.parseFloat(item.monto_total_entrega) || 0
    const cantidad = Number.parseFloat(item.cantidad_entrega) || 0

    catalog.montoTotal += monto
    catalog.cantidadTotal += cantidad
    catalog.numeroOrdenes += 1
    catalog.productos.add(item.descripcion_ficha_producto)
    catalog.entidades.add(item.razon_social_entidad)
    catalog.proveedores.add(item.razon_social_proveedor)
  })

  return Array.from(catalogMap.values())
    .map((catalog) => ({
      ...catalog,
      productos: catalog.productos.size,
      entidades: catalog.entidades.size,
      proveedores: catalog.proveedores.size,
    }))
    .sort((a, b) => b.montoTotal - a.montoTotal)
    .slice(0, limit)
}

function generateBrandRankings(data: any[], limit: number) {
  const brandMap = new Map()

  data.forEach((item) => {
    const key = item.marca_ficha_producto || "Sin marca"

    if (!brandMap.has(key)) {
      brandMap.set(key, {
        marca: key,
        montoTotal: 0,
        cantidadTotal: 0,
        numeroOrdenes: 0,
        productos: new Set(),
        entidades: new Set(),
        proveedores: new Set(),
      })
    }

    const brand = brandMap.get(key)
    const monto = Number.parseFloat(item.monto_total_entrega) || 0
    const cantidad = Number.parseFloat(item.cantidad_entrega) || 0

    brand.montoTotal += monto
    brand.cantidadTotal += cantidad
    brand.numeroOrdenes += 1
    brand.productos.add(item.descripcion_ficha_producto)
    brand.entidades.add(item.razon_social_entidad)
    brand.proveedores.add(item.razon_social_proveedor)
  })

  return Array.from(brandMap.values())
    .map((brand) => ({
      ...brand,
      productos: brand.productos.size,
      entidades: brand.entidades.size,
      proveedores: brand.proveedores.size,
    }))
    .sort((a, b) => b.montoTotal - a.montoTotal)
    .slice(0, limit)
}

function generateSupplierRankings(data: any[], limit: number) {
  const supplierMap = new Map()

  data.forEach((item) => {
    const key = item.razon_social_proveedor || "Sin proveedor"

    if (!supplierMap.has(key)) {
      supplierMap.set(key, {
        proveedor: key,
        ruc: item.ruc_proveedor || "Sin RUC",
        montoTotal: 0,
        cantidadTotal: 0,
        numeroOrdenes: 0,
        productos: new Set(),
        entidades: new Set(),
        marcas: new Set(),
      })
    }

    const supplier = supplierMap.get(key)
    const monto = Number.parseFloat(item.monto_total_entrega) || 0
    const cantidad = Number.parseFloat(item.cantidad_entrega) || 0

    supplier.montoTotal += monto
    supplier.cantidadTotal += cantidad
    supplier.numeroOrdenes += 1
    supplier.productos.add(item.descripcion_ficha_producto)
    supplier.entidades.add(item.razon_social_entidad)
    supplier.marcas.add(item.marca_ficha_producto)
  })

  return Array.from(supplierMap.values())
    .map((supplier) => ({
      ...supplier,
      productos: supplier.productos.size,
      entidades: supplier.entidades.size,
      marcas: supplier.marcas.size,
    }))
    .sort((a, b) => b.montoTotal - a.montoTotal)
    .slice(0, limit)
}

function generateEntityRankings(data: any[], limit: number) {
  const entityMap = new Map()

  data.forEach((item) => {
    const key = item.razon_social_entidad || "Sin entidad"

    if (!entityMap.has(key)) {
      entityMap.set(key, {
        entidad: key,
        ruc: item.ruc_entidad || "Sin RUC",
        unidadEjecutora: item.unidad_ejecutora || "Sin unidad",
        montoTotal: 0,
        cantidadTotal: 0,
        numeroOrdenes: 0,
        productos: new Set(),
        proveedores: new Set(),
        marcas: new Set(),
      })
    }

    const entity = entityMap.get(key)
    const monto = Number.parseFloat(item.monto_total_entrega) || 0
    const cantidad = Number.parseFloat(item.cantidad_entrega) || 0

    entity.montoTotal += monto
    entity.cantidadTotal += cantidad
    entity.numeroOrdenes += 1
    entity.productos.add(item.descripcion_ficha_producto)
    entity.proveedores.add(item.razon_social_proveedor)
    entity.marcas.add(item.marca_ficha_producto)
  })

  return Array.from(entityMap.values())
    .map((entity) => ({
      ...entity,
      productos: entity.productos.size,
      proveedores: entity.proveedores.size,
      marcas: entity.marcas.size,
    }))
    .sort((a, b) => b.montoTotal - a.montoTotal)
    .slice(0, limit)
}
