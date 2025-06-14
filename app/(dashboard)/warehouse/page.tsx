"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Package, TrendingUp, TrendingDown, AlertTriangle, Plus, Eye } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import Link from "next/link"
import { Skeleton } from "@/components/ui/skeleton"

interface WarehouseStats {
  totalProducts: number
  lowStockProducts: number
  totalValue: number
  recentMovements: number
}

interface Product {
  id: string
  name: string
  code: string
  current_stock: number
  minimum_stock: number
  cost_price: number
  brands?: { name: string; color: string } | null
  product_categories?: { name: string; color: string } | null
}

interface RecentMovement {
  id: string
  movement_type: string
  quantity: number
  movement_date: string
  products?: { name: string; code: string } | null
}

export default function WarehousePage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<WarehouseStats | null>(null)
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([])
  const [recentMovements, setRecentMovements] = useState<RecentMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchWarehouseData = async () => {
    if (!user?.company_id) return

    try {
      setLoading(true)
      setError(null)

      console.log("Fetching warehouse data for company:", user.company_id)

      // Obtener estadísticas de productos
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
        throw new Error(`Error al obtener productos: ${productsError.message}`)
      }

      // Calcular estadísticas
      const totalProducts = products?.length || 0
      const lowStockProductsList = products?.filter((p) => p.current_stock <= p.minimum_stock) || []
      const totalValue = products?.reduce((sum, p) => sum + p.current_stock * (p.cost_price || 0), 0) || 0

      // Obtener movimientos recientes
      const { data: movements, error: movementsError } = await supabase
        .from("inventory_movements")
        .select(`
          id,
          movement_type,
          quantity,
          movement_date,
          products!inventory_movements_product_id_fkey (name, code)
        `)
        .eq("company_id", user.company_id)
        .order("created_at", { ascending: false })
        .limit(5)

      console.log("Movements query result:", { movements, movementsError })

      if (movementsError) {
        console.error("Movements error:", movementsError)
        // No lanzar error aquí, solo log
      }

      setStats({
        totalProducts,
        lowStockProducts: lowStockProductsList.length,
        totalValue,
        recentMovements: movements?.length || 0,
      })

      setLowStockProducts(lowStockProductsList.slice(0, 5))
      setRecentMovements(movements || [])
    } catch (error: any) {
      console.error("Error fetching warehouse data:", error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.company_id) {
      fetchWarehouseData()
    } else if (user) {
      // Si el usuario no tiene company_id, mostrar error específico
      setError("Usuario sin empresa asignada")
      setLoading(false)
    }
  }, [user])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "PEN",
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-PE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-96 mt-2" />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-32 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Almacén</h1>
            <p className="text-muted-foreground">Error al cargar datos</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Error al cargar el almacén</h3>
              <p className="text-muted-foreground mb-4">{error}</p>
              <div className="space-y-2 text-sm text-left bg-muted p-4 rounded">
                <p>
                  <strong>Usuario:</strong> {user?.full_name}
                </p>
                <p>
                  <strong>Empresa ID:</strong> {user?.company_id || "No asignada"}
                </p>
                <p>
                  <strong>Rol:</strong> {user?.role}
                </p>
              </div>
              <Button onClick={() => fetchWarehouseData()} className="mt-4">
                Reintentar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Almacén</h1>
          <p className="text-muted-foreground">Gestión de inventario y productos</p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/warehouse/products/new">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Producto
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/warehouse/inventory/new">
              <Plus className="h-4 w-4 mr-2" />
              Registrar Movimiento
            </Link>
          </Button>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Productos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalProducts || 0}</div>
            <p className="text-xs text-muted-foreground">Productos activos en inventario</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Bajo</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats?.lowStockProducts || 0}</div>
            <p className="text-xs text-muted-foreground">Productos con stock mínimo</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats?.totalValue || 0)}</div>
            <p className="text-xs text-muted-foreground">Valor total del inventario</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Movimientos</CardTitle>
            <TrendingDown className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.recentMovements || 0}</div>
            <p className="text-xs text-muted-foreground">Movimientos recientes</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Productos con Stock Bajo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Productos con Stock Bajo
            </CardTitle>
            <CardDescription>Productos que requieren reposición</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {lowStockProducts.length > 0 ? (
                lowStockProducts.map((product) => (
                  <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{product.name}</h4>
                        <Badge variant="outline" className="text-xs">
                          {product.code}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {product.brands && (
                          <Badge
                            variant="secondary"
                            className="text-xs"
                            style={{ backgroundColor: `${product.brands.color}20`, color: product.brands.color }}
                          >
                            {product.brands.name}
                          </Badge>
                        )}
                        {product.product_categories && (
                          <Badge
                            variant="outline"
                            className="text-xs"
                            style={{
                              borderColor: product.product_categories.color,
                              color: product.product_categories.color,
                            }}
                          >
                            {product.product_categories.name}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-orange-600">
                        {product.current_stock} / {product.minimum_stock}
                      </div>
                      <div className="text-xs text-muted-foreground">Stock actual / mínimo</div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No hay productos con stock bajo</p>
              )}
              {lowStockProducts.length > 0 && (
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/warehouse/products?filter=low-stock">
                    <Eye className="h-4 w-4 mr-2" />
                    Ver todos los productos con stock bajo
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Movimientos Recientes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              Movimientos Recientes
            </CardTitle>
            <CardDescription>Últimos movimientos de inventario</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentMovements.length > 0 ? (
                recentMovements.map((movement) => (
                  <div key={movement.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{movement.products?.name || "Producto eliminado"}</h4>
                        <Badge variant="outline" className="text-xs">
                          {movement.products?.code}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">{formatDate(movement.movement_date)}</div>
                    </div>
                    <div className="text-right">
                      <Badge
                        variant={
                          movement.movement_type === "entrada"
                            ? "default"
                            : movement.movement_type === "salida"
                              ? "destructive"
                              : "secondary"
                        }
                        className="text-xs"
                      >
                        {movement.movement_type === "entrada" ? "+" : movement.movement_type === "salida" ? "-" : "±"}
                        {movement.quantity}
                      </Badge>
                      <div className="text-xs text-muted-foreground mt-1">{movement.movement_type}</div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No hay movimientos recientes</p>
              )}
              {recentMovements.length > 0 && (
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/warehouse/inventory">
                    <Eye className="h-4 w-4 mr-2" />
                    Ver todos los movimientos
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
