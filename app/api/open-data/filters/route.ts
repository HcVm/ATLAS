import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const type = searchParams.get("type")

  const supabase = createServerClient()

  try {
    console.log(`Fetching filters for type: ${type}`)

    if (type === "acuerdos") {
      const { data, error } = await supabase
        .from("open_data_entries")
        .select("codigo_acuerdo_marco")
        .not("codigo_acuerdo_marco", "is", null)

      if (error) {
        console.error("Error fetching acuerdos:", error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
      }

      const acuerdosCount = new Map()
      data.forEach((item) => {
        const acuerdo = item.codigo_acuerdo_marco
        acuerdosCount.set(acuerdo, (acuerdosCount.get(acuerdo) || 0) + 1)
      })

      const acuerdos = Array.from(acuerdosCount.entries())
        .map(([value, count]) => ({ value, label: value, count }))
        .sort((a, b) => b.count - a.count)

      return NextResponse.json({ success: true, data: acuerdos })
    }

    if (type === "categorias") {
      const { data, error } = await supabase.from("open_data_entries").select("categoria").not("categoria", "is", null)

      if (error) {
        console.error("Error fetching categorias:", error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
      }

      const categoriasCount = new Map()
      data.forEach((item) => {
        const categoria = item.categoria
        categoriasCount.set(categoria, (categoriasCount.get(categoria) || 0) + 1)
      })

      const categorias = Array.from(categoriasCount.entries())
        .map(([value, count]) => ({ value, label: value, count }))
        .sort((a, b) => b.count - a.count)

      return NextResponse.json({ success: true, data: categorias })
    }

    if (type === "catalogos") {
      const { data, error } = await supabase.from("open_data_entries").select("catalogo").not("catalogo", "is", null)

      if (error) {
        console.error("Error fetching catalogos:", error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
      }

      const catalogosCount = new Map()
      data.forEach((item) => {
        const catalogo = item.catalogo
        catalogosCount.set(catalogo, (catalogosCount.get(catalogo) || 0) + 1)
      })

      const catalogos = Array.from(catalogosCount.entries())
        .map(([value, count]) => ({ value, label: value, count }))
        .sort((a, b) => b.count - a.count)

      return NextResponse.json({ success: true, data: catalogos })
    }

    // Si no se especifica tipo, devolver todos los filtros
    const [acuerdosRes, categoriasRes, catalogosRes] = await Promise.all([
      supabase.from("open_data_entries").select("codigo_acuerdo_marco").not("codigo_acuerdo_marco", "is", null),
      supabase.from("open_data_entries").select("categoria").not("categoria", "is", null),
      supabase.from("open_data_entries").select("catalogo").not("catalogo", "is", null),
    ])

    if (acuerdosRes.error || categoriasRes.error || catalogosRes.error) {
      console.error("Error fetching filters:", {
        acuerdos: acuerdosRes.error,
        categorias: categoriasRes.error,
        catalogos: catalogosRes.error,
      })
      return NextResponse.json({ success: false, error: "Error fetching filters" }, { status: 500 })
    }

    // Procesar acuerdos
    const acuerdosCount = new Map()
    acuerdosRes.data.forEach((item) => {
      const acuerdo = item.codigo_acuerdo_marco
      acuerdosCount.set(acuerdo, (acuerdosCount.get(acuerdo) || 0) + 1)
    })

    // Procesar categorías
    const categoriasCount = new Map()
    categoriasRes.data.forEach((item) => {
      const categoria = item.categoria
      categoriasCount.set(categoria, (categoriasCount.get(categoria) || 0) + 1)
    })

    // Procesar catálogos
    const catalogosCount = new Map()
    catalogosRes.data.forEach((item) => {
      const catalogo = item.catalogo
      catalogosCount.set(catalogo, (catalogosCount.get(catalogo) || 0) + 1)
    })

    const result = {
      acuerdos: Array.from(acuerdosCount.entries())
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count),
      categorias: Array.from(categoriasCount.entries())
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count),
      catalogos: Array.from(catalogosCount.entries())
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count),
    }

    console.log(`Returning filters:`, {
      acuerdos: result.acuerdos.length,
      categorias: result.categorias.length,
      catalogos: result.catalogos.length,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error in filters API:", error)
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
