import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { v4 as uuidv4 } from "uuid"

// Cliente de Supabase con permisos de servicio
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || "", process.env.SUPABASE_SERVICE_ROLE_KEY || "", {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

export async function POST(request: NextRequest) {
  try {
    const { email, password, fullName } = await request.json()

    if (!email || !password || !fullName) {
      return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 })
    }

    // 1. Crear el usuario directamente en la tabla auth.users usando SQL
    const userId = uuidv4()
    const hashedPassword = await hashPassword(password)

    const { error: userError } = await supabaseAdmin.rpc("admin_create_user", {
      p_user_id: userId,
      p_email: email,
      p_password_hash: hashedPassword,
      p_full_name: fullName,
    })

    if (userError) {
      console.error("Error creando usuario:", userError)
      return NextResponse.json({ error: `Error creando usuario: ${userError.message}` }, { status: 500 })
    }

    // 2. Crear el perfil manualmente en la tabla profiles
    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      id: userId,
      email: email,
      full_name: fullName,
      role: "user", // Esto se convertirá automáticamente al tipo enum
    })

    if (profileError) {
      console.error("Error creando perfil:", profileError)
      // Intentar eliminar el usuario si falló la creación del perfil
      await supabaseAdmin.rpc("admin_delete_user", { p_user_id: userId })
      return NextResponse.json({ error: `Error creando perfil: ${profileError.message}` }, { status: 500 })
    }

    return NextResponse.json({ success: true, userId })
  } catch (error: any) {
    console.error("Error inesperado:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Función para hashear la contraseña (simplificada)
async function hashPassword(password: string): Promise<string> {
  // En un entorno real, usaríamos bcrypt o similar
  // Aquí usamos una función simple para demostración
  return `hashed_${password}_${Date.now()}`
}
