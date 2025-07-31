"use client"

import Link from "next/link"

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
import { ArrowLeft, Save, Package, FileText } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { toast } from "sonner"
import ProductImageUpload from "@/components/warehouse/product-image-upload"
import { BrandCreatorDialog } from "@/components/ui/brand-creator-dialog"

interface Brand {
  id: string
  name: string
  color: string
  isExternal?: boolean
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
  modelo: string
  ficha_tecnica: string
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
  image_url: string | null
}

export default function NewProductPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [brands, setBrands] = useState<Brand[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState<ProductForm>({
    name: "",
    description: "",
    code: "",
    barcode: "",
    modelo: "",
    ficha_tecnica: "",
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
    image_url: null,
  })

  useEffect(() => {
    if (user?.company_id) {
      console.log("User company_id:", user.company_id)
      fetchData()
    } else {
      console.log("No company_id found, user:", user)
    }
  }, [user])

  const fetchData = async () => {
    if (!user?.company_id) {
      console.log("No company_id available")
      toast.error("No se pudo identificar la empresa")
      return
    }

    try {
      setLoading(true)
      console.log("Fetching data for company:", user.company_id)

      // Obtener marcas propias de la empresa
      const { data: companyBrands, error: companyBrandsError } = await supabase
        .from("brands")
        .select("id, name, color")
        .eq("company_id", user.company_id)
        .order("name")

      console.log("Company brands query result:", { companyBrands, companyBrandsError })

      if (companyBrandsError) {
        console.error("Company brands error:", companyBrandsError)
        toast.error("Error al cargar las marcas de la empresa")
        throw companyBrandsError
      }

      // Obtener marcas externas (company_id NULL)
      const { data: externalBrands, error: externalBrandsError } = await supabase
        .from("brands")
        .select("id, name, color")
        .is("company_id", null)
        .order("name")

      console.log("External brands query result:", { externalBrands, externalBrandsError })

      if (externalBrandsError) {
        console.error("External brands error:", externalBrandsError)
        toast.error("Error al cargar las marcas externas")
        throw externalBrandsError
      }

      // Combinar marcas: primero las de la empresa, luego las externas
      const allBrands = [
        ...(companyBrands || []).map((brand) => ({ ...brand, isExternal: false })),
        ...(externalBrands || []).map((brand) => ({ ...brand, isExternal: true })),
      ]

      // Obtener categorías (solo de la empresa)
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("product_categories")
        .select("id, name, color")
        .eq("company_id", user.company_id)
        .order("name")

      console.log("Categories query result:", { categoriesData, categoriesError })

      if (categoriesError) {
        console.error("Categories error:", categoriesError)
        toast.error("Error al cargar las categorías")
        throw categoriesError
      }

      setBrands(allBrands)
      setCategories(categoriesData || [])
      console.log("Set brands:", allBrands.length, "categories:", categoriesData?.length || 0)

      if (allBrands.length === 0) {
        toast.warning("No hay marcas disponibles. Puedes crear una nueva marca.")
      }

      if (categoriesData?.length === 0) {
        toast.warning("No hay categorías disponibles. Considera crear categorías para organizar mejor tus productos.")
      }
    } catch (error) {
      console.error("Error fetching data:", error)
      toast.error("No se pudieron cargar los datos necesarios")
    } finally {
      setLoading(false)
    }
  }

  const handleBrandCreated = (newBrand: Brand) => {
    // Agregar la nueva marca a la lista
    setBrands((prev) => {
      if (newBrand.isExternal) {
        // Agregar marca externa al final
        return [...prev, newBrand]
      } else {
        // Agregar marca de empresa al principio (después de las otras marcas de empresa)
        const companyBrands = prev.filter((b) => !b.isExternal)
        const externalBrands = prev.filter((b) => b.isExternal)
        return [...companyBrands, newBrand, ...externalBrands]
      }
    })

    // Seleccionar automáticamente la nueva marca
    setForm((prev) => ({ ...prev, brand_id: newBrand.id }))
    toast.success(`Marca "${newBrand.name}" creada y seleccionada`)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user?.company_id) {
      toast.error("No se pudo identificar la empresa")
      return
    }

    if (!form.name.trim()) {
      toast.error("El nombre del producto es obligatorio")
      return
    }

    if (!form.code.trim()) {
      toast.error("El código del producto es obligatorio")
      return
    }

    // Validar que el precio de venta sea mayor al costo
    if (form.cost_price > 0 && form.sale_price > 0 && form.sale_price <= form.cost_price) {
      toast.error("El precio de venta debe ser mayor al precio de costo")
      return
    }

    // Validar stock mínimo
    if (form.minimum_stock < 0) {
      toast.error("El stock mínimo no puede ser negativo")
      return
    }

    // Validar stock actual
    if (form.current_stock < 0) {
      toast.error("El stock actual no puede ser negativo")
      return
    }

    // Validar URL de ficha técnica si se proporciona
    if (form.ficha_tecnica.trim() && !isValidUrl(form.ficha_tecnica.trim())) {
      toast.error("La URL de la ficha técnica no es válida")
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
        modelo: form.modelo.trim() || null,
        ficha_tecnica: form.ficha_tecnica.trim() || null,
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
        image_url: form.image_url,
        company_id: user.company_id,
        created_by: user.id,
      }

      console.log("Inserting product data:", productData)

      const { data, error } = await supabase.from("products").insert(productData).select().single()

      console.log("Supabase response:", { data, error })

      if (error) {
        console.error("Supabase error:", error)
        console.error("Error details:", JSON.stringify(error, null, 2))

        // Manejar errores específicos de la base de datos
        if (error.code === "23505") {
          console.log("Detected duplicate key error")
          if (error.message?.includes("products_code_company_id_key")) {
            toast.error(`Ya existe un producto con el código "${form.code}" en tu empresa`)
            return
          } else if (error.message?.includes("products_barcode_company_id_key")) {
            toast.error(`Ya existe un producto con el código de barras "${form.barcode}" en tu empresa`)
            return
          } else {
            toast.error("Ya existe un producto con esos datos")
            return
          }
        }

        if (error.code === "23503") {
          if (error.message?.includes("brand_id")) {
            toast.error("La marca seleccionada no es válida")
          } else if (error.message?.includes("category_id")) {
            toast.error("La categoría seleccionada no es válida")
          } else if (error.message?.includes("company_id")) {
            toast.error("Error de empresa. Contacta al administrador")
          } else {
            toast.error("Error de referencia en los datos")
          }
          return
        }

        if (error.code === "23514") {
          toast.error("Los valores numéricos deben ser positivos")
          return
        }

        if (error.code === "42501") {
          toast.error("No tienes permisos para crear productos")
          return
        }

        if (error.code === "PGRST116") {
          toast.error("No se encontró la tabla de productos. Contacta al administrador")
          return
        }

        // Si el error no tiene código específico, verificar el mensaje
        if (
          error.message?.toLowerCase().includes("duplicate") ||
          error.message?.toLowerCase().includes("already exists") ||
          error.message?.toLowerCase().includes("unique constraint")
        ) {
          toast.error("Ya existe un producto con esos datos")
          return
        }

        if (error.message?.toLowerCase().includes("permission") || error.message?.toLowerCase().includes("access")) {
          toast.error("No tienes permisos para crear productos")
          return
        }

        // Error genérico
        toast.error(`Error al crear el producto: ${error.message || "Error desconocido"}`)
        return
      }

      if (!data) {
        toast.error("No se pudo crear el producto. Inténtalo de nuevo.")
        return
      }

      console.log("Product created successfully:", data)

      if (form.current_stock > 0) {
        toast.success(
          `Producto "${form.name}" creado correctamente con stock inicial de ${form.current_stock} ${form.unit_of_measure}`,
        )
      } else {
        toast.success(`Producto "${form.name}" creado correctamente`)
      }

      router.push("/warehouse/products")
    } catch (error: any) {
      console.error("Error creating product:", error)

      // Manejar errores de red
      if (error.name === "NetworkError" || error.message?.includes("fetch")) {
        toast.error("Error de conexión. Verifica tu internet e inténtalo de nuevo.")
        return
      }

      // Error genérico
      toast.error("No se pudo crear el producto. Verifica que todos los campos estén correctos.")
    } finally {
      setSaving(false)
    }
  }

  const updateForm = (field: keyof ProductForm, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  // Función para validar URL
  const isValidUrl = (string: string) => {
    try {
      new URL(string)
      return true
    } catch (_) {
      return false
    }
  }

  // Función para validar código en tiempo real
  const validateCode = async (code: string) => {
    if (!code.trim() || !user?.company_id) return

    try {
      const { data, error } = await supabase
        .from("products")
        .select("id")
        .eq("code", code.trim())
        .eq("company_id", user.company_id)
        .single()

      if (data) {
        toast.error("Este código ya está en uso")
      }
    } catch (error) {
      // Ignorar errores de "no encontrado" ya que eso significa que el código está disponible
    }
  }

  // Función para validar código de barras en tiempo real
  const validateBarcode = async (barcode: string) => {
    if (!barcode.trim() || !user?.company_id) return

    try {
      const { data, error } = await supabase
        .from("products")
        .select("id")
        .eq("barcode", barcode.trim())
        .eq("company_id", user.company_id)
        .single()

      if (data) {
        toast.error("Este código de barras ya está en uso")
      }
    } catch (error) {
      // Ignorar errores de "no encontrado"
    }
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
            <p className="text-muted-foreground">Cargando datos necesarios...</p>
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
                      placeholder="Ej: Silla Giratoria"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="code">Código del Producto *</Label>
                    <Input
                      id="code"
                      value={form.code}
                      onChange={(e) => {
                        const newCode = e.target.value.toUpperCase()
                        updateForm("code", newCode)
                        // Validar después de 1 segundo de inactividad
                        setTimeout(() => validateCode(newCode), 1000)
                      }}
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
                    <Label htmlFor="modelo" className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Modelo
                    </Label>
                    <Input
                      id="modelo"
                      value={form.modelo}
                      onChange={(e) => updateForm("modelo", e.target.value)}
                      placeholder="Ej: PWC-2024-V1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ficha_tecnica" className="flex items-center gap-2">
                      Ficha Técnica (URL)
                    </Label>
                    <Input
                      id="ficha_tecnica"
                      type="url"
                      value={form.ficha_tecnica}
                      onChange={(e) => updateForm("ficha_tecnica", e.target.value)}
                      placeholder="https://ejemplo.com/ficha-tecnica.pdf"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="barcode">Código de Barras</Label>
                    <Input
                      id="barcode"
                      value={form.barcode}
                      onChange={(e) => {
                        const newBarcode = e.target.value
                        updateForm("barcode", newBarcode)
                        // Validar después de 1 segundo de inactividad
                        setTimeout(() => validateBarcode(newBarcode), 1000)
                      }}
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
                    <div className="space-y-2">
                      <Select
                        value={form.brand_id}
                        onValueChange={(value) => updateForm("brand_id", value === "none" ? "" : value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar marca" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sin marca</SelectItem>

                          {/* Marcas de la empresa */}
                          {brands.filter((brand) => !brand.isExternal).length > 0 && (
                            <>
                              <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                                Marcas de la empresa
                              </div>
                              {brands
                                .filter((brand) => !brand.isExternal)
                                .map((brand) => (
                                  <SelectItem key={brand.id} value={brand.id}>
                                    <div className="flex items-center gap-2">
                                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: brand.color }} />
                                      {brand.name}
                                    </div>
                                  </SelectItem>
                                ))}
                            </>
                          )}

                          {/* Marcas externas */}
                          {brands.filter((brand) => brand.isExternal).length > 0 && (
                            <>
                              <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground border-t mt-1 pt-2">
                                Marcas externas
                              </div>
                              {brands
                                .filter((brand) => brand.isExternal)
                                .map((brand) => (
                                  <SelectItem key={brand.id} value={brand.id}>
                                    <div className="flex items-center gap-2">
                                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: brand.color }} />
                                      {brand.name}
                                      <span className="text-xs text-muted-foreground ml-auto">Externa</span>
                                    </div>
                                  </SelectItem>
                                ))}
                            </>
                          )}

                          {brands.length === 0 && !loading && (
                            <div className="px-2 py-1.5 text-sm text-muted-foreground">No hay marcas disponibles</div>
                          )}
                        </SelectContent>
                      </Select>

                      {/* Botón para crear nueva marca */}
                      <BrandCreatorDialog onBrandCreated={handleBrandCreated} />
                    </div>

                    {brands.length === 0 && !loading && (
                      <p className="text-sm text-muted-foreground">
                        No hay marcas disponibles. Crea una nueva marca usando el botón de arriba.
                      </p>
                    )}
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
            {/* Imagen del producto */}
            <ProductImageUpload
              currentImageUrl={form.image_url}
              onImageChange={(imageUrl) => updateForm("image_url", imageUrl)}
              productCode={form.code || "TEMP"}
            />

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
