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
  Filter,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RequestDetailsDialog } from "@/components/requests/request-details-dialog"
import { motion, AnimatePresence } from "framer-motion"

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
    color: "from-orange-500 to-amber-500",
    bg: "bg-orange-50 dark:bg-orange-900/20",
    text: "text-orange-700 dark:text-orange-300",
  },
  absence_justification: {
    label: "Justificación de Ausencia",
    icon: UserX,
    color: "from-red-500 to-rose-500",
    bg: "bg-red-50 dark:bg-red-900/20",
    text: "text-red-700 dark:text-red-300",
  },
  overtime_request: {
    label: "Registro de Horas Extras",
    icon: Plus,
    color: "from-blue-500 to-cyan-500",
    bg: "bg-blue-50 dark:bg-blue-900/20",
    text: "text-blue-700 dark:text-blue-300",
  },
  permission_request: {
    label: "Solicitud de Permiso",
    icon: Calendar,
    color: "from-green-500 to-emerald-500",
    bg: "bg-green-50 dark:bg-green-900/20",
    text: "text-green-700 dark:text-green-300",
  },
  equipment_request: {
    label: "Solicitud de Equipos/Materiales",
    icon: Wrench,
    color: "from-purple-500 to-violet-500",
    bg: "bg-purple-50 dark:bg-purple-900/20",
    text: "text-purple-700 dark:text-purple-300",
  },
  general_request: {
    label: "Solicitud General",
    icon: MessageSquare,
    color: "from-slate-500 to-gray-500",
    bg: "bg-slate-50 dark:bg-slate-900/20",
    text: "text-slate-700 dark:text-slate-300",
  },
}

const STATUS_CONFIG = {
  pending: {
    label: "Pendiente",
    icon: AlertCircle,
    color: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800",
  },
  in_progress: {
    label: "En Proceso",
    icon: Loader2,
    color: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
  },
  approved: {
    label: "Aprobada",
    icon: CheckCircle,
    color: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800",
  },
  rejected: {
    label: "Rechazada",
    icon: XCircle,
    color: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
  },
  expired: {
    label: "Expirada",
    icon: Clock,
    color: "text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/20 border-slate-200 dark:border-slate-800",
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
            <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800 text-sm space-y-2">
              {request.requerimiento_numero && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">Requerimiento</span>
                  <span className="font-mono font-medium">{request.requerimiento_numero}</span>
                </div>
              )}
              {request.items_requeridos && request.items_requeridos.length > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">Items</span>
                  <Badge variant="secondary" className="bg-white dark:bg-slate-800">
                    {request.items_requeridos.length} artículo(s)
                  </Badge>
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
        exit={{ opacity: 0, scale: 0.95 }}
        whileHover={{ y: -5 }}
        transition={{ duration: 0.2 }}
      >
        <Card className="h-full border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group">
          <div className={`h-1.5 w-full bg-gradient-to-r ${requestType?.color || "from-slate-400 to-gray-400"}`} />
          <CardContent className="p-5">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-2.5 rounded-xl ${requestType?.bg} ${requestType?.text}`}>
                <Icon className="h-5 w-5" />
              </div>
              <Badge variant="outline" className={`${status?.color} border px-2.5 py-0.5 rounded-full font-medium`}>
                <StatusIcon className="h-3 w-3 mr-1.5" />
                {status?.label || request.status}
              </Badge>
            </div>

            <div className="space-y-2 mb-4">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 line-clamp-1">
                {requestType?.label || request.request_type}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 min-h-[2.5rem]">
                {request.description || request.reason || "Sin descripción"}
              </p>
            </div>

            {renderTypeSpecificFields()}

            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1.5">
                <CalendarIcon className="h-3.5 w-3.5" />
                <span>{formatDate(request.created_at)}</span>
              </div>

              {expired && (
                <div className="flex items-center gap-1.5 text-red-500 font-medium">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Expirado</span>
                </div>
              )}
            </div>

            <Button
              onClick={handleViewDetails}
              className="w-full mt-4 bg-slate-900/5 dark:bg-white/5 hover:bg-slate-900/10 dark:hover:bg-white/10 text-slate-900 dark:text-slate-100 border-0"
              variant="outline"
            >
              <Eye className="h-4 w-4 mr-2" />
              Ver Detalles
            </Button>
          </CardContent>
        </Card>
      </motion.div>
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
        <p className="text-slate-500 dark:text-slate-400 animate-pulse">Cargando tus solicitudes...</p>
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
        <div className="space-y-1">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
            Mis Solicitudes
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-lg">
            Gestiona y monitorea el estado de tus requerimientos
          </p>
        </div>
        <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 transition-all hover:scale-105">
          <Link href="/requests/new">
            <Plus className="h-5 w-5 mr-2" />
            Nueva Solicitud
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Pendientes", status: "pending", icon: AlertCircle, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-900/20" },
          { label: "En Proceso", status: "in_progress", icon: Loader2, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/20" },
          { label: "Aprobadas", status: "approved", icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
          { label: "Rechazadas", status: "rejected", icon: XCircle, color: "text-red-500", bg: "bg-red-50 dark:bg-red-900/20" },
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
                    {getRequestsByStatus(stat.status).length}
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
                placeholder="Buscar por asunto, descripción..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:ring-blue-500/20"
              />
            </div>
            <div className="flex gap-4">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[180px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-slate-400" />
                    <SelectValue placeholder="Estado" />
                  </div>
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
                <SelectTrigger className="w-full md:w-[200px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                  <SelectValue placeholder="Tipo de Solicitud" />
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

      {/* Requests Grid */}
      <AnimatePresence mode="popLayout">
        {filteredRequests.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <Card className="border-dashed border-2 border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20">
              <CardContent className="p-12 text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                  <FileCheck className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                  No se encontraron solicitudes
                </h3>
                <p className="text-slate-500 dark:text-slate-400 max-w-md mb-6">
                  {requests.length === 0
                    ? "Aún no has creado ninguna solicitud. ¡Comienza ahora!"
                    : "No hay resultados que coincidan con tus filtros de búsqueda."}
                </p>
                {requests.length === 0 && (
                  <Button asChild className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200">
                    <Link href="/requests/new">
                      <Plus className="h-4 w-4 mr-2" />
                      Crear Primera Solicitud
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRequests.map((request) => (
              <RequestCard key={request.id} request={request} />
            ))}
          </div>
        )}
      </AnimatePresence>

      <RequestDetailsDialog request={selectedRequest} open={showDetailsDialog} onOpenChange={setShowDetailsDialog} />
    </motion.div>
  )
}
