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
    budgetCeilingUnitPrice?: number
    budgetCeilingTotal?: number
    referenceImageUrl?: string
  }>

  // Totales generales
  platformGrandTotal?: number
  providerGrandTotal?: number
  offerGrandTotal?: number
  budgetCeilingGrandTotal?: number
  finalGrandTotal: number

  // Información de comisión
  commissionInfo?: {
    contactPerson: string
    commissionPercentage: number
    commissionBaseAmount: number
    commissionAmount: number
    commissionNotes?: string
  }

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
    return `S/ ${amount.toLocaleString("es-PE", { minimumFractionDigits: 4 })}`
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
  const hasBudgetCeilingPrices =
    isMultiProduct && data.items?.some((item) => item.budgetCeilingUnitPrice && item.budgetCeilingUnitPrice > 0)

  console.log("PDF Generation Debug:", {
    isMultiProduct,
    itemsCount: data.items?.length || 0,
    hasProviderPrices,
    hasOfferPrices,
    items: data.items,
  })

  return `
    <div style="width: 100%; background: white; font-family: Arial, sans-serif; font-size: 12px; line-height: 1.4; color: #1e293b;">
      <!-- Header -->
      <div style="border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 20px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="vertical-align: top; width: 65%;">
              <h1 style="color: #1e293b; font-size: 28px; font-weight: 600; margin: 0 0 8px 0; letter-spacing: -0.025em;">
                ${data.companyName}
              </h1>
              <p style="color: #64748b; margin: 0; font-size: 14px; font-weight: 500;">RUC: ${data.companyRuc}</p>
              ${data.companyAddress ? `<p style="color: #64748b; margin: 4px 0 0 0; font-size: 12px;">${data.companyAddress}</p>` : ""}
              ${data.companyPhone ? `<p style="color: #64748b; margin: 4px 0 0 0; font-size: 12px;">Teléfono: ${data.companyPhone}</p>` : ""}
              ${data.companyEmail ? `<p style="color: #64748b; margin: 4px 0 0 0; font-size: 12px;">Email: ${data.companyEmail}</p>` : ""}
            </td>
            <td style="vertical-align: top; text-align: right; width: 35%;">
              <div style="color:rgb(38, 83, 155); padding: 16px 24px; border-radius: 8px; display: inline-block; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
                <h2 style="margin: 0; font-size: 18px; font-weight: 600; letter-spacing: -0.025em;">COTIZACIÓN DETALLADA</h2>
                <p style="margin: 8px 0 0 0; font-size: 16px; opacity: 0.9; font-weight: 500;"># ${data.quotationNumber}</p>
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
              <h3 style="color: #374151; font-size: 16px; font-weight: 600; margin: 0 0 12px 0; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px;">
                📋 INFORMACIÓN DEL CLIENTE
              </h3>
              <div style="background: #f8fafc; padding: 16px; border-radius: 8px; border-left: 4px solid #64748b;">
                <p style="margin: 0 0 8px 0; font-size: 13px; color: #374151;"><strong>Razón Social:</strong> ${data.clientName}</p>
                <p style="margin: 0 0 8px 0; font-size: 13px; color: #374151;"><strong>RUC:</strong> ${data.clientRuc}</p>
                <p style="margin: 0; font-size: 13px; color: #374151;"><strong>Lugar de Entrega:</strong> ${data.deliveryLocation}</p>
              </div>
            </td>
            
            <td style="vertical-align: top; width: 48%; padding-left: 2%;">
              <h3 style="color: #374151; font-size: 16px; font-weight: 600; margin: 0 0 12px 0; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px;">
                📅 DETALLES DE LA COTIZACIÓN
              </h3>
              <div style="background: #f1f5f9; padding: 16px; border-radius: 8px; border-left: 4px solid #84cc16;">
                <p style="margin: 0 0 8px 0; font-size: 13px; color: #374151;"><strong>Fecha de Emisión:</strong> ${formatDate(data.quotationDate)}</p>
                ${data.validUntil ? `<p style="margin: 0 0 8px 0; font-size: 13px; color: #374151;"><strong>Válida hasta:</strong> ${formatDate(data.validUntil)}</p>` : ""}
                <p style="margin: 0 0 8px 0; font-size: 13px; color: #374151;"><strong>Estado:</strong> 
                  <span style="color: #84cc16; padding: 4px 12px; border-radius: 6px; font-size: 11px; font-weight: 500; letter-spacing: 0.025em; margin-left: 8px;">
                    ${data.status.toUpperCase()}
                  </span>
                </p>
                <p style="margin: 0; font-size: 13px; color: #374151;"><strong>Elaborado por:</strong> ${data.createdBy}</p>
              </div>
            </td>
          </tr>
        </table>
      </div>
      
      <!-- Detalle de Productos -->
      <div style="margin-bottom: 25px;">
        <h3 style="color: #374151; font-size: 18px; font-weight: 600; margin: 0 0 15px 0; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">
          🛍️ DETALLE COMPLETO DE PRODUCTOS ${isMultiProduct ? `(${data.items?.length} productos)` : ""}
        </h3>
        
        ${
          isMultiProduct
            ? `
        <!-- Tabla Multi-Producto -->
        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
          <table style="width: 100%; border-collapse: collapse; font-size: 11px; table-layout: fixed;">
            <thead>
              <tr style="background: #f8fafc;">
                <th style="padding: 12px 8px; text-align: left; font-weight: 600; color: #374151; border-bottom: 1px solid #e2e8f0; width: 8%;">Código</th>
                <th style="padding: 12px 8px; text-align: left; font-weight: 600; color: #374151; border-bottom: 1px solid #e2e8f0; width: 25%;">Descripción del Producto</th>
                <th style="padding: 12px 8px; text-align: center; font-weight: 600; color: #374151; border-bottom: 1px solid #e2e8f0; width: 6%;">Cant.</th>
                <th style="padding: 12px 8px; text-align: center; font-weight: 600; color: #374151; border-bottom: 1px solid #e2e8f0; width: 12%;">Precio Plataforma</th>
                ${hasProviderPrices ? `<th style="padding: 12px 8px; text-align: center; font-weight: 600; color: #374151; border-bottom: 1px solid #e2e8f0; width: 12%;">Precio Proveedor</th>` : ""}
                ${hasOfferPrices ? `<th style="padding: 12px 8px; text-align: center; font-weight: 600; color: #374151; border-bottom: 1px solid #e2e8f0; width: 12%;">Precio Oferta</th>` : ""}
                ${hasBudgetCeilingPrices ? `<th style="padding: 12px 8px; text-align: center; font-weight: 600; color: #374151; border-bottom: 1px solid #e2e8f0; width: 12%;">Techo Presup.</th>` : ""}
                <th style="padding: 12px 8px; text-align: center; font-weight: 600; color: #374151; border-bottom: 1px solid #e2e8f0; width: 8%;">Imagen Ref.</th>
                <th style="padding: 12px 8px; text-align: center; font-weight: 600; color: #374151; border-bottom: 1px solid #e2e8f0; width: 15%;">Total Cotizado</th>
              </tr>
            </thead>
            <tbody>
              ${data.items
                ?.map(
                  (item, index) => `
              <tr style="${index % 2 === 0 ? "background: #f9fafb;" : "background: white;"}">
                <td style="padding: 12px 8px; border-bottom: 1px solid #f1f5f9; font-weight: 600; word-wrap: break-word; font-size: 10px; vertical-align: top; text-align: left;">
                  ${item.productCode}
                </td>
                <td style="padding: 12px 8px; border-bottom: 1px solid #f1f5f9; word-wrap: break-word; vertical-align: top;">
                  <div>
                    <p style="margin: 0; font-weight: 600; font-size: 11px; color: #374151; line-height: 1.3;">${item.productDescription}</p>
                    ${item.productBrand ? `<p style="margin: 4px 0 0 0; color: #64748b; font-size: 10px; font-style: italic;">Marca: ${item.productBrand}</p>` : ""}
                  </div>
                </td>
                <td style="padding: 12px 12px; text-align: center; border-bottom: 1px solid #f1f5f9; font-weight: 600; vertical-align: top;">
                  <span style="color: #475569; padding: 8px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">
                    ${item.quantity.toLocaleString()}
                  </span>
                </td>
                <td style="padding: 12px 8px; text-align: center; border-bottom: 1px solid #f1f5f9; vertical-align: top;">
                  <div style="background:rgba(182, 194, 212, 0.28); padding: 8px; border-radius: 4px; border: 1px solid #cbd5e1; width: 100%; box-sizing: border-box;">
                    <div style="font-weight: 600; color: #3b82f6; font-size: 9px; margin-bottom: 2px;">Unitario:</div>
                    <div style="font-size: 10px; color: #3b82f6; margin-bottom: 4px;">${formatCurrency(item.platformUnitPrice)}</div>
                    <div style="font-weight: 600; color: #3b82f6; font-size: 9px; margin-bottom: 2px;">Total:</div>
                    <div style="font-size: 11px; font-weight: 600; color: #3b82f6;">${formatCurrency(item.platformTotal)}</div>
                  </div>
                </td>
                ${
                  hasProviderPrices
                    ? `<td style="padding: 12px 8px; text-align: center; border-bottom: 1px solid #f1f5f9; vertical-align: top;">
                  <div style="background:rgba(185, 212, 194, 0.42); padding: 8px; border-radius: 4px; border: 1px solid #cbd5e1; width: 100%; box-sizing: border-box;">
                    <div style="font-weight: 600; color: #16a34a; font-size: 9px; margin-bottom: 2px;">Unitario:</div>
                    <div style="font-size: 10px; color: #16a34a; margin-bottom: 4px;">${item.providerUnitPrice ? formatCurrency(item.providerUnitPrice) : "N/A"}</div>
                    <div style="font-weight: 600; color: #16a34a; font-size: 9px; margin-bottom: 2px;">Total:</div>
                    <div style="font-size: 11px; font-weight: 600; color: #16a34a;">${item.providerTotal ? formatCurrency(item.providerTotal) : "N/A"}</div>
                  </div>
                </td>`
                    : ""
                }
                ${
                  hasOfferPrices
                    ? `<td style="padding: 12px 8px; text-align: center; border-bottom: 1px solid #f1f5f9; vertical-align: top;">
                  <div style="background:rgba(211, 205, 179, 0.42); padding: 8px; border-radius: 4px; border: 1px solid #cbd5e1; width: 100%; box-sizing: border-box;">
                    <div style="font-weight: 600; color: #d97706; font-size: 9px; margin-bottom: 2px;">Unitario:</div>
                    <div style="font-size: 10px; color: #d97706; margin-bottom: 4px;">${item.offerUnitPrice ? formatCurrency(item.offerUnitPrice) : "N/A"}</div>
                    <div style="font-weight: 600; color: #d97706; font-size: 9px; margin-bottom: 2px;">Total:</div>
                    <div style="font-size: 11px; font-weight: 600; color: #d97706;">${item.offerTotal ? formatCurrency(item.offerTotal) : "N/A"}</div>
                  </div>
                </td>`
                    : ""
                }
                ${
                  hasBudgetCeilingPrices
                    ? `<td style="padding: 12px 8px; text-align: center; border-bottom: 1px solid #f1f5f9; vertical-align: top;">
                  <div style="background:rgba(212, 190, 203, 0.23); padding: 8px; border-radius: 4px; border: 1px solid #cbd5e1; width: 100%; box-sizing: border-box;">
                    <div style="font-weight: 600; color: #ec4899; font-size: 9px; margin-bottom: 2px;">Unitario:</div>
                    <div style="font-size: 10px; color: #ec4899; margin-bottom: 4px;">${item.budgetCeilingUnitPrice ? formatCurrency(item.budgetCeilingUnitPrice) : "N/A"}</div>
                    <div style="font-weight: 600; color: #ec4899; font-size: 9px; margin-bottom: 2px;">Total:</div>
                    <div style="font-size: 11px; font-weight: 600; color: #ec4899;">${item.budgetCeilingTotal ? formatCurrency(item.budgetCeilingTotal) : "N/A"}</div>
                  </div>
                </td>`
                    : ""
                }
                <td style="padding: 12px 8px; text-align: center; border-bottom: 1px solid #f1f5f9; vertical-align: top;">
                  ${
                    item.referenceImageUrl
                      ? `<img src="${item.referenceImageUrl}" alt="Imagen del producto" style="max-width: 80px; max-height: 80px; border-radius: 4px; border: 1px solid #e2e8f0;" crossorigin="anonymous" />`
                      : `<div style="width: 80px; height: 80px; background: #f1f5f9; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 9px; margin: 0 auto;">Sin imagen</div>`
                  }
                </td>
                <td style="padding: 12px 8px; text-align: center; border-bottom: 1px solid #f1f5f9; vertical-align: top;">
                  <div style="background: #475569; color: white; padding: 12px 8px; border-radius: 6px; text-align: center; width: 100%; box-sizing: border-box;">
                    <div style="font-size: 13px; font-weight: 600;">${formatCurrency(item.offerTotal || item.platformTotal)}</div>
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
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0;">
            <h4 style="margin: 0 0 15px 0; font-size: 16px; font-weight: 600; color: #374151; text-align: center;">
              💰 RESUMEN DE TOTALES POR TIPO DE PRECIO
            </h4>
            <table style="width: 100%; max-width: 600px; margin: 0 auto; border-collapse: collapse;">
              <tbody>
                ${
                  data.platformGrandTotal
                    ? `
                <tr>
                  <td style="padding: 8px 15px; text-align: right; font-weight: 600; color: #3b82f6; font-size: 14px; border-bottom: 1px solid #f1f5f9;">
                    Total Precio Plataforma:
                  </td>
                  <td style="padding: 8px 15px; text-align: right; font-weight: 600; color: #3b82f6; font-size: 14px; border-bottom: 1px solid #f1f5f9;">
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
                  <td style="padding: 8px 15px; text-align: right; font-weight: 600; color: #16a34a; font-size: 14px; border-bottom: 1px solid #f1f5f9;">
                    Total Precio Proveedor:
                  </td>
                  <td style="padding: 8px 15px; text-align: right; font-weight: 600; color: #16a34a; font-size: 14px; border-bottom: 1px solid #f1f5f9;">
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
                  <td style="padding: 8px 15px; text-align: right; font-weight: 600; color: #d97706; font-size: 14px; border-bottom: 1px solid #f1f5f9;">
                    Total Precio Oferta:
                  </td>
                  <td style="padding: 8px 15px; text-align: right; font-weight: 600; color: #d97706; font-size: 14px; border-bottom: 1px solid #f1f5f9;">
                    ${formatCurrency(data.offerGrandTotal)}
                  </td>
                </tr>
                `
                    : ""
                }
                ${
                  data.budgetCeilingGrandTotal && data.budgetCeilingGrandTotal > 0
                    ? `
                <tr>
                  <td style="padding: 8px 15px; text-align: right; font-weight: 600; color: #ec4899; font-size: 14px; border-bottom: 1px solid #f1f5f9;">
                    Total Techo Presupuestal:
                  </td>
                  <td style="padding: 8px 15px; text-align: right; font-weight: 600; color: #ec4899; font-size: 14px; border-bottom: 1px solid #f1f5f9;">
                    ${formatCurrency(data.budgetCeilingGrandTotal)}
                  </td>
                </tr>
                `
                    : ""
                }
                <tr style="border-top: 2px solid #475569;">
                  <td style="padding: 15px 15px; text-align: right; font-weight: 600; font-size: 16px; color: #374151;">
                    TOTAL FINAL COTIZADO (INC. IGV):
                  </td>
                  <td style="padding: 15px 15px; text-align: right; font-weight: 700; font-size: 18px; color: #475569;">
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
        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #f8fafc;">
                <th style="padding: 15px; text-align: left; font-weight: 600; color: #374151; border-bottom: 1px solid #e2e8f0; width: 15%;">Código</th>
                <th style="padding: 15px; text-align: left; font-weight: 600; color: #374151; border-bottom: 1px solid #e2e8f0; width: 40%;">Descripción</th>
                <th style="padding: 15px; text-align: center; font-weight: 600; color: #374151; border-bottom: 1px solid #e2e8f0; width: 15%;">Cantidad</th>
                <th style="padding: 15px; text-align: right; font-weight: 600; color: #374151; border-bottom: 1px solid #e2e8f0; width: 15%;">P. Unitario</th>
                <th style="padding: 15px; text-align: right; font-weight: 600; color: #374151; border-bottom: 1px solid #e2e8f0; width: 15%;">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding: 20px 15px; border-bottom: 1px solid #f1f5f9; font-weight: 600; word-wrap: break-word;">
                  ${data.productCode || ""}
                </td>
                <td style="padding: 20px 15px; border-bottom: 1px solid #f1f5f9; word-wrap: break-word;">
                  <div>
                    <p style="margin: 0; font-weight: 600; font-size: 14px;">${data.productDescription || ""}</p>
                    ${data.productBrand ? `<p style="margin: 5px 0 0 0; color: #64748b; font-size: 12px;">Marca: ${data.productBrand}</p>` : ""}
                  </div>
                </td>
                <td style="padding: 20px 20px; text-align: center; border-bottom: 1px solid #f1f5f9; font-weight: 600;">
                  ${(data.quantity || 0).toLocaleString()}
                </td>
                <td style="padding: 20px 15px; text-align: right; border-bottom: 1px solid #f1f5f9; font-weight: 600;">
                  ${formatCurrency(data.unitPrice || 0)}
                </td>
                <td style="padding: 20px 15px; text-align: right; border-bottom: 1px solid #f1f5f9; font-weight: 600; color: #475569; font-size: 16px;">
                  ${formatCurrency(data.totalPrice || 0)}
                </td>
              </tr>
            </tbody>
          </table>
          
          <!-- Total destacado para producto simple -->
          <div style="background: #475569; color: white; padding: 20px; text-align: center;">
            <p style="margin: 0; font-size: 14px; opacity: 0.9;">TOTAL COTIZADO (INC. IGV)</p>
            <p style="margin: 8px 0 0 0; font-size: 24px; font-weight: 600;">${formatCurrency(data.finalGrandTotal)}</p>
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
        <h3 style="color: #374151; font-size: 18px; font-weight: 600; margin: 0 0 15px 0; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">
          🚛 INFORMACIÓN COMPLETA DE TRANSPORTE TERRESTRE
        </h3>
        <div style="background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 8px; padding: 20px;">
          <table style="width: 100%; margin-bottom: 15px; border-collapse: collapse;">
            <tr>
              <td style="vertical-align: top; width: 50%; padding-right: 15px;">
                <div style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #16a34a;">
                  <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: 600;"><strong>🚛 Punto de Origen:</strong></p>
                  <p style="margin: 0; color: #374151; font-size: 13px;">${data.routeInfo.origin}</p>
                </div>
              </td>
              <td style="vertical-align: top; width: 50%; padding-left: 15px;">
                <div style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #ef4444;">
                  <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: 600;"><strong>📍 Punto de Destino:</strong></p>
                  <p style="margin: 0; color: #374151; font-size: 13px;">${data.routeInfo.destination}</p>
                </div>
              </td>
            </tr>
          </table>
          
          <table style="width: 100%; margin-bottom: 15px; border-collapse: collapse;">
            <tr>
              <td style="vertical-align: top; width: 50%; padding-right: 15px;">
                <div style="background: white; padding: 15px; border-radius: 6px; text-align: center; border: 1px solid #3b82f6;">
                  <p style="margin: 0 0 5px 0; font-size: 12px; color: #64748b;">DISTANCIA TOTAL</p>
                  <p style="margin: 0; font-size: 18px; font-weight: 600; color: #3b82f6;">📏 ${data.routeInfo.distance}</p>
                </div>
              </td>
              <td style="vertical-align: top; width: 50%; padding-left: 15px;">
                <div style="background: white; padding: 15px; border-radius: 6px; text-align: center; border: 1px solid #16a34a;">
                  <p style="margin: 0 0 5px 0; font-size: 12px; color: #64748b;">TIEMPO ESTIMADO</p>
                  <p style="margin: 0; font-size: 18px; font-weight: 600; color: #16a34a;">⏱️ ${data.routeInfo.duration}</p>
                </div>
              </td>
            </tr>
          </table>
          
          ${
            data.routeInfo.mapImageUrl
              ? `
          <div style="text-align: center; margin-top: 20px;">
            <div style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
              <h4 style="margin: 0 0 15px 0; font-size: 16px; font-weight: 600; color: #374151;">🗺️ MAPA DE RUTA CALCULADA</h4>
              <img src="${data.routeInfo.mapImageUrl}" alt="Mapa de ruta de transporte" 
                   style="max-width: 100%; height: auto; border-radius: 6px; border: 1px solid #e2e8f0;" 
                   crossorigin="anonymous" />
              <p style="margin: 10px 0 0 0; font-size: 12px; color: #64748b; font-style: italic;">
                Ruta optimizada calculada para transporte terrestre de mercancías
              </p>
            </div>
          </div>
          `
              : `
          <div style="text-align: center; margin-top: 20px; padding: 40px; background: white; border-radius: 8px; color: #64748b; border: 1px dashed #cbd5e1;">
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
        <h3 style="color: #374151; font-size: 18px; font-weight: 600; margin: 0 0 15px 0; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">
          📝 OBSERVACIONES Y NOTAS IMPORTANTES
        </h3>
        <div style="background: #fffbeb; border: 1px solid #f59e0b; border-radius: 8px; padding: 20px;">
          <div style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #f59e0b;">
            <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">${data.observations}</p>
          </div>
        </div>
      </div>
      `
          : ""
      }
      
      
      ${
        data.commissionInfo
          ? `
<!-- Información de Comisión -->
<div style="margin-bottom: 25px;">
  <h3 style="color: #374151; font-size: 18px; font-weight: 600; margin: 0 0 15px 0; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">
    💰 INFORMACIÓN DE COMISIÓN COMERCIAL
  </h3>
  <div style="background: #f0fdf4; border: 1px solid #16a34a; border-radius: 8px; padding: 20px;">
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="vertical-align: top; width: 50%; padding-right: 15px;">
          <div style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #16a34a; margin-bottom: 15px;">
            <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #374151;">👤 Contacto/Vendedor:</p>
            <p style="margin: 0; color: #16a34a; font-size: 16px; font-weight: 600;">${data.commissionInfo.contactPerson}</p>
          </div>
          
          <div style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #3b82f6;">
            <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #374151;">📊 Porcentaje de Comisión:</p>
            <p style="margin: 0; color: #3b82f6; font-size: 18px; font-weight: 600;">${data.commissionInfo.commissionPercentage.toFixed(2)}%</p>
          </div>
        </td>
        
        <td style="vertical-align: top; width: 50%; padding-left: 15px;">
          <div style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #f59e0b; margin-bottom: 15px;">
            <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #374151;">💵 Base de Cálculo (Sin IGV):</p>
            <p style="margin: 0; color: #f59e0b; font-size: 16px; font-weight: 600;">
              ${formatCurrency(data.commissionInfo.commissionBaseAmount)}
            </p>
          </div>
          
          <div style="background: #16a34a; color: white; padding: 20px; border-radius: 8px; text-align: center; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
            <p style="margin: 0 0 8px 0; font-size: 14px; opacity: 0.9;">💰 COMISIÓN TOTAL</p>
            <p style="margin: 0; font-size: 24px; font-weight: 700;">
              ${formatCurrency(data.commissionInfo.commissionAmount)}
            </p>
          </div>
        </td>
      </tr>
    </table>
    
    ${
      data.commissionInfo.commissionNotes
        ? `
    <div style="margin-top: 20px; background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #64748b;">
      <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #374151;">📝 Notas de Comisión:</p>
      <p style="margin: 0; color: #64748b; font-size: 13px; line-height: 1.5;">${data.commissionInfo.commissionNotes}</p>
    </div>
    `
        : ""
    }
    
    <div style="margin-top: 15px; padding: 12px; background: rgba(16, 163, 74, 0.1); border-radius: 6px; border: 1px dashed #16a34a;">
      <p style="margin: 0; font-size: 12px; color: #16a34a; text-align: center; font-style: italic;">
        ℹ️ La comisión se calcula sobre el monto total sin IGV y será pagadera según términos acordados
      </p>
    </div>
  </div>
</div>
`
          : ""
      }
      
      <!-- Footer -->
      <div style="border-top: 2px solid #e2e8f0; padding-top: 20px; margin-top: 30px; text-align: center; color: #64748b; font-size: 12px;">
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

export const generateMapImageUrl = generateMapWithRouteImageUrl