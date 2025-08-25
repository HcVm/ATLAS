import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
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

    // Verificar permisos (solo admin y supervisor pueden eliminar noticias)
    if (profile.role !== "admin" && profile.role !== "supervisor") {
      return NextResponse.json({ error: "Sin permisos para eliminar noticias" }, { status: 403 })
    }

    const newsId = params.id

    // Primero obtener la noticia para verificar permisos
    const { data: newsItem, error: fetchError } = await supabaseServer
      .from("news")
      .select("*")
      .eq("id", newsId)
      .single()

    if (fetchError) {
      console.error("Error fetching news:", fetchError)
      return NextResponse.json({ error: "Noticia no encontrada" }, { status: 404 })
    }

    // Verificar que el supervisor solo pueda eliminar noticias de su empresa
    if (profile.role === "supervisor" && newsItem.company_id !== profile.company_id) {
      return NextResponse.json({ error: "Sin permisos para eliminar esta noticia" }, { status: 403 })
    }

    // Eliminar la noticia
    const { error: deleteError } = await supabaseServer.from("news").delete().eq("id", newsId)

    if (deleteError) {
      console.error("Error deleting news:", deleteError)
      return NextResponse.json({ error: "Error al eliminar la noticia" }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "Noticia eliminada correctamente" })
  } catch (error) {
    console.error("Error in delete news API:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
