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
import { Search, BarChart3, Settings, Clock, CheckCircle, XCircle, AlertCircle, Plus } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface RequestWithDetails {
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
  status: string
  priority: string
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

interface RequestStats {
  total: number
  pending: number
  approved: number
  rejected: number
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

const REQUEST_TYPE_LABELS = {
  late_justification: "Justificación de Tardanza",
  absence_justification: "Justificación de Ausencia",
  overtime_request: "Registro de Horas Extras",
  permission_request: "Solicitud de Permiso",
  equipment_request: "Solicitud de Equipos",
  general_request: "Solicitud General",
}

const STATUS_LABELS = {
  pending: "Pendiente",
  in_progress: "En Proceso",
  approved: "Aprobada",
  rejected: "Rechazada",
  expired: "Expirada",
}

const PRIORITY_LABELS = {
  low: "Baja",
  normal: "Normal",
  high: "Alta",
  urgent: "Urgente",
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
    if (user) {
      fetchRequests()
      fetchStats()
      fetchApprovers()
      fetchDepartments()
      fetchUsers()
    }
  }, [user])

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from("employee_requests")
        .select(`
          *,
          profiles!employee_requests_user_id_fkey(full_name, email),
          departments!employee_requests_department_id_fkey(name),
          companies!employee_requests_company_id_fkey(name),
          reviewer:profiles!employee_requests_reviewed_by_fkey(full_name)
        `)
        .order("created_at", { ascending: false })

      if (error) throw error

      const transformedData =
        data?.map((request) => ({
          ...request,
          requester_name: request.profiles?.full_name || "Usuario Desconocido",
          requester_email: request.profiles?.email || "",
          department_name: request.departments?.name || "Sin Departamento",
          company_name: request.companies?.name || "Sin Empresa",
          reviewer_name: request.reviewer?.full_name || null,
          is_expired: new Date(request.expires_at) < new Date(),
        })) || []

      setRequests(transformedData)
    } catch (error) {
      console.error("Error fetching requests:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase.from("employee_requests").select(`
          status, 
          request_type, 
          department_id, 
          departments!employee_requests_department_id_fkey(name)
        `)

      if (error) throw error

      const stats: RequestStats = {
        total: data?.length || 0,
        pending: data?.filter((r) => r.status === "pending").length || 0,
        approved: data?.filter((r) => r.status === "approved").length || 0,
        rejected: data?.filter((r) => r.status === "rejected").length || 0,
        expired: data?.filter((r) => r.status === "expired").length || 0,
        by_type: {},
        by_department: {},
      }

      data?.forEach((request) => {
        stats.by_type[request.request_type] = (stats.by_type[request.request_type] || 0) + 1
      })

      data?.forEach((request) => {
        const deptName = request.departments?.name || "Sin Departamento"
        stats.by_department[deptName] = (stats.by_department[deptName] || 0) + 1
      })

      setStats(stats)
    } catch (error) {
      console.error("Error fetching stats:", error)
    }
  }

  const fetchApprovers = async () => {
    try {
      const { data, error } = await supabase
        .from("request_approvers")
        .select(`
          *,
          profiles!request_approvers_approver_user_id_fkey(full_name),
          departments(name)
        `)
        .eq("is_active", true)

      if (error) throw error

      const approversData =
        data?.map((approver) => ({
          ...approver,
          approver_name: approver.profiles?.full_name || "Usuario Desconocido",
          department_name: approver.departments?.name,
        })) || []

      setApprovers(approversData)
    } catch (error) {
      console.error("Error fetching approvers:", error)
    }
  }

  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase.from("departments").select("*")

      if (error) throw error
      setDepartments(data || [])
    } catch (error) {
      console.error("Error fetching departments:", error)
    }
  }

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, role")
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
    const matchesStatus = statusFilter === "all" || request.status === statusFilter
    const matchesType = typeFilter === "all" || request.request_type === typeFilter
    const matchesDepartment = departmentFilter === "all" || request.department_name === departmentFilter

    return matchesSearch && matchesStatus && matchesType && matchesDepartment
  })

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "approved":
        return "default"
      case "rejected":
        return "destructive"
      case "pending":
        return "secondary"
      case "in_progress":
        return "outline"
      case "expired":
        return "destructive"
      default:
        return "secondary"
    }
  }

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
      const { error } = await supabase
        .from("employee_requests")
        .update({
          reviewed_by: newApproverId,
          status: "in_progress",
          updated_at: new Date().toISOString(),
        })
        .eq("id", requestId)

      if (error) throw error

      fetchRequests()
      setSelectedRequest(null)
    } catch (error) {
      console.error("Error reassigning request:", error)
    }
  }

  const saveApprover = async () => {
    console.log("[v0] saveApprover function called")
    console.log("[v0] Current approverForm:", approverForm)
    console.log("[v0] Selected company_id:", selectedCompany?.id)
    console.log("[v0] Validation checks:")
    console.log("[v0] - Has company_id:", !!selectedCompany?.id)
    console.log("[v0] - Has approver_user_id:", !!approverForm.approver_user_id)
    console.log("[v0] - Has request_types:", approverForm.request_types.length > 0)

    if (!selectedCompany?.id || !approverForm.approver_user_id || approverForm.request_types.length === 0) {
      console.log("[v0] Validation failed - missing required fields")
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

      console.log("[v0] Saving approver data:", approverData)

      let response
      if (selectedApprover) {
        console.log("[v0] Updating existing approver")
        response = await fetch("/api/requests/approvers", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...approverData, id: selectedApprover.id }),
        })
      } else {
        console.log("[v0] Creating new approver")
        response = await fetch("/api/requests/approvers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(approverData),
        })
      }

      console.log("[v0] API Response status:", response.status)
      const result = await response.json()
      console.log("[v0] API Response data:", result)

      if (!response.ok) {
        throw new Error(result.error || "Error desconocido")
      }

      console.log("[v0] Approver operation completed successfully:", result)

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Administración de Solicitudes</h1>
          <p className="text-muted-foreground">Gestiona todas las solicitudes del sistema</p>
        </div>
        <Button onClick={() => setShowApproverDialog(true)}>
          <Settings className="h-4 w-4 mr-2" />
          Gestionar Aprobadores
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
              <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aprobadas</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rechazadas</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
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
                    <SelectItem value="pending">Pendiente</SelectItem>
                    <SelectItem value="in_progress">En Proceso</SelectItem>
                    <SelectItem value="approved">Aprobada</SelectItem>
                    <SelectItem value="rejected">Rechazada</SelectItem>
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
            {filteredRequests.map((request) => (
              <Card key={request.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={getStatusBadgeVariant(request.status)}>
                          {STATUS_LABELS[request.status as keyof typeof STATUS_LABELS]}
                        </Badge>
                        <Badge variant={getPriorityBadgeVariant(request.priority)}>
                          {PRIORITY_LABELS[request.priority as keyof typeof PRIORITY_LABELS]}
                        </Badge>
                        <Badge variant="outline">
                          {REQUEST_TYPE_LABELS[request.request_type as keyof typeof REQUEST_TYPE_LABELS]}
                        </Badge>
                        {request.is_expired && <Badge variant="destructive">Expirada</Badge>}
                      </div>
                      <div>
                        <h3 className="font-semibold">{request.requester_name}</h3>
                        <p className="text-sm text-muted-foreground">{request.department_name}</p>
                      </div>
                      <p className="text-sm">{request.reason}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Creada: {format(new Date(request.created_at), "dd/MM/yyyy HH:mm", { locale: es })}</span>
                        <span>Expira: {format(new Date(request.expires_at), "dd/MM/yyyy HH:mm", { locale: es })}</span>
                        {request.reviewer_name && <span>Revisor: {request.reviewer_name}</span>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setSelectedRequest(request)}>
                        Ver Detalles
                      </Button>
                      {(request.status === "pending" || request.status === "in_progress") && (
                        <Button variant="outline" size="sm" onClick={() => setSelectedRequest(request)}>
                          Reasignar
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
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
                console.log("[v0] Create button clicked")
                console.log(
                  "[v0] Button disabled state:",
                  savingApprover || !approverForm.approver_user_id || approverForm.request_types.length === 0,
                )
                console.log("[v0] - savingApprover:", savingApprover)
                console.log("[v0] - approver_user_id:", approverForm.approver_user_id)
                console.log("[v0] - request_types length:", approverForm.request_types.length)
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
        <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Detalles de Solicitud</DialogTitle>
              <DialogDescription>
                {REQUEST_TYPE_LABELS[selectedRequest.request_type as keyof typeof REQUEST_TYPE_LABELS]}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Solicitante</Label>
                  <p className="text-sm">{selectedRequest.requester_name}</p>
                </div>
                <div>
                  <Label>Departamento</Label>
                  <p className="text-sm">{selectedRequest.department_name}</p>
                </div>
                <div>
                  <Label>Estado</Label>
                  <Badge variant={getStatusBadgeVariant(selectedRequest.status)}>
                    {STATUS_LABELS[selectedRequest.status as keyof typeof STATUS_LABELS]}
                  </Badge>
                </div>
                <div>
                  <Label>Prioridad</Label>
                  <Badge variant={getPriorityBadgeVariant(selectedRequest.priority)}>
                    {PRIORITY_LABELS[selectedRequest.priority as keyof typeof PRIORITY_LABELS]}
                  </Badge>
                </div>
              </div>
              <div>
                <Label>Razón</Label>
                <p className="text-sm mt-1">{selectedRequest.reason}</p>
              </div>
              {selectedRequest.review_comments && (
                <div>
                  <Label>Comentarios del Revisor</Label>
                  <p className="text-sm mt-1">{selectedRequest.review_comments}</p>
                </div>
              )}
              {(selectedRequest.status === "pending" || selectedRequest.status === "in_progress") && (
                <div>
                  <Label>Reasignar a</Label>
                  <Select onValueChange={(value) => reassignRequest(selectedRequest.id, value)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Seleccionar aprobador" />
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
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
