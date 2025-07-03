"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { ArrowLeft, Save, Loader2, FileText } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import NextLink from "next/link"

interface Product {
  id: string
  name: string
  description: string | null
  code: string
  barcode: string | null
  modelo: string | null
  ficha_tecnica: string | null
  unit_of_measure: string
  minimum_stock: number
  current_stock: number
  cost_price: number
  sale_price: number
  location: string | null
  is_active: boolean
  brand_id: string | null
  category_id: string | null
}

interface Brand {
  id: string
  name: string
  color: string
}

interface Category {
  id: string
  name: string
  color: string
}

export default function EditProductPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()

  const [product, setProduct] = useState<Product | null>(null)
  const [brands, setBrands] = useState<Brand[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    code: "",
    barcode: "",
    modelo: "",
    ficha_tecnica: "",
    unit_of_measure: "unidad",
    minimum_stock: 0,
    current_stock: 0,
    cost_price: 0,
    sale_price: 0,
    location: "",
    is_active: true,
    brand_id: "",
    category_id: "",
  })

  useEffect(() => {
    const companyId = user?.role === "admin" ? user?.selectedCompanyId || user?.company_id : user?.company_id

    if (params.id && companyId) {
      fetchData()
    }
  }, [params.id, user?.company_id, user?.selectedCompanyId, user?.role])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Determinar el company_id correcto
      const companyId = user?.role === "admin" ? user?.selectedCompanyId || user?.company_id : user?.company_id

      if (!companyId) {
        setError("No se pudo determinar la empresa")
        return
      }

      // Obtener producto
      const { data: productData, error: productError } = await supabase
        .from("products")
        .select("*")
        .eq("id", params.id)
        .eq("company_id", companyId)
        .single()

      if (productError) {
        if (productError.code === "PGRST116") {
          setError("Producto no encontrado")
        } else {
          throw productError
        }
        return
      }

      // Obtener marcas
      const { data: brandsData, error: brandsError } = await supabase
        .from("brands")
        .select("id, name, color")
        .eq("company_id", companyId)
        .order("name")

      if (brandsError) throw brandsError

      // Obtener categorías
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("product_categories")
        .select("id, name, color")
        .eq("company_id", companyId)
        .order("name")

      if (categoriesError) throw categoriesError

      setProduct(productData)
      setBrands(brandsData || [])
      setCategories(categoriesData || [])

      // Llenar el formulario con los datos del producto
      setFormData({
        name: productData.name || "",
        description: productData.description || "",
        code: productData.code || "",
        barcode: productData.barcode || "",
        modelo: productData.modelo || "",
        ficha_tecnica: productData.ficha_tecnica || "",
        unit_of_measure: productData.unit_of_measure || "unidad",
        minimum_stock: productData.minimum_stock || 0,
        current_stock: productData.current_stock || 0,
        cost_price: productData.cost_price || 0,
        sale_price: productData.sale_price || 0,
        location: productData.location || "",
        is_active: productData.is_active ?? true,
        brand_id: productData.brand_id || "",
        category_id: productData.category_id || "",
      })
    } catch (error) {
      console.error("Error fetching data:", error)
      setError("Error al cargar los datos")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim() || !formData.code.trim()) {
      toast({
        title: "Error",
        description: "El nombre y código son obligatorios",
        variant: "destructive",
      })
      return
    }

    try {
      setSaving(true)

      // Determinar el company_id correcto
      const companyId = user?.role === "admin" ? user?.selectedCompanyId || user?.company_id : user?.company_id

      if (!companyId) {
        toast({
          title: "Error",
          description: "No se pudo determinar la empresa",
          variant: "destructive",
        })
        return
      }

      const updateData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        code: formData.code.trim(),
        barcode: formData.barcode.trim() || null,
        modelo: formData.modelo.trim() || null,
        ficha_tecnica: formData.ficha_tecnica.trim() || null,
        unit_of_measure: formData.unit_of_measure,
        minimum_stock: Number(formData.minimum_stock),
        current_stock: Number(formData.current_stock),
        cost_price: Number(formData.cost_price),
        sale_price: Number(formData.sale_price),
        location: formData.location.trim() || null,
        is_active: formData.is_active,
        brand_id: formData.brand_id || null,
        category_id: formData.category_id || null,
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase
        .from("products")
        .update(updateData)
        .eq("id", params.id)
        .eq("company_id", companyId)

      if (error) throw error

      toast({
        title: "Éxito",
        description: "Producto actualizado correctamente",
      })

      router.push(`/warehouse/products/${params.id}`)
    } catch (error) {
      console.error("Error updating product:", error)
      toast({
        title: "Error",
        description: "Error al actualizar el producto",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <NextLink href="/warehouse/products">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </NextLink>
          </Button>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">Cargando producto...</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <NextLink href="/warehouse/products">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </NextLink>
          </Button>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-muted-foreground">{error || "Producto no encontrado"}</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <NextLink href={`/warehouse/products/${params.id}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </NextLink>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Editar Producto</h1>
          <p className="text-muted-foreground">Modifica la información del producto</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Información básica */}
          <Card>
            <CardHeader>
              <CardTitle>Información Básica</CardTitle>
              <CardDescription>Datos principales del producto</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nombre del producto"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descripción del producto"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Código *</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="Código del producto"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="barcode">Código de barras</Label>
                  <Input
                    id="barcode"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    placeholder="Código de barras"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="modelo" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Modelo
                  </Label>
                  <Input
                    id="modelo"
                    value={formData.modelo}
                    onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                    placeholder="Modelo del producto"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ficha_tecnica" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Ficha Técnica (URL)
                  </Label>
                  <Input
                    id="ficha_tecnica"
                    type="url"
                    value={formData.ficha_tecnica}
                    onChange={(e) => setFormData({ ...formData, ficha_tecnica: e.target.value })}
                    placeholder="https://ejemplo.com/ficha-tecnica.pdf"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="unit_of_measure">Unidad de medida</Label>
                  <Select
                    value={formData.unit_of_measure}
                    onValueChange={(value) => setFormData({ ...formData, unit_of_measure: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unidad">Unidad</SelectItem>
                      <SelectItem value="kg">Kilogramo</SelectItem>
                      <SelectItem value="g">Gramo</SelectItem>
                      <SelectItem value="l">Litro</SelectItem>
                      <SelectItem value="ml">Mililitro</SelectItem>
                      <SelectItem value="m">Metro</SelectItem>
                      <SelectItem value="cm">Centímetro</SelectItem>
                      <SelectItem value="caja">Caja</SelectItem>
                      <SelectItem value="paquete">Paquete</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Ubicación</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Ubicación en almacén"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Producto activo</Label>
              </div>
            </CardContent>
          </Card>

          {/* Stock y precios */}
          <Card>
            <CardHeader>
              <CardTitle>Stock y Precios</CardTitle>
              <CardDescription>Información de inventario y precios</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="current_stock">Stock actual</Label>
                  <Input
                    id="current_stock"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.current_stock}
                    onChange={(e) =>
                      setFormData({ ...formData, current_stock: Number.parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="minimum_stock">Stock mínimo</Label>
                  <Input
                    id="minimum_stock"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.minimum_stock}
                    onChange={(e) =>
                      setFormData({ ...formData, minimum_stock: Number.parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cost_price">Precio de costo</Label>
                  <Input
                    id="cost_price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.cost_price}
                    onChange={(e) => setFormData({ ...formData, cost_price: Number.parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sale_price">Precio de venta</Label>
                  <Input
                    id="sale_price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.sale_price}
                    onChange={(e) => setFormData({ ...formData, sale_price: Number.parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              {formData.cost_price > 0 && formData.sale_price > 0 && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Margen de ganancia</p>
                  <p className="text-lg font-semibold">
                    {(((formData.sale_price - formData.cost_price) / formData.cost_price) * 100).toFixed(1)}%
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Categorización */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Categorización</CardTitle>
              <CardDescription>Marca y categoría del producto</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="brand_id">Marca</Label>
                  <Select
                    value={formData.brand_id}
                    onValueChange={(value) => setFormData({ ...formData, brand_id: value === "none" ? "" : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar marca" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin marca</SelectItem>
                      {brands.map((brand) => (
                        <SelectItem key={brand.id} value={brand.id}>
                          {brand.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category_id">Categoría</Label>
                  <Select
                    value={formData.category_id}
                    onValueChange={(value) => setFormData({ ...formData, category_id: value === "none" ? "" : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin categoría</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Botones de acción */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" asChild>
            <NextLink href={`/warehouse/products/${params.id}`}>Cancelar</NextLink>
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Guardar cambios
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
