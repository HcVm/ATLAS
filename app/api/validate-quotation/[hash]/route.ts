import { type NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase-server"

export async function GET(request: NextRequest, { params }: { params: { hash: string } }) {
  try {
    const { hash } = params

    if (!hash) {
      return NextResponse.json({ error: "Hash de validación requerido" }, { status: 400 })
    }

    console.log("🔍 Validando hash:", hash.substring(0, 16) + "...")

    // Crear cliente de Supabase con service role
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

    console.log("📊 Contador actual:", validation.validated_count)

    // Incrementar contador de validaciones con timestamp
    const newCount = (validation.validated_count || 0) + 1
    const now = new Date().toISOString()

    const { data: updatedData, error: updateError } = await supabase
      .from("quotation_validations")
      .update({
        validated_count: newCount,
        last_validated_at: now,
        updated_at: now,
      })
      .eq("id", validation.id)
      .select("validated_count, last_validated_at")
      .single()

    if (updateError) {
      console.error("❌ Error actualizando contador:", updateError)
      // Continuar aunque falle la actualización
    } else {
      console.log("✅ Contador actualizado a:", updatedData?.validated_count)
    }

    // Verificar que se actualizó correctamente
    const { data: verifyData } = await supabase
      .from("quotation_validations")
      .select("validated_count, last_validated_at")
      .eq("id", validation.id)
      .single()

    console.log("🔄 Verificación - Contador:", verifyData?.validated_count)

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
        validatedCount: verifyData?.validated_count || newCount,
        lastValidatedAt: verifyData?.last_validated_at || now,
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
