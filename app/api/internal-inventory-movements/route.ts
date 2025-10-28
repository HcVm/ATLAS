import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import crypto from "crypto"

// Helper function to generate serial numbers
function generateSerialNumber(productCode: string, correlative: number): string {
  // Product code format: COMPANY-CATEGORY-YEAR-NUM (e.g., ARM-TEC-2024-001)
  // Serial format: ARMTEC2024001-S0001 (product code without hyphens + -S + correlative)

  // Remove all hyphens from product code
  const productCodeWithoutHyphens = productCode.replace(/-/g, "")

  // Add -S prefix to correlative
  return `${productCodeWithoutHyphens}-S${String(correlative).padStart(4, "0")}`
}

export async function POST(request: Request) {
  const {
    product_id,
    movement_type,
    quantity,
    cost_price,
    reason,
    notes,
    requested_by,
    department_requesting,
    supplier,
    movement_date,
    company_id,
    is_serialized_product,
    serials_to_process,
    selected_serials,
  } = await request.json()

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: "", ...options })
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!company_id) {
    return NextResponse.json({ error: "Company ID is required" }, { status: 400 })
  }

  const total_amount = quantity * cost_price

  try {
    const productUpdatePromises: Promise<any>[] = []
    const serialUpdatePromises: Promise<any>[] = []
    const movementInsertPromises: Promise<any>[] = []

    if (is_serialized_product) {
      if (movement_type === "entrada") {
        const { data: productData, error: productError } = await supabase
          .from("internal_products")
          .select("code")
          .eq("id", product_id)
          .single()

        if (productError) throw new Error(`Error fetching product data: ${productError.message}`)

        // Get the last serial number for this product to determine the next correlative
        const { data: lastSerial, error: lastSerialError } = await supabase
          .from("internal_product_serials")
          .select("serial_number")
          .eq("product_id", product_id)
          .eq("company_id", company_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single()

        let nextCorrelative = 1
        if (lastSerial && !lastSerialError) {
          const parts = lastSerial.serial_number.split("-")
          const lastCorrelativeStr = parts[parts.length - 1].replace("S", "")
          const lastCorrelative = Number.parseInt(lastCorrelativeStr, 10)
          if (!isNaN(lastCorrelative)) {
            nextCorrelative = lastCorrelative + 1
          }
        }

        const productCode = productData.code

        const createdSerialIds: string[] = []
        const generatedSerialNumbers: string[] = []

        // Generate serial numbers for the quantity specified
        for (let i = 0; i < quantity; i++) {
          const serialNumber = generateSerialNumber(productCode, nextCorrelative + i)

          // Check if serial already exists
          const { data: existingSerial, error: existingSerialError } = await supabase
            .from("internal_product_serials")
            .select("id")
            .eq("serial_number", serialNumber)
            .eq("product_id", product_id)
            .eq("company_id", company_id)
            .single()

          if (existingSerialError && existingSerialError.code !== "PGRST116") {
            throw new Error(`Error checking existing serial: ${existingSerialError.message}`)
          }

          if (existingSerial) {
            throw new Error(`El número de serie ${serialNumber} ya existe para este producto.`)
          }

          const serialQrCodeHash = crypto.randomBytes(16).toString("hex")

          const { data: newSerial, error: serialError } = await supabase
            .from("internal_product_serials")
            .insert({
              product_id: product_id,
              serial_number: serialNumber,
              status: "in_stock",
              current_location: "Almacén Principal",
              company_id: company_id,
              created_by: user.id,
              qr_code_hash: serialQrCodeHash,
            })
            .select()
            .single()

          if (serialError) throw serialError

          createdSerialIds.push(newSerial.id)
          generatedSerialNumbers.push(serialNumber)
        }

        const notesWithSerials = `${notes || ""} - Series generadas: ${generatedSerialNumbers.join(", ")}`

        movementInsertPromises.push(
          supabase.from("internal_inventory_movements").insert({
            product_id,
            movement_type,
            quantity: quantity, // Use the actual quantity instead of 1
            cost_price,
            total_amount: quantity * cost_price, // Calculate total for all units
            reason,
            notes: notesWithSerials,
            requested_by,
            department_requesting,
            supplier,
            movement_date,
            company_id,
            serial_id: null, // Set to null for grouped movements
            created_by: user.id,
          }),
        )

        // Update product stock
        productUpdatePromises.push(
          supabase
            .rpc("increment_internal_product_stock", {
              p_product_id: product_id,
              p_company_id: company_id,
              p_quantity: quantity,
            })
            .select(),
        )
      } else {
        // For serialized product exit/adjustment, update existing serials and create movements
        for (const serialId of selected_serials) {
          const newStatus = movement_type === "salida" ? "out_of_stock" : "in_repair" // Or other adjustment status
          serialUpdatePromises.push(
            supabase
              .from("internal_product_serials")
              .update({ status: newStatus, current_location: department_requesting || null })
              .eq("id", serialId)
              .eq("company_id", company_id),
          )

          movementInsertPromises.push(
            supabase.from("internal_inventory_movements").insert({
              product_id,
              movement_type,
              quantity: 1, // Always 1 for serialized
              cost_price,
              total_amount: cost_price, // Total amount for one unit
              reason,
              notes,
              requested_by,
              department_requesting,
              supplier,
              movement_date,
              company_id,
              serial_id: serialId,
              created_by: user.id,
            }),
          )
        }
        // Update product stock
        productUpdatePromises.push(
          supabase
            .rpc("decrement_internal_product_stock", {
              p_product_id: product_id,
              p_company_id: company_id,
              p_quantity: selected_serials.length,
            })
            .select(),
        )
      }
    } else {
      const { data: movement, error: movementError } = await supabase
        .from("internal_inventory_movements")
        .insert({
          product_id,
          movement_type,
          quantity,
          cost_price,
          total_amount,
          reason,
          notes,
          requested_by,
          department_requesting,
          supplier,
          movement_date,
          company_id,
          created_by: user.id,
        })
        .select()
        .single()

      if (movementError) throw movementError

      // Update product stock based on movement type
      if (movement_type === "entrada") {
        productUpdatePromises.push(
          supabase
            .rpc("increment_internal_product_stock", {
              p_product_id: product_id,
              p_company_id: company_id,
              p_quantity: quantity,
            })
            .select(),
        )
      } else if (movement_type === "salida" || movement_type === "ajuste") {
        productUpdatePromises.push(
          supabase
            .rpc("decrement_internal_product_stock", {
              p_product_id: product_id,
              p_company_id: company_id,
              p_quantity: quantity,
            })
            .select(),
        )
      }
    }

    await Promise.all([...productUpdatePromises, ...serialUpdatePromises, ...movementInsertPromises])

    return NextResponse.json({ message: "Movement registered successfully" }, { status: 201 })
  } catch (error: any) {
    console.error("Error in POST /api/internal-inventory-movements:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const movementId = searchParams.get("id")
  const companyId = searchParams.get("companyId")

  if (!movementId || !companyId) {
    return NextResponse.json({ error: "Movement ID and Company ID are required" }, { status: 400 })
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: "", ...options })
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // First, get the movement details to revert stock/serials
    const { data: movement, error: fetchError } = await supabase
      .from("internal_inventory_movements")
      .select(
        `
        product_id, movement_type, quantity, serial_id,
        internal_products (is_serialized)
      `,
      )
      .eq("id", movementId)
      .eq("company_id", companyId)
      .single()

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return NextResponse.json({ error: "Movement not found" }, { status: 404 })
      }
      throw fetchError
    }

    let productUpdatePromise: Promise<any> | null = null
    let serialUpdatePromise: Promise<any> | null = null

    const isSerializedProduct = movement.internal_products?.is_serialized

    if (isSerializedProduct) {
      if (movement.serial_id) {
        // If it was an 'entrada', delete the serial. If 'salida'/'ajuste', revert status to 'in_stock'
        if (movement.movement_type === "entrada") {
          serialUpdatePromise = supabase.from("internal_product_serials").delete().eq("id", movement.serial_id)
        } else {
          serialUpdatePromise = supabase
            .from("internal_product_serials")
            .update({ status: "in_stock", current_location: "Almacén Principal" })
            .eq("id", movement.serial_id)
        }
        // For serialized products, stock is updated by serial status changes, so no direct product stock update here.
        // The increment/decrement RPCs are called during POST, so we need to reverse them.
        if (movement.movement_type === "entrada") {
          productUpdatePromise = supabase.rpc("decrement_internal_product_stock", {
            p_product_id: movement.product_id,
            p_company_id: companyId,
            p_quantity: 1, // Always 1 for serialized
          })
        } else if (movement.movement_type === "salida" || movement.movement_type === "ajuste") {
          productUpdatePromise = supabase.rpc("increment_internal_product_stock", {
            p_product_id: movement.product_id,
            p_company_id: companyId,
            p_quantity: 1, // Always 1 for serialized
          })
        }
      }
    } else {
      // For non-serialized products, revert stock
      if (movement.movement_type === "entrada") {
        productUpdatePromise = supabase.rpc("decrement_internal_product_stock", {
          p_product_id: movement.product_id,
          p_company_id: companyId,
          p_quantity: movement.quantity,
        })
      } else if (movement.movement_type === "salida" || movement.movement_type === "ajuste") {
        productUpdatePromise = supabase.rpc("increment_internal_product_stock", {
          p_product_id: movement.product_id,
          p_company_id: companyId,
          p_quantity: movement.quantity,
        })
      }
    }

    // Delete the movement record
    const { error: deleteError } = await supabase
      .from("internal_inventory_movements")
      .delete()
      .eq("id", movementId)
      .eq("company_id", companyId)

    if (deleteError) throw deleteError

    // Execute stock/serial updates after successful movement deletion
    const promisesToAwait = []
    if (productUpdatePromise) promisesToAwait.push(productUpdatePromise)
    if (serialUpdatePromise) promisesToAwait.push(serialUpdatePromise)

    await Promise.all(promisesToAwait)

    return NextResponse.json({ message: "Movement deleted successfully" }, { status: 200 })
  } catch (error: any) {
    console.error("Error in DELETE /api/internal-inventory-movements:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
