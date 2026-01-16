import { type NextRequest, NextResponse } from "next/server"
import { getMarketStats, type Period } from "@/lib/open-data"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const period = (searchParams.get("period") || "6months") as Period

    const data = await getMarketStats(period)

    if (!data) {
        return NextResponse.json({ success: false, error: "Error fetching stats" }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error("Error in market-stats API:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
