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

// DELETE: Soft delete conversation for current user
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createAuthenticatedServerClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  try {
    const conversationId = params.id

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

    // This will record the exact moment when user deleted the chat
    const { error: deleteError } = await supabaseAdmin.from("chat_conversation_deletions").upsert(
      {
        conversation_id: conversationId,
        user_id: user.id,
        deleted_at: new Date().toISOString(), // This will be stored in UTC
      },
      {
        onConflict: "conversation_id,user_id",
      },
    )

    if (deleteError) {
      console.error("Error marking conversation as deleted:", deleteError)
      throw deleteError
    }

    // Check if all participants have deleted (trigger will handle cleanup)
    const { count: totalParticipants } = await supabaseAdmin
      .from("chat_participants")
      .select("id", { count: "exact", head: true })
      .eq("conversation_id", conversationId)
      .eq("is_active", true)

    const { count: deletionCount } = await supabaseAdmin
      .from("chat_conversation_deletions")
      .select("id", { count: "exact", head: true })
      .eq("conversation_id", conversationId)

    const permanentlyDeleted = (deletionCount || 0) >= (totalParticipants || 0)

    return NextResponse.json({
      success: true,
      permanently_deleted: permanentlyDeleted,
    })
  } catch (error: any) {
    console.error("Error in DELETE conversation:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
