import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { createNotification } from "@/lib/notifications"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { data, error } = await supabase
      .from("support_tickets")
      .select(`
        *,
        profiles!support_tickets_created_by_fkey (
          full_name,
          avatar_url
        ),
        assigned_profile:profiles!support_tickets_assigned_to_fkey (
          full_name,
          avatar_url
        )
      `)
      .eq("id", params.id)
      .single()

    if (error) {
      console.error("Error fetching ticket:", error)
      return NextResponse.json({ error: "Ticket no encontrado" }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const { status, assigned_to, updated_by } = body

    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    if (status) {
      updateData.status = status
      if (status === "resolved") {
        updateData.resolved_at = new Date().toISOString()
      } else if (status === "closed") {
        updateData.closed_at = new Date().toISOString()
      }
    }

    if (assigned_to !== undefined) {
      updateData.assigned_to = assigned_to
    }

    const { data, error } = await supabase
      .from("support_tickets")
      .update(updateData)
      .eq("id", params.id)
      .select(`
        *,
        profiles!support_tickets_created_by_fkey (
          full_name,
          avatar_url
        ),
        assigned_profile:profiles!support_tickets_assigned_to_fkey (
          full_name,
          avatar_url
        )
      `)
      .single()

    if (error) {
      console.error("Error updating ticket:", error)
      return NextResponse.json({ error: "Error al actualizar ticket" }, { status: 500 })
    }

    // Notificar al creador del ticket sobre cambios de estado
    if (status && data.created_by !== updated_by) {
      try {
        await createNotification({
          userId: data.created_by,
          title: "Ticket actualizado",
          message: `Tu ticket "${data.title}" ha cambiado a estado: ${status}`,
          type: "support_ticket_updated",
          relatedId: data.id,
        })
      } catch (notificationError) {
        console.error("Error sending notification:", notificationError)
      }
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
