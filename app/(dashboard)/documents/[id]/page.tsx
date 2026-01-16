"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { 
  ArrowLeft, 
  Download, 
  Edit, 
  FileText, 
  MoveRight, 
  Eye, 
  Paperclip, 
  CheckCircle, 
  BarChart3, 
  Calendar, 
  Building, 
  User, 
  History, 
  Share2,
  MoreVertical,
  Clock,
  ShieldCheck,
  Loader2
} from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { motion, AnimatePresence } from "framer-motion"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { MovementForm } from "@/components/documents/movement-form"
import { DocumentStickerGenerator } from "@/components/documents/document-sticker-generator"
import { trackDownload } from "@/lib/download-tracker"
import { cn } from "@/lib/utils"

// Helper function to validate UUID
const isValidUUID = (str: string) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

// Status options
const statusOptions = [
  {
    value: "pending",
    label: "Pendiente",
    color: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800",
    icon: Clock
  },
  {
    value: "in_progress",
    label: "En Progreso",
    color: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800",
    icon: MoveRight
  },
  {
    value: "completed",
    label: "Completado",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800",
    icon: CheckCircle
  },
  {
    value: "cancelled",
    label: "Cancelado",
    color: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800",
    icon: FileText
  },
]

// Animations
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.4 }
  }
}

const DepartmentBadge = ({ department, isDestination = false }: { department: any; isDestination?: boolean }) => {
  if (!department) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
        {isDestination ? "Destino desconocido" : "Origen desconocido"}
      </span>
    )
  }
  
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border shadow-sm",
        isDestination 
          ? "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-800" 
          : "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
      )}
    >
      {department.name}
      {isDestination && <MoveRight className="ml-1 h-3 w-3 opacity-70" />}
    </span>
  )
}

