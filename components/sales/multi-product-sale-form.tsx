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
import { Calculator, Plus, Trash2, Package, Search } from "lucide-react"
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

interface MultiProductSaleFormProps {
  onSuccess: () => void
}

export default function MultiProductSaleForm({ onSuccess }: MultiProductSaleFormProps) {
  const { user } = useAuth()
  const { selectedCompany } = useCompany()
  const [loading, setLoading] = useState(false)
  const [searchingQuotation, setSearchingQuotation] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    entity_id: "",
    entity_name: "",
    entity_ruc: "",
    entity_executing_unit: "",
    quotation_code: "",
    quotation_search: "",
    exp_siaf: "",
    ocam: "",
    physical_order: "",
    project_meta: "",
    final_destination: "",
    warehouse_manager: "",
    payment_method: "",
    delivery_date: undefined as Date | undefined,
    delivery_term: "",
    observations: "",
    sale_status: "",
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

  // Calculated totals
  const [totals, setTotals] = useState({
    total_sale: 0,
    total_items: 0,
  })

  // Calculate totals when items change
  useEffect(() => {
    const totalSale = items.reduce((sum, item) => sum + item.total_amount, 0)

    setTotals({
      total_sale: totalSale,
      total_items: items.length,
    })
  }, [items])

  const searchQuotationByCode = async () => {
    if (!selectedCompany || !formData.quotation_search.trim()) {
      toast.error("Ingresa un código de cotización")
      return
    }

    setSearchingQuotation(true)

    try {
      // Primero buscar la cotización base
      const { data: quotationData, error: quotationError } = await supabase
        .from("quotations")
        .select("id, quotation_number, entity_name, entity_ruc, status")
        .eq("company_id", selectedCompany.id)
        .eq("quotation_number", formData.quotation_search.trim())
        .eq("status", "approved")
        .single()

      if (quotationError) {
        if (quotationError.code === "PGRST116") {
          toast.error("No se encontró una cotización aprobada con ese código")
        } else {
          throw quotationError
        }
        return
      }

      // Luego buscar los items de la cotización
      const { data: quotationItems, error: itemsError } = await supabase
        .from("quotation_items")
        .select(`
        product_id, product_code, product_name, product_description, product_brand,
        quantity, offer_unit_price_with_tax, final_unit_price_with_tax
      `)
        .eq("quotation_id", quotationData.id)

      if (itemsError) {
        console.error("Error fetching quotation items:", itemsError)
        throw itemsError
      }

      // Llenar datos del cliente
      setFormData((prev) => ({
        ...prev,
        quotation_code: quotationData.quotation_number,
        entity_name: quotationData.entity_name,
        entity_ruc: quotationData.entity_ruc,
      }))

      // Llenar items de la cotización
      if (quotationItems && quotationItems.length > 0) {
        const saleItems: SaleItem[] = quotationItems.map((item: any) => ({
          product_id: item.product_id || "",
          product_code: item.product_code || "",
          product_name: item.product_name || "",
          product_description: item.product_description || "",
          product_brand: item.product_brand || "",
          quantity: item.quantity || 1,
          unit_price_with_tax: item.final_unit_price_with_tax || item.offer_unit_price_with_tax || 0,
          total_amount: (item.final_unit_price_with_tax || item.offer_unit_price_with_tax || 0) * (item.quantity || 1),
        }))

        setItems(saleItems)
        toast.success(`Cotización encontrada. Se cargaron ${saleItems.length} productos automáticamente`)
      } else {
        toast.success("Cotización encontrada pero sin productos. Agrega productos manualmente")
      }
    } catch (error: any) {
      console.error("Error searching quotation:", error)
      toast.error("Error al buscar la cotización: " + error.message)
    } finally {
      setSearchingQuotation(false)
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

    setItems([...items, newItem])

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

    toast.success("Producto agregado a la venta")
  }

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index)
    setItems(newItems)
    toast.success("Producto eliminado de la venta")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedCompany || !user) {
      toast.error("Error: Falta información de empresa o usuario")
      return
    }

    if (items.length === 0) {
      toast.error("Debe agregar al menos un producto a la venta")
      return
    }

    if (!formData.entity_id || !formData.quotation_code) {
      toast.error("Por favor completa todos los campos obligatorios")
      return
    }

    setLoading(true)

    try {
      // Create sale
      const saleData = {
        company_id: selectedCompany.id,
        company_name: selectedCompany.name,
        company_ruc: selectedCompany.ruc || "",
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
        created_by: user.id,
      }

      const { data: sale, error: saleError } = await supabase.from("sales").insert([saleData]).select().single()

      if (saleError) throw saleError

      // Create sale items
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

      toast.success("Venta multi-producto registrada exitosamente")
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

      {/* Vinculación con Cotización */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Vincular con Cotización (Opcional)</h3>
        <div>
          <Label htmlFor="quotation_search">Buscar Cotización por Código</Label>
          <div className="flex gap-2">
            <Input
              id="quotation_search"
              value={formData.quotation_search}
              onChange={(e) => setFormData((prev) => ({ ...prev, quotation_search: e.target.value }))}
              placeholder="Ej: COT-2024-0001"
            />
            <Button
              type="button"
              onClick={searchQuotationByCode}
              disabled={searchingQuotation || !formData.quotation_search}
            >
              {searchingQuotation ? "Buscando..." : <Search className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Ingresa el código de cotización para cargar automáticamente los productos
          </p>
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
          placeholder="Buscar o crear entidad..."
          required
        />
      </div>

      <Separator />

      {/* Agregar Productos */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Package className="h-5 w-5" />
          Agregar Productos
        </h3>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nuevo Producto</CardTitle>
            <CardDescription>Selecciona un producto para la venta</CardDescription>
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
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  onClick={addItem}
                  disabled={!currentItem.product_id || !currentItem.quantity}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar
                </Button>
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
                    <TableRow key={index}>
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
                        S/ {item.unit_price_with_tax.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="font-medium">
                        S/ {item.total_amount.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
                    S/ {totals.total_sale.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
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
        <Button type="button" variant="outline" onClick={() => onSuccess()}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading || items.length === 0}>
          {loading ? "Registrando..." : "Registrar Venta Multi-Producto"}
        </Button>
      </div>
    </form>
  )
}
