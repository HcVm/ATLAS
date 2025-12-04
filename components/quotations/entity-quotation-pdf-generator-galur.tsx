"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { FileText, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { generateGALUREntityQuotationPDF, type GALUREntityQuotationPDFData } from "@/lib/pdf-generator-entity-galur"

interface GALUREntityQuotationPDFGeneratorProps {
  quotation: {
    id: string
    quotation_number: string
    quotation_date: string
    valid_until?: string | null
    status: string
    entity_name: string
    entity_ruc: string
    delivery_location: string
    fiscal_address?: string | null
    unique_code: string
    product_description: string
    product_brand?: string | null
    quantity: number
    offer_unit_price_with_tax?: number | null
    offer_total_with_tax?: number | null
    platform_unit_price_with_tax: number
    platform_total: number
    observations?: string | null
    is_multi_product?: boolean | null
    quotation_items?: Array<{
      id: string
      product_name: string
      product_description: string
      product_code: string
      product_brand: string
      quantity: number
      platform_unit_price_with_tax: number
      platform_total: number
      offer_unit_price_with_tax?: number
      offer_total_with_tax?: number
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
    address?: string
    phone?: string
    email?: string
  }
}

export default function GALUREntityQuotationPDFGenerator({
  quotation,
  companyInfo,
}: GALUREntityQuotationPDFGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGeneratePDF = async () => {
    setIsGenerating(true)

    try {
      console.log("=== GALUR Entity PDF Generation ===")

      let products: GALUREntityQuotationPDFData["products"] = []

      if (quotation.quotation_items && quotation.quotation_items.length > 0) {
        products = quotation.quotation_items.map((item) => {
          const precioConIGV = item.offer_unit_price_with_tax || item.platform_unit_price_with_tax || 0
          const totalConIGV = item.offer_total_with_tax || item.platform_total || 0
          const precioSinIGV = precioConIGV / 1.18
          const totalSinIGV = totalConIGV / 1.18

          return {
            quantity: item.quantity || 0,
            description: item.product_description || item.product_name || "Producto sin descripción",
            unit: "UND",
            brand: item.product_brand || undefined,
            code: item.product_code || undefined,
            unitPrice: precioSinIGV,
            totalPrice: totalSinIGV,
          }
        })
      } else {
        const precioConIGV = quotation.offer_unit_price_with_tax || quotation.platform_unit_price_with_tax || 0
        const totalConIGV = quotation.offer_total_with_tax || quotation.platform_total || 0
        const precioSinIGV = precioConIGV / 1.18
        const totalSinIGV = totalConIGV / 1.18

        products = [
          {
            quantity: quotation.quantity || 0,
            description: quotation.product_description || "Producto sin descripción",
            unit: "UND",
            brand: quotation.product_brand || undefined,
            code: quotation.unique_code || undefined,
            unitPrice: precioSinIGV,
            totalPrice: totalSinIGV,
          },
        ]
      }

      if (!products || products.length === 0) {
        toast.error("Error: No se encontraron productos para generar el PDF")
        return
      }

      const subtotalSinIGV = products.reduce((sum, product) => sum + product.totalPrice, 0)
      const igvCalculado = subtotalSinIGV * 0.18
      const totalCalculado = subtotalSinIGV + igvCalculado

      const pdfData: GALUREntityQuotationPDFData = {
        companyName: companyInfo.name || "GALUR",
        companyRuc: companyInfo.ruc || "N/A",
        companyCode: companyInfo.code,
        companyAddress: companyInfo.address,
        companyPhone: companyInfo.phone,
        companyEmail: companyInfo.email,
        companyLogoUrl: companyInfo.logo_url || undefined,

        quotationNumber: quotation.quotation_number,
        quotationDate: quotation.quotation_date,
        validUntil: quotation.valid_until || undefined,
        status: quotation.status,

        clientCode: quotation.quotation_number || "N/A",
        clientName: quotation.entity_name || "Cliente",
        clientRuc: quotation.entity_ruc || "N/A",
        clientAddress: quotation.fiscal_address || quotation.delivery_location || "No especificado",
        clientDepartment: undefined,
        clientAttention: "Logística - Abastecimiento",
        currency: "Soles",

        products: products,

        subtotal: subtotalSinIGV,
        igv: igvCalculado,
        total: totalCalculado,

        conditions: [
          "Plazo de entrega: 10 días hábiles.",
          "Entrega en almacén central.",
          "Forma de pago: Crédito 15 días.",
          "Garantía por defectos de fábrica 12 meses.",
        ],

        observations: quotation.observations || undefined,
        createdBy: quotation.profiles?.full_name || "Sistema de creación GALUR",
      }

      await generateGALUREntityQuotationPDF(pdfData)
      toast.success("PDF GALUR para entidad generado exitosamente")
    } catch (error) {
      console.error("Error generating GALUR entity PDF:", error)
      toast.error("Error al generar el PDF GALUR para entidad")
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Button
      onClick={handleGeneratePDF}
      disabled={isGenerating}
      variant="outline"
      className="flex items-center gap-2 border-green-300 hover:bg-green-50 text-green-700 bg-transparent transition-all duration-200 hover:shadow-md hover:scale-105"
    >
      {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
      {isGenerating ? "Generando PDF..." : "PDF GALUR Entidad"}
    </Button>
  )
}
