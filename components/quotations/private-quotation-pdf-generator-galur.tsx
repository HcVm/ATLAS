"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { FileText, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { generateQRForGALURQuotation, type GALURPrivateQuotationPDFData } from "@/lib/pdf-generator-private-galur"
import { supabase } from "@/lib/supabase"

interface GALURPrivateQuotationPDFGeneratorProps {
  quotation: {
    id: string
    quotation_number: string | null
    quotation_date: string
    valid_until?: string | null
    status: string
    entity_name: string
    entity_ruc: string
    delivery_location: string
    fiscal_address?: string | null
    is_multi_product?: boolean | null
    quotation_items?: Array<{
      id: string
      product_name: string
      product_description: string | null
      product_code: string
      product_brand: string | null
      quantity: number
      platform_unit_price_with_tax: number
      platform_total: number
      offer_unit_price_with_tax?: number | null
      offer_total_with_tax?: number | null
      reference_image_url?: string | null
    }>
    profiles?: {
      full_name: string
    }
  }
  companyInfo: {
    id: string
    name: string
    ruc: string
    code: string
    description?: string | null
    logo_url?: string | null
    color: string
    address?: string | null
    phone?: string | null
    email?: string | null
  }
}

export default function GALURPrivateQuotationPDFGenerator({
  quotation,
  companyInfo,
}: GALURPrivateQuotationPDFGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGeneratePDF = async () => {
    setIsGenerating(true)

    try {
      console.log("=== GALUR Private PDF Generation ===")

      const { data: clientData } = await supabase
        .from("sales_entities")
        .select("email, contact_person")
        .eq("ruc", quotation.entity_ruc)
        .single()

      let products: GALURPrivateQuotationPDFData["products"] = []

      if (quotation.quotation_items && quotation.quotation_items.length > 0) {
        const brandNames = quotation.quotation_items
          .map((item) => item.product_brand)
          .filter((brand): brand is string => Boolean(brand))

        let brandsData: Array<{ name: string; logo_url: string | null }> = []

        if (brandNames && brandNames.length > 0) {
          const { data: brands } = await supabase.from("brands").select("name, logo_url").in("name", brandNames)
          brandsData = brands || []
        }

        const brandLogosMap = new Map<string, string>()
        brandsData.forEach((brand) => {
          if (brand.logo_url) {
            brandLogosMap.set(brand.name, brand.logo_url)
          }
        })

        products = quotation.quotation_items.map((item) => {
          const precioConIGV = item.offer_unit_price_with_tax || item.platform_unit_price_with_tax || 0
          const totalConIGV = item.offer_total_with_tax || item.platform_total || 0
          const precioSinIGV = precioConIGV / 1.18
          const totalSinIGV = totalConIGV / 1.18
          const brandLogoUrl = item.product_brand ? brandLogosMap.get(item.product_brand) : undefined

          return {
            quantity: item.quantity || 0,
            description: item.product_description || item.product_name || "Producto sin descripción",
            unit: "UND",
            brand: item.product_brand || undefined,
            code: item.product_code || undefined,
            unitPrice: precioSinIGV,
            totalPrice: totalSinIGV,
            brandLogoUrl: brandLogoUrl,
          }
        })
      }

      if (!products || products.length === 0) {
        toast.error("No se encontraron productos para generar el PDF")
        return
      }

      const subtotalSinIGV = products.reduce((sum, product) => sum + product.totalPrice, 0)
      const igvCalculado = subtotalSinIGV * 0.18
      const totalCalculado = subtotalSinIGV + igvCalculado

      const pdfData: GALURPrivateQuotationPDFData = {
        companyName: companyInfo.name || "GALUR",
        companyRuc: companyInfo.ruc || "N/A",
        companyCode: companyInfo.code,
        companyAddress:
          companyInfo.address ||
          "JR. ICA MZA. K LOTE. 15 FONAVI (ALT DEL OVALO DEL OBELISCO) MADRE DE DIOS - TAMBOPATA - TAMBOPATA",
        companyPhone: companyInfo.phone || "082-470 013 ANEXO 122 - 915166406",
        companyEmail: companyInfo.email || "ventas.galurbc@gmail.com",
        companyLogoUrl: companyInfo.logo_url || undefined,
        companyAccountInfo: "191-70831800-71",

        quotationNumber: quotation.quotation_number || `#${quotation.id.slice(0, 8)}`,
        quotationDate: quotation.quotation_date,
        validUntil: quotation.valid_until || undefined,
        status: quotation.status,

        clientCode: quotation.quotation_number || "N/A",
        clientName: quotation.entity_name || "Cliente",
        clientRuc: quotation.entity_ruc || "N/A",
        clientAddress: quotation.fiscal_address || quotation.delivery_location || "No especificado",
        clientEmail: clientData?.email || "No especificado",
        contactPerson: clientData?.contact_person || "No especificado",

        products: products,

        subtotal: subtotalSinIGV,
        igv: igvCalculado,
        total: totalCalculado,

        createdBy: quotation.profiles?.full_name || "Sistema de creación GALUR",
      }

      const qrCodeBase64 = await generateQRForGALURQuotation(pdfData.quotationNumber, pdfData)
      pdfData.qrCodeBase64 = qrCodeBase64

      const response = await fetch("/api/generate-quotation-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pdfData, type: "galur-private" }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Server responded with error: ${response.status} - ${errorText}`)
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `Cotizacion_GALUR_Privada_${quotation.quotation_number || quotation.id.slice(0, 8)}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)

      toast.success("PDF GALUR para empresa privada generado exitosamente")
    } catch (error) {
      console.error("Error generating GALUR private PDF:", error)
      toast.error("Error al generar el PDF GALUR para empresa privada")
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Button
      onClick={handleGeneratePDF}
      disabled={isGenerating}
      variant="outline"
      className="flex items-center gap-2 border-emerald-300 hover:bg-emerald-50 text-emerald-700 bg-transparent transition-all duration-200 hover:shadow-md hover:scale-105"
    >
      {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
      {isGenerating ? "Generando PDF..." : "PDF GALUR Empresa Privada"}
    </Button>
  )
}
