import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { createNotification } from "@/lib/notifications"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params
  const { title, description, eventDate, importance, isCompleted, notificationSent } = await request.json()

  if (!id) {
    return NextResponse.json({ error: "Event ID is required." }, { status: 400 })
  }

  try {
    const { data, error } = await supabase
      .from("calendar_events")
      .update({
        title,
        description,
        event_date: eventDate,
        importance,
        is_completed: isCompleted,
        notification_sent: notificationSent, // Allow updating notification status
      })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("Error updating calendar event:", error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Optionally send a notification for the updated event
    await createNotification({
      userId: data.user_id,
      title: "Evento Actualizado",
      message: `El evento "${data.title}" ha sido actualizado.`,
      type: "calendar_event_updated",
      relatedId: data.id,
      companyId: data.company_id,
    })

    return NextResponse.json(data)
  } catch (error: any) {
    console.error("Unexpected error in PUT /api/calendar/[id]:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params

  if (!id) {
    return NextResponse.json({ error: "Event ID is required." }, { status: 400 })
  }

  try {
    const { error } = await supabase.from("calendar_events").delete().eq("id", id)

    if (error) {
      console.error("Error deleting calendar event:", error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ message: "Event deleted successfully." }, { status: 200 })
  } catch (error: any) {
    console.error("Unexpected error in DELETE /api/calendar/[id]:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
