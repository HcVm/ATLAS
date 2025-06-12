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

export interface CreateUserParams {
  email: string
  password: string
  full_name: string
  role: string
  department_id: string
  phone?: string
}

export interface UpdateUserParams {
  email?: string
  full_name?: string
  role?: string
  department_id?: string
  phone?: string
}

// Función para crear un usuario como administrador
export async function createUserAsAdmin(params: CreateUserParams) {
  try {
    // 1. Crear el usuario en auth.users
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: params.email,
      password: params.password,
      email_confirm: true,
      user_metadata: {
        full_name: params.full_name,
        phone: params.phone,
      },
    })

    if (authError) {
      console.error("Error creating auth user:", authError)
      return { error: authError, data: null }
    }

    // 2. Crear el perfil en la tabla profiles
    if (authData.user) {
      const profileData = {
        id: authData.user.id,
        email: params.email,
        full_name: params.full_name,
        role: params.role,
        department_id: params.department_id === "none" ? null : params.department_id,
        phone: params.phone || null,
      }

      const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .insert(profileData)
        .select()
        .single()

      if (profileError) {
        console.error("Error creating profile:", profileError)
        // Intentar eliminar el usuario auth si falló la creación del perfil
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
        return { error: profileError, data: null }
      }

      return { data: { user: authData.user, profile }, error: null }
    }

    return { data: authData, error: null }
  } catch (error: any) {
    console.error("Unexpected error in createUserAsAdmin:", error)
    return { error, data: null }
  }
}

// Función para actualizar un usuario como administrador
export async function updateUserAsAdmin(userId: string, params: UpdateUserParams) {
  try {
    // 1. Actualizar el usuario en auth.users si se cambió el email o metadata
    const updateData: any = {}
    if (params.email) updateData.email = params.email
    if (params.full_name || params.phone) {
      updateData.user_metadata = {}
      if (params.full_name) updateData.user_metadata.full_name = params.full_name
      if (params.phone) updateData.user_metadata.phone = params.phone
    }

    if (Object.keys(updateData).length > 0) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, updateData)

      if (authError) {
        console.error("Error updating auth user:", authError)
        return { error: authError }
      }
    }

    // 2. Actualizar el perfil en la tabla profiles
    const profileUpdateData: any = {}
    if (params.email) profileUpdateData.email = params.email
    if (params.full_name) profileUpdateData.full_name = params.full_name
    if (params.role) profileUpdateData.role = params.role
    if (params.department_id !== undefined) {
      profileUpdateData.department_id = params.department_id === "none" ? null : params.department_id
    }
    if (params.phone !== undefined) profileUpdateData.phone = params.phone

    if (Object.keys(profileUpdateData).length > 0) {
      const { error: profileError } = await supabaseAdmin.from("profiles").update(profileUpdateData).eq("id", userId)

      if (profileError) {
        console.error("Error updating profile:", profileError)
        return { error: profileError }
      }
    }

    return { success: true, error: null }
  } catch (error: any) {
    console.error("Unexpected error in updateUserAsAdmin:", error)
    return { error }
  }
}

// Función para eliminar un usuario como administrador
export async function deleteUserAsAdmin(userId: string) {
  try {
    // Eliminar el usuario de auth.users (esto debería eliminar en cascada el perfil)
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (error) {
      console.error("Error deleting user:", error)
      return { error }
    }

    // Por si acaso, intentar eliminar el perfil explícitamente
    await supabaseAdmin.from("profiles").delete().eq("id", userId)

    return { success: true, error: null }
  } catch (error: any) {
    console.error("Unexpected error in deleteUserAsAdmin:", error)
    return { error }
  }
}
