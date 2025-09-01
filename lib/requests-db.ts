import { createBrowserClient } from "@supabase/ssr"

export interface RequestFormData {
  request_type:
    | "late_justification"
    | "absence_justification"
    | "overtime_request"
    | "permission_request"
    | "equipment_request"
    | "general_request"
  incident_date: string
  end_date?: string
  incident_time?: string
  end_time?: string
  reason: string
  equipment_details?: any
  supporting_documents?: string[]
  priority?: "low" | "normal" | "high" | "urgent"
}

export interface RequestWithDetails {
  id: string
  user_id: string
  company_id: string
  department_id: string
  request_type: string
  incident_date: string
  end_date?: string
  incident_time?: string
  end_time?: string
  reason: string
  equipment_details?: any
  supporting_documents?: any
  status: "pending" | "in_progress" | "approved" | "rejected" | "expired"
  priority: "low" | "normal" | "high" | "urgent"
  reviewed_by?: string
  reviewed_at?: string
  review_comments?: string
  created_at: string
  updated_at: string
  expires_at: string
  requester_name: string
  requester_email: string
  department_name: string
  company_name: string
  reviewer_name?: string
  is_expired: boolean
  permission_validation?: string
  permission_days?: number
}

export interface ApprovalData {
  status: "approved" | "rejected"
  review_comments?: string
}

export class RequestsDB {
  private supabase

  constructor() {
    this.supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
  }

  // Crear nueva solicitud
  async createRequest(userId: string, companyId: string, departmentId: string, data: RequestFormData) {
    try {
      const { data: result, error } = await this.supabase
        .from("employee_requests")
        .insert({
          user_id: userId,
          company_id: companyId,
          department_id: departmentId,
          ...data,
          priority: data.priority || "normal",
        })
        .select()
        .single()

      if (error) throw error
      return { data: result, error: null }
    } catch (error) {
      console.error("Error creating request:", error)
      return { data: null, error }
    }
  }

  // Obtener solicitudes del usuario
  async getUserRequests(userId: string) {
    try {
      const { data, error } = await this.supabase
        .from("requests_with_details")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })

