import { type NextRequest, NextResponse } from "next/server"
import { createAuthenticatedServerClient } from "@/lib/supabase-server"
import { supabaseAdmin } from "@/lib/supabase-admin"

// PATCH: Update conversation name
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createAuthenticatedServerClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { name } = body
    const conversationId = params.id

    if (!name?.trim()) {
      return NextResponse.json({ error: "Se requiere un nombre" }, { status: 400 })
    }

    // Verify user is participant
    const { data: participation, error: partError } = await supabaseAdmin
      .from("chat_participants")
      .select("id")
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle()

    if (partError || !participation) {
      return NextResponse.json({ error: "No tienes acceso a esta conversación" }, { status: 403 })
    }

    // Update conversation name
    const { error: updateError } = await supabaseAdmin
      .from("chat_conversations")
      .update({ name: name.trim() })
      .eq("id", conversationId)

    if (updateError) {
      console.error("Error updating conversation name:", updateError)
      throw updateError
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error in PATCH conversation:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
