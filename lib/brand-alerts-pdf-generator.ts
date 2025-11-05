// lib/brand-alerts-pdf-generator.ts
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import { normalizeBrand } from "@/lib/brand-utils"

interface Item {
  nro_parte: string
  descripcion: string
  marca: string
  cantidad: number
  precio_unitario: number
  subtotal: number
  igv: number
  monto_total: number
}

interface OrderGroup {
  orden_electronica: string
  acuerdo_marco: string
  ruc_proveedor: string
  razon_social_proveedor: string
  estado_orden_electronica: string
  fecha_publicacion: string
  items: Item[]
  total_sin_igv: number
  igv: number
  total_con_igv: number
  alert?: {
    id: string
    status: "pending" | "attended" | "observed"
    brand_name: string
  }
}

interface ReportPDFData {
  brands: string[]
  dateRange: { start: string | null; end: string | null }
  frameworks: Record<string, { orders: OrderGroup[]; totalAmount: number; totalOrders: number }>
  observationMotives?: Record<string, string>
}

const STATUS_ORDER = { pending: 0, observed: 1, attended: 2 } as const
const STATUS_LABEL = { pending: "PENDIENTE", observed: "OBSERVADA", attended: "ATENDIDA" } as const
const STATUS_COLOR = { pending: [239, 68, 68], observed: [251, 146, 60], attended: [34, 197, 94] } as const

export function generateBrandAlertsPDF(data: ReportPDFData) {
  const { brands = [], frameworks, observationMotives = {} } = data
  if (!brands.length || !frameworks) return

  const orderToBrand = new Map<string, string>()
  Object.values(frameworks).forEach(fw => {
    fw.orders.forEach(order => {
      if (order.alert?.brand_name) {
        const brand = normalizeBrand(order.alert.brand_name)
        if (brands.includes(brand)) {
          orderToBrand.set(order.orden_electronica, brand)
        }
      }
    })
  })

  const ordersByBrand = new Map<string, OrderGroup[]>()
  brands.forEach(brand => ordersByBrand.set(brand, []))

  Object.values(frameworks).forEach(fw => {
    fw.orders.forEach(order => {
      const brand = orderToBrand.get(order.orden_electronica)
      if (brand && ordersByBrand.has(brand)) {
        ordersByBrand.get(brand)!.push(order)
      }
    })
  })

  brands.forEach(brand => {
    const orders = ordersByBrand.get(brand) || []
    if (orders.length === 0) return

    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })
    const pageWidth = doc.internal.pageSize.getWidth()
    let y = 15

    doc.setFontSize(16)
    doc.setFont("helvetica", "bold")
    doc.text(`REPORTE DE ALERTAS - ${brand}`, 14, y)
    y += 7

    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.text(`Generado: ${new Date().toLocaleString("es-PE")}`, 14, y)
    y += 10

    const groupedByStatus = orders.reduce((acc, order) => {
      const status = order.alert?.status || "unknown"
      if (!acc[status]) acc[status] = []
      acc[status].push(order)
      return acc
    }, {} as Record<string, OrderGroup[]>)

    const sortedStatuses = Object.keys(groupedByStatus).sort((a, b) => {
      return (STATUS_ORDER[a as keyof typeof STATUS_ORDER] ?? 99) - (STATUS_ORDER[b as keyof typeof STATUS_ORDER] ?? 99)
    })

    sortedStatuses.forEach(status => {
      const statusOrders = groupedByStatus[status]
      const label = STATUS_LABEL[status as keyof typeof STATUS_LABEL] || status.toUpperCase()
      const color = STATUS_COLOR[status as keyof typeof STATUS_COLOR] || [100, 100, 100]

      if (y > 180) { doc.addPage(); y = 20 }

      doc.setFillColor(...color)
      doc.rect(14, y - 3, pageWidth - 28, 6, "F")
      doc.setTextColor(255, 255, 255)
      doc.setFont("helvetica", "bold")
      doc.setFontSize(11)
      doc.text(`${label} (${statusOrders.length})`, 16, y + 1)
      y += 8

      const tableData: any[] = []

      statusOrders.forEach(order => {
        const isObserved = order.alert?.status === "observed"
        const motive = isObserved && order.alert?.id
          ? observationMotives[order.alert.id] || "Sin motivo"
          : ""

        order.items.forEach((item, idx) => {
          tableData.push([
            idx === 0 ? order.orden_electronica : "",
            idx === 0 ? order.razon_social_proveedor : "",
            item.nro_parte,
            item.descripcion,
            item.cantidad.toLocaleString("es-PE"),
            `S/ ${item.precio_unitario.toFixed(2)}`,
            `S/ ${item.subtotal.toFixed(2)}`,
            `S/ ${item.igv.toFixed(2)}`,
            `S/ ${item.monto_total.toFixed(2)}`,
            idx === 0 ? order.acuerdo_marco : "",
            idx === 0 && isObserved ? motive : "",
          ])
        })
        tableData.push([
          { content: "TOTAL ORDEN", colSpan: 6, styles: { fontStyle: "bold", fillColor: [230, 230, 230] } },
          { content: `S/ ${order.total_con_igv.toFixed(2)}`, styles: { fontStyle: "bold", halign: "right", textColor: [220, 38, 38] } },
          "",
          "",
          "",
          "",
        ])
      })

      autoTable(doc, {
        head: [["Orden", "Proveedor", "N° Parte", "Producto", "Cant.", "P. Unit.", "Subtotal", "IGV", "Total", "Acuerdo Marco", "Motivo Observación"]],
        body: tableData,
        startY: y,
        margin: { left: 14, right: 14 },
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [52, 73, 94], textColor: 255 },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 25 },
          2: { cellWidth: 20 },
          3: { cellWidth: 70 },
          4: { cellWidth: 12, halign: "center" },
          5: { cellWidth: 16, halign: "right" },
          6: { cellWidth: 20, halign: "right" },
          7: { cellWidth: 16, halign: "right" },
          8: { cellWidth: 18, halign: "right" },
          9: { cellWidth: 25 },
          10: { cellWidth: 40, fontSize: 7 },
        },
        didDrawPage: () => {
          const pageNum = doc.getCurrentPageInfo().pageNumber
          doc.setFontSize(8)
          doc.text(`Página ${pageNum}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: "center" })
        }
      })

      y = (doc as any).lastAutoTable.finalY + 10
    })

    const filename = `Reporte-${brand}-${new Date().toISOString().slice(0, 10)}.pdf`
    doc.save(filename)
  })
}