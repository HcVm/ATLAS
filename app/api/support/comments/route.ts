import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import type { Database } from "@/types/supabase"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const cookieStore = cookies()
  const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore })

  try {
    const { content, ticket_id, user_id } = await request.json()

    // Verificar si el ticket está cerrado
    const { data: ticket, error: ticketError } = await supabase
      .from("support_tickets")
      .select("status")
      .eq("id", ticket_id)
      .single()

    if (ticketError) {
      console.error("Error fetching ticket:", ticketError)
      return NextResponse.json({ error: "Ticket no encontrado" }, { status: 404 })
    }

    if (ticket.status === "closed") {
      return NextResponse.json({ error: "No se pueden agregar comentarios a un ticket cerrado" }, { status: 403 })
    }

    const { data, error } = await supabase.from("support_comments").insert([{ content, ticket_id, user_id }]).select()

    if (error) {
      console.error("Error creating comment:", error)
      return NextResponse.json({ error: "Error al crear el comentario" }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Error inesperado" }, { status: 500 })
  }
}
