import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase-server"
import { createAdminClient } from "@/lib/supabase-admin"

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get("q") || ""

    if (!query.trim()) {
      return NextResponse.json({ users: [] })
    }

    // Obtener perfil del usuario para verificar su empresa
    const { data: userProfile } = await supabase.from("profiles").select("company_id, role").eq("id", user.id).single()

    // Usar admin client para buscar usuarios
    const adminClient = createAdminClient()

    let queryBuilder = adminClient
      .from("profiles")
      .select("id, full_name, avatar_url, email, company_id")
      .neq("id", user.id)
      .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(20)

    // Si no es admin, solo buscar usuarios de la misma empresa
    if (userProfile?.role !== "admin" && userProfile?.company_id) {
      queryBuilder = queryBuilder.eq("company_id", userProfile.company_id)
    }

    const { data, error } = await queryBuilder

    if (error) {
      console.error("[API] Error searching users:", error)
      throw error
    }

    return NextResponse.json({ users: data || [] })
  } catch (error: any) {
    console.error("[API] Search users error:", error)
    return NextResponse.json({ error: error.message || "Error al buscar usuarios" }, { status: 500 })
  }
}
