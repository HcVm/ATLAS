import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const type = searchParams.get("type") || "productos"
  const acuerdo = searchParams.get("acuerdo")
  const categoria = searchParams.get("categoria")
  const catalogo = searchParams.get("catalogo")
  const fechaInicio = searchParams.get("fechaInicio")
  const fechaFin = searchParams.get("fechaFin")
  const period = searchParams.get("period") || "6months"
  const limit = Number.parseInt(searchParams.get("limit") || "50")

  const supabase = createServerClient()

  console.log(`[Rankings API] Fetching: type=${type}, acuerdo=${acuerdo}, catalogo=${catalogo}, period=${period}`)

  try {
    const now = new Date()
    const startDate = new Date()

    switch (period) {
      case "3months":
        startDate.setMonth(now.getMonth() - 3)
        break
      case "1year":
        startDate.setFullYear(now.getFullYear() - 1)
        break
      default: // 6months
        startDate.setMonth(now.getMonth() - 6)
        break
    }

    const dateStart = fechaInicio || startDate.toISOString().split("T")[0]

    // Call the RPC function
    // Note: The RPC function name and parameters must match the database definition
    // Casting supabase to any to bypass type check for the new RPC function if types are not updated
    const { data: rankingsData, error } = await (supabase.rpc as any)("get_open_data_rankings", {
      p_type: type,
      p_limit: limit,
      p_date_start: dateStart,
      p_date_end: fechaFin || null,
      p_acuerdo: (acuerdo && acuerdo !== "all" && acuerdo.trim() !== "") ? acuerdo : null,
      p_categoria: (categoria && categoria !== "all" && categoria.trim() !== "") ? categoria : null,
      p_catalogo: (catalogo && catalogo !== "all" && catalogo.trim() !== "") ? catalogo : null
    })

    if (error) {
      console.error("Error fetching rankings data from RPC:", error)
      // Fallback or error handling
      return NextResponse.json({ error: "Error fetching data", details: error.message }, { status: 500 })
    }

    // Add ranking index
    const rankings = (rankingsData || []).map((item: any, index: number) => ({
      ...item,
      ranking: index + 1,
    }))

    return NextResponse.json({
      success: true,
      data: rankings,
      total: rankings.length, // RPC returns limit or less, total count would require a separate query if needed
      type,
      filters: {
        acuerdo,
        categoria,
        catalogo,
        fechaInicio,
        fechaFin,
        limit,
        period,
      },
    })
  } catch (error) {
    console.error("Error in rankings API:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
