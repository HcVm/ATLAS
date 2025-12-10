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

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await getSupabaseServerClient()
    const { id } = await params

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { data: asset, error } = await supabase
      .from("fixed_assets")
      .select(`
        *,
        fixed_asset_accounts (
          id,
          code,
          name,
          depreciation_rate,
          useful_life_years
        ),
        departments (
          id,
          name
        ),
        depreciation_records (
          id,
          year,
          month,
          opening_balance,
          depreciation_amount,
          accumulated_depreciation,
          closing_balance,
          calculated_at
        )
      `)
      .eq("id", id)
      .single()

    if (error) {
      console.error("Error fetching fixed asset:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(asset)
  } catch (error: any) {
    console.error("Unexpected error in GET /api/fixed-assets/[id]:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await getSupabaseServerClient()
    const { id } = await params

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const body = await request.json()

    const { data: updatedAsset, error: updateError } = await supabase
      .from("fixed_assets")
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()

    if (updateError) {
      console.error("Error updating fixed asset:", updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, asset: updatedAsset })
  } catch (error: any) {
    console.error("Unexpected error in PUT /api/fixed-assets/[id]:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await getSupabaseServerClient()
    const { id } = await params

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { error: deleteError } = await supabase.from("fixed_assets").delete().eq("id", id)

    if (deleteError) {
      console.error("Error deleting fixed asset:", deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "Activo fijo eliminado correctamente" })
  } catch (error: any) {
    console.error("Unexpected error in DELETE /api/fixed-assets/[id]:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
