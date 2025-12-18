import { type NextRequest, NextResponse } from "next/server"
import { createAuthenticatedServerClient } from "@/lib/supabase-server"
import { supabaseAdmin } from "@/lib/supabase-admin"

// GET: Get all users for sidebar
export async function GET(request: NextRequest) {
  const supabase = await createAuthenticatedServerClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  try {
    const { data: users, error } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, avatar_url, email, company_id, companies(name, code, color)")
      .neq("id", user.id)
      .order("full_name")

    if (error) {
      console.error("Error fetching users:", error)
      throw error
    }

    return NextResponse.json({ users: users || [] })
  } catch (error: any) {
    console.error("Error in GET /api/chat/users/all:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
