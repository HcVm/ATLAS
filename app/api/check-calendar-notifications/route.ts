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

    for (const event of upcomingEvents) {
      const notificationTitle =
        format(new Date(event.event_date), "yyyy-MM-dd") === todayFormatted
          ? "¡Evento para hoy!"
          : "Evento próximo mañana"
      const notificationMessage = `"${event.title}" - ${event.description || "Sin descripción"}`

      await createNotification({
        userId: event.user_id,
        title: notificationTitle,
        message: notificationMessage,
        type: "calendar_event_reminder",
        relatedId: event.id,
        companyId: event.company_id,
      })

      // Mark notification as sent for this event
      await supabase.from("calendar_events").update({ notification_sent: true }).eq("id", event.id)
    }

    return NextResponse.json({ message: `Processed ${upcomingEvents.length} upcoming events for notification.` })
  } catch (error: any) {
    console.error("Unexpected error in /api/check-calendar-notifications:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
