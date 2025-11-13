import { supabase } from "./supabase"

export interface LotGenerationParams {
  productCode: string
  productName: string
  productId: string
  saleId: string
  quantity: number
  companyId: string
  createdBy: string
  date?: Date
}

export interface SerialGenerationParams {
  lotId: string
  lotNumber: string
  productCode: string
  productName: string
  productId: string
  saleId: string
  quantity: number
  companyId: string
  createdBy: string
}

export interface GeneratedLot {
  id: string
  lot_number: string
  product_id: string
  product_code: string
  product_name: string
  sale_id: string | null
  quantity: number
  status: string
  serials: GeneratedSerial[]
}

export interface GeneratedSerial {
  id: string
  serial_number: string
  lot_id: string
  product_id: string
  product_code: string
  product_name: string
  sale_id: string | null
  status: string
  barcode_data?: string
}

/**
 * HELPER: Genera el string del serial localmente.
 * Esto evita hacer 6000 llamadas al servidor y previene errores de conexión.
 * IMPORTANTE: Ajusta el formato del return si tus seriales tienen ceros a la izquierda (ej: padStart).
 */
function generateLocalSerialNumber(lotNumber: string, sequence: number): string {
  // Formato estándar: LOTE-SECUENCIA (Ej: 20231025-P01-1, 20231025-P01-2)
  return `${lotNumber}-${sequence}`
}

/**
 * Generates a lot number using the database function
 */
export async function generateLotNumber(productCode: string, date: Date = new Date()): Promise<string> {
  const { data, error } = await supabase.rpc("generate_lot_number", {
    p_product_code: productCode,
    p_date: date.toISOString(),
  })

  if (error) {
    console.error("Error generating lot number:", error)
    throw new Error(`Failed to generate lot number: ${error.message}`)
  }

  return data as string
}

/**
 * Mantenemos esta función por si se necesita generar uno solo desde la DB,
 * pero NO la usaremos en los procesos masivos.
 */
export async function generateSerialNumber(lotNumber: string, sequence: number): Promise<string> {
  const { data, error } = await supabase.rpc("generate_serial_number", {
    p_lot_number: lotNumber,
    p_sequence: sequence,
  })

  if (error) {
    console.error("Error generating serial number:", error)
    throw new Error(`Failed to generate serial number: ${error.message}`)
  }

  return data as string
}

/**
 * Generates a barcode data URL for a given code
 */
export async function generateBarcodeDataUrl(code: string): Promise<string> {
  try {
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")

    if (!ctx) {
      throw new Error("Could not get canvas context")
    }

    canvas.width = 300
    canvas.height = 100

    ctx.fillStyle = "white"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.fillStyle = "black"
    ctx.font = "14px monospace"
    ctx.textAlign = "center"
    ctx.fillText(code, canvas.width / 2, canvas.height - 10)

    const barWidth = 2
    const spacing = 3
    let x = 20

    for (let i = 0; i < code.length; i++) {
      const charCode = code.charCodeAt(i)
      const bars = (charCode % 5) + 3

      for (let j = 0; j < bars; j++) {
        ctx.fillRect(x, 20, barWidth, 50)
        x += barWidth + spacing
      }
      x += spacing * 2
    }

    return canvas.toDataURL("image/png")
  } catch (error) {
    console.error("Error generating barcode:", error)
    return ""
  }
}

/**
 * Creates a lot and its associated serial numbers using BULK INSERT
 * OPTIMIZED: Soluciona el error 'net::ERR_CONNECTION_CLOSED' y '409 Conflict'
 */
