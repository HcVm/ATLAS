import jsPDF from "jspdf"
import html2canvas from "html2canvas"
import { getBankingInfoByCompanyCode, type BankingInfo } from "./company-banking-info"
import QRCode from "qrcode"
import { toast } from "sonner" // Import toast from sonner

export interface ARMEntityQuotationPDFData {
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
  clientAddress: string // Dirección de entrega
  clientFiscalAddress?: string // Nueva dirección fiscal
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

  // Creado por
  createdBy: string
}

export const generateARMEntityQuotationPDF = async (data: ARMEntityQuotationPDFData): Promise<void> => {
  console.log("🚀 Iniciando generación de PDF ARM Entidad con diseño optimizado...")

  // Obtener información bancaria automáticamente si tenemos el código de empresa
  if (data.companyCode && !data.bankingInfo) {
    const bankingInfo = getBankingInfoByCompanyCode(data.companyCode)
    if (bankingInfo) {
      data.bankingInfo = bankingInfo
    }
    console.log("✅ Banking info obtained for ARM company:", data.companyCode, data.bankingInfo)
  }

  // Generar validación usando API endpoint
  let validationHash = ""
  let qrCodeDataUrl = ""

  try {
    console.log("🔐 Creando validación a través de API...")

    const response = await fetch("/api/create-validation", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        quotationNumber: data.quotationNumber,
        clientRuc: data.clientRuc,
        clientName: data.clientName,
        companyRuc: data.companyRuc,
        companyName: data.companyName,
        totalAmount: data.total,
        quotationDate: data.quotationDate,
        createdBy: data.createdBy,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || `HTTP ${response.status}`)
    }

    const validationData = await response.json()
    validationHash = validationData.validationHash
    const validationUrl = validationData.validationUrl

    console.log("✅ Validación creada:", validationHash.substring(0, 16) + "...")

    qrCodeDataUrl = await QRCode.toDataURL(validationUrl, {
      width: 256,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    })

    console.log("✅ QR Code generado exitosamente")
  } catch (error) {
    console.error("❌ Error completo en generación de validación:", error)
    const errorMessage = error instanceof Error ? error.message : "Error desconocido"
    toast.error("Error crítico: No se pudo generar el sistema de validación.", {
      description: `Detalle: ${errorMessage}. El PDF no se generará sin validación.`,
    })
    throw new Error("No se puede generar PDF sin sistema de validación")
  }

  if (!qrCodeDataUrl) {
    console.error("❌ No se generó el código QR")
    toast.error("Error: No se pudo generar el código QR de validación.", {
      description: "El PDF no se creará sin validación.",
    })
    throw new Error("QR Code es requerido para la validación")
  }

  console.log("🎨 Creando contenido HTML del PDF ARM optimizado...")

  const htmlContent = createARMEntityQuotationHTML(data, qrCodeDataUrl)

  const tempDiv = document.createElement("div")
  tempDiv.innerHTML = htmlContent
  tempDiv.style.position = "absolute"
  tempDiv.style.left = "-9999px"
  tempDiv.style.top = "0"
  tempDiv.style.width = "210mm"
  tempDiv.style.backgroundColor = "white"
  tempDiv.style.fontFamily = "Arial, sans-serif"
  document.body.appendChild(tempDiv)

  try {
    console.log("⏳ Esperando renderizado del contenido...")
    await new Promise((resolve) => setTimeout(resolve, 2000))

    const contentHeight = tempDiv.scrollHeight
    const contentWidth = tempDiv.scrollWidth

    console.log("📏 Dimensiones del contenido:", { width: contentWidth, height: contentHeight })

    const canvas = await html2canvas(tempDiv, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      width: 794,
      height: contentHeight,
      scrollX: 0,
      scrollY: 0,
      logging: false,
    })

    const a4Width = 210
    const a4Height = 297

    const imgWidth = canvas.width
    const imgHeight = canvas.height
    const pdfHeight = (imgHeight * a4Width) / imgWidth

    console.log("📄 Creando PDF con dimensiones A4:", { width: a4Width, height: pdfHeight })

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: pdfHeight > a4Height ? [a4Width, pdfHeight] : "a4",
    })

    const imgData = canvas.toDataURL("image/png", 1.0)
    pdf.addImage(imgData, "PNG", 0, 0, a4Width, pdfHeight, undefined, "FAST")

    const fileName = `ARM_Cotizacion_Entidad_${data.quotationNumber}_${data.clientName.replace(/\s+/g, "_")}.pdf`
    pdf.save(fileName)

    console.log("✅ PDF ARM generado y descargado exitosamente:", fileName)

    toast.success("PDF ARM generado exitosamente con código QR de validación.", {
      description: `Archivo: ${fileName}\nHash de validación: ${validationHash.substring(0, 16)}...`,
      duration: 8000, // Show for a longer duration
    })
  } catch (error) {
    console.error("❌ Error en generación de PDF ARM:", error)
    toast.error("Error al generar el PDF ARM para entidad.", {
      description: `Por favor, intente nuevamente. Detalle: ${error instanceof Error ? error.message : "Error desconocido"}`,
    })
    throw error
  } finally {
    if (document.body.contains(tempDiv)) {
      document.body.removeChild(tempDiv)
    }
  }
}

