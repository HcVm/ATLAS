"use client"

import { useState } from "react"
import { QrReader } from "react-qr-reader"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { QrCode, FileText, Building2, User, Calendar, Camera, CameraOff } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"

export default function ScanQRPage() {
  const [scanning, setScanning] = useState(false)
  const [scannedData, setScannedData] = useState<string | null>(null)
  const [documentData, setDocumentData] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleScan = async (result: any) => {
    if (result) {
      const data = result.text || result
      setScanning(false)
      setScannedData(data)
      setLoading(true)
      setError(null)

      try {
        // Extraer el ID del documento de la URL escaneada
        const urlParts = data.split("/")
        const documentId = urlParts[urlParts.length - 1]

        // Buscar el documento en la base de datos
        const { data: document, error: documentError } = await supabase
          .from("documents")
          .select(`
            *,
            profiles!documents_created_by_fkey (full_name),
            departments (name)
          `)
          .eq("id", documentId)
          .single()

        if (documentError) {
          throw new Error("No se encontró el documento")
        }

        // Buscar los movimientos del documento
        const { data: movements, error: movementsError } = await supabase
          .from("document_movements")
          .select(`
            *,
            profiles!document_movements_moved_by_fkey (full_name),
            departments!document_movements_from_department_id_fkey (name) as from_department_name,
            departments!document_movements_to_department_id_fkey (name) as to_department_name
          `)
          .eq("document_id", documentId)
          .order("created_at", { ascending: false })

        if (movementsError) {
          console.error("Error fetching movements:", movementsError)
        }

        setDocumentData({
          ...document,
          movements: movements || [],
        })
      } catch (error: any) {
        setError(error.message)
        setDocumentData(null)
      } finally {
        setLoading(false)
      }
    }
  }

  const handleError = (err: any) => {
    console.error(err)
    setError("Error al escanear el código QR. Por favor, inténtalo de nuevo.")
  }

  const resetScan = () => {
    setScanning(true)
    setScannedData(null)
    setDocumentData(null)
    setError(null)
  }

  const stopScan = () => {
    setScanning(false)
  }

  const viewDocumentDetails = () => {
    if (documentData) {
      router.push(`/documents/${documentData.id}`)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Escanear QR</h1>
        <p className="text-muted-foreground">Escanea un código QR para ver los detalles del documento</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Escáner de Código QR</CardTitle>
            <CardDescription>Apunta la cámara hacia el código QR del documento para escanearlo</CardDescription>
          </CardHeader>
          <CardContent>
            {scanning ? (
              <div className="space-y-4">
                <div className="aspect-square max-w-md mx-auto overflow-hidden rounded-lg border">
                  <QrReader
                    onResult={handleScan}
                    constraints={{ facingMode: "environment" }}
                    containerStyle={{
                      width: "100%",
                      height: "100%",
                      borderRadius: "0.5rem",
                    }}
                    videoContainerStyle={{
                      paddingTop: "100%",
                    }}
                  />
                </div>
                <div className="text-center">
                  <Button onClick={stopScan} variant="outline">
                    <CameraOff className="h-4 w-4 mr-2" />
                    Detener Escáner
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-10">
                <QrCode className="h-12 w-12 text-muted-foreground mx-auto" />
                <h3 className="mt-4 text-lg font-medium">Escáner Detenido</h3>
                <p className="text-muted-foreground mb-4">El escáner está actualmente detenido.</p>
                <Button onClick={resetScan}>
                  <Camera className="h-4 w-4 mr-2" />
                  Iniciar Escáner
                </Button>
              </div>
            )}

            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Información del Documento</CardTitle>
            <CardDescription>Detalles del documento escaneado</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-10">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-muted-foreground">Cargando información del documento...</p>
              </div>
            ) : documentData ? (
              <div className="space-y-6">
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold">{documentData.title}</h3>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <FileText className="h-4 w-4 mr-1" />
                    <span>{documentData.document_number}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Departamento</p>
                    <div className="flex items-center text-sm">
                      <Building2 className="h-4 w-4 mr-1 text-muted-foreground" />
                      <span>{documentData.departments?.name}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm font-medium">Creado por</p>
                    <div className="flex items-center text-sm">
                      <User className="h-4 w-4 mr-1 text-muted-foreground" />
                      <span>{documentData.profiles?.full_name}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm font-medium">Estado</p>
                    <div className="flex items-center">
                      <span className="capitalize px-2 py-1 rounded-full text-xs bg-primary/10 text-primary">
                        {documentData.status}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm font-medium">Fecha de creación</p>
                    <div className="flex items-center text-sm">
                      <Calendar className="h-4 w-4 mr-1 text-muted-foreground" />
                      <span>{new Date(documentData.created_at).toLocaleDateString("es-ES")}</span>
                    </div>
                  </div>
                </div>

                {documentData.description && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Descripción</p>
                    <p className="text-sm text-muted-foreground">{documentData.description}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <p className="text-sm font-medium">Movimientos recientes</p>
                  {documentData.movements.length > 0 ? (
                    <div className="space-y-2">
                      {documentData.movements.slice(0, 3).map((movement: any) => (
                        <div key={movement.id} className="text-sm p-3 border rounded-md bg-muted/50">
                          <div className="flex justify-between items-start">
                            <span className="font-medium">
                              {movement.to_department_name
                                ? `Movido a ${movement.to_department_name}`
                                : "Creación del documento"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(movement.created_at).toLocaleDateString("es-ES")}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">Por: {movement.profiles?.full_name}</div>
                          {movement.notes && (
                            <div className="text-xs text-muted-foreground mt-1">Notas: {movement.notes}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No hay movimientos registrados</p>
                  )}
                </div>

                <Button onClick={viewDocumentDetails} className="w-full">
                  Ver Detalles Completos
                </Button>
              </div>
            ) : scannedData ? (
              <div className="text-center py-10">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
                <h3 className="mt-4 text-lg font-medium">Código QR Escaneado</h3>
                <p className="text-muted-foreground mb-4">
                  Se escaneó un código QR pero no se encontró información del documento.
                </p>
                <div className="bg-muted p-3 rounded-md">
                  <p className="text-xs text-muted-foreground break-all font-mono">{scannedData}</p>
                </div>
                <Button onClick={resetScan} className="mt-4" variant="outline">
                  Escanear Otro Código
                </Button>
              </div>
            ) : (
              <div className="text-center py-10">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
                <h3 className="mt-4 text-lg font-medium">No hay información</h3>
                <p className="text-muted-foreground">Escanea un código QR para ver la información del documento.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
