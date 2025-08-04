"use client"

import React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, Check, Clock, AlertTriangle, Download, Eye } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useCompany } from "@/lib/company-context"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { createNotification } from "@/lib/notifications"

interface PaymentVoucher {
  id: string
  sale_id: string
  file_url: string
  file_name: string
  file_size: number
  status: "pending" | "confirmed" | "rejected"
  admin_confirmed: boolean
  accounting_confirmed: boolean
  admin_confirmed_by?: string
  accounting_confirmed_by?: string
  admin_confirmed_at?: string
  accounting_confirmed_at?: string
  notes?: string
  uploaded_by: string
  uploaded_at: string
  profiles?: {
    full_name: string
  }
}

interface Sale {
  id: string
  sale_number?: string
  entity_name: string
  total_sale: number
  sale_date: string
}

interface PaymentVoucherDialogProps {
  sale: Sale
  open: boolean
  onOpenChange: (open: boolean) => void
  onVoucherUploaded?: () => void
}

export default function PaymentVoucherDialog({
  sale,
  open,
  onOpenChange,
  onVoucherUploaded,
}: PaymentVoucherDialogProps) {
  const { user } = useAuth()
  const { selectedCompany } = useCompany()
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [voucher, setVoucher] = useState<PaymentVoucher | null>(null)
  const [notes, setNotes] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  // Determinar si el usuario puede confirmar comprobantes
  const canConfirmVoucher =
    user?.departments?.name === "Administración" || user?.departments?.name === "Contabilidad" || user?.role === "admin"

  const isAdminUser = user?.departments?.name === "Administración" || user?.role === "admin"
  const isAccountingUser = user?.departments?.name === "Contabilidad"

  React.useEffect(() => {
    if (open && sale.id) {
      fetchVoucher()
    }
  }, [open, sale.id])

  const fetchVoucher = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("payment_vouchers")
        .select(`
          *,
          profiles!payment_vouchers_uploaded_by_fkey (full_name)
        `)
        .eq("sale_id", sale.id)
        .single()

      if (error && error.code !== "PGRST116") {
        throw error
      }

      setVoucher(data || null)
    } catch (error: any) {
      console.error("Error fetching voucher:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validar tipo de archivo
      const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "application/pdf"]
      if (!allowedTypes.includes(file.type)) {
        toast.error("Solo se permiten archivos JPG, PNG o PDF")
        return
      }

      // Validar tamaño (máximo 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error("El archivo no puede ser mayor a 10MB")
        return
      }

      setSelectedFile(file)
    }
  }

  const uploadVoucher = async () => {
    if (!selectedFile || !user || !selectedCompany) return

    try {
      setUploading(true)

      // Generar nombre único para el archivo
      const fileExt = selectedFile.name.split(".").pop()
      const fileName = `voucher_${sale.id}_${Date.now()}.${fileExt}`
      const filePath = `${selectedCompany.id}/payment-vouchers/${fileName}`

      // Subir archivo a Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, selectedFile)

      if (uploadError) throw uploadError

      // Obtener URL pública del archivo
      const {
        data: { publicUrl },
      } = supabase.storage.from("documents").getPublicUrl(filePath)

      // Guardar información del comprobante en la base de datos
      const { data: voucherData, error: voucherError } = await supabase
        .from("payment_vouchers")
        .insert({
          sale_id: sale.id,
          file_url: publicUrl,
          file_name: selectedFile.name,
          file_size: selectedFile.size,
          status: "pending",
          admin_confirmed: false,
          accounting_confirmed: false,
          notes: notes || null,
          uploaded_by: user.id,
          company_id: selectedCompany.id,
        })
        .select()
        .single()

      if (voucherError) throw voucherError

      // Enviar notificaciones a Administración y Contabilidad
      await sendVoucherNotifications(voucherData.id)

      toast.success("Comprobante de pago subido exitosamente")
      setSelectedFile(null)
      setNotes("")
      await fetchVoucher()
      onVoucherUploaded?.()
    } catch (error: any) {
      console.error("Error uploading voucher:", error)
      toast.error("Error al subir el comprobante: " + error.message)
    } finally {
      setUploading(false)
    }
  }

  const sendVoucherNotifications = async (voucherId: string) => {
    try {
      console.log("🔔 Enviando notificaciones para comprobante:", voucherId)
      console.log("🏢 Empresa seleccionada:", selectedCompany?.id)

      if (!selectedCompany?.id) {
        console.error("❌ No hay empresa seleccionada")
        return
      }

      // Primero obtener los IDs de los departamentos de Administración y Contabilidad
      const { data: departments, error: deptError } = await supabase
        .from("departments")
        .select("id, name")
        .eq("company_id", selectedCompany.id)
        .in("name", ["Administración", "Contabilidad"])

      if (deptError) {
        console.error("❌ Error obteniendo departamentos:", deptError)
        return
      }

      console.log("🏢 Departamentos encontrados:", departments)

      if (!departments || departments.length === 0) {
        console.log("⚠️ No se encontraron departamentos de Administración o Contabilidad")
        toast.warning("No se encontraron departamentos de Administración o Contabilidad")
        return
      }

      const departmentIds = departments.map((dept) => dept.id)
      console.log("📋 IDs de departamentos:", departmentIds)

      // Ahora buscar usuarios que pertenezcan a estos departamentos
      const { data: targetUsers, error: usersError } = await supabase
        .from("profiles")
        .select(`
          id, 
          full_name, 
          email, 
          department_id,
          departments!profiles_department_id_fkey(id, name)
        `)
        .eq("company_id", selectedCompany.id)
        .in("department_id", departmentIds)

      if (usersError) {
        console.error("❌ Error obteniendo usuarios:", usersError)
        return
      }

      console.log("👥 Usuarios encontrados:", targetUsers?.length || 0)
      console.log("👥 Detalle de usuarios:", targetUsers)

      if (!targetUsers || targetUsers.length === 0) {
        console.log("⚠️ No se encontraron usuarios de Administración o Contabilidad")
        toast.warning("No se encontraron usuarios de Administración o Contabilidad para notificar")
        return
      }

      // Enviar notificaciones usando la función de notifications.ts
      let successCount = 0
      let errorCount = 0

      for (const targetUser of targetUsers) {
        const departmentName = targetUser.departments?.name || "Departamento desconocido"
        console.log(`📧 Enviando notificación a ${targetUser.full_name} (${departmentName})`)

        try {
          const result = await createNotification({
            userId: targetUser.id,
            title: "🧾 Nuevo Comprobante de Pago",
            message: `Se ha subido un comprobante de pago para la venta ${sale.sale_number || sale.id} de ${sale.entity_name}. Monto: S/ ${sale.total_sale.toLocaleString("es-PE", { minimumFractionDigits: 2 })}. Requiere su aprobación.`,
            type: "payment_voucher_uploaded",
            relatedId: voucherId,
            companyId: selectedCompany.id,
          })

          if (result.success) {
            console.log(`✅ Notificación enviada exitosamente a ${targetUser.full_name}`)
            successCount++
          } else {
            console.error(`❌ Error enviando notificación a ${targetUser.full_name}:`, result.error)
            errorCount++
          }
        } catch (error) {
          console.error(`❌ Excepción enviando notificación a ${targetUser.full_name}:`, error)
          errorCount++
        }
      }

      console.log(`📊 Resumen de notificaciones: ${successCount} exitosas, ${errorCount} fallidas`)

      if (successCount > 0) {
        toast.success(`✅ Notificaciones enviadas a ${successCount} usuario(s) de Administración y Contabilidad`)
      }

      if (errorCount > 0) {
        toast.warning(`⚠️ ${errorCount} notificación(es) no pudieron ser enviadas`)
      }

      if (successCount === 0) {
        toast.error("❌ No se pudieron enviar las notificaciones")
      }
    } catch (error) {
      console.error("❌ Error general enviando notificaciones:", error)
      toast.error("Error al enviar notificaciones: " + (error as any).message)
    }
  }

  const confirmVoucher = async () => {
    if (!voucher || !user || !canConfirmVoucher) return

    try {
      setLoading(true)

      const updateData: any = {}

      if (isAdminUser && !voucher.admin_confirmed) {
        updateData.admin_confirmed = true
        updateData.admin_confirmed_by = user.id
        updateData.admin_confirmed_at = new Date().toISOString()
      }

      if (isAccountingUser && !voucher.accounting_confirmed) {
        updateData.accounting_confirmed = true
        updateData.accounting_confirmed_by = user.id
        updateData.accounting_confirmed_at = new Date().toISOString()
      }

      // Si ambas áreas ya confirmaron o esta confirmación completa ambas, cambiar estado
      const willBeFullyConfirmed =
        (voucher.admin_confirmed || updateData.admin_confirmed) &&
        (voucher.accounting_confirmed || updateData.accounting_confirmed)

      if (willBeFullyConfirmed) {
        updateData.status = "confirmed"
      }

      const { error } = await supabase.from("payment_vouchers").update(updateData).eq("id", voucher.id)

      if (error) throw error

      const departmentName = isAdminUser ? "Administración" : "Contabilidad"
      toast.success(`Comprobante confirmado por ${departmentName}`)
      await fetchVoucher()

      // Notificar al vendedor si el comprobante está completamente confirmado
      if (willBeFullyConfirmed) {
        await createNotification({
          userId: voucher.uploaded_by,
          title: "✅ Comprobante de Pago Confirmado",
          message: `El comprobante de pago para la venta ${sale.sale_number || sale.id} ha sido confirmado por todas las áreas requeridas`,
          type: "payment_voucher_confirmed",
          relatedId: voucher.id,
          companyId: selectedCompany?.id || null,
        })

        toast.success("Comprobante completamente confirmado. Vendedor notificado.")
      }
    } catch (error: any) {
      console.error("Error confirming voucher:", error)
      toast.error("Error al confirmar el comprobante: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  const downloadVoucher = () => {
    if (voucher?.file_url) {
      window.open(voucher.file_url, "_blank")
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="text-yellow-600 border-yellow-600">
            <Clock className="h-3 w-3 mr-1" />
            Pendiente
          </Badge>
        )
      case "confirmed":
        return (
          <Badge variant="default" className="text-green-600 border-green-600 bg-green-50">
            <Check className="h-3 w-3 mr-1" />
            Confirmado
          </Badge>
        )
      case "rejected":
        return (
          <Badge variant="destructive">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Rechazado
          </Badge>
        )
      default:
        return <Badge variant="outline">Desconocido</Badge>
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Comprobante de Pago</DialogTitle>
          <DialogDescription>
            Venta: {sale.sale_number || sale.id} - {sale.entity_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información de la venta */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Información de la Venta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Cliente</Label>
                  <p className="text-sm font-semibold">{sale.entity_name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Total</Label>
                  <p className="text-sm font-semibold">
                    S/ {sale.total_sale.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Fecha</Label>
                  <p className="text-sm">{new Date(sale.sale_date).toLocaleDateString("es-PE")}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">N° Venta</Label>
                  <p className="text-sm">{sale.sale_number || "N/A"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {loading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-sm text-muted-foreground mt-2">Cargando...</p>
            </div>
          ) : voucher ? (
            /* Mostrar comprobante existente */
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Comprobante Actual</CardTitle>
                  {getStatusBadge(voucher.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Archivo</Label>
                    <p className="text-sm font-semibold">{voucher.file_name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Tamaño</Label>
                    <p className="text-sm">{(voucher.file_size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Subido por</Label>
                    <p className="text-sm">{voucher.profiles?.full_name || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Fecha de subida</Label>
                    <p className="text-sm">{new Date(voucher.uploaded_at).toLocaleDateString("es-PE")}</p>
                  </div>
                </div>

                {voucher.notes && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Notas</Label>
                    <p className="text-sm bg-muted p-2 rounded">{voucher.notes}</p>
                  </div>
                )}

                {/* Estado de confirmaciones */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Estado de Confirmaciones</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      {voucher.admin_confirmed ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Clock className="h-4 w-4 text-yellow-600" />
                      )}
                      <span className="text-sm">
                        Administración: {voucher.admin_confirmed ? "Confirmado" : "Pendiente"}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {voucher.accounting_confirmed ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Clock className="h-4 w-4 text-yellow-600" />
                      )}
                      <span className="text-sm">
                        Contabilidad: {voucher.accounting_confirmed ? "Confirmado" : "Pendiente"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Botones de acción */}
                <div className="flex space-x-2">
                  <Button variant="outline" onClick={downloadVoucher} className="flex-1 bg-transparent">
                    <Download className="h-4 w-4 mr-2" />
                    Descargar
                  </Button>
                  <Button variant="outline" onClick={() => window.open(voucher.file_url, "_blank")} className="flex-1">
                    <Eye className="h-4 w-4 mr-2" />
                    Ver
                  </Button>
                  {canConfirmVoucher && voucher.status === "pending" && (
                    <>
                      {isAdminUser && !voucher.admin_confirmed && (
                        <Button onClick={confirmVoucher} disabled={loading} className="flex-1">
                          <Check className="h-4 w-4 mr-2" />
                          Confirmar (Admin)
                        </Button>
                      )}
                      {isAccountingUser && !voucher.accounting_confirmed && (
                        <Button onClick={confirmVoucher} disabled={loading} className="flex-1">
                          <Check className="h-4 w-4 mr-2" />
                          Confirmar (Contab.)
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            /* Formulario para subir comprobante */
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Subir Comprobante de Pago</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    El comprobante será enviado a Administración y Contabilidad para su confirmación. Solo se aceptan
                    archivos JPG, PNG o PDF de máximo 10MB.
                  </AlertDescription>
                </Alert>

                <div>
                  <Label htmlFor="voucher-file">Seleccionar Archivo *</Label>
                  <Input
                    id="voucher-file"
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={handleFileSelect}
                    className="mt-1"
                  />
                  {selectedFile && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Archivo seleccionado: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="notes">Notas (Opcional)</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Agregar notas sobre el comprobante..."
                    className="mt-1"
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={uploadVoucher} disabled={!selectedFile || uploading}>
                    {uploading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Subiendo...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Subir Comprobante
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
