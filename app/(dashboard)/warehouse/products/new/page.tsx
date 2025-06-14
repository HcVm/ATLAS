"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { ArrowLeft, Save, Package } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

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

interface ProductForm {
  name: string
  description: string
  code: string
  barcode: string
  brand_id: string
  category_id: string
  unit_of_measure: string
  minimum_stock: number
  current_stock: number
  cost_price: number
  sale_price: number
  location: string
  notes: string
  is_active: boolean
}

export default function NewProductPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [brands, setBrands] = useState<Brand[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState<ProductForm>({
    name: "",
    description: "",
    code: "",
    barcode: "",
    brand_id: "",
    category_id: "",
    unit_of_measure: "unidad",
    minimum_stock: 0,
    current_stock: 0,
    cost_price: 0,
    sale_price: 0,
    location: "",
    notes: "",
    is_active: true,
  })

  useEffect(() => {
    if (user?.company_id) {
      fetchData()
    }
  }, [user?.company_id])

  const fetchData = async () => {
    if (!user?.company_id) return

    try {
      setLoading(true)

      // Obtener marcas
      const { data: brandsData, error: brandsError } = await supabase
        .from("brands")
        .select("id, name, color")
        .eq("company_id", user.company_id)
        .order("name")

      if (brandsError) throw brandsError

      // Obtener categorías
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("product_categories")
        .select("id, name, color")
        .eq("company_id", user.company_id)
        .order("name")

      if (categoriesError) throw categoriesError

      setBrands(brandsData || [])
      setCategories(categoriesData || [])
    } catch (error) {
      console.error("Error fetching data:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos necesarios",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user?.company_id) {
      toast({
        title: "Error",
        description: "No se pudo identificar la empresa",
        variant: "destructive",
      })
      return
    }

    if (!form.name.trim() || !form.code.trim()) {
      toast({
        title: "Error",
        description: "El nombre y código del producto son obligatorios",
        variant: "destructive",
      })
      return
    }

    try {
      setSaving(true)

      // Preparar los datos para insertar
      const productData = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        code: form.code.trim(),
        barcode: form.barcode.trim() || null,
        brand_id: form.brand_id || null,
        category_id: form.category_id || null,
        unit_of_measure: form.unit_of_measure,
        minimum_stock: form.minimum_stock,
        current_stock: form.current_stock,
        cost_price: form.cost_price,
        sale_price: form.sale_price,
        location: form.location.trim() || null,
        notes: form.notes.trim() || null,
        is_active: form.is_active,
        company_id: user.company_id,
        created_by: user.id,
      }

      console.log("Inserting product data:", productData)

      const { data, error } = await supabase.from("products").insert(productData).select().single()

      if (error) {
        console.error("Supabase error:", error)
        if (error.code === "23505") {
          toast({
            title: "Error",
            description: "Ya existe un producto con ese código",
            variant: "destructive",
          })
          return
        }
        throw error
      }

      toast({
        title: "Éxito",
        description: "Producto creado correctamente",
      })

      router.push("/warehouse/products")
    } catch (error) {
      console.error("Error creating product:", error)
      toast({
        title: "Error",
        description: "No se pudo crear el producto. Verifica que todos los campos estén correctos.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const updateForm = (field: keyof ProductForm, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" disabled>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Nuevo Producto</h1>
            <p className="text-muted-foreground">Cargando...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/warehouse/products">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nuevo Producto</h1>
          <p className="text-muted-foreground">Crear un nuevo producto en el inventario</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {/* Información básica */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Información Básica
                </CardTitle>
                <CardDescription>Datos principales del producto</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre del Producto *</Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(e) => updateForm("name", e.target.value)}
                      placeholder="Ej: Proteína Whey Chocolate"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="code">Código del Producto *</Label>
                    <Input
                      id="code"
                      value={form.code}
                      onChange={(e) => updateForm("code", e.target.value.toUpperCase())}
                      placeholder="Ej: PWC001"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={form.description}
                    onChange={(e) => updateForm("description", e.target.value)}
                    placeholder="Descripción detallada del producto..."
                    rows={3}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="barcode">Código de Barras</Label>
                    <Input
                      id="barcode"
                      value={form.barcode}
                      onChange={(e) => updateForm("barcode", e.target.value)}
                      placeholder="Código de barras del producto"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Ubicación</Label>
                    <Input
                      id="location"
                      value={form.location}
                      onChange={(e) => updateForm("location", e.target.value)}
                      placeholder="Ej: Estante A-1, Almacén Principal"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Clasificación */}
            <Card>
              <CardHeader>
                <CardTitle>Clasificación</CardTitle>
                <CardDescription>Marca y categoría del producto</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="brand">Marca</Label>
                    <Select
                      value={form.brand_id}
                      onValueChange={(value) => updateForm("brand_id", value === "none" ? "" : value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar marca" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin marca</SelectItem>
                        {brands.map((brand) => (
                          <SelectItem key={brand.id} value={brand.id}>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: brand.color }} />
                              {brand.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Categoría</Label>
                    <Select
                      value={form.category_id}
                      onValueChange={(value) => updateForm("category_id", value === "none" ? "" : value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin categoría</SelectItem>
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
                </div>
              </CardContent>
            </Card>

            {/* Inventario */}
            <Card>
              <CardHeader>
                <CardTitle>Inventario</CardTitle>
                <CardDescription>Información de stock y unidades</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="unit_of_measure">Unidad de Medida</Label>
                    <Select
                      value={form.unit_of_measure}
                      onValueChange={(value) => updateForm("unit_of_measure", value)}
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
                        <SelectItem value="caja">Caja</SelectItem>
                        <SelectItem value="paquete">Paquete</SelectItem>
                        <SelectItem value="botella">Botella</SelectItem>
                        <SelectItem value="frasco">Frasco</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="current_stock">Stock Actual</Label>
                    <Input
                      id="current_stock"
                      type="number"
                      min="0"
                      value={form.current_stock}
                      onChange={(e) => updateForm("current_stock", Number.parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="minimum_stock">Stock Mínimo</Label>
                    <Input
                      id="minimum_stock"
                      type="number"
                      min="0"
                      value={form.minimum_stock}
                      onChange={(e) => updateForm("minimum_stock", Number.parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Precios */}
            <Card>
              <CardHeader>
                <CardTitle>Precios</CardTitle>
                <CardDescription>Costos y precios de venta</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="cost_price">Costo Unitario (S/)</Label>
                    <Input
                      id="cost_price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.cost_price}
                      onChange={(e) => updateForm("cost_price", Number.parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sale_price">Precio de Venta (S/)</Label>
                    <Input
                      id="sale_price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.sale_price}
                      onChange={(e) => updateForm("sale_price", Number.parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Panel lateral */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Estado</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={form.is_active}
                    onCheckedChange={(checked) => updateForm("is_active", checked)}
                  />
                  <Label htmlFor="is_active">Producto activo</Label>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Los productos inactivos no aparecerán en las listas principales
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Notas</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={form.notes}
                  onChange={(e) => updateForm("notes", e.target.value)}
                  placeholder="Notas adicionales sobre el producto..."
                  rows={4}
                />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <Button type="submit" className="w-full" disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Guardando..." : "Crear Producto"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  )
}
