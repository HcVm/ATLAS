import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { data, error } = await supabase.from("departments").select("*").eq("id", params.id).single()

    if (error) {
      console.error("Error fetching department:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error("Unexpected error in GET /api/departments/[id]:", error)
    return NextResponse.json({ error: "Error al obtener el departamento" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const { name, description, color } = body

    const { data, error } = await supabase
      .from("departments")
      .update({ name, description, color })
      .eq("id", params.id)
      .select()
      .single()

    if (error) {
      console.error("Error updating department:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error("Unexpected error in PUT /api/departments/[id]:", error)
    return NextResponse.json({ error: "Error al actualizar el departamento" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { error } = await supabase.from("departments").delete().eq("id", params.id)

    if (error) {
      console.error("Error deleting department:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Unexpected error in DELETE /api/departments/[id]:", error)
    return NextResponse.json({ error: "Error al eliminar el departamento" }, { status: 500 })
  }
}
