import type { BankingInfo } from "./company-banking-info"
import QRCode from "qrcode"
const { getBankingInfoByCompanyCode } = require("./company-banking-info")

export interface GALURPrivateQuotationPDFData {
  companyName: string
  companyRuc: string
  companyCode: string
  companyAddress?: string
  companyPhone?: string
  companyEmail?: string
  companyLogoUrl?: string
  companyAccountInfo: string
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
  clientEmail: string
  contactPerson: string

  products: Array<{
    quantity: number
    description: string
    unit: string
    brand?: string
    code?: string
    unitPrice: number
    totalPrice: number
    brandLogoUrl?: string
  }>

  subtotal: number
  igv: number
  total: number

  createdBy: string
  qrCodeBase64?: string
}

export const generateQRForGALURQuotation = async (
  quotationNumber: string,
  data: GALURPrivateQuotationPDFData,
): Promise<string> => {
  try {
    console.log("🔐 Creando validación GALUR a través de API...")

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
    const validationHash = validationData.validationHash
    const validationUrl = validationData.validationUrl

    console.log("✅ Validación GALUR creada:", validationHash.substring(0, 16) + "...")

    const qrCodeDataUrl = await QRCode.toDataURL(validationUrl, {
      width: 256,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    })

    return qrCodeDataUrl
  } catch (error) {
    console.error("Error generating QR for GALUR quotation:", error)
    throw error
  }
}

