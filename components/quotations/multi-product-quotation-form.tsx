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
import { Calculator, Plus, Trash2, Package, Users, Percent } from 'lucide-react'
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
image_url: string | null
brands?: {
  name: string
}
}

interface QuotationItem {
id?: string
product_id: string
product_code: string
product_name: string
product_description: string
product_brand: string
quantity: number
platform_unit_price_with_tax: number
platform_total: number
supplier_unit_price_with_tax: number | null
supplier_total: number | null
offer_unit_price_with_tax: number | null
offer_total_with_tax: number | null
budget_ceiling_unit_price_with_tax: number | null
budget_ceiling_total: number | null
reference_image_url: string | null
}

interface MultiProductQuotationFormProps {
onSuccess: () => void
}

// Función para generar número de cotización
const generateQuotationNumber = async (companyId: string, companyCode: string): Promise<string> => {
const currentYear = new Date().getFullYear()

try {
  // Buscar el último número de cotización para esta empresa y año
  const { data: lastQuotation, error } = await supabase
    .from("quotations")
    .select("quotation_number")
    .eq("company_id", companyId)
    .like("quotation_number", `COT-${currentYear}-${companyCode}-%`)
    .order("created_at", { ascending: false })
    .limit(1)

  if (error) {
    console.error("Error fetching last quotation:", error)
    // Si hay error, usar número 1
    return `COT-${currentYear}-${companyCode}-0001`
  }

  let nextNumber = 1

  if (lastQuotation && lastQuotation.length > 0) {
    const lastNumber = lastQuotation[0].quotation_number
    // Extraer el número del formato COT-2025-ARM-0001
    const match = lastNumber?.match(/-(\d+)$/)
    if (match) {
      nextNumber = Number.parseInt(match[1]) + 1
    }
  }

  // Formatear con ceros a la izquierda (4 dígitos)
  const formattedNumber = nextNumber.toString().padStart(4, "0")
  return `COT-${currentYear}-${companyCode}-${formattedNumber}`
} catch (error) {
  console.error("Error generating quotation number:", error)
  return `COT-${currentYear}-${companyCode}-0001`
}
}

export default function MultiProductQuotationForm({ onSuccess }: MultiProductQuotationFormProps) {
const { user } = useAuth()
const { selectedCompany } = useCompany()
const [loading, setLoading] = useState(false)

// Form state - solo campos que existen en quotations
const [formData, setFormData] = useState({
  entity_id: "",
  entity_name: "",
  entity_ruc: "",
  delivery_location: "",
  status: "draft",
  valid_until: undefined as Date | undefined,
  observations: "",
  // Campos de comisión
  contact_person: "",
  commission_percentage: "",
  commission_notes: "",
})

// Items state
const [items, setItems] = useState<QuotationItem[]>([])
const [currentItem, setCurrentItem] = useState<Partial<QuotationItem>>({
  product_id: "",
  product_code: "",
  product_name: "",
  product_description: "",
  product_brand: "",
  quantity: 1,
  platform_unit_price_with_tax: 0,
  supplier_unit_price_with_tax: null,
  offer_unit_price_with_tax: null,
  final_unit_price_with_tax: null,
  budget_ceiling_unit_price_with_tax: null,
  budget_ceiling_total: null,
  reference_image_url: null,
})

// Calculated totals
const [totals, setTotals] = useState({
  platform_total: 0,
  supplier_total: 0,
  offer_total_with_tax: 0,
  budget_ceiling_total: 0,
  total_items: 0,
  // Totales de comisión
  commission_base_amount: 0,
  commission_amount: 0,
})

// Calculate totals when items change
useEffect(() => {
  const platformTotal = items.reduce((sum, item) => sum + item.platform_total, 0)
  const supplierTotal = items.reduce((sum, item) => sum + (item.supplier_total || 0), 0)
  const offerTotal = items.reduce((sum, item) => sum + (item.offer_total_with_tax || 0), 0)
  const budgetCeilingTotal = items.reduce((sum, item) => sum + (item.budget_ceiling_total || 0), 0)

  // Calcular comisión
  const finalTotal = offerTotal > 0 ? offerTotal : platformTotal
  const commissionBaseAmount = finalTotal / 1.18 // Quitar IGV
  const commissionPercentage = Number.parseFloat(formData.commission_percentage) || 0
  const commissionAmount = commissionBaseAmount * (commissionPercentage / 100)

  setTotals({
    platform_total: platformTotal,
    supplier_total: supplierTotal,
    offer_total_with_tax: offerTotal,
    budget_ceiling_total: budgetCeilingTotal,
    total_items: items.length,
    commission_base_amount: commissionBaseAmount,
    commission_amount: commissionAmount,
  })
}, [items, formData.commission_percentage])

// Calculate current item totals
const calculateCurrentItemTotals = (item: Partial<QuotationItem>) => {
  const quantity = item.quantity || 0
  const platformPrice = item.platform_unit_price_with_tax || 0
  const supplierPrice = item.supplier_unit_price_with_tax || 0
  const offerPrice = item.offer_unit_price_with_tax || 0
  const budgetCeilingPrice = item.budget_ceiling_unit_price_with_tax || 0

  return {
    platform_total: quantity * platformPrice,
    supplier_total: supplierPrice > 0 ? quantity * supplierPrice : null,
    offer_total_with_tax: offerPrice > 0 ? quantity * offerPrice : null,
    budget_ceiling_total: budgetCeilingPrice > 0 ? quantity * budgetCeilingPrice : null,
  }
}

const addItem = () => {
  if (!currentItem.product_id || !currentItem.quantity || currentItem.quantity <= 0) {
    toast.error("Por favor completa todos los campos del producto")
    return
  }

  const calculatedTotals = calculateCurrentItemTotals(currentItem)

  const newItem: QuotationItem = {
    product_id: currentItem.product_id!,
    product_code: currentItem.product_code!,
    product_name: currentItem.product_name!,
    product_description: currentItem.product_description!,
    product_brand: currentItem.product_brand!,
    quantity: currentItem.quantity!,
    platform_unit_price_with_tax: currentItem.platform_unit_price_with_tax!,
    platform_total: calculatedTotals.platform_total,
    supplier_unit_price_with_tax: currentItem.supplier_unit_price_with_tax,
    supplier_total: calculatedTotals.supplier_total,
    offer_unit_price_with_tax: currentItem.offer_unit_price_with_tax,
    offer_total_with_tax: calculatedTotals.offer_total_with_tax,
    budget_ceiling_unit_price_with_tax: currentItem.budget_ceiling_unit_price_with_tax,
    budget_ceiling_total: calculatedTotals.budget_ceiling_total,
    reference_image_url: currentItem.reference_image_url,
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
    platform_unit_price_with_tax: 0,
    supplier_unit_price_with_tax: null,
    offer_unit_price_with_tax: null,
    budget_ceiling_unit_price_with_tax: null,
    budget_ceiling_total: null,
    reference_image_url: null,
  })

  toast.success("Producto agregado a la cotización")
}

