import jsPDF from "jspdf"
import html2canvas from "html2canvas"
import { getBankingInfoByCompanyCode, type BankingInfo } from "./company-banking-info"

export interface EntityQuotationPDFData {
  // Información de la empresa
  companyName: string
  companyRuc: string
  companyCode?: string
  companyAddress?: string
  companyPhone?: string
  companyEmail?: string
  companyLogoUrl?: string
  companyAccountInfo?: string

  // Información bancaria (se obtiene automáticamente por código de empresa)
  bankingInfo?: BankingInfo

  // Información de la cotización
  quotationNumber: string
  quotationDate: string
  validUntil?: string
  status: string

  // Información del cliente/entidad
  clientCode: string
  clientName: string
  clientRuc: string
  clientAddress: string
  clientDepartment?: string
  clientAttention?: string
  currency: string

  // Información de productos (puede ser multi-producto)
  products: Array<{
    quantity: number
    description: string
    unit: string
    brand?: string
    code?: string
    unitPrice: number
    totalPrice: number
  }>

  // Totales
  subtotal: number
  igv: number
  total: number

  // Condiciones
  conditions?: string[]

  // Observaciones adicionales
  observations?: string

  // Creado por
  createdBy: string
}

export const generateEntityQuotationPDF = async (data: EntityQuotationPDFData): Promise<void> => {
  // Obtener información bancaria automáticamente si tenemos el código de empresa
  if (data.companyCode && !data.bankingInfo) {
    data.bankingInfo = getBankingInfoByCompanyCode(data.companyCode)
    console.log("Banking info obtained for company:", data.companyCode, data.bankingInfo)
  }

  // Crear el HTML temporal para el PDF
  const htmlContent = createEntityQuotationHTML(data)

  // Crear un elemento temporal en el DOM
  const tempDiv = document.createElement("div")
  tempDiv.innerHTML = htmlContent
  tempDiv.style.position = "absolute"
  tempDiv.style.left = "-9999px"
  tempDiv.style.top = "0"
  tempDiv.style.width = "210mm" // A4 width
  tempDiv.style.backgroundColor = "white"
  tempDiv.style.fontFamily = "Arial, sans-serif"

  document.body.appendChild(tempDiv)

  try {
    // Esperar un poco para que las imágenes se carguen
    await new Promise((resolve) => setTimeout(resolve, 3000))

    // Convertir HTML a canvas con altura automática
    const canvas = await html2canvas(tempDiv, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      width: 794, // A4 width in pixels at 96 DPI
      // Removemos la restricción de altura para permitir contenido largo
    })

    // Crear PDF
    const pdf = new jsPDF("p", "mm", "a4")
    const imgData = canvas.toDataURL("image/png")

    // Dimensiones de la página A4 en mm
    const pdfWidth = pdf.internal.pageSize.getWidth() // 210mm
    const pdfHeight = pdf.internal.pageSize.getHeight() // 297mm

    // Calcular dimensiones de la imagen
    const imgWidth = pdfWidth
    const imgHeight = (canvas.height * pdfWidth) / canvas.width

    // Si la imagen cabe en una página, agregarla directamente
    if (imgHeight <= pdfHeight) {
      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight)
    } else {
      // Si la imagen es más alta que una página, dividirla en múltiples páginas
      let remainingHeight = imgHeight
      let currentY = 0
      let pageNumber = 1

      while (remainingHeight > 0) {
        // Calcular la altura para esta página
        const pageHeight = Math.min(remainingHeight, pdfHeight)

        // Crear un canvas temporal para esta sección
        const pageCanvas = document.createElement("canvas")
        const pageCtx = pageCanvas.getContext("2d")

        if (pageCtx) {
          // Configurar el canvas para esta página
          pageCanvas.width = canvas.width
          pageCanvas.height = (pageHeight * canvas.width) / imgWidth

          // Dibujar la sección correspondiente del canvas original
          pageCtx.drawImage(
            canvas,
            0,
            (currentY * canvas.width) / imgWidth, // sx, sy
            canvas.width,
            pageCanvas.height, // sWidth, sHeight
            0,
            0, // dx, dy
            pageCanvas.width,
            pageCanvas.height, // dWidth, dHeight
          )

          // Convertir a imagen y agregar al PDF
          const pageImgData = pageCanvas.toDataURL("image/png")


          pdf.addImage(pageImgData, "PNG", 0, 0, imgWidth, pageHeight)
        }

        // Actualizar para la siguiente página
        currentY += pageHeight
        remainingHeight -= pageHeight
        pageNumber++
      }
    }

    // Descargar el PDF
    pdf.save(`Cotizacion_Entidad_${data.quotationNumber}_${data.clientName.replace(/\s+/g, "_")}.pdf`)
  } finally {
    // Limpiar el elemento temporal
    document.body.removeChild(tempDiv)
  }
}

