"use client"

import type React from "react"

import type { ReactElement } from "react"
import { useState, useEffect, useRef } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Download, FileText, Eye, X, Shield, CheckCircle, AlertTriangle, Clock, Lock } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
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

const brandColors = {
  VALHALLA: {
    primary: "#032854",
    secondary: "#0b3c6e",
    accent: "#2b9df4",
    light: "#165f9d",
    bg: "#f0f8ff",
    logo: "/logos/valhalla-logo.png",
  },
  ZEUS: {
    primary: "#08215b",
    secondary: "#0c2f80",
    accent: "#1084b7",
    light: "#2a81ad",
    bg: "#f8fafc",
    logo: "/logos/zeus-logo.png",
  },
  WORLDLIFE: {
    primary: "#066d19",
    secondary: "#519a4f",
    accent: "#b4e27d",
    light: "#044410",
    bg: "#f0fdf4",
    logo: "/logos/worldlife-logo.png",
  },
  HOPELIFE: {
    primary: "#065806",
    secondary: "#071e66",
    accent: "#43db49",
    light: "#1882b6",
    bg: "#f0fdf4",
    logo: "/logos/hopelife-logo.png",
  },
}

const detectBrandFromDescription = (description: string): keyof typeof brandColors | null => {
  if (!description) return null

  const upperDescription = description.toUpperCase()

  if (upperDescription.includes("VALHALLA")) return "VALHALLA"
  if (upperDescription.includes("ZEUS")) return "ZEUS"
  if (upperDescription.includes("WORLDLIFE")) return "WORLDLIFE"
  if (upperDescription.includes("HOPE LIFE") || upperDescription.includes("HOPELIFE")) return "HOPELIFE"

  return null
}

