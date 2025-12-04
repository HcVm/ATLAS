import { format } from "date-fns"
import { es } from "date-fns/locale"
import { getBankingInfoByCompanyCode, type BankingInfo } from "./company-banking-info"
import QRCode from "qrcode"

export interface GALURPrivateQuotationPDFData {
  // Información de la empresa
  companyName: string
  companyRuc: string
  companyCode: string
  companyAddress?: string
  companyPhone?: string
  companyEmail?: string
  companyLogoUrl?: string
  companyAccountInfo: string

  // Información bancaria (se obtiene automáticamente por código de empresa)
  bankingInfo?: BankingInfo

  // Información de la cotización
  quotationNumber: string
  quotationDate: string
  validUntil?: string
  status: string

  // Información del cliente
  clientCode: string
  clientName: string
  clientRuc: string
  clientAddress: string

  // Información de contacto del cliente
  clientPhone?: string
  clientEmail?: string
  clientContactName?: string

  // Información de la cotización
  deliveryAddress?: string
  deliveryDate?: string
  paymentTerms?: string
  paymentMethod?: string
  currency: string

  // Productos/items
  items: {
    code: string
    description: string
    quantity: number
    unit: string
    unitPrice: number
    discount?: number
    discountType?: "percentage" | "fixed"
    subtotal: number
    brand?: string
  }[]

  // Información de marcas
  brands?: {
    name: string
    logoUrl?: string
  }[]

  // Totales
  subtotal: number
  taxableAmount?: number
  discount?: number
  tax?: number
  total: number

  // Observaciones
  observations?: string

  // Condiciones de pago
  paymentConditions?: string[]

  // Información adicional
  additionalInfo?: string
}

// Función para generar QR de la cotización
export const generateQRForGALURQuotation = async (quotationNumber: string): Promise<string> => {
  try {
    const qrCodeUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://atlas.com.pe"}/quotations/${quotationNumber}`
    const qrCode = await QRCode.toDataURL(qrCodeUrl, {
      errorCorrectionLevel: "H",
      type: "image/png",
      quality: 0.95,
      margin: 1,
      width: 200,
    })
    return qrCode
  } catch (error) {
    console.error("Error generating QR code:", error)
    return ""
  }
}

