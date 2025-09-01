import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"

// Definir los acuerdos marco válidos
const ACUERDOS_MARCO = {
  "EXT-CE-2024-11 MOBILIARIO EN GENERAL": {
    id: "EXT-CE-2024-11",
    name: "Mobiliario en General",
  },
  "EXT-CE-2024-16 ACCESORIOS DOMÉSTICOS Y BIENES PARA USOS DIVERSOS": {
    id: "EXT-CE-2024-16",
    name: "Accesorios Domésticos y Bienes Diversos",
  },
  "EXT-CE-2024-26 MAQUINAS, EQUIPOS Y HERRAMIENTAS PARA JARDINERIA, SILVICULTURA Y AGRICULTURA": {
    id: "EXT-CE-2024-26",
    name: "Máquinas y Equipos de Jardinería",
  },
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const acuerdoMarcoFullString = searchParams.get("acuerdo")
  const exportAll = searchParams.get("export")

  if (!acuerdoMarcoFullString || exportAll !== "all") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // Ignore server component cookie setting
          }
        },
      },
    },
  )

  try {
    // Get agreement info
    const acuerdoInfo = ACUERDOS_MARCO[acuerdoMarcoFullString as keyof typeof ACUERDOS_MARCO]
    if (!acuerdoInfo) {
      return NextResponse.json({ error: "Invalid agreement" }, { status: 400 })
    }

    // Build query
    let query = supabase
      .from("open_data_entries")
      .select("*")
      .eq("codigo_acuerdo_marco", acuerdoInfo.id)
      .order("fecha_aceptacion", { ascending: false })

    // Apply filters
    const search = searchParams.get("search")
    const entidad = searchParams.get("entidad")
    const proveedor = searchParams.get("proveedor")
    const fechaDesde = searchParams.get("fecha_desde")
    const fechaHasta = searchParams.get("fecha_hasta")

    if (search?.trim()) {
      query = query.or(
        `descripcion_ficha_producto.ilike.%${search.trim()}%,razon_social_entidad.ilike.%${search.trim()}%,razon_social_proveedor.ilike.%${search.trim()}%`,
      )
    }

    if (entidad?.trim()) {
      query = query.ilike("razon_social_entidad", `%${entidad.trim()}%`)
    }

    if (proveedor?.trim()) {
      query = query.ilike("razon_social_proveedor", `%${proveedor.trim()}%`)
    }

    if (fechaDesde) {
      query = query.gte("fecha_publicacion", fechaDesde)
    }

    if (fechaHasta) {
      query = query.lte("fecha_publicacion", fechaHasta)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching data:", error)
      return NextResponse.json({ error: "Error fetching data" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
