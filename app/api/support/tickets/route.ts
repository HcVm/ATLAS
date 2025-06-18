import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { createNotification } from "@/lib/notifications"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const priority = searchParams.get("priority")
    const category = searchParams.get("category")
    const userId = searchParams.get("userId")
    const companyId = searchParams.get("companyId")

    let query = supabase
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
      .order("created_at", { ascending: false })

    if (companyId) {
      query = query.eq("company_id", companyId)
    }

    if (status && status !== "all") {
      query = query.eq("status", status)
    }

    if (priority && priority !== "all") {
      query = query.eq("priority", priority)
    }

    if (category && category !== "all") {
      query = query.eq("category", category)
    }

    if (userId) {
      query = query.eq("created_by", userId)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching tickets:", error)
      return NextResponse.json({ error: "Error al obtener tickets" }, { status: 500 })
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
    const { title, description, priority, category, created_by, company_id } = body

    if (!title || !description || !created_by || !company_id) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("support_tickets")
      .insert({
        title: title.trim(),
        description: description.trim(),
        priority: priority || "medium",
        category: category || "other",
        created_by,
        company_id,
        status: "open",
      })
      .select(`
        *,
        profiles!support_tickets_created_by_fkey (
          full_name,
          avatar_url
        )
      `)
      .single()

    if (error) {
      console.error("Error creating ticket:", error)
      return NextResponse.json({ error: "Error al crear ticket" }, { status: 500 })
    }

    // Notificar al departamento de Tecnología
    try {
      const { data: techUsers } = await supabase
        .from("profiles")
        .select("id")
        .eq("company_id", company_id)
        .in("role", ["admin"])
        .union(supabase.from("profiles").select("id").eq("company_id", company_id).eq("departments.name", "Tecnología"))

      if (techUsers) {
        const notificationPromises = techUsers.map((user) =>
          createNotification({
            userId: user.id,
            title: "Nuevo ticket de soporte",
            message: `Se ha creado un nuevo ticket: ${title}`,
            type: "support_ticket_created",
            relatedId: data.id,
          }),
        )
        await Promise.all(notificationPromises)
      }
    } catch (notificationError) {
      console.error("Error sending notifications:", notificationError)
      // No fallar la creación del ticket por errores de notificación
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error("Error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
