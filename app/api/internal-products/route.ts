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

    const { data: products, error } = await supabase
      .from("internal_products")
      .select("id, name, code, current_stock, minimum_stock, unit_of_measure, cost_price, is_active, is_serialized")
      .eq("company_id", user.company_id)
      .order("name")

    if (error) {
      console.error("Error fetching internal products:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const productsWithAggregatedStock = await Promise.all(
      (products || []).map(async (product) => {
        if (product.is_serialized) {
          const { count, error: serialCountError } = await supabase
            .from("internal_product_serials")
            .select("id", { count: "exact", head: true })
            .eq("product_id", product.id)
            .eq("status", "in_stock")
            .eq("company_id", user.company_id)

          if (serialCountError) {
            console.error(`Error fetching serial count for product ${product.id}:`, serialCountError)
            return { ...product, current_stock: 0 }
          }
          return { ...product, current_stock: count || 0 }
        }
        return product
      }),
    )

    return NextResponse.json(productsWithAggregatedStock)
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

    const body = await request.json()
    const {
      name,
      description,
      category_id, // This is now expected to be a string (UUID)
      minimum_stock,
      unit_of_measure,
      cost_price,
      location,
      company_id,
      is_serialized,
      serial_numbers,
      current_stock, // This is the initial_stock from the client
    } = body

    if (
      !name ||
      !company_id ||
      cost_price === undefined ||
      category_id === undefined ||
      unit_of_measure === undefined
    ) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 })
    }

    if (is_serialized && (!serial_numbers || serial_numbers.length === 0)) {
      return NextResponse.json({ error: "Se requieren números de serie para productos serializados" }, { status: 400 })
    }

    // --- Server-side code generation ---
    const { data: companyData, error: companyError } = await supabase
      .from("companies")
      .select("code")
      .eq("id", company_id)
      .single()

    if (companyError || !companyData?.code) {
      console.error("Error fetching company code:", companyError)
      return NextResponse.json({ error: "No se pudo obtener el código de la empresa." }, { status: 500 })
    }
    const companyCode = companyData.code

    const { data: latestProduct, error: latestProductError } = await supabase
      .from("internal_products")
      .select("code")
      .eq("company_id", company_id)
      .like("code", `INT-${companyCode}-%`)
      .order("code", { ascending: false })
      .limit(1)
      .single()

    let nextNumber = 1
    if (latestProduct && latestProduct.code) {
      const parts = latestProduct.code.split("-")
      const lastNumberStr = parts[parts.length - 1]
      const lastNumber = Number.parseInt(lastNumberStr, 10)
      if (!isNaN(lastNumber)) {
        nextNumber = lastNumber + 1
      }
    }

    const generatedCode = `INT-${companyCode}-${String(nextNumber).padStart(3, "0")}`

    const { data: existingProduct, error: existingProductError } = await supabase
      .from("internal_products")
      .select("id")
      .eq("code", generatedCode)
      .eq("company_id", company_id)
      .single()

    if (existingProductError && existingProductError.code !== "PGRST116") {
      console.error("Error checking existing product:", existingProductError)
      throw existingProductError
    }

    if (existingProduct) {
      return NextResponse.json(
        { error: "Ya existe un producto con este código generado. Intente de nuevo." },
        { status: 409 },
      )
    }
    // --- End server-side code generation ---

    const { data: newProduct, error: productError } = await supabase
      .from("internal_products")
      .insert({
        name,
        description,
        code: generatedCode,
        category_id: category_id, // Pass as string (UUID)
        current_stock: current_stock,
        minimum_stock: is_serialized ? 0 : minimum_stock,
        unit_of_measure: is_serialized ? "unidad" : unit_of_measure,
        cost_price,
        location,
        company_id,
        created_by: user.id,
        is_active: true,
        is_serialized,
      })
      .select()
      .single()

    if (productError) {
      console.error("Error creating product:", productError)
      return NextResponse.json({ error: productError.message }, { status: 500 })
    }

    if (is_serialized && newProduct) {
      const serialsToInsert = serial_numbers.map((serialNum: string) => ({
        product_id: newProduct.id,
        serial_number: serialNum,
        status: "in_stock",
        current_location: location || null,
        company_id: company_id,
        created_by: user.id,
        qr_code_hash: uuidv4(),
      }))

      const { error: serialsError } = await supabase.from("internal_product_serials").insert(serialsToInsert)

      if (serialsError) {
        console.error("Error inserting serial numbers:", serialsError)
        return NextResponse.json(
          { error: "Producto creado, pero error al registrar números de serie." },
          { status: 500 },
        )
      }

      const movementPromises = serialsToInsert.map(async (serial) => {
        const { data: insertedSerial, error: fetchSerialError } = await supabase
          .from("internal_product_serials")
          .select("id")
          .eq("product_id", newProduct.id)
          .eq("serial_number", serial.serial_number)
          .single()

        if (fetchSerialError || !insertedSerial) {
          console.error(`Error fetching inserted serial ${serial.serial_number}:`, fetchSerialError)
          return
        }

        const { error: movementError } = await supabase.from("internal_inventory_movements").insert({
          product_id: newProduct.id,
          serial_id: insertedSerial.id,
          movement_type: "entrada",
          quantity: 1,
          cost_price: newProduct.cost_price,
          total_amount: newProduct.cost_price,
          reason: "Ingreso inicial por creación de producto serializado",
          notes: `Número de serie: ${serial.serial_number}`,
          requested_by: user.email,
          company_id: company_id,
          created_by: user.id,
          movement_date: new Date().toISOString(),
          supplier: "Creación de Producto",
        })
        if (movementError) {
          console.error(`Error creating initial movement for serial ${serial.serial_number}:`, movementError)
        }
      })
      await Promise.all(movementPromises)
    }

    return NextResponse.json({ success: true, product: newProduct })
  } catch (error: any) {
    console.error("Unexpected error in POST /api/internal-products:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
