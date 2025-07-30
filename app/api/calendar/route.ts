import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { createNotification } from "@/lib/notifications"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get("userId")
  const companyId = searchParams.get("companyId")
  const startDate = searchParams.get("startDate") // YYYY-MM-DD
  const endDate = searchParams.get("endDate") // YYYY-MM-DD

  if (!userId || !startDate || !endDate) {
    return NextResponse.json({ error: "User ID, start date, and end date are required." }, { status: 400 })
  }

  try {
    let query = supabase
      .from("calendar_events")
      .select("*")
      .eq("user_id", userId)
      .gte("event_date", startDate)
      .lte("event_date", endDate)
      .order("event_date", { ascending: true })
      .order("created_at", { ascending: true })

    if (companyId) {
      query = query.eq("company_id", companyId)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching calendar events:", error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error("Unexpected error in GET /api/calendar:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const { userId, companyId, title, description, eventDate, importance, isCompleted } = await request.json()

  if (!userId || !title || !eventDate) {
    return NextResponse.json({ error: "User ID, title, and event date are required." }, { status: 400 })
  }

  try {
    const { data, error } = await supabase
      .from("calendar_events")
      .insert({
        user_id: userId,
        company_id: companyId,
        title,
        description,
        event_date: eventDate,
        importance: importance || "medium",
        is_completed: isCompleted || false,
        notification_sent: false, // Reset notification status on new creation
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating calendar event:", error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Optionally send a notification for the new event
    await createNotification({
      userId: userId,
      title: "Nuevo Evento Creado",
      message: `Has creado el evento: "${title}" para el ${eventDate}.`,
      type: "calendar_event_created",
      relatedId: data.id,
      companyId: companyId,
    })

    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    console.error("Unexpected error in POST /api/calendar:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
