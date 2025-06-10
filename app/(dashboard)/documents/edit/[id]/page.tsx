"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import Link from "next/link"
import { ArrowLeft, Save, FileText, Loader2, Download, Trash2 } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { toast } from "@/components/ui/use-toast"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth"

const formSchema = z.object({
  title: z.string().min(1, "El título es requerido").max(255, "El título es muy largo"),
  description: z.string().optional(),
  document_number: z.string().min(1, "El número de documento es requerido"),
  department_id: z.string().min(1, "Debe seleccionar un departamento"),
  status: z.enum(["pending", "in_progress", "completed", "cancelled"]),
  file: z.any().optional(),
})

// Helper function to validate UUID
const isValidUUID = (str: string) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

export default function EditDocumentPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [document, setDocument] = useState<any>(null)
  const [departments, setDepartments] = useState<any[]>([])
  const [attachments, setAttachments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadingAttachment, setUploadingAttachment] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      document_number: "",
      department_id: "",
      status: "pending",
    },
  })

  useEffect(() => {
    // Validate UUID before making requests
    if (!params.id || typeof params.id !== "string") {
      setError("ID de documento inválido")
      setLoading(false)
      return
    }

    if (!isValidUUID(params.id)) {
      setError("Formato de ID de documento inválido")
      setLoading(false)
      return
    }

    if (user) {
      fetchDocument()
      fetchDepartments()
      fetchAttachments()
    }
  }, [params.id, user])

  const fetchDocument = async () => {
    try {
      const { data, error } = await supabase
        .from("documents")
        .select(`
          *,
          profiles!documents_created_by_fkey (id, full_name, email),
          departments!documents_department_id_fkey (id, name)
        `)
        .eq("id", params.id)
        .single()

      if (error) {
        if (error.code === "PGRST116") {
          setError("Documento no encontrado")
        } else {
          throw error
        }
        return
      }

      // Check if user has permission to edit this document
      if (user?.role !== "admin" && user?.department_id !== data.department_id && data.created_by !== user?.id) {
        setError("No tienes permisos para editar este documento")
        return
      }

      setDocument(data)

      // Update form with document data
      form.reset({
        title: data.title,
        description: data.description || "",
        document_number: data.document_number,
        department_id: data.department_id,
        status: data.status,
      })
    } catch (error: any) {
      console.error("Error fetching document:", error)
      setError("Error al cargar el documento")
    } finally {
      setLoading(false)
    }
  }

  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase.from("departments").select("*").order("name")

      if (error) throw error
      setDepartments(data || [])
    } catch (error) {
      console.error("Error fetching departments:", error)
    }
  }

  const fetchAttachments = async () => {
    try {
      const { data, error } = await supabase
        .from("document_attachments")
        .select(`
          *,
          profiles!document_attachments_uploaded_by_fkey (id, full_name)
        `)
        .eq("document_id", params.id)
        .order("created_at", { ascending: false })

      if (error) throw error
      setAttachments(data || [])
    } catch (error) {
      console.error("Error fetching attachments:", error)
    }
  }

  const uploadFile = async (file: File, isMainFile = false): Promise<string | null> => {
    try {
      if (isMainFile) {
        setUploading(true)
      } else {
        setUploadingAttachment(true)
      }

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
    } finally {
      if (isMainFile) {
        setUploading(false)
      } else {
        setUploadingAttachment(false)
      }
    }
  }

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user || !document) {
      toast({
        title: "Error",
        description: "Debe iniciar sesión para editar un documento",
        variant: "destructive",
      })
      return
    }

    try {
      setSaving(true)

      let fileUrl = document.file_url

      // Upload new file if provided
      if (values.file && values.file.length > 0) {
        const file = values.file[0]
        const newFileUrl = await uploadFile(file, true)
        if (newFileUrl) {
          fileUrl = newFileUrl
        }
      }

      // Update the document
      const { error } = await supabase
        .from("documents")
        .update({
          title: values.title,
          description: values.description || null,
          document_number: values.document_number,
          department_id: values.department_id,
          status: values.status,
          file_url: fileUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", params.id)

      if (error) throw error

      toast({
        title: "Documento actualizado",
        description: "El documento ha sido actualizado exitosamente",
      })

      router.push(`/documents/${params.id}`)
    } catch (error: any) {
      console.error("Error updating document:", error)
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el documento",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleAttachmentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user) return

    try {
      const fileUrl = await uploadFile(file, false)
      if (!fileUrl) return

      // Save attachment to database
      const { error } = await supabase.from("document_attachments").insert({
        document_id: params.id,
        file_name: file.name,
        file_url: fileUrl,
        file_size: file.size,
        file_type: file.type,
        uploaded_by: user.id,
      })

      if (error) throw error

      toast({
        title: "Archivo adjuntado",
        description: "El archivo se ha adjuntado exitosamente",
      })

      // Refresh attachments
      fetchAttachments()

      // Clear the input
      event.target.value = ""
    } catch (error: any) {
      console.error("Error uploading attachment:", error)
      toast({
        title: "Error",
        description: error.message || "No se pudo adjuntar el archivo",
        variant: "destructive",
      })
    }
  }

  const deleteAttachment = async (attachmentId: string) => {
    if (!confirm("¿Está seguro de que desea eliminar este archivo adjunto?")) return

    try {
      const { error } = await supabase.from("document_attachments").delete().eq("id", attachmentId)

      if (error) throw error

      toast({
        title: "Archivo eliminado",
        description: "El archivo adjunto ha sido eliminado",
      })

      fetchAttachments()
    } catch (error: any) {
      console.error("Error deleting attachment:", error)
      toast({
        title: "Error",
        description: "No se pudo eliminar el archivo adjunto",
        variant: "destructive",
      })
    }
  }

  const downloadAttachment = async (attachment: any) => {
    try {
      // Extract the file path from the URL
      let filePath = attachment.file_url
      if (filePath.startsWith("http")) {
        const url = new URL(filePath)
        const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/documents\/(.+)/)
        if (pathMatch && pathMatch[1]) {
          filePath = pathMatch[1]
        }
      }

      // Try to get a signed URL first
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from("documents")
        .createSignedUrl(filePath, 60)

      if (signedUrlData?.signedUrl) {
        window.open(signedUrlData.signedUrl, "_blank")
        return
      }

      // Fallback to direct download
      const { data, error } = await supabase.storage.from("documents").download(filePath)

      if (error) throw error

      const url = URL.createObjectURL(data)
      const a = document.createElement("a")
      a.href = url
      a.download = attachment.file_name
      document.body.appendChild(a)
      a.click()
      URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error: any) {
      console.error("Error downloading attachment:", error)
      toast({
        title: "Error al descargar",
        description: "No se pudo descargar el archivo",
        variant: "destructive",
      })
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            Pendiente
          </Badge>
        )
      case "in_progress":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            En Progreso
          </Badge>
        )
      case "completed":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            Completado
          </Badge>
        )
      case "cancelled":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            Cancelado
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (error || !document) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
            <h3 className="mt-4 text-lg font-medium">{error || "Documento no encontrado"}</h3>
            <p className="text-muted-foreground mt-2">
              {error === "No tienes permisos para editar este documento"
                ? "Este documento pertenece a otro departamento o no tienes permisos de edición."
                : "El documento que buscas no existe o ha sido eliminado."}
            </p>
            <Button asChild className="mt-4">
              <Link href="/documents">Volver a Documentos</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href={`/documents/${params.id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Editar Documento</h1>
          <p className="text-muted-foreground">Documento #{document.document_number}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Información del Documento
              </CardTitle>
              <CardDescription>Edite los detalles del documento</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Título del Documento</FormLabel>
                        <FormControl>
                          <Input placeholder="Ingrese el título del documento" {...field} />
                        </FormControl>
                        <FormDescription>Un título descriptivo para identificar el documento</FormDescription>
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
                          <Input placeholder="Ej: DOC-2024-001" {...field} />
                        </FormControl>
                        <FormDescription>Número único de identificación del documento</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="department_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Departamento</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccione un departamento" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {departments.map((department) => (
                                <SelectItem key={department.id} value={department.id}>
                                  {department.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>Departamento al que pertenece el documento</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estado</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccione un estado" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="pending">Pendiente</SelectItem>
                              <SelectItem value="in_progress">En Progreso</SelectItem>
                              <SelectItem value="completed">Completado</SelectItem>
                              <SelectItem value="cancelled">Cancelado</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>Estado actual del documento</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descripción (Opcional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Descripción detallada del documento"
                            className="resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>Información adicional sobre el documento</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="file"
                    render={({ field: { onChange, value, ...field } }) => (
                      <FormItem>
                        <FormLabel>Reemplazar Archivo Principal (Opcional)</FormLabel>
                        <FormControl>
                          <Input
                            type="file"
                            accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                            onChange={(e) => onChange(e.target.files)}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Seleccione un nuevo archivo para reemplazar el actual (PDF, DOC, DOCX, TXT, JPG, PNG - máximo
                          10MB)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-4">
                    <Button type="button" variant="outline" asChild>
                      <Link href={`/documents/${params.id}`}>Cancelar</Link>
                    </Button>
                    <Button type="submit" disabled={saving || uploading}>
                      {saving || uploading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {uploading ? "Subiendo archivo..." : "Guardando cambios..."}
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Guardar Cambios
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Archivos Adjuntos</CardTitle>
              <CardDescription>Archivos secundarios asociados al documento</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Adjuntar Nuevo Archivo</label>
                  <Input
                    type="file"
                    accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.xlsx,.xls"
                    onChange={handleAttachmentUpload}
                    disabled={uploadingAttachment}
                    className="mt-2"
                  />
                  {uploadingAttachment && (
                    <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Subiendo archivo...
                    </div>
                  )}
                </div>

                <Separator />

                {attachments.length === 0 ? (
                  <div className="text-center py-6">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
                    <h3 className="mt-4 text-lg font-medium">Sin archivos adjuntos</h3>
                    <p className="text-muted-foreground">No hay archivos secundarios adjuntos a este documento.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {attachments.map((attachment) => (
                      <div key={attachment.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium">{attachment.file_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {formatFileSize(attachment.file_size)} • Subido por {attachment.profiles?.full_name} •
                            {format(new Date(attachment.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => downloadAttachment(attachment)}>
                            <Download className="h-4 w-4" />
                          </Button>
                          {(user?.role === "admin" || attachment.uploaded_by === user?.id) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteAttachment(attachment.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Estado Actual</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Estado</label>
                  <div className="mt-1">{getStatusBadge(document.status)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Creado por</label>
                  <p className="mt-1">{document.profiles?.full_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Fecha de creación</label>
                  <p className="mt-1">{format(new Date(document.created_at), "PPP", { locale: es })}</p>
                </div>
                {document.updated_at !== document.created_at && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Última actualización</label>
                    <p className="mt-1">{format(new Date(document.updated_at), "PPP", { locale: es })}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Acciones Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full justify-start" variant="outline" asChild>
                <Link href={`/documents/${params.id}`}>
                  <FileText className="h-4 w-4 mr-2" />
                  Ver Detalles Completos
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
