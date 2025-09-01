"use client"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Clock,
  UserX,
  Plus,
  Calendar,
  Wrench,
  MessageSquare,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  User,
  CalendarIcon,
  FileText,
  Download,
  ExternalLink,
} from "lucide-react"

interface RequestDetailsDialogProps {
  request: any
  open: boolean
  onOpenChange: (open: boolean) => void
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

const STATUS_CONFIG = {
  pending: {
    label: "Pendiente",
    icon: AlertCircle,
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  },
  in_progress: {
    label: "En Proceso",
    icon: Loader2,
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  },
  approved: {
    label: "Aprobada",
    icon: CheckCircle,
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  },
  rejected: {
    label: "Rechazada",
    icon: XCircle,
    color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  },
  expired: {
    label: "Expirada",
    icon: Clock,
    color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  },
}

export function RequestDetailsDialog({ request, open, onOpenChange }: RequestDetailsDialogProps) {
  if (!request) return null

  const requestType = REQUEST_TYPES[request.request_type as keyof typeof REQUEST_TYPES]
  const status = STATUS_CONFIG[request.status as keyof typeof STATUS_CONFIG]
  const Icon = requestType?.icon || MessageSquare
  const StatusIcon = status?.icon || AlertCircle

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getFileNameFromUrl = (url: string) => {
    try {
      const urlParts = url.split("/")
      const fileName = urlParts[urlParts.length - 1]
      // Remove timestamp prefix if present
      return fileName.replace(/^\d+-/, "")
    } catch {
      return "Archivo adjunto"
    }
  }

  const downloadFile = (url: string, fileName: string) => {
    const link = document.createElement("a")
    link.href = url
    link.download = fileName
    link.target = "_blank"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${requestType?.color || "bg-gray-100"}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl">{requestType?.label || request.request_type}</DialogTitle>
              <DialogDescription className="flex items-center gap-2 mt-1">
                <Badge className={status?.color}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {status?.label || request.status}
                </Badge>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Información del solicitante */}
            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Información del Solicitante
              </h4>
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{request.requester_name || request.profiles?.full_name}</span>
                {request.department_name && (
                  <>
                    <span>•</span>
                    <span className="text-muted-foreground">{request.department_name}</span>
                  </>
                )}
              </div>
            </div>

            <Separator />

            {/* Detalles de la solicitud */}
            <div className="space-y-4">
              <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Detalles de la Solicitud
              </h4>

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Razón/Descripción:</label>
                  <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                    {request.reason || request.description}
                  </p>
                </div>

                {/* Fechas específicas según el tipo de solicitud */}
                {request.incident_date && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Fecha del Incidente:</label>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <CalendarIcon className="h-4 w-4" />
                        <span>{formatDate(request.incident_date)}</span>
                      </div>
                    </div>
                    {request.incident_time && (
                      <div>
                        <label className="text-sm font-medium">Hora:</label>
                        <p className="text-sm text-muted-foreground mt-1">{request.incident_time}</p>
                      </div>
                    )}
                  </div>
                )}

                {request.end_date && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Fecha de Fin:</label>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <CalendarIcon className="h-4 w-4" />
                        <span>{formatDate(request.end_date)}</span>
                      </div>
                    </div>
                    {request.end_time && (
                      <div>
                        <label className="text-sm font-medium">Hora de Fin:</label>
                        <p className="text-sm text-muted-foreground mt-1">{request.end_time}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Detalles de equipos */}
                {request.equipment_details && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Detalles del Equipo:</label>
                    <div className="bg-muted p-3 rounded-md space-y-2">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Tipo:</span>
                          <span className="ml-2 text-muted-foreground">{request.equipment_details.type}</span>
                        </div>
                        <div>
                          <span className="font-medium">Cantidad:</span>
                          <span className="ml-2 text-muted-foreground">{request.equipment_details.quantity}</span>
                        </div>
                      </div>
                      {request.equipment_details.specifications && (
                        <div>
                          <span className="font-medium text-sm">Especificaciones:</span>
                          <p className="text-sm text-muted-foreground mt-1">
                            {request.equipment_details.specifications}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Archivos adjuntos */}
            {request.supporting_documents && request.supporting_documents.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    Archivos Adjuntos ({request.supporting_documents.length})
                  </h4>
                  <div className="space-y-2">
                    {request.supporting_documents.map((url: string, index: number) => {
                      const fileName = getFileNameFromUrl(url)
                      return (
                        <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-md">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="text-sm truncate">{fileName}</span>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => window.open(url, "_blank")}
                              className="h-8 w-8 p-0"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => downloadFile(url, fileName)}
                              className="h-8 w-8 p-0"
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </>
            )}

            {/* Comentarios del revisor */}
            {request.review_comments && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    Comentarios del Revisor
                  </h4>
                  <div className="bg-muted p-3 rounded-md">
                    <p className="text-sm whitespace-pre-wrap">{request.review_comments}</p>
                    {request.reviewed_at && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Revisado el {formatDateTime(request.reviewed_at)}
                        {request.reviewer_name && ` por ${request.reviewer_name}`}
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}

            <Separator />

            {/* Información de fechas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-muted-foreground">
              <div>
                <span className="font-medium">Creada:</span>
                <span className="ml-2">{formatDateTime(request.created_at)}</span>
              </div>
              {request.expires_at && (
                <div>
                  <span className="font-medium">Expira:</span>
                  <span className={`ml-2 ${new Date(request.expires_at) < new Date() ? "text-red-500" : ""}`}>
                    {formatDateTime(request.expires_at)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
