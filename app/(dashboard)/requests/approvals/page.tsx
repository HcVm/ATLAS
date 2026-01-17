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
  Filter,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
    color: "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800",
  },
  absence_justification: {
    label: "Justificación de Ausencia",
    icon: User,
    color: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
  },
  overtime_request: {
    label: "Registro de Horas Extras",
    icon: Plus,
    color: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
  },
  permission_request: {
    label: "Solicitud de Permiso",
    icon: AlertCircle,
    color: "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
  },
  equipment_request: {
    label: "Solicitud de Equipos/Materiales",
    icon: Wrench,
    color: "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800",
  },
  general_request: {
    label: "Solicitud General",
    icon: MessageSquare,
    color: "text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/20 border-slate-200 dark:border-slate-800",
  },
}

const STATUS_CONFIG = {
  INGRESADA: {
    label: "Ingresada",
    icon: AlertCircle,
    color: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
  },
  EN_GESTION: {
    label: "En Gestión",
    icon: Loader2,
    color: "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800",
  },
  APROBADA: {
    label: "Aprobada",
    icon: CheckCircle,
    color: "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
  },
  DESAPROBADA: {
    label: "Desaprobada",
    icon: XCircle,
    color: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
  },
  EJECUTADA: {
    label: "Ejecutada",
    icon: CheckCircle,
    color: "text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800",
  },
  CANCELADA: {
    label: "Cancelada",
    icon: Clock,
    color: "text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/20 border-slate-200 dark:border-slate-800",
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

      const filteredRequests = (result.data || []).filter(
        (request: Request) => request.status === "INGRESADA" || request.status === "EN_GESTION",
      )
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
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-slate-50 dark:bg-slate-900/50 p-2 rounded border border-slate-100 dark:border-slate-800">
              <CalendarIcon className="h-4 w-4" />
              <span>Fecha: {new Date(request.incident_date).toLocaleDateString("es-ES")}</span>
              {request.incident_time && <span className="ml-2">Hora: {request.incident_time}</span>}
            </div>
          ) : null

        case "overtime_request":
          return request.incident_date ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-slate-50 dark:bg-slate-900/50 p-2 rounded border border-slate-100 dark:border-slate-800">
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
            <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap bg-slate-50 dark:bg-slate-900/50 p-2 rounded border border-slate-100 dark:border-slate-800">
              <Calendar className="h-4 w-4" />
              <span>{new Date(request.incident_date).toLocaleDateString("es-ES")}</span>
              {request.end_date && (
                <>
                  <span>-</span>
                  <span>{new Date(request.end_date).toLocaleDateString("es-ES")}</span>
                </>
              )}
              {request.permission_days && <span className="ml-2 font-medium">({request.permission_days} días)</span>}
            </div>
          ) : null

        case "equipment_request":
          return (
            <div className="space-y-2 text-sm text-muted-foreground bg-slate-50 dark:bg-slate-900/50 p-3 rounded border border-slate-100 dark:border-slate-800">
              {request.requerimiento_numero && (
                <div className="flex justify-between">
                  <span className="text-xs uppercase tracking-wider">Requerimiento</span>
                  <span className="font-mono font-medium">{request.requerimiento_numero}</span>
                </div>
              )}
              {request.items_requeridos && request.items_requeridos.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-xs uppercase tracking-wider">Items</span>
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
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -5 }}
        transition={{ duration: 0.2 }}
      >
        <Card className="h-full border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl shadow-sm hover:shadow-lg transition-all duration-300">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${requestType?.color.split(' ')[0]} bg-slate-100 dark:bg-slate-800`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold">{requestType?.label || request.request_type}</CardTitle>
                  <CardDescription className="text-xs">
                    {request.department_name}
                  </CardDescription>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge variant="outline" className={`${status?.color} border`}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {status?.label || request.status}
                </Badge>
                {expired && (
                  <Badge variant="destructive" className="text-[10px]">
                    Expirada
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-900/30">
              <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
                <User className="h-4 w-4 text-slate-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{request.requester_name}</p>
                <p className="text-xs text-muted-foreground truncate">{request.requester_email}</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2 italic">"{request.reason}"</p>
              {renderTypeSpecificFields()}
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-slate-100 dark:border-slate-800">
              <span>{formatDate(request.created_at)}</span>
              {request.supporting_documents && request.supporting_documents.length > 0 && (
                <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                  <FileText className="h-3 w-3" />
                  <span>{request.supporting_documents.length} adjuntos</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button size="sm" variant="outline" onClick={handleViewDetails} className="w-full">
                <Eye className="h-3 w-3 mr-1" />
                Detalles
              </Button>
              {(request.status === "INGRESADA" || request.status === "EN_GESTION") && (
                <Button
                  size="sm"
                  onClick={() => handleApprovalAction(request, "approve")}
                  className="w-full bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900"
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Evaluar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  if (!user || (user.role !== "admin" && user.role !== "supervisor")) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="glass-card max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Acceso Restringido</h3>
              <p className="text-slate-500 dark:text-slate-400 mt-2">
                Solo los administradores y supervisores pueden acceder al panel de aprobaciones.
              </p>
            </div>
            <Button asChild variant="outline" className="w-full">
              <a href="/dashboard">Volver al Inicio</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
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
        <p className="text-slate-500 dark:text-slate-400 animate-pulse">Cargando solicitudes pendientes...</p>
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
            Aprobaciones
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-lg">
            Gestión de solicitudes de {user.role === "admin" ? "todos los departamentos" : "tu equipo"}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: "Ingresadas", status: "INGRESADA", icon: AlertCircle, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/20" },
          { label: "En Gestión", status: "EN_GESTION", icon: Loader2, color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-900/20" },
          { label: "Total Pendientes", status: "TOTAL", icon: Eye, color: "text-slate-500", bg: "bg-slate-50 dark:bg-slate-900/20" },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl shadow-sm hover:shadow-md transition-all">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{stat.label}</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                    {stat.status === "TOTAL" ? filteredRequests.length : getRequestsByStatus(stat.status).length}
                  </p>
                </div>
                <div className={`p-3 rounded-xl ${stat.bg}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <Card className="border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl shadow-sm">
        <CardContent className="p-5">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
              <Input
                placeholder="Buscar por solicitante, razón..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:ring-blue-500/20"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-[250px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-slate-400" />
                  <SelectValue placeholder="Filtrar por Tipo" />
                </div>
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

      <Tabs defaultValue="INGRESADA" className="space-y-6">
        <TabsList className="bg-white/50 dark:bg-slate-900/50 p-1 border border-slate-200/50 dark:border-slate-800/50 backdrop-blur-sm rounded-xl w-full flex overflow-x-auto">
          <TabsTrigger value="INGRESADA" className="flex-1 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm transition-all">
            Ingresadas <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-700">{getRequestsByStatus("INGRESADA").length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="EN_GESTION" className="flex-1 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm transition-all">
            En Gestión <Badge variant="secondary" className="ml-2 bg-orange-100 text-orange-700">{getRequestsByStatus("EN_GESTION").length}</Badge>
          </TabsTrigger>
          {user.role === "supervisor" && (
            <TabsTrigger
              value="history"
              className="flex-1 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm transition-all"
              onClick={() => {
                if (approvalHistory.length === 0) {
                  fetchApprovalHistory()
                }
              }}
            >
              <History className="h-4 w-4 mr-2" />
              Historial
            </TabsTrigger>
          )}
        </TabsList>

        <AnimatePresence mode="popLayout">
          {["INGRESADA", "EN_GESTION"].map((status) => (
            <TabsContent key={status} value={status} className="mt-0">
              {getRequestsByStatus(status).length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <Card className="border-dashed border-2 border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20">
                    <CardContent className="p-12 text-center flex flex-col items-center">
                      <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                        <CheckCircle className="h-8 w-8 text-green-500" />
                      </div>
                      <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                        Todo al día
                      </h3>
                      <p className="text-slate-500 dark:text-slate-400">
                        No hay solicitudes pendientes en esta categoría.
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {getRequestsByStatus(status).map((request) => (
                    <RequestCard key={request.id} request={request} />
                  ))}
                </div>
              )}
            </TabsContent>
          ))}

          {user.role === "supervisor" && (
            <TabsContent value="history" className="mt-0">
              {loadingHistory ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                  <p className="text-muted-foreground">Cargando historial...</p>
                </div>
              ) : filteredHistory.length === 0 ? (
                <Card className="border-dashed border-2 border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20">
                  <CardContent className="p-12 text-center flex flex-col items-center">
                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                      <History className="h-8 w-8 text-slate-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                      Historial vacío
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400">
                      No se encontraron registros en el historial.
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
        </AnimatePresence>
      </Tabs>

      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Actualizar Estado</DialogTitle>
            <DialogDescription>
              {selectedRequest && (
                <span className="block mt-2 p-2 bg-slate-100 dark:bg-slate-800 rounded text-sm">
                  Solicitud de <strong>{selectedRequest.requester_name}</strong>
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nuevo Estado</Label>
              <Select value={selectedStatus} onValueChange={(value: any) => setSelectedStatus(value)}>
                <SelectTrigger className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EN_GESTION">En Gestión</SelectItem>
                  <SelectItem value="APROBADA" className="text-green-600 font-medium">Aprobar Solicitud</SelectItem>
                  <SelectItem value="DESAPROBADA" className="text-red-600 font-medium">Rechazar Solicitud</SelectItem>
                  <SelectItem value="EJECUTADA">Marcar como Ejecutada</SelectItem>
                  <SelectItem value="CANCELADA">Cancelar</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>
                Comentarios {selectedStatus === "DESAPROBADA" && <span className="text-red-500">*</span>}
              </Label>
              <Textarea
                placeholder={selectedStatus === "DESAPROBADA" ? "Motivo del rechazo..." : "Observaciones opcionales..."}
                value={approverComments}
                onChange={(e) => setApproverComments(e.target.value)}
                className="resize-none"
                rows={4}
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
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : selectedStatus === "DESAPROBADA"
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : ""
              }
            >
              {processingApproval ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : (
                "Confirmar Acción"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RequestDetailsDialog request={selectedRequest} open={showDetailsDialog} onOpenChange={setShowDetailsDialog} />
    </motion.div>
  )
}
