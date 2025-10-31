"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { SaleStickerGenerator, type SaleStickerData } from "@/components/warehouse/sale-sticker-generator"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

interface SaleWithItems {
  id: string
  quotation_code: string
  entity_name: string
  company_id: string
  created_at: string
  sale_status: string
}

interface SaleItem {
  id: string
  sale_id: string
  product_id: string
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
          quotation_code, 
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
        if (!delivery) return true // Include if no delivery found
        return delivery.delivery_status !== "shipped" && delivery.delivery_status !== "delivered"
      })

      const salesWithCodes: SaleWithProductCodes[] = []
      if (filteredSales) {
        for (const sale of filteredSales) {
          const { data: items } = await supabase.from("sale_items").select("product_code").eq("sale_id", sale.id)

          const productCodes = items?.map((i: any) => i.product_code) || []
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
        .select(`
          id,
          sale_id,
          product_id,
          quantity,
          products(id, product_code, product_name, brand_id, image_url, total_height, total_width, depth, brands(id, name))
        `)
        .eq("sale_id", saleId)

      if (itemsError) throw itemsError

      const sale = sales.find((s) => s.id === saleId)

      const stickersData: SaleStickerData[] = []

      if (items) {
        for (const item of items) {
          const product = item.products as any

          const { data: lotData } = await supabase
            .from("product_lots")
            .select("lot_number, fabrication_date")
            .eq("product_id", product.id)
            .order("created_at", { ascending: false })
            .limit(1)

          const { data: companyData } = await supabase.from("companies").select("*").eq("id", sale?.company_id).single()

          if (product && lotData?.[0] && companyData) {
            const fabricationDate = lotData[0].fabrication_date
            const date = new Date(fabricationDate)
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
            const formattedDate = `${date.getDate().toString().padStart(2, "0")} de ${months[date.getMonth()]} de ${date.getFullYear()}`

            stickersData.push({
              clientName: sale?.entity_name || "N/A",
              productCode: product.product_code,
              productName: product.product_name,
              productImage: product.image_url,
              totalHeight: product.total_height,
              totalWidth: product.total_width,
              depth: product.depth,
              brandName: product.brands?.name || "Unknown",
              lotNumber: lotData[0]?.lot_number || "N/A",
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
      const canvas = document.getElementById("stickers-container") as HTMLCanvasElement
      if (!canvas) return

      const link = document.createElement("a")
      link.href = canvas.toDataURL("image/png")
      link.download = `stickers-${selectedSaleId}.png`
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
                    <div className="flex flex-col">
                      <span>
                        {sale.quotation_code} - {sale.entity_name}
                      </span>
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
          <CardContent>
            <div id="stickers-preview" className="flex flex-wrap gap-4">
              {stickers.map((sticker, index) => (
                <div key={index} className="border-2 border-dashed border-gray-300 p-2">
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
