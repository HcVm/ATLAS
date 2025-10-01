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
        for (const lot of item.product_lots) {
          for (const serial of lot.product_serials) {
            const barcodeText = `${serial.serial_number}`

            try {
              const canvas = document.createElement("canvas")
              JsBarcode(canvas, barcodeText, {
                format: "CODE128",
                width: 2,
                height: 60,
                displayValue: false,
                margin: 10,
              })

              const barcodeUrl = canvas.toDataURL("image/png")

              barcodesData.push({
                serialNumber: serial.serial_number,
                lotNumber: lot.lot_number,
                productCode: item.product_code,
                productName: item.product_name,
                barcodeUrl,
              })
            } catch (err) {
              console.error("Error generating barcode:", err)
            }
          }
        }
      }

      setBarcodes(barcodesData)

      toast({
        title: "Códigos generados",
        description: `Se generaron ${barcodesData.length} códigos de barras`,
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
              <style>
                @page {
                  size: A4;
                  margin: 10mm;
                }
                body {
                  font-family: Arial, sans-serif;
                  margin: 0;
                  padding: 0;
                }
                .sticker-grid {
                  display: grid;
                  grid-template-columns: repeat(3, 1fr);
                  gap: 10mm;
                  padding: 5mm;
                }
                .sticker {
                  border: 1px solid #ddd;
                  padding: 5mm;
                  text-align: center;
                  page-break-inside: avoid;
                  background: white;
                }
                .sticker img {
                  width: 100%;
                  max-width: 200px;
                  height: auto;
                }
                .sticker-info {
                  margin-top: 3mm;
                  font-size: 9pt;
                }
                .serial {
                  font-weight: bold;
                  font-size: 10pt;
                  margin: 2mm 0;
                  font-family: monospace;
                }
                .lot {
                  font-size: 8pt;
                  color: #666;
                  font-family: monospace;
                }
                .product {
                  font-size: 8pt;
                  margin-top: 2mm;
                  color: #333;
                }
                @media print {
                  .sticker {
                    border: 1px solid #000;
                  }
                }
              </style>
            </head>
            <body>
              ${printRef.current.innerHTML}
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
                    {selectedSale.ocam && ` - OCAM: ${selectedSale.ocam}`} - {barcodes.length}{" "}
                    etiquetas
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
                  <div key={index} className="sticker border rounded-lg p-4 text-center bg-white">
                    <img
                      src={barcode.barcodeUrl || "/placeholder.svg"}
                      alt={barcode.serialNumber}
                      className="mx-auto w-full max-w-[200px]"
                    />
                    <div className="sticker-info mt-3 space-y-1">
                      <div className="serial font-mono font-bold text-sm">{barcode.serialNumber}</div>
                      <div className="lot font-mono text-xs text-muted-foreground">Lote: {barcode.lotNumber}</div>
                      <div className="product text-xs mt-2">
                        <div className="font-medium">{barcode.productName}</div>
                        <div className="text-muted-foreground">{barcode.productCode}</div>
                      </div>
                    </div>
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
