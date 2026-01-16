"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { FileText, ArrowLeft, Loader2, X, File, UploadCloud, Info, CheckCircle2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

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
import { cn } from "@/lib/utils"

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

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" }
  }
}

const formItemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 0.3 }
  }
}

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
        let companyToFilter = null

        if (user?.role === "admin") {
          companyToFilter = selectedCompany?.id || null
        } else {
          companyToFilter = user?.company_id || null
        }

        if (!companyToFilter) {
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
      const fileExt = file.name.split(".").pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `documents/${fileName}`

      const { error: uploadError } = await supabase.storage.from("documents").upload(filePath, file)

      if (uploadError) {
        throw new Error("Error al subir el archivo: " + uploadError.message)
      }

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
    if (loading || uploading || uploadingAttachments) return

    if (!user) {
      toast({ title: "Error", description: "Debes iniciar sesión.", variant: "destructive" })
      return
    }

    let companyToUse = user.role === "admin" ? selectedCompany?.id : user.company_id
    if (!companyToUse) {
      toast({ title: "Error", description: "Falta empresa.", variant: "destructive" })
      return
    }

    setLoading(true)
    try {
      let fileUrl = null

      if (values.file && values.file.length > 0) {
        setUploading(true)
        const file = values.file[0]
        fileUrl = await uploadFile(file)
        if (!fileUrl) {
          setLoading(false)
          setUploading(false)
          return
        }
        setUploading(false)
      }

      const { data: documentNumber, error: rpcError } = await supabase.rpc("generate_document_number", {
        p_company_id: companyToUse,
        p_department_id: values.department_id,
        p_user_id: user.id,
      })

      if (rpcError) throw new Error("Error al generar el número de documento: " + rpcError.message)

      const trackingHash = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)

      const { data: document, error } = await supabase
        .from("documents")
        .insert({
          title: values.title,
          description: values.description || null,
          document_number: documentNumber,
          status: "pending",
          created_by: user.id,
          company_id: companyToUse,
          current_department_id: values.department_id,
          file_url: fileUrl,
          is_public: values.is_public,
          tracking_hash: trackingHash,
        })
        .select()
        .single()

      if (error) throw error

      try {
        await supabase.from("document_movements").insert({
          document_id: document.id,
          from_department_id: values.department_id,
          to_department_id: values.department_id,
          moved_by: user.id,
          notes: "Documento creado",
        })
      } catch (e) { console.error(e) }

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
          } catch (e) { console.error(e) }
        }
        setUploadingAttachments(false)
      }

      try {
        await createNotification({
          userId: user.id,
          title: "Documento creado",
          message: `Has creado el documento "${values.title}" (${document.document_number})`,
          type: "document_created",
          relatedId: document.id,
          companyId: companyToUse,
        })
      } catch (e) { console.error(e) }

      // Notificar al departamento destino
      try {
         const { data: departmentData } = await supabase.from("departments").select("name").eq("id", values.department_id).single()
         const departmentName = departmentData?.name || "un departamento"
         const { data: usersInDepartment } = await supabase.from("profiles").select("id").eq("department_id", values.department_id).eq("company_id", companyToUse)
         
         if (usersInDepartment) {
            for (const deptUser of usersInDepartment) {
               if (deptUser.id !== user.id) {
                  await createNotification({
                     userId: deptUser.id,
                     title: "Nuevo Documento Recibido",
                     message: `Se ha creado un nuevo documento "${values.title}" en tu departamento (${departmentName}).`,
                     type: "document_created",
                     relatedId: document.id,
                     companyId: companyToUse,
                  })
               }
            }
         }
      } catch (e) { console.error(e) }

      try {
        const { generateDocumentQR } = await import("@/lib/qr-generator")
        const qrCodeDataUrl = await generateDocumentQR(document.id)
        await supabase.from("documents").update({ qr_code: qrCodeDataUrl }).eq("id", document.id)
      } catch (e) { console.error(e) }

      toast({
        title: "¡Éxito!",
        description: `Documento ${document.document_number} creado correctamente.`,
      })

      router.push(`/documents/${document.id}`)
    } catch (error: any) {
      console.error(error)
      toast({ title: "Error", description: error.message || "Error al crear el documento.", variant: "destructive" })
    } finally {
      setLoading(false)
      setUploading(false)
      setUploadingAttachments(false)
    }
  }

  return (
    <motion.div 
      initial="hidden" 
      animate="visible" 
      variants={containerVariants}
      className="min-h-[calc(100vh-4rem)] p-4 sm:p-6 lg:p-8 flex justify-center items-start"
    >
      <div className="w-full max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            asChild
            className="rounded-xl h-10 w-10 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm transition-all hover:-translate-x-1"
          >
            <Link href="/documents">
              <ArrowLeft className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-slate-900 via-slate-700 to-slate-600 dark:from-white dark:via-slate-200 dark:to-slate-400 bg-clip-text text-transparent">
              Nuevo Documento
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              {user?.role === "admin" && selectedCompany
                ? `Registrando para: ${selectedCompany.name}`
                : "Completa la información para registrar un nuevo documento"}
            </p>
          </div>
        </div>

        {/* Form Card */}
        <Card className="border-none shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl overflow-hidden">
          <CardHeader className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 p-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-slate-800 dark:text-slate-100">Información General</CardTitle>
                <CardDescription>
                  El número de documento se generará automáticamente al guardar.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-6 lg:p-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Título */}
                  <motion.div variants={formItemVariants} className="md:col-span-2">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-700 dark:text-slate-300 font-semibold">Título del Documento</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ej: Informe de Gestión 2024"
                              className="h-11 rounded-xl bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </motion.div>

                  {/* Departamento */}
                  <motion.div variants={formItemVariants}>
                    <FormField
                      control={form.control}
                      name="department_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-700 dark:text-slate-300 font-semibold">Departamento Destino</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-11 rounded-xl bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
                                <SelectValue placeholder="Seleccionar..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="rounded-xl">
                              {loadingDepartments ? (
                                <div className="flex items-center justify-center p-4 text-sm text-slate-500">
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cargando...
                                </div>
                              ) : departments.length === 0 ? (
                                <div className="p-4 text-sm text-slate-500 text-center">No hay departamentos</div>
                              ) : (
                                departments.map((dept) => (
                                  <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </motion.div>

                  {/* Visibilidad */}
                  <motion.div variants={formItemVariants}>
                     <FormField
                      control={form.control}
                      name="is_public"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-700 dark:text-slate-300 font-semibold">Visibilidad</FormLabel>
                          <div className="flex flex-row items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 px-3 bg-slate-50 dark:bg-slate-800/50 h-11">
                            <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                              Acceso Público
                            </span>
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                className="data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                              />
                            </FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </motion.div>

                  {/* Descripción */}
                  <motion.div variants={formItemVariants} className="md:col-span-2">
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-700 dark:text-slate-300 font-semibold">Descripción</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Detalles adicionales sobre el documento..."
                              className="min-h-[120px] rounded-xl bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 resize-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </motion.div>
                </div>

                <div className="h-px bg-slate-100 dark:bg-slate-800 my-6" />

                {/* Archivos */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2 mb-4">
                     <UploadCloud className="h-5 w-5 text-indigo-500" />
                     <h3 className="font-semibold text-slate-800 dark:text-slate-100">Archivos Adjuntos</h3>
                  </div>

                  {/* Archivo Principal */}
                  <motion.div variants={formItemVariants}>
                    <FormField
                      control={form.control}
                      name="file"
                      render={({ field: { onChange, value, ...field } }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-slate-600 dark:text-slate-400">Archivo Principal</FormLabel>
                          <FormControl>
                             <div className="relative group">
                                <Input
                                  type="file"
                                  className="h-14 pt-3 cursor-pointer file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-900/30 dark:file:text-indigo-300 transition-all bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 rounded-xl"
                                  onChange={(e) => onChange(e.target.files)}
                                  {...field}
                                />
                             </div>
                          </FormControl>
                          <FormDescription>Formato recomendado: PDF. Máx 10MB.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </motion.div>

                  {/* Otros Adjuntos */}
                  <motion.div variants={formItemVariants}>
                     <div className="space-y-3">
                        <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Archivos Adicionales</label>
                        <Input
                          type="file"
                          multiple
                          className="h-14 pt-3 cursor-pointer file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 dark:file:bg-slate-800 dark:file:text-slate-300 transition-all bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 rounded-xl"
                          onChange={handleAttachmentAdd}
                        />
                     </div>

                     {/* Lista de adjuntos */}
                     <AnimatePresence>
                        {attachments.length > 0 && (
                           <motion.div 
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mt-4 grid gap-2"
                           >
                              {attachments.map((file, index) => (
                                 <motion.div
                                    key={index}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800"
                                 >
                                    <div className="flex items-center gap-3 overflow-hidden">
                                       <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600">
                                          <File className="h-4 w-4" />
                                       </div>
                                       <div className="min-w-0">
                                          <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{file.name}</p>
                                          <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
                                       </div>
                                    </div>
                                    <Button
                                       type="button"
                                       variant="ghost"
                                       size="icon"
                                       onClick={() => removeAttachment(index)}
                                       className="text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full"
                                    >
                                       <X className="h-4 w-4" />
                                    </Button>
                                 </motion.div>
                              ))}
                           </motion.div>
                        )}
                     </AnimatePresence>
                  </motion.div>
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100 dark:border-slate-800">
                  <Button
                    variant="ghost"
                    type="button"
                    asChild
                    className="rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  >
                    <Link href="/documents">Cancelar</Link>
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading || uploading || uploadingAttachments}
                    className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20 min-w-[140px]"
                  >
                    {loading || uploading || uploadingAttachments ? (
                      <>
                         <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                         <span>Procesando...</span>
                      </>
                    ) : (
                      <>
                         <CheckCircle2 className="mr-2 h-4 w-4" />
                         <span>Crear Documento</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  )
}
