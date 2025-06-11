"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Download, FileText, Eye, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "@/components/ui/use-toast"
import { supabase } from "@/lib/supabase"
import { trackPublicDownload } from "@/lib/public-download-tracker"

// Status options
const statusOptions = [
  { value: "pending", label: "Pendiente", color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  { value: "in_progress", label: "En Progreso", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { value: "completed", label: "Completado", color: "bg-green-50 text-green-700 border-green-200" },
  { value: "cancelled", label: "Cancelado", color: "bg-red-50 text-red-700 border-red-200" },
]

export default function PublicDocumentPage() {
  const params = useParams()
  const [document, setDocument] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloadLoading, setDownloadLoading] = useState(false)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerUrl, setViewerUrl] = useState<string | null>(null)

  useEffect(() => {
    if (params.id) {
      fetchDocument()
    }
  }, [params.id])

  const fetchDocument = async () => {
    try {
      const { data, error } = await supabase
        .from("documents")
        .select(`
          *,
          profiles!documents_created_by_fkey (id, full_name, email),
          departments!documents_current_department_id_fkey (id, name, color)
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

      // Verificar si el documento es público
      if (!data.is_public) {
        setError("Este documento no está disponible para vista pública")
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
        // Rastrear la descarga pública
        await trackPublicDownload({
          documentId: document.id,
          downloadType: "main_file",
          fileName: fileName || document.file_name || "documento",
          referrer: document?.referrer || window.location.href,
        })

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

      // Rastrear la descarga pública
      await trackPublicDownload({
        documentId: document.id,
        downloadType: "main_file",
        fileName: fileName || document.file_name || "documento",
        fileSize: data.size,
        referrer: document?.referrer || window.location.href,
      })

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

  if (loading) {
    return (
      <div className="container max-w-4xl mx-auto p-6 space-y-6">
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
      <div className="container max-w-4xl mx-auto p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
            <h3 className="mt-4 text-lg font-medium">{error || "Documento no encontrado"}</h3>
            <p className="text-muted-foreground mt-2">
              {error === "Este documento no está disponible para vista pública"
                ? "Este documento no está disponible para vista pública."
                : "El documento que buscas no existe o ha sido eliminado."}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{document.title}</h1>
        <p className="text-muted-foreground">Documento #{document.document_number}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información del Documento</CardTitle>
          <CardDescription>Detalles del documento</CardDescription>
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

            {document.file_url && (
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button variant="outline" onClick={() => viewFile(document.file_url)}>
                  <Eye className="h-4 w-4 mr-2" />
                  Ver Archivo
                </Button>
                <Button onClick={() => downloadFile(document.file_url)} disabled={downloadLoading}>
                  <Download className="h-4 w-4 mr-2" />
                  {downloadLoading ? "Descargando..." : "Descargar Archivo"}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

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
