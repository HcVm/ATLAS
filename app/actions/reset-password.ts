"use server"

import { createAuthenticatedServerClient } from "@/lib/supabase-server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { revalidatePath } from "next/cache"

const COMPANY_PASSWORDS: { [key: string]: string } = {
    "AGLE": "AGLEPREDPASS2026",
    "ARM": "ARMPREDPASS2026",
    "GALUR": "GALURPREDPASS2026",
    "AMCO": "AMCOPREDPASS2026",
    "GMC": "GMCPREDPASS2026"
}

export async function resetUserPassword(userId: string, companyCode: string) {
    try {
        const supabase = await createAuthenticatedServerClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return { success: false, error: "No autenticado" }
        }

        // Verify role
        const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single()

        if (!profile || (profile.role !== "admin" && profile.role !== "support")) {
            return { success: false, error: "No tienes permisos para realizar esta acción. Solo Admin y Soporte." }
        }

        // Get company password
        // Normalize company code to UPPERCASE just in case
        const normalizedCode = companyCode?.toUpperCase()

        // Check if code exists in mapping, otherwise handle default or error
        // If companyCode is not in the list, we might want to prevent reset or use a fallback?
        // The prompt implies we set it DEPENDING on the company. If it's not one of those, what should happen?
        // I'll return an error if company is not supported to be safe.

        const newPassword = COMPANY_PASSWORDS[normalizedCode]

        if (!newPassword) {
            // Fallback logic or error? 
            // Let's check if the company name contains the key string if code is different
            return { success: false, error: `No hay contraseña predefinida para la empresa: ${companyCode || 'Desconocida'}` }
        }

        // Update password
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            userId,
            { password: newPassword }
        )

        if (updateError) {
            console.error("Error resetting password:", updateError)
            return { success: false, error: updateError.message }
        }

        revalidatePath("/users")
        return { success: true, message: `Contraseña restablecida a: ${newPassword}` }

    } catch (error: any) {
        console.error("Unexpected error in resetUserPassword:", error)
        return { success: false, error: error.message }
    }
}
