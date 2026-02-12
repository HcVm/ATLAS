"use client"

import { useState, useCallback } from "react"
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
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { range: 5 }) // Headers are on line 6 (skip 0-4)

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
        const firstRow = data[0]
        if (!firstRow.hasOwnProperty(COL_ORDEN) || !firstRow.hasOwnProperty(COL_PROVEEDOR)) {
            console.error("Missing columns", Object.keys(firstRow))
            toast.error("El archivo no tiene el formato esperado. Faltan columnas clave como 'Orden Electrónica' o 'Razón Social Proveedor'.")
            return
        }

        const myCompanyKeyword = selectedCompany?.name || ""
        const normalize = (s: string) => s?.toString().toUpperCase().trim() || ""

        let mySalesTotal = 0
        let mySalesCount = 0
        let totalMarketSales = 0

        const COL_ENTIDAD = "Razón Social Entidad"
        const COL_PRECIO_UNITARIO = "Precio Unitario"
        const COL_ACUERDO = "Acuerdo Marco"
        const COL_CATALOGO = "Catálogo"
        const competitors: Record<string, number> = {}
        const entities: Record<string, number> = {}
        const products: Record<string, { count: number, totalAmount: number, minPrice: number, maxPrice: number, sumUnitPrices: number }> = {}

        let processedRows = 0
        let acuerdoValid = ""
        let catalogoValid = ""

        data.forEach(row => {
            // 1. FILTERING LOGIC: Only processed orders ending in -1
            const orden = row[COL_ORDEN]?.toString() || ""
            if (!orden.endsWith("-1")) {
                return // Skip drafts or duplicates ending in -0
            }

            processedRows++

            const provider = normalize(row[COL_PROVEEDOR])
            const entity = normalize(row[COL_ENTIDAD])

            // Parse amounts safely
            const parseAmount = (val: any) => {
                if (typeof val === 'number') return val
                if (typeof val === 'string') return parseFloat(val.replace(/[^0-9.-]+/g, ""))
                return 0
            }

            let amount = parseAmount(row[COL_MONTO])
            let unitPrice = parseAmount(row[COL_PRECIO_UNITARIO]) // Use explicit Unit Price

            if (isNaN(amount)) amount = 0
            if (isNaN(unitPrice) || unitPrice === 0) {
                // Fallback if unit price is missing but we have total and count (usually 1 per row structure dependent)
                // Assuming row is a specific delivery item, quantity might be needed to calc unit price if missing
                // For now, if 0, treat as amount (if quantity 1) or skip price stats
                unitPrice = amount
            }

            const product = row[COL_PRODUCTO] ? normalize(row[COL_PRODUCTO]) : "DESCONOCIDO"

            totalMarketSales += amount

            // Identify My Company
            // Checks matches against Name, Code, or RUC
            const companyName = normalize(selectedCompany?.name || "")
            const companyCode = normalize(selectedCompany?.code || "")
            const companyRuc = normalize(selectedCompany?.ruc || "")

            const isMe = selectedCompany && (
                (companyName && provider.includes(companyName)) ||
                (companyCode && provider.includes(companyCode)) ||
                (companyRuc && provider.includes(companyRuc))
            )

            if (isMe) {
                mySalesTotal += amount
                mySalesCount++
            } else {
                competitors[provider] = (competitors[provider] || 0) + amount
            }

            // Entity Analysis
            if (entity) {
                entities[entity] = (entities[entity] || 0) + amount
            }

            // Metadata extraction (take from first valid occurrence)
            if (!acuerdoValid && row[COL_ACUERDO]) acuerdoValid = row[COL_ACUERDO]
            if (!catalogoValid && row[COL_CATALOGO]) catalogoValid = row[COL_CATALOGO]

            // Product Analysis
            if (!products[product]) {
                products[product] = { count: 0, totalAmount: 0, minPrice: unitPrice, maxPrice: unitPrice, sumUnitPrices: 0 }
            }
            products[product].count++
            products[product].totalAmount += amount
            products[product].sumUnitPrices += unitPrice
            products[product].minPrice = Math.min(products[product].minPrice, unitPrice)
            products[product].maxPrice = Math.max(products[product].maxPrice, unitPrice)
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

        setReportData({
            mySalesTotal,
            mySalesCount,
            totalMarketSales,
            marketShare: totalMarketSales > 0 ? (mySalesTotal / totalMarketSales) * 100 : 0,
            topCompetitors,
            topEntities,
            topProducts,
            acuerdo: acuerdoValid,
            catalogo: catalogoValid,
            mappedColumns: { providerCol: COL_PROVEEDOR, amountCol: COL_MONTO, productCol: COL_PRODUCTO, dateCol: COL_FECHA }
        })

        toast.success(`Análisis completado. ${processedRows} registros procesados.`)
    }
    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(val)
    }

    const generatePDF = async () => {
        if (!reportData) return

        const doc = new jsPDF()
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
        doc.roundedRect(14, metaY, pageWidth - 28, 32, 2, 2, 'FD')

        const drawMetaItem = (label: string, value: string, x: number, y: number) => {
            doc.setFontSize(8)
            doc.setTextColor(100, 116, 139) // Slate 500
            doc.setFont("helvetica", "bold")
            doc.text(label.toUpperCase(), x, y)

            doc.setFontSize(10)
            doc.setTextColor(15, 23, 42) // Slate 900
            doc.setFont("helvetica", "normal")
            // Handle long text wrapping if necessary (simple slice for now)
            const safeValue = value.length > 50 ? value.substring(0, 48) + "..." : value
            doc.text(safeValue, x, y + 5)
        }

        drawMetaItem("Empresa Consultante", selectedCompany?.name || "Mi Empresa", 20, metaY + 10)
        drawMetaItem("Fecha de Reporte", today, 120, metaY + 10)

        const acuerdo = reportData.acuerdo?.toString() || "No especificado"
        const catalogo = reportData.catalogo?.toString() || "No especificado"
        drawMetaItem("Acuerdo Marco", acuerdo, 20, metaY + 24)
        drawMetaItem("Catálogo Electrónico", catalogo, 120, metaY + 24)

        // --- Executive Summary ---
        let currentY = 95
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

        // --- Competitor Analysis ---
        currentY = (doc as any).lastAutoTable.finalY + 15
        doc.setFontSize(14)
        doc.setTextColor(15, 23, 42)
        doc.text("Top 10 Competidores", 14, currentY)

        autoTable(doc, {
            startY: currentY + 5,
            head: [['Razón Social', 'Ventas Totales']],
            body: reportData.topCompetitors.map((c: any) => [c.name, formatCurrency(c.total)]),
            headStyles: { fillColor: [30, 41, 59] }, // Slate 800
            columnStyles: {
                0: { cellWidth: 'auto' },
                1: { halign: 'right', fontStyle: 'bold', cellWidth: 40 }
            },
            alternateRowStyles: { fillColor: [241, 245, 249] },
            styles: { fontSize: 9 }
        })

        // --- Entity Analysis ---
        currentY = (doc as any).lastAutoTable.finalY + 15

        // Check page split
        if (currentY > pageHeight - 60) {
            doc.addPage()
            currentY = 20
        }

        doc.setFontSize(14)
        doc.text("Top 10 Entidades Compradoras", 14, currentY)

        autoTable(doc, {
            startY: currentY + 5,
            head: [['Entidad Pública', 'Monto Compra']],
            body: reportData.topEntities.map((e: any) => [e.name, formatCurrency(e.total)]),
            headStyles: { fillColor: [79, 70, 229] }, // Indigo 600
            columnStyles: {
                0: { cellWidth: 'auto' },
                1: { halign: 'right', fontStyle: 'bold', cellWidth: 40 }
            },
            alternateRowStyles: { fillColor: [241, 245, 249] },
            styles: { fontSize: 9 }
        })

        // --- Product Analysis ---
        currentY = (doc as any).lastAutoTable.finalY + 15
        if (currentY > pageHeight - 60) {
            doc.addPage()
            currentY = 20
        }

        doc.setFontSize(14)
        doc.text("Análisis de Productos y Precios", 14, currentY)

        autoTable(doc, {
            startY: currentY + 5,
            head: [['Producto', 'P. Prom.', 'Min', 'Max', 'Total Venta']],
            body: reportData.topProducts.slice(0, 50).map((p: any) => [
                p.name,
                formatCurrency(p.avgPrice),
                formatCurrency(p.minPrice),
                formatCurrency(p.maxPrice),
                formatCurrency(p.total)
            ]),
            headStyles: { fillColor: [16, 185, 129] }, // Emerald 500
            columnStyles: {
                0: { cellWidth: 80, fontSize: 8 }, // Smaller font for long names
                1: { halign: 'right', cellWidth: 25 },
                2: { halign: 'right', cellWidth: 25 },
                3: { halign: 'right', cellWidth: 25 },
                4: { halign: 'right', fontStyle: 'bold', cellWidth: 30 }
            },
            alternateRowStyles: { fillColor: [241, 245, 249] },
            styles: { fontSize: 9, cellPadding: 3 }
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
        doc.save(`ATLAS_Reporte_${safeDate}.pdf`)
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
                </div>
            )}
        </div>
    )
}
