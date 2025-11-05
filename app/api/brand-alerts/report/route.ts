import { createServerClient } from "@/lib/supabase-server"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

interface BrandAlert {
  id: string
  orden_electronica: string
  acuerdo_marco: string
  brand_name: string
  status: "pending" | "attended" | "observed"
  notes: string | null
  ruc_proveedor: string | null
  razon_social_proveedor: string | null
  estado_orden_electronica: string | null
  created_at: string
  updated_at: string
}

interface ReportData {
  summary: {
    totalAlerts: number
    byBrand: Record<string, number>
    byStatus: Record<string, number>
    byFrameworkAgreement: Record<string, number>
    byOrderStatus: Record<string, number>
  }
  details: {
    byBrand: Record<
      string,
      {
        byFrameworkAgreement: Record<
          string,
          {
            byAlertStatus: Record<
              string,
              {
                byOrderStatus: Record<string, BrandAlert[]>
              }
            >
          }
        >
      }
    >
  }
}

export async function POST(request: NextRequest) {
  const supabase = createServerClient()

  try {
    const body = await request.json()
    const { brands, startDate, endDate } = body

    if (!brands || !Array.isArray(brands) || brands.length === 0) {
      return NextResponse.json({ error: "At least one brand must be selected" }, { status: 400 })
    }

    // Fetch alerts for selected brands
    let query = supabase.from("brand_alerts").select("*").in("brand_name", brands)

    if (startDate) {
      query = query.gte("created_at", startDate)
    }

    if (endDate) {
      query = query.lte("created_at", endDate)
    }

    const { data: alerts, error } = await query.order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching brand alerts for report:", error)
      return NextResponse.json({ error: "Failed to fetch alerts" }, { status: 500 })
    }

    const alertsTyped = (alerts as BrandAlert[]) || []

    // Build structured report
    const report = buildReport(alertsTyped)

    return NextResponse.json(report)
  } catch (error) {
    console.error("Error generating brand alerts report:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

function buildReport(alerts: BrandAlert[]): ReportData {
  const report: ReportData = {
    summary: {
      totalAlerts: alerts.length,
      byBrand: {},
      byStatus: {},
      byFrameworkAgreement: {},
      byOrderStatus: {},
    },
    details: {
      byBrand: {},
    },
  }

  // Build summary and detail structures
  for (const alert of alerts) {
    // Summary: Count by brand
    report.summary.byBrand[alert.brand_name] = (report.summary.byBrand[alert.brand_name] || 0) + 1

    // Summary: Count by status
    const statusLabel =
      {
        pending: "Pendiente",
        attended: "Atendida",
        observed: "Observada",
      }[alert.status] || alert.status
    report.summary.byStatus[statusLabel] = (report.summary.byStatus[statusLabel] || 0) + 1

    // Summary: Count by framework agreement
    report.summary.byFrameworkAgreement[alert.acuerdo_marco] =
      (report.summary.byFrameworkAgreement[alert.acuerdo_marco] || 0) + 1

    // Summary: Count by order status
    const orderStatus = alert.estado_orden_electronica || "Sin Estado"
    report.summary.byOrderStatus[orderStatus] = (report.summary.byOrderStatus[orderStatus] || 0) + 1

    // Details: Nested structure by brand -> framework agreement -> alert status -> order status
    if (!report.details.byBrand[alert.brand_name]) {
      report.details.byBrand[alert.brand_name] = {
        byFrameworkAgreement: {},
      }
    }

    const brandDetails = report.details.byBrand[alert.brand_name].byFrameworkAgreement
    if (!brandDetails[alert.acuerdo_marco]) {
      brandDetails[alert.acuerdo_marco] = {
        byAlertStatus: {},
      }
    }

    const frameworkDetails = brandDetails[alert.acuerdo_marco].byAlertStatus
    if (!frameworkDetails[alert.status]) {
      frameworkDetails[alert.status] = {
        byOrderStatus: {},
      }
    }

    const alertStatusDetails = frameworkDetails[alert.status].byOrderStatus
    const orderStatusKey = alert.estado_orden_electronica || "Sin Estado"
    if (!alertStatusDetails[orderStatusKey]) {
      alertStatusDetails[orderStatusKey] = []
    }

    alertStatusDetails[orderStatusKey].push(alert)
  }

  return report
}
