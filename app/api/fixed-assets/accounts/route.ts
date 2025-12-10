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
    const companyId = searchParams.get("companyId")

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    if (!companyId) {
      return NextResponse.json({ error: "Company ID requerido" }, { status: 400 })
    }

    const { data: accounts, error } = await supabase
      .from("fixed_asset_accounts")
      .select("*")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .order("code")

    if (error) {
      console.error("Error fetching fixed asset accounts:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(accounts || [])
  } catch (error: any) {
    console.error("Unexpected error in GET /api/fixed-assets/accounts:", error)
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
    const { code, name, description, depreciation_rate, useful_life_years, company_id } = body

    if (!code || !name || !company_id) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 })
    }

    const { data: newAccount, error: insertError } = await supabase
      .from("fixed_asset_accounts")
      .insert({
        code,
        name,
        description,
        depreciation_rate: depreciation_rate || 10.0,
        useful_life_years: useful_life_years || 10,
        company_id,
      })
      .select()
      .single()

    if (insertError) {
      console.error("Error creating fixed asset account:", insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, account: newAccount })
  } catch (error: any) {
    console.error("Unexpected error in POST /api/fixed-assets/accounts:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
