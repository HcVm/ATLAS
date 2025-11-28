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
import { AlertTriangle, Search } from "lucide-react"
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

interface Quotation {
  id: string
  quotation_number: string
  entity_name: string
  entity_ruc: string
  product_description: string
  unique_code: string
  quantity: number
  offer_unit_price_with_tax: number | null
  final_unit_price_with_tax: number | null
}

interface SaleFormProps {
  onSuccess: () => void
}

// Función para generar número de venta
const generateSaleNumber = async (companyId: string, companyCode: string): Promise<string> => {
  const currentYear = new Date().getFullYear()

  try {
    // Buscar el último número de venta para esta empresa y año
    const { data: lastSale, error } = await supabase
      .from("sales")
      .select("sale_number")
      .eq("company_id", companyId)
      .like("sale_number", `VEN-${currentYear}-${companyCode}-%`)
      .order("created_at", { ascending: false })
      .limit(1)

    if (error) {
      console.error("Error fetching last sale:", error)
      // Si hay error, usar número 1
      return `VEN-${currentYear}-${companyCode}-0001`
    }

    let nextNumber = 1

    if (lastSale && lastSale.length > 0) {
      const lastNumber = lastSale[0].sale_number
      // Extraer el número del formato VEN-2025-ARM-0001
      const match = lastNumber?.match(/-(\d+)$/)
      if (match) {
        nextNumber = Number.parseInt(match[1]) + 1
      }
    }

    // Formatear con ceros a la izquierda (4 dígitos)
    const formattedNumber = nextNumber.toString().padStart(4, "0")
    return `VEN-${currentYear}-${companyCode}-${formattedNumber}`
  } catch (error) {
    console.error("Error generating sale number:", error)
    return `VEN-${currentYear}-${companyCode}-0001`
  }
}