      if (error) throw error
      return { data: data || [], error: null }
    } catch (error) {
      console.error("Error fetching user requests:", error)
      return { data: [], error }
    }
  }

  // Obtener solicitudes para aprobación (supervisores)
  async getRequestsForApproval(userId: string, companyId: string) {
    try {
      // Primero verificar si el usuario es aprobador
      const { data: approverData, error: approverError } = await this.supabase
        .from("request_approvers")
        .select("department_id, request_types")
        .eq("approver_user_id", userId)
        .eq("company_id", companyId)
        .eq("is_active", true)

      if (approverError) throw approverError

      if (!approverData || approverData.length === 0) {
        return { data: [], error: null }
      }

      // Construir filtros basados en los permisos del aprobador
      let query = this.supabase
        .from("requests_with_details")
        .select("*")
        .eq("company_id", companyId)
        .in("status", ["pending", "in_progress"])

      // Aplicar filtros de departamento y tipos de solicitud
      const departmentIds = approverData.map((a) => a.department_id).filter(Boolean)
      const requestTypes = [...new Set(approverData.flatMap((a) => a.request_types))]

      if (departmentIds.length > 0) {
        query = query.in("department_id", departmentIds)
      }

      if (requestTypes.length > 0) {
        query = query.in("request_type", requestTypes)
      }

      const { data, error } = await query.order("created_at", { ascending: false })

      if (error) throw error
      return { data: data || [], error: null }
    } catch (error) {
      console.error("Error fetching requests for approval:", error)
      return { data: [], error }
    }
  }

  // Obtener todas las solicitudes (administradores)
  async getAllRequests(companyId?: string) {
    try {
      let query = this.supabase.from("requests_with_details").select("*")

      if (companyId) {
        query = query.eq("company_id", companyId)
      }

      const { data, error } = await query.order("created_at", { ascending: false })

      if (error) throw error
      return { data: data || [], error: null }
    } catch (error) {
      console.error("Error fetching all requests:", error)
      return { data: [], error }
    }
  }

  // Aprobar o rechazar solicitud
  async updateRequestStatus(requestId: string, reviewerId: string, approvalData: ApprovalData) {
    try {
      const { data, error } = await this.supabase
        .from("employee_requests")
        .update({
          status: approvalData.status,
          reviewed_by: reviewerId,
          reviewed_at: new Date().toISOString(),
          review_comments: approvalData.review_comments,
          updated_at: new Date().toISOString(),
        })
        .eq("id", requestId)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error("Error updating request status:", error)
      return { data: null, error }
    }
  }

  // Reasignar solicitud
  async reassignRequest(requestId: string, newReviewerId: string) {
    try {
      const { data, error } = await this.supabase
        .from("employee_requests")
        .update({
          reviewed_by: newReviewerId,
          status: "in_progress",
          updated_at: new Date().toISOString(),
        })
        .eq("id", requestId)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error("Error reassigning request:", error)
      return { data: null, error }
    }
  }

  // Obtener estadísticas de solicitudes
  async getRequestStats(companyId?: string) {
    try {
      let query = this.supabase
        .from("employee_requests")
        .select("status, request_type, department_id, departments(name)")

      if (companyId) {
        query = query.eq("company_id", companyId)
      }

      const { data, error } = await query

      if (error) throw error

      const stats = {
        total: data?.length || 0,
        pending: data?.filter((r) => r.status === "pending").length || 0,
        approved: data?.filter((r) => r.status === "approved").length || 0,
        rejected: data?.filter((r) => r.status === "rejected").length || 0,
        expired: data?.filter((r) => r.status === "expired").length || 0,
        by_type: {} as Record<string, number>,
        by_department: {} as Record<string, number>,
      }

      // Agrupar por tipo
      data?.forEach((request) => {
        stats.by_type[request.request_type] = (stats.by_type[request.request_type] || 0) + 1
      })

      // Agrupar por departamento
      data?.forEach((request) => {
        const deptName = request.departments?.name || "Sin Departamento"
        stats.by_department[deptName] = (stats.by_department[deptName] || 0) + 1
      })

      return { data: stats, error: null }
    } catch (error) {
      console.error("Error fetching request stats:", error)
      return { data: null, error }
    }
  }

  // Obtener aprobadores
  async getApprovers(companyId: string) {
    try {
      const { data, error } = await this.supabase
        .from("request_approvers")
        .select(`
          *,
          profiles!request_approvers_approver_user_id_fkey(full_name),
          departments(name)
        `)
        .eq("company_id", companyId)
        .eq("is_active", true)

      if (error) throw error

      const approvers =
        data?.map((approver) => ({
          ...approver,
          approver_name: approver.profiles?.full_name || "Usuario Desconocido",
          department_name: approver.departments?.name,
        })) || []

      return { data: approvers, error: null }
    } catch (error) {
      console.error("Error fetching approvers:", error)
      return { data: [], error }
    }
  }

  // Marcar solicitudes expiradas
  async markExpiredRequests() {
    try {
      const { data, error } = await this.supabase.rpc("mark_expired_requests")

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error("Error marking expired requests:", error)
      return { data: null, error }
    }
  }

  // Obtener equipos disponibles
  async getAvailableEquipment(companyId: string, departmentId?: string) {
    try {
      let query = this.supabase
        .from("available_equipment")
        .select("*")
        .eq("company_id", companyId)
        .eq("is_available", true)

      if (departmentId) {
        query = query.eq("department_id", departmentId)
      }

      const { data, error } = await query.order("equipment_name")

      if (error) throw error
      return { data: data || [], error: null }
    } catch (error) {
      console.error("Error fetching available equipment:", error)
      return { data: [], error }
    }
  }
}

// Instancia singleton
export const requestsDB = new RequestsDB()

// Constantes para tipos de solicitud
export const REQUEST_TYPE_LABELS = {
  late_justification: "Justificación de Tardanza",
  absence_justification: "Justificación de Ausencia",
  overtime_request: "Registro de Horas Extras",
  permission_request: "Solicitud de Permiso",
  equipment_request: "Solicitud de Equipos",
  general_request: "Solicitud General",
}

export const STATUS_LABELS = {
  pending: "Pendiente",
  in_progress: "En Proceso",
  approved: "Aprobada",
  rejected: "Rechazada",
  expired: "Expirada",
}

export const PRIORITY_LABELS = {
  low: "Baja",
  normal: "Normal",
  high: "Alta",
  urgent: "Urgente",
}

// Utilidades de validación
export const validateRequestData = (type: string, data: RequestFormData): string[] => {
  const errors: string[] = []

  if (!data.reason.trim()) {
    errors.push("La razón es requerida")
  }

  if (!data.incident_date) {
    errors.push("La fecha del incidente es requerida")
  }

  // Validaciones específicas por tipo
  switch (type) {
    case "late_justification":
    case "absence_justification":
      if (!data.incident_time) {
        errors.push("La hora del incidente es requerida")
      }
      break

    case "overtime_request":
      if (!data.incident_time || !data.end_time) {
        errors.push("Las horas de inicio y fin son requeridas")
      }
      break

    case "permission_request":
      const requestDate = new Date(data.incident_date)
      const today = new Date()
      const diffDays = Math.ceil((requestDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

      if (diffDays < 3) {
        errors.push("Los permisos deben solicitarse con al menos 3 días de anticipación")
      }
      break

    case "equipment_request":
      if (!data.equipment_details || !data.equipment_details.type) {
        errors.push("Los detalles del equipo son requeridos")
      }
      break
  }

  return errors
}
