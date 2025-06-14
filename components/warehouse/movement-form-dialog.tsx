"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Package, DollarSign } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"

interface Product {
  id: string
  name: string
  code: string
  current_stock: number
  minimum_stock: number
  unit_of_measure: string
  cost_price: number
  sale_price: number
}

interface Department {
  id: string
  name: string
  code: string
}

interface DestinationEntity {
  id: string
  name: string
  entity_type: string
  document_number: string
  address: string
}

interface MovementFormDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: any) => void
  selectedProduct?: any
}

export function MovementFormDialog({ open, onClose, onSubmit, selectedProduct }: MovementFormDialogProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [products, setProducts] = useState<Product[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [entities, setEntities] = useState<DestinationEntity[]>([])
  const [selectedProductData, setSelectedProductData] = useState<Product | null>(null)
  const [formData, setFormData] = useState({
    product_id: selectedProduct?.id || "",
    movement_type: "",
    quantity: "",
    unit_cost: "",
    unit_price: "",
    purchase_order_number: "",
    destination_entity_id: "",
    destination: "",
    supplier: "",
    reason: "",
    notes: "",
  })

  useEffect(() => {
    if (user?.company_id && open) {
      fetchData()
    }
  }, [user?.company_id, open])

  useEffect(() => {
    if (selectedProduct) {
      setFormData((prev) => ({ ...prev, product_id: selectedProduct.id }))
      handleProductChange(selectedProduct.id)
    }
  }, [selectedProduct])

  const fetchData = async () => {
    try {
      // Obtener productos
      const { data: productsData } = await supabase
        .from("products")
        .select("id, name, code, current_stock, minimum_stock, unit_of_measure, cost_price, sale_price")
        .eq("company_id", user.company_id)
        .eq("is_active", true)
        .order("name")

      // Obtener departamentos del Perú
      const { data: departmentsData } = await supabase.from("peru_departments").select("id, name, code").order("name")

      // Obtener entidades destino
      const { data: entitiesData } = await supabase
        .from("destination_entities")
        .select("id, name, entity_type, document_number, address")
        .eq("company_id", user.company_id)
        .eq("is_active", true)
        .order("name")

      setProducts(productsData || [])
      setDepartments(departmentsData || [])
      setEntities(entitiesData || [])
    } catch (error) {
      console.error("Error fetching data:", error)
    }
  }

  const handleProductChange = (productId: string) => {
    const product = products.find((p) => p.id === productId)
    setSelectedProductData(product || null)

    if (product) {
      setFormData((prev) => ({
        ...prev,
        product_id: productId,
        unit_cost: product.cost_price.toString(),
        unit_price: product.sale_price.toString(),
      }))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validaciones
    if (!selectedProductData) {
      toast({
        title: "Error",
        description: "Selecciona un producto",
        variant: "destructive",
      })
      return
    }

    const quantity = Number.parseInt(formData.quantity)
    if (!quantity || quantity <= 0) {
      toast({
        title: "Error",
        description: "La cantidad debe ser mayor a 0",
        variant: "destructive",
      })
      return
    }

    // Validar stock para salidas
    if (formData.movement_type === "salida" && quantity > selectedProductData.current_stock) {
      toast({
        title: "Stock insuficiente",
        description: `Stock disponible: ${selectedProductData.current_stock} ${selectedProductData.unit_of_measure}`,
        variant: "destructive",
      })
      return
    }

    // Validar campos requeridos para salidas
    if (formData.movement_type === "salida") {
      if (!formData.purchase_order_number) {
        toast({
          title: "Error",
          description: "El número de orden de compra es requerido para salidas",
          variant: "destructive",
        })
        return
      }
      if (!formData.destination_entity_id && !formData.destination) {
        toast({
          title: "Error",
          description: "Selecciona una entidad destino o especifica el destino",
          variant: "destructive",
        })
        return
      }
    }

    const unitPrice = formData.unit_price ? Number.parseFloat(formData.unit_price) : null
    const totalAmount = unitPrice ? unitPrice * quantity : null

    onSubmit({
      ...formData,
      quantity,
      unit_cost: formData.unit_cost ? Number.parseFloat(formData.unit_cost) : null,
      unit_price: unitPrice,
      total_cost: formData.unit_cost ? Number.parseFloat(formData.unit_cost) * quantity : null,
      total_amount: totalAmount,
      destination_entity_id: formData.destination_entity_id || null,
    })

    // Limpiar formulario
    setFormData({
      product_id: "",
      movement_type: "",
      quantity: "",
      unit_cost: "",
      unit_price: "",
      purchase_order_number: "",
      destination_entity_id: "",
      destination: "",
      supplier: "",
      reason: "",
      notes: "",
    })
    setSelectedProductData(null)
  }

  const getStockWarning = () => {
    if (!selectedProductData) return null

    if (selectedProductData.current_stock === 0) {
      return (
        <div className="flex items-center gap-2 text-red-600 text-sm">
          <AlertTriangle className="h-4 w-4" />
          Sin stock disponible
        </div>
      )
    }

    if (selectedProductData.current_stock <= selectedProductData.minimum_stock) {
      return (
        <div className="flex items-center gap-2 text-orange-600 text-sm">
          <AlertTriangle className="h-4 w-4" />
          Stock bajo
        </div>
      )
    }

    return null
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "PEN",
    }).format(amount)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo Movimiento de Inventario</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Selección de producto */}
          <div className="space-y-2">
            <Label htmlFor="product_id">Producto *</Label>
            <Select value={formData.product_id} onValueChange={handleProductChange} required>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar producto" />
              </SelectTrigger>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>
                        {product.name} ({product.code})
                      </span>
                      <Badge variant={product.current_stock <= product.minimum_stock ? "destructive" : "default"}>
                        {product.current_stock} {product.unit_of_measure}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Información del producto seleccionado */}
          {selectedProductData && (
            <Card>
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-muted-foreground">Stock actual</Label>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {selectedProductData.current_stock} {selectedProductData.unit_of_measure}
                      </span>
                      {getStockWarning()}
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Stock mínimo</Label>
                    <p className="font-medium">
                      {selectedProductData.minimum_stock} {selectedProductData.unit_of_measure}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground flex items-center gap-1">
                      <Package className="h-3 w-3" />
                      Precio de costo
                    </Label>
                    <p className="font-medium">{formatCurrency(selectedProductData.cost_price)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      Precio de venta
                    </Label>
                    <p className="font-medium text-green-600">{formatCurrency(selectedProductData.sale_price)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tipo de movimiento */}
          <div className="space-y-2">
            <Label htmlFor="movement_type">Tipo de Movimiento *</Label>
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

          {/* Cantidad y precios */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="quantity">{formData.movement_type === "ajuste" ? "Nuevo Stock *" : "Cantidad *"}</Label>
              <Input
                id="quantity"
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData((prev) => ({ ...prev, quantity: e.target.value }))}
                required
                min="1"
                max={formData.movement_type === "salida" ? selectedProductData?.current_stock : undefined}
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
            {formData.movement_type === "salida" && (
              <div>
                <Label htmlFor="unit_price">Precio Unitario</Label>
                <Input
                  id="unit_price"
                  type="number"
                  step="0.01"
                  value={formData.unit_price}
                  onChange={(e) => setFormData((prev) => ({ ...prev, unit_price: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
            )}
          </div>

          {/* Campos específicos para salidas */}
          {formData.movement_type === "salida" && (
            <div className="space-y-4 border-t pt-4">
              <h4 className="font-medium">Información de Salida</h4>

              <div>
                <Label htmlFor="purchase_order_number">Número de Orden de Compra *</Label>
                <Input
                  id="purchase_order_number"
                  value={formData.purchase_order_number}
                  onChange={(e) => setFormData((prev) => ({ ...prev, purchase_order_number: e.target.value }))}
                  placeholder="Ej: OC-2024-001"
                  required
                />
              </div>

              <div>
                <Label htmlFor="destination_entity_id">Entidad Destino</Label>
                <Select
                  value={formData.destination_entity_id}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, destination_entity_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar entidad" />
                  </SelectTrigger>
                  <SelectContent>
                    {entities.map((entity) => (
                      <SelectItem key={entity.id} value={entity.id}>
                        <div>
                          <div className="font-medium">{entity.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {entity.entity_type} - {entity.document_number}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="destination">Destino Manual (si no hay entidad)</Label>
                <Input
                  id="destination"
                  value={formData.destination}
                  onChange={(e) => setFormData((prev) => ({ ...prev, destination: e.target.value }))}
                  placeholder="Especificar destino manualmente"
                />
              </div>
            </div>
          )}

          {/* Campos específicos para entradas */}
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

          {/* Campos específicos para ajustes */}
          {formData.movement_type === "ajuste" && (
            <div>
              <Label htmlFor="reason">Motivo del Ajuste *</Label>
              <Input
                id="reason"
                value={formData.reason}
                onChange={(e) => setFormData((prev) => ({ ...prev, reason: e.target.value }))}
                placeholder="Motivo del ajuste"
                required
              />
            </div>
          )}

          {/* Notas */}
          <div>
            <Label htmlFor="notes">Notas Adicionales</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Información adicional (opcional)"
              rows={3}
            />
          </div>

          {/* Resumen */}
          {formData.quantity && selectedProductData && (
            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <h4 className="font-medium mb-2">Resumen</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Cantidad:</span>
                    <p className="font-medium">
                      {formData.quantity} {selectedProductData.unit_of_measure}
                    </p>
                  </div>
                  {formData.unit_price && (
                    <div>
                      <span className="text-muted-foreground">Total:</span>
                      <p className="font-medium text-green-600">
                        {formatCurrency(Number.parseFloat(formData.unit_price) * Number.parseInt(formData.quantity))}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

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
