import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { supabaseAdmin } from "@/lib/supabase-admin"

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Verificar si el usuario es administrador
    const { data: adminCheck } = await supabase.from("profiles").select("role").eq("id", authUser.id).single()

    if (!adminCheck || adminCheck.role !== "admin") {
      return NextResponse.json({ error: "Permisos insuficientes" }, { status: 403 })
    }

    // Obtener datos del cuerpo de la solicitud
    const { email, password, fullName, departmentId, companyId, phone } = await request.json()

    // Validar datos requeridos
    if (!email || !password || !fullName || !departmentId) {
      return NextResponse.json(
        { error: "Faltan datos requeridos: email, password, fullName, departmentId" },
        { status: 400 },
      )
    }

    // Crear usuario con supabaseAdmin para evitar problemas de RLS
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        department_id: departmentId,
        company_id: companyId || null,
        phone: phone || null,
      },
    })

    if (createError) {
      console.error("Error creating user:", createError)
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }

    // Crear perfil manualmente para asegurar que se crea correctamente
    if (userData.user) {
      const { error: profileError } = await supabaseAdmin.from("profiles").insert({
        id: userData.user.id,
        email,
        full_name: fullName,
        role: "user",
        department_id: departmentId,
        company_id: companyId || null,
        phone: phone || null,
      })

      if (profileError) {
        console.error("Error creating profile:", profileError)
        // Intentar eliminar el usuario auth si falló la creación del perfil
        await supabaseAdmin.auth.admin.deleteUser(userData.user.id)
        return NextResponse.json({ error: profileError.message }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true, user: userData.user })
  } catch (error: any) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: error.message || "Error inesperado" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Obtener parámetros de consulta
    const searchParams = request.nextUrl.searchParams
    const companyId = searchParams.get("companyId")

    // Construir consulta base
    let query = supabase
      .from("profiles")
      .select(`
        *,
        departments!profiles_department_id_fkey (
          id,
          name
        ),
        companies!profiles_company_id_fkey (
          id,
          name,
          code,
          color
        )
      `)
      .order("created_at", { ascending: false })

    // Aplicar filtro por empresa si se proporciona
    if (companyId && companyId !== "null" && companyId !== "undefined") {
      query = query.eq("company_id", companyId)
    }

    // Ejecutar consulta
    const { data, error } = await query

    if (error) {
      console.error("Error fetching users:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ users: data })
  } catch (error: any) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: error.message || "Error inesperado" }, { status: 500 })
  }
}
