"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DatePickerImproved } from "@/components/ui/date-picker-improved"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Calculator, Plus, Trash2, Package, Edit2 } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useCompany } from "@/lib/company-context"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { EntitySelector } from "@/components/ui/entity-selector"
import { ProductSelector } from "@/components/ui/product-selector"

interface SaleItem {
  id?: string
  product_id: string
  product_code: string
  product_name: string
  product_description: string
  product_brand: string
  quantity: number
  unit_price_with_tax: number
  total_amount: number
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
  total_quantity: number
  total_items: number
  display_product_name: string
  display_product_code: string
  total_sale: number
  payment_method: string
  delivery_date: string | null
  created_by: string
  sale_status: string
  exp_siaf?: string | null
  ocam?: string | null
  physical_order?: string | null
  project_meta?: string | null
  final_destination?: string | null
  warehouse_manager?: string | null
  delivery_term?: string | null
  observations?: string | null
  created_at?: string | null
  is_multi_product: boolean
}

interface MultiProductSaleEditFormProps {
  sale: Sale
  onSuccess: () => void
  onCancel: () => void
}

export default function MultiProductSaleEditForm({ sale, onSuccess, onCancel }: MultiProductSaleEditFormProps) {
  const { user } = useAuth()
  const { selectedCompany } = useCompany()
  const [loading, setLoading] = useState(false)
  const [loadingItems, setLoadingItems] = useState(true)

  // Form state
  const [formData, setFormData] = useState({
    entity_id: sale.entity_id,
    entity_name: sale.entity_name,
    entity_ruc: sale.entity_ruc,
    entity_executing_unit: sale.entity_executing_unit || "",
    quotation_code: sale.quotation_code,
    exp_siaf: sale.exp_siaf || "",
    ocam: sale.ocam || "",
    physical_order: sale.physical_order || "",
    project_meta: sale.project_meta || "",
    final_destination: sale.final_destination || "",
    warehouse_manager: sale.warehouse_manager || "",
    payment_method: sale.payment_method,
    delivery_date: sale.delivery_date ? new Date(sale.delivery_date) : (undefined as Date | undefined),
    delivery_term: sale.delivery_term || "",
    observations: sale.observations || "",
    sale_status: sale.sale_status,
  })

  // Items state
  const [currentItem, setCurrentItem] = useState<Partial<SaleItem>>({
    product_id: "",
    product_code: "",
    product_name: "",
    product_description: "",
    product_brand: "",
    quantity: 1,
    unit_price_with_tax: 0,
  })

  const [items, setItems] = useState<SaleItem[]>([])
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null)

  // Calculated totals
  const [totals, setTotals] = useState({
    total_sale: 0,
    total_items: 0,
  })

  // Load existing sale items
  useEffect(() => {
    if (sale.id) {
      fetchSaleItems()
    }
  }, [sale.id])

  // Calculate totals when items change
  useEffect(() => {
    const totalSale = items.reduce((sum, item) => sum + item.total_amount, 0)

    setTotals({
      total_sale: totalSale,
      total_items: items.length,
    })
  }, [items])

  const fetchSaleItems = async () => {
    setLoadingItems(true)
    try {
      const { data, error } = await supabase
        .from("sale_items")
        .select(
          "id, product_id, product_code, product_name, product_description, product_brand, quantity, unit_price_with_tax, total_amount",
        )
        .eq("sale_id", sale.id)
        .order("product_name")

      if (error) throw error

      setItems(data || [])
    } catch (error: any) {
      console.error("Error fetching sale items:", error)
      toast.error("Error al cargar los productos de la venta")
    } finally {
      setLoadingItems(false)
    }
  }

  const addItem = () => {
    if (!currentItem.product_id || currentItem.quantity === undefined || currentItem.quantity < 0) {
      toast.error("Por favor completa todos los campos del producto y asegúrate de que la cantidad sea válida")
      return
    }

    const newItem: SaleItem = {
      product_id: currentItem.product_id!,
      product_code: currentItem.product_code!,
      product_name: currentItem.product_name!,
      product_description: currentItem.product_description!,
      product_brand: currentItem.product_brand!,
      quantity: currentItem.quantity!,
      unit_price_with_tax: currentItem.unit_price_with_tax!,
      total_amount: currentItem.quantity! * currentItem.unit_price_with_tax!,
    }

    if (editingItemIndex !== null) {
      // Update existing item
      const updatedItems = [...items]
      updatedItems[editingItemIndex] = newItem
      setItems(updatedItems)
      setEditingItemIndex(null)
      toast.success("Producto actualizado")
    } else {
      // Add new item
      setItems([...items, newItem])
      toast.success("Producto agregado a la venta")
    }

    // Reset current item
    setCurrentItem({
      product_id: "",
      product_code: "",
      product_name: "",
      product_description: "",
      product_brand: "",
      quantity: 1,
      unit_price_with_tax: 0,
    })
  }

  const editItem = (index: number) => {
    const item = items[index]
    setCurrentItem({
      product_id: item.product_id,
      product_code: item.product_code,
      product_name: item.product_name,
      product_description: item.product_description,
      product_brand: item.product_brand,
      quantity: item.quantity,
      unit_price_with_tax: item.unit_price_with_tax,
    })
    setEditingItemIndex(index)
  }

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index)
    setItems(newItems)
    toast.success("Producto eliminado de la venta")
  }

  const cancelEdit = () => {
    setCurrentItem({
      product_id: "",
      product_code: "",
      product_name: "",
      product_description: "",
      product_brand: "",
      quantity: 1,
      unit_price_with_tax: 0,
    })
    setEditingItemIndex(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedCompany || !user) {
      toast.error("Error: Falta información de empresa o usuario")
      return
    }

    if (items.length === 0) {
      toast.error("Debe tener al menos un producto en la venta")
      return
    }

    if (!formData.entity_id || !formData.quotation_code) {
      toast.error("Por favor completa todos los campos obligatorios")
      return
    }

    setLoading(true)

    try {
      // Update sale
      const saleData = {
        entity_id: formData.entity_id,
        entity_name: formData.entity_name,
        entity_ruc: formData.entity_ruc,
        entity_executing_unit: formData.entity_executing_unit || null,
        quotation_code: formData.quotation_code,
        exp_siaf: formData.exp_siaf || null,
        ocam: formData.ocam || null,
        physical_order: formData.physical_order || null,
        project_meta: formData.project_meta || null,
        final_destination: formData.final_destination || null,
        warehouse_manager: formData.warehouse_manager || null,
        payment_method: formData.payment_method,
        total_sale: totals.total_sale,
        delivery_date: formData.delivery_date?.toISOString().split("T")[0] || null,
        delivery_term: formData.delivery_term || null,
        observations: formData.observations || null,
        sale_status: formData.sale_status,
        updated_at: new Date().toISOString(),
      }

      const { error: saleError } = await supabase.from("sales").update(saleData).eq("id", sale.id)

      if (saleError) throw saleError

      // Delete existing sale items
      const { error: deleteError } = await supabase.from("sale_items").delete().eq("sale_id", sale.id)

      if (deleteError) throw deleteError

      // Create new sale items
      const itemsData = items.map((item) => ({
        sale_id: sale.id,
        product_id: item.product_id,
        product_code: item.product_code,
        product_name: item.product_name,
        product_description: item.product_description,
        product_brand: item.product_brand,
        quantity: item.quantity,
        unit_price_with_tax: item.unit_price_with_tax,
        total_amount: item.total_amount,
      }))

      const { error: itemsError } = await supabase.from("sale_items").insert(itemsData)

      if (itemsError) throw itemsError

      toast.success("Venta multi-producto actualizada exitosamente")
      onSuccess()
    } catch (error: any) {
      console.error("Error updating sale:", error)
      toast.error("Error al actualizar la venta: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  if (loadingItems) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600"></div>
        <p className="ml-2 text-slate-600">Cargando productos de la venta...</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header con número de venta */}
      <div className="p-4 bg-blue-50 rounded-lg">
        <h3 className="text-lg font-semibold text-blue-900">
          Editando Venta Multi-Producto: {sale.sale_number || "N/A"}
        </h3>
        <p className="text-sm text-blue-700">Fecha de venta: {new Date(sale.sale_date).toLocaleDateString("es-PE")}</p>
      </div>

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
      </div>

      <Separator />

      {/* Agregar/Editar Productos */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Package className="h-5 w-5" />
          {editingItemIndex !== null ? "Editar Producto" : "Agregar Producto"}
        </h3>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {editingItemIndex !== null ? "Modificar Producto" : "Nuevo Producto"}
            </CardTitle>
            <CardDescription>
              {editingItemIndex !== null
                ? "Modifica los datos del producto seleccionado"
                : "Selecciona un producto para la venta"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <ProductSelector
                  value={currentItem.product_id || ""}
                  onSelect={(product) => {
                    setCurrentItem((prev) => ({
                      ...prev,
                      product_id: product.id,
                      product_code: product.code,
                      product_name: product.name,
                      product_description: product.description || product.name,
                      product_brand: product.brands?.name || "",
                      unit_price_with_tax: product.sale_price,
                    }))
                  }}
                  label="Producto"
                  placeholder="Buscar producto..."
                  required
                  showStock={true}
                  showPrice={true}
                />
              </div>
              <div>
                <Label htmlFor="quantity">Cantidad</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={currentItem.quantity || ""}
                  onChange={(e) =>
                    setCurrentItem((prev) => ({
                      ...prev,
                      quantity: Number.parseInt(e.target.value) || 0,
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Precio Unitario con IGV</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={currentItem.unit_price_with_tax || ""}
                  onChange={(e) =>
                    setCurrentItem((prev) => ({
                      ...prev,
                      unit_price_with_tax: Number.parseFloat(e.target.value) || 0,
                    }))
                  }
                />
              </div>
              <div>
                <Label>Total</Label>
                <div className="flex items-center h-10 px-3 py-2 border border-input bg-muted rounded-md">
                  <span className="font-semibold">
                    S/{" "}
                    {((currentItem.quantity || 0) * (currentItem.unit_price_with_tax || 0)).toLocaleString("es-PE", {
                      minimumFractionDigits: 2, maximumFractionDigits: 4
                    })}
                  </span>
                </div>
              </div>
              <div className="flex items-end gap-2">
                <Button
                  type="button"
                  onClick={addItem}
                  disabled={!currentItem.product_id || !currentItem.quantity}
                  className="flex-1"
                >
                  {editingItemIndex !== null ? (
                    <>
                      <Edit2 className="h-4 w-4 mr-2" />
                      Actualizar
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar
                    </>
                  )}
                </Button>
                {editingItemIndex !== null && (
                  <Button type="button" variant="outline" onClick={cancelEdit}>
                    Cancelar
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Productos */}
      {items.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Productos en la Venta</h3>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Cantidad</TableHead>
                    <TableHead>Precio Unitario</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={index} className={editingItemIndex === index ? "bg-blue-50" : ""}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.product_name}</p>
                          <p className="text-sm text-muted-foreground">{item.product_code}</p>
                          {item.product_brand && (
                            <Badge variant="outline" className="text-xs">
                              {item.product_brand}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{item.quantity.toLocaleString()}</TableCell>
                      <TableCell>
                        S/ {item.unit_price_with_tax.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                      </TableCell>
                      <TableCell className="font-medium">
                        S/ {item.total_amount.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => editItem(index)}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Totales */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                Resumen de Totales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-600">Total Items</p>
                  <p className="text-xl font-bold">{totals.total_items}</p>
                </div>
                <div className="text-center p-3 bg-primary/10 rounded-lg">
                  <p className="text-sm text-primary">Total de Venta</p>
                  <p className="text-xl font-bold text-primary">
                    S/ {totals.total_sale.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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
              placeholder="Ej: COT-2024-0001"
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
        <div className="grid grid-cols-2 gap-4">
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
        </div>
      </div>

      <Separator />

      {/* Información de Entrega */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Información de Entrega</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Fecha de Entrega</Label>
            <DatePickerImproved
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
        <Button type="submit" disabled={loading || items.length === 0}>
          {loading ? "Actualizando..." : "Actualizar Venta Multi-Producto"}
        </Button>
      </div>
    </form>
  )
}
