import { supabase } from "@/lib/supabase"

export interface RegisterPrintInput {
  productId: string
  serialId?: string | null
  userId: string
  companyId: string
  printDate?: Date
  quantity?: number
}

/**
 * Registra una impresión de sticker en la tabla sticker_prints
 * @param input - Datos de la impresión
 * @returns El registro creado o null si hay error
 */
export async function registerStickerPrint(input: RegisterPrintInput) {
  try {
    const { data, error } = await supabase.from("sticker_prints").insert({
      product_id: input.productId,
      serial_id: input.serialId || null,
      printed_by: input.userId,
      company_id: input.companyId,
      printed_at: input.printDate?.toISOString() || new Date().toISOString(),
      quantity_printed: input.quantity || 1,
    })

    if (error) {
      console.error("Error registering sticker print:", error)
      return null
    }

    return data
  } catch (error) {
    console.error("Error in registerStickerPrint:", error)
    return null
  }
}

/**
 * Obtiene el último registro de impresión para un producto o serie
 * @param productId - ID del producto
 * @param serialId - ID de la serie (opcional)
 * @param companyId - ID de la compañía
 * @returns El registro más reciente o null
 */
export async function getLastStickerPrint(productId: string, serialId: string | null | undefined, companyId: string) {
  try {
    let query = supabase
      .from("sticker_prints")
      .select("*")
      .eq("product_id", productId)
      .eq("company_id", companyId)
      .order("printed_at", { ascending: false })
      .limit(1)

    if (serialId) {
      query = query.eq("serial_id", serialId)
    } else {
      query = query.is("serial_id", null)
    }

    const { data, error } = await query.single()

    if (error) {
      if (error.code === "PGRST116") {
        // No records found
        return null
      }
      console.error("Error fetching last sticker print:", error)
      return null
    }

    return data || null
  } catch (error) {
    console.error("Error in getLastStickerPrint:", error)
    return null
  }
}

/**
 * Obtiene todos los registros de impresión para un producto
 * @param productId - ID del producto
 * @param companyId - ID de la compañía
 * @param serialId - ID de la serie (opcional)
 * @returns Array de registros
 */
export async function getStickerPrintHistory(productId: string, companyId: string, serialId?: string) {
  try {
    let query = supabase
      .from("sticker_prints")
      .select("*")
      .eq("product_id", productId)
      .eq("company_id", companyId)
      .order("printed_at", { ascending: false })

    if (serialId) {
      query = query.eq("serial_id", serialId)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching sticker print history:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("Error in getStickerPrintHistory:", error)
    return []
  }
}

/**
 * Verifica si un sticker ya fue impreso
 * @param productId - ID del producto
 * @param serialId - ID de la serie (opcional)
 * @param companyId - ID de la compañía
 * @returns true si ya ha sido impreso, false si no
 */
export async function hasStickerBeenPrinted(
  productId: string,
  serialId: string | null | undefined,
  companyId: string,
): Promise<boolean> {
  try {
    let query = supabase
      .from("sticker_prints")
      .select("id", { count: "exact", head: true })
      .eq("product_id", productId)
      .eq("company_id", companyId)

    if (serialId) {
      query = query.eq("serial_id", serialId)
    } else {
      query = query.is("serial_id", null)
    }

    const { count, error } = await query

    if (error) {
      console.error("Error checking if sticker has been printed:", error)
      return false
    }

    return (count || 0) > 0
  } catch (error) {
    console.error("Error in hasStickerBeenPrinted:", error)
    return false
  }
}
