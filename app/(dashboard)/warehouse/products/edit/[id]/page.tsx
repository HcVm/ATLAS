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
import { ArrowLeft, Save, Loader2, FileText, Package, DollarSign, Layers, Box, Tag, Image as ImageIcon, Edit } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { toast } from "sonner"
import Link from "next/link"
import { BrandCreatorDialog } from "@/components/ui/brand-creator-dialog"
import ProductImageUpload from "@/components/warehouse/product-image-upload"
import { motion } from "framer-motion"

interface Product {
  id: string
  name: string
  description: string | null
  code: string
  barcode: string | null
  modelo: string | null
  ficha_tecnica: string | null
  manual: string | null
  unit_of_measure: string
  minimum_stock: number
  current_stock: number
  cost_price: number
  sale_price: number
  location: string | null
  is_active: boolean
  brand_id: string | null
  category_id: string | null
  image_url: string | null
  total_height: number | null
  total_width: number | null
  depth: number | null
}

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

export default function EditProductPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()

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
    manual: "",
    unit_of_measure: "unidad",
    minimum_stock: 0,
    current_stock: 0,
    cost_price: 0,
    sale_price: 0,
    location: "",
    is_active: true,
    brand_id: "",
    category_id: "",
    image_url: "",
    total_height: 0,
    total_width: 0,
    depth: 0,
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

      const companyId = user?.role === "admin" ? user?.selectedCompanyId || user?.company_id : user?.company_id

      if (!companyId) {
        setError("No se pudo determinar la empresa")
        toast.error("No se pudo determinar la empresa")
        return
      }

      const { data: productData, error: productError } = await supabase
        .from("products")
        .select("*")
        .eq("id", params.id)
        .eq("company_id", companyId)
        .single()

      if (productError) {
        if (productError.code === "PGRST116") {
          setError("Producto no encontrado")
          toast.error("El producto no fue encontrado o no tienes permisos para verlo")
        } else {
          console.error("Product error:", productError)
          toast.error("Error al cargar el producto")
          throw productError
        }
        return
      }

      const { data: companyBrands, error: companyBrandsError } = await supabase
        .from("brands")
        .select("id, name, color")
        .eq("company_id", companyId)
        .order("name")

      if (companyBrandsError) {
        console.error("Company brands error:", companyBrandsError)
        toast.warning("No se pudieron cargar las marcas de la empresa")
      }

      const { data: externalBrands, error: externalBrandsError } = await supabase
        .from("brands")
        .select("id, name, color")
        .is("company_id", null)
        .order("name")

      if (externalBrandsError) {
        console.error("External brands error:", externalBrandsError)
        toast.warning("No se pudieron cargar las marcas externas")
      }

      const allBrands = [
        ...(companyBrands || []).map((brand) => ({ ...brand, isExternal: false })),
        ...(externalBrands || []).map((brand) => ({ ...brand, isExternal: true })),
      ]

      const { data: categoriesData, error: categoriesError } = await supabase
        .from("product_categories")
        .select("id, name, color")
        .eq("company_id", companyId)
        .order("name")

      if (categoriesError) {
        console.error("Categories error:", categoriesError)
        toast.warning("No se pudieron cargar las categorías")
      }

      setProduct(productData)
      setBrands(allBrands)
      setCategories(categoriesData || [])

      setFormData({
        name: productData.name || "",
        description: productData.description || "",
        code: productData.code || "",
        barcode: productData.barcode || "",
        modelo: productData.modelo || "",
        ficha_tecnica: productData.ficha_tecnica || "",
        manual: productData.manual || "",
        unit_of_measure: productData.unit_of_measure || "unidad",
        minimum_stock: productData.minimum_stock || 0,
        current_stock: productData.current_stock || 0,
        cost_price: productData.cost_price || 0,
        sale_price: productData.sale_price || 0,
        location: productData.location || "",
        is_active: productData.is_active ?? true,
        brand_id: productData.brand_id || "",
        category_id: productData.category_id || "",
        image_url: productData.image_url || "",
        total_height: productData.total_height || 0,
        total_width: productData.total_width || 0,
        depth: productData.depth || 0,
      })
    } catch (error) {
      console.error("Error fetching data:", error)
      setError("Error al cargar los datos")
      toast.error("Error al cargar los datos del producto")
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

    setFormData((prev) => ({ ...prev, brand_id: newBrand.id }))
    toast.success(`Marca "${newBrand.name}" creada y seleccionada`)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim() || !formData.code.trim()) {
      toast.error("El nombre y código son obligatorios")
      return
    }

    if (formData.cost_price > 0 && formData.sale_price > 0 && formData.sale_price <= formData.cost_price) {
      toast.error("El precio de venta debe ser mayor al precio de costo")
      return
    }

    if (formData.minimum_stock < 0) {
      toast.error("El stock mínimo no puede ser negativo")
      return
    }

    if (formData.current_stock < 0) {
      toast.error("El stock actual no puede ser negativo")
      return
    }

    try {
      setSaving(true)

      const companyId = user?.role === "admin" ? user?.selectedCompanyId || user?.company_id : user?.company_id

      if (!companyId) {
        toast.error("No se pudo determinar la empresa")
        return
      }

      const updateData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        code: formData.code.trim(),
        barcode: formData.barcode.trim() || null,
        modelo: formData.modelo.trim() || null,
        ficha_tecnica: formData.ficha_tecnica.trim() || null,
        manual: formData.manual.trim() || null,
        unit_of_measure: formData.unit_of_measure,
        minimum_stock: Number(formData.minimum_stock),
        current_stock: Number(formData.current_stock),
        cost_price: Number(formData.cost_price),
        sale_price: Number(formData.sale_price),
        location: formData.location.trim() || null,
        is_active: formData.is_active,
        brand_id: formData.brand_id || null,
        category_id: formData.category_id || null,
        image_url: formData.image_url || null,
        updated_at: new Date().toISOString(),
        total_height: formData.total_height || null,
        total_width: formData.total_width || null,
        depth: formData.depth || null,
      }

      const { error } = await supabase
        .from("products")
        .update(updateData)
        .eq("id", params.id)
        .eq("company_id", companyId)

      if (error) {
        console.error("Supabase error:", error)

        if (error.code === "23505") {
          if (error.message.includes("products_code_company_id_key")) {
            toast.error("Ya existe otro producto con ese código en tu empresa")
          } else if (error.message.includes("products_barcode_company_id_key")) {
            toast.error("Ya existe otro producto con ese código de barras en tu empresa")
          } else {
            toast.error("Ya existe otro producto con esos datos")
          }
          return
        } else if (error.code === "23503") {
          if (error.message.includes("brand_id")) {
            toast.error("La marca seleccionada no es válida")
          } else if (error.message.includes("category_id")) {
            toast.error("La categoría seleccionada no es válida")
          } else {
            toast.error("Error de referencia en los datos")
          }
          return
        } else if (error.code === "23514") {
          toast.error("Los valores numéricos deben ser positivos")
          return
        } else if (error.code === "42501") {
          toast.error("No tienes permisos para editar este producto")
          return
        }

        throw error
      }

      toast.success(`Producto "${formData.name}" actualizado correctamente`)

      router.push(`/warehouse/products/${params.id}`)
    } catch (error) {
      console.error("Error updating product:", error)
      toast.error("Error al actualizar el producto. Verifica que todos los campos estén correctos.")
    } finally {
      setSaving(false)
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

  if (error || !product) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)] p-4">
        <Card className="w-full max-w-md text-center p-8 border-none shadow-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
          <CardHeader>
             <div className="mx-auto p-4 bg-slate-100 dark:bg-slate-800 rounded-full mb-4">
                <Package className="h-10 w-10 text-slate-500" />
             </div>
             <CardTitle className="text-2xl font-bold text-slate-800 dark:text-slate-100">Producto no encontrado</CardTitle>
          </CardHeader>
          <CardContent>
             <p className="text-slate-500 dark:text-slate-400 mb-6">
                {error || "No se pudo cargar la información del producto."}
             </p>
             <Button asChild>
                <Link href="/warehouse/products">
                   <ArrowLeft className="h-4 w-4 mr-2" />
                   Volver al catálogo
                </Link>
             </Button>
          </CardContent>
        </Card>
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
            <Link href={`/warehouse/products/${params.id}`}>
              <ArrowLeft className="h-5 w-5 text-slate-500" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-slate-900 via-slate-700 to-slate-600 dark:from-white dark:via-slate-200 dark:to-slate-400 bg-clip-text text-transparent flex items-center gap-3">
               <Edit className="h-8 w-8 text-indigo-500" />
               Editar Producto
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              {product.name}
            </p>
          </div>
        </div>
        <Button 
          onClick={handleSubmit} 
          disabled={saving}
          className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20 transition-all hover:scale-105"
        >
          {saving ? (
             <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
             </>
          ) : (
             <>
                <Save className="mr-2 h-4 w-4" />
                Guardar Cambios
             </>
          )}
        </Button>
      </motion.div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            
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
                   <div className="space-y-2">
                     <Label htmlFor="name" className="text-slate-600 dark:text-slate-400">Nombre *</Label>
                     <Input
                       id="name"
                       value={formData.name}
                       onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                       placeholder="Nombre del producto"
                       required
                       className="rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50"
                     />
                   </div>

                   <div className="space-y-2">
                     <Label htmlFor="description" className="text-slate-600 dark:text-slate-400">Descripción</Label>
                     <Textarea
                       id="description"
                       value={formData.description}
                       onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                       placeholder="Descripción del producto"
                       rows={3}
                       className="rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 resize-none"
                     />
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                       <Label htmlFor="code" className="text-slate-600 dark:text-slate-400">Código *</Label>
                       <Input
                         id="code"
                         value={formData.code}
                         onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                         placeholder="Código del producto"
                         required
                         className="rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 font-mono"
                       />
                     </div>

                     <div className="space-y-2">
                       <Label htmlFor="barcode" className="text-slate-600 dark:text-slate-400">Código de barras</Label>
                       <Input
                         id="barcode"
                         value={formData.barcode}
                         onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                         placeholder="Código de barras"
                         className="rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 font-mono"
                       />
                     </div>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                       <Label htmlFor="modelo" className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                         <FileText className="h-3 w-3" />
                         Modelo
                       </Label>
                       <Input
                         id="modelo"
                         value={formData.modelo}
                         onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                         placeholder="Modelo del producto"
                         className="rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50"
                       />
                     </div>

                     <div className="space-y-2">
                       <Label htmlFor="ficha_tecnica" className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                         <FileText className="h-3 w-3" />
                         Ficha Técnica (URL)
                       </Label>
                       <Input
                         id="ficha_tecnica"
                         type="url"
                         value={formData.ficha_tecnica}
                         onChange={(e) => setFormData({ ...formData, ficha_tecnica: e.target.value })}
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
                       value={formData.manual}
                       onChange={(e) => setFormData({ ...formData, manual: e.target.value })}
                       placeholder="https://ejemplo.com/manual-producto.pdf"
                       className="rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50"
                     />
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                       <Label htmlFor="unit_of_measure" className="text-slate-600 dark:text-slate-400">Unidad de medida</Label>
                       <Select
                         value={formData.unit_of_measure}
                         onValueChange={(value) => setFormData({ ...formData, unit_of_measure: value })}
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
                           <SelectItem value="m">Metro</SelectItem>
                           <SelectItem value="cm">Centímetro</SelectItem>
                           <SelectItem value="caja">Caja</SelectItem>
                           <SelectItem value="paquete">Paquete</SelectItem>
                         </SelectContent>
                       </Select>
                     </div>

                     <div className="space-y-2">
                       <Label htmlFor="location" className="text-slate-600 dark:text-slate-400">Ubicación</Label>
                       <Input
                         id="location"
                         value={formData.location}
                         onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                         placeholder="Ubicación en almacén"
                         className="rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50"
                       />
                     </div>
                   </div>
                 </CardContent>
               </Card>
            </motion.div>

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
                   <div className="grid grid-cols-3 gap-4">
                     <div className="space-y-2">
                       <Label htmlFor="total_height" className="text-slate-600 dark:text-slate-400">Alto (cm)</Label>
                       <Input
                         id="total_height"
                         type="number"
                         min="0"
                         step="0.1"
                         value={formData.total_height}
                         onChange={(e) => setFormData({ ...formData, total_height: Number.parseFloat(e.target.value) || 0 })}
                         placeholder="Altura"
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
                         value={formData.total_width}
                         onChange={(e) => setFormData({ ...formData, total_width: Number.parseFloat(e.target.value) || 0 })}
                         placeholder="Ancho"
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
                         value={formData.depth}
                         onChange={(e) => setFormData({ ...formData, depth: Number.parseFloat(e.target.value) || 0 })}
                         placeholder="Profundidad"
                         className="rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50"
                       />
                     </div>
                   </div>
                 </CardContent>
               </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
               <Card className="border-none shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-md overflow-hidden">
                 <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
                   <CardTitle className="flex items-center gap-2 text-lg text-slate-800 dark:text-slate-100">
                     <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-amber-600 dark:text-amber-400">
                       <DollarSign className="h-5 w-5" />
                     </div>
                     Stock y Precios
                   </CardTitle>
                   <CardDescription>Información de inventario y precios</CardDescription>
                 </CardHeader>
                 <CardContent className="p-6 space-y-4">
                   <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                       <Label htmlFor="current_stock" className="text-slate-600 dark:text-slate-400">Stock actual</Label>
                       <Input
                         disabled
                         id="current_stock"
                         type="number"
                         min="0"
                         step="0.01"
                         value={formData.current_stock}
                         onChange={(e) =>
                           setFormData({ ...formData, current_stock: Number.parseFloat(e.target.value) || 0 })
                         }
                         className="rounded-xl border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/30"
                       />
                     </div>

                     <div className="space-y-2">
                       <Label htmlFor="minimum_stock" className="text-slate-600 dark:text-slate-400">Stock mínimo</Label>
                       <Input
                         id="minimum_stock"
                         type="number"
                         min="0"
                         step="0.01"
                         value={formData.minimum_stock}
                         onChange={(e) =>
                           setFormData({ ...formData, minimum_stock: Number.parseFloat(e.target.value) || 0 })
                         }
                         className="rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50"
                       />
                     </div>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                       <Label htmlFor="cost_price" className="text-slate-600 dark:text-slate-400">Precio de costo</Label>
                       <Input
                         id="cost_price"
                         type="number"
                         min="0"
                         step="0.01"
                         value={formData.cost_price}
                         onChange={(e) => setFormData({ ...formData, cost_price: Number.parseFloat(e.target.value) || 0 })}
                         className="rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50"
                       />
                     </div>

                     <div className="space-y-2">
                       <Label htmlFor="sale_price" className="text-slate-600 dark:text-slate-400">Precio de venta</Label>
                       <Input
                         id="sale_price"
                         type="number"
                         min="0"
                         step="0.01"
                         value={formData.sale_price}
                         onChange={(e) => setFormData({ ...formData, sale_price: Number.parseFloat(e.target.value) || 0 })}
                         className="rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50"
                       />
                     </div>
                   </div>

                   {formData.cost_price > 0 && formData.sale_price > 0 && (
                     <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-100 dark:border-indigo-800 flex justify-between items-center">
                       <span className="text-sm text-indigo-700 dark:text-indigo-300">Margen estimado:</span>
                       <span className="font-bold text-indigo-700 dark:text-indigo-300">
                         {(((formData.sale_price - formData.cost_price) / formData.cost_price) * 100).toFixed(1)}%
                       </span>
                     </div>
                   )}
                 </CardContent>
               </Card>
            </motion.div>
          </div>

          <div className="space-y-6">
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
                     currentImageUrl={formData.image_url}
                     onImageChange={(imageUrl) => setFormData({ ...formData, image_url: imageUrl || "" })}
                     productCode={formData.code}
                   />
                 </CardContent>
               </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
               <Card className="border-none shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-md overflow-hidden">
                 <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
                   <CardTitle className="flex items-center gap-2 text-lg text-slate-800 dark:text-slate-100">
                     <div className="p-2 bg-pink-50 dark:bg-pink-900/20 rounded-lg text-pink-600 dark:text-pink-400">
                       <Tag className="h-5 w-5" />
                     </div>
                     Categorización
                   </CardTitle>
                   <CardDescription>Marca y categoría</CardDescription>
                 </CardHeader>
                 <CardContent className="p-6 space-y-4">
                   <div className="space-y-2">
                     <Label htmlFor="brand_id" className="text-slate-600 dark:text-slate-400">Marca</Label>
                     <div className="space-y-2">
                       <Select
                         value={formData.brand_id}
                         onValueChange={(value) => setFormData({ ...formData, brand_id: value === "none" ? "" : value })}
                       >
                         <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                           <SelectValue placeholder="Seleccionar marca" />
                         </SelectTrigger>
                         <SelectContent>
                           <SelectItem value="none">Sin marca</SelectItem>

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

                           {brands.filter((brand) => brand.isExternal).length > 0 && (
                             <>
                               <div className="px-2 py-1.5 text-sm text-muted-foreground border-t mt-1 pt-2">
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

                           {brands.length === 0 && (
                             <div className="px-2 py-1.5 text-sm text-muted-foreground">No hay marcas disponibles</div>
                           )}
                         </SelectContent>
                       </Select>

                       <BrandCreatorDialog onBrandCreated={handleBrandCreated} />
                     </div>
                   </div>

                   <div className="space-y-2">
                     <Label htmlFor="category_id" className="text-slate-600 dark:text-slate-400">Categoría</Label>
                     <Select
                       value={formData.category_id}
                       onValueChange={(value) => setFormData({ ...formData, category_id: value === "none" ? "" : value })}
                     >
                       <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
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
                   
                   <div className="pt-2 flex items-center justify-between space-x-2 border-t border-slate-100 dark:border-slate-800 mt-4">
                     <div className="space-y-1">
                        <Label htmlFor="is_active" className="text-slate-700 dark:text-slate-300">Producto activo</Label>
                     </div>
                     <Switch
                       id="is_active"
                       checked={formData.is_active}
                       onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
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