export async function createLotWithSerials(params: LotGenerationParams): Promise<GeneratedLot> {
  const { productCode, productName, productId, saleId, quantity, companyId, createdBy, date = new Date() } = params

  try {
    // 1. Generar número de lote (1 llamada a DB)
    const lotNumber = await generateLotNumber(productCode, date)

    // 2. Insertar registro del lote (1 llamada a DB)
    const { data: lotData, error: lotError } = await supabase
      .from("product_lots")
      .insert({
        lot_number: lotNumber,
        product_id: productId,
        product_code: productCode,
        product_name: productName,
        sale_id: saleId,
        quantity: quantity,
        status: "pending",
        company_id: companyId,
        created_by: createdBy,
        generated_date: date.toISOString(),
      })
      .select()
      .single()

    if (lotError) {
      console.error("Error creating lot:", lotError)
      throw new Error(`Failed to create lot: ${lotError.message}`)
    }

    // 3. Preparación de datos en memoria (0 llamadas a DB)
    // Generamos el array masivo de objetos seriales
    const serialPayloads = []
    console.log(`[v0] Preparing data for ${quantity} serials in memory...`)

    for (let i = 1; i <= quantity; i++) {
      // Usamos generación local para velocidad y estabilidad
      const serialStr = generateLocalSerialNumber(lotNumber, i)
      
      serialPayloads.push({
        serial_number: serialStr,
        lot_id: lotData.id,
        product_id: productId,
        product_code: productCode,
        product_name: productName,
        sale_id: saleId,
        status: "pending",
        company_id: companyId,
        created_by: createdBy,
        // barcode_data: null // Opcional: Generar barcodes aquí consumiría mucha CPU, mejor hacerlo bajo demanda
      })
    }

    // 4. BULK INSERT en lotes (Chunks)
    // Enviamos paquetes de 1000 en 1000 para no saturar el body del request
    const CHUNK_SIZE = 1000
    const insertedSerials: GeneratedSerial[] = []
    
    console.log(`[v0] Starting Bulk Insert. Total chunks: ${Math.ceil(quantity / CHUNK_SIZE)}`)

    for (let i = 0; i < serialPayloads.length; i += CHUNK_SIZE) {
      const chunk = serialPayloads.slice(i, i + CHUNK_SIZE)
      
      const { data: chunkData, error: chunkError } = await supabase
        .from("product_serials")
        .insert(chunk)
        .select() // Importante para obtener los IDs generados
      
      if (chunkError) {
        console.error(`[v0] Error inserting chunk ${i}-${i + CHUNK_SIZE}:`, chunkError)
        throw chunkError
      }
      
      if (chunkData) {
        insertedSerials.push(...(chunkData as any[]))
      }
      console.log(`[v0] Chunk inserted successfully. Progress: ${insertedSerials.length}/${quantity}`)
    }

    console.log(`[v0] All ${insertedSerials.length} serials generated successfully`)

    return {
      id: lotData.id,
      lot_number: lotNumber,
      product_id: productId,
      product_code: productCode,
      product_name: productName,
      sale_id: saleId,
      quantity: quantity,
      status: "pending",
      serials: insertedSerials,
    }
  } catch (error) {
    console.error("Error in createLotWithSerials:", error)
    throw error
  }
}

/**
 * Creates a single serial number
 * (Mantener para uso individual si fuera necesario, pero no usar en bucles grandes)
 */
async function createSerial(params: SerialGenerationParams, sequence: number): Promise<GeneratedSerial> {
  const { lotId, lotNumber, productCode, productName, productId, saleId, companyId, createdBy } = params

  try {
    const serialNumber = await generateSerialNumber(lotNumber, sequence)

    const { data: serialData, error: serialError } = await supabase
      .from("product_serials")
      .insert({
        serial_number: serialNumber,
        lot_id: lotId,
        product_id: productId,
        product_code: productCode,
        product_name: productName,
        sale_id: saleId,
        status: "pending",
        company_id: companyId,
        created_by: createdBy,
      })
      .select()
      .single()

    if (serialError) {
      console.error("Error creating serial:", serialError)
      throw new Error(`Failed to create serial: ${serialError.message}`)
    }

    return {
      id: serialData.id,
      serial_number: serialNumber,
      lot_id: lotId,
      product_id: productId,
      product_code: productCode,
      product_name: productName,
      sale_id: saleId,
      status: "pending",
      barcode_data: serialData.barcode_data,
    }
  } catch (error) {
    console.error("Error in createSerial:", error)
    throw error
  }
}

