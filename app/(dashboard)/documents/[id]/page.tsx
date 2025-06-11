"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Download, Edit, FileText, MoveRight, Eye, Paperclip, X, CheckCircle, BarChart3 } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { toast } from "@/components/ui/use-toast"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { MovementForm } from "@/components/documents/movement-form"
import { trackDownload } from "@/lib/download-tracker"
import { getCombinedDownloadStats } from "@/lib/public-download-tracker"

// Helper function to validate UUID
const isValidUUID = (str: string) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

// Status options
const statusOptions = [
  { value: "pending", label: "Pendiente", color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  { value: "in_progress", label: "En Progreso", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { value: "completed", label: "Completado", color: "bg-green-50 text-green-700 border-green-200" },
  { value: "cancelled", label: "Cancelado", color: "bg-red-50 text-red-700 border-red-200" },
]

export default function DocumentDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [document, setDocument] = useState<any>(null)
  const [movements, setMovements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [movementDialogOpen, setMovementDialogOpen] = useState(false)
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [downloadStatsOpen, setDownloadStatsOpen] = useState(false)
  const [downloadLoading, setDownloadLoading] = useState(false)
  const [statusLoading, setStatusLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [attachments, setAttachments] = useState<any[]>([])
  const [downloadStats, setDownloadStats] = useState<any[]>([])
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerUrl, setViewerUrl] = useState<string | null>(null)
  const [newStatus, setNewStatus] = useState("")
  const [statusNotes, setStatusNotes] = useState("")
  const [statsLoading, setStatsLoading] = useState(false)

  useEffect(() => {
    // Validate UUID before making requests
    if (!params.id || typeof params.id !== "string") {
      setError("ID de documento inválido")
      setLoading(false)
      return
    }

    if (!isValidUUID(params.id)) {
      setError("Formato de ID de documento inválido")
      setLoading(false)
      return
    }

    if (user) {
      fetchDocument()
      fetchMovements()
      fetchAttachments()
    }
  }, [params.id, user])

  const fetchDocument = async () => {
    try {
      // Intentar con la relación específica primero
      let { data, error } = await supabase
        .from("documents")
        .select(`
          *,
          profiles!documents_created_by_fkey (id, full_name, email),
          departments!documents_current_department_id_fkey (id, name, color)
        `)
        .eq("id", params.id)
        .single()

      // Si falla, intentar sin la relación específica y hacer JOIN manual
      if (error && error.code === "PGRST201") {
        console.log("Fallback: Obteniendo datos por separado...")

        // Obtener documento básico
        const { data: docData, error: docError } = await supabase
          .from("documents")
          .select(`
            *,
            profiles!documents_created_by_fkey (id, full_name, email)
          `)
          .eq("id", params.id)
          .single()

        if (docError) {
          if (docError.code === "PGRST116") {
            setError("Documento no encontrado")
          } else {
            throw docError
          }
          return
        }

        // Obtener departamento por separado si existe current_department_id
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

        // Combinar los datos
        data = {
          ...docData,
          departments: departmentData,
        }
      } else if (error) {
        if (error.code === "PGRST116") {
          setError("Documento no encontrado")
        } else {
          throw error
        }
        return
      }

      // Check if user has permission to view this document
      if (
        user?.role !== "admin" &&
        user?.department_id !== data.current_department_id &&
        user?.id !== data.created_by
      ) {
        setError("No tienes permisos para ver este documento")
        return
      }

      setDocument(data)
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
        .eq("document_id", params.id)
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
        .eq("document_id", params.id)
        .order("created_at", { ascending: false })

      if (error) throw error
      setAttachments(data || [])
    } catch (error) {
      console.error("Error fetching attachments:", error)
    }
  }

  const fetchDownloadStats = async () => {
    if (user?.role !== "admin") return

    try {
      setStatsLoading(true)
      // Usar la nueva función que combina descargas autenticadas y públicas
      const stats = await getCombinedDownloadStats(params.id as string)
      setDownloadStats(stats)
    } catch (error) {
      console.error("Error fetching download stats:", error)
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

      // Actualizar el estado del documento
      const { error: updateError } = await supabase
        .from("documents")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", document.id)

      if (updateError) throw updateError

      // Crear una entrada en el historial de cambios (usando document_movements para tracking)
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
          // No lanzamos error aquí porque el cambio de estado ya se guardó
        }
      }

      // Actualizar el documento local
      setDocument((prev) => ({ ...prev, status: newStatus }))

      // Refrescar datos
      fetchDocument()
      fetchMovements()

      toast({
        title: "Estado actualizado",
        description: `El estado del documento se cambió a "${getStatusLabel(newStatus)}"`,
      })

      // Cerrar dialog y limpiar form
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
        <Badge variant="outline" className={option.color}>
          {option.label}
        </Badge>
      )
    }
    return <Badge variant="outline">{status}</Badge>
  }

  const canChangeStatus = () => {
    // Solo admins o el creador del documento pueden cambiar el estado
    return user?.role === "admin" || user?.id === document?.created_by
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
        .createSignedUrl(filePath, 3600) // 1 hora

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
        // Rastrear la descarga
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

      // Rastrear la descarga
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

      if (filePath.startsWith("http")) {
        try {
          const url = new URL(filePath)
          const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/document_attachments\/(.+)/)
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
        .from("document_attachments")
        .createSignedUrl(filePath, 60)

      if (signedUrlData?.signedUrl) {
        // Rastrear la descarga del adjunto
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

      const { data, error } = await supabase.storage.from("document_attachments").download(filePath)

      if (error) {
        throw new Error(error.message || "Error al descargar el archivo adjunto")
      }

      if (!data) {
        throw new Error("No se pudo obtener el archivo adjunto")
      }

      // Rastrear la descarga del adjunto
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
            <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
            <h3 className="mt-4 text-lg font-medium">{error || "Documento no encontrado"}</h3>
            <p className="text-muted-foreground mt-2">
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
          <h1 className="text-2xl font-bold">{document.title}</h1>
          <p className="text-muted-foreground">Documento #{document.document_number}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Información del Documento</CardTitle>
              <CardDescription>Detalles completos del documento</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Título</h3>
                    <p className="mt-1">{document.title}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Número de Documento</h3>
                    <p className="mt-1">{document.document_number}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Estado</h3>
                    <div className="mt-1">{getStatusBadge(document.status)}</div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Departamento</h3>
                    <p className="mt-1">{document.departments?.name || "Sin departamento"}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Creado por</h3>
                    <p className="mt-1">{document.profiles?.full_name}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Fecha de Creación</h3>
                    <p className="mt-1">{format(new Date(document.created_at), "PPP", { locale: es })}</p>
                  </div>
                </div>

                {document.description && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Descripción</h3>
                    <p className="mt-1 whitespace-pre-line">{document.description}</p>
                  </div>
                )}

                {/* Información de Certificación */}
                {document.is_certified && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-3">Información de Certificación</h3>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="font-medium text-green-800">Documento Certificado</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          {document.certified_by && (
                            <div>
                              <span className="text-muted-foreground">Certificado por:</span>
                              <p className="font-medium">{document.certified_by}</p>
                            </div>
                          )}

                          {document.certified_at && (
                            <div>
                              <span className="text-muted-foreground">Fecha de certificación:</span>
                              <p className="font-medium">
                                {format(new Date(document.certified_at), "PPP 'a las' HH:mm", { locale: es })}
                              </p>
                            </div>
                          )}

                          {document.verification_hash && (
                            <div className="md:col-span-2">
                              <span className="text-muted-foreground">Hash de verificación:</span>
                              <p className="font-mono text-xs bg-gray-100 p-2 rounded mt-1 break-all">
                                {document.verification_hash}
                              </p>
                            </div>
                          )}

                          {document.certification_notes && (
                            <div className="md:col-span-2">
                              <span className="text-muted-foreground">Notas de certificación:</span>
                              <p className="mt-1 whitespace-pre-line">{document.certification_notes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Historial de Movimientos</CardTitle>
              <CardDescription>Seguimiento completo de todos los movimientos del documento</CardDescription>
            </CardHeader>
            <CardContent>
              {movements.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
                  <h3 className="mt-4 text-lg font-medium">Sin movimientos</h3>
                  <p className="text-muted-foreground">Este documento no ha sido movido aún.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {movements.map((movement, index) => (
                    <div key={movement.id} className="relative">
                      {/* Línea de conexión */}
                      {index < movements.length - 1 && (
                        <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-border"></div>
                      )}

                      <div className="flex gap-4">
                        {/* Indicador circular */}
                        <div className="relative flex-shrink-0">
                          <div className="w-12 h-12 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center">
                            {movement.from_department_id === movement.to_department_id ? (
                              <CheckCircle className="h-5 w-5 text-primary" />
                            ) : (
                              <MoveRight className="h-5 w-5 text-primary" />
                            )}
                          </div>
                          {index === 0 && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-background"></div>
                          )}
                        </div>

                        {/* Contenido del movimiento */}
                        <div className="flex-1 min-w-0 pb-8">
                          <div className="bg-card border rounded-lg p-4 shadow-sm">
                            {/* Header del movimiento */}
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-3">
                                {/* Departamento origen */}
                                {movement.from_departments && (
                                  <div
                                    className="px-3 py-1 rounded-full text-sm font-medium"
                                    style={{
                                      backgroundColor: movement.from_departments.color || "#6B7280",
                                      color: getTextColor(movement.from_departments.color || "#6B7280"),
                                    }}
                                  >
                                    {movement.from_departments.name}
                                  </div>
                                )}

                                {movement.from_department_id !== movement.to_department_id && (
                                  <MoveRight className="h-4 w-4 text-muted-foreground" />
                                )}

                                {/* Departamento destino */}
                                {movement.to_departments &&
                                  movement.from_department_id !== movement.to_department_id && (
                                    <div
                                      className="px-3 py-1 rounded-full text-sm font-medium ring-2 ring-offset-1"
                                      style={{
                                        backgroundColor: movement.to_departments.color || "#6B7280",
                                        color: getTextColor(movement.to_departments.color || "#6B7280"),
                                        ringColor: movement.to_departments.color || "#6B7280",
                                      }}
                                    >
                                      {movement.to_departments.name}
                                    </div>
                                  )}
                              </div>

                              <div className="text-right">
                                <div className="text-sm font-medium">
                                  {format(new Date(movement.created_at), "dd/MM/yyyy", { locale: es })}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {format(new Date(movement.created_at), "HH:mm", { locale: es })}
                                </div>
                              </div>
                            </div>

                            {/* Información del usuario */}
                            <div className="flex items-center gap-2 mb-3">
                              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                                <span className="text-xs font-medium">
                                  {movement.profiles?.full_name?.charAt(0) || "?"}
                                </span>
                              </div>
                              <span className="text-sm text-muted-foreground">
                                {movement.from_department_id === movement.to_department_id
                                  ? `Actualizado por ${movement.profiles?.full_name || "Usuario desconocido"}`
                                  : `Movido por ${movement.profiles?.full_name || "Usuario desconocido"}`}
                              </span>
                            </div>

                            {/* Notas del movimiento */}
                            {movement.notes && (
                              <div className="bg-muted/50 rounded-md p-3 mb-3">
                                <p className="text-sm font-medium mb-1">Notas:</p>
                                <p className="text-sm whitespace-pre-line">{movement.notes}</p>
                              </div>
                            )}

                            {/* Archivos adjuntos del movimiento */}
                            {attachments.filter((att) => att.movement_id === movement.id).length > 0 && (
                              <div className="border-t pt-3">
                                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                                  <Paperclip className="h-4 w-4" />
                                  Archivos adjuntos
                                </p>
                                <div className="space-y-2">
                                  {attachments
                                    .filter((att) => att.movement_id === movement.id)
                                    .map((attachment) => (
                                      <div
                                        key={attachment.id}
                                        className="flex items-center justify-between p-2 bg-muted/30 rounded"
                                      >
                                        <div className="flex-1 min-w-0">
                                          <div className="text-sm font-medium truncate">{attachment.file_name}</div>
                                          <div className="text-xs text-muted-foreground">
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

          <Card>
            <CardHeader>
              <CardTitle>Archivos Adjuntos Generales</CardTitle>
              <CardDescription>Archivos secundarios del documento</CardDescription>
            </CardHeader>
            <CardContent>
              {attachments.filter((att) => !att.movement_id).length === 0 ? (
                <div className="text-center py-6">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
                  <h3 className="mt-4 text-lg font-medium">Sin archivos adjuntos</h3>
                  <p className="text-muted-foreground">No hay archivos secundarios adjuntos.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {attachments
                    .filter((att) => !att.movement_id)
                    .map((attachment) => (
                      <div key={attachment.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium">{attachment.file_name}</div>
                          <div className="text-sm text-muted-foreground">
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
          <Card>
            <CardHeader>
              <CardTitle>Código QR</CardTitle>
              <CardDescription>Escanee para acceder rápidamente</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              {document.qr_code ? (
                <div className="text-center space-y-2">
                  <img
                    src={document.qr_code || "/placeholder.svg"}
                    alt="QR Code"
                    className="h-48 w-48 object-contain mx-auto"
                  />
                  <p className="text-xs text-muted-foreground">Escanea para vista pública</p>
                </div>
              ) : (
                <div className="h-48 w-48 flex items-center justify-center bg-muted rounded-md">
                  <p className="text-sm text-muted-foreground text-center">QR no generado</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Acciones Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {canChangeStatus() && (
                <Button className="w-full justify-start" variant="outline" onClick={() => setStatusDialogOpen(true)}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Cambiar Estado
                </Button>
              )}
              <Button className="w-full justify-start" variant="outline" asChild>
                <Link href={`/documents/edit/${document.id}`}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar Documento
                </Link>
              </Button>
              {document.file_url && (
                <>
                  <Button
                    className="w-full justify-start"
                    variant="outline"
                    onClick={() => viewFile(document.file_url)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Ver Archivo
                  </Button>
                  <Button
                    className="w-full justify-start"
                    variant="outline"
                    onClick={() => downloadFile(document.file_url)}
                    disabled={downloadLoading}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {downloadLoading ? "Descargando..." : "Descargar Archivo"}
                  </Button>
                </>
              )}
              <Button className="w-full justify-start" variant="default" onClick={() => setMovementDialogOpen(true)}>
                <MoveRight className="h-4 w-4 mr-2" />
                Mover Documento
              </Button>
              {user?.role === "admin" && (
                <Button className="w-full justify-start" variant="outline" onClick={handleViewDownloadStats}>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Ver Estadísticas
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog para cambiar estado */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cambiar Estado del Documento</DialogTitle>
            <DialogDescription>
              Seleccione el nuevo estado para este documento. Opcionalmente puede agregar notas sobre el cambio.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="status">Nuevo Estado</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar estado" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="notes">Notas (opcional)</Label>
              <Textarea
                id="notes"
                placeholder="Agregar notas sobre el cambio de estado..."
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
                rows={3}
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

      {/* Dialog para mover documento */}
      <Dialog open={movementDialogOpen} onOpenChange={setMovementDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Mover Documento</DialogTitle>
            <DialogDescription>
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

      {/* Dialog para estadísticas de descarga */}
      <Dialog open={downloadStatsOpen} onOpenChange={setDownloadStatsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Estadísticas de Descarga</DialogTitle>
            <DialogDescription>Historial completo de descargas de este documento</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {statsLoading ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i}>
                      <CardContent className="p-4">
                        <div className="h-8 bg-gray-200 animate-pulse rounded"></div>
                        <div className="h-4 bg-gray-200 animate-pulse rounded mt-2 w-3/4"></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Archivo</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>IP</TableHead>
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
                <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto" />
                <h3 className="mt-4 text-lg font-medium">Sin descargas registradas</h3>
                <p className="text-muted-foreground">Este documento no ha sido descargado aún.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold text-blue-600">{downloadStats.length}</div>
                      <p className="text-xs text-muted-foreground">Total de descargas</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold text-green-600">
                        {downloadStats.filter((s) => s.profiles).length}
                      </div>
                      <p className="text-xs text-muted-foreground">Usuarios registrados</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold text-orange-600">
                        {downloadStats.filter((s) => !s.profiles && s.is_public_access).length}
                      </div>
                      <p className="text-xs text-muted-foreground">Acceso público</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold text-purple-600">
                        {new Set(downloadStats.filter((s) => s.profiles).map((s) => s.user_id)).size +
                          new Set(downloadStats.filter((s) => s.session_id).map((s) => s.session_id)).size}
                      </div>
                      <p className="text-xs text-muted-foreground">Usuarios únicos</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[200px]">Usuario</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Archivo</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>IP</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {downloadStats.map((download) => (
                        <TableRow key={download.id}>
                          <TableCell className="align-top">
                            {download.profiles ? (
                              <div>
                                <div className="font-medium">{download.profiles?.full_name}</div>
                                <div className="text-sm text-muted-foreground">{download.profiles?.email}</div>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <div className="font-medium text-muted-foreground">Usuario Anónimo</div>
                                {download.anonymous_name && (
                                  <div className="text-sm">
                                    <span className="font-medium">Nombre:</span> {download.anonymous_name}
                                  </div>
                                )}
                                {download.anonymous_organization && (
                                  <div className="text-sm">
                                    <span className="font-medium">Organización:</span> {download.anonymous_organization}
                                  </div>
                                )}
                                {download.anonymous_contact && (
                                  <div className="text-sm">
                                    <span className="font-medium">Contacto:</span> {download.anonymous_contact}
                                  </div>
                                )}
                                {download.anonymous_purpose && (
                                  <div className="text-sm">
                                    <span className="font-medium">Propósito:</span> {download.anonymous_purpose}
                                  </div>
                                )}
                                <div className="text-xs text-muted-foreground">
                                  {download.country && download.city
                                    ? `${download.city}, ${download.country}`
                                    : download.country
                                      ? download.country
                                      : "Ubicación no disponible"}
                                </div>
                                {download.session_id && (
                                  <div className="text-xs font-mono text-muted-foreground">
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
                            <div className="text-sm">{download.file_name || "N/A"}</div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {format(new Date(download.downloaded_at || download.created_at), "dd/MM/yyyy HH:mm", {
                                locale: es,
                              })}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm font-mono">{download.ip_address || "N/A"}</div>
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

      {/* Visor de archivos */}
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Vista previa del documento</DialogTitle>
            <Button variant="outline" size="sm" className="absolute right-4 top-4" onClick={() => setViewerOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {viewerUrl && (
              <iframe
                src={viewerUrl}
                className="w-full h-[70vh] border rounded-md"
                title="Vista previa del documento"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
