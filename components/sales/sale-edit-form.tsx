"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase"
import { useCompany } from "@/lib/company-context"
import { useAuth } from "@/lib/auth-context"

interface Sale {
  id: string
  sale_number: string
  entity_name: string
  entity_contact: string
  entity_phone: string
  entity_email: string
  product_name: string
  quantity: number
  unit_price: number
  total_amount: number
  sale_date: string
  status: string
  notes?: string
  quotation_id?: string
}

interface SaleEditFormProps {
  sale: Sale | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function SaleEditForm({ sale, open, onOpenChange, onSuccess }: SaleEditFormProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<Partial<Sale>>({})
  const { currentCompany } = useCompany()
  const { user } = useAuth()

  useEffect(() => {
    if (sale) {
      setFormData({
        entity_name: sale.entity_name,
        entity_contact: sale.entity_contact,
        entity_phone: sale.entity_phone,
        entity_email: sale.entity_email,
        product_name: sale.product_name,
        quantity: sale.quantity,
        unit_price: sale.unit_price,
        sale_date: sale.sale_date,
        status: sale.status,
        notes: sale.notes || "",
      })
    }
  }, [sale])

  const calculateTotal = () => {
    const quantity = formData.quantity || 0
    const unitPrice = formData.unit_price || 0
    return quantity * unitPrice
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sale || !currentCompany || !user) return

    setLoading(true)
    try {
      const supabase = createClient()

      const totalAmount = calculateTotal()

      const { error } = await supabase
        .from("sales")
        .update({
          entity_name: formData.entity_name,
          entity_contact: formData.entity_contact,
          entity_phone: formData.entity_phone,
          entity_email: formData.entity_email,
          product_name: formData.product_name,
          quantity: formData.quantity,
          unit_price: formData.unit_price,
          total_amount: totalAmount,
          sale_date: formData.sale_date,
          status: formData.status,
          notes: formData.notes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", sale.id)
        .eq("company_id", currentCompany.id)

      if (error) throw error

      toast.success("Venta actualizada exitosamente")
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error("Error al actualizar venta:", error)
      toast.error("Error al actualizar la venta")
    } finally {
      setLoading(false)
    }
  }

  if (!sale) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Venta - {sale.sale_number}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Información del cliente */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="entity_name">Nombre del Cliente *</Label>
              <Input
                id="entity_name"
                value={formData.entity_name || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, entity_name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="entity_contact">Contacto</Label>
              <Input
                id="entity_contact"
                value={formData.entity_contact || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, entity_contact: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="entity_phone">Teléfono</Label>
              <Input
                id="entity_phone"
                value={formData.entity_phone || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, entity_phone: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="entity_email">Email</Label>
              <Input
                id="entity_email"
                type="email"
                value={formData.entity_email || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, entity_email: e.target.value }))}
              />
            </div>
          </div>

          {/* Información del producto */}
          <div className="space-y-2">
            <Label htmlFor="product_name">Producto/Servicio *</Label>
            <Input
              id="product_name"
              value={formData.product_name || ""}
              onChange={(e) => setFormData((prev) => ({ ...prev, product_name: e.target.value }))}
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Cantidad *</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                step="1"
                value={formData.quantity || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, quantity: Number.parseInt(e.target.value) || 0 }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit_price">Precio Unitario *</Label>
              <Input
                id="unit_price"
                type="number"
                min="0"
                step="0.01"
                value={formData.unit_price || ""}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, unit_price: Number.parseFloat(e.target.value) || 0 }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Total</Label>
              <Input value={`$${calculateTotal().toFixed(2)}`} disabled className="bg-muted" />
            </div>
          </div>

          {/* Fecha y estado */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sale_date">Fecha de Venta *</Label>
              <Input
                id="sale_date"
                type="date"
                value={formData.sale_date || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, sale_date: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Estado</Label>
              <Select
                value={formData.status || "pending"}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="confirmed">Confirmada</SelectItem>
                  <SelectItem value="delivered">Entregada</SelectItem>
                  <SelectItem value="cancelled">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notas */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              value={formData.notes || ""}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              rows={3}
            />
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
