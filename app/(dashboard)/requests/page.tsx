"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase"
import Link from "next/link"
import {
  Clock,
  UserX,
  Plus,
  FileCheck,
  Calendar,
  Wrench,
  MessageSquare,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  Search,
  ChevronRight,
  Eye,
  CalendarIcon,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RequestDetailsDialog } from "@/components/requests/request-details-dialog"

interface Request {
  id: string
  request_type: string
  status: string
  subject: string
  description: string
  created_at: string
  expires_at: string | null
  approved_at: string | null
  rejected_at: string | null
  approver_comments: string | null
  profiles: {
    full_name: string
  }
  priority?: string
  reason?: string
  requester_name?: string
  department_name?: string
  requerimiento_numero?: string
  dirigido_a?: string
  motivo_requerimiento?: string
  items_requeridos?: any[]
  supporting_documents?: any
}

const REQUEST_TYPES = {
  late_justification: {
    label: "Justificación de Tardanza",
    icon: Clock,
    color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    description: "Justificar llegadas tardías (dentro de 24 horas)",
  },
  absence_justification: {
    label: "Justificación de Ausencia",
    icon: UserX,
    color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    description: "Justificar ausencias (dentro de 24 horas)",
  },
  overtime_request: {
    label: "Registro de Horas Extras",
    icon: Plus,
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    description: "Registrar horas extras trabajadas (dentro de 24 horas)",
  },
  permission_request: {
    label: "Solicitud de Permiso",
    icon: Calendar,
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    description: "Solicitar permisos (con 3 días de anticipación)",
  },
  equipment_request: {
    label: "Solicitud de Equipos/Materiales",
    icon: Wrench,
    color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    description: "Solicitar equipos o materiales para tu departamento",
  },
  general_request: {
    label: "Solicitud General",
    icon: MessageSquare,
    color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
    description: "Comentarios, sugerencias y solicitudes generales",
  },
}

const STATUS_CONFIG = {
  pending: {
    label: "Pendiente",
    icon: AlertCircle,
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    bgColor: "bg-yellow-50 dark:bg-yellow-950",
  },
  in_progress: {
    label: "En Proceso",
    icon: Loader2,
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    bgColor: "bg-blue-50 dark:bg-blue-950",
  },
  approved: {
    label: "Aprobada",
    icon: CheckCircle,
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    bgColor: "bg-green-50 dark:bg-green-950",
  },
  rejected: {
    label: "Rechazada",
    icon: XCircle,
    color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    bgColor: "bg-red-50 dark:bg-red-950",
  },
  expired: {
    label: "Expirada",
    icon: Clock,
    color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
    bgColor: "bg-gray-50 dark:bg-gray-950",
  },
}

