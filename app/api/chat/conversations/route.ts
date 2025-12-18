// API para manejar conversaciones de chat

import { type NextRequest, NextResponse } from "next/server"
import { createAuthenticatedServerClient } from "@/lib/supabase-server"
import { supabaseAdmin } from "@/lib/supabase-admin"

// GET: Obtener conversaciones del usuario
export async function GET(request: NextRequest) {
  const supabase = await createAuthenticatedServerClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  console.log("[v0] GET conversations - user:", user?.id, "authError:", authError)

  if (authError || !user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  try {
    const { data: participations, error: partError } = await supabaseAdmin
      .from("chat_participants")
      .select("conversation_id, last_read_at")
      .eq("user_id", user.id)
      .eq("is_active", true)

    console.log("[v0] Found participations:", participations?.length || 0, "error:", partError)

    if (partError) {
      console.error("[v0] Error fetching participations:", partError)
      throw partError
    }

    if (!participations || participations.length === 0) {
      console.log("[v0] No participations found, returning empty array")
      return NextResponse.json({ conversations: [] })
    }

    const conversationIds = participations.map((p) => p.conversation_id)
    const lastReadMap = new Map(participations.map((p) => [p.conversation_id, p.last_read_at]))

    const { data: deletedConversations } = await supabaseAdmin
      .from("chat_conversation_deletions")
      .select("conversation_id")
      .eq("user_id", user.id)
      .in("conversation_id", conversationIds)

    const deletedIds = new Set(deletedConversations?.map((d) => d.conversation_id) || [])
    const activeConversationIds = conversationIds.filter((id) => !deletedIds.has(id))

    if (activeConversationIds.length === 0) {
      return NextResponse.json({ conversations: [] })
    }

    const { data: conversations, error: convError } = await supabaseAdmin
      .from("chat_conversations")
      .select("*")
      .in("id", activeConversationIds)
      .order("last_message_at", { ascending: false })

    console.log("[v0] Found conversations:", conversations?.length || 0, "error:", convError)

    if (convError) {
      console.error("[v0] Error fetching conversations:", convError)
      throw convError
    }

    const processedConversations = await Promise.all(
      (conversations || []).map(async (conv) => {
        // Obtener participantes de esta conversación
        const { data: participants } = await supabaseAdmin
          .from("chat_participants")
          .select("user_id")
          .eq("conversation_id", conv.id)
          .eq("is_active", true)

        const participantIds = participants?.map((p) => p.user_id) || []

        const { data: profiles } = await supabaseAdmin
          .from("profiles")
          .select("id, full_name, avatar_url, email, company_id, companies(name, code, color)")
          .in("id", participantIds)

        const lastReadAt = lastReadMap.get(conv.id) || conv.created_at

        // Contar mensajes no leídos
        const { count: unreadCount } = await supabaseAdmin
          .from("chat_messages")
          .select("id", { count: "exact", head: true })
          .eq("conversation_id", conv.id)
          .neq("sender_id", user.id)
          .gt("created_at", lastReadAt)

        // Obtener último mensaje
        const { data: lastMessage } = await supabaseAdmin
          .from("chat_messages")
          .select("*")
          .eq("conversation_id", conv.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()

        let lastMessageWithSender = null
        if (lastMessage) {
          const { data: senderProfile } = await supabaseAdmin
            .from("profiles")
            .select("id, full_name, avatar_url")
            .eq("id", lastMessage.sender_id)
            .single()

          lastMessageWithSender = {
            ...lastMessage,
            sender: senderProfile,
          }
        }

        return {
          ...conv,
          participants:
            profiles?.map((p) => ({
              user_id: p.id,
              full_name: p.full_name,
              avatar_url: p.avatar_url,
              email: p.email,
              company_id: p.company_id,
              company: p.companies,
            })) || [],
          unread_count: unreadCount || 0,
          last_message: lastMessageWithSender,
        }
      }),
    )

    return NextResponse.json({ conversations: processedConversations })
  } catch (error: any) {
    console.error("[v0] Error in GET conversations:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST: Crear nueva conversación
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
    const { participant_ids, name } = body

    console.log("[v0] Creating conversation with participants:", participant_ids)

    if (!participant_ids || !Array.isArray(participant_ids) || participant_ids.length === 0) {
      return NextResponse.json({ error: "Se requiere al menos un participante" }, { status: 400 })
    }

    // Obtener el perfil del usuario para company_id
    const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", user.id).single()

    if (participant_ids.length === 1) {
      const otherUserId = participant_ids[0]

      // Buscar conversaciones 1:1 existentes con una sola query optimizada
      const { data: existingConv } = await supabaseAdmin.rpc("find_existing_conversation", {
        p_user1_id: user.id,
        p_user2_id: otherUserId,
      })

      if (existingConv && existingConv.length > 0) {
        const conversationId = existingConv[0].id
        console.log("[v0] Found existing 1:1 conversation via RPC:", conversationId)

        const { data: deletion } = await supabaseAdmin
          .from("chat_conversation_deletions")
          .select("id")
          .eq("conversation_id", conversationId)
          .eq("user_id", user.id)
          .maybeSingle()

        if (deletion) {
          console.log("[v0] User had deleted this conversation, restoring it")
          await supabaseAdmin
            .from("chat_conversation_deletions")
            .delete()
            .eq("conversation_id", conversationId)
            .eq("user_id", user.id)
        }

        return NextResponse.json({
          conversation: { id: conversationId },
          existing: true,
        })
      }

      const { data: myParticipations } = await supabaseAdmin
        .from("chat_participants")
        .select("conversation_id")
        .eq("user_id", user.id)
        .eq("is_active", true)

      if (myParticipations && myParticipations.length > 0) {
        const myConversationIds = myParticipations.map((p) => p.conversation_id)

        const { data: conversations } = await supabaseAdmin
          .from("chat_conversations")
          .select("id, is_group")
          .in("id", myConversationIds)
          .eq("is_group", false)

        if (conversations) {
          for (const conv of conversations) {
            const { data: participants } = await supabaseAdmin
              .from("chat_participants")
              .select("user_id")
              .eq("conversation_id", conv.id)
              .eq("is_active", true)

            if (participants?.length === 2 && participants.some((p) => p.user_id === otherUserId)) {
              console.log("[v0] Found existing 1:1 conversation:", conv.id)

              const { data: deletion } = await supabaseAdmin
                .from("chat_conversation_deletions")
                .select("id")
                .eq("conversation_id", conv.id)
                .eq("user_id", user.id)
                .maybeSingle()

              if (deletion) {
                console.log("[v0] User had deleted this conversation, restoring it")
                await supabaseAdmin
                  .from("chat_conversation_deletions")
                  .delete()
                  .eq("conversation_id", conv.id)
                  .eq("user_id", user.id)
              }

              return NextResponse.json({
                conversation: { id: conv.id },
                existing: true,
              })
            }
          }
        }
      }
    }

    console.log("[v0] Creating new conversation with admin client")

    const { data: conversation, error: convError } = await supabaseAdmin
      .from("chat_conversations")
      .insert({
        name: name || null,
        is_group: participant_ids.length > 1,
        company_id: profile?.company_id || null,
        created_by: user.id,
      })
      .select()
      .single()

    if (convError) {
      console.error("[v0] Error creating conversation:", convError)
      throw convError
    }

    console.log("[v0] Conversation created:", conversation.id)

    const allParticipants = [...new Set([user.id, ...participant_ids])]
    const { error: partError } = await supabaseAdmin.from("chat_participants").insert(
      allParticipants.map((userId) => ({
        conversation_id: conversation.id,
        user_id: userId,
      })),
    )

    if (partError) {
      console.error("[v0] Error adding participants:", partError)
      throw partError
    }

    console.log("[v0] Participants added successfully")

    return NextResponse.json({ conversation, existing: false })
  } catch (error: any) {
    console.error("[v0] Error in POST conversation:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
