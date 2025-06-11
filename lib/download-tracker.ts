import { supabase } from "@/lib/supabase"

interface DownloadTrackingData {
  documentId: string
  userId: string
  downloadType: "main_file" | "attachment"
  attachmentId?: string
  fileName?: string
  fileSize?: number
}

export async function trackDownload(data: DownloadTrackingData) {
  try {
    // Obtener información del cliente
    const ipAddress = await fetchIpAddress()
    const userAgent = navigator.userAgent

    // Insertar registro de descarga
    const { error } = await supabase.from("document_downloads").insert({
      document_id: data.documentId,
      user_id: data.userId,
      download_type: data.downloadType,
      attachment_id: data.attachmentId,
      file_name: data.fileName,
      file_size: data.fileSize,
      ip_address: ipAddress,
      user_agent: userAgent,
      downloaded_at: new Date().toISOString(),
    })

    if (error) {
      console.error("Error tracking download:", error)
    }
  } catch (error) {
    console.error("Error in download tracking:", error)
    // No lanzamos error para no interrumpir la descarga
  }
}

export async function getDocumentDownloadStats(documentId: string) {
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
    console.error("Error fetching download stats:", error)
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
