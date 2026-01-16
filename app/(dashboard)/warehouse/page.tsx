"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Package,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  BarChart3,
  Plus,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  Barcode,
  Warehouse,
  Boxes,
  History,
  Activity,
  Zap,
  Clock,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { useCompany } from "@/lib/company-context"
import Link from "next/link"
import { motion } from "framer-motion"
import { Skeleton } from "@/components/ui/skeleton"

interface WarehouseStats {
  totalProducts: number
  totalValue: number
  lowStockProducts: number
  outOfStockProducts: number
  totalMovements: number
  recentMovements: any[]
  topProducts: any[]
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

export default function WarehousePage() {
  const { user } = useAuth()
  const { selectedCompany } = useCompany()
  const [stats, setStats] = useState<WarehouseStats>({
    totalProducts: 0,
    totalValue: 0,
    lowStockProducts: 0,
    outOfStockProducts: 0,
    totalMovements: 0,
    recentMovements: [],
    topProducts: [],
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user has warehouse access
    const hasWarehouseAccess =
      user?.role === "admin" ||
      user?.role === "supervisor" ||
      ["Almacén", "Contabilidad", "Operaciones", "Acuerdos Marco", "Administración"].includes(user?.departments?.name || "")

    // For admin users, use selectedCompany; for others, use their assigned company
    const companyId = user?.role === "admin" ? selectedCompany?.id : user?.company_id

    if (companyId && hasWarehouseAccess) {
      fetchWarehouseData(companyId)
    } else {
      setLoading(false)
    }
  }, [user, selectedCompany])

  const fetchWarehouseData = async (companyId: string) => {
    try {
      setLoading(true)

      // Obtener productos
      const { data: products, error: productsError } = await supabase
        .from("products")
        .select(`
          id,
          name,
          code,
          current_stock,
          minimum_stock,
          cost_price,
          brands!products_brand_id_fkey (name, color),
          product_categories!products_category_id_fkey (name, color)
        `)
        .eq("company_id", companyId)
        .eq("is_active", true)

      if (productsError) {
        console.error("Products error:", productsError)
        throw productsError
      }

      // Obtener movimientos recientes
      const { data: movements, error: movementsError } = await supabase
        .from("inventory_movements")
        .select(`
          id,
          movement_type,
          quantity,
          movement_date,
          products (name, code)
        `)
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(5)

      if (movementsError) {
        console.error("Movements error:", movementsError)
      }

      // Calcular estadísticas
      const totalProducts = products?.length || 0
      const totalValue = products?.reduce((sum, product) => sum + product.current_stock * product.cost_price, 0) || 0
      const lowStockProducts =
        products?.filter((p) => p.current_stock <= p.minimum_stock && p.current_stock > 0).length || 0
      const outOfStockProducts = products?.filter((p) => p.current_stock === 0).length || 0

      // Top productos por stock
      const topProducts = products?.sort((a, b) => b.current_stock - a.current_stock).slice(0, 5) || []

      setStats({
        totalProducts,
        totalValue,
        lowStockProducts,
        outOfStockProducts,
        totalMovements: movements?.length || 0,
        recentMovements: movements || [],
        topProducts,
      })
    } catch (error) {
      console.error("Error fetching warehouse data:", error)
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

  // Check if user has warehouse access
  const hasWarehouseAccess =
    user?.role === "admin" ||
    user?.role === "supervisor" ||
    ["Almacén", "Contabilidad", "Operaciones", "Acuerdos Marco", "Administración"].includes(user?.departments?.name || "")

  // Get the company to use
  const companyToUse = user?.role === "admin" ? selectedCompany : user?.company_id ? { id: user.company_id } : null

  if (!hasWarehouseAccess) {
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
              No tienes los permisos necesarios para acceder al módulo de almacén.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!companyToUse) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)] p-4">
        <Card className="w-full max-w-md text-center p-8 border-none shadow-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
          <CardHeader>
            <div className="mx-auto p-4 bg-slate-100 dark:bg-slate-800 rounded-full mb-4">
               <Warehouse className="h-10 w-10 text-slate-500" />
            </div>
            <CardTitle className="text-2xl font-bold text-slate-800 dark:text-slate-100">Sin Empresa</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-500 dark:text-slate-400">
               {user?.role === "admin"
                 ? "Selecciona una empresa para ver su inventario."
                 : "No tienes una empresa asignada. Contacta al administrador."}
            </p>
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
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-slate-900 via-slate-700 to-slate-600 dark:from-white dark:via-slate-200 dark:to-slate-400 bg-clip-text text-transparent flex items-center gap-3">
            <Warehouse className="h-8 w-8 text-orange-500" />
            Almacén General
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Gestión integral de inventario y movimientos
            {user?.role === "admin" && selectedCompany && (
              <span className="ml-2 font-medium text-slate-700 dark:text-slate-300">- {selectedCompany.name}</span>
            )}
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            asChild
            className="rounded-xl border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <Link href="/warehouse/inventory">
              <Boxes className="h-4 w-4 mr-2" />
              Inventario
            </Link>
          </Button>
          <Button
            asChild
            className="rounded-xl bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-500/20"
          >
            <Link href="/warehouse/products/new">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Producto
            </Link>
          </Button>
        </div>
      </motion.div>

      {/* Estadísticas principales */}
      <motion.div variants={itemVariants} className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
         {loading ? (
            [...Array(4)].map((_, i) => (
               <Card key={i} className="border-none shadow-sm bg-white/50 dark:bg-slate-900/50 backdrop-blur-md">
                  <CardContent className="p-6">
                     <Skeleton className="h-4 w-24 mb-2" />
                     <Skeleton className="h-8 w-16" />
                  </CardContent>
               </Card>
            ))
         ) : (
            <>
               <Card className="border-none shadow-sm hover:shadow-md transition-all duration-300 bg-blue-50/50 dark:bg-blue-900/10 backdrop-blur-md">
                  <CardContent className="p-5 flex items-center justify-between">
                     <div>
                        <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Productos</p>
                        <h3 className="text-3xl font-bold text-blue-700 dark:text-blue-300 mt-1">{stats.totalProducts}</h3>
                     </div>
                     <div className="p-3 rounded-xl bg-white/60 dark:bg-white/10 text-blue-500">
                        <Package className="h-6 w-6" />
                     </div>
                  </CardContent>
               </Card>

               <Card className="border-none shadow-sm hover:shadow-md transition-all duration-300 bg-emerald-50/50 dark:bg-emerald-900/10 backdrop-blur-md">
                  <CardContent className="p-5 flex items-center justify-between">
                     <div>
                        <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Valor Total</p>
                        <h3 className="text-3xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">{formatCurrency(stats.totalValue)}</h3>
                     </div>
                     <div className="p-3 rounded-xl bg-white/60 dark:bg-white/10 text-emerald-500">
                        <DollarSign className="h-6 w-6" />
                     </div>
                  </CardContent>
               </Card>

               <Card className="border-none shadow-sm hover:shadow-md transition-all duration-300 bg-amber-50/50 dark:bg-amber-900/10 backdrop-blur-md">
                  <CardContent className="p-5 flex items-center justify-between">
                     <div>
                        <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Stock Bajo</p>
                        <h3 className="text-3xl font-bold text-amber-700 dark:text-amber-300 mt-1">{stats.lowStockProducts}</h3>
                     </div>
                     <div className="p-3 rounded-xl bg-white/60 dark:bg-white/10 text-amber-500">
                        <AlertTriangle className="h-6 w-6" />
                     </div>
                  </CardContent>
               </Card>

               <Card className="border-none shadow-sm hover:shadow-md transition-all duration-300 bg-red-50/50 dark:bg-red-900/10 backdrop-blur-md">
                  <CardContent className="p-5 flex items-center justify-between">
                     <div>
                        <p className="text-sm font-medium text-red-600 dark:text-red-400">Sin Stock</p>
                        <h3 className="text-3xl font-bold text-red-700 dark:text-red-300 mt-1">{stats.outOfStockProducts}</h3>
                     </div>
                     <div className="p-3 rounded-xl bg-white/60 dark:bg-white/10 text-red-500">
                        <TrendingUp className="h-6 w-6" />
                     </div>
                  </CardContent>
               </Card>
            </>
         )}
      </motion.div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Productos con mayor stock */}
        <motion.div variants={itemVariants}>
           <Card className="h-full border-none shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-md overflow-hidden">
             <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
               <CardTitle className="flex items-center gap-2 text-lg">
                 <Activity className="h-5 w-5 text-indigo-500" />
                 Top Stock
               </CardTitle>
               <CardDescription>
                 Productos con mayor disponibilidad
               </CardDescription>
             </CardHeader>
             <CardContent className="p-0">
               {loading ? (
                  <div className="p-6 space-y-4">
                     {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex justify-between items-center">
                           <Skeleton className="h-10 w-10 rounded-full" />
                           <Skeleton className="h-4 w-1/2" />
                           <Skeleton className="h-4 w-16" />
                        </div>
                     ))}
                  </div>
               ) : (
                 <div className="divide-y divide-slate-100 dark:divide-slate-800">
                   {stats.topProducts.length > 0 ? (
                     stats.topProducts.map((product, index) => (
                       <div
                         key={product.id}
                         className="flex items-center justify-between p-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors"
                       >
                         <div className="flex items-center gap-4">
                           <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center text-sm font-bold shadow-inner">
                             {index + 1}
                           </div>
                           <div>
                             <div className="font-semibold text-slate-800 dark:text-slate-200">{product.name}</div>
                             <div className="text-xs text-slate-500 font-mono">{product.code}</div>
                           </div>
                         </div>
                         <Badge variant="secondary" className="font-mono text-sm bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800">
                           {product.current_stock} un.
                         </Badge>
                       </div>
                     ))
                   ) : (
                     <div className="text-center text-slate-500 dark:text-slate-400 py-12 flex flex-col items-center">
                        <Package className="h-10 w-10 text-slate-300 mb-2" />
                        <p>No hay productos registrados</p>
                     </div>
                   )}
                 </div>
               )}
             </CardContent>
           </Card>
        </motion.div>

        {/* Movimientos recientes */}
        <motion.div variants={itemVariants}>
           <Card className="h-full border-none shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-md overflow-hidden">
             <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
               <CardTitle className="flex items-center gap-2 text-lg">
                 <History className="h-5 w-5 text-orange-500" />
                 Movimientos Recientes
               </CardTitle>
               <CardDescription>
                 Últimas entradas y salidas de inventario
               </CardDescription>
             </CardHeader>
             <CardContent className="p-0">
               {loading ? (
                  <div className="p-6 space-y-4">
                     {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex justify-between items-center">
                           <Skeleton className="h-10 w-10 rounded-lg" />
                           <Skeleton className="h-4 w-1/3" />
                           <Skeleton className="h-6 w-12 rounded-full" />
                        </div>
                     ))}
                  </div>
               ) : (
                 <div className="divide-y divide-slate-100 dark:divide-slate-800">
                   {stats.recentMovements.length > 0 ? (
                     stats.recentMovements.map((movement) => (
                       <div
                         key={movement.id}
                         className="flex items-center justify-between p-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors"
                       >
                         <div className="flex items-center gap-4">
                           <div
                             className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${
                               movement.movement_type === "entrada"
                                 ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400"
                                 : "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"
                             }`}
                           >
                             {movement.movement_type === "entrada" ? (
                               <ArrowUpRight className="h-5 w-5" />
                             ) : (
                               <ArrowDownRight className="h-5 w-5" />
                             )}
                           </div>
                           <div>
                             <div className="font-medium text-slate-800 dark:text-slate-200">
                               {movement.products?.name || "Producto eliminado"}
                             </div>
                             <div className="text-xs text-slate-500 flex items-center gap-1">
                               <Clock className="h-3 w-3" />
                               {new Date(movement.movement_date).toLocaleDateString()}
                             </div>
                           </div>
                         </div>
                         <Badge
                           className={`font-mono text-sm ${
                              movement.movement_type === "entrada"
                                 ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-300"
                                 : "bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900/40 dark:text-red-300"
                           }`}
                         >
                           {movement.movement_type === "entrada" ? "+" : "-"}
                           {movement.quantity}
                         </Badge>
                       </div>
                     ))
                   ) : (
                     <div className="text-center text-slate-500 dark:text-slate-400 py-12 flex flex-col items-center">
                        <History className="h-10 w-10 text-slate-300 mb-2" />
                        <p>No hay movimientos recientes</p>
                     </div>
                   )}
                 </div>
               )}
             </CardContent>
           </Card>
        </motion.div>
      </div>

      {/* Acciones rápidas */}
      <motion.div variants={itemVariants}>
        <Card className="border-none shadow-lg bg-white/60 dark:bg-slate-900/60 backdrop-blur-md overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-slate-800 dark:text-slate-100">
               <Zap className="h-5 w-5 text-yellow-500" /> Acciones Rápidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <Link href="/warehouse/products/new" className="group">
                 <div className="h-full p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-orange-500 dark:hover:border-orange-500 transition-all flex items-center gap-4 shadow-sm hover:shadow-md">
                    <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-colors">
                       <Plus className="h-6 w-6" />
                    </div>
                    <div>
                       <h4 className="font-semibold text-slate-800 dark:text-slate-200">Nuevo Producto</h4>
                       <p className="text-xs text-slate-500">Registrar item</p>
                    </div>
                 </div>
              </Link>

              <Link href="/warehouse/inventory" className="group">
                 <div className="h-full p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-500 dark:hover:border-blue-500 transition-all flex items-center gap-4 shadow-sm hover:shadow-md">
                    <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                       <Eye className="h-6 w-6" />
                    </div>
                    <div>
                       <h4 className="font-semibold text-slate-800 dark:text-slate-200">Ver Inventario</h4>
                       <p className="text-xs text-slate-500">Consultar stock</p>
                    </div>
                 </div>
              </Link>

              <Link href="/warehouse/products?filter=low-stock" className="group">
                 <div className="h-full p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-amber-500 dark:hover:border-amber-500 transition-all flex items-center gap-4 shadow-sm hover:shadow-md">
                    <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                       <AlertTriangle className="h-6 w-6" />
                    </div>
                    <div>
                       <h4 className="font-semibold text-slate-800 dark:text-slate-200">Stock Bajo</h4>
                       <p className="text-xs text-slate-500">Alertas activas</p>
                    </div>
                 </div>
              </Link>

              <Link href="/warehouse/lots-serials" className="group">
                 <div className="h-full p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-purple-500 dark:hover:border-purple-500 transition-all flex items-center gap-4 shadow-sm hover:shadow-md">
                    <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                       <Barcode className="h-6 w-6" />
                    </div>
                    <div>
                       <h4 className="font-semibold text-slate-800 dark:text-slate-200">Lotes y Series</h4>
                       <p className="text-xs text-slate-500">Trazabilidad</p>
                    </div>
                 </div>
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
