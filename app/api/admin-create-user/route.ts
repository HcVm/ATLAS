import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

// Crear un cliente de Supabase con la URL y la clave de servicio
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
)

export async function POST(request: Request) {
  try {
    const { email, password, fullName, role = "user" } = await request.json()

    if (!email || !password || !fullName) {
      return NextResponse.json({ error: "Se requieren email, password y fullName" }, { status: 400 })
    }

    // Verificar si el usuario ya existe
    const { data: existingUser } = await supabaseAdmin.from("profiles").select("id").eq("email", email).maybeSingle()

    if (existingUser) {
      return NextResponse.json({ error: "El email ya está registrado" }, { status: 400 })
    }

    // Llamar a la función SQL con el orden correcto de parámetros
    const { data, error } = await supabaseAdmin.rpc("admin_create_user_simple", {
      p_email: email,
      p_password: password,
      p_name: fullName, // Cambiar de p_full_name a p_name
      p_role: role,
    })

    if (error) {
      console.error("Error al crear usuario:", error)
      return NextResponse.json({ error: `Error al crear usuario: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Usuario creado correctamente",
      userId: data,
    })
  } catch (error: any) {
    console.error("Error en la API:", error)
    return NextResponse.json({ error: `Error en el servidor: ${error.message}` }, { status: 500 })
  }
}
