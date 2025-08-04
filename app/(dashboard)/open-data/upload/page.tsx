"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Upload, FileSpreadsheet, CheckCircle, XCircle, AlertTriangle, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"

const ACUERDOS_MARCO = [
  {
    codigo: "EXT-CE-2024-11",
    nombre: "MOBILIARIO EN GENERAL",
    descripcion: "Acuerdo marco para la adquisición de mobiliario en general",
  },
  {
    codigo: "EXT-CE-2024-16",
    nombre: "ACCESORIOS DOMÉSTICOS Y BIENES PARA USOS DIVERSOS",
    descripcion: "Acuerdo marco para accesorios domésticos y bienes diversos",
  },
  {
    codigo: "EXT-CE-2024-26",
    nombre: "MAQUINAS, EQUIPOS Y HERRAMIENTAS PARA JARDINERIA, SILVICULTURA Y AGRICULTURA",
    descripcion: "Acuerdo marco para maquinaria y equipos agrícolas",
  },
]

interface UploadStats {
  totalRows: number
  processedRows: number
  filteredRows: number
  insertedRows: number
  errors: string[]
}

export default function UploadPage() {
  const [selectedAcuerdo, setSelectedAcuerdo] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [uploadResult, setUploadResult] = useState<{
    success: boolean
    message: string
    stats?: UploadStats
  } | null>(null)
  const { toast } = useToast()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      // Validar que sea un archivo Excel
      const validTypes = [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
      ]

      if (!validTypes.includes(selectedFile.type) && !selectedFile.name.endsWith(".xlsx")) {
        toast({
          title: "Archivo inválido",
          description: "Por favor selecciona un archivo Excel (.xlsx)",
          variant: "destructive",
        })
        return
      }

      setFile(selectedFile)
      setUploadResult(null)
    }
  }

  const handleUpload = async () => {
    if (!file || !selectedAcuerdo) {
      toast({
        title: "Datos incompletos",
        description: "Por favor selecciona un acuerdo marco y un archivo",
        variant: "destructive",
      })
      return
    }

    setUploading(true)
    setProgress(0)
    setUploadResult(null)

    try {
      // Simular progreso
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90))
      }, 500)

      const formData = new FormData()
      formData.append("file", file)
      formData.append("acuerdoMarco", selectedAcuerdo)

      const response = await fetch("/api/open-data/upload", {
        method: "POST",
        body: formData,
      })

      clearInterval(progressInterval)
      setProgress(100)

      const result = await response.json()
      setUploadResult(result)

      if (result.success) {
        toast({
          title: "Carga exitosa",
          description: result.message,
        })
      } else {
        toast({
          title: "Error en la carga",
          description: result.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error uploading file:", error)
      setUploadResult({
        success: false,
        message: "Error de conexión al subir el archivo",
      })
      toast({
        title: "Error de conexión",
        description: "No se pudo conectar con el servidor",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }

  const resetForm = () => {
    setFile(null)
    setSelectedAcuerdo("")
    setUploadResult(null)
    setProgress(0)
    // Reset file input
    const fileInput = document.getElementById("file-upload") as HTMLInputElement
    if (fileInput) fileInput.value = ""
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/open-data">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Cargar Datos de Acuerdo Marco</h1>
          <p className="text-muted-foreground">Sube archivos Excel con datos de compras públicas</p>
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
              </CardTitle>
              <CardDescription>
                Las cabeceras deben estar en la fila 6 del archivo. Se filtrarán automáticamente los registros con
                "Orden Electrónica" terminada en "-0".
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Selección de acuerdo marco */}
              <div className="space-y-2">
                <Label htmlFor="acuerdo">Acuerdo Marco</Label>
                <Select value={selectedAcuerdo} onValueChange={setSelectedAcuerdo} disabled={uploading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un acuerdo marco" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACUERDOS_MARCO.map((acuerdo) => (
                      <SelectItem key={acuerdo.codigo} value={`${acuerdo.codigo} ${acuerdo.nombre}`}>
                        <div className="flex flex-col">
                          <span className="font-medium">{acuerdo.codigo}</span>
                          <span className="text-sm text-muted-foreground">{acuerdo.nombre}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Selección de archivo */}
              <div className="space-y-2">
                <Label htmlFor="file-upload">Archivo Excel</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="file-upload"
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileChange}
                    disabled={uploading}
                    className="flex-1"
                  />
                  {file && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileSpreadsheet className="h-4 w-4" />
                      {file.name}
                    </div>
                  )}
                </div>
              </div>

              {/* Barra de progreso */}
              {uploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Procesando archivo...</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} />
                </div>
              )}

              {/* Botones */}
              <div className="flex gap-2">
                <Button onClick={handleUpload} disabled={!file || !selectedAcuerdo || uploading} className="flex-1">
                  {uploading ? "Procesando..." : "Subir Archivo"}
                </Button>
                {(file || uploadResult) && (
                  <Button variant="outline" onClick={resetForm} disabled={uploading}>
                    Limpiar
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Información y resultados */}
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
                  <p className="font-medium">Lectura del archivo</p>
                  <p className="text-muted-foreground">Las cabeceras se leen desde la fila 6</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0" />
                <div>
                  <p className="font-medium">Filtrado de datos</p>
                  <p className="text-muted-foreground">Se eliminan órdenes terminadas en "-0"</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                <div>
                  <p className="font-medium">Validación e inserción</p>
                  <p className="text-muted-foreground">Se validan y guardan los datos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Resultados de la carga */}
          {uploadResult && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {uploadResult.success ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  Resultado de la Carga
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert variant={uploadResult.success ? "default" : "destructive"}>
                  <AlertDescription>{uploadResult.message}</AlertDescription>
                </Alert>

                {uploadResult.stats && (
                  <div className="space-y-3">
                    <Separator />
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex justify-between">
                        <span>Filas totales:</span>
                        <Badge variant="outline">{uploadResult.stats.totalRows}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Procesadas:</span>
                        <Badge variant="secondary">{uploadResult.stats.processedRows}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Filtradas (-0):</span>
                        <Badge variant="destructive">{uploadResult.stats.filteredRows}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Insertadas:</span>
                        <Badge variant="default">{uploadResult.stats.insertedRows}</Badge>
                      </div>
                    </div>

                    {uploadResult.stats.errors.length > 0 && (
                      <div className="space-y-2">
                        <Separator />
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-yellow-500" />
                          <span className="font-medium text-sm">Errores encontrados:</span>
                        </div>
                        <div className="max-h-32 overflow-y-auto space-y-1">
                          {uploadResult.stats.errors.slice(0, 10).map((error, index) => (
                            <p key={index} className="text-xs text-muted-foreground bg-muted p-2 rounded">
                              {error}
                            </p>
                          ))}
                          {uploadResult.stats.errors.length > 10 && (
                            <p className="text-xs text-muted-foreground italic">
                              ... y {uploadResult.stats.errors.length - 10} errores más
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
