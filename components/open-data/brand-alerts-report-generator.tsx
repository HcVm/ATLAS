"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "@/hooks/use-toast"
import { Download, Filter, BarChart3, AlertCircle } from "lucide-react"
import { generateBrandAlertsPDF } from "@/lib/brand-alerts-pdf-generator"

interface ReportData {
  summary: {
    totalAlerts: number
    byBrand: Record<string, number>
    byStatus: Record<string, number>
    byFrameworkAgreement: Record<string, number>
    byOrderStatus: Record<string, number>
  }
  alertsByFramework: Record<
    string,
    {
      orders: Array<{
        orden_electronica: string
        acuerdo_marco: string
        descripcion_ficha_producto: string
        marca_ficha_producto: string
        cantidad_entrega: number
        precio_unitario: number
        monto_total_entrega: number
        igv_entrega: number
        ruc_proveedor: string
        razon_social_proveedor: string
        estado_orden_electronica: string
        fecha_publicacion: string
      }>
      alerts: Array<{
        id: string
        orden_electronica: string
        status: "pending" | "attended" | "observed"
        notes: string | null
        estado_orden_electronica: string | null
      }>
      totalAmount: number
      totalItems: number
    }
  >
  details: {
    byBrand: Record<
      string,
      {
        byFrameworkAgreement: Record<
          string,
          {
            byAlertStatus: Record<
              string,
              {
                byOrderStatus: Record<string, any[]>
              }
            >
          }
        >
      }
    >
  }
}

const AVAILABLE_BRANDS = ["WORLDLIFE", "HOPELIFE", "ZEUS", "VALHALLA"]

export function BrandAlertsReportGenerator() {
  const [selectedBrands, setSelectedBrands] = useState<string[]>([])
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [loading, setLoading] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  const toggleBrand = (brand: string) => {
    setSelectedBrands((prev) => (prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]))
  }

  const handleGenerateReport = async () => {
    if (selectedBrands.length === 0) {
      toast({
        title: "Error",
        description: "Por favor selecciona al menos una marca",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/brand-alerts/report-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brands: selectedBrands,
          startDate: startDate || null,
          endDate: endDate || null,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to generate report")
      }

      const data = await response.json()
      setReportData(data)
      setShowPreview(true)

      toast({
        title: "Éxito",
        description: "Reporte generado correctamente",
      })
    } catch (error) {
      console.error("Error generating report:", error)
      toast({
        title: "Error",
        description: "No se pudo generar el reporte",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleExportReport = async () => {
    if (!reportData) return

    setExportLoading(true)
    try {
      const pdfData = {
        brands: selectedBrands,
        dateRange: {
          start: startDate || null,
          end: endDate || null,
        },
        alertsByFramework: reportData.alertsByFramework,
      }

      await generateBrandAlertsPDF(pdfData)

      toast({
        title: "Éxito",
        description: "Reporte PDF generado y descargado correctamente",
      })
    } catch (error) {
      console.error("Error exporting report:", error)
      toast({
        title: "Error",
        description: "No se pudo generar el reporte PDF",
        variant: "destructive",
      })
    } finally {
      setExportLoading(false)
    }
  }

  const getBrandBadgeColor = (brand: string) => {
    const colors = {
      WORLDLIFE: "bg-blue-500",
      HOPELIFE: "bg-green-500",
      ZEUS: "bg-purple-500",
      VALHALLA: "bg-orange-500",
    }
    return colors[brand as keyof typeof colors] || "bg-gray-500"
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Generador de Reportes en PDF
          </CardTitle>
          <CardDescription>
            Crea reportes personalizados en PDF segmentados por marca, acuerdo marco con listado completo de órdenes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Brand Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Selecciona Marcas (Una o Múltiples)</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {AVAILABLE_BRANDS.map((brand) => (
                <label key={brand} className="flex items-center space-x-2 cursor-pointer">
                  <Checkbox checked={selectedBrands.includes(brand)} onCheckedChange={() => toggleBrand(brand)} />
                  <span className={`px-2 py-1 rounded text-xs font-medium text-white ${getBrandBadgeColor(brand)}`}>
                    {brand}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Fecha Inicio (Opcional)</label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Fecha Fin (Opcional)</label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button onClick={handleGenerateReport} disabled={loading || selectedBrands.length === 0} className="flex-1">
              <Filter className="h-4 w-4 mr-2" />
              {loading ? "Generando..." : "Generar Reporte"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Vista Previa del Reporte PDF</DialogTitle>
            <DialogDescription>Resumen de órdenes por acuerdo marco - Se descargará en formato PDF</DialogDescription>
          </DialogHeader>

          {reportData && (
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Se generará un PDF con{" "}
                  {Object.values(reportData.alertsByFramework).reduce((sum, fw) => sum + fw.totalItems, 0)} órdenes de
                  compra segmentadas por acuerdo marco
                </AlertDescription>
              </Alert>

              {/* Summary by Framework */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm">Resumen por Acuerdo Marco:</h3>
                <div className="grid grid-cols-1 gap-2">
                  {Object.entries(reportData.alertsByFramework).map(([framework, data]) => (
                    <div key={framework} className="bg-slate-50 p-3 rounded-lg border">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-sm">{framework}</p>
                          <p className="text-xs text-gray-600">
                            {data.totalItems} orden{data.totalItems !== 1 ? "es" : ""}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-sm text-green-600">
                            S/ {data.totalAmount.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                          </p>
                          <p className="text-xs text-gray-600">
                            Promedio: S/{" "}
                            {(data.totalAmount / data.totalItems).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Cerrar
            </Button>
            <Button onClick={handleExportReport} disabled={exportLoading} className="bg-green-600 hover:bg-green-700">
              <Download className="h-4 w-4 mr-2" />
              {exportLoading ? "Generando PDF..." : "Descargar PDF"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
