"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Edit, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

interface MovementEditDialogProps {
  open: boolean
  onClose: () => void
  movementId: string
  movementData: {
    id: string
    movement_type: string
    quantity: number
    movement_date: string
    entry_price: number | null
    exit_price: number | null
    total_amount: number | null
    purchase_order_number: string | null
    destination_entity_name: string | null
    destination_address: string | null
    destination_department_id: string | null
    supplier: string | null
    reason: string | null
    notes: string | null
    product_id: string
    products?: {
      name: string
      code: string
      unit_of_measure: string
    }
  }
  onSuccess?: () => void
}

export function MovementEditDialog({ open, onClose, movementId, movementData, onSuccess }: MovementEditDialogProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [departments, setDepartments] = useState<any[]>([])
  const [movementDate, setMovementDate] = useState<Date>(new Date(movementData.movement_date))

  // Form state
  const [formData, setFormData] = useState({
    entry_price: movementData.entry_price?.toString() || "",
    exit_price: movementData.exit_price?.toString() || "",
    total_amount: movementData.total_amount?.toString() || "",
    purchase_order_number: movementData.purchase_order_number || "",
    destination_entity_name: movementData.destination_entity_name || "",
    destination_address: movementData.destination_address || "",
    destination_department_id: movementData.destination_department_id || "",
    supplier: movementData.supplier || "",
    reason: movementData.reason || "",
    notes: movementData.notes || "",
  })

  useEffect(() => {
    if (open) {
      fetchDepartments()
    }
  }, [open])

  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from("peru_departments")
        .select("id, name")
        .order("name", { ascending: true })

      if (error) throw error
      setDepartments(data || [])
    } catch (error) {
      console.error("Error fetching departments:", error)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (movementData.movement_type === "entrada" && !formData.entry_price) {
        toast({
          title: "Campo requerido",
          description: "El precio de entrada es requerido para movimientos de entrada",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      if (movementData.movement_type === "salida" && !formData.exit_price) {
        toast({
          title: "Campo requerido",
          description: "El precio de salida es requerido para movimientos de salida",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      let calculatedTotalAmount = formData.total_amount ? Number.parseFloat(formData.total_amount) : null

      if (!calculatedTotalAmount) {
        if (movementData.movement_type === "entrada" && formData.entry_price) {
          calculatedTotalAmount = Number.parseFloat(formData.entry_price) * movementData.quantity
        } else if (movementData.movement_type === "salida" && formData.exit_price) {
          calculatedTotalAmount = Number.parseFloat(formData.exit_price) * movementData.quantity
        }
      }

      const updateData: any = {
        movement_date: movementDate.toISOString(),
        entry_price: formData.entry_price ? Number.parseFloat(formData.entry_price) : null,
        exit_price: formData.exit_price ? Number.parseFloat(formData.exit_price) : null,
        total_amount: calculatedTotalAmount,
        purchase_order_number: formData.purchase_order_number || null,
        destination_entity_name: formData.destination_entity_name || null,
        destination_address: formData.destination_address || null,
        destination_department_id: formData.destination_department_id || null,
        supplier: formData.supplier || null,
        reason: formData.reason || null,
        notes: formData.notes || null,
        updated_at: new Date().toISOString(),
        updated_by: user?.id || null
      }

      const { error: updateError } = await supabase.from("inventory_movements").update(updateData).eq("id", movementId)

      if (updateError) throw updateError

      toast({
        title: "Movimiento actualizado",
        description: "La información del movimiento se actualizó correctamente",
      })

      if (onSuccess) {
        onSuccess()
      }

      onClose()
    } catch (error: any) {
      console.error("Error updating movement:", error)
      toast({
        title: "Error",
        description: error.message || "Error al actualizar el movimiento",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Editar Movimiento de Inventario
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información del producto y tipo de movimiento */}
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Producto</p>
                <p className="font-medium">{movementData.products?.name || "N/A"}</p>
                <p className="text-xs text-muted-foreground">Código: {movementData.products?.code || "N/A"}</p>
              </div>
              <Badge className={getMovementTypeColor(movementData.movement_type)}>
                {movementData.movement_type.charAt(0).toUpperCase() + movementData.movement_type.slice(1)}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span>
                <strong>Cantidad:</strong> {movementData.quantity}{" "}
                {movementData.products?.unit_of_measure || "unidades"}
              </span>
            </div>
          </div>

          {/* Fecha del movimiento */}
          <div className="space-y-2">
            <Label htmlFor="movement_date">Fecha del Movimiento *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal", !movementDate && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {movementDate ? format(movementDate, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={movementDate}
                  onSelect={(date) => date && setMovementDate(date)}
                  initialFocus
                  locale={es}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Precios según tipo de movimiento */}
          {movementData.movement_type === "entrada" && (
            <div className="space-y-2">
              <Label htmlFor="entry_price">Precio de Entrada (Unitario) *</Label>
              <Input
                id="entry_price"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.entry_price}
                onChange={(e) => handleInputChange("entry_price", e.target.value)}
                required
              />
            </div>
          )}

          {movementData.movement_type === "salida" && (
            <div className="space-y-2">
              <Label htmlFor="exit_price">Precio de Salida (Unitario) *</Label>
              <Input
                id="exit_price"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.exit_price}
                onChange={(e) => handleInputChange("exit_price", e.target.value)}
                required
              />
            </div>
          )}

          {/* Monto total */}
          <div className="space-y-2">
            <Label htmlFor="total_amount">Monto Total</Label>
            <Input
              id="total_amount"
              type="number"
              step="0.01"
              placeholder="Se calculará automáticamente si se deja vacío"
              value={formData.total_amount}
              onChange={(e) => handleInputChange("total_amount", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Si se deja vacío, se calculará automáticamente: precio unitario × cantidad
            </p>
          </div>

          {movementData.movement_type === "salida" && (
          <div className="space-y-2">
            <Label htmlFor="purchase_order_number">Número de Orden de Compra</Label>
            <Input
              id="purchase_order_number"
              type="text"
              placeholder="Ej: OC-2024-001"
              value={formData.purchase_order_number}
              onChange={(e) => handleInputChange("purchase_order_number", e.target.value)}
            />
          </div>
          )}

          {/* Proveedor (para entradas) */}
          {movementData.movement_type === "entrada" && (
            <div className="space-y-2">
              <Label htmlFor="supplier">Proveedor</Label>
              <Input
                id="supplier"
                type="text"
                placeholder="Nombre del proveedor"
                value={formData.supplier}
                onChange={(e) => handleInputChange("supplier", e.target.value)}
              />
            </div>
          )}

          {/* Cliente/Entidad destino (para salidas) */}
          {movementData.movement_type === "salida" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="destination_entity_name">Cliente/Entidad Destino</Label>
                <Input
                  id="destination_entity_name"
                  type="text"
                  placeholder="Nombre del cliente o entidad"
                  value={formData.destination_entity_name}
                  onChange={(e) => handleInputChange("destination_entity_name", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="destination_address">Dirección de Destino</Label>
                <Input
                  id="destination_address"
                  type="text"
                  placeholder="Dirección completa"
                  value={formData.destination_address}
                  onChange={(e) => handleInputChange("destination_address", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="destination_department_id">Departamento de Destino</Label>
                <Select
                  value={formData.destination_department_id}
                  onValueChange={(value) => handleInputChange("destination_department_id", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar departamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* Motivo */}
          <div className="space-y-2">
            <Label htmlFor="reason">Motivo del Movimiento</Label>
            <Input
              id="reason"
              type="text"
              placeholder="Ej: Compra de inventario, Venta a cliente, Ajuste por inventario físico"
              value={formData.reason}
              onChange={(e) => handleInputChange("reason", e.target.value)}
            />
          </div>

          {/* Notas */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notas Adicionales</Label>
            <Textarea
              id="notes"
              placeholder="Información adicional sobre el movimiento..."
              value={formData.notes}
              onChange={(e) => handleInputChange("notes", e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar Cambios"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
