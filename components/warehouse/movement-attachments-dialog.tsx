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
  attachment_type: "factura" | "adjunto"
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
    sale_price: number | null
    total_amount: number | null
    purchase_order_number: string | null
    destination_entity_name: string | null
    destination_address: string | null
    supplier: string | null
    reason: string | null
    notes: string | null
    products?: {
      name: string
      code: string
      unit_of_measure: string
    } | null
    profiles?: {
      full_name: string
    } | null
    peru_departments?: {
      name: string
    } | null
  }
}

export function MovementAttachmentsDialog({ open, onClose, movementId, movementInfo }: MovementAttachmentsDialogProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [attachments, setAttachments] = useState<MovementAttachment[]>([])
  const [newFiles, setNewFiles] = useState<Array<{ file: File; type: "factura" | "adjunto" }>>([])
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
          attachment_type,
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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>, attachmentType: "factura" | "adjunto") => {
    const files = Array.from(event.target.files || [])

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

    const filesWithType = validFiles.map((file) => ({ file, type: attachmentType }))
    setNewFiles((prev) => [...prev, ...filesWithType])
  }

  const removeNewFile = (index: number) => {
    setNewFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const uploadNewFiles = async () => {
    if (newFiles.length === 0) return

    setUploading(true)

    try {
      for (const { file, type } of newFiles) {
        const fileExt = file.name.split(".").pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
        const filePath = `${user?.id}/${fileName}`

        const { error: uploadError } = await supabase.storage.from("inventory-attachments").upload(filePath, file)

        if (uploadError) {
          console.error("Upload error:", uploadError)
          throw uploadError
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("inventory-attachments").getPublicUrl(filePath)

        const { error: dbError } = await supabase.from("inventory_movement_attachments").insert({
          movement_id: movementId,
          file_name: file.name,
          file_url: publicUrl,
          file_size: file.size,
          file_type: file.type,
          attachment_type: type,
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

  const replaceAttachment = async (
    attachmentId: string,
    oldFileUrl: string,
    newFile: File,
    attachmentType: "factura" | "adjunto",
  ) => {
    try {
      setUploading(true)

      const fileExt = newFile.name.split(".").pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `${user?.id}/${fileName}`

      const { error: uploadError } = await supabase.storage.from("inventory-attachments").upload(filePath, newFile)

      if (uploadError) {
        console.error("Upload error:", uploadError)
        throw uploadError
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("inventory-attachments").getPublicUrl(filePath)

      const { error: dbError } = await supabase
        .from("inventory_movement_attachments")
        .update({
          file_name: newFile.name,
          file_url: publicUrl,
          file_size: newFile.size,
          file_type: newFile.type,
          attachment_type: attachmentType,
          uploaded_by: user?.id,
          created_at: new Date().toISOString(),
        })
        .eq("id", attachmentId)

      if (dbError) throw dbError

      const oldUrlParts = oldFileUrl.split("/")
      const oldFileName = oldUrlParts[oldUrlParts.length - 1]
      const oldUserId = oldUrlParts[oldUrlParts.length - 2]
      const oldFilePath = `${oldUserId}/${oldFileName}`

      const { error: deleteError } = await supabase.storage.from("inventory-attachments").remove([oldFilePath])

      if (deleteError) {
        console.warn("Error deleting old file from storage:", deleteError)
      }

      toast({
        title: "Archivo reemplazado",
        description: "El archivo se reemplazó correctamente.",
      })

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

  const deleteAttachment = async (attachmentId: string, fileUrl: string) => {
    try {
      const urlParts = fileUrl.split("/")
      const fileName = urlParts[urlParts.length - 1]
      const userId = urlParts[urlParts.length - 2]
      const filePath = `${userId}/${fileName}`

      const { error: storageError } = await supabase.storage.from("inventory-attachments").remove([filePath])

      if (storageError) {
        console.warn("Error deleting file from storage:", storageError)
      }

      const { error: dbError } = await supabase.from("inventory_movement_attachments").delete().eq("id", attachmentId)

      if (dbError) throw dbError

      toast({
        title: "Archivo eliminado",
        description: "El archivo se eliminó correctamente.",
      })

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

  const formatCurrency = (amount: number | null) => {
    if (!amount) return "-"
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "PEN",
    }).format(amount)
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

        <Card className="bg-muted/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Información Completa del Movimiento
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-3">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">TIPO DE MOVIMIENTO</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={getMovementTypeColor(movementInfo.movement_type)}>
                      {movementInfo.movement_type.charAt(0).toUpperCase() + movementInfo.movement_type.slice(1)}
                    </Badge>
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-medium text-muted-foreground">PRODUCTO</Label>
                  <div className="mt-1">
                    <div className="font-medium">{movementInfo.products?.name || "Producto eliminado"}</div>
                    <div className="text-muted-foreground">Código: {movementInfo.products?.code || "N/A"}</div>
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-medium text-muted-foreground">CANTIDAD</Label>
                  <div className="mt-1 font-medium">
                    {movementInfo.movement_type === "entrada"
                      ? "+"
                      : movementInfo.movement_type === "salida"
                        ? "-"
                        : "±"}
                    {movementInfo.quantity} {movementInfo.products?.unit_of_measure || "unidades"}
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-medium text-muted-foreground">FECHA DEL MOVIMIENTO</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{formatDate(movementInfo.movement_date)}</span>
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-medium text-muted-foreground">CREADO POR</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{movementInfo.profiles?.full_name || "Usuario eliminado"}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {movementInfo.movement_type === "salida" && (movementInfo.sale_price || movementInfo.total_amount) && (
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">INFORMACIÓN DE VENTA</Label>
                    <div className="mt-1 space-y-1">
                      {movementInfo.sale_price && (
                        <div>
                          Precio unitario:{" "}
                          <span className="font-medium">{formatCurrency(movementInfo.sale_price)}</span>
                        </div>
                      )}
                      {movementInfo.total_amount && (
                        <div>
                          Total:{" "}
                          <span className="font-medium text-green-600">
                            {formatCurrency(movementInfo.total_amount)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {movementInfo.purchase_order_number && (
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">ORDEN DE COMPRA</Label>
                    <div className="mt-1 font-medium">{movementInfo.purchase_order_number}</div>
                  </div>
                )}

                {movementInfo.destination_entity_name && (
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">CLIENTE/ENTIDAD DESTINO</Label>
                    <div className="mt-1">
                      <div className="font-medium">{movementInfo.destination_entity_name}</div>
                      {movementInfo.destination_address && (
                        <div className="text-muted-foreground text-xs mt-1">
                          <strong>Dirección:</strong> {movementInfo.destination_address}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {movementInfo.peru_departments?.name && (
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">DEPARTAMENTO DESTINO</Label>
                    <div className="mt-1 font-medium">{movementInfo.peru_departments.name}</div>
                  </div>
                )}

                {movementInfo.supplier && (
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">PROVEEDOR</Label>
                    <div className="mt-1 font-medium">{movementInfo.supplier}</div>
                  </div>
                )}

                {movementInfo.reason && (
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">MOTIVO</Label>
                    <div className="mt-1">{movementInfo.reason}</div>
                  </div>
                )}
              </div>
            </div>

            {movementInfo.notes && (
              <div className="mt-4 pt-4 border-t">
                <Label className="text-xs font-medium text-muted-foreground">NOTAS ADICIONALES</Label>
                <div className="mt-1 p-3 bg-background rounded-md border text-sm">{movementInfo.notes}</div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-4">
              Facturas ({attachments.filter((a) => a.attachment_type === "factura").length})
            </h3>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Cargando archivos...</div>
            ) : attachments.filter((a) => a.attachment_type === "factura").length > 0 ? (
              <div className="space-y-3">
                {attachments
                  .filter((a) => a.attachment_type === "factura")
                  .map((attachment) => (
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
                          <Label htmlFor={`replace-invoice-${attachment.id}`} className="cursor-pointer">
                            <Button variant="outline" size="sm" asChild>
                              <span title="Reemplazar archivo">
                                <Upload className="h-4 w-4" />
                              </span>
                            </Button>
                          </Label>
                          <Input
                            id={`replace-invoice-${attachment.id}`}
                            type="file"
                            className="hidden"
                            accept=".pdf,.jpg,.jpeg,.png"
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
                                replaceAttachment(attachment.id, attachment.file_url, file, "factura")
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
                                <AlertDialogTitle>¿Eliminar factura?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción no se puede deshacer. La factura "{attachment.file_name}" será eliminada
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
              <div className="text-center py-8 text-muted-foreground">No hay facturas para este movimiento</div>
            )}
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">
              Adjuntos ({attachments.filter((a) => a.attachment_type === "adjunto").length})
            </h3>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Cargando archivos...</div>
            ) : attachments.filter((a) => a.attachment_type === "adjunto").length > 0 ? (
              <div className="space-y-3">
                {attachments
                  .filter((a) => a.attachment_type === "adjunto")
                  .map((attachment) => (
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
                          <Label htmlFor={`replace-attachment-${attachment.id}`} className="cursor-pointer">
                            <Button variant="outline" size="sm" asChild>
                              <span title="Reemplazar archivo">
                                <Upload className="h-4 w-4" />
                              </span>
                            </Button>
                          </Label>
                          <Input
                            id={`replace-attachment-${attachment.id}`}
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
                                replaceAttachment(attachment.id, attachment.file_url, file, "adjunto")
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
                                <AlertDialogTitle>¿Eliminar adjunto?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción no se puede deshacer. El adjunto "{attachment.file_name}" será eliminado
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
              <div className="text-center py-8 text-muted-foreground">No hay adjuntos para este movimiento</div>
            )}
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Agregar Nuevos Archivos
            </h3>

            <div className="space-y-6">
              <div>
                <Label htmlFor="new-invoices" className="cursor-pointer">
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-muted-foreground/50 transition-colors">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm font-medium text-foreground">Subir Factura(s)</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Haz clic para seleccionar o arrastra y suelta aquí
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG (máx. 10MB cada uno)</p>
                  </div>
                </Label>
                <Input
                  id="new-invoices"
                  type="file"
                  multiple
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => handleFileSelect(e, "factura")}
                />
              </div>

              <div>
                <Label htmlFor="new-attachments" className="cursor-pointer">
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-muted-foreground/50 transition-colors">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm font-medium text-foreground">Subir Adjuntos</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Haz clic para seleccionar o arrastra y suelta aquí
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
                  onChange={(e) => handleFileSelect(e, "adjunto")}
                />
              </div>

              {newFiles.length > 0 && (
                <div className="space-y-2">
                  <Label>Archivos seleccionados ({newFiles.length}):</Label>
                  <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-2">
                    {newFiles.map(({ file, type }, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Paperclip className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm truncate font-medium">{file.name}</p>
                            <div className="flex items-center gap-2">
                              <Badge variant={type === "factura" ? "default" : "secondary"} className="text-xs">
                                {type === "factura" ? "Factura" : "Adjunto"}
                              </Badge>
                              <p className="text-xs text-muted-foreground">
                                {file.type} • {formatFileSize(file.size)}
                              </p>
                            </div>
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
