"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase"
import { ChevronLeft, Save, Package } from "lucide-react"
import Link from "next/link"

interface Category {
  id: string
  name: string
  color: string
}

export default function NewInternalProductPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    code: "", // This will be the model code
    name: "",
    description: "",
    category_id: "",
    unit_of_measure: "unidad",
    minimum_stock: "0", // Default for non-serialized
    cost_price: "",
    location: "",
    initial_stock: "0", // Default for non-serialized
    is_serialized: false, // New field
    serial_numbers_input: "", // For serialized products, comma or newline separated
  })

  useEffect(() => {
    if (user?.company_id) {
      fetchCategories()
    }
  }, [user?.company_id])

  const fetchCategories = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("internal_product_categories")
        .select("id, name, color")
        .or(`company_id.eq.${user?.company_id},company_id.is.null`)
        .order("name")

      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error("Error fetching categories:", error)
      toast.error("Error al cargar categorías")
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target
    setFormData((prev) => ({ ...prev, [id]: value }))
  }

  const handleSelectChange = (id: string, value: string) => {
    setFormData((prev) => ({ ...prev, [id]: value }))
  }

  const handleSwitchChange = (checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      is_serialized: checked,
      // Reset stock fields if switching to serialized, or serials if switching to non-serialized
      minimum_stock: checked ? "0" : prev.minimum_stock,
      initial_stock: checked ? "0" : prev.initial_stock,
      serial_numbers_input: checked ? prev.serial_numbers_input : "",
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const payload: any = {
        name: formData.name,
        description: formData.description,
        category_id: formData.category_id,
        unit_of_measure: formData.unit_of_measure,
        cost_price: Number.parseFloat(formData.cost_price),
        location: formData.location,
        code: formData.code, // This is the model code
        is_serialized: formData.is_serialized,
      }

      if (formData.is_serialized) {
        const serialNumbers = formData.serial_numbers_input
          .split(/[\n,]+/)
          .map((s) => s.trim())
          .filter((s) => s.length > 0)

        if (serialNumbers.length === 0) {
          toast.error("Debes ingresar al menos un número de serie para productos serializados.")
          setIsSubmitting(false)
          return
        }
        // Check for duplicates within the input
        const uniqueSerialNumbers = new Set(serialNumbers)
        if (uniqueSerialNumbers.size !== serialNumbers.length) {
          toast.error("Hay números de serie duplicados en la lista ingresada. Por favor, revisa.")
          setIsSubmitting(false)
          return
        }

        payload.serial_numbers = serialNumbers
        payload.initial_stock = serialNumbers.length // Initial stock is the count of serials
        payload.minimum_stock = 0 // Minimum stock is not directly applicable per model for serialized items
      } else {
        payload.minimum_stock = Number.parseInt(formData.minimum_stock)
        payload.initial_stock = Number.parseInt(formData.initial_stock)
      }

      const response = await fetch("/api/internal-products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al crear el producto")
      }

      toast.success("Producto creado exitosamente!")
      router.push("/warehouse/internal/products")
    } catch (error: any) {
      console.error("Error creating product:", error)
      toast.error(error.message || "Error al crear el producto. Intente nuevamente.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Package className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" asChild>
          <Link href="/warehouse/internal/products">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Volver a Productos
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Nuevo Producto Interno</h1>
        <div /> {/* Placeholder for alignment */}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Detalles del Producto</CardTitle>
            <CardDescription>Información básica y de inventario del nuevo artículo.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="code">Código de Modelo *</Label>
                <Input id="code" value={formData.code} onChange={handleChange} placeholder="Ej: INT-001" required />
                <p className="text-sm text-muted-foreground mt-1">
                  Código identificador del modelo de producto (ej. LAP-001 para un modelo de laptop).
                </p>
              </div>
              <div>
                <Label htmlFor="name">Nombre del Producto *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Ej: Laptop HP ProBook 450 G9"
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Descripción detallada del producto"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="category_id">Categoría *</Label>
                <Select
                  value={formData.category_id}
                  onValueChange={(value) => handleSelectChange("category_id", value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color }} />
                          {category.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="unit_of_measure">Unidad de Medida</Label>
                <Input
                  id="unit_of_measure"
                  value={formData.unit_of_measure}
                  onChange={handleChange}
                  placeholder="Ej: unidad, caja, litro"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="is_serialized" className="text-base">
                    Producto Serializado
                  </Label>
                  <CardDescription>
                    Cada unidad tiene un número de serie único (ej. laptops, celulares).
                  </CardDescription>
                </div>
                <Switch id="is_serialized" checked={formData.is_serialized} onCheckedChange={handleSwitchChange} />
              </div>

              {formData.is_serialized ? (
                <div>
                  <Label htmlFor="serial_numbers_input">Números de Serie *</Label>
                  <Textarea
                    id="serial_numbers_input"
                    value={formData.serial_numbers_input}
                    onChange={handleChange}
                    placeholder="Ingresa un número de serie por línea o separados por coma"
                    rows={5}
                    required
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Cada línea o número separado por coma creará una unidad individual.
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <Label htmlFor="initial_stock">Stock Inicial *</Label>
                    <Input
                      id="initial_stock"
                      type="number"
                      value={formData.initial_stock}
                      onChange={handleChange}
                      placeholder="0"
                      min="0"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="minimum_stock">Stock Mínimo</Label>
                    <Input
                      id="minimum_stock"
                      type="number"
                      value={formData.minimum_stock}
                      onChange={handleChange}
                      placeholder="0"
                      min="0"
                    />
                  </div>
                </>
              )}

              <div>
                <Label htmlFor="cost_price">Precio de Costo Unitario *</Label>
                <Input
                  id="cost_price"
                  type="number"
                  step="0.01"
                  value={formData.cost_price}
                  onChange={handleChange}
                  placeholder="0.00"
                  min="0"
                  required
                />
              </div>
              <div>
                <Label htmlFor="location">Ubicación Predeterminada</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="Ej: Almacén Principal, Estante A1"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Guardando..." : "Crear Producto"}
            <Save className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </form>
    </div>
  )
}
