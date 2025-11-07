"use client"
import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Download, Edit, FileText, MoveRight, Eye, Paperclip, CheckCircle, BarChart3 } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { MovementForm } from "@/components/documents/movement-form"
import { DocumentStickerGenerator } from "@/components/documents/document-sticker-generator"
import { trackDownload } from "@/lib/download-tracker"
// Helper function to validate UUID
const isValidUUID = (str: string) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}
// Status options con colores modernos
const statusOptions = [
  {
    value: "pending",
    label: "Pendiente",
    color: "bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-700 border-amber-200",
  },
  {
    value: "in_progress",
    label: "En Progreso",
    color: "bg-gradient-to-r from-blue-50 to-cyan-50 text-blue-700 border-blue-200",
  },
  {
    value: "completed",
    label: "Completado",
    color: "bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 border-emerald-200",
  },
  {
    value: "cancelled",
    label: "Cancelado",
    color: "bg-gradient-to-r from-rose-50 to-red-50 text-rose-700 border-rose-200",
  },
]
// Función para obtener el color de texto basado en el color de fondo
const getTextColor = (backgroundColor: string) => {
  if (!backgroundColor) return "#000000"
  const hex = backgroundColor.replace("#", "")
  const r = Number.parseInt(hex.substr(0, 2), 16)
  const g = Number.parseInt(hex.substr(2, 2), 16)
  const b = Number.parseInt(hex.substr(4, 2), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5 ? "#000000" : "#FFFFFF"
}
// Añadir el componente DepartmentBadge moderno
const DepartmentBadge = ({ department, isDestination = false }: { department: any; isDestination?: boolean }) => {
  if (!department) {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
        {isDestination ? "Destino desconocido" : "Origen desconocido"}
      </span>
    )
  }
  const backgroundColor = department.color || "#6B7280"
  const textColor = getTextColor(backgroundColor)
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
        isDestination ? "ring-2 ring-offset-1 shadow-sm" : "shadow-sm hover:shadow-md"
      }`}
      style={{
        backgroundColor,
        color: textColor,
        ringColor: isDestination ? backgroundColor : undefined,
      }}
    >
      {department.name}
      {isDestination && <span className="ml-1 text-xs opacity-75">📍</span>}
    </span>
  )
}
export default function DocumentDetailsPage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  const [document, setDocument] = useState<any>(null)
  const [movements, setMovements] = useState<any[]>([])
  const [attachments, setAttachments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [movementDialogOpen, setMovementDialogOpen] = useState(false)
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [downloadStatsOpen, setDownloadStatsOpen] = useState(false)
  const [downloadLoading, setDownloadLoading] = useState(false)
  const [statusLoading, setStatusLoading] = useState(false)
  const [newStatus, setNewStatus] = useState("")
  const [statusNotes, setStatusNotes] = useState("")
  const [statsLoading, setStatsLoading] = useState(false)
  const [canViewAttachments, setCanViewAttachments] = useState(true)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerUrl, setViewerUrl] = useState<string | null>(null)
  const [downloadStats, setDownloadStats] = useState<any[]>([])
  useEffect(() => {
    // Validate UUID before making requests
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
    if (user?.role === "admin" || user?.role === "supervisor" || user?.id === doc?.created_by) {
      return true
    }
    // Normal users can view attachments only if the document is still in their department
    if (user?.department_id === doc?.current_department_id) {
      return true
    }
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
            id,
            from_department_id,
            to_department_id,
            created_at
          )
        `)
        .eq("id", id)
        .single()

      if (error) {
        if (error.code === "PGRST116") {
          setError("Documento no encontrado")
          return
        }
        console.error("Query error:", error)
      }

      if (data) {
        if (data.profiles?.company_id && !data.creator_company) {
          const { data: creatorCompData } = await supabase
            .from("companies")
            .select("id, name, code")
            .eq("id", data.profiles.company_id)
            .single()
          data.creator_company = creatorCompData
        }

        if (data.profiles?.department_id && !data.creator_department) {
          const { data: creatorDeptData } = await supabase
            .from("departments")
            .select("id, name, color")
            .eq("id", data.profiles.department_id)
            .single()
          data.creator_department = creatorDeptData
        }

        const hasHistoricalAccess = data.document_movements?.some(
          (movement: any) =>
            movement.to_department_id === user?.department_id || movement.from_department_id === user?.department_id,
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
      } else {
        // Fallback si es necesario
        console.log("Fallback: Obteniendo datos por separado...")
        const { data: docData, error: docError } = await supabase
          .from("documents")
          .select(`
            *,
            profiles!documents_created_by_fkey (id, full_name, email, company_id, department_id, current_department_id)
          `)
          .eq("id", id)
          .single()
        if (docError) {
          if (docError.code === "PGRST116") {
            setError("Documento no encontrado")
          } else {
            throw docError
          }
          return
        }
        let departmentData = null
        if (docData.current_department_id) {
          const { data: deptData, error: deptError } = await supabase
            .from("departments")
            .select("id, name, color")
            .eq("id", docData.current_department_id)
            .single()
          if (!deptError) {
            departmentData = deptData
          }
        }
        let companyData = null
        if (docData.company_id) {
          const { data: compData, error: compError } = await supabase
            .from("companies")
            .select("id, name, code")
            .eq("id", docData.company_id)
            .single()
          if (!compError) {
            companyData = compData
          }
        }
        let creatorCompanyData = null
        let creatorDepartmentData = null
        if (docData.profiles?.company_id) {
          const { data: creatorCompData, error: creatorCompError } = await supabase
            .from("companies")
            .select("id, name, code")
            .eq("id", docData.profiles.company_id)
            .single()
          if (!creatorCompError) {
            creatorCompanyData = creatorCompData
          }
        }
        if (docData.profiles?.department_id) {
          const { data: creatorDeptData, error: creatorDeptError } = await supabase
            .from("departments")
            .select("id, name, color")
            .eq("id", docData.profiles.department_id)
            .single()
          if (!creatorDeptError) {
            creatorDepartmentData = creatorDeptData
          }
        }
        const { data: movementsData } = await supabase
          .from("document_movements")
          .select("id, from_department_id, to_department_id, created_at")
          .eq("document_id", id)
        data = {
          ...docData,
          departments: departmentData,
          companies: companyData,
          creator_company: creatorCompanyData,
          creator_department: creatorDepartmentData,
          document_movements: movementsData || [],
        }
        const hasHistoricalAccess = data.document_movements?.some(
          (movement: any) =>
            movement.to_department_id === user?.department_id || movement.from_department_id === user?.department_id,
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
        .select(`
        *,
        profiles!document_attachments_uploaded_by_fkey (id, full_name)
      `)
        .eq("document_id", id)
        .order("created_at", { ascending: false })
      if (error) throw error
      setAttachments(data || [])
    } catch (error) {
      console.error("Error fetching attachments:", error)
    }
  }
  const fetchDownloadStats = async () => {
    if (user?.role !== "admin") {
      console.log("User is not admin, skipping download stats")
      return
    }
    try {
      setStatsLoading(true)
      console.log("Fetching download stats for document:", id)
      console.log("Current user:", user)
      const { data: docCheck, error: docError } = await supabase
        .from("documents")
        .select("id, title")
        .eq("id", id)
        .single()
      if (docError) {
        console.error("Document not found:", docError)
        throw new Error("Documento no encontrado")
      }
      console.log("Document found:", docCheck)
      const { data, error } = await supabase
        .from("document_downloads")
        .select("*")
        .eq("document_id", id)
        .order("downloaded_at", { ascending: false })
      if (error) {
        console.error("Error fetching download stats:", error)
        throw error
      }
      console.log("Raw download data:", data)
      console.log("Number of records found:", data?.length || 0)
      let enrichedData = data || []
      if (data && data.length > 0) {
        const userIds = [...new Set(data.filter((d) => d.user_id).map((d) => d.user_id))]
        console.log("Unique user IDs:", userIds)
        if (userIds.length > 0) {
          const { data: profiles, error: profilesError } = await supabase
            .from("profiles")
            .select("id, full_name, email")
            .in("id", userIds)
          if (!profilesError && profiles) {
            console.log("Profiles found:", profiles)
            enrichedData = data.map((download) => {
              const profile = profiles.find((p) => p.id === download.user_id)
              return {
                ...download,
                profiles: profile || null,
              }
            })
          } else {
            console.error("Error fetching profiles:", profilesError)
          }
        }
      }
      console.log("Final enriched data:", enrichedData)
      setDownloadStats(enrichedData)
    } catch (error) {
      console.error("Error in fetchDownloadStats:", error)
      toast({
        title: "Error al cargar estadísticas",
        description: error.message || "No se pudieron cargar las estadísticas de descarga",
        variant: "destructive",
      })
    } finally {
      setStatsLoading(false)
    }
  }
  const handleMovementComplete = () => {
    setMovementDialogOpen(false)
    fetchDocument()
    fetchMovements()
    fetchAttachments()
  }
  const handleStatusChange = async () => {
    if (!newStatus || !document) return
    try {
      setStatusLoading(true)
      const { error: updateError } = await supabase
        .from("documents")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", document.id)
      if (updateError) throw updateError
      if (statusNotes.trim()) {
        const { error: historyError } = await supabase.from("document_movements").insert({
          document_id: document.id,
          from_department_id: document.current_department_id,
          to_department_id: document.current_department_id,
          moved_by: user?.id,
          notes: `Cambio de estado: ${getStatusLabel(document.status)} → ${getStatusLabel(newStatus)}\n\nNotas: ${statusNotes}`,
          created_at: new Date().toISOString(),
        })
        if (historyError) {
          console.error("Error creating status change history:", historyError)
        }
      }
      setDocument((prev) => ({ ...prev, status: newStatus }))
      fetchDocument()
      fetchMovements()
      toast({
        title: "Estado actualizado",
        description: `El estado del documento se cambió a "${getStatusLabel(newStatus)}"`,
      })
      setStatusDialogOpen(false)
      setNewStatus("")
      setStatusNotes("")
    } catch (error: any) {
      console.error("Error updating status:", error)
      toast({
        title: "Error al actualizar estado",
        description: error.message || "No se pudo actualizar el estado del documento",
        variant: "destructive",
      })
    } finally {
      setStatusLoading(false)
    }
  }
  const getStatusLabel = (status: string) => {
    const option = statusOptions.find((opt) => opt.value === status)
    return option?.label || status
  }
  const getStatusBadge = (status: string) => {
    const option = statusOptions.find((opt) => opt.value === status)
    if (option) {
      return (
        <Badge variant="outline" className={`${option.color} shadow-sm transition-all duration-200 hover:shadow`}>
          {option.label}
        </Badge>
      )
    }
    return <Badge variant="outline">{status}</Badge>
  }
  const canChangeStatus = () => {
    if (user?.role === "admin" || user?.role === "supervisor") {
      return user?.department_id === document?.current_department_id
    }
    return user?.id === document?.created_by && user?.department_id === document?.current_department_id
  }
  const canEdit = () => {
    if (user?.department_id !== document?.current_department_id) {
      return false
    }
    if (user?.role === "admin" || user?.role === "supervisor") return true
    if (user?.id === document?.created_by) {
      return true
    }
    return false
  }
  const canMove = () => {
    if (user?.department_id !== document?.current_department_id) {
      return false
    }
    if (user?.role === "admin") return true
    return true
  }
  const viewFile = async (fileUrl: string) => {
    try {
      let filePath = fileUrl
      if (filePath.startsWith("http")) {
        try {
          const url = new URL(filePath)
          const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/documents\/(.+)/)
          if (pathMatch && pathMatch[1]) {
            filePath = pathMatch[1]
          } else {
            filePath = url.pathname.replace("/storage/v1/object/public/", "")
          }
        } catch (e) {
          console.error("Error parsing URL:", e)
        }
      }
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from("documents")
        .createSignedUrl(filePath, 3600)
      if (signedUrlData?.signedUrl) {
        setViewerUrl(signedUrlData.signedUrl)
        setViewerOpen(true)
      } else {
        toast({
          title: "Error",
          description: "No se pudo cargar la vista previa del archivo",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error("Error viewing file:", error)
      toast({
        title: "Error",
        description: "No se pudo cargar la vista previa del archivo",
        variant: "destructive",
      })
    }
  }
  const downloadFile = async (fileUrl: string, fileName?: string) => {
    try {
      setDownloadLoading(true)
      let filePath = fileUrl
      if (filePath.startsWith("http")) {
        try {
          const url = new URL(filePath)
          const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/documents\/(.+)/)
          if (pathMatch && pathMatch[1]) {
            filePath = pathMatch[1]
          } else {
            filePath = url.pathname.replace("/storage/v1/object/public/", "")
          }
        } catch (e) {
          console.error("Error parsing URL:", e)
        }
      }
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from("documents")
        .createSignedUrl(filePath, 60)
      if (signedUrlData?.signedUrl) {
        if (user) {
          await trackDownload({
            documentId: document.id,
            userId: user.id,
            downloadType: "main_file",
            fileName: fileName || document.file_name || "documento",
          })
        }
        window.open(signedUrlData.signedUrl, "_blank")
        return
      }
      const { data, error } = await supabase.storage.from("documents").download(filePath)
      if (error) {
        throw new Error(error.message || "Error al descargar el archivo")
      }
      if (!data) {
        throw new Error("No se pudo obtener el archivo")
      }
      if (user) {
        await trackDownload({
          documentId: document.id,
          userId: user.id,
          downloadType: "main_file",
          fileName: fileName || document.file_name || "documento",
          fileSize: data.size,
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
      console.error("Error downloading file:", error)
      toast({
        title: "Error al descargar el archivo",
        description: error.message || "Intente nuevamente más tarde",
        variant: "destructive",
      })
    } finally {
      setDownloadLoading(false)
    }
  }
  const downloadAttachment = async (attachment: any) => {
    if (!attachment?.file_url) {
      toast({
        title: "Error",
        description: "No se encontró el archivo adjunto.",
        variant: "destructive",
      })
      return
    }
    try {
      setDownloadLoading(true)
      let filePath = attachment.file_url
      let bucketName = "document_attachments"
      if (filePath.startsWith("http")) {
        try {
          const url = new URL(filePath)
          let pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/document_attachments\/(.+)/)
          if (pathMatch && pathMatch[1]) {
            filePath = pathMatch[1]
          } else {
            pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/(.+?)\/(.+)/)
            if (pathMatch && pathMatch[1] && pathMatch[2]) {
              bucketName = pathMatch[1]
              filePath = pathMatch[2]
            } else {
              filePath = url.pathname.replace("/storage/v1/object/public/", "")
              if (filePath.startsWith("document_attachments/")) {
                filePath = filePath.replace("document_attachments/", "")
              }
            }
          }
          console.log("Bucket:", bucketName, "FilePath:", filePath)
        } catch (e) {
          console.error("Error parsing URL:", e)
        }
      }
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from(bucketName)
        .createSignedUrl(filePath, 60)
      if (signedUrlError) {
        console.error("Error creating signed URL:", signedUrlError)
        throw new Error(`Error al crear URL firmada: ${signedUrlError.message}`)
      }
      if (signedUrlData?.signedUrl) {
        if (user) {
          await trackDownload({
            documentId: document.id,
            userId: user.id,
            downloadType: "attachment",
            attachmentId: attachment.id,
            fileName: attachment.file_name,
          })
        }
        window.open(signedUrlData.signedUrl, "_blank")
        return
      }
      const { data, error } = await supabase.storage.from(bucketName).download(filePath)
      if (error) {
        console.error("Download error:", error)
        throw new Error(error.message || "Error al descargar el archivo adjunto")
      }
      if (!data) {
        throw new Error("No se pudo obtener el archivo adjunto")
      }
      if (user) {
        await trackDownload({
          documentId: document.id,
          userId: user.id,
          downloadType: "attachment",
          attachmentId: attachment.id,
          fileName: attachment.file_name,
          fileSize: data.size,
        })
      }
      const url = URL.createObjectURL(data)
      const a = document.createElement("a")
      a.href = url
      a.download = attachment.file_name
      document.body.appendChild(a)
      a.click()
      URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error: any) {
      console.error("Error downloading attachment:", error)
      toast({
        title: "Error al descargar el archivo adjunto",
        description: error.message || "Intente nuevamente más tarde",
        variant: "destructive",
      })
    } finally {
      setDownloadLoading(false)
    }
  }
  const handleViewDownloadStats = async () => {
    await fetchDownloadStats()
    setDownloadStatsOpen(true)
  }
  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }
  if (error || !document) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <FileText className="h-12 w-12 text-muted-foreground dark:text-slate-400 mx-auto" />
            <h3 className="mt-4 text-lg font-medium text-slate-800 dark:text-slate-100">
              {error || "Documento no encontrado"}
            </h3>
            <p className="text-muted-foreground dark:text-slate-400 mt-2">
              {error === "No tienes permisos para ver este documento"
                ? "Este documento pertenece a otro departamento."
                : "El documento que buscas no existe o ha sido eliminado."}
            </p>
            <Button asChild className="mt-4">
              <Link href="/documents">Volver a Documentos</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/documents">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{document.title}</h1>
          <p className="text-muted-foreground dark:text-slate-400">Documento #{document.document_number}</p>
        </div>
      </div>
      {user?.role !== "admin" &&
        user?.role !== "supervisor" &&
        user?.department_id !== document.current_department_id &&
        user?.id !== document.created_by && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Eye className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">Solo lectura</h3>
                <p className="text-sm text-blue-800 dark:text-amber-200">
                  Este documento pasó por tu área pero actualmente está en otro departamento. Puedes ver toda la
                  información pero no puedes editarlo ni moverlo.
                </p>
              </div>
            </div>
          </div>
        )}
      {!canViewAttachments && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Eye className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-1">Archivos no disponibles</h3>
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Este documento abandonó tu área. Los archivos adjuntos no están disponibles para usuarios normales.
                Contacta a un supervisor o administrador si necesitas acceso.
              </p>
            </div>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {document.file_url && (
            <Card className="bg-card dark:bg-slate-800 border-2 border-primary/20">
              <CardHeader>
                <CardTitle className="text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Documento Principal
                </CardTitle>
                <CardDescription className="text-muted-foreground dark:text-slate-400">
                  Archivo principal del documento
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-slate-50 dark:bg-slate-700/30 rounded-lg p-4 border border-slate-200 dark:border-slate-600">
                  <div className="flex items-center gap-3 mb-3">
                    <FileText className="h-8 w-8 text-primary" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-700 dark:text-slate-200 truncate">
                        {document.file_name || "documento"}
                      </p>
                      <p className="text-sm text-muted-foreground dark:text-slate-400">
                        Creado por {document.profiles?.full_name} •{" "}
                        {format(new Date(document.created_at), "dd/MM/yyyy", { locale: es })}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => viewFile(document.file_url)} className="flex-1">
                      <Eye className="h-4 w-4 mr-2" />
                      Ver Previa
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => downloadFile(document.file_url)}
                      disabled={downloadLoading}
                      className="flex-1"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {downloadLoading ? "..." : "Descargar"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          <Card className="bg-card dark:bg-slate-800">
            <CardHeader>
              <CardTitle className="text-slate-800 dark:text-slate-100">Información del Documento</CardTitle>
              <CardDescription className="text-muted-foreground dark:text-slate-400">
                Detalles completos del documento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground dark:text-slate-400">Título</h3>
                    <p className="mt-1 text-slate-700 dark:text-slate-200">{document.title}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground dark:text-slate-400">
                      Número de Documento
                    </h3>
                    <p className="mt-1 text-slate-700 dark:text-slate-200">{document.document_number}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground dark:text-slate-400">Estado</h3>
                    <div className="mt-1">{getStatusBadge(document.status)}</div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground dark:text-slate-400">
                      Departamento
                    </h3>
                    <p className="mt-1 text-slate-700 dark:text-slate-200">
                      {document.departments?.name || "Sin departamento"}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground dark:text-slate-400">Creado por</h3>
                    <p className="mt-1 text-slate-700 dark:text-slate-200">{document.profiles?.full_name}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground dark:text-slate-400">Fecha de Creación</h3>
                    <p className="mt-1 text-slate-700 dark:text-slate-200">
                      {format(new Date(document.created_at), "PPP", { locale: es })}
                    </p>
                  </div>
                </div>
                {document.description && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground dark:text-slate-400">Descripción</h3>
                    <p className="mt-1 whitespace-pre-line text-slate-700 dark:text-slate-200">
                      {document.description}
                    </p>
                  </div>
                )}
                {document.is_certified && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground dark:text-slate-400 mb-3">
                        Información de Certificación
                      </h3>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="font-medium text-green-800">Documento Certificado</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          {document.certified_by && (
                            <div>
                              <span className="text-muted-foreground dark:text-slate-400">Certificado por:</span>
                              <p className="font-medium text-slate-700 dark:text-slate-200">{document.certified_by}</p>
                            </div>
                          )}
                          {document.certified_at && (
                            <div>
                              <span className="text-muted-foreground dark:text-slate-400">Fecha de certificación:</span>
                              <p className="font-medium text-slate-700 dark:text-slate-200">
                                {format(new Date(document.certified_at), "PPP 'a las' HH:mm", { locale: es })}
                              </p>
                            </div>
                          )}
                          {document.verification_hash && (
                            <div className="md:col-span-2">
                              <span className="text-muted-foreground dark:text-slate-400">Hash de verificación:</span>
                              <p className="font-mono text-xs bg-gray-100 p-2 rounded mt-1 break-all text-slate-700 dark:text-slate-200">
                                {document.verification_hash}
                              </p>
                            </div>
                          )}
                          {document.certification_notes && (
                            <div className="md:col-span-2">
                              <span className="text-muted-foreground dark:text-slate-400">Notas de certificación:</span>
                              <p className="mt-1 whitespace-pre-line text-slate-700 dark:text-slate-200">
                                {document.certification_notes}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )}
                <Separator />
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground dark:text-slate-400 mb-3">
                    Información del Creador
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    {document.profiles?.company_id && document.creator_company && (
                      <div>
                        <span className="text-muted-foreground dark:text-slate-400">Compañía:</span>
                        <p className="font-medium text-slate-700 dark:text-slate-200">
                          {document.creator_company.name} ({document.creator_company.code})
                        </p>
                      </div>
                    )}
                    {document.profiles?.department_id && document.creator_department && (
                      <div>
                        <span className="text-muted-foreground dark:text-slate-400">Departamento del Creador:</span>
                        <p className="font-medium text-slate-700 dark:text-slate-200">
                          {document.creator_department.name}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card dark:bg-slate-800">
            <CardHeader>
              <CardTitle className="text-slate-800 dark:text-slate-100">Historial de Movimientos</CardTitle>
              <CardDescription className="text-muted-foreground dark:text-slate-400">
                Seguimiento completo de todos los movimientos del documento
              </CardDescription>
            </CardHeader>
            <CardContent>
              {movements.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground dark:text-slate-400 mx-auto" />
                  <h3 className="mt-4 text-lg font-medium text-slate-800 dark:text-slate-100">Sin movimientos</h3>
                  <p className="text-muted-foreground dark:text-slate-400">Este documento no ha sido movido aún.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {movements.map((movement, index) => (
                    <div key={movement.id} className="relative">
                      {index < movements.length - 1 && (
                        <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-gradient-to-b from-primary/80 to-primary/20"></div>
                      )}
                      <div className="flex gap-4">
                        <div className="relative flex-shrink-0">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-700/50 backdrop-blur-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-md">
                            {movement.from_department_id === movement.to_department_id ? (
                              <CheckCircle className="h-5 w-5 text-primary" />
                            ) : (
                              <MoveRight className="h-5 w-5 text-primary" />
                            )}
                          </div>
                          {index === 0 && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-background animate-pulse"></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 pb-8">
                          <div className="bg-card dark:bg-slate-800 border border-slate-100 dark:border-slate-600 rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-300">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-3">
                                {movement.from_departments && (
                                  <DepartmentBadge department={movement.from_departments} />
                                )}
                                {movement.from_department_id !== movement.to_department_id && (
                                  <MoveRight className="h-4 w-4 text-muted-foreground dark:text-slate-400" />
                                )}
                                {movement.to_departments &&
                                  movement.from_department_id !== movement.to_department_id && (
                                    <DepartmentBadge department={movement.to_departments} isDestination={true} />
                                  )}
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                  {format(new Date(movement.created_at), "dd/MM/yyyy", { locale: es })}
                                </div>
                                <div className="text-xs text-muted-foreground dark:text-slate-400">
                                  {format(new Date(movement.created_at), "HH:mm", { locale: es })}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 mb-3">
                              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-xs font-medium">
                                  {movement.profiles?.full_name?.charAt(0) || "?"}
                                </span>
                              </div>
                              <span className="text-sm text-muted-foreground dark:text-slate-400">
                                {movement.from_department_id === movement.to_department_id
                                  ? `Actualizado por ${movement.profiles?.full_name || "Usuario desconocido"}`
                                  : `Movido por ${movement.profiles?.full_name || "Usuario desconocido"}`}
                              </span>
                            </div>
                            {movement.notes && (
                              <div className="bg-muted/50 dark:bg-slate-700/50 rounded-md p-3 mb-3">
                                <p className="text-sm font-medium mb-1 text-slate-700 dark:text-slate-200">Notas:</p>
                                <p className="text-sm whitespace-pre-line text-slate-700 dark:text-slate-200">
                                  {movement.notes}
                                </p>
                              </div>
                            )}
                            {canViewAttachments &&
                              attachments.filter((att) => att.movement_id === movement.id).length > 0 && (
                                <div className="border-t pt-3 border-slate-100 dark:border-slate-600">
                                  <p className="text-sm font-medium mb-2 flex items-center gap-2 text-slate-700 dark:text-slate-200">
                                    <Paperclip className="h-4 w-4" />
                                    Archivos adjuntos
                                  </p>
                                  <div className="space-y-2">
                                    {attachments
                                      .filter((att) => att.movement_id === movement.id)
                                      .map((attachment) => (
                                        <div
                                          key={attachment.id}
                                          className="flex items-center justify-between p-2 bg-muted/30 dark:bg-slate-600/30 rounded hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors duration-200"
                                        >
                                          <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium truncate text-slate-700 dark:text-slate-200">
                                              {attachment.file_name}
                                            </div>
                                            <div className="text-xs text-muted-foreground dark:text-slate-400">
                                              Subido por {attachment.profiles?.full_name}
                                            </div>
                                          </div>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => downloadAttachment(attachment)}
                                          >
                                            <Download className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      ))}
                                  </div>
                                </div>
                              )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="bg-card dark:bg-slate-800">
            <CardHeader>
              <CardTitle className="text-slate-800 dark:text-slate-100">Archivos Adjuntos Generales</CardTitle>
              <CardDescription className="text-muted-foreground dark:text-slate-400">
                {canViewAttachments
                  ? "Archivos secundarios del documento"
                  : "No tienes permisos para ver estos archivos"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!canViewAttachments ? (
                <div className="text-center py-6">
                  <Paperclip className="h-12 w-12 text-muted-foreground dark:text-slate-400 mx-auto opacity-50" />
                  <h3 className="mt-4 text-lg font-medium text-slate-800 dark:text-slate-100">
                    Archivos no disponibles
                  </h3>
                  <p className="text-muted-foreground dark:text-slate-400 mt-2">
                    Este documento abandonó tu área. Los archivos adjuntos solo están disponibles para supervisores y
                    administradores.
                  </p>
                </div>
              ) : attachments.filter((att) => !att.movement_id).length === 0 ? (
                <div className="text-center py-6">
                  <FileText className="h-12 w-12 text-muted-foreground dark:text-slate-400 mx-auto" />
                  <h3 className="mt-4 text-lg font-medium text-slate-800 dark:text-slate-100">Sin archivos adjuntos</h3>
                  <p className="text-muted-foreground dark:text-slate-400">No hay archivos secundarios adjuntos.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {attachments
                    .filter((att) => !att.movement_id)
                    .map((attachment) => (
                      <div
                        key={attachment.id}
                        className="flex items-center justify-between p-3 border border-slate-100 dark:border-slate-600 rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-slate-700 dark:text-slate-200">{attachment.file_name}</div>
                          <div className="text-sm text-muted-foreground dark:text-slate-400">
                            Subido por {attachment.profiles?.full_name} •
                            {format(new Date(attachment.created_at), "dd/MM/yyyy", { locale: es })}
                          </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => downloadAttachment(attachment)}>
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <Card className="bg-card dark:bg-slate-800">
            <CardHeader>
              <CardTitle className="text-slate-800 dark:text-slate-100">Código QR</CardTitle>
              <CardDescription className="text-muted-foreground dark:text-slate-400">
                Escanee para acceder rápidamente
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              {document.qr_code ? (
                <div className="text-center space-y-2">
                  <img
                    src={document.qr_code || "/placeholder.svg"}
                    alt="QR Code"
                    className="h-48 w-48 object-contain mx-auto"
                  />
                  <p className="text-xs text-muted-foreground dark:text-slate-400">Escanea para vista pública</p>
                </div>
              ) : (
                <div className="h-48 w-48 flex items-center justify-center bg-muted/50 dark:bg-slate-700/50 rounded-md">
                  <p className="text-sm text-muted-foreground dark:text-slate-400 text-center">QR no generado</p>
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="bg-card dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-800 dark:text-slate-100">Acciones Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {canChangeStatus() && (
                <Button
                  className="w-full justify-start hover:bg-slate-50/50 dark:hover:bg-slate-700/50 bg-transparent"
                  variant="outline"
                  onClick={() => setStatusDialogOpen(true)}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Cambiar Estado
                </Button>
              )}
              {canEdit() ? (
                <Button
                  className="w-full justify-start hover:bg-slate-50/50 dark:hover:bg-slate-700/50 bg-transparent"
                  variant="outline"
                  asChild
                >
                  <Link href={`/documents/edit/${document.id}`}>
                    <Edit className="h-4 w-4 mr-2" />
                    Editar Documento
                  </Link>
                </Button>
              ) : (
                <Button className="w-full justify-start bg-transparent" variant="outline" disabled>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar Documento
                </Button>
              )}
              {!canEdit() && user?.id === document?.created_by && (
                <div className="text-xs text-muted-foreground dark:text-slate-400 p-2 bg-muted/50 dark:bg-slate-700/50 rounded">
                  ℹ️ Solo puedes editar documentos que están en tu departamento
                </div>
              )}
              {!canEdit() &&
                user?.id !== document?.created_by &&
                user?.role !== "admin" &&
                user?.role !== "supervisor" && (
                  <div className="text-xs text-muted-foreground dark:text-slate-400 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                    👁️ Este documento pasó por tu área. Tienes acceso de solo lectura.
                  </div>
                )}
              {document.file_url && (
                <>
                  <Button
                    className="w-full justify-start hover:bg-slate-50/50 dark:hover:bg-slate-700/50 bg-transparent"
                    variant="outline"
                    onClick={() => viewFile(document.file_url)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Ver Archivo
                  </Button>
                  <Button
                    className="w-full justify-start hover:bg-slate-50/50 dark:hover:bg-slate-700/50 bg-transparent"
                    variant="outline"
                    onClick={() => downloadFile(document.file_url)}
                    disabled={downloadLoading}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {downloadLoading ? "Descargando..." : "Descargar Archivo"}
                  </Button>
                </>
              )}
              {canMove() ? (
                <Button className="w-full justify-start" variant="default" onClick={() => setMovementDialogOpen(true)}>
                  <MoveRight className="h-4 w-4 mr-2" />
                  Mover Documento
                </Button>
              ) : (
                <Button className="w-full justify-start" variant="default" disabled>
                  <MoveRight className="h-4 w-4 mr-2" />
                  Mover Documento
                </Button>
              )}
              {!canMove() && user?.role !== "admin" && user?.role !== "supervisor" && (
                <div className="text-xs text-muted-foreground dark:text-slate-400 p-2 bg-muted/50 dark:bg-slate-700/50 rounded">
                  ℹ️ Solo puedes mover documentos que están en tu departamento
                </div>
              )}
              {user?.role === "admin" && (
                <Button
                  className="w-full justify-start hover:bg-slate-50/50 dark:hover:bg-slate-700/50 bg-transparent"
                  variant="outline"
                  onClick={handleViewDownloadStats}
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Ver Estadísticas
                </Button>
              )}
              {document && document.profiles?.full_name && (
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
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-800">
          <DialogHeader>
            <DialogTitle className="text-slate-800 dark:text-slate-100">Cambiar Estado del Documento</DialogTitle>
            <DialogDescription className="text-muted-foreground dark:text-slate-400">
              Seleccione el nuevo estado para este documento. Opcionalmente puede agregar notas sobre el cambio.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="status" className="text-slate-700 dark:text-slate-200">
                Nuevo Estado
              </Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <SelectValue placeholder="Seleccionar estado" className="text-slate-700 dark:text-slate-200" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="notes" className="text-slate-700 dark:text-slate-200">
                Notas (opcional)
              </Label>
              <Textarea
                id="notes"
                placeholder="Agregar notas sobre el cambio de estado..."
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
                rows={3}
                className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleStatusChange} disabled={!newStatus || statusLoading}>
                {statusLoading ? "Actualizando..." : "Actualizar Estado"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={movementDialogOpen} onOpenChange={setMovementDialogOpen}>
        <DialogContent className="max-w-2xl bg-white dark:bg-slate-800">
          <DialogHeader>
            <DialogTitle className="text-slate-800 dark:text-slate-100">Mover Documento</DialogTitle>
            <DialogDescription className="text-muted-foreground dark:text-slate-400">
              Seleccione el departamento al que desea mover este documento y agregue archivos adjuntos si es necesario.
            </DialogDescription>
          </DialogHeader>
          <MovementForm
            documentId={document.id}
            currentDepartmentId={document.current_department_id || document.departments?.id}
            onComplete={handleMovementComplete}
          />
        </DialogContent>
      </Dialog>
      <Dialog open={downloadStatsOpen} onOpenChange={setDownloadStatsOpen}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto bg-white dark:bg-slate-800">
          <DialogHeader>
            <DialogTitle className="text-slate-800 dark:text-slate-100">Estadísticas de Descarga</DialogTitle>
            <DialogDescription className="text-muted-foreground dark:text-slate-400">
              Historial completo de descargas de este documento
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {statsLoading ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i} className="bg-card dark:bg-slate-800">
                      <CardContent className="p-4">
                        <div className="h-8 bg-gray-200 animate-pulse rounded"></div>
                        <div className="h-4 bg-gray-200 animate-pulse rounded mt-2 w-3/4"></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <Table className="bg-white dark:bg-slate-800">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-slate-700 dark:text-slate-200">Usuario</TableHead>
                      <TableHead className="text-slate-700 dark:text-slate-200">Tipo</TableHead>
                      <TableHead className="text-slate-700 dark:text-slate-200">Archivo</TableHead>
                      <TableHead className="text-slate-700 dark:text-slate-200">Fecha</TableHead>
                      <TableHead className="text-slate-700 dark:text-slate-200">IP</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <div className="h-6 bg-gray-200 animate-pulse rounded"></div>
                        </TableCell>
                        <TableCell>
                          <div className="h-6 bg-gray-200 animate-pulse rounded w-20"></div>
                        </TableCell>
                        <TableCell>
                          <div className="h-6 bg-gray-200 animate-pulse rounded"></div>
                        </TableCell>
                        <TableCell>
                          <div className="h-6 bg-gray-200 animate-pulse rounded"></div>
                        </TableCell>
                        <TableCell>
                          <div className="h-6 bg-gray-200 animate-pulse rounded w-24"></div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : downloadStats.length === 0 ? (
              <div className="text-center py-8">
                <BarChart3 className="h-12 w-12 text-muted-foreground dark:text-slate-400 mx-auto" />
                <h3 className="mt-4 text-lg font-medium text-slate-800 dark:text-slate-100">
                  Sin descargas registradas
                </h3>
                <p className="text-muted-foreground dark:text-slate-400">Este documento no ha sido descargado aún.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="bg-card dark:bg-slate-800">
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold text-blue-600">{downloadStats.length}</div>
                      <p className="text-xs text-muted-foreground dark:text-slate-400">Total de descargas</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-card dark:bg-slate-800">
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold text-green-600">
                        {downloadStats.filter((s) => s.profiles).length}
                      </div>
                      <p className="text-xs text-muted-foreground dark:text-slate-400">Usuarios registrados</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-card dark:bg-slate-800">
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold text-orange-600">
                        {downloadStats.filter((s) => !s.profiles && s.is_public_access).length}
                      </div>
                      <p className="text-xs text-muted-foreground dark:text-slate-400">Acceso público</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-card dark:bg-slate-800">
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold text-purple-600">
                        {new Set(downloadStats.filter((s) => s.profiles).map((s) => s.user_id)).size +
                          new Set(downloadStats.filter((s) => s.session_id).map((s) => s.session_id)).size}
                      </div>
                      <p className="text-xs text-muted-foreground dark:text-slate-400">Usuarios únicos</p>
                    </CardContent>
                  </Card>
                </div>
                <div className="overflow-x-auto">
                  <Table className="bg-white dark:bg-slate-800">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[200px] text-slate-700 dark:text-slate-200">Usuario</TableHead>
                        <TableHead className="text-slate-700 dark:text-slate-200">Tipo</TableHead>
                        <TableHead className="text-slate-700 dark:text-slate-200">Archivo</TableHead>
                        <TableHead className="text-slate-700 dark:text-slate-200">Fecha</TableHead>
                        <TableHead className="text-slate-700 dark:text-slate-200">Token</TableHead>
                        <TableHead className="text-slate-700 dark:text-slate-200">IP</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {downloadStats.map((download) => (
                        <TableRow key={download.id}>
                          <TableCell className="align-top">
                            {download.profiles ? (
                              <div>
                                <div className="font-medium text-slate-700 dark:text-slate-200">
                                  {download.profiles?.full_name}
                                </div>
                                <div className="text-sm text-muted-foreground dark:text-slate-400">
                                  {download.profiles?.email}
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <div className="font-medium text-muted-foreground dark:text-slate-400">
                                  Usuario Anónimo
                                </div>
                                {download.anonymous_name && (
                                  <div className="text-sm text-slate-700 dark:text-slate-200">
                                    <span className="font-medium">Nombre:</span> {download.anonymous_name}
                                  </div>
                                )}
                                {download.anonymous_organization && (
                                  <div className="text-sm text-slate-700 dark:text-slate-200">
                                    <span className="font-medium">Organización:</span> {download.anonymous_organization}
                                  </div>
                                )}
                                {download.anonymous_contact && (
                                  <div className="text-sm text-slate-700 dark:text-slate-200">
                                    <span className="font-medium">Contacto:</span> {download.anonymous_contact}
                                  </div>
                                )}
                                {download.anonymous_purpose && (
                                  <div className="text-sm text-slate-700 dark:text-slate-200">
                                    <span className="font-medium">Propósito:</span> {download.anonymous_purpose}
                                  </div>
                                )}
                                <div className="text-xs text-muted-foreground dark:text-slate-400">
                                  {download.country && download.city
                                    ? `${download.city}, ${download.country}`
                                    : download.country
                                      ? download.country
                                      : "Ubicación no disponible"}
                                </div>
                                {download.session_id && (
                                  <div className="text-xs font-mono text-muted-foreground dark:text-slate-400">
                                    Sesión: {download.session_id.substring(0, 8)}...
                                  </div>
                                )}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={download.download_type === "main_file" ? "default" : "secondary"}>
                              {download.download_type === "main_file" ? "Principal" : "Adjunto"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-slate-700 dark:text-slate-200">
                              {download.file_name || "N/A"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-slate-700 dark:text-slate-200">
                              {format(new Date(download.downloaded_at || download.created_at), "dd/MM/yyyy HH:mm", {
                                locale: es,
                              })}
                            </div>
                          </TableCell>
                          <TableCell>
                            {download.download_token ? (
                              <div
                                className="text-sm font-mono bg-muted/50 dark:bg-slate-700/50 p-1 rounded overflow-x-auto max-w-[150px]"
                                title={download.download_token}
                              >
                                {download.download_token}
                              </div>
                            ) : (
                              <div className="text-sm text-muted-foreground dark:text-slate-400">No disponible</div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm font-mono text-slate-700 dark:text-slate-200">
                              {download.ip_address || "N/A"}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] bg-white dark:bg-slate-800">
          <DialogHeader>
            <DialogTitle className="text-slate-800 dark:text-slate-100">Vista previa del documento</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {viewerUrl && (
              <iframe
                src={viewerUrl}
                className="w-full h-[70vh] border border-slate-200 dark:border-slate-700 rounded-md"
                title="Vista previa del documento"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}