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

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

function getDaysInYear(year: number): number {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 366 : 365
}

function getDepreciableDaysInMonth(
  acquisitionDate: Date,
  year: number,
  month: number,
): { days: number; isFirstMonth: boolean; totalDaysInMonth: number } {
  const totalDaysInMonth = getDaysInMonth(year, month)
  const acqYear = acquisitionDate.getFullYear()
  const acqMonth = acquisitionDate.getMonth() + 1 // getMonth() es 0-indexed
  const acqDay = acquisitionDate.getDate()

  // Si el año/mes de adquisición es el mismo que el período, calcular días restantes
  if (acqYear === year && acqMonth === month) {
    // Días desde el día de adquisición hasta fin de mes (incluyendo el día de adquisición)
    const daysRemaining = totalDaysInMonth - acqDay + 1
    return { days: daysRemaining, isFirstMonth: true, totalDaysInMonth }
  }

  // Si no es el primer mes, usar todos los días del mes
  return { days: totalDaysInMonth, isFirstMonth: false, totalDaysInMonth }
}

function shouldDepreciateInPeriod(acquisitionDate: Date, year: number, month: number): boolean {
  const periodStart = new Date(year, month - 1, 1) // Primer día del mes del período
  const periodEnd = new Date(year, month, 0) // Último día del mes del período

  // El activo debe haberse adquirido antes o durante el período
  // (no después del último día del mes del período)
  return acquisitionDate <= periodEnd
}