/**
 * Finds available lots in inventory for a product (FIFO strategy)
 */
export async function findAvailableLotsForProduct(
  productId: string,
  requestedQuantity: number,
  companyId: string,
): Promise<{ allocatedLots: Array<{ lotId: string; quantity: number; serials: any[] }>; remainingQuantity: number }> {
  try {
    console.log("[v0] Finding available lots for product:", productId, "quantity:", requestedQuantity)

    // Fetch all available lots with their serials
    const { data: availableLots, error: lotsError } = await supabase
      .from("product_lots")
      .select(`
        id,
        lot_number,
        quantity,
        ingress_date,
        status,
        product_serials (
          id,
          serial_number,
          status
        )
      `)
      .eq("product_id", productId)
      .eq("company_id", companyId)
      .in("status", ["in_inventory", "pending"])
      .order("ingress_date", { ascending: true })

    if (lotsError) {
      console.error("[v0] Error fetching available lots:", lotsError)
      throw new Error(`Failed to fetch available lots: ${lotsError.message}`)
    }

    console.log("[v0] Available lots found:", availableLots?.length || 0)

    const allocatedLots: Array<{ lotId: string; quantity: number; serials: any[] }> = []
    let remainingQuantity = requestedQuantity

    if (!availableLots || availableLots.length === 0) {
      console.log("[v0] No available lots found, will create new lot")
      return { allocatedLots, remainingQuantity }
    }

    for (const lot of availableLots) {
      if (remainingQuantity <= 0) {
        console.log("[v0] Allocation complete, no more quantity needed")
        break
      }

      // Get serials that are NOT sold
      const availableSerials = lot.product_serials.filter((s: any) => s.status !== "sold")
      const availableQuantity = availableSerials.length

      console.log(
        `[v0] Lot ${lot.lot_number}: total serials=${lot.product_serials.length}, available=${availableQuantity}, needed=${remainingQuantity}`,
      )

      if (availableQuantity > 0) {
        const quantityToAllocate = Math.min(availableQuantity, remainingQuantity)
        const serialsToAllocate = availableSerials.slice(0, quantityToAllocate)

        allocatedLots.push({
          lotId: lot.id,
          quantity: quantityToAllocate,
          serials: serialsToAllocate,
        })

        remainingQuantity -= quantityToAllocate

        console.log(
          `[v0] Allocated ${quantityToAllocate} from lot ${lot.lot_number}, remaining needed: ${remainingQuantity}`,
        )
      }
    }

    console.log(
      `[v0] Allocation complete: ${allocatedLots.length} lots allocated, ${remainingQuantity} units still needed`,
    )
    return { allocatedLots, remainingQuantity }
  } catch (error) {
    console.error("[v0] Error in findAvailableLotsForProduct:", error)
    throw error
  }
}

/**
 * Allocates existing serials to a sale and updates their status
 */
