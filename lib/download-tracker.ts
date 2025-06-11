import { supabase } from "./supabase"

interface PublicDownloadData {
  documentId: string
  downloadType: "main_file" | "attachment"
  attachmentId?: string
  fileName?: string
  fileSize?: number
}

// Generar un session ID único para rastrear sesiones anónimas
const generateSessionId = (): string => {
  const timestamp = Date.now().toString(36)
  const randomStr = Math.random().toString(36).substring(2, 15)
  return `pub_${timestamp}_${randomStr}`
}

// Obtener o crear session ID para la sesión actual
const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem("public_session_id")
  if (!sessionId) {
    sessionId = generateSessionId()
    sessionStorage.setItem("public_session_id", sessionId)
  }
  return sessionId
}

// Obtener información de geolocalización
const getLocationInfo = async () => {
  try {
    const response = await fetch("https://ipapi.co/json/")
    if (response.ok) {
      const data = await response.json()
      return {
        country: data.country_name || null,
        city: data.city || null,
        ip: data.ip || null,
      }
    }
  } catch (error) {
    console.log("Could not get location info:", error)
  }
  return { country: null, city: null, ip: null }
}

export const trackPublicDownload = async (data: PublicDownloadData) => {
  try {
    const sessionId = getSessionId()
    const locationInfo = await getLocationInfo()
    const userAgent = navigator.userAgent
    const referrer = document.referrer || null

    const { error } = await supabase.from("document_downloads").insert({
      document_id: data.documentId,
      user_id: null, // Usuario anónimo
      download_type: data.downloadType,
      attachment_id: data.attachmentId,
      session_id: sessionId,
      ip_address: locationInfo.ip,
      user_agent: userAgent,
      referrer: referrer,
      country: locationInfo.country,
      city: locationInfo.city,
      file_name: data.fileName,
      file_size: data.fileSize,
      is_public_access: true,
      downloaded_at: new Date().toISOString(),
    })

    if (error) {
      console.error("Error tracking public download:", error)
    } else {
      console.log("Public download tracked successfully")
    }
  } catch (error) {
    console.error("Error in trackPublicDownload:", error)
  }
}

export const getPublicDownloadStats = async (documentId: string) => {
  try {
    const { data, error } = await supabase
      .from("document_downloads")
      .select("*")
      .eq("document_id", documentId)
      .eq("is_public_access", true)
      .order("downloaded_at", { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error("Error getting public download stats:", error)
    return []
  }
}

// Función para obtener estadísticas combinadas (autenticadas + públicas)
export const getCombinedDownloadStats = async (documentId: string) => {
  try {
    const { data, error } = await supabase
      .from("document_downloads")
      .select(`
        *,
        profiles!document_downloads_user_id_fkey (
          id,
          full_name,
          email
        )
      `)
      .eq("document_id", documentId)
      .order("downloaded_at", { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error("Error getting combined download stats:", error)
    return []
  }
}
