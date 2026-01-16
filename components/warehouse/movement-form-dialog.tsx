"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import {
  AlertTriangle,
  Package,
  DollarSign,
  MapPin,
  Building,
  Info,
  X,
  Paperclip,
  Check,
  ChevronsUpDown,
  Search,
  Loader2,
  FileText,
  UploadCloud,
  ArrowRightLeft,
  Truck
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import { useCompany } from "@/lib/company-context"
import { cn } from "@/lib/utils"

interface Product {
  id: string
  name: string
  code: string
  current_stock: number
  minimum_stock: number
  unit_of_measure: string
  cost_price: number
  sale_price: number
}

interface Department {
  id: string
  name: string
  code: string
}

interface MovementFormDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: any) => void
  selectedProduct?: any
}

export function MovementFormDialog({ open, onClose, onSubmit, selectedProduct }: MovementFormDialogProps) {
  const { user } = useAuth()
  const { selectedCompany } = useCompany()
  const { toast } = useToast()
  const [products, setProducts] = useState<Product[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [entitySuggestions, setEntitySuggestions] = useState<string[]>([])
  const [selectedProductData, setSelectedProductData] = useState<Product | null>(null)
  const [showEntitySuggestions, setShowEntitySuggestions] = useState(false)
  const [attachments, setAttachments] = useState<Array<{ file: File; type: "factura" | "adjunto" }>>([])
  const [uploadingAttachments, setUploadingAttachments] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [productComboOpen, setProductComboOpen] = useState(false)
  const [searchingSale, setSearchingSale] = useState(false)
  const [saleNumber, setSaleNumber] = useState("")

  const [formData, setFormData] = useState({
    product_id: selectedProduct?.id || "",
    movement_type: "",
    quantity: "",
    entry_price: "",
    exit_price: "",
    purchase_order_number: "",
    destination_entity_name: "",
    destination_department_id: "",
    destination_address: "",
    supplier: "",
    reason: "",
    notes: "",
  })

  useEffect(() => {
    const companyId = user?.role === "admin" ? selectedCompany?.id : user?.company_id

    if (companyId && open) {
      fetchData()
    }
  }, [user, selectedCompany, open])

  useEffect(() => {
    if (selectedProduct) {
      setFormData((prev) => ({ ...prev, product_id: selectedProduct.id }))
      handleProductChange(selectedProduct.id)
    }
  }, [selectedProduct])

  const fetchData = async () => {
    try {
      const companyId = user?.role === "admin" ? selectedCompany?.id : user?.company_id

      if (!companyId) {
        console.log("No company ID available")
        return
      }

      console.log("Fetching products for company:", companyId)

      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("id, name, code, current_stock, minimum_stock, unit_of_measure, cost_price, sale_price")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("name")

      if (productsError) {
        console.error("Error fetching products:", productsError)
        throw productsError
      }

      const { data: departmentsData } = await supabase.from("peru_departments").select("id, name, code").order("name")

      const { data: suggestionsData } = await supabase
        .from("inventory_movements")
        .select("destination_entity_name")
        .eq("company_id", companyId)
        .not("destination_entity_name", "is", null)
        .order("destination_entity_name")

      console.log("Products fetched:", productsData?.length || 0)
      setProducts(productsData || [])
      setDepartments(departmentsData || [])

      const uniqueEntities = [...new Set(suggestionsData?.map((item) => item.destination_entity_name).filter(Boolean))]
      setEntitySuggestions(uniqueEntities || [])
    } catch (error) {
      console.error("Error fetching data:", error)
    }
  }

  const handleProductChange = (productId: string) => {
    const product = products.find((p) => p.id === productId)
    setSelectedProductData(product || null)

    if (product) {
      setFormData((prev) => ({
        ...prev,
        product_id: productId,
        entry_price: product.cost_price.toString(),
        exit_price: product.sale_price.toString(),
      }))
    }
  }

  const handleEntityNameChange = (value: string) => {
    setFormData((prev) => ({ ...prev, destination_entity_name: value }))
    setShowEntitySuggestions(
      value.length > 0 && entitySuggestions.some((s) => s.toLowerCase().includes(value.toLowerCase())),
    )
  }

  const selectEntitySuggestion = (suggestion: string) => {
    setFormData((prev) => ({ ...prev, destination_entity_name: suggestion }))
    setShowEntitySuggestions(false)
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>, attachmentType: "factura" | "adjunto") => {
    const files = Array.from(event.target.files || [])

    const validFiles = files.filter((file) => {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "Archivo muy grande",
          description: `El archivo "${file.name}" excede el límite de 10MB.`,
          variant: "destructive",
        })
        return false
      }
      return true
    })

    const filesWithType = validFiles.map((file) => ({ file, type: attachmentType }))
    setAttachments((prev) => [...prev, ...filesWithType])
  }

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  const uploadAttachments = async (movementId: string) => {
    if (attachments.length === 0) return

    setUploadingAttachments(true)

    try {
      for (const { file, type } of attachments) {
        const fileExt = file.name.split(".").pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
        const filePath = `${user?.id}/${fileName}`

        const { error: uploadError } = await supabase.storage.from("inventory-attachments").upload(filePath, file)

        if (uploadError) {
          console.error("Upload error:", uploadError)
          throw uploadError
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("inventory-attachments").getPublicUrl(filePath)

        const { error: dbError } = await supabase.from("inventory_movement_attachments").insert({
          movement_id: movementId,
          file_name: file.name,
          file_url: publicUrl,
          file_size: file.size,
          file_type: file.type,
          attachment_type: type,
          uploaded_by: user?.id,
        })

        if (dbError) {
          console.error("Database error:", dbError)
          throw dbError
        }
      }

      toast({
        title: "Archivos subidos",
        description: `Se subieron ${attachments.length} archivo(s) correctamente.`,
      })
    } catch (error: any) {
      console.error("Error uploading attachments:", error)
      toast({
        title: "Error al subir archivos",
        description: error.message || "Error al subir algunos archivos adjuntos.",
        variant: "destructive",
      })
      throw error
    } finally {
      setUploadingAttachments(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (isSubmitting) {
      return
    }

    const companyId = user?.role === "admin" ? selectedCompany?.id : user?.company_id

    if (!companyId) {
      toast({
        title: "Error",
        description: "No hay empresa seleccionada",
        variant: "destructive",
      })
      return
    }

    if (!selectedProductData) {
      toast({
        title: "Error",
        description: "Selecciona un producto",
        variant: "destructive",
      })
      return
    }

    const quantity = Number.parseInt(formData.quantity)
    if (!quantity || quantity <= 0) {
      toast({
        title: "Error",
        description: "La cantidad debe ser mayor a 0",
        variant: "destructive",
      })
      return
    }

    if (formData.movement_type === "salida" && quantity > selectedProductData.current_stock) {
      toast({
        title: "Stock insuficiente",
        description: `Stock disponible: ${selectedProductData.current_stock} ${selectedProductData.unit_of_measure}`,
        variant: "destructive",
      })
      return
    }

    if (formData.movement_type === "entrada") {
      if (!formData.entry_price) {
        toast({
          title: "Error",
          description: "El precio de entrada es requerido",
          variant: "destructive",
        })
        return
      }
      const entryPrice = Number.parseFloat(formData.entry_price)
      if (entryPrice <= 0) {
        toast({
          title: "Error",
          description: "El precio de entrada debe ser mayor a 0",
          variant: "destructive",
        })
        return
      }
    }

    if (formData.movement_type === "salida") {
      if (!formData.purchase_order_number) {
        toast({
          title: "Error",
          description: "El número de orden de compra es requerido para salidas",
          variant: "destructive",
        })
        return
      }
      if (!formData.destination_entity_name) {
        toast({
          title: "Error",
          description: "Especifica el nombre de la entidad destino",
          variant: "destructive",
        })
        return
      }
      if (!formData.exit_price) {
        toast({
          title: "Error",
          description: "El precio de salida es requerido",
          variant: "destructive",
        })
        return
      }
      const exitPrice = Number.parseFloat(formData.exit_price)
      if (exitPrice <= 0) {
        toast({
          title: "Error",
          description: "El precio de salida debe ser mayor a 0",
          variant: "destructive",
        })
        return
      }
    }

    const entryPrice = formData.entry_price ? Number.parseFloat(formData.entry_price) : null
    const exitPrice = formData.exit_price ? Number.parseFloat(formData.exit_price) : null
    const totalAmount =
      formData.movement_type === "entrada"
        ? entryPrice
          ? entryPrice * quantity
          : null
        : exitPrice
          ? exitPrice * quantity
          : null

    setIsSubmitting(true)

    try {
      const movementData = {
        ...formData,
        quantity,
        entry_price: entryPrice,
        exit_price: exitPrice,
        total_amount: totalAmount,
        destination_department_id: formData.destination_department_id || null,
        company_id: companyId,
      }

      const createdMovement = await onSubmit(movementData)

      if (attachments.length > 0 && createdMovement?.id) {
        await uploadAttachments(createdMovement.id)
      }

      setFormData({
        product_id: "",
        movement_type: "",
        quantity: "",
        entry_price: "",
        exit_price: "",
        purchase_order_number: "",
        destination_entity_name: "",
        destination_department_id: "",
        destination_address: "",
        supplier: "",
        reason: "",
        notes: "",
      })
      setSelectedProductData(null)
      setAttachments([])

      onClose()
    } catch (error: any) {
      console.error("Error creating movement:", error)
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el movimiento. Intente nuevamente.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStockWarning = () => {
    if (!selectedProductData) return null

    if (selectedProductData.current_stock === 0) {
      return (
        <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 px-2 py-1 rounded-full">
          <AlertTriangle className="h-3 w-3" />
          Sin stock
        </div>
      )
    }

    if (selectedProductData.current_stock <= selectedProductData.minimum_stock) {
      return (
        <div className="flex items-center gap-2 text-amber-600 text-sm bg-amber-50 px-2 py-1 rounded-full">
          <AlertTriangle className="h-3 w-3" />
          Stock bajo
        </div>
      )
    }

    return null
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "PEN",
    }).format(amount)
  }

  const filteredSuggestions = entitySuggestions.filter((suggestion) =>
    suggestion.toLowerCase().includes(formData.destination_entity_name.toLowerCase()),
  )

  const formatProductDisplay = (product: Product) => {
    return `${product.code} - ${product.name}`
  }

  const getSelectedProductDisplay = () => {
    if (!selectedProductData) return "Seleccionar producto"
    return formatProductDisplay(selectedProductData)
  }

  const handleSaleNumberSearch = async () => {
    if (!saleNumber.trim()) {
      toast({
        title: "Error",
        description: "Ingresa un número de venta",
        variant: "destructive",
      })
      return
    }

    try {
      setSearchingSale(true)

      const companyId = user?.role === "admin" ? selectedCompany?.id : user?.company_id

      if (!companyId) {
        toast({
          title: "Error",
          description: "No hay empresa seleccionada",
          variant: "destructive",
        })
        return
      }

      const { data: saleData, error: saleError } = await supabase
        .from("sales")
        .select(
          `
          id,
          sale_number,
          ocam,
          entity_name,
          entity_ruc,
          entity_executing_unit,
          final_destination
        `,
        )
        .eq("company_id", companyId)
        .eq("sale_number", saleNumber.trim())
        .single()

      if (saleError || !saleData) {
        toast({
          title: "Venta no encontrada",
          description: `No se encontró una venta con el número ${saleNumber}`,
          variant: "destructive",
        })
        return
      }

      setFormData((prev) => ({
        ...prev,
        purchase_order_number: saleData.ocam || "",
        destination_entity_name: saleData.entity_name || "",
        destination_address: saleData.final_destination || "",
      }))

      toast({
        title: "Datos cargados",
        description: `Se cargaron los datos de la venta ${saleNumber}`,
      })
    } catch (error: any) {
      console.error("Error searching sale:", error)
      toast({
        title: "Error",
        description: "Error al buscar la venta",
        variant: "destructive",
      })
    } finally {
      setSearchingSale(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto rounded-2xl border-none shadow-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl">
        <DialogHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent flex items-center gap-2">
             <ArrowRightLeft className="h-6 w-6 text-indigo-500" />
             Nuevo Movimiento de Inventario
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              {/* Sección Producto */}
              <div className="space-y-4">
                 <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-medium pb-2 border-b border-indigo-100 dark:border-indigo-900/30">
                    <Package className="h-4 w-4" />
                    Selección de Producto
                 </div>
                 
                 <div className="space-y-2">
                   <Label htmlFor="product_id" className="text-slate-600 dark:text-slate-400">Producto *</Label>
                   <Popover open={productComboOpen} onOpenChange={setProductComboOpen}>
                     <PopoverTrigger asChild>
                       <Button
                         variant="outline"
                         role="combobox"
                         aria-expanded={productComboOpen}
                         className="w-full justify-between bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 rounded-xl h-11"
                       >
                         <span className="truncate text-slate-700 dark:text-slate-200">{getSelectedProductDisplay()}</span>
                         <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                       </Button>
                     </PopoverTrigger>
                     <PopoverContent className="w-[400px] p-0 rounded-xl border-slate-200 dark:border-slate-700" align="start">
                       <Command>
                         <CommandInput placeholder="Buscar producto por código o nombre..." className="h-11" />
                         <CommandList>
                           <CommandEmpty>No se encontraron productos.</CommandEmpty>
                           <CommandGroup>
                             {products.map((product) => (
                               <CommandItem
                                 key={product.id}
                                 value={`${product.code} ${product.name}`}
                                 onSelect={() => {
                                   handleProductChange(product.id)
                                   setProductComboOpen(false)
                                 }}
                                 className="cursor-pointer aria-selected:bg-indigo-50 dark:aria-selected:bg-indigo-900/20"
                               >
                                 <div className="flex items-center justify-between w-full py-1">
                                   <div className="flex items-center gap-2">
                                     <Check
                                       className={cn(
                                         "h-4 w-4 text-indigo-600",
                                         formData.product_id === product.id ? "opacity-100" : "opacity-0",
                                       )}
                                     />
                                     <div className="flex flex-col">
                                       <span className="font-medium text-slate-700 dark:text-slate-200">{formatProductDisplay(product)}</span>
                                       <span className="text-xs text-slate-500">{product.unit_of_measure}</span>
                                     </div>
                                   </div>
                                   <div className="flex items-center gap-2">
                                     <Badge
                                       variant={product.current_stock <= product.minimum_stock ? "destructive" : "outline"}
                                       className={cn("text-xs", product.current_stock > product.minimum_stock && "bg-slate-100 text-slate-600 border-slate-200")}
                                     >
                                       Stock: {product.current_stock}
                                     </Badge>
                                   </div>
                                 </div>
                               </CommandItem>
                             ))}
                           </CommandGroup>
                         </CommandList>
                       </Command>
                     </PopoverContent>
                   </Popover>
                 </div>

                 {selectedProductData && (
                   <Card className="bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30 shadow-none rounded-xl">
                     <CardContent className="pt-4">
                       <div className="flex items-center gap-2 mb-3">
                         <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                         <span className="text-sm font-medium text-blue-800 dark:text-blue-300">Detalles del Producto</span>
                       </div>
                       <div className="grid grid-cols-2 gap-4 text-sm">
                         <div>
                           <Label className="text-slate-500 dark:text-slate-400 text-xs">Stock actual</Label>
                           <div className="flex items-center gap-2 mt-1">
                             <span className="font-medium text-slate-700 dark:text-slate-200 text-lg">
                               {selectedProductData.current_stock}
                             </span>
                             <span className="text-xs text-slate-500">{selectedProductData.unit_of_measure}</span>
                             {getStockWarning()}
                           </div>
                         </div>
                         <div>
                           <Label className="text-slate-500 dark:text-slate-400 text-xs">Stock mínimo</Label>
                           <p className="font-medium text-slate-700 dark:text-slate-200 mt-1">
                             {selectedProductData.minimum_stock} {selectedProductData.unit_of_measure}
                           </p>
                         </div>
                         <div className="pt-2 border-t border-blue-100 dark:border-blue-900/30">
                           <Label className="text-slate-500 dark:text-slate-400 flex items-center gap-1 text-xs">
                             <DollarSign className="h-3 w-3" />
                             Costo Unitario
                           </Label>
                           <p className="font-medium text-slate-700 dark:text-slate-200 mt-1">{formatCurrency(selectedProductData.cost_price)}</p>
                         </div>
                         <div className="pt-2 border-t border-blue-100 dark:border-blue-900/30">
                           <Label className="text-slate-500 dark:text-slate-400 flex items-center gap-1 text-xs">
                             <DollarSign className="h-3 w-3" />
                             Precio Venta
                           </Label>
                           <p className="font-medium text-slate-700 dark:text-slate-200 mt-1">{formatCurrency(selectedProductData.sale_price)}</p>
                         </div>
                       </div>
                     </CardContent>
                   </Card>
                 )}
              </div>

              {/* Sección Tipo y Cantidad */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-medium pb-2 border-b border-indigo-100 dark:border-indigo-900/30">
                    <ArrowRightLeft className="h-4 w-4" />
                    Detalles del Movimiento
                 </div>

                <div className="space-y-2">
                  <Label htmlFor="movement_type" className="text-slate-600 dark:text-slate-400">Tipo de Movimiento *</Label>
                  <Select
                    value={formData.movement_type}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, movement_type: value }))}
                    required
                  >
                    <SelectTrigger className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 rounded-xl h-11">
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="entrada">
                         <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                            Entrada de Inventario
                         </div>
                      </SelectItem>
                      <SelectItem value="salida">
                         <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-red-500" />
                            Salida de Inventario
                         </div>
                      </SelectItem>
                      <SelectItem value="ajuste">
                         <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                            Ajuste de Inventario
                         </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="quantity" className="text-slate-600 dark:text-slate-400">
                      {formData.movement_type === "ajuste" ? "Nuevo Stock *" : "Cantidad *"}
                    </Label>
                    <Input
                      id="quantity"
                      type="number"
                      value={formData.quantity}
                      onChange={(e) => setFormData((prev) => ({ ...prev, quantity: e.target.value }))}
                      required
                      min="1"
                      max={formData.movement_type === "salida" ? selectedProductData?.current_stock : undefined}
                      className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 rounded-xl h-11"
                    />
                  </div>
                  {formData.movement_type === "entrada" && (
                    <div>
                      <Label htmlFor="entry_price" className="text-slate-600 dark:text-slate-400">Precio de Entrada *</Label>
                      <Input
                        id="entry_price"
                        type="number"
                        step="0.01"
                        value={formData.entry_price}
                        onChange={(e) => setFormData((prev) => ({ ...prev, entry_price: e.target.value }))}
                        placeholder="0.00"
                        required
                        className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 rounded-xl h-11"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">Actualiza el costo del producto</p>
                    </div>
                  )}
                  {formData.movement_type === "salida" && (
                    <div>
                      <Label htmlFor="exit_price" className="text-slate-600 dark:text-slate-400">Precio de Salida *</Label>
                      <Input
                        id="exit_price"
                        type="number"
                        step="0.01"
                        value={formData.exit_price}
                        onChange={(e) => setFormData((prev) => ({ ...prev, exit_price: e.target.value }))}
                        placeholder="0.00"
                        required
                        className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 rounded-xl h-11"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">Precio de venta unitario</p>
                    </div>
                  )}
                </div>

                {formData.movement_type === "entrada" && (
                  <div className="space-y-4 pt-2">
                     <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-medium pb-2 border-b border-indigo-100 dark:border-indigo-900/30">
                        <Paperclip className="h-4 w-4" />
                        Documentación
                     </div>

                    <div className="space-y-4">
                      <div>
                        <Label className="text-slate-600 dark:text-slate-400 mb-2 block">Factura(s)</Label>
                        <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-4 flex flex-col items-center justify-center text-center bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => document.getElementById("invoices")?.click()}>
                           <UploadCloud className="h-8 w-8 text-indigo-400 mb-2" />
                           <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Click para subir facturas</p>
                           <p className="text-xs text-slate-400 mt-1">PDF, JPG, PNG (Max 10MB)</p>
                           <Input
                             id="invoices"
                             type="file"
                             multiple
                             onChange={(e) => handleFileSelect(e, "factura")}
                             accept=".pdf,.jpg,.jpeg,.png"
                             className="hidden"
                           />
                        </div>
                      </div>

                      <div>
                        <Label className="text-slate-600 dark:text-slate-400 mb-2 block">Otros Adjuntos</Label>
                        <div className="flex items-center gap-2">
                           <Button
                             type="button"
                             variant="outline"
                             size="sm"
                             onClick={() => document.getElementById("attachments")?.click()}
                             className="rounded-lg border-slate-200 dark:border-slate-700 text-slate-600"
                           >
                             <Paperclip className="h-4 w-4 mr-2" />
                             Seleccionar archivos
                           </Button>
                           <Input
                             id="attachments"
                             type="file"
                             multiple
                             onChange={(e) => handleFileSelect(e, "adjunto")}
                             accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                             className="hidden"
                           />
                           <span className="text-xs text-slate-400">PDF, Word, Excel, Imágenes</span>
                        </div>
                      </div>
                    </div>

                    {attachments.length > 0 && (
                      <div className="space-y-2 bg-slate-50 dark:bg-slate-800/30 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                        <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Archivos ({attachments.length})</Label>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {attachments.map(({ file, type }, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 shadow-sm">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className={`p-1.5 rounded-md ${type === 'factura' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'}`}>
                                   <FileText className="h-4 w-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm truncate font-medium text-slate-700 dark:text-slate-200">{file.name}</p>
                                  <div className="flex items-center gap-2">
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${type === 'factura' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                                       {type === "factura" ? "Factura" : "Adjunto"}
                                    </span>
                                    <p className="text-[10px] text-slate-400">
                                      {(file.size / 1024 / 1024).toFixed(1)} MB
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeAttachment(index)}
                                className="flex-shrink-0 h-8 w-8 p-0 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {formData.movement_type !== "entrada" && (
                  <div className="space-y-2">
                    <Label htmlFor="attachments-other" className="text-slate-600 dark:text-slate-400">Adjuntar Documentos</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById("attachments-other")?.click()}
                        className="rounded-lg border-slate-200 dark:border-slate-700 text-slate-600"
                      >
                        <Paperclip className="h-4 w-4 mr-2" />
                        Seleccionar archivos
                      </Button>
                      <Input
                        id="attachments-other"
                        type="file"
                        multiple
                        onChange={(e) => handleFileSelect(e, "adjunto")}
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                        className="hidden"
                      />
                      <span className="text-xs text-slate-400">Opcional</span>
                    </div>
                  </div>
                )}

                {formData.movement_type === "entrada" && (
                  <div>
                    <Label htmlFor="supplier" className="text-slate-600 dark:text-slate-400">Proveedor</Label>
                    <Input
                      id="supplier"
                      value={formData.supplier}
                      onChange={(e) => setFormData((prev) => ({ ...prev, supplier: e.target.value }))}
                      placeholder="Nombre del proveedor"
                      className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 rounded-xl h-11"
                    />
                  </div>
                )}

                {formData.movement_type === "ajuste" && (
                  <div>
                    <Label htmlFor="reason" className="text-slate-600 dark:text-slate-400">Motivo del Ajuste *</Label>
                    <Input
                      id="reason"
                      value={formData.reason}
                      onChange={(e) => setFormData((prev) => ({ ...prev, reason: e.target.value }))}
                      placeholder="Ej: Inventario físico, merma, etc."
                      required
                      className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 rounded-xl h-11"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              {formData.movement_type === "salida" && (
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2 text-indigo-600 dark:text-indigo-400 pb-2 border-b border-indigo-100 dark:border-indigo-900/30">
                    <Truck className="h-4 w-4" />
                    Información de Salida
                  </h4>

                  <Card className="bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30 shadow-none rounded-xl">
                    <CardContent className="pt-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Search className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-sm font-medium text-emerald-800 dark:text-emerald-300">Autocompletar desde Venta</span>
                        </div>
                        <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80">
                           Ingresa el número de venta para llenar automáticamente los datos del cliente.
                        </p>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Ej: VEN-2024-001"
                            value={saleNumber}
                            onChange={(e) => setSaleNumber(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault()
                                handleSaleNumberSearch()
                              }
                            }}
                            className="bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-800 rounded-lg h-10 text-sm"
                          />
                          <Button
                            type="button"
                            onClick={handleSaleNumberSearch}
                            disabled={searchingSale || !saleNumber.trim()}
                            className="flex-shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
                            size="sm"
                          >
                            {searchingSale ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar"}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div>
                    <Label htmlFor="purchase_order_number" className="text-slate-600 dark:text-slate-400">Número de Orden de Compra *</Label>
                    <Input
                      id="purchase_order_number"
                      value={formData.purchase_order_number}
                      onChange={(e) => setFormData((prev) => ({ ...prev, purchase_order_number: e.target.value }))}
                      placeholder="Ej: OC-2024-001"
                      required
                      className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 rounded-xl h-11"
                    />
                  </div>

                  <div className="relative">
                    <Label htmlFor="destination_entity_name" className="text-slate-600 dark:text-slate-400">Nombre de la Entidad/Cliente *</Label>
                    <Input
                      id="destination_entity_name"
                      value={formData.destination_entity_name}
                      onChange={(e) => handleEntityNameChange(e.target.value)}
                      placeholder="Nombre del cliente o entidad"
                      required
                      className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 rounded-xl h-11"
                    />
                    {showEntitySuggestions && filteredSuggestions.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg max-h-40 overflow-y-auto">
                        {filteredSuggestions.map((suggestion, index) => (
                          <button
                            key={index}
                            type="button"
                            className="w-full px-4 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700 text-sm transition-colors"
                            onClick={() => selectEntitySuggestion(suggestion)}
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <h5 className="font-medium flex items-center gap-2 text-slate-700 dark:text-slate-300 text-sm">
                      <MapPin className="h-4 w-4 text-slate-500" />
                      Ubicación de Destino
                    </h5>

                    <div className="space-y-4 pl-6 border-l-2 border-slate-100 dark:border-slate-800 ml-2">
                      <div>
                        <Label htmlFor="destination_department_id" className="text-slate-600 dark:text-slate-400">Departamento</Label>
                        <Select
                          value={formData.destination_department_id}
                          onValueChange={(value) =>
                            setFormData((prev) => ({ ...prev, destination_department_id: value }))
                          }
                        >
                          <SelectTrigger className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 rounded-xl h-11">
                            <SelectValue placeholder="Seleccionar departamento" />
                          </SelectTrigger>
                          <SelectContent>
                            {departments.map((dept) => (
                              <SelectItem key={dept.id} value={dept.id}>
                                {dept.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="destination_address" className="text-slate-600 dark:text-slate-400">Dirección Específica</Label>
                        <Input
                          id="destination_address"
                          value={formData.destination_address}
                          onChange={(e) => setFormData((prev) => ({ ...prev, destination_address: e.target.value }))}
                          placeholder="Dirección completa del destino"
                          className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 rounded-xl h-11"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="notes" className="text-slate-600 dark:text-slate-400">Notas Adicionales</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Información adicional (opcional)"
                  rows={3}
                  className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 rounded-xl resize-none"
                />
              </div>
            </div>
          </div>

          {formData.quantity && selectedProductData && (
            <Card className="bg-slate-50/80 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 shadow-none rounded-xl mt-6">
              <CardContent className="pt-4 pb-4">
                <h4 className="font-medium mb-3 flex items-center gap-2 text-slate-800 dark:text-slate-200">
                   <Info className="h-4 w-4 text-indigo-500" />
                   Resumen del Movimiento
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">Cantidad</span>
                    <p className="font-bold text-lg text-slate-700 dark:text-slate-200">
                      {formData.quantity} <span className="text-sm font-normal text-slate-500">{selectedProductData.unit_of_measure}</span>
                    </p>
                  </div>
                  {formData.entry_price && formData.movement_type === "entrada" && (
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">Total Entrada</span>
                      <p className="font-bold text-lg text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(Number.parseFloat(formData.entry_price) * Number.parseInt(formData.quantity))}
                      </p>
                    </div>
                  )}
                  {formData.exit_price && formData.movement_type === "salida" && (
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">Total Salida</span>
                      <p className="font-bold text-lg text-indigo-600 dark:text-indigo-400">
                        {formatCurrency(Number.parseFloat(formData.exit_price) * Number.parseInt(formData.quantity))}
                      </p>
                    </div>
                  )}
                  {attachments.length > 0 && (
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">Adjuntos</span>
                      <div className="flex items-center gap-2 mt-1">
                         <Paperclip className="h-4 w-4 text-slate-400" />
                         <p className="font-medium">{attachments.length} archivo(s)</p>
                      </div>
                    </div>
                  )}
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">Tipo</span>
                    <div className="mt-1">
                       <Badge variant="outline" className="capitalize bg-white dark:bg-slate-900">
                          {formData.movement_type}
                       </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button 
               type="button" 
               variant="ghost" 
               onClick={onClose} 
               disabled={isSubmitting || uploadingAttachments}
               className="rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100"
            >
              Cancelar
            </Button>
            <Button 
               type="submit" 
               disabled={isSubmitting || uploadingAttachments}
               className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Procesando...
                </>
              ) : uploadingAttachments ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Subiendo archivos...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Confirmar Movimiento
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
