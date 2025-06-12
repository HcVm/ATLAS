import { type NextRequest, NextResponse } from "next/server"
import { createUserAsAdmin } from "@/lib/supabase-admin"
import { supabase } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, full_name, role, department_id } = body

    // Verificar que el usuario actual es admin
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

    // Crear usuario usando la función de admin
    const result = await createUserAsAdmin({
      email,
      password,
      full_name,
      role,
      department_id,
    })

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, user: result.data?.user })
  } catch (error: any) {
    console.error("Error in POST /api/users:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
