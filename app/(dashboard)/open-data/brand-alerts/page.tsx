"use client"

import { Suspense, useState, useCallback, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, AlertTriangle, FileDown, Loader2, Calendar, ChevronDown, ChevronsUpDown } from "lucide-react"
import Link from "next/link"
import { BrandAlertsStats } from "@/components/open-data/brand-alerts-stats"
import { BrandAlertsTable } from "@/components/open-data/brand-alerts-table"
import { BrandAlertsRepairButton } from "@/components/open-data/brand-alerts-repair-button"
import { generateBrandAlertsPDF } from "@/lib/brand-alerts-pdf-generator"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command"
import { Check } from "lucide-react"

interface ReportPDFData {
  brands: string[]
  dateRange: { start: string | null; end: string | null }
  frameworks: Record<string, { orders: any[]; totalAmount: number; totalOrders: number }>
  observationMotives?: Record<string, string>
}

const AVAILABLE_BRANDS = [
  { value: "HOPE LIFE", label: "HOPE LIFE" },
  { value: "WORLDLIFE", label: "WORLDLIFE" },
  { value: "ZEUS", label: "ZEUS" },
  { value: "VALHALLA", label: "VALHALLA" },
] as const

export default function BrandAlertsPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [activeTab, setActiveTab] = useState("all")
  const [reportData, setReportData] = useState<ReportPDFData | null>(null)
  const [loadingReport, setLoadingReport] = useState(false)
  const [totalOrders, setTotalOrders] = useState(0)

  // Filtros
  const [selectedBrands, setSelectedBrands] = useState<string[]>([])
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null })

  // Modal de motivos
  const [observationMotives, setObservationMotives] = useState<Record<string, string>>({})
  const [showObservationModal, setShowObservationModal] = useState(false)

  const handleAlertsUpdated = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1)
  }, [])

  // === CARGAR REPORTE ===
  const fetchReportData = useCallback(async () => {
    if (selectedBrands.length === 0) {
      setReportData(null)
      setTotalOrders(0)
      return
    }

    setLoadingReport(true)
    try {
      const res = await fetch("/api/brand-alerts/report-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brands: selectedBrands,
          dateRange: {
            start: dateRange.start ? format(dateRange.start, "yyyy-MM-dd") : null,
            end: dateRange.end ? format(dateRange.end, "yyyy-MM-dd") : null,
          },
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al cargar datos")

      const report = data.data || data
      setReportData(report)

      const total = Object.values(report.frameworks || {}).reduce((sum, fw) => sum + fw.totalOrders, 0)
      setTotalOrders(total)
    } catch (err: any) {
      console.error("Error al cargar reporte:", err)
      alert("Error: " + err.message)
      setReportData(null)
      setTotalOrders(0)
    } finally {
      setLoadingReport(false)
    }
  }, [selectedBrands, dateRange])

  useEffect(() => {
    if (activeTab === "report") {
      fetchReportData()
    }
  }, [activeTab, selectedBrands, dateRange, fetchReportData])

  // === ABRIR MODAL DE MOTIVOS ===
  const openObservationModal = () => {
    if (!reportData) return
    const motives: Record<string, string> = {}
    Object.values(reportData.frameworks).forEach(fw => {
      fw.orders.forEach(order => {
        if (order.alert?.status === "observed" && order.alert.id) {
          motives[order.alert.id] = ""
        }
      })
    })
    setObservationMotives(motives)
    setShowObservationModal(true)
  }

  // === GENERAR PDF CON MOTIVOS ===
  const generatePDFWithMotives = () => {
    if (!reportData) return
    setIsGeneratingPDF(true)
    try {
      generateBrandAlertsPDF({
        ...reportData,
        observationMotives
      })
    } catch (err: any) {
      alert("Error al generar PDF: " + err.message)
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  // === FUNCIÓN AUXILIAR: BUSCAR ORDEN POR ALERT ID ===
  const findOrderByAlertId = (alertId: string, data?: ReportPDFData) => {
    if (!data) return null
    for (const fw of Object.values(data.frameworks)) {
      for (const order of fw.orders) {
        if (order.alert?.id === alertId) return order
      }
    }
    return null
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Button asChild variant="outline" size="sm">
            <Link href="/open-data">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a Datos Abiertos
            </Link>
          </Button>
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-lg bg-orange-500 flex items-center justify-center text-white text-lg">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Alertas de Marca</h1>
              <p className="text-slate-600 dark:text-slate-400">
                Monitoreo de ventas de WORLDLIFE, HOPE LIFE, ZEUS y VALHALLA
              </p>
            </div>
          </div>
          <BrandAlertsRepairButton onRepairComplete={handleAlertsUpdated} />
        </div>
      </div>

      {/* Stats */}
      <BrandAlertsStats refreshTrigger={refreshTrigger} />

      {/* Gestión de Alertas */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Gestión de Alertas</span>
          </CardTitle>
          <CardDescription>
            Revisa y gestiona las alertas de marca detectadas automáticamente en los datos abiertos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all">Todas</TabsTrigger>
              <TabsTrigger value="pending">Pendientes</TabsTrigger>
              <TabsTrigger value="attended">Atendidas</TabsTrigger>
              <TabsTrigger value="observed">Observadas</TabsTrigger>
              <TabsTrigger value="report">Reporte</TabsTrigger>
            </TabsList>

            {/* === PESTAÑAS DE ALERTAS === */}
            <TabsContent value="all" className="space-y-4">
              <Suspense fallback={<div className="text-center py-4">Cargando alertas...</div>}>
                <BrandAlertsTable onAlertsUpdated={handleAlertsUpdated} refreshTrigger={refreshTrigger} />
              </Suspense>
            </TabsContent>

            <TabsContent value="pending" className="space-y-4">
              <Suspense fallback={<div className="text-center py-4">Cargando alertas pendientes...</div>}>
                <BrandAlertsTable status="pending" onAlertsUpdated={handleAlertsUpdated} refreshTrigger={refreshTrigger} />
              </Suspense>
            </TabsContent>

            <TabsContent value="attended" className="space-y-4">
              <Suspense fallback={<div className="text-center py-4">Cargando alertas atendidas...</div>}>
                <BrandAlertsTable status="attended" onAlertsUpdated={handleAlertsUpdated} refreshTrigger={refreshTrigger} />
              </Suspense>
            </TabsContent>

            <TabsContent value="observed" className="space-y-4">
              <Suspense fallback={<div className="text-center py-4">Cargando alertas observadas...</div>}>
                <BrandAlertsTable status="observed" onAlertsUpdated={handleAlertsUpdated} refreshTrigger={refreshTrigger} />
              </Suspense>
            </TabsContent>

            {/* === REPORTE CON FILTROS === */}
            <TabsContent value="report" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileDown className="h-5 w-5" />
                    Generar Reporte PDF
                  </CardTitle>
                  <CardDescription>
                    Descarga un reporte detallado por marca, filtrado por fechas
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* FILTROS */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Selector de Marcas */}
                    <div>
                      <label className="text-sm font-medium mb-2 block">Marcas</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            className="w-full justify-between"
                          >
                            {selectedBrands.length > 0
                              ? `${selectedBrands.length} marca${selectedBrands.length > 1 ? "s" : ""} seleccionada${selectedBrands.length > 1 ? "s" : ""}`
                              : "Seleccionar marcas"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0">
                          <Command>
                            <CommandInput placeholder="Buscar marca..." />
                            <CommandEmpty>No se encontró marca.</CommandEmpty>
                            <CommandGroup>
                              {AVAILABLE_BRANDS.map((brand) => (
                                <CommandItem
                                  key={brand.value}
                                  onSelect={() => {
                                    setSelectedBrands((current) =>
                                      current.includes(brand.value)
                                        ? current.filter((b) => b !== brand.value)
                                        : [...current, brand.value]
                                    )
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      selectedBrands.includes(brand.value) ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {brand.label}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Selector de Fechas */}
                    <div>
                      <label className="text-sm font-medium mb-2 block">Rango de Fechas</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !dateRange.start && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateRange.start ? (
                              dateRange.end ? (
                                <>
                                  {format(dateRange.start, "dd/MM/yyyy", { locale: es })} -{" "}
                                  {format(dateRange.end, "dd/MM/yyyy", { locale: es })}
                                </>
                              ) : (
                                format(dateRange.start, "dd/MM/yyyy", { locale: es })
                              )
                            ) : (
                              <span>Seleccionar rango</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <div className="p-3 space-y-2">
                            <div className="flex gap-2">
                              <input
                                type="date"
                                className="flex-1 rounded border p-2 text-sm"
                                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value ? new Date(e.target.value) : null })}
                              />
                              <input
                                type="date"
                                className="flex-1 rounded border p-2 text-sm"
                                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value ? new Date(e.target.value) : null })}
                              />
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full"
                              onClick={() => setDateRange({ start: null, end: null })}
                            >
                              Limpiar
                            </Button>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  {/* BOTÓN GENERAR */}
                  <Button
                    onClick={() => {
                      if (!reportData) return
                      const hasObserved = Object.values(reportData.frameworks).some(fw =>
                        fw.orders.some(o => o.alert?.status === "observed")
                      )
                      if (hasObserved) {
                        openObservationModal()
                      } else {
                        generatePDFWithMotives()
                      }
                    }}
                    disabled={!reportData || isGeneratingPDF || loadingReport}
                    className="flex items-center gap-2"
                  >
                    {isGeneratingPDF ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generando...
                      </>
                    ) : (
                      <>
                        <FileDown className="h-4 w-4" />
                        Generar PDF ({totalOrders} órdenes)
                      </>
                    )}
                  </Button>

                  {/* ESTADO */}
                  <div className="text-sm text-slate-600 space-y-1">
                    {loadingReport && (
                      <p className="flex items-center gap-2">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Cargando datos para {selectedBrands.length} marca{selectedBrands.length > 1 ? "s" : ""}...
                      </p>
                    )}
                    {!loadingReport && selectedBrands.length === 0 && (
                      <p className="text-amber-600">Selecciona al menos una marca.</p>
                    )}
                    {!loadingReport && selectedBrands.length > 0 && totalOrders === 0 && (
                      <p className="text-amber-600">No hay alertas en el rango seleccionado.</p>
                    )}
                    {!loadingReport && totalOrders > 0 && (
                      <p className="text-green-600">
                        Listo: {totalOrders} órdenes en {selectedBrands.length} marca{selectedBrands.length > 1 ? "s" : ""}.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* === MODAL DE MOTIVOS === */}
      {showObservationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Motivos de Observación</CardTitle>
              <CardDescription>
                Completa el motivo para cada alerta observada
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(observationMotives).map(([alertId, motive]) => {
                const order = findOrderByAlertId(alertId, reportData)
                return (
                  <div key={alertId} className="space-y-2 p-3 border rounded-lg">
                    <p className="font-medium text-sm">
                      Orden: <span className="text-blue-600">{order?.orden_electronica}</span>
                    </p>
                    <Textarea
                      placeholder="Escribe el motivo de la observación..."
                      value={motive}
                      onChange={(e) => setObservationMotives(prev => ({
                        ...prev,
                        [alertId]: e.target.value
                      }))}
                      rows={2}
                    />
                  </div>
                )
              })}
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowObservationModal(false)}>
                Cancelar
              </Button>
              <Button onClick={() => {
                setShowObservationModal(false)
                generatePDFWithMotives()
              }}>
                Generar PDF
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  )
}