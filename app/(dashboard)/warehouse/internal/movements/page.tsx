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
  PlusCircle,
  FileText,
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
import { InternalProductSelector, clearInternalProductCache } from "@/components/ui/internal-product-selector"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface InternalProduct {
  id: string
  code: string
  name: string
  unit_of_measure: string
  is_serialized: boolean
  current_stock: number
  cost_price: number
  sale_price: number
}

interface InternalProductCategory {
  id: string
  name: string
}

interface Department {
  id: string
  name: string
}

interface SerializedProduct {
  id: string
  serial_number: string
  status: "in_stock" | "out_of_stock" | "in_repair" | "discarded" | "withdrawn"
  current_location: string | null
  product_id: string
  condition?: "nuevo" | "usado"
}

interface Movement {
  id: string
  product_id: string
  movement_type: "entrada" | "salida" | "ajuste" | "baja"
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
  { value: "baja", label: "Baja del Sistema", icon: Trash, color: "text-orange-600", bgColor: "bg-orange-50" },
]

export default function InternalMovementsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { selectedCompany } = useCompany()
  const [movements, setMovements] = useState<Movement[]>([])
  const [internalProductCategories, setInternalProductCategories] = useState<InternalProductCategory[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [departments, setDepartments] = useState<Department[]>([])
  const [availableSerials, setAvailableSerials] = useState<SerializedProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [movementToDelete, setMovementToDelete] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)

  const [formData, setFormData] = useState({
    product_id: "",
    movement_type: "",
    quantity: 1,
    cost_price: 0,
    sale_price: 0,
    reason: "",
    notes: "",
    requested_by: user?.user_metadata?.full_name || "",
    department_requesting_id: "",
    supplier: "",
    movement_date: format(new Date(), "yyyy-MM-dd"),
    serials_to_process: "",
    selected_serials: [] as string[],
    condition: "nuevo" as "nuevo" | "usado",
  })

  const [selectedProductModel, setSelectedProductModel] = useState<InternalProduct | null>(null)

  const selectedDepartmentName = useMemo(() => {
    return departments.find((dept) => dept.id === formData.department_requesting_id)?.name || ""
  }, [formData.department_requesting_id, departments])

  useEffect(() => {
    if (selectedCompany?.id) {
      fetchMovements()
      fetchInternalProductCategories()
      fetchDepartments()
    }
  }, [selectedCompany?.id])

  useEffect(() => {
    if (
      selectedProductModel?.is_serialized &&
      (formData.movement_type === "salida" || formData.movement_type === "ajuste" || formData.movement_type === "baja")
    ) {
      fetchAvailableSerials(selectedProductModel.id)
    } else {
      setAvailableSerials([])
      setFormData((prev) => ({ ...prev, selected_serials: [] }))
    }
    if (!selectedProductModel?.is_serialized && formData.quantity === 0) {
      setFormData((prev) => ({ ...prev, quantity: 1 }))
    }
  }, [formData.movement_type, selectedProductModel?.id, selectedProductModel?.is_serialized])

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

  const fetchInternalProductCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("internal_product_categories")
        .select("id, name")
        .eq("company_id", selectedCompany?.id)
        .order("name")

      if (error) throw error
      setInternalProductCategories(data || [])
    } catch (error) {
      console.error("Error fetching internal product categories:", error)
      toast.error("Error al cargar las categorías de productos internos.")
    }
  }

  const fetchDepartments = async () => {
    if (!selectedCompany?.id) {
      console.log("No company selected, skipping department fetch.")
      setDepartments([])
      return
    }
    try {
      console.log("Fetching departments for company ID:", selectedCompany.id)
      const { data, error } = await supabase
        .from("departments")
        .select("id, name")
        .eq("company_id", selectedCompany.id)
        .order("name")

      if (error) {
        console.error("Supabase error fetching departments:", error)
        throw error
      }
      console.log("Departments fetched:", data)
      setDepartments(data || [])
    } catch (error) {
      console.error("Error fetching departments:", error)
      toast.error("Error al cargar los departamentos.")
    }
  }

  const fetchAvailableSerials = async (productId: string) => {
    try {
      const { data, error } = await supabase
        .from("internal_product_serials")
        .select("id, serial_number, status, current_location, product_id, condition")
        .eq("product_id", productId)
        .eq("company_id", selectedCompany?.id)
        .eq("status", "in_stock")
        .order("serial_number", { ascending: true })

      if (error) throw error
      setAvailableSerials(data || [])
    } catch (error) {
      console.error("Error fetching available serials:", error)
      toast.error("Error al cargar los números de serie disponibles.")
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (name === "movement_type") {
      setFormData((prev) => ({
        ...prev,
        quantity: selectedProductModel?.is_serialized ? 1 : 1,
        serials_to_process: "",
        selected_serials: [],
        condition: "nuevo",
      }))
    }
  }

  const handleProductSelect = (product: InternalProduct | null) => {
    setSelectedProductModel(product)
    if (product) {
      setFormData((prev) => ({
        ...prev,
        product_id: product.id,
        cost_price: product.cost_price || 0,
        sale_price: product.sale_price || 0,
        quantity: product.is_serialized ? 1 : 1,
        serials_to_process: "",
        selected_serials: [],
        condition: "nuevo",
      }))
    } else {
      setFormData((prev) => ({
        ...prev,
        product_id: "",
        cost_price: 0,
        sale_price: 0,
        quantity: 1,
        serials_to_process: "",
        selected_serials: [],
        condition: "nuevo",
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
        quantity: newSelectedSerials.length,
      }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.movement_type === "baja") {
      const quantity = selectedProductModel?.is_serialized ? formData.selected_serials.length : formData.quantity
      const itemDetails = `${quantity} ${selectedProductModel?.unit_of_measure}`
      const productInfo = `${selectedProductModel?.name} (${selectedProductModel?.code})`

      // Show confirmation before proceeding
      const confirmed = window.confirm(
        `Confirmación de Baja del Sistema\n\n` +
          `Estás a punto de dar de baja: ${itemDetails} de ${productInfo}\n\n` +
          `Esta acción:\n` +
          `- Disminuirá el stock disponible\n` +
          `- Marcará los productos como retirados del sistema\n` +
          `- Generará un movimiento de salida permanente\n\n` +
          `¿Deseas continuar?`,
      )

      if (!confirmed) {
        return
      }
    }

    setIsSubmitting(true)

    if (!selectedCompany?.id) {
      toast.error("No se ha seleccionado una empresa. Por favor, selecciona una empresa.")
      setIsSubmitting(false)
      return
    }

    if (!selectedProductModel) {
      toast.error("Por favor, selecciona un producto.")
      setIsSubmitting(false)
      return
    }

    let serialsArray: string[] = []
    if (selectedProductModel.is_serialized) {
      if (formData.movement_type === "entrada") {
        if (formData.quantity <= 0) {
          toast.error("La cantidad debe ser mayor a 0.")
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
        is_serialized_product: selectedProductModel.is_serialized,
        serials_to_process: serialsArray,
        selected_serials: serialsArray,
        total_amount: formData.quantity * formData.cost_price,
        department_requesting: selectedDepartmentName,
        condition: formData.condition,
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

      const successMessage =
        formData.movement_type === "baja"
          ? "Productos dados de baja exitosamente. El movimiento ha sido registrado."
          : formData.movement_type === "entrada"
            ? "Movimiento registrado exitosamente. Los números de serie se generaron automáticamente."
            : "Movimiento registrado exitosamente."

      toast.success(successMessage)

      clearInternalProductCache()

      setFormData({
        product_id: "",
        movement_type: "",
        quantity: 1,
        cost_price: 0,
        sale_price: 0,
        reason: "",
        notes: "",
        requested_by: user?.user_metadata?.full_name || "",
        department_requesting_id: "",
        supplier: "",
        movement_date: format(new Date(), "yyyy-MM-dd"),
        serials_to_process: "",
        selected_serials: [],
        condition: "nuevo",
      })
      setSelectedCategory(null)
      setSelectedProductModel(null)
      setAvailableSerials([])
      fetchMovements()
      setIsFormOpen(false)
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
      const response = await fetch(
        `/api/internal-inventory-movements?id=${movementToDelete}&companyId=${selectedCompany.id}`,
        {
          method: "DELETE",
        },
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al eliminar el movimiento.")
      }

      toast.success("Movimiento eliminado exitosamente.")
      fetchMovements()
    } catch (error) {
      console.error("Error deleting movement:", error)
      toast.error("Error al eliminar el movimiento.")
    } finally {
      setDeleteDialogOpen(false)
      setMovementToDelete(null)
    }
  }

  const handleExportCsv = () => {
    if (movements.length === 0) {
      toast.info("No hay movimientos para exportar.")
      return
    }

    const headers = [
      "ID Movimiento",
      "Fecha Movimiento",
      "Fecha Creación",
      "Tipo Movimiento",
      "Producto Código",
      "Producto Nombre",
      "Unidad de Medida",
      "Es Serializado",
      "Cantidad",
      "Costo Unitario",
      "Monto Total",
      "Número de Serie",
      "Motivo",
      "Notas",
      "Solicitado Por",
      "Departamento Solicitante",
      "Proveedor",
    ]

    const csvRows = movements.map((movement) => {
      const movementTypeLabel =
        MOVEMENT_TYPES.find((t) => t.value === movement.movement_type)?.label || movement.movement_type
      return [
        `"${movement.id}"`,
        `"${format(new Date(movement.movement_date), "dd/MM/yyyy", { locale: es })}"`,
        `"${format(new Date(movement.created_at), "dd/MM/yyyy HH:mm", { locale: es })}"`,
        `"${movementTypeLabel}"`,
        `"${movement.internal_products?.code || "N/A"}"`,
        `"${movement.internal_products?.name || "N/A"}"`,
        `"${movement.internal_products?.unit_of_measure || "N/A"}"`,
        `"${movement.internal_products?.is_serialized ? "Sí" : "No"}"`,
        movement.quantity,
        movement.cost_price.toFixed(2),
        movement.total_amount.toFixed(2),
        `"${movement.internal_product_serials?.serial_number || "N/A"}"`,
        `"${movement.reason.replace(/"/g, '""')}"`,
        `"${(movement.notes || "").replace(/"/g, '""')}"`,
        `"${movement.requested_by.replace(/"/g, '""')}"`,
        `"${(movement.department_requesting || "").replace(/"/g, '""')}"`,
        `"${(movement.supplier || "").replace(/"/g, '""')}"`,
      ].join(",")
    })

    const csvContent = [headers.join(","), ...csvRows].join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `movimientos_inventario_interno_${format(new Date(), "yyyyMMdd_HHmmss")}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success("Historial de movimientos exportado exitosamente.")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 mt-10">
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
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCsv}>
            <FileText className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="h-4 w-4 mr-2" />
                Registrar Nuevo Movimiento
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Registrar Nuevo Movimiento</DialogTitle>
                <DialogDescription>Completa los detalles para registrar un movimiento de inventario.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 py-4">
                {/* Selección de Categoría */}
                <div className="space-y-2">
                  <Label htmlFor="category_id">Categoría de Producto Interno</Label>
                  <Select
                    name="category_id"
                    value={selectedCategory || ""}
                    onValueChange={(value) => {
                      setSelectedCategory(value)
                      handleProductSelect(null)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {internalProductCategories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Selección de Producto (usando InternalProductSelector) */}
                <InternalProductSelector
                  label="Producto"
                  required
                  value={formData.product_id}
                  onSelect={handleProductSelect}
                  categoryId={selectedCategory}
                  disabled={!selectedCategory}
                />

                {/* Tipo de movimiento */}
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

                {formData.movement_type === "entrada" && (
                  <div className="space-y-2">
                    <Label htmlFor="condition">Estado del Producto</Label>
                    <Select
                      name="condition"
                      value={formData.condition}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, condition: value as "nuevo" | "usado" }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona el estado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nuevo">Nuevo</SelectItem>
                        <SelectItem value="usado">Usado</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      Indica si los productos ingresados son nuevos o ya fueron utilizados.
                    </p>
                  </div>
                )}

                {selectedProductModel?.is_serialized ? (
                  <>
                    {formData.movement_type === "entrada" && (
                      <div className="space-y-2">
                        <Label htmlFor="quantity">Cantidad de Unidades</Label>
                        <Input
                          id="quantity"
                          name="quantity"
                          type="number"
                          value={formData.quantity}
                          onChange={handleQuantityChange}
                          min={1}
                          required
                        />
                        <p className="text-sm text-muted-foreground">
                          Se generarán automáticamente {formData.quantity} números de serie únicos.
                        </p>
                      </div>
                    )}

                    {(formData.movement_type === "salida" ||
                      formData.movement_type === "ajuste" ||
                      formData.movement_type === "baja") && (
                      <div className="space-y-2">
                        <Label htmlFor="selected_serials">
                          {formData.movement_type === "baja"
                            ? "Seleccionar Números de Serie para Baja"
                            : "Seleccionar Números de Serie"}
                        </Label>
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
                    <Label htmlFor="quantity">
                      {formData.movement_type === "baja" ? "Cantidad para Baja" : "Cantidad"}
                    </Label>
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
                    disabled
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reason">{formData.movement_type === "baja" ? "Motivo de la Baja" : "Motivo"}</Label>
                  <Input
                    id="reason"
                    name="reason"
                    value={formData.reason}
                    onChange={handleChange}
                    placeholder={
                      formData.movement_type === "baja"
                        ? "Ej: Consumido, Dañado, Vencido, etc."
                        : "Ej: Venta, Consumo interno, Devolución, etc."
                    }
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

                {formData.movement_type !== "baja" && (
                  <div className="space-y-2">
                    <Label htmlFor="department_requesting_id">Departamento Solicitante (Opcional)</Label>
                    <Select
                      name="department_requesting_id"
                      value={formData.department_requesting_id}
                      onValueChange={(value) => handleSelectChange("department_requesting_id", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un departamento" />
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
                )}

                {formData.movement_type === "entrada" && !selectedProductModel?.is_serialized && (
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
            </DialogContent>
          </Dialog>
        </div>
      </div>

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
                    <TableHead>N° Serie / Seriales Generados</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Solicitante</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((movement) => {
                    const movementType = MOVEMENT_TYPES.find((t) => t.value === movement.movement_type)
                    const Icon = movementType?.icon || Package

                    let serialsArray: string[] = []

                    if (movement.movement_type === "entrada" && movement.notes) {
                      // Try new delimited format first (from fixed assets)
                      const newFormatMatch = movement.notes.match(
                        /---SERIALES_GENERADOS---\n([\s\S]*?)\n---FIN_SERIALES---/,
                      )
                      if (newFormatMatch) {
                        serialsArray = newFormatMatch[1]
                          .trim()
                          .split("\n")
                          .map((s: string) => s.trim())
                          .filter(Boolean)
                      } else {
                        // Try old format: "Series generadas: serial1, serial2, serial3" (at end of notes)
                        const oldFormatMatch = movement.notes.match(/Series generadas:\s*(.+)$/i)
                        if (oldFormatMatch) {
                          serialsArray = oldFormatMatch[1]
                            .split(",")
                            .map((s: string) => s.trim())
                            .filter(Boolean)
                        }
                      }
                    }

                    // Fallback to direct serial_number if no serials found in notes
                    const directSerial = movement.internal_product_serials?.serial_number || ""
                    const hasGeneratedSerials = serialsArray.length > 0
                    const hasDirectSerial = directSerial.length > 0
                    const hasSerials = hasGeneratedSerials || hasDirectSerial

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
                              {movement.movement_type === "salida" || movement.movement_type === "baja" ? "-" : "+"}
                              {movement.quantity}
                            </span>
                            <span className="text-muted-foreground text-sm">
                              {movement.internal_products?.unit_of_measure}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[300px]">
                          <div className="text-sm">
                            {!hasSerials ? (
                              <span className="text-muted-foreground">N/A</span>
                            ) : hasGeneratedSerials ? (
                              serialsArray.length > 1 ? (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="text-sm font-mono text-primary cursor-pointer underline decoration-dotted">
                                        {serialsArray[0]} y +{serialsArray.length - 1} más
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="max-w-sm max-h-64 overflow-y-auto">
                                      <div className="text-xs font-medium mb-1">
                                        Series generadas ({serialsArray.length}):
                                      </div>
                                      <div className="font-mono text-xs space-y-0.5">
                                        {serialsArray.map((serial, idx) => (
                                          <div key={idx}>{serial}</div>
                                        ))}
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ) : (
                                <span className="text-sm font-mono">{serialsArray[0]}</span>
                              )
                            ) : (
                              <span className="text-sm font-mono">{directSerial}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate" title={movement.reason}>
                          {movement.reason === "compra_activo_fijo" ? (
                            <Badge variant="secondary" className="text-xs">
                              Compra Activo Fijo
                            </Badge>
                          ) : (
                            movement.reason
                          )}
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
