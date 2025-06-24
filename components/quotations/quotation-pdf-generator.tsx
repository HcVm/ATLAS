"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Download, Loader2 } from "lucide-react"
import { toast } from "sonner"
import {
  generateQuotationPDF,
  generateMapWithRouteImageUrl,
  generateSimpleMapImageUrl,
  getRoutePolyline,
  type QuotationPDFData,
} from "@/lib/pdf-generator"

interface QuotationItem {
  id: string
  product_name: string
  product_description: string
  product_code: string
  product_brand: string
  quantity: number
  platform_unit_price_with_tax: number
  platform_total: number
  supplier_unit_price_with_tax?: number | null
  supplier_total?: number | null
  offer_unit_price_with_tax?: number | null
  offer_total_with_tax?: number | null
  final_unit_price_with_tax?: number | null
  budget_ceiling_unit_price_with_tax?: number | null
  budget_ceiling_total?: number | null
  reference_image_url?: string | null
}

interface QuotationPDFGeneratorProps {
  quotation: {
    id: string
    quotation_number: string
    quotation_date: string
    valid_until?: string | null
    status: string
    entity_name: string
    entity_ruc: string
    delivery_location: string
    unique_code: string
    product_description: string
    product_brand?: string | null
    quantity: number
    offer_unit_price_with_tax?: number | null
    offer_total_with_tax?: number | null
    platform_unit_price_with_tax: number
    platform_total: number
    observations?: string | null
    route_origin_address?: string | null
    route_destination_address?: string | null
    route_distance_km?: number | null
    route_duration_minutes?: number | null
    is_multi_product?: boolean | null
    quotation_items?: QuotationItem[]
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

export default function QuotationPDFGenerator({ quotation, companyInfo }: QuotationPDFGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGeneratePDF = async () => {
    setIsGenerating(true)

    try {
      console.log("=== PDF Generation Debug ===")
      console.log("Quotation data:", quotation)
      console.log("Is multi product:", quotation.is_multi_product)
      console.log("Quotation items:", quotation.quotation_items)
      console.log("Items count:", quotation.quotation_items?.length || 0)

      // Determinar si es multi-producto
      const isMultiProduct =
        quotation.is_multi_product && quotation.quotation_items && quotation.quotation_items.length > 0

      console.log("Calculated isMultiProduct:", isMultiProduct)

      // Preparar datos para el PDF
      const pdfData: QuotationPDFData = {
        // Información de la empresa
        companyName: companyInfo.name || "Empresa",
        companyRuc: companyInfo.ruc || "N/A",
        companyAddress: companyInfo.address,
        companyPhone: companyInfo.phone,
        companyEmail: companyInfo.email,

        // Información de la cotización
        quotationNumber: quotation.quotation_number || quotation.unique_code,
        quotationDate: quotation.quotation_date,
        validUntil: quotation.valid_until || undefined,
        status: getStatusLabel(quotation.status),

        // Información del cliente
        clientName: quotation.entity_name || "Cliente",
        clientRuc: quotation.entity_ruc || "N/A",
        deliveryLocation: quotation.delivery_location || "No especificado",

        // Observaciones
        observations: quotation.observations || undefined,

        // Creado por
        createdBy: quotation.profiles?.full_name || "Sistema",
      }

      if (isMultiProduct) {
        console.log("Processing multi-product quotation...")

        // Cotización multi-producto
        pdfData.items = quotation.quotation_items!.map((item) => {
          console.log("Processing item:", item)

          // Calcular totales correctamente
          const platformTotal = (item.platform_unit_price_with_tax || 0) * (item.quantity || 0)
          const supplierTotal = (item.supplier_unit_price_with_tax || 0) * (item.quantity || 0)
          const offerTotal = (item.offer_unit_price_with_tax || 0) * (item.quantity || 0)
          const finalUnitPrice = item.offer_unit_price_with_tax || item.platform_unit_price_with_tax || 0
          const finalTotal = finalUnitPrice * (item.quantity || 0)

          return {
            productCode: item.product_code || "N/A",
            productDescription: item.product_description || item.product_name || "Sin descripción",
            productBrand: item.product_brand || undefined,
            quantity: item.quantity || 0,
            platformUnitPrice: item.platform_unit_price_with_tax || 0,
            providerUnitPrice: item.supplier_unit_price_with_tax || undefined,
            offerUnitPrice: item.offer_unit_price_with_tax || undefined,
            finalUnitPrice: finalUnitPrice,
            platformTotal: platformTotal,
            providerTotal: supplierTotal > 0 ? supplierTotal : undefined,
            offerTotal: offerTotal > 0 ? offerTotal : undefined,
            finalTotal: finalTotal,
            budgetCeilingUnitPrice: item.budget_ceiling_unit_price_with_tax || undefined,
            budgetCeilingTotal: item.budget_ceiling_total || undefined,
            referenceImageUrl: item.reference_image_url || undefined,
          }
        })

        console.log("Processed items for PDF:", pdfData.items)

        // Calcular totales generales usando los datos calculados
        pdfData.platformGrandTotal = pdfData.items.reduce((sum, item) => sum + item.platformTotal, 0)
        pdfData.providerGrandTotal = pdfData.items.reduce((sum, item) => sum + (item.providerTotal || 0), 0)
        pdfData.offerGrandTotal = pdfData.items.reduce((sum, item) => sum + (item.offerTotal || 0), 0)
        pdfData.finalGrandTotal = pdfData.items.reduce((sum, item) => sum + item.finalTotal, 0)
        pdfData.budgetCeilingGrandTotal = pdfData.items.reduce((sum, item) => sum + (item.budgetCeilingTotal || 0), 0)

        console.log("Calculated totals:", {
          platform: pdfData.platformGrandTotal,
          provider: pdfData.providerGrandTotal,
          offer: pdfData.offerGrandTotal,
          final: pdfData.finalGrandTotal,
        })
      } else {
        console.log("Processing single-product quotation...")

        // Cotización simple (legacy)
        pdfData.productCode = quotation.unique_code || "N/A"
        pdfData.productDescription = quotation.product_description || "Producto sin descripción"
        pdfData.productBrand = quotation.product_brand || undefined
        pdfData.quantity = quotation.quantity || 0
        pdfData.unitPrice = quotation.offer_unit_price_with_tax || quotation.platform_unit_price_with_tax || 0
        pdfData.totalPrice = quotation.offer_total_with_tax || quotation.platform_total || 0
        pdfData.finalGrandTotal = quotation.offer_total_with_tax || quotation.platform_total || 0
      }

      // Agregar información de ruta si existe
      if (quotation.route_origin_address && quotation.route_destination_address) {
        const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

        // Obtener información de ruta actualizada desde la API
        const routeData = await getRoutePolyline(quotation.route_origin_address, quotation.route_destination_address)

        pdfData.routeInfo = {
          origin: quotation.route_origin_address,
          destination: quotation.route_destination_address,
          distance:
            routeData.distance ||
            (quotation.route_distance_km ? `${quotation.route_distance_km.toFixed(1)} km` : "N/A"),
          duration:
            routeData.duration ||
            (quotation.route_duration_minutes
              ? `${Math.floor(quotation.route_duration_minutes / 60)}h ${quotation.route_duration_minutes % 60}m`
              : "N/A"),
        }

        // Generar URL de imagen del mapa con ruta si tenemos la API key
        if (googleMapsApiKey) {
          try {
            console.log("Generating map with route...")
            pdfData.routeInfo.mapImageUrl = await generateMapWithRouteImageUrl(
              quotation.route_origin_address,
              quotation.route_destination_address,
              googleMapsApiKey,
            )
            console.log("Map URL generated:", pdfData.routeInfo.mapImageUrl)
          } catch (mapError) {
            console.warn("Error generating map with route, trying simple map:", mapError)
            try {
              pdfData.routeInfo.mapImageUrl = generateSimpleMapImageUrl(
                quotation.route_origin_address,
                quotation.route_destination_address,
                googleMapsApiKey,
              )
            } catch (simpleMapError) {
              console.error("Error generating simple map:", simpleMapError)
              // Continue without map image
              delete pdfData.routeInfo.mapImageUrl
            }
          }
        }
      }

      console.log("Final PDF data:", pdfData)

      // Generar el PDF
      await generateQuotationPDF(pdfData)

      toast.success("PDF generado exitosamente")
    } catch (error) {
      console.error("Error generating PDF:", error)
      toast.error("Error al generar el PDF. Por favor, intente nuevamente.")
    } finally {
      setIsGenerating(false)
    }
  }

  const getStatusLabel = (status: string): string => {
    const statusLabels: Record<string, string> = {
      draft: "Borrador",
      sent: "Enviada",
      approved: "Aprobada",
      rejected: "Rechazada",
      expired: "Expirada",
    }
    return statusLabels[status] || status
  }

  return (
    <Button onClick={handleGeneratePDF} disabled={isGenerating} className="flex items-center gap-2">
      {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      {isGenerating ? "Generando PDF..." : "Descargar PDF Detallado"}
    </Button>
  )
}
