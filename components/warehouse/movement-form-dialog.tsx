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
  const [attachments, setAttachments] = useState<File[]>([])
  const [uploadingAttachments, setUploadingAttachments] = useState(false)
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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
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

    setAttachments((prev) => [...prev, ...validFiles])
  }

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  const uploadAttachments = async (movementId: string) => {
    if (attachments.length === 0) return

    setUploadingAttachments(true)

    try {
      for (const file of attachments) {
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
    }
  }

  const getStockWarning = () => {
    if (!selectedProductData) return null

    if (selectedProductData.current_stock === 0) {
      return (
        <div className="flex items-center gap-2 text-red-600 text-sm">
          <AlertTriangle className="h-4 w-4" />
          Sin stock disponible
        </div>
      )
    }

    if (selectedProductData.current_stock <= selectedProductData.minimum_stock) {
      return (
        <div className="flex items-center gap-2 text-orange-600 text-sm">
          <AlertTriangle className="h-4 w-4" />
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
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo Movimiento de Inventario</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="product_id">Producto *</Label>
                <Popover open={productComboOpen} onOpenChange={setProductComboOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={productComboOpen}
                      className="w-full justify-between bg-transparent"
                    >
                      <span className="truncate">{getSelectedProductDisplay()}</span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Buscar producto por código o nombre..." />
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
                            >
                              <div className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-2">
                                  <Check
                                    className={cn(
                                      "h-4 w-4",
                                      formData.product_id === product.id ? "opacity-100" : "opacity-0",
                                    )}
                                  />
                                  <div className="flex flex-col">
                                    <span className="font-medium">{formatProductDisplay(product)}</span>
                                    <span className="text-xs text-muted-foreground">{product.unit_of_measure}</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge
                                    variant={product.current_stock <= product.minimum_stock ? "destructive" : "default"}
                                    className="text-xs"
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
                <Card className="bg-blue-50/50 border-blue-200">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Info className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">Información del Producto</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <Label className="text-muted-foreground">Stock actual</Label>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {selectedProductData.current_stock} {selectedProductData.unit_of_measure}
                          </span>
                          {getStockWarning()}
                        </div>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Stock mínimo</Label>
                        <p className="font-medium">
                          {selectedProductData.minimum_stock} {selectedProductData.unit_of_measure}
                        </p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground flex items-center gap-1">
                          <Package className="h-3 w-3" />
                          Precio de costo
                        </Label>
                        <p className="font-medium text-gray-600">{formatCurrency(selectedProductData.cost_price)}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          Precio de venta
                        </Label>
                        <p className="font-medium text-gray-600">{formatCurrency(selectedProductData.sale_price)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-2">
                <Label htmlFor="movement_type">Tipo de Movimiento *</Label>
                <Select
                  value={formData.movement_type}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, movement_type: value }))}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entrada">Entrada</SelectItem>
                    <SelectItem value="salida">Salida</SelectItem>
                    <SelectItem value="ajuste">Ajuste</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="quantity">
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
                  />
                </div>
                {formData.movement_type === "entrada" && (
                  <div>
                    <Label htmlFor="entry_price">Precio de Entrada *</Label>
                    <Input
                      id="entry_price"
                      type="number"
                      step="0.01"
                      value={formData.entry_price}
                      onChange={(e) => setFormData((prev) => ({ ...prev, entry_price: e.target.value }))}
                      placeholder="0.00"
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-1">Actualizará el precio de costo del producto</p>
                  </div>
                )}
                {formData.movement_type === "salida" && (
                  <div>
                    <Label htmlFor="exit_price">Precio de Salida *</Label>
                    <Input
                      id="exit_price"
                      type="number"
                      step="0.01"
                      value={formData.exit_price}
                      onChange={(e) => setFormData((prev) => ({ ...prev, exit_price: e.target.value }))}
                      placeholder="0.00"
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-1">Precio al que sale el producto</p>
                  </div>
                )}
              </div>

              {formData.movement_type === "entrada" && (
                <div>
                  <Label htmlFor="supplier">Proveedor</Label>
                  <Input
                    id="supplier"
                    value={formData.supplier}
                    onChange={(e) => setFormData((prev) => ({ ...prev, supplier: e.target.value }))}
                    placeholder="Nombre del proveedor"
                  />
                </div>
              )}

              {formData.movement_type === "ajuste" && (
                <div>
                  <Label htmlFor="reason">Motivo del Ajuste *</Label>
                  <Input
                    id="reason"
                    value={formData.reason}
                    onChange={(e) => setFormData((prev) => ({ ...prev, reason: e.target.value }))}
                    placeholder="Motivo del ajuste"
                    required
                  />
                </div>
              )}
            </div>

            <div className="space-y-6">
              {formData.movement_type === "salida" && (
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    Información de Salida
                  </h4>

                  <Card className="bg-green-50/50 border-green-200">
                    <CardContent className="pt-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Search className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium text-green-800">Buscar por Número de Venta</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Ingresa el número de venta para auto-completar los datos de orden de compra, cliente y
                          dirección
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
                          />
                          <Button
                            type="button"
                            onClick={handleSaleNumberSearch}
                            disabled={searchingSale || !saleNumber.trim()}
                            className="flex-shrink-0"
                          >
                            {searchingSale ? "Buscando..." : "Buscar"}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div>
                    <Label htmlFor="purchase_order_number">Número de Orden de Compra *</Label>
                    <Input
                      id="purchase_order_number"
                      value={formData.purchase_order_number}
                      onChange={(e) => setFormData((prev) => ({ ...prev, purchase_order_number: e.target.value }))}
                      placeholder="Ej: OC-2024-001"
                      required
                    />
                  </div>

                  <div className="relative">
                    <Label htmlFor="destination_entity_name">Nombre de la Entidad/Cliente *</Label>
                    <Input
                      id="destination_entity_name"
                      value={formData.destination_entity_name}
                      onChange={(e) => handleEntityNameChange(e.target.value)}
                      placeholder="Escribir nombre de la entidad o cliente"
                      required
                    />
                    {showEntitySuggestions && filteredSuggestions.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-40 overflow-y-auto">
                        {filteredSuggestions.map((suggestion, index) => (
                          <button
                            key={index}
                            type="button"
                            className="w-full px-3 py-2 text-left hover:bg-gray-100 text-sm"
                            onClick={() => selectEntitySuggestion(suggestion)}
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <h5 className="font-medium flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Ubicación de Destino
                    </h5>

                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="destination_department_id">Departamento</Label>
                        <Select
                          value={formData.destination_department_id}
                          onValueChange={(value) =>
                            setFormData((prev) => ({ ...prev, destination_department_id: value }))
                          }
                        >
                          <SelectTrigger>
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
                        <Label htmlFor="destination_address">Dirección Específica</Label>
                        <Input
                          id="destination_address"
                          value={formData.destination_address}
                          onChange={(e) => setFormData((prev) => ({ ...prev, destination_address: e.target.value }))}
                          placeholder="Dirección completa del destino"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="attachments">Adjuntar Documentos</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="attachments"
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                    className="cursor-pointer"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const input = document.getElementById("attachments") as HTMLInputElement
                      if (input) input.click()
                    }}
                    className="flex-shrink-0"
                  >
                    <Paperclip className="h-4 w-4 mr-2" />
                    Seleccionar
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Máximo 10MB por archivo. Formatos: PDF, Word, Excel, Imágenes
                </p>
              </div>

              {attachments.length > 0 && (
                <div className="space-y-2">
                  <Label>Archivos seleccionados ({attachments.length}):</Label>
                  <div className="space-y-2 max-h-32 overflow-y-auto border rounded-md p-2">
                    {attachments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Paperclip className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm truncate font-medium">{file.name}</p>
                            <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAttachment(index)}
                          className="flex-shrink-0 h-8 w-8 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="notes">Notas Adicionales</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Información adicional (opcional)"
                  rows={3}
                />
              </div>
            </div>
          </div>

          {formData.quantity && selectedProductData && (
            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <h4 className="font-medium mb-2">Resumen del Movimiento</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Cantidad:</span>
                    <p className="font-medium">
                      {formData.quantity} {selectedProductData.unit_of_measure}
                    </p>
                  </div>
                  {formData.entry_price && formData.movement_type === "entrada" && (
                    <div>
                      <span className="text-muted-foreground">Total de Entrada:</span>
                      <p className="font-medium text-blue-600">
                        {formatCurrency(Number.parseFloat(formData.entry_price) * Number.parseInt(formData.quantity))}
                      </p>
                    </div>
                  )}
                  {formData.exit_price && formData.movement_type === "salida" && (
                    <div>
                      <span className="text-muted-foreground">Total de Salida:</span>
                      <p className="font-medium text-green-600">
                        {formatCurrency(Number.parseFloat(formData.exit_price) * Number.parseInt(formData.quantity))}
                      </p>
                    </div>
                  )}
                  {attachments.length > 0 && (
                    <div>
                      <span className="text-muted-foreground">Documentos:</span>
                      <p className="font-medium">{attachments.length} archivo(s)</p>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Tipo:</span>
                    <p className="font-medium capitalize">{formData.movement_type}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={uploadingAttachments}>
              {uploadingAttachments ? "Subiendo archivos..." : "Crear Movimiento"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
