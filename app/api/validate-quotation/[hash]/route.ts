import { type NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase-server"

export async function GET(request: NextRequest, { params }: { params: { hash: string } }) {
  try {
    const { hash } = params

    if (!hash) {
      return NextResponse.json({ error: "Hash de validación requerido" }, { status: 400 })
    }

    console.log("🔍 Validando hash:", hash.substring(0, 16) + "...")

    // Crear cliente de Supabase
    const supabase = createServiceClient()

    // Buscar la validación
    const { data: validation, error: selectError } = await supabase
      .from("quotation_validations")
      .select("*")
      .eq("validation_hash", hash)
      .eq("is_active", true)
      .single()

    if (selectError) {
      console.error("❌ Error buscando validación:", selectError)
      return NextResponse.json({ error: "Validación no encontrada" }, { status: 404 })
    }

    if (!validation) {
      return NextResponse.json({ error: "Validación no encontrada o inactiva" }, { status: 404 })
    }

    // Incrementar contador de validaciones
    const { error: updateError } = await supabase
      .from("quotation_validations")
      .update({
        validated_count: validation.validated_count + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", validation.id)

    if (updateError) {
      console.warn("⚠️ Error actualizando contador:", updateError)
    }

    console.log("✅ Validación encontrada:", validation.quotation_number)

    return NextResponse.json({
      success: true,
      validation: {
        quotationNumber: validation.quotation_number,
        clientName: validation.client_name,
        clientRuc: validation.client_ruc,
        companyName: validation.company_name,
        companyRuc: validation.company_ruc,
        totalAmount: validation.total_amount,
        quotationDate: validation.quotation_date,
        createdBy: validation.created_by,
        validatedCount: validation.validated_count + 1,
        createdAt: validation.created_at,
      },
    })
  } catch (error) {
    console.error("❌ Error en validación:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Error interno del servidor",
      },
      { status: 500 },
    )
  }
}
