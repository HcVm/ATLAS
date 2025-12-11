"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"
import { useCompany } from "@/lib/company-context"
import { ChevronLeft, Calculator, Building2, CheckCircle, AlertCircle, FileSpreadsheet, Info } from "lucide-react"
import Link from "next/link"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"

interface FixedAssetAccount {
  id: string
  code: string
  name: string
  depreciation_rate: number
}

const MONTHS = [
  { value: 1, label: "Enero", days: 31 },
  { value: 2, label: "Febrero", days: 28 },
  { value: 3, label: "Marzo", days: 31 },
  { value: 4, label: "Abril", days: 30 },
  { value: 5, label: "Mayo", days: 31 },
  { value: 6, label: "Junio", days: 30 },
  { value: 7, label: "Julio", days: 31 },
  { value: 8, label: "Agosto", days: 31 },
  { value: 9, label: "Septiembre", days: 30 },
  { value: 10, label: "Octubre", days: 31 },
  { value: 11, label: "Noviembre", days: 30 },
  { value: 12, label: "Diciembre", days: 31 },
]

const CALCULATION_METHODS = [
  {
    value: "monthly",
    label: "Mensual (÷12)",
    description: "Depreciación anual dividida entre 12 meses",
  },
  {
    value: "daily",
    label: "Diaria (÷días del mes)",
    description: "Depreciación anual ÷ días del año × días del mes",
  },
]

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

