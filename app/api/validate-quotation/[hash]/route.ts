import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase-server"

export async function GET(request: NextRequest, { params }: { params: { hash: string } }) {
  try {
    const { hash } = params

    if (!hash) {
      return NextResponse.json({ error: "Hash de validación requerido" }, { status: 400 })
    }

    const supabase = createClient()

    // Buscar la cotización por hash
    const { data: quotation, error } = await supabase
      .from("quotation_validations")
      .select("*")
      .eq("validation_hash", hash)
      .eq("is_active", true)
      .single()

    if (error || !quotation) {
      return NextResponse.json({ error: "Cotización no encontrada o inválida" }, { status: 404 })
    }

    // Actualizar contador de validaciones
    const { error: updateError } = await supabase
      .from("quotation_validations")
      .update({
        validated_count: quotation.validated_count + 1,
        last_validated_at: new Date().toISOString(),
      })
      .eq("id", quotation.id)

    if (updateError) {
      console.error("Error updating validation count:", updateError)
      // No retornamos error aquí, solo logueamos
    }

    return NextResponse.json({
      success: true,
      quotation: {
        quotation_number: quotation.quotation_number,
        client_ruc: quotation.client_ruc,
        client_name: quotation.client_name,
        company_ruc: quotation.company_ruc,
        company_name: quotation.company_name,
        total_amount: quotation.total_amount,
        quotation_date: quotation.quotation_date,
        validated_count: quotation.validated_count + 1,
        last_validated_at: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("Error validating quotation:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
