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

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
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

    const { data: product, error } = await supabase
      .from("internal_products")
      .select(`
        *,
        internal_product_categories (
          id,
          name,
          color
        )
      `)
      .eq("id", params.id)
      .eq("company_id", profile.company_id)
      .single()

    if (error) {
      console.error("Error fetching product:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!product) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 })
    }

    return NextResponse.json({ product })
  } catch (error: any) {
    console.error("Unexpected error in GET /api/internal-products/[id]:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
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
    const { name, description, category_id, unit_of_measure, minimum_stock, cost_price, location, is_active } = body

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

    if (parsedMinimumStock < 0) {
      return NextResponse.json({ error: "Stock mínimo no puede ser negativo" }, { status: 400 })
    }

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

    // Update product
    const { data: updatedProduct, error: updateError } = await supabase
      .from("internal_products")
      .update({
        name: name.trim(),
        description: description?.trim() || null,
        category_id: category_id,
        unit_of_measure: unit_of_measure || "unidad",
        minimum_stock: parsedMinimumStock,
        cost_price: parsedCostPrice,
        location: location?.trim() || null,
        is_active: is_active !== undefined ? is_active : true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.id)
      .eq("company_id", profile.company_id)
      .select()
      .single()

    if (updateError) {
      console.error("Error updating product:", updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    if (!updatedProduct) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 })
    }

    return NextResponse.json({ success: true, product: updatedProduct })
  } catch (error: any) {
    console.error("Unexpected error in PUT /api/internal-products/[id]:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
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

    // Check if product has movements
    const { data: movements } = await supabase
      .from("internal_inventory_movements")
      .select("id")
      .eq("product_id", params.id)
      .limit(1)

    if (movements && movements.length > 0) {
      return NextResponse.json(
        { error: "No se puede eliminar el producto porque tiene movimientos de inventario asociados" },
        { status: 400 },
      )
    }

    // Delete product
    const { error: deleteError } = await supabase
      .from("internal_products")
      .delete()
      .eq("id", params.id)
      .eq("company_id", profile.company_id)

    if (deleteError) {
      console.error("Error deleting product:", deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Unexpected error in DELETE /api/internal-products/[id]:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
