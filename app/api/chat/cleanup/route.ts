// API Route para limpiar mensajes expirados
// Puede ser llamado por un cron job externo (ej: Vercel Cron, GitHub Actions)

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: Request) {
  try {
    // Verificar autorización (opcional: agregar API key para seguridad)
    const authHeader = request.headers.get("authorization")
    const expectedKey = process.env.CHAT_CLEANUP_API_KEY

    if (expectedKey && authHeader !== `Bearer ${expectedKey}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Eliminar mensajes expirados (más de 7 días)
    const { data: deletedMessages, error: deleteError } = await supabaseAdmin
      .from("chat_messages")
      .delete()
      .lt("expires_at", new Date().toISOString())
      .select("id")

    if (deleteError) {
      console.error("Error deleting expired messages:", deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    const deletedCount = deletedMessages?.length || 0

    // Eliminar conversaciones sin mensajes
    const { data: emptyConversations, error: findEmptyError } = await supabaseAdmin
      .from("chat_conversations")
      .select("id")

    if (!findEmptyError && emptyConversations) {
      for (const conv of emptyConversations) {
        const { count } = await supabaseAdmin
          .from("chat_messages")
          .select("id", { count: "exact", head: true })
          .eq("conversation_id", conv.id)

        if (count === 0) {
          await supabaseAdmin.from("chat_conversations").delete().eq("id", conv.id)
        }
      }
    }

    // Limpiar presencia de usuarios inactivos (más de 24 horas sin actividad)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    await supabaseAdmin.from("chat_user_presence").update({ is_online: false }).lt("last_seen", twentyFourHoursAgo)

    return NextResponse.json({
      success: true,
      deleted_messages: deletedCount,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("Error in chat cleanup:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// GET endpoint para verificar el estado
export async function GET() {
  try {
    // Contar mensajes que expirarán pronto (próximas 24 horas)
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    const { count: expiringCount } = await supabaseAdmin
      .from("chat_messages")
      .select("id", { count: "exact", head: true })
      .lt("expires_at", tomorrow)

    // Contar total de mensajes
    const { count: totalCount } = await supabaseAdmin.from("chat_messages").select("id", { count: "exact", head: true })

    // Contar conversaciones activas
    const { count: conversationsCount } = await supabaseAdmin
      .from("chat_conversations")
      .select("id", { count: "exact", head: true })

    // Contar usuarios online
    const { count: onlineCount } = await supabaseAdmin
      .from("chat_user_presence")
      .select("user_id", { count: "exact", head: true })
      .eq("is_online", true)

    return NextResponse.json({
      status: "healthy",
      stats: {
        total_messages: totalCount || 0,
        expiring_soon: expiringCount || 0,
        active_conversations: conversationsCount || 0,
        online_users: onlineCount || 0,
      },
      retention_days: 7,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("Error getting chat stats:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
