"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Search, Package, ArrowUp, ArrowDown, RotateCcw, Calendar, Building, User } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface Product {
  id: string
  code: string
  name: string
  current_stock: number
  unit_of_measure: string
  cost_price: number
}

interface Department {
  id: string
  name: string
  description: string
}

interface Movement {
  id: string
  product_id: string
  movement_type: "entrada" | "salida" | "ajuste"
  quantity: number
  cost_price: number
  total_amount: number
  reason: string
  notes: string
  requested_by: string
  department_requesting: string
  supplier: string
  movement_date: string
  created_at: string
  internal_products: {
    code: string
    name: string
    unit_of_measure: string
  }
}

interface MovementForm {
  product_id: string
  movement_type: "entrada" | "salida" | "ajuste"
  quantity: number
  cost_price: number
  reason: string
  notes: string
  requested_by: string
  department_requesting: string
  supplier: string
}

const MOVEMENT_TYPES = [
  { value: "entrada", label: "Entrada", icon: ArrowUp, color: "text-green-600" },
  { value: "salida", label: "Salida", icon: ArrowDown, color: "text-red-600" },
  { value: "ajuste", label: "Ajuste", icon: RotateCcw, color: "text-blue-600" },
]

export default function InternalMovementsPage() {
  const { user } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [movements, setMovements] = useState<Movement[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [formData, setFormData] = useState<MovementForm>({
    product_id: "",
    movement_type: "entrada",
    quantity: 0,
    cost_price: 0,
    reason: "",
    notes: "",
    requested_by: user?.full_name || "",
    department_requesting: "",
    supplier: "",
  })

  useEffect(() => {
    if (user?.company_id) {
      fetchData()
    }
  }, [user?.company_id])

  useEffect(() => {
    if (user?.full_name) {
      setFormData((prev) => ({ ...prev, requested_by: user.full_name }))
    }
  }, [user?.full_name])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch products
      const { data: productsData, error: productsError } = await supabase
        .from("internal_products")
        .select("id, code, name, current_stock, unit_of_measure, cost_price")
        .eq("company_id", user?.company_id)
        .eq("is_active", true)
        .order("name")

      if (productsError) throw productsError

      // Fetch departments
      const { data: departmentsData, error: departmentsError } = await supabase
        .from("departments")
        .select("id, name, description")
        .eq("company_id", user?.company_id)
        .order("name")

      if (departmentsError) throw departmentsError

      // Fetch movements
      const { data: movementsData, error: movementsError } = await supabase
        .from("internal_inventory_movements")
        .select(`
          *,
          internal_products (
            code,
            name,
            unit_of_measure
          )
        `)
        .eq("company_id", user?.company_id)
        .order("created_at", { ascending: false })
        .limit(100)

      if (movementsError) throw movementsError

      setProducts(productsData || [])
      setDepartments(departmentsData || [])
      setMovements(movementsData || [])
    } catch (error) {
      console.error("Error fetching data:", error)
      toast.error("Error al cargar los datos")
    } finally {
      setLoading(false)
    }
  }

  const handleProductChange = (productId: string) => {
    const product = products.find((p) => p.id === productId)
    if (product) {
      setFormData((prev) => ({
        ...prev,
        product_id: productId,
        cost_price: product.cost_price,
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.product_id) {
      toast.error("Selecciona un producto")
      return
    }

    if (formData.quantity <= 0) {
      toast.error("La cantidad debe ser mayor a 0")
      return
    }

    if (!formData.reason.trim()) {
      toast.error("Ingresa el motivo del movimiento")
      return
    }

    // Validaciones específicas por tipo de movimiento
    if (formData.movement_type === "salida") {
      if (!formData.department_requesting.trim()) {
        toast.error("Especifica el departamento que solicita el producto")
        return
      }
    }

    if (formData.movement_type === "entrada") {
      if (!formData.supplier.trim()) {
        toast.error("Especifica el proveedor o fuente de entrada")
        return
      }
    }

    const product = products.find((p) => p.id === formData.product_id)
    if (!product) {
      toast.error("Producto no encontrado")
      return
    }

    // Validar stock para salidas
    if (formData.movement_type === "salida" && formData.quantity > product.current_stock) {
      toast.error(`Stock insuficiente. Stock actual: ${product.current_stock}`)
      return
    }

    try {
      setSaving(true)

      // Crear movimiento - mantener product_id como string UUID
      const movementData = {
        product_id: formData.product_id, // No convertir a número, mantener como UUID string
        movement_type: formData.movement_type,
        quantity: formData.quantity,
        cost_price: formData.cost_price,
        total_amount: formData.quantity * formData.cost_price,
        reason: formData.reason.trim(),
        notes: formData.notes.trim() || null,
        requested_by: formData.requested_by.trim(),
        department_requesting: formData.department_requesting.trim() || null,
        supplier: formData.supplier.trim() || null,
        company_id: user?.company_id,
        created_by: user?.id,
      }

      const { error: movementError } = await supabase.from("internal_inventory_movements").insert([movementData])

      if (movementError) throw movementError

      toast.success("Movimiento registrado correctamente")
      setDialogOpen(false)
      setFormData({
        product_id: "",
        movement_type: "entrada",
        quantity: 0,
        cost_price: 0,
        reason: "",
        notes: "",
        requested_by: user?.full_name || "",
        department_requesting: "",
        supplier: "",
      })
      fetchData()
    } catch (error: any) {
      console.error("Error creating movement:", error)
      toast.error(error.message || "Error al registrar el movimiento")
    } finally {
      setSaving(false)
    }
  }

  const filteredMovements = movements.filter((movement) => {
    const matchesSearch =
      movement.internal_products.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      movement.internal_products.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      movement.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
      movement.requested_by.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (movement.department_requesting &&
        movement.department_requesting.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (movement.supplier && movement.supplier.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesType = typeFilter === "all" || movement.movement_type === typeFilter

    return matchesSearch && matchesType
  })

  const stats = {
    totalMovements: movements.length,
    entradas: movements.filter((m) => m.movement_type === "entrada").length,
    salidas: movements.filter((m) => m.movement_type === "salida").length,
    ajustes: movements.filter((m) => m.movement_type === "ajuste").length,
  }

  const selectedProduct = products.find((p) => p.id === formData.product_id)
  const totalAmount = formData.quantity * formData.cost_price

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Movimientos de Inventario Interno</h1>
          <p className="text-muted-foreground">Registra entradas, salidas y ajustes de productos de uso interno</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Movimiento
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Registrar Movimiento de Inventario</DialogTitle>
                <DialogDescription>
                  Registra un nuevo movimiento de inventario para productos de uso interno
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="product">Producto *</Label>
                  <Select value={formData.product_id} onValueChange={handleProductChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un producto" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          <div className="flex items-center justify-between w-full">
                            <span>
                              {product.code} - {product.name}
                            </span>
                            <span className="text-sm text-muted-foreground ml-2">Stock: {product.current_stock}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="movement_type">Tipo de Movimiento *</Label>
                    <Select
                      value={formData.movement_type}
                      onValueChange={(value: "entrada" | "salida" | "ajuste") =>
                        setFormData((prev) => ({ ...prev, movement_type: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MOVEMENT_TYPES.map((type) => {
                          const Icon = type.icon
                          return (
                            <SelectItem key={type.value} value={type.value}>
                              <div className="flex items-center gap-2">
                                <Icon className={`h-4 w-4 ${type.color}`} />
                                {type.label}
                              </div>
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quantity">
                      {formData.movement_type === "ajuste" ? "Nuevo Stock *" : "Cantidad *"}
                    </Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      value={formData.quantity}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          quantity: Number.parseInt(e.target.value) || 0,
                        }))
                      }
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cost_price">Costo Unitario (S/)</Label>
                  <Input
                    id="cost_price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.cost_price}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        cost_price: Number.parseFloat(e.target.value) || 0,
                      }))
                    }
                    placeholder="0.00"
                  />
                </div>

                {/* Campos específicos por tipo de movimiento */}
                {formData.movement_type === "salida" && (
                  <div className="space-y-4 border-t pt-4">
                    <h4 className="font-medium flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      Información de Salida
                    </h4>
                    <div className="space-y-2">
                      <Label htmlFor="department_requesting">Departamento Solicitante *</Label>
                      <Select
                        value={formData.department_requesting}
                        onValueChange={(value) => setFormData((prev) => ({ ...prev, department_requesting: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona el departamento" />
                        </SelectTrigger>
                        <SelectContent>
                          {departments.map((dept) => (
                            <SelectItem key={dept.id} value={dept.name}>
                              {dept.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {formData.movement_type === "entrada" && (
                  <div className="space-y-4 border-t pt-4">
                    <h4 className="font-medium flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Información de Entrada
                    </h4>
                    <div className="space-y-2">
                      <Label htmlFor="supplier">Proveedor/Fuente *</Label>
                      <Input
                        id="supplier"
                        value={formData.supplier}
                        onChange={(e) => setFormData((prev) => ({ ...prev, supplier: e.target.value }))}
                        placeholder="Nombre del proveedor o fuente de entrada"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="reason">Motivo *</Label>
                  <Input
                    id="reason"
                    value={formData.reason}
                    onChange={(e) => setFormData((prev) => ({ ...prev, reason: e.target.value }))}
                    placeholder="Describe el motivo del movimiento..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notas Adicionales</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                    placeholder="Información adicional (opcional)"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="requested_by">Solicitado por</Label>
                  <Input
                    id="requested_by"
                    value={formData.requested_by}
                    onChange={(e) => setFormData((prev) => ({ ...prev, requested_by: e.target.value }))}
                    placeholder="Nombre del solicitante"
                  />
                </div>

                {/* Resumen */}
                {selectedProduct && formData.quantity > 0 && (
                  <div className="p-4 bg-muted rounded-lg space-y-2">
                    <h4 className="font-medium">Resumen del Movimiento</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>Producto:</div>
                      <div>{selectedProduct.name}</div>
                      <div>Stock actual:</div>
                      <div>
                        {selectedProduct.current_stock} {selectedProduct.unit_of_measure}
                      </div>
                      <div>Cantidad:</div>
                      <div>
                        {formData.quantity} {selectedProduct.unit_of_measure}
                      </div>
                      <div>Valor total:</div>
                      <div>S/ {totalAmount.toFixed(2)}</div>
                      {formData.movement_type === "entrada" && (
                        <>
                          <div>Nuevo stock:</div>
                          <div className="text-green-600 font-semibold">
                            {selectedProduct.current_stock + formData.quantity} {selectedProduct.unit_of_measure}
                          </div>
                        </>
                      )}
                      {formData.movement_type === "salida" && (
                        <>
                          <div>Nuevo stock:</div>
                          <div
                            className={`font-semibold ${
                              selectedProduct.current_stock - formData.quantity < 0 ? "text-red-600" : "text-orange-600"
                            }`}
                          >
                            {selectedProduct.current_stock - formData.quantity} {selectedProduct.unit_of_measure}
                          </div>
                        </>
                      )}
                      {formData.movement_type === "ajuste" && (
                        <>
                          <div>Nuevo stock:</div>
                          <div className="text-blue-600 font-semibold">
                            {formData.quantity} {selectedProduct.unit_of_measure}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Registrando..." : "Registrar Movimiento"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Movimientos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMovements}</div>
            <p className="text-xs text-muted-foreground">Últimos 100 registros</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entradas</CardTitle>
            <ArrowUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.entradas}</div>
            <p className="text-xs text-muted-foreground">Ingresos al inventario</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Salidas</CardTitle>
            <ArrowDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.salidas}</div>
            <p className="text-xs text-muted-foreground">Entregas a departamentos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ajustes</CardTitle>
            <RotateCcw className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.ajustes}</div>
            <p className="text-xs text-muted-foreground">Correcciones de stock</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Busca y filtra movimientos de inventario</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por producto, motivo, departamento o solicitante..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Tipo de movimiento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {MOVEMENT_TYPES.map((type) => {
                  const Icon = type.icon
                  return (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${type.color}`} />
                        {type.label}
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Movements Table */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Movimientos</CardTitle>
          <CardDescription>
            {filteredMovements.length} de {movements.length} movimientos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Valor Total</TableHead>
                  <TableHead>Departamento/Proveedor</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Solicitante</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMovements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="text-muted-foreground">
                        <Package className="h-8 w-8 mx-auto mb-2" />
                        <p>No se encontraron movimientos</p>
                        <p className="text-sm">Intenta ajustar los filtros o registrar un nuevo movimiento</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMovements.map((movement) => {
                    const movementType = MOVEMENT_TYPES.find((t) => t.value === movement.movement_type)
                    const Icon = movementType?.icon || Package
                    return (
                      <TableRow key={movement.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">
                                {format(new Date(movement.movement_date), "dd/MM/yyyy", { locale: es })}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {format(new Date(movement.created_at), "HH:mm", { locale: es })}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{movement.internal_products.name}</div>
                            <div className="text-sm text-muted-foreground font-mono">
                              {movement.internal_products.code}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="flex items-center gap-1 w-fit">
                            <Icon className={`h-3 w-3 ${movementType?.color}`} />
                            {movementType?.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <span className={`font-medium ${movementType?.color}`}>
                              {movement.movement_type === "salida" ? "-" : "+"}
                              {movement.quantity}
                            </span>
                            <span className="text-muted-foreground text-sm">
                              {movement.internal_products.unit_of_measure}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>S/ {movement.total_amount.toFixed(2)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {movement.movement_type === "salida" && movement.department_requesting && (
                              <>
                                <Building className="h-3 w-3 text-muted-foreground" />
                                <span className="text-sm">{movement.department_requesting}</span>
                              </>
                            )}
                            {movement.movement_type === "entrada" && movement.supplier && (
                              <>
                                <Package className="h-3 w-3 text-muted-foreground" />
                                <span className="text-sm">{movement.supplier}</span>
                              </>
                            )}
                            {movement.movement_type === "ajuste" && (
                              <span className="text-sm text-muted-foreground">Ajuste de inventario</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[200px] truncate" title={movement.reason}>
                            {movement.reason}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">{movement.requested_by}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
