import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"

interface ReportInternalProduct {
    code: string
    name: string
    category: string
    location: string | null
    current_stock: number
    minimum_stock: number
    unit_of_measure: string
    cost_price: number
    is_serialized: boolean
    stock_status: "ok" | "low" | "critical"
}

interface ReportData {
    companyName: string
    generatedBy: string
    products: ReportInternalProduct[]
    filters: {
        search?: string
    }
}

export const generateInternalProductReportPDF = (data: ReportData) => {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })
    const pageWidth = doc.internal.pageSize.getWidth()

    // Colores corporativos
    const primaryColor = [79, 70, 229] // Indigo 600
    const secondaryColor = [30, 41, 59] // Slate 800

    // Header
    doc.setFontSize(22)
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2])
    doc.setFont("helvetica", "bold")
    doc.text("Reporte de Almacén Interno", 14, 20)

    doc.setFontSize(12)
    doc.setTextColor(100, 116, 139)
    doc.setFont("helvetica", "normal")
    doc.text(data.companyName.toUpperCase(), 14, 28)

    doc.setFontSize(10)
    doc.text(`Generado por: ${data.generatedBy}`, pageWidth - 14, 20, { align: "right" })
    doc.text(`Fecha: ${new Date().toLocaleString("es-PE")}`, pageWidth - 14, 26, { align: "right" })

    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(0.5)
    doc.line(14, 32, pageWidth - 14, 32)

    // Filtros
    let filterY = 40
    doc.setFontSize(10)
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2])
    doc.setFont("helvetica", "bold")
    doc.text("Filtros Aplicados:", 14, filterY)

    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    const filterText = data.filters.search ? `Búsqueda: "${data.filters.search}"` : "Ninguno (Todos los productos)"
    doc.text(filterText, 45, filterY)

    // Resumen
    const totalItems = data.products.length
    const totalStock = data.products.reduce((acc, p) => acc + p.current_stock, 0)
    const totalValue = data.products.reduce((acc, p) => acc + (p.current_stock * p.cost_price), 0)

    doc.setFillColor(248, 250, 252)
    doc.setDrawColor(226, 232, 240)
    doc.roundedRect(14, 46, pageWidth - 28, 24, 2, 2, "FD")

    const colWidth = (pageWidth - 28) / 3

    doc.setFontSize(9)
    doc.setTextColor(100, 116, 139)

    // Total Productos
    doc.text("TOTAL PRODUCTOS", 14 + (colWidth * 0.5), 54, { align: "center" })
    doc.setFontSize(12)
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2])
    doc.setFont("helvetica", "bold")
    doc.text(totalItems.toLocaleString(), 14 + (colWidth * 0.5), 62, { align: "center" })

    // Total Unidades
    doc.setFontSize(9)
    doc.setTextColor(100, 116, 139)
    doc.setFont("helvetica", "normal")
    doc.text("TOTAL UNIDADES", 14 + (colWidth * 1.5), 54, { align: "center" })
    doc.setFontSize(12)
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2])
    doc.setFont("helvetica", "bold")
    doc.text(totalStock.toLocaleString(), 14 + (colWidth * 1.5), 62, { align: "center" })

    // Valor Total
    doc.setFontSize(9)
    doc.setTextColor(100, 116, 139)
    doc.setFont("helvetica", "normal")
    doc.text("VALOR TOTAL INV. (COSTO)", 14 + (colWidth * 2.5), 54, { align: "center" })
    doc.setFontSize(12)
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2])
    doc.setFont("helvetica", "bold")
    doc.text(`S/ ${totalValue.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`, 14 + (colWidth * 2.5), 62, { align: "center" })

    // Agrupar por Categoría (Internal products usually don't have Brands like commercial products, so Category is the logical grouping)
    const productsByCategory: Record<string, ReportInternalProduct[]> = {}
    data.products.forEach(product => {
        const category = product.category || "Sin Categoría"
        if (!productsByCategory[category]) {
            productsByCategory[category] = []
        }
        productsByCategory[category].push(product)
    })

    const sortedCategories = Object.keys(productsByCategory).sort()
    let currentY = 78

    sortedCategories.forEach((category) => {
        const categoryProducts = productsByCategory[category]

        if (currentY > doc.internal.pageSize.getHeight() - 40) {
            doc.addPage()
            currentY = 20
        }

        doc.setFontSize(14)
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
        doc.setFont("helvetica", "bold")
        doc.text(`${category.toUpperCase()} (${categoryProducts.length} items)`, 14, currentY)
        currentY += 6

        const tableData = categoryProducts.map(product => [
            product.code,
            product.name,
            product.location || "-",
            product.is_serialized ? "SÍ" : "NO",
            product.current_stock.toLocaleString(),
            product.unit_of_measure,
            `S/ ${product.cost_price.toFixed(2)}`,
            `S/ ${(product.current_stock * product.cost_price).toFixed(2)}`,
            product.stock_status === "critical" ? "CRÍTICO" : product.stock_status === "low" ? "BAJO" : "OK"
        ])

        autoTable(doc, {
            startY: currentY,
            head: [["CÓDIGO", "PRODUCTO", "UBICACIÓN", "SER.", "STOCK", "UNIDAD", "COSTO U.", "VALOR TOTAL", "ESTADO"]],
            body: tableData,
            theme: 'grid',
            styles: {
                fontSize: 8,
                cellPadding: 3,
                textColor: [51, 65, 85],
                lineColor: [226, 232, 240],
                lineWidth: 0.1
            },
            headStyles: {
                fillColor: secondaryColor as any,
                textColor: 255,
                fontStyle: 'bold',
                halign: 'center'
            },
            columnStyles: {
                0: { cellWidth: 20 },
                1: { cellWidth: 'auto' },
                2: { cellWidth: 25 },
                3: { cellWidth: 10, halign: 'center' },
                4: { cellWidth: 15, halign: 'right', fontStyle: 'bold' },
                5: { cellWidth: 15, halign: 'center' },
                6: { cellWidth: 20, halign: 'right' },
                7: { cellWidth: 22, halign: 'right' },
                8: { cellWidth: 18, halign: 'center', fontStyle: 'bold' }
            },
            alternateRowStyles: {
                fillColor: [248, 250, 252]
            },
            didParseCell: function (data) {
                if (data.section === 'body' && data.column.index === 8) {
                    if (data.cell.raw === "CRÍTICO") {
                        data.cell.styles.textColor = [220, 38, 38]
                    } else if (data.cell.raw === "BAJO") {
                        data.cell.styles.textColor = [217, 119, 6]
                    } else {
                        data.cell.styles.textColor = [22, 163, 74]
                    }
                }
            },
            didDrawPage: function (data) {
                const str = `Página ${doc.internal.getCurrentPageInfo().pageNumber}`
                doc.setFontSize(8)
                doc.setFont("helvetica", "normal")
                doc.setTextColor(100, 116, 139)
                doc.text(str, pageWidth - 20, doc.internal.pageSize.getHeight() - 10, { align: "right" })
            },
            // @ts-ignore
            margin: { top: 20 }
        })

        // @ts-ignore
        currentY = doc.lastAutoTable.finalY + 15
    })

    doc.save(`Reporte_Almacen_Interno_${new Date().toISOString().split('T')[0]}.pdf`)
}
