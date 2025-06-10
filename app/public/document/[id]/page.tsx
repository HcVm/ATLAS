"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { FileText, Calendar, User, Building2, Download, Lock, LogIn, Eye, AlertCircle } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import Link from "next/link"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface DocumentData {
  id: string
  title: string
  document_number: string
  description: string | null
  status: string
  created_at: string
  file_url: string | null
  departments: {
    name: string
    color: string | null
  } | null
  profiles: {
    full_name: string
  } | null
}

export default function PublicDocumentPage({ params }: { params: { id: string } }) {
  const [document, setDocument] = useState<DocumentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasAccess, setHasAccess] = useState(false)
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    fetchDocument()
  }, [params.id, user])

  const fetchDocument = async () => {
    try {
      setLoading(true)
      setError(null)

      // Obtener información básica del documento (siempre accesible)
      const { data: docData, error: docError } = await supabase
        .from("documents")
        .select(`
          id,
          title,
          document_number,
          description,
          status,
          created_at,
          file_url,
          created_by,
          department_id,
          departments (name, color),
          profiles!documents_created_by_fkey (full_name)
        `)
        .eq("id", params.id)
        .single()

      if (docError) {
        if (docError.code === "PGRST116") {
          setError("Documento no encontrado")
        } else {
          setError("Error al cargar el documento")
        }
        return
      }

      setDocument(docData)

      // Verificar si el usuario tiene acceso completo
      if (user) {
        const userHasAccess =
          docData.created_by === user.id || // Es el creador
          docData.department_id === user.department_id || // Mismo departamento
          user.role === "admin" || // Es administrador
          user.role === "supervisor" // Es supervisor

        setHasAccess(userHasAccess)
      }
    } catch (err: any) {
      console.error("Error fetching document:", err)
      setError("Error inesperado al cargar el documento")
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: "Pendiente", variant: "secondary" as const },
      in_progress: { label: "En Progreso", variant: "default" as const },
      completed: { label: "Completado", variant: "default" as const },
      cancelled: { label: "Cancelado", variant: "destructive" as const },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || {
      label: status,
      variant: "outline" as const,
    }

    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const handleDownload = async () => {
    if (!document?.file_url) return

    try {
      // Crear un enlace temporal para descargar
      const link = document.createElement("a")
      link.href = document.file_url
      link.download = `${document.document_number}.pdf`
      link.target = "_blank"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error("Error downloading file:", error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando documento...</p>
        </div>
      </div>
    )
  }

  if (error || !document) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle>Error</CardTitle>
            <CardDescription>{error || "Documento no encontrado"}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => router.push("/")} variant="outline">
              Ir al inicio
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Vista Pública de Documento</h1>
          <p className="text-gray-600">Información básica del documento</p>
        </div>

        {/* Documento Principal */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-lg text-white"
                  style={{ backgroundColor: document.departments?.color || "#6B7280" }}
                >
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-xl">{document.title}</CardTitle>
                  <CardDescription className="text-base">Documento #{document.document_number}</CardDescription>
                </div>
              </div>
              {getStatusBadge(document.status)}
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Información básica - siempre visible */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Departamento</p>
                  <p className="text-sm text-muted-foreground">{document.departments?.name || "Sin departamento"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Creado por</p>
                  <p className="text-sm text-muted-foreground">
                    {document.profiles?.full_name || "Usuario desconocido"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Fecha de creación</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(document.created_at).toLocaleDateString("es-ES", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Descripción - solo visible con permisos */}
            {hasAccess && document.description ? (
              <div>
                <h3 className="font-medium mb-2">Descripción</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{document.description}</p>
              </div>
            ) : !hasAccess && document.description ? (
              <Alert>
                <Lock className="h-4 w-4" />
                <AlertDescription>
                  La descripción completa está disponible solo para usuarios autorizados.
                </AlertDescription>
              </Alert>
            ) : null}

            {/* Archivo principal */}
            {document.file_url && (
              <div>
                <h3 className="font-medium mb-2">Archivo principal</h3>
                {hasAccess ? (
                  <Button onClick={handleDownload} variant="outline" className="gap-2">
                    <Download className="h-4 w-4" />
                    Descargar documento
                  </Button>
                ) : (
                  <Alert>
                    <Lock className="h-4 w-4" />
                    <AlertDescription>La descarga está disponible solo para usuarios autorizados.</AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Acciones según estado de autenticación */}
        <Card>
          <CardContent className="pt-6">
            {!user ? (
              // Usuario no autenticado
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <LogIn className="h-5 w-5" />
                  <span>¿Necesitas acceso completo al documento?</span>
                </div>
                <Button asChild>
                  <Link href="/login">Iniciar Sesión</Link>
                </Button>
              </div>
            ) : hasAccess ? (
              // Usuario autenticado con permisos
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center gap-2 text-green-600">
                  <Eye className="h-5 w-5" />
                  <span>Tienes acceso completo a este documento</span>
                </div>
                <Button asChild>
                  <Link href={`/documents/${document.id}`}>Ver Vista Completa</Link>
                </Button>
              </div>
            ) : (
              // Usuario autenticado sin permisos
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center gap-2 text-amber-600">
                  <Lock className="h-5 w-5" />
                  <span>Acceso limitado - No perteneces al departamento de este documento</span>
                </div>
                <Button variant="outline" asChild>
                  <Link href="/dashboard">Ir al Dashboard</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-muted-foreground">
          <p>Sistema de Gestión de Documentos</p>
        </div>
      </div>
    </div>
  )
}
