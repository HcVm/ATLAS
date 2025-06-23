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

  // Form state
  const [formData, setFormData] = useState({
    entity_id: "",
    entity_name: "",
    entity_ruc: "",
    delivery_location: "",
    unique_code: "",
    product_id: "",
    product_description: "",
    product_brand: "",
    quantity: "",
    platform_unit_price_with_tax: "",
    supplier_unit_price_with_tax: "",
    offer_unit_price_with_tax: "",
    final_unit_price_with_tax: "",
    budget_ceiling: "",
    reference_image_url: "",
    status: "draft",
    valid_until: undefined as Date | undefined,
    observations: "",
  })

  // Calculated totals
  const [totals, setTotals] = useState({
    platform_total: 0,
    supplier_total: 0,
    offer_total_with_tax: 0,
  })

  useEffect(() => {
    if (selectedCompany) {
    }
  }, [selectedCompany])

  // Calcular totales cuando cambian los valores
  useEffect(() => {
    const quantity = Number.parseFloat(formData.quantity) || 0
    const platformPrice = Number.parseFloat(formData.platform_unit_price_with_tax) || 0
    const supplierPrice = Number.parseFloat(formData.supplier_unit_price_with_tax) || 0
    const offerPrice = Number.parseFloat(formData.offer_unit_price_with_tax) || 0

    setTotals({
      platform_total: quantity * platformPrice,
      supplier_total: quantity * supplierPrice,
      offer_total_with_tax: quantity * offerPrice,
    })
  }, [
    formData.quantity,
    formData.platform_unit_price_with_tax,
    formData.supplier_unit_price_with_tax,
    formData.offer_unit_price_with_tax,
  ])

  /* REMOVE
  const searchProductByCode = async () => {
    if (!selectedCompany || !formData.unique_code.trim()) {
      toast.error("Ingresa un código de producto")
      return
    }

    setSearchingProduct(true)

    try {
      const { data, error } = await supabase
        .from("products")
        .select(`
        id, code, name, description, sale_price, current_stock, image_url,
        brands (name)
      `)
        .eq("company_id", selectedCompany.id)
        .eq("code", formData.unique_code.trim())
        .eq("is_active", true)
        .single()

      if (error) {
        if (error.code === "PGRST116") {
          toast.error("No se encontró un producto con ese código")
        } else {
          console.error("Error searching product:", error)
          toast.error("Error al buscar el producto: " + error.message)
        }
        return
      }

      // Calcular precio con IGV (18%)
      const priceWithTax = data.sale_price * 1.18

      // Llenar automáticamente los campos del producto
      setFormData((prev) => ({
        ...prev,
        product_id: data.id,
        product_description: data.description || data.name,
        product_brand: data.brands?.name || "",
        platform_unit_price_with_tax: priceWithTax.toFixed(2),
        reference_image_url: data.image_url || "",
      }))

      toast.success("Producto encontrado y cargado automáticamente")
    } catch (error: any) {
      console.error("Error searching product:", error)
      toast.error("Error al buscar el producto: " + (error.message || "Error desconocido"))
    } finally {
      setSearchingProduct(false)
    }
  }
  */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCompany || !user) return

    setLoading(true)

    try {
      // Validaciones
      if (!formData.entity_id || !formData.unique_code || !formData.delivery_location) {
        toast.error("Por favor completa todos los campos obligatorios")
        return
      }

      const quotationData = {
        company_id: selectedCompany.id,
        company_name: selectedCompany.name,
        company_ruc: selectedCompany.ruc || "",
        entity_id: formData.entity_id,
        entity_name: formData.entity_name,
        entity_ruc: formData.entity_ruc,
        delivery_location: formData.delivery_location,
        product_id: formData.product_id,
        unique_code: formData.unique_code,
        product_description: formData.product_description,
        product_brand: formData.product_brand,
        quantity: Number.parseInt(formData.quantity),
        platform_unit_price_with_tax: Number.parseFloat(formData.platform_unit_price_with_tax),
        platform_total: totals.platform_total,
        supplier_unit_price_with_tax: formData.supplier_unit_price_with_tax
          ? Number.parseFloat(formData.supplier_unit_price_with_tax)
          : null,
        supplier_total: totals.supplier_total || null,
        offer_unit_price_with_tax: formData.offer_unit_price_with_tax
          ? Number.parseFloat(formData.offer_unit_price_with_tax)
          : null,
        offer_total_with_tax: totals.offer_total_with_tax || null,
        final_unit_price_with_tax: formData.final_unit_price_with_tax
          ? Number.parseFloat(formData.final_unit_price_with_tax)
          : null,
        budget_ceiling: formData.budget_ceiling ? Number.parseFloat(formData.budget_ceiling) : null,
        reference_image_url: formData.reference_image_url || null,
        status: formData.status,
        valid_until: formData.valid_until?.toISOString().split("T")[0] || null,
        observations: formData.observations,
        created_by: user.id,
      }

      const { error } = await supabase.from("quotations").insert([quotationData])

      if (error) throw error

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
              value={formData.product_id}
              onSelect={(product) => {
                console.log("QuotationForm: Product selected:", product)

                // Calcular precio con IGV (18%)
                const priceWithTax = product.sale_price * 1.18

                setFormData((prev) => ({
                  ...prev,
                  product_id: product.id,
                  unique_code: product.code,
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
              value={formData.quantity}
              onChange={(e) => setFormData((prev) => ({ ...prev, quantity: e.target.value }))}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="unique_code">Código del Producto</Label>
            <Input
              id="unique_code"
              value={formData.unique_code}
              onChange={(e) => setFormData((prev) => ({ ...prev, unique_code: e.target.value }))}
              placeholder="Se llena automáticamente al seleccionar producto"
              disabled
            />
          </div>
          <div>
            <Label htmlFor="product_brand">Marca</Label>
            <Input
              id="product_brand"
              value={formData.product_brand}
              onChange={(e) => setFormData((prev) => ({ ...prev, product_brand: e.target.value }))}
              placeholder="Marca del producto"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="product_description">Descripción del Producto *</Label>
          <Textarea
            id="product_description"
            value={formData.product_description}
            onChange={(e) => setFormData((prev) => ({ ...prev, product_description: e.target.value }))}
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
                  value={formData.platform_unit_price_with_tax}
                  onChange={(e) => setFormData((prev) => ({ ...prev, platform_unit_price_with_tax: e.target.value }))}
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
                  value={formData.reference_image_url}
                  onChange={(e) => setFormData((prev) => ({ ...prev, reference_image_url: e.target.value }))}
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
                  value={formData.supplier_unit_price_with_tax}
                  onChange={(e) => setFormData((prev) => ({ ...prev, supplier_unit_price_with_tax: e.target.value }))}
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
                  value={formData.offer_unit_price_with_tax}
                  onChange={(e) => setFormData((prev) => ({ ...prev, offer_unit_price_with_tax: e.target.value }))}
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
                  value={formData.final_unit_price_with_tax}
                  onChange={(e) => setFormData((prev) => ({ ...prev, final_unit_price_with_tax: e.target.value }))}
                  placeholder="Precio final"
                />
              </div>
              <div>
                <Label htmlFor="budget_ceiling">Techo Presupuestal</Label>
                <Input
                  id="budget_ceiling"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.budget_ceiling}
                  onChange={(e) => setFormData((prev) => ({ ...prev, budget_ceiling: e.target.value }))}
                  placeholder="Límite presupuestal"
                />
              </div>
            </div>
          </CardContent>
        </Card>
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
