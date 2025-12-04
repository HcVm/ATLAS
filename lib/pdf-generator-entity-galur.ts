import jsPDF from "jspdf"
import html2canvas from "html2canvas"
import { getBankingInfoByCompanyCode, type BankingInfo } from "./company-banking-info"
import QRCode from "qrcode"
import { toast } from "sonner"

export interface GALUREntityQuotationPDFData {
  companyName: string
  companyRuc: string
  companyCode?: string
  companyAddress?: string
  companyPhone?: string
  companyEmail?: string
  companyLogoUrl?: string
  companyAccountInfo?: string
  bankingInfo?: BankingInfo

  quotationNumber: string
  quotationDate: string
  validUntil?: string
  status: string

  clientCode: string
  clientName: string
  clientRuc: string
  clientAddress: string
  clientFiscalAddress?: string
  clientDepartment?: string
  clientAttention?: string
  currency: string

  products: Array<{
    quantity: number
    description: string
    unit: string
    brand?: string
    code?: string
    unitPrice: number
    totalPrice: number
  }>

  subtotal: number
  igv: number
  total: number

  conditions?: string[]
  createdBy: string
}

export const generateGALUREntityQuotationPDF = async (data: GALUREntityQuotationPDFData): Promise<void> => {
  console.log("🚀 Iniciando generación de PDF GALUR Entidad...")

  if (data.companyCode && !data.bankingInfo) {
    const bankingInfo = getBankingInfoByCompanyCode(data.companyCode)
    if (bankingInfo) {
      data.bankingInfo = bankingInfo
    }
    console.log("✅ Banking info obtained for GALUR:", data.companyCode)
  }

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
    console.error("❌ Error en generación de validación:", error)
    const errorMessage = error instanceof Error ? error.message : "Error desconocido"
    toast.error("Error al generar validación", {
      description: `${errorMessage}. El PDF no se generará sin validación.`,
    })
    throw error
  }

  console.log("🎨 Creando contenido HTML del PDF GALUR...")

  const htmlContent = createGALUREntityQuotationHTML(data, qrCodeDataUrl)

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

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: pdfHeight > a4Height ? [a4Width, pdfHeight] : "a4",
    })

    const imgData = canvas.toDataURL("image/png", 1.0)
    pdf.addImage(imgData, "PNG", 0, 0, a4Width, pdfHeight, undefined, "FAST")

    const fileName = `GALUR_Cotizacion_Entidad_${data.quotationNumber}_${data.clientName.replace(/\s+/g, "_")}.pdf`
    pdf.save(fileName)

    console.log("✅ PDF GALUR generado exitosamente:", fileName)
    toast.success("PDF GALUR generado exitosamente", {
      description: `Archivo: ${fileName}`,
      duration: 5000,
    })
  } catch (error) {
    console.error("❌ Error en generación de PDF GALUR:", error)
    toast.error("Error al generar el PDF GALUR", {
      description: error instanceof Error ? error.message : "Error desconocido",
    })
    throw error
  } finally {
    if (document.body.contains(tempDiv)) {
      document.body.removeChild(tempDiv)
    }
  }
}

