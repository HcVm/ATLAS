import { supabase } from "@/lib/supabase"
import * as XLSX from "xlsx"

// Utility functions for exporting data from Supabase.

export interface ExportData {
  [key: string]: any
}

export interface ExportOptions {
  filename: string
  sheetName?: string
  headers?: { [key: string]: string }
}

/**
 * Fetches all rows from a given Supabase table.
 *
 * @param tableName The name of the table to fetch data from.
 * @returns A promise that resolves to an array of objects representing the table data, or null if an error occurs.
 */
export async function getAllRows(tableName: string): Promise<any[] | null> {
  try {
    const { data, error } = await supabase.from(tableName).select("*")

    if (error) {
      console.error(`Error fetching data from ${tableName}:`, error)
      return null
    }

    return data
  } catch (error) {
    console.error(`Unexpected error fetching data from ${tableName}:`, error)
    return null
  }
}

/**
 * Exports data from a Supabase table to a JSON string.
 *
 * @param tableName The name of the table to export data from.
 * @returns A promise that resolves to a JSON string representing the table data, or null if an error occurs.
 */
export async function exportToJson(tableName: string): Promise<string | null> {
  try {
    const data = await getAllRows(tableName)

    if (!data) {
      return null
    }

    return JSON.stringify(data, null, 2) // Use 2 spaces for indentation
  } catch (error) {
    console.error(`Error exporting data from ${tableName} to JSON:`, error)
    return null
  }
}

/**
 * Exports data from a Supabase table to a CSV string.
 *
 * @param tableName The name of the table to export data from.
 * @returns A promise that resolves to a CSV string representing the table data, or null if an error occurs.
 */
export async function exportToCsv(tableName: string): Promise<string | null> {
  try {
    const data = await getAllRows(tableName)

    if (!data || data.length === 0) {
      return null
    }

    const headers = Object.keys(data[0])
    const csvRows = [headers.join(",")]

    for (const row of data) {
      const values = headers.map((header) => {
        let value = row[header]
        if (typeof value === "string") {
          value = value.replace(/"/g, '""') // Escape double quotes
          return `"${value}"` // Enclose in double quotes
        }
        return value
      })
      csvRows.push(values.join(","))
    }

    return csvRows.join("\n")
  } catch (error) {
    console.error(`Error exporting data from ${tableName} to CSV:`, error)
    return null
  }
}

export const exportToExcel = (data: ExportData[], options: ExportOptions) => {
  try {
    // Crear un nuevo workbook
    const wb = XLSX.utils.book_new()

    // Aplicar headers personalizados si se proporcionan
    let processedData = data
    if (options.headers) {
      processedData = data.map((row) => {
        const newRow: any = {}
        Object.keys(row).forEach((key) => {
          const headerKey = options.headers![key] || key
          newRow[headerKey] = row[key]
        })
        return newRow
      })
    }

    // Crear worksheet
    const ws = XLSX.utils.json_to_sheet(processedData)

    // Aplicar estilos al header
    const range = XLSX.utils.decode_range(ws["!ref"] || "A1")

    // Estilo para headers
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col })
      if (!ws[cellAddress]) continue

      ws[cellAddress].s = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "366092" } },
        alignment: { horizontal: "center", vertical: "center" },
        border: {
          top: { style: "thin", color: { rgb: "000000" } },
          bottom: { style: "thin", color: { rgb: "000000" } },
          left: { style: "thin", color: { rgb: "000000" } },
          right: { style: "thin", color: { rgb: "000000" } },
        },
      }
    }

    // Ajustar ancho de columnas
    const colWidths = Object.keys(processedData[0] || {}).map((key) => ({
      wch: Math.max(key.length, 15),
    }))
    ws["!cols"] = colWidths

    // Agregar worksheet al workbook
    XLSX.utils.book_append_sheet(wb, ws, options.sheetName || "Datos")

    // Generar archivo y descargar
    XLSX.writeFile(wb, `${options.filename}.xlsx`)

    return true
  } catch (error) {
    console.error("Error exporting to Excel:", error)
    return false
  }
}

export const exportToCSV = (data: ExportData[], options: ExportOptions) => {
  try {
    // Aplicar headers personalizados si se proporcionan
    let processedData = data
    if (options.headers) {
      processedData = data.map((row) => {
        const newRow: any = {}
        Object.keys(row).forEach((key) => {
          const headerKey = options.headers![key] || key
          newRow[headerKey] = row[key]
        })
        return newRow
      })
    }

    // Crear worksheet y convertir a CSV
    const ws = XLSX.utils.json_to_sheet(processedData)
    const csv = XLSX.utils.sheet_to_csv(ws)

    // Crear blob y descargar
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")

    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob)
      link.setAttribute("href", url)
      link.setAttribute("download", `${options.filename}.csv`)
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }

    return true
  } catch (error) {
    console.error("Error exporting to CSV:", error)
    return false
  }
}

export const formatSalesDataForExport = (sales: any[]) => {
  return sales.map((sale) => ({
    "N° Venta": sale.sale_number || "N/A",
    Fecha: new Date(sale.sale_date).toLocaleDateString("es-PE"),
    Cliente: sale.entity_name,
    RUC: sale.entity_ruc,
    "U.E.": sale.entity_executing_unit || "-",
    "N° Cotización": sale.quotation_code,
    Producto: sale.product_name,
    Cantidad: sale.quantity,
    "Precio Unitario": `S/ ${sale.unit_price_with_tax?.toFixed(2) || "0.00"}`,
    Total: `S/ ${sale.total_sale.toFixed(2)}`,
    "Método Pago": sale.payment_method,
    Estado: sale.sale_status?.toUpperCase() || "PENDIENTE",
    "Fecha Entrega": sale.delivery_date ? new Date(sale.delivery_date).toLocaleDateString("es-PE") : "-",
    Vendedor: sale.profiles?.full_name || "N/A",
    "EXP. SIAF": sale.exp_siaf || "-",
    OCAM: sale.ocam || "-",
    "Orden Física": sale.physical_order || "-",
    "Proyecto Meta": sale.project_meta || "-",
    "Destino Final": sale.final_destination || "-",
    "Encargado Almacén": sale.warehouse_manager || "-",
    "Plazo Entrega": sale.delivery_term || "-",
    Observaciones: sale.observations || "-",
  }))
}
