"use client"

import { useState, useCallback, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Upload, X, File, Download } from "lucide-react"

export interface DeliveryAttachment {
  id: string
  file_name: string
  file_url: string
  file_size?: number
  file_type?: string
  created_at: string
}

interface DeliveryAttachmentsProps {
  deliveryId: string
  attachments: DeliveryAttachment[]
  /** Actualiza tanto el estado local del diálogo como el padre (Kanban) */
  onAttachmentsChange: (attachments: DeliveryAttachment[]) => void
  isLoading?: boolean
  canEdit?: boolean
}

export function DeliveryAttachments({
  deliveryId,
  attachments,
  onAttachmentsChange,
  isLoading = false,
  canEdit = true,
}: DeliveryAttachmentsProps) {
  const [uploading, setUploading] = useState(false)
  const [localAttachments, setLocalAttachments] = useState<DeliveryAttachment[]>(attachments)

  // Sincroniza con el prop que llega del Kanban
  useEffect(() => {
    setLocalAttachments(attachments)
  }, [attachments])

  useEffect(() => {
    const loadAttachments = async () => {
      try {
        const { data, error } = await supabase
          .from("delivery_attachments")
          .select("*")
          .eq("delivery_id", deliveryId)
          .order("created_at", { ascending: false })

        if (error) throw error

        setLocalAttachments(data || [])
        onAttachmentsChange(data || [])
      } catch (error: any) {
        console.error("[v0] Loading attachments from DB:", error.message)
      }
    }

    loadAttachments()
  }, [deliveryId, onAttachmentsChange])

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "N/A"
    if (bytes < 1024) return bytes + " B"
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB"
    return (bytes / (1024 * 1024)).toFixed(2) + " MB"
  }

  const handleFileUpload = useCallback(
    async (file: File) => {
      if (!canEdit) return

      setUploading(true)
      try {
        const fileName = `${deliveryId}/${Date.now()}-${file.name}`

        // 1. Subir al storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("delivery-attachments")
          .upload(fileName, file, { cacheControl: "3600", upsert: false })

        if (uploadError) throw uploadError

        // 2. URL pública
        const { data } = supabase.storage.from("delivery-attachments").getPublicUrl(fileName)

        // 3. Usuario autenticado
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) throw new Error("No authenticated user")

        // 4. Insertar registro
        const { data: attachment, error: dbError } = await supabase
          .from("delivery_attachments")
          .insert({
            delivery_id: deliveryId,
            file_name: file.name,
            file_url: data.publicUrl,
            file_size: file.size,
            file_type: file.type,
            uploaded_by: user.id,
          })
          .select()
          .single()

        if (dbError) throw dbError

        const updated = [...localAttachments, attachment]
        setLocalAttachments(updated)
        onAttachmentsChange(updated) // <-- actualiza Kanban + diálogo
        toast.success("Archivo cargado")
      } catch (error: any) {
        console.error("[DeliveryAttachments] Upload error:", error.message)
        toast.error("Error al cargar: " + error.message)
      } finally {
        setUploading(false)
      }
    },
    [deliveryId, localAttachments, onAttachmentsChange, canEdit],
  )

  const handleDelete = useCallback(
    async (attachmentId: string, fileUrl: string) => {
      if (!canEdit) return

      try {
        // 1. Extraer path del storage
        const urlParts = fileUrl.split("/storage/v1/object/public/delivery-attachments/")
        const filePath = urlParts[1]
        if (filePath) {
          const { error: storageError } = await supabase.storage.from("delivery-attachments").remove([filePath])
          if (storageError) throw storageError
        }

        // 2. Borrar registro
        const { error } = await supabase.from("delivery_attachments").delete().eq("id", attachmentId)
        if (error) throw error

        const { data: updatedAttachments, error: fetchError } = await supabase
          .from("delivery_attachments")
          .select("*")
          .eq("delivery_id", deliveryId)

        if (fetchError) throw fetchError

        const attachmentsData = updatedAttachments ?? []
        setLocalAttachments(attachmentsData)
        onAttachmentsChange(attachmentsData)
        toast.success("Archivo eliminado")
      } catch (error: any) {
        console.error("[DeliveryAttachments] Delete error:", error.message)
        toast.error("Error al eliminar: " + error.message)
      }
    },
    [deliveryId, onAttachmentsChange, canEdit],
  )

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Archivos Adjuntos</h3>
        <Badge variant="secondary">{localAttachments.length}</Badge>
      </div>

      {canEdit && (
        <div className="flex gap-2">
          <Input
            type="file"
            multiple
            disabled={uploading || isLoading}
            onChange={(e) => {
              if (e.target.files) {
                Array.from(e.target.files).forEach(handleFileUpload)
                e.target.value = ""
              }
            }}
            className="flex-1"
          />
          <Button variant="outline" size="sm" disabled={uploading || isLoading}>
            <Upload className="h-4 w-4 mr-2" />
            {uploading ? "Cargando…" : "Subir"}
          </Button>
        </div>
      )}

      <div className="space-y-2">
        {localAttachments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No hay archivos adjuntos</p>
        ) : (
          localAttachments.map((att) => (
            <div
              key={att.id}
              className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <File className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{att.file_name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(att.file_size)}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                <Button variant="ghost" size="sm" asChild className="h-8 w-8 p-0">
                  <a href={att.file_url} target="_blank" rel="noopener noreferrer">
                    <Download className="h-4 w-4" />
                  </a>
                </Button>

                {canEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(att.id, att.file_url)}
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  )
}
