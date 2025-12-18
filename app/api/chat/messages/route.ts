// API para manejar mensajes de chat

import { type NextRequest, NextResponse } from "next/server"
import { createAuthenticatedServerClient } from "@/lib/supabase-server"
import { supabaseAdmin } from "@/lib/supabase-admin"

// GET: Obtener mensajes de una conversación
export async function GET(request: NextRequest) {
  const supabase = await createAuthenticatedServerClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const conversationId = searchParams.get("conversation_id")
  const offset = Number.parseInt(searchParams.get("offset") || "0")
  const limit = Number.parseInt(searchParams.get("limit") || "50")

  if (!conversationId) {
    return NextResponse.json({ error: "Se requiere conversation_id" }, { status: 400 })
  }

  try {
    const { data: participation, error: partError } = await supabaseAdmin
      .from("chat_participants")
      .select("id")
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle()

    if (partError) {
      console.error("[v0] Error checking participation:", partError)
      return NextResponse.json({ error: "Error verificando participación" }, { status: 500 })
    }

    if (!participation) {
      return NextResponse.json({ error: "No tienes acceso a esta conversación" }, { status: 403 })
    }

    const { data: messages, error: msgError } = await supabaseAdmin
      .from("chat_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .range(offset, offset + limit - 1)

    if (msgError) {
      console.error("[v0] Error fetching messages:", msgError)
      throw msgError
    }

    const senderIds = [...new Set(messages?.map((m) => m.sender_id) || [])]
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, avatar_url, email")
      .in("id", senderIds)

    if (profilesError) {
      console.error("[v0] Error fetching profiles:", profilesError)
    }

    const profilesMap = new Map(profiles?.map((p) => [p.id, p]) || [])

    const processedMessages = (messages || []).map((msg) => ({
      ...msg,
      sender: profilesMap.get(msg.sender_id) || null,
    }))

    console.log("[v0] Loaded", processedMessages.length, "messages for conversation", conversationId)

    return NextResponse.json({ messages: processedMessages })
  } catch (error: any) {
    console.error("[v0] Error in GET /api/chat/messages:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST: Enviar un mensaje
export async function POST(request: NextRequest) {
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
    const { conversation_id, content, message_type = "text" } = body

    if (!conversation_id || !content?.trim()) {
      return NextResponse.json({ error: "Se requiere conversation_id y content" }, { status: 400 })
    }

    const { data: participation, error: partError } = await supabaseAdmin
      .from("chat_participants")
      .select("id")
      .eq("conversation_id", conversation_id)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle()

    if (partError || !participation) {
      return NextResponse.json({ error: "No tienes acceso a esta conversación" }, { status: 403 })
    }

    const { data: message, error: msgError } = await supabaseAdmin
      .from("chat_messages")
      .insert({
        conversation_id,
        sender_id: user.id,
        content: content.trim(),
        message_type,
      })
      .select("*")
      .single()

    if (msgError) {
      console.error("[v0] Error creating message:", msgError)
      throw msgError
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, avatar_url, email")
      .eq("id", user.id)
      .single()

    await supabaseAdmin
      .from("chat_conversations")
      .update({ last_message_at: message.created_at })
      .eq("id", conversation_id)

    console.log("[v0] Message sent successfully:", message.id)

    return NextResponse.json({
      message: {
        ...message,
        sender: profile,
      },
    })
  } catch (error: any) {
    console.error("[v0] Error in POST /api/chat/messages:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
