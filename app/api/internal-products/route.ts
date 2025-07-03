import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

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
      query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%,description.ilike.%${search}%`)
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

    return NextResponse.json({ products: products || [] })
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
    const { name, description, category_id, unit_of_measure, minimum_stock, cost_price, location, initial_stock } = body

    // Validate required fields
    if (!name?.trim()) {
      return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 })
    }

    if (!category_id) {
      return NextResponse.json({ error: "La categoría es obligatoria" }, { status: 400 })
    }

    // Validate numeric fields
    const parsedMinimumStock = Number.parseInt(minimum_stock) || 0
    const parsedCostPrice = Number.parseFloat(cost_price) || 0
    const parsedInitialStock = Number.parseInt(initial_stock) || 0

    if (parsedMinimumStock < 0) {
      return NextResponse.json({ error: "Stock mínimo no puede ser negativo" }, { status: 400 })
    }

    if (parsedCostPrice < 0) {
      return NextResponse.json({ error: "Costo unitario no puede ser negativo" }, { status: 400 })
    }

    if (parsedInitialStock < 0) {
      return NextResponse.json({ error: "Stock inicial no puede ser negativo" }, { status: 400 })
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

    // Create product
    const { data: newProduct, error: createError } = await supabase
      .from("internal_products")
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        category_id: Number.parseInt(category_id),
        unit_of_measure: unit_of_measure || "unidad",
        minimum_stock: parsedMinimumStock,
        cost_price: parsedCostPrice,
        location: location?.trim() || null,
        current_stock: parsedInitialStock,
        company_id: profile.company_id,
        created_by: user.id,
        is_active: true,
      })
      .select()
      .single()

    if (createError) {
      console.error("Error creating product:", createError)
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }

    // If there's initial stock, create an initial movement
    if (parsedInitialStock > 0) {
      const { error: movementError } = await supabase.from("internal_inventory_movements").insert({
        product_id: newProduct.id,
        movement_type: "entrada",
        quantity: parsedInitialStock,
        reason: "Stock inicial",
        requested_by: user.id,
        company_id: profile.company_id,
      })

      if (movementError) {
        console.error("Error creating initial movement:", movementError)
        // Don't fail the product creation, just log the error
      }
    }

    return NextResponse.json({ success: true, product: newProduct })
  } catch (error: any) {
    console.error("Unexpected error in POST /api/internal-products:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
