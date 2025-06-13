import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Usar el cliente admin para tener permisos completos
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

export async function POST(request: NextRequest) {
  try {
    const { email, password, fullName } = await request.json()

    // Validar datos requeridos
    if (!email || !password || !fullName) {
      return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 })
    }

    // Verificar si el usuario ya existe
    const { data: existingUser } = await supabaseAdmin.from("profiles").select("id").eq("email", email).maybeSingle()

    if (existingUser) {
      return NextResponse.json({ error: "El email ya está registrado" }, { status: 400 })
    }

    // Obtener el ID del departamento "ASIGNAR"
    const { data: defaultDept, error: deptError } = await supabaseAdmin
      .from("departments")
      .select("id")
      .eq("name", "ASIGNAR")
      .single()

    if (deptError || !defaultDept) {
      console.error("Error finding default department:", deptError)
      return NextResponse.json({ error: "Departamento por defecto no encontrado" }, { status: 500 })
    }

    // Usar Supabase Auth Admin para crear el usuario
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirmar el email
      user_metadata: {
        full_name: fullName,
      },
    })

    if (authError || !authData.user) {
      console.error("Error creating user with Supabase Auth:", authError)
      return NextResponse.json({ error: `Error al crear usuario: ${authError?.message}` }, { status: 500 })
    }

    // Crear el perfil en la tabla profiles
    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      id: authData.user.id,
      email,
      full_name: fullName,
      role: "user",
      department_id: defaultDept.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    if (profileError) {
      console.error("Error creating profile:", profileError)

      // Si falla la creación del perfil, eliminar el usuario de Auth
      try {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      } catch (deleteError) {
        console.error("Error deleting user after profile creation failure:", deleteError)
      }

      return NextResponse.json({ error: `Error creando perfil: ${profileError.message}` }, { status: 500 })
    }

    return NextResponse.json({
      message: "Usuario creado exitosamente",
      success: true,
    })
  } catch (error: any) {
    console.error("Unexpected error in POST /api/register:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
