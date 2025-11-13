"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/lib/auth-context"
import { requestsDB } from "@/lib/requests-db"
import { useToast } from "@/hooks/use-toast"
import { RequestDetailsDialog } from "@/components/requests/request-details-dialog"
import {
  Clock,
  Plus,
  Calendar,
  Wrench,
  MessageSquare,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  Search,
  Eye,
  ThumbsUp,
  ThumbsDown,
  User,
  CalendarIcon,
  FileText,
  History,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { permission } from "process"

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
  status: "INGRESADA" | "EN_GESTION" | "APROBADA" | "DESAPROBADA" | "EJECUTADA" | "CANCELADA"
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
    label: "Justificación de Tardanza",
    icon: Clock,
    color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  },
  absence_justification: {
    label: "Justificación de Ausencia",
    icon: User,
    color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  },
  overtime_request: {
    label: "Registro de Horas Extras",
    icon: Plus,
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  },
  permission_request: {
    label: "Solicitud de Permiso",
    icon: AlertCircle,
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  },
  equipment_request: {
    label: "Solicitud de Equipos/Materiales",
    icon: Wrench,
    color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  },
  general_request: {
    label: "Solicitud General",
    icon: MessageSquare,
    color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
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

export default function ApprovalsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [requests, setRequests] = useState<Request[]>([])
  const [approvalHistory, setApprovalHistory] = useState<Request[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null)
  const [showApprovalDialog, setShowApprovalDialog] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState<
    "APROBADA" | "DESAPROBADA" | "EN_GESTION" | "EJECUTADA" | "CANCELADA"
  >("APROBADA")
  const [approverComments, setApproverComments] = useState("")
  const [processingApproval, setProcessingApproval] = useState(false)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)

  useEffect(() => {
    if (user && (user.role === "admin" || user.role === "supervisor")) {
      fetchPendingRequests()
    }
  }, [user])

  const fetchPendingRequests = async () => {
    try {
      setLoading(true)
      setError(null)

      if (!user) return

      let result
      if (user.role === "admin") {
        result = await requestsDB.getAllRequests(user.company_id)
      } else if (user.role === "supervisor") {
        result = await requestsDB.getRequestsForApproval(user.id, user.company_id)
      } else {
        setError("No tienes permisos para ver aprobaciones")
        return
      }

      if (result.error) {
        throw result.error
      }
      if (result.data && result.data.length > 0) {
      }

      const filteredRequests = (result.data || []).filter(
        (request: Request) => request.status === "INGRESADA" || request.status === "EN_GESTION",
      )

      console.log("[v0] Filtered requests after status check:", filteredRequests.length)
      setRequests(filteredRequests)
    } catch (err: any) {
      console.error("Error fetching requests:", err)
      setError(err.message || "Error al cargar las solicitudes")
    } finally {
      setLoading(false)
    }
  }

  const fetchApprovalHistory = async () => {
    if (!user || user.role !== "supervisor") return

    try {
      setLoadingHistory(true)

      const result = await requestsDB.getApprovalHistory(user.id, user.company_id)

      if (result.error) {
        throw result.error
      }

      setApprovalHistory(result.data || [])
    } catch (err: any) {
      toast({
        title: "Error",
        description: "No se pudo cargar el historial de aprobaciones",
        variant: "destructive",
      })
    } finally {
      setLoadingHistory(false)
    }
  }

  const filteredRequests = requests.filter((request) => {
    const matchesSearch =
      request.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.requester_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.department_name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = typeFilter === "all" || request.request_type === typeFilter

    return matchesSearch && matchesType
  })

  const filteredHistory = approvalHistory.filter((request) => {
    const matchesSearch =
      request.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.requester_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.department_name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = typeFilter === "all" || request.request_type === typeFilter

    return matchesSearch && matchesType
  })

  const getRequestsByStatus = (status: string) => {
    const upperStatus = status.toUpperCase()
    const filtered = filteredRequests.filter((req) => req.status === upperStatus)
    console.log("[v0] getRequestsByStatus:", upperStatus, "found:", filtered.length)
    return filtered
  }

  const handleApprovalAction = (request: Request, action: "approve" | "reject") => {
    setSelectedRequest(request)
    setSelectedStatus(action === "approve" ? "APROBADA" : "DESAPROBADA")
    setApproverComments("")
    setShowApprovalDialog(true)
  }

  const processApproval = async () => {
    if (!selectedRequest || !user) return

    setProcessingApproval(true)
    try {
      const result = await requestsDB.updateRequestStatus(selectedRequest.id, user.id, {
        status: selectedStatus,
        review_comments: approverComments || undefined,
      })

      if (result.error) {
        throw result.error
      }

      toast({
        title: "Solicitud Actualizada",
        description: `La solicitud de ${selectedRequest.requester_name} ha sido actualizada a ${STATUS_CONFIG[selectedStatus]?.label}`,
      })

      await fetchPendingRequests()
      setShowApprovalDialog(false)
      setSelectedRequest(null)
    } catch (error: any) {
      console.error("Error processing approval:", error)
      toast({
        title: "Error",
        description: error.message || "No se pudo procesar la solicitud",
        variant: "destructive",
      })
    } finally {
      setProcessingApproval(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false
    return new Date(expiresAt) < new Date()
  }

  const RequestCard = ({ request }: { request: Request }) => {
    const requestType = REQUEST_TYPES[request.request_type as keyof typeof REQUEST_TYPES]
    const status = STATUS_CONFIG[request.status as keyof typeof STATUS_CONFIG]
    const expired = isExpired(request.expires_at)
    const Icon = requestType?.icon || MessageSquare
    const StatusIcon = status?.icon || AlertCircle

    const handleViewDetails = () => {
      setSelectedRequest(request)
      setShowDetailsDialog(true)
    }

    const renderTypeSpecificFields = () => {
      switch (request.request_type) {
        case "late_justification":
        case "absence_justification":
          return request.incident_date ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarIcon className="h-4 w-4" />
              <span>Fecha: {new Date(request.incident_date).toLocaleDateString("es-ES")}</span>
              {request.incident_time && <span className="ml-2">Hora: {request.incident_time}</span>}
            </div>
          ) : null

        case "overtime_request":
          return request.incident_date ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Fecha: {new Date(request.incident_date).toLocaleDateString("es-ES")}</span>
              {request.incident_time && request.end_time && (
                <span className="ml-2">
                  {request.incident_time} - {request.end_time}
                </span>
              )}
            </div>
          ) : null

        case "permission_request":
          return request.incident_date ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
              <Calendar className="h-4 w-4" />
              <span>{new Date(request.incident_date).toLocaleDateString("es-ES")}</span>
              {request.end_date && (
                <>
                  <span>-</span>
                  <span>{new Date(request.end_date).toLocaleDateString("es-ES")}</span>
                </>
              )}
              {request.permission_days && <span className="ml-2">({request.permission_days} días)</span>}
            </div>
          ) : null

        case "equipment_request":
          return (
            <div className="space-y-2 text-sm text-muted-foreground">
              {request.requerimiento_numero && (
                <div>
                  <span className="font-medium">Requerimiento:</span> {request.requerimiento_numero}
                </div>
              )}
              {request.dirigido_a && (
                <div>
                  <span className="font-medium">Dirigido a:</span> {request.dirigido_a}
                </div>
              )}
              {request.motivo_requerimiento && (
                <div className="line-clamp-2">
                  <span className="font-medium">Motivo:</span> {request.motivo_requerimiento}
                </div>
              )}
              {request.items_requeridos && request.items_requeridos.length > 0 && (
                <div>
                  <span className="font-medium">{request.items_requeridos.length} artículo(s)</span>
                </div>
              )}
            </div>
          )

        default:
          return null
      }
    }

    return (
      <Card className="glass-card hover:shadow-lg transition-all duration-300">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${requestType?.color || "bg-gray-100"}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg">{requestType?.label || request.request_type}</CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className={requestType?.color}>
                    {requestType?.label || request.request_type}
                  </Badge>
                </CardDescription>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge className={status?.color}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {status?.label || request.status}
              </Badge>
              {expired && (
                <Badge variant="destructive" className="text-xs">
                  Expirada
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span>{request.requester_name}</span>
              {request.department_name && (
                <>
                  <span>•</span>
                  <span>{request.department_name}</span>
                </>
              )}
            </div>

            <p className="text-sm text-muted-foreground line-clamp-2">{request.reason}</p>

            <div className="text-xs text-muted-foreground space-y-2">
              {renderTypeSpecificFields()}
              {request.supporting_documents && request.supporting_documents.length > 0 && (
                <div className="flex items-center gap-2">
                  <FileText className="h-3 w-3" />
                  <span>{request.supporting_documents.length} archivo(s) adjunto(s)</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Creada: {formatDate(request.created_at)}</span>
              {request.expires_at && (
                <span className={expired ? "text-red-500" : ""}>Expira: {formatDate(request.expires_at)}</span>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button size="sm" variant="outline" onClick={handleViewDetails} className="flex-1 bg-transparent">
                <Eye className="h-3 w-3 mr-1" />
                Ver Detalles
              </Button>
            </div>
            {(request.status === "INGRESADA" || request.status === "EN_GESTION") && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleApprovalAction(request, "approve")}
                  className="flex-1 bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-900"
                >
                  <Clock className="h-3 w-3 mr-1" />
                  Cambiar Estado
                </Button>
              </div>
            )}
            {(request.status === "APROBADA" ||
              request.status === "DESAPROBADA" ||
              request.status === "EJECUTADA" ||
              request.status === "CANCELADA") &&
              request.reviewed_at && (
                <div className="text-xs text-muted-foreground pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <span>Revisada: {formatDate(request.reviewed_at)}</span>
                  </div>
                  {request.review_comments && <p className="mt-1 text-xs italic">"{request.review_comments}"</p>}
                </div>
              )}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!user || (user.role !== "admin" && user.role !== "supervisor")) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="glass-card">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Acceso Restringido</h3>
            <p className="text-muted-foreground">
              Solo los administradores y supervisores pueden acceder a las aprobaciones.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Cargando solicitudes pendientes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Aprobaciones</h1>
        <p className="text-muted-foreground mt-1">
          Revisa y aprueba solicitudes de {user.role === "admin" ? "todos los departamentos" : "tu departamento"}
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{getRequestsByStatus("INGRESADA").length}</p>
                <p className="text-xs text-muted-foreground">Ingresadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                <Loader2 className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{getRequestsByStatus("EN_GESTION").length}</p>
                <p className="text-xs text-muted-foreground">En Gestión</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 dark:bg-slate-900 rounded-lg">
                <Eye className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{filteredRequests.length}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por razón, solicitante o departamento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {Object.entries(REQUEST_TYPES).map(([key, type]) => (
                  <SelectItem key={key} value={key}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="INGRESADA" className="space-y-4">
        <TabsList className={`grid w-full ${user.role === "supervisor" ? "grid-cols-3" : "grid-cols-2"}`}>
          <TabsTrigger value="INGRESADA">Ingresadas ({getRequestsByStatus("INGRESADA").length})</TabsTrigger>
          <TabsTrigger value="EN_GESTION">En Gestión ({getRequestsByStatus("EN_GESTION").length})</TabsTrigger>
          {user.role === "supervisor" && (
            <TabsTrigger
              value="history"
              onClick={() => {
                if (approvalHistory.length === 0) {
                  fetchApprovalHistory()
                }
              }}
            >
              <History className="h-4 w-4 mr-1" />
              Historial ({approvalHistory.length})
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="INGRESADA" className="space-y-4">
          {getRequestsByStatus("INGRESADA").length === 0 ? (
            <Card className="glass-card">
              <CardContent className="p-8 text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No hay solicitudes ingresadas</h3>
                <p className="text-muted-foreground">Todas las solicitudes han sido procesadas.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {getRequestsByStatus("INGRESADA").map((request) => (
                <RequestCard key={request.id} request={request} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="EN_GESTION" className="space-y-4">
          {getRequestsByStatus("EN_GESTION").length === 0 ? (
            <Card className="glass-card">
              <CardContent className="p-8 text-center">
                <Loader2 className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No hay solicitudes en gestión</h3>
                <p className="text-muted-foreground">No hay solicitudes siendo procesadas actualmente.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {getRequestsByStatus("EN_GESTION").map((request) => (
                <RequestCard key={request.id} request={request} />
              ))}
            </div>
          )}
        </TabsContent>

        {user.role === "supervisor" && (
          <TabsContent value="history" className="space-y-4">
            {loadingHistory ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center space-y-4">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                  <p className="text-muted-foreground">Cargando historial de aprobaciones...</p>
                </div>
              </div>
            ) : filteredHistory.length === 0 ? (
              <Card className="glass-card">
                <CardContent className="p-8 text-center">
                  <History className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No hay historial de aprobaciones</h3>
                  <p className="text-muted-foreground">
                    Aún no has procesado ninguna solicitud o no hay solicitudes que coincidan con los filtros.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredHistory.map((request) => (
                  <RequestCard key={request.id} request={request} />
                ))}
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>

      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Actualizar Estado de Solicitud</DialogTitle>
            <DialogDescription>
              {selectedRequest && (
                <>
                  <strong>{REQUEST_TYPES[selectedRequest.request_type as keyof typeof REQUEST_TYPES]?.label}</strong> de{" "}
                  {selectedRequest.requester_name}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="status">Estado de la Solicitud</Label>
              <Select value={selectedStatus} onValueChange={(value: any) => setSelectedStatus(value)}>
                <SelectTrigger id="status" className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EN_GESTION">
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4" />
                      En Gestión
                    </span>
                  </SelectItem>
                  <SelectItem value="APROBADA">
                    <span className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Aprobada
                    </span>
                  </SelectItem>
                  <SelectItem value="DESAPROBADA">
                    <span className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-600" />
                      Desaprobada
                    </span>
                  </SelectItem>
                  <SelectItem value="EJECUTADA">
                    <span className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-teal-600" />
                      Ejecutada
                    </span>
                  </SelectItem>
                  <SelectItem value="CANCELADA">
                    <span className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-600" />
                      Cancelada
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="comments">
                Comentarios {selectedStatus === "DESAPROBADA" ? "(requeridos)" : "(opcionales)"}
              </Label>
              <Textarea
                id="comments"
                placeholder={
                  selectedStatus === "DESAPROBADA"
                    ? "Explica el motivo de la desaprobación..."
                    : "Comentarios adicionales..."
                }
                value={approverComments}
                onChange={(e) => setApproverComments(e.target.value)}
                className="mt-2"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApprovalDialog(false)} disabled={processingApproval}>
              Cancelar
            </Button>
            <Button
              onClick={processApproval}
              disabled={processingApproval || (selectedStatus === "DESAPROBADA" && !approverComments.trim())}
              className={
                selectedStatus === "APROBADA"
                  ? "bg-green-600 hover:bg-green-700"
                  : selectedStatus === "DESAPROBADA"
                    ? "bg-red-600 hover:bg-red-700"
                    : ""
              }
            >
              {processingApproval ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  {selectedStatus === "APROBADA" ? (
                    <ThumbsUp className="h-4 w-4 mr-2" />
                  ) : selectedStatus === "DESAPROBADA" ? (
                    <ThumbsDown className="h-4 w-4 mr-2" />
                  ) : (
                    <Clock className="h-4 w-4 mr-2" />
                  )}
                  Actualizar Estado
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RequestDetailsDialog request={selectedRequest} open={showDetailsDialog} onOpenChange={setShowDetailsDialog} />
    </div>
  )
}
