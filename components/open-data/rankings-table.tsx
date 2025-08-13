"use client"

import { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Trophy, Medal, Award, TrendingUp, Package } from "lucide-react"
import { Button } from "@/components/ui/button"

interface RankingsTableProps {
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

export function RankingsTable({ searchParams }: RankingsTableProps) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const rankingType = searchParams.type || "productos"

  useEffect(() => {
    const loadRankings = async () => {
      setLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams()
        Object.entries(searchParams).forEach(([key, value]) => {
          if (value && value !== "all") {
            params.set(key, value)
          }
        })

        const response = await fetch(`/api/open-data/rankings?${params.toString()}`)
        const result = await response.json()

        if (result.success) {
          setData(result.data)
        } else {
          setError(result.message || "Error al cargar los rankings")
        }
      } catch (err) {
        setError("Error de conexión")
        console.error("Error loading rankings:", err)
      } finally {
        setLoading(false)
      }
    }

    loadRankings()
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

  const getRankingIcon = (ranking: number) => {
    if (ranking === 1) return <Trophy className="h-5 w-5 text-yellow-500" />
    if (ranking === 2) return <Medal className="h-5 w-5 text-gray-400" />
    if (ranking === 3) return <Award className="h-5 w-5 text-amber-600" />
    return <span className="text-sm font-medium text-muted-foreground">#{ranking}</span>
  }

  const exportToCSV = () => {
    if (data.length === 0) return

    const headers = Object.keys(data[0]).join(",")
    const rows = data
      .map((row) =>
        Object.values(row)
          .map((value) => (typeof value === "string" && value.includes(",") ? `"${value}"` : value))
          .join(","),
      )
      .join("\n")

    const csv = `${headers}\n${rows}`
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `ranking-${rankingType}-${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="animate-pulse flex items-center space-x-4 p-4">
            <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
              <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
            </div>
            <div className="w-20 h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="text-red-500 mb-4">
            <TrendingUp className="h-12 w-12 mx-auto mb-4" />
          </div>
          <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">Error al cargar rankings</h3>
          <p className="text-slate-500 dark:text-slate-400">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="text-slate-400 mb-4">
            <Package className="h-12 w-12 mx-auto mb-4" />
          </div>
          <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">No se encontraron datos</h3>
          <p className="text-slate-500 dark:text-slate-400">No hay datos que coincidan con los filtros aplicados.</p>
        </CardContent>
      </Card>
    )
  }

  const renderTableContent = () => {
    switch (rankingType) {
      case "productos":
        return (
          <>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Rank</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Marca</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead className="text-right">Monto Total</TableHead>
                <TableHead className="text-center">Órdenes</TableHead>
                <TableHead className="text-center">Entidades</TableHead>
                <TableHead className="text-center">Proveedores</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item) => (
                <TableRow key={`${item.ranking}-${item.descripcion}`}>
                  <TableCell className="font-medium">{getRankingIcon(item.ranking)}</TableCell>
                  <TableCell>
                    <div className="max-w-xs">
                      <p className="font-medium text-sm truncate" title={item.descripcion}>
                        {item.descripcion}
                      </p>
                      <p className="text-xs text-muted-foreground">{item.catalogo}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {item.marca}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{item.categoria}</span>
                  </TableCell>
                  <TableCell className="text-right font-mono">{formatNumber(item.cantidad_total)}</TableCell>
                  <TableCell className="text-right font-mono font-medium">{formatCurrency(item.monto_total)}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{formatNumber(item.numero_ordenes)}</Badge>
                  </TableCell>
                  <TableCell className="text-center">{formatNumber(item.entidades_compradoras)}</TableCell>
                  <TableCell className="text-center">{formatNumber(item.proveedores_vendedores)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </>
        )

      case "categorias":
        return (
          <>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Rank</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead className="text-right">Monto Total</TableHead>
                <TableHead className="text-center">Productos</TableHead>
                <TableHead className="text-center">Órdenes</TableHead>
                <TableHead className="text-center">Entidades</TableHead>
                <TableHead className="text-center">Proveedores</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item) => (
                <TableRow key={`${item.ranking}-${item.categoria}`}>
                  <TableCell className="font-medium">{getRankingIcon(item.ranking)}</TableCell>
                  <TableCell>
                    <div className="font-medium">{item.categoria}</div>
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium">{formatCurrency(item.monto_total)}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{formatNumber(item.productos_unicos)}</Badge>
                  </TableCell>
                  <TableCell className="text-center">{formatNumber(item.numero_ordenes)}</TableCell>
                  <TableCell className="text-center">{formatNumber(item.entidades_compradoras)}</TableCell>
                  <TableCell className="text-center">{formatNumber(item.proveedores_vendedores)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </>
        )

      case "proveedores":
        return (
          <>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Rank</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>RUC</TableHead>
                <TableHead className="text-right">Monto Total</TableHead>
                <TableHead className="text-center">Órdenes</TableHead>
                <TableHead className="text-center">Productos</TableHead>
                <TableHead className="text-center">Clientes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item) => (
                <TableRow key={`${item.ranking}-${item.ruc}`}>
                  <TableCell className="font-medium">{getRankingIcon(item.ranking)}</TableCell>
                  <TableCell>
                    <div className="max-w-xs">
                      <p className="font-medium text-sm truncate" title={item.razon_social}>
                        {item.razon_social}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">{item.ruc}</code>
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium">{formatCurrency(item.monto_total)}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{formatNumber(item.numero_ordenes)}</Badge>
                  </TableCell>
                  <TableCell className="text-center">{formatNumber(item.productos_unicos)}</TableCell>
                  <TableCell className="text-center">{formatNumber(item.entidades_clientes)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </>
        )

      default:
        return (
          <>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Rank</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead className="text-right">Monto Total</TableHead>
                <TableHead className="text-center">Órdenes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{getRankingIcon(item.ranking)}</TableCell>
                  <TableCell>{JSON.stringify(item)}</TableCell>
                  <TableCell className="text-right font-mono font-medium">
                    {formatCurrency(item.monto_total || 0)}
                  </TableCell>
                  <TableCell className="text-center">{formatNumber(item.numero_ordenes || 0)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </>
        )
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">Mostrando {data.length} resultados</div>
        <Button variant="outline" size="sm" onClick={exportToCSV}>
          Exportar CSV
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>{renderTableContent()}</Table>
      </div>
    </div>
  )
}
