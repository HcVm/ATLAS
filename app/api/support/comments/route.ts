import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { createNotification } from "@/lib/notifications"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const ticketId = searchParams.get("ticketId")

    if (!ticketId) {
      return NextResponse.json({ error: "ticketId es requerido" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("support_comments")
      .select(`
        *,
        profiles (
          full_name,
          avatar_url
        )
      `)
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true })

    if (error) {
      console.error("Error fetching comments:", error)
      return NextResponse.json({ error: "Error al obtener comentarios" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { ticket_id, user_id, content, is_internal = false } = body

    if (!ticket_id || !user_id || !content) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("support_comments")
      .insert({
        ticket_id,
        user_id,
        content: content.trim(),
        is_internal,
      })
      .select(`
        *,
        profiles (
          full_name,
          avatar_url
        )
      `)
      .single()

    if (error) {
      console.error("Error creating comment:", error)
      return NextResponse.json({ error: "Error al crear comentario" }, { status: 500 })
    }

    // Obtener información del ticket para notificaciones
    try {
      const { data: ticket } = await supabase
        .from("support_tickets")
        .select("title, created_by, assigned_to, company_id")
        .eq("id", ticket_id)
        .single()

      if (ticket) {
        // Notificar al creador del ticket (si no es quien comentó)
        if (ticket.created_by !== user_id) {
          await createNotification({
            userId: ticket.created_by,
            title: "Nuevo comentario en tu ticket",
            message: `Se agregó un comentario a tu ticket: ${ticket.title}`,
            type: "support_comment_added",
            relatedId: ticket_id,
          })
        }

        // Notificar al asignado (si existe y no es quien comentó)
        if (ticket.assigned_to && ticket.assigned_to !== user_id) {
          await createNotification({
            userId: ticket.assigned_to,
            title: "Nuevo comentario en ticket asignado",
            message: `Se agregó un comentario al ticket: ${ticket.title}`,
            type: "support_comment_added",
            relatedId: ticket_id,
          })
        }
      }
    } catch (notificationError) {
      console.error("Error sending notifications:", notificationError)
      // No fallar la creación del comentario por errores de notificación
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error("Error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
