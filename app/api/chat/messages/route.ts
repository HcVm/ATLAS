// API para manejar mensajes de chat

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

// GET: Obtener mensajes de una conversación
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
  const conversationId = searchParams.get("conversation_id")
  const offset = Number.parseInt(searchParams.get("offset") || "0")
  const limit = Number.parseInt(searchParams.get("limit") || "50")

  if (!conversationId) {
    return NextResponse.json({ error: "Se requiere conversation_id" }, { status: 400 })
  }

  try {
    // Verificar que el usuario es participante
    const { data: participation, error: partError } = await supabase
      .from("chat_participants")
      .select("id")
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single()

    if (partError || !participation) {
      return NextResponse.json({ error: "No tienes acceso a esta conversación" }, { status: 403 })
    }

    // Obtener mensajes
    const { data: messages, error: msgError } = await supabase
      .from("chat_messages")
      .select(`
        *,
        profiles:sender_id (
          id,
          full_name,
          avatar_url,
          email
        )
      `)
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (msgError) throw msgError

    const processedMessages = (messages || [])
      .map((msg) => ({
        ...msg,
        sender: msg.profiles,
      }))
      .reverse()

    return NextResponse.json({ messages: processedMessages })
  } catch (error: any) {
    console.error("Error fetching messages:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST: Enviar un mensaje
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
    const { conversation_id, content, message_type = "text" } = body

    if (!conversation_id || !content?.trim()) {
      return NextResponse.json({ error: "Se requiere conversation_id y content" }, { status: 400 })
    }

    // Verificar participación
    const { data: participation, error: partError } = await supabase
      .from("chat_participants")
      .select("id")
      .eq("conversation_id", conversation_id)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single()

    if (partError || !participation) {
      return NextResponse.json({ error: "No tienes acceso a esta conversación" }, { status: 403 })
    }

    // Crear mensaje
    const { data: message, error: msgError } = await supabase
      .from("chat_messages")
      .insert({
        conversation_id,
        sender_id: user.id,
        content: content.trim(),
        message_type,
      })
      .select(`
        *,
        profiles:sender_id (
          id,
          full_name,
          avatar_url,
          email
        )
      `)
      .single()

    if (msgError) throw msgError

    return NextResponse.json({
      message: {
        ...message,
        sender: message.profiles,
      },
    })
  } catch (error: any) {
    console.error("Error sending message:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
