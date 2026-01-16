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
import { ArrowLeft, Save, Package, FileText, Plus, DollarSign, Layers, Box, Tag, Image as ImageIcon } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { toast } from "sonner"
import ProductImageUpload from "@/components/warehouse/product-image-upload"
import { BrandCreatorDialog } from "@/components/ui/brand-creator-dialog"
import { motion } from "framer-motion"

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
  manual: string
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
  total_height: number
  total_width: number
  depth: number
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
    manual: "",
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
    total_height: 0,
    total_width: 0,
    depth: 0,
  })

  useEffect(() => {
    if (user?.company_id) {
      fetchData()
    }
  }, [user])

  const fetchData = async () => {
    if (!user?.company_id) {
      toast.error("No se pudo identificar la empresa")
      return
    }

    try {
      setLoading(true)

      // Obtener marcas propias de la empresa
      const { data: companyBrands, error: companyBrandsError } = await supabase
        .from("brands")
        .select("id, name, color")
        .eq("company_id", user.company_id)
        .order("name")

      if (companyBrandsError) {
        console.error("Company brands error:", companyBrandsError)
        throw companyBrandsError
      }

      // Obtener marcas externas (company_id NULL)
      const { data: externalBrands, error: externalBrandsError } = await supabase
        .from("brands")
        .select("id, name, color")
        .is("company_id", null)
        .order("name")

      if (externalBrandsError) {
        console.error("External brands error:", externalBrandsError)
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

      if (categoriesError) {
        console.error("Categories error:", categoriesError)
        throw categoriesError
      }

      setBrands(allBrands)
      setCategories(categoriesData || [])

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
    setBrands((prev) => {
      if (newBrand.isExternal) {
        return [...prev, newBrand]
      } else {
        const companyBrands = prev.filter((b) => !b.isExternal)
        const externalBrands = prev.filter((b) => b.isExternal)
        return [...companyBrands, newBrand, ...externalBrands]
      }
    })

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

    if (form.cost_price > 0 && form.sale_price > 0 && form.sale_price <= form.cost_price) {
      toast.error("El precio de venta debe ser mayor al precio de costo")
      return
    }

    if (form.minimum_stock < 0) {
      toast.error("El stock mínimo no puede ser negativo")
      return
    }

    if (form.current_stock < 0) {
      toast.error("El stock actual no puede ser negativo")
      return
    }

    if (form.total_height < 0 || form.total_width < 0 || form.depth < 0) {
      toast.error("Las dimensiones no pueden ser negativas")
      return
    }

    if (form.ficha_tecnica.trim() && !isValidUrl(form.ficha_tecnica.trim())) {
      toast.error("La URL de la ficha técnica no es válida")
      return
    }

    if (form.manual.trim() && !isValidUrl(form.manual.trim())) {
      toast.error("La URL del manual no es válida")
      return
    }

    try {
      setSaving(true)

      const qrCodeHash = crypto.randomUUID().replace(/-/g, "")

      const productData = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        code: form.code.trim(),
        barcode: form.barcode.trim() || null,
        modelo: form.modelo.trim() || null,
        ficha_tecnica: form.ficha_tecnica.trim() || null,
        manual: form.manual.trim() || null,
        qr_code_hash: qrCodeHash,
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
        total_height: form.total_height || null,
        total_width: form.total_width || null,
        depth: form.depth || null,
      }

      const { data, error } = await supabase.from("products").insert(productData).select().single()

      if (error) {
        console.error("Supabase error:", error)

        if (error.code === "23505") {
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

        toast.error(`Error al crear el producto: ${error.message || "Error desconocido"}`)
        return
      }

      if (!data) {
        toast.error("No se pudo crear el producto. Inténtalo de nuevo.")
        return
      }

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
      toast.error("No se pudo crear el producto. Verifica que todos los campos estén correctos.")
    } finally {
      setSaving(false)
    }
  }

  const updateForm = (field: keyof ProductForm, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const isValidUrl = (string: string) => {
    try {
      new URL(string)
      return true
    } catch (_) {
      return false
    }
  }

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
      // Ignorar errores de "no encontrado"
    }
  }

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
      <div className="space-y-8 p-4 sm:p-6 lg:p-8 min-h-[calc(100vh-4rem)]">
         <div className="flex items-center gap-4 mb-8">
            <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse" />
            <div className="space-y-2">
               <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
               <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            </div>
         </div>
      </div>
    )
  }

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-8 p-4 sm:p-6 lg:p-8 min-h-[calc(100vh-4rem)]"
    >
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button 
             variant="ghost" 
             size="icon" 
             asChild 
             className="rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Link href="/warehouse/products">
              <ArrowLeft className="h-5 w-5 text-slate-500" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-slate-900 via-slate-700 to-slate-600 dark:from-white dark:via-slate-200 dark:to-slate-400 bg-clip-text text-transparent flex items-center gap-3">
               <Plus className="h-8 w-8 text-indigo-500" />
               Nuevo Producto
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Registrar un nuevo ítem en el inventario
            </p>
          </div>
        </div>
        <Button 
          onClick={handleSubmit} 
          disabled={saving}
          className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20 transition-all hover:scale-105"
        >
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Guardando..." : "Guardar Producto"}
        </Button>
      </motion.div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {/* Información básica */}
            <motion.div variants={itemVariants}>
               <Card className="border-none shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-md overflow-hidden">
                 <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
                   <CardTitle className="flex items-center gap-2 text-lg text-slate-800 dark:text-slate-100">
                     <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
                       <Package className="h-5 w-5" />
                     </div>
                     Información Básica
                   </CardTitle>
                   <CardDescription>Datos principales del producto</CardDescription>
                 </CardHeader>
                 <CardContent className="p-6 space-y-4">
                   <div className="grid gap-4 md:grid-cols-2">
                     <div className="space-y-2">
                       <Label htmlFor="name" className="text-slate-600 dark:text-slate-400">Nombre del Producto *</Label>
                       <Input
                         id="name"
                         value={form.name}
                         onChange={(e) => updateForm("name", e.target.value)}
                         placeholder="Ej: Silla Giratoria"
                         required
                         className="rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50"
                       />
                     </div>
                     <div className="space-y-2">
                       <Label htmlFor="code" className="text-slate-600 dark:text-slate-400">Código del Producto *</Label>
                       <Input
                         id="code"
                         value={form.code}
                         onChange={(e) => {
                           const newCode = e.target.value.toUpperCase()
                           updateForm("code", newCode)
                           setTimeout(() => validateCode(newCode), 1000)
                         }}
                         placeholder="Ej: PWC001"
                         required
                         className="rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 font-mono"
                       />
                     </div>
                   </div>

                   <div className="space-y-2">
                     <Label htmlFor="description" className="text-slate-600 dark:text-slate-400">Descripción</Label>
                     <Textarea
                       id="description"
                       value={form.description}
                       onChange={(e) => updateForm("description", e.target.value)}
                       placeholder="Descripción detallada del producto..."
                       rows={3}
                       className="rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 resize-none"
                     />
                   </div>

                   <div className="grid gap-4 md:grid-cols-2">
                     <div className="space-y-2">
                       <Label htmlFor="modelo" className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                         <FileText className="h-3 w-3" />
                         Modelo
                       </Label>
                       <Input
                         id="modelo"
                         value={form.modelo}
                         onChange={(e) => updateForm("modelo", e.target.value)}
                         placeholder="Ej: PWC-2024-V1"
                         className="rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50"
                       />
                     </div>
                     <div className="space-y-2">
                       <Label htmlFor="ficha_tecnica" className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                         Ficha Técnica (URL)
                       </Label>
                       <Input
                         id="ficha_tecnica"
                         type="url"
                         value={form.ficha_tecnica}
                         onChange={(e) => updateForm("ficha_tecnica", e.target.value)}
                         placeholder="https://ejemplo.com/ficha-tecnica.pdf"
                         className="rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50"
                       />
                     </div>
                   </div>

                   <div className="space-y-2">
                     <Label htmlFor="manual" className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                       <FileText className="h-3 w-3" />
                       Manual del Producto (URL)
                     </Label>
                     <Input
                       id="manual"
                       type="url"
                       value={form.manual}
                       onChange={(e) => updateForm("manual", e.target.value)}
                       placeholder="https://ejemplo.com/manual-producto.pdf"
                       className="rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50"
                     />
                   </div>

                   <div className="grid gap-4 md:grid-cols-2">
                     <div className="space-y-2">
                       <Label htmlFor="barcode" className="text-slate-600 dark:text-slate-400">Código de Barras</Label>
                       <Input
                         id="barcode"
                         value={form.barcode}
                         onChange={(e) => {
                           const newBarcode = e.target.value
                           updateForm("barcode", newBarcode)
                           setTimeout(() => validateBarcode(newBarcode), 1000)
                         }}
                         placeholder="Escanea o ingresa el código"
                         className="rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 font-mono"
                       />
                     </div>
                     <div className="space-y-2">
                       <Label htmlFor="location" className="text-slate-600 dark:text-slate-400">Ubicación</Label>
                       <Input
                         id="location"
                         value={form.location}
                         onChange={(e) => updateForm("location", e.target.value)}
                         placeholder="Ej: Estante A-1"
                         className="rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50"
                       />
                     </div>
                   </div>
                 </CardContent>
               </Card>
            </motion.div>

            {/* Inventario */}
            <motion.div variants={itemVariants}>
               <Card className="border-none shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-md overflow-hidden">
                 <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
                   <CardTitle className="flex items-center gap-2 text-lg text-slate-800 dark:text-slate-100">
                     <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-emerald-600 dark:text-emerald-400">
                       <Layers className="h-5 w-5" />
                     </div>
                     Inventario
                   </CardTitle>
                   <CardDescription>Información de stock y unidades</CardDescription>
                 </CardHeader>
                 <CardContent className="p-6 space-y-4">
                   <div className="grid gap-4 md:grid-cols-3">
                     <div className="space-y-2">
                       <Label htmlFor="unit_of_measure" className="text-slate-600 dark:text-slate-400">Unidad de Medida</Label>
                       <Select
                         value={form.unit_of_measure}
                         onValueChange={(value) => updateForm("unit_of_measure", value)}
                       >
                         <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
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
                       <Label htmlFor="current_stock" className="text-slate-600 dark:text-slate-400">Stock Actual</Label>
                       <Input
                         id="current_stock"
                         type="number"
                         min="0"
                         value={form.current_stock}
                         onChange={(e) => updateForm("current_stock", Number.parseInt(e.target.value) || 0)}
                         className="rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50"
                       />
                     </div>
                     <div className="space-y-2">
                       <Label htmlFor="minimum_stock" className="text-slate-600 dark:text-slate-400">Stock Mínimo</Label>
                       <Input
                         id="minimum_stock"
                         type="number"
                         min="0"
                         value={form.minimum_stock}
                         onChange={(e) => updateForm("minimum_stock", Number.parseInt(e.target.value) || 0)}
                         className="rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50"
                       />
                     </div>
                   </div>
                 </CardContent>
               </Card>
            </motion.div>

            {/* Precios */}
            <motion.div variants={itemVariants}>
               <Card className="border-none shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-md overflow-hidden">
                 <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
                   <CardTitle className="flex items-center gap-2 text-lg text-slate-800 dark:text-slate-100">
                     <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-amber-600 dark:text-amber-400">
                       <DollarSign className="h-5 w-5" />
                     </div>
                     Precios
                   </CardTitle>
                   <CardDescription>Costos y precios de venta</CardDescription>
                 </CardHeader>
                 <CardContent className="p-6 space-y-4">
                   <div className="grid gap-4 md:grid-cols-2">
                     <div className="space-y-2">
                       <Label htmlFor="cost_price" className="text-slate-600 dark:text-slate-400">Costo Unitario (S/)</Label>
                       <Input
                         id="cost_price"
                         type="number"
                         min="0"
                         step="0.01"
                         value={form.cost_price}
                         onChange={(e) => updateForm("cost_price", Number.parseFloat(e.target.value) || 0)}
                         className="rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50"
                       />
                     </div>
                     <div className="space-y-2">
                       <Label htmlFor="sale_price" className="text-slate-600 dark:text-slate-400">Precio de Venta (S/)</Label>
                       <Input
                         id="sale_price"
                         type="number"
                         min="0"
                         step="0.01"
                         value={form.sale_price}
                         onChange={(e) => updateForm("sale_price", Number.parseFloat(e.target.value) || 0)}
                         className="rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50"
                       />
                     </div>
                   </div>
                   {form.cost_price > 0 && form.sale_price > 0 && (
                      <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-100 dark:border-indigo-800 flex justify-between items-center">
                         <span className="text-sm text-indigo-700 dark:text-indigo-300">Margen estimado:</span>
                         <span className="font-bold text-indigo-700 dark:text-indigo-300">
                            {(((form.sale_price - form.cost_price) / form.cost_price) * 100).toFixed(1)}%
                         </span>
                      </div>
                   )}
                 </CardContent>
               </Card>
            </motion.div>

             {/* Dimensiones del Producto */}
             <motion.div variants={itemVariants}>
               <Card className="border-none shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-md overflow-hidden">
                 <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
                   <CardTitle className="flex items-center gap-2 text-lg text-slate-800 dark:text-slate-100">
                     <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400">
                       <Box className="h-5 w-5" />
                     </div>
                     Dimensiones
                   </CardTitle>
                   <CardDescription>Especificaciones de tamaño (opcional)</CardDescription>
                 </CardHeader>
                 <CardContent className="p-6 space-y-4">
                   <div className="grid gap-4 md:grid-cols-3">
                     <div className="space-y-2">
                       <Label htmlFor="total_height" className="text-slate-600 dark:text-slate-400">Alto (cm)</Label>
                       <Input
                         id="total_height"
                         type="number"
                         min="0"
                         step="0.1"
                         value={form.total_height}
                         onChange={(e) => updateForm("total_height", Number.parseFloat(e.target.value) || 0)}
                         className="rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50"
                       />
                     </div>
                     <div className="space-y-2">
                       <Label htmlFor="total_width" className="text-slate-600 dark:text-slate-400">Ancho (cm)</Label>
                       <Input
                         id="total_width"
                         type="number"
                         min="0"
                         step="0.1"
                         value={form.total_width}
                         onChange={(e) => updateForm("total_width", Number.parseFloat(e.target.value) || 0)}
                         className="rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50"
                       />
                     </div>
                     <div className="space-y-2">
                       <Label htmlFor="depth" className="text-slate-600 dark:text-slate-400">Profundidad (cm)</Label>
                       <Input
                         id="depth"
                         type="number"
                         min="0"
                         step="0.1"
                         value={form.depth}
                         onChange={(e) => updateForm("depth", Number.parseFloat(e.target.value) || 0)}
                         className="rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50"
                       />
                     </div>
                   </div>
                 </CardContent>
               </Card>
             </motion.div>
          </div>

          {/* Panel lateral */}
          <div className="space-y-6">
            {/* Imagen del producto */}
            <motion.div variants={itemVariants}>
               <Card className="border-none shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-md overflow-hidden">
                 <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
                   <CardTitle className="flex items-center gap-2 text-lg text-slate-800 dark:text-slate-100">
                     <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-purple-600 dark:text-purple-400">
                       <ImageIcon className="h-5 w-5" />
                     </div>
                     Imagen
                   </CardTitle>
                 </CardHeader>
                 <CardContent className="p-6">
                    <ProductImageUpload
                      currentImageUrl={form.image_url}
                      onImageChange={(imageUrl) => updateForm("image_url", imageUrl)}
                      productCode={form.code || "TEMP"}
                    />
                 </CardContent>
               </Card>
            </motion.div>

            {/* Clasificación */}
            <motion.div variants={itemVariants}>
               <Card className="border-none shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-md overflow-hidden">
                 <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
                   <CardTitle className="flex items-center gap-2 text-lg text-slate-800 dark:text-slate-100">
                     <div className="p-2 bg-pink-50 dark:bg-pink-900/20 rounded-lg text-pink-600 dark:text-pink-400">
                       <Tag className="h-5 w-5" />
                     </div>
                     Clasificación
                   </CardTitle>
                   <CardDescription>Marca y categoría</CardDescription>
                 </CardHeader>
                 <CardContent className="p-6 space-y-4">
                   <div className="space-y-2">
                     <Label htmlFor="brand" className="text-slate-600 dark:text-slate-400">Marca</Label>
                     <div className="space-y-2">
                       <Select
                         value={form.brand_id}
                         onValueChange={(value) => updateForm("brand_id", value === "none" ? "" : value)}
                       >
                         <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
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
                         </SelectContent>
                       </Select>

                       {/* Botón para crear nueva marca */}
                       <BrandCreatorDialog onBrandCreated={handleBrandCreated} />
                     </div>
                   </div>
                   <div className="space-y-2">
                     <Label htmlFor="category" className="text-slate-600 dark:text-slate-400">Categoría</Label>
                     <Select
                       value={form.category_id}
                       onValueChange={(value) => updateForm("category_id", value === "none" ? "" : value)}
                     >
                       <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
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
                 </CardContent>
               </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
               <Card className="border-none shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-md overflow-hidden">
                 <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
                   <CardTitle className="text-lg text-slate-800 dark:text-slate-100">Configuración</CardTitle>
                 </CardHeader>
                 <CardContent className="p-6 space-y-6">
                   <div className="flex items-center justify-between space-x-2">
                     <div className="space-y-1">
                        <Label htmlFor="is_active" className="text-slate-700 dark:text-slate-300">Producto activo</Label>
                        <p className="text-xs text-slate-500">
                          Mostrar en catálogos y búsquedas
                        </p>
                     </div>
                     <Switch
                       id="is_active"
                       checked={form.is_active}
                       onCheckedChange={(checked) => updateForm("is_active", checked)}
                     />
                   </div>
                   
                   <div className="space-y-2">
                     <Label className="text-slate-600 dark:text-slate-400">Notas internas</Label>
                     <Textarea
                       value={form.notes}
                       onChange={(e) => updateForm("notes", e.target.value)}
                       placeholder="Notas adicionales..."
                       rows={4}
                       className="rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 resize-none"
                     />
                   </div>
                 </CardContent>
               </Card>
            </motion.div>
          </div>
        </div>
      </form>
    </motion.div>
  )
}
