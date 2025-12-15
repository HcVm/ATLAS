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
    const { name, category_id, company_id } = body

    if (!name || !category_id || !company_id) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 })
    }

    // Search for similar products by name and category
    const { data: similarProducts, error } = await supabase
      .from("internal_products")
      .select(`
        id,
        name,
        code,
        cost_price,
        current_stock,
        category_id,
        master_product_name,
        variant_description,
        created_at,
        internal_product_categories (
          id,
          name,
          color
        )
      `)
      .eq("company_id", company_id)
      .eq("category_id", category_id)
      .eq("is_active", true)
      .ilike("name", `%${name.trim()}%`)
      .order("created_at", { ascending: false })
      .limit(10)

    if (error) {
      console.error("Error searching similar products:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // For each similar product, get price history
    const productsWithHistory = await Promise.all(
      (similarProducts || []).map(async (product) => {
        const { data: priceHistory, error: historyError } = await supabase
          .from("internal_product_price_history")
          .select("*")
          .eq("product_id", product.id)
          .order("effective_date", { ascending: false })
          .limit(5)

        return {
          ...product,
          price_history: historyError ? [] : priceHistory,
        }
      }),
    )

    return NextResponse.json({
      similar_products: productsWithHistory,
      found_count: productsWithHistory.length,
    })
  } catch (error: any) {
    console.error("Unexpected error in POST /api/internal-products/find-similar:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
