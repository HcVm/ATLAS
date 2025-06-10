"use client"

import type React from "react"

import { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  QrCode,
  FileText,
  Building2,
  User,
  Calendar,
  Camera,
  CameraOff,
  Upload,
  AlertCircle,
  RefreshCw,
} from "lucide-react"
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
  const [videoReady, setVideoReady] = useState(false)
  const [debugInfo, setDebugInfo] = useState<string>("")
  const [cameraFacing, setCameraFacing] = useState<"user" | "environment">("environment")
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([])
  const [isVideoMounted, setIsVideoMounted] = useState(false)
  const [autoRetryCount, setAutoRetryCount] = useState(0)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const autoRetryTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const router = useRouter()

  // Verificar que el video element esté montado
  useEffect(() => {
    const checkVideoElement = () => {
      if (videoRef.current) {
        setIsVideoMounted(true)
        console.log("Video element mounted successfully")
      } else {
        console.log("Video element not yet mounted")
        setTimeout(checkVideoElement, 100)
      }
    }

    checkVideoElement()
  }, [])

  // Obtener cámaras disponibles
  useEffect(() => {
    const getCameras = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const cameras = devices.filter((device) => device.kind === "videoinput")
        setAvailableCameras(cameras)
        console.log("Available cameras:", cameras)
      } catch (error) {
        console.error("Error getting cameras:", error)
      }
    }

    getCameras()
  }, [])

  // Limpiar recursos al desmontar el componente
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current)
      }
      if (autoRetryTimeoutRef.current) {
        clearTimeout(autoRetryTimeoutRef.current)
      }
    }
  }, [stream])

  const processQRData = async (data: string) => {
    console.log("QR detected:", data)
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
    if (!videoRef.current || !canvasRef.current || !scanning || !videoReady) {
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")

    // Validación básica - más tolerante que antes
    if (!ctx || video.videoWidth === 0 || video.videoHeight === 0) {
      return
    }

    try {
      // Configurar el canvas con las dimensiones del video
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      // Dibujar el frame actual del video en el canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      // Intentar detectar QR
      const qrData = await detectQRFromCanvas(canvas)
      if (qrData) {
        await processQRData(qrData)
      }
    } catch (error) {
      console.error("Error scanning frame:", error)
    }
  }, [scanning, videoReady])

  // Función para reintentar automáticamente si falla la primera vez
  const autoRetry = useCallback(() => {
    if (autoRetryCount < 3) {
      console.log(`Auto-retrying camera initialization (attempt ${autoRetryCount + 1}/3)...`)
      setDebugInfo(`Reintentando automáticamente (${autoRetryCount + 1}/3)...`)
      setAutoRetryCount((prev) => prev + 1)

      // Detener todo primero
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }

      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current)
        scanIntervalRef.current = null
      }

      // Esperar un momento y reintentar
      setTimeout(() => {
        startScanning(cameraFacing)
      }, 1000)
    } else {
      setCameraError("No se pudo inicializar la cámara después de varios intentos. Intenta cambiar de cámara.")
      setDebugInfo("❌ Demasiados intentos fallidos")
    }
  }, [autoRetryCount, cameraFacing, stream])

  const startScanning = async (facingMode: "user" | "environment" = cameraFacing) => {
    console.log("Starting camera with facing mode:", facingMode)

    // Verificar que el video element esté disponible
    if (!videoRef.current) {
      console.error("Video element not found, waiting...")
      setDebugInfo("Esperando elemento de video...")

      setTimeout(() => {
        if (videoRef.current) {
          console.log("Video element found after waiting, retrying...")
          startScanning(facingMode)
        } else {
          setCameraError("No se pudo encontrar el elemento de video. Intenta recargar la página.")
          setDebugInfo("Error: Elemento de video no encontrado")
        }
      }, 500)
      return
    }

    setCameraError(null)
    setError(null)
    setVideoReady(false)
    setScanning(false) // NO iniciar scanning hasta validar completamente
    setDebugInfo("Solicitando acceso a la cámara...")

    // Detener stream anterior si existe
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
    }

    // Limpiar intervalo anterior
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }

    // Limpiar timeout de auto-retry
    if (autoRetryTimeoutRef.current) {
      clearTimeout(autoRetryTimeoutRef.current)
    }

    try {
      // Configuración más flexible para el primer intento
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280, min: 320 },
          height: { ideal: 720, min: 240 },
        },
        audio: false,
      }

      console.log("Requesting camera with constraints:", constraints)
      setDebugInfo(`Obteniendo stream de cámara (${facingMode})...`)

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
      console.log("Camera stream obtained:", mediaStream)

      setStream(mediaStream)
      setCameraFacing(facingMode)
      setDebugInfo(`Stream obtenido. Configurando video...`)

      // Verificar nuevamente que el video element esté disponible
      if (!videoRef.current) {
        throw new Error("Video element disappeared during setup")
      }

      const video = videoRef.current

      // Limpiar eventos anteriores
      video.onloadedmetadata = null
      video.onerror = null
      video.oncanplay = null
      video.onloadeddata = null

      // Configurar el video element
      video.srcObject = mediaStream
      video.playsInline = true
      video.muted = true
      video.autoplay = true

      // Configurar atributos adicionales para móviles
      video.setAttribute("playsinline", "true")
      video.setAttribute("webkit-playsinline", "true")
      video.setAttribute("muted", "true")

      setDebugInfo("Configurando video element...")

      // Función para validar que el video está listo - más tolerante ahora
      const validateVideoReady = (): boolean => {
        if (!video) return false

        // En los primeros intentos, ser más tolerante
        if (autoRetryCount === 0) {
          const isReady = video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0

          console.log("Initial video validation:", {
            readyState: video.readyState,
            videoWidth: video.videoWidth,
            videoHeight: video.videoHeight,
            isReady,
          })

          return isReady
        }

        // En reintentos, ser más estricto
        const isReady =
          video.readyState >= 2 &&
          video.videoWidth > 0 &&
          video.videoHeight > 0 &&
          !video.paused &&
          video.currentTime > 0

        console.log("Strict video validation:", {
          readyState: video.readyState,
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight,
          paused: video.paused,
          currentTime: video.currentTime,
          isReady,
        })

        return isReady
      }

      // Manejar eventos del video con validación más tolerante
      video.onloadedmetadata = () => {
        console.log("Video metadata loaded")
        setDebugInfo(`Metadata cargada: ${video.videoWidth}x${video.videoHeight}`)

        video
          .play()
          .then(() => {
            console.log("Video play() called successfully")
            setDebugInfo("Video iniciado, esperando estabilización...")

            // Esperar más tiempo antes de validar (3 segundos)
            setTimeout(() => {
              // Validar solo una vez después de esperar
              if (validateVideoReady()) {
                console.log("✅ Video estabilizado y listo")
                setVideoReady(true)
                setScanning(true)
                setDebugInfo("✅ Video estabilizado - Iniciando escaneo...")

                // Iniciar escaneo con un intervalo más largo al principio
                scanIntervalRef.current = setInterval(scanFrame, 500)

                // Después de 5 segundos, acelerar el escaneo si sigue activo
                setTimeout(() => {
                  if (scanIntervalRef.current) {
                    clearInterval(scanIntervalRef.current)
                    scanIntervalRef.current = setInterval(scanFrame, 300)
                    setDebugInfo("🎯 Escaneo optimizado")
                  }
                }, 5000)
              } else {
                console.log("❌ Video no estabilizado después de esperar")
                setDebugInfo("❌ Video no estable - reintentando...")

                // Configurar auto-retry
                autoRetryTimeoutRef.current = setTimeout(autoRetry, 1000)
              }
            }, 3000) // Esperar 3 segundos completos para estabilización
          })
          .catch((playError) => {
            console.error("Error playing video:", playError)
            setCameraError(`Error al reproducir video: ${playError.message}`)
            setDebugInfo(`Error reproduciendo: ${playError.message}`)
          })
      }

      video.onerror = (e) => {
        console.error("Video error:", e)
        setCameraError("Error en el elemento de video")
        setDebugInfo("Error en el elemento de video")
      }

      // Forzar la carga del video
      video.load()
    } catch (error: any) {
      console.error("Camera error:", error)
      let errorMessage = "Error desconocido al acceder a la cámara"

      if (error.name === "NotAllowedError") {
        errorMessage = "Permisos de cámara denegados. Por favor, permite el acceso a la cámara."
      } else if (error.name === "NotFoundError") {
        errorMessage = "No se encontró ninguna cámara en este dispositivo."
      } else if (error.name === "NotReadableError") {
        errorMessage = "La cámara está siendo usada por otra aplicación."
      } else if (error.name === "OverconstrainedError") {
        errorMessage = "Las configuraciones de cámara solicitadas no son compatibles."
      } else {
        errorMessage = `Error de cámara: ${error.message}`
      }

      setCameraError(errorMessage)
      setDebugInfo(`Error: ${errorMessage}`)

      // Si falla con la cámara trasera, intentar con la frontal
      if (facingMode === "environment" && error.name === "OverconstrainedError") {
        console.log("Trying front camera as fallback...")
        setTimeout(() => startScanning("user"), 1000)
      }
    }
  }

  const stopScanning = () => {
    console.log("Stopping camera...")
    setScanning(false)
    setVideoReady(false)
    setCameraError(null)
    setDebugInfo("Deteniendo cámara...")
    setAutoRetryCount(0)

    // Limpiar timeout de auto-retry
    if (autoRetryTimeoutRef.current) {
      clearTimeout(autoRetryTimeoutRef.current)
    }

    // Detener el stream de video
    if (stream) {
      stream.getTracks().forEach((track) => {
        console.log("Stopping track:", track.kind)
        track.stop()
      })
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
      videoRef.current.load()
    }

    setDebugInfo("Cámara detenida")
  }

  const switchCamera = () => {
    const newFacing = cameraFacing === "environment" ? "user" : "environment"
    console.log("Switching camera to:", newFacing)
    setAutoRetryCount(0) // Reset retry count when manually switching
    stopScanning()
    setTimeout(() => startScanning(newFacing), 500)
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
    setDebugInfo("")
    setAutoRetryCount(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const viewDocumentDetails = () => {
    if (documentData) {
      router.push(`/documents/${documentData.id}`)
    }
  }

  // Función para reiniciar manualmente
  const restartCamera = () => {
    setAutoRetryCount(0)
    stopScanning()
    setTimeout(() => {
      startScanning(cameraFacing)
    }, 1000)
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
                <div className="aspect-square max-w-md mx-auto overflow-hidden rounded-lg border bg-black relative">
                  {/* Video element siempre presente */}
                  <video
                    ref={videoRef}
                    className={`w-full h-full object-cover ${scanning && videoReady ? "block" : "hidden"}`}
                    playsInline
                    muted
                    autoPlay
                    style={{
                      transform: cameraFacing === "user" ? "scaleX(-1)" : "none",
                    }}
                  />
                  <canvas ref={canvasRef} className="hidden" />

                  {/* Overlay para mostrar el área de escaneo */}
                  {scanning && videoReady && (
                    <>
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-48 h-48 border-2 border-white border-dashed rounded-lg opacity-70 animate-pulse"></div>
                      </div>
                      {/* Indicador de escaneo activo */}
                      <div className="absolute top-4 left-4 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                        Escaneando...
                      </div>
                      {/* Botón para cambiar cámara */}
                      {availableCameras.length > 1 && (
                        <button
                          onClick={switchCamera}
                          className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                          title="Cambiar cámara"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>
                      )}
                    </>
                  )}

                  {/* Estado cuando no está escaneando */}
                  {(!scanning || !videoReady) && (
                    <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center text-center p-6">
                      <Camera className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">
                        {cameraError ? "Error con la cámara" : scanning ? "Iniciando cámara..." : "Cámara Detenida"}
                      </h3>
                      <p className="text-muted-foreground text-sm mb-4">
                        {cameraError
                          ? "Verifica los permisos de cámara"
                          : scanning
                            ? "Configurando video..."
                            : "Haz clic para iniciar el escáner"}
                      </p>
                      {!scanning && (
                        <div className="space-y-2">
                          <Button onClick={() => startScanning()} disabled={!!cameraError || !isVideoMounted} size="sm">
                            <Camera className="h-4 w-4 mr-2" />
                            Iniciar Escáner
                          </Button>
                          {availableCameras.length > 1 && isVideoMounted && (
                            <div className="flex gap-2">
                              <Button
                                onClick={() => startScanning("environment")}
                                disabled={!!cameraError}
                                size="sm"
                                variant="outline"
                              >
                                Cámara Trasera
                              </Button>
                              <Button
                                onClick={() => startScanning("user")}
                                disabled={!!cameraError}
                                size="sm"
                                variant="outline"
                              >
                                Cámara Frontal
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                      {scanning && !videoReady && (
                        <div className="flex items-center gap-2">
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          <span className="text-sm">Cargando... (espera 3 segundos)</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Información de debug */}
                {debugInfo && (
                  <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                    <strong>Debug:</strong> {debugInfo}
                  </div>
                )}

                {/* Información de estado del video */}
                <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                  <strong>Estado:</strong> Video element {isVideoMounted ? "montado" : "no montado"} | Cámaras:{" "}
                  {availableCameras.length} | Activa: {cameraFacing === "environment" ? "Trasera" : "Frontal"} |
                  Reintentos: {autoRetryCount}
                </div>

                {/* Controles fuera del contenedor de video */}
                <div className="text-center space-y-2">
                  {scanning && videoReady ? (
                    <>
                      <p className="text-sm text-muted-foreground">Apunta la cámara hacia el código QR</p>
                      <div className="flex gap-2 justify-center">
                        <Button onClick={stopScanning} variant="outline" size="sm">
                          <CameraOff className="h-4 w-4 mr-2" />
                          Detener Escáner
                        </Button>
                        {availableCameras.length > 1 && (
                          <Button onClick={switchCamera} variant="outline" size="sm">
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Cambiar Cámara
                          </Button>
                        )}
                      </div>
                    </>
                  ) : scanning ? (
                    <Button onClick={stopScanning} variant="outline" size="sm">
                      <CameraOff className="h-4 w-4 mr-2" />
                      Cancelar
                    </Button>
                  ) : (
                    <Button onClick={restartCamera} variant="outline" size="sm">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Reiniciar Cámara
                    </Button>
                  )}
                </div>

                {cameraError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {cameraError}
                      {cameraError.includes("OverconstrainedError") && (
                        <div className="mt-2">
                          <Button onClick={() => startScanning("user")} size="sm" variant="outline">
                            Probar Cámara Frontal
                          </Button>
                        </div>
                      )}
                      {cameraError.includes("elemento de video") && (
                        <div className="mt-2">
                          <Button onClick={() => window.location.reload()} size="sm" variant="outline">
                            Recargar Página
                          </Button>
                        </div>
                      )}
                    </AlertDescription>
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
                <h3 className="mt-4 text-lg-medium">Código QR Escaneado</h3>
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
