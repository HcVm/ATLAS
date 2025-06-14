"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"

interface MovementFormDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: any) => void
  selectedProduct?: any
}

export function MovementFormDialog({ open, onClose, onSubmit, selectedProduct }: MovementFormDialogProps) {
  const { user } = useAuth()
  const [products, setProducts] = useState<any[]>([])
  const [formData, setFormData] = useState({
    product_id: selectedProduct?.id || "",
    movement_type: "",
    quantity: "",
    unit_cost: "",
    reference_document: "",
    destination: "",
    supplier: "",
    reason: "",
    notes: "",
  })

  useEffect(() => {
    if (user?.company_id) {
      fetchProducts()
    }
  }, [user?.company_id])

  useEffect(() => {
    if (selectedProduct) {
      setFormData((prev) => ({ ...prev, product_id: selectedProduct.id }))
    }
  }, [selectedProduct])

  const fetchProducts = async () => {
    const { data } = await supabase
      .from("products")
      .select("id, name, code")
      .eq("company_id", user.company_id)
      .eq("is_active", true)
      .order("name")

    setProducts(data || [])
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const totalCost =
      formData.unit_cost && formData.quantity
        ? Number.parseFloat(formData.unit_cost) * Number.parseInt(formData.quantity)
        : null

    onSubmit({
      ...formData,
      quantity: Number.parseInt(formData.quantity),
      unit_cost: formData.unit_cost ? Number.parseFloat(formData.unit_cost) : null,
      total_cost: totalCost,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo Movimiento de Inventario</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="product_id">Producto</Label>
            <Select
              value={formData.product_id}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, product_id: value }))}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar producto" />
              </SelectTrigger>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name} ({product.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="movement_type">Tipo de Movimiento</Label>
            <Select
              value={formData.movement_type}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, movement_type: value }))}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="entrada">Entrada</SelectItem>
                <SelectItem value="salida">Salida</SelectItem>
                <SelectItem value="ajuste">Ajuste</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="quantity">Cantidad</Label>
              <Input
                id="quantity"
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData((prev) => ({ ...prev, quantity: e.target.value }))}
                required
                min="1"
              />
            </div>
            <div>
              <Label htmlFor="unit_cost">Costo Unitario</Label>
              <Input
                id="unit_cost"
                type="number"
                step="0.01"
                value={formData.unit_cost}
                onChange={(e) => setFormData((prev) => ({ ...prev, unit_cost: e.target.value }))}
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="reference_document">Documento de Referencia</Label>
            <Input
              id="reference_document"
              value={formData.reference_document}
              onChange={(e) => setFormData((prev) => ({ ...prev, reference_document: e.target.value }))}
              placeholder="Ej: FAC-001, GR-123"
            />
          </div>

          {formData.movement_type === "salida" && (
            <div>
              <Label htmlFor="destination">Destino</Label>
              <Input
                id="destination"
                value={formData.destination}
                onChange={(e) => setFormData((prev) => ({ ...prev, destination: e.target.value }))}
                placeholder="Destino de la salida"
              />
            </div>
          )}

          {formData.movement_type === "entrada" && (
            <div>
              <Label htmlFor="supplier">Proveedor</Label>
              <Input
                id="supplier"
                value={formData.supplier}
                onChange={(e) => setFormData((prev) => ({ ...prev, supplier: e.target.value }))}
                placeholder="Nombre del proveedor"
              />
            </div>
          )}

          {formData.movement_type === "ajuste" && (
            <div>
              <Label htmlFor="reason">Motivo del Ajuste</Label>
              <Input
                id="reason"
                value={formData.reason}
                onChange={(e) => setFormData((prev) => ({ ...prev, reason: e.target.value }))}
                placeholder="Motivo del ajuste"
              />
            </div>
          )}

          <div>
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Notas adicionales (opcional)"
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">Crear Movimiento</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
