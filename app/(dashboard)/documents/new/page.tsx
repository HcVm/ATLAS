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
import { Checkbox } from "@/components/ui/checkbox"
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
  is_public: z.boolean().default(false),
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
      is_public: false,
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
        is_public: values.is_public,
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
          is_public: values.is_public, // Agregar el campo is_public
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
        description: `El documento se ha creado correctamente${values.is_public ? " y está disponible públicamente" : ""}.`,
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
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto p-3 sm:p-4 lg:p-6">
        {/* Header - Responsive */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
          <Button
            variant="outline"
            size="icon"
            asChild
            className="self-start hover:scale-105 transition-transform duration-300"
          >
            <Link href="/documents">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-green-600 via-emerald-600 to-blue-600 bg-clip-text text-transparent">
              Crear Nuevo Documento
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Completa el formulario para crear un nuevo documento
            </p>
          </div>
        </div>

        {/* Form Card - Responsive */}
        <Card className="shadow-xl border-0 backdrop-blur-sm transition-all duration-300 hover:shadow-2xl">
          <CardHeader className="p-4 sm:p-6 pb-3">
            <CardTitle className="flex flex-col sm:flex-row sm:items-center gap-2 text-lg sm:text-xl">
              <div className="p-2 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg self-start">
                <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <span>Información del Documento</span>
            </CardTitle>
            <CardDescription className="text-sm sm:text-base mt-2">
              Ingresa los detalles del nuevo documento que deseas registrar en el sistema.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-4 sm:p-6 lg:p-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
                {/* Title and Document Number - Responsive Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold text-green-700 dark:text-green-300">
                          Título
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Título del documento"
                            {...field}
                            className="border-green-200 focus:border-green-500 focus:ring-green-500/20 transition-all duration-300"
                          />
                        </FormControl>
                        <FormDescription className="text-xs sm:text-sm">
                          Nombre descriptivo del documento.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="document_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                          Número de Documento
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ej: DOC-2023-001"
                            {...field}
                            className="border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500/20 transition-all duration-300"
                          />
                        </FormControl>
                        <FormDescription className="text-xs sm:text-sm">
                          Identificador único del documento.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Department - Full Width */}
                <FormField
                  control={form.control}
                  name="department_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                        Departamento
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="border-blue-200 focus:border-blue-500 focus:ring-blue-500/20 transition-all duration-300">
                            <SelectValue placeholder="Selecciona un departamento" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {loadingDepartments ? (
                            <div className="flex items-center justify-center p-4">
                              <Loader2 className="h-4 w-4 animate-spin mr-2 text-blue-500" />
                              <span className="text-sm">Cargando departamentos...</span>
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
                      <FormDescription className="text-xs sm:text-sm">
                        Departamento al que pertenece el documento.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Description - Full Width */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-green-700 dark:text-green-300">
                        Descripción
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Descripción detallada del documento"
                          className="min-h-[100px] sm:min-h-[120px] border-green-200 focus:border-green-500 focus:ring-green-500/20 transition-all duration-300 resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="text-xs sm:text-sm">
                        Información adicional sobre el documento (opcional).
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Public Access Checkbox - Responsive */}
                <FormField
                  control={form.control}
                  name="is_public"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border border-emerald-200 bg-gradient-to-r from-emerald-50/50 to-green-50/50 dark:from-emerald-950/20 dark:to-green-950/20 p-3 sm:p-4 transition-all duration-300 hover:shadow-md">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="border-emerald-300 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 mt-1"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none flex-1">
                        <FormLabel className="text-emerald-700 dark:text-emerald-300 font-semibold text-sm sm:text-base">
                          Documento público
                        </FormLabel>
                        <FormDescription className="text-xs sm:text-sm">
                          Permitir acceso público a este documento mediante código QR. El documento será visible para
                          cualquier persona que tenga el enlace.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                {/* Main File Upload - Responsive */}
                <FormField
                  control={form.control}
                  name="file"
                  render={({ field: { onChange, value, ...field } }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                        Archivo Principal (Opcional)
                      </FormLabel>
                      <FormControl>
                        <div className="space-y-2">
                          <Input
                            type="file"
                            accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.xlsx,.xls"
                            onChange={(e) => onChange(e.target.files)}
                            className="border-blue-200 focus:border-blue-500 focus:ring-blue-500/20 transition-all duration-300 text-sm"
                            {...field}
                          />
                          {uploading && (
                            <div className="flex items-center gap-2 text-xs sm:text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 p-2 sm:p-3 rounded-lg">
                              <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
                              <span>Subiendo archivo principal...</span>
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormDescription className="text-xs sm:text-sm">
                        Archivo principal del documento (PDF, DOC, DOCX, TXT, JPG, PNG, XLSX, XLS - máximo 10MB)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Attachments Section - Responsive */}
                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <label className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                      Archivos Adjuntos (Opcional)
                    </label>
                    <div className="mt-2">
                      <Input
                        type="file"
                        accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.xlsx,.xls"
                        multiple
                        onChange={handleAttachmentAdd}
                        className="border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500/20 transition-all duration-300 text-sm"
                      />
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                        Puedes seleccionar múltiples archivos para adjuntar al documento
                      </p>
                    </div>
                  </div>

                  {/* Selected Files List - Responsive */}
                  {attachments.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-green-700 dark:text-green-300">
                        Archivos seleccionados ({attachments.length}):
                      </h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {attachments.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-2 sm:p-3 border border-green-200 rounded-lg bg-gradient-to-r from-green-50/50 to-emerald-50/50 dark:from-green-950/20 dark:to-emerald-950/20 transition-all duration-300 hover:shadow-md"
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <div className="p-1 sm:p-1.5 rounded-md bg-gradient-to-br from-green-500 to-emerald-600 text-white flex-shrink-0">
                                <File className="h-3 w-3 sm:h-4 sm:w-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-xs sm:text-sm truncate">{file.name}</div>
                                <div className="text-xs text-muted-foreground">{formatFileSize(file.size)}</div>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeAttachment(index)}
                              className="hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-all duration-300 h-8 w-8 p-0 flex-shrink-0"
                            >
                              <X className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      {uploadingAttachments && (
                        <div className="flex items-center gap-2 text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 p-2 sm:p-3 rounded-lg">
                          <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
                          <span>Subiendo archivos adjuntos...</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Action Buttons - Responsive */}
                <CardFooter className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 px-0 pt-4 sm:pt-6">
                  <Button
                    variant="outline"
                    asChild
                    className="w-full sm:w-auto hover:scale-105 transition-transform duration-300 order-2 sm:order-1"
                  >
                    <Link href="/documents">Cancelar</Link>
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading || uploading || uploadingAttachments}
                    className="w-full sm:w-auto bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 order-1 sm:order-2"
                  >
                    {(loading || uploading || uploadingAttachments) && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    <span className="hidden sm:inline">
                      {uploading
                        ? "Subiendo archivo..."
                        : uploadingAttachments
                          ? "Subiendo adjuntos..."
                          : loading
                            ? "Creando documento..."
                            : "Crear Documento"}
                    </span>
                    <span className="sm:hidden">
                      {uploading || uploadingAttachments || loading ? "Procesando..." : "Crear"}
                    </span>
                  </Button>
                </CardFooter>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
