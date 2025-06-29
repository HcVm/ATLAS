import { type NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase-server"

export async function POST(request: NextRequest) {
  try {
    console.log("🔐 API: Iniciando creación de validación...")

    const body = await request.json()
    const { quotationNumber, clientRuc, clientName, companyRuc, companyName, totalAmount, quotationDate, createdBy } =
      body

    // Validar datos requeridos
    if (!quotationNumber || !clientRuc || !companyRuc || !totalAmount) {
      return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 })
    }

    console.log("📋 Datos recibidos:", {
      quotationNumber,
      clientRuc,
      companyRuc,
      totalAmount,
      createdBy,
    })

    // Generar hash único para validación
    const timestamp = new Date().getTime()
    const uniqueData = `${quotationNumber}-${clientRuc}-${totalAmount}-${quotationDate}-${companyRuc}-${timestamp}`

    console.log("🔢 Datos únicos para hash:", uniqueData)

    // Generar hash SHA-256
    const encoder = new TextEncoder()
    const dataBuffer = encoder.encode(uniqueData)
    const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const validationHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")

    console.log("✅ Hash generado:", validationHash.substring(0, 16) + "...")

    // Crear cliente de Supabase
    const supabase = createServiceClient()

    // Guardar en la base de datos
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
      console.error("❌ Error guardando en BD:", insertError)
      return NextResponse.json({ error: `Error en base de datos: ${insertError.message}` }, { status: 500 })
    }

    console.log("✅ Validación guardada en BD:", insertData)

    // Crear URL de validación
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://agpcdocs.vercel.app"
    const validationUrl = `${baseUrl}/validate-quotation/${validationHash}`

    console.log("🔗 URL de validación creada:", validationUrl)

    return NextResponse.json({
      success: true,
      validationHash,
      validationUrl,
      message: "Validación creada exitosamente",
    })
  } catch (error) {
    console.error("❌ Error completo en API:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Error interno del servidor",
      },
      { status: 500 },
    )
  }
}
