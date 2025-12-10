"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"
import { ChevronLeft, Edit, Building2, Calendar, FileText, MapPin, TrendingDown } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface DepreciationRecord {
  id: string
  year: number
  month: number
  opening_balance: number
  depreciation_amount: number
  accumulated_depreciation: number
  closing_balance: number
  calculated_at: string
}

interface FixedAsset {
  id: string
  code: string
  name: string
  description: string | null
  acquisition_date: string
  acquisition_cost: number
  initial_balance: number
  purchases: number
  salvage_value: number
  depreciation_rate: number
  depreciation_method: string
  accumulated_depreciation: number
  book_value: number
  status: string
  current_location: string | null
  invoice_number: string | null
  supplier_ruc: string | null
  supplier_name: string | null
  fixed_asset_accounts: {
    id: string
    code: string
    name: string
    depreciation_rate: number
    useful_life_years: number
  }
  departments: { id: string; name: string } | null
  depreciation_records: DepreciationRecord[]
}

const statusLabels: Record<string, { label: string; color: string }> = {
  active: { label: "Activo", color: "bg-green-100 text-green-800" },
  retired: { label: "Retirado", color: "bg-gray-100 text-gray-800" },
  sold: { label: "Vendido", color: "bg-blue-100 text-blue-800" },
  damaged: { label: "Dañado", color: "bg-red-100 text-red-800" },
}

const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]