export async function allocateSerialsToSale(
  saleId: string,
  allocatedLots: Array<{ lotId: string; quantity: number; serials: any[] }>,
): Promise<void> {
  try {
    console.log("[v0] Allocating serials to sale:", saleId, "from", allocatedLots.length, "lots")

    for (const allocation of allocatedLots) {
      const serialIds = allocation.serials.map((s) => s.id)
      const quantityToAllocate = allocation.quantity

      console.log(
        `[v0] Processing lot ${allocation.lotId}: allocating ${quantityToAllocate} serials out of ${allocation.serials.length}`,
      )

      // Update only the serials being allocated to this sale
      const { error: updateError } = await supabase
        .from("product_serials")
        .update({
          sale_id: saleId,
          status: "sold",
        })
        .in("id", serialIds)

      if (updateError) {
        console.error("[v0] Error updating serials:", updateError)
        throw new Error(`Failed to allocate serials: ${updateError.message}`)
      }

      console.log(`[v0] Updated ${quantityToAllocate} serials to sold status for sale ${saleId}`)

      // Fetch the lot to check if ALL serials are now sold
      const { data: lotData, error: lotFetchError } = await supabase
        .from("product_lots")
        .select(`
          id,
          lot_number,
          quantity,
          sale_id,
          product_id,
          product_code,
          product_name,
          company_id,
          created_by,
          status,
          generated_date,
          product_serials (
            id,
            status
          )
        `)
        .eq("id", allocation.lotId)
        .single()

      if (lotFetchError || !lotData) {
        console.error("[v0] Error fetching lot:", lotFetchError)
        throw new Error(`Failed to fetch lot: ${lotFetchError?.message}`)
      }

      // Count serials by status
      const totalSerials = lotData.product_serials.length
      const soldSerials = lotData.product_serials.filter((s: any) => s.status === "sold").length
      const remainingSerials = totalSerials - soldSerials

      console.log(
        `[v0] Lot ${allocation.lotId}: total=${totalSerials}, sold=${soldSerials}, remaining=${remainingSerials}`,
      )

      if (remainingSerials > 0 && soldSerials > 0) {
        console.log(
          `[v0] Partial allocation detected: ${soldSerials} sold, ${remainingSerials} remaining. Creating sliced lots...`,
        )

        // Create S1 lot (sold portion)
        const s1LotNumber = `${lotData.lot_number}S1`
        const { data: s1LotData, error: s1LotError } = await supabase
          .from("product_lots")
          .insert({
            lot_number: s1LotNumber,
            product_id: lotData.product_id,
            product_code: lotData.product_code,
            product_name: lotData.product_name,
            sale_id: saleId,
            quantity: soldSerials,
            status: lotData.status,
            company_id: lotData.company_id,
            created_by: lotData.created_by,
            generated_date: lotData.generated_date,
          })
          .select()
          .single()

        if (s1LotError) {
          console.error("[v0] Error creating S1 lot:", s1LotError)
          throw new Error(`Failed to create S1 lot: ${s1LotError.message}`)
        }

        // Update sold serials to reference the new S1 lot
        const soldSerialIds = lotData.product_serials.filter((s: any) => s.status === "sold").map((s: any) => s.id)

        const { error: updateS1Error } = await supabase
          .from("product_serials")
          .update({ lot_id: s1LotData.id })
          .in("id", soldSerialIds)

        if (updateS1Error) {
          console.error("[v0] Error updating serials to S1 lot:", updateS1Error)
          throw new Error(`Failed to update serials to S1 lot: ${updateS1Error.message}`)
        }

        // Create S2 lot (remaining portion)
        const s2LotNumber = `${lotData.lot_number}S2`
        const { data: s2LotData, error: s2LotError } = await supabase
          .from("product_lots")
          .insert({
            lot_number: s2LotNumber,
            product_id: lotData.product_id,
            product_code: lotData.product_code,
            product_name: lotData.product_name,
            sale_id: null,
            quantity: remainingSerials,
            status: "in_inventory",
            company_id: lotData.company_id,
            created_by: lotData.created_by,
            generated_date: lotData.generated_date,
          })
          .select()
          .single()

        if (s2LotError) {
          console.error("[v0] Error creating S2 lot:", s2LotError)
          throw new Error(`Failed to create S2 lot: ${s2LotError.message}`)
        }

        // Update remaining serials to reference the new S2 lot
        const remainingSerialIds = lotData.product_serials.filter((s: any) => s.status !== "sold").map((s: any) => s.id)

        const { error: updateS2Error } = await supabase
          .from("product_serials")
          .update({ lot_id: s2LotData.id })
          .in("id", remainingSerialIds)

        if (updateS2Error) {
          console.error("[v0] Error updating serials to S2 lot:", updateS2Error)
          throw new Error(`Failed to update serials to S2 lot: ${updateS2Error.message}`)
        }

        // Archive original lot
        const { error: archiveError } = await supabase
          .from("product_lots")
          .update({ is_archived: true }) // Asegúrate de que esta columna exista en tu tabla, si no, puedes usar status: 'archived'
          .eq("id", allocation.lotId)

        if (archiveError) {
           // Si no existe is_archived, logueamos pero no rompemos el flujo
           console.warn("[v0] Warning: Could not archive lot (column might differ):", archiveError)
        }
      } else if (remainingSerials === 0 && soldSerials > 0) {
        // All serials sold - link entire lot to sale
        const { error: lotUpdateError } = await supabase
          .from("product_lots")
          .update({
            sale_id: saleId,
          })
          .eq("id", allocation.lotId)

        if (lotUpdateError) {
          console.error("[v0] Error linking lot to sale:", lotUpdateError)
          throw new Error(`Failed to link lot to sale: ${lotUpdateError.message}`)
        }
      }
    }

    console.log("[v0] All serials allocated successfully to sale:", saleId)
  } catch (error) {
    console.error("[v0] Error in allocateSerialsToSale:", error)
    throw error
  }
}

