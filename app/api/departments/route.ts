import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET() {
  try {
    const { data, error } = await supabase.from("departments").select("*").order("name")

    if (error) {
      console.error("Error fetching departments:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error("Unexpected error in GET /api/departments:", error)
    return NextResponse.json({ error: "Error al obtener departamentos" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, color } = body

    const { data, error } = await supabase.from("departments").insert({ name, description, color }).select().single()

    if (error) {
      console.error("Error creating department:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error("Unexpected error in POST /api/departments:", error)
    return NextResponse.json({ error: "Error al crear departamento" }, { status: 500 })
  }
}
