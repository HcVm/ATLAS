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
import { useCompany } from "@/lib/company-context"

const formSchema = z.object({
  title: z.string().min(3, {
    message: "El título debe tener al menos 3 caracteres.",
  }),
  description: z.string().optional(),
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
  const { selectedCompany } = useCompany()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      department_id: "",
      is_public: false,
    },
  })

  // Cargar departamentos usando useEffect
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        setLoadingDepartments(true)

        // Determine which company to filter by
        let companyToFilter = null

        if (user?.role === "admin") {
          // For admin: use selected company from context
          companyToFilter = selectedCompany?.id || null
        } else {
          // For regular users: use their assigned company
          companyToFilter = user?.company_id || null
        }

        if (!companyToFilter) {
          console.log("No company available for filtering departments")
          setDepartments([])
          return
        }

        const { data, error } = await supabase
          .from("departments")
          .select("*")
          .eq("company_id", companyToFilter)
          .order("name")

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
  }, [toast, user?.company_id, user?.role, selectedCompany?.id])

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

    // Determine which company to use
    let companyToUse = null

    if (user.role === "admin") {
      // For admin: use selected company from context
      companyToUse = selectedCompany?.id || null
    } else {
      // For regular users: use their assigned company
      companyToUse = user.company_id || null
    }

    if (!companyToUse) {
      toast({
        title: "Error",
        description:
          user.role === "admin"
            ? "Debes seleccionar una empresa para crear un documento."
            : "Debes pertenecer a una empresa para crear un documento.",
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
        status: "pending",
        created_by: user.id,
        current_department_id: values.department_id,
        file_url: fileUrl,
        is_public: values.is_public,
        company_id: companyToUse,
      })

      // Crear documento - El número se generará automáticamente por el trigger
      const { data: document, error } = await supabase
        .from("documents")
        .insert({
          title: values.title,
          description: values.description || null,
          // document_number se omite para que el trigger lo genere automáticamente
          status: "pending",
          created_by: user.id,
          company_id: companyToUse, // Use determined company
          current_department_id: values.department_id,
          file_url: fileUrl,
          is_public: values.is_public,
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
          message: `Has creado el documento "${values.title}" con número ${document.document_number}`,
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
        description: `El documento "${document.document_number}" se ha creado correctamente${values.is_public ? " y está disponible públicamente" : ""}.`,
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="max-w-4xl mx-auto p-3 sm:p-4 lg:p-6">
        {/* Header - Responsive */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
          <Button
            variant="outline"
            size="icon"
            asChild
            className="self-start bg-slate-50 border-slate-200 hover:bg-slate-100 hover:scale-105 transition-all duration-300"
          >
            <Link href="/documents">
              <ArrowLeft className="h-4 w-4 text-slate-600" />
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-slate-700 via-slate-600 to-slate-500 bg-clip-text text-transparent">
              Crear Nuevo Documento
            </h1>
            {user?.role === "admin" && (
              <p className="text-sm text-slate-500 mt-1">
                {selectedCompany
                  ? `Creando documento para: ${selectedCompany.name}`
                  : "Selecciona una empresa para crear documentos"}
              </p>
            )}
            <p className="text-sm sm:text-base text-slate-500 mt-1">
              Completa el formulario para crear un nuevo documento. El número se generará automáticamente.
            </p>
          </div>
        </div>

        {/* Form Card - Responsive */}
        <Card className="shadow-xl border-slate-200/50 bg-gradient-to-br from-white to-slate-50/50 backdrop-blur-sm transition-all duration-300 hover:shadow-2xl">
          <CardHeader className="p-4 sm:p-6 pb-3">
            <CardTitle className="flex flex-col sm:flex-row sm:items-center gap-2 text-lg sm:text-xl">
              <div className="p-2 rounded-lg bg-gradient-to-br from-slate-600 to-slate-700 text-white shadow-lg self-start">
                <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <span className="text-slate-800">Información del Documento</span>
            </CardTitle>
            <CardDescription className="text-sm sm:text-base mt-2 text-slate-600">
              Ingresa los detalles del nuevo documento. El número se generará automáticamente con el formato:
              <br />
              <code className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded mt-1 inline-block">
                EMPRESA-DEPARTAMENTO-INICIALES-AÑO-NÚMERO
              </code>
            </CardDescription>
          </CardHeader>

          <CardContent className="p-4 sm:p-6 lg:p-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
                {/* Title - Full Width */}
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-slate-700">Título</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Título del documento"
                          {...field}
                          className="border-slate-200 focus:border-slate-400 focus:ring-slate-400/20 transition-all duration-300"
                        />
                      </FormControl>
                      <FormDescription className="text-xs sm:text-sm text-slate-500">
                        Nombre descriptivo del documento.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Department - Full Width */}
                <FormField
                  control={form.control}
                  name="department_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-slate-700">Departamento</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="border-slate-200 focus:border-slate-400 focus:ring-slate-400/20 transition-all duration-300">
                            <SelectValue placeholder="Selecciona un departamento" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {loadingDepartments ? (
                            <div className="flex items-center justify-center p-4">
                              <Loader2 className="h-4 w-4 animate-spin mr-2 text-slate-600" />
                              <span className="text-sm text-slate-600">Cargando departamentos...</span>
                            </div>
                          ) : departments.length === 0 ? (
                            <div className="p-2 text-center text-sm text-slate-500">
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
                      <FormDescription className="text-xs sm:text-sm text-slate-500">
                        Departamento al que pertenece el documento. Esto afectará la numeración automática.
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
                      <FormLabel className="text-sm font-semibold text-slate-700">Descripción</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Descripción detallada del documento"
                          className="min-h-[100px] sm:min-h-[120px] border-slate-200 focus:border-slate-400 focus:ring-slate-400/20 transition-all duration-300 resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="text-xs sm:text-sm text-slate-500">
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
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border border-slate-200 bg-gradient-to-r from-slate-50/50 to-slate-100/50 p-3 sm:p-4 transition-all duration-300 hover:shadow-md">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="border-slate-300 data-[state=checked]:bg-slate-600 data-[state=checked]:border-slate-600 mt-1"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none flex-1">
                        <FormLabel className="text-slate-700 font-semibold text-sm sm:text-base">
                          Documento público
                        </FormLabel>
                        <FormDescription className="text-xs sm:text-sm text-slate-500">
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
                      <FormLabel className="text-sm font-semibold text-slate-700">
                        Archivo Principal (Opcional)
                      </FormLabel>
                      <FormControl>
                        <div className="space-y-2">
                          <Input
                            type="file"
                            accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.xlsx,.xls"
                            onChange={(e) => onChange(e.target.files)}
                            className="border-slate-200 focus:border-slate-400 focus:ring-slate-400/20 transition-all duration-300 text-sm"
                            {...field}
                          />
                          {uploading && (
                            <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-600 bg-slate-50 p-2 sm:p-3 rounded-lg">
                              <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
                              <span>Subiendo archivo principal...</span>
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormDescription className="text-xs sm:text-sm text-slate-500">
                        Archivo principal del documento (PDF, DOC, DOCX, TXT, JPG, PNG, XLSX, XLS - máximo 10MB)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Attachments Section - Responsive */}
                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <label className="text-sm font-semibold text-slate-700">Archivos Adjuntos (Opcional)</label>
                    <div className="mt-2">
                      <Input
                        type="file"
                        accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.xlsx,.xls"
                        multiple
                        onChange={handleAttachmentAdd}
                        className="border-slate-200 focus:border-slate-400 focus:ring-slate-400/20 transition-all duration-300 text-sm"
                      />
                      <p className="text-xs sm:text-sm text-slate-500 mt-1">
                        Puedes seleccionar múltiples archivos para adjuntar al documento
                      </p>
                    </div>
                  </div>

                  {/* Selected Files List - Responsive */}
                  {attachments.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-slate-700">
                        Archivos seleccionados ({attachments.length}):
                      </h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {attachments.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-2 sm:p-3 border border-slate-200 rounded-lg bg-gradient-to-r from-slate-50/50 to-slate-100/50 transition-all duration-300 hover:shadow-md"
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <div className="p-1 sm:p-1.5 rounded-md bg-gradient-to-br from-slate-600 to-slate-700 text-white flex-shrink-0">
                                <File className="h-3 w-3 sm:h-4 sm:w-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-xs sm:text-sm truncate text-slate-700">
                                  {file.name}
                                </div>
                                <div className="text-xs text-slate-500">{formatFileSize(file.size)}</div>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeAttachment(index)}
                              className="hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-all duration-300 h-8 w-8 p-0 flex-shrink-0 border-slate-200"
                            >
                              <X className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      {uploadingAttachments && (
                        <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-600 bg-slate-50 p-2 sm:p-3 rounded-lg">
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
                    className="w-full sm:w-auto bg-slate-50 border-slate-200 hover:bg-slate-100 hover:scale-105 transition-all duration-300 order-2 sm:order-1"
                  >
                    <Link href="/documents">Cancelar</Link>
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading || uploading || uploadingAttachments}
                    className="w-full sm:w-auto bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 order-1 sm:order-2"
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
