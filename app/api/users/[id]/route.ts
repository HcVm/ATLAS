import { type NextRequest, NextResponse } from "next/server"
import { updateUserAsAdmin, deleteUserAsAdmin } from "@/lib/supabase-admin"
import { supabase } from "@/lib/supabase"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const { full_name, email, role, department_id } = body

    // Verificar autorización
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const token = authHeader.replace("Bearer ", "")
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 })
    }

    // Verificar rol de admin
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Permisos insuficientes" }, { status: 403 })
    }

    // Actualizar usuario
    const result = await updateUserAsAdmin(params.id, {
      full_name,
      email,
      role,
      department_id,
    })

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error in PUT /api/users/[id]:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Verificar autorización
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const token = authHeader.replace("Bearer ", "")
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 })
    }

    // Verificar rol de admin
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Permisos insuficientes" }, { status: 403 })
    }

    // No permitir que se elimine a sí mismo
    if (params.id === user.id) {
      return NextResponse.json({ error: "No puedes eliminarte a ti mismo" }, { status: 400 })
    }

    // Eliminar usuario
    const result = await deleteUserAsAdmin(params.id)

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error in DELETE /api/users/[id]:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
