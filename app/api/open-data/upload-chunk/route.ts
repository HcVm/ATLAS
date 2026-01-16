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
      const { error } = await supabase.from("open_data_entries").insert(batch)

      if (error) {
        console.error("Error insertando batch:", error)
        errors.push(`Error en batch ${i}: ${error.message}`)
        
        // Fallback: intentar insertar uno por uno para salvar los válidos
        for (const entry of batch) {
            const { error: singleError } = await supabase.from("open_data_entries").insert(entry)
            if (!singleError) insertedCount++
        }
      } else {
        insertedCount += batch.length
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
