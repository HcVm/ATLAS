import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import crypto from "crypto"

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
    const { name, description, category_id, minimum_stock, unit_of_measure, cost_price, location, company_id } = body

    if (
      !name ||
      !company_id ||
      cost_price === undefined ||
      category_id === undefined ||
      unit_of_measure === undefined
    ) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 })
    }

    const { data: existingProductByName, error: existingNameError } = await supabase
      .from("internal_products")
      .select("id, name")
      .eq("company_id", company_id)
      .ilike("name", name.trim())
      .single()

    if (existingNameError && existingNameError.code !== "PGRST116") {
      console.error("Error checking existing product by name:", existingNameError)
      throw existingNameError
    }

    if (existingProductByName) {
      return NextResponse.json(
        { error: "Este producto ya existe. Por favor, usa un nombre diferente." },
        { status: 409 },
      )
    }

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

    const { data: categoryData, error: categoryError } = await supabase
      .from("internal_product_categories")
      .select("name")
      .eq("id", category_id)
      .single()

    if (categoryError || !categoryData?.name) {
      console.error("Error fetching category:", categoryError)
      return NextResponse.json({ error: "No se pudo obtener la categoría del producto." }, { status: 500 })
    }

    const categoryAbbr = categoryData.name
      .substring(0, 3)
      .toUpperCase()
      .replace(/[^A-Z]/g, "") // Remove non-alphabetic characters
      .padEnd(3, "X") // Pad with X if less than 3 characters

    const currentYear = new Date().getFullYear()

    const codePattern = `${companyCode}-${categoryAbbr}-${currentYear}-%`

    const { data: latestProduct, error: latestProductError } = await supabase
      .from("internal_products")
      .select("code")
      .eq("company_id", company_id)
      .like("code", codePattern)
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

    const generatedCode = `${companyCode}-${categoryAbbr}-${currentYear}-${String(nextNumber).padStart(3, "0")}`

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

    const qrCodeHash = crypto.randomBytes(16).toString("hex")

    const { data: newProduct, error: productError } = await supabase
      .from("internal_products")
      .insert({
        name,
        description,
        code: generatedCode,
        category_id: category_id,
        current_stock: 0,
        minimum_stock: minimum_stock || 0,
        unit_of_measure: unit_of_measure,
        cost_price,
        location,
        company_id,
        created_by: user.id,
        is_active: true,
        is_serialized: true,
        qr_code_hash: qrCodeHash,
      })
      .select()
      .single()

    if (productError) {
      console.error("Error creating product:", productError)
      return NextResponse.json({ error: productError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, product: newProduct })
  } catch (error: any) {
    console.error("Unexpected error in POST /api/internal-products:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
