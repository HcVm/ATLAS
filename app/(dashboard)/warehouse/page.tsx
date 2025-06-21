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
import { useCompany } from "@/lib/company-context"
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
      user?.departments?.name === "Almacén" ||
      user?.departments?.name === "Contabilidad" ||
      user?.departments?.name === "Operaciones" ||
      user?.departments?.name === "Acuerdos Marco" ||
      user?.departments?.name === "Administración"

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
    user?.departments?.name === "Almacén" ||
    user?.departments?.name === "Contabilidad" ||
    user?.departments?.name === "Operaciones" ||
    user?.departments?.name === "Acuerdos Marco" ||
    user?.departments?.name === "Administración"

  // Get the company to use
  const companyToUse = user?.role === "admin" ? selectedCompany : user?.company_id ? { id: user.company_id } : null

  if (!hasWarehouseAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="space-y-6 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-700 via-slate-600 to-slate-500 bg-clip-text text-transparent">
                Almacén
              </h1>
              <p className="text-slate-600 dark:text-slate-300">Panel de control del inventario</p>
            </div>
          </div>
          <Card className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-700/50 border-slate-200/60 dark:border-slate-700/60 shadow-lg">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-600 dark:to-slate-700 rounded-full flex items-center justify-center">
                  <AlertTriangle className="h-8 w-8 text-slate-500 dark:text-slate-400" />
                </div>
                <p className="text-slate-600 dark:text-slate-300">No tienes permisos para acceder al almacén.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!companyToUse) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="space-y-6 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-700 via-slate-600 to-slate-500 bg-clip-text text-transparent">
                Almacén
              </h1>
              <p className="text-slate-600 dark:text-slate-300">Panel de control del inventario</p>
            </div>
          </div>
          <Card className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-700/50 border-slate-200/60 dark:border-slate-700/60 shadow-lg">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-600 dark:to-slate-700 rounded-full flex items-center justify-center">
                  <Package className="h-8 w-8 text-slate-500 dark:text-slate-400" />
                </div>
                <p className="text-slate-600 dark:text-slate-300">
                  {user?.role === "admin"
                    ? "Selecciona una empresa para ver su inventario."
                    : "No tienes una empresa asignada. Contacta al administrador."}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="space-y-6 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-700 via-slate-600 to-slate-500 bg-clip-text text-transparent">
                Almacén
              </h1>
              <p className="text-slate-600 dark:text-slate-300">Panel de control del inventario</p>
            </div>
            <Button disabled className="bg-slate-200 text-slate-500 dark:text-slate-400">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Producto
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Card
                key={i}
                className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-700/50 border-slate-200/60 dark:border-slate-700/60"
              >
                <CardContent className="p-6">
                  <div className="animate-pulse">
                    <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                    <div className="h-8 bg-slate-200 rounded w-1/2"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-700 via-slate-600 to-slate-500 bg-clip-text text-transparent">
              Almacén
            </h1>
            <p className="text-slate-600 dark:text-slate-300">
              Panel de control del inventario
              {user?.role === "admin" && selectedCompany && (
                <span className="ml-2 text-slate-700 dark:text-slate-200 font-medium">- {selectedCompany.name}</span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              asChild
              className="border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              <Link href="/warehouse/inventory">
                <BarChart3 className="h-4 w-4 mr-2" />
                Ver Inventario
              </Link>
            </Button>
            <Button
              asChild
              className="bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white"
            >
              <Link href="/warehouse/products/new">
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Producto
              </Link>
            </Button>
          </div>
        </div>

        {/* Estadísticas principales */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-700/50 border-slate-200/60 dark:border-slate-700/60 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-200">Total Productos</CardTitle>
              <div className="w-8 h-8 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-600 dark:to-slate-700 rounded-lg flex items-center justify-center">
                <Package className="h-4 w-4 text-slate-600 dark:text-slate-300" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stats.totalProducts}</div>
              <p className="text-xs text-slate-500 dark:text-slate-400">productos activos</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-700/50 border-slate-200/60 dark:border-slate-700/60 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-200">Valor Total</CardTitle>
              <div className="w-8 h-8 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-600 dark:to-slate-700 rounded-lg flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-slate-600 dark:text-slate-300" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                {formatCurrency(stats.totalValue)}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">valor del inventario</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-700/50 border-slate-200/60 dark:border-slate-700/60 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-200">Stock Bajo</CardTitle>
              <div className="w-8 h-8 bg-gradient-to-br from-orange-100 to-orange-200 rounded-lg flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.lowStockProducts}</div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                <Link href="/warehouse/products?filter=low-stock" className="hover:underline">
                  productos con stock bajo
                </Link>
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-700/50 border-slate-200/60 dark:border-slate-700/60 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-200">Sin Stock</CardTitle>
              <div className="w-8 h-8 bg-gradient-to-br from-red-100 to-red-200 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-red-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.outOfStockProducts}</div>
              <p className="text-xs text-slate-500 dark:text-slate-400">productos agotados</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Productos con mayor stock */}
          <Card className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-700/50 border-slate-200/60 dark:border-slate-700/60 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
                <div className="w-6 h-6 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-600 dark:to-slate-700 rounded-md flex items-center justify-center">
                  <Package className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                </div>
                Productos con Mayor Stock
              </CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-300">
                Top 5 productos por cantidad disponible
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.topProducts.length > 0 ? (
                  stats.topProducts.map((product, index) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-slate-50 to-white dark:from-slate-700 dark:to-slate-600 border-slate-200/50 dark:border-slate-600/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 text-white flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium text-slate-800 dark:text-slate-100">{product.name}</div>
                          <div className="text-sm text-slate-500 dark:text-slate-400">{product.code}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-slate-800 dark:text-slate-100">{product.current_stock}</div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">unidades</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-slate-500 dark:text-slate-400 py-8">
                    No hay productos registrados
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Movimientos recientes */}
          <Card className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-700/50 border-slate-200/60 dark:border-slate-700/60 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
                <div className="w-6 h-6 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-600 dark:to-slate-700 rounded-md flex items-center justify-center">
                  <BarChart3 className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                </div>
                Movimientos Recientes
              </CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-300">
                Últimos movimientos de inventario
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.recentMovements.length > 0 ? (
                  stats.recentMovements.map((movement) => (
                    <div
                      key={movement.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-slate-50 to-white dark:from-slate-700 dark:to-slate-600 border-slate-200/50 dark:border-slate-600/50"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            movement.movement_type === "entrada"
                              ? "bg-gradient-to-br from-green-100 to-green-200"
                              : "bg-gradient-to-br from-red-100 to-red-200"
                          }`}
                        >
                          {movement.movement_type === "entrada" ? (
                            <ArrowUpRight className="h-4 w-4 text-green-600" />
                          ) : (
                            <ArrowDownRight className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-slate-800 dark:text-slate-100">
                            {movement.products?.name || "Producto eliminado"}
                          </div>
                          <div className="text-sm text-slate-500 dark:text-slate-400">
                            {new Date(movement.movement_date).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge
                          variant={movement.movement_type === "entrada" ? "default" : "secondary"}
                          className="bg-slate-100 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600"
                        >
                          {movement.movement_type === "entrada" ? "+" : "-"}
                          {movement.quantity}
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-slate-500 dark:text-slate-400 py-8">
                    No hay movimientos registrados
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Acciones rápidas */}
        <Card className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-700/50 border-slate-200/60 dark:border-slate-700/60 shadow-lg">
          <CardHeader>
            <CardTitle className="text-slate-800 dark:text-slate-100">Acciones Rápidas</CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-300">
              Accesos directos a las funciones más utilizadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <Button
                variant="outline"
                className="h-20 flex-col gap-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-400"
                asChild
              >
                <Link href="/warehouse/products/new">
                  <div className="w-8 h-8 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-600 dark:to-slate-700 rounded-lg flex items-center justify-center">
                    <Plus className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                  </div>
                  Nuevo Producto
                </Link>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex-col gap-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-400"
                asChild
              >
                <Link href="/warehouse/inventory">
                  <div className="w-8 h-8 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-600 dark:to-slate-700 rounded-lg flex items-center justify-center">
                    <Eye className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                  </div>
                  Ver Inventario
                </Link>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex-col gap-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-400"
                asChild
              >
                <Link href="/warehouse/products?filter=low-stock">
                  <div className="w-8 h-8 bg-gradient-to-br from-orange-100 to-orange-200 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                  </div>
                  Stock Bajo
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