/**
 * Generates lots and serials for all products in a sale with intelligent stock allocation
 */
export async function generateLotsForSale(
  saleId: string,
  companyId: string,
  createdBy: string,
): Promise<GeneratedLot[]> {
  try {
    console.log("[v0] Starting intelligent lot generation for sale:", saleId)

    const { data: saleItems, error: itemsError } = await supabase
      .from("sale_items")
      .select("product_id, product_code, product_name, quantity")
      .eq("sale_id", saleId)

    if (itemsError) {
      console.error("Error fetching sale items:", itemsError)
      throw new Error(`Failed to fetch sale items: ${itemsError.message}`)
    }

    if (!saleItems || saleItems.length === 0) {
      console.warn("No sale items found for sale:", saleId)
      return []
    }

    const generatedLots: GeneratedLot[] = []

    for (const item of saleItems) {
      console.log("[v0] Processing item:", item.product_name, "quantity:", item.quantity)

      const { allocatedLots, remainingQuantity } = await findAvailableLotsForProduct(
        item.product_id,
        item.quantity,
        companyId,
      )

      if (allocatedLots.length > 0) {
        await allocateSerialsToSale(saleId, allocatedLots)
        console.log("[v0] Allocated", item.quantity - remainingQuantity, "units from existing stock")
      }

      if (remainingQuantity > 0) {
        console.log("[v0] Creating new lot for remaining quantity:", remainingQuantity)

        // Llamada a la función OPTIMIZADA de creación de lotes
        const newLot = await createLotWithSerials({
          productCode: item.product_code,
          productName: item.product_name,
          productId: item.product_id,
          saleId: saleId,
          quantity: remainingQuantity,
          companyId: companyId,
          createdBy: createdBy,
        })

        generatedLots.push(newLot)
      }
    }

    console.log(`[v0] Generated ${generatedLots.length} new lots for sale ${saleId}`)
    return generatedLots
  } catch (error) {
    console.error("Error in generateLotsForSale:", error)
    throw error
  }
}

/**
 * Updates the status of a lot and its serials
 */
