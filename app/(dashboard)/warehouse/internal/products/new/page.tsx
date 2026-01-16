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
import { ChevronLeft, Save, Package, ListChecks, Boxes, AlertCircle, Barcode, Box } from "lucide-react"
import Link from "next/link"
import { useCompany } from "@/lib/company-context"
import { InternalCategoryCreatorDialog } from "@/components/ui/internal-category-creator-dialog"
import { motion } from "framer-motion"

interface Category {
  id: string
  name: string
  color: string
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.4 }
  }
}

export default function NewInternalProductPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { selectedCompany, allCompanies } = useCompany() // added allCompanies from context
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
    is_serialized: true,
  })

  useEffect(() => {
    const companyId = user?.role === "admin" ? selectedCompany?.id : user?.company_id

    if (companyId) {
      const activeCompany = allCompanies.find((c) => c.id === companyId)
      if (activeCompany?.code && !formData.location) {
        setFormData((prev) => ({
          ...prev,
          location: `Almacén Interno ${activeCompany.code.toUpperCase()}`,
        }))
      }

      fetchCategories(companyId)
      setGeneratedCodeDisplay("Generando...")
    } else {
      setGeneratedCodeDisplay("Selecciona una empresa para generar el código.")
      setLoading(false)
    }
  }, [user, selectedCompany, allCompanies])

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
        is_serialized: formData.is_serialized, // Explicitly include this
        minimum_stock: parsedMinimumStock,
        current_stock: 0,
        company_id: companyId,
        created_by: user.id,
      }

      console.log("[v0] Creating product with payload:", payload)

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
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-8 p-4 sm:p-6 lg:p-8 min-h-[calc(100vh-4rem)]"
    >
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <Button variant="outline" asChild className="border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl">
          <Link href="/warehouse/internal/products">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Volver a Productos
          </Link>
        </Button>
        <div />
      </motion.div>

      <motion.div variants={itemVariants}>
        <div className="flex flex-col gap-2 mb-8">
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-slate-900 via-slate-700 to-slate-600 dark:from-white dark:via-slate-200 dark:to-slate-400 bg-clip-text text-transparent flex items-center gap-3">
             <Package className="h-8 w-8 text-indigo-500" />
             Nuevo Producto Interno
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Crea un nuevo producto para gestión interna. El stock se agregará mediante movimientos de entrada.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Main Info */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="border-none shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-md overflow-hidden">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
                  <CardTitle className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <Box className="h-5 w-5 text-indigo-500" />
                    Información Principal
                  </CardTitle>
                  <CardDescription>Detalles básicos del producto</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-slate-700 dark:text-slate-300">Nombre del Producto *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Ej: Laptop HP ProBook 450 G9"
                        required
                        className="h-11 rounded-xl border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 dark:bg-slate-800/50"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="category_id" className="text-slate-700 dark:text-slate-300">Categoría *</Label>
                      <Select
                        value={formData.category_id}
                        onValueChange={(value) => handleSelectChange("category_id", value)}
                        open={categorySelectOpen}
                        onOpenChange={setCategorySelectOpen}
                        required
                      >
                        <SelectTrigger className="h-11 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                          <SelectValue placeholder="Seleccionar categoría" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: category.color }} />
                                {category.name}
                              </div>
                            </SelectItem>
                          ))}
                          {companyId && (
                            <div className="p-1 border-t border-slate-100 dark:border-slate-800 mt-1 pt-1">
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

                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-slate-700 dark:text-slate-300">Descripción</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={handleChange}
                      placeholder="Descripción detallada, especificaciones técnicas, etc."
                      rows={4}
                      className="min-h-[100px] rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 resize-y focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="code" className="text-slate-700 dark:text-slate-300">Código del Producto</Label>
                      <div className="relative">
                        <Barcode className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                        <Input 
                          id="code" 
                          value={generatedCodeDisplay} 
                          readOnly 
                          disabled 
                          className="pl-10 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500"
                        />
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">El código se genera automáticamente al guardar.</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="location" className="text-slate-700 dark:text-slate-300">Ubicación Predeterminada</Label>
                      <Input
                        id="location"
                        value={formData.location}
                        onChange={handleChange}
                        placeholder="Ej: Almacén Principal, Estante A1"
                        className="h-11 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Configuration */}
            <div className="space-y-6">
              <Card className="border-none shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-md overflow-hidden h-full">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
                  <CardTitle className="text-lg font-semibold text-slate-800 dark:text-slate-100">Configuración</CardTitle>
                  <CardDescription>Tipo y parámetros de inventario</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="space-y-3">
                    <Label className="text-slate-700 dark:text-slate-300">Tipo de Producto</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div
                        className={`cursor-pointer rounded-xl border-2 p-4 flex flex-col items-center gap-2 transition-all duration-200 ${
                          formData.is_serialized 
                            ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20" 
                            : "border-slate-200 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-800"
                        }`}
                        onClick={() => setFormData((prev) => ({ ...prev, is_serialized: true }))}
                      >
                        <ListChecks className={`h-6 w-6 ${formData.is_serialized ? "text-indigo-600" : "text-slate-400"}`} />
                        <div className="text-center">
                          <div className={`text-sm font-bold ${formData.is_serialized ? "text-indigo-700 dark:text-indigo-300" : "text-slate-600 dark:text-slate-400"}`}>Activo Fijo</div>
                          <div className="text-[10px] text-slate-500">Serializado</div>
                        </div>
                      </div>
                      
                      <div
                        className={`cursor-pointer rounded-xl border-2 p-4 flex flex-col items-center gap-2 transition-all duration-200 ${
                          !formData.is_serialized 
                            ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/20" 
                            : "border-slate-200 dark:border-slate-700 hover:border-emerald-200 dark:hover:border-emerald-800"
                        }`}
                        onClick={() => setFormData((prev) => ({ ...prev, is_serialized: false }))}
                      >
                        <Boxes className={`h-6 w-6 ${!formData.is_serialized ? "text-emerald-600" : "text-slate-400"}`} />
                        <div className="text-center">
                          <div className={`text-sm font-bold ${!formData.is_serialized ? "text-emerald-700 dark:text-emerald-300" : "text-slate-600 dark:text-slate-400"}`}>Consumible</div>
                          <div className="text-[10px] text-slate-500">A Granel</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className={`p-3 rounded-lg text-xs border ${
                      formData.is_serialized 
                        ? "bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800" 
                        : "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800"
                    } flex items-start gap-2`}>
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <p>
                        {formData.is_serialized
                          ? "Genera números de serie únicos para cada unidad. Ideal para equipos, herramientas y activos fijos."
                          : "Control por cantidad total sin números de serie. Ideal para materiales, repuestos pequeños y consumibles."}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="space-y-2">
                      <Label htmlFor="unit_of_measure" className="text-slate-700 dark:text-slate-300">Unidad de Medida *</Label>
                      <Select
                        value={formData.unit_of_measure}
                        onValueChange={(value) => handleSelectChange("unit_of_measure", value)}
                        required
                      >
                        <SelectTrigger className="h-11 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                          <SelectValue placeholder="Selecciona una unidad" />
                        </SelectTrigger>
                        <SelectContent>
                          {["unidad", "caja", "litro", "kilogramo", "metro", "galon", "paquete", "juego", "par"].map((unit) => (
                            <SelectItem key={unit} value={unit}>
                              {unit.charAt(0).toUpperCase() + unit.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="cost_price" className="text-slate-700 dark:text-slate-300">Costo (S/)</Label>
                        <Input
                          id="cost_price"
                          type="number"
                          step="0.01"
                          value={formData.cost_price}
                          onChange={handleChange}
                          placeholder="0.00"
                          min="0"
                          className="h-11 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="minimum_stock" className="text-slate-700 dark:text-slate-300">Stock Mín.</Label>
                        <Input
                          id="minimum_stock"
                          type="number"
                          value={formData.minimum_stock}
                          onChange={handleChange}
                          placeholder="0"
                          min="0"
                          className="h-11 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={isSubmitting} size="lg" className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20 min-w-[150px]">
              {isSubmitting ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  Guardando...
                </>
              ) : (
                <>
                  Crear Producto
                  <Save className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}