const createGALUREntityQuotationHTML = (data: GALUREntityQuotationPDFData, qrCodeDataUrl: string): string => {
  const formatCurrency = (amount: number) => {
    return `S/ ${amount.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`
  }

  const formatCurrencyUnit = (amount: number) => {
    return `S/ ${amount.toLocaleString("es-PE", { minimumFractionDigits: 4 })}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-PE", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const addressToDisplay = data.clientFiscalAddress || data.clientAddress || "Dirección no especificada"

  return `
  <div style="width: 210mm; min-height: 297mm; background: white; font-family: 'Segoe UI', sans-serif; color: #2d3748; position: relative; overflow: hidden; padding: 0; margin: 0;">

    <!-- Watermark with brand color -->
    ${
      data.companyLogoUrl
        ? `
    <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); opacity: 0.02; z-index: 0; pointer-events: none;">
      <img src="${data.companyLogoUrl}" alt="GALUR" style="width: 1000px; height: 300px;" crossorigin="anonymous" />
    </div>
    `
        : ""
    }

    <div style="position: relative; z-index: 1;">
      
      <!-- Top Banner with Blue Theme - GALUR Signature -->
      <div style="background: linear-gradient(135deg, #003d82 0%, #0052a3 100%); color: white; padding: 15mm 15mm 12mm 15mm; position: relative; overflow: hidden;">
        
        <!-- Geometric accent shapes -->
        <div style="position: absolute; top: -20px; right: -30px; width: 150px; height: 150px; background: rgba(255,255,255,0.05); border-radius: 50%; pointer-events: none;"></div>
        <div style="position: absolute; bottom: -40px; left: 20px; width: 120px; height: 120px; background: rgba(255,255,255,0.03); border-radius: 50%; pointer-events: none;"></div>

        <div style="position: relative; z-index: 2;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12mm;">
            
            <!-- Left side: Logo and company name -->
            <div style="flex: 1;">
              ${
                data.companyLogoUrl
                  ? `<img src="${data.companyLogoUrl}" alt="GALUR" style="height: 40px; margin-bottom: 8px;" crossorigin="anonymous" />`
                  : `<h1 style="margin: 0; font-size: 28px; font-weight: 800; letter-spacing: 2px;">${data.companyName}</h1>`
              }
              <p style="margin: 4px 0 0 0; font-size: 11px; opacity: 0.9; letter-spacing: 0.5px;">COTIZACIÓN DE SERVICIOS Y PRODUCTOS</p>
            </div>

            <!-- Right side: Document info -->
            <div style="text-align: right;">
              <p style="margin: 0 0 2px 0; font-size: 10px; opacity: 0.85;">Documento No.</p>
              <h2 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 800; letter-spacing: 1px;">${data.quotationNumber}</h2>
              <div style="font-size: 9px; opacity: 0.85; line-height: 1.5;">
                <div>${formatDate(data.quotationDate)}</div>
                ${data.validUntil ? `<div style="margin-top: 2px; color: #fbbf24;">Válida hasta: ${formatDate(data.validUntil)}</div>` : ""}
              </div>
            </div>
          </div>

          <!-- Colored line accent -->
          <div style="width: 100%; height: 2px; background: linear-gradient(90deg, #fbbf24, #003d82, transparent); margin-bottom: 12mm;"></div>

          <!-- Client section in banner -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15mm;">
            <div>
              <p style="margin: 0 0 3px 0; font-size: 9px; opacity: 0.8; text-transform: uppercase; letter-spacing: 0.5px;">Cliente</p>
              <h3 style="margin: 0 0 4px 0; font-size: 13px; font-weight: 700;">${data.clientName}</h3>
              <p style="margin: 0 0 2px 0; font-size: 9px; opacity: 0.9;">RUC: <strong>${data.clientRuc}</strong></p>
              <p style="margin: 0; font-size: 8px; opacity: 0.8; line-height: 1.3;">${addressToDisplay}</p>
            </div>
            <div style="text-align: right;">
              <p style="margin: 0 0 3px 0; font-size: 9px; opacity: 0.8; text-transform: uppercase; letter-spacing: 0.5px;">Proveedor</p>
              <h3 style="margin: 0 0 4px 0; font-size: 13px; font-weight: 700;">${data.companyName}</h3>
              <p style="margin: 0 0 2px 0; font-size: 9px; opacity: 0.9;">RUC: <strong>${data.companyRuc}</strong></p>
              <p style="margin: 0; font-size: 8px; opacity: 0.8;">${data.bankingInfo?.fiscalAddress || "Domicilio fiscal no disponible"}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Content Area -->
      <div style="padding: 15mm;">

        <!-- Products Table -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 15mm;">
          <thead>
            <tr style="border-bottom: 3px solid #003d82; background: #f8fafc;">
              <th style="padding: 10px; text-align: left; font-size: 10px; font-weight: 700; color: #003d82; text-transform: uppercase; letter-spacing: 0.5px;">Item</th>
              <th style="padding: 10px; text-align: left; font-size: 10px; font-weight: 700; color: #003d82; text-transform: uppercase; letter-spacing: 0.5px;">Descripción</th>
              <th style="padding: 10px; text-align: center; font-size: 10px; font-weight: 700; color: #003d82; text-transform: uppercase; letter-spacing: 0.5px;">Cantidad</th>
              <th style="padding: 10px; text-align: center; font-size: 10px; font-weight: 700; color: #003d82; text-transform: uppercase; letter-spacing: 0.5px;">Precio Unit.</th>
              <th style="padding: 10px; text-align: right; font-size: 10px; font-weight: 700; color: #003d82; text-transform: uppercase; letter-spacing: 0.5px;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${
              data.products && data.products.length > 0
                ? data.products
                    .map(
                      (product, index) => `
              <tr style="border-bottom: 1px solid #e2e8f0; background: ${index % 2 === 0 ? "#ffffff" : "#f8fafc"};">
                <td style="padding: 10px; font-size: 9px; font-weight: 600; color: #003d82;">${index + 1}</td>
                <td style="padding: 10px;">
                  <div style="font-size: 10px; font-weight: 600; color: #2d3748; margin-bottom: 2px;">${product.description}</div>
                  <div style="font-size: 8px; color: #718096;">
                    ${product.code ? `Código: ${product.code}` : ""}
                    ${product.brand ? `${product.code ? " • " : ""}Marca: ${product.brand}` : ""}
                    ${product.unit ? `${product.code || product.brand ? " • " : ""}Unidad: ${product.unit}` : ""}
                  </div>
                </td>
                <td style="padding: 10px; text-align: center; font-size: 10px; font-weight: 600; color: #2d3748;">${product.quantity}</td>
                <td style="padding: 10px; text-align: center; font-size: 10px; color: #718096;">${formatCurrencyUnit(product.unitPrice)}</td>
                <td style="padding: 10px; text-align: right; font-size: 11px; font-weight: 700; color: #003d82;">${formatCurrency(product.totalPrice)}</td>
              </tr>
            `,
                    )
                    .join("")
                : `
            <tr>
              <td colspan="5" style="padding: 20px; text-align: center; color: #a0aec0; font-size: 10px;">Sin productos</td>
            </tr>
          `
            }
          </tbody>
        </table>

        <!-- Totals and Banking Info Section -->
        <div style="display: grid; grid-template-columns: 1fr 180px; gap: 20mm; margin-bottom: 15mm;">
          
          <!-- Left: Conditions and Banking Info -->
          <div style="font-size: 9px; color: #4a5568; line-height: 1.6;">
            ${
              data.conditions && data.conditions.length > 0
                ? `
              <div style="margin-bottom: 12px; padding: 10px; background: #f7fafc; border-left: 3px solid #fbbf24; border-radius: 2px;">
                <p style="margin: 0 0 6px 0; font-size: 10px; font-weight: 700; color: #003d82; text-transform: uppercase;">Condiciones Comerciales</p>
                <ul style="margin: 0; padding-left: 16px; color: #4a5568;">
                  ${data.conditions
                    .slice(0, 5)
                    .map((c) => `<li style="margin-bottom: 3px;">${c}</li>`)
                    .join("")}
                  ${data.conditions.length > 5 ? `<li style="margin-top: 6px; font-style: italic; color: #a0aec0;">... y ${data.conditions.length - 5} condiciones más</li>` : ""}
                </ul>
              </div>
            `
                : ""
            }

            ${
              data.bankingInfo
                ? `
              <div style="padding: 10px; background: #eef5ff; border-left: 3px solid #003d82; border-radius: 2px;">
                <p style="margin: 0 0 6px 0; font-size: 10px; font-weight: 700; color: #003d82; text-transform: uppercase;">Información de Pago</p>
                ${
                  data.bankingInfo.bankAccount
                    ? `
                  <div style="margin-bottom: 6px;">
                    <p style="margin: 0 0 2px 0; font-size: 9px; font-weight: 600;">Banco ${data.bankingInfo.bankAccount.type}</p>
                    <p style="margin: 0; font-family: 'Courier New', monospace; font-size: 8px; word-break: break-all;">${data.bankingInfo.bankAccount.bank} - ${data.bankingInfo.bankAccount.accountNumber}</p>
                    <p style="margin: 2px 0 0 0; font-family: 'Courier New', monospace; font-size: 8px; color: #718096;">CCI: ${data.bankingInfo.bankAccount.cci}</p>
                  </div>
                `
                    : ""
                }
                ${
                  data.bankingInfo.detractionAccount
                    ? `
                  <div>
                    <p style="margin: 0 0 2px 0; font-size: 9px; font-weight: 600;">Detracción</p>
                    <p style="margin: 0; font-family: 'Courier New', monospace; font-size: 8px;">${data.bankingInfo.detractionAccount.accountNumber}</p>
                  </div>
                `
                    : ""
                }
              </div>
            `
                : ""
            }
          </div>

          <!-- Right: Totals and QR -->
          <div>
            <!-- Totals Box -->
            <div style="background: #f8fafc; border: 2px solid #003d82; border-radius: 4px; padding: 12px; margin-bottom: 12px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid #cbd5e0;">
                <span style="font-size: 10px; color: #4a5568; font-weight: 500;">Subtotal</span>
                <span style="font-size: 11px; font-weight: 600; color: #2d3748;">${formatCurrency(data.subtotal)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid #cbd5e0;">
                <span style="font-size: 10px; color: #4a5568; font-weight: 500;">IGV (18%)</span>
                <span style="font-size: 11px; font-weight: 600; color: #2d3748;">${formatCurrency(data.igv)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 11px; font-weight: 700; color: #003d82; text-transform: uppercase;">Total</span>
                <span style="font-size: 18px; font-weight: 900; color: #003d82;">${formatCurrency(data.total)}</span>
              </div>
            </div>

            <!-- QR Code -->
            <div style="text-align: center; background: white; border: 1px solid #cbd5e0; border-radius: 4px; padding: 8px;">
              <img src="${qrCodeDataUrl}" alt="QR Validación" style="width: 100px; height: 100px;" />
              <p style="margin: 6px 0 0 0; font-size: 8px; color: #718096; font-weight: 600;">Escanea para validar</p>
            </div>
          </div>
        </div>

        <!-- Contact and Footer -->
        <div style="border-top: 2px solid #e2e8f0; padding-top: 10mm;">
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10mm; margin-bottom: 8mm; font-size: 9px; color: #4a5568;">
            
            ${
              data.bankingInfo?.contactInfo?.email
                ? `
            <div>
              <p style="margin: 0 0 3px 0; font-size: 9px; font-weight: 700; color: #003d82; text-transform: uppercase;">Email</p>
              <p style="margin: 0; word-break: break-all;">${Array.isArray(data.bankingInfo.contactInfo.email) ? data.bankingInfo.contactInfo.email[0] : data.bankingInfo.contactInfo.email}</p>
            </div>
            `
                : ""
            }

            ${
              data.bankingInfo?.contactInfo?.mobile
                ? `
            <div>
              <p style="margin: 0 0 3px 0; font-size: 9px; font-weight: 700; color: #003d82; text-transform: uppercase;">Celular</p>
              <p style="margin: 0; font-weight: 600;">${data.bankingInfo.contactInfo.mobile}</p>
            </div>
            `
                : ""
            }

            ${
              data.bankingInfo?.contactInfo?.phone
                ? `
            <div>
              <p style="margin: 0 0 3px 0; font-size: 9px; font-weight: 700; color: #003d82; text-transform: uppercase;">Teléfono</p>
              <p style="margin: 0;">${data.bankingInfo.contactInfo.phone}</p>
            </div>
            `
                : ""
            }
          </div>

          <!-- Footer -->
          <div style="text-align: center; padding-top: 8mm; border-top: 1px solid #e2e8f0; font-size: 8px; color: #a0aec0;">
            <p style="margin: 0;">Documento generado por ATLAS - Sistema Integral de Gestión</p>
            <p style="margin: 3px 0 0 0;">Creado por: ${data.createdBy} • ${new Date().toLocaleDateString("es-PE")}</p>
            <p style="margin: 3px 0 0 0; font-weight: 600; color: #718096;">Estado: ${getStatusLabel(data.status)}</p>
          </div>
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
