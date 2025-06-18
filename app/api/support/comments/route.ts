import { NextResponse, type NextRequest } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { ticket_id, user_id, content, is_internal = false } = body

    if (!ticket_id || !user_id || !content?.trim()) {
      return NextResponse.json({ error: "Datos requeridos faltantes" }, { status: 400 })
    }

    // Verificar que el ticket existe y no está cerrado
    const { data: ticket, error: ticketError } = await supabase
      .from("support_tickets")
      .select("id, status, title")
      .eq("id", ticket_id)
      .single()

    if (ticketError || !ticket) {
      return NextResponse.json({ error: "Ticket no encontrado" }, { status: 404 })
    }

    // Prevenir comentarios en tickets cerrados
    if (ticket.status === "closed") {
      return NextResponse.json(
        {
          error: "No se pueden agregar comentarios a un ticket cerrado",
        },
        { status: 403 },
      )
    }

    // Crear el comentario (todos los usuarios pueden comentar en tickets abiertos)
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

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error("Error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
