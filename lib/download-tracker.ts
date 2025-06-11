import { supabase } from "./supabase"

interface DownloadTrackingData {
  documentId: string
  userId: string
  downloadType: "main_file" | "attachment"
  attachmentId?: string
  fileName?: string
  fileSize?: number
}

export const trackDownload = async (data: DownloadTrackingData) => {
  try {
    // Obtener información del navegador
    const userAgent = navigator.userAgent

    // Intentar obtener IP (esto funcionará solo si tienes un servicio para ello)
    let ipAddress = null
    try {
      const ipResponse = await fetch("https://api.ipify.org?format=json")
      const ipData = await ipResponse.json()
      ipAddress = ipData.ip
    } catch (error) {
      console.log("Could not get IP address:", error)
    }

    const { error } = await supabase.from("document_downloads").insert({
      document_id: data.documentId,
      user_id: data.userId,
      download_type: data.downloadType,
      attachment_id: data.attachmentId,
      ip_address: ipAddress,
      user_agent: userAgent,
      file_name: data.fileName,
      file_size: data.fileSize,
      downloaded_at: new Date().toISOString(),
    })

    if (error) {
      console.error("Error tracking download:", error)
    }
  } catch (error) {
    console.error("Error in trackDownload:", error)
  }
}

export const getDocumentDownloadStats = async (documentId: string) => {
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
    console.error("Error getting download stats:", error)
    return []
  }
}

export const getUserDownloadHistory = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from("document_downloads")
      .select(`
        *,
        documents!document_downloads_document_id_fkey (
          id,
          title,
          document_number
        )
      `)
      .eq("user_id", userId)
      .order("downloaded_at", { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error("Error getting user download history:", error)
    return []
  }
}
