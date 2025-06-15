"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Upload, X, Paperclip, Download, Trash2, Plus, FileText, Calendar, User } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"

interface MovementAttachment {
  id: string
  movement_id: string
  file_name: string
  file_url: string
  file_size: number
  file_type: string
  created_at: string
  profiles?: {
    full_name: string
  } | null
}

interface MovementAttachmentsDialogProps {
  open: boolean
  onClose: () => void
  movementId: string
  movementInfo: {
    movement_type: string
    quantity: number
    movement_date: string
    products?: {
      name: string
      code: string
    } | null
  }
}

export function MovementAttachmentsDialog({ open, onClose, movementId, movementInfo }: MovementAttachmentsDialogProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [attachments, setAttachments] = useState<MovementAttachment[]>([])
  const [newFiles, setNewFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (open && movementId) {
      fetchAttachments()
    }
  }, [open, movementId])

  const fetchAttachments = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("inventory_movement_attachments")
        .select(`
          id,
          movement_id,
          file_name,
          file_url,
          file_size,
          file_type,
          created_at,
          profiles:uploaded_by (
            full_name
          )
        `)
        .eq("movement_id", movementId)
        .order("created_at", { ascending: false })

      if (error) throw error

      setAttachments(data || [])
    } catch (error: any) {
      console.error("Error fetching attachments:", error)
      toast({
        title: "Error",
        description: "Error al cargar los archivos adjuntos",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

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

    setNewFiles((prev) => [...prev, ...validFiles])
  }

  const removeNewFile = (index: number) => {
    setNewFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const uploadNewFiles = async () => {
    if (newFiles.length === 0) return

    setUploading(true)

    try {
      for (const file of newFiles) {
        // Generar nombre único para el archivo
        const fileExt = file.name.split(".").pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
        const filePath = `${user?.id}/${fileName}`

        // Subir archivo a Supabase Storage
        const { error: uploadError } = await supabase.storage.from("inventory-attachments").upload(filePath, file)

        if (uploadError) {
          console.error("Upload error:", uploadError)
          throw uploadError
        }

        // Obtener URL pública del archivo
        const {
          data: { publicUrl },
        } = supabase.storage.from("inventory-attachments").getPublicUrl(filePath)

        // Crear registro en la base de datos
        const { error: dbError } = await supabase.from("inventory_movement_attachments").insert({
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
        description: `Se subieron ${newFiles.length} archivo(s) correctamente.`,
      })

      // Limpiar archivos nuevos y recargar la lista
      setNewFiles([])
      await fetchAttachments()
    } catch (error: any) {
      console.error("Error uploading files:", error)
      toast({
        title: "Error al subir archivos",
        description: error.message || "Error al subir algunos archivos adjuntos.",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const deleteAttachment = async (attachmentId: string, fileUrl: string) => {
    try {
      // Extraer el path del archivo de la URL
      const urlParts = fileUrl.split("/")
      const fileName = urlParts[urlParts.length - 1]
      const userId = urlParts[urlParts.length - 2]
      const filePath = `${userId}/${fileName}`

      // Eliminar archivo del storage
      const { error: storageError } = await supabase.storage.from("inventory-attachments").remove([filePath])

      if (storageError) {
        console.warn("Error deleting file from storage:", storageError)
        // Continuar aunque falle el borrado del storage
      }

      // Eliminar registro de la base de datos
      const { error: dbError } = await supabase.from("inventory_movement_attachments").delete().eq("id", attachmentId)

      if (dbError) throw dbError

      toast({
        title: "Archivo eliminado",
        description: "El archivo se eliminó correctamente.",
      })

      // Recargar la lista
      await fetchAttachments()
    } catch (error: any) {
      console.error("Error deleting attachment:", error)
      toast({
        title: "Error",
        description: "Error al eliminar el archivo adjunto.",
        variant: "destructive",
      })
    }
  }

  const replaceAttachment = async (attachmentId: string, oldFileUrl: string, newFile: File) => {
    try {
      setUploading(true)

      // Generar nombre único para el nuevo archivo
      const fileExt = newFile.name.split(".").pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `${user?.id}/${fileName}`

      // Subir nuevo archivo a Supabase Storage
      const { error: uploadError } = await supabase.storage.from("inventory-attachments").upload(filePath, newFile)

      if (uploadError) {
        console.error("Upload error:", uploadError)
        throw uploadError
      }

      // Obtener URL pública del nuevo archivo
      const {
        data: { publicUrl },
      } = supabase.storage.from("inventory-attachments").getPublicUrl(filePath)

      // Actualizar registro en la base de datos
      const { error: dbError } = await supabase
        .from("inventory_movement_attachments")
        .update({
          file_name: newFile.name,
          file_url: publicUrl,
          file_size: newFile.size,
          file_type: newFile.type,
          uploaded_by: user?.id,
          created_at: new Date().toISOString(),
        })
        .eq("id", attachmentId)

      if (dbError) throw dbError

      // Eliminar archivo anterior del storage
      const oldUrlParts = oldFileUrl.split("/")
      const oldFileName = oldUrlParts[oldUrlParts.length - 1]
      const oldUserId = oldUrlParts[oldUrlParts.length - 2]
      const oldFilePath = `${oldUserId}/${oldFileName}`

      const { error: deleteError } = await supabase.storage.from("inventory-attachments").remove([oldFilePath])

      if (deleteError) {
        console.warn("Error deleting old file from storage:", deleteError)
        // No fallar si no se puede eliminar el archivo anterior
      }

      toast({
        title: "Archivo reemplazado",
        description: "El archivo se reemplazó correctamente.",
      })

      // Recargar la lista
      await fetchAttachments()
    } catch (error: any) {
      console.error("Error replacing attachment:", error)
      toast({
        title: "Error",
        description: "Error al reemplazar el archivo adjunto.",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    return (bytes / 1024 / 1024).toFixed(1) + " MB"
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-PE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getMovementTypeColor = (type: string) => {
    switch (type) {
      case "entrada":
        return "bg-green-100 text-green-800"
      case "salida":
        return "bg-red-100 text-red-800"
      case "ajuste":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Paperclip className="h-5 w-5" />
            Gestionar Archivos Adjuntos
          </DialogTitle>
        </DialogHeader>

        {/* Información del movimiento */}
        <Card className="bg-muted/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Información del Movimiento
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Badge className={getMovementTypeColor(movementInfo.movement_type)}>
                  {movementInfo.movement_type.charAt(0).toUpperCase() + movementInfo.movement_type.slice(1)}
                </Badge>
                <span className="font-medium">{movementInfo.quantity} unidades</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{formatDate(movementInfo.movement_date)}</span>
              </div>
              {movementInfo.products && (
                <div className="col-span-2">
                  <span className="font-medium">{movementInfo.products.name}</span>
                  <span className="text-muted-foreground ml-2">({movementInfo.products.code})</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {/* Archivos existentes */}
          <div>
            <h3 className="text-lg font-medium mb-4">Archivos Adjuntos ({attachments.length})</h3>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Cargando archivos...</div>
            ) : attachments.length > 0 ? (
              <div className="space-y-3">
                {attachments.map((attachment) => (
                  <Card key={attachment.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Paperclip className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{attachment.file_name}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>{attachment.file_type}</span>
                            <span>{formatFileSize(attachment.file_size)}</span>
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              <span>{attachment.profiles?.full_name || "Usuario eliminado"}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>{formatDate(attachment.created_at)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(attachment.file_url, "_blank")}
                          title="Descargar archivo"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Label htmlFor={`replace-${attachment.id}`} className="cursor-pointer">
                          <Button variant="outline" size="sm" asChild>
                            <span title="Reemplazar archivo">
                              <Upload className="h-4 w-4" />
                            </span>
                          </Button>
                        </Label>
                        <Input
                          id={`replace-${attachment.id}`}
                          type="file"
                          className="hidden"
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              if (file.size > 10 * 1024 * 1024) {
                                toast({
                                  title: "Archivo muy grande",
                                  description: "El archivo excede el límite de 10MB.",
                                  variant: "destructive",
                                })
                                return
                              }
                              replaceAttachment(attachment.id, attachment.file_url, file)
                            }
                            e.target.value = ""
                          }}
                        />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" title="Eliminar archivo">
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar archivo?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción no se puede deshacer. El archivo "{attachment.file_name}" será eliminado
                                permanentemente.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteAttachment(attachment.id, attachment.file_url)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No hay archivos adjuntos para este movimiento
              </div>
            )}
          </div>

          {/* Agregar nuevos archivos */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Agregar Nuevos Archivos
            </h3>

            <div className="space-y-4">
              <div>
                <Label htmlFor="new-attachments" className="cursor-pointer">
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
                  id="new-attachments"
                  type="file"
                  multiple
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                  onChange={handleFileSelect}
                />
              </div>

              {/* Lista de archivos nuevos seleccionados */}
              {newFiles.length > 0 && (
                <div className="space-y-2">
                  <Label>Archivos seleccionados ({newFiles.length}):</Label>
                  <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-2">
                    {newFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Paperclip className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm truncate font-medium">{file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {file.type} • {formatFileSize(file.size)}
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeNewFile(index)}
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
          </div>
        </div>

        <div className="flex justify-between pt-6 border-t">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
          {newFiles.length > 0 && (
            <Button onClick={uploadNewFiles} disabled={uploading}>
              {uploading ? "Subiendo..." : `Subir ${newFiles.length} archivo(s)`}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
