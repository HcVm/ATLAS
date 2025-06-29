import { type NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase-server"

export async function GET(request: NextRequest, { params }: { params: { hash: string } }) {
  try {
    const { hash } = params

    if (!hash) {
      return NextResponse.json({ error: "Hash de validación requerido" }, { status: 400 })
    }

    if (hash.length !== 64) {
      return NextResponse.json({ error: "Hash de validación inválido" }, { status: 400 })
    }

    console.log("🔍 Validando hash:", hash.substring(0, 16) + "...")

    // Usar service client para consultar la validación
    const supabase = createServiceClient()

    // Buscar la validación por hash
    const { data: validation, error } = await supabase
      .from("quotation_validations")
      .select("*")
      .eq("validation_hash", hash)
      .eq("is_active", true)
      .single()

    if (error) {
      console.error("❌ Error fetching validation:", error)
      return NextResponse.json({ error: "Validación no encontrada" }, { status: 404 })
    }

    if (!validation) {
      console.log("❌ Validación no encontrada o inactiva")
      return NextResponse.json({ error: "Validación no encontrada o inactiva" }, { status: 404 })
    }

    console.log("✅ Validación encontrada:", validation.quotation_number)

    // Verificar si la validación ha expirado
    const now = new Date()
    const expiresAt = validation.expires_at ? new Date(validation.expires_at) : new Date()

    if (now > expiresAt) {
      console.log("⏰ Validación expirada")
      return NextResponse.json(
        {
          error: "Esta validación ha expirado",
          expired: true,
          expiresAt: validation.expires_at,
        },
        { status: 410 },
      )
    }

    // Incrementar contador de validaciones
    const newCount = (validation.validated_count || 0) + 1
    const currentTime = new Date().toISOString()

    const { error: updateError } = await supabase
      .from("quotation_validations")
      .update({
        validated_count: newCount,
        last_validated_at: currentTime,
      })
      .eq("validation_hash", hash)

    if (updateError) {
      console.error("⚠️ Error updating validation count:", updateError)
      // No fallar la validación por esto, solo logear el error
    } else {
      console.log("📊 Contador actualizado:", newCount)
    }

    // Retornar datos de la validación
    return NextResponse.json({
      valid: true,
      validation: {
        id: validation.id,
        quotationNumber: validation.quotation_number,
        clientRuc: validation.client_ruc,
        clientName: validation.client_name,
        companyRuc: validation.company_ruc,
        companyName: validation.company_name,
        totalAmount: validation.total_amount,
        quotationDate: validation.quotation_date,
        createdBy: validation.created_by,
        createdAt: validation.created_at,
        validatedCount: newCount,
        lastValidatedAt: currentTime,
        expiresAt: validation.expires_at,
      },
    })
  } catch (error) {
    console.error("❌ Error in validation API:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