const createARMEntityQuotationHTML = (data: ARMEntityQuotationPDFData, qrCodeDataUrl: string): string => {
  const formatCurrency = (amount: number) => {
    return `S/ ${amount.toLocaleString("es-PE", { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-PE", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const addressToDisplay = data.clientFiscalAddress || data.clientAddress || "Dirección no especificada";

  return `
  <div style="width: 210mm; min-height: 297mm; background: white; font-family: 'Inter', 'Segoe UI', sans-serif; color: #1a1a1a; position: relative; overflow: hidden; padding: 0; margin: 0;">

    <!-- Marca de agua ARM -->
    ${
      data.companyLogoUrl
        ? `
    <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); opacity: 0.03; z-index: 0; pointer-events: none;">
      <img src="${data.companyLogoUrl}" alt="ARM Watermark" style="width: 900px; height: 220px;" crossorigin="anonymous" />
    </div>
    `
        : ""
    }

    <!-- Contenido principal -->
    <div style="position: relative; z-index: 1; display: flex; min-height: 210mm;">

      <!-- Sidebar izquierdo más ancho -->
      <div style="width: 60mm; background: #fafafa; padding: 5mm; display: flex; flex-direction: column; justify-content: space-between; border-right: 1px solid #e5e5e5; height: 900px;">

        <!-- PARTE SUPERIOR: Cotización + Cliente -->
        <div>
          <!-- Título -->
          <div style="margin-bottom: 50px; text-align: center;">
            <h1 style="font-size: 20px; font-weight: 900; color: #1a1a1a; letter-spacing: 3px; font-family: 'Inter', 'Segoe UI', sans-serif;">COTIZACIÓN</h1>
          </div>

          <!-- Información del cliente -->
          <div>
            <h3 style="margin: 0 0 6px 0px; font-size: 11px; font-weight: 600; color: #1a1a1a; text-transform: uppercase; letter-spacing: 0.5px;">Cliente:</h3>
            <div>
              <h4 style="margin: 0 0 6px 0; font-size: 12px; font-weight: 700; color: #1a1a1a; line-height: 1.2;">${data.clientName}</h4>
              <p style="margin: 0 0 4px 0; font-size: 9px; color: #666; line-height: 1.3;">${addressToDisplay}</p>
              <p style="margin: 0 0 3px 0; font-size: 9px; color: #666;">RUC: ${data.clientRuc}</p>
              <p style="margin: 0 0 3px 0; font-size: 9px; color: #666;">Código: ${data.clientCode}</p>
              ${data.clientAttention ? `<p style="margin: 0; font-size: 9px; color: #666;">Atención: ${data.clientAttention}</p>` : ""}
            </div>
          </div>
        </div>

        <!-- PARTE INFERIOR: Logo + Info Empresa + Decoración -->
        <div>
          ${
            data.companyLogoUrl
              ? `
            <div style="margin-bottom: 20px; text-align: center;">
              <img src="${data.companyLogoUrl}" alt="ARM Logo" style="width: 200px; height: 100px; object-fit: contain;" crossorigin="anonymous" />
            </div>
            `
              : ""
          }

          <div style="margin-bottom: 10px; margin-top: 10px;">
            <h2 style="margin: 0 0 6px 0; font-size: 15px; font-weight: 700; color: #dc2626; line-height: 1.2;">${data.companyName}</h2>
            <p style="margin: 0 0 3px 0; font-size: 10px; color: #666; line-height: 1.4;">RUC: ${data.companyRuc}</p>
            ${data.bankingInfo ? `<p style="margin: 0 0 3px 0; font-size: 9px; color: #888; line-height: 1.3;">${data.bankingInfo.contactInfo?.email}</p>` : ""}
            ${data.bankingInfo ? `<p style="margin: 0 0 3px 0; font-size: 9px; color: #888;">Tel: ${data.bankingInfo.contactInfo?.mobile}</p>` : ""}
            ${data.bankingInfo ? `<p style="margin: 0; font-size: 9px; color: #888;">${data.bankingInfo.fiscalAddress}</p>` : ""}
          </div>

          <!-- Decoración minimalista -->
          <div style="display: flex; gap: 4px; margin-top: 1px;">
            <div style="width: 8px; height: 8px; background: #dc2626; border-radius: 50%;"></div>
            <div style="width: 8px; height: 8px; background: #f59e0b; border-radius: 50%;"></div>
            <div style="width: 8px; height: 8px; background: #1a1a1a; border-radius: 50%;"></div>
          </div>
        </div>

      </div>


      <!-- Contenido principal más ancho -->
      <div style="flex: 1; padding: 5mm 8mm 10mm 5mm;">

        <!-- Header con información de cotización -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 25px;">
          <div>
            <div style="color: #f59e0b; padding: 5px 5px; border-radius: 15px; font-size: 10px; font-weight: 600; margin-bottom: 6px; display: inline-block; text-transform: uppercase; letter-spacing: 0.5px;">

              Gubernamental
            </div>
          </div>
          
          <div style="text-align: right;">
            <h2 style="margin: 0 0 6px 0; font-size: 13px; font-weight: 400; color: #666;">Cotización No:</h2>
            <h1 style="margin: 0 0 12px 0; font-size: 24px; font-weight: 700; color: #1a1a1a;">${data.quotationNumber}</h1>
            
            <div style="margin-bottom: 6px;">
              <p style="margin: 0; font-size: 10px; color: #666; font-weight: 500;">Fecha de cotización:</p>
              <p style="margin: 0; font-size: 11px; color: #1a1a1a; font-weight: 600;">${formatDate(data.quotationDate)}</p>
            </div>
            
            ${
              data.validUntil
                ? `
            <div>
              <p style="margin: 0; font-size: 10px; color: #666; font-weight: 500;">Válida hasta:</p>
              <p style="margin: 0; font-size: 11px; color: #dc2626; font-weight: 600;">${formatDate(data.validUntil)}</p>
            </div>
            `
                : ""
            }
          </div>
        </div>

        <!-- Decoración minimalista -->
        <div style="display: flex; gap: 4px; margin-bottom: 20px; justify-content: flex-end;">
          <div style="width: 8px; height: 8px; background: #dc2626; border-radius: 50%;"></div>
          <div style="width: 8px; height: 8px; background: #f59e0b; border-radius: 50%;"></div>
          <div style="width: 8px; height: 8px; background: #1a1a1a; border-radius: 50%;"></div>
        </div>

        <!-- Tabla de productos optimizada -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
          <thead>
            <tr style="border-bottom: 2px solid #1a1a1a;">
              <th style="padding: 12px 0; text-align: left; font-size: 10px; font-weight: 600; color: #1a1a1a; text-transform: uppercase; letter-spacing: 0.5px; width: 40px;">No</th>
              <th style="padding: 12px 0; text-align: left; font-size: 10px; font-weight: 600; color: #1a1a1a; text-transform: uppercase; letter-spacing: 0.5px;">Descripción</th>
              <th style="padding: 12px 0; text-align: right; font-size: 10px; font-weight: 600; color: #1a1a1a; text-transform: uppercase; letter-spacing: 0.5px; width: 90px;">Importe</th>
            </tr>
          </thead>
          <tbody>
            ${
              data.products && data.products.length > 0
                ? data.products
                    .map(
                      (product, index) => `
            <tr style="border-bottom: 1px solid #f0f0f0;">
              <td style="padding: 15px 0; vertical-align: top;">
                <div style="font-size: 12px; font-weight: 600; color: #1a1a1a;">${index + 1}</div>
              </td>
              <td style="padding: 15px 0; vertical-align: top; padding-right: 20px;">
                <div style="margin-bottom: 6px;">
                  <h4 style="margin: 0; font-size: 11px; font-weight: 600; color: #1a1a1a; line-height: 1.3;">${product.description}</h4>
                </div>
                <div style="display: flex; gap: 10px; margin-bottom: 5px; flex-wrap: wrap;">
                  <span style="font-size: 10px; color: #666; background: #f8f9fa; padding: 2px 5px; border-radius: 3px;">Cant: ${product.quantity}</span>
                  <span style="font-size: 10px; color: #666; background: #f8f9fa; padding: 2px 5px; border-radius: 3px;">Unidad: ${product.unit}</span>
                  ${product.brand ? `<span style="font-size: 10px; color: #666; background: #f8f9fa; padding: 2px 5px; border-radius: 3px;">${product.brand}</span>` : ""}
                </div>
                ${product.code ? `<div style="font-size: 9px; color: #999; font-family: monospace; margin-bottom: 3px;">${product.code}</div>` : ""}
                <div style="font-size: 10px; color: #666; margin-top: 3px;">P. Unit: ${formatCurrency(product.unitPrice)}</div>
              </td>
              <td style="padding: 15px 0; text-align: right; vertical-align: top;">
                <div style="font-size: 16px; font-weight: 700; color: #1a1a1a;">${formatCurrency(product.totalPrice)}</div>
              </td>
            </tr>
          `,
                    )
                    .join("")
                : `
            <tr>
              <td colspan="3" style="padding: 30px 0; text-align: center; color: #999;">No se encontraron productos</td>
            </tr>
          `
            }
          </tbody>
        </table>

        <!-- Totales y QR en grid -->
        <div style="display: grid; grid-template-columns: 1fr 200px; gap: 25px; margin-bottom: 25px;">
          
          <!-- Totales -->
          <div>
            <div style="display: flex; justify-content: flex-end;">
              <div style="width: 100%;">
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f0f0f0;">
                  <span style="font-size: 12px; color: #666; font-weight: 500;">Subtotal</span>
                  <span style="font-size: 14px; font-weight: 600; color: #1a1a1a;">${formatCurrency(data.subtotal)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f0f0f0;">
                  <span style="font-size: 12px; color: #666; font-weight: 500;">IGV (18%)</span>
                  <span style="font-size: 14px; font-weight: 600; color: #1a1a1a;">${formatCurrency(data.igv)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px 0; border-bottom: 2px solid #1a1a1a;">
                  <span style="font-size: 15px; color: #1a1a1a; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Total</span>
                  <span style="font-size: 22px; font-weight: 800; color: #dc2626;">${formatCurrency(data.total)}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- QR Code -->
          <div style="display: flex; justify-content: center; align-items: flex-start;">
            <div style="text-align: center;">
              <div style="background: #fafafa; padding: 10px; border-radius: 6px; border: 1px solid #e5e5e5; margin-bottom: 8px;">
                <img src="${qrCodeDataUrl}" alt="QR Validación" style="width: 100px; height: 100px;" />
              </div>
              <p style="margin: 0; font-size: 9px; color: #999; font-weight: 500;">Verificación digital</p>
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- Footer oscuro optimizado -->
    <div style="background: #1a1a1a; color: white; padding: 7mm 6mm; margin-top: 4px;">
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 30px; margin-bottom: 4px;">
        
        <!-- Información bancaria -->
        ${
          data.bankingInfo?.bankAccount || data.companyAccountInfo
            ? `
        <div>
          <h3 style="margin: 0 0 12px 0; font-size: 11px; font-weight: 600; color: white; text-transform: uppercase; letter-spacing: 0.5px;">Detalles de Pago:</h3>
          ${
            data.bankingInfo?.bankAccount
              ? `
          <div style="margin-bottom: 8px;">
            <p style="margin: 0; font-size: 9px; color: #ccc;">Banco:</p>
            <p style="margin: 0; font-size: 11px; color: white; font-weight: 600;">${data.bankingInfo.bankAccount.bank}</p>
          </div>
          <div style="margin-bottom: 8px;">
            <p style="margin: 0; font-size: 9px; color: #ccc;">Cuenta:</p>
            <p style="margin: 0; font-size: 10px; color: white; font-weight: 600; font-family: monospace;">${data.bankingInfo.bankAccount.accountNumber}</p>
          </div>
          <div>
            <p style="margin: 0; font-size: 9px; color: #ccc;">CCI:</p>
            <p style="margin: 0; font-size: 10px; color: white; font-weight: 600; font-family: monospace;">${data.bankingInfo.bankAccount.cci}</p>
          </div>
          `
              : data.companyAccountInfo
                ? `
          <p style="margin: 0; font-size: 11px; color: white; font-weight: 600; font-family: monospace;">${data.companyAccountInfo}</p>
          `
                : ""
          }
        </div>
        `
            : ""
        }

        <!-- Condiciones -->
        ${
          data.conditions && data.conditions.length > 0
            ? `
        <div>
          <h3 style="margin: 0 0 12px 0; font-size: 11px; font-weight: 600; color: white; text-transform: uppercase; letter-spacing: 0.5px;">Condiciones:</h3>
          ${data.conditions
            .slice(0, 4)
            .map(
              (condition) => `
          <p style="margin: 0 0 5px 0; font-size: 9px; color: #ccc; line-height: 1.4;">• ${condition}</p>
          `,
            )
            .join("")}
          ${data.conditions.length > 4 ? `<p style="margin: 0; font-size: 8px; color: #999;">Y ${data.conditions.length - 4} condiciones más...</p>` : ""}
        </div>
        `
            : ""
        }

        <!-- Logo y firma -->
        <div style="text-align: right;">
          ${
            data.companyLogoUrl
              ? `
          <div style="margin-bottom: 12px;">
            <img src="${data.companyLogoUrl}" alt="ARM Logo" style="width: 150px; height: 70px; object-fit: contain; opacity: 0.8;" crossorigin="anonymous" />
          </div>
          `
              : ""
          }
          <div style="margin-bottom: 12px;">
            <p style="margin: 0; font-size: 12px; color: white; font-weight: 600;">${data.createdBy}</p>
            <p style="margin: 0; font-size: 10px; color: #ccc;">ARM Corporations</p>
          </div>
        </div>
      </div>

      <!-- Footer info -->
      <div style="border-top: 1px solid #333; padding-top: 12px; margin-top: 12px; display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; gap: 4px;">
          <div style="width: 6px; height: 6px; background: #dc2626; border-radius: 50%;"></div>
          <div style="width: 6px; height: 6px; background: #f59e0b; border-radius: 50%;"></div>
          <div style="width: 6px; height: 6px; background: white; border-radius: 50%;"></div>
        </div>
        <div style="text-align: right;">
          <p style="margin: 0; font-size: 9px; color: #999;">Generado el ${new Date().toLocaleDateString("es-PE")} - Estado: ${getStatusLabel(data.status)}</p>
        </div>
      </div>
    </div>
  </div>
`
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
