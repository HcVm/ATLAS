import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

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

    // Verificar si el ticket está cerrado ANTES de crear el comentario
    const { data: ticketData, error: ticketError } = await supabase
      .from("support_tickets")
      .select("status")
      .eq("id", ticket_id)
      .single()

    if (ticketError) {
      console.error("Error fetching ticket:", ticketError)
      return NextResponse.json({ error: "Ticket no encontrado" }, { status: 404 })
    }

    if (ticketData.status === "closed") {
      return NextResponse.json({ error: "No se pueden agregar comentarios a un ticket cerrado" }, { status: 403 })
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

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error("Error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