export async function updateLotStatus(
  lotId: string,
  newStatus: "pending" | "in_inventory" | "delivered",
): Promise<void> {
  try {
    console.log("[v0] Starting updateLotStatus for lot:", lotId, "new status:", newStatus)

    const { data: lotData, error: lotFetchError } = await supabase
      .from("product_lots")
      .select("*")
      .eq("id", lotId)
      .single()

    if (lotFetchError || !lotData) {
      console.error("[v0] Error fetching lot:", lotFetchError)
      throw new Error(`Failed to fetch lot details: ${lotFetchError?.message || "Lot not found"}`)
    }

    const { data: productData, error: productFetchError } = await supabase
      .from("products")
      .select("id, name, code, current_stock, cost_price, sale_price")
      .eq("id", lotData.product_id)
      .single()

    if (productFetchError || !productData) {
      console.error("[v0] Error fetching product:", productFetchError)
      throw new Error(`Failed to fetch product details: ${productFetchError?.message || "Product not found"}`)
    }

    // Update lot status
    const updateData: any = { status: newStatus }

    if (newStatus === "in_inventory") {
      updateData.ingress_date = new Date().toISOString()
    }

    if (newStatus === "delivered") {
      updateData.delivery_date = new Date().toISOString()
    }

    const { error: lotError } = await supabase.from("product_lots").update(updateData).eq("id", lotId)

    if (lotError) {
      console.error("[v0] Error updating lot:", lotError)
      throw new Error(`Failed to update lot status: ${lotError.message}`)
    }

    // Update associated serials status
    let serialStatus: "pending" | "in_inventory" | "sold" | "delivered"

    if (newStatus === "in_inventory") {
      serialStatus = "in_inventory"
    } else if (newStatus === "delivered") {
      serialStatus = "delivered"
    } else {
      serialStatus = "pending"
    }

    const { error: serialsError } = await supabase
      .from("product_serials")
      .update({ status: serialStatus })
      .eq("lot_id", lotId)

    if (serialsError) {
      console.error("[v0] Error updating serials:", serialsError)
      throw new Error(`Failed to update serials status: ${serialsError.message}`)
    }

    if (newStatus === "in_inventory") {
      console.log("[v0] Creating editable inventory entry movement...")

      const movementData = {
        product_id: lotData.product_id,
        company_id: lotData.company_id,
        created_by: lotData.created_by,
        movement_type: "entrada",
        quantity: lotData.quantity,
        movement_date: new Date().toISOString(),
        notes: `Ingreso automático de lote ${lotData.lot_number}`,
        reason: "Ingreso de lote generado desde venta",
        reference_document: lotData.lot_number,
      }

      const { error: movementError } = await supabase
        .from("inventory_movements")
        .insert(movementData)
        .select()
        .single()

      if (movementError) {
        console.error("[v0] Error creating inventory movement:", movementError)
        throw new Error(`Failed to create inventory movement: ${movementError.message}`)
      }

      const newStock = (productData.current_stock || 0) + lotData.quantity
      await supabase.from("products").update({ current_stock: newStock }).eq("id", lotData.product_id)
    }

    if (newStatus === "delivered") {
      console.log("[v0] Creating editable inventory exit movement...")

      const movementData = {
        product_id: lotData.product_id,
        company_id: lotData.company_id,
        created_by: lotData.created_by,
        movement_type: "salida",
        quantity: lotData.quantity,
        movement_date: new Date().toISOString(),
        notes: `Salida automática de lote ${lotData.lot_number}`,
        reason: "Entrega de lote a cliente",
        reference_document: lotData.lot_number,
      }

      const { error: movementError } = await supabase
        .from("inventory_movements")
        .insert(movementData)
        .select()
        .single()

      if (movementError) {
        console.error("[v0] Error creating inventory exit movement:", movementError)
        throw new Error(`Failed to create inventory exit movement: ${movementError.message}`)
      }

      const newStock = Math.max(0, (productData.current_stock || 0) - lotData.quantity)
      await supabase.from("products").update({ current_stock: newStock }).eq("id", lotData.product_id)
    }

    console.log("[v0] updateLotStatus completed successfully")
  } catch (error) {
    console.error("[v0] Error in updateLotStatus:", error)
    throw error
  }
}

export async function getLotsForSale(saleId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from("product_lots")
    .select(`
      *,
      product_serials (*)
    `)
    .eq("sale_id", saleId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching lots for sale:", error)
    throw new Error(`Failed to fetch lots: ${error.message}`)
  }

  return data || []
}

export async function getSerialsForLot(lotId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from("product_serials")
    .select("*")
    .eq("lot_id", lotId)
    .order("serial_number", { ascending: true })

  if (error) {
    console.error("Error fetching serials for lot:", error)
    throw new Error(`Failed to fetch serials: ${error.message}`)
  }

  return data || []
}

/**
 * Creates lots and serials for a manual inventory entry (entrada)
 * OPTIMIZED: Bulk Insert implemented
 */
