"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
} from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { requestsDB, type RequestWithDetails, REQUEST_TYPE_LABELS, PRIORITY_LABELS } from "@/lib/requests-db"
import { RequestDetailsDialog } from "@/components/requests/request-details-dialog"

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

const REQUEST_TYPES = {
  late_justification: {
    title: "Justificación de Tardanza",
    description: "Justificar llegadas tardías al trabajo",
    icon: Clock,
    color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    timeLimit: "24 horas",
    urgent: true,
  },
  absence_justification: {
    title: "Justificación de Ausencia",
    description: "Justificar ausencias al trabajo",
    icon: User,
    color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    timeLimit: "24 horas",
    urgent: true,
  },
  overtime_request: {
    title: "Registro de Horas Extras",
    description: "Registrar horas extras trabajadas",
    icon: Plus,
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    timeLimit: "24 horas",
    urgent: true,
  },
  permission_request: {
    title: "Solicitud de Permiso",
    description: "Solicitar permisos y vacaciones",
    icon: AlertCircle,
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    timeLimit: "3 días",
    urgent: false,
  },
  equipment_request: {
    title: "Solicitud de Equipos/Materiales",
    description: "Solicitar equipos o materiales para tu departamento",
    icon: Wrench,
    color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    timeLimit: "Sin límite",
    urgent: false,
  },
  general_request: {
    title: "Solicitud General",
    description: "Comentarios, sugerencias y solicitudes generales",
    icon: MessageSquare,
    color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
    timeLimit: "Sin límite",
    urgent: false,
  },
}

