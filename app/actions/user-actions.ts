"use server"

import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"

// Configuración de Supabase Admin (solo en el servidor)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Cliente de Supabase con la clave de servicio (solo en el servidor)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// Cliente de Supabase normal para verificar la sesión
const createServerClient = () => {
  const cookieStore = cookies()

  // Creamos el cliente con la configuración correcta de cookies
  return createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: {
      persistSession: false,
    },
    global: {
      headers: {
        cookie: cookieStore.toString(),
      },
    },
  })
}

// Interfaz para los datos del usuario
interface CreateUserData {
  email: string
  password: string
  full_name: string
  role: string
  department_id?: string | null
  company_id?: string | null
}

// Función para verificar si el usuario actual es administrador
async function isAdmin() {
  try {
    const supabase = createServerClient()
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

    if (sessionError) {
      console.error("Error getting session:", sessionError)
      return false
    }

    if (!sessionData.session) {
      console.log("No active session found")
      return false
    }

    // Obtener el perfil del usuario actual para verificar si es admin
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", sessionData.session.user.id)
      .single()

    if (profileError) {
      console.error("Error getting profile:", profileError)
      return false
    }

    return profile?.role === "admin"
  } catch (error) {
    console.error("Unexpected error in isAdmin:", error)
    return false
  }
}

// Server Action para crear un usuario
export async function createUser(userData: CreateUserData) {
  console.log("Creating user with data:", JSON.stringify(userData, null, 2))

  try {
    // Verificar que el usuario actual es administrador
    const adminCheck = await isAdmin()
    if (!adminCheck) {
      console.log("User is not admin")
      return { error: "No tienes permisos para crear usuarios" }
    }

    console.log("Admin check passed, creating user...")

    // Verificar si el usuario ya existe
    const { data: existingUsers } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", userData.email)
      .limit(1)

    if (existingUsers && existingUsers.length > 0) {
      console.log("User with this email already exists")
      return { error: "Ya existe un usuario con este correo electrónico" }
    }

    // Crear el usuario con el cliente admin
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true,
      user_metadata: {
        full_name: userData.full_name,
      },
    })

    if (authError) {
      console.error("Error creating auth user:", authError)
      return { error: authError.message }
    }

    if (!authData.user) {
      console.error("No user data returned")
      return { error: "No se pudo crear el usuario" }
    }

    console.log("Auth user created successfully, creating/updating profile...")

    // Verificar si ya existe un perfil para este usuario
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("id", authData.user.id)
      .single()

    if (existingProfile) {
      // Si ya existe un perfil, actualizarlo en lugar de crear uno nuevo
      console.log("Profile exists, updating...")
      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update({
          email: userData.email,
          full_name: userData.full_name,
          role: userData.role,
          department_id: userData.department_id || null,
          company_id: userData.company_id || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", authData.user.id)

      if (updateError) {
        console.error("Error updating profile:", updateError)
        return { error: updateError.message }
      }
    } else {
      // Si no existe un perfil, crearlo
      console.log("Creating new profile...")
      const { error: insertError } = await supabaseAdmin.from("profiles").insert({
        id: authData.user.id,
        email: userData.email,
        full_name: userData.full_name,
        role: userData.role,
        department_id: userData.department_id || null,
        company_id: userData.company_id || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      if (insertError) {
        console.error("Error creating profile:", insertError)
        // Intentar eliminar el usuario auth si falló la creación del perfil
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
        return { error: insertError.message }
      }
    }

    console.log("User created successfully!")

    // Revalidar la ruta de usuarios para actualizar la lista
    revalidatePath("/users")

    return {
      success: true,
      user: {
        id: authData.user.id,
        email: userData.email,
        full_name: userData.full_name,
      },
    }
  } catch (error: any) {
    console.error("Unexpected error in createUser:", error)
    return { error: error.message || "Error inesperado al crear el usuario" }
  }
}
