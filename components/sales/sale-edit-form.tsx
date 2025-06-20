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
import { AlertTriangle } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useCompany } from "@/lib/company-context"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

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

interface Sale {
  id: string
  sale_number?: string
  sale_date: string
  entity_id: string
  entity_name: string
  entity_ruc: string
  entity_executing_unit: string | null
  quotation_code: string
  exp_siaf: string | null
  quantity: number
  product_id: string
  product_code: string
  product_name: string
  product_description: string | null
  product_brand: string | null
  ocam: string | null
  physical_order: string | null
  project_meta: string | null
  final_destination: string | null
  warehouse_manager: string | null
  payment_method: string
  unit_price_with_tax: number
  total_sale: number
  delivery_date: string | null
  delivery_term: string | null
  observations: string | null
  sale_status: string
}

interface SaleEditFormProps {
  sale: Sale
  onSuccess: () => void
  onCancel: () => void
}

export default function SaleEditForm({ sale, onSuccess, onCancel }: SaleEditFormProps) {
  const { user } = useAuth()
  const { selectedCompany } = useCompany()
  const [loading, setLoading] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [entities, setEntities] = useState<SalesEntity[]>([])

  // Form state inicializado con datos de la venta
  const [formData, setFormData] = useState({
    entity_id: sale.entity_id,
    entity_name: sale.entity_name,
    entity_ruc: sale.entity_ruc,
    entity_executing_unit: sale.entity_executing_unit || "",
    quotation_code: sale.quotation_code,
    exp_siaf: sale.exp_siaf || "",
    quantity: sale.quantity.toString(),
    product_id: sale.product_id,
    product_code: sale.product_code,
    product_name: sale.product_name,
    product_description: sale.product_description || "",
    product_brand: sale.product_brand || "",
    ocam: sale.ocam || "",
    physical_order: sale.physical_order || "",
    project_meta: sale.project_meta || "",
    final_destination: sale.final_destination || "",
    warehouse_manager: sale.warehouse_manager || "",
    payment_method: sale.payment_method,
    unit_price_with_tax: sale.unit_price_with_tax.toString(),
    delivery_date: sale.delivery_date ? new Date(sale.delivery_date) : (undefined as Date | undefined),
    delivery_term: sale.delivery_term || "",
    observations: sale.observations || "",
    sale_status: sale.sale_status,
  })

  const [stockWarning, setStockWarning] = useState("")
  const [totalSale, setTotalSale] = useState(sale.total_sale)

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

      const updateData = {
        entity_id: formData.entity_id,
        entity_name: formData.entity_name,
        entity_ruc: formData.entity_ruc,
        entity_executing_unit: formData.entity_executing_unit || null,
        quotation_code: formData.quotation_code,
        exp_siaf: formData.exp_siaf || null,
        quantity: Number.parseInt(formData.quantity),
        product_id: formData.product_id,
        product_code: formData.product_code,
        product_name: formData.product_name,
        product_description: formData.product_description || null,
        product_brand: formData.product_brand || null,
        ocam: formData.ocam || null,
        physical_order: formData.physical_order || null,
        project_meta: formData.project_meta || null,
        final_destination: formData.final_destination || null,
        warehouse_manager: formData.warehouse_manager || null,
        payment_method: formData.payment_method,
        unit_price_with_tax: Number.parseFloat(formData.unit_price_with_tax),
        total_sale: totalSale,
        delivery_date: formData.delivery_date?.toISOString().split("T")[0] || null,
        delivery_term: formData.delivery_term || null,
        observations: formData.observations || null,
        sale_status: formData.sale_status,
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase.from("sales").update(updateData).eq("id", sale.id)

      if (error) throw error

      toast.success("Venta actualizada exitosamente")
      onSuccess()
    } catch (error: any) {
      console.error("Error updating sale:", error)
      toast.error("Error al actualizar la venta: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header con número de venta */}
      {sale.sale_number && (
        <div className="p-4 bg-blue-50 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-900">Editando Venta: {sale.sale_number}</h3>
          <p className="text-sm text-blue-700">
            Fecha de venta: {new Date(sale.sale_date).toLocaleDateString("es-PE")}
          </p>
        </div>
      )}

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
            <Input value={selectedCompany?.ruc || selectedCompany?.tax_id || ""} disabled />
          </div>
        </div>
      </div>

      <Separator />

      {/* Información del Cliente */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Información del Cliente</h3>
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
            <Label htmlFor="sale_status">Estado de la Venta *</Label>
            <Select
              value={formData.sale_status}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, sale_status: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="conformidad">Conformidad</SelectItem>
                <SelectItem value="devengado">Devengado</SelectItem>
                <SelectItem value="girado">Girado</SelectItem>
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
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Actualizando..." : "Actualizar Venta"}
        </Button>
      </div>
    </form>
  )
}
