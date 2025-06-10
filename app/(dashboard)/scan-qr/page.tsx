"use client"

import type React from "react"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { QrCode, FileText, Building2, User, Calendar, Camera, CameraOff, Upload, AlertCircle } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"

// Función para detectar QR en canvas usando BarcodeDetector API
const detectQRFromCanvas = async (canvas: HTMLCanvasElement): Promise<string | null> => {
  try {
    // Usar BarcodeDetector si está disponible (navegadores modernos)
    if ("BarcodeDetector" in window) {
      const barcodeDetector = new (window as any).BarcodeDetector({
        formats: ["qr_code"],
      })
      const barcodes = await barcodeDetector.detect(canvas)
      if (barcodes.length > 0) {
        return barcodes[0].rawValue
      }
    }

    // Fallback: usar jsQR si BarcodeDetector no está disponible
    const ctx = canvas.getContext("2d")
    if (!ctx) return null

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

    // Importar jsQR dinámicamente
    const jsQR = (await import("jsqr")).default
    const code = jsQR(imageData.data, imageData.width, imageData.height)

    return code ? code.data : null
  } catch (error) {
    console.error("Error detecting QR:", error)
    return null
  }
}

export default function ScanQRPage() {
  const [scanning, setScanning] = useState(false)
  const [scannedData, setScannedData] = useState<string | null>(null)
  const [documentData, setDocumentData] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const router = useRouter()

  const processQRData = async (data: string) => {
    setScanning(false)
    setScannedData(data)
    setLoading(true)
    setError(null)

    // Detener el stream de video
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
    }

    // Limpiar el intervalo de escaneo
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }

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

  const scanFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !scanning) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")

    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) return

    // Configurar el canvas con las dimensiones del video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Dibujar el frame actual del video en el canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Intentar detectar QR
    try {
      const qrData = await detectQRFromCanvas(canvas)
      if (qrData) {
        await processQRData(qrData)
      }
    } catch (error) {
      console.error("Error scanning frame:", error)
    }
  }, [scanning])

  const startScanning = async () => {
    setCameraError(null)
    setError(null)

    try {
      // Solicitar acceso a la cámara
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment", // Usar cámara trasera si está disponible
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })

      setStream(mediaStream)

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        videoRef.current.play()

        // Esperar a que el video esté listo
        videoRef.current.onloadedmetadata = () => {
          setScanning(true)

          // Iniciar el escaneo continuo
          scanIntervalRef.current = setInterval(scanFrame, 100) // Escanear cada 100ms
        }
      }
    } catch (error: any) {
      console.error("Camera permission error:", error)
      if (error.name === "NotAllowedError") {
        setCameraError("Permisos de cámara denegados. Por favor, permite el acceso a la cámara y recarga la página.")
      } else if (error.name === "NotFoundError") {
        setCameraError("No se encontró ninguna cámara en este dispositivo.")
      } else {
        setCameraError(
          "Error al acceder a la cámara. Verifica que tu dispositivo tenga cámara y que el navegador tenga permisos.",
        )
      }
    }
  }

  const stopScanning = () => {
    setScanning(false)
    setCameraError(null)

    // Detener el stream de video
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
    }

    // Limpiar el intervalo de escaneo
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }

    // Limpiar el video
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setLoading(true)
    setError(null)

    try {
      // Crear una imagen para procesar
      const img = new Image()
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")

      img.onload = async () => {
        canvas.width = img.width
        canvas.height = img.height
        ctx?.drawImage(img, 0, 0)

        try {
          const qrData = await detectQRFromCanvas(canvas)
          if (qrData) {
            await processQRData(qrData)
          } else {
            setError(
              "No se pudo detectar un código QR en la imagen. Asegúrate de que la imagen contenga un código QR válido.",
            )
            setLoading(false)
          }
        } catch (error) {
          setError("Error al procesar el código QR de la imagen.")
          setLoading(false)
        }
      }

      img.onerror = () => {
        setError("Error al cargar la imagen. Por favor, selecciona una imagen válida.")
        setLoading(false)
      }

      // Convertir archivo a URL de datos
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        setUploadedImage(result)
        img.src = result
      }
      reader.readAsDataURL(file)
    } catch (error: any) {
      setError("Error al procesar la imagen: " + error.message)
      setLoading(false)
    }
  }

  const resetScan = () => {
    setScannedData(null)
    setDocumentData(null)
    setError(null)
    setCameraError(null)
    setUploadedImage(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
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
        <p className="text-muted-foreground">
          Escanea un código QR o sube una imagen para ver los detalles del documento
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Escáner de Código QR</CardTitle>
            <CardDescription>Usa la cámara o sube una imagen para escanear códigos QR</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="camera" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="camera">Cámara</TabsTrigger>
                <TabsTrigger value="upload">Subir Imagen</TabsTrigger>
              </TabsList>

              <TabsContent value="camera" className="space-y-4">
                {scanning ? (
                  <div className="space-y-4">
                    <div className="aspect-square max-w-md mx-auto overflow-hidden rounded-lg border bg-black relative">
                      <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                      <canvas ref={canvasRef} className="hidden" />
                      {/* Overlay para mostrar el área de escaneo */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-48 h-48 border-2 border-white border-dashed rounded-lg opacity-50"></div>
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-2">Apunta la cámara hacia el código QR</p>
                      <Button onClick={stopScanning} variant="outline">
                        <CameraOff className="h-4 w-4 mr-2" />
                        Detener Escáner
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <Camera className="h-12 w-12 text-muted-foreground mx-auto" />
                    <h3 className="mt-4 text-lg font-medium">Cámara Detenida</h3>
                    <p className="text-muted-foreground mb-4">
                      {cameraError ? "Error con la cámara" : "Haz clic para iniciar el escáner"}
                    </p>
                    <Button onClick={startScanning} disabled={!!cameraError}>
                      <Camera className="h-4 w-4 mr-2" />
                      Iniciar Escáner
                    </Button>
                  </div>
                )}

                {cameraError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{cameraError}</AlertDescription>
                  </Alert>
                )}
              </TabsContent>

              <TabsContent value="upload" className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="qr-upload">Seleccionar imagen con código QR</Label>
                    <Input
                      id="qr-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      ref={fileInputRef}
                      className="mt-1"
                    />
                  </div>

                  {uploadedImage && (
                    <div className="text-center">
                      <img
                        src={uploadedImage || "/placeholder.svg"}
                        alt="Imagen subida"
                        className="max-w-full max-h-64 mx-auto rounded-lg border"
                      />
                    </div>
                  )}

                  <div className="text-center py-6">
                    <Upload className="h-12 w-12 text-muted-foreground mx-auto" />
                    <h3 className="mt-4 text-lg font-medium">Subir Imagen</h3>
                    <p className="text-muted-foreground">Selecciona una imagen que contenga un código QR</p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {(scannedData || documentData) && (
              <div className="mt-4">
                <Button onClick={resetScan} variant="outline" className="w-full">
                  Escanear Otro Código
                </Button>
              </div>
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
              </div>
            ) : (
              <div className="text-center py-10">
                <QrCode className="h-12 w-12 text-muted-foreground mx-auto" />
                <h3 className="mt-4 text-lg font-medium">No hay información</h3>
                <p className="text-muted-foreground">
                  Escanea un código QR o sube una imagen para ver la información del documento.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
