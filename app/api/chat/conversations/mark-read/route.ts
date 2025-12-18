import { type NextRequest, NextResponse } from "next/server"
import { createAuthenticatedServerClient } from "@/lib/supabase-server"
import { createAdminClient } from "@/lib/supabase-admin"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createAuthenticatedServerClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    const body = await request.json()
    console.log("[v0] Mark read request body:", body)
    console.log("[v0] User ID:", user.id)

    const { conversation_id } = body

    if (!conversation_id) {
      console.log("[v0] Missing conversation_id in body")
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
      console.error("[v0] Error marking as read:", error)
      throw error
    }

    console.log("[v0] Successfully marked conversation as read:", conversation_id)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[v0] Mark read error:", error)
    return NextResponse.json({ error: error.message || "Error al marcar como leído" }, { status: 500 })
  }
}
