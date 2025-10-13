import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { GoogleGenAI } from "@google/genai"

const GEMINI_API_KEY = process.env.GEMINI_API_KEY

async function getSupabaseServerClient() {
  const cookieStore = await cookies()
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      get: (name) => cookieStore.get(name)?.value,
      set: () => {},
      remove: () => {},
    },
  })
}

async function getProductStock(supabase: any, companyId: string, searchTerm?: string) {
  try {
    let query = supabase
      .from("products")
      .select("id, name, code, current_stock, minimum_stock, unit_of_measure, is_active")
      .eq("company_id", companyId)
      .eq("is_active", true)

    if (searchTerm) {
      query = query.or(`name.ilike.%${searchTerm}%,code.ilike.%${searchTerm}%`)
    }

    const { data, error } = await query.limit(10)

    if (error) throw error

    return data || []
  } catch (error) {
    console.error("Error fetching products:", error)
    return []
  }
}

async function createCalendarEvent(
  supabase: any,
  userId: string,
  companyId: string,
  title: string,
  eventDate: string,
  description?: string,
) {
  try {
    const { data, error } = await supabase
      .from("calendar_events")
      .insert({
        user_id: userId,
        company_id: companyId,
        title,
        description: description || null,
        event_date: eventDate,
        importance: "medium",
        is_completed: false,
        notification_sent: false,
      })
      .select()
      .single()

    if (error) throw error

    return { success: true, event: data }
  } catch (error: any) {
    console.error("Error creating calendar event:", error)
    return { success: false, error: error.message }
  }
}

