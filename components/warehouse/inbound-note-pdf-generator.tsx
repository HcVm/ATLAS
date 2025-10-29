"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { FileText, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import jsPDF from "jspdf"
import html2canvas from "html2canvas"

interface InboundNotePDFGeneratorProps {
  movement: {
    id: string
    movement_date: string
    products?: {
      name: string
      code: string
      unit_of_measure: string
      description?: string
    } | null
    quantity: number
    entry_price: number | null
    total_amount: number | null
    supplier: string | null
    purchase_order_number: string | null
    notes: string | null
    profiles?: {
      full_name: string
    } | null
  }
  companyCode: string
  companyName: string
  companyLogo?: string
}

export default function InboundNotePDFGenerator({
  movement,
  companyCode,
  companyName,
  companyLogo,
}: InboundNotePDFGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [invoiceFile, setInvoiceFile] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const { data } = await supabase
          .from("inventory_movement_attachments")
          .select("file_name")
          .eq("movement_id", movement.id)
          .eq("attachment_type", "factura")
          .limit(1)
          .single()

        if (data) {
          setInvoiceFile(data.file_name)
        }
      } catch (error) {
        console.log("[v0] No invoice found for this movement")
      }
    }

    fetchInvoice()
  }, [movement.id])

  const handleGeneratePDF = async () => {
    try {
      setIsGenerating(true)

      const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("es-PE", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      }

      const formatCurrency = (amount: number | null) => {
        if (!amount) return "S/. 0.00"
        return new Intl.NumberFormat("es-PE", {
          style: "currency",
          currency: "PEN",
        }).format(amount)
      }

      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <style>
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              
              body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                color: #333;
                line-height: 1.6;
              }
              
              .container {
                width: 100%;
                max-width: 210mm;
                height: 297mm;
                padding: 10mm;
                background: white;
                
              }
              
              .header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 30px;
                border-bottom: 4px solid #8B3A1F;
                padding-bottom: 20px;
              }
              
              .logo-section {
                display: flex;
                align-items: center;
                gap: 15px;
              }
              
              .logo {
                width: 90px;
                height: 90px;
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                color: #D4AF37;
                font-size: 28px;
                border: 2px solid #D4AF37;
                box-shadow: 0 4px 6px rgba(139, 58, 31, 0.2);
              }
              
              .company-info h1 {
                font-size: 24px;
                color: #8B3A1F;
                margin-bottom: 5px;
                font-weight: 700;
              }
              
              .company-info p {
                font-size: 12px;
                color: #666;
              }
              
              .document-title {
                text-align: right;
              }
              
              .document-title h2 {
                font-size: 22px;
                color: #8B3A1F;
                margin-bottom: 5px;
                font-weight: 700;
                letter-spacing: 1px;
              }
              
              .document-title p {
                font-size: 12px;
                color: #D4AF37;
                font-weight: 600;
              }
              
              .content {
                margin-bottom: 30px;
              }
              
              .section {
                margin-bottom: 15px;
              }
              
              .section-title {
                font-size: 13px;
                font-weight: 700;
                color: white;
                background: linear-gradient(90deg, #8B3A1F 0%, #A0451F 100%);
                padding: 8px 12px;
                border-left: 6px solid #D4AF37;
                border-top-left-radius: 10px;
                border-top-right-radius: 10px;
                margin-bottom: 15px;
                letter-spacing: 0.5px;
              }
              
              .info-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
                margin-bottom: 15px;
              }
              
              .info-item {
                display: flex;
                flex-direction: column;
              }
              
              .info-label {
                font-size: 10px;
                color: #8B3A1F;
                font-weight: 700;
                text-transform: uppercase;
                margin-bottom: 6px;
                letter-spacing: 0.5px;
                margin-left: 50px;
              }
              
              .info-value {
                font-size: 13px;
                color: #333;
                font-weight: 500;
                margin-left: 50px;
              }
              
              .product-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 20px;
              }
              
              .product-table thead {
                background: linear-gradient(90deg, #8B3A1F 0%, #A0451F 100%);
                color: white;
                border-top-left-radius: 10px;
                border-top-right-radius: 10px;
                
              }
              
              .product-table th {
                padding: 5px;
                text-align: left;
                font-size: 13px;
                font-weight: 700;
                letter-spacing: 0.5px;
              }
              
              .product-table td {
                padding: 14px;
                border-bottom: 1px solid #e5e7eb;
                font-size: 12px;
              }
              
              .product-table tbody tr:nth-child(even) {
                background: #faf8f6;
              }
              
              .product-table tbody tr:hover {
                background: #f5f1ed;
              }
              
              .text-right {
                text-align: right;
              }
              
              .text-center {
                text-align: center;
              }
              
              .summary-section {
                background: linear-gradient(135deg, #faf8f6 0%, #f5f1ed 100%);
                padding: 15px;
                border-radius: 6px;
                margin-top: 17px;
                border-left: 5px solid #D4AF37;
              }
              
              .summary-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 12px;
                font-size: 12px;
              }
              
              .summary-row.total {
                border-top: 2px solid #8B3A1F;
                padding-top: 12px;
                font-weight: 700;
                font-size: 14px;
                color: #8B3A1F;
              }
              
              .notes-section {
                background: #FFF8DC;
                border-left: 5px solid #D4AF37;
                padding: 10px;
                border-radius: 4px;
                font-size: 12px;
                margin-top: 15px;
                color: #333;
              }
              
              .notes-section strong {
                color: #8B3A1F;
              }
              
              .footer {
                margin-top: 30px;
                padding-top: 15px;
                border-top: 2px solid #8B3A1F;
                font-size: 10px;
                color: #999;
                text-align: center;
              }
              
              .signature-section {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 40px;
                margin-top: 40px;
              }
              
              .signature-line {
                border-top: 1px solid #333;
                padding-top: 10px;
                text-align: center;
                font-size: 11px;
                grid-template-columns: 1fr 1fr;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <!-- Header -->
              <div class="header">
                <div class="logo-section">
                  <div class="logo"><img src="${companyLogo}" alt="${companyName} Logo" /></div>
                  <div class="company-info">
                    <h1>${companyName}</h1>
                    <p>ATLAS</p>
                  </div>
                </div>
                <div class="document-title">
                  <h2>NOTA DE INGRESO</h2>
                  <p>Documento de Control</p>
                </div>
              </div>
              
              <!-- Content -->
              <div class="content">
                <!-- Información General -->
                <div class="section">
                  <div class="section-title">Información General</div>
                  <div class="info-grid">
                    <div class="info-item">
                      <span class="info-label">Número de Movimiento</span>
                      <span class="info-value">${movement.id.substring(0, 8).toUpperCase()}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">Fecha de Ingreso</span>
                      <span class="info-value">${formatDate(movement.movement_date)}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">Proveedor</span>
                      <span class="info-value">${movement.supplier || "No especificado"}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">Orden de Compra</span>
                      <span class="info-value">${movement.purchase_order_number || "N/A"}</span>
                    </div>
                    <!-- Add invoice reference field -->
                    <div class="info-item">
                      <span class="info-label">Documento de Referencia</span>
                      <span class="info-value">${invoiceFile || "No adjuntado"}</span>
                    </div>
                  </div>
                </div>
                
                <!-- Detalles del Producto -->
                <div class="section">
                  <div class="section-title">Detalles del Producto</div>
                  <table class="product-table">
                    <thead>
                      <tr>
                        <th>Código</th>
                        <th>Descripción</th>
                        <th class="text-right">Cantidad</th>
                        <th class="text-right">Precio Unitario</th>
                        <th class="text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>${movement.products?.code || "N/A"}</td>
                        <td>${movement.products?.description || movement.products?.name || "Producto no disponible"}</td>
                        <td class="text-right">${movement.quantity} ${movement.products?.unit_of_measure || "unidades"}</td>
                        <td class="text-right">${formatCurrency(movement.entry_price)}</td>
                        <td class="text-right"><strong>${formatCurrency(movement.total_amount)}</strong></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                
                <!-- Resumen -->
                <div class="section">
                  <div class="summary-section">
                    <div class="summary-row">
                      <span>Subtotal:</span>
                      <span>${formatCurrency(movement.total_amount)}</span>
                    </div>
                    <div class="summary-row">
                      <span>IGV (18%):</span>
                      <span>${formatCurrency((movement.total_amount || 0) * 0.18)}</span>
                    </div>
                    <div class="summary-row total">
                      <span>TOTAL:</span>
                      <span>${formatCurrency((movement.total_amount || 0) * 1.18)}</span>
                    </div>
                  </div>
                </div>
                
                <!-- Notas -->
                ${
                  movement.notes
                    ? `
                  <div class="notes-section">
                    <strong>Notas:</strong><br/>
                    ${movement.notes}
                  </div>
                `
                    : ""
                }
                
                <!-- Información del Usuario -->
                <div class="section" style="margin-top: 30px;">
                  <div class="info-grid">
                    <div class="info-item">
                      <span class="info-label">Registrado por</span>
                      <span class="info-value">${movement.profiles?.full_name || "Usuario del sistema"}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">Fecha de Generación</span>
                      <span class="info-value">${formatDate(new Date().toISOString())}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Footer -->
              <div class="footer">
                <p>Este documento fue generado automáticamente por el Sistema de Gestión ATLAS.</p>
                <p>Documento confidencial - Uso interno únicamente</p>
              </div>
            </div>
          </body>
        </html>
      `

      const element = document.createElement("div")
      element.innerHTML = htmlContent
      element.style.position = "absolute"
      element.style.left = "-9999px"
      element.style.width = "210mm"
      element.style.height = "297mm"
      element.style.backgroundColor = "white"
      document.body.appendChild(element)

      // Convert HTML to canvas
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
      })

      // Create PDF from canvas
      const imgData = canvas.toDataURL("image/png")
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      })

      const imgWidth = 210
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight)

      pdf.save(`Nota_Ingreso_${movement.id.substring(0, 8)}_${new Date().toISOString().split("T")[0]}.pdf`)

      document.body.removeChild(element)

      toast({
        title: "PDF generado",
        description: "La nota de ingreso se descargó correctamente.",
      })
    } catch (error) {
      console.error("Error generating PDF:", error)
      toast({
        title: "Error",
        description: "No se pudo generar el PDF. Intente nuevamente.",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Button
      onClick={handleGeneratePDF}
      disabled={isGenerating}
      variant="outline"
      size="sm"
      className="gap-2 bg-transparent"
      title="Descargar nota de ingreso en PDF"
    >
      {isGenerating ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Generando...
        </>
      ) : (
        <>
          <FileText className="h-4 w-4" />
          Nota PDF
        </>
      )}
    </Button>
  )
}
