"use client"

import { useEffect, useState, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Barcode,
  Search,
  Printer,
  Package,
  Hash,
  ShoppingCart,
  ChevronDown,
  ChevronUp,
  FileText,
  Building2,
  AlertCircle,
  Tag,
  QrCode,
  ScanBarcode
} from 'lucide-react'
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { useCompany } from "@/lib/company-context"
import { useToast } from "@/hooks/use-toast"
import JsBarcode from "jsbarcode"
import QRCode from "qrcode"
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { SaleStickersSection } from "./sale-stickers-section"
import { SeriesFilterModal } from "@/components/warehouse/series-filter-modal"
import { motion } from "framer-motion"

interface SaleWithLots {
  id: string
  sale_number: string
  entity_name: string
  entity_ruc: string
  ocam: string | null
  created_at: string
  sale_items: Array<{
    id: string
    product_id: string
    product_code: string
    product_name: string
    quantity: number
    product_lots: Array<{
      id: string
      lot_number: string
      quantity: number
      product_serials: Array<{
        id: string
        serial_number: string
        status: string
      }>
    }>
  }>
}

interface BarcodeData {
  serialNumber: string
  lotNumber: string
  productCode: string
  productName: string
  barcodeUrl: string
  qrCodeUrl: string
  productHash: string
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4 }
  }
}

function sortSerialsNumerically(serials: string[]): string[] {
  return serials.sort((a, b) => {
    // Extract the numeric part from the end of each serial
    const aMatch = a.match(/(\d+)$/)
    const bMatch = b.match(/(\d+)$/)

    if (!aMatch || !bMatch) {
      // If either doesn't have a numeric suffix, do string comparison
      return a.localeCompare(b)
    }

    const aNum = parseInt(aMatch[1], 10)
    const bNum = parseInt(bMatch[1], 10)

    // Compare numerically
    if (aNum !== bNum) {
      return aNum - bNum
    }

    // If numeric parts are equal, compare the prefix alphabetically
    const aPrefix = a.substring(0, a.length - aMatch[1].length)
    const bPrefix = b.substring(0, b.length - bMatch[1].length)
    return aPrefix.localeCompare(bPrefix)
  })
}


