import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase-server"

export async function GET(request: NextRequest, { params }: { params: { hash: string } }) {
  try {
    const { hash } = params

    if (!hash || hash.length !== 64) {
      return NextResponse.json({ error: "Hash de validación inválido" }, { status: 400 })
    }

    const supabase = createClient()

    // Buscar el registro de validación
    const { data: validation, error } = await supabase
      .from("quotation_validations")
      .select("*")
      .eq("validation_hash", hash)
      .eq("is_active", true)
      .single()

    if (error || !validation) {
      console.error("Validation not found:", error)
      return NextResponse.json({ error: "Cotización no encontrada o inválida" }, { status: 404 })
    }

    // Incrementar contador de validaciones
    const newValidatedCount = validation.validated_count + 1
    const currentTime = new Date().toISOString()

    const { error: updateError } = await supabase
      .from("quotation_validations")
      .update({
        validated_count: newValidatedCount,
        last_validated_at: currentTime,
      })
      .eq("id", validation.id)

    if (updateError) {
      console.error("Error updating validation count:", updateError)
    }

    // Retornar datos de validación
    return NextResponse.json({
      isValid: true,
      quotationNumber: validation.quotation_number,
      clientRuc: validation.client_ruc,
      clientName: validation.client_name,
      companyRuc: validation.company_ruc,
      companyName: validation.company_name,
      totalAmount: validation.total_amount,
      quotationDate: validation.quotation_date,
      createdAt: validation.created_at,
      validatedCount: newValidatedCount,
      lastValidatedAt: currentTime,
      createdBy: validation.created_by,
    })
  } catch (error) {
    console.error("Error validating quotation:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