export const generateGALURPrivateQuotationHTML = (data: GALURPrivateQuotationPDFData): string => {
  console.log("=== Generando HTML Privado GALUR ===")
  console.log("Datos recibidos para HTML:", data)

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

  // Obtener información bancaria automáticamente si tenemos el código de empresa
  if (data.companyCode) {
    const bankingInfo = getBankingInfoByCompanyCode(data.companyCode)
    if (bankingInfo && !data.bankingInfo) {
      data.bankingInfo = bankingInfo
    }
  }

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
      
      <!-- Top Banner with Green Theme - GALUR Signature -->
      <div style="background: linear-gradient(135deg, #1e7a3a 0%, #2a9d54 100%); color: white; padding: 15mm 15mm 12mm 15mm; position: relative; overflow: hidden;">
        
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
              <p style="margin: 4px 0 0 0; font-size: 11px; opacity: 0.9; letter-spacing: 0.5px;">COTIZACIÓN PRIVADA DE SERVICIOS Y PRODUCTOS</p>
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

          <!-- Colored line accent with yellow -->
          <div style="width: 100%; height: 2px; background: linear-gradient(90deg, #fbbf24, #2a9d54, transparent); margin-bottom: 12mm;"></div>

          <!-- Client section in banner -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15mm;">
            <div>
              <p style="margin: 0 0 3px 0; font-size: 9px; opacity: 0.8; text-transform: uppercase; letter-spacing: 0.5px;">Cliente</p>
              <h3 style="margin: 0 0 4px 0; font-size: 13px; font-weight: 700;">${data.clientName}</h3>
              <p style="margin: 0 0 2px 0; font-size: 9px; opacity: 0.9;">RUC: <strong>${data.clientRuc}</strong></p>
              <p style="margin: 0; font-size: 8px; opacity: 0.8; line-height: 1.3;">${addressToDisplay}</p>
            </div>
            <div style="text-align: right;">
              <p style="margin: 0 0 3px 0; font-size: 9px; opacity: 0.8; text-transform: uppercase; letter-spacing: 0.5px;">Contacto</p>
              <p style="margin: 0 0 3px 0; font-size: 11px; font-weight: 700;">${data.contactPerson}</p>
              <p style="margin: 0 0 2px 0; font-size: 9px; opacity: 0.9;">Email: <strong>${data.clientEmail}</strong></p>
              <p style="margin: 0; font-size: 8px; opacity: 0.8;">${data.companyPhone || "Tel disponible"}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Content Area -->
      <div style="padding: 15mm;">

        <!-- Products Table -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 15mm;">
          <thead>
            <tr style="border-bottom: 3px solid #1e7a3a; background: #f0fdf4;">
              <th style="padding: 10px; text-align: left; font-size: 10px; font-weight: 700; color: #1e7a3a; text-transform: uppercase; letter-spacing: 0.5px;">Item</th>
              <th style="padding: 10px; text-align: left; font-size: 10px; font-weight: 700; color: #1e7a3a; text-transform: uppercase; letter-spacing: 0.5px;">Descripción</th>
              <th style="padding: 10px; text-align: center; font-size: 10px; font-weight: 700; color: #1e7a3a; text-transform: uppercase; letter-spacing: 0.5px;">Cantidad</th>
              <th style="padding: 10px; text-align: center; font-size: 10px; font-weight: 700; color: #1e7a3a; text-transform: uppercase; letter-spacing: 0.5px;">Precio Unit.</th>
              <th style="padding: 10px; text-align: right; font-size: 10px; font-weight: 700; color: #1e7a3a; text-transform: uppercase; letter-spacing: 0.5px;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${
              data.products && data.products.length > 0
                ? data.products
                    .map(
                      (product, index) => `
              <tr style="border-bottom: 1px solid #e2e8f0; background: ${index % 2 === 0 ? "#ffffff" : "#f0fdf4"};">
                <td style="padding: 10px; font-size: 9px; font-weight: 600; color: #1e7a3a;">${index + 1}</td>
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
                <td style="padding: 10px; text-align: right; font-size: 11px; font-weight: 700; color: #1e7a3a;">${formatCurrency(product.totalPrice)}</td>
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
          
          <!-- Left: Banking Info -->
          <div style="font-size: 9px; color: #4a5568; line-height: 1.6;">
            ${
              data.bankingInfo
                ? `
              <div style="padding: 10px; background: #f0fdf4; border-left: 3px solid #fbbf24; border-radius: 2px;">
                <p style="margin: 0 0 6px 0; font-size: 10px; font-weight: 700; color: #1e7a3a; text-transform: uppercase;">Información de Pago</p>
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
            <div style="background: #f8fafc; border: 2px solid #1e7a3a; border-radius: 4px; padding: 12px; margin-bottom: 12px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid #cbd5e0;">
                <span style="font-size: 10px; color: #4a5568; font-weight: 500;">Subtotal</span>
                <span style="font-size: 11px; font-weight: 600; color: #2d3748;">${formatCurrency(data.subtotal)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid #cbd5e0;">
                <span style="font-size: 10px; color: #4a5568; font-weight: 500;">IGV (18%)</span>
                <span style="font-size: 11px; font-weight: 600; color: #2d3748;">${formatCurrency(data.igv)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 11px; font-weight: 700; color: #1e7a3a; text-transform: uppercase;">Total</span>
                <span style="font-size: 18px; font-weight: 900; color: #1e7a3a;">${formatCurrency(data.total)}</span>
              </div>
            </div>

            <!-- QR Code -->
            ${
              data.qrCodeBase64
                ? `
            <div style="text-align: center; background: white; border: 1px solid #cbd5e0; border-radius: 4px; padding: 8px;">
              <img src="${data.qrCodeBase64}" alt="QR Validación" style="width: 100px; height: 100px;" />
              <p style="margin: 6px 0 0 0; font-size: 8px; color: #718096; font-weight: 600;">Escanea para validar</p>
            </div>
            `
                : ""
            }
          </div>
        </div>

        <!-- Contact and Footer -->
        <div style="border-top: 2px solid #e2e8f0; padding-top: 10mm;">
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10mm; margin-bottom: 8mm; font-size: 9px; color: #4a5568;">
            
            ${
              data.companyEmail
                ? `
            <div>
              <p style="margin: 0 0 3px 0; font-size: 9px; font-weight: 700; color: #1e7a3a; text-transform: uppercase;">Email</p>
              <p style="margin: 0; word-break: break-all;">${data.companyEmail}</p>
            </div>
            `
                : ""
            }

            ${
              data.companyPhone
                ? `
            <div>
              <p style="margin: 0 0 3px 0; font-size: 9px; font-weight: 700; color: #1e7a3a; text-transform: uppercase;">Teléfono/Celular</p>
              <p style="margin: 0; font-weight: 600;">${data.companyPhone}</p>
            </div>
            `
                : ""
            }

            ${
              data.companyAddress
                ? `
            <div>
              <p style="margin: 0 0 3px 0; font-size: 9px; font-weight: 700; color: #1e7a3a; text-transform: uppercase;">Dirección</p>
              <p style="margin: 0; font-size: 8px;">${data.companyAddress}</p>
            </div>
            `
                : ""
            }
          </div>

          <!-- Footer -->
          <div style="text-align: center; padding-top: 8mm; border-top: 1px solid #e2e8f0; font-size: 8px; color: #a0aec0;">
            <p style="margin: 0;">Documento generado por ATLAS - Sistema Integral de Gestión</p>
            <p style="margin: 3px 0 0 0;">Creado por: ${data.createdBy} • ${new Date().toLocaleDateString("es-PE")}</p>
            <p style="margin: 3px 0 0 0; font-weight: 600; color: #1e7a3a;">Cotización Privada GALUR</p>
          </div>
        </div>

      </div>

    </div>

  </div>
  `
}
