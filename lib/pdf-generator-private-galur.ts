import { format } from "date-fns"
import { es } from "date-fns/locale"
import { getBankingInfoByCompanyCode, type BankingInfo } from "./company-banking-info"
import QRCode from "qrcode"

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
  clientAttention: string
  currency: string

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
    console.log("🔗 URL de validación:", validationUrl)

    console.log("📱 Generando código QR...")
    const qrCodeDataUrl = await QRCode.toDataURL(validationUrl, {
      width: 256,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    })

    console.log("✅ QR Code GALUR generado exitosamente")
    return qrCodeDataUrl
  } catch (error) {
    console.error("Error generating GALUR QR code:", error)
    return ""
  }
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

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("es-PE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export const generateGALURPrivateQuotationHTML = (data: GALURPrivateQuotationPDFData): string => {
  console.log("=== Generando HTML GALUR Privado ===")
  console.log("Datos recibidos para HTML:", data)

  const formattedDate = format(new Date(data.quotationDate), "dd/MM/yyyy", { locale: es })
  const currentDate = format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })

  if (data.companyCode && !data.bankingInfo) {
    const bankingInfo = getBankingInfoByCompanyCode(data.companyCode)
    if (bankingInfo) {
      data.bankingInfo = bankingInfo
    }
    console.log("✅ Banking info obtained for GALUR company:", data.companyCode, data.bankingInfo)
  }

  const uniqueBrands = data.products
    .filter((product) => product.brand && product.brandLogoUrl)
    .reduce(
      (acc, product) => {
        if (product.brand && product.brandLogoUrl && !acc.some((b) => b.name === product.brand)) {
          acc.push({ name: product.brand, logoUrl: product.brandLogoUrl })
        }
        return acc
      },
      [] as Array<{ name: string; logoUrl: string }>,
    )

  const addressToDisplay = data.clientFiscalAddress || data.clientAddress || "Dirección no especificada"

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Cotización GALUR Privada ${data.quotationNumber}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Inter', 'Segoe UI', sans-serif;
          font-size: 9px;
          line-height: 1.3;
          color: #1a1a1a;
          background: white;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        
        .document-container {
          width: 100%;
          max-width: 200mm;
          margin: 0 auto;
          background: white;
        }

        /* Header único con diseño moderno - colores verde y blanco */
        .header-premium {
          background: linear-gradient(135deg, #1e7a3a 0%, #2a9d54 100%);
          color: white;
          padding: 4mm 5mm;
          margin-bottom: 3mm;
          border-radius: 3mm;
          box-shadow: 0 2mm 8mm rgba(30, 122, 58, 0.2);
          page-break-inside: avoid;
          position: relative;
          overflow: hidden;
        }

        .header-premium::before {
          content: '';
          position: absolute;
          top: 0;
          right: 0;
          width: 80mm;
          height: 100%;
          background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="20" cy="20" r="15" fill="rgba(255,255,255,0.05)"/><circle cx="80" cy="80" r="20" fill="rgba(255,255,255,0.03)"/></svg>');
          pointer-events: none;
          z-index: 0;
        }

        .header-content {
          display: grid;
          grid-template-columns: 1fr 1.5fr 1fr;
          gap: 5mm;
          align-items: center;
          position: relative;
          z-index: 1;
        }

        .logo-section {
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .company-logo-header {
          width: 60px;
          height: 60px;
          object-fit: contain;
          margin-bottom: 2mm;
          background: white;
          padding: 2mm;
          border-radius: 2mm;
        }

        .company-name-header {
          font-size: 13px;
          font-weight: 900;
          letter-spacing: 0.5px;
        }

        .quotation-status-section {
          background: rgba(251, 191, 36, 0.2);
          border: 2px solid #fbbf24;
          border-radius: 3mm;
          padding: 3mm;
          text-align: center;
          backdrop-filter: blur(10px);
        }

        .quotation-label {
          font-size: 8px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          opacity: 0.9;
          margin-bottom: 1mm;
        }

        .quotation-number-header {
          font-size: 15px;
          font-weight: 900;
          color: #fbbf24;
          margin-bottom: 1mm;
        }

        .quotation-date-header {
          font-size: 8px;
          opacity: 0.85;
          margin-bottom: 1mm;
        }

        .status-badge-header {
          background: #fbbf24;
          color: #1e7a3a;
          padding: 1mm 2mm;
          border-radius: 12px;
          font-size: 7px;
          font-weight: 700;
          display: inline-block;
          text-transform: uppercase;
        }

        .company-info-section {
          text-align: right;
          line-height: 1.5;
        }

        .company-info-label {
          font-size: 7px;
          font-weight: 500;
          opacity: 0.8;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .company-info-value {
          font-size: 9px;
          font-weight: 600;
          margin-bottom: 1mm;
        }

        /* Marcas en grid moderno */
        .brands-section {
          background: linear-gradient(135deg, #f0fdf4 0%, #f9fafb 100%);
          border: 2px solid #fbbf24;
          border-radius: 3mm;
          padding: 3mm;
          margin-bottom: 3mm;
          page-break-inside: avoid;
        }

        .brands-title {
          text-align: center;
          font-size: 10px;
          font-weight: 700;
          color: #1e7a3a;
          margin-bottom: 2mm;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .brands-grid {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 3mm;
        }

        .brand-item {
          background: white;
          border: 1px solid #dbeafe;
          border-radius: 2mm;
          padding: 2mm;
          text-align: center;
          min-width: 55px;
          box-shadow: 0 1mm 3mm rgba(30, 122, 58, 0.05);
        }

        .brand-logo {
          width: 50px;
          height: 40px;
          object-fit: contain;
          margin-bottom: 1mm;
        }

        .brand-name {
          font-size: 7px;
          font-weight: 600;
          color: #1a1a1a;
        }

        /* Cliente y condiciones en layout horizontal */
        .client-conditions-section {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 3mm;
          margin-bottom: 3mm;
        }

        .client-card {
          background: white;
          border: 2px solid #1e7a3a;
          border-radius: 3mm;
          padding: 3mm;
          page-break-inside: avoid;
        }

        .card-header {
          background: linear-gradient(135deg, #1e7a3a 0%, #2a9d54 100%);
          color: white;
          padding: 2mm;
          margin: -3mm -3mm 2mm -3mm;
          border-radius: 1.5mm 1.5mm 0 0;
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
        }

        .client-field {
          display: flex;
          justify-content: space-between;
          margin-bottom: 1.5mm;
          padding-bottom: 1.5mm;
          border-bottom: 1px solid #f0fdf4;
        }

        .client-field:last-child {
          margin-bottom: 0;
          padding-bottom: 0;
          border-bottom: none;
        }

        .client-label {
          font-size: 8px;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .client-value {
          font-size: 8px;
          font-weight: 600;
          color: #1a1a1a;
          text-align: right;
          max-width: 60%;
          word-break: break-word;
        }

        .conditions-card {
          background: white;
          border: 2px solid #1e7a3a;
          border-radius: 3mm;
          padding: 3mm;
          page-break-inside: avoid;
        }

        .condition-item {
          display: flex;
          gap: 2mm;
          margin-bottom: 1.5mm;
          padding-bottom: 1.5mm;
          border-bottom: 1px solid #f0fdf4;
        }

        .condition-item:last-child {
          margin-bottom: 0;
          padding-bottom: 0;
          border-bottom: none;
        }

        .condition-number {
          background: #fbbf24;
          color: #1e7a3a;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 8px;
          flex-shrink: 0;
          box-shadow: 0 1mm 3mm rgba(251, 191, 36, 0.3);
        }

        .condition-text {
          font-size: 8px;
          line-height: 1.3;
          color: #475569;
        }

        /* Tabla de productos mejorada */
        .products-section {
          margin-bottom: 3mm;
          page-break-inside: avoid;
        }

        .section-title {
          background: linear-gradient(135deg, #1e7a3a 0%, #2a9d54 100%);
          color: white;
          padding: 2mm 3mm;
          border-radius: 3mm 3mm 0 0;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .products-table {
          width: 100%;
          border-collapse: collapse;
          background: white;
          border: 2px solid #1e7a3a;
          border-top: none;
          border-radius: 0 0 3mm 3mm;
          overflow: hidden;
        }

        .products-table thead {
          background: #f0fdf4;
          border-bottom: 2px solid #fbbf24;
        }

        .products-table th {
          color: #1e7a3a;
          padding: 2mm;
          font-weight: 700;
          text-align: center;
          font-size: 8px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .products-table td {
          padding: 2mm;
          border-bottom: 1px solid #f0fdf4;
          font-size: 8px;
          vertical-align: middle;
        }

        .products-table tbody tr:last-child td {
          border-bottom: none;
        }

        .products-table tbody tr:nth-child(odd) {
          background: white;
        }

        .products-table tbody tr:nth-child(even) {
          background: #f9fafb;
        }

        .product-index {
          background: #1e7a3a;
          color: white;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 8px;
          margin: 0 auto;
        }

        .product-description-cell {
          font-weight: 600;
          color: #1a1a1a;
        }

        .quantity-badge {
          background: linear-gradient(135deg, #1e7a3a 0%, #2a9d54 100%);
          color: white;
          padding: 1mm;
          border-radius: 2mm;
          font-weight: 700;
          text-align: center;
          display: inline-block;
          min-width: 20px;
        }

        .price-text {
          text-align: right;
          font-weight: 700;
          color: #059669;
        }

        .total-price {
          text-align: right;
          background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
          color: #1e7a3a;
          padding: 1mm;
          border-radius: 2mm;
          font-weight: 700;
        }

        /* Sección financiera con layout en 3 columnas */
        .financial-section {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 3mm;
          margin-bottom: 3mm;
          page-break-inside: avoid;
        }

        .banking-column {
          background: white;
          border: 2px solid #1e7a3a;
          border-radius: 3mm;
          padding: 3mm;
        }

        .totals-column {
          background: white;
          border: 2px solid #1e7a3a;
          border-radius: 3mm;
          padding: 3mm;
        }

        .qr-column {
          background: white;
          border: 2px solid #1e7a3a;
          border-radius: 3mm;
          padding: 3mm;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .column-header {
          background: linear-gradient(135deg, #1e7a3a 0%, #2a9d54 100%);
          color: white;
          padding: 1.5mm;
          margin: -3mm -3mm 2mm -3mm;
          border-radius: 1.5mm 1.5mm 0 0;
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
        }

        .banking-item {
          display: flex;
          justify-content: space-between;
          margin-bottom: 1mm;
          padding-bottom: 1mm;
          border-bottom: 1px solid #f0fdf4;
          font-size: 8px;
        }

        .banking-item:last-child {
          border-bottom: none;
          margin-bottom: 0;
        }

        .banking-label {
          font-weight: 500;
          color: #64748b;
        }

        .banking-value {
          font-weight: 600;
          color: #1a1a1a;
          font-family: 'Courier New', monospace;
        }

        .total-item {
          display: flex;
          justify-content: space-between;
          margin-bottom: 1.5mm;
          padding: 1mm 0;
          border-bottom: 1px solid #f0fdf4;
        }

        .total-item:last-child {
          border-bottom: none;
        }

        .total-item-label {
          font-size: 8px;
          color: #64748b;
          font-weight: 600;
        }

        .total-item-value {
          font-size: 8px;
          font-weight: 700;
          color: #1a1a1a;
        }

        .total-final {
          background: linear-gradient(135deg, #1e7a3a 0%, #2a9d54 100%);
          color: white;
          padding: 2mm;
          border-radius: 2mm;
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          font-weight: 900;
          margin-top: 1.5mm;
        }

        .qr-code-container {
          background: white;
          padding: 2mm;
          border-radius: 2mm;
          border: 2px solid #fbbf24;
          margin-bottom: 2mm;
          box-shadow: 0 2mm 5mm rgba(251, 191, 36, 0.2);
        }

        .qr-code-image {
          width: 30mm;
          height: 30mm;
          object-fit: contain;
        }

        .qr-text {
          font-size: 8px;
          color: #64748b;
          margin-top: 1mm;
          line-height: 1.2;
        }

        .qr-text strong {
          color: #1e7a3a;
          font-weight: 700;
        }

        .footer {
          background: linear-gradient(135deg, #f0fdf4 0%, #f9fafb 100%);
          border-top: 3px solid #fbbf24;
          padding: 3mm;
          margin-top: 3mm;
          border-radius: 0 0 3mm 3mm;
          text-align: center;
          font-size: 8px;
          color: #64748b;
          page-break-inside: avoid;
        }

        .footer-text {
          margin-bottom: 1mm;
        }

        .footer-date {
          font-size: 7px;
          color: #94a3b8;
          font-style: italic;
        }
      </style>
    </head>
    <body>
      <div class="document-container">
        <!-- Header Premium -->
        <div class="header-premium">
          <div class="header-content">
            <div class="logo-section">
              ${data.companyLogoUrl ? `<img src="${data.companyLogoUrl}" alt="Logo" class="company-logo-header">` : ""}
              <div class="company-name-header">${data.companyName}</div>
            </div>
            
            <div class="quotation-status-section">
              <div class="quotation-label">Cotización</div>
              <div class="quotation-number-header">${data.quotationNumber}</div>
              <div class="quotation-date-header">${formattedDate}</div>
              <div class="status-badge-header">${getStatusLabel(data.status)}</div>
            </div>

            <div class="company-info-section">
              <div class="company-info-label">Ruc:</div>
              <div class="company-info-value">${data.companyRuc}</div>
              <div class="company-info-label">Código:</div>
              <div class="company-info-value">${data.companyCode}</div>
            </div>
          </div>
        </div>

        <!-- Marcas -->
        ${
          uniqueBrands.length > 0
            ? `
        <div class="brands-section">
          <div class="brands-title">Marcas Disponibles</div>
          <div class="brands-grid">
            ${uniqueBrands
              .map(
                (brand) => `
              <div class="brand-item">
                <img src="${brand.logoUrl}" alt="${brand.name}" class="brand-logo">
                <div class="brand-name">${brand.name}</div>
              </div>
            `,
              )
              .join("")}
          </div>
        </div>
        `
            : ""
        }

        <!-- Cliente y Condiciones -->
        <div class="client-conditions-section">
          <div class="client-card">
            <div class="card-header">Información del Cliente</div>
            <div class="client-field">
              <span class="client-label">Nombre:</span>
              <span class="client-value">${data.clientName}</span>
            </div>
            <div class="client-field">
              <span class="client-label">RUC:</span>
              <span class="client-value">${data.clientRuc}</span>
            </div>
            <div class="client-field">
              <span class="client-label">Código:</span>
              <span class="client-value">${data.clientCode}</span>
            </div>
            <div class="client-field">
              <span class="client-label">Atención:</span>
              <span class="client-value">${data.clientAttention}</span>
            </div>
            <div class="client-field">
              <span class="client-label">Dirección:</span>
              <span class="client-value">${addressToDisplay}</span>
            </div>
          </div>

          <div class="conditions-card">
            <div class="card-header">Condiciones Comerciales</div>
            <div class="condition-item">
              <div class="condition-number">1</div>
              <div class="condition-text">Plazo de validez de la cotización: 30 días hábiles</div>
            </div>
            <div class="condition-item">
              <div class="condition-number">2</div>
              <div class="condition-text">Entrega según coordinar con área comercial</div>
            </div>
            <div class="condition-item">
              <div class="condition-number">3</div>
              <div class="condition-text">Precios incluyen IGV. Sujetos a cambios sin previo aviso</div>
            </div>
            <div class="condition-item">
              <div class="condition-number">4</div>
              <div class="condition-text">Modalidad de pago según política de empresa</div>
            </div>
          </div>
        </div>

        <!-- Tabla de Productos -->
        <div class="products-section">
          <div class="section-title">Detalle de Productos</div>
          <table class="products-table">
            <thead>
              <tr>
                <th style="width: 5%">#</th>
                <th style="width: 35%">Descripción</th>
                <th style="width: 10%">Cantidad</th>
                <th style="width: 10%">Unidad</th>
                <th style="width: 15%">Precio Unitario</th>
                <th style="width: 15%">Total</th>
                <th style="width: 10%">Marca</th>
              </tr>
            </thead>
            <tbody>
              ${data.products
                .map(
                  (product, index) => `
                <tr>
                  <td><div class="product-index">${index + 1}</div></td>
                  <td class="product-description-cell">
                    ${product.description}
                    ${product.code ? `<br><small style="color: #94a3b8; font-size: 7px;">${product.code}</small>` : ""}
                  </td>
                  <td style="text-align: center;"><div class="quantity-badge">${product.quantity}</div></td>
                  <td style="text-align: center;">${product.unit}</td>
                  <td class="price-text">${data.currency} ${product.unitPrice.toFixed(2)}</td>
                  <td class="total-price">${data.currency} ${product.totalPrice.toFixed(2)}</td>
                  <td style="text-align: center;">${product.brand || "-"}</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
        </div>

        <!-- Sección Financiera -->
        <div class="financial-section">
          <!-- Columna Bancaria -->
          <div class="banking-column">
            <div class="column-header">Datos Bancarios</div>
            ${
              data.bankingInfo
                ? `
              <div class="banking-item">
                <span class="banking-label">Banco:</span>
                <span class="banking-value">${data.bankingInfo.bankName}</span>
              </div>
              <div class="banking-item">
                <span class="banking-label">Moneda:</span>
                <span class="banking-value">${data.bankingInfo.currency}</span>
              </div>
              <div class="banking-item">
                <span class="banking-label">Cuenta:</span>
                <span class="banking-value">${data.bankingInfo.accountNumber}</span>
              </div>
              <div class="banking-item">
                <span class="banking-label">Interbancario:</span>
                <span class="banking-value">${data.bankingInfo.interbankCode}</span>
              </div>
            `
                : '<div style="color: #94a3b8; font-size: 8px;">No hay información bancaria</div>'
            }
          </div>

          <!-- Columna de Totales -->
          <div class="totals-column">
            <div class="column-header">Resumen Financiero</div>
            <div class="total-item">
              <span class="total-item-label">Subtotal:</span>
              <span class="total-item-value">${data.currency} ${data.subtotal.toFixed(2)}</span>
            </div>
            <div class="total-item">
              <span class="total-item-label">IGV (18%):</span>
              <span class="total-item-value">${data.currency} ${data.igv.toFixed(2)}</span>
            </div>
            <div class="total-final">
              <span>TOTAL</span>
              <span>${data.currency} ${data.total.toFixed(2)}</span>
            </div>
          </div>

          <!-- Columna QR -->
          <div class="qr-column">
            <div class="column-header">Validación</div>
            ${
              data.qrCodeBase64
                ? `
              <div class="qr-code-container">
                <img src="${data.qrCodeBase64}" alt="QR Code" class="qr-code-image">
              </div>
            `
                : ""
            }
            <div class="qr-text">
              <strong>Cotización:</strong> ${data.quotationNumber}<br>
              <strong>Creado por:</strong> ${data.createdBy}<br>
              <small>${currentDate}</small>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="footer">
          <div class="footer-text">Documento generado automáticamente por el sistema de cotizaciones GALUR</div>
          <div class="footer-date">Fecha y hora: ${currentDate}</div>
        </div>
      </div>
    </body>
    </html>
  `
}
