"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Download, FileText, Eye, X, Shield, CheckCircle, AlertTriangle, Calendar, User, Clock } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "@/components/ui/use-toast"
import { createClient } from "@supabase/supabase-js"
import { AnonymousDownloadForm, type AnonymousUserData } from "@/components/public/anonymous-download-form"
import {
  generateDownloadToken,
  downloadBlob,
  applyWatermarkToPdf,
  createDownloadSummary,
} from "@/lib/watermark-generator"

// Crear cliente Supabase sin autenticación para acceso público
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabasePublic = createClient(supabaseUrl, supabaseAnonKey)

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
  const [downloadFormOpen, setDownloadFormOpen] = useState(false)
  const [viewerUrl, setViewerUrl] = useState<string | null>(null)

  useEffect(() => {
    if (params.id) {
      fetchDocument()
    }
  }, [params.id])

  const fetchDocument = async () => {
    try {
      setLoading(true)
      setError(null)

      // Usar cliente público para obtener documento
      const { data, error } = await supabasePublic
        .from("documents")
        .select(`
          *,
          profiles!documents_created_by_fkey (id, full_name, email),
          departments!documents_current_department_id_fkey (id, name, color)
        `)
        .eq("id", params.id)
        .eq("is_public", true)
        .single()

      if (error) {
        if (error.code === "PGRST116") {
          setError("Documento no encontrado o no público")
        } else {
          console.error("Supabase error:", error)
          setError("Error al cargar el documento")
        }
        return
      }

      if (!data) {
        setError("Documento no encontrado")
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

  const isDocumentExpired = () => {
    if (!document?.expiry_date) return false
    const expiryDate = new Date(document.expiry_date)
    return expiryDate < new Date()
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A"
    return format(new Date(dateString), "dd 'de' MMMM 'de' yyyy", { locale: es })
  }

  const trackPublicDownload = async (anonymousData: AnonymousUserData, downloadToken: string) => {
    try {
      // Generar session ID único
      let sessionId = localStorage.getItem("public_session_id")
      if (!sessionId) {
        sessionId = `pub_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
        localStorage.setItem("public_session_id", sessionId)
      }

      // Obtener información básica
      const userAgent = navigator.userAgent
      const referrer = document.referrer || window.location.href

      // Intentar obtener IP y geolocalización
      let ipInfo = { ip: null, country: null, city: null }
      try {
        const ipResponse = await fetch("https://ipapi.co/json/")
        if (ipResponse.ok) {
          const ipData = await ipResponse.json()
          ipInfo = {
            ip: ipData.ip || null,
            country: ipData.country_name || null,
            city: ipData.city || null,
          }
        }
      } catch (e) {
        console.log("Could not get IP info")
      }

      // Registrar la descarga con información del usuario anónimo
      const { error } = await supabasePublic.from("document_downloads").insert({
        document_id: document.id,
        user_id: null,
        download_type: "main_file",
        session_id: sessionId,
        ip_address: ipInfo.ip,
        user_agent: userAgent,
        referrer: referrer,
        country: ipInfo.country,
        city: ipInfo.city,
        file_name: document.title,
        is_public_access: true,
        anonymous_name: anonymousData.name,
        anonymous_organization: anonymousData.organization,
        anonymous_contact: anonymousData.contact,
        anonymous_purpose: anonymousData.purpose,
        download_token: downloadToken,
        downloaded_at: new Date().toISOString(),
      })

      if (error) {
        console.error("Error tracking download:", error)
        throw error
      }
    } catch (error) {
      console.error("Error in trackPublicDownload:", error)
      throw error
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

      const { data: signedUrlData, error: signedUrlError } = await supabasePublic.storage
        .from("documents")
        .createSignedUrl(filePath, 3600)

      if (signedUrlData?.signedUrl) {
        setViewerUrl(signedUrlData.signedUrl)
        setViewerOpen(true)
      } else {
        console.error("Error creating signed URL:", signedUrlError)
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

  // Modificar la función handleAnonymousDownload para usar la nueva funcionalidad de marca de agua
  const handleAnonymousDownload = async (anonymousData: AnonymousUserData) => {
    try {
      setDownloadLoading(true)

      // Generar token único para esta descarga
      const downloadToken = generateDownloadToken()

      // Registrar la descarga primero
      await trackPublicDownload(anonymousData, downloadToken)

      // Crear opciones para la información de descarga
      const watermarkOptions = {
        documentTitle: document.title,
        downloadedBy: anonymousData.name,
        organization: anonymousData.organization,
        downloadDate: format(new Date(), "dd/MM/yyyy HH:mm"),
        downloadToken: downloadToken,
        documentId: document.id,
      }

      // Obtener el archivo original
      let filePath = document.file_url

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

      const { data: signedUrlData, error: signedUrlError } = await supabasePublic.storage
        .from("documents")
        .createSignedUrl(filePath, 60)

      if (signedUrlData?.signedUrl) {
        // Descargar el archivo original
        const response = await fetch(signedUrlData.signedUrl)
        const originalBlob = await response.blob()

        // Mostrar el popup con la información de descarga
        toast({
          title: "Información de Descarga Controlada",
          description: <div dangerouslySetInnerHTML={{ __html: createDownloadSummary(watermarkOptions) }} />,
          duration: 10000, // 10 segundos
        })

        // Aplicar marca de agua al PDF original
        const watermarkedBlob = await applyWatermarkToPdf(originalBlob, watermarkOptions)

        // Descargar el archivo con marca de agua
        const originalFileName = document.file_name || document.title || "documento"
        downloadBlob(watermarkedBlob, `${originalFileName}`)

        setDownloadFormOpen(false)
        return
      }

      throw new Error("No se pudo obtener el archivo")
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
      <div className="container mx-auto p-4 max-w-3xl">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !document) {
    return (
      <div className="container mx-auto p-4 max-w-3xl">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center">
              <FileText className="mr-2" /> Documento no disponible
            </CardTitle>
            <CardDescription>No se pudo cargar el documento solicitado</CardDescription>
          </CardHeader>
          <CardContent>
            <p>{error || "Documento no encontrado o no disponible públicamente"}</p>
            <p className="text-sm text-muted-foreground mt-2">
              Verifique que el enlace sea correcto y que el documento esté disponible para acceso público.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <Card className="shadow-lg">
        <CardHeader
          className={`${document.is_certified ? "bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900" : ""}`}
        >
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl font-bold">{document.title}</CardTitle>
              <CardDescription className="text-base mt-1">
                {document.document_number && <span className="font-medium">No. {document.document_number}</span>}
              </CardDescription>
            </div>
            {document.is_certified && (
              <Badge
                variant="outline"
                className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900 dark:text-amber-200 dark:border-amber-700 flex items-center gap-1 px-3 py-1.5"
              >
                <Shield className="h-4 w-4" />
                <span>Documento Certificado</span>
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          {/* Certificación */}
          {document.is_certified && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center">
                  <Shield className="mr-2 h-5 w-5 text-amber-600" />
                  Información de Certificación
                </h3>
                {isDocumentExpired() ? (
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    <span>Certificado Expirado</span>
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-200 dark:border-green-700"
                  >
                    <CheckCircle className="mr-1 h-3 w-3" />
                    <span>Certificado Válido</span>
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/50 p-4 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Tipo de Certificación</p>
                  <p className="font-medium">{document.certification_type || "Certificado General"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Número de Certificado</p>
                  <p className="font-medium">{document.certificate_number || "No especificado"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground flex items-center">
                    <Calendar className="mr-1 h-4 w-4 text-muted-foreground" />
                    Fecha de Emisión
                  </p>
                  <p className="font-medium">{formatDate(document.issued_date)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground flex items-center">
                    <Calendar className="mr-1 h-4 w-4 text-muted-foreground" />
                    Fecha de Expiración
                  </p>
                  <p className="font-medium">{formatDate(document.expiry_date)}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground flex items-center">
                    <User className="mr-1 h-4 w-4 text-muted-foreground" />
                    Emitido por
                  </p>
                  <p className="font-medium">
                    {document.issuer_name || "No especificado"}
                    {document.issuer_position && (
                      <span className="text-muted-foreground ml-1">({document.issuer_position})</span>
                    )}
                  </p>
                </div>
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/30 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
                <div className="flex items-center text-amber-800 dark:text-amber-300 mb-2">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  <h4 className="font-semibold">Verificación de Autenticidad</h4>
                </div>
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  Este documento ha sido verificado como auténtico. El código QR y el hash de verificación garantizan la
                  integridad del documento.
                </p>
                {document.verification_hash && (
                  <div className="mt-2 text-xs text-amber-600 dark:text-amber-500 font-mono overflow-hidden text-ellipsis">
                    Hash: {document.verification_hash}
                  </div>
                )}
              </div>
            </div>
          )}

          <Separator />

          {/* Información del documento */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Información del Documento</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Estado</p>
                <div className="mt-1">{getStatusBadge(document.status)}</div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Departamento Actual</p>
                <div className="flex items-center mt-1">
                  <div
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: document.departments?.color || "#888888" }}
                  ></div>
                  <p className="font-medium">{document.departments?.name || "No asignado"}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fecha de Creación</p>
                <p className="font-medium">{formatDate(document.created_at)}</p>
              </div>
              {document.profiles && (
                <div>
                  <p className="text-sm text-muted-foreground">Creado por</p>
                  <p className="font-medium">{document.profiles.full_name}</p>
                </div>
              )}
              {document.description && (
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Descripción</p>
                  <p className="mt-1 whitespace-pre-line">{document.description}</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-4">
          <Separator />

          <div className="w-full flex flex-col sm:flex-row gap-3 justify-between">
            {document.file_url ? (
              <>
                <Button variant="outline" className="flex-1" onClick={() => viewFile(document.file_url)}>
                  <Eye className="mr-2 h-4 w-4" />
                  Ver Documento
                </Button>

                <Button className="flex-1" onClick={() => setDownloadFormOpen(true)} disabled={downloadLoading}>
                  <Download className="mr-2 h-4 w-4" />
                  {downloadLoading ? "Procesando..." : "Descargar Documento"}
                </Button>
              </>
            ) : (
              <div className="flex-1 text-center text-muted-foreground">
                <p>Archivo no disponible</p>
              </div>
            )}
          </div>

          <div className="w-full text-center text-xs text-muted-foreground mt-4 pt-4 border-t">
            <p>Este documento está disponible para acceso público y puede ser verificado por su autenticidad.</p>
            <p className="mt-1 flex items-center justify-center">
              <Clock className="h-3 w-3 mr-1" />
              Accedido: {formatDate(new Date().toISOString())}
            </p>
          </div>
        </CardFooter>
      </Card>

      {/* Formulario de descarga anónima */}
      <AnonymousDownloadForm
        isOpen={downloadFormOpen}
        onClose={() => setDownloadFormOpen(false)}
        onSubmit={handleAnonymousDownload}
        documentTitle={document.title}
        loading={downloadLoading}
      />

      {/* Visor de archivos */}
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-4xl w-[90vw] max-h-[90vh] h-[90vh]">
          <DialogHeader>
            <DialogTitle>Vista previa: {document.title}</DialogTitle>
            <Button variant="outline" size="sm" className="absolute right-4 top-4" onClick={() => setViewerOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {viewerUrl && (
              <iframe
                src={viewerUrl}
                className="w-full h-[calc(100%-2rem)] border rounded"
                title="Vista previa del documento"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
