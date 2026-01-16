"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"
import { ChevronLeft, Edit, Building2, Calendar, FileText, MapPin, TrendingDown, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { motion } from "framer-motion"

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
  active: { label: "Activo", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800" },
  retired: { label: "Retirado", color: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700" },
  sold: { label: "Vendido", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800" },
  damaged: { label: "Dañado", color: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300 border-rose-200 dark:border-rose-800" },
}

const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4 },
  },
}

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
        <Building2 className="h-8 w-8 animate-spin text-indigo-500" />
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
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-6 p-4 sm:p-6 lg:p-8 min-h-[calc(100vh-4rem)]"
    >
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <Button variant="ghost" size="sm" asChild className="pl-0 hover:bg-transparent hover:text-indigo-600 dark:hover:text-indigo-400 mb-2">
            <Link href="/warehouse/internal/fixed-assets">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a Activos Fijos
            </Link>
          </Button>
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-slate-900 via-slate-700 to-slate-600 dark:from-white dark:via-slate-200 dark:to-slate-400 bg-clip-text text-transparent">
            Detalle del Activo
          </h1>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button asChild className="flex-1 sm:flex-none shadow-lg shadow-indigo-500/20 bg-indigo-600 hover:bg-indigo-700 text-white border-none">
            <Link href={`/warehouse/internal/fixed-assets/edit/${asset.id}`}>
              <Edit className="h-4 w-4 mr-2" />
              Editar Activo
            </Link>
          </Button>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Información del activo */}
        <Card className="lg:col-span-2 border-none shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-md overflow-hidden">
          <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-2xl font-bold text-slate-800 dark:text-slate-100">{asset.name}</CardTitle>
                <CardDescription className="font-mono mt-1 text-slate-500">{asset.code}</CardDescription>
              </div>
              <Badge className={`${statusLabels[asset.status]?.color} text-sm px-3 py-1 shadow-none`}>
                {statusLabels[asset.status]?.label || asset.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-8 pt-6">
            {asset.description && (
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl text-slate-600 dark:text-slate-300 text-sm">
                {asset.description}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <div className="space-y-6">
                <div className="flex items-start gap-4 group">
                  <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl group-hover:scale-110 transition-transform duration-300">
                    <Building2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-0.5">Cuenta Contable</p>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                      {asset.fixed_asset_accounts?.code}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                       {asset.fixed_asset_accounts?.name}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4 group">
                  <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl group-hover:scale-110 transition-transform duration-300">
                    <Calendar className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-0.5">Fecha de Adquisición</p>
                    <p className="font-semibold text-slate-900 dark:text-slate-100 capitalize">
                      {format(new Date(asset.acquisition_date), "dd 'de' MMMM, yyyy", { locale: es })}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 group">
                  <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-xl group-hover:scale-110 transition-transform duration-300">
                    <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-0.5">Factura / Proveedor</p>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{asset.invoice_number || "Sin factura"}</p>
                    <div className="flex flex-col mt-0.5">
                      <span className="text-sm text-slate-600 dark:text-slate-400">{asset.supplier_name}</span>
                      {asset.supplier_ruc && <span className="text-xs font-mono text-slate-400">{asset.supplier_ruc}</span>}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-start gap-4 group">
                  <div className="p-2.5 bg-amber-50 dark:bg-amber-900/20 rounded-xl group-hover:scale-110 transition-transform duration-300">
                    <MapPin className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-0.5">Ubicación</p>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{asset.current_location || "Sin ubicación"}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 group">
                  <div className="p-2.5 bg-purple-50 dark:bg-purple-900/20 rounded-xl group-hover:scale-110 transition-transform duration-300">
                    <Building2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-0.5">Departamento</p>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{asset.departments?.name || "Sin asignar"}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 group">
                  <div className="p-2.5 bg-rose-50 dark:bg-rose-900/20 rounded-xl group-hover:scale-110 transition-transform duration-300">
                    <TrendingDown className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-0.5">Depreciación</p>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                      {asset.depreciation_method === "linear" ? "Línea Recta" : asset.depreciation_method}
                    </p>
                    <div className="flex gap-3 mt-1 text-sm text-slate-600 dark:text-slate-400">
                      <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-xs">Tasa: {asset.depreciation_rate}%</span>
                      <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-xs">Vida útil: {asset.fixed_asset_accounts?.useful_life_years} años</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resumen de valores */}
        <Card className="border-none shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-md overflow-hidden h-fit">
          <CardHeader className="bg-slate-50/50 dark:bg-slate-800/50 pb-4">
            <CardTitle className="text-lg">Valores Contables</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 pt-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800 border-dashed">
                <span className="text-sm text-slate-500 dark:text-slate-400">Saldos Iniciales</span>
                <span className="font-mono text-slate-700 dark:text-slate-200">
                  S/ {(asset.initial_balance || 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800 border-dashed">
                <span className="text-sm text-slate-500 dark:text-slate-400">Compras</span>
                <span className="font-mono text-slate-700 dark:text-slate-200">
                  S/ {(asset.purchases || 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center py-3 bg-indigo-50/50 dark:bg-indigo-900/10 px-3 rounded-lg border border-indigo-100 dark:border-indigo-800/30">
                <span className="text-sm font-semibold text-indigo-900 dark:text-indigo-100">Costo Total</span>
                <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300">
                  S/ {asset.acquisition_cost.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800 border-dashed">
                <span className="text-sm text-slate-500 dark:text-slate-400">Valor Residual</span>
                <span className="font-mono text-slate-700 dark:text-slate-200">
                  S/ {(asset.salvage_value || 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800 border-dashed">
                <span className="text-sm text-slate-500 dark:text-slate-400">Depre. Acumulada</span>
                <span className="font-mono text-amber-600 dark:text-amber-400 font-medium">
                  - S/ {asset.accumulated_depreciation.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center py-3 bg-emerald-50/50 dark:bg-emerald-900/10 px-3 rounded-lg border border-emerald-100 dark:border-emerald-800/30 mt-2">
                <span className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">Valor en Libros</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-lg">
                  S/ {asset.book_value.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Indicador de progreso de depreciación */}
            <div className="pt-2">
              <div className="flex justify-between text-xs mb-2">
                <span className="text-slate-500 font-medium">Progreso de Depreciación</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {Math.round(
                    (asset.accumulated_depreciation / (asset.acquisition_cost - (asset.salvage_value || 0))) * 100,
                  )}
                  %
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden shadow-inner">
                <div
                  className="bg-gradient-to-r from-amber-500 to-orange-600 h-full rounded-full transition-all duration-1000 ease-out"
                  style={{
                    width: `${Math.min(100, (asset.accumulated_depreciation / (asset.acquisition_cost - (asset.salvage_value || 0))) * 100)}%`,
                  }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Historial de depreciación */}
      <motion.div variants={itemVariants}>
        <Card className="border-none shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-md overflow-hidden">
          <CardHeader>
            <CardTitle>Historial de Depreciación</CardTitle>
            <CardDescription>Registro mensual de la depreciación del activo</CardDescription>
          </CardHeader>
          <CardContent>
            {Object.keys(groupedRecords).length > 0 ? (
              <div className="space-y-8">
                {Object.entries(groupedRecords)
                  .sort(([a], [b]) => Number.parseInt(b) - Number.parseInt(a))
                  .map(([year, records]) => {
                    const yearTotal = records.reduce((sum, r) => sum + r.depreciation_amount, 0)
                    return (
                      <div key={year} className="space-y-4">
                        <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-slate-400" />
                            <h4 className="font-bold text-slate-700 dark:text-slate-200">Año {year}</h4>
                          </div>
                          <Badge variant="outline" className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 font-mono">
                            Total: S/ {yearTotal.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                          </Badge>
                        </div>
                        <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                          <Table>
                            <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
                              <TableRow className="border-slate-200 dark:border-slate-800">
                                <TableHead className="w-[100px]">Mes</TableHead>
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
                                  <TableRow key={record.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 border-slate-200 dark:border-slate-800">
                                    <TableCell className="font-medium">{MONTHS[record.month - 1]}</TableCell>
                                    <TableCell className="text-right font-mono text-slate-500">
                                      S/ {record.opening_balance.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                                    </TableCell>
                                    <TableCell className="text-right font-mono text-amber-600 font-medium bg-amber-50/30 dark:bg-amber-900/10">
                                      S/ {record.depreciation_amount.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                                    </TableCell>
                                    <TableCell className="text-right font-mono text-slate-500">
                                      S/{" "}
                                      {record.accumulated_depreciation.toLocaleString("es-PE", {
                                        minimumFractionDigits: 2,
                                      })}
                                    </TableCell>
                                    <TableCell className="text-right font-mono text-emerald-600 font-medium">
                                      S/ {record.closing_balance.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                                    </TableCell>
                                  </TableRow>
                                ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )
                  })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/50">
                <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-full mb-4">
                  <TrendingDown className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">No hay registros de depreciación</h3>
                <p className="text-slate-500 dark:text-slate-400 max-w-sm mt-2 mb-6">
                  Este activo aún no tiene cálculos de depreciación registrados. Utiliza la herramienta de cálculo para generarlos.
                </p>
                <Button asChild variant="outline" className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:text-indigo-800 dark:border-indigo-800 dark:text-indigo-400 dark:hover:bg-indigo-950">
                  <Link href="/warehouse/internal/fixed-assets/depreciation">Ir a Cálculo de Depreciación</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