export default function EtiquetadoPage() {
  const { user } = useAuth()
  const { selectedCompany } = useCompany()
  const { toast } = useToast()
  const [sales, setSales] = useState<SaleWithLots[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedSale, setSelectedSale] = useState<SaleWithLots | null>(null)
  const [barcodes, setBarcodes] = useState<BarcodeData[]>([])
  const [generatingBarcodes, setGeneratingBarcodes] = useState(false)
  const [expandedSale, setExpandedSale] = useState<string | null>(null)
  const printRef = useRef<HTMLDivElement>(null)
  const [filterModalOpen, setFilterModalOpen] = useState(false)
  const [filteredSerials, setFilteredSerials] = useState<string[]>([])
  const [currentSaleAllSerials, setCurrentSaleAllSerials] = useState<string[]>([])

  useEffect(() => {
    const companyId = user?.role === "admin" ? selectedCompany?.id : user?.company_id

    if (companyId) {
      fetchSalesWithLots(companyId)
    }
  }, [user, selectedCompany])

  const fetchSalesWithLots = async (companyId: string) => {
    try {
      setLoading(true)

      const { data: salesData, error: salesError } = await supabase
        .from("sales")
        .select(`
          id,
          sale_number,
          entity_name,
          entity_ruc,
          ocam,
          created_at
        `)
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })

      if (salesError) throw salesError

      const salesWithLots = await Promise.all(
        (salesData || []).map(async (sale) => {
          const { data: items, error: itemsError } = await supabase
            .from("sale_items")
            .select(`
              id,
              product_id,
              product_code,
              product_name,
              quantity
            `)
            .eq("sale_id", sale.id)

          if (itemsError) {
            console.error("Error fetching items:", itemsError)
            return { ...sale, sale_items: [] }
          }

          const itemsWithLots = await Promise.all(
            (items || []).map(async (item) => {
              const { data: lots, error: lotsError } = await supabase
                .from("product_lots")
                .select(`
                  id,
                  lot_number,
                  quantity
                `)
                .eq("sale_id", sale.id)
                .eq("product_id", item.product_id)

              if (lotsError) {
                console.error("Error fetching lots:", lotsError)
                return { ...item, product_lots: [] }
              }

              const lotsWithSerials = await Promise.all(
                (lots || []).map(async (lot) => {
                  let allSerials: any[] = []
                  let offset = 0
                  const pageSize = 1000

                  while (true) {
                    const { data: serials, error: serialsError } = await supabase
                      .from("product_serials")
                      .select(`
                        id,
                        serial_number,
                        status
                      `)
                      .eq("lot_id", lot.id)
                      .order("serial_number", { ascending: true })
                      .range(offset, offset + pageSize - 1)

                    if (serialsError) {
                      console.error("Error fetching serials:", serialsError)
                      break
                    }

                    if (!serials || serials.length === 0) break

                    allSerials = [...allSerials, ...serials]

                    if (serials.length < pageSize) break

                    offset += pageSize
                  }

                  return { ...lot, product_serials: allSerials }
                }),
              )

              return { ...item, product_lots: lotsWithSerials }
            }),
          )

          return { ...sale, sale_items: itemsWithLots }
        }),
      )

      const salesWithLotsFiltered = salesWithLots.filter((sale) =>
        sale.sale_items.some((item) => item.product_lots.length > 0),
      )

      setSales(salesWithLotsFiltered)
    } catch (error) {
      console.error("Error fetching sales:", error)
      toast({
        title: "Error",
        description: "Error al cargar las ventas con lotes",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const areAllSeriesDeliveredOrSold = (sale: SaleWithLots): boolean => {
    // "in_inventory" and "sold" status should allow sticker generation
    let totalSerials = 0
    let deliveredSerials = 0

    for (const item of sale.sale_items) {
      for (const lot of item.product_lots) {
        for (const serial of lot.product_serials) {
          totalSerials++
          if (serial.status === "delivered") {
            deliveredSerials++
          }
        }
      }
    }

    return totalSerials > 0 && totalSerials === deliveredSerials
  }

  const generateBarcodesForSale = async (sale: SaleWithLots) => {
    if (areAllSeriesDeliveredOrSold(sale)) {
      toast({
        title: "No se pueden generar stickers",
        description:
          "Todas las series de esta venta ya están entregadas. No es posible generar stickers duplicados.",
        variant: "destructive",
      })
      return
    }

    // "in_inventory" and "sold" status can generate stickers
    const allSerials: string[] = []
    for (const item of sale.sale_items) {
      for (const lot of item.product_lots) {
        for (const serial of lot.product_serials) {
          if (serial.status !== "delivered") {
            allSerials.push(serial.serial_number)
          }
        }
      }
    }

    const sortedSerials = sortSerialsNumerically(allSerials)

    setCurrentSaleAllSerials(sortedSerials)
    setFilteredSerials(sortedSerials)
    setSelectedSale(sale)
    setFilterModalOpen(true)
  }

  const handleFilterApply = async (filteredSerials: string[]) => {
    if (filteredSerials.length === 0) {
      toast({
        title: "Sin series",
        description: "Selecciona al menos una serie",
        variant: "destructive",
      })
      return
    }

    try {
      setGeneratingBarcodes(true)

      const sortedFilteredSerials = sortSerialsNumerically(filteredSerials)
      const barcodesData: BarcodeData[] = []

      if (!selectedSale) return

      for (const item of selectedSale.sale_items) {
        const { data: productData, error: productError } = await supabase
          .from("products")
          .select("qr_code_hash")
          .eq("id", item.product_id)
          .single()

        if (productError) {
          console.error("Error fetching product hash:", productError)
          continue
        }

        const productHash = productData?.qr_code_hash || ""

        for (const lot of item.product_lots) {
          for (const serial of lot.product_serials) {
            if (!sortedFilteredSerials.includes(serial.serial_number)) {
              continue
            }

            if (serial.status === "delivered") {
              continue
            }

            const barcodeText = `${serial.serial_number}`

            try {
              const canvas = document.createElement("canvas")
              canvas.width = 1200
              canvas.height = 200

              JsBarcode(canvas, barcodeText, {
                format: "CODE128",
                width: 3,
                height: 120,
                displayValue: false,
                margin: 4,
                background: "#ffffff",
                lineColor: "#000000",
              })

              const barcodeUrl = canvas.toDataURL("image/png")

              let qrCodeUrl = ""
              if (productHash) {
                const publicUrl = `${window.location.origin}/public/product/${productHash}`
                qrCodeUrl = await QRCode.toDataURL(publicUrl, {
                  errorCorrectionLevel: "H",
                  width: 280,
                  margin: 1,
                  color: {
                    dark: "#000000",
                    light: "#ffffff",
                  },
                })
              }

              barcodesData.push({
                serialNumber: serial.serial_number,
                lotNumber: lot.lot_number,
                productCode: item.product_code,
                productName: item.product_name,
                barcodeUrl,
                qrCodeUrl,
                productHash,
              })
            } catch (err) {
              console.error("Error generating barcode/QR:", err)
            }
          }
        }
      }

      barcodesData.sort((a, b) => {
        const aNum = parseInt(a.serialNumber.match(/(\d+)$/)?.[1] || "0", 10)
        const bNum = parseInt(b.serialNumber.match(/(\d+)$/)?.[1] || "0", 10)

        if (aNum !== bNum) {
          return aNum - bNum
        }

        return a.serialNumber.localeCompare(b.serialNumber)
      })

      setBarcodes(barcodesData)

      toast({
        title: "Códigos generados",
        description: `Se generaron ${barcodesData.length} códigos de barras y QR`,
      })
    } catch (error) {
      console.error("Error generating barcodes:", error)
      toast({
        title: "Error",
        description: "Error al generar códigos de barras",
        variant: "destructive",
      })
    } finally {
      setGeneratingBarcodes(false)
    }
  }

  const handlePrint = () => {
    if (printRef.current) {
      const printWindow = window.open("", "_blank")
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Etiquetas - ${selectedSale?.sale_number}</title>
              <meta charset="UTF-8">
              <style>
                @page {
                  size: 62mm 37mm;
                  margin: 0;
                }
                * {
                  box-sizing: border-box;
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }
                body {
                  font-family: Arial, sans-serif;
                  margin: 0;
                  padding: 0;
                  background: white;
                }
                .sticker-grid {
                  display: flex;
                  flex-direction: column;
                  gap: 0;
                  padding: 0;
                  width: 100%;
                }
                .sticker {
                  width: 62mm;
                  height: 37mm;
                  border: 2px solid #ffffffff;
                  border-radius: 8px;
                  padding: 1.5mm;
                  page-break-after: always;
                  page-break-inside: avoid;
                  background: white;
                  display: flex;
                  flex-direction: column;
                  gap: 1mm;
                  box-sizing: border-box;
                }
                .barcode-section {
                  width: 100%;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                }
                .bottom-section {
                  flex: 1;
                  display: flex;
                  gap: 1.5mm;
                  align-items: flex-start;
                }
                .info-column {
                  flex: 1;
                  display: flex;
                  flex-direction: column;
                  justify-content: flex-start;
                  gap: 0.5mm;
                  min-width: 0;
                }
                .qr-column {
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  justify-content: flex-start;
                  gap: 0.5mm;
                  flex-shrink: 0;
                }
                .sticker img.barcode {
                  width: 100%;
                  max-width: 58mm;
                  height: auto;
                  max-height: 10mm;
                  display: block;
                  object-fit: contain;
                }
                .sticker img.qr-code {
                  width: 65px;
                  height: 65px;
                  display: block;
                }
                .qr-label {
                  font-size: 7pt;
                  text-align: center;
                  color: #000000ff;
                  line-height: 1.1;
                  max-width: 65px;
                  font-weight: 500;
                  font-family: Arial, sans-serif;
                }
                .sticker-info {
                  width: 100%;
                  text-align: left;
                }
                .serial {
                  font-weight: 700;
                  font-size: 8.5pt;
                  margin: 0.3mm 0;
                  font-family: 'Courier New', monospace;
                  word-break: break-all;
                  line-height: 1.15;
                  color: #000;
                  letter-spacing: -0.2px;
                }
                .lot {
                  font-size: 8pt;
                  color: #000000ff;
                  font-family: 'Courier New', monospace;
                  margin: 0.3mm 0;
                  line-height: 1.1;
                  font-weight: 700;
                }
                .product {
                  margin-top: 0.3mm;
                  line-height: 1.1;
                }
                .product-name {
                  font-weight: 700;
                  font-size: 6pt;
                  margin-bottom: 0.3mm;
                  color: #000;
                  font-family: Arial, sans-serif;
                  line-height: 1.1;
                }
                .product-code {
                  color: #000000ff;
                  font-size: 6.5pt;
                  font-family: Arial, sans-serif;
                  font-weight: 600;
                  line-height: 1.1;
                }
                @media print {
                  body {
                    margin: 0;
                    padding: 0;
                  }
                  .sticker {
                    border: 2px solid #ffffffff !important;
                    border-radius: 8px !important;
                  }
                  .serial, .lot, .product-name, .product-code {
                    font-weight: 700 !important;
                  }
                }
              </style>
            </head>
            <body>
              <div class="sticker-grid">
                ${barcodes
            .map(
              (barcode) => `
                  <div class="sticker">
                    <div class="barcode-section">
                      <img src="${barcode.barcodeUrl}" alt="${barcode.serialNumber}" class="barcode" />
                    </div>
                    <div class="bottom-section">
                      <div class="info-column">
                        <div class="sticker-info">
                          <div class="serial">${barcode.serialNumber}</div>
                          <div class="lot">Lote: ${barcode.lotNumber}</div>
                          <div class="product">
                            <div class="product-name">${barcode.productName}</div>
                            <div class="product-code">${barcode.productCode}</div>
                          </div>
                        </div>
                      </div>
                      ${barcode.qrCodeUrl
                  ? `
                      <div class="qr-column">
                        <img src="${barcode.qrCodeUrl}" alt="QR Code" class="qr-code" />
                        <div class="qr-label">Información del producto</div>
                      </div>
                      `
                  : ""
                }
                    </div>
                  </div>
                `,
            )
            .join("")}
              </div>
            </body>
          </html>
        `)
        printWindow.document.close()
        setTimeout(() => {
          printWindow.print()
        }, 250)
      }
    }
  }

  const filteredSales = sales.filter(
    (sale) =>
      sale.sale_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.entity_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.entity_ruc?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.ocam?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const getTotalSerials = (sale: SaleWithLots) => {
    return sale.sale_items.reduce(
      (total, item) => total + item.product_lots.reduce((lotTotal, lot) => lotTotal + lot.product_serials.length, 0),
      0,
    )
  }

  const toggleSaleDetails = (saleId: string) => {
    setExpandedSale(expandedSale === saleId ? null : saleId)
  }

  if (loading) {
    return (
      <div className="space-y-8 p-4 sm:p-6 lg:p-8 min-h-[calc(100vh-4rem)]">
        <div className="flex items-center gap-4 mb-8">
          <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse" />
          <div className="space-y-2">
            <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-8 p-4 sm:p-6 lg:p-8 min-h-[calc(100vh-4rem)]"
    >
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-slate-900 via-slate-700 to-slate-600 dark:from-white dark:via-slate-200 dark:to-slate-400 bg-clip-text text-transparent flex items-center gap-3">
            <ScanBarcode className="h-8 w-8 text-indigo-500" />
            Etiquetado
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Generación de códigos de barras y QR para impresión
          </p>
        </div>
      </motion.div>

      <Tabs defaultValue="labeling" className="w-full">
        <TabsList className="grid w-full grid-cols-1 bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl">
          <TabsTrigger
            value="labeling"
            className="flex items-center gap-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm transition-all"
          >
            <Barcode className="h-4 w-4" />
            <span>Etiquetas de Inventario</span>
          </TabsTrigger>
          {/* <TabsTrigger 
             value="sale-stickers" 
             className="flex items-center gap-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm transition-all"
          >
            <Tag className="h-4 w-4" />
            <span>Stickers de Venta</span>
          </TabsTrigger> */}
        </TabsList>

        {/* Inventory Labeling Tab */}
        <TabsContent value="labeling" className="space-y-6 mt-6">
          <motion.div variants={itemVariants} className="grid gap-6 sm:grid-cols-3">
            <Card className="border-none shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-md overflow-hidden relative">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <ShoppingCart className="h-24 w-24 text-blue-500" />
              </div>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">Ventas con Lotes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-800 dark:text-slate-100">{sales.length}</div>
                <p className="text-xs text-slate-500 mt-1">Pendientes de etiquetado</p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-md overflow-hidden relative">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Package className="h-24 w-24 text-emerald-500" />
              </div>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Productos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-800 dark:text-slate-100">
                  {sales.reduce((total, sale) => total + sale.sale_items.length, 0)}
                </div>
                <p className="text-xs text-slate-500 mt-1">En todas las ventas</p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-md overflow-hidden relative">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Hash className="h-24 w-24 text-purple-500" />
              </div>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Series</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-800 dark:text-slate-100">
                  {sales.reduce((total, sale) => total + getTotalSerials(sale), 0)}
                </div>
                <p className="text-xs text-slate-500 mt-1">Códigos únicos</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="border-none shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-md overflow-hidden">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
                <CardTitle className="flex items-center gap-2 text-lg text-slate-800 dark:text-slate-100">
                  <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-600 dark:text-indigo-400">
                    <Barcode className="h-5 w-5" />
                  </div>
                  Ventas con Lotes y Series
                </CardTitle>
                <CardDescription>
                  Selecciona una venta para generar códigos de barras
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                    <Input
                      placeholder="Buscar por número de venta, cliente, RUC, OCAM..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 h-11"
                    />
                  </div>

                  {/* Mobile View */}
                  <div className="lg:hidden space-y-4">
                    {filteredSales.length > 0 ? (
                      filteredSales.map((sale) => (
                        <Card key={sale.id} className="border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
                          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <CardTitle className="text-sm font-bold truncate flex items-center gap-2">
                                  Venta #{sale.sale_number}
                                </CardTitle>
                                {sale.ocam && (
                                  <Badge
                                    variant="outline"
                                    className="mt-2 text-xs bg-orange-50 border-orange-200 text-orange-700"
                                  >
                                    OCAM: {sale.ocam}
                                  </Badge>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleSaleDetails(sale.id)}
                                className="h-8 w-8 p-0 flex-shrink-0 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                              >
                                {expandedSale === sale.id ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent className="p-4 space-y-4">
                            <div className="flex items-start gap-3">
                              <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                                <Building2 className="h-4 w-4 text-slate-500" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate text-slate-700 dark:text-slate-200">{sale.entity_name}</p>
                                <p className="text-xs text-slate-500 mt-0.5">RUC: {sale.entity_ruc || "-"}</p>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
                                <Package className="h-4 w-4 text-slate-400" />
                                <span className="text-xs font-medium">{sale.sale_items.length} productos</span>
                              </div>
                              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
                                <Hash className="h-4 w-4 text-slate-400" />
                                <span className="text-xs font-medium">{getTotalSerials(sale)} series</span>
                              </div>
                            </div>

                            <div className="text-xs text-slate-400 text-right">
                              {new Date(sale.created_at).toLocaleDateString("es-PE", { year: 'numeric', month: 'long', day: 'numeric' })}
                            </div>

                            {expandedSale === sale.id && (
                              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                                <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                                  <FileText className="h-4 w-4 text-indigo-500" />
                                  Productos
                                </div>
                                {sale.sale_items.map((item) => (
                                  <div key={item.id} className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 space-y-2 border border-slate-100 dark:border-slate-800">
                                    <div>
                                      <p className="font-medium text-sm text-slate-700 dark:text-slate-200">{item.product_name}</p>
                                      <p className="text-xs text-slate-500 font-mono mt-0.5">{item.product_code}</p>
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <Badge variant="outline" className="text-xs bg-white dark:bg-slate-900">
                                        Cant: {item.quantity}
                                      </Badge>
                                      {item.product_lots.map((lot) => (
                                        <Badge key={lot.id} variant="secondary" className="text-xs font-mono">
                                          {lot.lot_number}
                                        </Badge>
                                      ))}
                                      <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800">
                                        {item.product_lots.reduce(
                                          (total, lot) => total + lot.product_serials.length,
                                          0,
                                        )}{" "}
                                        series
                                      </Badge>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {areAllSeriesDeliveredOrSold(sale) ? (
                              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-center gap-2 text-amber-700 dark:text-amber-400 text-sm">
                                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                <span>Todas las series entregadas</span>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => generateBarcodesForSale(sale)}
                                disabled={generatingBarcodes}
                                className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20"
                              >
                                <Barcode className="h-4 w-4 mr-2" />
                                Generar Códigos
                              </Button>
                            )}
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                        <Search className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500 dark:text-slate-400">No se encontraron ventas</p>
                      </div>
                    )}
                  </div>

                  {/* Desktop Table */}
                  <div className="hidden lg:block rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <Table>
                      <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
                        <TableRow>
                          <TableHead className="w-12"></TableHead>
                          <TableHead className="text-slate-600 dark:text-slate-400 font-semibold">Venta</TableHead>
                          <TableHead className="text-slate-600 dark:text-slate-400 font-semibold">OCAM</TableHead>
                          <TableHead className="text-slate-600 dark:text-slate-400 font-semibold">Cliente</TableHead>
                          <TableHead className="text-slate-600 dark:text-slate-400 font-semibold">RUC</TableHead>
                          <TableHead className="text-slate-600 dark:text-slate-400 font-semibold">Resumen</TableHead>
                          <TableHead className="text-slate-600 dark:text-slate-400 font-semibold">Fecha</TableHead>
                          <TableHead className="text-right text-slate-600 dark:text-slate-400 font-semibold">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredSales.length > 0 ? (
                          filteredSales.map((sale) => (
                            <>
                              <TableRow key={sale.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => toggleSaleDetails(sale.id)}
                                    className="h-8 w-8 p-0 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"
                                  >
                                    {expandedSale === sale.id ? (
                                      <ChevronUp className="h-4 w-4 text-slate-500" />
                                    ) : (
                                      <ChevronDown className="h-4 w-4 text-slate-500" />
                                    )}
                                  </Button>
                                </TableCell>
                                <TableCell className="font-medium text-slate-700 dark:text-slate-200">
                                  {sale.sale_number}
                                </TableCell>
                                <TableCell>
                                  {sale.ocam ? (
                                    <Badge variant="outline" className="font-mono text-xs bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800">
                                      {sale.ocam}
                                    </Badge>
                                  ) : (
                                    <span className="text-slate-400">-</span>
                                  )}
                                </TableCell>
                                <TableCell className="max-w-[200px] truncate text-slate-600 dark:text-slate-300" title={sale.entity_name}>
                                  {sale.entity_name}
                                </TableCell>
                                <TableCell className="text-slate-600 dark:text-slate-300">
                                  {sale.entity_ruc || "-"}
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-2">
                                    <Badge variant="secondary" className="bg-slate-100 text-slate-600">
                                      {sale.sale_items.length} prod
                                    </Badge>
                                    <Badge variant="secondary" className="bg-indigo-50 text-indigo-600">
                                      {getTotalSerials(sale)} series
                                    </Badge>
                                  </div>
                                </TableCell>
                                <TableCell className="text-slate-500 text-sm">
                                  {new Date(sale.created_at).toLocaleDateString("es-PE")}
                                </TableCell>
                                <TableCell className="text-right">
                                  {areAllSeriesDeliveredOrSold(sale) ? (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className="inline-block">
                                            <Button size="sm" variant="ghost" disabled className="text-amber-600 bg-amber-50">
                                              <AlertCircle className="h-4 w-4 mr-2" />
                                              Entregado
                                            </Button>
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p className="text-xs">Todas las series entregadas</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  ) : (
                                    <Button
                                      size="sm"
                                      onClick={() => generateBarcodesForSale(sale)}
                                      disabled={generatingBarcodes}
                                      className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20"
                                    >
                                      <Barcode className="h-4 w-4 mr-2" />
                                      Generar
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                              {expandedSale === sale.id && (
                                <TableRow className="bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                                  <TableCell colSpan={8} className="p-0 border-b border-slate-200 dark:border-slate-800">
                                    <div className="p-6 space-y-4">
                                      <div className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300">
                                        <FileText className="h-4 w-4 text-indigo-500" />
                                        Detalle de Productos
                                      </div>
                                      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                                        <Table>
                                          <TableHeader className="bg-slate-50 dark:bg-slate-800">
                                            <TableRow>
                                              <TableHead className="text-xs font-semibold text-slate-600">Código</TableHead>
                                              <TableHead className="text-xs font-semibold text-slate-600">Producto</TableHead>
                                              <TableHead className="text-xs font-semibold text-slate-600">Cantidad</TableHead>
                                              <TableHead className="text-xs font-semibold text-slate-600">Lotes</TableHead>
                                              <TableHead className="text-xs font-semibold text-slate-600">Series</TableHead>
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {sale.sale_items.map((item) => (
                                              <TableRow key={item.id} className="border-slate-100 dark:border-slate-800">
                                                <TableCell className="font-mono text-xs font-medium text-slate-600 dark:text-slate-400">
                                                  {item.product_code}
                                                </TableCell>
                                                <TableCell className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                                                  {item.product_name}
                                                </TableCell>
                                                <TableCell>
                                                  <Badge variant="outline" className="bg-slate-50">
                                                    {item.quantity}
                                                  </Badge>
                                                </TableCell>
                                                <TableCell>
                                                  <div className="flex gap-1 flex-wrap">
                                                    {item.product_lots.map((lot) => (
                                                      <Badge
                                                        key={lot.id}
                                                        variant="secondary"
                                                        className="font-mono text-xs bg-slate-100 text-slate-600"
                                                      >
                                                        {lot.lot_number}
                                                      </Badge>
                                                    ))}
                                                  </div>
                                                </TableCell>
                                                <TableCell>
                                                  <Badge className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200">
                                                    {item.product_lots.reduce(
                                                      (total, lot) => total + lot.product_serials.length,
                                                      0,
                                                    )}{" "}
                                                    series
                                                  </Badge>
                                                </TableCell>
                                              </TableRow>
                                            ))}
                                          </TableBody>
                                        </Table>
                                      </div>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )}
                            </>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-12">
                              <div className="flex flex-col items-center justify-center text-slate-400">
                                <Search className="h-8 w-8 mb-2 opacity-50" />
                                <p>No se encontraron ventas</p>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>

            {barcodes.length > 0 && selectedSale && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6"
              >
                <Card className="border-none shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-md overflow-hidden border-t-4 border-t-indigo-500">
                  <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <CardTitle className="flex items-center gap-2 text-lg text-slate-800 dark:text-slate-100">
                          <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-emerald-600 dark:text-emerald-400">
                            <QrCode className="h-5 w-5" />
                          </div>
                          Códigos Generados
                        </CardTitle>
                        <CardDescription className="mt-1 flex items-center gap-2">
                          <span className="font-medium text-slate-700 dark:text-slate-300">Venta: {selectedSale.sale_number}</span>
                          {selectedSale.ocam && <span className="px-2 py-0.5 bg-orange-50 text-orange-700 rounded text-xs font-mono border border-orange-100">OCAM: {selectedSale.ocam}</span>}
                          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs font-bold border border-indigo-100">{barcodes.length} etiquetas</span>
                        </CardDescription>
                      </div>
                      <Button
                        onClick={handlePrint}
                        className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-900/20"
                      >
                        <Printer className="h-4 w-4 mr-2" />
                        Imprimir Etiquetas
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 bg-slate-50 dark:bg-slate-900/50">
                    <div ref={printRef} className="sticker-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {barcodes.map((barcode, index) => (
                        <div
                          key={index}
                          className="sticker bg-white border border-slate-200 shadow-sm rounded-lg p-3 flex flex-col gap-2 relative group hover:shadow-md transition-shadow"
                          style={{ width: "62mm", height: "37mm", margin: "0 auto" }}
                        >
                          <div className="barcode-section w-full flex justify-center items-center h-[12mm] overflow-hidden">
                            <img
                              src={barcode.barcodeUrl || "/placeholder.svg"}
                              alt={barcode.serialNumber}
                              className="barcode w-full h-full object-contain"
                            />
                          </div>
                          <div className="bottom-section flex-1 flex gap-2 items-start mt-1">
                            <div className="info-column flex-1 flex flex-col justify-between h-full min-w-0">
                              <div className="sticker-info w-full text-left space-y-0.5">
                                <div className="serial font-mono font-bold text-[9px] leading-tight tracking-tight text-slate-900">
                                  {barcode.serialNumber}
                                </div>
                                <div className="lot font-mono text-[8px] text-slate-600 leading-tight font-bold">
                                  Lote: {barcode.lotNumber}
                                </div>
                                <div className="product mt-1 leading-tight">
                                  <div className="product-name font-bold text-[7px] text-slate-800 leading-tight line-clamp-2">{barcode.productName}</div>
                                  <div className="product-code text-slate-500 text-[7px] font-semibold leading-tight mt-0.5">
                                    {barcode.productCode}
                                  </div>
                                </div>
                              </div>
                            </div>
                            {barcode.qrCodeUrl && (
                              <div className="qr-column flex flex-col items-center justify-start gap-0.5 flex-shrink-0">
                                <img
                                  src={barcode.qrCodeUrl || "/placeholder.svg"}
                                  alt="QR Code"
                                  className="qr-code w-[16mm] h-[16mm]"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </motion.div>
        </TabsContent>

        {/* Sale Stickers Tab */}
        {/* <TabsContent value="sale-stickers" className="mt-6">
          <SaleStickersSection />
        </TabsContent> */}
      </Tabs>

      <SeriesFilterModal
        open={filterModalOpen}
        onOpenChange={setFilterModalOpen}
        totalSeries={currentSaleAllSerials.length}
        allSerials={currentSaleAllSerials}
        onApplyFilter={handleFilterApply}
      />
    </motion.div>
  )
}
