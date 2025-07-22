"use client"

import type React from "react"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  ArrowLeft,
  Trash,
  Package,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  User,
  Search,
  Check,
  Loader2,
  Eye,
} from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { useCompany } from "@/lib/company-context"
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog"

interface Product {
  id: string
  code: string
  name: string
  unit_of_measure: string
  is_serialized: boolean
  current_stock: number
}

interface SerializedProduct {
  id: string
  serial_number: string
  status: "in_stock" | "out_of_stock" | "in_repair" | "discarded"
  current_location: string | null
  product_id: string
}

interface Movement {
  id: string
  product_id: string
  movement_type: "entrada" | "salida" | "ajuste"
  quantity: number
  cost_price: number
  total_amount: number
  reason: string
  notes: string | null
  requested_by: string
  department_requesting: string | null
  supplier: string | null
  movement_date: string
  created_at: string
  serial_id: string | null
  internal_products: {
    name: string
    code: string
    unit_of_measure: string
    is_serialized: boolean
  }
  internal_product_serials: {
    serial_number: string
  } | null
}

const MOVEMENT_TYPES = [
  { value: "entrada", label: "Entrada", icon: ArrowUp, color: "text-green-600", bgColor: "bg-green-50" },
  { value: "salida", label: "Asignación", icon: ArrowDown, color: "text-red-600", bgColor: "bg-red-50" },
  { value: "ajuste", label: "Ajuste", icon: RotateCcw, color: "text-blue-600", bgColor: "bg-blue-50" },
]

