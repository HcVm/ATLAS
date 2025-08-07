"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { FileText, Loader2 } from 'lucide-react'
import { toast } from "sonner"
import { generateARMEntityQuotationPDF, type ARMEntityQuotationPDFData } from "@/lib/pdf-generator-entity-arm"

interface ARMEntityQuotationPDFGeneratorProps {
  quotation: {
    id: string
    quotation_number: string
    quotation_date: string
    valid_until?: string | null
    status: string
    entity_name: string
    entity_ruc: string
    delivery_location: string
    fiscal_address?: string | null; // ADDED THIS LINE
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

export default function ARMEntityQuotationPDFGenerator({
  quotation,
  companyInfo,
}: ARMEntityQuotationPDFGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGeneratePDF = async () => {
    setIsGenerating(true)

    try {
      console.log("=== ARM Entity PDF Generation Debug ===")
      console.log("Quotation data:", quotation)
      console.log("Is multi product flag:", quotation.is_multi_product)
      console.log("Quotation items:", quotation.quotation_items)
      console.log("Quotation items count:", quotation.quotation_items?.length || 0)
      console.log("Fiscal Address from quotation:", quotation.fiscal_address); // Debugging fiscal address

      // NUEVA LÓGICA: Siempre usar quotation_items si existen, sin importar is_multi_product
      let products: ARMEntityQuotationPDFData["products"] = []

      if (quotation.quotation_items && quotation.quotation_items.length > 0) {
        // Usar quotation_items (tanto para 1 producto como para múltiples)
        console.log("Using quotation_items data (modern approach)")
        products = quotation.quotation_items.map((item) => {
          // Los precios vienen con IGV, necesitamos mostrarlos sin IGV
          const precioConIGV = item.offer_unit_price_with_tax || item.platform_unit_price_with_tax || 0
          const totalConIGV = item.offer_total_with_tax || item.platform_total || 0

          // Calcular precios sin IGV (dividir entre 1.18)
          const precioSinIGV = precioConIGV / 1.18
          const totalSinIGV = totalConIGV / 1.18

          console.log(`Product ${item.product_code}:`, {
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
            unitPrice: precioSinIGV, // ← PRECIO SIN IGV
            totalPrice: totalSinIGV, // ← TOTAL SIN IGV
          }
        })

        console.log("Products from quotation_items (sin IGV):", products)
      } else {
        // Fallback a campos directos (cotizaciones legacy)
        console.log("Using direct fields (legacy approach)")
        const precioConIGV = quotation.offer_unit_price_with_tax || quotation.platform_unit_price_with_tax || 0
        const totalConIGV = quotation.offer_total_with_tax || quotation.platform_total || 0

        // Calcular precios sin IGV
        const precioSinIGV = precioConIGV / 1.18
        const totalSinIGV = totalConIGV / 1.18

        products = [
          {
            quantity: quotation.quantity || 0,
            description: quotation.product_description || "Producto sin descripción",
            unit: "UND",
            brand: quotation.product_brand || undefined,
            code: quotation.unique_code || undefined,
            unitPrice: precioSinIGV, // ← PRECIO SIN IGV
            totalPrice: totalSinIGV, // ← TOTAL SIN IGV
          },
        ]

        console.log("Products from direct fields (sin IGV):", products)
      }

      console.log("Final products array:", products)
      console.log("Products count:", products.length)

      // Verificar que tenemos productos
      if (!products || products.length === 0) {
        console.error("No products found! This should not happen.")
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
        productosEnTabla: products.map((p) => ({
          code: p.code,
          unitPrice: p.unitPrice,
          totalPrice: p.totalPrice,
        })),
      })

      // Preparar datos para el PDF ARM
      const pdfData: ARMEntityQuotationPDFData = {
        // Información de la empresa
        companyName: companyInfo.name || "ARM Corporations",
        companyRuc: companyInfo.ruc || "N/A",
        companyCode: companyInfo.code,
        companyAddress: companyInfo.address,
        companyPhone: companyInfo.phone,
        companyEmail: companyInfo.email,
        companyLogoUrl: companyInfo.logo_url || undefined,
        companyAccountInfo: "191-38640570-37", // Fallback

        // Información de la cotización
        quotationNumber: quotation.quotation_number,
        quotationDate: quotation.quotation_date,
        validUntil: quotation.valid_until || undefined,
        status: quotation.status,

        // Información del cliente
        clientCode: quotation.quotation_number || "N/A",
        clientName: quotation.entity_name || "Cliente",
        clientRuc: quotation.entity_ruc || "N/A",
        clientAddress: quotation.fiscal_address || quotation.delivery_location || "No especificado", // Use fiscal_address if available
        clientDepartment: undefined,
        clientAttention: "Logística - Abastecimiento",
        currency: "Soles",

        // Productos - CON PRECIOS SIN IGV
        products: products,

        // Totales
        subtotal: subtotalSinIGV,
        igv: igvCalculado,
        total: totalCalculado,

        // Condiciones por defecto ARM
        conditions: [
          "Plazo de entrega: 10 días hábiles.",
          "Entrega en almacén central.",
          "Forma de pago: Crédito 15 días.",
          "Garantía por defectos de fábrica 12 meses.",
        ],

        // Observaciones
        observations: quotation.observations || undefined,

        // Creado por
        createdBy: quotation.profiles?.full_name || "Sistema de creación ARM",
      }

      console.log("Final ARM PDF data:", {
        companyCode: pdfData.companyCode,
        companyName: pdfData.companyName,
        productsCount: pdfData.products.length,
        products: pdfData.products,
        subtotal: pdfData.subtotal,
        igv: pdfData.igv,
        total: pdfData.total,
        dataSource: quotation.quotation_items?.length ? "quotation_items" : "direct_fields",
        clientAddressUsed: pdfData.clientAddress, // Debugging which address is used
      })

      // Generar el PDF ARM
      await generateARMEntityQuotationPDF(pdfData)

      toast.success("PDF ARM para entidad generado exitosamente con información bancaria completa")
    } catch (error) {
      console.error("Error generating ARM entity PDF:", error)
      toast.error("Error al generar el PDF ARM para entidad. Por favor, intente nuevamente.")
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Button
      onClick={handleGeneratePDF}
      disabled={isGenerating}
      variant="outline"
      className="flex items-center gap-2 border-orange-300 hover:bg-orange-50 text-orange-700 bg-transparent transition-all duration-200 hover:shadow-md hover:scale-105"
    >
      {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
      {isGenerating ? "Generando PDF ARM..." : "PDF ARM Entidad"}
    </Button>
  )
}
