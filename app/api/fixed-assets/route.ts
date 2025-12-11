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

function generateSerialNumber(productCode: string, correlative: number): string {
  // Format: PRODUCTCODE-S0001 (serial number only, asset code goes in description)
  return `${productCode}-S${String(correlative).padStart(4, "0")}`
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient()
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get("companyId")
    const accountId = searchParams.get("accountId")
    const status = searchParams.get("status")
    const year = searchParams.get("year")

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

    let query = supabase
      .from("fixed_assets")
      .select(`
        *,
        fixed_asset_accounts (
          id,
          code,
          name,
          depreciation_rate
        ),
        departments (
          id,
          name
        ),
        depreciation_records (
          id,
          year,
          month,
          depreciation_amount,
          accumulated_depreciation,
          closing_balance
        ),
        internal_products (
          id,
          name,
          code,
          current_stock
        )
      `)
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })

    if (accountId && accountId !== "all") {
      query = query.eq("account_id", accountId)
    }

    if (status && status !== "all") {
      query = query.eq("status", status)
    }

    const { data: assets, error } = await query

    if (error) {
      console.error("Error fetching fixed assets:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Filtrar registros de depreciación por año si se especifica
    const filteredAssets = assets?.map((asset) => {
      if (year && asset.depreciation_records) {
        asset.depreciation_records = asset.depreciation_records.filter(
          (record: any) => record.year === Number.parseInt(year),
        )
      }
      return asset
    })

    return NextResponse.json(filteredAssets || [])
  } catch (error: any) {
    console.error("Unexpected error in GET /api/fixed-assets:", error)
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
      account_id,
      acquisition_date,
      invoice_number,
      supplier_ruc,
      supplier_name,
      acquisition_cost,
      initial_balance,
      purchases,
      salvage_value,
      depreciation_rate,
      depreciation_method,
      current_location,
      assigned_department_id,
      company_id,
      quantity,
      category_id,
      create_inventory_product,
      unit_of_measure,
    } = body

    if (!name || !account_id || !acquisition_date || !company_id) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 })
    }

    // Obtener código de cuenta para generar código del activo
    const { data: accountData, error: accountError } = await supabase
      .from("fixed_asset_accounts")
      .select("code, depreciation_rate, depreciation_calculation_method")
      .eq("id", account_id)
      .single()

    if (accountError || !accountData) {
      return NextResponse.json({ error: "Cuenta contable no encontrada" }, { status: 404 })
    }

    // Generar código único para el activo
    const currentYear = new Date().getFullYear()
    const { count, error: countError } = await supabase
      .from("fixed_assets")
      .select("id", { count: "exact", head: true })
      .eq("company_id", company_id)
      .eq("account_id", account_id)

    const correlative = (count || 0) + 1
    const assetCode = `AF-${accountData.code}-${currentYear}-${String(correlative).padStart(4, "0")}`

    // Calcular valor en libros inicial
    const totalCost =
      (Number.parseFloat(initial_balance) || 0) +
      (Number.parseFloat(purchases) || 0) +
      (Number.parseFloat(acquisition_cost) || 0)
    const bookValue = totalCost - (Number.parseFloat(salvage_value) || 0)

    let internalProductId: string | null = null
    const createdSerialIds: string[] = []
    const generatedSerialNumbers: string[] = []
    const assetQuantity = Number.parseInt(quantity) || 1

    if (create_inventory_product && category_id) {
      // Obtener código de la empresa
      const { data: companyData, error: companyError } = await supabase
        .from("companies")
        .select("code")
        .eq("id", company_id)
        .single()

      if (companyError || !companyData?.code) {
        return NextResponse.json({ error: "No se pudo obtener el código de la empresa" }, { status: 500 })
      }

      // Obtener nombre de categoría
      const { data: categoryData, error: categoryError } = await supabase
        .from("internal_product_categories")
        .select("name")
        .eq("id", category_id)
        .single()

      if (categoryError || !categoryData?.name) {
        return NextResponse.json({ error: "No se pudo obtener la categoría" }, { status: 500 })
      }

      const categoryAbbr = categoryData.name
        .substring(0, 3)
        .toUpperCase()
        .replace(/[^A-Z]/g, "")
        .padEnd(3, "X")

      // Generar código del producto
      const codePattern = `${companyData.code}-${categoryAbbr}-${currentYear}-%`
      const { data: latestProduct } = await supabase
        .from("internal_products")
        .select("code")
        .eq("company_id", company_id)
        .like("code", codePattern)
        .order("code", { ascending: false })
        .limit(1)
        .single()

      let nextProductNumber = 1
      if (latestProduct?.code) {
        const parts = latestProduct.code.split("-")
        const lastNumber = Number.parseInt(parts[parts.length - 1], 10)
        if (!isNaN(lastNumber)) nextProductNumber = lastNumber + 1
      }

      const productCode = `${companyData.code}${categoryAbbr}${currentYear}${String(nextProductNumber).padStart(3, "0")}`
      const productQrCodeHash = crypto.randomBytes(16).toString("hex")

      // Calcular costo unitario
      const unitCost = totalCost / assetQuantity

      // Create internal product with original description only
      const { data: newProduct, error: productError } = await supabase
        .from("internal_products")
        .insert({
          name: `${name} (Activo Fijo)`,
          description: description || "", // Only original description, no asset info
          code: productCode,
          category_id,
          current_stock: assetQuantity,
          minimum_stock: 0,
          unit_of_measure: unit_of_measure || "unidad",
          cost_price: unitCost,
          location: current_location,
          company_id,
          created_by: user.id,
          is_active: true,
          is_serialized: true,
          qr_code_hash: productQrCodeHash,
        })
        .select()
        .single()

      if (productError) {
        console.error("Error creating internal product:", productError)
        return NextResponse.json({ error: `Error al crear producto interno: ${productError.message}` }, { status: 500 })
      }

      internalProductId = newProduct.id

      const { data: newAsset, error: insertError } = await supabase
        .from("fixed_assets")
        .insert({
          name,
          description,
          code: assetCode,
          account_id,
          acquisition_date,
          invoice_number,
          supplier_ruc,
          supplier_name,
          acquisition_cost: totalCost,
          initial_balance: Number.parseFloat(initial_balance) || 0,
          purchases: Number.parseFloat(purchases) || 0,
          salvage_value: Number.parseFloat(salvage_value) || 0,
          depreciation_rate: depreciation_rate || accountData.depreciation_rate,
          depreciation_method: depreciation_method || "linear",
          accumulated_depreciation: 0,
          book_value: bookValue,
          status: "active",
          current_location,
          assigned_department_id,
          company_id,
          created_by: user.id,
          internal_product_id: internalProductId,
          quantity: assetQuantity,
        })
        .select()
        .single()

      if (insertError) {
        // Rollback: delete the product if asset creation fails
        if (internalProductId) {
          await supabase.from("internal_products").delete().eq("id", internalProductId)
        }
        console.error("Error creating fixed asset:", insertError)
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }

      for (let i = 0; i < assetQuantity; i++) {
        const serialNumber = generateSerialNumber(productCode, i + 1)
        const serialQrCodeHash = crypto.randomBytes(16).toString("hex")

        const { data: newSerial, error: serialError } = await supabase
          .from("internal_product_serials")
          .insert({
            product_id: internalProductId,
            serial_number: serialNumber,
            status: "in_stock",
            current_location: current_location || "Almacén Principal",
            company_id,
            created_by: user.id,
            qr_code_hash: serialQrCodeHash,
            condition: "nuevo",
            fixed_asset_id: newAsset.id,
          })
          .select()
          .single()

        if (serialError) {
          console.error(`Error creating serial ${i + 1}:`, serialError)
        } else {
          createdSerialIds.push(newSerial.id)
          generatedSerialNumbers.push(serialNumber)
        }
      }

      const movementNotes = [
        `══════════════════════════════════`,
        `ENTRADA POR COMPRA DE ACTIVO FIJO`,
        `══════════════════════════════════`,
        `Código Activo: ${assetCode}`,
        `Factura: ${invoice_number || "N/A"}`,
        `Proveedor: ${supplier_name || "N/A"}`,
        `RUC Proveedor: ${supplier_ruc || "N/A"}`,
        `Fecha de Adquisición: ${acquisition_date}`,
        `Costo Total: S/ ${totalCost.toFixed(2)}`,
        `Costo Unitario: S/ ${unitCost.toFixed(2)}`,
        `Cantidad: ${assetQuantity} unidad(es)`,
        `══════════════════════════════════`,
        `---SERIALES_GENERADOS---`,
        generatedSerialNumbers.join(", "),
        `---FIN_SERIALES---`,
      ].join("\n")

      await supabase.from("internal_inventory_movements").insert({
        product_id: internalProductId,
        movement_type: "entrada",
        quantity: assetQuantity,
        cost_price: unitCost,
        total_amount: totalCost,
        reason: "compra_activo_fijo",
        notes: movementNotes,
        supplier: supplier_name,
        movement_date: acquisition_date,
        company_id,
        serial_id: null,
        created_by: user.id,
      })

      return NextResponse.json({
        success: true,
        asset: newAsset,
        product: newProduct,
        serials: generatedSerialNumbers,
        message: `Activo fijo creado con ${assetQuantity} unidades en inventario`,
      })
    }

    // If not creating inventory product, just create the fixed asset
    const { data: newAsset, error: insertError } = await supabase
      .from("fixed_assets")
      .insert({
        name,
        description,
        code: assetCode,
        account_id,
        acquisition_date,
        invoice_number,
        supplier_ruc,
        supplier_name,
        acquisition_cost: totalCost,
        initial_balance: Number.parseFloat(initial_balance) || 0,
        purchases: Number.parseFloat(purchases) || 0,
        salvage_value: Number.parseFloat(salvage_value) || 0,
        depreciation_rate: depreciation_rate || accountData.depreciation_rate,
        depreciation_method: depreciation_method || "linear",
        accumulated_depreciation: 0,
        book_value: bookValue,
        status: "active",
        current_location,
        assigned_department_id,
        company_id,
        created_by: user.id,
        quantity: assetQuantity,
      })
      .select()
      .single()

    if (insertError) {
      console.error("Error creating fixed asset:", insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, asset: newAsset })
  } catch (error: any) {
    console.error("Unexpected error in POST /api/fixed-assets:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