export default function PublicDocumentPage({ params }: { params: { id: string } }): ReactElement {
  const { id } = params

  const [documentData, setDocumentData] = useState<any>(null)
  const [attachments, setAttachments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloadLoading, setDownloadLoading] = useState(false)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [downloadFormOpen, setDownloadFormOpen] = useState(false)
  const [viewerUrl, setViewerUrl] = useState<string | null>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (id) {
      fetchDocument()
      fetchAttachments()
    }
  }, [id])

  // Efecto para prevenir interacciones específicas pero permitir scroll
  useEffect(() => {
    if (typeof window === "undefined") return

    const preventContextMenu = (e: MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      toast({
        title: "Vista previa protegida",
        description: "Para descargar el documento, utilice el botón 'Descargar Documento'",
        variant: "destructive",
        duration: 3000,
      })
      return false
    }

    const preventKeyboardShortcuts = (e: KeyboardEvent) => {
      // Prevenir Ctrl+S, Ctrl+P, F12, etc.
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === "s" || e.key === "p" || e.key === "P" || e.key === "u" || e.key === "U")
      ) {
        e.preventDefault()
        toast({
          title: "Acción no permitida",
          description: "Para descargar el documento, utilice el botón 'Descargar Documento'",
          variant: "destructive",
          duration: 3000,
        })
        return false
      }

      // Prevenir F12, Ctrl+Shift+I, etc.
      if (e.key === "F12" || (e.ctrlKey && e.shiftKey && e.key === "I")) {
        e.preventDefault()
        return false
      }
    }

    const preventSelection = (e: Event) => {
      e.preventDefault()
      return false
    }

    const preventDrag = (e: DragEvent) => {
      e.preventDefault()
      return false
    }

    // Aplicar event listeners cuando el visor esté abierto
    if (viewerOpen) {
      // Eventos en la ventana principal
      window.document.addEventListener("contextmenu", preventContextMenu, true)
      window.document.addEventListener("keydown", preventKeyboardShortcuts, true)
      window.document.addEventListener("selectstart", preventSelection, true)
      window.document.addEventListener("dragstart", preventDrag, true)

      // Prevenir impresión
      window.addEventListener("beforeprint", preventContextMenu, true)
    }

    return () => {
      // Limpiar event listeners
      if (typeof window !== "undefined") {
        window.document.removeEventListener("contextmenu", preventContextMenu, true)
        window.document.removeEventListener("keydown", preventKeyboardShortcuts, true)
        window.document.removeEventListener("selectstart", preventSelection, true)
        window.document.removeEventListener("dragstart", preventDrag, true)
        window.removeEventListener("beforeprint", preventContextMenu, true)
      }
    }
  }, [viewerOpen])

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
        .eq("id", id)
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

      setDocumentData(data)
    } catch (error: any) {
      console.error("Error fetching document:", error)
      setError("Error al cargar el documento")
    } finally {
      setLoading(false)
    }
  }

  const fetchAttachments = async () => {
    try {
      console.log("[v0] Fetching attachments for document ID:", id)
      console.log("[v0] Document ID type:", typeof id)

      const { data, error } = await supabasePublic.from("document_attachments").select("*").eq("document_id", id)

      console.log("[v0] Attachments query result:", { data, error })

      if (error) {
        console.error("Error fetching attachments:", error)
        return
      }

      setAttachments(data || [])
      console.log("[v0] Setting attachments:", data || [])
    } catch (error) {
      console.error("Error in fetchAttachments:", error)
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
    if (!documentData?.expiry_date) return false
    const expiryDate = new Date(documentData.expiry_date)
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
      const referrer = window.document.referrer || window.location.href

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
        console.log("Could not get IP info:", e)
      }

      // Preparar datos para insertar
      const downloadData = {
        document_id: documentData.id,
        user_id: null,
        download_type: "main_file",
        session_id: sessionId,
        ip_address: ipInfo.ip,
        user_agent: userAgent,
        referrer: referrer,
        country: ipInfo.country,
        city: ipInfo.city,
        file_name: documentData.title,
        is_public_access: true,
        anonymous_name: anonymousData.name,
        anonymous_organization: anonymousData.organization,
        anonymous_contact: anonymousData.contact,
        anonymous_purpose: anonymousData.purpose,
        download_token: downloadToken,
        downloaded_at: new Date().toISOString(),
      }

      console.log("Inserting download data:", downloadData)

      // Registrar la descarga con información del usuario anónimo
      const { data, error } = await supabasePublic.from("document_downloads").insert(downloadData)

      if (error) {
        console.error("Error tracking download:", error)
        throw error
      }

      console.log("Download tracked successfully:", data)
    } catch (error) {
      console.error("Error in trackPublicDownload:", error)
      throw error
    }
  }

  const trackPublicAttachmentDownload = async (
    anonymousData: AnonymousUserData,
    downloadToken: string,
    attachment: any,
  ) => {
    try {
      // Generar session ID único
      let sessionId = localStorage.getItem("public_session_id")
      if (!sessionId) {
        sessionId = `pub_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
        localStorage.setItem("public_session_id", sessionId)
      }

      // Obtener información básica
      const userAgent = navigator.userAgent
      const referrer = window.document.referrer || window.location.href

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
        console.log("Could not get IP info:", e)
      }

      // Preparar datos para insertar
      const downloadData = {
        document_id: documentData.id,
        user_id: null,
        download_type: "attachment",
        attachment_id: attachment.id,
        session_id: sessionId,
        ip_address: ipInfo.ip,
        user_agent: userAgent,
        referrer: referrer,
        country: ipInfo.country,
        city: ipInfo.city,
        file_name: attachment.file_name,
        file_size: attachment.file_size,
        is_public_access: true,
        anonymous_name: anonymousData.name,
        anonymous_organization: anonymousData.organization,
        anonymous_contact: anonymousData.contact,
        anonymous_purpose: anonymousData.purpose,
        download_token: downloadToken,
        downloaded_at: new Date().toISOString(),
      }

      // Registrar la descarga
      const { data, error } = await supabasePublic.from("document_downloads").insert(downloadData)

      if (error) {
        console.error("Error tracking attachment download:", error)
        throw error
      }

      console.log("Attachment download tracked successfully:", data)
    } catch (error) {
      console.error("Error in trackPublicAttachmentDownload:", error)
      throw error
    }
  }

  // Función simplificada para usar el visor nativo del navegador con protecciones
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

      // Crear URL firmada de corta duración para visualización
      const { data: signedUrlData, error: signedUrlError } = await supabasePublic.storage
        .from("documents")
        .createSignedUrl(filePath, 300) // 5 minutos

      if (signedUrlData?.signedUrl) {
        // Usar la URL firmada directamente con parámetros para deshabilitar herramientas
        const secureUrl = `${signedUrlData.signedUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH&zoom=85`
        setViewerUrl(secureUrl)
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

  // Función para cerrar el visor y limpiar recursos
  const closeViewer = () => {
    setViewerOpen(false)
    setViewerUrl(null)
  }

  // Función para manejar eventos específicos en la capa de protección
  const handleOverlayInteraction = (e: React.MouseEvent) => {
    // Solo bloquear clic derecho y clic medio
    if (e.button === 2 || e.button === 1) {
      e.preventDefault()
      e.stopPropagation()
      toast({
        title: "Vista previa protegida",
        description: "Para descargar el documento, utilice el botón 'Descargar Documento'",
        variant: "destructive",
        duration: 3000,
      })
      return false
    }
  }

  const handleOverlayContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    toast({
      title: "Vista previa protegida",
      description: "Para descargar el documento, utilice el botón 'Descargar Documento'",
      variant: "destructive",
      duration: 3000,
    })
    return false
  }

  // Modificar la función handleAnonymousDownload para usar la nueva funcionalidad de marca de agua
  const handleAnonymousDownload = async (anonymousData: AnonymousUserData) => {
    try {
      setDownloadLoading(true)

      // Generar token único para esta descarga
      const downloadToken = generateDownloadToken()

      // Registrar la descarga primero
      console.log("Attempting to track download with data:", {
        anonymousData,
        downloadToken,
        documentId: documentData.id,
      })
      await trackPublicDownload(anonymousData, downloadToken)
      console.log("Download tracked successfully")

      // Crear opciones para la información de descarga
      const watermarkOptions = {
        documentTitle: documentData.title,
        downloadedBy: anonymousData.name,
        organization: anonymousData.organization,
        downloadDate: format(new Date(), "dd/MM/yyyy HH:mm"),
        downloadToken: downloadToken,
        documentId: documentData.id,
      }

      // Obtener el archivo original
      let filePath = documentData.file_url

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

        // Mostrar el popup con la información de descarga (con mayor duración y prioridad)
        toast({
          title: "Información de Descarga Controlada",
          description: <div dangerouslySetInnerHTML={{ __html: createDownloadSummary(watermarkOptions) }} />,
          duration: 20000, // 20 segundos
        })

        // Mostrar también una alerta para asegurar que el usuario vea la información
        alert(
          `Documento descargado con éxito.\nToken de verificación: ${watermarkOptions.downloadToken}\nEste token aparece en el documento descargado y permite su trazabilidad.`,
        )

        // Aplicar marca de agua al PDF original
        const watermarkedBlob = await applyWatermarkToPdf(originalBlob, watermarkOptions)

        // Descargar el archivo con marca de agua
        const originalFileName = documentData.file_name || documentData.title || "documento"
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

      // Generar token único para esta descarga
      const downloadToken = generateDownloadToken()

      // Registrar la descarga del adjunto
      await trackPublicAttachmentDownload(
        { name: "", organization: "", contact: "", purpose: "" },
        downloadToken,
        attachment,
      )

      // Extraer la ruta del archivo de manera más robusta
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
        } catch (e) {
          console.error("Error parsing URL:", e)
        }
      }

      // Crear URL firmada
      const { data: signedUrlData, error: signedUrlError } = await supabasePublic.storage
        .from(bucketName)
        .createSignedUrl(filePath, 60)

      if (signedUrlError) {
        console.error("Error creating signed URL:", signedUrlError)
        throw new Error(`Error al crear URL firmada: ${signedUrlError.message}`)
      }

      if (signedUrlData?.signedUrl) {
        // Descargar el archivo original
        const response = await fetch(signedUrlData.signedUrl)
        const originalBlob = await response.blob()

        // Crear opciones para la marca de agua
        const watermarkOptions = {
          documentTitle: `${documentData.title} - Adjunto: ${attachment.file_name}`,
          downloadedBy: "",
          organization: "",
          downloadDate: format(new Date(), "dd/MM/yyyy HH:mm"),
          downloadToken: downloadToken,
          documentId: documentData.id,
        }

        // Mostrar información de descarga
        toast({
          title: "Descarga de Archivo Adjunto",
          description: `Descargando: ${attachment.file_name}`,
          duration: 5000,
        })

        // Si es PDF, aplicar marca de agua, si no, descargar directamente
        if (attachment.file_name.toLowerCase().endsWith(".pdf")) {
          const watermarkedBlob = await applyWatermarkToPdf(originalBlob, watermarkOptions)
          downloadBlob(watermarkedBlob, attachment.file_name)
        } else {
          // Para archivos que no son PDF, descargar directamente
          downloadBlob(originalBlob, attachment.file_name)
        }

        return
      }

      throw new Error("No se pudo obtener el archivo adjunto")
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

  const detectedBrand = documentData ? detectBrandFromDescription(documentData.description) : null
  const brandTheme = detectedBrand ? brandColors[detectedBrand] : null

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

  if (error || !documentData) {
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
      <Card
        className="shadow-lg mb-8"
        style={brandTheme ? { backgroundColor: brandTheme.bg, borderColor: brandTheme.light } : {}}
      >
        <CardHeader
          className="pb-4"
          style={
            brandTheme
              ? {
                  backgroundColor: brandTheme.primary,
                  color: "white",
                  borderTopLeftRadius: "0.5rem",
                  borderTopRightRadius: "0.5rem",
                }
              : {}
          }
        >
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
            <div className="flex items-center gap-4">
              {brandTheme?.logo && (
                <div className="flex-shrink-0">
                  <img
                    src={brandTheme.logo || "/placeholder.svg"}
                    alt={`${detectedBrand} logo`}
                    className="h-12 w-auto object-contain bg-white rounded p-1"
                  />
                </div>
              )}
              <div>
                <CardTitle className="text-2xl font-bold text-white">{documentData.title}</CardTitle>
                <CardDescription className="text-base mt-1 text-gray-200">
                  {documentData.document_number && (
                    <span className="font-medium">No. {documentData.document_number}</span>
                  )}
                </CardDescription>
              </div>
            </div>
            {documentData.is_certified && (
              <Badge
                variant="outline"
                className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900 dark:text-amber-200 dark:border-amber-700 flex items-center gap-1 px-3 py-1.5 self-start sm:self-auto"
                style={
                  brandTheme
                    ? {
                        backgroundColor: brandTheme.accent + "20",
                        color: brandTheme.primary,
                        borderColor: brandTheme.accent,
                      }
                    : {}
                }
              >
                <Shield className="h-4 w-4 text-white" />
                <span className="text-white">Documento Certificado</span>
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          {/* Certificación */}
          {documentData.is_certified && (
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/50 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
                <div>
                  <p className="text-sm text-muted-foreground">Tipo de Certificación</p>
                  <p className="font-medium break-words">{documentData.certification_type || "Certificado General"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Número de Certificado</p>
                  <p className="font-medium break-words">{documentData.certificate_number || "No especificado"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">📅 Fecha de Emisión</p>
                  <p className="font-medium">
                    {documentData.issue_date
                      ? format(new Date(documentData.issued_date), "dd 'de' MMMM 'de' yyyy", { locale: es })
                      : "No especificada"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">📅 Fecha de Expiración</p>
                  <p className="font-medium">
                    {documentData.expiry_date
                      ? format(new Date(documentData.expiry_date), "dd 'de' MMMM 'de' yyyy", { locale: es })
                      : "No especificada"}
                  </p>
                </div>
                <div className="col-span-1 sm:col-span-2">
                  <p className="text-sm text-muted-foreground">👤 Emitido por</p>
                  <p className="font-medium break-words">
                    {documentData.issued_by || "LUIS ARELLANO"}{" "}
                    {documentData.issuer_role && `(${documentData.issuer_role})`}
                  </p>
                </div>
              </div>
            </div>
          )}

          <Separator />

          {/* Información del documento */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Información del Documento</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Estado</p>
                <div className="mt-1">{getStatusBadge(documentData.status)}</div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Departamento Actual</p>
                <div className="flex items-center mt-1">
                  <div
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: documentData.departments?.color || "#888888" }}
                  ></div>
                  <p className="font-medium">{documentData.departments?.name || "No asignado"}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fecha de Creación</p>
                <p className="font-medium">{formatDate(documentData.created_at)}</p>
              </div>
              {documentData.profiles && (
                <div>
                  <p className="text-sm text-muted-foreground">Creado por</p>
                  <p className="font-medium">{documentData.profiles.full_name}</p>
                </div>
              )}
              {documentData.description && (
                <div className="col-span-1 sm:col-span-2">
                  <p className="text-sm text-muted-foreground">Descripción</p>
                  <p className="mt-1 whitespace-pre-line">{documentData.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* Documento Principal */}
          <Separator />
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <FileText className="mr-2 h-5 w-5" />
              Documento Principal
            </h3>
            <Card className="p-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-700 dark:text-slate-200 break-words">{documentData.title}</div>
                  <div className="text-sm text-muted-foreground dark:text-slate-400">
                    Documento certificado • {format(new Date(documentData.created_at), "dd/MM/yyyy", { locale: es })}
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  {documentData.file_url && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => viewFile(documentData.file_url)}
                        className="w-full sm:w-auto"
                      >
                        <Eye className="mr-1 h-4 w-4" />
                        Ver
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setDownloadFormOpen(true)}
                        disabled={downloadLoading}
                        className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
                      >
                        <Download className="mr-1 h-4 w-4" />
                        {downloadLoading ? "Procesando..." : "Descargar"}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* Archivos Adjuntos */}
          {attachments.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <FileText className="mr-2 h-5 w-5" />
                  Archivos Adjuntos
                </h3>
                <div className="space-y-3">
                  {attachments.map((attachment) => (
                    <Card key={attachment.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-slate-700 dark:text-slate-200 truncate">
                            {attachment.file_name}
                          </div>
                          <div className="text-sm text-muted-foreground dark:text-slate-400">
                            {formatDate(attachment.created_at)} •{" "}
                            {attachment.file_size && (
                              <span> • {(attachment.file_size / 1024 / 1024).toFixed(1)} MB</span>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // Crear un formulario temporal para la descarga del adjunto
                            const attachmentForm = document.createElement("div")
                            attachmentForm.innerHTML = `
                              <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                                <div class="bg-white dark:bg-slate-800 p-6 rounded-lg max-w-md w-full mx-4">
                                  <h3 class="text-lg font-semibold mb-4">Descargar Archivo Adjunto</h3>
                                  <p class="text-sm text-muted-foreground mb-4">
                                    Para descargar "${attachment.file_name}", necesitamos algunos datos:
                                  </p>
                                  <form id="attachment-form" class="space-y-4">
                                    <div>
                                      <label class="block text-sm font-medium mb-1">Nombre completo *</label>
                                      <input type="text" name="name" required class="w-full p-2 border rounded" />
                                    </div>
                                    <div>
                                      <label class="block text-sm font-medium mb-1">Organización</label>
                                      <input type="text" name="organization" class="w-full p-2 border rounded" />
                                    </div>
                                    <div>
                                      <label class="block text-sm font-medium mb-1">Contacto (email/teléfono)</label>
                                      <input type="text" name="contact" class="w-full p-2 border rounded" />
                                    </div>
                                    <div>
                                      <label class="block text-sm font-medium mb-1">Propósito de descarga</label>
                                      <textarea name="purpose" rows="2" class="w-full p-2 border rounded"></textarea>
                                    </div>
                                    <div class="flex gap-2 pt-4">
                                      <button type="submit" class="flex-1 bg-blue-600 text-white p-2 rounded hover:bg-blue-700">
                                        Descargar
                                      </button>
                                      <button type="button" onclick="this.closest('.fixed').remove()" class="px-4 py-2 border rounded hover:bg-gray-50">
                                        Cancelar
                                      </button>
                                    </div>
                                  </form>
                                </div>
                              </div>
                            `
                            document.body.appendChild(attachmentForm)

                            const form = attachmentForm.querySelector("#attachment-form") as HTMLFormElement
                            form.addEventListener("submit", async (e) => {
                              e.preventDefault()
                              const formData = new FormData(form)
                              const anonymousData = {
                                name: formData.get("name") as string,
                                organization: (formData.get("organization") as string) || "",
                                contact: (formData.get("contact") as string) || "",
                                purpose: (formData.get("purpose") as string) || "",
                              }

                              if (!anonymousData.name.trim()) {
                                alert("El nombre es requerido")
                                return
                              }

                              attachmentForm.remove()
                              await downloadAttachment(attachment, anonymousData)
                            })
                          }}
                          disabled={downloadLoading}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          {downloadLoading ? "Descargando..." : "Descargar"}
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>

        <CardFooter className="flex flex-col space-y-4">
          <Separator />

          {detectedBrand &&
            (detectedBrand === "WORLDLIFE" ||
              detectedBrand === "HOPELIFE" ||
              detectedBrand === "ZEUS" ||
              detectedBrand === "VALHALLA") && (
              <div className="w-full text-center py-4">
                <div className="flex flex-col items-center gap-3">
                  <p className="text-sm text-muted-foreground">¿Tienes alguna duda?</p>
                  <a
                    href={
                      detectedBrand === "WORLDLIFE" || detectedBrand === "HOPELIFE"
                        ? "https://wa.link/vttglf"
                        : "https://wa.link/zecmno"
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors duration-200 text-sm font-medium"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488" />
                    </svg>
                    ¡Haz clic aquí!
                  </a>
                </div>
              </div>
            )}

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
        documentTitle={documentData.title}
        loading={downloadLoading}
      />

      {/* Visor de archivos con protección selectiva */}
      <Dialog open={viewerOpen} onOpenChange={closeViewer}>
        <DialogContent className="max-w-4xl w-[90vw] max-h-[90vh] h-[90vh] p-0 flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle className="flex items-center">
              <Lock className="h-4 w-4 mr-2 text-amber-600" />
              Vista previa protegida: {documentData.title}
            </DialogTitle>
            <DialogDescription>
              Esta es una vista previa de solo lectura. Para descargar el documento con marca de agua, utilice el botón
              "Descargar Documento".
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-hidden relative">
            {viewerUrl && (
              <div className="relative w-full h-[calc(100%-2rem)]">
                {/* Iframe con el PDF - permitir scroll pero bloquear selección */}
                <iframe
                  ref={iframeRef}
                  src={viewerUrl}
                  className="w-full h-full border rounded select-none"
                  title="Vista previa del documento"
                  style={{
                    userSelect: "none",
                    WebkitUserSelect: "none",
                    MozUserSelect: "none",
                    msUserSelect: "none",
                  }}
                />

                {/* Capa de protección selectiva que solo bloquea clic derecho */}
                <div
                  ref={overlayRef}
                  className="absolute inset-0 z-20"
                  onContextMenu={handleOverlayContextMenu}
                  onMouseDown={handleOverlayInteraction}
                  style={{
                    background: "transparent",
                    pointerEvents: "none", // Permitir que los eventos pasen al iframe
                    userSelect: "none",
                    WebkitUserSelect: "none",
                    MozUserSelect: "none",
                    msUserSelect: "none",
                  }}
                />

                {/* Marca de agua superpuesta */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                  <div className="text-gray-300 text-4xl md:text-6xl font-bold transform rotate-[-45deg] opacity-20 select-none">
                    VISTA PREVIA
                  </div>
                </div>
              </div>
            )}

            {/* Aviso de seguridad fijo en la parte inferior */}
            <div className="absolute bottom-0 left-0 right-0 bg-amber-50 border-t border-amber-200 p-3 text-center text-sm text-amber-800 z-30">
              <div className="flex items-center justify-center gap-2">
                <Lock className="h-4 w-4 flex-shrink-0" />
                <span className="font-medium">
                  Para descargar este documento con marca de agua y seguimiento, utilice el botón "Descargar Documento"
                </span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* CSS adicional para bloquear interacciones específicas */}
      <style jsx>{`
        iframe {
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
        }
      `}</style>
    </div>
  )
}
