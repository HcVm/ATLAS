
import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("Missing Supabase Service Role Key")
}

export const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// Helper to get admin client (for consistency with imports in other files)
export const createAdminClient = () => {
  return supabaseAdmin
}

export const updateUserWithAdmin = async (params: {
  userId: string
  fullName?: string
  email?: string
  role?: string
  departmentId?: string
  companyId?: string | null
  phone?: string | null
}) => {
  try {
    const { userId, fullName, email, role, departmentId, companyId, phone } = params

    // 1. Update Auth User if email/phone changed
    // Email updates might require verification unless suppressed
    if (email || phone) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        email: email,
        phone: phone ?? undefined,
        email_confirm: true, // Auto confirm if admin updates
      })
      if (authError) throw authError
    }

    // 2. Update Profile
    const updates: any = {}
    if (fullName !== undefined) updates.full_name = fullName
    if (role !== undefined) updates.role = role
    if (departmentId !== undefined) updates.department_id = departmentId
    if (companyId !== undefined) updates.company_id = companyId
    // If you have a phone column in profiles as well, update it:
    // if (phone !== undefined) updates.phone = phone 

    if (Object.keys(updates).length > 0) {
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update(updates)
        .eq("id", userId)

      if (profileError) throw profileError
    }

    return { error: null }
  } catch (error: any) {
    console.error("Error in updateUserWithAdmin:", error)
    return { error }
  }
}

export const deleteUserWithAdmin = async (userId: string) => {
  try {
    // 1. Delete from Auth (Cascade should handle profile if configured, but let's be safe)
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (error) throw error

    return { error: null }
  } catch (error: any) {
    console.error("Error in deleteUserWithAdmin:", error)
    return { error }
  }
}
