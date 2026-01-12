import { supabase as defaultSupabase } from "@/lib/supabase"
import { SupabaseClient } from "@supabase/supabase-js"

export interface RegisterPrintInput {
  productId: string
  serialId?: string | null
  userId: string
  companyId: string
  printDate?: Date
  quantity?: number
  client?: SupabaseClient
}

export interface SerializedPrintStats {
  totalInStock: number
  printedCount: number
  lastPrintAt: string | null
}

/**
 * Registra una impresión de sticker en la tabla sticker_prints
 * @param input - Datos de la impresión
 * @returns El registro creado o null si hay error
 */
export async function registerStickerPrint(input: RegisterPrintInput) {
  const supabase = input.client || defaultSupabase
  
  if (!supabase) {
    console.error("Supabase client not available in registerStickerPrint")
    return null
  }

  try {
    // Si hay serialId, enviamos product_id como null para cumplir la restricción de exclusividad
    // Si no hay serialId, enviamos productId
    const insertData = {
      product_id: input.serialId ? null : input.productId,
      serial_id: input.serialId || null,
      printed_by: input.userId,
      company_id: input.companyId,
      printed_at: input.printDate?.toISOString() || new Date().toISOString(),
      quantity_printed: input.quantity || 1,
    }

    const { data, error } = await supabase.from("sticker_prints").insert(insertData)

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
 * @param client - Cliente de Supabase opcional
 * @returns El registro más reciente o null
 */
export async function getLastStickerPrint(
  productId: string,
  serialId: string | null | undefined,
  companyId: string,
  client?: SupabaseClient,
) {
  const supabase = client || defaultSupabase

  if (!supabase) {
    console.error("Supabase client not available in getLastStickerPrint")
    return null
  }

  try {
    let query = supabase
      .from("sticker_prints")
      .select("*")
      .eq("company_id", companyId)
      .order("printed_at", { ascending: false })
      .limit(1)

    if (serialId) {
      // Si buscamos por serial, solo filtramos por serial_id (product_id será null en la BD)
      query = query.eq("serial_id", serialId)
    } else {
      // Si buscamos por producto (granel), filtramos por product_id y serial_id debe ser null
      query = query.eq("product_id", productId)
      query = query.is("serial_id", null)
    }

    // Usar maybeSingle() en lugar de single() para manejar 0 filas sin error
    const { data, error } = await query.maybeSingle()

    if (error) {
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
 * Obtiene estadísticas de impresión para un producto serializado
 * @param productId - ID del producto
 * @param companyId - ID de la compañía
 * @param client - Cliente de Supabase opcional
 */
export async function getSerializedProductPrintStats(
  productId: string,
  companyId: string,
  client?: SupabaseClient,
): Promise<SerializedPrintStats> {
  const supabase = client || defaultSupabase

  if (!supabase) {
    console.error("Supabase client not available in getSerializedProductPrintStats")
    return { totalInStock: 0, printedCount: 0, lastPrintAt: null }
  }

  try {
    // 1. Obtener series en stock
    const { data: serials, error: serialError } = await supabase
      .from("internal_product_serials")
      .select("id")
      .eq("product_id", productId)
      .eq("status", "in_stock")
      .eq("company_id", companyId)

    if (serialError || !serials || serials.length === 0) {
      return { totalInStock: 0, printedCount: 0, lastPrintAt: null }
    }

    const serialIds = serials.map((s) => s.id)
    const totalInStock = serialIds.length

    // 2. Buscar impresiones para esas series
    // Usamos chunking por si hay demasiados IDs (aunque es raro en esta vista)
    const { data: prints, error: printError } = await supabase
      .from("sticker_prints")
      .select("serial_id, printed_at")
      .in("serial_id", serialIds)
      .eq("company_id", companyId)
      .order("printed_at", { ascending: false })

    if (printError || !prints) {
      return { totalInStock, printedCount: 0, lastPrintAt: null }
    }

    const printedSerialIds = new Set(prints.map((p) => p.serial_id))
    const printedCount = printedSerialIds.size
    const lastPrintAt = prints.length > 0 ? prints[0].printed_at : null

    return {
      totalInStock,
      printedCount,
      lastPrintAt,
    }
  } catch (error) {
    console.error("Error in getSerializedProductPrintStats:", error)
    return { totalInStock: 0, printedCount: 0, lastPrintAt: null }
  }
}

/**
 * Obtiene todos los registros de impresión para un producto
 * @param productId - ID del producto
 * @param companyId - ID de la compañía
 * @param serialId - ID de la serie (opcional)
 * @param client - Cliente de Supabase opcional
 * @returns Array de registros
 */
export async function getStickerPrintHistory(
  productId: string,
  companyId: string,
  serialId?: string,
  client?: SupabaseClient,
) {
  const supabase = client || defaultSupabase

  if (!supabase) {
    console.error("Supabase client not available in getStickerPrintHistory")
    return []
  }

  try {
    let query = supabase
      .from("sticker_prints")
      .select("*")
      .eq("company_id", companyId)
      .order("printed_at", { ascending: false })

    if (serialId) {
      query = query.eq("serial_id", serialId)
    } else {
      query = query.eq("product_id", productId)
      query = query.is("serial_id", null) // Solo si queremos ver impresiones a granel puras
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
 * @param client - Cliente de Supabase opcional
 * @returns true si ya ha sido impreso, false si no
 */
export async function hasStickerBeenPrinted(
  productId: string,
  serialId: string | null | undefined,
  companyId: string,
  client?: SupabaseClient,
): Promise<boolean> {
  const supabase = client || defaultSupabase

  if (!supabase) {
    console.error("Supabase client not available in hasStickerBeenPrinted")
    return false
  }

  try {
    let query = supabase
      .from("sticker_prints")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)

    if (serialId) {
      query = query.eq("serial_id", serialId)
    } else {
      query = query.eq("product_id", productId)
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
