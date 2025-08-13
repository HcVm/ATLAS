"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, Building2, DollarSign, ShoppingCart } from "lucide-react"

interface RankingsStatsProps {
  searchParams: {
    type?: string
    acuerdo?: string
    categoria?: string
    catalogo?: string
    fecha_desde?: string
    fecha_hasta?: string
    limit?: string
  }
}

export function RankingsStats({ searchParams }: RankingsStatsProps) {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadStats = async () => {
      setLoading(true)

      try {
        const params = new URLSearchParams()
        Object.entries(searchParams).forEach(([key, value]) => {
          if (value && value !== "all") {
            params.set(key, value)
          }
        })
        params.set("limit", "1000") // Get more data for stats

        const response = await fetch(`/api/open-data/rankings?${params.toString()}`)
        const result = await response.json()

        if (result.success && result.data.length > 0) {
          const data = result.data

          // Calculate aggregate stats
          const totalMonto = data.reduce((sum: number, item: any) => sum + (item.monto_total || 0), 0)
          const totalOrdenes = data.reduce((sum: number, item: any) => sum + (item.numero_ordenes || 0), 0)
          const avgMonto = totalMonto / data.length

          // Get unique counts based on ranking type
          let uniqueEntities = 0
          let uniqueSuppliers = 0
          let uniqueProducts = 0

          if (searchParams.type === "productos") {
            uniqueEntities = data.reduce((sum: number, item: any) => sum + (item.entidades_compradoras || 0), 0)
            uniqueSuppliers = data.reduce((sum: number, item: any) => sum + (item.proveedores_vendedores || 0), 0)
            uniqueProducts = data.length
          } else if (searchParams.type === "proveedores") {
            uniqueSuppliers = data.length
            uniqueEntities = data.reduce((sum: number, item: any) => sum + (item.entidades_clientes || 0), 0)
            uniqueProducts = data.reduce((sum: number, item: any) => sum + (item.productos_unicos || 0), 0)
          } else {
            uniqueEntities = data.reduce((sum: number, item: any) => sum + (item.entidades_compradoras || 0), 0)
            uniqueSuppliers = data.reduce((sum: number, item: any) => sum + (item.proveedores_vendedores || 0), 0)
            uniqueProducts = data.reduce((sum: number, item: any) => sum + (item.productos_unicos || 0), 0)
          }

          setStats({
            totalMonto,
            totalOrdenes,
            avgMonto,
            uniqueEntities,
            uniqueSuppliers,
            uniqueProducts,
            topItem: data[0],
          })
        }
      } catch (error) {
        console.error("Error loading stats:", error)
      } finally {
        setLoading(false)
      }
    }

    loadStats()
  }, [searchParams])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "PEN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("es-PE").format(num)
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!stats) {
    return null
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Monto Total</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(stats.totalMonto)}</div>
          <p className="text-xs text-muted-foreground">Promedio: {formatCurrency(stats.avgMonto)}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Órdenes</CardTitle>
          <ShoppingCart className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatNumber(stats.totalOrdenes)}</div>
          <p className="text-xs text-muted-foreground">Órdenes de compra procesadas</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Entidades</CardTitle>
          <Building2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatNumber(stats.uniqueEntities)}</div>
          <p className="text-xs text-muted-foreground">Entidades participantes</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {searchParams.type === "productos"
              ? "Productos"
              : searchParams.type === "proveedores"
                ? "Proveedores"
                : "Items"}
          </CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {searchParams.type === "productos"
              ? formatNumber(stats.uniqueProducts)
              : searchParams.type === "proveedores"
                ? formatNumber(stats.uniqueSuppliers)
                : formatNumber(stats.uniqueProducts)}
          </div>
          <p className="text-xs text-muted-foreground">
            {searchParams.type === "productos"
              ? "Productos únicos"
              : searchParams.type === "proveedores"
                ? "Proveedores únicos"
                : "Items únicos"}
          </p>

        </CardContent>
      </Card>
    </div>
  )
}
