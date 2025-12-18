import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase-server"
import { createAdminClient } from "@/lib/supabase-admin"

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
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
