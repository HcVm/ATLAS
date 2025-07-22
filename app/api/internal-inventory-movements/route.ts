import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import type { Database } from "@/lib/database.types"
import { v4 as uuidv4 } from "uuid"
import { createClient } from "@supabase/supabase-js" // Import directly from supabase-js

// Function to create a Supabase client for Route Handlers without auth-helpers
function getSupabaseRouteHandlerClient() {
  const cookieStore = cookies()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false, // Sessions are managed by Next.js cookies
    },
  })

  // Manually set the session from cookies for RLS to work
  const accessToken = cookieStore.get("sb-access-token")?.value
  const refreshToken = cookieStore.get("sb-refresh-token")?.value

  if (accessToken && refreshToken) {
    // Set the session. This is crucial for Row Level Security (RLS) to apply.
    // The .catch is added to prevent unhandled promise rejections, though in a route handler,
    // errors here might indicate a deeper issue with token validity or Supabase setup.
    supabase.auth
      .setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })
      .catch((e) => console.error("Error setting session in route handler:", e))
  }

  return supabase
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
    serials_to_process, // Array of serial numbers (for entrada) or serial IDs (for salida/ajuste)
  } = await request.json()

  const supabase = getSupabaseRouteHandlerClient()

  try {
    // Validate company_id
    if (!company_id) {
      return NextResponse.json({ error: "Company ID is required." }, { status: 400 })
    }

    let finalQuantity = quantity
    const finalCostPrice = cost_price

    if (is_serialized_product) {
      finalQuantity = serials_to_process.length
      // For serialized products, cost_price should ideally be fetched per serial or averaged.
      // For simplicity, we'll use the provided cost_price for each serial.
    }

    // 1. Insert the movement record
    const { data: movement, error: movementError } = await supabase
      .from("internal_inventory_movements")
      .insert({
        id: uuidv4(),
        product_id,
        movement_type,
        quantity: finalQuantity,
        cost_price: finalCostPrice,
        total_amount: finalQuantity * finalCostPrice,
        reason,
        notes,
        requested_by,
        department_requesting,
        supplier: movement_type === "entrada" && !is_serialized_product ? supplier : null, // Only for non-serialized entries
        movement_date,
        company_id,
      })
      .select()
      .single()

    if (movementError) {
      console.error("Error inserting movement:", movementError)
      return NextResponse.json({ error: movementError.message }, { status: 500 })
    }

    // 2. Handle serialized products
    if (is_serialized_product) {
      if (movement_type === "entrada") {
        // For 'entrada', create new serial records
        const serialsToInsert = serials_to_process.map((serial_number: string) => ({
          id: uuidv4(),
          product_id,
          serial_number,
          status: "in_stock",
          current_location: null, // Or a default location
          company_id,
        }))

        const { error: serialInsertError } = await supabase.from("internal_product_serials").insert(serialsToInsert)

        if (serialInsertError) {
          console.error("Error inserting serials:", serialInsertError)
          // Attempt to rollback the movement if serial insertion fails
          await supabase.from("internal_inventory_movements").delete().eq("id", movement.id)
          return NextResponse.json({ error: serialInsertError.message }, { status: 500 })
        }
      } else if (movement_type === "salida" || movement_type === "ajuste") {
        // For 'salida' (assignment) or 'ajuste', update existing serial records
        const newStatus = movement_type === "salida" ? "out_of_stock" : "in_stock" // 'ajuste' could mean back to stock or other status
        const newLocation = movement_type === "salida" ? department_requesting : null // Assign to department for 'salida'

        for (const serialId of serials_to_process) {
          const { error: serialUpdateError } = await supabase
            .from("internal_product_serials")
            .update({
              status: newStatus,
              current_location: newLocation,
              updated_at: new Date().toISOString(),
            })
            .eq("id", serialId)
            .eq("company_id", company_id)

          if (serialUpdateError) {
            console.error(`Error updating serial ${serialId}:`, serialUpdateError)
            // Attempt to rollback the movement if any serial update fails
            await supabase.from("internal_inventory_movements").delete().eq("id", movement.id)
            return NextResponse.json({ error: serialUpdateError.message }, { status: 500 })
          }
        }
      }
    }

    // 3. Update product's current_stock
    if (is_serialized_product) {
      const { count, error: countError } = await supabase
        .from("internal_product_serials")
        .select("*", { count: "exact", head: true })
        .eq("product_id", product_id)
        .eq("company_id", company_id)
        .eq("status", "in_stock")

      if (countError) {
        console.error("Error counting in-stock serials:", countError)
        // Attempt to rollback the movement
        await supabase.from("internal_inventory_movements").delete().eq("id", movement.id)
        return NextResponse.json({ error: countError.message }, { status: 500 })
      }

      const { error: updateProductError } = await supabase
        .from("internal_products")
        .update({ current_stock: count || 0, updated_at: new Date().toISOString() })
        .eq("id", product_id)
        .eq("company_id", company_id)

      if (updateProductError) {
        console.error("Error updating product stock (serialized):", updateProductError)
        // Attempt to rollback the movement
        await supabase.from("internal_inventory_movements").delete().eq("id", movement.id)
        return NextResponse.json({ error: updateProductError.message }, { status: 500 })
      }
    } else {
      // For non-serialized products, update stock based on movement type
      const { data: productData, error: fetchProductError } = await supabase
        .from("internal_products")
        .select("current_stock")
        .eq("id", product_id)
        .eq("company_id", company_id)
        .single()

      if (fetchProductError) {
        console.error("Error fetching product for stock update:", fetchProductError)
        await supabase.from("internal_inventory_movements").delete().eq("id", movement.id)
        return NextResponse.json({ error: fetchProductError.message }, { status: 500 })
      }

      let newStock = productData.current_stock
      if (movement_type === "entrada") {
        newStock += quantity
      } else if (movement_type === "salida") {
        newStock -= quantity
      } else if (movement_type === "ajuste") {
        // For adjustment, assume quantity is the net change
        // Or, if quantity is the target stock, calculate difference
        // For now, let's assume it's a net change like entrada/salida
        newStock += quantity // If quantity is positive, it's an increase, if negative, a decrease
      }

      const { error: updateProductError } = await supabase
        .from("internal_products")
        .update({ current_stock: newStock, updated_at: new Date().toISOString() })
        .eq("id", product_id)
        .eq("company_id", company_id)

      if (updateProductError) {
        console.error("Error updating product stock (non-serialized):", updateProductError)
        await supabase.from("internal_inventory_movements").delete().eq("id", movement.id)
        return NextResponse.json({ error: updateProductError.message }, { status: 500 })
      }
    }

    return NextResponse.json({ message: "Movement recorded successfully", movementId: movement.id }, { status: 201 })
  } catch (error: any) {
    console.error("Unhandled error in POST /api/internal-inventory-movements:", error)
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 })
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const company_id = searchParams.get("company_id")

  if (!company_id) {
    return NextResponse.json({ error: "Company ID is required." }, { status: 400 })
  }

  const supabase = getSupabaseRouteHandlerClient()

  try {
    const { data, error } = await supabase
      .from("internal_inventory_movements")
      .select(
        `
        *,
        internal_products (
          name,
          code,
          unit_of_measure,
          is_serialized
        ),
        internal_product_serials (
          serial_number
        )
      `,
      )
      .eq("company_id", company_id)
      .order("created_at", { ascending: false })

    if (error) throw error

    return NextResponse.json(data, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching internal inventory movements:", error)
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  const company_id = searchParams.get("company_id")

  if (!id || !company_id) {
    return NextResponse.json({ error: "Movement ID and Company ID are required." }, { status: 400 })
  }

  const supabase = getSupabaseRouteHandlerClient()

  try {
    // Fetch the movement to get details for stock reversal
    const { data: movement, error: fetchMovementError } = await supabase
      .from("internal_inventory_movements")
      .select(`*, internal_products(is_serialized)`)
      .eq("id", id)
      .eq("company_id", company_id)
      .single()

    if (fetchMovementError || !movement) {
      console.error("Movement not found or error fetching:", fetchMovementError)
      return NextResponse.json({ error: "Movement not found or unauthorized." }, { status: 404 })
    }

    const { product_id, movement_type, quantity, serial_id, internal_products } = movement
    const is_serialized_product = internal_products?.is_serialized

    // Delete the movement record
    const { error: deleteError } = await supabase
      .from("internal_inventory_movements")
      .delete()
      .eq("id", id)
      .eq("company_id", company_id)

    if (deleteError) {
      console.error("Error deleting movement:", deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    // Revert stock changes
    if (is_serialized_product) {
      if (serial_id) {
        // Revert status of the specific serial
        const newStatus = movement_type === "salida" ? "in_stock" : "out_of_stock" // If it was 'salida', put back to stock. If it was 'entrada' (shouldn't be deleted this way), or 'ajuste' to out_of_stock, put back to in_stock.
        const newLocation = movement_type === "salida" ? null : movement.department_requesting // Clear location if it was assigned

        const { error: serialUpdateError } = await supabase
          .from("internal_product_serials")
          .update({
            status: newStatus,
            current_location: newLocation,
            updated_at: new Date().toISOString(),
          })
          .eq("id", serial_id)
          .eq("company_id", company_id)

        if (serialUpdateError) {
          console.error("Error reverting serial status:", serialUpdateError)
          // This is a critical point, manual intervention might be needed if this fails after movement deletion
          return NextResponse.json({ error: "Movement deleted, but failed to revert serial status." }, { status: 500 })
        }
      } else {
        // If it was an 'entrada' of multiple serials, we need to delete the serials created by this movement.
        // This is complex without a direct link from movement to multiple serials.
        // For now, we assume serial_id is present for single serial movements.
        // For multi-serial 'entrada', a more robust rollback mechanism (e.g., stored procedure) is needed.
        console.warn(
          "Movement deleted, but no serial_id found for serialized product. Manual serial adjustment might be needed.",
        )
      }

      // Recalculate product's current_stock based on 'in_stock' serials
      const { count, error: countError } = await supabase
        .from("internal_product_serials")
        .select("*", { count: "exact", head: true })
        .eq("product_id", product_id)
        .eq("company_id", company_id)
        .eq("status", "in_stock")

      if (countError) {
        console.error("Error recounting in-stock serials after deletion:", countError)
        return NextResponse.json({ error: "Movement deleted, but failed to recount product stock." }, { status: 500 })
      }

      const { error: updateProductError } = await supabase
        .from("internal_products")
        .update({ current_stock: count || 0, updated_at: new Date().toISOString() })
        .eq("id", product_id)
        .eq("company_id", company_id)

      if (updateProductError) {
        console.error("Error updating product stock after deletion (serialized):", updateProductError)
        return NextResponse.json({ error: "Movement deleted, but failed to update product stock." }, { status: 500 })
      }
    } else {
      // For non-serialized products, revert stock based on movement type
      const { data: productData, error: fetchProductError } = await supabase
        .from("internal_products")
        .select("current_stock")
        .eq("id", product_id)
        .eq("company_id", company_id)
        .single()

      if (fetchProductError) {
        console.error("Error fetching product for stock reversal:", fetchProductError)
        return NextResponse.json(
          { error: "Movement deleted, but failed to fetch product for stock reversal." },
          { status: 500 },
        )
      }

      let newStock = productData.current_stock
      if (movement_type === "entrada") {
        newStock -= quantity // Subtract quantity if it was an entry
      } else if (movement_type === "salida") {
        newStock += quantity // Add quantity back if it was an exit
      } else if (movement_type === "ajuste") {
        newStock -= quantity // If quantity was positive (increase), subtract. If negative (decrease), add.
      }

      const { error: updateProductError } = await supabase
        .from("internal_products")
        .update({ current_stock: newStock, updated_at: new Date().toISOString() })
        .eq("id", product_id)
        .eq("company_id", company_id)

      if (updateProductError) {
        console.error("Error updating product stock after deletion (non-serialized):", updateProductError)
        return NextResponse.json({ error: "Movement deleted, but failed to update product stock." }, { status: 500 })
      }
    }

    return NextResponse.json({ message: "Movement deleted successfully" }, { status: 200 })
  } catch (error: any) {
    console.error("Unhandled error in DELETE /api/internal-inventory-movements:", error)
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 })
  }
}
