import { createServiceClient } from "@/lib/supabase-server"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  const supabase = createServiceClient()

  try {
    const { entries, alerts } = await request.json()

    if (!Array.isArray(entries)) {
      return NextResponse.json(
        { success: false, message: "Entries debe ser un array" },
        { status: 400 }
      )
    }

    let insertedCount = 0
    let brandAlertsCount = 0
    const errors: string[] = []

    // Insertar entries en batches de 100 para no saturar Supabase
    const BATCH_SIZE = 100
    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
      const batch = entries.slice(i, i + BATCH_SIZE)

      // 1. Verificar duplicados por orden_electronica antes de insertar
      // Esto evita insertar registros que ya existen (duplicados)
      const ordenes = batch.map((e: any) => e.orden_electronica).filter(Boolean)

      if (ordenes.length > 0) {
        const { data: existingRows } = await supabase
          .from("open_data_entries")
          .select("orden_electronica")
          .in("orden_electronica", ordenes)

        const existingSet = new Set(existingRows?.map((r: any) => r.orden_electronica))

        const newEntries = batch.filter((e: any) => !existingSet.has(e.orden_electronica))

        if (newEntries.length > 0) {
          const { error } = await supabase.from("open_data_entries").insert(newEntries)

          if (error) {
            console.error("Error insertando batch filtered:", error)
            errors.push(`Error en batch ${i}: ${error.message}`)
          } else {
            insertedCount += newEntries.length
          }
        }
        // Si newEntries es 0, significa que todos ya existían. No hacemos nada y seguimos.
      }
    }

    // Insertar alertas si hay
    if (alerts && Array.isArray(alerts) && alerts.length > 0) {
      for (const alert of alerts) {
        // Verificar duplicados
        const { data: existing } = await supabase
          .from("brand_alerts")
          .select("id")
          .eq("orden_electronica", alert.orden_electronica)
          .eq("brand_name", alert.brand_name)
          .single()

        if (!existing) {
          const { error } = await supabase.from("brand_alerts").insert(alert)
          if (!error) brandAlertsCount++
        }
      }
    }

    return NextResponse.json({
      success: true,
      insertedCount,
      brandAlertsCount,
      errors
    })
  } catch (error: any) {
    console.error("Error uploading chunk:", error)
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    )
  }
}
