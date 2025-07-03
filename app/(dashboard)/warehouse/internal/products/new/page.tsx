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
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

interface Category {
  id: number
  name: string
  color: string
}

interface FormData {
  name: string
  description: string
  category_id: string
  unit_of_measure: string
  current_stock: number
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

export default function NewInternalProductPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [generatedCode, setGeneratedCode] = useState("")
  const [formData, setFormData] = useState<FormData>({
    name: "",
    description: "",
    category_id: "",
    unit_of_measure: "unidad",
    current_stock: 0,
    minimum_stock: 0,
    cost_price: 0,
    location: "",
    is_active: true,
  })

  useEffect(() => {
    if (user?.company_id) {
      fetchCategories()
      generateCode()
    }
  }, [user?.company_id])

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

  const generateCode = async () => {
    try {
      // Intentar usar la función de la base de datos
      const { data, error } = await supabase.rpc("generate_internal_product_code")
      if (error) {
        console.warn("Function not found, generating code manually:", error)
        // Si la función no existe, generar código manualmente
        await generateCodeManually()
        return
      }
      setGeneratedCode(data)
    } catch (error) {
      console.error("Error generating code:", error)
      await generateCodeManually()
    }
  }

  const generateCodeManually = async () => {
    try {
      // Obtener el último código usado
      const { data, error } = await supabase
        .from("internal_products")
        .select("code")
        .like("code", "INT-%")
        .order("code", { ascending: false })
        .limit(1)

      if (error) throw error

      let nextNumber = 1
      if (data && data.length > 0) {
        const lastCode = data[0].code
        const match = lastCode.match(/INT-(\d+)/)
        if (match) {
          nextNumber = Number.parseInt(match[1]) + 1
        }
      }

      const newCode = `INT-${nextNumber.toString().padStart(3, "0")}`
      setGeneratedCode(newCode)
    } catch (error) {
      console.error("Error generating code manually:", error)
      setGeneratedCode("INT-001")
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
      setLoading(true)

      // Verificar que el código no esté duplicado
      const { data: existingProduct } = await supabase
        .from("internal_products")
        .select("id")
        .eq("code", generatedCode)
        .maybeSingle()

      if (existingProduct) {
        // Si el código ya existe, generar uno nuevo
        await generateCode()
        toast.error("El código ya existe, se ha generado uno nuevo. Intenta de nuevo.")
        setLoading(false)
        return
      }

      const productData = {
        code: generatedCode,
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        category_id: Number.parseInt(formData.category_id),
        unit_of_measure: formData.unit_of_measure,
        current_stock: formData.current_stock,
        minimum_stock: formData.minimum_stock,
        cost_price: formData.cost_price,
        location: formData.location.trim() || null,
        is_active: formData.is_active,
        company_id: user.company_id,
        created_by: user.id,
      }

      const { data, error } = await supabase.from("internal_products").insert([productData]).select().single()

      if (error) {
        console.error("Supabase error:", error)
        throw error
      }

      // Si hay stock inicial, crear movimiento de entrada
      if (formData.current_stock > 0) {
        const movementData = {
          product_id: data.id,
          movement_type: "entrada",
          quantity: formData.current_stock,
          unit_cost: formData.cost_price,
          total_cost: formData.current_stock * formData.cost_price,
          reason: "Stock inicial",
          requested_by: user.email || "Sistema",
          company_id: user.company_id,
          created_by: user.id,
        }

        const { error: movementError } = await supabase.from("internal_inventory_movements").insert([movementData])

        if (movementError) {
          console.error("Error creating initial movement:", movementError)
        }
      }

      toast.success("Producto interno creado correctamente")
      router.push("/warehouse/internal/products")
    } catch (error: any) {
      console.error("Error creating product:", error)
      toast.error(error.message || "Error al crear el producto")
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const totalValue = formData.current_stock * formData.cost_price

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/warehouse/internal/products">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nuevo Producto Interno</h1>
          <p className="text-muted-foreground">Agrega un nuevo producto de uso interno</p>
        </div>
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
                    <Input id="code" value={generatedCode} disabled className="font-mono bg-muted" />
                    <p className="text-xs text-muted-foreground">Código generado automáticamente</p>
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
                    <Label htmlFor="current_stock">Stock Inicial</Label>
                    <Input
                      id="current_stock"
                      type="number"
                      min="0"
                      value={formData.current_stock}
                      onChange={(e) => handleInputChange("current_stock", Number.parseInt(e.target.value) || 0)}
                    />
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
                <CardTitle>Resumen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Código:</span>
                  <span className="font-mono">{generatedCode}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Unidad:</span>
                  <span>{UNIT_OPTIONS.find((u) => u.value === formData.unit_of_measure)?.label}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Stock inicial:</span>
                  <span>{formData.current_stock}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Valor total:</span>
                  <span className="font-semibold">S/ {totalValue.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? (
                  <>
                    <Package className="h-4 w-4 mr-2 animate-spin" />
                    Creando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Crear Producto
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
