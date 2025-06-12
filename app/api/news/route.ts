import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"

export async function POST(request: NextRequest) {
  try {
    // Crear un cliente de Supabase en el servidor con las cookies
    const cookieStore = cookies()
    const supabaseServer = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: "", ...options })
          },
        },
      },
    )

    // Obtener la sesión del usuario
    const {
      data: { session },
    } = await supabaseServer.auth.getSession()

    if (!session) {
      console.error("No session found")
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const user = session.user

    // Obtener el perfil del usuario
    const { data: profile, error: profileError } = await supabaseServer
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()

    if (profileError) {
      console.error("Profile error:", profileError)
      return NextResponse.json({ error: "Error al obtener el perfil" }, { status: 500 })
    }

    // Verificar permisos (solo admin y supervisor pueden crear noticias)
    if (profile.role !== "admin" && profile.role !== "supervisor") {
      return NextResponse.json({ error: "Sin permisos para crear noticias" }, { status: 403 })
    }

    const body = await request.json()
    const { title, content, image } = body

    // Validar datos requeridos
    if (!title || !content) {
      return NextResponse.json({ error: "Título y contenido son requeridos" }, { status: 400 })
    }

    // Determinar la empresa para la noticia
    const companyId = profile.role === "admin" ? body.company_id : profile.company_id

    // Crear la noticia
    const { data: news, error: newsError } = await supabaseServer
      .from("news")
      .insert({
        title,
        content,
        image_url: image || null,
        created_by: user.id,
        published: true, // Publicar directamente
        company_id: companyId, // Asignar la empresa seleccionada o la del usuario
      })
      .select()
      .single()

    if (newsError) {
      console.error("Error creating news:", newsError)
      return NextResponse.json({ error: "Error al crear la noticia" }, { status: 500 })
    }

    return NextResponse.json({ success: true, news })
  } catch (error) {
    console.error("Error in news API:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Obtener parámetros de consulta
    const url = new URL(request.url)
    const companyId = url.searchParams.get("company_id")

    let query = supabase
      .from("news")
      .select(`
        *,
        profiles!news_created_by_fkey (full_name)
      `)
      .eq("published", true)
      .order("created_at", { ascending: false })

    // Filtrar por empresa si se proporciona
    if (companyId) {
      query = query.eq("company_id", companyId)
    }

    const { data: news, error } = await query

    if (error) {
      console.error("Error fetching news:", error)
      return NextResponse.json({ error: "Error al obtener noticias" }, { status: 500 })
    }

    return NextResponse.json({ news })
  } catch (error) {
    console.error("Error in news API:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
