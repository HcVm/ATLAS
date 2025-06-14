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
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import Link from "next/link"

interface WarehouseStats {
  totalProducts: number
  totalValue: number
  lowStockProducts: number
  outOfStockProducts: number
  totalMovements: number
  recentMovements: any[]
  topProducts: any[]
}

export default function WarehousePage() {
  const { user } = useAuth()
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
    if (user?.company_id) {
      fetchWarehouseData()
    }
  }, [user?.company_id])

  const fetchWarehouseData = async () => {
    if (!user?.company_id) return

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
        .eq("company_id", user.company_id)
        .eq("is_active", true)

      console.log("Products query result:", { products, productsError })

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
        .eq("company_id", user.company_id)
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Almacén</h1>
            <p className="text-muted-foreground">Panel de control del inventario</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Almacén</h1>
          <p className="text-muted-foreground">Panel de control del inventario</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/warehouse/inventory">
              <BarChart3 className="h-4 w-4 mr-2" />
              Ver Inventario
            </Link>
          </Button>
          <Button asChild>
            <Link href="/warehouse/products/new">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Producto
            </Link>
          </Button>
        </div>
      </div>

      {/* Estadísticas principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Productos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
            <p className="text-xs text-muted-foreground">productos activos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</div>
            <p className="text-xs text-muted-foreground">valor del inventario</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Bajo</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.lowStockProducts}</div>
            <p className="text-xs text-muted-foreground">
              <Link href="/warehouse/products?filter=low-stock" className="hover:underline">
                productos con stock bajo
              </Link>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sin Stock</CardTitle>
            <TrendingUp className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.outOfStockProducts}</div>
            <p className="text-xs text-muted-foreground">productos agotados</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Productos con mayor stock */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Productos con Mayor Stock
            </CardTitle>
            <CardDescription>Top 5 productos por cantidad disponible</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.topProducts.length > 0 ? (
                stats.topProducts.map((product, index) => (
                  <div key={product.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium">{product.name}</div>
                        <div className="text-sm text-muted-foreground">{product.code}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{product.current_stock}</div>
                      <div className="text-sm text-muted-foreground">unidades</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted-foreground py-4">No hay productos registrados</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Movimientos recientes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Movimientos Recientes
            </CardTitle>
            <CardDescription>Últimos movimientos de inventario</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recentMovements.length > 0 ? (
                stats.recentMovements.map((movement) => (
                  <div key={movement.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          movement.movement_type === "entrada"
                            ? "bg-green-100 text-green-600"
                            : "bg-red-100 text-red-600"
                        }`}
                      >
                        {movement.movement_type === "entrada" ? (
                          <ArrowUpRight className="h-4 w-4" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium">{movement.products?.name || "Producto eliminado"}</div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(movement.movement_date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={movement.movement_type === "entrada" ? "default" : "secondary"}>
                        {movement.movement_type === "entrada" ? "+" : "-"}
                        {movement.quantity}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted-foreground py-4">No hay movimientos registrados</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Acciones rápidas */}
      <Card>
        <CardHeader>
          <CardTitle>Acciones Rápidas</CardTitle>
          <CardDescription>Accesos directos a las funciones más utilizadas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Button variant="outline" className="h-20 flex-col gap-2" asChild>
              <Link href="/warehouse/products/new">
                <Plus className="h-6 w-6" />
                Nuevo Producto
              </Link>
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2" asChild>
              <Link href="/warehouse/inventory">
                <Eye className="h-6 w-6" />
                Ver Inventario
              </Link>
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2" asChild>
              <Link href="/warehouse/products?filter=low-stock">
                <AlertTriangle className="h-6 w-6" />
                Stock Bajo
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
