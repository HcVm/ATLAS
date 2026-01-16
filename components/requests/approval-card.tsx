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
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <CalendarIcon className="h-4 w-4" />
            <span>Fecha: {new Date(request.incident_date).toLocaleDateString("es-ES")}</span>
            {request.incident_time && <span className="ml-2">Hora: {request.incident_time}</span>}
          </div>
        ) : null

      case "overtime_request":
        return request.incident_date ? (
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
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
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 flex-wrap">
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
          <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
            {request.requerimiento_numero && (
              <div>
                <span className="font-medium text-slate-700 dark:text-slate-300">Requerimiento:</span> {request.requerimiento_numero}
              </div>
            )}
            {request.dirigido_a && (
              <div>
                <span className="font-medium text-slate-700 dark:text-slate-300">Dirigido a:</span> {request.dirigido_a}
              </div>
            )}
            {request.motivo_requerimiento && (
              <div className="line-clamp-2">
                <span className="font-medium text-slate-700 dark:text-slate-300">Motivo:</span> {request.motivo_requerimiento}
              </div>
            )}
            {request.items_requeridos && request.items_requeridos.length > 0 && (
              <div>
                <span className="font-medium text-slate-700 dark:text-slate-300">{request.items_requeridos.length} artículo(s)</span>
              </div>
            )}
          </div>
        )

      default:
        return null
    }
  }

  return (
    <Card className="group relative overflow-hidden border-slate-200/60 dark:border-slate-800/60 bg-white/50 dark:bg-slate-950/50 backdrop-blur-xl hover:shadow-xl hover:border-slate-300/60 transition-all duration-300">
      <div className={`absolute top-0 left-0 w-1 h-full ${requestType?.color.split(" ")[0].replace("bg-", "bg-opacity-80 bg-")} transition-all duration-300 group-hover:w-1.5`} />
      
      <CardHeader className="pb-3 pl-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl shadow-sm ring-1 ring-black/5 ${requestType?.color || "bg-gray-100 text-gray-800"}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {requestType?.label || request.request_type}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1.5">
                {expired && (
                  <Badge variant="destructive" className="h-5 text-[10px] font-medium px-1.5 shadow-sm">
                    Expirada
                  </Badge>
                )}
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium px-2 py-0.5 rounded-full bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50">
                   {request.status}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pl-5">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900/50 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
            <User className="h-4 w-4 text-slate-400" />
            <span className="font-medium text-slate-700 dark:text-slate-300">{request.requester_name}</span>
            {request.department_name && (
              <>
                <span className="text-slate-300 dark:text-slate-600">•</span>
                <span className="text-xs">{request.department_name}</span>
              </>
            )}
          </div>

          <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
            {request.reason}
          </p>

          <div className="text-xs space-y-3 pt-1">
            {renderTypeSpecificFields()}
            
            {request.supporting_documents && request.supporting_documents.length > 0 && (
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-medium">
                <FileText className="h-3.5 w-3.5" />
                <span>{request.supporting_documents.length} archivo(s) adjunto(s)</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-[11px] font-medium text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800/50">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDate(request.created_at)}
            </span>
            {request.expires_at && (
              <span className={expired ? "text-red-500 flex items-center gap-1" : "flex items-center gap-1"}>
                Expira: {formatDate(request.expires_at)}
              </span>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onViewDetails(request)}
              className="flex-1 bg-white/50 hover:bg-white/80 border-slate-200/60 text-slate-700 hover:text-slate-900 shadow-sm transition-all"
            >
              <Eye className="h-3.5 w-3.5 mr-1.5" />
              Ver Detalles
            </Button>
            
            {(request.status === "INGRESADA" || request.status === "EN_GESTION") && (
              <Button
                size="sm"
                onClick={() => onViewDetails(request)}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-500/20 border-0"
              >
                <Clock className="h-3.5 w-3.5 mr-1.5" />
                Gestionar
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
