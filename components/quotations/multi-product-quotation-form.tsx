"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
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
import { Calculator, Plus, Trash2, Package, Users, Percent, Building2, MapPin, Calendar, FileText, Check, AlertCircle } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useCompany } from "@/lib/company-context"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { EntitySelector } from "@/components/ui/entity-selector"
import { ProductSelector } from "@/components/ui/product-selector"
import { cn } from "@/lib/utils"

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
  onCancel?: () => void
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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3 }
  }
}

export default function MultiProductQuotationForm({ onSuccess, onCancel }: MultiProductQuotationFormProps) {
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
    <motion.form
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      onSubmit={handleSubmit}
      className="space-y-8 pb-8"
    >
      {/* Información de la Empresa y Cliente */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-none shadow-sm bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-slate-700 dark:text-slate-200">
              <Building2 className="h-4 w-4 text-indigo-500" /> Información de la Empresa
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs uppercase text-slate-500">Empresa</Label>
                <div className="font-medium">{selectedCompany?.name || "---"}</div>
              </div>
              <div>
                <Label className="text-xs uppercase text-slate-500">RUC</Label>
                <div className="font-mono">{selectedCompany?.ruc || "---"}</div>
              </div>
            </div>
            {selectedCompany?.code && (
              <div className="p-3 bg-blue-50/80 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
                <p className="text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>
                    Cotizaciones con prefijo: <strong>COT-{new Date().getFullYear()}-{selectedCompany.code}</strong>
                  </span>
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-slate-700 dark:text-slate-200">
              <Users className="h-4 w-4 text-emerald-500" /> Información del Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
            {formData.entity_ruc && (
              <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 rounded-lg">
                <Check className="h-3 w-3" />
                RUC: {formData.entity_ruc}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Información de Comisión */}
      <motion.div variants={itemVariants}>
        <Card className="border-none shadow-md bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-violet-500 to-fuchsia-500" />
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Percent className="h-5 w-5 text-violet-500" />
              Gestión de Comisiones
            </CardTitle>
            <CardDescription>Define el contacto comercial y los porcentajes de comisión aplicables</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="contact_person">Nombre del Contacto/Vendedor</Label>
                  <div className="relative mt-1">
                    <Users className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      id="contact_person"
                      className="pl-9 rounded-xl"
                      value={formData.contact_person}
                      onChange={(e) => setFormData((prev) => ({ ...prev, contact_person: e.target.value }))}
                      placeholder="Ej: Juan Pérez"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="commission_percentage">Porcentaje (%)</Label>
                  <div className="relative mt-1">
                    <Input
                      id="commission_percentage"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      className="rounded-xl pr-9"
                      value={formData.commission_percentage}
                      onChange={(e) => setFormData((prev) => ({ ...prev, commission_percentage: e.target.value }))}
                      placeholder="Ej: 5.0"
                    />
                    <Percent className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
                  </div>
                </div>
              </div>

              <div className="bg-slate-50/80 dark:bg-slate-800/50 rounded-xl p-4 space-y-3 border border-slate-100 dark:border-slate-700">
                <Label className="text-slate-500">Resumen de Comisión</Label>
                {totals.commission_base_amount > 0 ? (
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 bg-white dark:bg-slate-900 rounded-lg shadow-sm">
                      <p className="text-[10px] uppercase text-slate-400 font-bold mb-1">Base (Sin IGV)</p>
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">S/ {totals.commission_base_amount.toLocaleString("es-PE", { maximumFractionDigits: 0 })}</p>
                    </div>
                    <div className="p-2 bg-white dark:bg-slate-900 rounded-lg shadow-sm">
                      <p className="text-[10px] uppercase text-slate-400 font-bold mb-1">Tasa</p>
                      <p className="text-sm font-bold text-violet-600">{formData.commission_percentage || "0"}%</p>
                    </div>
                    <div className="p-2 bg-violet-50 dark:bg-violet-900/20 rounded-lg border border-violet-100 dark:border-violet-800/50">
                      <p className="text-[10px] uppercase text-violet-400 font-bold mb-1">A Pagar</p>
                      <p className="text-sm font-bold text-violet-700 dark:text-violet-300">S/ {totals.commission_amount.toLocaleString("es-PE", { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-24 text-slate-400 text-sm italic">
                    <AlertCircle className="h-8 w-8 mb-2 opacity-20" />
                    Agrega productos y define % para calcular
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="commission_notes">Notas Internas</Label>
              <Textarea
                id="commission_notes"
                className="mt-1 rounded-xl resize-none"
                rows={2}
                value={formData.commission_notes}
                onChange={(e) => setFormData((prev) => ({ ...prev, commission_notes: e.target.value }))}
                placeholder="Detalles sobre el acuerdo de comisión..."
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Agregar Productos */}
      <motion.div variants={itemVariants}>
        <Card className="border-none shadow-md bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-blue-500 to-indigo-500" />
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-500" />
              Productos
            </CardTitle>
            <CardDescription>Agrega los items que formarán parte de esta cotización</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-5 bg-slate-50/50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-8">
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
                    label="Seleccionar Producto"
                    placeholder="Buscar por nombre o código..."
                    required
                    showStock={true}
                    showPrice={true}
                  />
                </div>
                <div className="md:col-span-4">
                  <Label htmlFor="quantity">Cantidad</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    className="mt-1 rounded-xl"
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

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label className="text-xs text-slate-500">Precio Plataforma</Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-2.5 text-slate-400 text-xs">S/</span>
                    <Input
                      type="number"
                      step="0.0001"
                      className="pl-7 rounded-xl"
                      value={currentItem.platform_unit_price_with_tax || ""}
                      onChange={(e) =>
                        setCurrentItem((prev) => ({
                          ...prev,
                          platform_unit_price_with_tax: Number.parseFloat(e.target.value) || 0,
                        }))
                      }
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Precio Proveedor (Opc)</Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-2.5 text-slate-400 text-xs">S/</span>
                    <Input
                      type="number"
                      step="0.0001"
                      className="pl-7 rounded-xl"
                      value={currentItem.supplier_unit_price_with_tax || ""}
                      onChange={(e) =>
                        setCurrentItem((prev) => ({
                          ...prev,
                          supplier_unit_price_with_tax: e.target.value ? Number.parseFloat(e.target.value) : null,
                        }))
                      }
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Precio Oferta (Opc)</Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-2.5 text-slate-400 text-xs">S/</span>
                    <Input
                      type="number"
                      step="0.0001"
                      className="pl-7 rounded-xl border-blue-200 focus:border-blue-400"
                      value={currentItem.offer_unit_price_with_tax || ""}
                      onChange={(e) =>
                        setCurrentItem((prev) => ({
                          ...prev,
                          offer_unit_price_with_tax: e.target.value ? Number.parseFloat(e.target.value) : null,
                        }))
                      }
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Techo Presupuestal</Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-2.5 text-slate-400 text-xs">S/</span>
                    <Input
                      type="number"
                      step="0.0001"
                      className="pl-7 rounded-xl"
                      value={currentItem.budget_ceiling_unit_price_with_tax || ""}
                      onChange={(e) =>
                        setCurrentItem((prev) => ({
                          ...prev,
                          budget_ceiling_unit_price_with_tax: e.target.value ? Number.parseFloat(e.target.value) : null,
                        }))
                      }
                      placeholder="Max"
                    />
                  </div>
                </div>
              </div>

              <Button
                type="button"
                onClick={addItem}
                className="w-full rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 shadow-lg shadow-slate-900/10"
                disabled={!currentItem.product_id || !currentItem.quantity}
              >
                <Plus className="h-4 w-4 mr-2" />
                Agregar a la Lista
              </Button>
            </div>

            {/* Lista de Productos */}
            <AnimatePresence>
              {items.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4"
                >
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <Table>
                      <TableHeader className="bg-slate-50 dark:bg-slate-800">
                        <TableRow>
                          <TableHead className="pl-4">Producto</TableHead>
                          <TableHead className="text-center">Cant.</TableHead>
                          <TableHead className="text-right">Unitario</TableHead>
                          <TableHead className="text-right">Oferta</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((item, index) => (
                          <TableRow key={index} className="hover:bg-slate-50/50">
                            <TableCell className="pl-4">
                              <div className="font-medium text-slate-900 dark:text-slate-100">{item.product_name}</div>
                              <div className="text-xs text-slate-500 font-mono">{item.product_code}</div>
                            </TableCell>
                            <TableCell className="text-center font-medium">{item.quantity}</TableCell>
                            <TableCell className="text-right text-slate-500">
                              S/ {item.platform_unit_price_with_tax.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-right">
                              {item.offer_unit_price_with_tax ? (
                                <span className="text-blue-600 font-bold">
                                  S/ {item.offer_unit_price_with_tax.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                                </span>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-bold text-slate-900 dark:text-slate-100">
                              S/ {(item.offer_total_with_tax || item.platform_total).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeItem(index)}
                                className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Totales Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="border-none bg-slate-50 dark:bg-slate-800 shadow-sm">
                      <CardContent className="p-4 text-center">
                        <p className="text-xs uppercase text-slate-500 font-bold">Items</p>
                        <p className="text-2xl font-bold text-slate-700 dark:text-slate-300">{totals.total_items}</p>
                      </CardContent>
                    </Card>
                    <Card className="border-none bg-slate-50 dark:bg-slate-800 shadow-sm">
                      <CardContent className="p-4 text-center">
                        <p className="text-xs uppercase text-slate-500 font-bold">Total Plataforma</p>
                        <p className="text-lg font-bold text-slate-600">S/ {totals.platform_total.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      </CardContent>
                    </Card>
                    <Card className="border-none bg-blue-50 dark:bg-blue-900/20 shadow-sm">
                      <CardContent className="p-4 text-center">
                        <p className="text-xs uppercase text-blue-500 font-bold">Total Ofertado</p>
                        <p className="text-xl font-bold text-blue-700 dark:text-blue-300">S/ {totals.offer_total_with_tax.toLocaleString("es-PE", { minimumFractionDigits: 2 })}</p>
                      </CardContent>
                    </Card>
                    <Card className="border-none bg-emerald-50 dark:bg-emerald-900/20 shadow-sm">
                      <CardContent className="p-4 text-center">
                        <p className="text-xs uppercase text-emerald-600 font-bold">Comisión Estimada</p>
                        <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400">S/ {totals.commission_amount.toLocaleString("es-PE", { minimumFractionDigits: 2 })}</p>
                      </CardContent>
                    </Card>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>

      {/* Información de Entrega y Estado */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-none shadow-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4 text-orange-500" /> Logística
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Label htmlFor="delivery_location">Lugar de Entrega *</Label>
            <Textarea
              id="delivery_location"
              className="mt-1 rounded-xl resize-none"
              rows={3}
              value={formData.delivery_location}
              onChange={(e) => setFormData((prev) => ({ ...prev, delivery_location: e.target.value }))}
              placeholder="Dirección exacta de entrega..."
              required
            />
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-slate-500" /> Detalles Finales
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Estado</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, status: value }))}
                >
                  <SelectTrigger className="mt-1 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Borrador</SelectItem>
                    <SelectItem value="sent">Enviada</SelectItem>
                    <SelectItem value="approved">Aprobada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Válida Hasta</Label>
                <div className="mt-1">
                  <DatePickerImproved
                    date={formData.valid_until}
                    setDate={(date) => setFormData((prev) => ({ ...prev, valid_until: date }))}
                    placeholder="Vencimiento"
                  />
                </div>
              </div>
            </div>
            <div>
              <Label htmlFor="observations">Observaciones</Label>
              <Input
                id="observations"
                className="mt-1 rounded-xl"
                value={formData.observations}
                onChange={(e) => setFormData((prev) => ({ ...prev, observations: e.target.value }))}
                placeholder="Notas adicionales..."
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Footer Actions */}
      <motion.div variants={itemVariants} className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel || onSuccess}
          className="rounded-xl px-6"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={loading || items.length === 0}
          className="rounded-xl px-8 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20"
        >
          {loading ? (
            <>
              <span className="animate-spin mr-2">⟳</span> Procesando...
            </>
          ) : (
            <>
              <Check className="h-4 w-4 mr-2" /> Crear Cotización
            </>
          )}
        </Button>
      </motion.div>
    </motion.form>
  )
}
