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
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { useCompany } from "@/lib/company-context"
import { useToast } from "@/hooks/use-toast"
import JsBarcode from "jsbarcode"
import QRCode from "qrcode"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { SaleStickersSection } from "./sale-stickers-section"

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
    let totalSerials = 0
    let deliveredOrSoldSerials = 0

    for (const item of sale.sale_items) {
      for (const lot of item.product_lots) {
        for (const serial of lot.product_serials) {
          totalSerials++
          if (serial.status === "delivered" || serial.status === "sold") {
            deliveredOrSoldSerials++
          }
        }
      }
    }

    return totalSerials > 0 && totalSerials === deliveredOrSoldSerials
  }

  const generateBarcodesForSale = async (sale: SaleWithLots) => {
    if (areAllSeriesDeliveredOrSold(sale)) {
      toast({
        title: "No se pueden generar stickers",
        description:
          "Todas las series de esta venta ya están entregadas o vendidas. No es posible generar stickers duplicados.",
        variant: "destructive",
      })
      return
    }

    try {
      setGeneratingBarcodes(true)
      setSelectedSale(sale)

      const barcodesData: BarcodeData[] = []

      for (const item of sale.sale_items) {
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
                      ${
                        barcode.qrCodeUrl
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
      <div className="min-h-screen bg-background">
        <div className="space-y-6 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Etiquetado</h1>
              <p className="text-muted-foreground">Generación de códigos de barras para productos</p>
            </div>
          </div>
          <Card>
            <CardContent className="p-6">
              <div className="text-center text-muted-foreground">Cargando ventas...</div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Etiquetado</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Generación de códigos de barras para impresión de stickers
            </p>
          </div>
        </div>

        <Tabs defaultValue="labeling" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="labeling" className="flex items-center gap-2">
              <Barcode className="h-4 w-4" />
              <span>Etiquetas de Inventario</span>
            </TabsTrigger>
            <TabsTrigger value="sale-stickers" className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              <span>Stickers de Venta</span>
            </TabsTrigger>
          </TabsList>

          {/* Inventory Labeling Tab */}
          <TabsContent value="labeling" className="space-y-4">
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
                  <CardTitle className="text-xs sm:text-sm font-medium">Ventas con Lotes</CardTitle>
                  <ShoppingCart className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0">
                  <div className="text-xl sm:text-2xl font-bold">{sales.length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
                  <CardTitle className="text-xs sm:text-sm font-medium">Total Productos</CardTitle>
                  <Package className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0">
                  <div className="text-xl sm:text-2xl font-bold">
                    {sales.reduce((total, sale) => total + sale.sale_items.length, 0)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
                  <CardTitle className="text-xs sm:text-sm font-medium">Total Series</CardTitle>
                  <Hash className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0">
                  <div className="text-xl sm:text-2xl font-bold">
                    {sales.reduce((total, sale) => total + getTotalSerials(sale), 0)}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Barcode className="h-4 w-4 sm:h-5 sm:w-5" />
                  Ventas con Lotes y Series
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Selecciona una venta para generar códigos de barras
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-3 w-3 sm:h-4 sm:w-4" />
                    <Input
                      placeholder="Buscar por número de venta, cliente, RUC, OCAM..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 sm:pl-10 text-xs sm:text-sm"
                    />
                  </div>

                  <div className="lg:hidden space-y-3">
                    {filteredSales.length > 0 ? (
                      filteredSales.map((sale) => (
                        <Card key={sale.id} className="border-2">
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <CardTitle className="text-sm font-bold truncate">Venta #{sale.sale_number}</CardTitle>
                                {sale.ocam && (
                                  <Badge
                                    variant="outline"
                                    className="mt-1 text-xs bg-orange-50 border-orange-200 text-orange-700"
                                  >
                                    OCAM: {sale.ocam}
                                  </Badge>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleSaleDetails(sale.id)}
                                className="h-8 w-8 p-0 flex-shrink-0"
                              >
                                {expandedSale === sale.id ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="flex items-start gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{sale.entity_name}</p>
                                <p className="text-xs text-muted-foreground">RUC: {sale.entity_ruc || "-"}</p>
                              </div>
                            </div>

                            <div className="flex items-center justify-between gap-2 pt-2 border-t">
                              <div className="flex items-center gap-2">
                                <Package className="h-4 w-4 text-muted-foreground" />
                                <Badge variant="outline" className="text-xs">
                                  {sale.sale_items.length} productos
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2">
                                <Hash className="h-4 w-4 text-muted-foreground" />
                                <Badge variant="secondary" className="text-xs">
                                  {getTotalSerials(sale)} series
                                </Badge>
                              </div>
                            </div>

                            <div className="text-xs text-muted-foreground">
                              {new Date(sale.created_at).toLocaleDateString("es-PE")}
                            </div>

                            {expandedSale === sale.id && (
                              <div className="pt-3 border-t space-y-2">
                                <div className="flex items-center gap-2 text-sm font-medium mb-2">
                                  <FileText className="h-4 w-4" />
                                  Productos
                                </div>
                                {sale.sale_items.map((item) => (
                                  <div key={item.id} className="bg-muted/50 rounded-lg p-3 space-y-2">
                                    <div>
                                      <p className="font-medium text-sm">{item.product_name}</p>
                                      <p className="text-xs text-muted-foreground font-mono">{item.product_code}</p>
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <Badge variant="outline" className="text-xs">
                                        Cant: {item.quantity}
                                      </Badge>
                                      {item.product_lots.map((lot) => (
                                        <Badge key={lot.id} variant="secondary" className="text-xs font-mono">
                                          {lot.lot_number}
                                        </Badge>
                                      ))}
                                      <Badge variant="outline" className="text-xs">
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
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="w-full">
                                      <Button size="sm" disabled className="w-full">
                                        <AlertCircle className="h-4 w-4 mr-2" />
                                        Todas las series entregadas
                                      </Button>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="max-w-xs text-xs">
                                      No se pueden generar stickers porque todas las series ya están entregadas o
                                      vendidas
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => generateBarcodesForSale(sale)}
                                disabled={generatingBarcodes}
                                className="w-full"
                              >
                                <Barcode className="h-4 w-4 mr-2" />
                                Generar Códigos
                              </Button>
                            )}
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <Card>
                        <CardContent className="text-center py-8">
                          <div className="text-muted-foreground text-sm">
                            {sales.length === 0
                              ? "No hay ventas con lotes registrados"
                              : "No se encontraron ventas con los filtros aplicados"}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* Desktop table layout */}
                  <div className="hidden lg:block rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-8 sm:w-12"></TableHead>
                          <TableHead className="text-xs sm:text-sm whitespace-nowrap">Número de Venta</TableHead>
                          <TableHead className="text-xs sm:text-sm whitespace-nowrap">OCAM</TableHead>
                          <TableHead className="text-xs sm:text-sm whitespace-nowrap">Cliente</TableHead>
                          <TableHead className="text-xs sm:text-sm whitespace-nowrap hidden sm:table-cell">
                            RUC
                          </TableHead>
                          <TableHead className="text-xs sm:text-sm whitespace-nowrap">Productos</TableHead>
                          <TableHead className="text-xs sm:text-sm whitespace-nowrap">Total Series</TableHead>
                          <TableHead className="text-xs sm:text-sm whitespace-nowrap hidden md:table-cell">
                            Fecha
                          </TableHead>
                          <TableHead className="text-xs sm:text-sm whitespace-nowrap">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredSales.length > 0 ? (
                          filteredSales.map((sale) => (
                            <>
                              <TableRow key={sale.id}>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => toggleSaleDetails(sale.id)}
                                    className="h-6 w-6 sm:h-8 sm:w-8 p-0"
                                  >
                                    {expandedSale === sale.id ? (
                                      <ChevronUp className="h-3 w-3 sm:h-4 sm:w-4" />
                                    ) : (
                                      <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4" />
                                    )}
                                  </Button>
                                </TableCell>
                                <TableCell className="font-medium text-xs sm:text-sm whitespace-nowrap">
                                  {sale.sale_number}
                                </TableCell>
                                <TableCell>
                                  {sale.ocam ? (
                                    <Badge variant="outline" className="font-mono text-[10px] sm:text-xs">
                                      {sale.ocam}
                                    </Badge>
                                  ) : (
                                    <span className="text-muted-foreground text-xs sm:text-sm">-</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-xs sm:text-sm max-w-[150px] truncate">
                                  {sale.entity_name}
                                </TableCell>
                                <TableCell className="text-xs sm:text-sm hidden sm:table-cell">
                                  {sale.entity_ruc || "-"}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-[10px] sm:text-xs whitespace-nowrap">
                                    {sale.sale_items.length} productos
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="secondary" className="text-[10px] sm:text-xs whitespace-nowrap">
                                    {getTotalSerials(sale)} series
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-xs sm:text-sm text-muted-foreground hidden md:table-cell whitespace-nowrap">
                                  {new Date(sale.created_at).toLocaleDateString("es-PE")}
                                </TableCell>
                                <TableCell>
                                  {areAllSeriesDeliveredOrSold(sale) ? (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div>
                                            <Button size="sm" disabled className="text-xs whitespace-nowrap">
                                              <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                                              <span className="hidden sm:inline">Series entregadas</span>
                                            </Button>
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p className="max-w-xs text-xs">
                                            No se pueden generar stickers porque todas las series ya están entregadas o
                                            vendidas
                                          </p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  ) : (
                                    <Button
                                      size="sm"
                                      onClick={() => generateBarcodesForSale(sale)}
                                      disabled={generatingBarcodes}
                                      className="text-xs whitespace-nowrap"
                                    >
                                      <Barcode className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                                      <span className="hidden sm:inline">Generar Códigos</span>
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                              {expandedSale === sale.id && (
                                <TableRow>
                                  <TableCell colSpan={9} className="bg-muted/50 p-0">
                                    <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
                                      <div className="flex items-center gap-2 text-xs sm:text-sm font-medium">
                                        <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
                                        Productos de la Venta
                                      </div>
                                      <div className="rounded-md border bg-background overflow-x-auto">
                                        <Table>
                                          <TableHeader>
                                            <TableRow>
                                              <TableHead className="text-xs sm:text-sm">Código</TableHead>
                                              <TableHead className="text-xs sm:text-sm">Producto</TableHead>
                                              <TableHead className="text-xs sm:text-sm">Cantidad</TableHead>
                                              <TableHead className="text-xs sm:text-sm">Lotes</TableHead>
                                              <TableHead className="text-xs sm:text-sm">Series</TableHead>
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {sale.sale_items.map((item) => (
                                              <TableRow key={item.id}>
                                                <TableCell className="font-mono font-medium text-xs sm:text-sm">
                                                  {item.product_code}
                                                </TableCell>
                                                <TableCell className="text-xs sm:text-sm">
                                                  {item.product_name}
                                                </TableCell>
                                                <TableCell>
                                                  <Badge variant="outline" className="text-[10px] sm:text-xs">
                                                    {item.quantity}
                                                  </Badge>
                                                </TableCell>
                                                <TableCell>
                                                  <div className="space-y-1">
                                                    {item.product_lots.map((lot) => (
                                                      <Badge
                                                        key={lot.id}
                                                        variant="secondary"
                                                        className="font-mono text-[10px] sm:text-xs"
                                                      >
                                                        {lot.lot_number}
                                                      </Badge>
                                                    ))}
                                                  </div>
                                                </TableCell>
                                                <TableCell>
                                                  <Badge variant="outline" className="text-[10px] sm:text-xs">
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
                            <TableCell colSpan={9} className="text-center py-8">
                              <div className="text-muted-foreground text-xs sm:text-sm">
                                {sales.length === 0
                                  ? "No hay ventas con lotes registrados"
                                  : "No se encontraron ventas con los filtros aplicados"}
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
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                        <Barcode className="h-4 w-4 sm:h-5 sm:w-5" />
                        Códigos de Barras Generados
                      </CardTitle>
                      <CardDescription className="text-xs sm:text-sm">
                        Venta: {selectedSale.sale_number}
                        {selectedSale.ocam && ` - OCAM: ${selectedSale.ocam}`} - {barcodes.length} etiquetas
                      </CardDescription>
                    </div>
                    <Button onClick={handlePrint} size="sm" className="w-full sm:w-auto">
                      <Printer className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                      Imprimir Etiquetas
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div ref={printRef} className="sticker-grid flex flex-col gap-3 sm:gap-4">
                    {barcodes.map((barcode, index) => (
                      <div
                        key={index}
                        className="sticker border-2 border-gray-800 rounded-lg p-2 bg-white flex flex-col gap-1 w-full max-w-[62mm] mx-auto sm:mx-0 h-[37mm]"
                      >
                        <div className="barcode-section w-full flex justify-center items-center">
                          <img
                            src={barcode.barcodeUrl || "/placeholder.svg"}
                            alt={barcode.serialNumber}
                            className="barcode w-full max-w-[58mm] max-h-[10mm] object-contain"
                          />
                        </div>
                        <div className="bottom-section flex-1 flex gap-1.5 items-start">
                          <div className="info-column flex-1 flex flex-col justify-start gap-0.5 min-w-0">
                            <div className="sticker-info w-full text-left space-y-0.5">
                              <div className="serial font-mono font-bold text-[8pt] leading-tight tracking-tight">
                                {barcode.serialNumber}
                              </div>
                              <div className="lot font-mono text-[8pt] text-gray-900 leading-tight font-bold">
                                Lote: {barcode.lotNumber}
                              </div>
                              <div className="product text-[6pt] mt-0.5 leading-tight">
                                <div className="product-name font-bold leading-tight">{barcode.productName}</div>
                                <div className="product-code text-gray-700 text-[6pt] font-semibold leading-tight">
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
                                className="qr-code w-[65px] h-[65px]"
                              />
                              <div className="qr-label text-[5.5pt] text-center text-muted-foreground leading-tight w-[65px] font-medium">
                                Información del producto
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Sale Stickers Tab */}
          <TabsContent value="sale-stickers">
            <SaleStickersSection />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
