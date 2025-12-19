"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { useCompany } from "@/lib/company-context"
import { toast } from "sonner"
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
        <Building2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 mt-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Activos Fijos</h1>
          <p className="text-muted-foreground">Gestión de activos fijos con depreciación - Año {selectedYear}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/warehouse/internal/fixed-assets/depreciation">
              <Calculator className="h-4 w-4 mr-2" />
              Calcular Depreciación
            </Link>
          </Button>
          <Button asChild>
            <Link href="/warehouse/internal/fixed-assets/new">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Activo
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Activos</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">{stats.active} activos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Costo Adquisición</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              S/ {stats.totalAcquisition.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">Valor total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Depre. Acumulada</CardTitle>
            <TrendingDown className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              S/ {stats.totalAccumulated.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">Total acumulado</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor en Libros</CardTitle>
            <FileSpreadsheet className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              S/ {stats.totalBookValue.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">Saldo neto</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Cuentas</CardTitle>
            <CardDescription>Categorías contables</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accounts.length}</div>
            <p className="text-xs text-muted-foreground">Categorías contables</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Busca y filtra activos fijos</CardDescription>
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
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[120px]">
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
              <SelectTrigger className="w-[250px]">
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
              <SelectTrigger className="w-[150px]">
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

      {/* Assets Table grouped by account */}
      {Object.entries(groupedByAccount).map(([accountId, { account, assets: accountAssets, totals }]) => (
        <Card key={accountId}>
          <CardHeader className="bg-muted/50">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">
                  {account?.code} - {account?.name}
                </CardTitle>
                <CardDescription>
                  {accountAssets.length} activo(s) | Tasa: {account?.depreciation_rate}% anual
                </CardDescription>
              </div>
              <div className="text-right text-sm">
                <div>
                  <span className="text-muted-foreground">Total:</span>{" "}
                  <span className="font-semibold">
                    S/ {totals.acquisitionCost.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Depre. {selectedYear}:</span>{" "}
                  <span className="font-semibold text-orange-600">
                    S/ {totals.yearlyDepreciation.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Saldo Neto:</span>{" "}
                  <span className="font-semibold text-green-600">
                    S/ {totals.bookValue.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="rounded-md border-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Fecha Adq.</TableHead>
                    <TableHead>Factura</TableHead>
                    <TableHead className="text-right">Costo</TableHead>
                    <TableHead className="text-right">% Depre.</TableHead>
                    <TableHead className="text-right">Depre. Acum.</TableHead>
                    <TableHead className="text-right">Saldo Neto</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accountAssets.map((asset) => (
                    <TableRow key={asset.id}>
                      <TableCell className="font-mono text-xs">{asset.code}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{asset.name}</div>
                          {asset.supplier_name && (
                            <div className="text-xs text-muted-foreground">{asset.supplier_name}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
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
                      <TableCell className="text-sm">{asset.invoice_number || "-"}</TableCell>
                      <TableCell className="text-right font-mono">
                        S/ {asset.acquisition_cost.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right">{asset.depreciation_rate}%</TableCell>
                      <TableCell className="text-right font-mono text-orange-600">
                        S/ {asset.accumulated_depreciation.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right font-mono text-green-600">
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
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Abrir menú</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
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
      ))}

      {filteredAssets.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No hay activos fijos</h3>
            <p className="text-muted-foreground text-center mt-2">
              Comienza agregando tu primer activo fijo para gestionar la depreciación.
            </p>
            <Button asChild className="mt-4">
              <Link href="/warehouse/internal/fixed-assets/new">
                <Plus className="h-4 w-4 mr-2" />
                Agregar Activo Fijo
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
