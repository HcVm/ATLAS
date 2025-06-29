import { type NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase-server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { quotationNumber, clientRuc, clientName, companyRuc, companyName, totalAmount, quotationDate, createdBy } =
      body

    // Validar datos requeridos
    if (
      !quotationNumber ||
      !clientRuc ||
      !clientName ||
      !companyRuc ||
      !companyName ||
      !totalAmount ||
      !quotationDate ||
      !createdBy
    ) {
      return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 })
    }

    console.log("🔐 Generando hash de validación en servidor...")

    // Crear datos únicos para el hash
    const timestamp = new Date().getTime()
    const uniqueData = `${quotationNumber}-${clientRuc}-${totalAmount}-${quotationDate}-${companyRuc}-${timestamp}`

    // Generar hash SHA-256
    const encoder = new TextEncoder()
    const dataBuffer = encoder.encode(uniqueData)
    const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const validationHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")

    console.log("✅ Hash generado:", validationHash.substring(0, 16) + "...")

    // Guardar en la base de datos usando service client
    console.log("💾 Guardando validación en base de datos...")

    const supabase = createServiceClient()
    const { data: insertData, error: insertError } = await supabase
      .from("quotation_validations")
      .insert({
        validation_hash: validationHash,
        quotation_number: quotationNumber,
        client_ruc: clientRuc,
        client_name: clientName,
        company_ruc: companyRuc,
        company_name: companyName,
        total_amount: totalAmount,
        quotation_date: quotationDate,
        created_by: createdBy,
        is_active: true,
        validated_count: 0,
      })
      .select()

    if (insertError) {
      console.error("❌ Error saving validation to database:", insertError)
      return NextResponse.json({ error: `Error al guardar validación: ${insertError.message}` }, { status: 500 })
    }

    console.log("✅ Validación guardada en BD:", insertData)

    // Crear URL de validación
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin
    const validationUrl = `${baseUrl}/validate-quotation/${validationHash}`

    console.log("🔗 URL de validación:", validationUrl)

    return NextResponse.json({
      success: true,
      validationHash,
      validationUrl,
      message: "Validación creada exitosamente",
    })
  } catch (error) {
    console.error("❌ Error in create validation API:", error)
    return NextResponse.json(
      {
        error: `Error interno del servidor: ${error instanceof Error ? error.message : "Error desconocido"}`,
      },
      { status: 500 },
    )
  }
}
