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

// Función para verificar si el usuario actual es administrador
async function isAdmin() {
  const supabase = createServerClient()
  const { data: sessionData } = await supabase.auth.getSession()

  if (!sessionData.session) return false

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", sessionData.session.user.id)
    .single()

  return profile?.role === "admin"
}

// Función para crear un nuevo usuario
export async function createUser(formData: FormData) {
  // Verificar que el usuario actual es administrador
  if (!(await isAdmin())) {
    throw new Error("No autorizado. Solo los administradores pueden crear usuarios.")
  }

  // Extraer datos del formulario
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const fullName = formData.get("fullName") as string
  const role = formData.get("role") as string
  const departmentId = formData.get("departmentId") as string
  const companyId = (formData.get("companyId") as string) || null

  try {
    // 1. Crear el usuario en auth.users
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role,
      },
    })

    if (authError) throw new Error(`Error creando usuario: ${authError.message}`)
    if (!authData.user) throw new Error("No se pudo crear el usuario")

    // 2. Verificar si ya existe un perfil para este usuario
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("id", authData.user.id)
      .single()

    // 3. Actualizar o crear el perfil
    if (existingProfile) {
      // Si ya existe un perfil, actualizarlo
      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update({
          full_name: fullName,
          role,
          department_id: departmentId || null,
          company_id: companyId || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", authData.user.id)

      if (updateError) {
        console.error("Error actualizando perfil:", updateError)
        throw new Error(`Error actualizando perfil: ${updateError.message}`)
      }
    } else {
      // Si no existe, crear uno nuevo
      const { error: profileError } = await supabaseAdmin.from("profiles").insert({
        id: authData.user.id,
        email,
        full_name: fullName,
        role,
        department_id: departmentId || null,
        company_id: companyId || null,
      })

      if (profileError) {
        console.error("Error creando perfil:", profileError)

        // Si falla la creación del perfil, intentamos eliminar el usuario para mantener consistencia
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id)

        throw new Error(`Error creando perfil: ${profileError.message}`)
      }
    }

    // Revalidar la ruta para actualizar la lista de usuarios
    revalidatePath("/users")

    return { success: true, message: "Usuario creado correctamente" }
  } catch (error: any) {
    console.error("Error en createUser:", error)
    return { success: false, message: error.message }
  }
}
