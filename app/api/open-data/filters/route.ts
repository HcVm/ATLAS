import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const type = searchParams.get("type")

  const supabase = createServerClient()

  try {
    console.log(`Fetching filters for type: ${type}`)

    // Helper to process legacy data
    const processLegacyData = (data: any[], key: string) => {
      const counts = new Map()
      data.forEach((item) => {
        const val = item[key]
        counts.set(val, (counts.get(val) || 0) + 1)
      })
      return Array.from(counts.entries())
        .map(([value, count]) => ({ value, label: value, count }))
        .sort((a, b) => b.count - a.count)
    }

    // Attempt to use the RPC function first
    if (type === "acuerdos" || type === "categorias" || type === "catalogos") {
      const { data: rpcData, error: rpcError } = await supabase.rpc("get_filters_summary", {
        filter_type: type,
      })

      if (!rpcError && rpcData) {
        // Map RPC result to expected format
        const formattedData = (rpcData as any[]).map((item) => ({
          value: item.value,
          label: item.value,
          count: item.count,
        }))
        return NextResponse.json({ success: true, data: formattedData })
      } else {
        console.warn(`RPC get_filters_summary failed for ${type}, falling back to legacy method:`, rpcError)
      }
    }

    if (type === "acuerdos") {
      const { data, error } = await supabase
        .from("open_data_entries")
        .select("codigo_acuerdo_marco")
        .not("codigo_acuerdo_marco", "is", null)

      if (error) {
        console.error("Error fetching acuerdos:", error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, data: processLegacyData(data, "codigo_acuerdo_marco") })
    }

    if (type === "categorias") {
      const { data, error } = await supabase.from("open_data_entries").select("categoria").not("categoria", "is", null)

      if (error) {
        console.error("Error fetching categorias:", error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, data: processLegacyData(data, "categoria") })
    }

    if (type === "catalogos") {
      const { data, error } = await supabase.from("open_data_entries").select("catalogo").not("catalogo", "is", null)

      if (error) {
        console.error("Error fetching catalogos:", error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, data: processLegacyData(data, "catalogo") })
    }

    // For "all" or unspecified type, we can also try to use RPC in parallel if we want to optimize that case too,
    // but the RPC function handles one type at a time.
    // Optimizing "all" case using RPC:
    const [acuerdosRpc, categoriasRpc, catalogosRpc] = await Promise.all([
      supabase.rpc("get_filters_summary", { filter_type: "acuerdos" }),
      supabase.rpc("get_filters_summary", { filter_type: "categorias" }),
      supabase.rpc("get_filters_summary", { filter_type: "catalogos" }),
    ])

    const useRpc = !acuerdosRpc.error && !categoriasRpc.error && !catalogosRpc.error

    if (useRpc) {
      const result = {
        acuerdos: (acuerdosRpc.data as any[]).map((item) => ({ value: item.value, count: item.count })),
        categorias: (categoriasRpc.data as any[]).map((item) => ({ value: item.value, count: item.count })),
        catalogos: (catalogosRpc.data as any[]).map((item) => ({ value: item.value, count: item.count })),
      }
      return NextResponse.json(result)
    }

    // Fallback for "all"
    console.warn("RPC failed for one or more types in 'all' request, falling back to legacy.")
    const [acuerdosRes, categoriasRes, catalogosRes] = await Promise.all([
      supabase.from("open_data_entries").select("codigo_acuerdo_marco").not("codigo_acuerdo_marco", "is", null),
      supabase.from("open_data_entries").select("categoria").not("categoria", "is", null),
      supabase.from("open_data_entries").select("catalogo").not("catalogo", "is", null),
    ])

    if (acuerdosRes.error || categoriasRes.error || catalogosRes.error) {
      console.error("Error fetching filters:", {
        acuerdos: acuerdosRes.error,
        categorias: categoriasRes.error,
        catalogos: catalogosRes.error,
      })
      return NextResponse.json({ success: false, error: "Error fetching filters" }, { status: 500 })
    }

    // Helper for simple count format (no label)
    const processLegacyDataSimple = (data: any[], key: string) => {
      const counts = new Map()
      data.forEach((item) => {
        const val = item[key]
        counts.set(val, (counts.get(val) || 0) + 1)
      })
      return Array.from(counts.entries())
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count)
    }

    const result = {
      acuerdos: processLegacyDataSimple(acuerdosRes.data, "codigo_acuerdo_marco"),
      categorias: processLegacyDataSimple(categoriasRes.data, "categoria"),
      catalogos: processLegacyDataSimple(catalogosRes.data, "catalogo"),
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error in filters API:", error)
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
