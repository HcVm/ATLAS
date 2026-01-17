import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { createNotification } from "@/lib/notifications"
import { format, addDays } from "date-fns"

export async function GET(request: NextRequest) {
  // This route is intended to be called by a background job (e.g., a cron job)
  // to check for upcoming calendar events and send notifications.
  // It should not be directly exposed to the client for frequent polling.

  try {
    const today = new Date()
    const tomorrow = addDays(today, 1)

    const todayFormatted = format(today, "yyyy-MM-dd")
    const tomorrowFormatted = format(tomorrow, "yyyy-MM-dd")

    // Fetch events that are today or tomorrow, not completed, and notification not yet sent
    const { data: upcomingEvents, error } = await supabase
      .from("calendar_events")
      .select("id, user_id, company_id, title, description, event_date")
      .or(`event_date.eq.${todayFormatted},event_date.eq.${tomorrowFormatted}`)
      .eq("is_completed", false)
      .eq("notification_sent", false)

    if (error) {
      console.error("Error fetching upcoming calendar events:", error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!upcomingEvents || upcomingEvents.length === 0) {
      return NextResponse.json({ message: "No upcoming events found for notification." })
    }

    const notificationsToInsert = []
    const eventIdsToUpdate = []

    for (const event of upcomingEvents) {
      const notificationTitle =
        format(new Date(event.event_date), "yyyy-MM-dd") === todayFormatted
          ? "¡Evento para hoy!"
          : "Evento próximo mañana"
      const notificationMessage = `"${event.title}" - ${event.description || "Sin descripción"}`

      notificationsToInsert.push({
        user_id: event.user_id,
        title: notificationTitle,
        message: notificationMessage,
        type: "calendar_event_reminder",
        related_id: event.id,
        company_id: event.company_id || null,
        read: false,
      })

      eventIdsToUpdate.push(event.id)
    }

    if (notificationsToInsert.length > 0) {
      const { error: insertError } = await supabase.from("notifications").insert(notificationsToInsert)
      if (insertError) {
        console.error("Error batch inserting notifications:", insertError)
        // If insert fails, we probably shouldn't update the events as sent,
        // or we should handle partial failures. For now, let's just log it.
        // We'll throw to avoid updating the calendar events if notifications weren't sent.
        throw insertError
      }

      const { error: updateError } = await supabase
        .from("calendar_events")
        .update({ notification_sent: true })
        .in("id", eventIdsToUpdate)

      if (updateError) {
        console.error("Error batch updating calendar events:", updateError)
        throw updateError
      }
    }

    return NextResponse.json({ message: `Processed ${upcomingEvents.length} upcoming events for notification.` })
  } catch (error: any) {
    console.error("Unexpected error in /api/check-calendar-notifications:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
