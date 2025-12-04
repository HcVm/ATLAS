// pdf-generator-private-galur.ts - Generador de cotización privada GALUR
import { format } from "date-fns"
import { es } from "date-fns/locale"
import type { BankingInfo } from "./company-banking-info"
import QRCode from "qrcode"

// Interfaz para los datos de la cotización privada GALUR
export interface GALURPrivateQuotationPDFData {
  quotationNumber: string
  issueDate: string
  validUntil: string
  status: string
  companyCode: string
  // Cliente
  clientName: string
  clientRuc: string
  clientAddress: string
  clientContact: string
  clientEmail: string
  clientCode: string
  // Productos
  products: Array<{
    number: number
    description: string
    quantity: number
    unit: string
    brandLogo?: string
    unitPrice: number
    total: number
    sku?: string
  }>
  // Totales
  subtotal: number
  igv: number
  total: number
  currency: string
  // Información adicional
  bankingInfo?: BankingInfo
  conditions: string[]
  createdBy: string
  brands: Array<{
    name: string
    logo: string
  }>
  companyAccountInfo?: string
}

// Función para generar QR de la cotización
export const generateQRForGALURQuotation = async (quotationNumber: string): Promise<string> => {
  try {
    // Crear la validación en el servidor
    const response = await fetch("/api/create-validation", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        quotationNumber,
        companyCode: "GALUR",
      }),
    })

    if (!response.ok) {
      throw new Error("Error creating validation")
    }

    const { validationUrl } = await response.json()

    // Generar el código QR
    const qrCode = await QRCode.toDataURL(validationUrl, {
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

  const getStatusLabel = (status: string) => {
    const statusMap: { [key: string]: string } = {
      draft: "Borrador",
      pending: "Pendiente",
      approved: "Aprobada",
      rejected: "Rechazada",
      expired: "Expirada",
    }
    return statusMap[status] || status
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd 'de' MMMM 'de' yyyy", { locale: es })
    } catch {
      return dateString
    }
  }

  return `
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
          background: #ffffff;
          color: #1f2937;
          font-size: 11px;
          line-height: 1.4;
        }
        
        .page {
          width: 210mm;
          min-height: 297mm;
          padding: 0;
          background: #ffffff;
        }
        
        /* Header con barra lateral */
        .header {
          display: flex;
          min-height: 120px;
        }
        
        .header-sidebar {
          width: 8px;
          background: linear-gradient(180deg, #15803d 0%, #22c55e 50%, #eab308 100%);
        }
        
        .header-content {
          flex: 1;
          padding: 20px 25px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 3px solid #15803d;
        }
        
        .company-info {
          display: flex;
          align-items: center;
          gap: 15px;
        }
        
        .company-logo {
          width: 70px;
          height: 70px;
          border-radius: 50%;
          border: 3px solid #15803d;
          padding: 5px;
          background: white;
        }
        
        .company-logo img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        
        .company-details h1 {
          font-size: 22px;
          font-weight: 700;
          color: #15803d;
          letter-spacing: 1px;
        }
        
        .company-ruc {
          font-size: 12px;
          color: #666;
          margin-top: 4px;
        }
        
        .quotation-box {
          text-align: right;
        }
        
        .quotation-type {
          display: inline-block;
          background: #15803d;
          color: white;
          padding: 4px 12px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        .quotation-number {
          font-size: 18px;
          font-weight: 700;
          color: #1f2937;
          margin-top: 8px;
        }
        
        .quotation-date {
          font-size: 11px;
          color: #666;
          margin-top: 4px;
        }
        
        .quotation-status {
          display: inline-block;
          background: #eab308;
          color: #1f2937;
          padding: 3px 10px;
          border-radius: 12px;
          font-size: 10px;
          font-weight: 600;
          margin-top: 6px;
        }
        
        /* Contenido principal */
        .main-content {
          padding: 20px 25px 20px 33px;
        }
        
        /* Sección de marcas */
        .brands-section {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 20px;
          text-align: center;
        }
        
        .brands-title {
          font-size: 10px;
          color: #15803d;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 10px;
        }
        
        .brands-logos {
          display: flex;
          justify-content: center;
          gap: 20px;
          flex-wrap: wrap;
        }
        
        .brand-logo {
          width: 40px;
          height: 40px;
          object-fit: contain;
        }
        
        /* Grid de información */
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin-bottom: 20px;
        }
        
        .info-card {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          overflow: hidden;
        }
        
        .info-card-header {
          background: #15803d;
          color: white;
          padding: 8px 12px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .info-card-body {
          padding: 12px;
        }
        
        .info-row {
          display: flex;
          margin-bottom: 6px;
        }
        
        .info-row:last-child {
          margin-bottom: 0;
        }
        
        .info-label {
          width: 100px;
          font-size: 10px;
          color: #6b7280;
          text-transform: uppercase;
        }
        
        .info-value {
          flex: 1;
          font-size: 11px;
          color: #1f2937;
          font-weight: 500;
        }
        
        /* Condiciones */
        .conditions-card .info-card-body {
          padding: 10px 12px;
        }
        
        .condition-item {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          margin-bottom: 6px;
          font-size: 10px;
        }
        
        .condition-item:last-child {
          margin-bottom: 0;
        }
        
        .condition-number {
          width: 18px;
          height: 18px;
          background: #eab308;
          color: #1f2937;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 9px;
          font-weight: 700;
          flex-shrink: 0;
        }
        
        .condition-text {
          color: #4b5563;
          line-height: 1.4;
          padding-top: 2px;
        }
        
        /* Tabla de productos */
        .products-section {
          margin-bottom: 20px;
        }
        
        .products-header {
          background: #15803d;
          color: white;
          padding: 10px 12px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-radius: 8px 8px 0 0;
        }
        
        .products-table {
          width: 100%;
          border-collapse: collapse;
          border: 1px solid #e5e7eb;
          border-top: none;
          border-radius: 0 0 8px 8px;
          overflow: hidden;
        }
        
        .products-table th {
          background: #f9fafb;
          padding: 10px 8px;
          text-align: left;
          font-size: 9px;
          font-weight: 600;
          color: #374151;
          text-transform: uppercase;
          border-bottom: 2px solid #e5e7eb;
        }
        
        .products-table th:nth-child(1) { width: 5%; text-align: center; }
        .products-table th:nth-child(2) { width: 40%; }
        .products-table th:nth-child(3) { width: 8%; text-align: center; }
        .products-table th:nth-child(4) { width: 8%; text-align: center; }
        .products-table th:nth-child(5) { width: 10%; text-align: center; }
        .products-table th:nth-child(6) { width: 12%; text-align: right; }
        .products-table th:nth-child(7) { width: 17%; text-align: right; }
        
        .products-table td {
          padding: 10px 8px;
          border-bottom: 1px solid #f3f4f6;
          font-size: 10px;
          vertical-align: top;
        }
        
        .products-table tr:last-child td {
          border-bottom: none;
        }
        
        .products-table tr:nth-child(even) {
          background: #fafafa;
        }
        
        .product-number {
          text-align: center;
          font-weight: 600;
          color: #15803d;
        }
        
        .product-description {
          color: #1f2937;
          line-height: 1.4;
        }
        
        .product-sku {
          display: inline-block;
          background: #dbeafe;
          color: #1e40af;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 8px;
          margin-top: 4px;
        }
        
        .product-qty {
          text-align: center;
          background: #f0fdf4;
          border-radius: 4px;
          padding: 4px;
          font-weight: 600;
          color: #15803d;
        }
        
        .product-unit {
          text-align: center;
          color: #6b7280;
        }
        
        .product-brand {
          text-align: center;
        }
        
        .product-brand img {
          width: 28px;
          height: 28px;
          object-fit: contain;
        }
        
        .product-price {
          text-align: right;
          color: #4b5563;
        }
        
        .product-total {
          text-align: right;
          font-weight: 700;
          color: #15803d;
        }
        
        /* Footer con información bancaria, totales y QR */
        .footer-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 140px;
          gap: 15px;
          margin-bottom: 20px;
        }
        
        .banking-card {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          overflow: hidden;
        }
        
        .banking-header {
          background: #1f2937;
          color: white;
          padding: 8px 12px;
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
        }
        
        .banking-body {
          padding: 10px 12px;
        }
        
        .bank-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 5px;
          font-size: 10px;
        }
        
        .bank-row:last-child {
          margin-bottom: 0;
        }
        
        .bank-label {
          color: #6b7280;
        }
        
        .bank-value {
          font-weight: 600;
          color: #1f2937;
        }
        
        /* Totales */
        .totals-card {
          border: 2px solid #15803d;
          border-radius: 8px;
          overflow: hidden;
        }
        
        .totals-header {
          background: #15803d;
          color: white;
          padding: 8px 12px;
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
        }
        
        .totals-body {
          padding: 10px 12px;
        }
        
        .total-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 6px;
          font-size: 11px;
        }
        
        .total-row.final {
          border-top: 2px solid #15803d;
          padding-top: 8px;
          margin-top: 8px;
          margin-bottom: 0;
        }
        
        .total-row.final .total-label,
        .total-row.final .total-value {
          font-size: 14px;
          font-weight: 700;
          color: #15803d;
        }
        
        .total-label {
          color: #6b7280;
        }
        
        .total-value {
          font-weight: 600;
          color: #1f2937;
        }
        
        /* QR */
        .qr-card {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 10px;
          text-align: center;
          background: #fefce8;
        }
        
        .qr-title {
          font-size: 9px;
          color: #6b7280;
          text-transform: uppercase;
          margin-bottom: 8px;
          font-weight: 600;
        }
        
        .qr-image {
          width: 90px;
          height: 90px;
        }
        
        .qr-text {
          font-size: 8px;
          color: #9ca3af;
          margin-top: 6px;
        }
        
        /* Pie de página */
        .page-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 25px 12px 33px;
          background: #f9fafb;
          border-top: 1px solid #e5e7eb;
          font-size: 9px;
          color: #6b7280;
        }
        
        .footer-left {
          line-height: 1.5;
        }
        
        .footer-right {
          text-align: right;
        }
        
        .footer-company {
          font-weight: 700;
          color: #15803d;
          font-size: 11px;
        }
        
        .footer-system {
          color: #9ca3af;
          font-size: 8px;
        }
      </style>
    </head>
    <body>
      <div class="page">
        <!-- Header -->
        <div class="header">
          <div class="header-sidebar"></div>
          <div class="header-content">
            <div class="company-info">
              <div class="company-logo">
                <img src="https://storage.googleapis.com/atlas-static/GALUR%20oficial.png" alt="GALUR">
              </div>
              <div class="company-details">
                <h1>GALUR BUSINESS CORPORATION</h1>
                <div class="company-ruc">RUC: 20604486859</div>
              </div>
            </div>
            <div class="quotation-box">
              <div class="quotation-type">Cotización Privada</div>
              <div class="quotation-number">${data.quotationNumber}</div>
              <div class="quotation-date">${formatDate(data.issueDate)}</div>
              <div class="quotation-status">${getStatusLabel(data.status)}</div>
            </div>
          </div>
        </div>
        
        <!-- Contenido principal -->
        <div class="main-content">
          <!-- Marcas -->
          ${
            data.brands && data.brands.length > 0
              ? `
            <div class="brands-section">
              <div class="brands-title">Marcas Representadas</div>
              <div class="brands-logos">
                ${data.brands.map((brand) => `<img src="${brand.logo}" alt="${brand.name}" class="brand-logo">`).join("")}
              </div>
            </div>
          `
              : ""
          }
          
          <!-- Grid de información -->
          <div class="info-grid">
            <div class="info-card">
              <div class="info-card-header">Información del Cliente</div>
              <div class="info-card-body">
                <div class="info-row">
                  <span class="info-label">Razón Social</span>
                  <span class="info-value">${data.clientName}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">RUC</span>
                  <span class="info-value">${data.clientRuc}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Código</span>
                  <span class="info-value">${data.clientCode || "No especificado"}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Dirección</span>
                  <span class="info-value">${data.clientAddress || "No especificada"}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Contacto</span>
                  <span class="info-value">${data.clientContact || "No especificado"}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Email</span>
                  <span class="info-value">${data.clientEmail || "No especificado"}</span>
                </div>
              </div>
            </div>
            
            <div class="info-card conditions-card">
              <div class="info-card-header">Condiciones Comerciales</div>
              <div class="info-card-body">
                ${data.conditions
                  .map(
                    (condition, index) => `
                  <div class="condition-item">
                    <span class="condition-number">${index + 1}</span>
                    <span class="condition-text">${condition}</span>
                  </div>
                `,
                  )
                  .join("")}
              </div>
            </div>
          </div>
          
          <!-- Tabla de productos -->
          <div class="products-section">
            <div class="products-header">Detalle de Productos</div>
            <table class="products-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Descripción</th>
                  <th>Cant.</th>
                  <th>Unidad</th>
                  <th>Marca</th>
                  <th>P. Unit.</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${data.products
                  .map(
                    (product) => `
                  <tr>
                    <td class="product-number">${product.number}</td>
                    <td class="product-description">
                      ${product.description}
                      ${product.sku ? `<span class="product-sku">${product.sku}</span>` : ""}
                    </td>
                    <td><div class="product-qty">${product.quantity}</div></td>
                    <td class="product-unit">${product.unit}</td>
                    <td class="product-brand">
                      ${product.brandLogo ? `<img src="${product.brandLogo}" alt="Marca">` : "-"}
                    </td>
                    <td class="product-price">S/ ${product.unitPrice.toFixed(2)}</td>
                    <td class="product-total">S/ ${product.total.toFixed(2)}</td>
                  </tr>
                `,
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
          
          <!-- Footer con información bancaria, totales y QR -->
          <div class="footer-grid">
            <div class="banking-card">
              <div class="banking-header">Información Bancaria</div>
              <div class="banking-body">
                ${
                  data.bankingInfo?.bankAccount
                    ? `
                  <div class="bank-row">
                    <span class="bank-label">Banco</span>
                    <span class="bank-value">${data.bankingInfo.bankAccount.bankName}</span>
                  </div>
                  <div class="bank-row">
                    <span class="bank-label">Cuenta ${data.bankingInfo.bankAccount.accountType}</span>
                    <span class="bank-value">${data.bankingInfo.bankAccount.accountNumber}</span>
                  </div>
                  <div class="bank-row">
                    <span class="bank-label">CCI</span>
                    <span class="bank-value">${data.bankingInfo.bankAccount.cci}</span>
                  </div>
                `
                    : "<div>Información bancaria no disponible</div>"
                }
                ${
                  data.bankingInfo?.detractionAccount
                    ? `
                  <div class="bank-row" style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed #e5e7eb;">
                    <span class="bank-label">Cta. Detracción</span>
                    <span class="bank-value">${data.bankingInfo.detractionAccount}</span>
                  </div>
                `
                    : ""
                }
              </div>
            </div>
            
            <div class="totals-card">
              <div class="totals-header">Resumen</div>
              <div class="totals-body">
                <div class="total-row">
                  <span class="total-label">Subtotal</span>
                  <span class="total-value">S/ ${data.subtotal.toFixed(2)}</span>
                </div>
                <div class="total-row">
                  <span class="total-label">IGV (18%)</span>
                  <span class="total-value">S/ ${data.igv.toFixed(2)}</span>
                </div>
                <div class="total-row final">
                  <span class="total-label">TOTAL</span>
                  <span class="total-value">S/ ${data.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
            
            <div class="qr-card">
              <div class="qr-title">Verificación</div>
              <img src="${data.companyAccountInfo}" alt="QR" class="qr-image">
              <div class="qr-text">Escanee para verificar</div>
            </div>
          </div>
        </div>
        
        <!-- Pie de página -->
        <div class="page-footer">
          <div class="footer-left">
            <div>Elaborado por: <strong>${data.createdBy}</strong></div>
            <div>Generado: ${format(new Date(), "dd/MM/yyyy HH:mm")}</div>
          </div>
          <div class="footer-right">
            <div class="footer-company">GALUR</div>
            <div class="footer-system">Sistema de Cotizaciones ATLAS</div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `
}