const STATUS_CONFIG = {
  INGRESADA: {
    label: "Ingresada",
    icon: AlertCircle,
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  },
  EN_GESTION: {
    label: "En Gestión",
    icon: Loader2,
    color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  },
  APROBADA: {
    label: "Aprobada",
    icon: CheckCircle,
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  },
  DESAPROBADA: {
    label: "Desaprobada",
    icon: XCircle,
    color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  },
  EJECUTADA: {
    label: "Ejecutada",
    icon: CheckCircle,
    color: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
  },
  CANCELADA: {
    label: "Cancelada",
    icon: Clock,
    color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
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
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!selectedCompany) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No hay empresa seleccionada</h3>
          <p className="text-muted-foreground">Selecciona una empresa para ver las solicitudes</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Administración de Solicitudes</h1>
          <p className="text-muted-foreground">Gestiona todas las solicitudes del sistema - {selectedCompany.name}</p>
        </div>
        <Button onClick={() => setShowApproverDialog(true)}>
          <Settings className="h-4 w-4 mr-2" />
          Gestionar Aprobadores
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ingresadas</CardTitle>
              <AlertCircle className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.ingresada}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">En Gestión</CardTitle>
              <Loader2 className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.en_gestion}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aprobadas</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.aprobada}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Desaprobadas</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.desaprobada}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expiradas</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.expired}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="requests" className="space-y-4">
        <TabsList>
          <TabsTrigger value="requests">Solicitudes</TabsTrigger>
          <TabsTrigger value="analytics">Análisis</TabsTrigger>
          <TabsTrigger value="approvers">Aprobadores</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filtros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por empleado o razón..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
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
                  <SelectTrigger>
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
                  <SelectTrigger>
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
              <Card>
                <CardContent className="p-8 text-center">
                  <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No se encontraron solicitudes</h3>
                  <p className="text-muted-foreground">
                    {requests.length === 0
                      ? "No hay solicitudes registradas en el sistema"
                      : "No hay solicitudes que coincidan con los filtros aplicados"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredRequests.map((request) => {
                const StatusIcon = STATUS_CONFIG[request.status].icon
                return (
                  <Card key={request.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <Badge className={STATUS_CONFIG[request.status].color}>
                              <StatusIcon className="h-4 w-4 mr-1" />
                              {STATUS_CONFIG[request.status].label}
                            </Badge>
                            <Badge variant={getPriorityBadgeVariant(request.priority)}>
                              {PRIORITY_LABELS[request.priority as keyof typeof PRIORITY_LABELS]}
                            </Badge>
                            <Badge className={REQUEST_TYPES[request.request_type].color}>
                              {REQUEST_TYPES[request.request_type].title}
                            </Badge>
                            {request.is_expired && <Badge variant="destructive">Expirada</Badge>}
                          </div>
                          <div>
                            <h3 className="font-semibold">{request.requester_name}</h3>
                            <p className="text-sm text-muted-foreground">{request.department_name}</p>
                          </div>
                          <p className="text-sm">{request.reason}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>
                              Creada: {format(new Date(request.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
                            </span>
                            <span>
                              Expira: {format(new Date(request.expires_at), "dd/MM/yyyy HH:mm", { locale: es })}
                            </span>
                            {request.reviewer_name && <span>Revisor: {request.reviewer_name}</span>}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => setSelectedRequest(request)}>
                            Ver Detalles
                          </Button>
                          {(request.status === "ingresada" || request.status === "en_gestion") && (
                            <Button variant="outline" size="sm" onClick={() => setSelectedRequest(request)}>
                              Reasignar
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Solicitudes por Tipo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(stats.by_type).map(([type, count]) => (
                      <div key={type} className="flex justify-between items-center">
                        <span className="text-sm">{REQUEST_TYPE_LABELS[type as keyof typeof REQUEST_TYPE_LABELS]}</span>
                        <Badge variant="secondary">{count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Solicitudes por Departamento</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(stats.by_department).map(([dept, count]) => (
                      <div key={dept} className="flex justify-between items-center">
                        <span className="text-sm">{dept}</span>
                        <Badge variant="secondary">{count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="approvers" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Aprobadores Configurados</CardTitle>
                <CardDescription>Usuarios autorizados para aprobar solicitudes por departamento</CardDescription>
              </div>
              <Button
                onClick={() => {
                  resetApproverForm()
                  setShowApproverDialog(true)
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Agregar Aprobador
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {approvers.length === 0 ? (
                  <div className="text-center py-8">
                    <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No hay aprobadores configurados</h3>
                    <p className="text-muted-foreground mb-4">Agrega usuarios que puedan aprobar solicitudes</p>
                    <Button
                      onClick={() => {
                        resetApproverForm()
                        setShowApproverDialog(true)
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar Primer Aprobador
                    </Button>
                  </div>
                ) : (
                  approvers.map((approver) => (
                    <div key={approver.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{approver.approver_name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {approver.department_name || "Todos los departamentos"}
                        </p>
                        <div className="flex gap-1 mt-2">
                          {approver.request_types.map((type) => (
                            <Badge key={type} variant="outline" className="text-xs">
                              {REQUEST_TYPE_LABELS[type as keyof typeof REQUEST_TYPE_LABELS]}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={approver.is_active} disabled />
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
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Usuario Aprobador</Label>
                <Select
                  value={approverForm.approver_user_id}
                  onValueChange={(value) => setApproverForm((prev) => ({ ...prev, approver_user_id: value }))}
                >
                  <SelectTrigger className="mt-1">
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
              <div>
                <Label>Departamento (Opcional)</Label>
                <Select
                  value={approverForm.department_id || "all"}
                  onValueChange={(value) => setApproverForm((prev) => ({ ...prev, department_id: value }))}
                >
                  <SelectTrigger className="mt-1">
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

            <div>
              <Label>Tipos de Solicitudes que puede Aprobar</Label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                {Object.entries(REQUEST_TYPE_LABELS).map(([key, label]) => (
                  <div key={key} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={key}
                      checked={approverForm.request_types.includes(key)}
                      onChange={() => toggleRequestType(key)}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor={key} className="text-sm font-normal">
                      {label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={approverForm.is_active}
                onCheckedChange={(checked) => setApproverForm((prev) => ({ ...prev, is_active: checked }))}
              />
              <Label>Activo</Label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowApproverDialog(false)} disabled={savingApprover}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                saveApprover()
              }}
              disabled={savingApprover || !approverForm.approver_user_id || approverForm.request_types.length === 0}
            >
              {savingApprover ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Guardando...
                </>
              ) : selectedApprover ? (
                "Actualizar"
              ) : (
                "Crear"
              )}
            </Button>
          </div>
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
    </div>
  )
}