// Función para generar el HTML de la cotización privada de GALUR
export const generateGALURPrivateQuotationHTML = (data: GALURPrivateQuotationPDFData): string => {
  console.log("=== Generando HTML Privado GALUR ===")
  console.log("Datos recibidos para HTML:", data)

  const formattedDate = format(new Date(data.quotationDate), "dd/MM/yyyy", { locale: es })
  const currentDate = format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })
  const validUntilDate = data.validUntil ? format(new Date(data.validUntil), "dd/MM/yyyy", { locale: es }) : ""

  // Obtener información bancaria automáticamente si tenemos el código de empresa
  if (data.companyCode && !data.bankingInfo) {
    const bankingInfo = getBankingInfoByCompanyCode(data.companyCode)
    if (bankingInfo) {
      data.bankingInfo = bankingInfo
    }
    console.log("✅ Banking info obtained for GALUR company:", data.companyCode, data.bankingInfo)
  }

  // Colores GALUR
  const colors = {
    primary: "#1e7a3a", // Verde primario
    secondary: "#2a9d54", // Verde secundario
    accent: "#fbbf24", // Amarillo
    lightGreen: "#f0fdf4", // Verde muy claro
    darkText: "#1f2937", // Texto oscuro
    lightText: "#6b7280", // Texto gris
    border: "#e5e7eb", // Borde gris claro
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Cotización ${data.quotationNumber}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Arial', sans-serif;
          color: ${colors.darkText};
          background-color: white;
        }
        .page {
          width: 100%;
          height: 100%;
          padding: 40px;
          background: white;
        }
        /* Header con logo y datos empresa */
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 40px;
          border-bottom: 3px solid ${colors.primary};
          padding-bottom: 20px;
        }
        .company-info {
          flex: 1;
        }
        .company-logo {
          height: 60px;
          margin-bottom: 10px;
        }
        .company-name {
          font-size: 20px;
          font-weight: bold;
          color: ${colors.primary};
          margin-bottom: 5px;
        }
        .company-details {
          font-size: 11px;
          color: ${colors.lightText};
          line-height: 1.6;
        }
        .quotation-header {
          text-align: right;
        }
        .quotation-number {
          font-size: 32px;
          font-weight: bold;
          color: ${colors.accent};
          margin-bottom: 10px;
          letter-spacing: 2px;
        }
        .quotation-meta {
          font-size: 11px;
          color: ${colors.lightText};
          line-height: 1.8;
        }
        .status-badge {
          display: inline-block;
          background: ${colors.secondary};
          color: white;
          padding: 6px 12px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: bold;
          margin-top: 8px;
        }
        /* Sección principal en dos columnas */
        .main-content {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
          margin-bottom: 40px;
        }
        .client-section {
          background: ${colors.lightGreen};
          padding: 20px;
          border-radius: 8px;
          border-left: 4px solid ${colors.primary};
        }
        .section-title {
          font-size: 13px;
          font-weight: bold;
          color: ${colors.primary};
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 15px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .section-title:before {
          content: '';
          width: 4px;
          height: 4px;
          background: ${colors.accent};
          border-radius: 50%;
        }
        .client-data {
          font-size: 12px;
          line-height: 1.8;
        }
        .client-data strong {
          color: ${colors.primary};
          display: block;
          margin-top: 10px;
        }
        .terms-section {
          background: white;
          padding: 20px;
          border: 2px solid ${colors.accent};
          border-radius: 8px;
        }
        .terms-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
        }
        .term-item {
          font-size: 11px;
        }
        .term-label {
          color: ${colors.lightText};
          font-weight: normal;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .term-value {
          color: ${colors.primary};
          font-weight: bold;
          font-size: 13px;
          margin-top: 4px;
        }
        /* Tabla de productos */
        .products-section {
          margin-bottom: 30px;
        }
        .products-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 10px;
        }
        .products-table thead {
          background: ${colors.primary};
          color: white;
        }
        .products-table th {
          padding: 12px;
          text-align: left;
          font-size: 11px;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .products-table td {
          padding: 12px;
          border-bottom: 1px solid ${colors.border};
          font-size: 11px;
        }
        .products-table tbody tr:nth-child(even) {
          background: ${colors.lightGreen};
        }
        .products-table tbody tr:hover {
          background: #e8f5e9;
        }
        .product-description {
          font-weight: 500;
          color: ${colors.darkText};
        }
        .product-code {
          font-size: 10px;
          color: ${colors.lightText};
          display: block;
          margin-top: 2px;
        }
        .product-brand {
          font-size: 10px;
          color: ${colors.primary};
          font-weight: bold;
        }
        .text-right {
          text-align: right;
        }
        .text-center {
          text-align: center;
        }
        /* Totales */
        .totals-section {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 20px;
          margin-bottom: 30px;
        }
        .observations {
          font-size: 11px;
          line-height: 1.6;
          color: ${colors.darkText};
        }
        .observations-label {
          color: ${colors.primary};
          font-weight: bold;
          text-transform: uppercase;
          font-size: 10px;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
        }
        .totals-box {
          background: ${colors.lightGreen};
          padding: 20px;
          border-radius: 8px;
          border-top: 3px solid ${colors.accent};
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          margin-bottom: 10px;
          padding-bottom: 10px;
          border-bottom: 1px solid ${colors.border};
        }
        .total-row.final {
          font-size: 16px;
          font-weight: bold;
          color: white;
          background: ${colors.primary};
          padding: 12px;
          border-radius: 4px;
          margin: 0;
          border: none;
          margin-top: 10px;
        }
        .total-row.final .label {
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .total-label {
          color: ${colors.lightText};
        }
        .total-value {
          font-weight: bold;
          color: ${colors.primary};
        }
        /* Información bancaria y QR */
        .footer-section {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 20px;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 2px solid ${colors.accent};
        }
        .banking-info {
          font-size: 11px;
          line-height: 1.8;
        }
        .banking-title {
          color: ${colors.primary};
          font-weight: bold;
          text-transform: uppercase;
          font-size: 10px;
          letter-spacing: 0.5px;
          margin-bottom: 10px;
        }
        .bank-account {
          background: ${colors.lightGreen};
          padding: 10px;
          margin-bottom: 8px;
          border-radius: 4px;
          border-left: 3px solid ${colors.secondary};
        }
        .bank-name {
          font-weight: bold;
          color: ${colors.primary};
        }
        .qr-container {
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .qr-image {
          width: 120px;
          height: 120px;
          border: 2px solid ${colors.accent};
          padding: 8px;
          border-radius: 4px;
          background: white;
          margin-bottom: 8px;
        }
        .qr-label {
          font-size: 9px;
          color: ${colors.lightText};
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        /* Condiciones */
        .conditions-section {
          background: ${colors.lightGreen};
          padding: 20px;
          border-radius: 8px;
          margin-top: 20px;
          border-left: 4px solid ${colors.accent};
        }
        .conditions-title {
          color: ${colors.primary};
          font-weight: bold;
          text-transform: uppercase;
          font-size: 11px;
          letter-spacing: 1px;
          margin-bottom: 12px;
        }
        .conditions-list {
          font-size: 11px;
          line-height: 1.8;
          color: ${colors.darkText};
        }
        .conditions-list li {
          margin-bottom: 6px;
          margin-left: 20px;
        }
        .conditions-list li:before {
          content: '✓';
          color: ${colors.secondary};
          font-weight: bold;
          margin-left: -15px;
          margin-right: 8px;
        }
        /* Footer */
        .document-footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 2px solid ${colors.border};
          text-align: center;
          font-size: 10px;
          color: ${colors.lightText};
        }
        .footer-line {
          margin-bottom: 4px;
        }
      </style>
    </head>
    <body>
      <div class="page">
        <!-- Header -->
        <div class="header">
          <div class="company-info">
            ${data.companyLogoUrl ? `<img src="${data.companyLogoUrl}" alt="Logo" class="company-logo">` : ""}
            <div class="company-name">${data.companyName}</div>
            <div class="company-details">
              RUC: ${data.companyRuc}<br>
              ${data.companyAddress ? `Dirección: ${data.companyAddress}<br>` : ""}
              ${data.companyPhone ? `Teléfono: ${data.companyPhone}<br>` : ""}
              ${data.companyEmail ? `Email: ${data.companyEmail}` : ""}
            </div>
          </div>
          <div class="quotation-header">
            <div class="quotation-number">COT-${data.quotationNumber}</div>
            <div class="quotation-meta">
              <div>Fecha: ${formattedDate}</div>
              ${validUntilDate ? `<div>Válida hasta: ${validUntilDate}</div>` : ""}
              <div class="status-badge">${data.status}</div>
            </div>
          </div>
        </div>

        <!-- Contenido principal -->
        <div class="main-content">
          <!-- Sección Cliente -->
          <div class="client-section">
            <div class="section-title">Datos del Cliente</div>
            <div class="client-data">
              <strong>${data.clientName}</strong>
              RUC: ${data.clientRuc}<br>
              Código: ${data.clientCode}
              <strong style="margin-top: 8px;">Dirección de Entrega</strong>
              ${data.clientAddress}
              ${data.clientPhone ? `<br><strong style="margin-top: 8px;">Teléfono</strong>${data.clientPhone}` : ""}
              ${data.clientEmail ? `<br><strong>Email</strong>${data.clientEmail}` : ""}
              ${data.clientContactName ? `<br><strong>Contacto</strong>${data.clientContactName}` : ""}
            </div>
          </div>

          <!-- Términos y condiciones -->
          <div class="terms-section">
            <div class="section-title">Términos de Entrega</div>
            <div class="terms-grid">
              ${
                data.deliveryDate
                  ? `
                <div class="term-item">
                  <div class="term-label">Fecha de Entrega</div>
                  <div class="term-value">${data.deliveryDate}</div>
                </div>
              `
                  : ""
              }
              <div class="term-item">
                <div class="term-label">Moneda</div>
                <div class="term-value">${data.currency}</div>
              </div>
              ${
                data.paymentTerms
                  ? `
                <div class="term-item">
                  <div class="term-label">Plazo de Pago</div>
                  <div class="term-value">${data.paymentTerms}</div>
                </div>
              `
                  : ""
              }
              ${
                data.paymentMethod
                  ? `
                <div class="term-item">
                  <div class="term-label">Método de Pago</div>
                  <div class="term-value">${data.paymentMethod}</div>
                </div>
              `
                  : ""
              }
            </div>
          </div>
        </div>

        <!-- Tabla de productos -->
        <div class="products-section">
          <table class="products-table">
            <thead>
              <tr>
                <th style="width: 10%;">CÓDIGO</th>
                <th style="width: 35%;">DESCRIPCIÓN</th>
                <th style="width: 10%; text-align: center;">CANTIDAD</th>
                <th style="width: 8%; text-align: center;">UNIDAD</th>
                <th style="width: 12%; text-align: right;">P. UNITARIO</th>
                <th style="width: 12%; text-align: right;">SUBTOTAL</th>
                ${data.items.some((i) => i.brand) ? '<th style="width: 13%;">MARCA</th>' : ""}
              </tr>
            </thead>
            <tbody>
              ${data.items
                .map(
                  (item) => `
                <tr>
                  <td>${item.code}</td>
                  <td>
                    <div class="product-description">${item.description}</div>
                  </td>
                  <td class="text-center">${item.quantity}</td>
                  <td class="text-center">${item.unit}</td>
                  <td class="text-right">S/ ${item.unitPrice.toFixed(2)}</td>
                  <td class="text-right">S/ ${item.subtotal.toFixed(2)}</td>
                  ${data.items.some((i) => i.brand) ? `<td><span class="product-brand">${item.brand || "-"}</span></td>` : ""}
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
        </div>

        <!-- Totales y observaciones -->
        <div class="totals-section">
          <div class="observations">
            ${
              data.observations
                ? `
              <div class="observations-label">Observaciones</div>
              <div>${data.observations}</div>
            `
                : "<div></div>"
            }
          </div>
          <div class="totals-box">
            <div class="total-row">
              <span class="total-label">Subtotal</span>
              <span class="total-value">S/ ${data.subtotal.toFixed(2)}</span>
            </div>
            ${
              data.discount
                ? `
              <div class="total-row">
                <span class="total-label">Descuento</span>
                <span class="total-value">-S/ ${data.discount.toFixed(2)}</span>
              </div>
            `
                : ""
            }
            ${
              data.tax
                ? `
              <div class="total-row">
                <span class="total-label">IGV (18%)</span>
                <span class="total-value">S/ ${data.tax.toFixed(2)}</span>
              </div>
            `
                : ""
            }
            <div class="total-row final">
              <span class="label">Total</span>
              <span>S/ ${data.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <!-- Información bancaria y QR -->
        <div class="footer-section">
          <div class="banking-info">
            <div class="banking-title">Información Bancaria</div>
            ${
              data.bankingInfo
                ? `
              ${
                data.bankingInfo.accounts &&
                data.bankingInfo.accounts
                  .map(
                    (account: any) => `
                <div class="bank-account">
                  <div class="bank-name">${data.bankingInfo?.bankName}</div>
                  <div>Cuenta: ${account.accountNumber}</div>
                  <div>Tipo: ${account.accountType}</div>
                  <div>Moneda: ${account.currency}</div>
                </div>
              `,
                  )
                  .join("")
              }
            `
                : "<div>Información bancaria no disponible</div>"
            }
          </div>
          <div class="qr-container">
            <img src="data:image/png;base64,${data.companyAccountInfo}" alt="QR" class="qr-image">
            <div class="qr-label">Código de Cotización</div>
          </div>
        </div>

        <!-- Condiciones de pago -->
        ${
          data.paymentConditions && data.paymentConditions.length > 0
            ? `
          <div class="conditions-section">
            <div class="conditions-title">Condiciones de Pago</div>
            <ul class="conditions-list">
              ${data.paymentConditions.map((condition) => `<li>${condition}</li>`).join("")}
            </ul>
          </div>
        `
            : ""
        }

        <!-- Footer del documento -->
        <div class="document-footer">
          <div class="footer-line">Este documento fue generado automáticamente el ${currentDate}</div>
          <div class="footer-line">Para validar la autenticidad de esta cotización, escanee el código QR</div>
        </div>
      </div>
    </body>
    </html>
  `
}
