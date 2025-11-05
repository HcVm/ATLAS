import * as XLSX from "xlsx"

export interface ExportData {
  [key: string]: any
}

export interface ExportOptions {
  filename: string
  sheetName?: string
  headers?: { [key: string]: string }
}

export interface AdvancedExportOptions extends ExportOptions {
  autoFilter?: boolean
  freezePane?: boolean
  columnWidths?: number[]
}

/**
 * Enhanced Excel export with advanced formatting, filters, and freeze panes
 */
export const exportToExcelAdvanced = (data: ExportData[], options: AdvancedExportOptions) => {
  try {
    const wb = XLSX.utils.book_new()

    // Process headers
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

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(processedData)

    // Get range for styling
    const range = XLSX.utils.decode_range(ws["!ref"] || "A1")

    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col })
      if (!ws[cellAddress]) continue

      ws[cellAddress].s = {
        font: {
          bold: true,
          color: { rgb: "FFFFFF" },
          size: 12,
        },
        fill: {
          fgColor: { rgb: "1F4E78" }, // Professional dark blue
        },
        alignment: {
          horizontal: "center",
          vertical: "center",
          wrapText: true,
        },
        border: {
          top: { style: "thin", color: { rgb: "000000" } },
          bottom: { style: "thin", color: { rgb: "000000" } },
          left: { style: "thin", color: { rgb: "000000" } },
          right: { style: "thin", color: { rgb: "000000" } },
        },
      }
    }

    for (let row = 1; row <= range.e.r; row++) {
      const bgColor = row % 2 === 0 ? "F2F2F2" : "FFFFFF" // Alternating row colors

      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col })
        if (!ws[cellAddress]) continue

        ws[cellAddress].s = {
          font: {
            color: { rgb: "000000" },
            size: 11,
          },
          fill: {
            fgColor: { rgb: bgColor },
          },
          alignment: {
            horizontal: "left",
            vertical: "center",
            wrapText: true,
          },
          border: {
            top: { style: "hair", color: { rgb: "CCCCCC" } },
            bottom: { style: "hair", color: { rgb: "CCCCCC" } },
            left: { style: "hair", color: { rgb: "CCCCCC" } },
            right: { style: "hair", color: { rgb: "CCCCCC" } },
          },
        }
      }
    }

    const colWidths =
      options.columnWidths || Object.keys(processedData[0] || {}).map((key) => Math.max(key.length + 2, 15))
    ws["!cols"] = colWidths.map((width) => ({ wch: width }))

    if (options.freezePane !== false) {
      ws["!freeze"] = { xSplit: 0, ySplit: 1 }
    }

    if (options.autoFilter !== false) {
      ws["!autofilter"] = { ref: XLSX.utils.encode_range(range) }
    }

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, options.sheetName || "Datos")

    // Generate and download file
    XLSX.writeFile(wb, `${options.filename}.xlsx`)

    return true
  } catch (error) {
    console.error("Error exporting to Excel Advanced:", error)
    return false
  }
}

/**
 * Export complex report with multiple sheets
 */
export const exportToExcelMultiSheet = (
  sheets: Array<{
    name: string
    data: ExportData[]
    headers?: { [key: string]: string }
  }>,
  filename: string,
) => {
  try {
    const wb = XLSX.utils.book_new()

    sheets.forEach(({ name, data, headers }) => {
      let processedData = data

      if (headers) {
        processedData = data.map((row) => {
          const newRow: any = {}
          Object.keys(row).forEach((key) => {
            const headerKey = headers[key] || key
            newRow[headerKey] = row[key]
          })
          return newRow
        })
      }

      const ws = XLSX.utils.json_to_sheet(processedData)
      const range = XLSX.utils.decode_range(ws["!ref"] || "A1")

      // Apply header formatting
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col })
        if (!ws[cellAddress]) continue

        ws[cellAddress].s = {
          font: { bold: true, color: { rgb: "FFFFFF" }, size: 12 },
          fill: { fgColor: { rgb: "1F4E78" } },
          alignment: { horizontal: "center", vertical: "center", wrapText: true },
          border: {
            top: { style: "thin", color: { rgb: "000000" } },
            bottom: { style: "thin", color: { rgb: "000000" } },
            left: { style: "thin", color: { rgb: "000000" } },
            right: { style: "thin", color: { rgb: "000000" } },
          },
        }
      }

      const colWidths = Object.keys(processedData[0] || {}).map((key) => Math.max(key.length + 2, 15))
      ws["!cols"] = colWidths.map((width) => ({ wch: width }))

      // Freeze panes and autofilter
      ws["!freeze"] = { xSplit: 0, ySplit: 1 }
      ws["!autofilter"] = { ref: XLSX.utils.encode_range(range) }

      XLSX.utils.book_append_sheet(wb, ws, name)
    })

    XLSX.writeFile(wb, `${filename}.xlsx`)
    return true
  } catch (error) {
    console.error("Error exporting to Excel Multi-Sheet:", error)
    return false
  }
}
