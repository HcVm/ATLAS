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
 * Generates lots and serials for all products in a sale
 */
export async function generateLotsForSale(
  saleId: string,
  companyId: string,
  createdBy: string,
): Promise<GeneratedLot[]> {
  try {
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

    // Generate lot and serials for each product
    const lotPromises = saleItems.map((item) =>
      createLotWithSerials({
        productCode: item.product_code,
        productName: item.product_name,
        productId: item.product_id,
        saleId: saleId,
        quantity: item.quantity,
        companyId: companyId,
        createdBy: createdBy,
      }),
    )

    const lots = await Promise.all(lotPromises)

    console.log(`Generated ${lots.length} lots for sale ${saleId}`)
    return lots
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
      console.log("[v0] Creating inventory entry movement...")

      const unitCost = productData.cost_price || 0
      const totalCost = unitCost * lotData.quantity

      const movementData = {
        product_id: lotData.product_id,
        company_id: lotData.company_id,
        created_by: lotData.created_by,
        movement_type: "entrada",
        quantity: lotData.quantity,
        unit_cost: unitCost,
        total_cost: totalCost,
        unit_price: unitCost,
        total_amount: totalCost,
        sale_price: productData.sale_price || 0,
        movement_date: new Date().toISOString(),
        notes: `Ingreso de lote ${lotData.lot_number} desde venta`,
        reason: "Ingreso de lote generado",
        reference_document: lotData.lot_number,
      }

      console.log("[v0] Movement data to insert:", movementData)

      const { data: movementResult, error: movementError } = await supabase
        .from("inventory_movements")
        .insert(movementData)
        .select()

      if (movementError) {
        console.error("[v0] Error creating inventory movement:", movementError)
        throw new Error(`Failed to create inventory movement: ${movementError.message}`)
      }

      console.log("[v0] Inventory movement created:", movementResult)

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
      console.log("[v0] Creating inventory exit movement...")

      const unitCost = productData.cost_price || 0
      const totalCost = unitCost * lotData.quantity

      const movementData = {
        product_id: lotData.product_id,
        company_id: lotData.company_id,
        created_by: lotData.created_by,
        movement_type: "salida",
        quantity: lotData.quantity,
        unit_cost: unitCost,
        total_cost: totalCost,
        unit_price: unitCost,
        total_amount: totalCost,
        sale_price: productData.sale_price || 0,
        movement_date: new Date().toISOString(),
        notes: `Salida de lote ${lotData.lot_number} - entrega a cliente`,
        reason: "Entrega de lote",
        reference_document: lotData.lot_number,
      }

      console.log("[v0] Movement data to insert:", movementData)

      const { data: movementResult, error: movementError } = await supabase
        .from("inventory_movements")
        .insert(movementData)
        .select()

      if (movementError) {
        console.error("[v0] Error creating inventory exit movement:", movementError)
        throw new Error(`Failed to create inventory exit movement: ${movementError.message}`)
      }

      console.log("[v0] Inventory exit movement created:", movementResult)

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
