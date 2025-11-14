"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Upload, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import Link from "next/link"

interface AttachmentFile {
  file: File
  preview?: string
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
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/support">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Nuevo Ticket de Soporte</h1>
          <p className="text-muted-foreground">Describe tu problema o solicitud de soporte</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Información del Ticket</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Título */}
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                placeholder="Describe brevemente el problema..."
                value={formData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                required
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
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Prioridad */}
              <div className="space-y-2">
                <Label htmlFor="priority">Prioridad</Label>
                <Select value={formData.priority} onValueChange={(value) => handleInputChange("priority", value)}>
                  <SelectTrigger>
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
                  <SelectTrigger>
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

        {/* Adjuntos */}
        <Card>
          <CardHeader>
            <CardTitle>Adjuntos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="attachments">Subir archivos (opcional)</Label>
              <div className="mt-2">
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
                  variant="outline"
                  onClick={() => document.getElementById("attachments")?.click()}
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Seleccionar archivos
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Máximo 10MB por archivo. Formatos: imágenes, PDF, documentos, archivos comprimidos.
              </p>
            </div>

            {/* Lista de adjuntos */}
            {attachments.length > 0 && (
              <div className="space-y-2">
                <Label>Archivos seleccionados:</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {attachments.map((attachment, index) => (
                    <div key={index} className="border rounded-lg p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{attachment.file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(attachment.file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAttachment(index)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      {attachment.preview && (
                        <div className="mt-2">
                          <img
                            src={attachment.preview || "/placeholder.svg"}
                            alt={attachment.file.name}
                            className="w-full h-32 object-cover rounded"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Botones */}
        <div className="flex justify-end gap-4">
          <Link href="/support">
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </Link>
          <Button type="submit" disabled={loading}>
            {loading ? "Creando..." : "Crear Ticket"}
          </Button>
        </div>
      </form>
    </div>
  )
}
