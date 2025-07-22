import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

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
    serials_to_process, // Array of serial numbers for 'entrada'
    selected_serials, // Array of serial IDs for 'salida'/'ajuste'
  } = await request.json()

  const cookieStore = cookies()
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
        // For serialized product entry, create new serials and movements
        for (const serialNumber of serials_to_process) {
          // Check if serial already exists for this product and company
          const { data: existingSerial, error: existingSerialError } = await supabase
            .from("internal_product_serials")
            .select("id")
            .eq("serial_number", serialNumber)
            .eq("product_id", product_id)
            .eq("company_id", company_id)
            .single()

          if (existingSerialError && existingSerialError.code !== "PGRST116") {
            // PGRST116 means no rows found, which is expected for new serials
            throw new Error(`Error checking existing serial: ${existingSerialError.message}`)
          }

          if (existingSerial) {
            throw new Error(`El número de serie ${serialNumber} ya existe para este producto.`)
          }

          const { data: newSerial, error: serialError } = await supabase
            .from("internal_product_serials")
            .insert({
              product_id: product_id,
              serial_number: serialNumber,
              status: "in_stock",
              current_location: "Almacén Principal", // Default location
              company_id: company_id,
              created_by: user.id,
            })
            .select()
            .single()

          if (serialError) throw serialError

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
              serial_id: newSerial.id,
              created_by: user.id,
            }),
          )
        }
        // Update product stock
        productUpdatePromises.push(
          supabase
            .rpc("increment_internal_product_stock", {
              p_product_id: product_id,
              p_company_id: company_id,
              p_quantity: serials_to_process.length,
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
      // For non-serialized products
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

  const cookieStore = cookies()
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
