import { createClient } from "@supabase/supabase-js"

export const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export function createAdminClient() {
  return supabaseAdmin
}

// Función para crear un usuario con el cliente admin
export async function createUserWithAdmin({
  email,
  password,
  fullName,
  departmentId,
  companyId = null,
  phone = null,
}: {
  email: string
  password: string
  fullName: string
  departmentId: string
  companyId?: string | null
  phone?: string | null
}) {
  try {
    // Crear usuario en auth
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        department_id: departmentId,
        company_id: companyId,
        phone,
      },
    })

    if (createError) {
      console.error("Error creating user with admin:", createError)
      return { data: null, error: createError }
    }

    // Crear perfil manualmente para asegurar que se crea correctamente
    if (userData.user) {
      const { error: profileError } = await supabaseAdmin.from("profiles").insert({
        id: userData.user.id,
        email,
        full_name: fullName,
        role: "user",
        department_id: departmentId,
        company_id: companyId,
        phone,
      })

      if (profileError) {
        console.error("Error creating profile with admin:", profileError)
        // Intentar eliminar el usuario auth si falló la creación del perfil
        await supabaseAdmin.auth.admin.deleteUser(userData.user.id)
        return { data: null, error: profileError }
      }
    }

    return { data: userData, error: null }
  } catch (error: any) {
    console.error("Unexpected error in createUserWithAdmin:", error)
    return { data: null, error }
  }
}

// Función para actualizar un usuario con el cliente admin
export async function updateUserWithAdmin({
  userId,
  email,
  fullName,
  departmentId,
  companyId = null,
  phone = null,
  role = "user",
}: {
  userId: string
  email: string
  fullName: string
  departmentId: string
  companyId?: string | null
  phone?: string | null
  role?: string
}) {
  try {
    // Actualizar usuario en auth
    const { data: userData, error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      email,
      user_metadata: {
        full_name: fullName,
        department_id: departmentId,
        company_id: companyId,
        phone,
        role,
      },
    })

    if (updateAuthError) {
      console.error("Error updating user with admin:", updateAuthError)
      return { data: null, error: updateAuthError }
    }

    // Actualizar perfil
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({
        email,
        full_name: fullName,
        department_id: departmentId,
        company_id: companyId,
        phone,
        role,
      })
      .eq("id", userId)

    if (profileError) {
      console.error("Error updating profile with admin:", profileError)
      return { data: null, error: profileError }
    }

    return { data: userData, error: null }
  } catch (error: any) {
    console.error("Unexpected error in updateUserWithAdmin:", error)
    return { data: null, error }
  }
}

// Función para eliminar un usuario con el cliente admin
export async function deleteUserWithAdmin(userId: string) {
  try {
    // Eliminar usuario en auth
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (deleteError) {
      console.error("Error deleting user with admin:", deleteError)
      return { success: false, error: deleteError }
    }

    return { success: true, error: null }
  } catch (error: any) {
    console.error("Unexpected error in deleteUserWithAdmin:", error)
    return { success: false, error }
  }
}
