"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DatePicker } from "@/components/ui/date-picker"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Plus } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useCompany } from "@/lib/company-context"
import { createClient } from "@/lib/supabase"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface Product {
  id: string
  code: string
  name: string
  description: string | null
  sale_price: number
  current_stock: number
  unit_of_measure: string
  brands?: {
    name: string
  }
}

interface SalesEntity {
  id: string
  name: string
  ruc: string
  executing_unit: string | null
}

interface SaleFormProps {
  onSuccess: () => void
}

export default function SaleForm({ onSuccess }: SaleFormProps) {
  const { user } = useAuth()
  const { selectedCompany } = useCompany()
  const [loading, setLoading] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [entities, setEntities] = useState<SalesEntity[]>([])
  const [showNewEntityDialog, setShowNewEntityDialog] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    entity_id: "",
    entity_name: "",
    entity_ruc: "",
    entity_executing_unit: "",
    quotation_code: "",
    exp_siaf: "",
    quantity: "",
    product_id: "",
    product_code: "",
    product_name: "",
    product_description: "",
    product_brand: "",
    ocam: "",
    physical_order: "",
    project_meta: "",
    final_destination: "",
    warehouse_manager: "",
    payment_method: "",
    unit_price_with_tax: "",
    delivery_date: undefined as Date | undefined,
    delivery_term: "",
    observations: "",
  })

  // New entity form
  const [newEntity, setNewEntity] = useState({
    name: "",
    ruc: "",
    executing_unit: "",
  })

  const [stockWarning, setStockWarning] = useState("")
  const [totalSale, setTotalSale] = useState(0)

  const supabase = createClient()

  useEffect(() => {
    if (selectedCompany) {
      fetchProducts()
      fetchEntities()
    }
  }, [selectedCompany])

  // Calcular total cuando cambian cantidad o precio
  useEffect(() => {
    const quantity = Number.parseFloat(formData.quantity) || 0
    const unitPrice = Number.parseFloat(formData.unit_price_with_tax) || 0
    setTotalSale(quantity * unitPrice)
  }, [formData.quantity, formData.unit_price_with_tax])

  // Verificar stock cuando cambia la cantidad
  useEffect(() => {
    if (formData.product_id && formData.quantity) {
      const product = products.find((p) => p.id === formData.product_id)
      const requestedQuantity = Number.parseFloat(formData.quantity)

      if (product && requestedQuantity > product.current_stock) {
        setStockWarning(
          `⚠️ Stock insuficiente. Disponible: ${product.current_stock} ${product.unit_of_measure}. Se necesita comprar ${requestedQuantity - product.current_stock} unidades adicionales.`,
        )
      } else {
        setStockWarning("")
      }
    }
  }, [formData.product_id, formData.quantity, products])

  const fetchProducts = async () => {
    if (!selectedCompany) return

    try {
      const { data, error } = await supabase
        .from("products")
        .select(`
          id, code, name, description, sale_price, current_stock, unit_of_measure,
          brands (name)
        `)
        .eq("company_id", selectedCompany.id)
        .eq("is_active", true)
        .order("name")

      if (error) throw error
      setProducts(data || [])
    } catch (error: any) {
      console.error("Error fetching products:", error)
      toast.error("Error al cargar productos")
    }
  }

  const fetchEntities = async () => {
    if (!selectedCompany) return

    try {
      const { data, error } = await supabase
        .from("sales_entities")
        .select("id, name, ruc, executing_unit")
        .eq("company_id", selectedCompany.id)
        .order("name")

      if (error) throw error
      setEntities(data || [])
    } catch (error: any) {
      console.error("Error fetching entities:", error)
      toast.error("Error al cargar entidades")
    }
  }

  const handleProductSelect = (productId: string) => {
    const product = products.find((p) => p.id === productId)
    if (product) {
      setFormData((prev) => ({
        ...prev,
        product_id: productId,
        product_code: product.code,
        product_name: product.name,
        product_description: product.description || "",
        product_brand: product.brands?.name || "",
        unit_price_with_tax: product.sale_price.toString(),
      }))
    }
  }

  const handleEntitySelect = (entityId: string) => {
    const entity = entities.find((e) => e.id === entityId)
    if (entity) {
      setFormData((prev) => ({
        ...prev,
        entity_id: entityId,
        entity_name: entity.name,
        entity_ruc: entity.ruc,
        entity_executing_unit: entity.executing_unit || "",
      }))
    }
  }

  const handleCreateEntity = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCompany) return

    try {
      const { data, error } = await supabase
        .from("sales_entities")
        .insert([
          {
            name: newEntity.name,
            ruc: newEntity.ruc,
            executing_unit: newEntity.executing_unit || null,
            company_id: selectedCompany.id,
          },
        ])
        .select()
        .single()

      if (error) throw error

      toast.success("Entidad creada exitosamente")
      setNewEntity({ name: "", ruc: "", executing_unit: "" })
      setShowNewEntityDialog(false)
      fetchEntities()

      // Seleccionar la nueva entidad
      handleEntitySelect(data.id)
    } catch (error: any) {
      console.error("Error creating entity:", error)
      toast.error("Error al crear la entidad: " + error.message)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCompany || !user) return

    setLoading(true)

    try {
      // Validaciones
      if (!formData.entity_id || !formData.product_id || !formData.quotation_code) {
        toast.error("Por favor completa todos los campos obligatorios")
        return
      }

      const saleData = {
        company_id: selectedCompany.id,
        company_name: selectedCompany.name,
        company_ruc: selectedCompany.ruc || "",
        entity_id: formData.entity_id,
        entity_name: formData.entity_name,
        entity_ruc: formData.entity_ruc,
        entity_executing_unit: formData.entity_executing_unit || null,
        quotation_code: formData.quotation_code,
        exp_siaf: formData.exp_siaf,
        quantity: Number.parseInt(formData.quantity),
        product_id: formData.product_id,
        product_code: formData.product_code,
        product_name: formData.product_name,
        product_description: formData.product_description,
        product_brand: formData.product_brand,
        ocam: formData.ocam,
        physical_order: formData.physical_order,
        project_meta: formData.project_meta,
        final_destination: formData.final_destination,
        warehouse_manager: formData.warehouse_manager,
        payment_method: formData.payment_method,
        unit_price_with_tax: Number.parseFloat(formData.unit_price_with_tax),
        total_sale: totalSale,
        delivery_date: formData.delivery_date?.toISOString().split("T")[0] || null,
        delivery_term: formData.delivery_term,
        observations: formData.observations,
        created_by: user.id,
      }

      const { error } = await supabase.from("sales").insert([saleData])

      if (error) throw error

      toast.success("Venta registrada exitosamente")
      onSuccess()
    } catch (error: any) {
      console.error("Error creating sale:", error)
      toast.error("Error al registrar la venta: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Información de la Empresa */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Información de la Empresa</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Empresa</Label>
            <Input value={selectedCompany?.name || ""} disabled />
          </div>
          <div>
            <Label>RUC Empresa</Label>
            <Input value={selectedCompany?.ruc || ""} disabled />
          </div>
        </div>
      </div>

      <Separator />

      {/* Información del Cliente */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Información del Cliente</h3>
          <Dialog open={showNewEntityDialog} onOpenChange={setShowNewEntityDialog}>
            <DialogTrigger asChild>
              <Button type="button" variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Nueva Entidad
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Nueva Entidad</DialogTitle>
                <DialogDescription>Registra una nueva entidad (cliente) en el sistema</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateEntity} className="space-y-4">
                <div>
                  <Label htmlFor="new_entity_name">Nombre de la Entidad *</Label>
                  <Input
                    id="new_entity_name"
                    value={newEntity.name}
                    onChange={(e) => setNewEntity((prev) => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="new_entity_ruc">RUC *</Label>
                  <Input
                    id="new_entity_ruc"
                    value={newEntity.ruc}
                    onChange={(e) => setNewEntity((prev) => ({ ...prev, ruc: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="new_entity_executing_unit">Unidad Ejecutora (Opcional)</Label>
                  <Input
                    id="new_entity_executing_unit"
                    value={newEntity.executing_unit}
                    onChange={(e) => setNewEntity((prev) => ({ ...prev, executing_unit: e.target.value }))}
                    placeholder="Ej: 001, 002, etc."
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setShowNewEntityDialog(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">Crear Entidad</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div>
          <Label htmlFor="entity">Entidad (Cliente) *</Label>
          <Select value={formData.entity_id} onValueChange={handleEntitySelect}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar entidad" />
            </SelectTrigger>
            <SelectContent>
              {entities.map((entity) => (
                <SelectItem key={entity.id} value={entity.id}>
                  <div className="flex items-center justify-between w-full">
                    <span>
                      {entity.name} - {entity.ruc}
                    </span>
                    {entity.executing_unit && (
                      <Badge variant="outline" className="ml-2">
                        U.E: {entity.executing_unit}
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {formData.entity_executing_unit && (
          <div>
            <Label>Unidad Ejecutora</Label>
            <div className="flex items-center h-10 px-3 py-2 border border-input bg-muted rounded-md">
              <Badge variant="outline">{formData.entity_executing_unit}</Badge>
            </div>
          </div>
        )}
      </div>

      <Separator />

      {/* Detalles de la Venta */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Detalles de la Venta</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="quotation_code">Código de Cotización *</Label>
            <Input
              id="quotation_code"
              value={formData.quotation_code}
              onChange={(e) => setFormData((prev) => ({ ...prev, quotation_code: e.target.value }))}
              placeholder="Ej: COT-2024-001"
              required
            />
          </div>
          <div>
            <Label htmlFor="exp_siaf">EXP. SIAF</Label>
            <Input
              id="exp_siaf"
              value={formData.exp_siaf}
              onChange={(e) => setFormData((prev) => ({ ...prev, exp_siaf: e.target.value }))}
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Información del Producto */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Información del Producto</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="product">Producto *</Label>
            <Select value={formData.product_id} onValueChange={handleProductSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar producto" />
              </SelectTrigger>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.code} - {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="quantity">Cantidad *</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={formData.quantity}
              onChange={(e) => setFormData((prev) => ({ ...prev, quantity: e.target.value }))}
              required
            />
          </div>
        </div>

        {stockWarning && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{stockWarning}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="product_name">Nombre del Producto</Label>
            <Input
              id="product_name"
              value={formData.product_name}
              onChange={(e) => setFormData((prev) => ({ ...prev, product_name: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="product_brand">Marca</Label>
            <Input
              id="product_brand"
              value={formData.product_brand}
              onChange={(e) => setFormData((prev) => ({ ...prev, product_brand: e.target.value }))}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="product_description">Descripción del Producto</Label>
          <Textarea
            id="product_description"
            value={formData.product_description}
            onChange={(e) => setFormData((prev) => ({ ...prev, product_description: e.target.value }))}
          />
        </div>
      </div>

      <Separator />

      {/* Información Adicional */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Información Adicional</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="ocam">OCAM (Orden Electrónica)</Label>
            <Input
              id="ocam"
              value={formData.ocam}
              onChange={(e) => setFormData((prev) => ({ ...prev, ocam: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="physical_order">Orden Física</Label>
            <Input
              id="physical_order"
              value={formData.physical_order}
              onChange={(e) => setFormData((prev) => ({ ...prev, physical_order: e.target.value }))}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="project_meta">Proyecto Meta</Label>
            <Input
              id="project_meta"
              value={formData.project_meta}
              onChange={(e) => setFormData((prev) => ({ ...prev, project_meta: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="final_destination">Lugar de Destino Final</Label>
            <Input
              id="final_destination"
              value={formData.final_destination}
              onChange={(e) => setFormData((prev) => ({ ...prev, final_destination: e.target.value }))}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="warehouse_manager">Encargado de Almacén</Label>
          <Input
            id="warehouse_manager"
            value={formData.warehouse_manager}
            onChange={(e) => setFormData((prev) => ({ ...prev, warehouse_manager: e.target.value }))}
          />
        </div>
      </div>

      <Separator />

      {/* Información Financiera */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Información Financiera</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="payment_method">Método de Pago *</Label>
            <Select
              value={formData.payment_method}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, payment_method: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar método" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CONTADO">Contado</SelectItem>
                <SelectItem value="CREDITO">Crédito</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="unit_price">C. Unitario con IGV</Label>
            <Input
              id="unit_price"
              type="number"
              step="0.01"
              min="0"
              value={formData.unit_price_with_tax}
              onChange={(e) => setFormData((prev) => ({ ...prev, unit_price_with_tax: e.target.value }))}
            />
          </div>
          <div>
            <Label>Total de Venta</Label>
            <div className="flex items-center h-10 px-3 py-2 border border-input bg-muted rounded-md">
              <span className="font-semibold">
                S/ {totalSale.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Información de Entrega */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Información de Entrega</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Fecha de Entrega</Label>
            <DatePicker
              date={formData.delivery_date}
              setDate={(date) => setFormData((prev) => ({ ...prev, delivery_date: date }))}
              placeholder="Seleccionar fecha de entrega"
            />
          </div>
          <div>
            <Label htmlFor="delivery_term">Plazo de Entrega</Label>
            <Input
              id="delivery_term"
              value={formData.delivery_term}
              onChange={(e) => setFormData((prev) => ({ ...prev, delivery_term: e.target.value }))}
              placeholder="Ej: 15 días hábiles"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="observations">Observaciones</Label>
          <Textarea
            id="observations"
            value={formData.observations}
            onChange={(e) => setFormData((prev) => ({ ...prev, observations: e.target.value }))}
            placeholder="Observaciones adicionales sobre la venta..."
          />
        </div>
      </div>

      {/* Botones */}
      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={() => onSuccess()}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Registrando..." : "Registrar Venta"}
        </Button>
      </div>
    </form>
  )
}
