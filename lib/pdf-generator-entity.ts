import jsPDF from "jspdf"
import html2canvas from "html2canvas"
import { getBankingInfoByCompanyCode, type BankingInfo } from "./company-banking-info"

interface Product {
  id: string
  name: string
  description?: string
  price: number
  quantity: number
  unit: string
  image_url?: string
}

interface QuotationData {
  quotationNumber: string
  clientName: string
  clientRuc: string
  clientAddress: string
  clientPhone?: string
  clientEmail?: string
  date: string
  validUntil: string
  products: Product[]
  subtotal: number
  igv: number
  total: number
  notes?: string
  companyName: string
  companyRuc: string
  companyAddress: string
  companyPhone?: string
  companyEmail?: string
  companyLogo?: string
  routeInfo?: {
    distance?: string
    duration?: string
    route?: string
  }
}

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

const createEntityQuotationHTML = (data: EntityQuotationPDFData, qrCodeDataUrl?: string): string => {
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

  return `
    <div style="padding: 15px; max-width: 210mm; margin: 0 auto; background: white; font-family: Arial, sans-serif; font-size: 11px; line-height: 1.3; position: relative; min-height: auto;">
      
      <!-- Marca de agua del logo -->
      ${
        data.companyLogoUrl
          ? `
      <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); opacity: 0.1; z-index: 0; pointer-events: none;">
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
        <div style="text-align: center; margin-bottom: 2px; align-items: center; padding-bottom: 2px; display: flex; justify-content: center;">
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
          <h3 style="margin: 0 0 8px 0; font-size: 12px; font-weight: bold; border-top: 1px solid #000;">DATOS DEL CLIENTE</h3>
          <table style="width: 100%; font-size: 10px; border-collapse: collapse;">
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
              <td colspan="3" style="padding: 2px 0; word-wrap: break-word;">${data.clientAddress}</td>
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
        <div style="margin-bottom: 15px; font-size: 9px; text-align: justify; border-top: 1px solid #000;">
          <p style="margin: 0; line-height: 1.3;">
            <strong>${data.companyName}</strong>, identificado con RUC ${data.companyRuc}, 
            tenemos el agrado de dirigirnos a ustedes para saludarlos cordialmentes y enviarles nuestra propuesta económica, para su adquisición de:
          </p>
        </div>

        <!-- Tabla de productos - SIEMPRE MOSTRAR -->
        ${
          data.products && data.products.length > 0
            ? `
        <div style="margin-bottom: 15px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 9px; table-layout: fixed;">
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
                  <td style="border: 1px solid #000; padding: 4px; text-align: center; word-wrap: break-word;">${product.quantity.toLocaleString()}</td>
                  <td style="border: 1px solid #000; padding: 6px; text-align: left; font-size: 8px; line-height: 1.6; word-wrap: break-word; overflow-wrap: break-word;">${product.description}</td>
                  <td style="border: 1px solid #000; padding: 4px; text-align: center; word-wrap: break-word;">${product.unit}</td>
                  <td style="border: 1px solid #000; padding: 4px; text-align: center; word-wrap: break-word;">${product.brand || ""}</td>
                  <td style="border: 1px solid #000; padding: 4px; text-align: center; word-wrap: break-word;">${product.code || ""}</td>
                  <td style="border: 1px solid #000; padding: 4px; text-align: right; word-wrap: break-word;">${formatCurrency(product.unitPrice)}</td>
                  <td style="border: 1px solid #000; padding: 4px; text-align: right; font-weight: bold; word-wrap: break-word;">${formatCurrency(product.totalPrice)}</td>
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
              <td style="width: 15%; text-align: right; border: 1px solid #000; padding: 6px; font-weight: bold;">${formatCurrency(data.subtotal)}</td>
            </tr>
            <tr>
              <td></td>
              <td style="text-align: right; font-weight: bold; padding: 2px;">I.G.V.:</td>
              <td style="text-align: right; border: 1px solid #000; padding: 6px; font-weight: bold;">${formatCurrency(data.igv)}</td>
            </tr>
            <tr>
              <td></td>
              <td style="text-align: right; font-weight: bold; padding: 2px; font-size: 12px;">TOTAL:</td>
              <td style="text-align: right; border: 2px solid #000; padding: 6px; font-weight: bold; font-size: 12px; background-color: #f0f0f0;">${formatCurrency(data.total)}</td>
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
            <p style="margin: 2px 0; font-size: 10px; line-height: 1.4;"><strong>${index + 1}.</strong> ${condition}</p>
          `,
                  )
                  .join("")
              : `
            <p style="margin: 2px 0; font-size: 10px; line-height: 1.4;"><strong>1.</strong> Plazo de entrega: 10 días hábiles.</p>
            <p style="margin: 2px 0; font-size: 10px; line-height: 1.4;"><strong>2.</strong> Entrega en almacén central.</p>
            <p style="margin: 2px 0; font-size: 10px; line-height: 1.4;"><strong>3.</strong> Forma de pago: Crédito 15 días.</p>
            <p style="margin: 2px 0; font-size: 10px; line-height: 1.4;"><strong>4.</strong> Garantía por defectos de fábrica 24 meses.</p>
          `
          }
        </div>

        ${
          data.bankingInfo
            ? `
        <!-- Información Bancaria y Fiscal -->
        <div style="margin-bottom: 15px;">
          <h4 style="margin: 0 0 5px 0; font-size: 11px; font-weight: bold; border-top: 1px solid #000;">INFORMACIÓN BANCARIA DE NUESTRA EMPRESA</h4>
          <p style="margin: 0 0 5px 0; font-size: 10px; font-weight: bold;">${data.companyName}</p>
          
          ${
            data.bankingInfo.bankAccount
              ? `
          <div style="margin-bottom: 10px; padding: 8px; border-radius: 3px;">
            <p style="margin: 0 0 3px 0; font-size: 10px; font-weight: bold; color: #007bff;">💳 DATOS BANCARIOS</p>
            <p style="margin: 0 0 2px 0; font-size: 9px;"><strong>${data.bankingInfo.bankAccount.type} ${data.bankingInfo.bankAccount.bank}:</strong></p>
            <p style="margin: 0 0 2px 0; font-size: 9px;"><strong>CTA:</strong> ${data.bankingInfo.bankAccount.accountNumber}</p>
            <p style="margin: 0; font-size: 9px;"><strong>CCI:</strong> ${data.bankingInfo.bankAccount.cci}</p>
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
          <div style="margin-top: 8px; display: inline-flex; background-color: #0066cc; color: white; padding: 4px 8px; border-radius: 3px; font-size: 9px; font-weight: bold; align-items: center;justify-content: center; line-height: 16px;">
            BCP
          </div>
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
          <p style="margin: 0; font-size: 10px; line-height: 1.4; word-wrap: break-word;">${data.observations}</p>
        </div>
        `
            : ""
        }

        <!-- Código QR de Validación -->
        ${
          qrCodeDataUrl
            ? `
        <div style="margin: 15px 0; text-align: center; border: 1px solid #ddd; padding: 10px; background-color: #f9f9f9; border-radius: 5px;">
          <h4 style="margin: 0 0 8px 0; font-size: 10px; font-weight: bold; color: #333;">🔒 CÓDIGO DE VALIDACIÓN</h4>
          <img src="${qrCodeDataUrl}" alt="QR Validación" style="width: 80px; height: 80px; margin: 5px 0; border: 1px solid #ccc;" />
          <p style="margin: 5px 0 0 0; font-size: 8px; color: #666; line-height: 1.2;">
            Escanee este código QR para validar<br/>la autenticidad de esta cotización
          </p>
        </div>
        `
            : ""
        }

        <!-- Footer -->
        <div style="border-top: 1px solid #000; padding-top: 10px; text-align: center; font-size: 9px; margin-top: 20px;">
          ${
            data.companyAddress || data.bankingInfo?.fiscalAddress
              ? `<p style="margin: 0 0 3px 0; word-wrap: break-word;">${data.companyAddress || data.bankingInfo?.fiscalAddress}</p>`
              : `<p style="margin: 0 0 3px 0;">Jr. Huantar Nro. 3311 Urb. Ca Huantar 5030 N 3311 Urb Parque El Naranjal 2da Etapa Los Olivos-Lima</p>`
          }
          ${
            data.bankingInfo?.contactInfo?.email && data.bankingInfo.contactInfo.email.length > 0
              ? `<p style="margin: 0 0 3px 0; word-wrap: break-word;"><strong>E-MAIL:</strong> ${data.bankingInfo.contactInfo.email.join(" / ")}</p>`
              : data.companyEmail
                ? `<p style="margin: 0 0 3px 0; word-wrap: break-word;"><strong>E-MAIL:</strong> ${data.companyEmail}</p>`
                : ""
          }
          ${
            data.bankingInfo?.contactInfo?.mobile || data.bankingInfo?.contactInfo?.phone
              ? `<p style="margin: 0; word-wrap: break-word;">
                  ${data.bankingInfo.contactInfo.mobile ? `<strong>Móvil:</strong> ${data.bankingInfo.contactInfo.mobile}` : ""}
                  ${data.bankingInfo.contactInfo.mobile && data.bankingInfo.contactInfo.phone ? " / " : ""}
                  ${data.bankingInfo.contactInfo.phone ? `<strong>Telf:</strong> ${data.bankingInfo.contactInfo.phone}` : ""}
                </p>`
              : data.companyPhone
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

export const generateEntityQuotationPDF = async (data: EntityQuotationPDFData): Promise<void> => {
  // Obtener información bancaria automáticamente si tenemos el código de empresa
  if (data.companyCode && !data.bankingInfo) {
    data.bankingInfo = getBankingInfoByCompanyCode(data.companyCode)
    console.log("Banking info obtained for company:", data.companyCode, data.bankingInfo)
  }

  // Generar código QR para validación
  let qrCodeDataUrl = ""
  try {
    // Crear URL de validación con parámetros separados (más simple y confiable)
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://agpcdocs.vercel.app"
    const validationUrl = `${baseUrl}/validate-quotation?q=${encodeURIComponent(data.quotationNumber)}&c=${encodeURIComponent(data.clientRuc)}&cnm=${encodeURIComponent(data.clientName)}&t=${encodeURIComponent(data.total.toString())}&d=${encodeURIComponent(data.quotationDate)}&cr=${encodeURIComponent(data.companyRuc)}&cn=${encodeURIComponent(data.companyName)}`

    // Generar QR como data URL
    const QRCode = await import("qrcode")
    qrCodeDataUrl = await QRCode.toDataURL(validationUrl, {
      width: 120,
      margin: 1,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    })

    console.log("QR Code generated for quotation validation:", validationUrl)
  } catch (error) {
    console.error("Error generating validation QR:", error)
    // Continuar sin QR si hay error
  }

  // Crear el HTML temporal para el PDF
  const htmlContent = createEntityQuotationHTML(data, qrCodeDataUrl)

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
    // Esperar un poco para que las imágenes se carguen y el contenido se renderice
    await new Promise((resolve) => setTimeout(resolve, 3000))

    // Obtener las dimensiones reales del contenido
    const contentHeight = tempDiv.scrollHeight
    const contentWidth = tempDiv.scrollWidth

    console.log("Content dimensions:", { width: contentWidth, height: contentHeight })

    // Convertir HTML a canvas con dimensiones dinámicas
    const canvas = await html2canvas(tempDiv, {
      scale: 2, // Alta calidad
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      width: Math.max(794, contentWidth), // Mínimo A4 width, pero puede ser más ancho
      height: contentHeight, // Altura dinámica basada en el contenido
      scrollX: 0,
      scrollY: 0,
    })

    const imgWidth = canvas.width
    const imgHeight = canvas.height

    const pdfWidth = Math.max(210, (imgWidth * 210) / 794) // Mínimo A4, pero puede ser más ancho
    const pdfHeight = Math.max(297, (imgHeight * 297) / 1123) // Mínimo A4, pero puede ser más alto

    // Crear PDF con dimensiones personalizadas
    const pdf = new jsPDF({
      orientation: pdfWidth > pdfHeight ? "landscape" : "portrait",
      unit: "mm",
      format: [pdfWidth, pdfHeight],
    })

    // Convertir canvas a imagen
    const imgData = canvas.toDataURL("image/png", 1.0) // Máxima calidad

    // Agregar la imagen completa al PDF sin cortes
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight, undefined, "FAST")

    // Descargar el PDF
    pdf.save(`Cotizacion_Entidad_${data.quotationNumber}_${data.clientName.replace(/\s+/g, "_")}.pdf`)
  } finally {
    // Limpiar el elemento temporal
    document.body.removeChild(tempDiv)
  }
}
