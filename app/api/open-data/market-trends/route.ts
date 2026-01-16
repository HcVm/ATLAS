import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const period = searchParams.get("period") || "6months"

  const supabase = createServerClient()

  try {
    const now = new Date()
    let startDate = new Date()

    switch (period) {
      case "3months":
        startDate.setMonth(now.getMonth() - 3)
        break
      case "1year":
        startDate.setFullYear(now.getFullYear() - 1)
        break
      default:
        startDate.setMonth(now.getMonth() - 6)
        break
    }

    const { data, error } = await supabase
      .from("open_data_entries")
      .select("fecha_publicacion, monto_total_entrega, orden_electronica")
      .gte("fecha_publicacion", startDate.toISOString().split("T")[0])
      .order("fecha_publicacion", { ascending: true })

    if (error) throw error

    // Aggregate by month
    const monthlyStats = new Map<string, { date: string; amount: number; orders: number }>()

    data?.forEach((item) => {
        if (!item.fecha_publicacion) return
        // Format: YYYY-MM
        const dateKey = item.fecha_publicacion.substring(0, 7) 
        
        if (!monthlyStats.has(dateKey)) {
            monthlyStats.set(dateKey, { date: dateKey, amount: 0, orders: 0 })
        }
        
        const entry = monthlyStats.get(dateKey)!
        entry.amount += Number(item.monto_total_entrega) || 0
        entry.orders += 1
    })

    const trendData = Array.from(monthlyStats.values()).sort((a, b) => a.date.localeCompare(b.date))

    return NextResponse.json({ success: true, data: trendData })

  } catch (error: any) {
    console.error("Error in market-trends API:", error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
