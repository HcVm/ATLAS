import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { createAdminClient } from "@/lib/supabase-admin"

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

export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    const { conversation_id } = await request.json()

    if (!conversation_id) {
      return NextResponse.json({ error: "conversation_id es requerido" }, { status: 400 })
    }

    // Usar admin client para actualizar
    const adminClient = createAdminClient()

    const { error } = await adminClient
      .from("chat_participants")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", conversation_id)
      .eq("user_id", user.id)

    if (error) {
      console.error("[API] Error marking as read:", error)
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[API] Mark read error:", error)
    return NextResponse.json({ error: error.message || "Error al marcar como leído" }, { status: 500 })
  }
}
