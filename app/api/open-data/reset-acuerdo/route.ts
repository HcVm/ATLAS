import { createServiceClient } from "@/lib/supabase-server"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  const supabase = createServiceClient()

  try {
    const { codigoAcuerdoMarco } = await request.json()

    if (!codigoAcuerdoMarco) {
      return NextResponse.json(
        { success: false, message: "Código de acuerdo marco requerido" },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from("open_data_entries")
      .delete()
      .eq("codigo_acuerdo_marco", codigoAcuerdoMarco)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error resetting acuerdo:", error)
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    )
  }
}
