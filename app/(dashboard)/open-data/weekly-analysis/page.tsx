"use client"

import { useState, useCallback, useMemo } from "react"
import { useDropzone } from "react-dropzone"
import * as XLSX from "xlsx"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, FileSpreadsheet, ChartBar, AlertCircle, CheckCircle2, DollarSign, Package, Loader2, Download } from "lucide-react"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { useCompany } from "@/lib/company-context"
import { toast } from "sonner"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from "recharts"

export default function WeeklyAnalysisPage() {
    const { selectedCompany } = useCompany()
    const [file, setFile] = useState<File | null>(null)
    const [isProcessing, setIsProcessing] = useState(false)
    const [reportData, setReportData] = useState<any | null>(null)

    const detailedProducts = useMemo(() => {
        if (!reportData?.orders) return []
        const stats: Record<string, { name: string, prices: number[], count: number, pn: string }> = {}

        reportData.orders.forEach((o: any) => {
            const key = o.partNumber && o.partNumber !== "N/A" ? o.partNumber : o.product
            if (!stats[key]) {
                stats[key] = { name: o.product, prices: [], count: 0, pn: (o.partNumber === "N/A" || !o.partNumber) ? key : o.partNumber }
            }
            stats[key].prices.push(o.unitPrice)
            stats[key].count++
            if (o.product.length > stats[key].name.length) stats[key].name = o.product
        })

        return Object.values(stats).map((s) => ({
            pn: s.pn,
            name: s.name,
            count: s.count,
            min: Math.min(...s.prices),
            max: Math.max(...s.prices),
            avg: s.prices.reduce((a, b: number) => a + b, 0) / s.prices.length
        })).sort((a, b) => b.count - a.count)
    }, [reportData])

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles?.length > 0) {
            setFile(acceptedFiles[0])
            setReportData(null) // Reset previous report
        }
    }, [])

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            'application/vnd.ms-excel': ['.xls'],
            'text/csv': ['.csv']
        },
        maxFiles: 1
    })

    const processFile = async () => {
        if (!file) return

        setIsProcessing(true)
        try {
            const arrayBuffer = await file.arrayBuffer()
            const workbook = XLSX.read(arrayBuffer)
            const worksheetName = workbook.SheetNames[0]
            const worksheet = workbook.Sheets[worksheetName]
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) // Get raw array of arrays
            analyzeData(jsonData)
        } catch (error) {
            console.error("Error processing file:", error)
            toast.error("Error al procesar el archivo. Verifique el formato.")
        } finally {
            setIsProcessing(false)
        }
    }

    const analyzeData = (data: any[]) => {
        if (!data || data.length === 0) {
            toast.error("El archivo está vacío o no tiene datos válidos.")
            return
        }

        // Column Constants based on User Request
        const COL_ORDEN = "Orden Electrónica"
        const COL_PROVEEDOR = "Razón Social Proveedor"
        const COL_MONTO = "Monto Total Entrega" // Using the delivery amount as it's more specific to the item
        const COL_PRODUCTO = "Descripción Ficha Producto"
        const COL_FECHA = "Fecha Aceptación"

        // Check if critical columns exist in the first row
        // Skipped: Header search moved into loop below
        // const firstRow = data[0]
        // if (!firstRow.hasOwnProperty(COL_ORDEN) || !firstRow.hasOwnProperty(COL_PROVEEDOR)) { ... }

        const myCompanyKeyword = selectedCompany?.name || ""
        const normalize = (s: string) => s?.toString().toUpperCase().trim() || ""

        let mySalesTotal = 0
        let mySalesCount = 0
        let totalMarketSales = 0

        const COL_ENTIDAD = "Razón Social Entidad"
        const COL_PRECIO_UNITARIO = "Precio Unitario"
        const COL_ACUERDO = "Acuerdo Marco"
        const COL_CATALOGO = "Catálogo"
        // New Columns for Delivery Info
        const COL_DEP_ENTREGA = "Dep. Entrega"
        const COL_PROV_ENTREGA = "Prov. Entrega"
        const COL_DIST_ENTREGA = "Dist. Entrega"

        const COL_DIR_ENTREGA = "Dirección Entrega"
        const COL_CANTIDAD = "Cantidad Entrega"

        const COL_TOTAL_ORDEN = "Total Orden Electrónica"
        const COL_NRO_PARTE = "Nro. Parte"

        const competitors: Record<string, number> = {}
        const entities: Record<string, number> = {}
        const products: Record<string, { count: number, totalAmount: number, minPrice: number, maxPrice: number, sumUnitPrices: number }> = {}

        let processedRows = 0
        let acuerdoValid = ""
        let catalogoValid = ""
        const detailedOrders: any[] = []



        let headerRowIndex = -1
        let headerAcuerdo = ""
        let headerCatalogo = ""
        let headerFechas = ""

        // Scan first 20 rows for Metadata + Header Row
        for (let i = 0; i < Math.min(data.length, 20); i++) {
            const rowArr = (data[i] as any[]) || []
            // Clean values for string matching
            const rowValues = rowArr.map(v => (v?.toString() || "").trim()).filter(v => v.length > 0)
            const rowStr = rowValues.join(" ").toUpperCase()

            // Metadata
            if ((rowStr.includes("ACUERDO MARCO")) && !headerAcuerdo) {
                headerAcuerdo = rowValues.join(" ").replace(/ACUERDO MARCO:?/i, "").trim()
            }
            if ((rowStr.includes("CATÁLOGO") || rowStr.includes("CATALOGO")) && !headerCatalogo) {
                headerCatalogo = rowValues.join(" ").replace(/CAT[AÁ]LOGO:?/i, "").trim()
            }
            if ((rowStr.includes("FECHA INICIAL") || rowStr.includes("FECHA FINAL")) && !headerFechas) {
                headerFechas = rowValues.join(" ")
            }
            // Date fallback
            if (i === 3 && !headerFechas && rowStr.match(/\d{2}\/\d{2}\/\d{4}/)) {
                headerFechas = rowValues.join(" ")
            }

            // Header Detection
            if (rowArr.includes(COL_ORDEN) && rowArr.includes(COL_PROVEEDOR)) {
                headerRowIndex = i
            }
        }

        if (headerRowIndex === -1) {
            toast.error(`No se encontró la fila de cabecera con '${COL_ORDEN}' y '${COL_PROVEEDOR}'.`)
            return
        }

        // Prepare for Data Processing
        const headers = (data[headerRowIndex] as any[]).map(h => (h?.toString() || "").trim())
        const dataRows = data.slice(headerRowIndex + 1)

        // Column Indices
        const idxOrden = headers.indexOf(COL_ORDEN)
        const idxProveedor = headers.indexOf(COL_PROVEEDOR)
        const idxMonto = headers.indexOf(COL_MONTO)
        const idxProducto = headers.indexOf(COL_PRODUCTO)
        const idxEntidad = headers.indexOf(COL_ENTIDAD)
        const idxPrecio = headers.indexOf(COL_PRECIO_UNITARIO)
        const idxAcuerdo = headers.indexOf(COL_ACUERDO)
        const idxCatalogo = headers.indexOf(COL_CATALOGO)
        // const idxFecha = headers.indexOf(COL_FECHA)

        // New Delivery Columns
        const idxDep = headers.indexOf(COL_DEP_ENTREGA)
        const idxProv = headers.indexOf(COL_PROV_ENTREGA)
        const idxDist = headers.indexOf(COL_DIST_ENTREGA)

        const idxDir = headers.indexOf(COL_DIR_ENTREGA)
        const idxCant = headers.indexOf(COL_CANTIDAD)

        const idxTotalOrden = headers.indexOf(COL_TOTAL_ORDEN)
        const idxNroParte = headers.indexOf(COL_NRO_PARTE)

        if (idxOrden === -1 || idxProveedor === -1) {
            toast.error("Columnas críticas no encontradas en la fila de cabecera detectada.")
            return
        }

        const uniqueOrders = new Set<string>()

        dataRows.forEach((rowArray: any) => {
            const getValue = (idx: number) => (idx !== -1 && rowArray[idx]) ? rowArray[idx] : undefined

            // 1. FILTERING
            const orden = getValue(idxOrden)?.toString() || ""
            if (!orden.endsWith("-1")) return // Only specific status? Or ensure correct filter.

            processedRows++

            const provider = normalize(getValue(idxProveedor))
            const entity = normalize(getValue(idxEntidad))

            const parseAmount = (val: any) => {
                if (typeof val === 'number') return val
                if (typeof val === 'string') return parseFloat(val.replace(/[^0-9.-]+/g, ""))
                return 0
            }

            // Price & Quantity
            let unitPrice = parseAmount(getValue(idxPrecio))
            let quantity = parseFloat(getValue(idxCant)?.toString() || "1")

            // Fallbacks
            if (isNaN(unitPrice)) unitPrice = 0
            if (isNaN(quantity)) quantity = 1

            const lineTotal = unitPrice * quantity
            const orderTotalValue = parseAmount(getValue(idxTotalOrden)) || lineTotal // Fallback to line if missing

            const product = getValue(idxProducto) ? normalize(getValue(idxProducto)) : "DESCONOCIDO"

            // --- Order Level Aggregations (Once per Order) ---
            if (!uniqueOrders.has(orden)) {
                uniqueOrders.add(orden)
                totalMarketSales += orderTotalValue

                // Identify My Company
                const companyName = normalize(selectedCompany?.name || "")
                const companyCode = normalize(selectedCompany?.code || "")
                const companyRuc = normalize(selectedCompany?.ruc || "")

                const isMe = selectedCompany && (
                    (companyName && provider.includes(companyName)) ||
                    (companyCode && provider.includes(companyCode)) ||
                    (companyRuc && provider.includes(companyRuc))
                )

                if (isMe) {
                    mySalesTotal += orderTotalValue
                    mySalesCount++
                } else {
                    competitors[provider] = (competitors[provider] || 0) + orderTotalValue
                }

                // Entity Analysis
                if (entity) {
                    entities[entity] = (entities[entity] || 0) + orderTotalValue
                }
            }

            // Fallback metadata if not in header
            if (!headerAcuerdo && getValue(idxAcuerdo)) headerAcuerdo = getValue(idxAcuerdo)
            if (!headerCatalogo && getValue(idxCatalogo)) headerCatalogo = getValue(idxCatalogo)

            // --- LINE LEVEL (Product Analysis) ---
            if (!products[product]) {
                products[product] = { count: 0, totalAmount: 0, minPrice: unitPrice, maxPrice: unitPrice, sumUnitPrices: 0 }
            }
            products[product].count++
            products[product].totalAmount += lineTotal
            products[product].sumUnitPrices += unitPrice
            products[product].minPrice = Math.min(products[product].minPrice, unitPrice)
            products[product].maxPrice = Math.max(products[product].maxPrice, unitPrice)

            // Collect Detailed Order Info
            // Only keep relevant ones (e.g., significant amount or just all? Limit to avoid memory issues if massive)
            // For checking purposes, we take all, but Sort/Slice later.
            detailedOrders.push({
                orderId: orden,
                product: product,
                entity: entity,
                provider: provider,
                amount: lineTotal,
                unitPrice: unitPrice,
                department: normalize(getValue(idxDep)),
                province: normalize(getValue(idxProv)),
                district: normalize(getValue(idxDist)),
                address: getValue(idxDir)?.toString() || "",
                quantity: getValue(idxCant)?.toString() || "1",

                totalOrder: parseAmount(getValue(idxTotalOrden)),
                partNumber: getValue(idxNroParte)?.toString() || ""
            })
        })

        if (processedRows === 0) {
            toast.warning("No se encontraron registros válidos (terminados en -1). Verifique el archivo.")
            return
        }

        // Competitor Ranking (Top 10)
        const topCompetitors = Object.entries(competitors)
            .map(([name, total]) => ({ name, total }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 10)

        // Entity Ranking (Top 10)
        const topEntities = Object.entries(entities)
            .map(([name, total]) => ({ name, total }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 10)

        // Product Stats (Top 10 by Amount)
        const topProducts = Object.entries(products)
            .map(([name, stats]) => ({
                name,
                count: stats.count,
                total: stats.totalAmount,
                avgPrice: stats.sumUnitPrices / stats.count,
                minPrice: stats.minPrice,
                maxPrice: stats.maxPrice
            }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 10)

        // All Orders (Full Detail)
        const orders = detailedOrders
            .sort((a, b) => b.amount - a.amount)

        setReportData({
            mySalesTotal,
            mySalesCount,
            totalMarketSales,
            marketShare: totalMarketSales > 0 ? (mySalesTotal / totalMarketSales) * 100 : 0,
            topCompetitors,
            topEntities,
            topProducts,
            orders,

            acuerdo: acuerdoValid,
            catalogo: catalogoValid,
            acuerdoLabel: headerAcuerdo || (data[1] ? (data[1][2] || "") : ""),
            dateRangeLabel: headerFechas || (data[3] ? (data[3][2] || "") : ""),
            mappedColumns: { providerCol: COL_PROVEEDOR, amountCol: COL_MONTO, productCol: COL_PRODUCTO, dateCol: COL_FECHA }
        })

        toast.success(`Análisis completado. ${processedRows} registros procesados.`)
    }
    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(val)
    }

    const generatePDF = async () => {
        if (!reportData) return

        // Landscape Orientation for better table width
        const doc = new jsPDF('l', 'mm', 'a4')
        const today = new Date().toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        const pageWidth = doc.internal.pageSize.width
        const pageHeight = doc.internal.pageSize.height

        // --- Helper: Load Image ---
        const loadImage = (url: string): Promise<HTMLImageElement> => {
            return new Promise((resolve, reject) => {
                const img = new Image()
                img.crossOrigin = 'Anonymous'
                img.src = url
                img.onload = () => resolve(img)
                img.onerror = reject
            })
        }

        // --- Header Design ---
        // Blue Header Strip
        doc.setFillColor(15, 23, 42) // Slate 900
        doc.rect(0, 0, pageWidth, 25, 'F')

        // Brand Name (ATLAS)
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(16)
        doc.setFont("helvetica", "bold")
        doc.text("ATLAS", 14, 16)

        doc.setFontSize(10)
        doc.setFont("helvetica", "normal")
        doc.setTextColor(148, 163, 184) // Slate 400
        doc.text("|  Inteligencia de Mercado", 45, 16)

        // --- Company Logo ---
        if (selectedCompany?.code) {
            try {
                // Try to load logo from public folder based on code convention
                // e.g. AGLE -> /logos/agle-logo.png
                // Also handle multi-word codes if necessary, assuming formatting matches file list
                const logoName = selectedCompany.code.toLowerCase().replace(/\s+/g, '') + '-logo.png'
                const logoUrl = `${window.location.origin}/logos/${logoName}`

                const logoImg = await loadImage(logoUrl)

                // Add to PDF (Top Right, below header)
                // Maintain aspect ratio roughly, max width 40, max height 20
                const imgProps = doc.getImageProperties(logoImg)
                const pdfWidth = 25
                const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width

                doc.addImage(logoImg, 'PNG', pageWidth - 50, 30, pdfWidth, pdfHeight)
            } catch (e) {
                console.warn("Could not load company logo for PDF", e)
                // Fallback: If specific logo fails, maybe just skip or show text
            }
        }

        // Sales Report Title
        doc.setTextColor(30, 41, 59) // Slate 800
        doc.setFontSize(22)
        doc.setFont("helvetica", "bold")
        doc.text("Informe de Análisis Semanal", 14, 40)

        doc.setFontSize(10)
        doc.setTextColor(100)
        doc.setFont("helvetica", "normal")
        doc.text("Generado automáticamente vía Datos Abiertos", 14, 46)

        // --- Metadata Section ---
        const metaY = 55
        // Background box
        doc.setDrawColor(226, 232, 240) // Slate 200
        doc.setFillColor(248, 250, 252) // Slate 50
        doc.roundedRect(14, metaY, pageWidth - 28, 35, 2, 2, 'FD') // Slightly taller

        const drawMetaItem = (label: string, value: string, x: number, y: number) => {
            doc.setFontSize(7) // Smaller label
            doc.setTextColor(100, 116, 139)
            doc.setFont("helvetica", "bold")
            doc.text(label.toUpperCase(), x, y)

            doc.setFontSize(9) // Smaller value
            doc.setTextColor(15, 23, 42)
            doc.setFont("helvetica", "normal")

            // Basic text wrap for long values
            const splitText = doc.splitTextToSize(value, 80)
            doc.text(splitText, x, y + 4)
        }

        const acuerdoLabel = reportData.acuerdoLabel || reportData.acuerdo || "No especificado"
        const periodoLabel = reportData.dateRangeLabel || "No especificado"
        const catalogo = reportData.catalogo?.toString() || "General"

        drawMetaItem("Acuerdo Marco", acuerdoLabel, 20, metaY + 8)
        drawMetaItem("Periodo Analizado", periodoLabel, 110, metaY + 8)

        drawMetaItem("Fecha de Generación", today, 110, metaY + 22)

        // --- Executive Summary ---
        let currentY = 105
        doc.setFontSize(14)
        doc.setTextColor(15, 23, 42)
        doc.setFont("helvetica", "bold")
        doc.text("Resumen Ejecutivo", 14, currentY)

        const stats = [
            ["Ventas Propias", formatCurrency(reportData.mySalesTotal)],
            ["Participación Mercado", `${reportData.marketShare.toFixed(2)}%`],
            ["Total Mercado", formatCurrency(reportData.totalMarketSales)],
            ["Transacciones", reportData.mySalesCount.toString()]
        ]

        autoTable(doc, {
            startY: currentY + 5,
            head: [['Indicador Clave', 'Valor']],
            body: stats,
            theme: 'grid',
            headStyles: {
                fillColor: [59, 130, 246], // Blue 500
                textColor: 255,
                fontStyle: 'bold',
                halign: 'left'
            },
            bodyStyles: {
                textColor: 50,
                fontSize: 10,
                cellPadding: 4
            },
            columnStyles: {
                0: { fontStyle: 'bold', cellWidth: 100 },
                1: { halign: 'right', fontStyle: 'bold' }
            },
            styles: { lineColor: [226, 232, 240], lineWidth: 0.1 }
        })

        // --- Listado de Órdenes (Main Content) ---
        doc.addPage() // Force new page for maximum space
        currentY = 20

        doc.setFontSize(16)
        doc.setTextColor(15, 23, 42)
        doc.text("Listado Detallado de Órdenes", 14, currentY)

        // Pre-process rows for visual grouping
        const groupedOrders = [...reportData.orders].sort((a: any, b: any) =>
            (b.totalOrder || 0) - (a.totalOrder || 0) || a.orderId.localeCompare(b.orderId)
        )

        const tableData: any[] = []
        const rowGroupIndices: number[] = []
        let lastOrderId = ""
        let groupIndex = 0

        groupedOrders.forEach((o: any) => {
            const isNewGroup = o.orderId !== lastOrderId
            if (isNewGroup) {
                lastOrderId = o.orderId
                groupIndex++
            }
            rowGroupIndices.push(groupIndex)

            // Combine Location Data
            const locationString = `${o.department} - ${o.province} - ${o.district}\n${o.address}`
            const productString = `${o.product}\nPN: ${o.partNumber || "N/A"}`

            tableData.push([
                isNewGroup ? o.orderId : "",
                productString,
                isNewGroup ? locationString : "",
                isNewGroup ? o.provider.substring(0, 50) : "",
                isNewGroup ? o.entity.substring(0, 50) : "",
                o.quantity,
                formatCurrency(o.unitPrice),
                isNewGroup ? formatCurrency(o.totalOrder) : ""
            ])
        })

        autoTable(doc, {
            startY: currentY + 10,
            head: [['Orden', 'Producto', 'Lugar de Entrega', 'Proveedor', 'Entidad', 'Cant', 'P. Unit', 'Total Orden']],
            body: tableData,
            margin: { top: 20, right: 5, bottom: 35, left: 5 }, // Increased bottom margin to avoid footer overlap
            headStyles: {
                fillColor: [30, 41, 59], // Slate 800
                fontSize: 9, // Larger Header
                halign: 'center',
                valign: 'middle'
            },
            columnStyles: {
                0: { cellWidth: 25 }, // Orden
                1: { cellWidth: 90 }, // Producto (Max Width)
                2: { cellWidth: 55 }, // Lugar 
                3: { cellWidth: 25 }, // Prov Name
                4: { cellWidth: 25 }, // Ent Name
                5: { cellWidth: 12, halign: 'center' }, // Cant
                6: { cellWidth: 20, halign: 'right' }, // P Unit
                7: { cellWidth: 25, halign: 'right', fontStyle: 'bold' } // Total
            },
            didParseCell: (data) => {
                // Apply alternating background color based on ORDER GROUP, not individual row
                if (data.section === 'body') {
                    const gIdx = rowGroupIndices[data.row.index]
                    if (gIdx % 2 === 1) {
                        data.cell.styles.fillColor = [241, 245, 249] // Slate 100
                    }
                }
            },
            styles: {
                fontSize: 8, // Requested larger font
                cellPadding: 3,
                overflow: 'linebreak',
                valign: 'top',
                lineColor: [226, 232, 240],
                lineWidth: 0.1
            },
            rowPageBreak: 'avoid', // Prevent row splitting
            showHead: 'everyPage'
        })

        // --- Product Price Analysis Table ---
        doc.addPage()
        doc.setFontSize(16)
        doc.setTextColor(15, 23, 42)
        doc.text("Análisis de Precios por Producto", 14, 20)

        const productStats: Record<string, { name: string, prices: number[], count: number }> = {}

        reportData.orders.forEach((o: any) => {
            // Group primarily by Part Number, fallback to Product Name if PN is missing
            const key = o.partNumber && o.partNumber !== "N/A" ? o.partNumber : o.product

            if (!productStats[key]) {
                productStats[key] = { name: o.product, prices: [], count: 0 }
            }
            productStats[key].prices.push(o.unitPrice)
            productStats[key].count++
            // Keep the longest name found for this key to avoid truncated versions
            if (o.product.length > productStats[key].name.length) {
                productStats[key].name = o.product
            }
        })

        const productTableData = Object.entries(productStats).map(([key, stats]) => {
            const min = Math.min(...stats.prices)
            const max = Math.max(...stats.prices)
            const avg = stats.prices.reduce((a, b) => a + b, 0) / stats.prices.length

            // If key is part number (doesn't match name), display it. Otherwise N/A.
            const partNumberDisp = key !== stats.name ? key : "N/A"

            return [
                partNumberDisp,
                stats.name,
                formatCurrency(min),
                formatCurrency(max),
                formatCurrency(avg),
                stats.count
            ]
        }).sort((a: any, b: any) => b[5] - a[5]) // Sort by quantity (desc)

        autoTable(doc, {
            startY: 25,
            head: [['Nro. Parte', 'Producto', 'Precio Min', 'Precio Max', 'Precio Prom', 'Cant.']],
            body: productTableData,
            margin: { top: 20, right: 10, bottom: 20, left: 10 },
            headStyles: {
                fillColor: [16, 185, 129], // Emerald 500 (Green for Analysis)
                fontSize: 9,
                halign: 'center',
                valign: 'middle'
            },
            columnStyles: {
                0: { cellWidth: 40 }, // PN
                1: { cellWidth: 120 }, // Producto
                2: { cellWidth: 25, halign: 'right' },
                3: { cellWidth: 25, halign: 'right' },
                4: { cellWidth: 25, halign: 'right' },
                5: { cellWidth: 20, halign: 'center' }
            },
            styles: {
                fontSize: 8,
                cellPadding: 3,
                overflow: 'linebreak',
                valign: 'middle',
                lineColor: [226, 232, 240],
                lineWidth: 0.1
            },
            rowPageBreak: 'avoid',
            alternateRowStyles: { fillColor: [240, 253, 244] }, // Light Green tint
            showHead: 'everyPage'
        })


        // --- Footer (Page Numbers) ---
        const pageCount = (doc as any).internal.getNumberOfPages()
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i)
            doc.setFontSize(8)
            doc.setTextColor(150)
            doc.text(`Página ${i} de ${pageCount}`, pageWidth - 20, pageHeight - 10, { align: 'right' })
            doc.text(`Generado el ${today} por ATLAS System`, 14, pageHeight - 10)
        }

        const safeDate = today.replace(/[\/:\s,]/g, '-').replace(/--/g, '-')
        const safeCatalogo = (reportData.catalogo || "General").replace(/[^a-zA-Z0-9]/g, '_')
        const safePeriodo = (reportData.dateRangeLabel || safeDate).replace(/[^a-zA-Z0-9-]/g, '_').substring(0, 20)

        doc.save(`ATLAS_Reporte_${safeCatalogo}_${safePeriodo}.pdf`)
    }

    return (
        <div className="w-full p-6 space-y-8 pb-20">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Análisis Semanal</h1>
                <p className="text-slate-500 dark:text-slate-400">
                    Sube tu reporte de ventas (Excel/CSV) para generar insights automáticos sobre competidores y precios.
                </p>
            </div>

            {reportData && (
                <div className="flex justify-end">
                    <Button onClick={generatePDF} className="bg-red-600 hover:bg-red-700 text-white">
                        <Download className="mr-2 h-4 w-4" />
                        Descargar Informe PDF
                    </Button>
                </div>
            )}

            {/* Upload Section */}
            <Card className="border-dashed border-2 bg-slate-50/50 dark:bg-slate-900/50">
                <CardContent className="pt-6">
                    <div
                        {...getRootProps()}
                        className={`flex flex-col items-center justify-center p-10 transition-colors cursor-pointer rounded-lg ${isDragActive ? 'bg-blue-50/50 dark:bg-blue-900/20 border-blue-500' : 'hover:bg-slate-100/50 dark:hover:bg-slate-800/50'
                            }`}
                    >
                        <input {...getInputProps()} />
                        {file ? (
                            <div className="flex flex-col items-center gap-4">
                                <FileSpreadsheet className="h-16 w-16 text-green-600 dark:text-green-400" />
                                <div className="text-center">
                                    <p className="font-medium text-lg text-slate-900 dark:text-slate-100">{file.name}</p>
                                    <p className="text-sm text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                                </div>
                                <Button onClick={(e) => {
                                    e.stopPropagation()
                                    processFile()
                                }} disabled={isProcessing} className="mt-2">
                                    {isProcessing ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Procesando...
                                        </>
                                    ) : (
                                        <>
                                            <ChartBar className="mr-2 h-4 w-4" /> Generar Informe
                                        </>
                                    )}
                                </Button>
                                <Button variant="ghost" size="sm" onClick={(e) => {
                                    e.stopPropagation()
                                    setFile(null)
                                    setReportData(null)
                                }} className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                                    Cancelar
                                </Button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-4 text-slate-500">
                                <Upload className="h-12 w-12 mb-2 opacity-50" />
                                <div className="text-center space-y-1">
                                    <p className="font-medium text-slate-700 dark:text-slate-300">
                                        Arrastra tu archivo aquí o haz clic para seleccionar
                                    </p>
                                    <p className="text-xs">Soporta .xlsx, .xls, .csv</p>
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Analysis Report */}
            {reportData && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-500">

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-blue-800 dark:text-blue-300">
                                    Ventas {selectedCompany?.name || "Mi Empresa"}
                                </CardTitle>
                                <DollarSign className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-blue-700 dark:text-blue-200">{formatCurrency(reportData.mySalesTotal)}</div>
                                <p className="text-xs text-blue-600/80 dark:text-blue-400/80">
                                    {reportData.mySalesCount} transacciones
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                    Ventas Competencia
                                </CardTitle>
                                <AlertCircle className="h-4 w-4 text-slate-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                                    {formatCurrency(reportData.totalMarketSales - reportData.mySalesTotal)}
                                </div>
                                <p className="text-xs text-slate-500">
                                    Total mercado: {formatCurrency(reportData.totalMarketSales)}
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                    Participación Mercado
                                </CardTitle>
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                                    {reportData.marketShare.toFixed(1)}%
                                </div>
                                <p className="text-xs text-slate-500">
                                    De las ventas totales analizadas
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                    Productos Analizados
                                </CardTitle>
                                <Package className="h-4 w-4 text-purple-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                                    {reportData.topProducts.length}
                                </div>
                                <p className="text-xs text-slate-500">
                                    Items únicos encontrados
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Competitor Chart */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Top Competidores</CardTitle>
                                <CardDescription>Por volumen de ventas/adjudicaciones</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[350px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={reportData.topCompetitors} layout="vertical" margin={{ left: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 12 }} />
                                        <Tooltip formatter={(value) => formatCurrency(value as number)} />
                                        <Bar dataKey="total" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Ventas" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        {/* Product Analysis Table */}
                        <Card className="col-span-1">
                            <CardHeader>
                                <CardTitle>Análisis de Productos/Precios</CardTitle>
                                <CardDescription>Top 5 productos con mayor movimiento</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Producto</TableHead>
                                            <TableHead className="text-right">Precio Prom.</TableHead>
                                            <TableHead className="text-right">Total</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {reportData.topProducts.slice(0, 5).map((prod: any, i: number) => (
                                            <TableRow key={i}>
                                                <TableCell className="font-medium text-xs max-w-[200px] truncate" title={prod.name}>
                                                    {prod.name}
                                                </TableCell>
                                                <TableCell className="text-right text-xs">
                                                    {formatCurrency(prod.avgPrice)}
                                                    <div className="text-[10px] text-slate-400">
                                                        Min: {formatCurrency(prod.minPrice)}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right font-semibold text-xs text-emerald-600 dark:text-emerald-400">
                                                    {formatCurrency(prod.total)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                        {/* Entity Chart */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Top Entidades Compradoras</CardTitle>
                                <CardDescription>Instituciones con mayor volumen de compra</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[350px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={reportData.topEntities} layout="vertical" margin={{ left: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 10 }} />
                                        <Tooltip formatter={(value) => formatCurrency(value as number)} />
                                        <Bar dataKey="total" fill="#6366f1" radius={[0, 4, 4, 0]} name="Compras" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="mt-8">
                        <Card>
                            <CardHeader>
                                <CardTitle>Análisis Detallado de Precios por Producto</CardTitle>
                                <CardDescription>Listado completo de productos agrupados por Número de Parte (Top 200)</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="rounded-md border max-h-[600px] overflow-auto relative">
                                    <Table>
                                        <TableHeader className="sticky top-0 bg-white dark:bg-slate-950 z-10 shadow-sm">
                                            <TableRow>
                                                <TableHead className="w-[120px]">Nro. Parte (PN)</TableHead>
                                                <TableHead>Producto</TableHead>
                                                <TableHead className="text-center w-[80px]">Cant. Ordenes</TableHead>
                                                <TableHead className="text-right">Precio Min</TableHead>
                                                <TableHead className="text-right">Precio Max</TableHead>
                                                <TableHead className="text-right">Precio Promedio</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {detailedProducts.slice(0, 200).map((p: any, i: number) => (
                                                <TableRow key={i} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                                                    <TableCell className="font-mono text-xs font-medium text-slate-500 dark:text-slate-400">
                                                        {p.pn !== "N/A" ? p.pn : "-"}
                                                    </TableCell>
                                                    <TableCell className="text-xs">
                                                        <div className="font-medium text-slate-700 dark:text-slate-200 max-w-[400px] truncate" title={p.name}>
                                                            {p.name}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center text-xs font-semibold bg-slate-50/50 dark:bg-slate-900/20">
                                                        {p.count}
                                                    </TableCell>
                                                    <TableCell className="text-right text-xs text-emerald-600 dark:text-emerald-400">
                                                        {formatCurrency(p.min)}
                                                    </TableCell>
                                                    <TableCell className="text-right text-xs text-rose-600 dark:text-rose-400">
                                                        {formatCurrency(p.max)}
                                                    </TableCell>
                                                    <TableCell className="text-right text-xs font-bold text-slate-900 dark:text-slate-100 bg-slate-50/30 dark:bg-slate-900/10">
                                                        {formatCurrency(p.avg)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    )
}
