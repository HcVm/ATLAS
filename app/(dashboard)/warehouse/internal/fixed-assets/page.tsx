"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { useCompany } from "@/lib/company-context"
import { toast } from "sonner"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Plus,
  Search,
  Building2,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Calculator,
  FileSpreadsheet,
  TrendingDown,
  DollarSign,
  Loader2,
} from "lucide-react"
import Link from "next/link"

interface FixedAssetAccount {
  id: string
  code: string
  name: string
  depreciation_rate: number
}

interface DepreciationRecord {
  id: string
  year: number
  month: number
  depreciation_amount: number
  accumulated_depreciation: number
  closing_balance: number
}

interface FixedAsset {
  id: string
  code: string
  name: string
  description: string | null
  acquisition_date: string
  acquisition_cost: number
  depreciation_rate: number
  accumulated_depreciation: number
  book_value: number
  status: string
  current_location: string | null
  invoice_number: string | null
  supplier_name: string | null
  fixed_asset_accounts: FixedAssetAccount
  departments: { id: string; name: string } | null
  depreciation_records: DepreciationRecord[]
}

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "Activo", variant: "default" },
  retired: { label: "Retirado", variant: "secondary" },
  sold: { label: "Vendido", variant: "outline" },
  damaged: { label: "Dañado", variant: "destructive" },
}

const containerVariants: any = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const itemVariants: any = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
    },
  },
}

