import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { z } from "zod"

const commentSchema = z.object({
  ticket_id: z.string().uuid(),
  content: z.string().min(1),
})

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies })

  try {
    const body = await request.json()
    const { ticket_id, content } = commentSchema.parse(body)

    // Verificar si el ticket está cerrado
    const { data: ticketData, error: ticketError } = await supabase
      .from("support_tickets")
      .select("status")
      .eq("id", ticket_id)
      .single()

    if (ticketError) {
      return NextResponse.json({ error: "Ticket no encontrado" }, { status: 404 })
    }

    if (ticketData.status === "closed") {
      return NextResponse.json({ error: "No se pueden agregar comentarios a un ticket cerrado" }, { status: 403 })
    }

    const { data, error } = await supabase.from("support_comments").insert([{ ticket_id, content }]).select().single()

    if (error) {
      console.error(error)
      return NextResponse.json({ error: "Error creating comment" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error(error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }

    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
