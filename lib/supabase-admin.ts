import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Cliente de Supabase con permisos de administrador
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// Función para crear usuario con permisos de admin
export async function createUserAsAdmin(userData: {
  email: string
  password: string
  full_name: string
  role: string
  department_id?: string
}) {
  try {
    // Crear usuario en auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true,
      user_metadata: {
        full_name: userData.full_name,
        role: userData.role,
      },
    })

    if (authError) {
      console.error("Error creating auth user:", authError)
      throw authError
    }

    if (!authData.user) {
      throw new Error("No se pudo crear el usuario")
    }

    // Crear o actualizar perfil
    const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
      id: authData.user.id,
      email: userData.email,
      full_name: userData.full_name,
      role: userData.role,
      department_id: userData.department_id || null,
    })

    if (profileError) {
      console.error("Error creating profile:", profileError)
      // Si falla la creación del perfil, eliminar el usuario de auth
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      throw profileError
    }

    return { data: authData, error: null }
  } catch (error) {
    console.error("Error in createUserAsAdmin:", error)
    return { data: null, error }
  }
}

// Función para actualizar usuario
export async function updateUserAsAdmin(
  userId: string,
  userData: {
    email?: string
    full_name?: string
    role?: string
    department_id?: string
  },
) {
  try {
    // Actualizar en auth si hay cambios de email
    if (userData.email) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        email: userData.email,
      })

      if (authError) {
        console.error("Error updating auth user:", authError)
        throw authError
      }
    }

    // Actualizar perfil
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({
        email: userData.email,
        full_name: userData.full_name,
        role: userData.role,
        department_id: userData.department_id === "none" ? null : userData.department_id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)

    if (profileError) {
      console.error("Error updating profile:", profileError)
      throw profileError
    }

    return { error: null }
  } catch (error) {
    console.error("Error in updateUserAsAdmin:", error)
    return { error }
  }
}

// Función para eliminar usuario
export async function deleteUserAsAdmin(userId: string) {
  try {
    // Eliminar perfil primero
    const { error: profileError } = await supabaseAdmin.from("profiles").delete().eq("id", userId)

    if (profileError) {
      console.error("Error deleting profile:", profileError)
      throw profileError
    }

    // Eliminar usuario de auth
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (authError) {
      console.error("Error deleting auth user:", authError)
      throw authError
    }

    return { error: null }
  } catch (error) {
    console.error("Error in deleteUserAsAdmin:", error)
    return { error }
  }
}
