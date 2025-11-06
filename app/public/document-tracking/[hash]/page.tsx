"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { AlertCircle, Clock, MapPin, User, FileText } from "lucide-react"
import { createClient } from "@supabase/supabase-js"
import { Button } from "@/components/ui/button"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

interface DocumentInfo {
  id: string
  document_number: string
  title: string
  status: string
  created_at: string
  current_department_id: string
  departments: {
    name: string
    color: string
  }
  profiles: {
    full_name: string
  }
}

interface Movement {
  id: string
  from_department_id: string
  to_department_id: string
  moved_by: string
  moved_at: string
  notes: string
  from_department?: {
    name: string
    color: string
  }
  to_department?: {
    name: string
    color: string
  }
  profiles: {
    full_name: string
  }
}

const statusBadges: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendiente", color: "bg-yellow-100 text-yellow-800" },
  in_progress: { label: "En Proceso", color: "bg-blue-100 text-blue-800" },
  completed: { label: "Completado", color: "bg-green-100 text-green-800" },
  cancelled: { label: "Cancelado", color: "bg-red-100 text-red-800" },
}

export default function DocumentTrackingPage() {
  const params = useParams()
  const hash = params.hash as string

  const [document, setDocument] = useState<DocumentInfo | null>(null)
  const [movements, setMovements] = useState<Movement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchTrackingData()
  }, [hash])

  const fetchTrackingData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch document by tracking hash
      const { data: docData, error: docError } = await supabase
        .from("documents")
        .select(
          `
          id,
          document_number,
          title,
          status,
          created_at,
          current_department_id,
          departments!documents_current_department_id_fkey (
            name,
            color
          ),
          profiles!documents_created_by_fkey (
            full_name
          )
        `,
        )
        .eq("tracking_hash", hash)
        .single()

      if (docError) {
        setError("Documento no encontrado. Verifica que el código QR sea válido.")
        return
      }

      setDocument(docData as any)

      // Fetch movements for the document
      const { data: movementsData, error: movError } = await supabase
        .from("document_movements")
        .select(
          `
          id,
          from_department_id,
          to_department_id,
          moved_by,
          moved_at,
          notes,
          from_department:departments_document_movements_from_department_id_fkey (
            name,
            color
          ),
          to_department:departments_document_movements_to_department_id_fkey (
            name,
            color
          ),
          profiles (
            full_name
          )
        `,
        )
        .eq("document_id", docData.id)
        .order("moved_at", { ascending: true })

      if (!movError) {
        setMovements(movementsData as any)
      }
    } catch (err) {
      console.error("Error fetching tracking data:", err)
      setError("Error al cargar la información del documento")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (error || !document) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="max-w-2xl mx-auto">
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-800">
                <AlertCircle className="h-5 w-5" />
                {error || "Documento no encontrado"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-700">{error || "El documento solicitado no existe o no está disponible."}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const statusBadge = statusBadges[document.status as string] || statusBadges.pending

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Seguimiento de Documento</h1>
          <p className="text-slate-600">Visualiza el historial de movimientos de tu documento</p>
        </div>

        {/* Document Info */}
        <Card className="mb-6 shadow-sm">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl text-slate-900">{document.title}</CardTitle>
                <CardDescription className="text-slate-600">No. {document.document_number}</CardDescription>
              </div>
              <Badge className={statusBadge.color}>{statusBadge.label}</Badge>
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Created Info */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-slate-600 text-sm">
                  <Clock className="h-4 w-4" />
                  <span>Fecha de Creación</span>
                </div>
                <p className="text-slate-900 font-medium">
                  {format(new Date(document.created_at), "dd 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es })}
                </p>
              </div>

              {/* Creator */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-slate-600 text-sm">
                  <User className="h-4 w-4" />
                  <span>Creado por</span>
                </div>
                <p className="text-slate-900 font-medium">{document.profiles.full_name}</p>
              </div>

              {/* Current Location */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-slate-600 text-sm">
                  <MapPin className="h-4 w-4" />
                  <span>Ubicación Actual</span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: document.departments.color || "#888888" }}
                  ></div>
                  <p className="text-slate-900 font-medium">{document.departments.name}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Movements Timeline */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Historial de Movimientos ({movements.length})
            </CardTitle>
            <CardDescription>Todos los movimientos del documento desde su creación</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6">
            {movements.length === 0 ? (
              <p className="text-slate-600 text-center py-8">No hay movimientos registrados para este documento.</p>
            ) : (
              <div className="space-y-6">
                {movements.map((movement, index) => (
                  <div key={movement.id} className="relative">
                    {/* Timeline line */}
                    {index < movements.length - 1 && (
                      <div className="absolute left-5 top-12 h-8 w-0.5 bg-slate-200"></div>
                    )}

                    {/* Timeline item */}
                    <div className="flex gap-4">
                      {/* Timeline dot */}
                      <div className="relative">
                        <div
                          className="h-10 w-10 rounded-full border-4 border-white flex items-center justify-center flex-shrink-0"
                          style={{
                            backgroundColor: movement.to_department?.color || "#888888",
                          }}
                        >
                          <MapPin className="h-5 w-5 text-white" />
                        </div>
                      </div>

                      {/* Movement content */}
                      <div className="flex-1 pt-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-slate-900">
                            {movement.from_department?.name} → {movement.to_department?.name}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 mb-2">
                          Por: <span className="font-medium">{movement.profiles.full_name}</span>
                        </p>
                        <p className="text-xs text-slate-500">
                          {format(new Date(movement.moved_at), "dd MMM yyyy 'a las' HH:mm", { locale: es })}
                        </p>
                        {movement.notes && (
                          <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded text-sm text-slate-700 rounded">
                            <span className="font-medium">Nota: </span>
                            {movement.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer with Login CTA */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-blue-900 mb-1">¿Necesitas más información?</p>
              <p className="text-sm text-blue-700">
                Inicia sesión para ver información completa del documento, incluyendo archivos adjuntos.
              </p>
            </div>
            <Button
              onClick={() => {
                window.location.href = `/auth/login?redirect=/documents/${document.id}`
              }}
              className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 text-white"
            >
              Iniciar Sesión
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
