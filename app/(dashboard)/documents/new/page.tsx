"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { FileText, ArrowLeft, Loader2, X, File } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import Link from "next/link"
import { createNotification } from "@/lib/notifications"

const formSchema = z.object({
  title: z.string().min(3, {
    message: "El título debe tener al menos 3 caracteres.",
  }),
  description: z.string().optional(),
  document_number: z.string().min(1, {
    message: "El número de documento es requerido.",
  }),
  department_id: z.string().min(1, {
    message: "El departamento es requerido.",
  }),
  file: z.any().optional(),
})

export default function NewDocumentPage() {
  const [departments, setDepartments] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingDepartments, setLoadingDepartments] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [attachments, setAttachments] = useState<File[]>([])
  const [uploadingAttachments, setUploadingAttachments] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  const { user } = useAuth()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      document_number: "",
      department_id: "",
    },
  })

  // Cargar departamentos usando useEffect
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        setLoadingDepartments(true)
        const { data, error } = await supabase.from("departments").select("*").order("name")
        if (error) throw error
        setDepartments(data || [])
      } catch (error) {
        console.error("Error fetching departments:", error)
        toast({
          title: "Error",
          description: "No se pudieron cargar los departamentos.",
          variant: "destructive",
        })
      } finally {
        setLoadingDepartments(false)
      }
    }

    fetchDepartments()
  }, [toast])

  const uploadFile = async (file: File): Promise<string | null> => {
    try {
      // Generate a unique filename
      const fileExt = file.name.split(".").pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `documents/${fileName}`

      const { error: uploadError } = await supabase.storage.from("documents").upload(filePath, file)

      if (uploadError) {
        console.error("Upload error:", uploadError)
        throw new Error("Error al subir el archivo: " + uploadError.message)
      }

      // Get the public URL
      const { data: urlData } = supabase.storage.from("documents").getPublicUrl(filePath)
      return urlData.publicUrl
    } catch (error: any) {
      console.error("Error uploading file:", error)
      toast({
        title: "Error al subir archivo",
        description: error.message || "No se pudo subir el archivo",
        variant: "destructive",
      })
      return null
    }
  }

  const handleAttachmentAdd = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files) {
      const newFiles = Array.from(files)
      setAttachments((prev) => [...prev, ...newFiles])
      // Clear the input
      event.target.value = ""
    }
  }

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) {
      toast({
        title: "Error",
        description: "Debes iniciar sesión para crear un documento.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      let fileUrl = null

      // Upload main file if provided
      if (values.file && values.file.length > 0) {
        setUploading(true)
        const file = values.file[0]
        fileUrl = await uploadFile(file)
        if (!fileUrl) {
          setLoading(false)
          setUploading(false)
          return // Error already handled in uploadFile
        }
        setUploading(false)
      }

      console.log("Creating document with data:", {
        title: values.title,
        description: values.description || null,
        document_number: values.document_number,
        status: "pending",
        created_by: user.id,
        current_department_id: values.department_id,
        file_url: fileUrl,
      })

      // Crear documento - USANDO SOLO current_department_id
      const { data: document, error } = await supabase
        .from("documents")
        .insert({
          title: values.title,
          description: values.description || null,
          document_number: values.document_number,
          status: "pending",
          created_by: user.id,
          current_department_id: values.department_id, // SOLO este campo
          file_url: fileUrl,
        })
        .select()
        .single()

      if (error) {
        console.error("Supabase error:", error)
        throw error
      }

      console.log("Document created successfully:", document)

      // Upload attachments if any
      if (attachments.length > 0) {
        setUploadingAttachments(true)
        for (const attachment of attachments) {
          try {
            const attachmentUrl = await uploadFile(attachment)
            if (attachmentUrl) {
              await supabase.from("document_attachments").insert({
                document_id: document.id,
                file_name: attachment.name,
                file_url: attachmentUrl,
                file_size: attachment.size,
                file_type: attachment.type,
                uploaded_by: user.id,
              })
            }
          } catch (attachmentError) {
            console.error("Error uploading attachment:", attachmentError)
            // Continue with other attachments even if one fails
          }
        }
        setUploadingAttachments(false)
      }

      // Crear notificación para el usuario que creó el documento
      try {
        await createNotification({
          userId: user.id,
          title: "Documento creado con éxito",
          message: `Has creado el documento "${values.title}" con número ${values.document_number}`,
          type: "document_created",
          relatedId: document.id,
        })
      } catch (notificationError) {
        console.error("Error creating notification:", notificationError)
        // No fallar la creación del documento por un error de notificación
      }

      // Después de crear el documento y antes del router.push
      // Generar código QR para el documento
      try {
        const { generateDocumentQR } = await import("@/lib/qr-generator")
        const qrCodeDataUrl = await generateDocumentQR(document.id)

        // Actualizar el documento con el código QR
        await supabase.from("documents").update({ qr_code: qrCodeDataUrl }).eq("id", document.id)
      } catch (qrError) {
        console.error("Error generating QR code:", qrError)
        // No fallar la creación del documento por un error de QR
      }

      toast({
        title: "Documento creado",
        description: "El documento se ha creado correctamente.",
      })

      router.push(`/documents/${document.id}`)
    } catch (error: any) {
      console.error("Error creating document:", error)
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el documento.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setUploading(false)
      setUploadingAttachments(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-10 px-6">
      <div className="flex items-center gap-2 mb-6">
        <Button variant="outline" size="icon" asChild>
          <Link href="/documents">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Crear Nuevo Documento</h1>
          <p className="text-muted-foreground">Completa el formulario para crear un nuevo documento</p>
        </div>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Información del Documento
          </CardTitle>
          <CardDescription>
            Ingresa los detalles del nuevo documento que deseas registrar en el sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título</FormLabel>
                      <FormControl>
                        <Input placeholder="Título del documento" {...field} />
                      </FormControl>
                      <FormDescription>Nombre descriptivo del documento.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="document_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número de Documento</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: DOC-2023-001" {...field} />
                      </FormControl>
                      <FormDescription>Identificador único del documento.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="department_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Departamento</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un departamento" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {loadingDepartments ? (
                          <div className="flex items-center justify-center p-4">
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            <span>Cargando departamentos...</span>
                          </div>
                        ) : departments.length === 0 ? (
                          <div className="p-2 text-center text-sm text-muted-foreground">
                            No hay departamentos disponibles
                          </div>
                        ) : (
                          departments.map((department) => (
                            <SelectItem key={department.id} value={department.id}>
                              {department.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormDescription>Departamento al que pertenece el documento.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descripción detallada del documento"
                        className="min-h-[120px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>Información adicional sobre el documento (opcional).</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Archivo Principal */}
              <FormField
                control={form.control}
                name="file"
                render={({ field: { onChange, value, ...field } }) => (
                  <FormItem>
                    <FormLabel>Archivo Principal (Opcional)</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        <Input
                          type="file"
                          accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.xlsx,.xls"
                          onChange={(e) => onChange(e.target.files)}
                          {...field}
                        />
                        {uploading && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Subiendo archivo principal...
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormDescription>
                      Archivo principal del documento (PDF, DOC, DOCX, TXT, JPG, PNG, XLSX, XLS - máximo 10MB)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Archivos Adjuntos */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Archivos Adjuntos (Opcional)</label>
                  <div className="mt-2">
                    <Input
                      type="file"
                      accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.xlsx,.xls"
                      multiple
                      onChange={handleAttachmentAdd}
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Puedes seleccionar múltiples archivos para adjuntar al documento
                    </p>
                  </div>
                </div>

                {attachments.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Archivos seleccionados:</h4>
                    <div className="space-y-2">
                      {attachments.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-2">
                            <File className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium text-sm">{file.name}</div>
                              <div className="text-xs text-muted-foreground">{formatFileSize(file.size)}</div>
                            </div>
                          </div>
                          <Button type="button" variant="outline" size="sm" onClick={() => removeAttachment(index)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    {uploadingAttachments && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Subiendo archivos adjuntos...
                      </div>
                    )}
                  </div>
                )}
              </div>

              <CardFooter className="flex justify-end gap-2 px-0">
                <Button variant="outline" asChild>
                  <Link href="/documents">Cancelar</Link>
                </Button>
                <Button type="submit" disabled={loading || uploading || uploadingAttachments}>
                  {(loading || uploading || uploadingAttachments) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {uploading
                    ? "Subiendo archivo..."
                    : uploadingAttachments
                      ? "Subiendo adjuntos..."
                      : loading
                        ? "Creando documento..."
                        : "Crear Documento"}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