export default function RequestsPage() {
  const { user } = useAuth()
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)

  useEffect(() => {
    if (user) {
      fetchRequests()
    }
  }, [user])

  const fetchRequests = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from("employee_requests")
        .select(`
          *,
          profiles!employee_requests_user_id_fkey (
            full_name
          )
        `)
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })

      if (error) throw error

      setRequests(data || [])
    } catch (err: any) {
      console.error("Error fetching requests:", err)
      setError(err.message || "Error al cargar las solicitudes")
    } finally {
      setLoading(false)
    }
  }

  const filteredRequests = requests.filter((request) => {
    const matchesSearch =
      (request.subject?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (request.description?.toLowerCase() || "").includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || request.status === statusFilter
    const matchesType = typeFilter === "all" || request.request_type === typeFilter

    return matchesSearch && matchesStatus && matchesType
  })

  const getRequestsByStatus = (status: string) => {
    return filteredRequests.filter((req) => req.status === status)
  }

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false
    return new Date(expiresAt) < new Date()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const formatDateWithTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
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
        case "equipment_request":
          return (
            <div className="space-y-2 text-sm text-muted-foreground">
              {request.requerimiento_numero && (
                <div className="flex items-start gap-2">
                  <span className="font-medium text-foreground min-w-fit">Requerimiento:</span>
                  <span className="break-all">{request.requerimiento_numero}</span>
                </div>
              )}
              {request.dirigido_a && (
                <div className="flex items-start gap-2">
                  <span className="font-medium text-foreground min-w-fit">Dirigido a:</span>
                  <span>{request.dirigido_a}</span>
                </div>
              )}
              {request.motivo_requerimiento && (
                <div className="flex items-start gap-2">
                  <span className="font-medium text-foreground min-w-fit">Motivo:</span>
                  <span className="line-clamp-2">{request.motivo_requerimiento}</span>
                </div>
              )}
              {request.items_requeridos && request.items_requeridos.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">Artículos:</span>
                  <span>{request.items_requeridos.length} artículo(s)</span>
                </div>
              )}
            </div>
          )
        default:
          return null
      }
    }

    return (
      <Card
        className={`glass-card hover:shadow-lg transition-all duration-300 border-l-4 overflow-hidden ${
          status?.color.split(" ")[0] === "bg-yellow-100"
            ? "border-l-yellow-400"
            : status?.color.split(" ")[0] === "bg-blue-100"
              ? "border-l-blue-400"
              : status?.color.split(" ")[0] === "bg-green-100"
                ? "border-l-green-400"
                : status?.color.split(" ")[0] === "bg-red-100"
                  ? "border-l-red-400"
                  : "border-l-gray-400"
        }`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className={`p-2 rounded-lg flex-shrink-0 ${requestType?.color || "bg-gray-100"}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base line-clamp-1">{requestType?.label || request.request_type}</CardTitle>
              </div>
            </div>
            <div className="flex-shrink-0">
              <Badge className={`${status?.color} text-xs flex items-center gap-1 whitespace-nowrap`}>
                <StatusIcon className="h-2.5 w-2.5" />
                <span>{status?.label || request.status}</span>
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground line-clamp-3">{request.description || request.reason}</p>

          {renderTypeSpecificFields()}

          <div className="grid grid-cols-2 gap-3 py-3 border-t border-b border-muted">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Creada</p>
              <div className="flex items-center gap-2 text-xs">
                <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <span>{formatDate(request.created_at)}</span>
              </div>
            </div>

            {request.expires_at && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Expira</p>
                <div className={`flex items-center gap-2 text-xs ${expired ? "text-red-500 font-medium" : ""}`}>
                  <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>{formatDate(request.expires_at)}</span>
                </div>
              </div>
            )}

            {request.approved_at && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Aprobada</p>
                <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                  <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>{formatDate(request.approved_at)}</span>
                </div>
              </div>
            )}

            {request.rejected_at && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Rechazada</p>
                <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
                  <XCircle className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>{formatDate(request.rejected_at)}</span>
                </div>
              </div>
            )}
          </div>

          {request.approver_comments && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-xs font-medium text-blue-900 dark:text-blue-200 mb-2">Comentarios del Aprobador</p>
              <p className="text-sm text-blue-800 dark:text-blue-300 line-clamp-2">{request.approver_comments}</p>
            </div>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={handleViewDetails}
            className="w-full bg-transparent hover:bg-primary/5 mt-2"
          >
            <Eye className="h-3.5 w-3.5 mr-2" />
            Ver Detalles Completos
            <ChevronRight className="h-3.5 w-3.5 ml-auto" />
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Cargando solicitudes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Mis Solicitudes</h1>
          <p className="text-muted-foreground mt-1">Gestiona tus solicitudes de justificaciones, permisos y equipos</p>
        </div>
        <Button asChild className="shadow-lg">
          <Link href="/requests/new">
            <Plus className="h-4 w-4 mr-2" />
            Nueva Solicitud
          </Link>
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass-card border-t-2 border-t-yellow-400 overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{getRequestsByStatus("pending").length}</p>
                <p className="text-xs text-muted-foreground">Pendientes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card border-t-2 border-t-blue-400 overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Loader2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{getRequestsByStatus("in_progress").length}</p>
                <p className="text-xs text-muted-foreground">En Proceso</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card border-t-2 border-t-green-400 overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{getRequestsByStatus("approved").length}</p>
                <p className="text-xs text-muted-foreground">Aprobadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card border-t-2 border-t-red-400 overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{getRequestsByStatus("rejected").length}</p>
                <p className="text-xs text-muted-foreground">Rechazadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar solicitudes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="in_progress">En Proceso</SelectItem>
                  <SelectItem value="approved">Aprobada</SelectItem>
                  <SelectItem value="rejected">Rechazada</SelectItem>
                </SelectContent>
              </Select>
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
          </div>
        </CardContent>
      </Card>

      {filteredRequests.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="p-8 text-center">
            <FileCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay solicitudes</h3>
            <p className="text-muted-foreground mb-4">
              {requests.length === 0
                ? "Aún no has creado ninguna solicitud."
                : "No se encontraron solicitudes que coincidan con los filtros."}
            </p>
            <Button asChild>
              <Link href="/requests/new">
                <Plus className="h-4 w-4 mr-2" />
                Crear Primera Solicitud
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {filteredRequests.map((request) => (
            <RequestCard key={request.id} request={request} />
          ))}
        </div>
      )}

      <RequestDetailsDialog request={selectedRequest} open={showDetailsDialog} onOpenChange={setShowDetailsDialog} />
    </div>
  )
}
