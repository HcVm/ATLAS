"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Package, TrendingUp, TrendingDown, AlertTriangle, Search, Plus, FileText, BarChart3 } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

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
  }
  internal_product_serials: {
    serial_number: string
  } | null
}

export default function InternalWarehousePage() {
  const { user } = useAuth()
  const [products, setProducts] = useState<InternalProduct[]>([])
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([])
  const [recentMovements, setRecentMovements] = useState<RecentMovement[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalProducts: 0,
    lowStockItems: 0,
    totalValue: 0,
    recentMovements: 0,
  })

  useEffect(() => {
    if (user?.company_id) {
      fetchData()
    }
  }, [user?.company_id])

  const fetchData = async () => {
    try {
      setLoading(true)

      const { data: productsData, error: productsError } = await supabase
        .from("internal_products")
        .select(`
          *,
          internal_product_categories (
            name,
            color
          )
        `)
        .eq("company_id", user?.company_id)
        .eq("is_active", true)
        .order("name")

      if (productsError) throw productsError

      const productsWithAggregatedStock = await Promise.all(
        (productsData || []).map(async (product) => {
          if (product.is_serialized) {
            const { count, error: serialCountError } = await supabase
              .from("internal_product_serials")
              .select("id", { count: "exact", head: true })
              .eq("product_id", product.id)
              .eq("status", "in_stock")
              .eq("company_id", user?.company_id)

            if (serialCountError) {
              console.error(`Error fetching serial count for product ${product.id}:`, serialCountError)
              return { ...product, current_stock: 0 }
            }
            return { ...product, current_stock: count || 0 }
          }
          return product
        }),
      )
      const lowStockProducts = productsWithAggregatedStock?.filter((p) => p.current_stock <= p.minimum_stock) || []

      const { data: movementsData, error: movementsError } = await supabase
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
        .eq("company_id", user?.company_id)
        .order("created_at", { ascending: false })
        .limit(10)

      if (movementsError) throw movementsError

      const totalValue =
        productsWithAggregatedStock?.reduce((sum, product) => sum + product.current_stock * product.cost_price, 0) || 0

      setProducts(productsWithAggregatedStock || [])
      setStockAlerts(lowStockProducts)
      setRecentMovements(movementsData || [])
      setStats({
        totalProducts: productsWithAggregatedStock?.length || 0,
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

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.code.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const getMovementTypeColor = (type: string) => {
    switch (type) {
      case "entrada":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      case "salida":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      case "ajuste":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
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

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Almacén Interno</h1>
          <p className="text-gray-600 dark:text-gray-400">Gestión de artículos de uso interno</p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/warehouse/internal/products/new">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Producto
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/warehouse/internal/movements">
              <FileText className="h-4 w-4 mr-2" />
              Movimientos
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Productos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
            <p className="text-xs text-muted-foreground">Modelos de productos activos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Bajo</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.lowStockItems}</div>
            <p className="text-xs text-muted-foreground">Modelos requieren atención</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">S/ {stats.totalValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Inventario valorizado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Movimientos</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.recentMovements}</div>
            <p className="text-xs text-muted-foreground">Últimos 10 registros</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="products" className="space-y-6">
        <TabsList>
          <TabsTrigger value="products">Productos</TabsTrigger>
          <TabsTrigger value="alerts">
            Alertas de Stock
            {stockAlerts.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {stockAlerts.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="movements">Movimientos Recientes</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar productos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" asChild>
              <Link href="/warehouse/internal/products">Ver Todos los Productos</Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProducts.slice(0, 9).map((product) => (
              <Card key={product.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{product.name}</CardTitle>
                      <CardDescription className="text-sm">Código: {product.code}</CardDescription>
                    </div>
                    {product.internal_product_categories && (
                      <Badge
                        style={{ backgroundColor: product.internal_product_categories.color }}
                        className="text-white"
                      >
                        {product.internal_product_categories.name}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Stock:</span>
                      <span
                        className={`font-semibold ${
                          product.current_stock <= product.minimum_stock ? "text-red-600" : "text-green-600"
                        }`}
                      >
                        {product.current_stock} {product.unit_of_measure}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Mínimo:</span>
                      <span className="text-sm">
                        {product.minimum_stock} {product.unit_of_measure}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Costo:</span>
                      <span className="text-sm font-medium">S/ {product.cost_price.toFixed(2)}</span>
                    </div>
                    {product.location && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Ubicación:</span>
                        <span className="text-sm">{product.location}</span>
                      </div>
                    )}
                    {product.is_serialized && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Tipo:</span>
                        <Badge variant="outline" className="text-xs">
                          Serializado
                        </Badge>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredProducts.length > 9 && (
            <div className="text-center">
              <Button variant="outline" asChild>
                <Link href="/warehouse/internal/products">Ver todos los productos ({filteredProducts.length})</Link>
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          {stockAlerts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Package className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">No hay alertas de stock</h3>
                <p className="text-gray-600 dark:text-gray-400 text-center">
                  Todos los productos tienen stock suficiente
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {stockAlerts.map((product) => (
                <Card key={product.id} className="border-l-4 border-l-red-500">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100">{product.name}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Código: {product.code}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-red-600">
                          {product.current_stock} {product.unit_of_measure}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Mínimo: {product.minimum_stock}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="movements" className="space-y-4">
          {recentMovements.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  No hay movimientos recientes
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-center">
                  Los movimientos de inventario aparecerán aquí
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {recentMovements.map((movement) => (
                <Card key={movement.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${getMovementTypeColor(movement.movement_type)}`}>
                          {getMovementIcon(movement.movement_type)}
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                            {movement.internal_products.name}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Código: {movement.internal_products.code}
                            {movement.internal_product_serials?.serial_number && (
                              <span className="ml-2 text-xs text-muted-foreground">
                                (SN: {movement.internal_product_serials.serial_number})
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <Badge className={getMovementTypeColor(movement.movement_type)}>
                            {movement.movement_type.toUpperCase()}
                          </Badge>
                          <span className="font-semibold">
                            {movement.movement_type === "salida" ? "-" : "+"}
                            {movement.quantity}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {new Date(movement.movement_date).toLocaleDateString()}
                        </div>
                        {movement.requested_by && (
                          <div className="text-xs text-gray-500">Solicitado por: {movement.requested_by}</div>
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
    </div>
  )
}
