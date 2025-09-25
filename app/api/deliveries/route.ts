import { NextResponse } from "next/server"
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

export async function GET() {
  try {
    const supabase = await getSupabaseServerClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data, error } = await supabase
      .from("deliveries")
      .select(`
        *,
        sale:sales(
          id, sale_number, sale_date, entity_name, entity_ruc, quotation_code,
          total_sale, sale_status, ocam, company_id, is_multi_product, items_count,
          profiles!sales_created_by_fkey(full_name, email),
          sale_items(product_name, product_brand, product_description, quantity)
        ),
        assigned_user:profiles!deliveries_assigned_to_fkey(full_name, email)
      `)
      .order("created_at", { ascending: false })

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching deliveries:", error)
    return NextResponse.json({ error: "Error fetching deliveries" }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await getSupabaseServerClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verificar permisos de supervisor/admin
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

    if (!profile || !["admin", "supervisor"].includes(profile.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    const { id, ...updateData } = await request.json()

    const { data, error } = await supabase
      .from("deliveries")
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error updating delivery:", error)
    return NextResponse.json({ error: "Error updating delivery" }, { status: 500 })
  }
}
