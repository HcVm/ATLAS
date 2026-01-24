import { createServerClient } from "@/lib/supabase-server"
import { NextResponse } from "next/server"
import { fetchPeruComprasData } from "@/lib/open-data/peru-compras-client"
import { fetchOECEData } from "@/lib/open-data/oece-client"

export async function POST(request: Request) {
    try {
        const json = await request.json()
        const { url } = json

        if (!url) {
            return NextResponse.json({ error: "URL is required" }, { status: 400 })
        }

        // 1. Determine Provider
        let entries = []
        if (url.includes("perucompras.gob.pe")) {
            entries = await fetchPeruComprasData(url)
        } else if (url.includes("oece.gob.pe") || url.includes("osce.gob.pe")) {
            entries = await fetchOECEData(url)
        } else {
            return NextResponse.json({ error: "Dominio no soportado. Use pedrocompras.gob.pe o oece.gob.pe" }, { status: 400 })
        }

        if (entries.length === 0) {
            return NextResponse.json({ message: "No entries found or parsed", count: 0 })
        }

        // 2. Insert into DB (Test Table)
        const supabase = createServerClient()

        // Process in batches of 1000
        const BATCH_SIZE = 1000
        let insertedCount = 0
        let errors: any[] = []

        for (let i = 0; i < entries.length; i += BATCH_SIZE) {
            const batch = entries.slice(i, i + BATCH_SIZE)

            // Remove 'id' if undefined to let DB generate it
            const cleanBatch = batch.map(e => {
                const { id, ...rest } = e
                return rest
            })

            const { error } = await supabase
                .from("open_data_entries_test")
                .upsert(cleanBatch, { onConflict: "orden_electronica" }) // Assume unique order ID

            if (error) {
                console.error("Batch insert error:", error)
                errors.push(error)
            } else {
                insertedCount += batch.length
            }
        }

        return NextResponse.json({
            success: true,
            found: entries.length,
            inserted: insertedCount,
            errors: errors.length > 0 ? errors : undefined
        })

    } catch (error: any) {
        console.error("API Error:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
