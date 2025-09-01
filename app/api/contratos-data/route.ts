import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const exportAll = searchParams.get("export")

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // Ignore server component cookie setting
          }
        },
      },
    },
  )

  try {
    if (exportAll === "all") {
      // Export all contracts data
      const { data, error } = await supabase
        .from("contratos_data")
        .select("*")
        .order("fecha_publicacion", { ascending: false })

      if (error) {
        console.error("Error fetching all contracts:", error)
        return NextResponse.json({ error: "Error fetching data" }, { status: 500 })
      }

      return NextResponse.json(data)
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
