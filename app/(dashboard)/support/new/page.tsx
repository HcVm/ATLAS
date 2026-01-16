"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Upload, X, Ticket, HelpCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import Link from "next/link"
import { motion } from "framer-motion"

interface AttachmentFile {
  file: File
  preview?: string
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4 },
  },
}

export default function NewSupportTicketPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium",
    category: "other",
  })
  const [attachments, setAttachments] = useState<AttachmentFile[]>([])

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])

    files.forEach((file) => {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`El archivo ${file.name} es demasiado grande (máximo 10MB)`)
        return
      }

      const newAttachment: AttachmentFile = { file }

      if (file.type.startsWith("image/")) {
        const reader = new FileReader()
        reader.onload = (e) => {
          newAttachment.preview = e.target?.result as string
          setAttachments((prev) => [...prev, newAttachment])
        }
        reader.readAsDataURL(file)
      } else {
        setAttachments((prev) => [...prev, newAttachment])
      }
    })

    event.target.value = ""
  }

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  const uploadAttachments = async (ticketId: string) => {
    const uploadPromises = attachments.map(async (attachment) => {
      const fileExt = attachment.file.name.split(".").pop()
      const fileName = `${ticketId}/${Date.now()}.${fileExt}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("support-attachments")
        .upload(fileName, attachment.file)

      if (uploadError) {
        console.error("Error uploading file:", uploadError)
        throw uploadError
      }

      const { data: urlData } = supabase.storage.from("support-attachments").getPublicUrl(fileName)

      const { error: dbError } = await supabase.from("support_attachments").insert({
        ticket_id: ticketId,
        file_name: attachment.file.name,
        file_url: urlData.publicUrl,
        file_size: attachment.file.size,
        file_type: attachment.file.type,
        uploaded_by: user?.id,
      })

      if (dbError) {
        console.error("Error saving attachment to database:", dbError)
        throw dbError
      }
    })

    await Promise.all(uploadPromises)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      toast.error("Debes estar autenticado")
      return
    }

    if (!formData.title.trim() || !formData.description.trim()) {
      toast.error("El título y la descripción son requeridos")
      return
    }

    try {
      setLoading(true)

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single()

      if (profileError || !profile?.company_id) {
        console.error("Error getting user profile:", profileError)
        toast.error("No se pudo determinar tu empresa")
        return
      }

      console.log("Creating ticket with data:", {
        title: formData.title.trim(),
        description: formData.description.trim(),
        priority: formData.priority,
        category: formData.category,
        created_by: user.id,
        company_id: profile.company_id,
        status: "open",
      })

      const { data: ticket, error: ticketError } = await supabase
        .from("support_tickets")
        .insert({
          title: formData.title.trim(),
          description: formData.description.trim(),
          priority: formData.priority,
          category: formData.category,
          created_by: user.id,
          company_id: profile.company_id,
          status: "open",
        })
        .select()
        .single()

      if (ticketError) {
        console.error("Error creating ticket:", ticketError)
        toast.error(`Error al crear el ticket: ${ticketError.message}`)
        return
      }

      if (attachments.length > 0) {
        try {
          await uploadAttachments(ticket.id)
        } catch (attachmentError) {
          toast.error("Ticket creado, pero hubo un error al subir algunos adjuntos")
        }
      }

      toast.success(`Ticket ${ticket.ticket_number} creado exitosamente`)
      router.push(`/support/${ticket.id}`)
    } catch (error) {
      toast.error("Error al crear el ticket")
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="container mx-auto p-6 max-w-4xl min-h-[calc(100vh-4rem)]"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <Button variant="ghost" size="sm" asChild className="pl-0 hover:bg-transparent hover:text-blue-600 dark:hover:text-blue-400 mb-2">
            <Link href="/support">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a Soporte
            </Link>
          </Button>
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-slate-900 via-slate-700 to-slate-600 dark:from-white dark:via-slate-200 dark:to-slate-400 bg-clip-text text-transparent flex items-center gap-3">
            <Ticket className="h-8 w-8 text-blue-600" />
            Nuevo Ticket
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Describe tu problema o solicitud de soporte</p>
        </div>
      </motion.div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <motion.div variants={itemVariants}>
          <Card className="border-none shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-blue-500" />
                Información del Ticket
              </CardTitle>
              <CardDescription>Proporciona los detalles necesarios para que podamos ayudarte</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Título */}
              <div className="space-y-2">
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  placeholder="Ej: Error al generar reporte de ventas"
                  value={formData.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  required
                  className="bg-white/50 dark:bg-slate-800/50"
                />
              </div>

              {/* Descripción */}
              <div className="space-y-2">
                <Label htmlFor="description">Descripción *</Label>
                <Textarea
                  id="description"
                  placeholder="Describe detalladamente el problema, incluyendo pasos para reproducirlo, mensajes de error, etc."
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  rows={6}
                  required
                  className="bg-white/50 dark:bg-slate-800/50 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Prioridad */}
                <div className="space-y-2">
                  <Label htmlFor="priority">Prioridad</Label>
                  <Select value={formData.priority} onValueChange={(value) => handleInputChange("priority", value)}>
                    <SelectTrigger className="bg-white/50 dark:bg-slate-800/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baja - No es urgente</SelectItem>
                      <SelectItem value="medium">Media - Problema normal</SelectItem>
                      <SelectItem value="high">Alta - Afecta el trabajo</SelectItem>
                      <SelectItem value="urgent">Urgente - Sistema no funciona</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Categoría */}
                <div className="space-y-2">
                  <Label htmlFor="category">Categoría</Label>
                  <Select value={formData.category} onValueChange={(value) => handleInputChange("category", value)}>
                    <SelectTrigger className="bg-white/50 dark:bg-slate-800/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hardware">Hardware - Equipos, impresoras, etc.</SelectItem>
                      <SelectItem value="software">Software - Programas, aplicaciones</SelectItem>
                      <SelectItem value="network">Red - Internet, conectividad</SelectItem>
                      <SelectItem value="email">Email - Correo electrónico</SelectItem>
                      <SelectItem value="system">Sistema - Este sistema web</SelectItem>
                      <SelectItem value="other">Otro - Otros problemas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Adjuntos */}
        <motion.div variants={itemVariants}>
          <Card className="border-none shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-blue-500" />
                Adjuntos
              </CardTitle>
              <CardDescription>Puedes subir capturas de pantalla o documentos relacionados</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg p-6 text-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <input
                  id="attachments"
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.txt,.zip,.rar"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => document.getElementById("attachments")?.click()}
                  className="w-full h-full flex flex-col items-center gap-2"
                >
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Haz clic para seleccionar archivos</span>
                  <span className="text-xs text-muted-foreground font-normal">
                    Máximo 10MB por archivo. Imágenes, PDF, Docs, ZIP.
                  </span>
                </Button>
              </div>

              {/* Lista de adjuntos */}
              {attachments.length > 0 && (
                <div className="space-y-2">
                  <Label>Archivos seleccionados:</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {attachments.map((attachment, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm">
                        {attachment.preview ? (
                          <img
                            src={attachment.preview || "/placeholder.svg"}
                            alt="Preview"
                            className="h-10 w-10 object-cover rounded"
                          />
                        ) : (
                          <div className="h-10 w-10 bg-slate-100 dark:bg-slate-700 rounded flex items-center justify-center">
                            <span className="text-xs font-bold text-slate-500 uppercase">
                              {attachment.file.name.split('.').pop()}
                            </span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate text-slate-700 dark:text-slate-200">{attachment.file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(attachment.file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeAttachment(index)}
                          className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Botones */}
        <motion.div variants={itemVariants} className="flex justify-end gap-4 pb-10">
          <Button type="button" variant="outline" asChild className="border-slate-200 dark:border-slate-700">
            <Link href="/support">
              Cancelar
            </Link>
          </Button>
          <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20">
            {loading ? "Creando..." : "Crear Ticket"}
          </Button>
        </motion.div>
      </form>
    </motion.div>
  )
}
