"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  ArrowLeft,
  Edit,
  Package,
  AlertTriangle,
  MapPin,
  Barcode,
  Hash,
  ImageIcon,
  FileText,
  ExternalLink,
  Eye,
  QrCode,
  Calendar,
  DollarSign,
  Layers,
  Tag
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import Link from "next/link"
import { QRCodeDisplay } from "@/components/qr-code-display"
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
  qr_code_hash: string | null
  unit_of_measure: string
  minimum_stock: number
  current_stock: number
  cost_price: number
  sale_price: number
  location: string | null
  is_active: boolean
  image_url: string | null
  created_at: string
  updated_at: string
  brands?: { id: string; name: string; color: string } | null
  product_categories?: { id: string; name: string; color: string } | null
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

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showQRCode, setShowQRCode] = useState(false)

  // Verificar si el usuario puede editar productos
  const canEditProducts =
    user?.role === "admin" ||
    user?.role === "supervisor" ||
    (user?.departments?.name &&
      !["ventas"].some((dept) => user.departments!.name.toLowerCase().includes(dept.toLowerCase())))

  useEffect(() => {
    // Si el ID es "new", redirigir a la página de nuevo producto
    if (params.id === "new") {
      router.replace("/warehouse/products/new")
      return
    }

    if (params.id && user) {
      fetchProduct()
    }
  }, [params.id, user, router])

  const fetchProduct = async () => {
    try {
      setLoading(true)
      setError(null)

      // Determinar el company_id correcto
      let companyId: string | null = null

      if (user?.role === "admin") {
        companyId = user?.selectedCompanyId || user?.company_id || null
      } else {
        companyId = user?.company_id || null
      }

      if (!companyId) {
        setError("No se pudo determinar la empresa")
        return
      }

      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          brands!products_brand_id_fkey (id, name, color),
          product_categories!products_category_id_fkey (id, name, color)
        `)
        .eq("id", params.id)
        .eq("company_id", companyId)
        .single()

      if (error) {
        if (error.code === "PGRST116") {
          setError("Producto no encontrado")
        } else {
          console.error("ProductDetail: Database error:", error)
          setError(`Error de base de datos: ${error.message}`)
        }
        return
      }

      if (!data) {
        setError("Producto no encontrado")
        return
      }

      setProduct(data)
    } catch (error) {
      console.error("ProductDetail: Unexpected error:", error)
      setError("Error inesperado al cargar el producto")
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "PEN",
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-PE", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getStockStatus = (current: number, minimum: number) => {
    if (current === 0) return { label: "Sin stock", variant: "destructive" as const, color: "text-red-600 bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800" }
    if (current <= minimum) return { label: "Stock bajo", variant: "secondary" as const, color: "text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800" }
    return { label: "Disponible", variant: "default" as const, color: "text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800" }
  }

  // Debug info
  if (!user) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)] p-4">
        <Card className="w-full max-w-md text-center p-8 border-none shadow-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
          <CardHeader>
             <div className="mx-auto p-4 bg-red-100 dark:bg-red-900/30 rounded-full mb-4">
                <AlertTriangle className="h-10 w-10 text-red-600 dark:text-red-400" />
             </div>
             <CardTitle className="text-2xl font-bold text-slate-800 dark:text-slate-100">Acceso Restringido</CardTitle>
          </CardHeader>
          <CardContent>
             <p className="text-slate-500 dark:text-slate-400">
                Usuario no autenticado
             </p>
             <Button variant="outline" className="mt-4" asChild>
                <Link href="/login">Ir al login</Link>
             </Button>
          </CardContent>
        </Card>
      </div>
    )
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
         <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2 space-y-6">
               <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
               <div className="h-48 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
            </div>
            <div className="space-y-6">
               <div className="h-48 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
               <div className="h-48 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
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

  const stockStatus = getStockStatus(product.current_stock, product.minimum_stock)

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-8 p-4 sm:p-6 lg:p-8 min-h-[calc(100vh-4rem)]"
    >
      {/* Header */}
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
               {product.name}
            </h1>
            <div className="flex items-center gap-3 mt-1 text-slate-500 dark:text-slate-400">
               <span className="flex items-center gap-1 text-sm font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300">
                  <Hash className="h-3 w-3" />
                  {product.code}
               </span>
               {product.location && (
                  <span className="flex items-center gap-1 text-sm">
                     <MapPin className="h-3 w-3" />
                     {product.location}
                  </span>
               )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Indicador visual de solo lectura para ventas */}
          {!canEditProducts && (
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-4 py-2 rounded-xl border border-amber-200 dark:border-amber-800">
              <Eye className="h-4 w-4" />
              <span className="text-sm font-medium">Solo lectura</span>
            </div>
          )}
          {canEditProducts && (
            <Button
              asChild
              className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20 transition-all hover:scale-105"
            >
              <Link href={`/warehouse/products/edit/${product.id}`}>
                <Edit className="h-4 w-4 mr-2" />
                Editar Producto
              </Link>
            </Button>
          )}
        </div>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Columna Principal (Izquierda) */}
        <div className="lg:col-span-2 space-y-6">
           
           {/* Información General */}
           <motion.div variants={itemVariants}>
              <Card className="border-none shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-md overflow-hidden">
                 <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg text-slate-800 dark:text-slate-100">
                       <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
                          <Package className="h-5 w-5" />
                       </div>
                       Información General
                    </CardTitle>
                 </CardHeader>
                 <CardContent className="p-6 space-y-6">
                    {product.description && (
                       <div>
                          <label className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1 block">Descripción</label>
                          <p className="text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                             {product.description}
                          </p>
                       </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                       <div className="space-y-4">
                          <div>
                             <label className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-2 mb-1">
                                <Barcode className="h-4 w-4" />
                                Código de barras
                             </label>
                             <p className="font-mono text-slate-700 dark:text-slate-300 text-sm">
                                {product.barcode || "No registrado"}
                             </p>
                          </div>
                          
                          <div>
                             <label className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-2 mb-1">
                                <FileText className="h-4 w-4" />
                                Modelo
                             </label>
                             <p className="text-slate-700 dark:text-slate-300 text-sm">
                                {product.modelo || "No especificado"}
                             </p>
                          </div>
                       </div>

                       <div className="space-y-4">
                          <div>
                             <label className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-2 mb-1">
                                <Layers className="h-4 w-4" />
                                Unidad de medida
                             </label>
                             <Badge variant="outline" className="font-normal text-slate-600 dark:text-slate-300">
                                {product.unit_of_measure}
                             </Badge>
                          </div>

                          <div>
                             <label className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-2 mb-1">
                                <Tag className="h-4 w-4" />
                                Estado
                             </label>
                             <Badge
                                variant={product.is_active ? "default" : "secondary"}
                                className={
                                   product.is_active
                                      ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800"
                                      : "bg-slate-100 text-slate-600 hover:bg-slate-100 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                                }
                             >
                                {product.is_active ? "Activo" : "Inactivo"}
                             </Badge>
                          </div>
                       </div>
                    </div>

                    {(product.ficha_tecnica || product.manual) && (
                       <>
                          <Separator className="bg-slate-100 dark:bg-slate-800" />
                          <div className="flex flex-wrap gap-4">
                             {product.ficha_tecnica && (
                                <Button variant="outline" size="sm" asChild className="rounded-lg border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
                                   <a href={product.ficha_tecnica} target="_blank" rel="noopener noreferrer">
                                      <FileText className="h-4 w-4 mr-2 text-blue-500" />
                                      Ficha Técnica
                                      <ExternalLink className="h-3 w-3 ml-2 opacity-50" />
                                   </a>
                                </Button>
                             )}
                             {product.manual && (
                                <Button variant="outline" size="sm" asChild className="rounded-lg border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
                                   <a href={product.manual} target="_blank" rel="noopener noreferrer">
                                      <FileText className="h-4 w-4 mr-2 text-orange-500" />
                                      Manual de Usuario
                                      <ExternalLink className="h-3 w-3 ml-2 opacity-50" />
                                   </a>
                                </Button>
                             )}
                          </div>
                       </>
                    )}
                 </CardContent>
              </Card>
           </motion.div>

           {/* Stock y Precios */}
           <motion.div variants={itemVariants}>
              <Card className="border-none shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-md overflow-hidden">
                 <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg text-slate-800 dark:text-slate-100">
                       <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-emerald-600 dark:text-emerald-400">
                          <DollarSign className="h-5 w-5" />
                       </div>
                       Stock y Precios
                    </CardTitle>
                 </CardHeader>
                 <CardContent className="p-6 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                       <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                          <div className="flex items-center justify-between mb-2">
                             <label className="text-sm font-medium text-slate-500 dark:text-slate-400">Stock Actual</label>
                             <Badge className={`border-none ${stockStatus.color}`}>
                                {stockStatus.label}
                             </Badge>
                          </div>
                          <div className="flex items-end gap-2">
                             <span className="text-3xl font-bold text-slate-800 dark:text-slate-100">{product.current_stock}</span>
                             <span className="text-sm text-slate-500 dark:text-slate-400 mb-1">{product.unit_of_measure}</span>
                          </div>
                          <div className="mt-2 text-xs text-slate-400">
                             Mínimo requerido: <span className="font-medium text-slate-600 dark:text-slate-300">{product.minimum_stock} {product.unit_of_measure}</span>
                          </div>
                       </div>

                       <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                          <label className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2 block">Precio de Venta</label>
                          <div className="space-y-1">
                             <div className="flex items-end gap-2">
                                <span className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                                   {formatCurrency(product.sale_price)}
                                </span>
                                <span className="text-xs text-slate-400 mb-1">sin IGV</span>
                             </div>
                             <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                                {formatCurrency(product.sale_price * 1.18)} <span className="text-xs font-normal text-slate-400">inc. IGV</span>
                             </p>
                          </div>
                       </div>
                    </div>

                    <Separator className="bg-slate-100 dark:bg-slate-800" />

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                       <div>
                          <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Costo</label>
                          <p className="text-lg font-semibold text-slate-700 dark:text-slate-200 mt-1">{formatCurrency(product.cost_price)}</p>
                       </div>
                       <div>
                          <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Margen</label>
                          <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                             {product.cost_price > 0 
                                ? (((product.sale_price - product.cost_price) / product.cost_price) * 100).toFixed(1)
                                : "0.0"
                             }%
                          </p>
                       </div>
                       <div>
                          <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">IGV (18%)</label>
                          <p className="text-lg font-semibold text-slate-700 dark:text-slate-200 mt-1">{formatCurrency(product.sale_price * 0.18)}</p>
                       </div>
                       <div>
                          <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Utilidad</label>
                          <p className="text-lg font-semibold text-indigo-600 dark:text-indigo-400 mt-1">{formatCurrency(product.sale_price - product.cost_price)}</p>
                       </div>
                    </div>
                 </CardContent>
              </Card>
           </motion.div>
        </div>

        {/* Columna Lateral (Derecha) */}
        <div className="space-y-6">
           {/* Imagen */}
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
                 <CardContent className="p-4">
                    <div className="aspect-square rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 flex items-center justify-center relative group">
                       {product.image_url ? (
                          <img
                             src={product.image_url}
                             alt={product.name}
                             className="w-full h-full object-contain p-4 transition-transform duration-300 group-hover:scale-105"
                          />
                       ) : (
                          <div className="flex flex-col items-center gap-2 text-slate-400">
                             <ImageIcon className="h-12 w-12 opacity-50" />
                             <span className="text-sm">Sin imagen</span>
                          </div>
                       )}
                    </div>
                 </CardContent>
              </Card>
           </motion.div>

           {/* Clasificación */}
           <motion.div variants={itemVariants}>
              <Card className="border-none shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-md overflow-hidden">
                 <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg text-slate-800 dark:text-slate-100">
                       <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-amber-600 dark:text-amber-400">
                          <Tag className="h-5 w-5" />
                       </div>
                       Clasificación
                    </CardTitle>
                 </CardHeader>
                 <CardContent className="p-6 space-y-6">
                    <div>
                       <label className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2 block">Marca</label>
                       {product.brands ? (
                          <Badge
                             variant="secondary"
                             className="text-sm py-1 px-3"
                             style={{
                                backgroundColor: `${product.brands.color}15`,
                                color: product.brands.color,
                                border: `1px solid ${product.brands.color}30`
                             }}
                          >
                             {product.brands.name}
                          </Badge>
                       ) : (
                          <span className="text-sm text-slate-400 italic">Sin marca asignada</span>
                       )}
                    </div>

                    <div>
                       <label className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2 block">Categoría</label>
                       {product.product_categories ? (
                          <Badge
                             variant="outline"
                             className="text-sm py-1 px-3"
                             style={{
                                borderColor: product.product_categories.color,
                                color: product.product_categories.color,
                             }}
                          >
                             {product.product_categories.name}
                          </Badge>
                       ) : (
                          <span className="text-sm text-slate-400 italic">Sin categoría asignada</span>
                       )}
                    </div>
                 </CardContent>
              </Card>
           </motion.div>

           {/* Info Sistema */}
           <motion.div variants={itemVariants}>
              <Card className="border-none shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-md overflow-hidden">
                 <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg text-slate-800 dark:text-slate-100">
                       <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400">
                          <Calendar className="h-5 w-5" />
                       </div>
                       Sistema
                    </CardTitle>
                 </CardHeader>
                 <CardContent className="p-6 space-y-4">
                    <div className="flex justify-between items-center py-2 border-b border-slate-50 dark:border-slate-800/50">
                       <span className="text-sm text-slate-500 dark:text-slate-400">Creado</span>
                       <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{formatDate(product.created_at)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-50 dark:border-slate-800/50">
                       <span className="text-sm text-slate-500 dark:text-slate-400">Actualizado</span>
                       <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{formatDate(product.updated_at)}</span>
                    </div>
                    {product.qr_code_hash && (
                       <div className="pt-2">
                          <Button
                             variant="outline"
                             className="w-full justify-between"
                             onClick={() => setShowQRCode(true)}
                          >
                             <span className="flex items-center gap-2">
                                <QrCode className="h-4 w-4" />
                                Código QR
                             </span>
                             <Eye className="h-4 w-4 text-slate-400" />
                          </Button>
                       </div>
                    )}
                 </CardContent>
              </Card>
           </motion.div>
        </div>
      </div>

      {product.qr_code_hash && showQRCode && (
        <QRCodeDisplay
          hash={product.qr_code_hash}
          title={`QR - ${product.name}`}
          description="Escanea este código QR para ver la información pública del producto"
          url={`${typeof window !== "undefined" ? window.location.origin : ""}/public/product/${product.qr_code_hash}`}
          onClose={() => setShowQRCode(false)}
        />
      )}
    </motion.div>
  )
}