const removeItem = (index: number) => {
  const newItems = items.filter((_, i) => i !== index)
  setItems(newItems)
  toast.success("Producto eliminado de la cotización")
}

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()

  if (!selectedCompany || !user) {
    toast.error("Error: Falta información de empresa o usuario")
    return
  }

  if (items.length === 0) {
    toast.error("Debe agregar al menos un producto a la cotización")
    return
  }

  if (!formData.entity_id || !formData.delivery_location) {
    toast.error("Por favor completa todos los campos obligatorios")
    return
  }

  setLoading(true)

  try {
    // Generar número de cotización automático
    const quotationNumber = await generateQuotationNumber(selectedCompany.id, selectedCompany.code || "GEN")

    // Crear cotización - SOLO con campos que existen en la tabla
    const quotationData = {
      quotation_number: quotationNumber,
      company_id: selectedCompany.id,
      company_name: selectedCompany.name,
      company_ruc: selectedCompany.ruc || "",
      entity_id: formData.entity_id,
      entity_name: formData.entity_name,
      entity_ruc: formData.entity_ruc,
      delivery_location: formData.delivery_location,
      status: formData.status,
      valid_until: formData.valid_until?.toISOString().split("T")[0] || null,
      observations: formData.observations,
      created_by: user.id,
      is_multi_product: items.length > 1,
      items_count: items.length,
      // Campos de comisión
      contact_person: formData.contact_person || null,
      commission_percentage: formData.commission_percentage
        ? Number.parseFloat(formData.commission_percentage)
        : null,
      commission_base_amount: totals.commission_base_amount,
      commission_amount: totals.commission_amount,
      commission_notes: formData.commission_notes || null,
      // Total del techo presupuestal (suma de todos los items)
      budget_ceiling_total: totals.budget_ceiling_total > 0 ? totals.budget_ceiling_total : null,
    }

    console.log("Creating quotation with data:", quotationData)

    const { data: quotation, error: quotationError } = await supabase
      .from("quotations")
      .insert([quotationData])
      .select()
      .single()

    if (quotationError) {
      console.error("Quotation creation error:", quotationError)
      throw quotationError
    }

    console.log("Quotation created successfully:", quotation.id)

    // Crear quotation items
    const itemsData = items.map((item) => ({
      quotation_id: quotation.id,
      product_id: item.product_id,
      product_code: item.product_code,
      product_name: item.product_name,
      product_description: item.product_description,
      product_brand: item.product_brand,
      quantity: item.quantity,
      platform_unit_price_with_tax: item.platform_unit_price_with_tax,
      platform_total: item.platform_total,
      supplier_unit_price_with_tax: item.supplier_unit_price_with_tax,
      supplier_total: item.supplier_total,
      offer_unit_price_with_tax: item.offer_unit_price_with_tax,
      offer_total_with_tax: item.offer_total_with_tax,
      budget_ceiling_unit_price_with_tax: item.budget_ceiling_unit_price_with_tax,
      budget_ceiling_total: item.budget_ceiling_total,
      reference_image_url: item.reference_image_url,
    }))

    console.log("Creating quotation items:", itemsData.length)

    const { error: itemsError } = await supabase.from("quotation_items").insert(itemsData)

    if (itemsError) {
      console.error("Items creation error:", itemsError)
      throw itemsError
    }

    console.log("Quotation items created successfully")

    toast.success(`Cotización multi-producto creada exitosamente con número: ${quotationNumber}`)
    onSuccess()
  } catch (error: any) {
    console.error("Error creating quotation:", error)
    toast.error("Error al crear la cotización: " + error.message)
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
      {selectedCompany?.code && (
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-700">
            <strong>Código de empresa:</strong> {selectedCompany.code} - Las cotizaciones se generarán con el formato:
            COT-{new Date().getFullYear()}-{selectedCompany.code}-XXXX
          </p>
        </div>
      )}
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
          }))
        }}
        label="Entidad (Cliente)"
        placeholder="Buscar o crear entidad..."
        required
      />
    </div>

    <Separator />

    {/* Información de Comisión */}
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Users className="h-5 w-5" />
        Información de Comisión
      </h3>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cálculo de Comisión para Contacto</CardTitle>
          <CardDescription>La comisión se calcula sobre el total ofertado sin IGV</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="contact_person">Nombre del Contacto/Vendedor</Label>
              <Input
                id="contact_person"
                value={formData.contact_person}
                onChange={(e) => setFormData((prev) => ({ ...prev, contact_person: e.target.value }))}
                placeholder="Nombre del contacto que gestiona la venta"
              />
            </div>
            <div>
              <Label htmlFor="commission_percentage">Porcentaje de Comisión (%)</Label>
              <div className="relative">
                <Input
                  id="commission_percentage"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.commission_percentage}
                  onChange={(e) => setFormData((prev) => ({ ...prev, commission_percentage: e.target.value }))}
                  placeholder="Ej: 5.5 para 5.5%"
                />
                <Percent className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
              </div>
            </div>
          </div>

          {/* Mostrar cálculos de comisión */}
          {totals.commission_base_amount > 0 && (
            <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg">
              <div className="text-center">
                <p className="text-sm text-slate-600">Total sin IGV</p>
                <p className="text-lg font-bold text-slate-700">
                  S/ {totals.commission_base_amount.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-slate-600">Porcentaje</p>
                <p className="text-lg font-bold text-blue-600">{formData.commission_percentage || "0"}%</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-slate-600">Comisión a Pagar</p>
                <p className="text-lg font-bold text-green-600">
                  S/ {totals.commission_amount.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                </p>
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="commission_notes">Notas sobre la Comisión</Label>
            <Textarea
              id="commission_notes"
              value={formData.commission_notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, commission_notes: e.target.value }))}
              placeholder="Notas adicionales sobre el cálculo o pago de la comisión..."
            />
          </div>
        </CardContent>
      </Card>
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
          <CardDescription>Selecciona un producto y define sus precios</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <ProductSelector
                value={currentItem.product_id || ""}
                onSelect={(product) => {
                  const priceWithTax = product.sale_price * 1.18

                  setCurrentItem((prev) => ({
                    ...prev,
                    product_id: product.id,
                    product_code: product.code,
                    product_name: product.name,
                    product_description: product.description || product.name,
                    product_brand: product.brands?.name || "",
                    platform_unit_price_with_tax: priceWithTax,
                    reference_image_url: product.image_url || null,
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

          <div className="grid grid-cols-4 gap-4">
            <div>
              <Label>Precio Plataforma</Label>
              <Input
                type="number"
                step="0.0001"

                value={currentItem.platform_unit_price_with_tax || ""}
                onChange={(e) =>
                  setCurrentItem((prev) => ({
                    ...prev,
                    platform_unit_price_with_tax: Number.parseFloat(e.target.value) || 0,
                  }))
                }
              />
            </div>
            <div>
              <Label>Precio Proveedor</Label>
              <Input
                type="number"
                step="0.0001"

                value={currentItem.supplier_unit_price_with_tax || ""}
                onChange={(e) =>
                  setCurrentItem((prev) => ({
                    ...prev,
                    supplier_unit_price_with_tax: e.target.value ? Number.parseFloat(e.target.value) : null,
                  }))
                }
                placeholder="Opcional"
              />
            </div>
            <div>
              <Label>Precio Oferta</Label>
              <Input
                type="number"
                step="0.0001"
                value={currentItem.offer_unit_price_with_tax || ""}
                onChange={(e) =>
                  setCurrentItem((prev) => ({
                    ...prev,
                    offer_unit_price_with_tax: e.target.value ? Number.parseFloat(e.target.value) : null,
                  }))
                }
                placeholder="Opcional"
              />
            </div>
            <div>
              <Label>Techo Presupuestal</Label>
              <Input
                type="number"
                step="0.0001"

                value={currentItem.budget_ceiling_unit_price_with_tax || ""}
                onChange={(e) =>
                  setCurrentItem((prev) => ({
                    ...prev,
                    budget_ceiling_unit_price_with_tax: e.target.value ? Number.parseFloat(e.target.value) : null,
                  }))
                }
                placeholder="Precio máximo"
              />
            </div>
          </div>

          <Button
            type="button"
            onClick={addItem}
            className="w-full"
            disabled={!currentItem.product_id || !currentItem.quantity}
          >
            <Plus className="h-4 w-4 mr-2" />
            Agregar Producto
          </Button>
        </CardContent>
      </Card>
    </div>

    {/* Lista de Productos */}
    {items.length > 0 && (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Productos en la Cotización</h3>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>P. Plataforma</TableHead>
                  <TableHead>P. Oferta</TableHead>
                  <TableHead>Techo Presup.</TableHead>
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
                      S/ {item.platform_unit_price_with_tax.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                    </TableCell>
                    <TableCell>
                      {item.offer_unit_price_with_tax
                        ? `S/ ${item.offer_unit_price_with_tax.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {item.budget_ceiling_unit_price_with_tax
                        ? `S/ ${item.budget_ceiling_unit_price_with_tax.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`
                        : "-"}
                    </TableCell>
                    <TableCell className="font-medium">
                      S/{" "}
                      {(item.offer_total_with_tax || item.platform_total).toLocaleString("es-PE", {
                        minimumFractionDigits: 2,
                      })}
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
            <div className="grid grid-cols-5 gap-4">
              <div className="text-center p-3 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-600">Total Items</p>
                <p className="text-xl font-bold">{totals.total_items}</p>
              </div>
              <div className="text-center p-3 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-600">Total Plataforma</p>
                <p className="text-xl font-bold">
                  S/ {totals.platform_total.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                </p>
              </div>
              <div className="text-center p-3 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-600">Total Proveedor</p>
                <p className="text-xl font-bold">
                  S/ {totals.supplier_total.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                </p>
              </div>
              <div className="text-center p-3 bg-primary/10 rounded-lg">
                <p className="text-sm text-primary">Total Ofertado</p>
                <p className="text-xl font-bold text-primary">
                  S/ {totals.offer_total_with_tax.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                </p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-green-600">Comisión</p>
                <p className="text-xl font-bold text-green-600">
                  S/ {totals.commission_amount.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )}

    <Separator />

    {/* Información de Entrega */}
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Información de Entrega</h3>
      <div>
        <Label htmlFor="delivery_location">Lugar de Entrega *</Label>
        <Textarea
          id="delivery_location"
          value={formData.delivery_location}
          onChange={(e) => setFormData((prev) => ({ ...prev, delivery_location: e.target.value }))}
          placeholder="Dirección completa donde se realizará la entrega"
          required
        />
      </div>
    </div>

    <Separator />

    {/* Estado y Validez */}
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Estado y Validez</h3>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="status">Estado de la Cotización</Label>
          <Select
            value={formData.status}
            onValueChange={(value) => setFormData((prev) => ({ ...prev, status: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Borrador</SelectItem>
              <SelectItem value="sent">Enviada</SelectItem>
              <SelectItem value="approved">Aprobada</SelectItem>
              <SelectItem value="rejected">Rechazada</SelectItem>
              <SelectItem value="expired">Expirada</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Válida Hasta</Label>
          <DatePickerImproved
            date={formData.valid_until}
            setDate={(date) => setFormData((prev) => ({ ...prev, valid_until: date }))}
            placeholder="Seleccionar fecha de vencimiento"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="observations">Observaciones</Label>
        <Textarea
          id="observations"
          value={formData.observations}
          onChange={(e) => setFormData((prev) => ({ ...prev, observations: e.target.value }))}
          placeholder="Observaciones adicionales sobre la cotización..."
        />
      </div>
    </div>

    {/* Botones */}
    <div className="flex justify-end space-x-2 pt-4">
      <Button type="button" variant="outline" onClick={() => onSuccess()}>
        Cancelar
      </Button>
      <Button type="submit" disabled={loading || items.length === 0}>
        {loading ? "Creando..." : "Crear Cotización Multi-Producto"}
      </Button>
    </div>
  </form>
)
}
