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
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get("productId")
    const companyId = searchParams.get("companyId")

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    if (!productId || !companyId) {
      return NextResponse.json({ error: "Product ID y Company ID requeridos" }, { status: 400 })
    }

    const { data: priceHistory, error } = await supabase
      .from("internal_product_price_history")
      .select(`
        *,
        fixed_assets (
          id,
          code,
          name
        )
      `)
      .eq("product_id", productId)
      .eq("company_id", companyId)
      .order("effective_date", { ascending: false })

    if (error) {
      console.error("Error fetching price history:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Calculate weighted average cost
    const totalQuantity = priceHistory?.reduce((sum, record) => sum + (record.quantity || 0), 0) || 0
    const totalCost =
      priceHistory?.reduce((sum, record) => sum + (record.cost_price || 0) * (record.quantity || 0), 0) || 0
    const weightedAvgCost = totalQuantity > 0 ? totalCost / totalQuantity : 0

    return NextResponse.json({
      price_history: priceHistory || [],
      weighted_average_cost: weightedAvgCost,
      total_purchases: priceHistory?.length || 0,
      total_quantity: totalQuantity,
    })
  } catch (error: any) {
    console.error("Unexpected error in GET /api/internal-products/price-history:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
