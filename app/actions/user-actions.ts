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
  return createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      get(name) {
        return cookieStore.get(name)?.value
      },
      set(name, value, options) {
        cookieStore.set({ name, value, ...options })
      },
      remove(name, options) {
        cookieStore.set({ name, value: "", ...options })
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

// Server Action para crear un usuario
export async function createUser(userData: CreateUserData) {
  try {
    // Verificar que el usuario actual es administrador
    const supabase = createServerClient()
    const { data: sessionData } = await supabase.auth.getSession()

    if (!sessionData.session) {
      return { error: "No hay sesión activa" }
    }

    // Obtener el perfil del usuario actual para verificar si es admin
    const { data: currentUser } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", sessionData.session.user.id)
      .single()

    if (!currentUser || currentUser.role !== "admin") {
      return { error: "No tienes permisos para crear usuarios" }
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
      return { error: "No se pudo crear el usuario" }
    }

    // Crear el perfil en la tabla profiles
    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      id: authData.user.id,
      email: userData.email,
      full_name: userData.full_name,
      role: userData.role,
      department_id: userData.department_id || null,
      company_id: userData.company_id || null,
    })

    if (profileError) {
      console.error("Error creating profile:", profileError)
      // Intentar eliminar el usuario auth si falló la creación del perfil
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return { error: profileError.message }
    }

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
