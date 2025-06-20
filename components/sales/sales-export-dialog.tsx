"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Download, FileSpreadsheet, FileText } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase"
import { useCompany } from "@/lib/company-context"
import { type ExportOptions, type SaleExportData, generateCSVData, downloadFile } from "@/lib/export-utils"

interface SalesExportDialogProps {
  children?: React.ReactNode
}

export function SalesExportDialog({ children }: SalesExportDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [options, setOptions] = useState<ExportOptions>({
    format: "excel",
    includeDetails: true,
  })

  const { currentCompany } = useCompany()

  const handleExport = async () => {
    if (!currentCompany) {
      toast.error("No hay empresa seleccionada")
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()

      // Construir query con filtros
      let query = supabase
        .from("sales")
        .select(`
          *,
          quotations!left(quotation_number),
          profiles!inner(full_name)
        `)
        .eq("company_id", currentCompany.id)

      // Aplicar filtros de fecha
      if (options.startDate) {
        query = query.gte("sale_date", options.startDate)
      }
      if (options.endDate) {
        query = query.lte("sale_date", options.endDate)
      }

      const { data: sales, error } = await query.order("sale_date", { ascending: false })

      if (error) throw error

      if (!sales || sales.length === 0) {
        toast.error("No hay datos para exportar")
        return
      }

      // Transformar datos para exportación
      const exportData: SaleExportData[] = sales.map((sale) => ({
        sale_number: sale.sale_number || "N/A",
        entity_name: sale.entity_name,
        sale_date: sale.sale_date,
        product_name: sale.product_name,
        quantity: sale.quantity,
        unit_price: sale.unit_price,
        total_amount: sale.total_amount,
        status: sale.status,
        quotation_number: sale.quotations?.quotation_number,
        created_by: sale.profiles?.full_name || "N/A",
      }))

      // Generar archivo según formato
      const timestamp = new Date().toISOString().split("T")[0]

      if (options.format === "excel") {
        // Para Excel necesitarías una librería como xlsx
        // Por ahora exportamos como CSV con extensión .xlsx
        const csvContent = generateCSVData(exportData)
        downloadFile(csvContent, `ventas_${timestamp}.csv`, "text/csv")
        toast.success("Archivo CSV exportado exitosamente")
      } else {
        const csvContent = generateCSVData(exportData)
        downloadFile(csvContent, `ventas_${timestamp}.csv`, "text/csv")
        toast.success("Archivo CSV exportado exitosamente")
      }

      setOpen(false)
    } catch (error) {
      console.error("Error al exportar:", error)
      toast.error("Error al exportar los datos")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Exportar Ventas
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Rango de fechas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Fecha inicio</Label>
              <Input
                id="startDate"
                type="date"
                value={options.startDate || ""}
                onChange={(e) => setOptions((prev) => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Fecha fin</Label>
              <Input
                id="endDate"
                type="date"
                value={options.endDate || ""}
                onChange={(e) => setOptions((prev) => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
          </div>

          {/* Formato */}
          <div className="space-y-2">
            <Label>Formato de exportación</Label>
            <Select
              value={options.format}
              onValueChange={(value: "excel" | "csv") => setOptions((prev) => ({ ...prev, format: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="excel">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    Excel (.xlsx)
                  </div>
                </SelectItem>
                <SelectItem value="csv">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    CSV (.csv)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Opciones adicionales */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="includeDetails"
              checked={options.includeDetails}
              onCheckedChange={(checked) => setOptions((prev) => ({ ...prev, includeDetails: !!checked }))}
            />
            <Label htmlFor="includeDetails" className="text-sm">
              Incluir detalles completos
            </Label>
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={handleExport} disabled={loading}>
              {loading ? (
                "Exportando..."
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