export default function InternalMovementsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { selectedCompany } = useCompany()
  const [movements, setMovements] = useState<Movement[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [availableSerials, setAvailableSerials] = useState<SerializedProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [movementToDelete, setMovementToDelete] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    product_id: "",
    movement_type: "",
    quantity: 1, // Default to 1 for serialized products
    cost_price: 0,
    reason: "",
    notes: "",
    requested_by: user?.user_metadata?.full_name || "",
    department_requesting: "",
    supplier: "",
    movement_date: format(new Date(), "yyyy-MM-dd"),
    serials_to_process: "", // For new serials (entrada)
    selected_serials: [] as string[], // For existing serials (salida, ajuste)
  })

  const selectedProduct = useMemo(() => {
    return products.find((p) => p.id === formData.product_id)
  }, [formData.product_id, products])

  useEffect(() => {
    if (selectedCompany?.id) {
      fetchMovements()
      fetchProducts()
    }
  }, [selectedCompany?.id])

  useEffect(() => {
    if (
      selectedProduct?.is_serialized &&
      (formData.movement_type === "salida" || formData.movement_type === "ajuste")
    ) {
      fetchAvailableSerials(selectedProduct.id)
    } else {
      setAvailableSerials([])
      setFormData((prev) => ({ ...prev, selected_serials: [] }))
    }
    // Reset quantity for non-serialized products if type changes
    if (!selectedProduct?.is_serialized && formData.quantity === 0) {
      setFormData((prev) => ({ ...prev, quantity: 1 }))
    }
  }, [formData.movement_type, selectedProduct?.id, selectedProduct?.is_serialized])

  const fetchMovements = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("internal_inventory_movements")
        .select(
          `
          *,
          internal_products (
            name,
            code,
            unit_of_measure,
            is_serialized
          ),
          internal_product_serials (
            serial_number
          )
        `,
        )
        .eq("company_id", selectedCompany?.id)
        .order("created_at", { ascending: false })

      if (error) throw error
      setMovements(data || [])
    } catch (error) {
      console.error("Error fetching movements:", error)
      toast.error("Error al cargar los movimientos.")
    } finally {
      setLoading(false)
    }
  }

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("internal_products")
        .select("id, name, code, unit_of_measure, is_serialized, current_stock")
        .eq("company_id", selectedCompany?.id)
        .eq("is_active", true)

      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error("Error fetching products:", error)
      toast.error("Error al cargar los productos.")
    }
  }

  const fetchAvailableSerials = async (productId: string) => {
    try {
      const { data, error } = await supabase
        .from("internal_product_serials")
        .select("id, serial_number, status, current_location, product_id")
        .eq("product_id", productId)
        .eq("company_id", selectedCompany?.id)
        .eq("status", "in_stock") // Only show serials currently in stock
        .order("serial_number", { ascending: true })

      if (error) throw error
      setAvailableSerials(data || [])
    } catch (error) {
      console.error("Error fetching available serials:", error)
      toast.error("Error al cargar los números de serie disponibles.")
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (name === "product_id") {
      const product = products.find((p) => p.id === value)
      if (product) {
        setFormData((prev) => ({
          ...prev,
          cost_price: product.cost_price || 0, // Assuming cost_price is available on product
          quantity: product.is_serialized ? 1 : 1, // Reset quantity for serialized
          serials_to_process: "",
          selected_serials: [],
        }))
      }
    }
    if (name === "movement_type") {
      setFormData((prev) => ({
        ...prev,
        quantity: selectedProduct?.is_serialized ? 1 : 1, // Reset quantity for serialized
        serials_to_process: "",
        selected_serials: [],
      }))
    }
  }

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number.parseInt(e.target.value)
    setFormData((prev) => ({ ...prev, quantity: isNaN(value) ? 0 : value }))
  }

  const handleSerialSelection = (serialId: string) => {
    setFormData((prev) => {
      const newSelectedSerials = prev.selected_serials.includes(serialId)
        ? prev.selected_serials.filter((id) => id !== serialId)
        : [...prev.selected_serials, serialId]

      return {
        ...prev,
        selected_serials: newSelectedSerials,
        quantity: newSelectedSerials.length, // Update quantity based on selected serials
      }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    if (!selectedCompany?.id) {
      toast.error("No se ha seleccionado una empresa. Por favor, selecciona una empresa.")
      setIsSubmitting(false)
      return
    }

    if (!selectedProduct) {
      toast.error("Por favor, selecciona un producto.")
      setIsSubmitting(false)
      return
    }

    let serialsArray: string[] = []
    if (selectedProduct.is_serialized) {
      if (formData.movement_type === "entrada") {
        serialsArray = formData.serials_to_process
          .split(/[\n,]+/)
          .map((s) => s.trim())
          .filter(Boolean)
        if (serialsArray.length === 0) {
          toast.error("Por favor, ingresa al menos un número de serie para la entrada.")
          setIsSubmitting(false)
          return
        }
        // Check for duplicate serials in the input
        const uniqueSerials = new Set(serialsArray)
        if (uniqueSerials.size !== serialsArray.length) {
          toast.error("Se detectaron números de serie duplicados en la entrada. Por favor, revisa.")
          setIsSubmitting(false)
          return
        }
      } else {
        serialsArray = formData.selected_serials
        if (serialsArray.length === 0) {
          toast.error("Por favor, selecciona al menos un número de serie.")
          setIsSubmitting(false)
          return
        }
      }
    } else {
      if (formData.quantity <= 0) {
        toast.error("La cantidad debe ser mayor a 0.")
        setIsSubmitting(false)
        return
      }
    }

    try {
      const payload = {
        ...formData,
        company_id: selectedCompany.id,
        is_serialized_product: selectedProduct.is_serialized,
        serials_to_process: serialsArray, // Send processed array
        total_amount: formData.quantity * formData.cost_price,
      }

      const response = await fetch("/api/internal-inventory-movements", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al registrar el movimiento.")
      }

      toast.success("Movimiento registrado exitosamente.")
      setFormData({
        product_id: "",
        movement_type: "",
        quantity: 1,
        cost_price: 0,
        reason: "",
        notes: "",
        requested_by: user?.user_metadata?.full_name || "",
        department_requesting: "",
        supplier: "",
        movement_date: format(new Date(), "yyyy-MM-dd"),
        serials_to_process: "",
        selected_serials: [],
      })
      setAvailableSerials([]) // Clear available serials after submission
      fetchMovements()
      fetchProducts() // Refresh product stock
    } catch (error: any) {
      console.error("Error submitting movement:", error)
      toast.error(error.message || "Error al registrar el movimiento.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteClick = (movementId: string) => {
    setMovementToDelete(movementId)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!movementToDelete || !selectedCompany?.id) return

    try {
      const { error } = await supabase
        .from("internal_inventory_movements")
        .delete()
        .eq("id", movementToDelete)
        .eq("company_id", selectedCompany.id)

      if (error) throw error

      toast.success("Movimiento eliminado exitosamente.")
      fetchMovements()
      fetchProducts() // Refresh product stock
    } catch (error) {
      console.error("Error deleting movement:", error)
      toast.error("Error al eliminar el movimiento.")
    } finally {
      setDeleteDialogOpen(false)
      setMovementToDelete(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/warehouse/internal">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Movimientos de Inventario Interno</h1>
            <p className="text-muted-foreground">
              Registra y gestiona los movimientos de productos dentro de tu empresa.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* New Movement Form */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Registrar Nuevo Movimiento</CardTitle>
            <CardDescription>Completa los detalles para registrar un movimiento de inventario.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="product_id">Producto</Label>
                <Select
                  name="product_id"
                  value={formData.product_id}
                  onValueChange={(value) => handleSelectChange("product_id", value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un producto" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} ({product.code}) - Stock: {product.current_stock} {product.unit_of_measure}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="movement_type">Tipo de Movimiento</Label>
                <Select
                  name="movement_type"
                  value={formData.movement_type}
                  onValueChange={(value) => handleSelectChange("movement_type", value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona el tipo de movimiento" />
                  </SelectTrigger>
                  <SelectContent>
                    {MOVEMENT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <type.icon className={`h-4 w-4 ${type.color}`} />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedProduct?.is_serialized ? (
                <>
                  {formData.movement_type === "entrada" && (
                    <div className="space-y-2">
                      <Label htmlFor="serials_to_process">Números de Serie (uno por línea o separados por coma)</Label>
                      <Textarea
                        id="serials_to_process"
                        name="serials_to_process"
                        value={formData.serials_to_process}
                        onChange={handleChange}
                        placeholder="Ej: ABC-001&#10;ABC-002&#10;ABC-003"
                        rows={5}
                        required
                      />
                      <p className="text-sm text-muted-foreground">
                        Se registrarán {formData.serials_to_process.split(/[\n,]+/).filter(Boolean).length} unidades.
                      </p>
                    </div>
                  )}

                  {(formData.movement_type === "salida" || formData.movement_type === "ajuste") && (
                    <div className="space-y-2">
                      <Label htmlFor="selected_serials">Seleccionar Números de Serie</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-between bg-transparent">
                            {formData.selected_serials.length > 0
                              ? `${formData.selected_serials.length} serial(es) seleccionado(s)`
                              : "Seleccionar seriales..."}
                            <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                          <Command>
                            <CommandInput placeholder="Buscar número de serie..." />
                            <CommandList>
                              <CommandEmpty>No se encontraron seriales.</CommandEmpty>
                              <CommandGroup>
                                {availableSerials.map((serial) => (
                                  <CommandItem
                                    key={serial.id}
                                    onSelect={() => handleSerialSelection(serial.id)}
                                    className="flex items-center justify-between"
                                  >
                                    <span>{serial.serial_number}</span>
                                    {formData.selected_serials.includes(serial.id) ? (
                                      <Check className="ml-auto h-4 w-4" />
                                    ) : null}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <p className="text-sm text-muted-foreground">
                        Cantidad seleccionada: {formData.selected_serials.length}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="quantity">Cantidad</Label>
                  <Input
                    id="quantity"
                    name="quantity"
                    type="number"
                    value={formData.quantity}
                    onChange={handleQuantityChange}
                    min={1}
                    required
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="cost_price">Costo Unitario (S/)</Label>
                <Input
                  id="cost_price"
                  name="cost_price"
                  type="number"
                  step="0.01"
                  value={formData.cost_price}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Motivo</Label>
                <Input
                  id="reason"
                  name="reason"
                  value={formData.reason}
                  onChange={handleChange}
                  placeholder="Ej: Venta, Consumo interno, Devolución, etc."
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notas (Opcional)</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Notas adicionales sobre el movimiento"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="requested_by">Solicitado Por</Label>
                <Input
                  id="requested_by"
                  name="requested_by"
                  value={formData.requested_by}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="department_requesting">Departamento Solicitante (Opcional)</Label>
                <Input
                  id="department_requesting"
                  name="department_requesting"
                  value={formData.department_requesting}
                  onChange={handleChange}
                  placeholder="Ej: Ventas, Almacén, Producción"
                />
              </div>

              {formData.movement_type === "entrada" && !selectedProduct?.is_serialized && (
                <div className="space-y-2">
                  <Label htmlFor="supplier">Proveedor (Opcional)</Label>
                  <Input
                    id="supplier"
                    name="supplier"
                    value={formData.supplier}
                    onChange={handleChange}
                    placeholder="Nombre del proveedor"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="movement_date">Fecha del Movimiento</Label>
                <Input
                  id="movement_date"
                  name="movement_date"
                  type="date"
                  value={formData.movement_date}
                  onChange={handleChange}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Registrando...
                  </>
                ) : (
                  "Registrar Movimiento"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Movement History Table */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Historial de Movimientos</CardTitle>
            <CardDescription>Todos los movimientos de inventario registrados.</CardDescription>
          </CardHeader>
          <CardContent>
            {movements.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold">No hay movimientos registrados</h3>
                <p className="text-muted-foreground">Empieza registrando un nuevo movimiento.</p>
              </div>
            ) : (
              <div className="rounded-md border overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Cantidad</TableHead>
                      <TableHead>N° Serie</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Solicitante</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements.map((movement) => {
                      const movementType = MOVEMENT_TYPES.find((t) => t.value === movement.movement_type)
                      const Icon = movementType?.icon || Package
                      return (
                        <TableRow key={movement.id}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {format(new Date(movement.movement_date), "dd/MM/yyyy", { locale: es })}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(movement.created_at), "HH:mm", { locale: es })}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{movement.internal_products?.name}</div>
                            <div className="text-sm text-muted-foreground">{movement.internal_products?.code}</div>
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
                                {movement.internal_products?.unit_of_measure}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {movement.internal_products?.is_serialized ? (
                              movement.internal_product_serials?.serial_number || "N/A"
                            ) : (
                              <span className="text-muted-foreground">N/A</span>
                            )}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate" title={movement.reason}>
                            {movement.reason}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm">{movement.requested_by}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/warehouse/internal/movements/${movement.id}`}>
                                <Eye className="h-4 w-4" />
                                <span className="sr-only">Ver detalles</span>
                              </Link>
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(movement.id)}>
                              <Trash className="h-4 w-4 text-red-500" />
                              <span className="sr-only">Eliminar</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        title="¿Estás seguro de eliminar este movimiento?"
        description="Esta acción no se puede deshacer. Se revertirán los cambios de stock asociados."
      />
    </div>
  )
}
