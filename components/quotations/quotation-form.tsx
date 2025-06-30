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
import { Calculator } from "lucide-react"
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

interface SalesEntity {
  id: string
  name: string
  ruc: string
  executing_unit: string | null
}

interface QuotationFormProps {
  onSuccess: () => void
}

export default function QuotationForm({ onSuccess }: QuotationFormProps) {
  const { user } = useAuth()
  const { selectedCompany } = useCompany()
  const [loading, setLoading] = useState(false)

  console.log("QuotationForm rendered", { user: user?.id, selectedCompany: selectedCompany?.id })

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

  // Product data - para crear el item
  const [productData, setProductData] = useState({
    product_id: "",
    product_code: "",
    product_name: "",
    product_description: "",
    product_brand: "",
    quantity: "",
    platform_unit_price_with_tax: "",
    supplier_unit_price_with_tax: "",
    offer_unit_price_with_tax: "",
    final_unit_price_with_tax: "",
    budget_ceiling_unit_price_with_tax: "",
    reference_image_url: "",
  })

  // Calculated totals
  const [totals, setTotals] = useState({
    platform_total: 0,
    supplier_total: 0,
    offer_total_with_tax: 0,
    budget_ceiling_total: 0,
    commission_base_amount: 0,
    commission_amount: 0,
  })

  useEffect(() => {
    if (selectedCompany) {
    }
  }, [selectedCompany])

  // Calcular totales cuando cambian los valores
  useEffect(() => {
    const quantity = Number.parseFloat(productData.quantity) || 0
    const platformPrice = Number.parseFloat(productData.platform_unit_price_with_tax) || 0
    const supplierPrice = Number.parseFloat(productData.supplier_unit_price_with_tax) || 0
    const offerPrice = Number.parseFloat(productData.offer_unit_price_with_tax) || 0
    const budgetCeilingPrice = Number.parseFloat(productData.budget_ceiling_unit_price_with_tax) || 0

    const platformTotal = quantity * platformPrice
    const supplierTotal = quantity * supplierPrice
    const offerTotal = quantity * offerPrice
    const budgetCeilingTotal = quantity * budgetCeilingPrice

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
      commission_base_amount: commissionBaseAmount,
      commission_amount: commissionAmount,
    })
  }, [
    productData.quantity,
    productData.platform_unit_price_with_tax,
    productData.supplier_unit_price_with_tax,
    productData.offer_unit_price_with_tax,
    productData.budget_ceiling_unit_price_with_tax,
    formData.commission_percentage,
  ])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log("QuotationForm handleSubmit called", { selectedCompany, user })

    if (!selectedCompany || !user) {
      console.error("Missing selectedCompany or user", { selectedCompany, user })
      toast.error("Error: Falta información de empresa o usuario")
      return
    }

    setLoading(true)

    try {
      // Validaciones
      if (!formData.entity_id || !productData.product_id || !formData.delivery_location) {
        toast.error("Por favor completa todos los campos obligatorios")
        return
      }

      // Crear cotización - SOLO con campos que existen en la tabla
      const quotationData = {
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
        is_multi_product: false, // Producto único
        items_count: 1,
        // Campos de comisión
        contact_person: formData.contact_person || null,
        commission_percentage: formData.commission_percentage
          ? Number.parseFloat(formData.commission_percentage)
          : null,
        commission_base_amount: totals.commission_base_amount,
        commission_amount: totals.commission_amount,
        commission_notes: formData.commission_notes || null,
        // Total del techo presupuestal
        budget_ceiling_total: totals.budget_ceiling_total > 0 ? totals.budget_ceiling_total : null,
      }

      console.log("About to insert quotation data:", quotationData)

      const { data: quotation, error: quotationError } = await supabase
        .from("quotations")
        .insert([quotationData])
        .select()
        .single()

      if (quotationError) {
        console.error("Supabase insert error:", quotationError)
        throw quotationError
      }

      console.log("Quotation created successfully:", quotation.id)

      // Crear quotation item
      const itemData = {
        quotation_id: quotation.id,
        product_id: productData.product_id,
        product_code: productData.product_code,
        product_name: productData.product_name,
        product_description: productData.product_description,
        product_brand: productData.product_brand,
        quantity: Number.parseInt(productData.quantity),
        platform_unit_price_with_tax: Number.parseFloat(productData.platform_unit_price_with_tax),
        platform_total: totals.platform_total,
        supplier_unit_price_with_tax: productData.supplier_unit_price_with_tax
          ? Number.parseFloat(productData.supplier_unit_price_with_tax)
          : null,
        supplier_total: totals.supplier_total || null,
        offer_unit_price_with_tax: productData.offer_unit_price_with_tax
          ? Number.parseFloat(productData.offer_unit_price_with_tax)
          : null,
        offer_total_with_tax: totals.offer_total_with_tax || null,
        final_unit_price_with_tax: productData.final_unit_price_with_tax
          ? Number.parseFloat(productData.final_unit_price_with_tax)
          : null,
        budget_ceiling_unit_price_with_tax: productData.budget_ceiling_unit_price_with_tax
          ? Number.parseFloat(productData.budget_ceiling_unit_price_with_tax)
          : null,
        budget_ceiling_total: totals.budget_ceiling_total > 0 ? totals.budget_ceiling_total : null,
        reference_image_url: productData.reference_image_url || null,
      }

      console.log("Creating quotation item:", itemData)

      const { error: itemError } = await supabase.from("quotation_items").insert([itemData])

      if (itemError) {
        console.error("Item creation error:", itemError)
        throw itemError
      }

      console.log("Quotation item created successfully")

      toast.success("Cotización creada exitosamente")
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

      {/* Información del Producto */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Información del Producto</h3>

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <ProductSelector
              value={productData.product_id}
              onSelect={(product) => {
                console.log("QuotationForm: Product selected:", product)

                // Calcular precio con IGV (18%)
                const priceWithTax = product.sale_price * 1.18

                setProductData((prev) => ({
                  ...prev,
                  product_id: product.id,
                  product_code: product.code,
                  product_name: product.name,
                  product_description: product.description || product.name,
                  product_brand: product.brands?.name || "",
                  platform_unit_price_with_tax: priceWithTax.toFixed(2),
                  reference_image_url: product.image_url || "",
                }))

                toast.success("Producto seleccionado y datos cargados automáticamente")
              }}
              label="Producto"
              placeholder="Buscar o crear producto..."
              required
              showStock={true}
              showPrice={true}
            />
          </div>
          <div>
            <Label htmlFor="quantity">Cantidad (Unidades) *</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={productData.quantity}
              onChange={(e) => setProductData((prev) => ({ ...prev, quantity: e.target.value }))}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="product_code">Código del Producto</Label>
            <Input
              id="product_code"
              value={productData.product_code}
              onChange={(e) => setProductData((prev) => ({ ...prev, product_code: e.target.value }))}
              placeholder="Se llena automáticamente al seleccionar producto"
              disabled
            />
          </div>
          <div>
            <Label htmlFor="product_brand">Marca</Label>
            <Input
              id="product_brand"
              value={productData.product_brand}
              onChange={(e) => setProductData((prev) => ({ ...prev, product_brand: e.target.value }))}
              placeholder="Marca del producto"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="product_description">Descripción del Producto *</Label>
          <Textarea
            id="product_description"
            value={productData.product_description}
            onChange={(e) => setProductData((prev) => ({ ...prev, product_description: e.target.value }))}
            placeholder="Descripción detallada del producto"
            required
          />
        </div>
      </div>

      <Separator />

      {/* Precios y Cálculos */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Precios y Cálculos
        </h3>

        {/* Precio de Plataforma */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Precio de Plataforma</CardTitle>
            <CardDescription>Precio extraído automáticamente del producto en la plataforma</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="platform_unit_price">Precio Unitario con IGV</Label>
                <Input
                  id="platform_unit_price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={productData.platform_unit_price_with_tax}
                  onChange={(e) =>
                    setProductData((prev) => ({ ...prev, platform_unit_price_with_tax: e.target.value }))
                  }
                  required
                />
              </div>
              <div>
                <Label>Total (Plataforma)</Label>
                <div className="flex items-center h-10 px-3 py-2 border border-input bg-muted rounded-md">
                  <span className="font-semibold">
                    S/ {totals.platform_total.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
              <div>
                <Label htmlFor="reference_image">Imagen Referencial (URL)</Label>
                <Input
                  id="reference_image"
                  value={productData.reference_image_url}
                  onChange={(e) => setProductData((prev) => ({ ...prev, reference_image_url: e.target.value }))}
                  placeholder="URL de la imagen"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Precio de Proveedor */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Precio de Proveedor</CardTitle>
            <CardDescription>Precio que ofrece el proveedor (editable)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="supplier_unit_price">Precio Unitario con IGV (Proveedor)</Label>
                <Input
                  id="supplier_unit_price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={productData.supplier_unit_price_with_tax}
                  onChange={(e) =>
                    setProductData((prev) => ({ ...prev, supplier_unit_price_with_tax: e.target.value }))
                  }
                  placeholder="Precio del proveedor"
                />
              </div>
              <div>
                <Label>Total a Ofertar con IGV</Label>
                <div className="flex items-center h-10 px-3 py-2 border border-input bg-muted rounded-md">
                  <span className="font-semibold">
                    S/ {totals.supplier_total.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Precio de Oferta */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Precio de Oferta a la Entidad</CardTitle>
            <CardDescription>Precio que se ofertará al cliente</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="offer_unit_price">Precio Unitario con IGV (Oferta)</Label>
                <Input
                  id="offer_unit_price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={productData.offer_unit_price_with_tax}
                  onChange={(e) => setProductData((prev) => ({ ...prev, offer_unit_price_with_tax: e.target.value }))}
                  placeholder="Precio de oferta"
                />
              </div>
              <div>
                <Label>Total Ofertado Incluido IGV</Label>
                <div className="flex items-center h-10 px-3 py-2 border border-input bg-primary/10 rounded-md">
                  <span className="font-bold text-primary">
                    S/ {totals.offer_total_with_tax.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Precios Finales */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Precios Finales (Editables)</CardTitle>
            <CardDescription>Campos que pueden ser modificados según necesidades específicas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="final_unit_price">Unitario con IGV (Final)</Label>
                <Input
                  id="final_unit_price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={productData.final_unit_price_with_tax}
                  onChange={(e) => setProductData((prev) => ({ ...prev, final_unit_price_with_tax: e.target.value }))}
                  placeholder="Precio final"
                />
              </div>
              <div>
                <Label htmlFor="budget_ceiling_unit_price">Techo Presupuestal Unitario</Label>
                <Input
                  id="budget_ceiling_unit_price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={productData.budget_ceiling_unit_price_with_tax}
                  onChange={(e) =>
                    setProductData((prev) => ({ ...prev, budget_ceiling_unit_price_with_tax: e.target.value }))
                  }
                  placeholder="Precio máximo por unidad"
                />
              </div>
            </div>
            {totals.budget_ceiling_total > 0 && (
              <div className="mt-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
                <Label className="text-sm font-medium text-orange-600">Total Techo Presupuestal</Label>
                <p className="text-lg font-bold text-orange-700">
                  S/ {totals.budget_ceiling_total.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Información de Comisión */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Información de Comisión</CardTitle>
            <CardDescription>Cálculo de comisión para el contacto/vendedor</CardDescription>
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
              </div>
            </div>

            {/* Mostrar cálculos de comisión */}
            {totals.commission_base_amount > 0 && (
              <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg">
                <div className="text-center">
                  <p className="text-sm text-slate-600">Total sin IGV</p>
                  <p className="text-lg font-bold text-slate-700">
                    S/ {totals.commission_base_amount.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-slate-600">Porcentaje</p>
                  <p className="text-lg font-bold text-blue-600">{formData.commission_percentage || "0"}%</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-slate-600">Comisión a Pagar</p>
                  <p className="text-lg font-bold text-green-600">
                    S/ {totals.commission_amount.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
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
        <div className="grid grid-cols-2 gap-4">
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
        <Button type="submit" disabled={loading}>
          {loading ? "Creando..." : "Crear Cotización"}
        </Button>
      </div>
    </form>
  )
}
