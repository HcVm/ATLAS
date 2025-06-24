import jsPDF from "jspdf"
import html2canvas from "html2canvas"

export interface QuotationPDFData {
  // Información de la empresa
  companyName: string
  companyRuc: string
  companyAddress?: string
  companyPhone?: string
  companyEmail?: string

  // Información de la cotización
  quotationNumber: string
  quotationDate: string
  validUntil?: string
  status: string

  // Información del cliente
  clientName: string
  clientRuc: string
  deliveryLocation: string

  // Información del producto (para cotizaciones simples - legacy)
  productCode?: string
  productDescription?: string
  productBrand?: string
  quantity?: number
  unitPrice?: number
  totalPrice?: number

  // Información de productos múltiples
  items?: Array<{
    productCode: string
    productDescription: string
    productBrand?: string
    quantity: number
    platformUnitPrice: number
    providerUnitPrice?: number
    offerUnitPrice?: number
    finalUnitPrice: number
    platformTotal: number
    providerTotal?: number
    offerTotal?: number
    finalTotal: number
  }>

  // Totales generales
  platformGrandTotal?: number
  providerGrandTotal?: number
  offerGrandTotal?: number
  finalGrandTotal: number

  // Información de ruta (opcional)
  routeInfo?: {
    origin: string
    destination: string
    distance: string
    duration: string
    mapImageUrl?: string
  }

  // Observaciones
  observations?: string

  // Creado por
  createdBy: string
}

export const generateQuotationPDF = async (data: QuotationPDFData): Promise<void> => {
  // Crear el HTML temporal para el PDF
  const htmlContent = createQuotationHTML(data)

  // Crear un elemento temporal en el DOM
  const tempDiv = document.createElement("div")
  tempDiv.innerHTML = htmlContent
  tempDiv.style.position = "absolute"
  tempDiv.style.left = "-9999px"
  tempDiv.style.top = "0"
  tempDiv.style.width = "1200px" // Ancho fijo amplio
  tempDiv.style.minHeight = "800px" // Altura mínima
  tempDiv.style.backgroundColor = "white"
  tempDiv.style.fontFamily = "Arial, sans-serif"
  tempDiv.style.padding = "20px"

  document.body.appendChild(tempDiv)

  try {
    // Esperar un poco para que las imágenes se carguen
    await new Promise((resolve) => setTimeout(resolve, 4000))

    // Obtener las dimensiones reales del contenido
    const contentHeight = tempDiv.scrollHeight
    const contentWidth = tempDiv.scrollWidth

    console.log("Content dimensions:", { contentWidth, contentHeight })

    // Convertir HTML a canvas con dimensiones dinámicas
    const canvas = await html2canvas(tempDiv, {
      scale: 1.5,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      width: contentWidth,
      height: contentHeight,
      scrollX: 0,
      scrollY: 0,
    })

    // Crear PDF con dimensiones dinámicas
    const imgWidth = canvas.width
    const imgHeight = canvas.height

    // Calcular dimensiones del PDF basadas en el contenido
    const pdfWidth = Math.max(210, (imgWidth * 210) / 794) // Mínimo A4, pero puede ser más ancho
    const pdfHeight = Math.max(297, (imgHeight * 297) / 1123) // Mínimo A4, pero puede ser más alto

    console.log("PDF dimensions:", { pdfWidth, pdfHeight })

    // Crear PDF con dimensiones personalizadas
    const pdf = new jsPDF({
      orientation: pdfWidth > pdfHeight ? "landscape" : "portrait",
      unit: "mm",
      format: [pdfWidth, pdfHeight],
    })

    const imgData = canvas.toDataURL("image/png", 1.0)

    // Agregar la imagen al PDF ocupando todo el espacio
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight, undefined, "FAST")

    // Descargar el PDF
    pdf.save(`Cotizacion_Detallada_${data.quotationNumber}_${data.clientName.replace(/\s+/g, "_")}.pdf`)
  } finally {
    // Limpiar el elemento temporal
    document.body.removeChild(tempDiv)
  }
}

