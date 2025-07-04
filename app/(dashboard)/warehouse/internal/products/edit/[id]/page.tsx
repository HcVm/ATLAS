"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ArrowLeft, Save, Trash2, Package, AlertTriangle, Activity } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { useCompany } from "@/lib/company-context"

interface Category {
  id: string
  name: string
}

interface Product {
  id: string
  name: string
  description: string | null
  category_id: string
  unit_of_measure: string
  cost_price: number
  sale_price: number
  minimum_stock: number
  current_stock: number
  location: string | null
  supplier: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export default function EditInternalProductPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useAuth()
  const { selectedCompany } = useCompany()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [product, setProduct] = useState<Product | null>(null)
  const [movementCount, setMovementCount] = useState(0)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteError, setDeleteError] = useState<{
    type: string
    message: string
    movementCount?: number
  } | null>(null)

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category_id: "",
    unit_of_measure: "",
    cost_price: "",
    sale_price: "",
    minimum_stock: "",
    current_stock: "",
    location: "",
    supplier: "",
    notes: "",
    is_active: true,
  })

  useEffect(() => {
    const companyId = user?.role === "admin" ? selectedCompany?.id : user?.company_id
    if (companyId) {
      fetchData()
    }
  }, [user, selectedCompany, params.id])

  const fetchData = async () => {
    try {
      setLoading(true)
      const companyId = user?.role === "admin" ? selectedCompany?.id : user?.company_id

      if (!companyId) {
        toast({
          title: "Error",
          description: "No hay empresa seleccionada",
          variant: "destructive",
        })
        return
      }

      // Obtener categorías
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("internal_product_categories")
        .select("id, name")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("name")

      if (categoriesError) {
        console.error("Error fetching categories:", categoriesError)
        throw categoriesError
      }

      // Obtener producto
      const response = await fetch(`/api/internal-products/${params.id}`)
      if (!response.ok) {
        throw new Error("Producto no encontrado")
      }

      const productData = await response.json()

      // Verificar que el producto pertenece a la empresa correcta
      if (productData.company_id !== companyId) {
        throw new Error("No tienes permisos para editar este producto")
      }

      // Obtener conteo de movimientos
      const { count: movementsCount, error: movementsError } = await supabase
        .from("internal_inventory_movements")
        .select("*", { count: "exact", head: true })
        .eq("product_id", params.id)

      if (movementsError) {
        console.error("Error counting movements:", movementsError)
      }

      setCategories(categoriesData || [])
      setProduct(productData)
      setMovementCount(movementsCount || 0)
      setFormData({
        name: productData.name || "",
        description: productData.description || "",
        category_id: productData.category_id || "",
        unit_of_measure: productData.unit_of_measure || "",
        cost_price: productData.cost_price?.toString() || "",
        sale_price: productData.sale_price?.toString() || "",
        minimum_stock: productData.minimum_stock?.toString() || "",
        current_stock: productData.current_stock?.toString() || "",
        location: productData.location || "",
        supplier: productData.supplier || "",
        notes: productData.notes || "",
        is_active: productData.is_active ?? true,
      })
    } catch (error: any) {
      console.error("Error fetching data:", error)
      toast({
        title: "Error",
        description: error.message || "Error al cargar los datos",
        variant: "destructive",
      })
      router.push("/warehouse/internal/products")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      // Validaciones
      if (!formData.name.trim()) {
        throw new Error("El nombre es requerido")
      }

      if (!formData.category_id) {
        throw new Error("La categoría es requerida")
      }

      if (!formData.unit_of_measure.trim()) {
        throw new Error("La unidad de medida es requerida")
      }

      const costPrice = Number.parseFloat(formData.cost_price)
      const salePrice = Number.parseFloat(formData.sale_price)
      const minStock = Number.parseInt(formData.minimum_stock)
      const currStock = Number.parseInt(formData.current_stock)

      if (isNaN(costPrice) || costPrice < 0) {
        throw new Error("El precio de costo debe ser un número válido")
      }

      if (isNaN(salePrice) || salePrice < 0) {
        throw new Error("El precio de venta debe ser un número válido")
      }

      if (isNaN(minStock) || minStock < 0) {
        throw new Error("El stock mínimo debe ser un número válido")
      }

      if (isNaN(currStock) || currStock < 0) {
        throw new Error("El stock actual debe ser un número válido")
      }

      const response = await fetch(`/api/internal-products/${params.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al actualizar el producto")
      }

      toast({
        title: "Producto actualizado",
        description: "El producto se ha actualizado correctamente",
      })

      router.push("/warehouse/internal/products")
    } catch (error: any) {
      console.error("Error updating product:", error)
      toast({
        title: "Error",
        description: error.message || "Error al actualizar el producto",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (cascade = false) => {
    setDeleting(true)
    setDeleteError(null)

    try {
      const url = cascade ? `/api/internal-products/${params.id}?cascade=true` : `/api/internal-products/${params.id}`
      const response = await fetch(url, {
        method: "DELETE",
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.error === "PRODUCT_HAS_MOVEMENTS") {
          setDeleteError({
            type: "PRODUCT_HAS_MOVEMENTS",
            message: data.message,
            movementCount: data.movementCount,
          })
          setDeleting(false)
          return
        }
        throw new Error(data.error || "Error al eliminar el producto")
      }

      toast({
        title: "Producto eliminado",
        description: data.message,
      })

      setShowDeleteDialog(false)
      router.push("/warehouse/internal/products")
    } catch (error: any) {
      console.error("Error deleting product:", error)
      toast({
        title: "Error",
        description: error.message || "Error al eliminar el producto",
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
    }
  }

  const getStockStatus = () => {
    if (!product) return null

    if (product.current_stock === 0) {
      return <Badge variant="destructive">Sin stock</Badge>
    }

    if (product.current_stock <= product.minimum_stock) {
      return <Badge variant="secondary">Stock bajo</Badge>
    }

    return <Badge variant="default">Stock normal</Badge>
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="h-8 w-8 bg-muted animate-pulse rounded" />
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        </div>
        <div className="space-y-6">
          <div className="h-32 bg-muted animate-pulse rounded" />
          <div className="h-96 bg-muted animate-pulse rounded" />
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Producto no encontrado</h1>
          <Button onClick={() => router.push("/warehouse/internal/products")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a productos
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push("/warehouse/internal/products")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Editar Producto Interno</h1>
            <p className="text-muted-foreground">Modificar información del producto</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getStockStatus()}
          <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)}>
            <Trash2 className="h-4 w-4 mr-2" />
            Eliminar
          </Button>
        </div>
      </div>

      {/* Product Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Package className="h-5 w-5" />
              <div>
                <CardTitle>{product.name}</CardTitle>
                <CardDescription>
                  Creado el {new Date(product.created_at).toLocaleDateString("es-PE")}
                  {movementCount > 0 && (
                    <span className="ml-2 inline-flex items-center gap-1">
                      <Activity className="h-3 w-3" />
                      {movementCount} movimiento(s)
                    </span>
                  )}
                </CardDescription>
              </div>
            </div>
            <Badge variant={product.is_active ? "default" : "secondary"}>
              {product.is_active ? "Activo" : "Inactivo"}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Edit Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Información Básica</CardTitle>
            <CardDescription>Datos principales del producto</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre del Producto *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Nombre del producto"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category_id">Categoría *</Label>
                <Select
                  value={formData.category_id}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, category_id: value }))}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit_of_measure">Unidad de Medida *</Label>
                <Input
                  id="unit_of_measure"
                  value={formData.unit_of_measure}
                  onChange={(e) => setFormData((prev) => ({ ...prev, unit_of_measure: e.target.value }))}
                  placeholder="Ej: unidad, kg, litro"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Ubicación</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                  placeholder="Ubicación en almacén"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Descripción del producto"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Precios y Stock</CardTitle>
            <CardDescription>Información financiera y de inventario</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cost_price">Precio de Costo *</Label>
                <Input
                  id="cost_price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.cost_price}
                  onChange={(e) => setFormData((prev) => ({ ...prev, cost_price: e.target.value }))}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sale_price">Precio de Venta *</Label>
                <Input
                  id="sale_price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.sale_price}
                  onChange={(e) => setFormData((prev) => ({ ...prev, sale_price: e.target.value }))}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="minimum_stock">Stock Mínimo *</Label>
                <Input
                  id="minimum_stock"
                  type="number"
                  min="0"
                  value={formData.minimum_stock}
                  onChange={(e) => setFormData((prev) => ({ ...prev, minimum_stock: e.target.value }))}
                  placeholder="0"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="current_stock">Stock Actual *</Label>
                <Input
                  id="current_stock"
                  type="number"
                  min="0"
                  value={formData.current_stock}
                  onChange={(e) => setFormData((prev) => ({ ...prev, current_stock: e.target.value }))}
                  placeholder="0"
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Información Adicional</CardTitle>
            <CardDescription>Datos complementarios del producto</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="supplier">Proveedor</Label>
              <Input
                id="supplier"
                value={formData.supplier}
                onChange={(e) => setFormData((prev) => ({ ...prev, supplier: e.target.value }))}
                placeholder="Nombre del proveedor"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Notas adicionales"
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_active: checked }))}
              />
              <Label htmlFor="is_active">Producto activo</Label>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={() => router.push("/warehouse/internal/products")}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </div>
      </form>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirmar Eliminación
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteError?.type === "PRODUCT_HAS_MOVEMENTS" ? (
                <div className="space-y-3">
                  <p className="text-destructive font-medium">{deleteError.message}</p>
                  <div className="bg-muted p-3 rounded-md">
                    <p className="text-sm">
                      <strong>Opciones disponibles:</strong>
                    </p>
                    <ul className="text-sm mt-2 space-y-1">
                      <li>
                        • <strong>Cancelar:</strong> No eliminar nada
                      </li>
                      <li>
                        • <strong>Eliminar todo:</strong> Eliminar el producto y TODOS sus {deleteError.movementCount}{" "}
                        movimiento(s)
                      </li>
                    </ul>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    ⚠️ Esta acción no se puede deshacer. Se eliminarán todos los archivos adjuntos y registros de
                    movimientos.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p>¿Estás seguro de que deseas eliminar el producto "{product?.name}"?</p>
                  {movementCount > 0 && (
                    <p className="text-sm text-muted-foreground">
                      Este producto tiene {movementCount} movimiento(s) asociado(s).
                    </p>
                  )}
                  <p className="text-sm text-destructive">Esta acción no se puede deshacer.</p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setDeleteError(null)
                setShowDeleteDialog(false)
              }}
            >
              Cancelar
            </AlertDialogCancel>
            {deleteError?.type === "PRODUCT_HAS_MOVEMENTS" ? (
              <AlertDialogAction
                onClick={() => handleDelete(true)}
                disabled={deleting}
                className="bg-destructive hover:bg-destructive/90"
              >
                {deleting ? "Eliminando..." : "Eliminar Todo"}
              </AlertDialogAction>
            ) : (
              <AlertDialogAction
                onClick={() => handleDelete(false)}
                disabled={deleting}
                className="bg-destructive hover:bg-destructive/90"
              >
                {deleting ? "Eliminando..." : "Eliminar"}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
