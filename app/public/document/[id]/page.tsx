"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { CheckCircle, XCircle, Download, Calendar, User, Shield, Clock, Eye, AlertTriangle } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { trackPublicDownload } from "@/lib/public-download-tracker"

export default function PublicDocumentPage() {
  const params = useParams()
  const [document, setDocument] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const [verificationLogged, setVerificationLogged] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  // Helper function to extract file path from URL
  const extractFilePathFromUrl = (url: string): string | null => {
    if (!url) return null

    try {
      // If it's already a relative path, return as is
      if (!url.startsWith("http")) {
        return url
      }

      // Parse the URL to extract the path
      const urlObj = new URL(url)
      const pathname = urlObj.pathname

      // Extract path after /storage/v1/object/public/documents/
      const match = pathname.match(/\/storage\/v1\/object\/public\/documents\/(.+)/)
      if (match && match[1]) {
        return match[1]
      }

      // Fallback: try to extract just the filename
      const segments = pathname.split("/")
      const filename = segments[segments.length - 1]
      if (filename && filename.includes(".")) {
        return filename
      }

      return null
    } catch (e) {
      console.error("Error extracting file path:", e)
      return null
    }
  }

  useEffect(() => {
    const fetchDocument = async () => {
      try {
        // Fetch document details - simplified approach
        const { data: document, error } = await supabase.from("documents").select("*").eq("id", params.id).single()

        if (error) {
          throw error
        }

        if (!document) {
          setError("Documento no encontrado")
          setLoading(false)
          return
        }

        // Fetch department separately if document has current_department_id
        let departmentData = null
        if (document.current_department_id) {
          const { data: dept } = await supabase
            .from("departments")
            .select("id, name, color")
            .eq("id", document.current_department_id)
            .single()
          departmentData = dept
        }

        // Fetch creator profile separately
        let creatorData = null
        if (document.created_by) {
          const { data: creator } = await supabase
            .from("profiles")
            .select("id, full_name, email")
            .eq("id", document.created_by)
            .single()
          creatorData = creator
        }

        setDocument({
          ...document,
          current_department: departmentData,
          created_by_profile: creatorData,
        })

        // Log verification if document is certified
        if (document.is_certified && !verificationLogged) {
          await logVerification(document.id)
        }

        // Get file URL if available
        if (document.file_url) {
          try {
            // Extract the correct file path
            const filePath = extractFilePathFromUrl(document.file_url)

            if (filePath) {
              console.log("Extracted file path:", filePath)

              const { data: fileData, error: fileError } = await supabase.storage
                .from("documents")
                .createSignedUrl(filePath, 3600) // 1 hour expiry

              if (fileError) {
                console.error("Error creating signed URL:", fileError)
                // If signed URL fails, try to use the original URL directly
                if (document.file_url.startsWith("http")) {
                  setFileUrl(document.file_url)
                }
              } else if (fileData?.signedUrl) {
                setFileUrl(fileData.signedUrl)
              }
            } else {
              console.error("Could not extract file path from:", document.file_url)
              // Try to use the original URL directly if it's a full URL
              if (document.file_url.startsWith("http")) {
                setFileUrl(document.file_url)
              }
            }
          } catch (fileErr) {
            console.error("Error with file URL:", fileErr)
            // Fallback to original URL if available
            if (document.file_url.startsWith("http")) {
              setFileUrl(document.file_url)
            }
          }
        }

        setLoading(false)
      } catch (error: any) {
        console.error("Error fetching document:", error)
        setError(error.message || "Error al cargar el documento")
        setLoading(false)
      }
    }

    fetchDocument()
  }, [params.id, verificationLogged])

  const logVerification = async (documentId: string) => {
    try {
      // Get approximate location data
      let locationData = {}
      try {
        const response = await fetch("https://ipapi.co/json/")
        if (response.ok) {
          locationData = await response.json()
        }
      } catch (e) {
        console.log("Could not get location data")
      }

      // Log the verification - only if table exists
      try {
        const { error } = await supabase.from("document_verifications").insert({
          document_id: documentId,
          verifier_ip: null, // IP is captured server-side
          verifier_user_agent: navigator.userAgent,
          verification_method: "qr_scan",
          location_data: locationData,
        })

        if (error) {
          console.error("Error logging verification:", error)
        } else {
          setVerificationLogged(true)
        }
      } catch (e) {
        console.error("Error in verification logging:", e)
      }
    } catch (e) {
      console.error("Error in verification logging:", e)
    }
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
              <XCircle className="mr-2" /> Error
            </CardTitle>
            <CardDescription>No se pudo cargar el documento</CardDescription>
          </CardHeader>
          <CardContent>
            <p>{error || "Documento no encontrado o no disponible"}</p>
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
                <div className="mt-2 text-xs text-amber-600 dark:text-amber-500 font-mono overflow-hidden text-ellipsis">
                  Hash: {document.verification_hash || "No disponible"}
                </div>
              </div>
            </div>
          )}

          <Separator />

          {/* Información del documento */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Información del Documento</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Departamento Actual</p>
                <div className="flex items-center mt-1">
                  <div
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: document.current_department?.color || "#888888" }}
                  ></div>
                  <p className="font-medium">{document.current_department?.name || "No asignado"}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fecha de Creación</p>
                <p className="font-medium">{formatDate(document.created_at)}</p>
              </div>
              {document.description && (
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Descripción</p>
                  <p className="mt-1">{document.description}</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-4">
          <Separator />

          <div className="w-full flex flex-col sm:flex-row gap-3 justify-between">
            {fileUrl ? (
              <>
                <Dialog open={showPreview} onOpenChange={setShowPreview}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={async () => {
                        // Track preview as a view (optional)
                        await trackPublicDownload({
                          documentId: document.id,
                          downloadType: "main_file",
                          fileName: `${document.title} (Preview)`,
                          fileSize: null,
                        })
                      }}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Ver Documento Original
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl w-[90vw] max-h-[90vh] h-[90vh]">
                    <DialogHeader>
                      <DialogTitle>Documento Original: {document.title}</DialogTitle>
                      <DialogDescription>Visualización del documento certificado original</DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 h-full mt-4">
                      <iframe
                        src={fileUrl}
                        className="w-full h-[calc(100%-2rem)] border rounded"
                        title="Vista previa del documento"
                      />
                    </div>
                  </DialogContent>
                </Dialog>

                <Button
                  className="flex-1"
                  onClick={async () => {
                    if (fileUrl) {
                      // Track the download before opening
                      await trackPublicDownload({
                        documentId: document.id,
                        downloadType: "main_file",
                        fileName: document.title,
                        fileSize: null, // We don't have file size info here
                      })

                      // Open the file
                      window.open(fileUrl, "_blank")
                    }
                  }}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Descargar Documento Original
                </Button>
              </>
            ) : (
              <div className="flex-1 text-center text-muted-foreground">
                <p>Documento original no disponible</p>
                {document.file_url && <p className="text-xs mt-1">URL: {document.file_url}</p>}
              </div>
            )}
          </div>

          <div className="w-full text-center text-xs text-muted-foreground mt-4 pt-4 border-t">
            <p>
              Este documento puede ser verificado escaneando el código QR o ingresando el número de certificado en el
              sistema.
            </p>
            <p className="mt-1 flex items-center justify-center">
              <Clock className="h-3 w-3 mr-1" />
              Última verificación: {formatDate(new Date().toISOString())}
            </p>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