export default function FixedAssetsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { selectedCompany } = useCompany()
  const [assets, setAssets] = useState<FixedAsset[]>([])
  const [accounts, setAccounts] = useState<FixedAssetAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedAccount, setSelectedAccount] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString())

  const companyId = useMemo(() => {
    return user?.role === "admin" ? selectedCompany?.id : user?.company_id
  }, [user, selectedCompany])

  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear()
    return Array.from({ length: 10 }, (_, i) => (currentYear - i).toString())
  }, [])

  useEffect(() => {
    if (companyId) {
      fetchData()
    }
  }, [companyId, selectedAccount, statusFilter, selectedYear])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch accounts
      const accountsResponse = await fetch(`/api/fixed-assets/accounts?companyId=${companyId}`)
      if (accountsResponse.ok) {
        const accountsData = await accountsResponse.json()
        setAccounts(accountsData)
      }

      // Fetch assets
      let url = `/api/fixed-assets?companyId=${companyId}&year=${selectedYear}`
      if (selectedAccount !== "all") url += `&accountId=${selectedAccount}`
      if (statusFilter !== "all") url += `&status=${statusFilter}`

      const assetsResponse = await fetch(url)
      if (assetsResponse.ok) {
        const assetsData = await assetsResponse.json()
        setAssets(assetsData)
      }
    } catch (error) {
      console.error("Error fetching data:", error)
      toast.error("Error al cargar los datos")
    } finally {
      setLoading(false)
    }
  }

  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      const matchesSearch =
        asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (asset.description && asset.description.toLowerCase().includes(searchTerm.toLowerCase()))

      return matchesSearch
    })
  }, [assets, searchTerm])

  // Agrupar por cuenta contable
  const groupedByAccount = useMemo(() => {
    const grouped: Record<string, { account: FixedAssetAccount; assets: FixedAsset[]; totals: any }> = {}

    filteredAssets.forEach((asset) => {
      const accountId = asset.fixed_asset_accounts?.id || "unknown"
      if (!grouped[accountId]) {
        grouped[accountId] = {
          account: asset.fixed_asset_accounts,
          assets: [],
          totals: {
            acquisitionCost: 0,
            accumulatedDepreciation: 0,
            bookValue: 0,
            yearlyDepreciation: 0,
          },
        }
      }
      grouped[accountId].assets.push(asset)
      grouped[accountId].totals.acquisitionCost += asset.acquisition_cost || 0
      grouped[accountId].totals.accumulatedDepreciation += asset.accumulated_depreciation || 0
      grouped[accountId].totals.bookValue += asset.book_value || 0

      // Calcular depreciación del año seleccionado
      const yearRecords = asset.depreciation_records?.filter((r) => r.year === Number.parseInt(selectedYear)) || []
      const yearlyDep = yearRecords.reduce((sum, r) => sum + r.depreciation_amount, 0)
      grouped[accountId].totals.yearlyDepreciation += yearlyDep
    })

    return grouped
  }, [filteredAssets, selectedYear])

  const stats = useMemo(() => {
    const totalAcquisition = assets.reduce((sum, a) => sum + (a.acquisition_cost || 0), 0)
    const totalAccumulated = assets.reduce((sum, a) => sum + (a.accumulated_depreciation || 0), 0)
    const totalBookValue = assets.reduce((sum, a) => sum + (a.book_value || 0), 0)

    return {
      total: assets.length,
      active: assets.filter((a) => a.status === "active").length,
      totalAcquisition,
      totalAccumulated,
      totalBookValue,
    }
  }, [assets])

  const handleDelete = async (assetId: string) => {
    if (!confirm("¿Está seguro de eliminar este activo fijo?")) return

    try {
      const response = await fetch(`/api/fixed-assets/${assetId}`, { method: "DELETE" })
      if (response.ok) {
        toast.success("Activo fijo eliminado correctamente")
        fetchData()
      } else {
        const error = await response.json()
        toast.error(error.error || "Error al eliminar")
      }
    } catch (error) {
      toast.error("Error al eliminar el activo")
    }
  }

  if (!companyId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <h2 className="text-2xl font-bold">Selecciona una Empresa</h2>
        <p className="text-muted-foreground mt-2">
          Por favor, selecciona una empresa para ver y gestionar los activos fijos.
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 mt-10 w-full max-w-[95%] mx-auto"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
            Activos Fijos
          </h1>
          <p className="text-muted-foreground">Gestión de activos fijos con depreciación - Año {selectedYear}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-gray-200 dark:border-slate-700">
            <Link href="/warehouse/internal/fixed-assets/depreciation">
              <Calculator className="h-4 w-4 mr-2" />
              Calcular Depreciación
            </Link>
          </Button>
          <Button
            asChild
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md"
          >
            <Link href="/warehouse/internal/fixed-assets/new">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Activo
            </Link>
          </Button>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div variants={itemVariants} className="grid gap-4 md:grid-cols-5">
        <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-white/20 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Activos</CardTitle>
            <Building2 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">{stats.total}</div>
            <p className="text-xs text-muted-foreground">{stats.active} activos</p>
          </CardContent>
        </Card>
        <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-white/20 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Costo Adquisición</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">
              S/ {stats.totalAcquisition.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">Valor total</p>
          </CardContent>
        </Card>
        <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-white/20 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Depre. Acumulada</CardTitle>
            <TrendingDown className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              S/ {stats.totalAccumulated.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">Total acumulado</p>
          </CardContent>
        </Card>
        <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-white/20 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Valor en Libros</CardTitle>
            <FileSpreadsheet className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600">
              S/ {stats.totalBookValue.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">Saldo neto</p>
          </CardContent>
        </Card>
        <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-white/20 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cuentas</CardTitle>
            <CardDescription className="sr-only">Categorías contables</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">{accounts.length}</div>
            <p className="text-xs text-muted-foreground">Categorías contables</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants}>
        <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-white/20 dark:border-slate-800 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-800 dark:text-gray-100">Filtros</CardTitle>
            <CardDescription>Busca y filtra activos fijos para encontrar lo que necesitas.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nombre o código..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 bg-white/50 dark:bg-slate-800/50 border-gray-200 dark:border-slate-700 focus:ring-blue-500/20"
                  />
                </div>
              </div>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-[120px] bg-white/50 dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
                  <SelectValue placeholder="Año" />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map((year) => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger className="w-[250px] bg-white/50 dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
                  <SelectValue placeholder="Todas las cuentas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las cuentas</SelectItem>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.code} - {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px] bg-white/50 dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Activos</SelectItem>
                  <SelectItem value="retired">Retirados</SelectItem>
                  <SelectItem value="sold">Vendidos</SelectItem>
                  <SelectItem value="damaged">Dañados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Assets Table grouped by account */}
      <motion.div variants={containerVariants} className="space-y-6">
        {Object.entries(groupedByAccount).map(([accountId, { account, assets: accountAssets, totals }]) => (
          <motion.div key={accountId} variants={itemVariants}>
            <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-white/20 dark:border-slate-800 shadow-sm overflow-hidden">
              <CardHeader className="bg-gray-50/50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg font-bold text-gray-800 dark:text-gray-100">
                      {account?.code} - {account?.name}
                    </CardTitle>
                    <CardDescription>
                      {accountAssets.length} activo(s) | Tasa: {account?.depreciation_rate}% anual
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm bg-white/50 dark:bg-slate-800/50 p-2 rounded-lg border border-gray-100 dark:border-slate-700">
                    <div>
                      <span className="text-muted-foreground mr-1">Total:</span>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        S/ {totals.acquisitionCost.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="w-px h-4 bg-gray-200 dark:bg-slate-700 my-auto hidden sm:block"></div>
                    <div>
                      <span className="text-muted-foreground mr-1">Depre. {selectedYear}:</span>
                      <span className="font-semibold text-orange-600">
                        S/ {totals.yearlyDepreciation.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="w-px h-4 bg-gray-200 dark:bg-slate-700 my-auto hidden sm:block"></div>
                    <div>
                      <span className="text-muted-foreground mr-1">Saldo Neto:</span>
                      <span className="font-semibold text-green-600">
                        S/ {totals.bookValue.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-gray-100 dark:border-slate-800">
                        <TableHead className="w-[100px] font-semibold text-gray-700 dark:text-gray-300">Código</TableHead>
                        <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Nombre</TableHead>
                        <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Fecha Adq.</TableHead>
                        <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Factura</TableHead>
                        <TableHead className="text-right font-semibold text-gray-700 dark:text-gray-300">Costo</TableHead>
                        <TableHead className="text-right font-semibold text-gray-700 dark:text-gray-300">% Depre.</TableHead>
                        <TableHead className="text-right font-semibold text-gray-700 dark:text-gray-300">Depre. Acum.</TableHead>
                        <TableHead className="text-right font-semibold text-gray-700 dark:text-gray-300">Saldo Neto</TableHead>
                        <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Estado</TableHead>
                        <TableHead className="text-right font-semibold text-gray-700 dark:text-gray-300">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {accountAssets.map((asset) => (
                        <TableRow key={asset.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors border-gray-100 dark:border-slate-800">
                          <TableCell className="font-mono text-xs text-muted-foreground">{asset.code}</TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium text-gray-900 dark:text-gray-100">{asset.name}</div>
                              {asset.supplier_name && (
                                <div className="text-xs text-muted-foreground">{asset.supplier_name}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                            {(() => {
                              const dateStr = asset.acquisition_date
                              const [year, month, day] = dateStr.split("T")[0].split("-")
                              const localDate = new Date(
                                Number.parseInt(year),
                                Number.parseInt(month) - 1,
                                Number.parseInt(day),
                              )
                              return localDate.toLocaleDateString("es-PE", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                              })
                            })()}
                          </TableCell>
                          <TableCell className="text-sm text-gray-600 dark:text-gray-400">{asset.invoice_number || "-"}</TableCell>
                          <TableCell className="text-right font-mono text-sm text-gray-900 dark:text-gray-100">
                            S/ {asset.acquisition_cost.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right text-sm text-gray-600 dark:text-gray-400">
                            {asset.depreciation_rate}%
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm text-orange-600">
                            S/ {asset.accumulated_depreciation.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm text-green-600 font-medium">
                            S/ {asset.book_value.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusLabels[asset.status]?.variant || "default"}>
                              {statusLabels[asset.status]?.label || asset.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-slate-800">
                                  <span className="sr-only">Abrir menú</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48 bg-white/95 dark:bg-slate-900/95 border-gray-200 dark:border-slate-800">
                                <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                <DropdownMenuItem asChild>
                                  <Link href={`/warehouse/internal/fixed-assets/${asset.id}`}>
                                    <Eye className="mr-2 h-4 w-4" /> Ver Detalles
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link href={`/warehouse/internal/fixed-assets/edit/${asset.id}`}>
                                    <Edit className="mr-2 h-4 w-4" /> Editar
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(asset.id)}>
                                  <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {filteredAssets.length === 0 && (
        <motion.div variants={itemVariants}>
          <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-white/20 dark:border-slate-800 shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="bg-gray-100 dark:bg-slate-800 p-4 rounded-full mb-4">
                <Building2 className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">No hay activos fijos</h3>
              <p className="text-muted-foreground text-center mt-2 max-w-sm">
                Comienza agregando tu primer activo fijo para gestionar la depreciación y el inventario.
              </p>
              <Button
                asChild
                className="mt-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md"
              >
                <Link href="/warehouse/internal/fixed-assets/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Activo Fijo
                </Link>
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  )
}
