"use client"
import type React from "react"
import { useState, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, Info, Zap, Database, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

const ACUERDOS_MARCO = [
  {
    codigo: "EXT-CE-2025-11",
    nombre: "MOBILIARIO EN GENERAL",
    descripcion: "Acuerdo marco para la adquisición de mobiliario en general",
    status: "active",
  },
  {
    codigo: "EXT-CE-2024-12",
    nombre: "TUBERIAS, PINTURAS, CERAMICOS, SANITARIOS, ACCESORIOS Y COMPLEMENTOS EN GENERAL",
    descripcion: "Acuerdo marco para tuberías, pinturas, cerámicos, sanitarios, accesorios y complementos",
    status: "active",
  },
  {
    codigo: "EXT-CE-2024-3",
    nombre: "MATERIALES E INSUMOS DE LIMPIEZA, PAPELES PARA ASEO Y LIMPIEZA",
    descripcion: "Acuerdo marco para materiales e insumos de limpieza",
    status: "active",
  },
  {
    codigo: "EXT-CE-2024-16",
    nombre: "ACCESORIOS DOMÉSTICOS Y BIENES PARA USOS DIVERSOS",
    descripcion: "Acuerdo marco para accesorios domésticos y bienes diversos",
    status: "active",
  },
  {
    codigo: "EXT-CE-2024-26",
    nombre: "MAQUINAS, EQUIPOS Y HERRAMIENTAS PARA JARDINERIA, SILVICULTURA Y AGRICULTURA",
    descripcion: "Acuerdo marco para maquinaria y equipos agrícolas",
    status: "active",
  },
]

interface UploadStats {
  totalRows: number
  processedRows: number
  insertedRows: number
  filteredRows: number
  chunks: number
  brandAlerts: number
  errors: string[]
  processingMethod: string
  fileSize: number
  fileName: string
}

export default function OpenDataUploadPage() {
  const [selectedAcuerdo, setSelectedAcuerdo] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [uploadStats, setUploadStats] = useState<UploadStats | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB
  const CHUNKING_THRESHOLD = 10 * 1024 * 1024 // 10MB

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const getProcessingInfo = (fileSize: number) => {
    if (fileSize > CHUNKING_THRESHOLD) {
      const estimatedChunks = Math.ceil(fileSize / (5 * 1024 * 1024)) // Estimación basada en 5MB por chunk
      return {
        willChunk: true,
        estimatedChunks,
        message: `Archivo grande detectado. Se procesará automáticamente en ~${estimatedChunks} partes para optimizar el rendimiento.`,
      }
    }
    return {
      willChunk: false,
      estimatedChunks: 1,
      message: "El archivo se procesará en una sola operación.",
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      if (selectedFile.size > MAX_FILE_SIZE) {
        setError(`El archivo es demasiado grande. Máximo permitido: ${formatFileSize(MAX_FILE_SIZE)}`)
        setFile(null)
        return
      }

      if (!selectedFile.name.match(/\.(xlsx|xls)$/i)) {
        setError("Solo se permiten archivos Excel (.xlsx, .xls)")
        setFile(null)
        return
      }

      setFile(selectedFile)
      setError(null)
      setUploadStats(null)
    }
  }

  const handleUpload = async () => {
    if (!file || !selectedAcuerdo) {
      toast.error("Datos incompletos", {
        description: "Por favor selecciona un acuerdo marco y un archivo",
      })
      return
    }

    setUploading(true)
    setProgress(0)
    setError(null)
    setUploadStats(null)

    try {
      setProgress(10)
      const formData = new FormData()
      formData.append("file", file)
      formData.append("acuerdoMarco", selectedAcuerdo)

      const uploadResponse = await fetch("/api/open-data/upload-url", {
        method: "POST",
        body: formData,
      })

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({}))
        throw new Error(errorData.error || `Error del servidor: ${uploadResponse.status}`)
      }

      const uploadResult = await uploadResponse.json()
      setProgress(30)
      console.log(`Archivo subido a Blob: ${uploadResult.url}`)

      const response = await fetch("/api/open-data/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          blobUrl: uploadResult.url,
          fileName: file.name,
          fileSize: file.size,
          acuerdoMarco: selectedAcuerdo,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Error del servidor: ${response.status}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let result: any = null

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split("\n").filter((line) => line.trim())

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6))
                if (data.type === "progress") {
                  setProgress(30 + data.progress * 0.7)
                } else if (data.type === "complete") {
                  result = data
                  setProgress(100)
                }
              } catch (e) {
                console.error("Error parsing SSE data:", e)
              }
            }
          }
        }
      }

      if (result) {
        setUploadStats(result.stats)
        toast.success("¡Archivo procesado exitosamente!", {
          description: `${result.stats.insertedRows} registros insertados para ${selectedAcuerdo.split(" ")[0]}`,
        })
      }
    } catch (error) {
      console.error("Error uploading file:", error)
      const errorMessage = error instanceof Error ? error.message : "Error desconocido"
      setError(errorMessage)

      toast.error("Error al procesar el archivo", {
        description: errorMessage,
      })
    } finally {
      setUploading(false)
      setTimeout(() => setProgress(0), 2000)
    }
  }

  const resetUpload = () => {
    setFile(null)
    setSelectedAcuerdo("")
    setError(null)
    setUploadStats(null)
    setProgress(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const processingInfo = file ? getProcessingInfo(file.size) : null

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/open-data">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200">Cargar Datos de Acuerdo Marco</h1>
          <p className="text-slate-600 dark:text-slate-400">
            Sube archivos Excel con datos de compras públicas organizados por acuerdo marco
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulario de carga */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Subir Archivo Excel
                {file && processingInfo?.willChunk && (
                  <Badge variant="secondary" className="ml-2">
                    <Zap className="h-3 w-3 mr-1" />
                    Procesamiento Inteligente
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Las cabeceras deben estar en la fila 6 del archivo. Se filtrarán automáticamente los registros con
                "Orden Electrónica" terminada en "-0".
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Alerta de procesamiento inteligente */}
              {file && processingInfo?.willChunk && (
                <Alert>
                  <Zap className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Procesamiento Inteligente Activado:</strong> Tu archivo será procesado automáticamente en
                    aproximadamente {processingInfo.estimatedChunks} partes para optimizar el rendimiento.
                  </AlertDescription>
                </Alert>
              )}

              {/* Alerta de límite de tamaño */}
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Límite de archivo:</strong> {formatFileSize(MAX_FILE_SIZE)}. Los archivos grandes se procesan
                  automáticamente en chunks optimizados.
                </AlertDescription>
              </Alert>

              {/* Selección de acuerdo marco */}
              <div className="space-y-2">
                <Label htmlFor="acuerdo">Acuerdo Marco *</Label>
                <Select value={selectedAcuerdo} onValueChange={setSelectedAcuerdo} disabled={uploading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un acuerdo marco" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACUERDOS_MARCO.filter((acuerdo) => acuerdo.status === "active").map((acuerdo) => (
                      <SelectItem key={acuerdo.codigo} value={`${acuerdo.codigo} ${acuerdo.nombre}`}>
                        <div className="flex flex-col">
                          <span className="font-medium">{acuerdo.codigo}</span>
                          <span className="text-sm text-muted-foreground">{acuerdo.nombre}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedAcuerdo && (
                  <div className="text-xs text-muted-foreground">
                    Los datos se organizarán bajo el acuerdo: <strong>{selectedAcuerdo.split(" ")[0]}</strong>
                  </div>
                )}
              </div>

              {/* Selección de archivo */}
              <div className="space-y-2">
                <Label htmlFor="file-upload">Archivo Excel *</Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  ref={fileInputRef}
                  disabled={uploading}
                />
                {file && (
                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileSpreadsheet className="h-8 w-8 text-green-600" />
                      <div>
                        <p className="font-medium">{file.name}</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {processingInfo?.willChunk && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Zap className="h-3 w-3" />~{processingInfo.estimatedChunks} chunks
                        </Badge>
                      )}
                      <Badge variant="outline">
                        {file.size > MAX_FILE_SIZE / 2 ? "Archivo Grande" : "Archivo Normal"}
                      </Badge>
                    </div>
                  </div>
                )}
              </div>

              {/* Información de procesamiento */}
              {processingInfo && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    {processingInfo.message}
                    {processingInfo.willChunk && (
                      <div className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                        💡 El sistema dividirá automáticamente el archivo para optimizar el procesamiento y evitar
                        timeouts
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {/* Barra de progreso */}
              {uploading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>
                      {processingInfo?.willChunk ? "Procesando archivo en chunks..." : "Procesando archivo..."}
                    </span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="w-full" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>
                      Acuerdo: <strong>{selectedAcuerdo.split(" ")[0]}</strong>
                    </span>
                    <span>
                      {processingInfo?.willChunk
                        ? "Procesamiento puede tomar varios minutos"
                        : "Procesamiento en curso..."}
                    </span>
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Botones */}
              <div className="flex gap-2">
                <Button onClick={handleUpload} disabled={!file || !selectedAcuerdo || uploading} className="flex-1">
                  {uploading ? "Procesando..." : "Subir y Procesar Archivo"}
                </Button>
                {(file || uploadStats || selectedAcuerdo) && (
                  <Button variant="outline" onClick={resetUpload} disabled={uploading}>
                    Limpiar
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Panel lateral con información */}
        <div className="space-y-6">
          {/* Información del proceso */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Proceso de Carga</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                <div>
                  <p className="font-medium">Selección de acuerdo</p>
                  <p className="text-muted-foreground">Organiza los datos por acuerdo marco específico</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0" />
                <div>
                  <p className="font-medium">Análisis del archivo</p>
                  <p className="text-muted-foreground">Detección automática de tamaño y estructura</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0" />
                <div>
                  <p className="font-medium">División inteligente</p>
                  <p className="text-muted-foreground">Archivos grandes se dividen automáticamente</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                <div>
                  <p className="font-medium">Inserción y alertas</p>
                  <p className="text-muted-foreground">Procesamiento de datos y alertas de marca</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Acuerdos Marco disponibles */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Acuerdos Marco Disponibles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {ACUERDOS_MARCO.filter((acuerdo) => acuerdo.status === "active").map((acuerdo) => (
                <div
                  key={acuerdo.codigo}
                  className={`p-3 rounded-lg border transition-colors ${
                    selectedAcuerdo === `${acuerdo.codigo} ${acuerdo.nombre}`
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                      : "border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <div className="font-medium text-sm">{acuerdo.codigo}</div>
                  <div className="text-xs text-muted-foreground mt-1">{acuerdo.nombre}</div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Estadísticas de Upload */}
          {uploadStats && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  Procesamiento Completado
                </CardTitle>
                <CardDescription>
                  Acuerdo: <strong>{selectedAcuerdo.split(" ")[0]}</strong>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex justify-between">
                    <span>Filas totales:</span>
                    <Badge variant="outline">{uploadStats.totalRows.toLocaleString()}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Procesadas:</span>
                    <Badge variant="secondary">{uploadStats.processedRows.toLocaleString()}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Insertadas:</span>
                    <Badge variant="default">{uploadStats.insertedRows.toLocaleString()}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Filtradas (-0):</span>
                    <Badge variant="destructive">{uploadStats.filteredRows?.toLocaleString() || 0}</Badge>
                  </div>
                  {uploadStats.brandAlerts > 0 && (
                    <div className="flex justify-between col-span-2">
                      <span>Alertas de marca:</span>
                      <Badge variant="secondary">{uploadStats.brandAlerts}</Badge>
                    </div>
                  )}
                  {uploadStats.chunks > 1 && (
                    <div className="flex justify-between col-span-2">
                      <span>Chunks procesados:</span>
                      <Badge variant="outline" className="bg-purple-50">
                        <Zap className="h-3 w-3 mr-1" />
                        {uploadStats.chunks}
                      </Badge>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Database className="h-3 w-3" />
                    {uploadStats.processingMethod === "chunked" ? "Procesamiento por Chunks" : "Procesamiento Único"}
                  </Badge>
                  <span>{formatFileSize(uploadStats.fileSize)}</span>
                </div>

                {uploadStats.errors.length > 0 && (
                  <div className="space-y-2">
                    <Separator />
                    <div className="text-sm font-medium text-yellow-600">
                      Errores encontrados ({uploadStats.errors.length}):
                    </div>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {uploadStats.errors.slice(0, 5).map((error, index) => (
                        <p key={index} className="text-xs text-muted-foreground bg-muted p-2 rounded">
                          {error}
                        </p>
                      ))}
                      {uploadStats.errors.length > 5 && (
                        <p className="text-xs text-muted-foreground italic">
                          ... y {uploadStats.errors.length - 5} errores más
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Ventajas del procesamiento inteligente */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Procesamiento Inteligente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                • <strong>Organización:</strong> Datos clasificados por acuerdo marco
              </p>
              <p>
                • <strong>Automático:</strong> División inteligente de archivos grandes
              </p>
              <p>
                • <strong>Eficiente:</strong> Procesamiento optimizado por chunks
              </p>
              <p>
                • <strong>Confiable:</strong> Manejo robusto de errores y timeouts
              </p>
              <p>
                • <strong>Límite:</strong> Hasta {formatFileSize(MAX_FILE_SIZE)} por archivo
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
