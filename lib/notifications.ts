import { supabase } from "./supabase"

export interface CreateNotificationParams {
  userId: string
  title: string
  message: string
  type?: string
  relatedId?: string
  companyId?: string | null // Cambiado a string | null
}

export async function createNotification(params: CreateNotificationParams) {
  try {
    const { error } = await supabase.from("notifications").insert({
      user_id: params.userId,
      title: params.title,
      message: params.message,
      type: params.type || "system",
      related_id: params.relatedId || null,
      company_id: params.companyId || null, // Incluir company_id
      read: false,
    })

    if (error) {
      console.error("Error creating notification:", error)
      return { success: false, error }
    }

    return { success: true }
  } catch (error) {
    console.error("Failed to create notification:", error)
    return { success: false, error }
  }
}

export async function getUnreadNotificationsCount(userId: string, companyId?: string | null): Promise<number> {
  try {
    let query = supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("read", false)

    // Filtrar por empresa si se proporciona (para admins)
    if (companyId) {
      query = query.eq("company_id", companyId)
    }

    const { count, error } = await query

    if (error) {
      console.error("Error getting unread notifications count:", error)
      return 0
    }

    return count || 0
  } catch (error) {
    console.error("Failed to get unread notifications count:", error)
    return 0
  }
}

export async function markNotificationAsRead(notificationId: string) {
  try {
    const { error } = await supabase.from("notifications").update({ read: true }).eq("id", notificationId)

    if (error) {
      console.error("Error marking notification as read:", error)
      return { success: false, error }
    }

    return { success: true }
  } catch (error) {
    console.error("Failed to mark notification as read:", error)
    return { success: false, error }
  }
}

export async function deleteNotification(notificationId: string) {
  try {
    const { error } = await supabase.from("notifications").delete().eq("id", notificationId)

    if (error) {
      console.error("Error deleting notification:", error)
      return { success: false, error }
    }

    return { success: true }
  } catch (error) {
    console.error("Failed to delete notification:", error)
    return { success: false, error }
  }
}

export async function getUserNotifications(
  userId: string,
  filter: "all" | "unread" | "read" = "all",
  companyId?: string | null,
) {
  try {
    let query = supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    // Filtrar por empresa si se proporciona (para admins)
    if (companyId) {
      query = query.eq("company_id", companyId)
    }

    if (filter === "unread") {
      query = query.eq("read", false)
    } else if (filter === "read") {
      query = query.eq("read", true)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error getting user notifications:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("Failed to get user notifications:", error)
    return []
  }
}

export async function markAllNotificationsAsRead(userId: string, companyId?: string | null) {
  try {
    let query = supabase.from("notifications").update({ read: true }).eq("user_id", userId).eq("read", false)

    // Filtrar por empresa si se proporciona (para admins)
    if (companyId) {
      query = query.eq("company_id", companyId)
    }

    const { error } = await query

    if (error) {
      console.error("Error marking all notifications as read:", error)
      return { success: false, error }
    }

    return { success: true }
  } catch (error) {
    console.error("Failed to mark all notifications as read:", error)
    return { success: false, error }
  }
}

// Función para obtener información relacionada basada en el tipo y ID
export async function getRelatedInfo(type: string, relatedId: string | null) {
  if (!relatedId && type !== "attendance_missing") return null

  try {
    switch (type) {
      case "document_created":
      case "document_moved":
      case "document_status_changed":
        const { data: document } = await supabase
          .from("documents")
          .select("id, title, document_number")
          .eq("id", relatedId)
          .single()
        return { type: "document", data: document }
      case "news_published":
        const { data: news } = await supabase.from("news").select("id, title").eq("id", relatedId).single()
        return { type: "news", data: news }
      case "department_created":
        const { data: department } = await supabase.from("departments").select("id, name").eq("id", relatedId).single()
        return { type: "department", data: department }
      case "sale_created":
        const { data: sale } = await supabase
          .from("sales")
          .select("id, entity_name, total_items, total_sale")
          .eq("id", relatedId)
          .single()
        return { type: "sale", data: sale }
      case "quotation_review":
      case "quotation_status_update":
        const { data: quotation } = await supabase
          .from("quotations")
          .select("id, quotation_number, entity_name, status")
          .eq("id", relatedId)
          .single()
        return { type: "quotation", data: quotation }
      case "payment_voucher_uploaded":
      case "payment_voucher_confirmed":
        const { data: paymentVoucher } = await supabase
          .from("payment_vouchers")
          .select(`
            id, 
            sale_id, 
            status,
            sales!inner(id, sale_number, entity_name, total_sale)
          `)
          .eq("id", relatedId)
          .single()
        return { type: "payment_voucher", data: paymentVoucher }
      case "attendance_late":
      case "attendance_incomplete":
        const { data: attendance } = await supabase
          .from("attendance")
          .select("id, attendance_date, check_in_time, check_out_time, is_late, late_minutes")
          .eq("id", relatedId)
          .single()
        return { type: "attendance", data: attendance }
      case "attendance_missing":
        // For missing attendance, there's no related record, so return a generic response
        return { type: "attendance_missing", data: { message: "Ausencia sin justificar" } }
      default:
        return null
    }
  } catch (error) {
    console.error("Error getting related info:", error)
    return null
  }
}
