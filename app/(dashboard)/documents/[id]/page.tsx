"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Download, Edit, FileText, MoveRight, Eye, Paperclip, X, MoveDown, MoveDownIcon, AxeIcon, FileIcon, FileBoxIcon, FileBadgeIcon } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { toast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { MovementForm } from "@/components/documents/movement-form"

// Helper function to validate UUID
const isValidUUID = (str: string) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

export default function DocumentDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [document, setDocument] = useState<any>(null)
  const [movements, setMovements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [movementDialogOpen, setMovementDialogOpen] = useState(false)
  const [downloadLoading, setDownloadLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [attachments, setAttachments] = useState<any[]>([])
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerUrl, setViewerUrl] = useState<string | null>(null)

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
      const { data, error } = await supabase
        .from("documents")
        .select(`
          *,
          profiles!documents_created_by_fkey (id, full_name, email),
          departments!documents_department_id_fkey (id, name)
        `)
        .eq("id", params.id)
        .single()

      if (error) {
        if (error.code === "PGRST116") {
          setError("Documento no encontrado")
        } else {
          throw error
        }
        return
      }

      // Check if user has permission to view this document
      if (user?.role !== "admin" && user?.department_id !== data.department_id && user?.id !== data.created_by) {
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

  const handleMovementComplete = () => {
    setMovementDialogOpen(false)
    fetchDocument()
    fetchMovements()
    fetchAttachments()
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            Pendiente
          </Badge>
        )
      case "in_progress":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            En Progreso
          </Badge>
        )
      case "completed":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            Completado
          </Badge>
        )
      case "cancelled":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            Cancelado
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
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
                    <p className="mt-1">{document.departments?.name}</p>
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

                <Separator />

                <div className="flex flex-wrap gap-3">
                  {document.file_url && (
                    <>
                      <Button variant="outline" onClick={() => viewFile(document.file_url)}>
                        <Eye className="h-4 w-4 mr-2" />
                        Ver Archivo
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => downloadFile(document.file_url)}
                        disabled={downloadLoading}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        {downloadLoading ? "Descargando..." : "Descargar"}
                      </Button>
                    </>
                  )}
                  <Button variant="outline" asChild>
                    <Link href={`/documents/edit/${document.id}`}>
                      <Edit className="h-4 w-4 mr-2" />
                      Editar Documento
                    </Link>
                  </Button>
                  <Dialog open={movementDialogOpen} onOpenChange={setMovementDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <MoveRight className="h-4 w-4 mr-2" />
                        Mover Documento
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Mover Documento</DialogTitle>
                        <DialogDescription>
                          Seleccione el departamento al que desea mover este documento y agregue archivos adjuntos si es
                          necesario.
                        </DialogDescription>
                      </DialogHeader>
                      <MovementForm
                        documentId={document.id}
                        currentDepartmentId={document.department_id}
                        onComplete={handleMovementComplete}
                      />
                    </DialogContent>
                  </Dialog>
                </div>
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
                          <div className="w-7 h-7 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center">
                            <FileBadgeIcon className="h-5 w-5 text-primary" />
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

                                <MoveRight className="h-4 w-4 text-muted-foreground" />

                                {/* Departamento destino */}
                                {movement.to_departments && (
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
                                Movido por {movement.profiles?.full_name || "Usuario desconocido"}
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
            </CardContent>
          </Card>
        </div>
      </div>

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
