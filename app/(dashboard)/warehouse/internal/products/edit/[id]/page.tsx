"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { ArrowLeft, Save, Trash2, Loader2 } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface Category {
  id: number
  name: string
  color: string
}

interface Product {
  id: number
  code: string
  name: string
  description: string | null
  category_id: number
  unit_of_measure: string
  current_stock: number
  minimum_stock: number
  cost_price: number
  location: string | null
  is_active: boolean
  internal_product_categories?: {
    id: number
    name: string
    color: string
  }
}

interface FormData {
  name: string
  description: string
  category_id: string
  unit_of_measure: string
  minimum_stock: number
  cost_price: number
  location: string
  is_active: boolean
}

const UNIT_OPTIONS = [
  { value: "unidad", label: "Unidad" },
  { value: "paquete", label: "Paquete" },
  { value: "caja", label: "Caja" },
  { value: "resma", label: "Resma" },
  { value: "rollo", label: "Rollo" },
  { value: "botella", label: "Botella" },
  { value: "frasco", label: "Frasco" },
  { value: "sobre", label: "Sobre" },
  { value: "kit", label: "Kit" },
  { value: "par", label: "Par" },
]

export default function EditInternalProductPage() {
  const router = useRouter()
  const params = useParams()
  const { user } = useAuth()
  const [categories, setCategories] = useState<Category[]>([])
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    name: "",
    description: "",
    category_id: "",
    unit_of_measure: "unidad",
    minimum_stock: 0,
    cost_price: 0,
    location: "",
    is_active: true,
  })

  useEffect(() => {
    if (user?.company_id && params.id) {
      fetchProduct()
      fetchCategories()
    }
  }, [user?.company_id, params.id])

  const fetchProduct = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("internal_products")
        .select(`
          *,
          internal_product_categories (
            id,
            name,
            color
          )
        `)
        .eq("id", params.id)
        .eq("company_id", user?.company_id)
        .single()

      if (error) {
        console.error("Supabase error:", error)
        throw error
      }

      if (!data) {
        throw new Error("Producto no encontrado")
      }

      setProduct(data)
      setFormData({
        name: data.name || "",
        description: data.description || "",
        category_id: data.category_id ? data.category_id.toString() : "",
        unit_of_measure: data.unit_of_measure || "unidad",
        minimum_stock: data.minimum_stock || 0,
        cost_price: data.cost_price || 0,
        location: data.location || "",
        is_active: data.is_active ?? true,
      })
    } catch (error: any) {
      console.error("Error fetching product:", error)
      toast.error(error.message || "Error al cargar el producto")
      router.push("/warehouse/internal/products")
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("internal_product_categories")
        .select("*")
        .or(`company_id.eq.${user?.company_id},company_id.is.null`)
        .order("name")

      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error("Error fetching categories:", error)
      toast.error("Error al cargar las categorías")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast.error("El nombre del producto es obligatorio")
      return
    }

    if (!formData.category_id) {
      toast.error("Selecciona una categoría")
      return
    }

    if (!user?.id || !user?.company_id) {
      toast.error("Error de autenticación")
      return
    }

    try {
      setSaving(true)

      const updateData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        category_id: Number.parseInt(formData.category_id),
        unit_of_measure: formData.unit_of_measure,
        minimum_stock: formData.minimum_stock,
        cost_price: formData.cost_price,
        location: formData.location.trim() || null,
        is_active: formData.is_active,
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase
        .from("internal_products")
        .update(updateData)
        .eq("id", params.id)
        .eq("company_id", user.company_id)

      if (error) {
        console.error("Supabase error:", error)
        throw error
      }

      toast.success("Producto actualizado correctamente")
      router.push("/warehouse/internal/products")
    } catch (error: any) {
      console.error("Error updating product:", error)
      toast.error(error.message || "Error al actualizar el producto")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!user?.company_id) {
      toast.error("Error de autenticación")
      return
    }

    try {
      setDeleting(true)

      // Verificar si hay movimientos asociados
      const { data: movements } = await supabase
        .from("internal_inventory_movements")
        .select("id")
        .eq("product_id", params.id)
        .limit(1)

      if (movements && movements.length > 0) {
        toast.error("No se puede eliminar el producto porque tiene movimientos de inventario asociados")
        return
      }

      const { error } = await supabase
        .from("internal_products")
        .delete()
        .eq("id", params.id)
        .eq("company_id", user.company_id)

      if (error) {
        console.error("Supabase error:", error)
        throw error
      }

      toast.success("Producto eliminado correctamente")
      router.push("/warehouse/internal/products")
    } catch (error: any) {
      console.error("Error deleting product:", error)
      toast.error(error.message || "Error al eliminar el producto")
    } finally {
      setDeleting(false)
    }
  }

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Cargando producto...</p>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="text-center py-8">
        <h3 className="text-lg font-semibold">Producto no encontrado</h3>
        <p className="text-muted-foreground mb-4">El producto que buscas no existe o no tienes permisos para verlo</p>
        <Button asChild>
          <Link href="/warehouse/internal/products">Volver a Productos</Link>
        </Button>
      </div>
    )
  }

  const totalValue = product.current_stock * formData.cost_price

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/warehouse/internal/products">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Editar Producto Interno</h1>
          <p className="text-muted-foreground">Modifica la información del producto {product.code}</p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm">
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. Se eliminará permanentemente el producto "{product.name}" y todos sus
                datos asociados.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? "Eliminando..." : "Eliminar"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Information */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Información Básica</CardTitle>
                <CardDescription>Datos principales del producto interno</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="code">Código</Label>
                    <Input id="code" value={product.code} disabled className="font-mono bg-muted" />
                    <p className="text-xs text-muted-foreground">El código no se puede modificar</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      placeholder="Ej: Hojas Bond A4"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    placeholder="Descripción detallada del producto..."
                    rows={3}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="category">Categoría *</Label>
                    <Select
                      value={formData.category_id}
                      onValueChange={(value) => handleInputChange("category_id", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color }} />
                              {category.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unit">Unidad de Medida</Label>
                    <Select
                      value={formData.unit_of_measure}
                      onValueChange={(value) => handleInputChange("unit_of_measure", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {UNIT_OPTIONS.map((unit) => (
                          <SelectItem key={unit.value} value={unit.value}>
                            {unit.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Ubicación</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => handleInputChange("location", e.target.value)}
                    placeholder="Ej: Almacén Principal, Oficina Central"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Inventario y Costos</CardTitle>
                <CardDescription>Información de stock y precios</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="current_stock">Stock Actual</Label>
                    <Input
                      id="current_stock"
                      type="number"
                      value={product.current_stock}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">
                      Para modificar el stock, registra un movimiento de inventario
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="minimum_stock">Stock Mínimo</Label>
                    <Input
                      id="minimum_stock"
                      type="number"
                      min="0"
                      value={formData.minimum_stock}
                      onChange={(e) => handleInputChange("minimum_stock", Number.parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cost_price">Costo Unitario (S/)</Label>
                    <Input
                      id="cost_price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.cost_price}
                      onChange={(e) => handleInputChange("cost_price", Number.parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>

                {totalValue > 0 && (
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Valor Total del Inventario:</span>
                      <span className="text-lg font-bold">S/ {totalValue.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Estado</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="is_active">Producto Activo</Label>
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => handleInputChange("is_active", checked)}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Los productos inactivos no aparecerán en las listas principales
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Información del Producto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Código:</span>
                  <span className="font-mono">{product.code}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Categoría:</span>
                  <span>{product.internal_product_categories?.name || "Sin categoría"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Stock actual:</span>
                  <span className={product.current_stock <= product.minimum_stock ? "text-red-600 font-semibold" : ""}>
                    {product.current_stock}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Stock mínimo:</span>
                  <span>{formData.minimum_stock}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Valor total:</span>
                  <span className="font-semibold">S/ {totalValue.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button type="submit" disabled={saving} className="flex-1">
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Guardar Cambios
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