async function searchGovernmentInfo(query: string) {
  try {
    // Simulate web search for Peru Compras, OSCE, NTPs information
    const searchResults = await fetch(
      `https://www.googleapis.com/customsearch/v1?key=${process.env.GOOGLE_SEARCH_API_KEY}&cx=${process.env.GOOGLE_SEARCH_CX}&q=${encodeURIComponent(query + " site:gob.pe OR site:osce.gob.pe OR site:perucompras.gob.pe")}`,
    )

    if (searchResults.ok) {
      const data = await searchResults.json()
      return (
        data.items?.slice(0, 3).map((item: any) => ({
          title: item.title,
          snippet: item.snippet,
          link: item.link,
        })) || []
      )
    }

    // Fallback if API not configured
    return [
      {
        title: "Información no disponible",
        snippet:
          "Para obtener información actualizada sobre " +
          query +
          ", visita los portales oficiales de OSCE (www.osce.gob.pe) y Peru Compras (www.perucompras.gob.pe).",
        link: "https://www.gob.pe",
      },
    ]
  } catch (error) {
    console.error("Error searching government info:", error)
    return []
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await getSupabaseServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Validate API key
    if (!GEMINI_API_KEY) {
      console.error("❌ GEMINI_API_KEY no está configurado")
      return NextResponse.json({ error: "Gemini API key no configurado" }, { status: 500 })
    }

    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY })

    // Get request body
    const body = await request.json()
    const { message, history } = body

    if (!message) {
      return NextResponse.json({ error: "Mensaje requerido" }, { status: 400 })
    }

    // Get user profile for context
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, role, department_id, company_id")
      .eq("id", user.id)
      .single()

    let departmentName = ""
    if (profile?.department_id) {
      const { data: dept } = await supabase.from("departments").select("name").eq("id", profile.department_id).single()
      departmentName = dept?.name || ""
    }

    const systemContext = `Eres Atlix, el asistente virtual inteligente del sistema ATLAS para una empresa que vende bienes al Estado Peruano.

Información del usuario:
- Nombre: ${profile?.full_name || "Usuario"}
- Rol: ${profile?.role || "user"}
- Departamento: ${departmentName || "No asignado"}

CAPACIDADES ESPECIALES:
1. Puedes consultar el inventario de productos en tiempo real
2. Puedes crear eventos en el calendario del usuario
3. Puedes buscar información actualizada sobre:
   - Peru Compras (plataforma de compras estatales)
   - OSCE (Organismo Supervisor de las Contrataciones del Estado)
   - NTPs (Normas Técnicas Peruanas)
   - Licitaciones y convocatorias del Estado

Funcionalidades de ATLAS:
- Gestión de documentos con flujo de trabajo
- Sistema de notificaciones en tiempo real
- Calendario de eventos y recordatorios
- Gestión de usuarios y departamentos
- Sistema de asistencia con marcación
- Inventario de productos internos y de venta
- Sistema de cotizaciones y entregas
- Estadísticas y reportes

INSTRUCCIONES:
- Si te preguntan por stock o productos, menciona que puedes consultar el inventario
- Si te piden crear un evento, confirma los detalles (título, fecha, descripción)
- Si preguntan sobre Peru Compras, OSCE o NTPs, ofrece buscar información actualizada
- Sé conciso, amigable y profesional
- Responde en español
- Si no tienes información específica, sugiere usar las herramientas disponibles`

    let conversationHistory = systemContext + "\n\n"
    if (history && Array.isArray(history)) {
      history.forEach((msg: any) => {
        conversationHistory += `${msg.role === "user" ? "Usuario" : "Atlix"}: ${msg.content}\n`
      })
    }
    conversationHistory += `Usuario: ${message}\n`

    const lowerMessage = message.toLowerCase()
    let toolResponse = ""

    // Check for product/stock queries
    if (
      lowerMessage.includes("stock") ||
      lowerMessage.includes("producto") ||
      lowerMessage.includes("inventario") ||
      lowerMessage.includes("cuánto") ||
      lowerMessage.includes("cuanto")
    ) {
      const products = await getProductStock(supabase, profile?.company_id || user.company_id)
      if (products.length > 0) {
        toolResponse += "\n\n📦 INVENTARIO ACTUAL:\n"
        products.forEach((p: any) => {
          const stockStatus = p.current_stock <= p.minimum_stock ? "⚠️ BAJO" : "✅"
          toolResponse += `${stockStatus} ${p.name} (${p.code}): ${p.current_stock} ${p.unit_of_measure}\n`
        })
      } else {
        toolResponse += "\n\nNo encontré productos en el inventario."
      }
    }

    // Check for calendar event creation
    if (
      (lowerMessage.includes("crear") || lowerMessage.includes("agregar") || lowerMessage.includes("añadir")) &&
      (lowerMessage.includes("evento") || lowerMessage.includes("recordatorio") || lowerMessage.includes("cita"))
    ) {
      toolResponse +=
        "\n\n📅 Para crear un evento, necesito:\n1. Título del evento\n2. Fecha (YYYY-MM-DD)\n3. Descripción (opcional)\n\nPor favor proporciona estos datos."
    }

    // Check for government info searches
    if (
      lowerMessage.includes("peru compras") ||
      lowerMessage.includes("perucompras") ||
      lowerMessage.includes("osce") ||
      lowerMessage.includes("ntp") ||
      lowerMessage.includes("licitación") ||
      lowerMessage.includes("licitacion") ||
      lowerMessage.includes("convocatoria")
    ) {
      const searchResults = await searchGovernmentInfo(message)
      if (searchResults.length > 0) {
        toolResponse += "\n\n🔍 INFORMACIÓN ENCONTRADA:\n"
        searchResults.forEach((result: any, idx: number) => {
          toolResponse += `\n${idx + 1}. ${result.title}\n${result.snippet}\n🔗 ${result.link}\n`
        })
      }
    }

    const fullPrompt = conversationHistory + (toolResponse ? `\n[DATOS DEL SISTEMA]${toolResponse}\n` : "")

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-lite",
      contents: fullPrompt,
    })

    const aiResponse = response.text || "Lo siento, no pude generar una respuesta."

    console.log("✅ Gemini response generated successfully")

    return NextResponse.json({
      success: true,
      response: aiResponse,
      userId: user.id,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("❌ Error in Gemini API:", error)
    return NextResponse.json({ error: error.message || "Error interno del servidor" }, { status: 500 })
  }
}
