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
  sale_id: string
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
  sale_id: string
  status: string
  barcode_data?: string
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
 * Generates a serial number using the database function
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
    // Using a simple barcode generation approach
    // In production, you might want to use a library like jsbarcode
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")

    if (!ctx) {
      throw new Error("Could not get canvas context")
    }

    // Simple barcode representation (you can enhance this)
    canvas.width = 300
    canvas.height = 100

    ctx.fillStyle = "white"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.fillStyle = "black"
    ctx.font = "14px monospace"
    ctx.textAlign = "center"
    ctx.fillText(code, canvas.width / 2, canvas.height - 10)

    // Draw simple bars
    const barWidth = 2
    const spacing = 3
    let x = 20

    for (let i = 0; i < code.length; i++) {
      const charCode = code.charCodeAt(i)
      const bars = (charCode % 5) + 3 // Variable number of bars

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
 * Creates a lot and its associated serial numbers for a product in a sale
 */
export async function createLotWithSerials(params: LotGenerationParams): Promise<GeneratedLot> {
  const { productCode, productName, productId, saleId, quantity, companyId, createdBy, date = new Date() } = params

  try {
    // Generate lot number
    const lotNumber = await generateLotNumber(productCode, date)

    // Insert lot record
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

    // Generate serial numbers for each unit
    const serialPromises: Promise<GeneratedSerial>[] = []

    for (let i = 1; i <= quantity; i++) {
      serialPromises.push(
        createSerial(
          {
            lotId: lotData.id,
            lotNumber: lotNumber,
            productCode,
            productName,
            productId,
            saleId,
            quantity: 1,
            companyId,
            createdBy,
          },
          i,
        ),
      )
    }

    const serials = await Promise.all(serialPromises)

    return {
      id: lotData.id,
      lot_number: lotNumber,
      product_id: productId,
      product_code: productCode,
      product_name: productName,
      sale_id: saleId,
      quantity: quantity,
      status: "pending",
      serials: serials,
    }
  } catch (error) {
    console.error("Error in createLotWithSerials:", error)
    throw error
  }
}

/**
 * Creates a single serial number
 */
async function createSerial(params: SerialGenerationParams, sequence: number): Promise<GeneratedSerial> {
  const { lotId, lotNumber, productCode, productName, productId, saleId, companyId, createdBy } = params

  try {
    // Generate serial number
    const serialNumber = await generateSerialNumber(lotNumber, sequence)

    // Generate barcode (optional, can be done later)
    // const barcodeData = await generateBarcodeDataUrl(serialNumber)

    // Insert serial record
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
        // barcode_data: barcodeData,
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

    // Get lots with status 'in_inventory' ordered by ingress_date (FIFO)
    const { data: availableLots, error: lotsError } = await supabase
      .from("product_lots")
      .select(`
        id,
        lot_number,
        quantity,
        ingress_date,
        product_serials!inner (
          id,
          serial_number,
          status
        )
      `)
      .eq("product_id", productId)
      .eq("company_id", companyId)
      .eq("status", "in_inventory")
      .order("ingress_date", { ascending: true })

    if (lotsError) {
      console.error("[v0] Error fetching available lots:", lotsError)
      throw new Error(`Failed to fetch available lots: ${lotsError.message}`)
    }

    console.log("[v0] Available lots found:", availableLots?.length || 0)

    const allocatedLots: Array<{ lotId: string; quantity: number; serials: any[] }> = []
    let remainingQuantity = requestedQuantity

    if (!availableLots || availableLots.length === 0) {
      return { allocatedLots, remainingQuantity }
    }

    // Allocate from oldest lots first (FIFO)
    for (const lot of availableLots) {
      if (remainingQuantity <= 0) break

      // Filter available serials (in_inventory status)
      const availableSerials = lot.product_serials.filter((s: any) => s.status === "in_inventory")
      const availableQuantity = availableSerials.length

      if (availableQuantity > 0) {
        const quantityToAllocate = Math.min(availableQuantity, remainingQuantity)
        const serialsToAllocate = availableSerials.slice(0, quantityToAllocate)

        allocatedLots.push({
          lotId: lot.id,
          quantity: quantityToAllocate,
          serials: serialsToAllocate,
        })

        remainingQuantity -= quantityToAllocate
        console.log("[v0] Allocated", quantityToAllocate, "from lot", lot.lot_number, "remaining:", remainingQuantity)
      }
    }

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
    console.log("[v0] Allocating serials to sale:", saleId)

    for (const allocation of allocatedLots) {
      const serialIds = allocation.serials.map((s) => s.id)

      const { error: lotUpdateError } = await supabase
        .from("product_lots")
        .update({
          sale_id: saleId,
        })
        .eq("id", allocation.lotId)

      if (lotUpdateError) {
        console.error("[v0] Error updating lot sale_id:", lotUpdateError)
        throw new Error(`Failed to link lot to sale: ${lotUpdateError.message}`)
      }

      // Update serials to link them to the sale
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

      console.log("[v0] Allocated", serialIds.length, "serials from lot", allocation.lotId, "to sale", saleId)
    }
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

    // Get sale items
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

    // Process each product
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

    console.log("[v0] Lot data fetched:", lotData)

    const { data: productData, error: productFetchError } = await supabase
      .from("products")
      .select("id, name, code, current_stock, cost_price, sale_price")
      .eq("id", lotData.product_id)
      .single()

    if (productFetchError || !productData) {
      console.error("[v0] Error fetching product:", productFetchError)
      throw new Error(`Failed to fetch product details: ${productFetchError?.message || "Product not found"}`)
    }

    console.log("[v0] Product data fetched:", productData)

    // Update lot status
    const updateData: any = { status: newStatus }

    if (newStatus === "in_inventory") {
      updateData.ingress_date = new Date().toISOString()
    }

    if (newStatus === "delivered") {
      updateData.delivery_date = new Date().toISOString()
    }

    console.log("[v0] Updating lot with data:", updateData)

    const { error: lotError } = await supabase.from("product_lots").update(updateData).eq("id", lotId)

    if (lotError) {
      console.error("[v0] Error updating lot:", lotError)
      throw new Error(`Failed to update lot status: ${lotError.message}`)
    }

    console.log("[v0] Lot status updated successfully")

    // Update associated serials status
    let serialStatus: "pending" | "in_inventory" | "sold" | "delivered"

    if (newStatus === "in_inventory") {
      serialStatus = "in_inventory"
    } else if (newStatus === "delivered") {
      serialStatus = "delivered"
    } else {
      serialStatus = "pending"
    }

    console.log("[v0] Updating serials to status:", serialStatus)

    const { error: serialsError } = await supabase
      .from("product_serials")
      .update({ status: serialStatus })
      .eq("lot_id", lotId)

    if (serialsError) {
      console.error("[v0] Error updating serials:", serialsError)
      throw new Error(`Failed to update serials status: ${serialsError.message}`)
    }

    console.log("[v0] Serials updated successfully")

    if (newStatus === "in_inventory") {
      console.log("[v0] Creating editable inventory entry movement...")

      const movementData = {
        product_id: lotData.product_id,
        company_id: lotData.company_id,
        created_by: lotData.created_by,
        movement_type: "entrada",
        quantity: lotData.quantity,
        unit_cost: null,
        total_cost: null,
        unit_price: null,
        total_amount: null,
        sale_price: null,
        entry_price: null,
        exit_price: null,
        movement_date: new Date().toISOString(),
        notes: `Ingreso automático de lote ${lotData.lot_number} - Pendiente de completar información contable`,
        reason: "Ingreso de lote generado desde venta",
        reference_document: lotData.lot_number,
        purchase_order_number: null,
        destination_entity_name: null,
        destination_address: null,
        supplier: null,
      }

      console.log("[v0] Movement data to insert:", movementData)

      const { data: movementResult, error: movementError } = await supabase
        .from("inventory_movements")
        .insert(movementData)
        .select()
        .single()

      if (movementError) {
        console.error("[v0] Error creating inventory movement:", movementError)
        throw new Error(`Failed to create inventory movement: ${movementError.message}`)
      }

      console.log("[v0] Editable inventory movement created:", movementResult)

      const currentStock = productData.current_stock || 0
      const newStock = currentStock + lotData.quantity

      console.log("[v0] Updating stock from", currentStock, "to", newStock)

      const { error: stockError } = await supabase
        .from("products")
        .update({ current_stock: newStock })
        .eq("id", lotData.product_id)

      if (stockError) {
        console.error("[v0] Error updating product stock:", stockError)
        throw new Error(`Failed to update product stock: ${stockError.message}`)
      }

      console.log("[v0] Stock updated successfully to", newStock)
    }

    if (newStatus === "delivered") {
      console.log("[v0] Creating editable inventory exit movement...")

      const movementData = {
        product_id: lotData.product_id,
        company_id: lotData.company_id,
        created_by: lotData.created_by,
        movement_type: "salida",
        quantity: lotData.quantity,
        unit_cost: null,
        total_cost: null,
        unit_price: null,
        total_amount: null,
        sale_price: null,
        entry_price: null,
        exit_price: null,
        movement_date: new Date().toISOString(),
        notes: `Salida automática de lote ${lotData.lot_number} - Pendiente de completar información contable`,
        reason: "Entrega de lote a cliente",
        reference_document: lotData.lot_number,
        purchase_order_number: null,
        destination_entity_name: null,
        destination_address: null,
        supplier: null,
      }

      console.log("[v0] Movement data to insert:", movementData)

      const { data: movementResult, error: movementError } = await supabase
        .from("inventory_movements")
        .insert(movementData)
        .select()
        .single()

      if (movementError) {
        console.error("[v0] Error creating inventory exit movement:", movementError)
        throw new Error(`Failed to create inventory exit movement: ${movementError.message}`)
      }

      console.log("[v0] Editable inventory exit movement created:", movementResult)

      const currentStock = productData.current_stock || 0
      const newStock = Math.max(0, currentStock - lotData.quantity)

      console.log("[v0] Updating stock from", currentStock, "to", newStock)

      const { error: stockError } = await supabase
        .from("products")
        .update({ current_stock: newStock })
        .eq("id", lotData.product_id)

      if (stockError) {
        console.error("[v0] Error updating product stock:", stockError)
        throw new Error(`Failed to update product stock: ${stockError.message}`)
      }

      console.log("[v0] Stock updated successfully to", newStock)
    }

    console.log("[v0] updateLotStatus completed successfully")
  } catch (error) {
    console.error("[v0] Error in updateLotStatus:", error)
    throw error
  }
}

/**
 * Gets all lots for a sale
 */
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

/**
 * Gets all serials for a lot
 */
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

    const lotNumber = await generateLotNumber(productCode, new Date())

    const { data: lotData, error: lotError } = await supabase
      .from("product_lots")
      .insert({
        lot_number: lotNumber,
        product_id: productId,
        product_code: productCode,
        product_name: productName,
        sale_id: null, // No sale associated with manual entries
        quantity: quantity,
        status: "in_inventory", // Directly set to in_inventory for manual entries
        company_id: companyId,
        created_by: createdBy,
        generated_date: new Date().toISOString(),
        ingress_date: new Date().toISOString(), // Set ingress date immediately
      })
      .select()
      .single()

    if (lotError) {
      console.error("[v0] Error creating lot:", lotError)
      throw new Error(`Failed to create lot: ${lotError.message}`)
    }

    // Generate serial numbers for each unit
    const serialPromises: Promise<GeneratedSerial>[] = []

    for (let i = 1; i <= quantity; i++) {
      serialPromises.push(
        createSerialForInventoryEntry(
          {
            lotId: lotData.id,
            lotNumber: lotNumber,
            productCode,
            productName,
            productId,
            saleId: null,
            quantity: 1,
            companyId,
            createdBy,
          },
          i,
        ),
      )
    }

    const serials = await Promise.all(serialPromises)

    console.log("[v0] Created lot", lotNumber, "with", serials.length, "serials for inventory entry")

    return {
      id: lotData.id,
      lot_number: lotNumber,
      product_id: productId,
      product_code: productCode,
      product_name: productName,
      sale_id: null,
      quantity: quantity,
      status: "in_inventory",
      serials: serials,
    }
  } catch (error) {
    console.error("[v0] Error in createLotsForInventoryEntry:", error)
    throw error
  }
}

/**
 * Creates a single serial number for inventory entry
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
        sale_id: null, // No sale for manual entries
        status: "in_inventory", // Directly set to in_inventory
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
