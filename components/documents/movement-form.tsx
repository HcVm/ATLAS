"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase"

import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { Upload, X, Paperclip } from "lucide-react"

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

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      notes: "",
    },
  })

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        console.log("Current department ID:", currentDepartmentId) // Debug log

        const { data, error } = await supabase
          .from("departments")
          .select("*")
          .neq("id", currentDepartmentId || "") // Handle undefined case
          .order("name")

        console.log("Departments data:", data) // Debug log
        console.log("Departments error:", error) // Debug log

        if (error) throw error
        setDepartments(data || [])
      } catch (error) {
        console.error("Error fetching departments:", error)
        toast({
          title: "Error",
          description: "No se pudieron cargar los departamentos. Intente nuevamente.",
          variant: "destructive",
        })
      }
    }

    fetchDepartments()
  }, [currentDepartmentId])

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])

    // Validar tamaño de archivos (10MB máximo)
    const validFiles = files.filter((file) => {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "Archivo muy grande",
          description: `El archivo "${file.name}" excede el límite de 10MB.`,
          variant: "destructive",
        })
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
        // Generar nombre único para el archivo
        const fileExt = file.name.split(".").pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
        const filePath = `${user?.id}/${fileName}`

        // Subir archivo a Supabase Storage
        const { error: uploadError } = await supabase.storage.from("document_attachments").upload(filePath, file)

        if (uploadError) {
          console.error("Upload error:", uploadError)
          throw uploadError
        }

        // Obtener URL pública del archivo
        const {
          data: { publicUrl },
        } = supabase.storage.from("document_attachments").getPublicUrl(filePath)

        // Crear registro en la base de datos
        const { error: dbError } = await supabase.from("document_attachments").insert({
          document_id: documentId,
          movement_id: movementId,
          file_name: file.name,
          file_url: publicUrl,
          file_size: file.size,
          file_type: file.type,
          uploaded_by: user?.id,
        })

        if (dbError) {
          console.error("Database error:", dbError)
          throw dbError
        }
      }

      toast({
        title: "Archivos subidos",
        description: `Se subieron ${attachments.length} archivo(s) correctamente.`,
      })
    } catch (error: any) {
      console.error("Error uploading attachments:", error)
      toast({
        title: "Error al subir archivos",
        description: error.message || "Error al subir algunos archivos adjuntos.",
        variant: "destructive",
      })
      throw error // Re-throw para manejar en onSubmit
    } finally {
      setUploadingAttachments(false)
    }
  }

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) {
      toast({
        title: "Error",
        description: "Debe iniciar sesión para realizar esta acción.",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)

      // Create the movement record
      const { data: movementData, error: movementError } = await supabase
        .from("document_movements")
        .insert({
          document_id: documentId,
          from_department_id: currentDepartmentId,
          to_department_id: values.to_department_id,
          moved_by: user.id,
          notes: values.notes || null,
        })
        .select()
        .single()

      if (movementError) {
        console.error("Movement error:", movementError)
        throw movementError
      }

      // Upload attachments if any
      if (attachments.length > 0) {
        await uploadAttachments(movementData.id)
      }

      // Update the document's department
      const { error: documentError } = await supabase
        .from("documents")
        .update({
          department_id: values.to_department_id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", documentId)

      if (documentError) {
        console.error("Document update error:", documentError)
        throw documentError
      }

      toast({
        title: "Documento movido",
        description: `El documento ha sido movido exitosamente${attachments.length > 0 ? ` con ${attachments.length} archivo(s) adjunto(s)` : ""}.`,
      })

      onComplete()
    } catch (error: any) {
      console.error("Error moving document:", error)
      toast({
        title: "Error",
        description: error.message || "No se pudo mover el documento. Intente nuevamente.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="to_department_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Departamento Destino</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione un departamento" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {departments.map((department) => (
                    <SelectItem key={department.id} value={department.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: department.color || "#6B7280" }}
                        />
                        {department.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>Seleccione el departamento al que desea mover este documento.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notas (opcional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Agregue notas o comentarios sobre este movimiento"
                  className="resize-none"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormDescription>Puede agregar notas o comentarios adicionales sobre este movimiento.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Sección de archivos adjuntos */}
        <div className="space-y-4">
          <div>
            <Label>Archivos Adjuntos (opcional)</Label>
            <div className="mt-2">
              <Label htmlFor="attachments" className="cursor-pointer">
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-muted-foreground/50 transition-colors">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Haz clic para seleccionar archivos o arrastra y suelta aquí
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PDF, DOC, DOCX, XLS, XLSX, JPG, PNG (máx. 10MB cada uno)
                  </p>
                </div>
              </Label>
              <Input
                id="attachments"
                type="file"
                multiple
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                onChange={handleFileSelect}
              />
            </div>
          </div>

          {/* Lista de archivos seleccionados */}
          {attachments.length > 0 && (
            <div className="space-y-2">
              <Label>Archivos seleccionados ({attachments.length}):</Label>
              <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-2">
                {attachments.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Paperclip className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate font-medium">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {file.type} • {(file.size / 1024 / 1024).toFixed(1)} MB
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAttachment(index)}
                      className="flex-shrink-0 h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={loading || uploadingAttachments}>
          {loading ? "Moviendo documento..." : uploadingAttachments ? "Subiendo archivos..." : "Mover Documento"}
        </Button>
      </form>
    </Form>
  )
}
