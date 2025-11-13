"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Clock, User, Calendar, Wrench, MessageSquare, CalendarIcon, Eye, FileText } from "lucide-react"

interface Request {
  id: string
  request_type: string
  status: string
  reason: string
  created_at: string
  expires_at: string | null
  requester_name: string
  department_name: string
  incident_date: string
  incident_time?: string
  end_date?: string
  end_time?: string
  equipment_details?: any
  priority: string
  requerimiento_numero?: string
  dirigido_a?: string
  area_solicitante?: string
  solicitante_nombre?: string
  motivo_requerimiento?: string
  fecha_entrega_solicitada?: string
  urgencia?: string
  items_requeridos?: any[]
  permission_days?: number
  supporting_documents?: any
}

interface ApprovalCardProps {
  request: Request
  onApprove: (request: Request) => void
  onReject: (request: Request) => void
  onViewDetails: (request: Request) => void
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
    icon: Clock,
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  },
  permission_request: {
    label: "Solicitud de Permiso",
    icon: Calendar,
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

export function ApprovalCard({ request, onApprove, onReject, onViewDetails }: ApprovalCardProps) {
  const requestType = REQUEST_TYPES[request.request_type as keyof typeof REQUEST_TYPES]
  const Icon = requestType?.icon || MessageSquare

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

  const expired = isExpired(request.expires_at)

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
                {expired && (
                  <Badge variant="destructive" className="text-xs">
                    Expirada
                  </Badge>
                )}
              </CardDescription>
            </div>
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
            <Button
              size="sm"
              variant="outline"
              onClick={() => onViewDetails(request)}
              className="flex-1 bg-transparent"
            >
              <Eye className="h-3 w-3 mr-1" />
              Ver Detalles
            </Button>
          </div>
          {(request.status === "INGRESADA" || request.status === "EN_GESTION") && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  // Call a new onStatusChange callback instead of onApprove/onReject
                  // This will be handled by the parent component
                  onViewDetails(request)
                }}
                className="flex-1 bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-900"
              >
                <Clock className="h-3 w-3 mr-1" />
                Cambiar Estado
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
