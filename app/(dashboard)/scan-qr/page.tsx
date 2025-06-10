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
  Play,
  Pause,
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
  // Estados para la cámara
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraReady, setCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [cameraFacing, setCameraFacing] = useState<"user" | "environment">("environment")
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([])

  // Estados para el escaneo
  const [scanningActive, setScanningActive] = useState(false)
  const [scannedData, setScannedData] = useState<string | null>(null)
  const [documentData, setDocumentData] = useState<any | null>(null)

  // Estados generales
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<string>("")
  const [isVideoMounted, setIsVideoMounted] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null)
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
    }
  }, [stream])

  const processQRData = async (data: string) => {
    console.log("QR detected:", data)
    setScanningActive(false)
    setScannedData(data)
    setLoading(true)
    setError(null)

    // Limpiar el intervalo de escaneo pero mantener la cámara activa
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
    if (!videoRef.current || !canvasRef.current || !scanningActive || !cameraReady) {
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")

    // Validación básica
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
  }, [scanningActive, cameraReady])

  // FUNCIÓN 1: INICIALIZAR CÁMARA (separada del escaneo)
  const initializeCamera = async (facingMode: "user" | "environment" = cameraFacing) => {
    console.log("🎥 Initializing camera with facing mode:", facingMode)
    setDebugInfo("🎥 Inicializando cámara...")

    // Verificar que el video element esté disponible
    if (!videoRef.current) {
      setCameraError("Elemento de video no encontrado")
      setDebugInfo("❌ Elemento de video no encontrado")
      return
    }

    setCameraError(null)
    setCameraActive(true)
    setCameraReady(false)

    // Detener stream anterior si existe
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280, min: 320 },
          height: { ideal: 720, min: 240 },
        },
        audio: false,
      }

      console.log("📡 Requesting camera access...")
      setDebugInfo("📡 Solicitando acceso a la cámara...")

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
      console.log("✅ Camera stream obtained")

      setStream(mediaStream)
      setCameraFacing(facingMode)
      setDebugInfo("✅ Stream obtenido, configurando video...")

      const video = videoRef.current
      if (!video) {
        throw new Error("Video element disappeared")
      }

      // Configurar el video element
      video.srcObject = mediaStream
      video.playsInline = true
      video.muted = true
      video.autoplay = true

      // Configurar atributos para móviles
      video.setAttribute("playsinline", "true")
      video.setAttribute("webkit-playsinline", "true")
      video.setAttribute("muted", "true")

      // Manejar eventos del video
      video.onloadedmetadata = () => {
        console.log("📹 Video metadata loaded:", video.videoWidth, "x", video.videoHeight)
        setDebugInfo(`📹 Video cargado: ${video.videoWidth}x${video.videoHeight}`)

        video
          .play()
          .then(() => {
            console.log("▶️ Video playing successfully")
            setDebugInfo("▶️ Video reproduciéndose...")

            // Esperar un momento para que se estabilice
            setTimeout(() => {
              if (video.readyState >= 2 && video.videoWidth > 0) {
                console.log("🎯 Camera ready for use")
                setCameraReady(true)
                setDebugInfo("🎯 Cámara lista para usar")
              } else {
                console.log("⚠️ Video not fully ready, retrying...")
                setTimeout(() => {
                  if (video.readyState >= 2 && video.videoWidth > 0) {
                    setCameraReady(true)
                    setDebugInfo("🎯 Cámara lista para usar")
                  } else {
                    setCameraError("La cámara no se inicializó correctamente")
                    setDebugInfo("❌ Error: Cámara no inicializada")
                  }
                }, 1000)
              }
            }, 1500)
          })
          .catch((playError) => {
            console.error("❌ Error playing video:", playError)
            setCameraError(`Error al reproducir video: ${playError.message}`)
            setDebugInfo(`❌ Error reproduciendo: ${playError.message}`)
          })
      }

      video.onerror = (e) => {
        console.error("❌ Video error:", e)
        setCameraError("Error en el elemento de video")
        setDebugInfo("❌ Error en el elemento de video")
      }

      // Forzar la carga del video
      video.load()
    } catch (error: any) {
      console.error("❌ Camera initialization error:", error)
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
      setDebugInfo(`❌ Error: ${errorMessage}`)
      setCameraActive(false)

      // Si falla con la cámara trasera, sugerir la frontal
      if (facingMode === "environment" && error.name === "OverconstrainedError") {
        setDebugInfo("💡 Intenta con la cámara frontal")
      }
    }
  }

  // FUNCIÓN 2: INICIAR ESCANEO (separada de la inicialización)
  const startScanning = () => {
    if (!cameraReady) {
      setError("La cámara no está lista. Espera a que se inicialice completamente.")
      return
    }

    console.log("🔍 Starting QR scanning...")
    setScanningActive(true)
    setError(null)
    setDebugInfo("🔍 Escaneo de QR activado")

    // Iniciar el intervalo de escaneo
    scanIntervalRef.current = setInterval(scanFrame, 300)
  }

  // FUNCIÓN 3: DETENER ESCANEO (mantener cámara activa)
  const stopScanning = () => {
    console.log("⏸️ Stopping QR scanning...")
    setScanningActive(false)
    setDebugInfo("⏸️ Escaneo pausado - Cámara sigue activa")

    // Limpiar el intervalo de escaneo
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }
  }

  // FUNCIÓN 4: DETENER CÁMARA COMPLETAMENTE
  const stopCamera = () => {
    console.log("📴 Stopping camera...")
    setScanningActive(false)
    setCameraActive(false)
    setCameraReady(false)
    setCameraError(null)
    setDebugInfo("📴 Cámara detenida")

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
  }

  // FUNCIÓN 5: CAMBIAR CÁMARA
  const switchCamera = () => {
    const newFacing = cameraFacing === "environment" ? "user" : "environment"
    console.log("🔄 Switching camera to:", newFacing)

    // Detener escaneo si está activo
    if (scanningActive) {
      stopScanning()
    }

    // Detener cámara actual
    stopCamera()

    // Inicializar nueva cámara
    setTimeout(() => {
      initializeCamera(newFacing)
    }, 500)
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
            <CardDescription>Primero inicia la cámara, luego activa el escaneo cuando esté listo</CardDescription>
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
                    className={`w-full h-full object-cover ${cameraActive && cameraReady ? "block" : "hidden"}`}
                    playsInline
                    muted
                    autoPlay
                    style={{
                      transform: cameraFacing === "user" ? "scaleX(-1)" : "none",
                    }}
                  />
                  <canvas ref={canvasRef} className="hidden" />

                  {/* Overlay para mostrar el área de escaneo cuando está escaneando */}
                  {scanningActive && cameraReady && (
                    <>
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-48 h-48 border-2 border-green-400 border-dashed rounded-lg opacity-80 animate-pulse"></div>
                      </div>
                      {/* Indicador de escaneo activo */}
                      <div className="absolute top-4 left-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                        Escaneando QR...
                      </div>
                    </>
                  )}

                  {/* Indicador de cámara lista pero sin escanear */}
                  {cameraReady && !scanningActive && (
                    <div className="absolute top-4 left-4 bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
                      <Camera className="w-4 h-4" />
                      Cámara Lista
                    </div>
                  )}

                  {/* Botón para cambiar cámara */}
                  {availableCameras.length > 1 && cameraActive && (
                    <button
                      onClick={switchCamera}
                      className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                      title="Cambiar cámara"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                  )}

                  {/* Estado cuando la cámara no está activa */}
                  {!cameraActive && (
                    <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center text-center p-6">
                      <Camera className="h-16 w-16 text-muted-foreground mb-4" />
                      <h3 className="text-xl font-medium mb-2">Cámara Inactiva</h3>
                      <p className="text-muted-foreground text-sm mb-6">Haz clic para inicializar la cámara</p>
                    </div>
                  )}

                  {/* Estado cuando la cámara está inicializándose */}
                  {cameraActive && !cameraReady && !cameraError && (
                    <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center text-center p-6">
                      <RefreshCw className="h-16 w-16 text-blue-500 mb-4 animate-spin" />
                      <h3 className="text-xl font-medium mb-2">Inicializando Cámara</h3>
                      <p className="text-muted-foreground text-sm">Configurando video, espera un momento...</p>
                    </div>
                  )}

                  {/* Estado de error */}
                  {cameraError && (
                    <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center text-center p-6">
                      <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
                      <h3 className="text-xl font-medium mb-2">Error de Cámara</h3>
                      <p className="text-muted-foreground text-sm mb-4">{cameraError}</p>
                    </div>
                  )}
                </div>

                {/* Información de debug */}
                {debugInfo && (
                  <div className="text-xs text-muted-foreground bg-muted p-3 rounded">
                    <strong>Estado:</strong> {debugInfo}
                  </div>
                )}

                {/* Información de estado */}
                <div className="text-xs text-muted-foreground bg-muted p-3 rounded">
                  <strong>Info:</strong> Cámaras disponibles: {availableCameras.length} | Activa:{" "}
                  {cameraFacing === "environment" ? "Trasera" : "Frontal"} | Estado:{" "}
                  {cameraActive ? (cameraReady ? "Lista" : "Inicializando") : "Inactiva"}
                </div>

                {/* Controles principales */}
                <div className="space-y-3">
                  {/* Paso 1: Controles de cámara */}
                  <div className="flex gap-2 justify-center">
                    {!cameraActive ? (
                      <div className="space-y-2 w-full">
                        <Button onClick={() => initializeCamera()} disabled={!isVideoMounted} className="w-full">
                          <Camera className="h-4 w-4 mr-2" />
                          Inicializar Cámara
                        </Button>
                        {availableCameras.length > 1 && isVideoMounted && (
                          <div className="flex gap-2">
                            <Button
                              onClick={() => initializeCamera("environment")}
                              disabled={!isVideoMounted}
                              variant="outline"
                              className="flex-1"
                            >
                              Cámara Trasera
                            </Button>
                            <Button
                              onClick={() => initializeCamera("user")}
                              disabled={!isVideoMounted}
                              variant="outline"
                              className="flex-1"
                            >
                              Cámara Frontal
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <Button onClick={stopCamera} variant="outline">
                        <CameraOff className="h-4 w-4 mr-2" />
                        Detener Cámara
                      </Button>
                    )}
                  </div>

                  {/* Paso 2: Controles de escaneo (solo si la cámara está lista) */}
                  {cameraReady && (
                    <div className="border-t pt-3">
                      <div className="flex gap-2 justify-center">
                        {!scanningActive ? (
                          <Button onClick={startScanning} className="w-full">
                            <Play className="h-4 w-4 mr-2" />
                            Iniciar Escaneo QR
                          </Button>
                        ) : (
                          <Button onClick={stopScanning} variant="outline" className="w-full">
                            <Pause className="h-4 w-4 mr-2" />
                            Pausar Escaneo
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground text-center mt-2">
                        {scanningActive
                          ? "Apunta la cámara hacia el código QR"
                          : "Haz clic para activar el escaneo de códigos QR"}
                      </p>
                    </div>
                  )}
                </div>

                {cameraError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {cameraError}
                      {cameraError.includes("OverconstrainedError") && (
                        <div className="mt-2">
                          <Button onClick={() => initializeCamera("user")} size="sm" variant="outline">
                            Probar Cámara Frontal
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