const createEntityQuotationHTML = (data: EntityQuotationPDFData): string => {
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

  console.log("Entity PDF - Products data:", data.products)
  console.log("Entity PDF - Products count:", data.products?.length || 0)

  return `
    <div style="padding: 15px; max-width: 210mm; margin: 0 auto; background: white; font-family: Arial, sans-serif; font-size: 11px; line-height: 1.3; position: relative;">
      
      <!-- Marca de agua del logo -->
      ${
        data.companyLogoUrl
          ? `
      <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); opacity: 0.1; z-index: 0;">
        <img src="${data.companyLogoUrl}" alt="Logo" style="width: 500px; height: auto;" crossorigin="anonymous" />
      </div>
      `
          : ""
      }
      
      <!-- Contenido principal -->
      <div style="position: relative; z-index: 1;">
        
        <!-- Header oficial -->
        <div style="text-align: center; margin-bottom: 15px; border-bottom: 2px solid #000; padding-bottom: 10px;">
          <p style="margin: 0; font-size: 12px; font-weight: bold; color: #8B0000;">
            "Año de la Recuperación y Consolidación de la Economía Peruana"
          </p>
        </div>

        <!-- Sección de comercialización -->
        <div style="text-align: center; margin-bottom: 15px;">
          <p style="margin: 0; font-size: 10px; font-weight: bold;">COMERCIALIZACIÓN:</p>
          <p style="margin: 2px 0; font-size: 9px; line-height: 1.2;">
            REPRESENTACIÓN, CONSIGNACIÓN, PROMOCIÓN, PUBLICIDAD, IMPORTACIÓN, EXPORTACIÓN, DISTRIBUCIÓN,
            COMPRA, VENTA AL POR MAYOR Y MENOR DE ARTÍCULOS Y PRODUCTOS DE LA INDUSTRIA PERUANA
          </p>
        </div>

        <!-- Logo de la empresa (si existe) -->
        ${
          data.companyLogoUrl
            ? `
        <div style="text-align: center; margin-bottom: 5px; align-items: center; padding-bottom: 10px; display: flex; justify-content: center;">
          <img src="${data.companyLogoUrl}" alt="Logo ${data.companyName}" style="max-width: 120px; max-height: 80px;" crossorigin="anonymous" />
        </div>
        `
            : ""
        }

        <!-- Fecha y ubicación -->
        <div style="text-align: right; margin-bottom: 15px;">
          <p style="margin: 0; font-size: 11px;">Lima, ${formatDate(data.quotationDate)}</p>
        </div>

        <!-- Título de cotización -->
        <div style="text-align: center; margin-bottom: 15px; border: 2px solid #000; padding: 8px;">
          <h2 style="margin: 0; font-size: 14px; font-weight: bold;">COTIZACIÓN N° ${data.quotationNumber}</h2>
        </div>

        <!-- Datos del cliente -->
        <div style="margin-bottom: 15px;">
          <h3 style="margin: 0 0 8px 0; font-size: 12px; font-weight: bold; text-decoration: underline;">DATOS DEL CLIENTE</h3>
          <table style="width: 100%; font-size: 10px;">
            <tr>
              <td style="width: 15%; font-weight: bold; padding: 2px 0;">Código:</td>
              <td style="width: 35%; padding: 2px 0;">${data.clientCode}</td>
              <td style="width: 15%; font-weight: bold; padding: 2px 0;">Ruc:</td>
              <td style="width: 35%; padding: 2px 0;">${data.clientRuc}</td>
            </tr>
            <tr>
              <td style="font-weight: bold; padding: 2px 0;">Señor(es):</td>
              <td colspan="3" style="padding: 2px 0;">${data.clientName}</td>
            </tr>
            <tr>
              <td style="font-weight: bold; padding: 2px 0; vertical-align: top;">Dirección:</td>
              <td colspan="3" style="padding: 2px 0;">${data.clientAddress}</td>
            </tr>
            ${
              data.clientDepartment
                ? `
            <tr>
              <td style="font-weight: bold; padding: 2px 0;">Dependencia:</td>
              <td colspan="3" style="padding: 2px 0;">${data.clientDepartment}</td>
            </tr>
            `
                : ""
            }
            ${
              data.clientAttention
                ? `
            <tr>
              <td style="font-weight: bold; padding: 2px 0;">Atención:</td>
              <td style="padding: 2px 0;">${data.clientAttention}</td>
              <td style="font-weight: bold; padding: 2px 0;">Moneda:</td>
              <td style="padding: 2px 0;">${data.currency}</td>
            </tr>
            `
                : `
            <tr>
              <td style="font-weight: bold; padding: 2px 0;">Moneda:</td>
              <td colspan="3" style="padding: 2px 0;">${data.currency}</td>
            </tr>
            `
            }
          </table>
        </div>

        <!-- Información de la empresa -->
        <div style="margin-bottom: 15px; font-size: 9px; text-align: justify;">
          <p style="margin: 0; line-height: 1.3;">
            <strong>${data.companyName}</strong> - Identificación con RUC ${data.companyRuc}, 
            Comercial de confianza y solvencia moral y económica, para su adjudicación de:
          </p>
        </div>

        <!-- Tabla de productos - SIEMPRE MOSTRAR -->
        ${
          data.products && data.products.length > 0
            ? `
        <div style="margin-bottom: 15px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 9px;">
            <thead>
              <tr style="background-color: #f0f0f0;">
                <th style="border: 1px solid #000; padding: 5px; text-align: center; font-weight: bold; width: 8%;">CANT.</th>
                <th style="border: 1px solid #000; padding: 5px; text-align: center; font-weight: bold; width: 35%;">Descripción</th>
                <th style="border: 1px solid #000; padding: 5px; text-align: center; font-weight: bold; width: 12%;">Unidad de despacho</th>
                <th style="border: 1px solid #000; padding: 5px; text-align: center; font-weight: bold; width: 10%;">Marca</th>
                <th style="border: 1px solid #000; padding: 5px; text-align: center; font-weight: bold; width: 10%;">Código</th>
                <th style="border: 1px solid #000; padding: 5px; text-align: center; font-weight: bold; width: 12%;">Importe unitario (S/)</th>
                <th style="border: 1px solid #000; padding: 5px; text-align: center; font-weight: bold; width: 13%;">Importe Total</th>
              </tr>
            </thead>
            <tbody>
              ${data.products
                .map(
                  (product) => `
                <tr>
                  <td style="border: 1px solid #000; padding: 4px; text-align: center;">${product.quantity.toLocaleString()}</td>
                  <td style="border: 1px solid #000; padding: 6px; text-align: left; font-size: 8px; line-height: 1.6;">${product.description}</td>
                  <td style="border: 1px solid #000; padding: 4px; text-align: center;">${product.unit}</td>
                  <td style="border: 1px solid #000; padding: 4px; text-align: center;">${product.brand || ""}</td>
                  <td style="border: 1px solid #000; padding: 4px; text-align: center;">${product.code || ""}</td>
                  <td style="border: 1px solid #000; padding: 4px; text-align: right;">${formatCurrency(product.unitPrice)}</td>
                  <td style="border: 1px solid #000; padding: 4px; text-align: right; font-weight: bold;">${formatCurrency(product.totalPrice)}</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
        </div>
        `
            : `
        <!-- Mensaje de error si no hay productos -->
        <div style="margin-bottom: 15px; padding: 10px; background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 4px;">
          <p style="margin: 0; font-size: 10px; color: #856404; text-align: center;">
            ⚠️ No se encontraron productos para mostrar en esta cotización
          </p>
        </div>
        `
        }

        <!-- Totales -->
        <div style="margin-bottom: 15px;">
          <table style="width: 100%; font-size: 10px;">
            <tr>
              <td style="width: 70%;"></td>
              <td style="width: 15%; text-align: right; font-weight: bold; padding: 4px;">Sub Total:</td>
              <td style="width: 15%; text-align: right; border: 1px solid #000; padding: 5px; font-weight: bold;">${formatCurrency(data.subtotal)}</td>
            </tr>
            <tr>
              <td></td>
              <td style="text-align: right; font-weight: bold; padding: 2px;">I.G.V.:</td>
              <td style="text-align: right; border: 1px solid #000; padding: 5px; font-weight: bold;">${formatCurrency(data.igv)}</td>
            </tr>
            <tr>
              <td></td>
              <td style="text-align: right; font-weight: bold; padding: 2px; font-size: 12px;">TOTAL:</td>
              <td style="text-align: right; border: 2px solid #000; padding: 5px; font-weight: bold; font-size: 12px; background-color: #f0f0f0;">${formatCurrency(data.total)}</td>
            </tr>
          </table>
        </div>

        <!-- Monto en letras -->
        <div style="margin-bottom: 15px; border: 1px solid #000; padding: 5px;">
          <p style="margin-bottom: 8px; font-size: 10px; font-weight: bold; text-align: center;">
            SON: ${convertNumberToWords(data.total)} SOLES
          </p>
        </div>

        <!-- Condiciones de venta -->
        <div style="margin-bottom: 15px;">
          <h4 style="margin: 0 0 8px 0; font-size: 11px; font-weight: bold; text-decoration: underline;">CONDICIONES DE VENTA</h4>
          ${
            data.conditions && data.conditions.length > 0
              ? data.conditions
                  .map(
                    (condition, index) => `
            <p style="margin: 2px 0; font-size: 10px;"><strong>${index + 1}.</strong> ${condition}</p>
          `,
                  )
                  .join("")
              : `
            <p style="margin: 2px 0; font-size: 10px;"><strong>1.</strong> Plazo de entrega: 10 días hábiles.</p>
            <p style="margin: 2px 0; font-size: 10px;"><strong>2.</strong> Entrega en almacén central.</p>
            <p style="margin: 2px 0; font-size: 10px;"><strong>3.</strong> Forma de pago: Crédito 15 días.</p>
            <p style="margin: 2px 0; font-size: 10px;"><strong>4.</strong> Garantía por defectos de fábrica 24 meses.</p>
          `
          }
        </div>

        ${
          data.bankingInfo
            ? `
        <!-- Información Bancaria y Fiscal -->
        <div style="margin-bottom: 15px;">
          <h4 style="margin: 0 0 8px 0; font-size: 11px; font-weight: bold; text-decoration: underline;">INFORMACIÓN BANCARIA DE NUESTRA EMPRESA</h4>
          <p style="margin: 0 0 5px 0; font-size: 10px; font-weight: bold;">${data.companyName}</p>
          
          ${
            data.bankingInfo.bankAccount
              ? `
          <div style="margin-bottom: 10px; padding: 8px; background-color: #f8f9fa; border-left: 3px solid #007bff; border-radius: 3px;">
            <p style="margin: 0 0 3px 0; font-size: 10px; font-weight: bold; color: #007bff;">💳 DATOS BANCARIOS</p>
            <p style="margin: 0 0 2px 0; font-size: 9px;"><strong>${data.bankingInfo.bankAccount.type} ${data.bankingInfo.bankAccount.bank}:</strong></p>
            <p style="margin: 0 0 2px 0; font-size: 9px;"><strong>CTA:</strong> ${data.bankingInfo.bankAccount.accountNumber}</p>
            <p style="margin: 0; font-size: 9px;"><strong>CCI:</strong> ${data.bankingInfo.bankAccount.cci}</p>
            <img src="/otros/bcp-logo.png" alt="BCP Logo" style="height: 20px; object-fit: contain; margin-top: 10px" />
          </div>
          `
              : ""
          }
                    
        </div>
        `
            : data.companyAccountInfo
              ? `
        <!-- Cuenta habilitada (fallback) -->
        <div style="margin-bottom: 15px;">
          <h4 style="margin: 0 0 5px 0; font-size: 11px; font-weight: bold; text-decoration: underline;">CUENTA HABILITADA DE NUESTRA EMPRESA</h4>
          <p style="margin: 0; font-size: 10px; font-weight: bold;">${data.companyName}</p>
          <p style="margin: 2px 0; font-size: 10px;"><strong>CUENTA:</strong> ${data.companyAccountInfo}</p>
          <img src="/otros/bcp-logo.png" alt="BCP Logo" style="height: 20px; object-fit: contain; margin-top: 10px" />
        </div>
        `
              : ""
        }

        ${
          data.observations
            ? `
        <!-- Observaciones -->
        <div style="margin-bottom: 15px;">
          <h4 style="margin: 0 0 5px 0; font-size: 11px; font-weight: bold; text-decoration: underline;">OBSERVACIONES</h4>
          <p style="margin: 0; font-size: 10px;">${data.observations}</p>
        </div>
        `
            : ""
        }

        <!-- Footer -->
        <div style="border-top: 1px solid #000; padding-top: 10px; text-align: center; font-size: 9px; margin-top: 20px;">
          ${
            data.companyAddress || data.bankingInfo?.fiscalAddress
              ? `<p style="margin: 0 0 3px 0;">${data.companyAddress || data.bankingInfo?.fiscalAddress}</p>`
              : `<p style="margin: 0 0 3px 0;">Jr. Huantar Nro. 3311 Urb. Ca Huantar 5030 N 3311 Urb Parque El Naranjal 2da Etapa Los Olivos-Lima</p>`
          }
          ${data.companyEmail ? `<p style="margin: 0 0 3px 0;"><strong>E-MAIL:</strong> ${data.companyEmail}</p>` : ""}
          ${
            data.companyPhone
              ? `<p style="margin: 0;"><strong>Móvil:</strong> ${data.companyPhone} / <strong>Telf:</strong> ${data.companyPhone}</p>`
              : `<p style="margin: 0;"><strong>Móvil:</strong> 940955314 / <strong>Telf:</strong> (01)748 3677 anexo:102</p>`
          }
        </div>

        <!-- Información adicional del documento -->
        <div style="margin-top: 10px; text-align: center; font-size: 8px; color: #666;">
          <p style="margin: 0;">Cotización generada el ${new Date().toLocaleDateString("es-PE")} por ${data.createdBy}</p>
          <p style="margin: 0;">Estado: ${getStatusLabel(data.status)} | Válida hasta: ${data.validUntil ? formatDate(data.validUntil) : "No especificado"}</p>
        </div>
      </div>
    </div>
  `
}

// Función auxiliar para convertir números a palabras (simplificada)
const convertNumberToWords = (amount: number): string => {
  // Esta es una implementación simplificada
  // En producción, podrías usar una librería como 'numero-a-letras'
  const integerPart = Math.floor(amount)
  const decimalPart = Math.round((amount - integerPart) * 100)

  // Implementación básica para números comunes
  if (integerPart < 1000) {
    return `${integerPart.toString().toUpperCase()} CON ${decimalPart.toString().padStart(2, "0")}/100`
  }

  // Para números más grandes, usar una aproximación
  return `${integerPart.toLocaleString("es-PE").toUpperCase().replace(/,/g, " MIL ")} CON ${decimalPart.toString().padStart(2, "0")}/100`
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
