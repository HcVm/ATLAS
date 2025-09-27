"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { DatePickerImproved } from "@/components/ui/date-picker-improved"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, FileSpreadsheet, FileText } from "lucide-react"
import { useCompany } from "@/lib/company-context"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { exportToExcel, exportToCSV, formatSalesDataForExport } from "@/lib/export-utils"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface SalesExportDialogProps {
  onExport?: () => void
}

export default function SalesExportDialog({ onExport }: SalesExportDialogProps) {
  const { selectedCompany } = useCompany()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [exportFormat, setExportFormat] = useState<"excel" | "csv">("excel")
  const [dateFrom, setDateFrom] = useState<Date>()
  const [dateTo, setDateTo] = useState<Date>()

  const handleExport = async () => {
    if (!selectedCompany) {
      toast.error("No hay empresa seleccionada")
      return
    }

    if (!dateFrom || !dateTo) {
      toast.error("Por favor selecciona un rango de fechas")
      return
    }

    if (dateFrom > dateTo) {
      toast.error("La fecha de inicio debe ser anterior a la fecha final")
      return
    }

    setLoading(true)

    try {
      // Construir query con filtros de fecha
      const query = supabase
        .from("sales")
        .select(`
          sale_number, sale_date, entity_name, entity_ruc, entity_executing_unit,
          quotation_code, exp_siaf, quantity, product_name, product_code,
          product_description, product_brand, ocam, physical_order,
          project_meta, final_destination, warehouse_manager, payment_method,
          unit_price_with_tax, total_sale, delivery_start_date, delivery_end_date,
          observations, sale_status, created_at,
          profiles!sales_created_by_fkey (full_name)
        `)
        .eq("company_id", selectedCompany.id)
        .gte("sale_date", format(dateFrom, "yyyy-MM-dd"))
        .lte("sale_date", format(dateTo, "yyyy-MM-dd"))
        .order("sale_date", { ascending: false })

      const { data, error } = await query

      if (error) throw error

      if (!data || data.length === 0) {
        toast.error("No se encontraron ventas en el rango de fechas seleccionado")
        return
      }

      // Formatear datos para exportación
      const formattedData = formatSalesDataForExport(data)

      // Generar nombre de archivo
      const fromStr = format(dateFrom, "yyyy-MM-dd")
      const toStr = format(dateTo, "yyyy-MM-dd")
      const filename = `ventas_${selectedCompany.name.replace(/[^a-zA-Z0-9]/g, "_")}_${fromStr}_${toStr}`

      // Exportar según el formato seleccionado
      let success = false
      if (exportFormat === "excel") {
        success = exportToExcel(formattedData, {
          filename,
          sheetName: "Ventas",
        })
      } else {
        success = exportToCSV(formattedData, {
          filename,
        })
      }

      if (success) {
        toast.success(`Archivo ${exportFormat.toUpperCase()} descargado exitosamente`)
        setOpen(false)
        onExport?.()
      } else {
        toast.error("Error al generar el archivo de exportación")
      }
    } catch (error: any) {
      console.error("Error exporting sales:", error)
      toast.error("Error al exportar las ventas: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Exportar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Exportar Ventas</DialogTitle>
          <DialogDescription>Exporta las ventas en formato Excel o CSV por rango de fechas</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Formato de exportación */}
          <div>
            <Label htmlFor="export_format">Formato de Exportación</Label>
            <Select value={exportFormat} onValueChange={(value: "excel" | "csv") => setExportFormat(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar formato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="excel">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4 text-green-600" />
                    Excel (.xlsx)
                  </div>
                </SelectItem>
                <SelectItem value="csv">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-600" />
                    CSV (.csv)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Rango de fechas */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Fecha Desde</Label>
              <DatePickerImproved date={dateFrom} setDate={setDateFrom} placeholder="Fecha inicio" />
            </div>
            <div>
              <Label>Fecha Hasta</Label>
              <DatePickerImproved date={dateTo} setDate={setDateTo} placeholder="Fecha fin" />
            </div>
          </div>

          {/* Información del rango */}
          {dateFrom && dateTo && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">
                <strong>Rango seleccionado:</strong>
                <br />
                Desde: {format(dateFrom, "dd/MM/yyyy", { locale: es })}
                <br />
                Hasta: {format(dateTo, "dd/MM/yyyy", { locale: es })}
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-2 mt-6">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleExport} disabled={loading || !dateFrom || !dateTo}>
            {loading ? "Exportando..." : "Exportar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
