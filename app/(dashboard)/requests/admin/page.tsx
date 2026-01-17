"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { createBrowserClient } from "@supabase/ssr"
import { useAuth } from "@/lib/auth-context"
import { useCompany } from "@/lib/company-context"
import {
  Search,
  BarChart3,
  Settings,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
  Loader2,
  User,
  Wrench,
  MessageSquare,
  Filter,
  Eye,
  Calendar,
  UserX,
  FileCheck
} from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { requestsDB, type RequestWithDetails, REQUEST_TYPE_LABELS, PRIORITY_LABELS } from "@/lib/requests-db"
import { RequestDetailsDialog } from "@/components/requests/request-details-dialog"
import { motion, AnimatePresence } from "framer-motion"

interface Request {
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
  status: "ingresada" | "en_gestion" | "aprobada" | "desaprobada" | "ejecutada" | "cancelada"
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
  requerimiento_numero?: string
  dirigido_a?: string
  area_solicitante?: string
  solicitante_nombre?: string
  motivo_requerimiento?: string
  fecha_entrega_solicitada?: string
  urgencia?: string
  items_requeridos?: any[]
}

const REQUEST_TYPES_CONFIG = {
  late_justification: {
    label: "Justificación de Tardanza",
    icon: Clock,
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-900/20",
    border: "border-orange-200 dark:border-orange-800",
  },
  absence_justification: {
    label: "Justificación de Ausencia",
    icon: UserX,
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-900/20",
    border: "border-red-200 dark:border-red-800",
  },
  overtime_request: {
    label: "Registro de Horas Extras",
    icon: Plus,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-900/20",
    border: "border-blue-200 dark:border-blue-800",
  },
  permission_request: {
    label: "Solicitud de Permiso",
    icon: Calendar,
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-50 dark:bg-green-900/20",
    border: "border-green-200 dark:border-green-800",
  },
  equipment_request: {
    label: "Solicitud de Equipos/Materiales",
    icon: Wrench,
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-50 dark:bg-purple-900/20",
    border: "border-purple-200 dark:border-purple-800",
  },
  general_request: {
    label: "Solicitud General",
    icon: MessageSquare,
    color: "text-slate-600 dark:text-slate-400",
    bg: "bg-slate-50 dark:bg-slate-900/20",
    border: "border-slate-200 dark:border-slate-800",
  },
}

const STATUS_CONFIG = {
  ingresada: {
    label: "Ingresada",
    icon: AlertCircle,
    color: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
  },
  en_gestion: {
    label: "En Gestión",
    icon: Loader2,
    color: "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800",
  },
  aprobada: {
    label: "Aprobada",
    icon: CheckCircle,
    color: "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
  },
  desaprobada: {
    label: "Desaprobada",
    icon: XCircle,
    color: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
  },
  ejecutada: {
    label: "Ejecutada",
    icon: CheckCircle,
    color: "text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800",
  },
  cancelada: {
    label: "Cancelada",
    icon: Clock,
    color: "text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/20 border-slate-200 dark:border-slate-800",
  },
}

interface RequestStats {
  total: number
  ingresada: number
  en_gestion: number
  aprobada: number
  desaprobada: number
  expired: number
  by_type: Record<string, number>
  by_department: Record<string, number>
}

interface Approver {
  id: string
  company_id: string
  department_id?: string
  approver_user_id: string
  request_types: string[]
  is_active: boolean
  approver_name: string
  department_name?: string
}