const createQuotationHTML = (data: QuotationPDFData): string => {
  const formatCurrency = (amount: number) => {
    return `S/ ${amount.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-PE", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  // Determinar si es multi-producto
  const isMultiProduct = data.items && data.items.length > 0
  const hasProviderPrices =
    isMultiProduct && data.items?.some((item) => item.providerUnitPrice && item.providerUnitPrice > 0)
  const hasOfferPrices = isMultiProduct && data.items?.some((item) => item.offerUnitPrice && item.offerUnitPrice > 0)

  console.log("PDF Generation Debug:", {
    isMultiProduct,
    itemsCount: data.items?.length || 0,
    hasProviderPrices,
    hasOfferPrices,
    items: data.items,
  })

  return `
    <div style="width: 100%; background: white; font-family: Arial, sans-serif; font-size: 12px; line-height: 1.4; color: #333;">
      <!-- Header -->
      <div style="border-bottom: 4px solid #2563eb; padding-bottom: 20px; margin-bottom: 20px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="vertical-align: top; width: 65%;">
              <h1 style="color: #2563eb; font-size: 28px; font-weight: bold; margin: 0 0 8px 0;">
                ${data.companyName}
              </h1>
              <p style="color: #6b7280; margin: 0; font-size: 14px; font-weight: 600;">RUC: ${data.companyRuc}</p>
              ${data.companyAddress ? `<p style="color: #6b7280; margin: 4px 0 0 0; font-size: 12px;">${data.companyAddress}</p>` : ""}
              ${data.companyPhone ? `<p style="color: #6b7280; margin: 4px 0 0 0; font-size: 12px;">Teléfono: ${data.companyPhone}</p>` : ""}
              ${data.companyEmail ? `<p style="color: #6b7280; margin: 4px 0 0 0; font-size: 12px;">Email: ${data.companyEmail}</p>` : ""}
            </td>
            <td style="vertical-align: top; text-align: right; width: 35%;">
              <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 15px 20px; border-radius: 10px; display: inline-block;">
                <h2 style="margin: 0; font-size: 22px; font-weight: bold;">COTIZACIÓN DETALLADA</h2>
                <p style="margin: 8px 0 0 0; font-size: 16px; opacity: 0.9;"># ${data.quotationNumber}</p>
              </div>
            </td>
          </tr>
        </table>
      </div>
      
      <!-- Información General -->
      <div style="margin-bottom: 25px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="vertical-align: top; width: 48%; padding-right: 2%;">
              <h3 style="color: #374151; font-size: 16px; font-weight: bold; margin: 0 0 12px 0; border-bottom: 3px solid #e5e7eb; padding-bottom: 6px;">
                📋 INFORMACIÓN DEL CLIENTE
              </h3>
              <div style="background: #f8fafc; padding: 15px; border-radius: 10px; border-left: 5px solid #2563eb;">
                <p style="margin: 0 0 8px 0; font-size: 13px;"><strong>Razón Social:</strong> ${data.clientName}</p>
                <p style="margin: 0 0 8px 0; font-size: 13px;"><strong>RUC:</strong> ${data.clientRuc}</p>
                <p style="margin: 0; font-size: 13px;"><strong>Lugar de Entrega:</strong> ${data.deliveryLocation}</p>
              </div>
            </td>
            
            <td style="vertical-align: top; width: 48%; padding-left: 2%;">
              <h3 style="color: #374151; font-size: 16px; font-weight: bold; margin: 0 0 12px 0; border-bottom: 3px solid #e5e7eb; padding-bottom: 6px;">
                📅 DETALLES DE LA COTIZACIÓN
              </h3>
              <div style="background: #f0fdf4; padding: 15px; border-radius: 10px; border-left: 5px solid #10b981;">
                <p style="margin: 0 0 8px 0; font-size: 13px;"><strong>Fecha de Emisión:</strong> ${formatDate(data.quotationDate)}</p>
                ${data.validUntil ? `<p style="margin: 0 0 8px 0; font-size: 13px;"><strong>Válida hasta:</strong> ${formatDate(data.validUntil)}</p>` : ""}
                <p style="margin: 0 0 8px 0; font-size: 13px;"><strong>Estado:</strong> 
                  <span style="background: #2563eb; color: white; padding: 3px 8px; border-radius: 15px; font-size: 11px; font-weight: 600;">
                    ${data.status.toUpperCase()}
                  </span>
                </p>
                <p style="margin: 0; font-size: 13px;"><strong>Elaborado por:</strong> ${data.createdBy}</p>
              </div>
            </td>
          </tr>
        </table>
      </div>
      
      <!-- Detalle de Productos -->
      <div style="margin-bottom: 25px;">
        <h3 style="color: #374151; font-size: 18px; font-weight: bold; margin: 0 0 15px 0; border-bottom: 3px solid #e5e7eb; padding-bottom: 8px;">
          🛍️ DETALLE COMPLETO DE PRODUCTOS ${isMultiProduct ? `(${data.items?.length} productos)` : ""}
        </h3>
        
        ${
          isMultiProduct
            ? `
        <!-- Tabla Multi-Producto -->
        <div style="background: white; border: 2px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
            <thead>
              <tr style="background: linear-gradient(135deg, #f3f4f6, #e5e7eb);">
                <th style="padding: 12px 8px; text-align: left; font-weight: bold; color: #374151; border-bottom: 2px solid #d1d5db; width: 8%;">Código</th>
                <th style="padding: 12px 8px; text-align: left; font-weight: bold; color: #374151; border-bottom: 2px solid #d1d5db; width: 25%;">Descripción del Producto</th>
                <th style="padding: 12px 8px; text-align: center; font-weight: bold; color: #374151; border-bottom: 2px solid #d1d5db; width: 6%;">Cant.</th>
                <th style="padding: 12px 8px; text-align: center; font-weight: bold; color: #374151; border-bottom: 2px solid #d1d5db; width: 12%;">Precio Plataforma</th>
                ${hasProviderPrices ? `<th style="padding: 12px 8px; text-align: center; font-weight: bold; color: #374151; border-bottom: 2px solid #d1d5db; width: 12%;">Precio Proveedor</th>` : ""}
                ${hasOfferPrices ? `<th style="padding: 12px 8px; text-align: center; font-weight: bold; color: #374151; border-bottom: 2px solid #d1d5db; width: 12%;">Precio Oferta</th>` : ""}
                <th style="padding: 12px 8px; text-align: center; font-weight: bold; color: #374151; border-bottom: 2px solid #d1d5db; width: 12%;">Precio Final</th>
                <th style="padding: 12px 8px; text-align: center; font-weight: bold; color: #374151; border-bottom: 2px solid #d1d5db; width: 13%;">Total Final</th>
              </tr>
            </thead>
            <tbody>
              ${data.items
                ?.map(
                  (item, index) => `
              <tr style="${index % 2 === 0 ? "background: #f9fafb;" : "background: white;"}">
                <td style="padding: 15px 8px; border-bottom: 1px solid #f3f4f6; font-weight: 600; word-wrap: break-word; font-size: 10px; vertical-align: top;">
                  ${item.productCode}
                </td>
                <td style="padding: 15px 8px; border-bottom: 1px solid #f3f4f6; word-wrap: break-word; vertical-align: top;">
                  <div>
                    <p style="margin: 0; font-weight: 600; font-size: 11px; color: #374151;">${item.productDescription}</p>
                    ${item.productBrand ? `<p style="margin: 4px 0 0 0; color: #6b7280; font-size: 10px; font-style: italic;">Marca: ${item.productBrand}</p>` : ""}
                  </div>
                </td>
                <td style="padding: 15px 8px; text-align: center; border-bottom: 1px solid #f3f4f6; font-weight: 600; vertical-align: top;">
                  <span style="background: #dbeafe; color: #1e40af; padding: 4px 8px; border-radius: 8px; font-size: 11px;">
                    ${item.quantity.toLocaleString()}
                  </span>
                </td>
                <td style="padding: 15px 8px; text-align: center; border-bottom: 1px solid #f3f4f6; vertical-align: top;">
                  <div style="background: #eff6ff; padding: 8px; border-radius: 6px; border: 1px solid #bfdbfe;">
                    <div style="font-weight: 600; color: #1e40af; font-size: 10px;">Unitario:</div>
                    <div style="font-size: 11px; color: #1e40af;">${formatCurrency(item.platformUnitPrice)}</div>
                    <div style="font-weight: 600; color: #1e40af; font-size: 10px; margin-top: 4px;">Total:</div>
                    <div style="font-size: 11px; font-weight: bold; color: #1e40af;">${formatCurrency(item.platformTotal)}</div>
                  </div>
                </td>
                ${
                  hasProviderPrices
                    ? `<td style="padding: 15px 8px; text-align: center; border-bottom: 1px solid #f3f4f6; vertical-align: top;">
                  <div style="background: #f0fdf4; padding: 8px; border-radius: 6px; border: 1px solid #bbf7d0;">
                    <div style="font-weight: 600; color: #166534; font-size: 10px;">Unitario:</div>
                    <div style="font-size: 11px; color: #166534;">${item.providerUnitPrice ? formatCurrency(item.providerUnitPrice) : "N/A"}</div>
                    <div style="font-weight: 600; color: #166534; font-size: 10px; margin-top: 4px;">Total:</div>
                    <div style="font-size: 11px; font-weight: bold; color: #166534;">${item.providerTotal ? formatCurrency(item.providerTotal) : "N/A"}</div>
                  </div>
                </td>`
                    : ""
                }
                ${
                  hasOfferPrices
                    ? `<td style="padding: 15px 8px; text-align: center; border-bottom: 1px solid #f3f4f6; vertical-align: top;">
                  <div style="background: #fef3c7; padding: 8px; border-radius: 6px; border: 1px solid #fbbf24;">
                    <div style="font-weight: 600; color: #92400e; font-size: 10px;">Unitario:</div>
                    <div style="font-size: 11px; color: #92400e;">${item.offerUnitPrice ? formatCurrency(item.offerUnitPrice) : "N/A"}</div>
                    <div style="font-weight: 600; color: #92400e; font-size: 10px; margin-top: 4px;">Total:</div>
                    <div style="font-size: 11px; font-weight: bold; color: #92400e;">${item.offerTotal ? formatCurrency(item.offerTotal) : "N/A"}</div>
                  </div>
                </td>`
                    : ""
                }
                <td style="padding: 15px 8px; text-align: center; border-bottom: 1px solid #f3f4f6; vertical-align: top;">
                  <div style="background: #fce7f3; padding: 8px; border-radius: 6px; border: 1px solid #f9a8d4;">
                    <div style="font-weight: 600; color: #be185d; font-size: 10px;">Unitario:</div>
                    <div style="font-size: 11px; color: #be185d;">${formatCurrency(item.finalUnitPrice)}</div>
                    <div style="font-weight: 600; color: #be185d; font-size: 10px; margin-top: 4px;">Total:</div>
                    <div style="font-size: 11px; font-weight: bold; color: #be185d;">${formatCurrency(item.finalTotal)}</div>
                  </div>
                </td>
                <td style="padding: 15px 8px; text-align: center; border-bottom: 1px solid #f3f4f6; vertical-align: top;">
                  <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 10px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 14px; font-weight: bold;">${formatCurrency(item.finalTotal)}</div>
                  </div>
                </td>
              </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
        </div>
        
        <!-- Resumen de Totales Multi-Producto -->
        <div style="margin-top: 20px;">
          <div style="background: linear-gradient(135deg, #f8fafc, #e2e8f0); padding: 20px; border-radius: 12px; border: 2px solid #cbd5e1;">
            <h4 style="margin: 0 0 15px 0; font-size: 16px; font-weight: bold; color: #374151; text-align: center;">
              💰 RESUMEN DE TOTALES POR TIPO DE PRECIO
            </h4>
            <table style="width: 100%; max-width: 600px; margin: 0 auto; border-collapse: collapse;">
              <tbody>
                ${
                  data.platformGrandTotal
                    ? `
                <tr>
                  <td style="padding: 8px 15px; text-align: right; font-weight: 600; color: #1e40af; font-size: 14px; border-bottom: 1px solid #e2e8f0;">
                    Total Precio Plataforma:
                  </td>
                  <td style="padding: 8px 15px; text-align: right; font-weight: bold; color: #1e40af; font-size: 14px; border-bottom: 1px solid #e2e8f0;">
                    ${formatCurrency(data.platformGrandTotal)}
                  </td>
                </tr>
                `
                    : ""
                }
                ${
                  data.providerGrandTotal && data.providerGrandTotal > 0
                    ? `
                <tr>
                  <td style="padding: 8px 15px; text-align: right; font-weight: 600; color: #166534; font-size: 14px; border-bottom: 1px solid #e2e8f0;">
                    Total Precio Proveedor:
                  </td>
                  <td style="padding: 8px 15px; text-align: right; font-weight: bold; color: #166534; font-size: 14px; border-bottom: 1px solid #e2e8f0;">
                    ${formatCurrency(data.providerGrandTotal)}
                  </td>
                </tr>
                `
                    : ""
                }
                ${
                  data.offerGrandTotal && data.offerGrandTotal > 0
                    ? `
                <tr>
                  <td style="padding: 8px 15px; text-align: right; font-weight: 600; color: #92400e; font-size: 14px; border-bottom: 1px solid #e2e8f0;">
                    Total Precio Oferta:
                  </td>
                  <td style="padding: 8px 15px; text-align: right; font-weight: bold; color: #92400e; font-size: 14px; border-bottom: 1px solid #e2e8f0;">
                    ${formatCurrency(data.offerGrandTotal)}
                  </td>
                </tr>
                `
                    : ""
                }
                <tr style="border-top: 3px solid #2563eb;">
                  <td style="padding: 15px 15px; text-align: right; font-weight: bold; font-size: 18px; color: #374151;">
                    TOTAL FINAL COTIZADO (INC. IGV):
                  </td>
                  <td style="padding: 15px 15px; text-align: right; font-weight: bold; font-size: 20px; color: #2563eb;">
                    ${formatCurrency(data.finalGrandTotal)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        `
            : `
        <!-- Producto Simple (Legacy) -->
        <div style="background: white; border: 2px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: linear-gradient(135deg, #f3f4f6, #e5e7eb);">
                <th style="padding: 15px; text-align: left; font-weight: bold; color: #374151; border-bottom: 2px solid #d1d5db; width: 15%;">Código</th>
                <th style="padding: 15px; text-align: left; font-weight: bold; color: #374151; border-bottom: 2px solid #d1d5db; width: 40%;">Descripción</th>
                <th style="padding: 15px; text-align: center; font-weight: bold; color: #374151; border-bottom: 2px solid #d1d5db; width: 15%;">Cantidad</th>
                <th style="padding: 15px; text-align: right; font-weight: bold; color: #374151; border-bottom: 2px solid #d1d5db; width: 15%;">P. Unitario</th>
                <th style="padding: 15px; text-align: right; font-weight: bold; color: #374151; border-bottom: 2px solid #d1d5db; width: 15%;">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding: 20px 15px; border-bottom: 1px solid #f3f4f6; font-weight: 600; word-wrap: break-word;">
                  ${data.productCode || ""}
                </td>
                <td style="padding: 20px 15px; border-bottom: 1px solid #f3f4f6; word-wrap: break-word;">
                  <div>
                    <p style="margin: 0; font-weight: 600; font-size: 14px;">${data.productDescription || ""}</p>
                    ${data.productBrand ? `<p style="margin: 5px 0 0 0; color: #6b7280; font-size: 12px;">Marca: ${data.productBrand}</p>` : ""}
                  </div>
                </td>
                <td style="padding: 20px 15px; text-align: center; border-bottom: 1px solid #f3f4f6; font-weight: 600;">
                  ${(data.quantity || 0).toLocaleString()}
                </td>
                <td style="padding: 20px 15px; text-align: right; border-bottom: 1px solid #f3f4f6; font-weight: 600;">
                  ${formatCurrency(data.unitPrice || 0)}
                </td>
                <td style="padding: 20px 15px; text-align: right; border-bottom: 1px solid #f3f4f6; font-weight: bold; color: #2563eb; font-size: 16px;">
                  ${formatCurrency(data.totalPrice || 0)}
                </td>
              </tr>
            </tbody>
          </table>
          
          <!-- Total destacado para producto simple -->
          <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 20px; text-align: center;">
            <p style="margin: 0; font-size: 14px; opacity: 0.9;">TOTAL COTIZADO (INC. IGV)</p>
            <p style="margin: 8px 0 0 0; font-size: 24px; font-weight: bold;">${formatCurrency(data.finalGrandTotal)}</p>
          </div>
        </div>
        `
        }
      </div>
      
      ${
        data.routeInfo
          ? `
      <!-- Información de Ruta -->
      <div style="margin-bottom: 25px;">
        <h3 style="color: #374151; font-size: 18px; font-weight: bold; margin: 0 0 15px 0; border-bottom: 3px solid #e5e7eb; padding-bottom: 8px;">
          🚛 INFORMACIÓN COMPLETA DE TRANSPORTE TERRESTRE
        </h3>
        <div style="background: linear-gradient(135deg, #f0f9ff, #e0f2fe); border: 2px solid #0ea5e9; border-radius: 12px; padding: 20px;">
          <table style="width: 100%; margin-bottom: 15px; border-collapse: collapse;">
            <tr>
              <td style="vertical-align: top; width: 50%; padding-right: 15px;">
                <div style="background: white; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981;">
                  <p style="margin: 0 0 10px 0; font-size: 14px;"><strong>🚛 Punto de Origen:</strong></p>
                  <p style="margin: 0; color: #374151; font-size: 13px;">${data.routeInfo.origin}</p>
                </div>
              </td>
              <td style="vertical-align: top; width: 50%; padding-left: 15px;">
                <div style="background: white; padding: 15px; border-radius: 8px; border-left: 4px solid #ef4444;">
                  <p style="margin: 0 0 10px 0; font-size: 14px;"><strong>📍 Punto de Destino:</strong></p>
                  <p style="margin: 0; color: #374151; font-size: 13px;">${data.routeInfo.destination}</p>
                </div>
              </td>
            </tr>
          </table>
          
          <table style="width: 100%; margin-bottom: 15px; border-collapse: collapse;">
            <tr>
              <td style="vertical-align: top; width: 50%; padding-right: 15px;">
                <div style="background: white; padding: 15px; border-radius: 8px; text-align: center; border: 2px solid #3b82f6;">
                  <p style="margin: 0 0 5px 0; font-size: 12px; color: #6b7280;">DISTANCIA TOTAL</p>
                  <p style="margin: 0; font-size: 18px; font-weight: bold; color: #3b82f6;">📏 ${data.routeInfo.distance}</p>
                </div>
              </td>
              <td style="vertical-align: top; width: 50%; padding-left: 15px;">
                <div style="background: white; padding: 15px; border-radius: 8px; text-align: center; border: 2px solid #10b981;">
                  <p style="margin: 0 0 5px 0; font-size: 12px; color: #6b7280;">TIEMPO ESTIMADO</p>
                  <p style="margin: 0; font-size: 18px; font-weight: bold; color: #10b981;">⏱️ ${data.routeInfo.duration}</p>
                </div>
              </td>
            </tr>
          </table>
          
          ${
            data.routeInfo.mapImageUrl
              ? `
          <div style="text-align: center; margin-top: 20px;">
            <div style="background: white; padding: 15px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <h4 style="margin: 0 0 15px 0; font-size: 16px; font-weight: bold; color: #374151;">🗺️ MAPA DE RUTA CALCULADA</h4>
              <img src="${data.routeInfo.mapImageUrl}" alt="Mapa de ruta de transporte" 
                   style="max-width: 100%; height: auto; border-radius: 8px; border: 2px solid #e5e7eb;" 
                   crossorigin="anonymous" />
              <p style="margin: 10px 0 0 0; font-size: 12px; color: #6b7280; font-style: italic;">
                Ruta optimizada calculada para transporte terrestre de mercancías
              </p>
            </div>
          </div>
          `
              : `
          <div style="text-align: center; margin-top: 20px; padding: 40px; background: white; border-radius: 12px; color: #6b7280; border: 2px dashed #d1d5db;">
            <p style="margin: 0; font-style: italic; font-size: 14px;">🗺️ Mapa de ruta no disponible</p>
            <p style="margin: 5px 0 0 0; font-size: 12px;">La información de ruta se calculará al momento de la entrega</p>
          </div>
          `
          }
        </div>
      </div>
      `
          : ""
      }
      
      ${
        data.observations
          ? `
      <!-- Observaciones -->
      <div style="margin-bottom: 25px;">
        <h3 style="color: #374151; font-size: 18px; font-weight: bold; margin: 0 0 15px 0; border-bottom: 3px solid #e5e7eb; padding-bottom: 8px;">
          📝 OBSERVACIONES Y NOTAS IMPORTANTES
        </h3>
        <div style="background: linear-gradient(135deg, #fffbeb, #fef3c7); border: 2px solid #f59e0b; border-radius: 12px; padding: 20px;">
          <div style="background: white; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
            <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">${data.observations}</p>
          </div>
        </div>
      </div>
      `
          : ""
      }
      
      <!-- Footer -->
      <div style="border-top: 3px solid #e5e7eb; padding-top: 20px; margin-top: 30px; text-align: center; color: #6b7280; font-size: 12px;">
        <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
          <p style="margin: 0 0 8px 0; font-weight: 600;">📋 CONDICIONES GENERALES</p>
          <p style="margin: 0 0 8px 0;">Esta cotización es válida por el período especificado y está sujeta a disponibilidad de stock.</p>
          <p style="margin: 0 0 8px 0;">Los precios incluyen IGV y pueden variar según condiciones del mercado.</p>
          <p style="margin: 0; font-style: italic;">
            Documento generado automáticamente el ${new Date().toLocaleDateString("es-PE")} a las ${new Date().toLocaleTimeString("es-PE")}
          </p>
        </div>
      </div>
    </div>
  `
}

// Función para obtener la ruta usando nuestra API route
export const getRoutePolyline = async (
  origin: string,
  destination: string,
): Promise<{
  polyline: string | null
  distance: string
  duration: string
}> => {
  try {
    const response = await fetch(
      `/api/maps/route?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`,
    )

    if (!response.ok) {
      const errorData = await response.json()
      console.error("Route API error:", errorData)
      return { polyline: null, distance: "N/A", duration: "N/A" }
    }

    const data = await response.json()

    if (data.success) {
      return {
        polyline: data.polyline,
        distance: data.distance,
        duration: data.duration,
      }
    } else {
      console.error("Route API returned error:", data.error)
      return { polyline: null, distance: "N/A", duration: "N/A" }
    }
  } catch (error) {
    console.error("Error fetching route:", error)
    return { polyline: null, distance: "N/A", duration: "N/A" }
  }
}

// Función mejorada para generar URL de imagen del mapa con marcadores visibles
export const generateMapWithRouteImageUrl = async (
  origin: string,
  destination: string,
  apiKey: string,
): Promise<string> => {
  const baseUrl = "https://maps.googleapis.com/maps/api/staticmap"

  // Clean addresses
  const cleanOrigin = origin.trim()
  const cleanDestination = destination.trim()

  console.log("Generating map for:", { cleanOrigin, cleanDestination })

  try {
    // Get the route polyline using our API
    const routeData = await getRoutePolyline(cleanOrigin, cleanDestination)
    console.log("Route data received:", routeData)

    // Construir URL paso a paso para mejor debugging
    let finalUrl = baseUrl

    // Parámetros base - mapa más grande para el PDF
    const baseParams = [`size=800x400`, `maptype=roadmap`, `format=png`, `language=es`, `region=PE`, `key=${apiKey}`]

    // Marcadores - construir de forma más simple
    const markers = [
      `markers=color:green%7Clabel:A%7Csize:mid%7C${encodeURIComponent(cleanOrigin)}`,
      `markers=color:red%7Clabel:B%7Csize:mid%7C${encodeURIComponent(cleanDestination)}`,
    ]

    // Ruta si está disponible
    const pathParam = routeData.polyline ? [`path=color:0x0000ff%7Cweight:4%7Cenc:${routeData.polyline}`] : []

    // Combinar todos los parámetros
    const allParams = [...baseParams, ...markers, ...pathParam]
    finalUrl = `${baseUrl}?${allParams.join("&")}`

    console.log("Generated Maps URL:", finalUrl)
    return finalUrl
  } catch (error) {
    console.error("Error generating map with route:", error)
    // Fallback to simple map with markers only
    return generateSimpleMapImageUrl(cleanOrigin, cleanDestination, apiKey)
  }
}

// Función de respaldo para mapa simple - también corregida
export const generateSimpleMapImageUrl = (origin: string, destination: string, apiKey: string): string => {
  const baseUrl = "https://maps.googleapis.com/maps/api/staticmap"

  const cleanOrigin = origin.trim()
  const cleanDestination = destination.trim()

  console.log("Generating simple map for:", { cleanOrigin, cleanDestination })

  // Construir URL de forma más directa - mapa más grande
  const baseParams = [`size=800x400`, `maptype=roadmap`, `format=png`, `language=es`, `region=PE`, `key=${apiKey}`]

  const markers = [
    `markers=color:green%7Clabel:A%7Csize:mid%7C${encodeURIComponent(cleanOrigin)}`,
    `markers=color:red%7Clabel:B%7Csize:mid%7C${encodeURIComponent(cleanDestination)}`,
  ]

  const allParams = [...baseParams, ...markers]
  const finalUrl = `${baseUrl}?${allParams.join("&")}`

  console.log("Generated simple Maps URL:", finalUrl)
  return finalUrl
}
