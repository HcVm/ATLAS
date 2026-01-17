"use client"

import { Suspense, useState, useCallback, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, AlertTriangle, FileDown, Loader2, Calendar, ChevronDown, ChevronsUpDown, Check } from "lucide-react"
import Link from "next/link"
import { BrandAlertsStats } from "@/components/open-data/brand-alerts-stats"
import { BrandAlertsTable } from "@/components/open-data/brand-alerts-table"
import { BrandAlertsRepairButton } from "@/components/open-data/brand-alerts-repair-button"
import { Badge } from "@/components/ui/badge"
import { generateBrandAlertsPDF } from "@/lib/brand-alerts-pdf-generator"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command"
import { motion } from "framer-motion"

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

      const total: number = Object.values(report.frameworks || {}).reduce((sum: number, fw: any) => sum + (fw.totalOrders || 0), 0)
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full p-6 space-y-8 pb-20"
    >
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Button asChild variant="ghost" size="sm" className="hover:bg-slate-100 dark:hover:bg-slate-800">
            <Link href="/open-data">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Link>
          </Button>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Alertas de Marca</h1>
              <p className="text-slate-500 dark:text-slate-400 font-medium">
                Monitoreo estratégico de ventas y competencia
              </p>
            </div>
          </div>
          <BrandAlertsRepairButton onRepairComplete={handleAlertsUpdated} />
        </div>
      </div>

      {/* Stats */}
      <div className="mb-8">
        <BrandAlertsStats refreshTrigger={refreshTrigger} />
      </div>

      {/* Gestión de Alertas */}
      <Card className="border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl shadow-sm overflow-hidden">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold text-slate-800 dark:text-slate-100">Gestión de Alertas</CardTitle>
              <CardDescription className="mt-1">
                Administra las incidencias detectadas en los acuerdos marco
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-5 bg-slate-100/50 dark:bg-slate-800/50 p-1 rounded-xl">
              <TabsTrigger value="all" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-sm transition-all">Todas</TabsTrigger>
              <TabsTrigger value="pending" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-sm transition-all text-orange-600 dark:text-orange-400">Pendientes</TabsTrigger>
              <TabsTrigger value="attended" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-sm transition-all text-green-600 dark:text-green-400">Atendidas</TabsTrigger>
              <TabsTrigger value="observed" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-sm transition-all text-blue-600 dark:text-blue-400">Observadas</TabsTrigger>
              <TabsTrigger value="report" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-sm transition-all">Reportes</TabsTrigger>
            </TabsList>

            {/* === PESTAÑAS DE ALERTAS === */}
            <div className="min-h-[400px]">
              <TabsContent value="all" className="mt-0">
                <Suspense fallback={<div className="flex items-center justify-center h-40"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>}>
                  <BrandAlertsTable onAlertsUpdated={handleAlertsUpdated} refreshTrigger={refreshTrigger} />
                </Suspense>
              </TabsContent>

              <TabsContent value="pending" className="mt-0">
                <Suspense fallback={<div className="flex items-center justify-center h-40"><Loader2 className="h-8 w-8 animate-spin text-orange-400" /></div>}>
                  <BrandAlertsTable status="pending" onAlertsUpdated={handleAlertsUpdated} refreshTrigger={refreshTrigger} />
                </Suspense>
              </TabsContent>

              <TabsContent value="attended" className="mt-0">
                <Suspense fallback={<div className="flex items-center justify-center h-40"><Loader2 className="h-8 w-8 animate-spin text-green-400" /></div>}>
                  <BrandAlertsTable status="attended" onAlertsUpdated={handleAlertsUpdated} refreshTrigger={refreshTrigger} />
                </Suspense>
              </TabsContent>

              <TabsContent value="observed" className="mt-0">
                <Suspense fallback={<div className="flex items-center justify-center h-40"><Loader2 className="h-8 w-8 animate-spin text-blue-400" /></div>}>
                  <BrandAlertsTable status="observed" onAlertsUpdated={handleAlertsUpdated} refreshTrigger={refreshTrigger} />
                </Suspense>
              </TabsContent>

              {/* === REPORTE CON FILTROS === */}
              <TabsContent value="report" className="mt-0">
                <Card className="border border-slate-200 dark:border-slate-800 shadow-none bg-slate-50/50 dark:bg-slate-900/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <FileDown className="h-5 w-5 text-indigo-500" />
                      Generador de Reportes
                    </CardTitle>
                    <CardDescription>
                      Exporta un informe detallado en PDF filtrado por marca y rango de fechas
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* FILTROS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Selector de Marcas */}
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Marcas a incluir</label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              className="w-full justify-between bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                            >
                              {selectedBrands.length > 0
                                ? `${selectedBrands.length} marca${selectedBrands.length > 1 ? "s" : ""} seleccionada${selectedBrands.length > 1 ? "s" : ""}`
                                : "Seleccionar marcas"}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0" align="start">
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
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Periodo de análisis</label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800",
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
                                <span>Seleccionar rango de fechas</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-4" align="start">
                            <div className="space-y-4">
                              <div className="grid gap-2">
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="space-y-1">
                                    <span className="text-xs text-muted-foreground">Desde</span>
                                    <input
                                      type="date"
                                      className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                      onChange={(e) => setDateRange({ ...dateRange, start: e.target.value ? new Date(e.target.value) : null })}
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <span className="text-xs text-muted-foreground">Hasta</span>
                                    <input
                                      type="date"
                                      className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                      onChange={(e) => setDateRange({ ...dateRange, end: e.target.value ? new Date(e.target.value) : null })}
                                    />
                                  </div>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full"
                                onClick={() => setDateRange({ start: null, end: null })}
                              >
                                Limpiar fechas
                              </Button>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>

                    <div className="flex flex-col items-center justify-center py-6 space-y-4 bg-white dark:bg-slate-950 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                      {/* ESTADO */}
                      <div className="text-sm text-center min-h-[24px]">
                        {loadingReport ? (
                          <p className="flex items-center gap-2 text-indigo-600">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Analizando {selectedBrands.length} marca{selectedBrands.length > 1 ? "s" : ""}...</span>
                          </p>
                        ) : selectedBrands.length === 0 ? (
                          <p className="text-slate-400">Selecciona al menos una marca para comenzar.</p>
                        ) : totalOrders === 0 ? (
                          <p className="text-amber-600 font-medium">No se encontraron alertas en el rango seleccionado.</p>
                        ) : (
                          <p className="text-emerald-600 font-medium flex items-center gap-2">
                            <Check className="h-4 w-4" />
                            Reporte listo: {totalOrders} órdenes encontradas.
                          </p>
                        )}
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
                        className="min-w-[200px] bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20"
                        size="lg"
                      >
                        {isGeneratingPDF ? (
                          <>
                            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                            Generando PDF...
                          </>
                        ) : (
                          <>
                            <FileDown className="h-5 w-5 mr-2" />
                            Descargar Reporte
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>

      {/* === MODAL DE MOTIVOS === */}
      {showObservationModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto border-0 shadow-2xl">
            <CardHeader className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-xl">Motivos de Observación</CardTitle>
              <CardDescription>
                Se han detectado alertas observadas. Por favor, detalla el motivo para incluirlo en el reporte.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              {Object.entries(observationMotives).map(([alertId, motive]) => {
                const order = findOrderByAlertId(alertId, reportData)
                return (
                  <div key={alertId} className="space-y-2 p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Orden: {order?.orden_electronica}</Badge>
                      <span className="text-xs text-slate-500">Alerta Observada</span>
                    </div>
                    <Textarea
                      placeholder="Escribe el motivo de la observación..."
                      value={motive}
                      onChange={(e) => setObservationMotives(prev => ({
                        ...prev,
                        [alertId]: e.target.value
                      }))}
                      rows={3}
                      className="resize-none bg-white dark:bg-slate-950"
                    />
                  </div>
                )
              })}
            </CardContent>
            <CardFooter className="flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-900">
              <Button variant="outline" onClick={() => setShowObservationModal(false)} className="bg-white dark:bg-slate-950">
                Cancelar
              </Button>
              <Button onClick={() => {
                setShowObservationModal(false)
                generatePDFWithMotives()
              }} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                Confirmar y Generar
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </motion.div>
  )
}