export default function DocumentDetailsPage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  
  // State
  const [document, setDocument] = useState<any>(null)
  const [movements, setMovements] = useState<any[]>([])
  const [attachments, setAttachments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Dialogs
  const [movementDialogOpen, setMovementDialogOpen] = useState(false)
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [downloadStatsOpen, setDownloadStatsOpen] = useState(false)
  const [viewerOpen, setViewerOpen] = useState(false)
  
  // Loading states
  const [downloadLoading, setDownloadLoading] = useState(false)
  const [statusLoading, setStatusLoading] = useState(false)
  const [statsLoading, setStatsLoading] = useState(false)
  
  // Form states
  const [newStatus, setNewStatus] = useState("")
  const [statusNotes, setStatusNotes] = useState("")
  const [viewerUrl, setViewerUrl] = useState<string | null>(null)
  const [downloadStats, setDownloadStats] = useState<any[]>([])
  const [canViewAttachments, setCanViewAttachments] = useState(true)

  useEffect(() => {
    if (!id || typeof id !== "string") {
      setError("ID de documento inválido")
      setLoading(false)
      return
    }
    if (!isValidUUID(id)) {
      setError("Formato de ID de documento inválido")
      setLoading(false)
      return
    }
    if (user) {
      fetchDocument()
      fetchMovements()
      fetchAttachments()
    }
  }, [id, user])

  const canUserViewAttachments = (doc: any) => {
    if (user?.role === "admin" || user?.role === "supervisor" || user?.id === doc?.created_by) return true
    if (user?.department_id === doc?.current_department_id) return true
    return false
  }

  const fetchDocument = async () => {
    try {
      let { data, error } = await supabase
        .from("documents")
        .select(`
          *,
          profiles!documents_created_by_fkey (id, full_name, email, company_id, department_id, current_department_id),
          departments!documents_current_department_id_fkey (id, name, color),
          companies!documents_company_id_fkey (id, name, code),
          document_movements!document_movements_document_id_fkey (
            id, from_department_id, to_department_id, created_at
          )
        `)
        .eq("id", id)
        .single()

      if (error) throw error

      if (data) {
        if (data.profiles?.company_id && !data.creator_company) {
          const { data: creatorCompData } = await supabase.from("companies").select("id, name, code").eq("id", data.profiles.company_id).single()
          data.creator_company = creatorCompData
        }
        if (data.profiles?.department_id && !data.creator_department) {
          const { data: creatorDeptData } = await supabase.from("departments").select("id, name, color").eq("id", data.profiles.department_id).single()
          data.creator_department = creatorDeptData
        }

        const hasHistoricalAccess = data.document_movements?.some(
          (movement: any) => movement.to_department_id === user?.department_id || movement.from_department_id === user?.department_id
        )
        
        if (
          user?.role !== "admin" &&
          user?.role !== "supervisor" &&
          user?.department_id !== data.current_department_id &&
          user?.id !== data.created_by &&
          !hasHistoricalAccess
        ) {
          setError("No tienes permisos para ver este documento")
          return
        }

        setDocument(data)
        setCanViewAttachments(canUserViewAttachments(data))
      }
    } catch (error: any) {
      console.error("Error fetching document:", error)
      setError("Error al cargar el documento")
    } finally {
      setLoading(false)
    }
  }

  const fetchMovements = async () => {
    try {
      const { data, error } = await supabase
        .from("document_movements")
        .select(`
          *,
          from_departments:from_department_id(id, name, color),
          to_departments:to_department_id(id, name, color),
          profiles!document_movements_moved_by_fkey(id, full_name, email)
        `)
        .eq("document_id", id)
        .order("created_at", { ascending: false })
      
      if (error) throw error
      setMovements(data || [])
    } catch (error) {
      console.error("Error fetching movements:", error)
    }
  }

  const fetchAttachments = async () => {
    try {
      const { data, error } = await supabase
        .from("document_attachments")
        .select(`*, profiles!document_attachments_uploaded_by_fkey (id, full_name)`)
        .eq("document_id", id)
        .order("created_at", { ascending: false })
      
      if (error) throw error
      setAttachments(data || [])
    } catch (error) {
      console.error("Error fetching attachments:", error)
    }
  }

  const fetchDownloadStats = async () => {
    try {
      setStatsLoading(true)
      const { data, error } = await supabase
        .from("download_logs")
        .select(`*, profiles(full_name)`)
        .eq("document_id", id)
        .order("created_at", { ascending: false })
      
      if (error) throw error
      setDownloadStats(data || [])
    } catch (error: any) {
      toast({ title: "Error", description: "Error al cargar estadísticas.", variant: "destructive" })
    } finally {
      setStatsLoading(false)
    }
  }

  // --- Actions ---

  const handleStatusChange = async () => {
    if (!newStatus || !document) return
    try {
      setStatusLoading(true)
      const { error: updateError } = await supabase
        .from("documents")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", document.id)
      
      if (updateError) throw updateError
      
      if (statusNotes.trim()) {
        await supabase.from("document_movements").insert({
          document_id: document.id,
          from_department_id: document.current_department_id,
          to_department_id: document.current_department_id,
          moved_by: user?.id,
          notes: `Cambio de estado: ${getStatusLabel(document.status)} → ${getStatusLabel(newStatus)}\n\nNotas: ${statusNotes}`,
          created_at: new Date().toISOString(),
        })
      }
      
      setDocument((prev: any) => ({ ...prev, status: newStatus }))
      fetchDocument()
      fetchMovements()
      toast({ title: "Estado actualizado", description: `El estado cambió a "${getStatusLabel(newStatus)}"` })
      setStatusDialogOpen(false)
      setNewStatus("")
      setStatusNotes("")
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setStatusLoading(false)
    }
  }

  const viewFile = async (fileUrl: string) => {
    try {
      let filePath = fileUrl
      if (filePath.startsWith("http")) {
        const url = new URL(filePath)
        const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/documents\/(.+)/)
        filePath = pathMatch && pathMatch[1] ? pathMatch[1] : url.pathname.replace("/storage/v1/object/public/", "")
      }
      const { data } = await supabase.storage.from("documents").createSignedUrl(filePath, 3600)
      if (data?.signedUrl) {
        setViewerUrl(data.signedUrl)
        setViewerOpen(true)
      } else {
        throw new Error("No se pudo generar la URL firmada")
      }
    } catch (error) {
      toast({ title: "Error", description: "No se pudo cargar la vista previa", variant: "destructive" })
    }
  }

  const downloadFile = async (fileUrl: string, fileName?: string) => {
    try {
      setDownloadLoading(true)
      let filePath = fileUrl
      if (filePath.startsWith("http")) {
        const url = new URL(filePath)
        const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/documents\/(.+)/)
        filePath = pathMatch && pathMatch[1] ? pathMatch[1] : url.pathname.replace("/storage/v1/object/public/", "")
      }
      
      const { data, error } = await supabase.storage.from("documents").download(filePath)
      if (error) throw error
      
      if (user) {
        await trackDownload({
          documentId: document.id,
          userId: user.id,
          downloadType: "main_file",
          fileName: fileName || document.file_name || "documento",
          fileSize: data.size
        })
      }
      
      const url = URL.createObjectURL(data)
      const a = document.createElement("a")
      a.href = url
      a.download = fileName || filePath.split("/").pop() || "documento"
      document.body.appendChild(a)
      a.click()
      URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error: any) {
      toast({ title: "Error", description: "No se pudo descargar el archivo", variant: "destructive" })
    } finally {
      setDownloadLoading(false)
    }
  }

  // --- Helpers ---

  const getStatusLabel = (status: string) => statusOptions.find(o => o.value === status)?.label || status
  
  const getStatusBadge = (status: string) => {
    const option = statusOptions.find(o => o.value === status)
    if (!option) return <Badge variant="outline">{status}</Badge>
    const Icon = option.icon
    return (
      <Badge variant="outline" className={cn("pl-2 pr-3 py-1 gap-1.5 border", option.color)}>
        <Icon className="h-3.5 w-3.5" />
        {option.label}
      </Badge>
    )
  }

  const canChangeStatus = () => {
    if (user?.role === "admin" || user?.role === "supervisor") return user?.department_id === document?.current_department_id
    return user?.id === document?.created_by && user?.department_id === document?.current_department_id
  }

  const canEdit = () => {
    if (user?.department_id !== document?.current_department_id) return false
    if (user?.role === "admin" || user?.role === "supervisor") return true
    return user?.id === document?.created_by
  }

  const canMove = () => {
    if (user?.department_id !== document?.current_department_id) return false
    return true
  }

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-64 rounded-2xl" />
              <Skeleton className="h-96 rounded-2xl" />
           </div>
           <div className="space-y-6">
              <Skeleton className="h-80 rounded-2xl" />
           </div>
        </div>
      </div>
    )
  }

  if (error || !document) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-6">
        <Card className="max-w-md w-full border-none shadow-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
               <FileText className="h-8 w-8 text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">{error || "Documento no encontrado"}</h3>
            <p className="text-slate-500 dark:text-slate-400">
              {error === "No tienes permisos para ver este documento"
                ? "Este documento pertenece a un área restringida para tu usuario."
                : "El documento que buscas no existe o ha sido eliminado."}
            </p>
            <Button asChild className="w-full mt-6 rounded-xl bg-indigo-600 hover:bg-indigo-700">
              <Link href="/documents">Volver a Documentos</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <motion.div 
      initial="hidden" 
      animate="visible" 
      variants={containerVariants}
      className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-8"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button variant="outline" size="icon" asChild className="rounded-xl mt-1 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm hover:translate-x-[-2px] transition-transform">
            <Link href="/documents">
              <ArrowLeft className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-slate-900 via-slate-700 to-slate-600 dark:from-white dark:via-slate-200 dark:to-slate-400 bg-clip-text text-transparent">
                {document.title}
              </h1>
              {getStatusBadge(document.status)}
            </div>
            <div className="flex items-center gap-2 mt-2 text-sm text-slate-500 dark:text-slate-400 font-mono">
              <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                #{document.document_number}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                 <Calendar className="h-3.5 w-3.5" />
                 {format(new Date(document.created_at), "PPP", { locale: es })}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
           {/* Mobile Actions Dropdown */}
           <div className="sm:hidden">
              <DropdownMenu>
                 <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                 </DropdownMenuTrigger>
                 <DropdownMenuContent align="end">
                    {canEdit() && <DropdownMenuItem onClick={() => router.push(`/documents/edit/${document.id}`)}>Editar</DropdownMenuItem>}
                    {canMove() && <DropdownMenuItem onClick={() => setMovementDialogOpen(true)}>Mover</DropdownMenuItem>}
                    {canChangeStatus() && <DropdownMenuItem onClick={() => setStatusDialogOpen(true)}>Cambiar Estado</DropdownMenuItem>}
                 </DropdownMenuContent>
              </DropdownMenu>
           </div>
           
           {/* Desktop Actions */}
           <div className="hidden sm:flex items-center gap-2">
              {canChangeStatus() && (
                 <Button variant="outline" onClick={() => setStatusDialogOpen(true)} className="rounded-xl border-slate-200 dark:border-slate-700">
                    Cambiar Estado
                 </Button>
              )}
              {canMove() && (
                 <Button onClick={() => setMovementDialogOpen(true)} className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20">
                    <MoveRight className="h-4 w-4 mr-2" /> Mover
                 </Button>
              )}
           </div>
        </div>
      </motion.div>

      {/* Alerts */}
      <AnimatePresence>
        {!canEdit() && !canMove() && user?.role !== "admin" && (
          <motion.div variants={itemVariants} className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex gap-3">
             <ShieldCheck className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
             <div>
                <h4 className="font-semibold text-amber-900 dark:text-amber-100">Modo Solo Lectura</h4>
                <p className="text-sm text-amber-800 dark:text-amber-200">
                   Este documento no se encuentra en tu departamento actual. Tienes acceso de lectura pero no puedes editarlo ni moverlo.
                </p>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content - Left Column */}
        <motion.div variants={itemVariants} className="lg:col-span-2 space-y-8">
          
          {/* Main File Card */}
          {document.file_url && (
            <Card className="border-none shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl overflow-hidden group">
              <CardHeader className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600">
                     <FileText className="h-5 w-5" />
                  </div>
                  Archivo Principal
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 group-hover:border-blue-200 dark:group-hover:border-blue-800 transition-colors">
                  <div className="h-12 w-12 rounded-lg bg-white dark:bg-slate-700 shadow-sm flex items-center justify-center text-red-500">
                     <FileText className="h-7 w-7" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 dark:text-slate-100 truncate">{document.file_name || "Documento Adjunto"}</p>
                    <p className="text-sm text-slate-500">Subido por {document.profiles?.full_name}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => viewFile(document.file_url)} className="text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20">
                      <Eye className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => downloadFile(document.file_url)} disabled={downloadLoading} className="text-slate-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20">
                      {downloadLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Details Card */}
          <Card className="border-none shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl">
            <CardHeader>
               <CardTitle>Detalles del Documento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  <div>
                     <Label className="text-slate-500 text-xs uppercase tracking-wider font-semibold">Departamento Actual</Label>
                     <div className="mt-1 flex items-center gap-2">
                        <Building className="h-4 w-4 text-slate-400" />
                        <span className="font-medium text-slate-800 dark:text-slate-200">{document.departments?.name || "Sin asignar"}</span>
                     </div>
                  </div>
                  <div>
                     <Label className="text-slate-500 text-xs uppercase tracking-wider font-semibold">Creado Por</Label>
                     <div className="mt-1 flex items-center gap-2">
                        <User className="h-4 w-4 text-slate-400" />
                        <span className="font-medium text-slate-800 dark:text-slate-200">{document.profiles?.full_name}</span>
                     </div>
                  </div>
                  {document.creator_company && (
                     <div>
                        <Label className="text-slate-500 text-xs uppercase tracking-wider font-semibold">Empresa Origen</Label>
                        <div className="mt-1 font-medium text-slate-800 dark:text-slate-200">
                           {document.creator_company.name}
                        </div>
                     </div>
                  )}
                  {document.description && (
                     <div className="md:col-span-2">
                        <Label className="text-slate-500 text-xs uppercase tracking-wider font-semibold">Descripción</Label>
                        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                           {document.description}
                        </p>
                     </div>
                  )}
               </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card className="border-none shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                 <History className="h-5 w-5 text-indigo-500" />
                 Historial de Movimientos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative pl-4 border-l-2 border-slate-100 dark:border-slate-800 space-y-8 ml-2">
                 {movements.map((movement, index) => (
                    <div key={movement.id} className="relative">
                       <div className={cn(
                          "absolute -left-[21px] top-1 h-3 w-3 rounded-full border-2 border-white dark:border-slate-900",
                          index === 0 ? "bg-indigo-500 ring-4 ring-indigo-100 dark:ring-indigo-900/30" : "bg-slate-300 dark:bg-slate-600"
                       )} />
                       
                       <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-4 border border-slate-100 dark:border-slate-700">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                             <div className="flex items-center gap-2 flex-wrap">
                                <DepartmentBadge department={movement.from_departments} />
                                <MoveRight className="h-4 w-4 text-slate-400" />
                                <DepartmentBadge department={movement.to_departments} isDestination />
                             </div>
                             <span className="text-xs text-slate-500 whitespace-nowrap">
                                {format(new Date(movement.created_at), "dd MMM yyyy, HH:mm", { locale: es })}
                             </span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 mb-2">
                             <User className="h-3 w-3" />
                             <span>{movement.profiles?.full_name || "Sistema"}</span>
                          </div>

                          {movement.notes && (
                             <div className="text-sm bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 italic">
                                "{movement.notes}"
                             </div>
                          )}
                       </div>
                    </div>
                 ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Sidebar - Right Column */}
        <motion.div variants={itemVariants} className="space-y-6">
           {/* Actions Card */}
           <Card className="border-none shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl">
              <CardHeader>
                 <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">Acciones Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                 {canEdit() ? (
                    <Button variant="outline" className="w-full justify-start h-11 rounded-xl" asChild>
                       <Link href={`/documents/edit/${document.id}`}>
                          <Edit className="h-4 w-4 mr-2" /> Editar Documento
                       </Link>
                    </Button>
                 ) : (
                    <Button variant="outline" className="w-full justify-start h-11 rounded-xl opacity-50 cursor-not-allowed">
                       <Edit className="h-4 w-4 mr-2" /> Editar (No permitido)
                    </Button>
                 )}
                 
                 {user?.role === "admin" && (
                    <Button variant="outline" className="w-full justify-start h-11 rounded-xl" onClick={() => { fetchDownloadStats(); setDownloadStatsOpen(true); }}>
                       <BarChart3 className="h-4 w-4 mr-2" /> Estadísticas
                    </Button>
                 )}
              </CardContent>
           </Card>

           {/* QR Code */}
           <Card className="border-none shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl">
              <CardHeader>
                 <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">Acceso Público</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center p-6 pt-0">
                 {document.qr_code ? (
                    <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-100">
                       <img src={document.qr_code} alt="QR Code" className="w-32 h-32 object-contain" />
                    </div>
                 ) : (
                    <div className="w-32 h-32 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 text-xs">
                       Sin QR
                    </div>
                 )}
                 <p className="text-xs text-center text-slate-500 mt-4 max-w-[200px]">
                    Escanea este código para acceder a la versión pública del documento.
                 </p>
              </CardContent>
           </Card>

           {/* Stickers Generator */}
           {document.profiles?.full_name && (
              <Card className="border-none shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl">
                 <CardHeader>
                    <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">Etiquetas</CardTitle>
                 </CardHeader>
                 <CardContent>
                    <DocumentStickerGenerator
                      documentId={document.id}
                      documentNumber={document.document_number}
                      createdAt={document.created_at}
                      creatorName={document.profiles.full_name}
                      trackingHash={document.tracking_hash || ""}
                      companyName={document.companies?.name}
                      departmentName={document.creator_department?.name}
                      creatorCompanyName={document.creator_company?.name}
                      creatorDepartmentName={document.creator_department?.name}
                    />
                 </CardContent>
              </Card>
           )}
        </motion.div>
      </div>

      {/* Dialogs */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Cambiar Estado</DialogTitle>
            <DialogDescription>Actualiza el estado de seguimiento de este documento.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 pt-4">
            <div className="space-y-2">
               <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Nuevo Estado</Label>
               <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger className="h-12 rounded-xl bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
                     <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                     {statusOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                           <div className="flex items-center gap-2">
                              <opt.icon className="h-4 w-4" />
                              {opt.label}
                           </div>
                        </SelectItem>
                     ))}
                  </SelectContent>
               </Select>
            </div>
            <div className="space-y-2">
               <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Notas (Opcional)</Label>
               <Textarea 
                  value={statusNotes} 
                  onChange={e => setStatusNotes(e.target.value)} 
                  placeholder="Justificación o detalles adicionales..."
                  className="rounded-xl resize-none bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 min-h-[100px]" 
               />
            </div>
            <div className="flex gap-3 pt-2">
               <Button variant="ghost" onClick={() => setStatusDialogOpen(false)} className="flex-1 rounded-xl">Cancelar</Button>
               <Button onClick={handleStatusChange} disabled={statusLoading || !newStatus} className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20">
                  {statusLoading ? (
                     <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Actualizando...
                     </>
                  ) : "Confirmar Cambio"}
               </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={movementDialogOpen} onOpenChange={setMovementDialogOpen}>
        <DialogContent className="max-w-2xl rounded-2xl p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
               <MoveRight className="h-5 w-5 text-indigo-500" />
               Mover Documento
            </DialogTitle>
            <DialogDescription>Transfiere este documento a otro departamento.</DialogDescription>
          </DialogHeader>
          <MovementForm
            documentId={document.id}
            currentDepartmentId={document.current_department_id || document.departments?.id}
            onComplete={() => {
               setMovementDialogOpen(false)
               fetchDocument()
               fetchMovements()
            }}
          />
        </DialogContent>
      </Dialog>
      
      {/* File Viewer Dialog */}
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
         <DialogContent className="max-w-5xl h-[80vh] rounded-2xl p-0 overflow-hidden">
            <div className="h-full w-full bg-slate-100 dark:bg-slate-900 flex flex-col">
               <div className="p-4 border-b bg-white dark:bg-slate-800 flex justify-between items-center">
                  <h3 className="font-semibold">Vista Previa</h3>
                  <Button variant="ghost" size="sm" onClick={() => setViewerOpen(false)}>Cerrar</Button>
               </div>
               <div className="flex-1 p-4 overflow-hidden">
                  {viewerUrl && <iframe src={viewerUrl} className="w-full h-full rounded-lg border bg-white" title="Preview" />}
               </div>
            </div>
         </DialogContent>
      </Dialog>
      
      {/* Download Stats Dialog */}
      <Dialog open={downloadStatsOpen} onOpenChange={setDownloadStatsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>Estadísticas de Descarga</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
             {statsLoading ? (
                <div className="p-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-500" /></div>
             ) : downloadStats.length === 0 ? (
                <div className="p-8 text-center text-slate-500 bg-slate-50 dark:bg-slate-800/50 rounded-xl">No hay descargas registradas</div>
             ) : (
                <div className="rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                   <Table>
                      <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
                         <TableRow>
                            <TableHead>Usuario</TableHead>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Tipo</TableHead>
                         </TableRow>
                      </TableHeader>
                      <TableBody>
                         {downloadStats.map(stat => (
                            <TableRow key={stat.id}>
                               <TableCell className="font-medium">{stat.profiles?.full_name || "Anónimo"}</TableCell>
                               <TableCell>{format(new Date(stat.created_at), "dd MMM yyyy, HH:mm", { locale: es })}</TableCell>
                               <TableCell><Badge variant="outline">{stat.download_type || "Archivo Principal"}</Badge></TableCell>
                            </TableRow>
                         ))}
                      </TableBody>
                   </Table>
                </div>
             )}
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
