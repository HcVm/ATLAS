export interface ExportOptions {
  startDate?: string
  endDate?: string
  format: "excel" | "csv"
  includeDetails?: boolean
}

export interface SaleExportData {
  sale_number: string
  entity_name: string
  sale_date: string
  product_name: string
  quantity: number
  unit_price: number
  total_amount: number
  status: string
  quotation_number?: string
  created_by: string
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(amount)
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
}

export function generateExcelData(sales: SaleExportData[]): any[] {
  return sales.map((sale) => ({
    "N° Venta": sale.sale_number,
    Cliente: sale.entity_name,
    Fecha: formatDate(sale.sale_date),
    Producto: sale.product_name,
    Cantidad: sale.quantity,
    "Precio Unitario": sale.unit_price,
    Total: sale.total_amount,
    Estado: sale.status,
    "N° Cotización": sale.quotation_number || "N/A",
    "Creado por": sale.created_by,
  }))
}

export function generateCSVData(sales: SaleExportData[]): string {
  const headers = [
    "N° Venta",
    "Cliente",
    "Fecha",
    "Producto",
    "Cantidad",
    "Precio Unitario",
    "Total",
    "Estado",
    "N° Cotización",
    "Creado por",
  ]

  const rows = sales.map((sale) => [
    sale.sale_number,
    sale.entity_name,
    formatDate(sale.sale_date),
    sale.product_name,
    sale.quantity.toString(),
    sale.unit_price.toString(),
    sale.total_amount.toString(),
    sale.status,
    sale.quotation_number || "N/A",
    sale.created_by,
  ])

  return [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n")
}

export function downloadFile(content: string | Blob, filename: string, type: string) {
  const blob = content instanceof Blob ? content : new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
