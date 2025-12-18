import { type NextRequest, NextResponse } from "next/server"
import { createAuthenticatedServerClient } from "@/lib/supabase-server"
import { createAdminClient } from "@/lib/supabase-admin"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createAuthenticatedServerClient()

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

    const adminClient = createAdminClient()

    const queryBuilder = adminClient
      .from("profiles")
      .select("id, full_name, avatar_url, email, company_id, companies(name, code, color)")
      .neq("id", user.id)
      .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(20)

    const { data, error } = await queryBuilder

    if (error) {
      console.error("Error searching users:", error)
      throw error
    }

    return NextResponse.json({ users: data || [] })
  } catch (error: any) {
    console.error("Search users error:", error)
    return NextResponse.json({ error: error.message || "Error al buscar usuarios" }, { status: 500 })
  }
}