export async function createLotsForInventoryEntry(
  productId: string,
  productCode: string,
  productName: string,
  quantity: number,
  companyId: string,
  createdBy: string,
  movementId?: string,
): Promise<GeneratedLot> {
  try {
    console.log("[v0] Creating lot for inventory entry:", productName, "quantity:", quantity)

    // 1. Create Lot
    const lotNumber = await generateLotNumber(productCode, new Date())

    const { data: lotData, error: lotError } = await supabase
      .from("product_lots")
      .insert({
        lot_number: lotNumber,
        product_id: productId,
        product_code: productCode,
        product_name: productName,
        sale_id: null,
        quantity: quantity,
        status: "in_inventory",
        company_id: companyId,
        created_by: createdBy,
        generated_date: new Date().toISOString(),
        ingress_date: new Date().toISOString(),
      })
      .select()
      .single()

    if (lotError) {
      console.error("[v0] Error creating lot:", lotError)
      throw new Error(`Failed to create lot: ${lotError.message}`)
    }

    // 2. Prepare Bulk Data (0 DB Calls)
    const serialPayloads = []
    console.log(`[v0] Preparing data for ${quantity} serials in memory...`)

    for (let i = 1; i <= quantity; i++) {
      const serialStr = generateLocalSerialNumber(lotNumber, i)
      serialPayloads.push({
        serial_number: serialStr,
        lot_id: lotData.id,
        product_id: productId,
        product_code: productCode,
        product_name: productName,
        sale_id: null,
        status: "in_inventory",
        company_id: companyId,
        created_by: createdBy,
      })
    }

    // 3. Insert in Chunks
    const CHUNK_SIZE = 1000
    const insertedSerials: GeneratedSerial[] = []
    
    for (let i = 0; i < serialPayloads.length; i += CHUNK_SIZE) {
      const chunk = serialPayloads.slice(i, i + CHUNK_SIZE)
      const { data: chunkData, error: chunkError } = await supabase
        .from("product_serials")
        .insert(chunk)
        .select()

      if (chunkError) throw chunkError
      if (chunkData) insertedSerials.push(...(chunkData as any[]))
      
      console.log(`[v0] Inventory Chunk inserted. Progress: ${insertedSerials.length}/${quantity}`)
    }

    return {
      id: lotData.id,
      lot_number: lotNumber,
      product_id: productId,
      product_code: productCode,
      product_name: productName,
      sale_id: null,
      quantity: quantity,
      status: "in_inventory",
      serials: insertedSerials,
    }
  } catch (error) {
    console.error("[v0] Error in createLotsForInventoryEntry:", error)
    throw error
  }
}

/**
 * Creates a single serial number for inventory entry
 * (Mantenido para compatibilidad, no usado en el proceso masivo)
 */
async function createSerialForInventoryEntry(
  params: SerialGenerationParams,
  sequence: number,
): Promise<GeneratedSerial> {
  const { lotId, lotNumber, productCode, productName, productId, companyId, createdBy } = params

  try {
    const serialNumber = await generateSerialNumber(lotNumber, sequence)

    const { data: serialData, error: serialError } = await supabase
      .from("product_serials")
      .insert({
        serial_number: serialNumber,
        lot_id: lotId,
        product_id: productId,
        product_code: productCode,
        product_name: productName,
        sale_id: null,
        status: "in_inventory",
        company_id: companyId,
        created_by: createdBy,
      })
      .select()
      .single()

    if (serialError) {
      console.error("[v0] Error creating serial:", serialError)
      throw new Error(`Failed to create serial: ${serialError.message}`)
    }

    return {
      id: serialData.id,
      serial_number: serialNumber,
      lot_id: lotId,
      product_id: productId,
      product_code: productCode,
      product_name: productName,
      sale_id: null,
      status: "in_inventory",
      barcode_data: serialData.barcode_data,
    }
  } catch (error) {
    console.error("[v0] Error in createSerialForInventoryEntry:", error)
    throw error
  }
}