export default function AdminRequestsPage() {
  const { user } = useAuth()
  const { selectedCompany } = useCompany()
  const [requests, setRequests] = useState<RequestWithDetails[]>([])
  const [stats, setStats] = useState<RequestStats | null>(null)
  const [approvers, setApprovers] = useState<Approver[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [departmentFilter, setDepartmentFilter] = useState("all")
  const [selectedRequest, setSelectedRequest] = useState<RequestWithDetails | null>(null)
  const [showApproverDialog, setShowApproverDialog] = useState(false)
  const [departments, setDepartments] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [selectedApprover, setSelectedApprover] = useState<Approver | null>(null)
  const [approverForm, setApproverForm] = useState({
    approver_user_id: "",
    department_id: "",
    request_types: [] as string[],
    is_active: true,
  })
  const [savingApprover, setSavingApprover] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  useEffect(() => {
    if (user && selectedCompany) {
      fetchRequests()
      fetchStats()
      fetchApprovers()
      fetchDepartments()
      fetchUsers()
    }
  }, [user, selectedCompany])

  const fetchRequests = async () => {
    if (!selectedCompany?.id) return

    try {
      console.log("[v0] Fetching requests for company:", selectedCompany.id)
      const { data, error } = await requestsDB.getAllRequests(selectedCompany.id)

      if (error) {
        console.error("[v0] Error fetching requests:", error)
        throw error
      }

      console.log("[v0] Fetched requests:", data?.length || 0)
      setRequests(data || [])
    } catch (error) {
      console.error("Error fetching requests:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    if (!selectedCompany?.id) return

    try {
      console.log("[v0] Fetching stats for company:", selectedCompany.id)
      const { data, error } = await requestsDB.getRequestStats(selectedCompany.id)

      if (error) {
        console.error("[v0] Error fetching stats:", error)
        throw error
      }

      console.log("[v0] Fetched stats:", data)
      setStats(data)
    } catch (error) {
      console.error("Error fetching stats:", error)
    }
  }

  const fetchApprovers = async () => {
    if (!selectedCompany?.id) return

    try {
      console.log("[v0] Fetching approvers for company:", selectedCompany.id)
      const { data, error } = await requestsDB.getApprovers(selectedCompany.id)

      if (error) {
        console.error("[v0] Error fetching approvers:", error)
        throw error
      }

      console.log("[v0] Fetched approvers:", data?.length || 0)
      setApprovers(data || [])
    } catch (error) {
      console.error("Error fetching approvers:", error)
    }
  }

  const fetchDepartments = async () => {
    if (!selectedCompany?.id) return

    try {
      const { data, error } = await supabase.from("departments").select("*").eq("company_id", selectedCompany.id)

      if (error) throw error
      setDepartments(data || [])
    } catch (error) {
      console.error("Error fetching departments:", error)
    }
  }

  const fetchUsers = async () => {
    if (!selectedCompany?.id) return

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, role")
        .eq("company_id", selectedCompany.id)
        .in("role", ["supervisor", "admin"])

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error("Error fetching users:", error)
    }
  }

  const filteredRequests = requests.filter((request) => {
    const matchesSearch =
      (request.requester_name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (request.reason?.toLowerCase() || "").includes(searchTerm.toLowerCase())
    const matchesStatus =
      statusFilter === "all" || (statusFilter === "expired" ? request.is_expired : request.status === statusFilter)
    const matchesType = typeFilter === "all" || request.request_type === typeFilter
    const matchesDepartment = departmentFilter === "all" || request.department_name === departmentFilter

    return matchesSearch && matchesStatus && matchesType && matchesDepartment
  })

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "destructive"
      case "high":
        return "destructive"
      case "normal":
        return "secondary"
      case "low":
        return "outline"
      default:
        return "secondary"
    }
  }

  const reassignRequest = async (requestId: string, newApproverId: string) => {
    try {
      const { error } = await requestsDB.reassignRequest(requestId, newApproverId)

      if (error) throw error

      fetchRequests()
      setSelectedRequest(null)
    } catch (error) {
      console.error("Error reassigning request:", error)
    }
  }

  const saveApprover = async () => {

    if (!selectedCompany?.id || !approverForm.approver_user_id || approverForm.request_types.length === 0) {
      return
    }

    setSavingApprover(true)
    try {
      const approverData = {
        company_id: selectedCompany.id,
        approver_user_id: approverForm.approver_user_id,
        department_id:
          approverForm.department_id === "all" || !approverForm.department_id ? null : approverForm.department_id,
        request_types: approverForm.request_types,
        is_active: approverForm.is_active,
      }

      let response
      if (selectedApprover) {
        response = await fetch("/api/requests/approvers", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...approverData, id: selectedApprover.id }),
        })
      } else {
        response = await fetch("/api/requests/approvers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(approverData),
        })
      }
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Error desconocido")
      }

      await fetchApprovers()
      setShowApproverDialog(false)
      resetApproverForm()
    } catch (error) {
      console.error("[v0] Error saving approver:", error)
      alert(`Error al guardar el aprobador: ${error.message || "Error desconocido"}`)
    } finally {
      setSavingApprover(false)
    }
  }

  const resetApproverForm = () => {
    setSelectedApprover(null)
    setApproverForm({
      approver_user_id: "",
      department_id: "",
      request_types: [],
      is_active: true,
    })
  }

  const editApprover = (approver: Approver) => {
    setSelectedApprover(approver)
    setApproverForm({
      approver_user_id: approver.approver_user_id,
      department_id: approver.department_id || "",
      request_types: approver.request_types,
      is_active: approver.is_active,
    })
    setShowApproverDialog(true)
  }

  const toggleRequestType = (type: string) => {
    setApproverForm((prev) => ({
      ...prev,
      request_types: prev.request_types.includes(type)
        ? prev.request_types.filter((t) => t !== type)
        : [...prev.request_types, type],
    }))
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="relative">
          <div className="h-16 w-16 rounded-full border-4 border-slate-200 dark:border-slate-800 border-t-blue-600 animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-6 w-6 text-blue-600" />
          </div>
        </div>
        <p className="text-slate-500 dark:text-slate-400 animate-pulse">Cargando panel de administración...</p>
      </div>
    )
  }

  if (!selectedCompany) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="glass-card max-w-md w-full border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl">
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="h-8 w-8 text-slate-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">No hay empresa seleccionada</h3>
              <p className="text-slate-500 dark:text-slate-400 mt-2">
                Selecciona una empresa para ver las solicitudes
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-full space-y-8 p-6 pb-20"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
            Administración de Solicitudes
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-lg">
            Gestiona todas las solicitudes del sistema - {selectedCompany.name}
          </p>
        </div>
        <Button
          onClick={() => setShowApproverDialog(true)}
          className="bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 shadow-lg shadow-slate-900/10 transition-all hover:scale-105"
        >
          <Settings className="h-4 w-4 mr-2" />
          Gestionar Aprobadores
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: "Total", value: stats.total, icon: BarChart3, color: "text-slate-500", bg: "bg-slate-50 dark:bg-slate-900/20" },
            { label: "Ingresadas", value: stats.ingresada, icon: AlertCircle, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/20" },
            { label: "En Gestión", value: stats.en_gestion, icon: Loader2, color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-900/20" },
            { label: "Aprobadas", value: stats.aprobada, icon: CheckCircle, color: "text-green-500", bg: "bg-green-50 dark:bg-green-900/20" },
            { label: "Desaprobadas", value: stats.desaprobada, icon: XCircle, color: "text-red-500", bg: "bg-red-50 dark:bg-red-900/20" },
            { label: "Expiradas", value: stats.expired, icon: AlertCircle, color: "text-red-500", bg: "bg-red-50 dark:bg-red-900/20" },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="h-full border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl shadow-sm hover:shadow-md transition-all">
                <CardContent className="p-5 flex flex-col justify-between h-full">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{stat.label}</p>
                    <div className={`p-2 rounded-lg ${stat.bg}`}>
                      <stat.icon className={`h-4 w-4 ${stat.color}`} />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">
                    {stat.value}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Tabs defaultValue="requests" className="space-y-6">
        <TabsList className="bg-white/50 dark:bg-slate-900/50 p-1 border border-slate-200/50 dark:border-slate-800/50 backdrop-blur-sm rounded-xl w-full flex overflow-x-auto">
          <TabsTrigger value="requests" className="flex-1 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm transition-all">Solicitudes</TabsTrigger>
          <TabsTrigger value="analytics" className="flex-1 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm transition-all">Análisis</TabsTrigger>
          <TabsTrigger value="approvers" className="flex-1 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm transition-all">Aprobadores</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-6">
          {/* Filters */}
          <Card className="border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Filter className="h-5 w-5 text-slate-500" />
                Filtros de Búsqueda
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Buscar por empleado o razón..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los Estados</SelectItem>
                    <SelectItem value="ingresada">Ingresada</SelectItem>
                    <SelectItem value="en_gestion">En Gestión</SelectItem>
                    <SelectItem value="aprobada">Aprobada</SelectItem>
                    <SelectItem value="desaprobada">Desaprobada</SelectItem>
                    <SelectItem value="ejecutada">Ejecutada</SelectItem>
                    <SelectItem value="cancelada">Cancelada</SelectItem>
                    <SelectItem value="expired">Expirada</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los Tipos</SelectItem>
                    {Object.entries(REQUEST_TYPE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                    <SelectValue placeholder="Departamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los Departamentos</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.name}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Requests List */}
          <div className="grid gap-4">
            {filteredRequests.length === 0 ? (
              <Card className="border-dashed border-2 border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20">
                <CardContent className="p-12 text-center flex flex-col items-center">
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                    <Search className="h-8 w-8 text-slate-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                    No se encontraron solicitudes
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400">
                    {requests.length === 0
                      ? "No hay solicitudes registradas en el sistema"
                      : "No hay solicitudes que coincidan con los filtros aplicados"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <AnimatePresence>
                {filteredRequests.map((request, index) => {
                  const statusConfig = STATUS_CONFIG[request.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.ingresada
                  const StatusIcon = statusConfig.icon
                  const typeConfig = REQUEST_TYPES_CONFIG[request.request_type as keyof typeof REQUEST_TYPES_CONFIG]

                  return (
                    <motion.div
                      key={request.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className="hover:shadow-md transition-all border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl">
                        <CardContent className="p-6">
                          <div className="flex flex-col md:flex-row items-start justify-between gap-4">
                            <div className="space-y-3 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="outline" className={`${statusConfig.color} border`}>
                                  <StatusIcon className="h-3 w-3 mr-1" />
                                  {statusConfig.label}
                                </Badge>
                                <Badge variant={getPriorityBadgeVariant(request.priority)}>
                                  {PRIORITY_LABELS[request.priority as keyof typeof PRIORITY_LABELS]}
                                </Badge>
                                <Badge variant="outline" className="bg-slate-50 dark:bg-slate-900">
                                  {typeConfig?.label || request.request_type}
                                </Badge>
                                {request.is_expired && (
                                  <Badge variant="destructive" className="bg-red-500">Expirada</Badge>
                                )}
                              </div>

                              <div>
                                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                                  {request.requester_name}
                                </h3>
                                <div className="flex items-center text-sm text-slate-500 dark:text-slate-400 mt-1">
                                  <span>{request.department_name}</span>
                                  <span className="mx-2">•</span>
                                  <span>{request.requester_email}</span>
                                </div>
                              </div>

                              <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                                <p className="text-sm text-slate-700 dark:text-slate-300 italic">
                                  "{request.reason}"
                                </p>
                              </div>

                              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                                <div className="flex items-center gap-1.5">
                                  <Calendar className="h-3.5 w-3.5" />
                                  <span>Creada: {format(new Date(request.created_at), "dd/MM/yyyy HH:mm", { locale: es })}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Clock className="h-3.5 w-3.5" />
                                  <span>Expira: {format(new Date(request.expires_at), "dd/MM/yyyy HH:mm", { locale: es })}</span>
                                </div>
                                {request.reviewer_name && (
                                  <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                                    <User className="h-3.5 w-3.5" />
                                    <span>Revisor: {request.reviewer_name}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex gap-2 w-full md:w-auto">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedRequest(request)}
                                className="flex-1 md:flex-none"
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Ver Detalles
                              </Button>
                              {(request.status === "ingresada" || request.status === "en_gestion") && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedRequest(request)}
                                  className="flex-1 md:flex-none"
                                >
                                  Reasignar
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            )}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl shadow-sm">
                <CardHeader>
                  <CardTitle>Solicitudes por Tipo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(stats.by_type).map(([type, count]) => (
                      <div key={type} className="flex justify-between items-center p-2 rounded hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                        <span className="text-sm font-medium">{REQUEST_TYPE_LABELS[type as keyof typeof REQUEST_TYPE_LABELS]}</span>
                        <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800">{count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card className="border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl shadow-sm">
                <CardHeader>
                  <CardTitle>Solicitudes por Departamento</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(stats.by_department).map(([dept, count]) => (
                      <div key={dept} className="flex justify-between items-center p-2 rounded hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                        <span className="text-sm font-medium">{dept}</span>
                        <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800">{count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="approvers" className="space-y-6">
          <Card className="border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl shadow-sm">
            <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <CardTitle>Aprobadores Configurados</CardTitle>
                <CardDescription>Usuarios autorizados para aprobar solicitudes por departamento</CardDescription>
              </div>
              <Button
                onClick={() => {
                  resetApproverForm()
                  setShowApproverDialog(true)
                }}
                className="bg-slate-900 dark:bg-white text-white dark:text-slate-900"
              >
                <Plus className="h-4 w-4 mr-2" />
                Agregar Aprobador
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {approvers.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                    <Settings className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No hay aprobadores configurados</h3>
                    <p className="text-muted-foreground mb-4">Agrega usuarios que puedan aprobar solicitudes</p>
                    <Button
                      onClick={() => {
                        resetApproverForm()
                        setShowApproverDialog(true)
                      }}
                      variant="outline"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar Primer Aprobador
                    </Button>
                  </div>
                ) : (
                  approvers.map((approver) => (
                    <div key={approver.id} className="flex flex-col md:flex-row items-center justify-between p-4 border border-slate-200 dark:border-slate-800 rounded-lg bg-white/50 dark:bg-slate-900/30 hover:shadow-md transition-all">
                      <div className="flex-1 mb-4 md:mb-0 text-center md:text-left">
                        <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                          <h4 className="font-semibold text-lg">{approver.approver_name}</h4>
                          {!approver.is_active && <Badge variant="destructive">Inactivo</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {approver.department_name || "Todos los departamentos"}
                        </p>
                        <div className="flex flex-wrap justify-center md:justify-start gap-1">
                          {approver.request_types.map((type) => (
                            <Badge key={type} variant="secondary" className="text-xs bg-slate-100 dark:bg-slate-800">
                              {REQUEST_TYPE_LABELS[type as keyof typeof REQUEST_TYPE_LABELS]}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Button variant="outline" size="sm" onClick={() => editApprover(approver)}>
                          Editar
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Approver Management Dialog */}
      <Dialog
        open={showApproverDialog}
        onOpenChange={(open) => {
          setShowApproverDialog(open)
          if (!open) resetApproverForm()
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedApprover ? "Editar Aprobador" : "Agregar Aprobador"}</DialogTitle>
            <DialogDescription>Configura los permisos de aprobación para un usuario</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Usuario Aprobador</Label>
                <Select
                  value={approverForm.approver_user_id}
                  onValueChange={(value) => setApproverForm((prev) => ({ ...prev, approver_user_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar usuario" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name} ({user.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Departamento (Opcional)</Label>
                <Select
                  value={approverForm.department_id || "all"}
                  onValueChange={(value) => setApproverForm((prev) => ({ ...prev, department_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los departamentos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los departamentos</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Tipos de Solicitudes que puede Aprobar</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 border rounded-lg bg-slate-50 dark:bg-slate-900/50">
                {Object.entries(REQUEST_TYPE_LABELS).map(([key, label]) => (
                  <div key={key} className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id={key}
                      checked={approverForm.request_types.includes(key)}
                      onChange={() => toggleRequestType(key)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <Label htmlFor={key} className="text-sm font-normal cursor-pointer">
                      {label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-3 p-4 border rounded-lg bg-slate-50 dark:bg-slate-900/50">
              <Switch
                checked={approverForm.is_active}
                onCheckedChange={(checked) => setApproverForm((prev) => ({ ...prev, is_active: checked }))}
              />
              <div className="space-y-1">
                <Label>Estado Activo</Label>
                <p className="text-xs text-muted-foreground">
                  Desactiva esta opción para revocar temporalmente los permisos sin eliminar el registro.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproverDialog(false)} disabled={savingApprover}>
              Cancelar
            </Button>
            <Button
              onClick={saveApprover}
              disabled={savingApprover || !approverForm.approver_user_id || approverForm.request_types.length === 0}
              className="bg-slate-900 dark:bg-white text-white dark:text-slate-900"
            >
              {savingApprover ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : selectedApprover ? (
                "Actualizar Aprobador"
              ) : (
                "Crear Aprobador"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request Details Dialog */}
      {selectedRequest && (
        <RequestDetailsDialog
          request={selectedRequest}
          open={!!selectedRequest}
          onOpenChange={() => setSelectedRequest(null)}
          onApprove={async (requestId, comments) => {
            if (!user?.id) return
            await requestsDB.updateRequestStatus(requestId, user.id, { status: "aprobada", review_comments: comments })
            fetchRequests()
            setSelectedRequest(null)
          }}
          onReject={async (requestId, comments) => {
            if (!user?.id) return
            await requestsDB.updateRequestStatus(requestId, user.id, {
              status: "desaprobada",
              review_comments: comments,
            })
            fetchRequests()
            setSelectedRequest(null)
          }}
          showActions={true}
        />
      )}
    </motion.div>
  )
}
