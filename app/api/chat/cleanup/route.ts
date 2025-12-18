// API Route para limpiar mensajes expirados

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: Request) {
  try {
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

    const { data: allConversations, error: convError } = await supabaseAdmin.from("chat_conversations").select("id")

    if (!convError && allConversations) {
      for (const conv of allConversations) {
        const { count } = await supabaseAdmin
          .from("chat_messages")
          .select("id", { count: "exact", head: true })
          .eq("conversation_id", conv.id)

        if (count === 0) {
          await supabaseAdmin.from("chat_participants").delete().eq("conversation_id", conv.id)
          await supabaseAdmin.from("chat_conversations").delete().eq("id", conv.id)
        }
      }
    }

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

export async function GET() {
  try {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    const { count: expiringCount } = await supabaseAdmin
      .from("chat_messages")
      .select("id", { count: "exact", head: true })
      .lt("expires_at", tomorrow)

    const { count: totalCount } = await supabaseAdmin.from("chat_messages").select("id", { count: "exact", head: true })

    const { count: conversationsCount } = await supabaseAdmin
      .from("chat_conversations")
      .select("id", { count: "exact", head: true })

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
