import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Crear un cliente de Supabase con la clave de servicio para operaciones administrativas
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || "", process.env.SUPABASE_SERVICE_ROLE_KEY || "")

export async function POST(request: NextRequest) {
  try {
    const { functionName, params } = await request.json()

    if (!functionName) {
      return NextResponse.json({ error: "Function name is required" }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin.rpc(functionName, params || {})

    if (error) {
      console.error(`Error calling RPC function ${functionName}:`, error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error("Unexpected error in RPC route:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
