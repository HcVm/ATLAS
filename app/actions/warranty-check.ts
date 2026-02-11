'use server'

import { supabaseAdmin } from "@/lib/supabase-admin"

export async function checkWarrantyExistence(warrantyNumber: string) {
    if (!warrantyNumber) return { success: false, message: "Número de garantía vacío" }

    try {
        // Queries the sales table as admin, bypassing RLS
        const { data, error } = await supabaseAdmin
            .from('sales')
            .select('entity_name, warranty_number, sale_number')
            .eq('warranty_number', warrantyNumber.trim())
            .single()

        if (error) {
            // If no rows found, .single() returns error code PGRST116 usually, or returns null data?
            // supabase-js usually returns error { code: 'PGRST116', details: 'The result contains 0 rows' }
            if (error.code === 'PGRST116') {
                return { success: false, message: "No se encontró ninguna garantía con este número." }
            }
            console.error("Warranty check DB error:", error)
            return { success: false, message: `Error de base de datos: ${error.message}` }
        }

        if (data) {
            return {
                success: true,
                data: {
                    entity_name: (data as any).entity_name, // Casting because type definitions might be outdated as seen before
                    warranty_number: (data as any).warranty_number
                }
            }
        }

        return { success: false, message: "Garantía no encontrada." }

    } catch (error: any) {
        console.error("Server Action Error:", error)
        return { success: false, message: "Error interno del servidor al validar garantía." }
    }
}
