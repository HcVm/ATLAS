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
import { AlertTriangle, Package, DollarSign, MapPin, Building, Info } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import { useCompany } from "@/lib/company-context"

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

  const [formData, setFormData] = useState({
    product_id: selectedProduct?.id || "",
    movement_type: "",
    quantity: "",
    sale_price: "",
    purchase_order_number: "",
    destination_entity_name: "",
    destination_department_id: "",
    destination_address: "",
    supplier: "",
    reason: "",
    notes: "",
  })

  useEffect(() => {
    // For admin users, use selectedCompany; for others, use their assigned company
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
      // For admin users, use selectedCompany; for others, use their assigned company
      const companyId = user?.role === "admin" ? selectedCompany?.id : user?.company_id

      if (!companyId) {
        console.log("No company ID available")
        return
      }

      console.log("Fetching products for company:", companyId)

      // Obtener productos
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

      // Obtener departamentos del Perú
      const { data: departmentsData } = await supabase.from("peru_departments").select("id, name, code").order("name")

      // Obtener sugerencias de entidades globales
      const { data: suggestionsData } = await supabase.rpc("get_global_entity_suggestions")

      console.log("Products fetched:", productsData?.length || 0)
      setProducts(productsData || [])
      setDepartments(departmentsData || [])
      setEntitySuggestions(suggestionsData?.map((item) => item.entity_name) || [])
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
        sale_price: product.sale_price.toString(),
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // For admin users, use selectedCompany; for others, use their assigned company
    const companyId = user?.role === "admin" ? selectedCompany?.id : user?.company_id

    if (!companyId) {
      toast({
        title: "Error",
        description: "No hay empresa seleccionada",
        variant: "destructive",
      })
      return
    }

    // Validaciones
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

    // Validar stock para salidas
    if (formData.movement_type === "salida" && quantity > selectedProductData.current_stock) {
      toast({
        title: "Stock insuficiente",
        description: `Stock disponible: ${selectedProductData.current_stock} ${selectedProductData.unit_of_measure}`,
        variant: "destructive",
      })
      return
    }

    // Validar campos requeridos para salidas
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
      if (!formData.sale_price) {
        toast({
          title: "Error",
          description: "El precio de venta es requerido para salidas",
          variant: "destructive",
        })
        return
      }
    }

    const salePrice = formData.sale_price ? Number.parseFloat(formData.sale_price) : null
    const totalAmount = salePrice ? salePrice * quantity : null

    onSubmit({
      ...formData,
      quantity,
      sale_price: salePrice,
      total_amount: totalAmount,
      destination_department_id: formData.destination_department_id || null,
      company_id: companyId, // Add company_id to the submission
    })

    // Limpiar formulario
    setFormData({
      product_id: "",
      movement_type: "",
      quantity: "",
      sale_price: "",
      purchase_order_number: "",
      destination_entity_name: "",
      destination_department_id: "",
      destination_address: "",
      supplier: "",
      reason: "",
      notes: "",
    })
    setSelectedProductData(null)
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo Movimiento de Inventario</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Selección de producto */}
          <div className="space-y-2">
            <Label htmlFor="product_id">Producto *</Label>
            <Select value={formData.product_id} onValueChange={handleProductChange} required>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar producto" />
              </SelectTrigger>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>
                        {product.name} ({product.code})
                      </span>
                      <Badge variant={product.current_stock <= product.minimum_stock ? "destructive" : "default"}>
                        {product.current_stock} {product.unit_of_measure}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Información del producto seleccionado */}
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
                      Precio de costo (referencia)
                    </Label>
                    <p className="font-medium text-gray-600">{formatCurrency(selectedProductData.cost_price)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      Precio de venta (referencia)
                    </Label>
                    <p className="font-medium text-gray-600">{formatCurrency(selectedProductData.sale_price)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tipo de movimiento */}
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

          {/* Cantidad y precio */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="quantity">{formData.movement_type === "ajuste" ? "Nuevo Stock *" : "Cantidad *"}</Label>
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
            {formData.movement_type === "salida" && (
              <div>
                <Label htmlFor="sale_price">Precio de Venta *</Label>
                <Input
                  id="sale_price"
                  type="number"
                  step="0.01"
                  value={formData.sale_price}
                  onChange={(e) => setFormData((prev) => ({ ...prev, sale_price: e.target.value }))}
                  placeholder="0.00"
                  required
                />
              </div>
            )}
          </div>

          {/* Campos específicos para salidas */}
          {formData.movement_type === "salida" && (
            <div className="space-y-4 border-t pt-4">
              <h4 className="font-medium flex items-center gap-2">
                <Building className="h-4 w-4" />
                Información de Salida
              </h4>

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

              <div className="space-y-4 border-t pt-4">
                <h5 className="font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Ubicación de Destino
                </h5>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="destination_department_id">Departamento</Label>
                    <Select
                      value={formData.destination_department_id}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, destination_department_id: value }))}
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

          {/* Campos específicos para entradas */}
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

          {/* Campos específicos para ajustes */}
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

          {/* Notas */}
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

          {/* Resumen */}
          {formData.quantity && selectedProductData && (
            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <h4 className="font-medium mb-2">Resumen del Movimiento</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Cantidad:</span>
                    <p className="font-medium">
                      {formData.quantity} {selectedProductData.unit_of_measure}
                    </p>
                  </div>
                  {formData.sale_price && formData.movement_type === "salida" && (
                    <div>
                      <span className="text-muted-foreground">Total de Venta:</span>
                      <p className="font-medium text-green-600">
                        {formatCurrency(Number.parseFloat(formData.sale_price) * Number.parseInt(formData.quantity))}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">Crear Movimiento</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
