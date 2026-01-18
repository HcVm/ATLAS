"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Package, TrendingUp, TrendingDown, AlertTriangle, Search, Plus, FileText, BarChart3, AlertCircle, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { motion } from "framer-motion"

interface InternalProduct {
  id: string
  name: string
  code: string
  current_stock: number
  minimum_stock: number
  unit_of_measure: string
  cost_price: number
  location: string | null
  is_serialized: boolean
  internal_product_categories: {
    name: string
    color: string
  } | null
}

interface StockAlert {
  id: string
  name: string
  code: string
  current_stock: number
  minimum_stock: number
  unit_of_measure: string
  is_serialized?: boolean
}

interface RecentMovement {
  id: string
  movement_type: string
  quantity: number
  movement_date: string
  requested_by: string | null
  department_requesting: string | null
  internal_products: {
    name: string
    code: string
  } | null
  internal_product_serials: {
    serial_number: string
  } | null
}

interface EquipmentByDepartment {
  department: string
  equipment_count: number
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

export default function InternalWarehousePage() {
  const { user } = useAuth()
  const [products, setProducts] = useState<InternalProduct[]>([])
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([])
  const [recentMovements, setRecentMovements] = useState<RecentMovement[]>([])
  // const [equipmentByDepartment, setEquipmentByDepartment] = useState<EquipmentByDepartment[]>([]) // Removed unused state if not used, but keeping for safety strictly as per file content if needed, but standard logic implies I should keep it if I don't touch it. Wait, I see it in defined states.
  const [equipmentByDepartment, setEquipmentByDepartment] = useState<EquipmentByDepartment[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalProductsCount, setTotalProductsCount] = useState(0)
  const ITEMS_PER_PAGE = 12

  const [stats, setStats] = useState({
    totalProducts: 0,
    lowStockItems: 0,
    totalValue: 0,
    recentMovements: 0,
  })

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
      setPage(1) // Reset to first page on search
    }, 500)

    return () => clearTimeout(timer)
  }, [searchTerm])

  useEffect(() => {
    if (user?.company_id) {
      fetchData()
    }
  }, [user?.company_id, page, debouncedSearchTerm])

  // Cache for products pages
  const productsCache = useRef<Map<number, InternalProduct[]>>(new Map())

  // Helper function to fetch products for a specific page
  const getProductsForPage = async (pageNumber: number) => {
    // Check cache first
    if (productsCache.current.has(pageNumber) && !debouncedSearchTerm) {
      return { data: productsCache.current.get(pageNumber), count: totalProductsCount }
    }

    let query = supabase
      .from("internal_products")
      .select(`
        *,
        internal_product_categories (
          name,
          color
        )
      `, { count: 'exact' })
      .eq("company_id", user?.company_id ?? "")
      .eq("is_active", true)
      .order("name")

    if (debouncedSearchTerm) {
      query = query.or(`name.ilike.%${debouncedSearchTerm}%,code.ilike.%${debouncedSearchTerm}%`)
    }

    const from = (pageNumber - 1) * ITEMS_PER_PAGE
    const to = from + ITEMS_PER_PAGE - 1

    const { data: productsData, error: productsError, count } = await query.range(from, to)

    if (productsError) throw productsError

    // Optimize Serialized Stock Fetching (Bulk Query)
    const serializedProductIds = (productsData || [])
      .filter(p => p.is_serialized)
      .map(p => p.id)

    const productStockMap = new Map<string, number>()

    if (serializedProductIds.length > 0) {
      const { data: serialsData, error: serialsError } = await supabase
        .from("internal_product_serials")
        .select("product_id")
        .in("product_id", serializedProductIds)
        .eq("status", "in_stock")
        .eq("company_id", user?.company_id ?? "")

      if (serialsError) {
        console.error("Error fetching serials:", serialsError)
      } else {
        serialsData?.forEach(serial => {
          const currentCount = productStockMap.get(serial.product_id) || 0
          productStockMap.set(serial.product_id, currentCount + 1)
        })
      }
    }

    const processedProducts = (productsData || []).map(product => {
      if (product.is_serialized) {
        return {
          ...product,
          current_stock: productStockMap.get(product.id) || 0
        }
      }
      return product
    })

    const validProducts = processedProducts.map(p => ({
      ...p,
      current_stock: p.current_stock || 0,
      minimum_stock: p.minimum_stock || 0,
      cost_price: p.cost_price || 0,
      internal_product_categories: p.internal_product_categories || null
    })) as unknown as InternalProduct[]

    // Update cache if safely possible (e.g. no search term to keep consistent pagination)
    if (!debouncedSearchTerm) {
      productsCache.current.set(pageNumber, validProducts)
    }

    return { data: validProducts, count }
  }

  // Prefetch effect
  useEffect(() => {
    if (user?.company_id && !debouncedSearchTerm && page < totalPages) {
      const nextPage = page + 1
      if (!productsCache.current.has(nextPage)) {
        getProductsForPage(nextPage).catch(err => console.error("Prefetch error:", err))
      }
    }
  }, [page, user?.company_id, totalPages, debouncedSearchTerm])


  const fetchData = async () => {
    try {
      setLoading(true)

      // 1. Fetch Products (from cache or DB)
      const { data: productsWithAggregatedStock, count } = await getProductsForPage(page)

      // 2. Fetch Aggregated Data (Stats & Alerts)
      // Only fetch if stats are empty to save bandwidth, or always fetch if real-time important. 
      // Keeping original logic but optimized: fetch only if needed or parallellize.
      // Let's run movements and stats in parallel with products for speed

      const statsPromise = supabase
        .from("internal_products")
        .select("id, name, code, unit_of_measure, current_stock, minimum_stock, cost_price, is_serialized")
        .eq("company_id", user?.company_id ?? "")
        .eq("is_active", true)

      const movementsPromise = supabase
        .from("internal_inventory_movements")
        .select(`
          *,
          internal_products (
            name,
            code
          ),
          internal_product_serials (
            serial_number
          )
        `)
        .eq("company_id", user?.company_id ?? "")
        .order("created_at", { ascending: false })
        .limit(10)

      const [statsResult, movementsResult] = await Promise.all([statsPromise, movementsPromise])

      if (statsResult.error) throw statsResult.error
      if (movementsResult.error) throw movementsResult.error

      const allProductsBasic = statsResult.data
      const movementsData = movementsResult.data

      const lowStockProducts = (allProductsBasic || []).filter((p) => (p.current_stock || 0) <= (p.minimum_stock || 0))
      const totalValue = (allProductsBasic || []).reduce((sum, product) => sum + (product.current_stock || 0) * (product.cost_price || 0), 0)

      setProducts(productsWithAggregatedStock || [])
      setStockAlerts(lowStockProducts as unknown as StockAlert[])
      setRecentMovements((movementsData || []) as any[])
      setTotalPages(Math.ceil((count || 0) / ITEMS_PER_PAGE))
      setTotalProductsCount(count || 0)

      setStats({
        totalProducts: count || 0,
        lowStockItems: lowStockProducts.length,
        totalValue,
        recentMovements: movementsData?.length || 0,
      })
    } catch (error) {
      console.error("Error fetching data:", error)
      toast.error("Error al cargar los datos del almacén interno")
    } finally {
      setLoading(false)
    }
  }

  // Removed client-side filteredProducts as we now filter on server
  // keeping the variable name if it was used elsewhere, but simply pointing to products since that is now the "view"
  const filteredProducts = products;

  const getMovementTypeColor = (type: string) => {
    switch (type) {
      case "entrada":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
      case "salida":
        return "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300 border-rose-200 dark:border-rose-800"
      case "ajuste":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800"
      default:
        return "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700"
    }
  }

  const getMovementIcon = (type: string) => {
    switch (type) {
      case "entrada":
        return <TrendingUp className="h-4 w-4" />
      case "salida":
        return <TrendingDown className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  if (loading && products.length === 0) {
    return (
      <div className="space-y-8 p-4 sm:p-6 lg:p-8 min-h-[calc(100vh-4rem)]">
        <div className="flex items-center gap-4 mb-8">
          <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse" />
          <div className="space-y-2">
            <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
          ))}
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
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-slate-900 via-slate-700 to-slate-600 dark:from-white dark:via-slate-200 dark:to-slate-400 bg-clip-text text-transparent flex items-center gap-3">
            <Package className="h-8 w-8 text-indigo-500" />
            Almacén Interno
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Gestión de artículos de uso interno y activos</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button asChild className="flex-1 sm:flex-none shadow-lg shadow-indigo-500/20 bg-indigo-600 hover:bg-indigo-700 text-white border-none">
            <Link href="/warehouse/internal/products/new">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Producto
            </Link>
          </Button>
          <Button variant="outline" asChild className="flex-1 sm:flex-none border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800">
            <Link href="/warehouse/internal/movements">
              <FileText className="h-4 w-4 mr-2" />
              Movimientos
            </Link>
          </Button>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-none shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-md overflow-hidden relative group hover:scale-[1.02] transition-transform duration-300">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Package className="h-16 w-16 text-indigo-500" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Productos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-800 dark:text-slate-100">{stats.totalProducts}</div>
            <p className="text-xs text-slate-500 mt-1">Modelos de productos activos</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-md overflow-hidden relative group hover:scale-[1.02] transition-transform duration-300">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <AlertTriangle className="h-16 w-16 text-amber-500" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">Stock Bajo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600 dark:text-amber-500">{stats.lowStockItems}</div>
            <p className="text-xs text-slate-500 mt-1">Modelos requieren atención</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-md overflow-hidden relative group hover:scale-[1.02] transition-transform duration-300">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <BarChart3 className="h-16 w-16 text-emerald-500" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">Valor Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-500">S/ {stats.totalValue.toFixed(2)}</div>
            <p className="text-xs text-slate-500 mt-1">Inventario valorizado</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-md overflow-hidden relative group hover:scale-[1.02] transition-transform duration-300">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <TrendingUp className="h-16 w-16 text-blue-500" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">Movimientos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-500">{stats.recentMovements}</div>
            <p className="text-xs text-slate-500 mt-1">Últimos 10 registros</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Main Content */}
      <motion.div variants={itemVariants}>
        <Tabs defaultValue="products" className="space-y-6">
          <TabsList className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <TabsTrigger value="products" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm">Productos</TabsTrigger>
            <TabsTrigger value="alerts" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm">
              Alertas de Stock
              {stockAlerts.length > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center rounded-full text-[10px]">
                  {stockAlerts.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="equipment" asChild className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm">
              <Link href="/warehouse/internal/equipment-by-department">Equipos por Departamento</Link>
            </TabsTrigger>
            <TabsTrigger value="movements" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm">Movimientos Recientes</TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  placeholder="Buscar productos por nombre o código..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 rounded-xl border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <Button variant="outline" asChild className="rounded-xl border-slate-200 dark:border-slate-700">
                <Link href="/warehouse/internal/products">
                  Ver Todos los Productos
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </div>

            {products.length > 0 && (
              <div className="flex items-center justify-between pb-4">
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  Total: {totalProductsCount} productos
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1 || loading}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300 mx-2">
                    {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages || loading}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => (
                <Card key={product.id} className="group hover:shadow-xl transition-all duration-300 border-none bg-white/80 dark:bg-slate-900/80 backdrop-blur-md overflow-hidden">
                  <div className={`h-1 w-full ${product.current_stock <= product.minimum_stock ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg font-bold text-slate-800 dark:text-slate-100 truncate" title={product.name}>{product.name}</CardTitle>
                        <CardDescription className="text-sm font-mono mt-1 text-slate-500">CODE: {product.code}</CardDescription>
                      </div>
                      {product.internal_product_categories && (
                        <Badge
                          style={{ backgroundColor: product.internal_product_categories.color }}
                          className="text-white shadow-sm shrink-0"
                        >
                          {product.internal_product_categories.name}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 pt-2">
                      <div className="flex justify-between items-center p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Stock Actual:</span>
                        <span
                          className={`font-bold ${product.current_stock <= product.minimum_stock ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
                            }`}
                        >
                          {product.current_stock} {product.unit_of_measure}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex flex-col p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                          <span className="text-xs text-slate-500">Mínimo</span>
                          <span className="font-medium text-slate-700 dark:text-slate-300">{product.minimum_stock} {product.unit_of_measure}</span>
                        </div>
                        <div className="flex flex-col p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                          <span className="text-xs text-slate-500">Costo Unit.</span>
                          <span className="font-medium text-slate-700 dark:text-slate-300">S/ {product.cost_price.toFixed(2)}</span>
                        </div>
                      </div>

                      {(product.location || product.is_serialized) && (
                        <div className="flex gap-2 pt-1">
                          {product.location && (
                            <Badge variant="outline" className="text-xs bg-slate-50 text-slate-600 border-slate-200">
                              {product.location}
                            </Badge>
                          )}
                          {product.is_serialized && (
                            <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-800">
                              Serializado
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {products.length > 0 && (
              <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  Mostrando {((page - 1) * ITEMS_PER_PAGE) + 1} a {Math.min(page * ITEMS_PER_PAGE, totalProductsCount)} de {totalProductsCount} productos
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1 || loading}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      // Logic to show pages around current page could be more complex, 
                      // for now showing simple start range or sliding window if needed, 
                      // but keeping it simple: just page numbers if few, or just current.
                      // Let's implement a simple sliding window or just Prev/Next with Page X of Y text to be safe with space
                      return null;
                    })}
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300 mx-2">
                      Página {page} de {totalPages}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages || loading}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {filteredProducts.length === 0 && (
              <div className="text-center py-16 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                <Package className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">No se encontraron productos</h3>
                <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-2">
                  Intenta con otros términos de búsqueda o agrega un nuevo producto.
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="alerts" className="space-y-4">
            {stockAlerts.length === 0 ? (
              <Card className="border-none bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <div className="bg-emerald-100 dark:bg-emerald-900/30 p-4 rounded-full mb-4">
                    <Package className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">¡Todo en orden!</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-center max-w-md">
                    No hay productos con stock por debajo del mínimo establecido.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {stockAlerts.map((product) => (
                  <Card key={product.id} className="border-l-4 border-l-amber-500 shadow-sm bg-white/80 dark:bg-slate-900/80 backdrop-blur-md overflow-hidden">
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex items-start gap-4">
                          <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg shrink-0">
                            <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-500" />
                          </div>
                          <div>
                            <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100">{product.name}</h4>
                            <p className="text-sm font-mono text-slate-500 dark:text-slate-400">COD: {product.code}</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800">
                                Stock Crítico
                              </Badge>
                              {product.is_serialized && (
                                <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                                  Serializado
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-6 w-full sm:w-auto bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
                          <div className="text-center">
                            <p className="text-xs text-slate-500 uppercase font-semibold">Actual</p>
                            <p className="text-xl font-bold text-red-600 dark:text-red-400">
                              {product.current_stock}
                            </p>
                          </div>
                          <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />
                          <div className="text-center">
                            <p className="text-xs text-slate-500 uppercase font-semibold">Mínimo</p>
                            <p className="text-xl font-bold text-slate-700 dark:text-slate-300">
                              {product.minimum_stock}
                            </p>
                          </div>
                          <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />
                          <div className="text-center">
                            <p className="text-xs text-slate-500 uppercase font-semibold">Unidad</p>
                            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                              {product.unit_of_measure}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="equipment" className="space-y-4">
            {/* Equipment data will be managed from the equipment-by-department page */}
          </TabsContent>

          <TabsContent value="movements" className="space-y-4">
            {recentMovements.length === 0 ? (
              <Card className="border-none bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-full mb-4">
                    <FileText className="h-8 w-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                    No hay movimientos recientes
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 text-center">
                    Los movimientos de inventario aparecerán aquí
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {recentMovements.map((movement) => (
                  <Card key={movement.id} className="border-none shadow-sm hover:shadow-md transition-shadow bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className={`p-3 rounded-xl shrink-0 ${getMovementTypeColor(movement.movement_type)} border`}>
                            {getMovementIcon(movement.movement_type)}
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                              {movement.internal_products?.name || 'Producto desconocido'}
                            </h4>
                            <div className="flex flex-wrap gap-2 items-center mt-1">
                              <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 font-mono text-[10px]">
                                {movement.internal_products?.code || 'N/A'}
                              </Badge>
                              {movement.internal_product_serials?.serial_number && (
                                <Badge variant="outline" className="bg-indigo-50 text-indigo-600 border-indigo-200 font-mono text-[10px]">
                                  SN: {movement.internal_product_serials.serial_number}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                              <span>{new Date(movement.movement_date).toLocaleDateString()}</span>
                              <span>•</span>
                              <span>{new Date(movement.movement_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-row sm:flex-col items-center sm:items-end gap-3 w-full sm:w-auto justify-between sm:justify-start pl-14 sm:pl-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-lg font-bold ${movement.movement_type === "salida" ? "text-rose-600 dark:text-rose-400" :
                              movement.movement_type === "entrada" ? "text-emerald-600 dark:text-emerald-400" :
                                "text-blue-600 dark:text-blue-400"
                              }`}>
                              {movement.movement_type === "salida" ? "-" : "+"}
                              {movement.quantity}
                            </span>
                            <Badge className={`capitalize shadow-none ${getMovementTypeColor(movement.movement_type)}`}>
                              {movement.movement_type}
                            </Badge>
                          </div>

                          {movement.requested_by && (
                            <div className="text-xs text-slate-500 text-right">
                              Solicitado por: <span className="font-medium text-slate-700 dark:text-slate-300">{movement.requested_by}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div >
  )
}
