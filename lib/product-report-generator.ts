import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"

interface ReportProduct {
    name: string
    description: string | null
    code: string
    barcode: string | null
    brand: string
    category: string
    unit_of_measure: string
    current_stock: number
    minimum_stock: number
    location: string | null
    cost_price: number
    sale_price: number
    is_active: boolean
}

interface ReportData {
    companyName: string
    generatedBy: string
    products: ReportProduct[]
    filters: {
        brand?: string
        category?: string
        stockStatus?: string
        search?: string
    }
}

export const generateProductReportPDF = (data: ReportData) => {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })
    const pageWidth = doc.internal.pageSize.getWidth()

    // Colores corporativos (Indigo theme from the app)
    const primaryColor = [79, 70, 229] // Indigo 600
    const secondaryColor = [30, 41, 59] // Slate 800

    // Header
    // Título
    doc.setFontSize(22)
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2])
    doc.setFont("helvetica", "bold")
    doc.text("Reporte de Inventario de Productos", 14, 20)

    // Subtítulo / Empresa
    doc.setFontSize(12)
    doc.setTextColor(100, 116, 139)
    doc.setFont("helvetica", "normal")
    doc.text(data.companyName.toUpperCase(), 14, 28)

    // Info de generación alineada a la derecha
    doc.setFontSize(10)
    doc.text(`Generado por: ${data.generatedBy}`, pageWidth - 14, 20, { align: "right" })
    doc.text(`Fecha: ${new Date().toLocaleString("es-PE")}`, pageWidth - 14, 26, { align: "right" })

    // Línea divisoria
    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(0.5)
    doc.line(14, 32, pageWidth - 14, 32)

    // Filtros aplicados
    let filterY = 40
    doc.setFontSize(10)
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2])
    doc.setFont("helvetica", "bold")
    doc.text("Filtros Aplicados:", 14, filterY)

    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    let filterText = []
    if (data.filters.search) filterText.push(`Búsqueda: "${data.filters.search}"`)
    if (data.filters.brand && data.filters.brand !== "all") filterText.push(`Marca: ${data.filters.brand}`) // Note: logic to show name needed in caller
    if (data.filters.category && data.filters.category !== "all") filterText.push(`Categoría: ${data.filters.category}`)
    if (data.filters.stockStatus && data.filters.stockStatus !== "all") {
        const statusMap: Record<string, string> = { available: "Disponible", low: "Stock Bajo", out: "Sin Stock" }
        filterText.push(`Estado Stock: ${statusMap[data.filters.stockStatus] || data.filters.stockStatus}`)
    }

    if (filterText.length === 0) filterText.push("Ninguno (Todos los productos)")

    doc.text(filterText.join("  |  "), 45, filterY)

    // Resumen
    const totalStock = data.products.reduce((acc, p) => acc + p.current_stock, 0)
    const totalValue = data.products.reduce((acc, p) => acc + (p.current_stock * p.cost_price), 0)

    doc.setFillColor(248, 250, 252)
    doc.setDrawColor(226, 232, 240)
    doc.roundedRect(14, 46, pageWidth - 28, 24, 2, 2, "FD")

    doc.setFontSize(9)
    doc.setTextColor(100, 116, 139)

    // Crear 3 columnas de resumen
    const colWidth = (pageWidth - 28) / 3

    // Total Productos
    doc.text("TOTAL PRODUCTOS", 14 + (colWidth * 0.5), 54, { align: "center" })
    doc.setFontSize(12)
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2])
    doc.setFont("helvetica", "bold")
    doc.text(data.products.length.toLocaleString(), 14 + (colWidth * 0.5), 62, { align: "center" })

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

    // Agrupar productos por marca
    const productsByBrand: Record<string, ReportProduct[]> = {}
    data.products.forEach(product => {
        const brand = product.brand || "Sin Marca"
        if (!productsByBrand[brand]) {
            productsByBrand[brand] = []
        }
        productsByBrand[brand].push(product)
    })

    // Ordenar marcas alfabéticamente
    const sortedBrands = Object.keys(productsByBrand).sort()

    let currentY = 78

    sortedBrands.forEach((brand) => {
        const brandProducts = productsByBrand[brand]

        // Verificar si necesitamos nueva página para el título de la marca
        if (currentY > doc.internal.pageSize.getHeight() - 40) {
            doc.addPage()
            currentY = 20
        }

        // Título de la marca
        doc.setFontSize(14)
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]) // Color primario para la marca
        doc.setFont("helvetica", "bold")
        doc.text(`${brand.toUpperCase()} (${brandProducts.length} productos)`, 14, currentY)

        currentY += 6

        const tableData = brandProducts.map(product => [
            product.code,
            product.description || product.name,
            product.category || "-",
            product.location || "-",
            product.current_stock.toLocaleString(),
            product.unit_of_measure,
            `S/ ${product.sale_price.toFixed(2)}`,
            product.current_stock <= 0 ? "SIN STOCK" : product.current_stock <= product.minimum_stock ? "BAJO" : "OK"
        ])

        autoTable(doc, {
            startY: currentY,
            head: [["CÓDIGO", "PRODUCTO", "CATEGORÍA", "UBICACIÓN", "STOCK", "UNIDAD", "PRECIO", "ESTADO"]],
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
                fillColor: secondaryColor as any, // Slate para headers de tabla
                textColor: 255,
                fontStyle: 'bold',
                halign: 'center'
            },
            columnStyles: {
                0: { cellWidth: 20 }, // Codigo
                1: { cellWidth: 'auto' }, // Producto gets remaining space
                2: { cellWidth: 25 }, // Categoria
                3: { cellWidth: 20 }, // Ubicacion
                4: { cellWidth: 15, halign: 'right', fontStyle: 'bold' }, // Stock
                5: { cellWidth: 15, halign: 'center' }, // Unidad
                6: { cellWidth: 20, halign: 'right' }, // Precio
                7: { cellWidth: 18, halign: 'center', fontStyle: 'bold' } // Estado
            },
            alternateRowStyles: {
                fillColor: [248, 250, 252]
            },
            didParseCell: function (data) {
                if (data.section === 'body' && data.column.index === 7) {
                    if (data.cell.raw === "SIN STOCK") {
                        data.cell.styles.textColor = [220, 38, 38] // Red
                    } else if (data.cell.raw === "BAJO") {
                        data.cell.styles.textColor = [217, 119, 6] // Amber
                    } else {
                        data.cell.styles.textColor = [22, 163, 74] // Green
                    }
                }
            },
            didDrawPage: function (data) {
                // Page numbers
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

    doc.save(`Reporte_Inventario_${new Date().toISOString().split('T')[0]}.pdf`)
}
