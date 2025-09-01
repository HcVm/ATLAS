import { createServerClient } from "@/lib/supabase-server"
import { NextResponse } from "next/server"

interface BrandAlert {
  id: string
  orden_electronica: string
  ruc_proveedor?: string | null
  razon_social_proveedor?: string | null
  estado_orden_electronica?: string | null
}

interface OpenDataEntry {
  orden_electronica?: string
  ruc_proveedor?: string
  razon_social_proveedor?: string
  estado_orden_electronica?: string
}

export async function POST() {
  const supabase = createServerClient()

  try {
    console.log("REPAIR API: Starting repair process for alerts with N/A values...")

    // 1. Buscar alertas que tienen valores N/A o null en campos importantes
    const { data: alertsToRepair, error: alertsError } = await supabase
      .from("brand_alerts")
      .select("id, orden_electronica, ruc_proveedor, razon_social_proveedor, estado_orden_electronica")
      .or("ruc_proveedor.is.null,razon_social_proveedor.is.null,estado_orden_electronica.is.null")

    if (alertsError) {
      console.error("REPAIR API: Error fetching alerts to repair:", alertsError)
      return NextResponse.json({ error: "Failed to fetch alerts" }, { status: 500 })
    }

    const alertsTyped = (alertsToRepair as BrandAlert[]) || []
    console.log(`REPAIR API: Found ${alertsTyped.length} alerts that need repair`)

    if (alertsTyped.length === 0) {
      return NextResponse.json({
        message: "No alerts found that need repair",
        repaired: 0,
        failed: 0,
      })
    }

    let repairedCount = 0
    let failedCount = 0
    const repairResults = []

    // 2. Para cada alerta, buscar los datos correctos en open_data_entries
    for (const alert of alertsTyped) {
      try {
        console.log(`REPAIR API: Processing alert ${alert.id} with OE: ${alert.orden_electronica}`)

        // Buscar datos en open_data_entries usando orden_electronica
        const { data: openDataEntries, error: openDataError } = await supabase
          .from("open_data_entries")
          .select("orden_electronica, ruc_proveedor, razon_social_proveedor, estado_orden_electronica")
          .eq("orden_electronica", alert.orden_electronica)
          .limit(1)

        if (openDataError) {
          console.error(`REPAIR API: Error fetching open data for OE ${alert.orden_electronica}:`, openDataError)
          failedCount++
          continue
        }

        const openDataTyped = (openDataEntries as OpenDataEntry[]) || []

        if (openDataTyped.length === 0) {
          console.log(`REPAIR API: No open data found for OE: ${alert.orden_electronica}`)
          failedCount++
          repairResults.push({
            alertId: alert.id,
            ordenElectronica: alert.orden_electronica,
            status: "failed",
            reason: "No open data found",
          })
          continue
        }

        const openDataEntry = openDataTyped[0]

        // 3. Preparar datos de actualización solo si hay valores válidos
        const updateData: any = {
          updated_at: new Date().toISOString(),
        }

        let hasUpdates = false

        // Solo actualizar si el valor actual es null/undefined y hay un valor válido en open_data
        if (!alert.ruc_proveedor && openDataEntry.ruc_proveedor) {
          updateData.ruc_proveedor = openDataEntry.ruc_proveedor
          hasUpdates = true
        }

        if (!alert.razon_social_proveedor && openDataEntry.razon_social_proveedor) {
          updateData.razon_social_proveedor = openDataEntry.razon_social_proveedor
          hasUpdates = true
        }

        if (!alert.estado_orden_electronica && openDataEntry.estado_orden_electronica) {
          updateData.estado_orden_electronica = openDataEntry.estado_orden_electronica
          hasUpdates = true
        }

        if (!hasUpdates) {
          console.log(`REPAIR API: No valid updates found for alert ${alert.id}`)
          repairResults.push({
            alertId: alert.id,
            ordenElectronica: alert.orden_electronica,
            status: "skipped",
            reason: "No valid data to update",
          })
          continue
        }

        // 4. Actualizar la alerta
        const { error: updateError } = await supabase.from("brand_alerts").update(updateData).eq("id", alert.id)

        if (updateError) {
          console.error(`REPAIR API: Error updating alert ${alert.id}:`, updateError)
          failedCount++
          repairResults.push({
            alertId: alert.id,
            ordenElectronica: alert.orden_electronica,
            status: "failed",
            reason: updateError.message,
          })
        } else {
          repairedCount++
          console.log(`REPAIR API: Successfully repaired alert ${alert.id}`)
          repairResults.push({
            alertId: alert.id,
            ordenElectronica: alert.orden_electronica,
            status: "repaired",
            updates: Object.keys(updateData).filter((key) => key !== "updated_at"),
          })
        }
      } catch (error) {
        console.error(`REPAIR API: Unexpected error processing alert ${alert.id}:`, error)
        failedCount++
        repairResults.push({
          alertId: alert.id,
          ordenElectronica: alert.orden_electronica,
          status: "failed",
          reason: "Unexpected error",
        })
      }
    }

    console.log(`REPAIR API: Repair process completed. Repaired: ${repairedCount}, Failed: ${failedCount}`)

    return NextResponse.json({
      message: "Repair process completed",
      total: alertsTyped.length,
      repaired: repairedCount,
      failed: failedCount,
      results: repairResults,
    })
  } catch (error) {
    console.error("REPAIR API: Unhandled error in repair process:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
