// API para manejar presencia de usuarios

import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

async function getSupabaseServerClient() {
  const cookieStore = await cookies()
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get: (name) => cookieStore.get(name)?.value,
      set: () => {},
      remove: () => {},
    },
  })
}

// GET: Obtener usuarios online
export async function GET(request: NextRequest) {
  const supabase = await getSupabaseServerClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const userIds = searchParams.get("user_ids")?.split(",").filter(Boolean)

  try {
    let query = supabase
      .from("chat_user_presence")
      .select(`
        *,
        profiles:user_id (
          id,
          full_name,
          avatar_url
        )
      `)
      .eq("is_online", true)

    if (userIds && userIds.length > 0) {
      query = query.in("user_id", userIds)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({
      online_users: (data || []).map((p) => ({
        user_id: p.user_id,
        is_online: p.is_online,
        last_seen: p.last_seen,
        status: p.status,
        profile: p.profiles,
      })),
    })
  } catch (error: any) {
    console.error("Error fetching presence:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST: Actualizar presencia del usuario
export async function POST(request: NextRequest) {
  const supabase = await getSupabaseServerClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { is_online = true, status = "available" } = body

    const { data, error } = await supabase
      .from("chat_user_presence")
      .upsert({
        user_id: user.id,
        is_online,
        status,
        last_seen: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ presence: data })
  } catch (error: any) {
    console.error("Error updating presence:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