export default function DepreciationCalculatorPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { selectedCompany } = useCompany()
  const [accounts, setAccounts] = useState<FixedAssetAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [calculating, setCalculating] = useState(false)
  const [results, setResults] = useState<any>(null)

  const currentDate = new Date()
  const [selectedYear, setSelectedYear] = useState<string>(currentDate.getFullYear().toString())
  const [selectedMonth, setSelectedMonth] = useState<string>(currentDate.getMonth().toString())
  const [selectedAccount, setSelectedAccount] = useState<string>("all")
  const [calculationMethod, setCalculationMethod] = useState<string>("monthly")

  const companyId = useMemo(() => {
    return user?.role === "admin" ? selectedCompany?.id : user?.company_id
  }, [user, selectedCompany])

  const availableYears = useMemo(() => {
    const current = new Date().getFullYear()
    return Array.from({ length: 10 }, (_, i) => (current - i).toString())
  }, [])

  const daysInSelectedMonth = useMemo(() => {
    const year = Number.parseInt(selectedYear)
    const month = Number.parseInt(selectedMonth) + 1
    return getDaysInMonth(year, month)
  }, [selectedYear, selectedMonth])

  const daysInSelectedYear = useMemo(() => {
    return isLeapYear(Number.parseInt(selectedYear)) ? 366 : 365
  }, [selectedYear])

  useEffect(() => {
    if (companyId) {
      fetchAccounts()
    }
  }, [companyId])

  const fetchAccounts = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/fixed-assets/accounts?companyId=${companyId}`)
      if (response.ok) {
        const data = await response.json()
        setAccounts(data)
      }
    } catch (error) {
      console.error("Error fetching accounts:", error)
      toast.error("Error al cargar las cuentas")
    } finally {
      setLoading(false)
    }
  }

  const handleCalculateDepreciation = async () => {
    if (!companyId) {
      toast.error("No hay empresa seleccionada")
      return
    }

    setCalculating(true)
    setResults(null)

    try {
      const response = await fetch("/api/fixed-assets/depreciation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: companyId,
          year: Number.parseInt(selectedYear),
          month: Number.parseInt(selectedMonth) + 1,
          calculation_method: calculationMethod,
          account_id: selectedAccount !== "all" ? selectedAccount : null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al calcular depreciación")
      }

      setResults(data)

      if (data.processed > 0) {
        toast.success(`Depreciación calculada para ${data.processed} activo(s)`)
      }

      if (data.errors > 0) {
        toast.warning(`${data.errors} activo(s) con errores`)
      }
    } catch (error: any) {
      console.error("Error calculating depreciation:", error)
      toast.error(error.message || "Error al calcular la depreciación")
    } finally {
      setCalculating(false)
    }
  }

  const totalDepreciation = useMemo(() => {
    if (!results?.results) return 0
    return results.results.reduce((sum: number, r: any) => sum + r.depreciation_amount, 0)
  }, [results])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Building2 className="h-8 w-8 animate-spin" />
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
        <h1 className="text-3xl font-bold tracking-tight">Calcular Depreciación</h1>
        <div />
      </div>

      {/* Configuración */}
      <Card>
        <CardHeader>
          <CardTitle>Configuración del Cálculo</CardTitle>
          <CardDescription>
            Selecciona el período y método para calcular la depreciación mensual de los activos fijos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium">Año</label>
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
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Mes</label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Mes" />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((month, index) => (
                    <SelectItem key={month.value} value={index.toString()}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Cuenta (Opcional)</label>
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
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Método de Cálculo</label>
            <Select value={calculationMethod} onValueChange={setCalculationMethod}>
              <SelectTrigger className="w-full max-w-md">
                <SelectValue placeholder="Selecciona método" />
              </SelectTrigger>
              <SelectContent>
                {CALCULATION_METHODS.map((method) => (
                  <SelectItem key={method.value} value={method.value}>
                    <div className="flex flex-col">
                      <span>{method.label}</span>
                      <span className="text-xs text-muted-foreground">{method.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
            <Info className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="text-sm">
              {calculationMethod === "monthly" ? (
                <span>
                  <strong>Fórmula:</strong> Depreciación Anual ÷ 12 meses
                </span>
              ) : (
                <span>
                  <strong>Fórmula:</strong> Depreciación Anual ÷ {daysInSelectedYear} días ×{" "}
                  <Badge variant="secondary" className="mx-1">
                    {daysInSelectedMonth} días
                  </Badge>
                  ({MONTHS[Number.parseInt(selectedMonth)].label} {selectedYear})
                </span>
              )}
            </div>
          </div>

          <Button onClick={handleCalculateDepreciation} disabled={calculating} className="mt-2">
            {calculating ? (
              <>
                <Building2 className="h-4 w-4 mr-2 animate-spin" />
                Calculando...
              </>
            ) : (
              <>
                <Calculator className="h-4 w-4 mr-2" />
                Calcular Depreciación
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Información */}
      <Alert>
        <FileSpreadsheet className="h-4 w-4" />
        <AlertTitle>Métodos de Depreciación</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>
            <strong>Mensual (÷12):</strong> Divide la depreciación anual entre 12 meses iguales. Es el método más común
            y simplificado.
          </p>
          <p>
            <strong>Diaria (÷días):</strong> Calcula la depreciación diaria (anual ÷ 365 o 366) y la multiplica por los
            días del mes. Proporciona mayor precisión considerando meses con diferente cantidad de días.
          </p>
        </AlertDescription>
      </Alert>

      {/* Resultados */}
      {results && (
        <div className="space-y-4">
          {/* Resumen */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Procesados</p>
                    <p className="text-2xl font-bold text-green-600">{results.processed}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Errores</p>
                    <p className="text-2xl font-bold text-red-600">{results.errors}</p>
                  </div>
                  <AlertCircle className="h-8 w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
            {results.skipped > 0 && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Omitidos</p>
                      <p className="text-2xl font-bold text-yellow-600">{results.skipped}</p>
                    </div>
                    <Info className="h-8 w-8 text-yellow-500" />
                  </div>
                </CardContent>
              </Card>
            )}
            <Card className={results.skipped > 0 ? "" : "md:col-span-2"}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Depreciación del Período</p>
                    <p className="text-2xl font-bold text-orange-600">
                      S/ {totalDepreciation.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <Calculator className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {results.calculation_info && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Período: {MONTHS[results.calculation_info.month - 1]?.label} {results.calculation_info.year} | Días del
                mes: {results.calculation_info.days_in_month} | Días del año: {results.calculation_info.days_in_year}
                {results.calculation_info.account_filter && results.calculation_info.account_filter !== "all" && (
                  <>
                    {" "}
                    | Cuenta filtrada:{" "}
                    {accounts.find((a) => a.id === results.calculation_info.account_filter)?.code ||
                      results.calculation_info.account_filter}
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Tabla de resultados */}
          {results.results && results.results.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Detalle de Depreciación</CardTitle>
                <CardDescription>
                  {MONTHS[Number.parseInt(selectedMonth)].label} {selectedYear}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Activo</TableHead>
                      <TableHead>Método</TableHead>
                      <TableHead className="text-right">Depreciación Mensual</TableHead>
                      <TableHead className="text-right">Depre. Acumulada</TableHead>
                      <TableHead className="text-right">Saldo Neto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.results.map((result: any) => (
                      <TableRow key={result.asset_id}>
                        <TableCell className="font-medium">
                          {result.asset_name}
                          {result.is_first_month && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              1er mes
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {result.calculation_method === "daily"
                              ? result.is_first_month
                                ? `Diario (${result.days_in_month}/${result.total_days_in_month}d)`
                                : `Diario (${result.days_in_month}d)`
                              : result.is_first_month
                                ? `Mensual (${result.days_in_month}/${result.total_days_in_month}d)`
                                : "Mensual"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          S/ {result.depreciation_amount.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right font-mono text-orange-600">
                          S/ {result.accumulated_depreciation.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right font-mono text-green-600">
                          S/ {result.closing_balance.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell>TOTAL</TableCell>
                      <TableCell />
                      <TableCell className="text-right font-mono">
                        S/ {totalDepreciation.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right">-</TableCell>
                      <TableCell className="text-right">-</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Activos Omitidos */}
          {results.skippedDetails && results.skippedDetails.length > 0 && (
            <Card className="border-yellow-200">
              <CardHeader>
                <CardTitle className="text-yellow-600">Activos Omitidos</CardTitle>
                <CardDescription>
                  Activos que no se depreciaron porque fueron adquiridos después del período seleccionado
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {results.skippedDetails.map((item: any, index: number) => (
                    <Alert key={index} className="border-yellow-200 bg-yellow-50">
                      <Info className="h-4 w-4 text-yellow-600" />
                      <AlertDescription>
                        <strong>{item.asset_name}:</strong> {item.reason}
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Errores */}
          {results.errorDetails && results.errorDetails.length > 0 && (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-red-600">Errores en el Proceso</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {results.errorDetails.map((err: any, index: number) => (
                    <Alert key={index} variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>{err.asset_name}:</strong> {err.error}
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
