import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { v4 as uuidv4 } from "uuid"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

async function getSupabaseServerClient() {
  const cookieStore = await cookies()

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get: (name) => cookieStore.get(name)?.value,
      set: () => {},
      remove: () => {},
    },
  })
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Get user profile to check company
    const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", user.id).single()

    if (!profile?.company_id) {
      return NextResponse.json({ error: "Usuario sin empresa asignada" }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get("category")
    const search = searchParams.get("search")
    const active = searchParams.get("active")

    let query = supabase
      .from("internal_products")
      .select(`
        *,
        internal_product_categories (
          id,
          name,
          color
        )
      `)
      .eq("company_id", profile.company_id)
      .order("created_at", { ascending: false })

    if (category && category !== "all") {
      query = query.eq("category_id", category)
    }

    if (search) {
      // Search by product model name/code/description
      query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%,description.ilike.%${search}%`)
      // If searching for serial numbers, we'd need a separate query or a join,
      // but for the main product list, we search models.
    }

    if (active === "true") {
      query = query.eq("is_active", true)
    } else if (active === "false") {
      query = query.eq("is_active", false)
    }

    const { data: products, error } = await query

    if (error) {
      console.error("Error fetching products:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // For serialized products, aggregate current_stock from internal_product_serials
    const productsWithAggregatedStock = await Promise.all(
      (products || []).map(async (product) => {
        if (product.is_serialized) {
          const { count, error: serialCountError } = await supabase
            .from("internal_product_serials")
            .select("id", { count: "exact", head: true })
            .eq("product_id", product.id)
            .eq("status", "in_stock") // Only count items currently in stock
            .eq("company_id", profile.company_id)

          if (serialCountError) {
            console.error(`Error fetching serial count for product ${product.id}:`, serialCountError)
            return { ...product, current_stock: 0 } // Default to 0 on error
          }
          return { ...product, current_stock: count || 0 }
        }
        return product
      }),
    )

    return NextResponse.json({ products: productsWithAggregatedStock || [] })
  } catch (error: any) {
    console.error("Unexpected error in GET /api/internal-products:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Get user profile to check company
    const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", user.id).single()

    if (!profile?.company_id) {
      return NextResponse.json({ error: "Usuario sin empresa asignada" }, { status: 403 })
    }

    const body = await request.json()
    const {
      name,
      description,
      category_id,
      unit_of_measure,
      minimum_stock,
      cost_price,
      location,
      initial_stock,
      code: modelCode, // This is the model code from the client
      is_serialized,
      serial_numbers, // Array of serial numbers for serialized products
    } = body

    // Validate required fields
    if (!name?.trim()) {
      return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 })
    }

    if (!category_id) {
      return NextResponse.json({ error: "La categoría es obligatoria" }, { status: 400 })
    }

    // Validate numeric fields
    const parsedCostPrice = Number.parseFloat(cost_price) || 0

    if (parsedCostPrice < 0) {
      return NextResponse.json({ error: "Costo unitario no puede ser negativo" }, { status: 400 })
    }

    // Verify category exists and belongs to company or is global
    const { data: categoryExists } = await supabase
      .from("internal_product_categories")
      .select("id")
      .eq("id", category_id)
      .or(`company_id.eq.${profile.company_id},company_id.is.null`)
      .single()

    if (!categoryExists) {
      return NextResponse.json({ error: "Categoría no válida" }, { status: 400 })
    }

    // Common data for the product model
    const productModelData = {
      code: modelCode,
      name: name.trim(),
      description: description?.trim() || null,
      category_id: category_id,
      unit_of_measure: unit_of_measure || "unidad",
      cost_price: parsedCostPrice,
      location: location?.trim() || null,
      is_active: true,
      company_id: profile.company_id,
      created_by: user.id,
      is_serialized: is_serialized,
      qr_code_hash: uuidv4(), // QR for the model
    }

    if (is_serialized) {
      if (!Array.isArray(serial_numbers) || serial_numbers.length === 0) {
        return NextResponse.json(
          { error: "Se requieren números de serie para productos serializados" },
          { status: 400 },
        )
      }

      // Check for duplicate serial numbers in the database for this company
      const { data: existingSerials, error: serialCheckError } = await supabase
        .from("internal_product_serials")
        .select("serial_number")
        .in("serial_number", serial_numbers)
        .eq("company_id", profile.company_id)

      if (serialCheckError) {
        console.error("Error checking existing serial numbers:", serialCheckError)
        return NextResponse.json({ error: "Error al verificar números de serie existentes" }, { status: 500 })
      }

      const duplicatedInDb = serial_numbers.filter((sn) =>
        existingSerials?.some((existing) => existing.serial_number === sn),
      )
      if (duplicatedInDb.length > 0) {
        return NextResponse.json(
          { error: `Los siguientes números de serie ya existen en el inventario: ${duplicatedInDb.join(", ")}` },
          { status: 409 },
        )
      }

      // Create the product model first (current_stock will be updated by serials)
      const { data: newProductModel, error: createModelError } = await supabase
        .from("internal_products")
        .insert({
          ...productModelData,
          current_stock: 0, // Initial stock for model is 0, will be updated by serials
          minimum_stock: 0, // Minimum stock for model is not directly applicable here
        })
        .select()
        .single()

      if (createModelError) {
        console.error("Error creating serialized product model:", createModelError)
        return NextResponse.json({ error: createModelError.message }, { status: 500 })
      }

      const serialsToInsert = serial_numbers.map((sn: string) => ({
        product_id: newProductModel.id,
        serial_number: sn,
        status: "in_stock",
        current_location: location?.trim() || null,
        company_id: profile.company_id,
        created_by: user.id,
        qr_code_hash: uuidv4(), // Unique QR for each serial
      }))

      const { data: newSerials, error: createSerialsError } = await supabase
        .from("internal_product_serials")
        .insert(serialsToInsert)
        .select()

      if (createSerialsError) {
        console.error("Error creating internal product serials:", createSerialsError)
        // Attempt to delete the product model if serials creation fails
        await supabase.from("internal_products").delete().eq("id", newProductModel.id)
        return NextResponse.json({ error: createSerialsError.message }, { status: 500 })
      }

      // Update the product model's current_stock based on the number of new serials
      const { error: updateStockError } = await supabase
        .from("internal_products")
        .update({ current_stock: newSerials?.length || 0 })
        .eq("id", newProductModel.id)

      if (updateStockError) {
        console.error("Error updating product model stock:", updateStockError)
        // Log error but don't block the main product creation
      }

      // Create an entry movement for each serialized product
      const movementsToInsert =
        newSerials?.map((serial) => ({
          product_id: newProductModel.id,
          serial_id: serial.id, // Link to the specific serial
          movement_type: "entrada",
          quantity: 1, // Always 1 for serialized movements
          cost_price: parsedCostPrice,
          total_amount: parsedCostPrice,
          reason: "Stock inicial (serializado)",
          notes: `Stock inicial del producto serializado ${newProductModel.name} (SN: ${serial.serial_number})`,
          requested_by: user.email || "Sistema",
          supplier: "Stock inicial",
          company_id: user.company_id,
          created_by: user.id,
        })) || []

      const { error: movementError } = await supabase.from("internal_inventory_movements").insert(movementsToInsert)

      if (movementError) {
        console.error("Error creating initial movements for serialized products:", movementError)
        // Log error but don't block the main product creation
      }

      return NextResponse.json({ success: true, product: newProductModel, serials: newSerials })
    } else {
      // Non-serialized product creation
      const parsedMinimumStock = Number.parseInt(minimum_stock) || 0
      const parsedInitialStock = Number.parseInt(initial_stock) || 0

      if (parsedMinimumStock < 0) {
        return NextResponse.json({ error: "Stock mínimo no puede ser negativo" }, { status: 400 })
      }

      if (parsedInitialStock < 0) {
        return NextResponse.json({ error: "Stock inicial no puede ser negativo" }, { status: 400 })
      }

      // For non-serialized products, the 'code' should be unique per company
      const { data: existingProductCode, error: checkCodeError } = await supabase
        .from("internal_products")
        .select("id")
        .eq("code", modelCode)
        .eq("company_id", profile.company_id)
        .eq("is_serialized", false) // Ensure we only check non-serialized products
        .maybeSingle()

      if (checkCodeError) {
        console.error("Error checking existing product code:", checkCodeError)
        return NextResponse.json({ error: "Error al verificar el código de producto existente" }, { status: 500 })
      }

      if (existingProductCode) {
        return NextResponse.json(
          { error: "Ya existe un producto no serializado con este código para esta empresa." },
          { status: 409 },
        )
      }

      const productData = {
        ...productModelData,
        current_stock: parsedInitialStock,
        minimum_stock: parsedMinimumStock,
      }

      const { data: newProduct, error: createError } = await supabase
        .from("internal_products")
        .insert([productData])
        .select()
        .single()

      if (createError) {
        console.error("Error creating non-serialized product:", createError)
        return NextResponse.json({ error: createError.message }, { status: 500 })
      }

      if (parsedInitialStock > 0) {
        const movementData = {
          product_id: newProduct.id,
          serial_id: null, // No serial for non-serialized
          movement_type: "entrada",
          quantity: parsedInitialStock,
          cost_price: parsedCostPrice,
          total_amount: parsedInitialStock * parsedCostPrice,
          reason: "Stock inicial",
          notes: `Stock inicial del producto ${name.trim()}`,
          requested_by: user.email || "Sistema",
          supplier: "Stock inicial",
          company_id: user.company_id,
          created_by: user.id,
        }

        const { error: movementError } = await supabase.from("internal_inventory_movements").insert(movementData)

        if (movementError) {
          console.error("Error creating initial movement:", movementError)
        }
      }

      return NextResponse.json({ success: true, product: newProduct })
    }
  } catch (error: any) {
    console.error("Unexpected error in POST /api/internal-products:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
