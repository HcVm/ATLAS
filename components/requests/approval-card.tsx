"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Clock,
  UserX,
  Plus,
  Calendar,
  Wrench,
  MessageSquare,
  User,
  CalendarIcon,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react"

interface Request {
  id: string
  request_type: string
  status: string
  subject: string
  description: string
  created_at: string
  expires_at: string | null
  metadata: any
  profiles: {
    full_name: string
    email: string
    departments?: {
      name: string
    }
  }
}

interface ApprovalCardProps {
  request: Request
  onApprove: (request: Request) => void
  onReject: (request: Request) => void
}

const REQUEST_TYPES = {
  late_justification: {
    label: "Justificación de Tardanza",
    icon: Clock,
    color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  },
  absence_justification: {
    label: "Justificación de Ausencia",
    icon: UserX,
    color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  },
  overtime_request: {
    label: "Registro de Horas Extras",
    icon: Plus,
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  },
  leave_request: {
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

export function ApprovalCard({ request, onApprove, onReject }: ApprovalCardProps) {
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

  return (
    <Card className="glass-card hover:shadow-lg transition-all duration-300">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${requestType?.color || "bg-gray-100"}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg">{request.subject}</CardTitle>
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
            <span>{request.profiles.full_name}</span>
            {request.profiles.departments?.name && (
              <>
                <span>•</span>
                <span>{request.profiles.departments.name}</span>
              </>
            )}
          </div>

          <p className="text-sm text-muted-foreground line-clamp-2">{request.description}</p>

          {/* Show specific metadata based on request type */}
          {request.metadata && (
            <div className="text-xs text-muted-foreground space-y-1">
              {request.request_type === "late_justification" && request.metadata.incident_date && (
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-3 w-3" />
                  <span>Fecha: {new Date(request.metadata.incident_date).toLocaleDateString("es-ES")}</span>
                  {request.metadata.incident_time && <span>• Hora: {request.metadata.incident_time}</span>}
                </div>
              )}
              {request.request_type === "overtime_request" && request.metadata.work_date && (
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  <span>Fecha: {new Date(request.metadata.work_date).toLocaleDateString("es-ES")}</span>
                  {request.metadata.hours_worked && <span>• Horas: {request.metadata.hours_worked}</span>}
                </div>
              )}
              {request.request_type === "leave_request" && request.metadata.start_date && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-3 w-3" />
                  <span>
                    {new Date(request.metadata.start_date).toLocaleDateString("es-ES")} -{" "}
                    {request.metadata.end_date ? new Date(request.metadata.end_date).toLocaleDateString("es-ES") : ""}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Creada: {formatDate(request.created_at)}</span>
            {request.expires_at && (
              <span className={expired ? "text-red-500" : ""}>Expira: {formatDate(request.expires_at)}</span>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onApprove(request)}
              className="flex-1 text-green-600 border-green-200 hover:bg-green-50 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-950"
            >
              <ThumbsUp className="h-3 w-3 mr-1" />
              Aprobar
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onReject(request)}
              className="flex-1 text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950"
            >
              <ThumbsDown className="h-3 w-3 mr-1" />
              Rechazar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
