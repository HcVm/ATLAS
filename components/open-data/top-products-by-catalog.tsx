"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface TopProductsByCatalogProps {
  period: string
}

interface ProductByCatalog {
  product: string
  catalog: string
  totalUnits: number
  avgPrice: number
  totalAmount: number
  orders: number
  priceRange?: {
    min: number
    max: number
  } | null
}

export function TopProductsByCatalog({ period }: TopProductsByCatalogProps) {
  const [data, setData] = useState<ProductByCatalog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/open-data/products-by-catalog?period=${period}`)
        const result = await response.json()

        if (result.success) {
          setData(result.data)
        }
      } catch (error) {
        console.error("Error loading products by catalog:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [period])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "PEN",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const formatUnits = (units: number) => {
    return new Intl.NumberFormat("es-PE").format(units)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse h-[300px] bg-slate-200 dark:bg-slate-700 rounded"></div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-16 bg-slate-200 dark:bg-slate-700 rounded"></div>
          </div>
        ))}
      </div>
    )
  }

  const chartData = data.slice(0, 10).map((item, index) => ({
    name: item.product.length > 30 ? `${item.product.substring(0, 30)}...` : item.product,
    unidades: item.totalUnits,
    precio: item.avgPrice,
  }))

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Top 10 Productos por Unidades Vendidas (Catálogo)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={12} />
              <YAxis />
              <Tooltip
                formatter={(value, name) => [
                  name === "unidades" ? formatUnits(value as number) : formatCurrency(value as number),
                  name === "unidades" ? "Unidades" : "Precio Promedio",
                ]}
              />
              <Bar dataKey="unidades" fill="#3b82f6" name="unidades" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <ScrollArea className="h-[500px]">
        <div className="space-y-3">
          {data.map((product, index) => (
            <Card key={index} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-xs">
                      #{index + 1}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {product.catalog}
                    </Badge>
                  </div>
                  <h4 className="font-medium text-sm mb-2 leading-tight">{product.product}</h4>

                  <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                    <div>
                      <span className="font-medium text-foreground text-lg">{formatUnits(product.totalUnits)}</span>
                      <p>unidades vendidas</p>
                    </div>
                    <div>
                      <span className="font-medium text-foreground">{formatCurrency(product.avgPrice)}</span>
                      <p>precio promedio</p>
                    </div>
                    <div>
                      <span className="font-medium text-foreground">{formatCurrency(product.totalAmount)}</span>
                      <p>monto total</p>
                    </div>
                    <div>
                      <span className="font-medium text-foreground">{product.orders}</span>
                      <p>órdenes</p>
                    </div>
                  </div>

                  {product.priceRange && (
                    <div className="mt-2 p-2 bg-slate-50 dark:bg-slate-800 rounded text-xs">
                      <span className="text-muted-foreground">Rango de precios: </span>
                      <span className="font-medium">
                        {formatCurrency(product.priceRange.min)} - {formatCurrency(product.priceRange.max)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
