"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Upload,
  FileText,
  Check,
  X,
  Clock,
  AlertTriangle,
  Download,
  Eye,
  User,
  Calendar,
  DollarSign,
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useCompany } from "@/lib/company-context"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { createNotification } from "@/lib/notifications"

interface PaymentVoucherDialogProps {
  sale: {
    id: string
    sale_number?: string
    entity_name: string
    total_sale: number
    sale_date: string
    payment_vouchers?: Array<{
      id: string
      status: "pending" | "confirmed" | "rejected"
      admin_confirmed: boolean
      accounting_confirmed: boolean
      file_name: string
      file_url?: string
      upload_date: string
      uploaded_by: string
      admin_notes?: string
      accounting_notes?: string
      profiles?: {
        full_name: string
      }
    }>
  }
  open: boolean
  onOpenChange: (open: boolean) => void
  onVoucherUploaded: () => void
}

export default function PaymentVoucherDialog({
  sale,
  open,
  onOpenChange,
  onVoucherUploaded,
}: PaymentVoucherDialogProps) {
  const { user } = useAuth()
  const { selectedCompany } = useCompany()
  const [uploading, setUploading] = useState(false)
  const [confirmingAdmin, setConfirmingAdmin] = useState(false)
  const [confirmingAccounting, setConfirmingAccounting] = useState(false)
  const [adminNotes, setAdminNotes] = useState("")
  const [accountingNotes, setAccountingNotes] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const currentVoucher = sale.payment_vouchers?.[0]
  const canUpload = user?.departments?.name === "Ventas" || user?.role === "admin"
  const canConfirmAdmin = user?.departments?.name === "Administración" || user?.role === "admin"
  const canConfirmAccounting = user?.departments?.name === "Contabilidad" || user?.role === "admin"

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "application/pdf"]
    if (!allowedTypes.includes(file.type)) {
      toast.error("Solo se permiten archivos JPG, PNG o PDF")
      return
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("El archivo no puede ser mayor a 10MB")
      return
    }

    setUploading(true)

    try {
      // Upload file to Supabase Storage
      const fileExt = file.name.split(".").pop()
      const fileName = `${sale.id}_${Date.now()}.${fileExt}`
      const filePath = `payment-vouchers/${fileName}`

      const { error: uploadError } = await supabase.storage.from("payment-vouchers").upload(filePath, file)

      if (uploadError) throw uploadError

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("payment-vouchers").getPublicUrl(filePath)

      // Save voucher record to database
      const { data: voucherData, error: dbError } = await supabase
        .from("payment_vouchers")
        .insert({
          sale_id: sale.id,
          file_name: file.name,
          file_url: filePath,
          uploaded_by: user?.id,
          status: "pending",
          admin_confirmed: false,
          accounting_confirmed: false,
        })
        .select()
        .single()

      if (dbError) throw dbError

      console.log("🧾 Comprobante subido exitosamente:", voucherData)

      // Send notifications
      await sendVoucherNotifications(voucherData.id)

      toast.success("Comprobante de pago subido exitosamente")
      onVoucherUploaded()
    } catch (error: any) {
      console.error("Error uploading voucher:", error)
      toast.error("Error al subir el comprobante: " + error.message)
    } finally {
      setUploading(false)
    }
  }

  const sendVoucherNotifications = async (voucherId: string) => {
    if (!selectedCompany) {
      console.warn("⚠️ No hay empresa seleccionada para enviar notificaciones")
      return
    }

    console.log("📧 Enviando notificaciones para comprobante:", voucherId)
    console.log("🏢 Empresa seleccionada:", selectedCompany.id)

    try {
      // Primero obtener los departamentos específicos de la empresa
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
        console.warn("⚠️ No se encontraron departamentos de Administración o Contabilidad")
        return
      }

      const departmentIds = departments.map((dept) => dept.id)
      console.log("🆔 IDs de departamentos:", departmentIds)

      // Luego obtener usuarios de esos departamentos específicos
      const { data: targetUsers, error: usersError } = await supabase
        .from("profiles")
        .select(`
          id, 
          full_name, 
          department_id,
          departments!profiles_department_id_fkey (
            id,
            name
          )
        `)
        .eq("company_id", selectedCompany.id)
        .in("department_id", departmentIds)

      if (usersError) {
        console.error("❌ Error obteniendo usuarios:", usersError)
        return
      }

      console.log("👥 Usuarios encontrados:", targetUsers?.length || 0)
      console.log("📋 Detalle de usuarios:", targetUsers)

      if (!targetUsers || targetUsers.length === 0) {
        console.warn("⚠️ No se encontraron usuarios de Administración o Contabilidad")
        return
      }

      // Enviar notificaciones
      let successCount = 0
      let errorCount = 0

      for (const targetUser of targetUsers) {
        try {
          console.log(
            `📧 Enviando notificación a ${targetUser.full_name} (${targetUser.departments?.name || "undefined"})`,
          )

          const result = await createNotification({
            userId: targetUser.id,
            title: "🧾 Nuevo Comprobante de Pago",
            message: `Se ha subido un comprobante de pago para la venta de ${sale.entity_name} por S/ ${sale.total_sale.toLocaleString("es-PE", { minimumFractionDigits: 2 })}. Requiere confirmación.`,
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
          console.error(`❌ Error enviando notificación a ${targetUser.full_name}:`, error)
          errorCount++
        }
      }

      console.log(`📊 Resumen de notificaciones: ${successCount} exitosas, ${errorCount} fallidas`)
    } catch (error) {
      console.error("❌ Error general enviando notificaciones:", error)
    }
  }

  const handleAdminConfirmation = async (confirmed: boolean) => {
    if (!currentVoucher) return

    setConfirmingAdmin(true)

    try {
      const { error } = await supabase
        .from("payment_vouchers")
        .update({
          admin_confirmed: confirmed,
          admin_notes: adminNotes || null,
          status: confirmed && currentVoucher.accounting_confirmed ? "confirmed" : !confirmed ? "rejected" : "pending",
        })
        .eq("id", currentVoucher.id)

      if (error) throw error

      toast.success(
        confirmed ? "Comprobante confirmado por Administración" : "Comprobante rechazado por Administración",
      )
      onVoucherUploaded()
    } catch (error: any) {
      console.error("Error updating admin confirmation:", error)
      toast.error("Error al actualizar confirmación: " + error.message)
    } finally {
      setConfirmingAdmin(false)
    }
  }

  const handleAccountingConfirmation = async (confirmed: boolean) => {
    if (!currentVoucher) return

    setConfirmingAccounting(true)

    try {
      const { error } = await supabase
        .from("payment_vouchers")
        .update({
          accounting_confirmed: confirmed,
          accounting_notes: accountingNotes || null,
          status: confirmed && currentVoucher.admin_confirmed ? "confirmed" : !confirmed ? "rejected" : "pending",
        })
        .eq("id", currentVoucher.id)

      if (error) throw error

      toast.success(confirmed ? "Comprobante confirmado por Contabilidad" : "Comprobante rechazado por Contabilidad")
      onVoucherUploaded()
    } catch (error: any) {
      console.error("Error updating accounting confirmation:", error)
      toast.error("Error al actualizar confirmación: " + error.message)
    } finally {
      setConfirmingAccounting(false)
    }
  }

  const handleDownloadVoucher = () => {
    if (currentVoucher?.file_url) {
      window.open(currentVoucher.file_url, "_blank")
    }
  }

  const getStatusBadge = () => {
    if (!currentVoucher) {
      return (
        <Badge variant="outline" className="text-gray-500">
          <FileText className="h-3 w-3 mr-1" />
          Sin comprobante
        </Badge>
      )
    }

    switch (currentVoucher.status) {
      case "confirmed":
        return (
          <Badge variant="default" className="text-green-600 bg-green-50 border-green-200">
            <Check className="h-3 w-3 mr-1" />
            Confirmado
          </Badge>
        )
      case "rejected":
        return (
          <Badge variant="destructive">
            <X className="h-3 w-3 mr-1" />
            Rechazado
          </Badge>
        )
      default:
        const confirmations = []
        if (currentVoucher.admin_confirmed) confirmations.push("Admin")
        if (currentVoucher.accounting_confirmed) confirmations.push("Contab")

        if (confirmations.length > 0) {
          return (
            <Badge variant="outline" className="text-yellow-600 border-yellow-600">
              <Clock className="h-3 w-3 mr-1" />
              Parcial ({confirmations.join(", ")})
            </Badge>
          )
        }

        return (
          <Badge variant="outline" className="text-yellow-600 border-yellow-600">
            <Clock className="h-3 w-3 mr-1" />
            Pendiente
          </Badge>
        )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Comprobante de Pago
          </DialogTitle>
          <DialogDescription>
            Gestiona el comprobante de pago para la venta #{sale.sale_number || sale.id.slice(0, 8)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Sale Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Información de la Venta
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground uppercase">Cliente</Label>
                  <p className="font-medium">{sale.entity_name}</p>
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground uppercase">Monto Total</Label>
                  <p className="font-bold text-lg">
                    S/ {sale.total_sale.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground uppercase">Fecha de Venta</Label>
                  <p>{format(new Date(sale.sale_date), "dd/MM/yyyy", { locale: es })}</p>
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground uppercase">Estado</Label>
                  {getStatusBadge()}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Upload Section */}
          {!currentVoucher && canUpload && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Subir Comprobante</CardTitle>
                <CardDescription>Sube el comprobante de pago en formato JPG, PNG o PDF (máximo 10MB)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground mb-4">
                    Arrastra y suelta tu archivo aquí, o haz clic para seleccionar
                  </p>
                  <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                    {uploading ? "Subiendo..." : "Seleccionar Archivo"}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Current Voucher */}
          {currentVoucher && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Comprobante Actual
                  </span>
                  {getStatusBadge()}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground uppercase">Archivo</Label>
                    <p className="font-medium">{currentVoucher.file_name}</p>
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground uppercase">Subido por</Label>
                    <p className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {currentVoucher.profiles?.full_name || "Usuario"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground uppercase">Fecha de subida</Label>
                    <p className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(currentVoucher.upload_date), "dd/MM/yyyy HH:mm", { locale: es })}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleDownloadVoucher}>
                    <Download className="h-4 w-4 mr-2" />
                    Descargar
                  </Button>
                  <Button variant="outline" onClick={handleDownloadVoucher}>
                    <Eye className="h-4 w-4 mr-2" />
                    Ver
                  </Button>
                </div>

                <Separator />

                {/* Confirmation Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Estado de Administración</Label>
                    <div className="flex items-center gap-2">
                      {currentVoucher.admin_confirmed ? (
                        <Badge variant="default" className="text-green-600 bg-green-50">
                          <Check className="h-3 w-3 mr-1" />
                          Confirmado
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-yellow-600">
                          <Clock className="h-3 w-3 mr-1" />
                          Pendiente
                        </Badge>
                      )}
                    </div>
                    {currentVoucher.admin_notes && (
                      <p className="text-sm text-muted-foreground bg-muted p-2 rounded">{currentVoucher.admin_notes}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Estado de Contabilidad</Label>
                    <div className="flex items-center gap-2">
                      {currentVoucher.accounting_confirmed ? (
                        <Badge variant="default" className="text-green-600 bg-green-50">
                          <Check className="h-3 w-3 mr-1" />
                          Confirmado
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-yellow-600">
                          <Clock className="h-3 w-3 mr-1" />
                          Pendiente
                        </Badge>
                      )}
                    </div>
                    {currentVoucher.accounting_notes && (
                      <p className="text-sm text-muted-foreground bg-muted p-2 rounded">
                        {currentVoucher.accounting_notes}
                      </p>
                    )}
                  </div>
                </div>

                {/* Admin Confirmation */}
                {canConfirmAdmin && !currentVoucher.admin_confirmed && currentVoucher.status !== "rejected" && (
                  <Card className="border-blue-200 bg-blue-50/50">
                    <CardHeader>
                      <CardTitle className="text-base text-blue-800">Confirmación de Administración</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <Label htmlFor="admin-notes">Notas (opcional)</Label>
                        <Textarea
                          id="admin-notes"
                          placeholder="Agregar comentarios sobre el comprobante..."
                          value={adminNotes}
                          onChange={(e) => setAdminNotes(e.target.value)}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleAdminConfirmation(true)}
                          disabled={confirmingAdmin}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Check className="h-4 w-4 mr-2" />
                          {confirmingAdmin ? "Confirmando..." : "Confirmar"}
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => handleAdminConfirmation(false)}
                          disabled={confirmingAdmin}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Rechazar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Accounting Confirmation */}
                {canConfirmAccounting &&
                  !currentVoucher.accounting_confirmed &&
                  currentVoucher.status !== "rejected" && (
                    <Card className="border-purple-200 bg-purple-50/50">
                      <CardHeader>
                        <CardTitle className="text-base text-purple-800">Confirmación de Contabilidad</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <Label htmlFor="accounting-notes">Notas (opcional)</Label>
                          <Textarea
                            id="accounting-notes"
                            placeholder="Agregar comentarios sobre el comprobante..."
                            value={accountingNotes}
                            onChange={(e) => setAccountingNotes(e.target.value)}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleAccountingConfirmation(true)}
                            disabled={confirmingAccounting}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Check className="h-4 w-4 mr-2" />
                            {confirmingAccounting ? "Confirmando..." : "Confirmar"}
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => handleAccountingConfirmation(false)}
                            disabled={confirmingAccounting}
                          >
                            <X className="h-4 w-4 mr-2" />
                            Rechazar
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                {/* Rejection Notice */}
                {currentVoucher.status === "rejected" && (
                  <Card className="border-red-200 bg-red-50/50">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2 text-red-800">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="font-medium">Comprobante Rechazado</span>
                      </div>
                      <p className="text-sm text-red-700 mt-2">
                        Este comprobante ha sido rechazado. Contacta con el departamento correspondiente para más
                        información.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
