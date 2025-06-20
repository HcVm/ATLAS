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
      // Preparar datos para el PDF
      const pdfData: QuotationPDFData = {
        // Información de la empresa - usando los datos correctos del companyInfo
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

        // Información del producto
        productCode: quotation.unique_code || "N/A",
        productDescription: quotation.product_description || "Producto sin descripción",
        productBrand: quotation.product_brand || undefined,
        quantity: quotation.quantity || 0,
        unitPrice: quotation.offer_unit_price_with_tax || quotation.platform_unit_price_with_tax || 0,
        totalPrice: quotation.offer_total_with_tax || quotation.platform_total || 0,

        // Observaciones
        observations: quotation.observations || undefined,

        // Creado por
        createdBy: quotation.profiles?.full_name || "Sistema",
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
      {isGenerating ? "Generando PDF..." : "Descargar PDF"}
    </Button>
  )
}