export default function FixedAssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const { user } = useAuth()
  const [asset, setAsset] = useState<FixedAsset | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAsset()
  }, [resolvedParams.id])

  const fetchAsset = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/fixed-assets/${resolvedParams.id}`)
      if (response.ok) {
        const data = await response.json()
        setAsset(data)
      } else {
        toast.error("Error al cargar el activo fijo")
        router.push("/warehouse/internal/fixed-assets")
      }
    } catch (error) {
      console.error("Error fetching asset:", error)
      toast.error("Error al cargar el activo fijo")
    } finally {
      setLoading(false)
    }
  }

  // Agrupar registros de depreciación por año
  const groupedRecords =
    asset?.depreciation_records?.reduce(
      (acc, record) => {
        if (!acc[record.year]) {
          acc[record.year] = []
        }
        acc[record.year].push(record)
        return acc
      },
      {} as Record<number, DepreciationRecord[]>,
    ) || {}

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Building2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!asset) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <h2 className="text-2xl font-bold">Activo no encontrado</h2>
        <Button asChild className="mt-4">
          <Link href="/warehouse/internal/fixed-assets">Volver a Activos Fijos</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 mt-10">
      <div className="flex items-center justify-between">
        <Button variant="outline" asChild>
          <Link href="/warehouse/internal/fixed-assets">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Volver a Activos Fijos
          </Link>
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/warehouse/internal/fixed-assets/edit/${asset.id}`}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Información del activo */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl">{asset.name}</CardTitle>
                <CardDescription className="font-mono">{asset.code}</CardDescription>
              </div>
              <Badge className={statusLabels[asset.status]?.color}>
                {statusLabels[asset.status]?.label || asset.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {asset.description && <p className="text-muted-foreground">{asset.description}</p>}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Cuenta Contable</p>
                    <p className="font-medium">
                      {asset.fixed_asset_accounts?.code} - {asset.fixed_asset_accounts?.name}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Fecha de Adquisición</p>
                    <p className="font-medium">
                      {format(new Date(asset.acquisition_date), "dd 'de' MMMM 'de' yyyy", { locale: es })}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Factura / Proveedor</p>
                    <p className="font-medium">{asset.invoice_number || "-"}</p>
                    <p className="text-sm text-muted-foreground">
                      {asset.supplier_name} {asset.supplier_ruc && `(${asset.supplier_ruc})`}
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Ubicación</p>
                    <p className="font-medium">{asset.current_location || "-"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Departamento</p>
                    <p className="font-medium">{asset.departments?.name || "-"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <TrendingDown className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Método de Depreciación</p>
                    <p className="font-medium">
                      {asset.depreciation_method === "linear" ? "Línea Recta" : asset.depreciation_method}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Tasa: {asset.depreciation_rate}% anual | Vida útil:{" "}
                      {asset.fixed_asset_accounts?.useful_life_years} años
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resumen de valores */}
        <Card>
          <CardHeader>
            <CardTitle>Valores Contables</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Saldos Iniciales:</span>
                <span className="font-mono">
                  S/ {(asset.initial_balance || 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Compras:</span>
                <span className="font-mono">
                  S/ {(asset.purchases || 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b bg-muted/30 px-2 rounded">
                <span className="font-medium">Costo Total:</span>
                <span className="font-mono font-bold">
                  S/ {asset.acquisition_cost.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Valor Residual:</span>
                <span className="font-mono">
                  S/ {(asset.salvage_value || 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Depre. Acumulada:</span>
                <span className="font-mono text-orange-600">
                  S/ {asset.accumulated_depreciation.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between py-2 bg-green-50 dark:bg-green-950 px-2 rounded">
                <span className="font-medium">Valor en Libros:</span>
                <span className="font-mono font-bold text-green-600">
                  S/ {asset.book_value.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Indicador de progreso de depreciación */}
            <div className="mt-6">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Progreso de Depreciación</span>
                <span className="font-medium">
                  {Math.round(
                    (asset.accumulated_depreciation / (asset.acquisition_cost - (asset.salvage_value || 0))) * 100,
                  )}
                  %
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                <div
                  className="bg-orange-500 h-2.5 rounded-full"
                  style={{
                    width: `${Math.min(100, (asset.accumulated_depreciation / (asset.acquisition_cost - (asset.salvage_value || 0))) * 100)}%`,
                  }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Historial de depreciación */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Depreciación</CardTitle>
          <CardDescription>Registro mensual de la depreciación del activo</CardDescription>
        </CardHeader>
        <CardContent>
          {Object.keys(groupedRecords).length > 0 ? (
            <div className="space-y-6">
              {Object.entries(groupedRecords)
                .sort(([a], [b]) => Number.parseInt(b) - Number.parseInt(a))
                .map(([year, records]) => {
                  const yearTotal = records.reduce((sum, r) => sum + r.depreciation_amount, 0)
                  return (
                    <div key={year}>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-lg">Año {year}</h4>
                        <Badge variant="outline">
                          Total: S/ {yearTotal.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                        </Badge>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Mes</TableHead>
                            <TableHead className="text-right">Saldo Inicial</TableHead>
                            <TableHead className="text-right">Depreciación</TableHead>
                            <TableHead className="text-right">Depre. Acumulada</TableHead>
                            <TableHead className="text-right">Saldo Final</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {records
                            .sort((a, b) => a.month - b.month)
                            .map((record) => (
                              <TableRow key={record.id}>
                                <TableCell>{MONTHS[record.month - 1]}</TableCell>
                                <TableCell className="text-right font-mono">
                                  S/ {record.opening_balance.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                                </TableCell>
                                <TableCell className="text-right font-mono text-orange-600">
                                  S/ {record.depreciation_amount.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                                </TableCell>
                                <TableCell className="text-right font-mono">
                                  S/{" "}
                                  {record.accumulated_depreciation.toLocaleString("es-PE", {
                                    minimumFractionDigits: 2,
                                  })}
                                </TableCell>
                                <TableCell className="text-right font-mono text-green-600">
                                  S/ {record.closing_balance.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>
                  )
                })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <TrendingDown className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay registros de depreciación aún.</p>
              <p className="text-sm">
                Utiliza la herramienta de cálculo de depreciación para generar los registros mensuales.
              </p>
              <Button asChild className="mt-4">
                <Link href="/warehouse/internal/fixed-assets/depreciation">Calcular Depreciación</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
