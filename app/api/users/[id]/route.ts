import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin, updateUserAsAdmin, deleteUserAsAdmin } from "@/lib/supabase-admin"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("*, departments(id, name)")
      .eq("id", params.id)
      .single()

    if (error) {
      console.error("Error fetching user:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(profile)
  } catch (error: any) {
    console.error("Unexpected error in GET /api/users/[id]:", error)
    return NextResponse.json({ error: "Error al obtener el usuario" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const { full_name, email, role, department_id } = body

    const { error } = await updateUserAsAdmin(params.id, {
      full_name,
      email,
      role,
      department_id,
    })

    if (error) {
      console.error("Error updating user:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Unexpected error in PUT /api/users/[id]:", error)
    return NextResponse.json({ error: "Error al actualizar el usuario" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { error } = await deleteUserAsAdmin(params.id)

    if (error) {
      console.error("Error deleting user:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Unexpected error in DELETE /api/users/[id]:", error)
    return NextResponse.json({ error: "Error al eliminar el usuario" }, { status: 500 })
  }
}
