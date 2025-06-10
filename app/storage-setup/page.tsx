"use client"

import type React from "react"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, XCircle, AlertTriangle, Info, Database, FileUp } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function StorageSetupPage() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [bucketStatus, setBucketStatus] = useState<any[]>([])
  const [testFile, setTestFile] = useState<File | null>(null)
  const [testResult, setTestResult] = useState<string | null>(null)
  const [bucketName, setBucketName] = useState("news-images")

  const checkBuckets = async () => {
    setLoading(true)
    setMessage("")
    setError("")
    setBucketStatus([])
    setTestResult(null)

    try {
      const { data: buckets, error: listError } = await supabase.storage.listBuckets()

      if (listError) {
        throw new Error(`Error al listar buckets: ${listError.message}`)
      }

      let statusMessage = "📊 Estado de los buckets de almacenamiento:\n\n"

      if (buckets && buckets.length > 0) {
        statusMessage += "Buckets encontrados:\n"
        buckets.forEach((bucket) => {
          statusMessage += `- ${bucket.name} (${bucket.public ? "público" : "privado"})\n`
        })
        setBucketStatus(buckets)
      } else {
        statusMessage += "No se encontraron buckets.\n"
        setBucketStatus([])
      }

      const commonBuckets = ["images", "news-images", "public", "media"]
      const availableBuckets = buckets?.filter((bucket) => commonBuckets.includes(bucket.name)) || []

      if (availableBuckets.length > 0) {
        statusMessage += `\n✅ Buckets disponibles para imágenes: ${availableBuckets.map((b) => b.name).join(", ")}`
      } else {
        statusMessage += "\n⚠️ No se encontraron buckets comunes para imágenes."
      }

      setMessage(statusMessage)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const testUploadToExistingBuckets = async () => {
    setLoading(true)
    setMessage("")
    setError("")
    setTestResult(null)

    try {
      const { data: buckets } = await supabase.storage.listBuckets()
      const testBuckets = buckets?.filter((bucket) => bucket.public) || []

      if (testBuckets.length === 0) {
        throw new Error("No se encontraron buckets públicos para probar.")
      }

      const results = []
      let successfulBucket = null

      for (const bucket of testBuckets) {
        try {
          // Crear un archivo de prueba
          const testContent = "test image content"
          const testFile = new Blob([testContent], { type: "text/plain" })
          const fileName = `test/test-${Date.now()}.txt`

          const { error: uploadError } = await supabase.storage.from(bucket.name).upload(fileName, testFile)

          if (uploadError) {
            results.push(`❌ Bucket ${bucket.name}: ${uploadError.message}`)
          } else {
            // Eliminar el archivo de prueba
            await supabase.storage.from(bucket.name).remove([fileName])
            results.push(`✅ Bucket ${bucket.name}: Subida exitosa`)
            successfulBucket = bucket.name
          }
        } catch (error: any) {
          results.push(`❌ Bucket ${bucket.name}: ${error.message}`)
        }
      }

      setTestResult(results.join("\n"))

      if (successfulBucket) {
        setMessage(
          `✅ Prueba de subida exitosa en el bucket '${successfulBucket}'. El almacenamiento está funcionando.`,
        )
      } else {
        setError("No se pudo subir archivos a ningún bucket disponible.")
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const createBucket = async () => {
    setLoading(true)
    setMessage("")
    setError("")
    setTestResult(null)

    try {
      if (!bucketName.trim()) {
        throw new Error("Por favor ingresa un nombre para el bucket")
      }

      const { error } = await supabase.storage.createBucket(bucketName, {
        public: true,
      })

      if (error) {
        if (error.message.includes("already exists")) {
          setMessage(`El bucket "${bucketName}" ya existe. Puedes usarlo para subir imágenes.`)
        } else {
          throw error
        }
      } else {
        setMessage(`✅ Bucket "${bucketName}" creado exitosamente. Ya puedes subir imágenes.`)

        // Actualizar la lista de buckets
        checkBuckets()
      }
    } catch (err: any) {
      setError(`Error al crear bucket: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const createDocumentsBucket = async () => {
    setLoading(true)
    setMessage("")
    setError("")
    setTestResult(null)

    try {
      const { error } = await supabase.storage.createBucket("documents", {
        public: false, // Los documentos no deben ser públicos por defecto
      })

      if (error) {
        if (error.message.includes("already exists")) {
          setMessage(`El bucket "documents" ya existe. Ya puedes subir archivos de documentos.`)
        } else {
          throw error
        }
      } else {
        setMessage(`✅ Bucket "documents" creado exitosamente. Ya puedes subir archivos de documentos.`)

        // Actualizar la lista de buckets
        checkBuckets()
      }
    } catch (err: any) {
      setError(`Error al crear bucket de documentos: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setTestFile(e.target.files[0])
    }
  }

  const testUploadFile = async () => {
    if (!testFile) {
      setError("Por favor selecciona un archivo para probar")
      return
    }

    setLoading(true)
    setMessage("")
    setError("")
    setTestResult(null)

    try {
      const { data: buckets } = await supabase.storage.listBuckets()

      if (!buckets || buckets.length === 0) {
        throw new Error("No hay buckets disponibles. Crea uno primero.")
      }

      const results = []
      let successfulBucket = null

      for (const bucket of buckets) {
        try {
          const fileName = `test/${testFile.name}`

          const { error: uploadError } = await supabase.storage
            .from(bucket.name)
            .upload(fileName, testFile, { upsert: true })

          if (uploadError) {
            results.push(`❌ Bucket ${bucket.name}: ${uploadError.message}`)
          } else {
            // Obtener URL pública
            const { data: urlData } = supabase.storage.from(bucket.name).getPublicUrl(fileName)
            results.push(`✅ Bucket ${bucket.name}: Subida exitosa - ${urlData.publicUrl}`)
            successfulBucket = bucket.name
          }
        } catch (error: any) {
          results.push(`❌ Bucket ${bucket.name}: ${error.message}`)
        }
      }

      setTestResult(results.join("\n"))

      if (successfulBucket) {
        setMessage(
          `✅ Archivo subido exitosamente al bucket '${successfulBucket}'. El almacenamiento está funcionando.`,
        )
      } else {
        setError("No se pudo subir el archivo a ningún bucket disponible.")
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const createNewsWithoutImage = () => {
    window.location.href = "/news/create"
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Configuración de Almacenamiento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription className="whitespace-pre-line">{error}</AlertDescription>
            </Alert>
          )}

          {message && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="whitespace-pre-line">{message}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Verificar Buckets</h3>
              <Button onClick={checkBuckets} disabled={loading} variant="outline" className="w-full">
                {loading ? "Verificando..." : "Verificar Estado de Buckets"}
              </Button>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Probar Subida</h3>
              <Button onClick={testUploadToExistingBuckets} disabled={loading} variant="secondary" className="w-full">
                {loading ? "Probando..." : "Probar Subida de Archivo"}
              </Button>
            </div>
          </div>

          {bucketStatus.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Estado de Buckets</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {bucketStatus.map((bucket) => (
                  <div key={bucket.name} className="flex items-center space-x-2 p-2 border rounded">
                    {bucket.public ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    )}
                    <span className="text-sm">
                      {bucket.name} ({bucket.public ? "público" : "privado"})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-4 border-t">
            <h3 className="text-lg font-semibold mb-2">Buckets Específicos</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button onClick={createDocumentsBucket} disabled={loading} variant="secondary" className="w-full">
                {loading ? "Creando..." : "Crear Bucket para Documentos"}
              </Button>
              <Button
                onClick={() => setBucketName("news-images")}
                disabled={loading}
                variant="outline"
                className="w-full"
              >
                Configurar para Noticias
              </Button>
            </div>
            <Alert className="mt-2">
              <Database className="h-4 w-4" />
              <AlertDescription className="text-sm">
                El bucket "documents" será privado por seguridad. El bucket "news-images" será público para mostrar
                imágenes.
              </AlertDescription>
            </Alert>
          </div>

          <div className="pt-4 border-t">
            <h3 className="text-lg font-semibold mb-2">Crear Nuevo Bucket</h3>
            <div className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="bucketName">Nombre del Bucket</Label>
                  <Input
                    id="bucketName"
                    value={bucketName}
                    onChange={(e) => setBucketName(e.target.value)}
                    placeholder="news-images"
                    disabled={loading}
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={createBucket} disabled={loading} className="mb-0">
                    {loading ? "Creando..." : "Crear Bucket"}
                  </Button>
                </div>
              </div>
              <Alert>
                <Database className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  Crea un bucket público para almacenar imágenes. Nombres recomendados: "images", "news-images", "media"
                </AlertDescription>
              </Alert>
            </div>
          </div>

          <div className="pt-4 border-t">
            <h3 className="text-lg font-semibold mb-2">Probar con Archivo Real</h3>
            <div className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="testFile">Seleccionar Archivo</Label>
                  <Input id="testFile" type="file" onChange={handleFileChange} disabled={loading} />
                </div>
                <div className="flex items-end">
                  <Button onClick={testUploadFile} disabled={loading || !testFile} className="mb-0" variant="secondary">
                    <FileUp className="h-4 w-4 mr-2" />
                    Probar
                  </Button>
                </div>
              </div>
              {testResult && (
                <Alert>
                  <AlertDescription>
                    <details open>
                      <summary className="cursor-pointer font-medium">Resultados de la prueba</summary>
                      <pre className="mt-2 text-xs whitespace-pre-wrap">{testResult}</pre>
                    </details>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>

          <div className="pt-4 border-t">
            <h3 className="text-lg font-semibold mb-2">Alternativas</h3>
            <div className="space-y-2">
              <Button onClick={createNewsWithoutImage} variant="outline" className="w-full">
                Crear Noticia Sin Imagen
              </Button>
              <Button onClick={() => (window.location.href = "/news")} variant="outline" className="w-full">
                Ver Noticias Existentes
              </Button>
            </div>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Nota:</strong> El sistema ahora puede funcionar sin configuración especial de almacenamiento. Si
              no se puede subir una imagen, la noticia se creará sin imagen y se mostrará una advertencia.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  )
}
