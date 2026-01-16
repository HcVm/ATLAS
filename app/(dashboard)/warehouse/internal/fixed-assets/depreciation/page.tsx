"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"
import { useCompany } from "@/lib/company-context"
import {
  ChevronLeft,
  Calculator,
  Building2,
  CheckCircle,
  AlertCircle,
  FileSpreadsheet,
  Info,
  Loader2,
} from "lucide-react"
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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const itemVariants = {
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
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <Button variant="outline" asChild className="bg-white/50 backdrop-blur-sm border-gray-200">
          <Link href="/warehouse/internal/fixed-assets">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Volver a Activos Fijos
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
          Calcular Depreciación
        </h1>
        <div className="w-[100px]" /> {/* Spacer for centering */}
      </motion.div>

      {/* Configuración */}
      <motion.div variants={itemVariants}>
        <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-sm">
          <CardHeader className="bg-gray-50/50 border-b border-gray-100">
            <CardTitle className="text-lg font-bold text-gray-800">Configuración del Cálculo</CardTitle>
            <CardDescription>
              Selecciona el período y método para calcular la depreciación mensual de los activos fijos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Año</label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-[120px] bg-white/50 border-gray-200 focus:ring-blue-500/20">
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
                <label className="text-sm font-medium text-gray-700">Mes</label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-[150px] bg-white/50 border-gray-200 focus:ring-blue-500/20">
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
                <label className="text-sm font-medium text-gray-700">Cuenta (Opcional)</label>
                <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                  <SelectTrigger className="w-[250px] bg-white/50 border-gray-200 focus:ring-blue-500/20">
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
              <label className="text-sm font-medium text-gray-700">Método de Cálculo</label>
              <Select value={calculationMethod} onValueChange={setCalculationMethod}>
                <SelectTrigger className="w-full max-w-md bg-white/50 border-gray-200 focus:ring-blue-500/20">
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

            <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg">
              <Info className="h-4 w-4 text-blue-600 shrink-0" />
              <div className="text-sm text-blue-800">
                {calculationMethod === "monthly" ? (
                  <span>
                    <strong>Fórmula:</strong> Depreciación Anual ÷ 12 meses
                  </span>
                ) : (
                  <span>
                    <strong>Fórmula:</strong> Depreciación Anual ÷ {daysInSelectedYear} días ×{" "}
                    <Badge variant="secondary" className="mx-1 bg-white text-blue-800 border-blue-200">
                      {daysInSelectedMonth} días
                    </Badge>
                    ({MONTHS[Number.parseInt(selectedMonth)].label} {selectedYear})
                  </span>
                )}
              </div>
            </div>

            <Button
              onClick={handleCalculateDepreciation}
              disabled={calculating}
              className="mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md"
            >
              {calculating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
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
      </motion.div>

      {/* Información */}
      <motion.div variants={itemVariants}>
        <Alert className="bg-white/80 backdrop-blur-md border-white/20 shadow-sm">
          <FileSpreadsheet className="h-4 w-4 text-indigo-500" />
          <AlertTitle className="font-semibold text-gray-800">Métodos de Depreciación</AlertTitle>
          <AlertDescription className="space-y-2 text-gray-600">
            <p>
              <strong>Mensual (÷12):</strong> Divide la depreciación anual entre 12 meses iguales. Es el método más común
              y simplificado.
            </p>
            <p>
              <strong>Diaria (÷días):</strong> Calcula la depreciación diaria (anual ÷ 365 o 366) y la multiplica por
              los días del mes. Proporciona mayor precisión considerando meses con diferente cantidad de días.
            </p>
          </AlertDescription>
        </Alert>
      </motion.div>

      {/* Resultados */}
      {results && (
        <motion.div variants={containerVariants} className="space-y-4">
          {/* Resumen */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-sm border-l-4 border-l-green-500">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Procesados</p>
                    <p className="text-2xl font-bold text-green-600">{results.processed}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-500/20" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-sm border-l-4 border-l-red-500">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Errores</p>
                    <p className="text-2xl font-bold text-red-600">{results.errors}</p>
                  </div>
                  <AlertCircle className="h-8 w-8 text-red-500/20" />
                </div>
              </CardContent>
            </Card>
            {results.skipped > 0 && (
              <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-sm border-l-4 border-l-yellow-500">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Omitidos</p>
                      <p className="text-2xl font-bold text-yellow-600">{results.skipped}</p>
                    </div>
                    <Info className="h-8 w-8 text-yellow-500/20" />
                  </div>
                </CardContent>
              </Card>
            )}
            <Card
              className={`bg-white/80 backdrop-blur-md border-white/20 shadow-sm border-l-4 border-l-orange-500 ${results.skipped > 0 ? "" : "md:col-span-2"}`}
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Depreciación del Período</p>
                    <p className="text-2xl font-bold text-orange-600">
                      S/ {totalDepreciation.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <Calculator className="h-8 w-8 text-orange-500/20" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {results.calculation_info && (
            <motion.div variants={itemVariants}>
              <Alert className="bg-blue-50 border-blue-100 text-blue-800">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription>
                  Período: {MONTHS[results.calculation_info.month - 1]?.label} {results.calculation_info.year} | Días
                  del mes: {results.calculation_info.days_in_month} | Días del año:{" "}
                  {results.calculation_info.days_in_year}
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
            </motion.div>
          )}

          {/* Tabla de resultados */}
          {results.results && results.results.length > 0 && (
            <motion.div variants={itemVariants}>
              <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-sm overflow-hidden">
                <CardHeader className="bg-gray-50/50 border-b border-gray-100">
                  <CardTitle className="text-lg font-bold text-gray-800">Detalle de Depreciación</CardTitle>
                  <CardDescription>
                    {MONTHS[Number.parseInt(selectedMonth)].label} {selectedYear}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="font-semibold text-gray-700">Activo</TableHead>
                          <TableHead className="font-semibold text-gray-700">Método</TableHead>
                          <TableHead className="text-right font-semibold text-gray-700">Depreciación Mensual</TableHead>
                          <TableHead className="text-right font-semibold text-gray-700">Depre. Acumulada</TableHead>
                          <TableHead className="text-right font-semibold text-gray-700">Saldo Neto</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {results.results.map((result: any) => (
                          <TableRow key={result.asset_id} className="hover:bg-gray-50/50 transition-colors">
                            <TableCell className="font-medium text-gray-900">
                              {result.asset_name}
                              {result.is_first_month && (
                                <Badge variant="secondary" className="ml-2 text-xs bg-blue-100 text-blue-700">
                                  1er mes
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs border-gray-300 text-gray-600">
                                {result.calculation_method === "daily"
                                  ? result.is_first_month
                                    ? `Diario (${result.days_in_month}/${result.total_days_in_month}d)`
                                    : `Diario (${result.days_in_month}d)`
                                  : result.is_first_month
                                    ? `Mensual (${result.days_in_month}/${result.total_days_in_month}d)`
                                    : "Mensual"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono font-medium text-gray-900">
                              S/ {result.depreciation_amount.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-right font-mono text-orange-600">
                              S/ {result.accumulated_depreciation.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-right font-mono text-green-600 font-medium">
                              S/ {result.closing_balance.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-gray-50 font-bold border-t border-gray-200">
                          <TableCell>TOTAL</TableCell>
                          <TableCell />
                          <TableCell className="text-right font-mono text-gray-900">
                            S/ {totalDepreciation.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right text-gray-400">-</TableCell>
                          <TableCell className="text-right text-gray-400">-</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Activos Omitidos */}
          {results.skippedDetails && results.skippedDetails.length > 0 && (
            <motion.div variants={itemVariants}>
              <Card className="bg-white/80 backdrop-blur-md border-yellow-200 shadow-sm">
                <CardHeader className="bg-yellow-50/30 border-b border-yellow-100">
                  <CardTitle className="text-yellow-700">Activos Omitidos</CardTitle>
                  <CardDescription className="text-yellow-600/80">
                    Activos que no se depreciaron porque fueron adquiridos después del período seleccionado
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-2">
                    {results.skippedDetails.map((item: any, index: number) => (
                      <Alert key={index} className="border-yellow-200 bg-yellow-50">
                        <Info className="h-4 w-4 text-yellow-600" />
                        <AlertDescription className="text-yellow-800">
                          <strong>{item.asset_name}:</strong> {item.reason}
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Errores */}
          {results.errorDetails && results.errorDetails.length > 0 && (
            <motion.div variants={itemVariants}>
              <Card className="bg-white/80 backdrop-blur-md border-red-200 shadow-sm">
                <CardHeader className="bg-red-50/30 border-b border-red-100">
                  <CardTitle className="text-red-700">Errores en el Proceso</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-2">
                    {results.errorDetails.map((err: any, index: number) => (
                      <Alert key={index} variant="destructive" className="bg-red-50 border-red-200">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <AlertDescription className="text-red-800">
                          <strong>{err.asset_name}:</strong> {err.error}
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </motion.div>
      )}
    </motion.div>
  )
}
