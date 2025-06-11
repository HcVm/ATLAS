import { supabase } from "@/lib/supabase"

interface PublicDownloadTrackingData {
  documentId: string
  downloadType: "main_file" | "attachment"
  attachmentId?: string
  fileName?: string
  fileSize?: number
  referrer?: string
}

// Función para generar un ID de sesión único si no existe
function getSessionId() {
  let sessionId = localStorage.getItem("document_session_id")
  if (!sessionId) {
    sessionId = crypto.randomUUID()
    localStorage.setItem("document_session_id", sessionId)
  }
  return sessionId
}

export async function trackPublicDownload(data: PublicDownloadTrackingData) {
  try {
    // Obtener información del cliente
    const ipAddress = await fetchIpAddress()
    const userAgent = navigator.userAgent
    const sessionId = getSessionId()
    const geoInfo = await fetchGeoInfo(ipAddress)

    // Insertar registro de descarga pública
    const { error } = await supabase.from("document_downloads").insert({
      document_id: data.documentId,
      download_type: data.downloadType,
      attachment_id: data.attachmentId,
      file_name: data.fileName,
      file_size: data.fileSize,
      ip_address: ipAddress,
      user_agent: userAgent,
      downloaded_at: new Date().toISOString(),
      is_public_access: true,
      session_id: sessionId,
      referrer: data.referrer,
      country: geoInfo?.country,
      city: geoInfo?.city,
    })

    if (error) {
      console.error("Error tracking public download:", error)
    }
  } catch (error) {
    console.error("Error in public download tracking:", error)
    // No lanzamos error para no interrumpir la descarga
  }
}

export async function getCombinedDownloadStats(documentId: string) {
  try {
    const { data, error } = await supabase
      .from("document_downloads")
      .select(`
        *,
        profiles (id, full_name, email)
      `)
      .eq("document_id", documentId)
      .order("downloaded_at", { ascending: false })

    if (error) {
      throw error
    }

    return data || []
  } catch (error) {
    console.error("Error fetching combined download stats:", error)
    return []
  }
}

async function fetchIpAddress() {
  try {
    const response = await fetch("https://api.ipify.org?format=json")
    const data = await response.json()
    return data.ip
  } catch (error) {
    console.error("Error fetching IP:", error)
    return null
  }
}

async function fetchGeoInfo(ip: string | null) {
  if (!ip) return null

  try {
    const response = await fetch(`https://ipapi.co/${ip}/json/`)
    const data = await response.json()

    if (data.error) {
      return null
    }

    return {
      country: data.country_name,
      city: data.city,
      region: data.region,
      latitude: data.latitude,
      longitude: data.longitude,
    }
  } catch (error) {
    console.error("Error fetching geo info:", error)
    return null
  }
}
