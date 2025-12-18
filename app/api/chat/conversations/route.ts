// API para manejar conversaciones de chat

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

// GET: Obtener conversaciones del usuario
export async function GET(request: NextRequest) {
  const supabase = await getSupabaseServerClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  try {
    // Obtener conversaciones donde participa el usuario
    const { data: participations, error: partError } = await supabase
      .from("chat_participants")
      .select("conversation_id, last_read_at")
      .eq("user_id", user.id)
      .eq("is_active", true)

    if (partError) throw partError

    if (!participations || participations.length === 0) {
      return NextResponse.json({ conversations: [] })
    }

    const conversationIds = participations.map((p) => p.conversation_id)
    const lastReadMap = new Map(participations.map((p) => [p.conversation_id, p.last_read_at]))

    // Obtener detalles de conversaciones
    const { data: conversations, error: convError } = await supabase
      .from("chat_conversations")
      .select(`
        *,
        chat_participants (
          user_id,
          profiles (
            id,
            full_name,
            avatar_url,
            email
          )
        )
      `)
      .in("id", conversationIds)
      .order("last_message_at", { ascending: false })

    if (convError) throw convError

    // Procesar y agregar conteo de no leídos
    const processedConversations = await Promise.all(
      (conversations || []).map(async (conv) => {
        const lastReadAt = lastReadMap.get(conv.id) || conv.created_at

        // Contar mensajes no leídos
        const { count: unreadCount } = await supabase
          .from("chat_messages")
          .select("id", { count: "exact", head: true })
          .eq("conversation_id", conv.id)
          .neq("sender_id", user.id)
          .gt("created_at", lastReadAt)

        // Obtener último mensaje
        const { data: lastMessage } = await supabase
          .from("chat_messages")
          .select("*, profiles:sender_id(id, full_name, avatar_url)")
          .eq("conversation_id", conv.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single()

        return {
          ...conv,
          participants: conv.chat_participants
            ?.filter((p: any) => p.profiles)
            .map((p: any) => ({
              user_id: p.profiles.id,
              full_name: p.profiles.full_name,
              avatar_url: p.profiles.avatar_url,
              email: p.profiles.email,
            })),
          unread_count: unreadCount || 0,
          last_message: lastMessage ? { ...lastMessage, sender: lastMessage.profiles } : null,
        }
      }),
    )

    return NextResponse.json({ conversations: processedConversations })
  } catch (error: any) {
    console.error("Error fetching conversations:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST: Crear nueva conversación
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
    const { participant_ids, name } = body

    if (!participant_ids || !Array.isArray(participant_ids) || participant_ids.length === 0) {
      return NextResponse.json({ error: "Se requiere al menos un participante" }, { status: 400 })
    }

    // Obtener el perfil del usuario para company_id
    const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", user.id).single()

    // Para chat 1:1, verificar si ya existe
    if (participant_ids.length === 1) {
      const { data: existingParticipations } = await supabase
        .from("chat_participants")
        .select("conversation_id")
        .eq("user_id", user.id)
        .eq("is_active", true)

      if (existingParticipations) {
        for (const part of existingParticipations) {
          const { data: convParticipants } = await supabase
            .from("chat_participants")
            .select("user_id")
            .eq("conversation_id", part.conversation_id)
            .eq("is_active", true)

          const { data: convData } = await supabase
            .from("chat_conversations")
            .select("is_group")
            .eq("id", part.conversation_id)
            .single()

          if (
            convData &&
            !convData.is_group &&
            convParticipants?.length === 2 &&
            convParticipants.some((p) => p.user_id === participant_ids[0])
          ) {
            // Ya existe una conversación 1:1
            return NextResponse.json({
              conversation: { id: part.conversation_id },
              existing: true,
            })
          }
        }
      }
    }

    // Crear nueva conversación
    const { data: conversation, error: convError } = await supabase
      .from("chat_conversations")
      .insert({
        name: name || null,
        is_group: participant_ids.length > 1,
        company_id: profile?.company_id || null,
        created_by: user.id,
      })
      .select()
      .single()

    if (convError) throw convError

    // Agregar participantes
    const allParticipants = [...new Set([user.id, ...participant_ids])]
    const { error: partError } = await supabase.from("chat_participants").insert(
      allParticipants.map((userId) => ({
        conversation_id: conversation.id,
        user_id: userId,
      })),
    )

    if (partError) throw partError

    return NextResponse.json({ conversation, existing: false })
  } catch (error: any) {
    console.error("Error creating conversation:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
