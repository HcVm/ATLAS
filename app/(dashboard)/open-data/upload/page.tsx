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
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, Info, Zap, Database, ArrowLeft, Loader2, RefreshCw } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import * as XLSX from "xlsx"
import { motion, AnimatePresence } from "framer-motion"
import { COLUMN_MAPPING, REQUIRED_COLUMNS, normalizeString, processDataChunk, MAX_ROWS_PER_CHUNK } from "@/lib/open-data-processing"

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
  const [currentAction, setCurrentAction] = useState("")
  const [uploadStats, setUploadStats] = useState<UploadStats | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Ya no hay límite estricto de 5MB, el navegador puede manejar archivos grandes
  // pero ponemos un límite razonable de 100MB para no colgar el navegador
  const MAX_FILE_SIZE = 100 * 1024 * 1024

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      if (selectedFile.size > MAX_FILE_SIZE) {
        setError(`El archivo es demasiado grande. Máximo recomendado: ${formatFileSize(MAX_FILE_SIZE)}`)
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
    setCurrentAction("Analizando archivo...")

    try {
      // 1. Leer archivo en el cliente
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: "array" })
      const sheetName = workbook.SheetNames[0]
      const sheet = workbook.Sheets[sheetName]
      const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null }) as any[][]

      if (!rawData || rawData.length < 7) {
        throw new Error("El archivo no contiene suficientes datos o el formato es incorrecto")
      }

      const headers = rawData[5] as string[]
      const dataRows = rawData.slice(6)
      const totalRows = dataRows.length

      setCurrentAction(`Analizando ${totalRows} filas...`)
      setProgress(10)

      // 2. Mapear columnas (Lógica extraída de processDataChunk)
      const columnIndexes: { [key: string]: number } = {}
      const foundColumns: string[] = []

      Object.entries(COLUMN_MAPPING).forEach(([dbField, possibleNames]) => {
        let found = false
        for (const possibleName of possibleNames) {
          const index = headers.findIndex((h) => {
            if (!h) return false
            const headerName = h.toString().trim()
            const searchName = possibleName.trim()
            if (headerName === searchName) return true
            return normalizeString(headerName) === normalizeString(searchName)
          })
          if (index !== -1) {
            columnIndexes[dbField] = index
            foundColumns.push(dbField)
            found = true
            break
          }
        }
      })

      const missingRequired = REQUIRED_COLUMNS.filter((col) => !(col in columnIndexes))
      if (missingRequired.length > 0) {
        throw new Error(`Faltan columnas críticas: ${missingRequired.join(", ")}`)
      }

      // 3. Resetear acuerdo marco en BD
      setCurrentAction("Limpiando datos anteriores...")
      const codigoAcuerdoMarco = selectedAcuerdo.split(" ")[0].trim()

      const resetRes = await fetch("/api/open-data/reset-acuerdo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigoAcuerdoMarco })
      })

      if (!resetRes.ok) throw new Error("Error al limpiar datos anteriores")
      setProgress(20)

      // 4. Procesar y subir en chunks
      const trimmedAcuerdoMarco = selectedAcuerdo.trim()
      const chunks = []
      for (let i = 0; i < dataRows.length; i += MAX_ROWS_PER_CHUNK) {
        chunks.push(dataRows.slice(i, i + MAX_ROWS_PER_CHUNK))
      }

      let totalInserted = 0
      let totalBrandAlerts = 0
      let totalFiltered = 0
      let totalProcessed = 0
      const allErrors: string[] = []

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i]
        setCurrentAction(`Procesando lote ${i + 1}/${chunks.length}...`)

        // Procesar en cliente
        const chunkResult = await processDataChunk(
          chunk,
          columnIndexes,
          trimmedAcuerdoMarco,
          codigoAcuerdoMarco,
          i
        )

        totalProcessed += chunkResult.processedData.length
        totalFiltered += chunkResult.filteredCount
        allErrors.push(...chunkResult.errors)

        // Subir a API si hay datos
        if (chunkResult.processedData.length > 0) {
          const uploadRes = await fetch("/api/open-data/upload-chunk", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              entries: chunkResult.processedData,
              alerts: chunkResult.brandAlerts
            })
          })

          if (!uploadRes.ok) {
            const errData = await uploadRes.json()
            throw new Error(errData.message || "Error al subir lote")
          }

          const uploadData = await uploadRes.json()
          totalInserted += uploadData.insertedCount
          totalBrandAlerts += uploadData.brandAlertsCount
          if (uploadData.errors) allErrors.push(...uploadData.errors)
        }

        // Actualizar progreso
        // El progreso va del 20% al 100%
        const progressPercent = 20 + ((i + 1) / chunks.length) * 80
        setProgress(progressPercent)

        // Pequeña pausa para no bloquear la UI
        await new Promise(r => setTimeout(r, 10))
      }

      setUploadStats({
        totalRows,
        processedRows: totalProcessed,
        insertedRows: totalInserted,
        filteredRows: totalFiltered,
        chunks: chunks.length,
        brandAlerts: totalBrandAlerts,
        errors: allErrors,
        processingMethod: "client-side-chunking",
        fileSize: file.size,
        fileName: file.name
      })

      toast.success("Carga completada exitosamente")

    } catch (error: any) {
      console.error("Error en carga:", error)
      setError(error.message || "Error desconocido durante la carga")
      toast.error("Error en la carga", { description: error.message })
    } finally {
      setUploading(false)
      setCurrentAction("")
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full p-6 space-y-8 pb-20"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div className="flex items-center gap-4">
          <Link href="/open-data">
            <Button variant="ghost" size="icon" className="hover:bg-slate-100 dark:hover:bg-slate-800">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
              Carga de Datos
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Importación masiva de Acuerdos Marco
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Formulario de carga */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl shadow-sm overflow-hidden">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20">
              <CardTitle className="flex items-center gap-2 text-xl">
                <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                  <Upload className="h-5 w-5" />
                </div>
                Nueva Importación
              </CardTitle>
              <CardDescription>
                Procesamiento local seguro sin límite de tamaño de servidor.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 p-6">

              {/* Selección de acuerdo marco */}
              <div className="space-y-3">
                <Label htmlFor="acuerdo" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Acuerdo Marco
                </Label>
                <Select value={selectedAcuerdo} onValueChange={setSelectedAcuerdo} disabled={uploading}>
                  <SelectTrigger className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 h-12">
                    <SelectValue placeholder="Selecciona el acuerdo destino..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ACUERDOS_MARCO.filter((acuerdo) => acuerdo.status === "active").map((acuerdo) => (
                      <SelectItem key={acuerdo.codigo} value={`${acuerdo.codigo} ${acuerdo.nombre}`}>
                        <div className="flex flex-col py-1">
                          <span className="font-medium text-slate-900 dark:text-slate-100">{acuerdo.codigo}</span>
                          <span className="text-xs text-slate-500">{acuerdo.nombre}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Área de Drag & Drop */}
              <div className="space-y-3">
                <Label htmlFor="file-upload" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Archivo Excel (.xlsx)
                </Label>
                <div
                  className={`relative border-2 border-dashed rounded-xl p-8 transition-all duration-300 flex flex-col items-center justify-center text-center group
                    ${file
                      ? "border-emerald-500/50 bg-emerald-50/30 dark:bg-emerald-900/10"
                      : "border-slate-200 dark:border-slate-700 hover:border-blue-500/50 hover:bg-blue-50/30 dark:hover:bg-blue-900/10"
                    }
                  `}
                >
                  <Input
                    id="file-upload"
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileSelect}
                    ref={fileInputRef}
                    disabled={uploading}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />

                  {file ? (
                    <div className="space-y-3">
                      <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto animate-in zoom-in duration-300">
                        <FileSpreadsheet className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white text-lg">{file.name}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{formatFileSize(file.size)}</p>
                      </div>
                      <Badge variant="outline" className="bg-white dark:bg-slate-950 text-emerald-600 border-emerald-200">
                        Listo para procesar
                      </Badge>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 flex items-center justify-center mx-auto transition-colors duration-300">
                        <Upload className="h-8 w-8 text-slate-400 group-hover:text-blue-500 transition-colors duration-300" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white text-lg">Arrastra tu archivo aquí</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">o haz clic para explorar</p>
                      </div>
                      <p className="text-xs text-slate-400 max-w-xs mx-auto">
                        Soporta archivos grandes gracias al procesamiento por lotes en el navegador.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Progreso */}
              <AnimatePresence>
                {uploading && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800"
                  >
                    <div className="flex items-center justify-between text-sm font-medium">
                      <span className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {currentAction}
                      </span>
                      <span className="text-slate-600 dark:text-slate-400">{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="h-2 w-full" />
                    <p className="text-xs text-slate-500 text-center">
                      Por favor no cierres esta ventana hasta que finalice el proceso.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Error */}
              {error && (
                <Alert variant="destructive" className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/50">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Botones */}
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleUpload}
                  disabled={!file || !selectedAcuerdo || uploading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 h-12 text-base font-medium transition-all hover:scale-[1.02]"
                >
                  {uploading ? "Procesando..." : "Iniciar Carga Segura"}
                </Button>
                {(file || uploadStats || selectedAcuerdo) && (
                  <Button variant="outline" onClick={resetUpload} disabled={uploading} className="h-12 px-6">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Limpiar
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Panel lateral con información */}
        <div className="space-y-6">
          {/* Estadísticas de Upload */}
          <AnimatePresence>
            {uploadStats && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <Card className="border-emerald-200/50 dark:border-emerald-900/50 bg-emerald-50/30 dark:bg-emerald-900/10 backdrop-blur-xl shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-lg">
                      <CheckCircle className="h-5 w-5" />
                      Carga Exitosa
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Filas</p>
                        <p className="font-bold text-lg text-slate-900 dark:text-white">{uploadStats.totalRows.toLocaleString()}</p>
                      </div>
                      <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Insertadas</p>
                        <p className="font-bold text-lg text-emerald-600 dark:text-emerald-400">{uploadStats.insertedRows.toLocaleString()}</p>
                      </div>
                      <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Alertas</p>
                        <p className="font-bold text-lg text-amber-600 dark:text-amber-400">{uploadStats.brandAlerts}</p>
                      </div>
                      <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Tiempo</p>
                        <p className="font-bold text-lg text-blue-600 dark:text-blue-400">~{(uploadStats.chunks * 0.5).toFixed(1)}s</p>
                      </div>
                    </div>

                    {uploadStats.errors.length > 0 && (
                      <div className="space-y-2 pt-2">
                        <Separator className="bg-emerald-200 dark:bg-emerald-800/30" />
                        <div className="text-sm font-medium text-amber-600 dark:text-amber-400 flex items-center gap-2">
                          <AlertCircle className="h-4 w-4" />
                          Advertencias ({uploadStats.errors.length})
                        </div>
                        <div className="max-h-32 overflow-y-auto space-y-1 pr-2 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
                          {uploadStats.errors.slice(0, 10).map((error, index) => (
                            <p key={index} className="text-xs text-slate-600 dark:text-slate-400 bg-white/50 dark:bg-slate-900/50 p-2 rounded border border-slate-100 dark:border-slate-800">
                              {error}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          <Card className="border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Info className="h-5 w-5 text-blue-500" />
                Nueva Tecnología de Carga
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-600 dark:text-slate-400">
              <p>
                Hemos actualizado el sistema de carga para procesar archivos directamente en tu navegador.
              </p>
              <ul className="space-y-2 list-disc pl-4">
                <li>Sin límite de 5MB por archivo.</li>
                <li>Procesamiento más rápido y seguro.</li>
                <li>Validación instantánea de columnas.</li>
                <li>Barra de progreso en tiempo real.</li>
              </ul>
              <div className="pt-2">
                <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
                  Client-Side Processing v2.0
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  )
}
