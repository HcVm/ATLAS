"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DatePickerImproved } from "@/components/ui/date-picker-improved"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useCompany } from "@/lib/company-context"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { EntitySelector } from "@/components/ui/entity-selector"
import { ProductSelector } from "@/components/ui/product-selector"

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
  delivery_start_date: string | null
  delivery_end_date: string | null
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
    delivery_start_date: sale.delivery_start_date
      ? new Date(sale.delivery_start_date)
      : (undefined as Date | undefined),
    delivery_end_date: sale.delivery_end_date ? new Date(sale.delivery_end_date) : (undefined as Date | undefined),
    observations: sale.observations || "",
    sale_status: sale.sale_status,
  })

  const [stockWarning, setStockWarning] = useState("")
  const [totalSale, setTotalSale] = useState(sale.total_sale)

  useEffect(() => {
    if (selectedCompany) {
      fetchProducts()
    }
  }, [selectedCompany])

  useEffect(() => {
    const quantity = Number.parseFloat(formData.quantity) || 0
    const unitPrice = Number.parseFloat(formData.unit_price_with_tax) || 0
    setTotalSale(quantity * unitPrice)
  }, [formData.quantity, formData.unit_price_with_tax])

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCompany || !user) return

    setLoading(true)

    try {
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
        delivery_start_date: formData.delivery_start_date?.toISOString().split("T")[0] || null,
        delivery_end_date: formData.delivery_end_date?.toISOString().split("T")[0] || null,
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
      {sale.sale_number && (
        <div className="p-4 bg-blue-50 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-900">Editando Venta: {sale.sale_number}</h3>
          <p className="text-sm text-blue-700">
            Fecha de venta: {new Date(sale.sale_date).toLocaleDateString("es-PE")}
          </p>
        </div>
      )}

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

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Información del Cliente</h3>
        <EntitySelector
          value={formData.entity_id}
          onSelect={(entity) => {
            setFormData((prev) => ({
              ...prev,
              entity_id: entity.id,
              entity_name: entity.name,
              entity_ruc: entity.ruc,
              entity_executing_unit: entity.executing_unit || "",
            }))
          }}
          label="Entidad (Cliente)"
          placeholder="Buscar entidad..."
          required
        />

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

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Información del Producto</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <ProductSelector
              value={formData.product_id}
              onSelect={(product) => {
                setFormData((prev) => ({
                  ...prev,
                  product_id: product.id,
                  product_code: product.code,
                  product_name: product.name,
                  product_description: product.description || "",
                  product_brand: product.brands?.name || "",
                  unit_price_with_tax: product.sale_price.toString(),
                }))
              }}
              label="Producto"
              placeholder="Seleccionar producto..."
              required
              showStock={true}
              showPrice={true}
            />
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
                S/ {totalSale.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
              </span>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Información de Entrega</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Fecha de Inicio de Entrega</Label>
            <DatePickerImproved
              date={formData.delivery_start_date}
              setDate={(date) => setFormData((prev) => ({ ...prev, delivery_start_date: date }))}
              placeholder="Seleccionar fecha de inicio"
            />
          </div>
          <div>
            <Label>Fecha de Fin de Entrega</Label>
            <DatePickerImproved
              date={formData.delivery_end_date}
              setDate={(date) => setFormData((prev) => ({ ...prev, delivery_end_date: date }))}
              placeholder="Seleccionar fecha de fin"
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