export default function SaleForm({ onSuccess }: SaleFormProps) {
  const { user } = useAuth()
  const { selectedCompany } = useCompany()
  const [loading, setLoading] = useState(false)
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [searchingQuotation, setSearchingQuotation] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    entity_id: "",
    entity_name: "",
    entity_ruc: "",
    entity_executing_unit: "",
    quotation_id: "",
    quotation_code: "",
    quotation_search: "",
    exp_siaf: "",
    quantity: "1",
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
    unit_price_with_tax: "0",
    delivery_start_date: undefined as Date | undefined,
    delivery_end_date: undefined as Date | undefined,
    observations: "",
    sale_status: "",
  })

  const [stockWarning, setStockWarning] = useState("")
  const [totalSale, setTotalSale] = useState(0)

  useEffect(() => {
    if (selectedCompany) {
      fetchQuotations()
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
      //TODO: Implement stock check with ProductSelector
      setStockWarning("")
    }
  }, [formData.product_id, formData.quantity])

  const fetchQuotations = async () => {
    if (!selectedCompany) return

    console.log("Fetching quotations for company:", selectedCompany.id)

    try {
      const { data, error } = await supabase
        .from("quotations")
        .select(
          "id, quotation_number, entity_name, entity_ruc, product_description, unique_code, quantity, offer_unit_price_with_tax, final_unit_price_with_tax",
        )
        .eq("company_id", selectedCompany.id)
        .eq("status", "approved")
        .order("created_at", { ascending: false })

      console.log("Quotations fetch result:", { data, error })

      if (error) throw error
      setQuotations(data || [])
    } catch (error: any) {
      console.error("Error fetching quotations:", error)
      toast.error("Error al cargar cotizaciones: " + error.message)
    }
  }

  const searchQuotationByCode = async () => {
    if (!selectedCompany || !formData.quotation_search.trim()) {
      toast.error("Ingresa un código de cotización")
      return
    }

    console.log("Searching quotation with:", {
      company_id: selectedCompany.id,
      quotation_number: formData.quotation_search.trim(),
    })

    setSearchingQuotation(true)

    try {
      // Primero buscar la cotización base
      const { data: quotationData, error: quotationError } = await supabase
        .from("quotations")
        .select(
          "id, quotation_number, entity_name, entity_ruc, status, product_description, unique_code, quantity, offer_unit_price_with_tax, final_unit_price_with_tax",
        )
        .eq("company_id", selectedCompany.id)
        .eq("quotation_number", formData.quotation_search.trim())
        .eq("status", "approved")
        .single()

      console.log("Quotation query result:", { data: quotationData, error: quotationError })

      if (quotationError) {
        if (quotationError.code === "PGRST116") {
          toast.error("No se encontró una cotización aprobada con ese código")
        } else {
          console.error("Error searching quotation:", quotationError)
          toast.error("Error al buscar la cotización: " + quotationError.message)
        }
        return
      }

      if (!quotationData) {
        toast.error("No se encontró la cotización")
        return
      }

      // Verificar si es una cotización multi-producto
      const { data: quotationItems, error: itemsError } = await supabase
        .from("quotation_items")
        .select(
          "product_id, product_code, product_name, quantity, offer_unit_price_with_tax, final_unit_price_with_tax",
        )
        .eq("quotation_id", quotationData.id)

      if (itemsError) {
        console.error("Error checking quotation items:", itemsError)
      }

      // Si tiene múltiples productos, mostrar advertencia
      if (quotationItems && quotationItems.length > 1) {
        toast.error(
          "Esta cotización tiene múltiples productos. Usa el formulario de venta multi-producto para procesarla completa, o completa manualmente los datos del producto que deseas vender.",
        )
      }

      // Llenar automáticamente los campos de la cotización (datos básicos)
      setFormData((prev) => ({
        ...prev,
        quotation_id: quotationData.id,
        quotation_code: quotationData.quotation_number,
        entity_name: quotationData.entity_name,
        entity_ruc: quotationData.entity_ruc,
        product_description: quotationData.product_description || "",
        product_code: quotationData.unique_code || "",
        quantity: (quotationData.quantity || 1).toString(),
        unit_price_with_tax: (
          quotationData.final_unit_price_with_tax ||
          quotationData.offer_unit_price_with_tax ||
          0
        ).toString(),
      }))

      if (quotationItems && quotationItems.length === 1) {
        // Si solo tiene un producto, llenar con los datos del item
        const item = quotationItems[0]
        setFormData((prev) => ({
          ...prev,
          product_code: item.product_code || prev.product_code,
          product_name: item.product_name || "",
          quantity: (item.quantity || 1).toString(),
          unit_price_with_tax: (item.final_unit_price_with_tax || item.offer_unit_price_with_tax || 0).toString(),
        }))
        toast.success("Cotización encontrada y datos cargados automáticamente")
      } else if (quotationItems && quotationItems.length > 1) {
        toast.warning(
          "Cotización encontrada con múltiples productos. Completa manualmente los datos del producto específico que deseas vender.",
        )
      } else {
        toast.success("Cotización encontrada. Los datos del producto deben completarse manualmente")
      }
    } catch (error: any) {
      console.error("Error searching quotation:", error)
      toast.error("Error al buscar la cotización: " + (error.message || "Error desconocido"))
    } finally {
      setSearchingQuotation(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCompany || !user) return

    setLoading(true)

    try {
      // Validaciones
      if (!formData.entity_id || !formData.product_code || !formData.quotation_code) {
        toast.error("Por favor completa todos los campos obligatorios")
        return
      }

      const quantity = Number.parseInt(formData.quantity) || 0
      const unitPrice = Number.parseFloat(formData.unit_price_with_tax) || 0

      if (quantity < 0) {
        toast.error("La cantidad no puede ser negativa")
        return
      }

      if (unitPrice < 0) {
        toast.error("El precio unitario no puede ser negativo")
        return
      }

      // Generar número de venta automático
      const saleNumber = await generateSaleNumber(selectedCompany.id, selectedCompany.code || "GEN")

      // Crear venta
      const saleData = {
        sale_number: saleNumber,
        company_id: selectedCompany.id,
        company_name: selectedCompany.name,
        company_ruc: selectedCompany.ruc || "",
        entity_id: formData.entity_id,
        entity_name: formData.entity_name,
        entity_ruc: formData.entity_ruc,
        entity_executing_unit: formData.entity_executing_unit || null,
        quotation_id: formData.quotation_id || null,
        quotation_code: formData.quotation_code,
        exp_siaf: formData.exp_siaf,
        quantity: Number.parseInt(formData.quantity),
        product_id: formData.product_id || null,
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
        delivery_start_date: formData.delivery_start_date?.toISOString().split("T")[0] || null,
        delivery_end_date: formData.delivery_end_date?.toISOString().split("T")[0] || null,
        observations: formData.observations,
        created_by: user.id,
        sale_status: formData.sale_status,
      }

      const { error } = await supabase.from("sales").insert([saleData])

      if (error) throw error

      // Enviar notificaciones al personal de almacén
      try {
        // Buscar usuarios del departamento de almacén de la misma empresa
        const { data: warehouseUsers, error: usersError } = await supabase
          .from("profiles")
          .select("id, full_name, email, departments!profiles_department_id_fkey!inner(name)")
          .eq("company_id", selectedCompany.id)
          .eq("departments.name", "Almacén")
          .neq("id", user.id) // Excluir al usuario actual

        if (usersError) {
          console.error("Error fetching warehouse users:", usersError)
        } else if (warehouseUsers && warehouseUsers.length > 0) {
          // Crear notificaciones para cada usuario de almacén
          const notifications = warehouseUsers.map((warehouseUser) => ({
            user_id: warehouseUser.id,
            title: "Nueva Venta Registrada",
            message: `Se ha registrado una nueva venta para ${formData.entity_name}. Se requiere registrar la salida de productos en el módulo de almacén.`,
            type: "sale_created",
            related_id: null, // No tenemos el ID de la venta en este punto
            company_id: selectedCompany.id,
            read: false,
          }))

          const { error: notificationError } = await supabase.from("notifications").insert(notifications)

          if (notificationError) {
            console.error("Error creating notifications:", notificationError)
          } else {
            console.log(`Notificaciones enviadas a ${warehouseUsers.length} usuarios de almacén`)
          }
        }
      } catch (error) {
        console.error("Error in notification process:", error)
        // No interrumpir el flujo principal si falla el envío de notificaciones
      }

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
        {selectedCompany?.code && (
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-700">
              <strong>Código de empresa:</strong> {selectedCompany.code} - Las ventas se generarán con el formato: VEN-
              {new Date().getFullYear()}-{selectedCompany.code}-XXXX
            </p>
          </div>
        )}
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
            Ingresa el código de cotización y presiona buscar para vincular automáticamente
          </p>
          {formData.quotation_id && (
            <p className="text-sm text-green-600 mt-1">
              ✓ Cotización {formData.quotation_code} vinculada. Los datos del cliente y producto se han pre-cargado
              automáticamente.
            </p>
          )}
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

      {/* Información del Producto */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Información del Producto</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <ProductSelector
              value={formData.product_id}
              onSelect={(product) => {
                console.log("SaleForm: Product selected:", product)

                setFormData((prev) => ({
                  ...prev,
                  product_id: product.id,
                  product_code: product.code,
                  product_name: product.name,
                  product_description: product.description || "",
                  product_brand: product.brands?.name || "",
                  unit_price_with_tax: product.sale_price.toString(),
                }))

                toast.success("Producto seleccionado y datos cargados automáticamente")
              }}
              label="Producto"
              placeholder="Buscar producto..."
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
            <Label htmlFor="product_code">Código del Producto</Label>
            <Input
              id="product_code"
              value={formData.product_code}
              onChange={(e) => setFormData((prev) => ({ ...prev, product_code: e.target.value }))}
              placeholder="Se llena automáticamente al seleccionar producto"
            />
          </div>
          <div>
            <Label htmlFor="product_name">Nombre del Producto</Label>
            <Input
              id="product_name"
              value={formData.product_name}
              onChange={(e) => setFormData((prev) => ({ ...prev, product_name: e.target.value }))}
              placeholder="Se llena automáticamente al seleccionar producto"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
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
                <SelectItem value="comprometido">Comprometido</SelectItem>
                <SelectItem value="devengado">Devengado</SelectItem>
                <SelectItem value="girado">Girado</SelectItem>
                <SelectItem value="firmado">Firmado</SelectItem>
                <SelectItem value="rechazada">Rechazada</SelectItem>
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

      {/* Información de Entrega */}
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
