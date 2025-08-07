"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { FileText, Loader2 } from 'lucide-react'
import { toast } from "sonner"
import { generateQRForQuotation, type PrivateQuotationPDFData } from "@/lib/pdf-generator-private"
import { supabase } from "@/lib/supabase"

interface PrivateQuotationPDFGeneratorProps {
  quotation: {
    id: string
    quotation_number: string | null
    quotation_date: string
    valid_until?: string | null
    status: string
    entity_name: string
    entity_ruc: string
    delivery_location: string
    fiscal_address?: string | null; // ADDED THIS LINE
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

export default function PrivateQuotationPDFGenerator({ quotation, companyInfo }: PrivateQuotationPDFGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGeneratePDF = async () => {
    setIsGenerating(true)

    try {
      console.log("=== Private PDF Generation Debug ===")
      console.log("Quotation data:", quotation)
      console.log("Company info:", companyInfo)
      console.log("Quotation items:", quotation.quotation_items)
      console.log("Fiscal Address from quotation:", quotation.fiscal_address); // Debugging fiscal address

      // Obtener información de marcas con logos desde la base de datos
      const brandNames = quotation.quotation_items
        ?.map((item) => item.product_brand)
        .filter((brand): brand is string => Boolean(brand))

      let brandsData: Array<{ name: string; logo_url: string | null }> = []

      if (brandNames && brandNames.length > 0) {
        const { data: brands, error: brandsError } = await supabase
          .from("brands")
          .select("name, logo_url")
          .in("name", brandNames)

        if (brandsError) {
          console.error("Error fetching brands:", brandsError)
        } else {
          brandsData = brands || []
        }
      }

      // Crear un mapa de marcas con sus logos
      const brandLogosMap = new Map<string, string>()
      brandsData.forEach((brand) => {
        if (brand.logo_url) {
          brandLogosMap.set(brand.name, brand.logo_url)
        }
      })

      console.log("Marcas obtenidas de la BD:", brandsData)
      console.log("Mapa de logos:", brandLogosMap)

      // Preparar productos con información de marca y logos
      let products: PrivateQuotationPDFData["products"] = []

      if (quotation.quotation_items && quotation.quotation_items.length > 0) {
        console.log("Using quotation_items data")
        products = quotation.quotation_items.map((item) => {
          // Los precios vienen con IGV, necesitamos mostrarlos sin IGV
          const precioConIGV = item.offer_unit_price_with_tax || item.platform_unit_price_with_tax || 0
          const totalConIGV = item.offer_total_with_tax || item.platform_total || 0

          // Calcular precios sin IGV (dividir entre 1.18)
          const precioSinIGV = precioConIGV / 1.18
          const totalSinIGV = totalConIGV / 1.18

          // Obtener logo de marca desde el mapa
          const brandLogoUrl = item.product_brand ? brandLogosMap.get(item.product_brand) : undefined

          console.log(`Product ${item.product_code}:`, {
            brand: item.product_brand,
            brandLogoUrl,
            precioConIGV,
            precioSinIGV,
            totalConIGV,
            totalSinIGV,
          })

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
      } else {
        console.log("No quotation items found")
        toast.error("No se encontraron productos para generar el PDF")
        return
      }

      console.log("Final products with brand logos:", products)
      console.log(
        "Marcas encontradas:",
        products.map((p) => ({ brand: p.brand, hasLogo: !!p.brandLogoUrl })),
      )

      // Verificar que tenemos productos
      if (!products || products.length === 0) {
        console.error("No products found!")
        toast.error("Error: No se encontraron productos para generar el PDF")
        return
      }

      // Calcular totales basados en los productos SIN IGV
      const subtotalSinIGV = products.reduce((sum, product) => sum + product.totalPrice, 0)
      const igvCalculado = subtotalSinIGV * 0.18
      const totalCalculado = subtotalSinIGV + igvCalculado

      console.log("Cálculos finales:", {
        subtotalSinIGV,
        igvCalculado,
        totalCalculado,
        marcasConLogo: products.filter((p) => p.brandLogoUrl).length,
      })

      // Preparar datos para el PDF
      const pdfData: PrivateQuotationPDFData = {
        // Información de la empresa
        companyName: companyInfo.name || "Empresa",
        companyRuc: companyInfo.ruc || "N/A",
        companyCode: companyInfo.code,
        companyAddress: companyInfo.address || undefined,
        companyPhone: companyInfo.phone || undefined,
        companyEmail: companyInfo.email || undefined,
        companyLogoUrl: companyInfo.logo_url || undefined,
        companyAccountInfo: "191-38640570-37", // Fallback

        // Información de la cotización
        quotationNumber: quotation.quotation_number || `#${quotation.id.slice(0, 8)}`,
        quotationDate: quotation.quotation_date,
        validUntil: quotation.valid_until || undefined,
        status: quotation.status,

        // Información del cliente
        clientCode: quotation.quotation_number || "N/A",
        clientName: quotation.entity_name || "Cliente",
        clientRuc: quotation.entity_ruc || "N/A",
        clientAddress: quotation.fiscal_address || quotation.delivery_location || "No especificado", // Use fiscal_address if available
        clientDepartment: undefined,
        clientAttention: "Cliente Privado",
        currency: "Soles",

        // Productos - CON PRECIOS SIN IGV Y LOGOS DE MARCA
        products: products,

        // Totales
        subtotal: subtotalSinIGV,
        igv: igvCalculado,
        total: totalCalculado,

        // Creado por
        createdBy: quotation.profiles?.full_name || "Sistema de creación AGPC",
      }

      // Generar QR code en el cliente y añadirlo a los datos del PDF
      const qrCodeBase64 = await generateQRForQuotation(pdfData.quotationNumber, pdfData)
      pdfData.qrCodeBase64 = qrCodeBase64

      console.log("Final PDF data to send to server:", {
        companyCode: pdfData.companyCode,
        companyName: pdfData.companyName,
        productsCount: pdfData.products.length,
        brandsWithLogos: pdfData.products.filter((p) => p.brandLogoUrl).length,
        brandLogos: pdfData.products.map((p) => ({ brand: p.brand, logoUrl: p.brandLogoUrl })),
        subtotal: pdfData.subtotal,
        igv: pdfData.igv,
        total: pdfData.total,
        qrCodePresent: !!pdfData.qrCodeBase64,
        clientAddressUsed: pdfData.clientAddress, // Debugging which address is used
      })

      // Llamar a la nueva ruta de API para generar y descargar el PDF
      const response = await fetch("/api/generate-quotation-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pdfData, type: "private" }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Server responded with error: ${response.status} - ${errorText}`)
      }

      // Obtener el blob y crear un enlace de descarga
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `Cotizacion_Privada_${quotation.quotation_number || quotation.id.slice(0, 8)}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)

      toast.success("PDF para empresa privada generado y descargado exitosamente")
    } catch (error) {
      console.error("Error generating private PDF:", error)
      toast.error("Error al generar y descargar el PDF para empresa privada. Por favor, intente nuevamente.")
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Button
      onClick={handleGeneratePDF}
      disabled={isGenerating}
      variant="outline"
      className="flex items-center gap-2 border-purple-300 hover:bg-purple-50 text-purple-700 bg-transparent transition-all duration-200 hover:shadow-md hover:scale-105"
    >
      {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
      {isGenerating ? "Generando PDF..." : "PDF Empresa Privada"}
    </Button>
  )
}
