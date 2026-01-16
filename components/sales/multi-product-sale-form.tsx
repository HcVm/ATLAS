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
import { Calculator, Plus, Trash2, Package, Search, Building2, Users, FileText, Wallet, Calendar, MapPin, Truck, Check, AlertCircle } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useCompany } from "@/lib/company-context"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { EntitySelector } from "@/components/ui/entity-selector"
import { ProductSelector } from "@/components/ui/product-selector"
import { cn } from "@/lib/utils"

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
  onCancel?: () => void
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

export default function MultiProductSaleForm({ onSuccess, onCancel }: MultiProductSaleFormProps) {
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
    delivery_start_date: undefined as Date | undefined,
    delivery_end_date: undefined as Date | undefined,
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
      const saleNumber = await generateSaleNumber(selectedCompany.id, selectedCompany.code || "GEN")
      // Create sale
      const saleData = {
        sale_number: saleNumber,
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
        delivery_start_date: formData.delivery_start_date?.toISOString().split("T")[0] || null,
        delivery_end_date: formData.delivery_end_date?.toISOString().split("T")[0] || null,
        observations: formData.observations || null,
        sale_status: formData.sale_status,
        created_by: user.id,
        is_multi_product: items.length > 1,
        items_count: items.length,
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
            title: "Nueva Venta Multi-Producto Registrada",
            message: `Se ha registrado una nueva venta multi-producto para ${formData.entity_name} con ${items.length} productos. Se requiere registrar la salida de productos en el módulo de almacén.`,
            type: "sale_created",
            related_id: sale.id,
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
        // No interrumpir el flujo principal si fallan las notificaciones
      }

      toast.success(`Venta ${saleNumber} registrada exitosamente`)
      onSuccess()
    } catch (error: any) {
      console.error("Error creating sale:", error)
      toast.error("Error al registrar la venta: " + error.message)
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
                    Ventas con prefijo: <strong>VEN-{new Date().getFullYear()}-{selectedCompany.code}</strong>
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
                  entity_executing_unit: entity.executing_unit || "",
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

      {/* Vinculación con Cotización */}
      <motion.div variants={itemVariants}>
        <Card className="border-none shadow-md bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-orange-400 to-pink-500" />
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-orange-500" />
              Referencia de Cotización
            </CardTitle>
            <CardDescription>Vincula esta venta a una cotización aprobada para cargar datos automáticamente</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4 items-end">
               <div className="flex-1 space-y-2">
                  <Label htmlFor="quotation_search">Buscar Cotización</Label>
                  <div className="relative">
                     <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                     <Input
                       id="quotation_search"
                       value={formData.quotation_search}
                       onChange={(e) => setFormData((prev) => ({ ...prev, quotation_search: e.target.value }))}
                       placeholder="Ej: COT-2024-ARM-0001"
                       className="pl-9 rounded-xl"
                     />
                  </div>
               </div>
               <Button
                 type="button"
                 onClick={searchQuotationByCode}
                 disabled={searchingQuotation || !formData.quotation_search}
                 className="rounded-xl bg-orange-500 hover:bg-orange-600 text-white"
               >
                 {searchingQuotation ? "Buscando..." : "Cargar Datos"}
               </Button>
            </div>
            
            <Separator className="my-2" />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               <div>
                  <Label htmlFor="quotation_code">Código de Cotización *</Label>
                  <Input
                    id="quotation_code"
                    value={formData.quotation_code}
                    onChange={(e) => setFormData((prev) => ({ ...prev, quotation_code: e.target.value }))}
                    placeholder="Se llenará automáticamente..."
                    className="mt-1 rounded-xl bg-slate-50 dark:bg-slate-800"
                    required
                  />
               </div>
               <div>
                  <Label htmlFor="exp_siaf">EXP. SIAF</Label>
                  <Input
                    id="exp_siaf"
                    value={formData.exp_siaf}
                    onChange={(e) => setFormData((prev) => ({ ...prev, exp_siaf: e.target.value }))}
                    className="mt-1 rounded-xl"
                    placeholder="Opcional"
                  />
               </div>
               <div>
                  <Label htmlFor="ocam">OCAM</Label>
                  <Input
                    id="ocam"
                    value={formData.ocam}
                    onChange={(e) => setFormData((prev) => ({ ...prev, ocam: e.target.value }))}
                    className="mt-1 rounded-xl"
                    placeholder="Orden Electrónica"
                  />
               </div>
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
            <CardDescription>Gestiona los items que se incluirán en la venta</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-5 bg-slate-50/50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                 <div className="md:col-span-8">
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                 <div>
                    <Label className="text-xs text-slate-500">Precio Unitario (con IGV)</Label>
                    <div className="relative mt-1">
                       <span className="absolute left-3 top-2.5 text-slate-400 text-xs">S/</span>
                       <Input
                         type="number"
                         step="0.01"
                         className="pl-7 rounded-xl"
                         value={currentItem.unit_price_with_tax || ""}
                         onChange={(e) =>
                           setCurrentItem((prev) => ({
                             ...prev,
                             unit_price_with_tax: Number.parseFloat(e.target.value) || 0,
                           }))
                         }
                       />
                    </div>
                 </div>
                 <Button
                   type="button"
                   onClick={addItem}
                   className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 shadow-lg shadow-slate-900/10"
                   disabled={!currentItem.product_id || !currentItem.quantity}
                 >
                   <Plus className="h-4 w-4 mr-2" />
                   Agregar a la Lista
                 </Button>
              </div>
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
                          <TableHead className="text-right">Precio Unit.</TableHead>
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
                              S/ {item.unit_price_with_tax.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-right font-bold text-slate-900 dark:text-slate-100">
                              S/ {item.total_amount.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
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
                  <div className="grid grid-cols-2 gap-4">
                    <Card className="border-none bg-slate-50 dark:bg-slate-800 shadow-sm">
                      <CardContent className="p-4 text-center">
                         <p className="text-xs uppercase text-slate-500 font-bold">Total Items</p>
                         <p className="text-2xl font-bold text-slate-700 dark:text-slate-300">{totals.total_items}</p>
                      </CardContent>
                    </Card>
                    <Card className="border-none bg-indigo-50 dark:bg-indigo-900/20 shadow-sm">
                      <CardContent className="p-4 text-center">
                         <p className="text-xs uppercase text-indigo-500 font-bold">Total Venta</p>
                         <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">S/ {totals.total_sale.toLocaleString("es-PE", { minimumFractionDigits: 2 })}</p>
                      </CardContent>
                    </Card>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>

      {/* Información Logística y Financiera */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <Card className="border-none shadow-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3">
               <CardTitle className="text-base flex items-center gap-2">
                  <Truck className="h-4 w-4 text-slate-500" /> Logística
               </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="grid grid-cols-2 gap-4">
                  <div>
                     <Label>Inicio Entrega</Label>
                     <div className="mt-1">
                        <DatePickerImproved
                          date={formData.delivery_start_date}
                          setDate={(date) => setFormData((prev) => ({ ...prev, delivery_start_date: date }))}
                          placeholder="Fecha inicio"
                        />
                     </div>
                  </div>
                  <div>
                     <Label>Fin Entrega</Label>
                     <div className="mt-1">
                        <DatePickerImproved
                          date={formData.delivery_end_date}
                          setDate={(date) => setFormData((prev) => ({ ...prev, delivery_end_date: date }))}
                          placeholder="Fecha fin"
                        />
                     </div>
                  </div>
               </div>
               <div>
                  <Label htmlFor="warehouse_manager">Encargado Almacén</Label>
                  <Input
                    id="warehouse_manager"
                    value={formData.warehouse_manager}
                    onChange={(e) => setFormData((prev) => ({ ...prev, warehouse_manager: e.target.value }))}
                    className="mt-1 rounded-xl"
                    placeholder="Nombre del responsable"
                  />
               </div>
               <div>
                  <Label htmlFor="final_destination">Destino Final</Label>
                  <Input
                    id="final_destination"
                    value={formData.final_destination}
                    onChange={(e) => setFormData((prev) => ({ ...prev, final_destination: e.target.value }))}
                    className="mt-1 rounded-xl"
                  />
               </div>
            </CardContent>
         </Card>

         <Card className="border-none shadow-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3">
               <CardTitle className="text-base flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-slate-500" /> Detalles Financieros
               </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="grid grid-cols-2 gap-4">
                  <div>
                     <Label>Método de Pago *</Label>
                     <Select
                       value={formData.payment_method}
                       onValueChange={(value) => setFormData((prev) => ({ ...prev, payment_method: value }))}
                     >
                       <SelectTrigger className="mt-1 rounded-xl">
                         <SelectValue />
                       </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="CONTADO">Contado</SelectItem>
                         <SelectItem value="CREDITO">Crédito</SelectItem>
                       </SelectContent>
                     </Select>
                  </div>
                  <div>
                     <Label>Estado *</Label>
                     <Select
                       value={formData.sale_status}
                       onValueChange={(value) => setFormData((prev) => ({ ...prev, sale_status: value }))}
                     >
                       <SelectTrigger className="mt-1 rounded-xl">
                         <SelectValue />
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
               </div>
               
               <div className="grid grid-cols-2 gap-4">
                  <div>
                     <Label htmlFor="physical_order">Orden Física</Label>
                     <Input
                       id="physical_order"
                       value={formData.physical_order}
                       onChange={(e) => setFormData((prev) => ({ ...prev, physical_order: e.target.value }))}
                       className="mt-1 rounded-xl"
                     />
                  </div>
                  <div>
                     <Label htmlFor="project_meta">Meta</Label>
                     <Input
                       id="project_meta"
                       value={formData.project_meta}
                       onChange={(e) => setFormData((prev) => ({ ...prev, project_meta: e.target.value }))}
                       className="mt-1 rounded-xl"
                     />
                  </div>
               </div>

               <div>
                  <Label htmlFor="observations">Observaciones</Label>
                  <Input
                    id="observations"
                    value={formData.observations}
                    onChange={(e) => setFormData((prev) => ({ ...prev, observations: e.target.value }))}
                    className="mt-1 rounded-xl"
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
               <span className="animate-spin mr-2">⟳</span> Registrando...
             </>
          ) : (
             <>
               <Check className="h-4 w-4 mr-2" /> Registrar Venta
             </>
          )}
        </Button>
      </motion.div>
    </motion.form>
  )
}
