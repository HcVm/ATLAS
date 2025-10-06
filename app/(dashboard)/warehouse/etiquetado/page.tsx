"use client"

import { useEffect, useState, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Barcode, Search, Printer, Package, Hash, ShoppingCart, ChevronDown, ChevronUp, FileText } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { useCompany } from "@/lib/company-context"
import { useToast } from "@/hooks/use-toast"
import JsBarcode from "jsbarcode"
import QRCode from "qrcode"

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
        .limit(50)

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
                  const { data: serials, error: serialsError } = await supabase
                    .from("product_serials")
                    .select(`
                      id,
                      serial_number,
                      status
                    `)
                    .eq("lot_id", lot.id)
                    .order("serial_number", { ascending: true })

                  if (serialsError) {
                    console.error("Error fetching serials:", serialsError)
                    return { ...lot, product_serials: [] }
                  }

                  return { ...lot, product_serials: serials || [] }
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

  const generateBarcodesForSale = async (sale: SaleWithLots) => {
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
              canvas.width = 400
              canvas.height = 120

              JsBarcode(canvas, barcodeText, {
                format: "CODE128",
                width: 8,
                height:350,
                displayValue: false,
                margin:8,
                background: "#ffffff",
                lineColor: "#000000",
              })

              const barcodeUrl = canvas.toDataURL("image/png")

              let qrCodeUrl = ""
              if (productHash) {
                const publicUrl = `${window.location.origin}/public/product/${productHash}`
                qrCodeUrl = await QRCode.toDataURL(publicUrl, {
                  errorCorrectionLevel: "H",
                  width: 220,
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
                  size: A4;
                  margin: 10mm;
                }
                * {
                  box-sizing: border-box;
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }
                body {
                  font-family: Arial, sans-serif;
                  margin: 0;
                  padding: 10mm;
                  background: white;
                }
                .sticker-grid {
                  display: grid;
                  grid-template-columns: repeat(3, 6.2cm);
                  gap: 2mm;
                  padding: 0;
                  justify-content: center;
                  width: 100%;
                }
                .sticker {
                  width: 6.2cm;
                  height: 3.7cm;
                  border: 2px solid #000000ff;
                  border-radius: 8px;
                  padding: 3mm;
                  page-break-inside: avoid;
                  background: white;
                  display: flex;
                  gap: 2mm;
                  align-items: center;
                  box-sizing: border-box;
                }
                .barcode-column {
                  flex: 1;
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  justify-content: center;
                  gap: 1.5mm;
                  min-width: 0;
                }
                .qr-column {
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  justify-content: center;
                  gap: 1mm;
                  flex-shrink: 0;
                }
                .sticker img.barcode {
                  width: 100%;
                  max-width: 100%;
                  height: auto;
                  display: block;
                  object-fit: contain;
                }
                .sticker img.qr-code {
                  width: 65px;
                  height: 65px;
                  display: block;
                }
                .qr-label {
                  font-size: 6pt;
                  text-align: center;
                  color: #353535ff;
                  line-height: 1.1;
                  max-width: 65px;
                  font-weight: 400;
                }
                .sticker-info {
                  width: 100%;
                  text-align: center;
                }
                .serial {
                  font-weight: bold;
                  font-size: 9pt;
                  margin: 0.5mm 0;
                  font-family: 'Courier New', monospace;
                  word-break: break-all;
                  line-height: 1.2;
                  color: #000;
                }
                .lot {
                  font-size: 7.5pt;
                  color: #333;
                  font-family: 'Courier New', monospace;
                  margin: 0.5mm 0;
                  line-height: 1.15;
                  font-weight: 600;
                }
                .product {
                  margin-top: 0.5mm;
                  line-height: 1.15;
                }
                .product-name {
                  font-weight: 600;
                  font-size: 7.5pt;
                  margin-bottom: 0.5mm;
                  color: #000;
                }
                .product-code {
                  color: #2c2c2cff;
                  font-size: 6.5pt;
                }
                @media print {
                  body {
                    margin: 0;
                    padding: 10mm;
                  }
                  .sticker {
                    border: 2px solid #000000ff !important;
                    border-radius: 8px !important;
                  }
                  .sticker-grid {
                    gap: 2mm;
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
                    <div class="barcode-column">
                      <img src="${barcode.barcodeUrl}" alt="${barcode.serialNumber}" class="barcode" />
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
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Etiquetado</h1>
            <p className="text-muted-foreground">Generación de códigos de barras para impresión de stickers</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ventas con Lotes</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{sales.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Productos</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {sales.reduce((total, sale) => total + sale.sale_items.length, 0)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Series</CardTitle>
              <Hash className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {sales.reduce((total, sale) => total + getTotalSerials(sale), 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Barcode className="h-5 w-5" />
              Ventas con Lotes y Series
            </CardTitle>
            <CardDescription>Selecciona una venta para generar códigos de barras</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar por número de venta, cliente, RUC, OCAM..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Número de Venta</TableHead>
                      <TableHead>OCAM</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>RUC</TableHead>
                      <TableHead>Productos</TableHead>
                      <TableHead>Total Series</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Acciones</TableHead>
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
                                className="h-8 w-8 p-0"
                              >
                                {expandedSale === sale.id ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </Button>
                            </TableCell>
                            <TableCell className="font-medium">{sale.sale_number}</TableCell>
                            <TableCell>
                              {sale.ocam ? (
                                <Badge variant="outline" className="font-mono">
                                  {sale.ocam}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </TableCell>
                            <TableCell>{sale.entity_name}</TableCell>
                            <TableCell>{sale.entity_ruc || "-"}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{sale.sale_items.length} productos</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">{getTotalSerials(sale)} series</Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(sale.created_at).toLocaleDateString("es-PE")}
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                onClick={() => generateBarcodesForSale(sale)}
                                disabled={generatingBarcodes}
                              >
                                <Barcode className="h-4 w-4 mr-2" />
                                Generar Códigos
                              </Button>
                            </TableCell>
                          </TableRow>
                          {expandedSale === sale.id && (
                            <TableRow>
                              <TableCell colSpan={9} className="bg-muted/50 p-0">
                                <div className="p-4 space-y-4">
                                  <div className="flex items-center gap-2 text-sm font-medium">
                                    <FileText className="h-4 w-4" />
                                    Productos de la Venta
                                  </div>
                                  <div className="rounded-md border bg-background">
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>Código</TableHead>
                                          <TableHead>Producto</TableHead>
                                          <TableHead>Cantidad</TableHead>
                                          <TableHead>Lotes</TableHead>
                                          <TableHead>Series</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {sale.sale_items.map((item) => (
                                          <TableRow key={item.id}>
                                            <TableCell className="font-mono font-medium">{item.product_code}</TableCell>
                                            <TableCell>{item.product_name}</TableCell>
                                            <TableCell>
                                              <Badge variant="outline">{item.quantity}</Badge>
                                            </TableCell>
                                            <TableCell>
                                              <div className="space-y-1">
                                                {item.product_lots.map((lot) => (
                                                  <Badge key={lot.id} variant="secondary" className="font-mono text-xs">
                                                    {lot.lot_number}
                                                  </Badge>
                                                ))}
                                              </div>
                                            </TableCell>
                                            <TableCell>
                                              <Badge variant="outline">
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
                          <div className="text-muted-foreground">
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
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Barcode className="h-5 w-5" />
                    Códigos de Barras Generados
                  </CardTitle>
                  <CardDescription>
                    Venta: {selectedSale.sale_number}
                    {selectedSale.ocam && ` - OCAM: ${selectedSale.ocam}`} - {barcodes.length} etiquetas
                  </CardDescription>
                </div>
                <Button onClick={handlePrint}>
                  <Printer className="h-4 w-4 mr-2" />
                  Imprimir Etiquetas
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div ref={printRef} className="sticker-grid grid grid-cols-1 md:grid-cols-3 gap-4">
                {barcodes.map((barcode, index) => (
                  <div
                    key={index}
                    className="sticker border-2 border-gray-800 rounded-lg p-3 bg-white flex gap-2 items-center w-[6.2cm] h-[3.7cm]"
                  >
                    <div className="barcode-column flex-1 flex flex-col items-center justify-center gap-1.5 min-w-0">
                      <img
                        src={barcode.barcodeUrl || "/placeholder.svg"}
                        alt={barcode.serialNumber}
                        className="barcode w-full max-w-full object-contain"
                      />
                      <div className="sticker-info w-full text-center space-y-0.5">
                        <div className="serial font-mono font-bold text-[9pt] leading-tight">
                          {barcode.serialNumber}
                        </div>
                        <div className="lot font-mono text-[7.5pt] text-gray-800 leading-tight font-semibold">
                          Lote: {barcode.lotNumber}
                        </div>
                        <div className="product text-[7.5pt] mt-0.5 leading-tight">
                          <div className="product-name font-semibold">{barcode.productName}</div>
                          <div className="product-code text-muted-foreground text-[6.5pt]">{barcode.productCode}</div>
                        </div>
                      </div>
                    </div>
                    {barcode.qrCodeUrl && (
                      <div className="qr-column flex flex-col items-center justify-center gap-1 flex-shrink-0">
                        <img
                          src={barcode.qrCodeUrl || "/placeholder.svg"}
                          alt="QR Code"
                          className="qr-code w-[65px] h-[65px]"
                        />
                        <div className="qr-label text-[6pt] text-center text-muted-foreground leading-tight w-[65px]">
                          Información del producto
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
