"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { SaleStickerGenerator, type SaleStickerData } from "@/components/warehouse/sale-sticker-generator"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface SaleWithItems {
  id: string
  sale_number: string
  ocam: string | null
  entity_name: string
  company_id: string
  created_at: string
  sale_status: string
}

interface SaleItem {
  id: string
  sale_id: string
  product_id: string | null
  product_code: string
  product_name: string
  quantity: number
}

interface SaleWithProductCodes extends SaleWithItems {
  productCodes: string[]
}

export function SaleStickersSection() {
  const [sales, setSales] = useState<SaleWithProductCodes[]>([])
  const [selectedSaleId, setSelectedSaleId] = useState<string>("")
  const [saleItems, setSaleItems] = useState<SaleItem[]>([])
  const [stickers, setStickers] = useState<SaleStickerData[]>([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    loadSales()
  }, [])

  const loadSales = async () => {
    try {
      setLoading(true)
      const { data: salesData, error: salesError } = await supabase
        .from("sales")
        .select(`
          id, 
          sale_number,
          ocam,
          entity_name, 
          company_id, 
          created_at, 
          sale_status,
          deliveries(delivery_status)
        `)
        .order("created_at", { ascending: false })
        .limit(50)

      if (salesError) throw salesError

      const filteredSales = (salesData || []).filter((sale: any) => {
        const delivery = sale.deliveries?.[0]
        if (!delivery) return true
        return delivery.delivery_status !== "shipped" && delivery.delivery_status !== "delivered"
      })

      const salesWithCodes: SaleWithProductCodes[] = []
      if (filteredSales) {
        for (const sale of filteredSales) {
          const { data: items } = await supabase.from("sale_items").select("product_code").eq("sale_id", sale.id)

          const productCodes = items?.map((i: any) => i.product_code).filter(Boolean) || []
          salesWithCodes.push({
            ...sale,
            productCodes,
          })
        }
      }

      setSales(salesWithCodes)
    } catch (error) {
      console.error("[v0] Error loading sales:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaleSelect = async (saleId: string) => {
    setSelectedSaleId(saleId)

    try {
      setGenerating(true)

      const { data: items, error: itemsError } = await supabase
        .from("sale_items")
        .select("id, sale_id, product_id, product_code, product_name, quantity")
        .eq("sale_id", saleId)

      if (itemsError) throw itemsError

      const sale = sales.find((s) => s.id === saleId)

      const stickersData: SaleStickerData[] = []

      if (items) {
        for (const item of items) {
          let product: any = null
          if (item.product_id) {
            const { data: productData } = await supabase
              .from("products")
              .select("id, code, name, brand_id, image_url, total_height, total_width, depth, brands(id, name)")
              .eq("id", item.product_id)
              .single()
            product = productData
          }

          let lotNumber = "N/A"
          let ingressDate = new Date()

          if (item.product_id) {
            const { data: lotData } = await supabase
              .from("product_lots")
              .select("lot_number, ingress_date")
              .eq("product_id", item.product_id)
              .order("created_at", { ascending: false })
              .limit(1)
              .single()

            if (lotData) {
              lotNumber = lotData.lot_number || "N/A"
              ingressDate = new Date(lotData.ingress_date || new Date())
            }
          }

          const { data: companyData } = await supabase
            .from("companies")
            .select("id, name, ruc, address")
            .eq("id", sale?.company_id)
            .single()

          if (companyData) {
            const months = [
              "Enero",
              "Febrero",
              "Marzo",
              "Abril",
              "Mayo",
              "Junio",
              "Julio",
              "Agosto",
              "Septiembre",
              "Octubre",
              "Noviembre",
              "Diciembre",
            ]
            const formattedDate = `${ingressDate.getDate().toString().padStart(2, "0")} de ${months[ingressDate.getMonth()]} de ${ingressDate.getFullYear()}`

            stickersData.push({
              clientName: sale?.entity_name || "N/A",
              productCode: item.product_code,
              productName: item.product_name,
              productImage: product?.image_url,
              totalHeight: product?.total_height,
              totalWidth: product?.total_width,
              depth: product?.depth,
              brandName: product?.brands?.name || "Unknown",
              lotNumber: lotNumber,
              fabricationDate: formattedDate,
              companyName: companyData?.name || "N/A",
              companyRuc: companyData?.ruc || "N/A",
              companyAddress: companyData?.address || "N/A",
            })
          }
        }
      }

      setStickers(stickersData)
    } catch (error) {
      console.error("[v0] Error generating stickers:", error)
    } finally {
      setGenerating(false)
    }
  }

  const downloadAllStickers = async () => {
    try {
      const container = document.getElementById("stickers-preview")
      if (!container) return

      const link = document.createElement("a")
      link.href = container.innerHTML
      link.download = `stickers-${selectedSaleId}.html`
      link.click()
    } catch (error) {
      console.error("[v0] Error downloading stickers:", error)
    }
  }

  const printStickers = () => {
    const printWindow = window.open("", "", "height=600,width=800")
    if (printWindow) {
      const container = document.getElementById("stickers-preview")
      if (container) {
        printWindow.document.write(container.innerHTML)
        printWindow.document.close()
        printWindow.print()
      }
    }
  }

  return (
    <div className="w-full space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Generar Stickers de Venta</CardTitle>
          <CardDescription>
            Selecciona una venta para generar automáticamente los stickers de todos sus productos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-center flex-wrap">
            <Select value={selectedSaleId} onValueChange={handleSaleSelect}>
              <SelectTrigger className="w-full max-w-md">
                <SelectValue placeholder="Selecciona una venta..." />
              </SelectTrigger>
              <SelectContent>
                {sales.map((sale) => (
                  <SelectItem key={sale.id} value={sale.id}>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">Venta #{sale.sale_number}</span>
                        {sale.ocam && (
                          <Badge variant="outline" className="text-xs bg-orange-50 border-orange-200 text-orange-700">
                            OCAM: {sale.ocam}
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-gray-600">{sale.entity_name}</span>
                      <span className="text-xs text-gray-500">Productos: {sale.productCodes.join(", ")}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {loading && <Loader2 className="h-5 w-5 animate-spin" />}
          </div>

          {generating && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Generando stickers...
            </div>
          )}
        </CardContent>
      </Card>

      {stickers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Stickers Generados ({stickers.length})</CardTitle>
            <div className="flex gap-2 mt-4">
              <Button onClick={printStickers} variant="outline">
                Imprimir
              </Button>
              <Button onClick={downloadAllStickers} variant="outline">
                Descargar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="overflow-y-auto max-h-[600px]">
            <div id="stickers-preview" className="flex flex-wrap gap-4">
              {stickers.map((sticker, index) => (
                <div key={index} className="border-2 border-dashed border-gray-300 p-2 flex-shrink-0">
                  <SaleStickerGenerator data={sticker} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
