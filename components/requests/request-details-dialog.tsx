"use client"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useState } from "react"
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
  Mail,
  Building,
} from "lucide-react"

interface RequestDetailsDialogProps {
  request: any
  open: boolean
  onOpenChange: (open: boolean) => void
  onApprove?: (requestId: string, comments: string) => void
  onReject?: (requestId: string, comments: string) => void
  showActions?: boolean
}

const REQUEST_TYPES = {
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
  expired: {
    label: "Expirada",
    icon: Clock,
    color: "text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/20 border-slate-200 dark:border-slate-800",
  },
}

export function RequestDetailsDialog({ request, open, onOpenChange, onApprove, onReject, showActions = false }: RequestDetailsDialogProps) {
  const [comments, setComments] = useState("")
  const [action, setAction] = useState<"approve" | "reject" | null>(null)
  
  if (!request) return null

  const requestType = REQUEST_TYPES[request.request_type as keyof typeof REQUEST_TYPES]
  // Handle case sensitivity for status
  const statusKey = request.status.toLowerCase() as keyof typeof STATUS_CONFIG
  const status = STATUS_CONFIG[statusKey] || STATUS_CONFIG.ingresada
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

  const handleAction = () => {
    if (action === "approve" && onApprove) {
      onApprove(request.id, comments)
    } else if (action === "reject" && onReject) {
      onReject(request.id, comments)
    }
    setAction(null)
    setComments("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] p-0 gap-0 overflow-hidden border-slate-200/50 dark:border-slate-800/50 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl">
        <DialogHeader className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl ${requestType?.bg || "bg-slate-100"} ${requestType?.color}`}>
              <Icon className="h-6 w-6" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-xl font-bold">{requestType?.label || request.request_type}</DialogTitle>
                <Badge variant="outline" className={`${status?.color} border px-2.5 py-0.5 rounded-full font-medium`}>
                  <StatusIcon className="h-3 w-3 mr-1.5" />
                  {status?.label || request.status}
                </Badge>
              </div>
              <DialogDescription className="flex items-center gap-2 text-sm">
                <span>Solicitud #{request.requerimiento_numero || request.id.slice(0, 8)}</span>
                <span>•</span>
                <span>{formatDateTime(request.created_at)}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] p-6">
          <div className="space-y-8">
            {/* Información del solicitante */}
            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
              <h4 className="font-semibold text-sm text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
                Solicitante
              </h4>
              <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700">
                    <User className="h-5 w-5 text-slate-400" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">
                      {request.requester_name || request.profiles?.full_name}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <Mail className="h-3 w-3" />
                      <span>{request.requester_email || "No email"}</span>
                    </div>
                  </div>
                </div>
                {request.department_name && (
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                    <Building className="h-4 w-4 text-slate-400" />
                    <span>{request.department_name}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Detalles de la solicitud */}
            <div className="space-y-4">
              <h4 className="font-semibold text-sm text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Detalles de la Solicitud
              </h4>

              <div className="space-y-4">
                <div className="bg-white dark:bg-slate-900/30 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1 block">Razón / Descripción</label>
                  <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {request.reason || request.description}
                  </p>
                </div>

                {/* Fechas específicas según el tipo de solicitud */}
                {(request.incident_date || request.end_date) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {request.incident_date && (
                      <div className="bg-white dark:bg-slate-900/30 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1 block">
                          Fecha {request.request_type.includes("justification") ? "del Incidente" : "de Inicio"}
                        </label>
                        <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-medium">
                          <CalendarIcon className="h-4 w-4 text-slate-400" />
                          <span>{formatDate(request.incident_date)}</span>
                          {request.incident_time && (
                            <span className="text-slate-500 font-normal ml-1">
                              {request.incident_time}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {request.end_date && (
                      <div className="bg-white dark:bg-slate-900/30 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1 block">
                          Fecha de Fin
                        </label>
                        <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-medium">
                          <CalendarIcon className="h-4 w-4 text-slate-400" />
                          <span>{formatDate(request.end_date)}</span>
                          {request.end_time && (
                            <span className="text-slate-500 font-normal ml-1">
                              {request.end_time}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Detalles de equipos */}
                {request.request_type === "equipment_request" && (
                  <div className="space-y-4 mt-4">
                    <div className="bg-slate-50 dark:bg-slate-900/30 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                      <h5 className="font-semibold text-sm mb-3">Información Adicional</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 text-sm">
                        {request.dirigido_a && (
                          <div>
                            <span className="text-slate-500 block text-xs">Dirigido a:</span>
                            <span className="font-medium">{request.dirigido_a}</span>
                          </div>
                        )}
                        {request.area_solicitante && (
                          <div>
                            <span className="text-slate-500 block text-xs">Área Solicitante:</span>
                            <span className="font-medium">{request.area_solicitante}</span>
                          </div>
                        )}
                        {request.fecha_entrega_solicitada && (
                          <div>
                            <span className="text-slate-500 block text-xs">Fecha de Entrega:</span>
                            <span className="font-medium">{formatDate(request.fecha_entrega_solicitada)}</span>
                          </div>
                        )}
                        {request.urgencia && (
                          <div>
                            <span className="text-slate-500 block text-xs">Urgencia:</span>
                            <Badge variant={request.urgencia === 'urgent' || request.urgencia === 'high' ? 'destructive' : 'secondary'} className="mt-1 capitalize">
                              {request.urgencia}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>

                    {request.items_requeridos && request.items_requeridos.length > 0 && (
                      <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                        <div className="bg-slate-100 dark:bg-slate-900 p-3 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                          <span className="font-semibold text-sm">Artículos Requeridos</span>
                          <Badge variant="secondary">{request.items_requeridos.length}</Badge>
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                          {request.items_requeridos.map((item: any, index: number) => (
                            <div key={index} className="p-3 bg-white dark:bg-slate-950/50 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                              <div className="flex justify-between items-start mb-1">
                                <span className="font-medium text-sm">Item #{index + 1}</span>
                                <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-400">
                                  Cant: {item.cantidad}
                                </span>
                              </div>
                              <p className="text-sm text-slate-600 dark:text-slate-300">{item.especificaciones}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Archivos adjuntos */}
            {request.supporting_documents && request.supporting_documents.length > 0 && (
              <>
                <Separator className="bg-slate-100 dark:bg-slate-800" />
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    Archivos Adjuntos ({request.supporting_documents.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {request.supporting_documents.map((url: string, index: number) => {
                      const fileName = getFileNameFromUrl(url)
                      return (
                        <div key={index} className="flex items-center justify-between p-3 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg group hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-blue-600 dark:text-blue-400">
                              <FileText className="h-4 w-4" />
                            </div>
                            <span className="text-sm truncate font-medium text-slate-700 dark:text-slate-300">{fileName}</span>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => window.open(url, "_blank")}
                              className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => downloadFile(url, fileName)}
                              className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600"
                            >
                              <Download className="h-4 w-4" />
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
                <Separator className="bg-slate-100 dark:bg-slate-800" />
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    Comentarios del Revisor
                  </h4>
                  <div className={`p-4 rounded-xl border ${
                    request.status === 'APROBADA' || request.status === 'aprobada' 
                      ? 'bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-900/30' 
                      : request.status === 'DESAPROBADA' || request.status === 'desaprobada'
                        ? 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30'
                        : 'bg-slate-50 dark:bg-slate-900/30 border-slate-100 dark:border-slate-800'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{request.review_comments}</p>
                    {request.reviewed_at && (
                      <div className="flex items-center gap-2 mt-3 text-xs text-slate-400">
                        <Clock className="h-3 w-3" />
                        <span>
                          Revisado el {formatDateTime(request.reviewed_at)}
                          {request.reviewer_name && ` por ${request.reviewer_name}`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Acciones de aprobación (si están habilitadas) */}
            {showActions && action && (
               <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                 <h4 className="font-semibold text-sm">
                   {action === "approve" ? "Aprobar Solicitud" : "Rechazar Solicitud"}
                 </h4>
                 <div className="space-y-2">
                   <Label>Comentarios {action === "reject" && <span className="text-red-500">*</span>}</Label>
                   <Textarea
                     placeholder={action === "reject" ? "Indica el motivo del rechazo..." : "Observaciones opcionales..."}
                     value={comments}
                     onChange={(e) => setComments(e.target.value)}
                     className="resize-none"
                   />
                 </div>
                 <div className="flex justify-end gap-2">
                   <Button variant="ghost" onClick={() => setAction(null)}>Cancelar</Button>
                   <Button 
                     variant={action === "reject" ? "destructive" : "default"}
                     onClick={handleAction}
                     disabled={action === "reject" && !comments.trim()}
                     className={action === "approve" ? "bg-green-600 hover:bg-green-700 text-white" : ""}
                   >
                     Confirmar {action === "approve" ? "Aprobación" : "Rechazo"}
                   </Button>
                 </div>
               </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer con acciones principales */}
        {showActions && !action && (request.status === "INGRESADA" || request.status === "ingresada" || request.status === "EN_GESTION" || request.status === "en_gestion") && (
          <DialogFooter className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <Button 
              variant="outline" 
              className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/50"
              onClick={() => setAction("reject")}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Rechazar
            </Button>
            <Button 
              className="bg-green-600 hover:bg-green-700 text-white shadow-md shadow-green-500/20"
              onClick={() => setAction("approve")}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Aprobar
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}