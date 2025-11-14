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
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase"
import { ChevronLeft, Save, Package } from "lucide-react"
import Link from "next/link"
import { useCompany } from "@/lib/company-context"
import { InternalCategoryCreatorDialog } from "@/components/ui/internal-category-creator-dialog"

interface Category {
  id: string
  name: string
  color: string
}

export default function NewInternalProductPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { selectedCompany } = useCompany()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [generatedCodeDisplay, setGeneratedCodeDisplay] = useState<string>(
    "Formato: EMPRESA-CATEGORÍA-AÑO-CORRELATIVO (ej: ARM-TEC-2024-001)",
  )
  const [categorySelectOpen, setCategorySelectOpen] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category_id: "",
    unit_of_measure: "unidad",
    minimum_stock: "0",
    cost_price: "",
    location: "",
  })

  useEffect(() => {
    const companyId = user?.role === "admin" ? selectedCompany?.id : user?.company_id
    if (companyId) {
      fetchCategories(companyId)
      setGeneratedCodeDisplay("Generando...")
    } else {
      setGeneratedCodeDisplay("Selecciona una empresa para generar el código.")
      setLoading(false)
    }
  }, [user, selectedCompany])

  const fetchCategories = async (companyId: string) => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("internal_product_categories")
        .select("id, name, color")
        .or(`company_id.eq.${companyId},company_id.is.null`)
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

  const handleCategoryCreated = (newCategory: Category) => {
    setCategories((prev) => [...prev, newCategory].sort((a, b) => a.name.localeCompare(b.name)))
    setFormData((prev) => ({ ...prev, category_id: newCategory.id }))
    setCategorySelectOpen(false)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target
    setFormData((prev) => ({ ...prev, [id]: value }))
  }

  const handleSelectChange = (id: string, value: string) => {
    setFormData((prev) => ({ ...prev, [id]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    const companyId = user?.role === "admin" ? selectedCompany?.id : user?.company_id

    if (!companyId) {
      toast.error("No hay empresa seleccionada. Por favor, selecciona una empresa.")
      setIsSubmitting(false)
      return
    }

    if (!user?.id) {
      toast.error("Usuario no autenticado.")
      setIsSubmitting(false)
      return
    }

    if (!formData.name.trim() || !formData.category_id || !formData.unit_of_measure.trim()) {
      toast.error("Por favor, completa todos los campos requeridos.")
      setIsSubmitting(false)
      return
    }

    const parsedCostPrice = Number.parseFloat(formData.cost_price)
    const parsedMinimumStock = Number.parseInt(formData.minimum_stock)

    if (isNaN(parsedCostPrice) || parsedCostPrice < 0) {
      toast.error("El precio de costo debe ser un número válido y no negativo.")
      setIsSubmitting(false)
      return
    }

    if (isNaN(parsedMinimumStock) || parsedMinimumStock < 0) {
      toast.error("El stock mínimo debe ser un número válido y no negativo.")
      setIsSubmitting(false)
      return
    }

    try {
      const payload: any = {
        name: formData.name,
        description: formData.description,
        category_id: formData.category_id,
        unit_of_measure: formData.unit_of_measure,
        cost_price: parsedCostPrice,
        location: formData.location,
        is_serialized: true,
        minimum_stock: parsedMinimumStock,
        current_stock: 0,
        company_id: companyId,
        created_by: user.id,
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
        throw new Error(errorData.error || "Error al crear el producto.")
      }

      toast.success(
        "Producto interno creado exitosamente. Ahora puedes generar un movimiento de entrada para agregar stock.",
      )
      router.push("/warehouse/internal/products")
    } catch (error: any) {
      console.error("Error creating product:", error)
      toast.error(error.message || "No se pudo crear el producto. Intente nuevamente.")
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

  const companyId = user?.role === "admin" ? selectedCompany?.id : user?.company_id

  return (
    <div className="space-y-6 mt-10">
      <div className="flex items-center justify-between">
        <Button variant="outline" asChild>
          <Link href="/warehouse/internal/products">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Volver a Productos
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Nuevo Producto Interno</h1>
        <div />
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Detalles del Producto</CardTitle>
            <CardDescription>
              Información básica del nuevo artículo. El stock se agregará mediante movimientos de entrada.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
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
                <Label htmlFor="code">Código del Producto</Label>
                <Input id="code" value={generatedCodeDisplay} readOnly disabled />
                <p className="text-sm text-muted-foreground mt-1">El código se genera automáticamente.</p>
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
                  open={categorySelectOpen}
                  onOpenChange={setCategorySelectOpen}
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
                    {companyId && (
                      <div className="p-1">
                        <InternalCategoryCreatorDialog
                          companyId={companyId}
                          onCategoryCreated={handleCategoryCreated}
                        />
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="unit_of_measure">Unidad de Medida *</Label>
                <Select
                  value={formData.unit_of_measure}
                  onValueChange={(value) => handleSelectChange("unit_of_measure", value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una unidad" />
                  </SelectTrigger>
                  <SelectContent>
                    {["unidad", "caja", "litro", "kilogramo", "metro", "galon", "paquete"].map((unit) => (
                      <SelectItem key={unit} value={unit}>
                        {unit.charAt(0).toUpperCase() + unit.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                <p className="text-sm text-muted-foreground mt-1">
                  Recibirás una alerta cuando el stock baje de este número.
                </p>
              </div>
              <div>
                <Label htmlFor="cost_price">Precio de Costo Unitario (S/)</Label>
                <Input
                  id="cost_price"
                  type="number"
                  step="0.01"
                  value={formData.cost_price}
                  onChange={handleChange}
                  placeholder="0.00"
                  min="0"
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
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Nota:</strong> Todos los productos internos son serializados. El stock se agregará mediante
                  movimientos de entrada, donde se generarán automáticamente los números de serie.
                </p>
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