// Calcular depreciación para un período específico
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
    const { company_id, year, month, asset_ids, calculation_method, account_id } = body

    if (!company_id || !year || !month) {
      return NextResponse.json({ error: "Faltan campos requeridos (company_id, year, month)" }, { status: 400 })
    }

    // Obtener activos a procesar con información de cuenta
    let assetsQuery = supabase
      .from("fixed_assets")
      .select(`
        *,
        fixed_asset_accounts (
          depreciation_calculation_method
        )
      `)
      .eq("company_id", company_id)
      .eq("status", "active")

    if (asset_ids && asset_ids.length > 0) {
      assetsQuery = assetsQuery.in("id", asset_ids)
    }

    if (account_id) {
      assetsQuery = assetsQuery.eq("account_id", account_id)
    }

    const { data: assets, error: assetsError } = await assetsQuery

    if (assetsError) {
      console.error("Error fetching assets:", assetsError)
      return NextResponse.json({ error: assetsError.message }, { status: 500 })
    }

    if (!assets || assets.length === 0) {
      return NextResponse.json({ error: "No hay activos para procesar" }, { status: 404 })
    }

    const results: any[] = []
    const errors: any[] = []
    const skipped: any[] = []

    const daysInMonth = getDaysInMonth(year, month)
    const daysInYear = getDaysInYear(year)

    for (const asset of assets) {
      try {
        const acquisitionDate = new Date(asset.acquisition_date)

        if (!shouldDepreciateInPeriod(acquisitionDate, year, month)) {
          skipped.push({
            asset_id: asset.id,
            asset_name: asset.name,
            reason: `Adquirido el ${acquisitionDate.toLocaleDateString("es-PE")} - posterior al período seleccionado`,
          })
          continue
        }

        // Verificar si ya existe registro para este período
        const { data: existingRecord } = await supabase
          .from("depreciation_records")
          .select("id")
          .eq("fixed_asset_id", asset.id)
          .eq("year", year)
          .eq("month", month)
          .single()

        if (existingRecord) {
          errors.push({ asset_id: asset.id, asset_name: asset.name, error: "Ya existe registro para este período" })
          continue
        }

        // Obtener el último registro de depreciación
        const { data: lastRecord } = await supabase
          .from("depreciation_records")
          .select("*")
          .eq("fixed_asset_id", asset.id)
          .order("year", { ascending: false })
          .order("month", { ascending: false })
          .limit(1)
          .single()

        // Calcular depreciación
        const depreciableBase = asset.acquisition_cost - (asset.salvage_value || 0)
        const annualDepreciation = depreciableBase * (asset.depreciation_rate / 100)

        const methodToUse =
          calculation_method || asset.fixed_asset_accounts?.depreciation_calculation_method || "monthly"

        let monthlyDepreciation: number
        let actualDaysUsed: number = daysInMonth
        let isFirstMonth = false

        if (methodToUse === "daily") {
          const depreciableDaysInfo = getDepreciableDaysInMonth(acquisitionDate, year, month)
          actualDaysUsed = depreciableDaysInfo.days
          isFirstMonth = depreciableDaysInfo.isFirstMonth

          // Daily method: annual depreciation / days in year * actual depreciable days
          const dailyDepreciation = annualDepreciation / daysInYear
          monthlyDepreciation = Math.round(dailyDepreciation * actualDaysUsed * 100) / 100
        } else {
          const depreciableDaysInfo = getDepreciableDaysInMonth(acquisitionDate, year, month)
          isFirstMonth = depreciableDaysInfo.isFirstMonth
          actualDaysUsed = depreciableDaysInfo.days

          if (isFirstMonth) {
            // Proporcionar la depreciación mensual según los días del primer mes
            const fullMonthlyDepreciation = annualDepreciation / 12
            monthlyDepreciation =
              Math.round(((fullMonthlyDepreciation * actualDaysUsed) / depreciableDaysInfo.totalDaysInMonth) * 100) /
              100
          } else {
            // Monthly method: annual depreciation / 12
            monthlyDepreciation = Math.round((annualDepreciation / 12) * 100) / 100
          }
        }

        // Determinar saldos
        const previousAccumulated = lastRecord ? lastRecord.accumulated_depreciation : 0
        const openingBalance = lastRecord ? lastRecord.closing_balance : asset.book_value

        // Verificar que no se deprecie más del valor depreciable
        const maxDepreciation = Math.max(0, depreciableBase - previousAccumulated)
        const actualDepreciation = Math.min(monthlyDepreciation, maxDepreciation)

        const newAccumulated = previousAccumulated + actualDepreciation
        const closingBalance = asset.acquisition_cost - newAccumulated

        const noteText = isFirstMonth
          ? `Método: ${methodToUse === "daily" ? "Diario" : "Mensual"} - Primer mes: ${actualDaysUsed}/${getDaysInMonth(year, month)} días (desde ${acquisitionDate.toLocaleDateString("es-PE")})`
          : `Método: ${methodToUse === "daily" ? `Diario (${actualDaysUsed} días)` : "Mensual (/12)"}`

        // Insertar registro de depreciación
        const { data: newRecord, error: insertError } = await supabase
          .from("depreciation_records")
          .insert({
            fixed_asset_id: asset.id,
            year,
            month,
            opening_balance: openingBalance,
            depreciation_amount: actualDepreciation,
            accumulated_depreciation: newAccumulated,
            closing_balance: closingBalance,
            company_id,
            calculated_by: user.id,
            notes: noteText,
          })
          .select()
          .single()

        if (insertError) {
          errors.push({ asset_id: asset.id, asset_name: asset.name, error: insertError.message })
          continue
        }

        // Actualizar el activo con los nuevos valores
        await supabase
          .from("fixed_assets")
          .update({
            accumulated_depreciation: newAccumulated,
            book_value: closingBalance,
          })
          .eq("id", asset.id)

        results.push({
          asset_id: asset.id,
          asset_name: asset.name,
          calculation_method: methodToUse,
          days_in_month: actualDaysUsed,
          total_days_in_month: daysInMonth,
          is_first_month: isFirstMonth,
          acquisition_date: asset.acquisition_date,
          depreciation_amount: actualDepreciation,
          accumulated_depreciation: newAccumulated,
          closing_balance: closingBalance,
        })
      } catch (err: any) {
        errors.push({ asset_id: asset.id, asset_name: asset.name, error: err.message })
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      errors: errors.length,
      skipped: skipped.length,
      calculation_info: {
        year,
        month,
        days_in_month: daysInMonth,
        days_in_year: daysInYear,
        account_filter: account_id || "all",
      },
      results,
      errorDetails: errors,
      skippedDetails: skipped,
    })
  } catch (error: any) {
    console.error("Unexpected error in POST /api/fixed-assets/depreciation:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

// Obtener reporte de depreciación
export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient()
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get("companyId")
    const year = searchParams.get("year")
    const accountId = searchParams.get("accountId")

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
      .from("depreciation_records")
      .select(`
        *,
        fixed_assets (
          id,
          name,
          code,
          acquisition_cost,
          depreciation_rate,
          account_id,
          fixed_asset_accounts (
            id,
            code,
            name
          )
        )
      `)
      .eq("company_id", companyId)
      .order("year", { ascending: false })
      .order("month", { ascending: false })

    if (year) {
      query = query.eq("year", Number.parseInt(year))
    }

    const { data: records, error } = await query

    if (error) {
      console.error("Error fetching depreciation records:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    let filteredRecords = records || []
    if (accountId && accountId !== "all") {
      filteredRecords = filteredRecords.filter((record: any) => record.fixed_assets?.account_id === accountId)
    }

    return NextResponse.json(filteredRecords)
  } catch (error: any) {
    console.error("Unexpected error in GET /api/fixed-assets/depreciation:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
