"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase"
import { motion, AnimatePresence } from "framer-motion"

import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/hooks/use-toast"
import { Upload, X, Paperclip, MoveRight, Loader2, FileText, CheckCircle2 } from "lucide-react"
import { createNotification } from "@/lib/notifications"

const formSchema = z.object({
  to_department_id: z.string({
    required_error: "Por favor seleccione un departamento destino",
  }),
  notes: z.string().optional(),
})

type MovementFormProps = {
  documentId: string
  currentDepartmentId: string
  onComplete: () => void
}

export function MovementForm({ documentId, currentDepartmentId, onComplete }: MovementFormProps) {
  const { user } = useAuth()
  const [departments, setDepartments] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [attachments, setAttachments] = useState<File[]>([])
  const [uploadingAttachments, setUploadingAttachments] = useState(false)
  const [documentCompanyId, setDocumentCompanyId] = useState<string | null>(null)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      notes: "",
    },
  })

  useEffect(() => {
    const fetchDocumentAndDepartments = async () => {
      if (!documentId) return

      try {
        const { data: documentData, error: documentError } = await supabase
          .from("documents")
          .select("company_id, document_number, title")
          .eq("id", documentId)
          .single()

        if (documentError) throw documentError
        setDocumentCompanyId(documentData.company_id)

        const { data: departmentsData, error: departmentsError } = await supabase
          .from("departments")
          .select("*")
          .eq("company_id", documentData.company_id)
          .neq("id", currentDepartmentId)
          .order("name")

        if (departmentsError) throw departmentsError
        setDepartments(departmentsData || [])
      } catch (error) {
        console.error("Error:", error)
        toast({ title: "Error", description: "No se pudo cargar la información.", variant: "destructive" })
      }
    }

    fetchDocumentAndDepartments()
  }, [documentId, currentDepartmentId])

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    const validFiles = files.filter((file) => {
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: "Archivo muy grande", description: `"${file.name}" excede 10MB.`, variant: "destructive" })
        return false
      }
      return true
    })
    setAttachments((prev) => [...prev, ...validFiles])
  }

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  const uploadAttachments = async (movementId: string) => {
    if (attachments.length === 0) return
    setUploadingAttachments(true)
    try {
      for (const file of attachments) {
        const fileExt = file.name.split(".").pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
        const filePath = `${user?.id}/${fileName}`
        const { error: uploadError } = await supabase.storage.from("document_attachments").upload(filePath, file)
        if (uploadError) throw uploadError
        const { data: { publicUrl } } = supabase.storage.from("document_attachments").getPublicUrl(filePath)
        
        await supabase.from("document_attachments").insert({
          document_id: documentId,
          movement_id: movementId,
          file_name: file.name,
          file_url: publicUrl,
          file_size: file.size,
          file_type: file.type,
          uploaded_by: user?.id,
        })
      }
    } catch (error: any) {
      console.error("Error uploading attachments:", error)
      throw error
    } finally {
      setUploadingAttachments(false)
    }
  }

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) return
    try {
      setLoading(true)
      const fromDepartmentId = user.role === "admin" || user.role === "supervisor" ? currentDepartmentId : user.department_id || currentDepartmentId

      const { data: movementData, error: movementError } = await supabase
        .from("document_movements")
        .insert({
          document_id: documentId,
          from_department_id: fromDepartmentId,
          to_department_id: values.to_department_id,
          moved_by: user.id,
          notes: values.notes || null,
        })
        .select()
        .single()

      if (movementError) throw movementError

      if (attachments.length > 0) {
        await uploadAttachments(movementData.id)
      }

      const { data: updatedDocument } = await supabase
        .from("documents")
        .update({ current_department_id: values.to_department_id, updated_at: new Date().toISOString() })
        .eq("id", documentId)
        .select("document_number, title")
        .single()

      // Notifications logic (simplified for brevity but functional)
      try {
         const { data: fromDept } = await supabase.from("departments").select("name").eq("id", fromDepartmentId).single()
         const { data: toDept } = await supabase.from("departments").select("name").eq("id", values.to_department_id).single()
         
         await createNotification({
            userId: user.id,
            title: "Documento Movido",
            message: `Moviste "${updatedDocument?.title}" a ${toDept?.name}.`,
            type: "document_moved",
            relatedId: documentId,
            companyId: documentCompanyId,
         })

         const { data: usersInDest } = await supabase.from("profiles").select("id").eq("department_id", values.to_department_id).eq("company_id", documentCompanyId)
         if (usersInDest) {
            for (const u of usersInDest) {
               if (u.id !== user.id) {
                  await createNotification({
                     userId: u.id,
                     title: "Documento Recibido",
                     message: `"${updatedDocument?.title}" llegó a tu área (${toDept?.name}).`,
                     type: "document_moved",
                     relatedId: documentId,
                     companyId: documentCompanyId,
                  })
               }
            }
         }
      } catch (e) { console.error(e) }

      toast({ title: "¡Éxito!", description: "El documento ha sido movido correctamente." })
      onComplete()
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
           <FormField
             control={form.control}
             name="to_department_id"
             render={({ field }) => (
               <FormItem>
                 <FormLabel className="text-slate-700 dark:text-slate-300 font-semibold">Departamento Destino</FormLabel>
                 <Select onValueChange={field.onChange} defaultValue={field.value}>
                   <FormControl>
                     <SelectTrigger className="h-12 rounded-xl bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
                       <SelectValue placeholder="Seleccionar destino..." />
                     </SelectTrigger>
                   </FormControl>
                   <SelectContent className="rounded-xl">
                     {departments.map((department) => (
                       <SelectItem key={department.id} value={department.id}>
                         <div className="flex items-center gap-2">
                           <div className="w-2 h-2 rounded-full" style={{ backgroundColor: department.color || "#6B7280" }} />
                           {department.name}
                         </div>
                       </SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
                 <FormMessage />
               </FormItem>
             )}
           />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
           <FormField
             control={form.control}
             name="notes"
             render={({ field }) => (
               <FormItem>
                 <FormLabel className="text-slate-700 dark:text-slate-300 font-semibold">Notas del Movimiento</FormLabel>
                 <FormControl>
                   <Textarea
                     placeholder="Instrucciones o comentarios adicionales..."
                     className="resize-none rounded-xl bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500/20"
                     rows={3}
                     {...field}
                   />
                 </FormControl>
                 <FormMessage />
               </FormItem>
             )}
           />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="space-y-4">
          <Label className="text-slate-700 dark:text-slate-300 font-semibold">Adjuntar Archivos (Opcional)</Label>
          
          <div className="relative group">
             <Label htmlFor="movement-attachments" className="cursor-pointer block">
                <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-8 text-center hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-all duration-300 bg-slate-50/50 dark:bg-slate-800/30">
                   <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                      <Upload className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                   </div>
                   <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      Click para subir archivos
                   </p>
                   <p className="text-xs text-slate-500 mt-1">
                      PDF, Imágenes, Office (Max 10MB)
                   </p>
                </div>
             </Label>
             <Input
               id="movement-attachments"
               type="file"
               multiple
               className="hidden"
               onChange={handleFileSelect}
             />
          </div>

          <AnimatePresence>
             {attachments.length > 0 && (
                <motion.div 
                   initial={{ opacity: 0, height: 0 }} 
                   animate={{ opacity: 1, height: "auto" }}
                   exit={{ opacity: 0, height: 0 }}
                   className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar"
                >
                   {attachments.map((file, index) => (
                      <motion.div 
                         key={index} 
                         initial={{ opacity: 0, x: -10 }}
                         animate={{ opacity: 1, x: 0 }}
                         exit={{ opacity: 0, scale: 0.9 }}
                         className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-sm"
                      >
                         <div className="flex items-center gap-3 overflow-hidden">
                            <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
                               <Paperclip className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                            </div>
                            <div className="min-w-0">
                               <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{file.name}</p>
                               <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                         </div>
                         <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeAttachment(index)}
                            className="text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full h-8 w-8"
                         >
                            <X className="h-4 w-4" />
                         </Button>
                      </motion.div>
                   ))}
                </motion.div>
             )}
          </AnimatePresence>
        </motion.div>

        <Button 
           type="submit" 
           disabled={loading || uploadingAttachments} 
           className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20 text-base font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
           {loading || uploadingAttachments ? (
              <>
                 <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                 {uploadingAttachments ? "Subiendo archivos..." : "Procesando..."}
              </>
           ) : (
              <>
                 <MoveRight className="mr-2 h-5 w-5" />
                 Mover Documento
              </>
           )}
        </Button>
      </form>
    </Form>
  )
}
