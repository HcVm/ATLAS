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
import { ChevronLeft, Calculator, Building2, CheckCircle, AlertCircle, FileSpreadsheet } from "lucide-react"
import Link from "next/link"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface FixedAssetAccount {
  id: string
  code: string
  name: string
  depreciation_rate: number
}

const MONTHS = [
  { value: 1, label: "Enero" },
  { value: 2, label: "Febrero" },
  { value: 3, label: "Marzo" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Mayo" },
  { value: 6, label: "Junio" },
  { value: 7, label: "Julio" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Septiembre" },
  { value: 10, label: "Octubre" },
  { value: 11, label: "Noviembre" },
  { value: 12, label: "Diciembre" },
]

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

  const companyId = useMemo(() => {
    return user?.role === "admin" ? selectedCompany?.id : user?.company_id
  }, [user, selectedCompany])

  const availableYears = useMemo(() => {
    const current = new Date().getFullYear()
    return Array.from({ length: 10 }, (_, i) => (current - i).toString())
  }, [])

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
          month: Number.parseInt(selectedMonth) + 1, // Ajustar porque el select usa índice 0-11
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
            Selecciona el período para calcular la depreciación mensual de los activos fijos
          </CardDescription>
        </CardHeader>
        <CardContent>
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
            <Button onClick={handleCalculateDepreciation} disabled={calculating}>
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
          </div>
        </CardContent>
      </Card>

      {/* Información */}
      <Alert>
        <FileSpreadsheet className="h-4 w-4" />
        <AlertTitle>Método de Depreciación</AlertTitle>
        <AlertDescription>
          Se utiliza el método de depreciación lineal según la normativa peruana. La depreciación mensual se calcula
          dividiendo la depreciación anual entre 12 meses. Los activos que ya han alcanzado su depreciación total no
          generarán más registros.
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
            <Card className="md:col-span-2">
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
                      <TableHead className="text-right">Depreciación Mensual</TableHead>
                      <TableHead className="text-right">Depre. Acumulada</TableHead>
                      <TableHead className="text-right">Saldo Neto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.results.map((result: any) => (
                      <TableRow key={result.asset_id}>
                        <TableCell className="font-medium">{result.asset_name}</TableCell>
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
