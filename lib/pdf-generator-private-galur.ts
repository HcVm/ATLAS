import type { PrivateQuotationPDFData } from "./pdf-generator-private"
import QRCode from "qrcode"
import { getBankingInfoByCompanyCode } from "./get-banking-info"
import { getStatusLabel, formatDate } from "./pdf-utils"
import { format } from "date-fns"
import { es } from "date-fns/locale"

export const generateGALURQRForQuotation = async (quotationNumber: string): Promise<string> => {
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

export const generateGALURPrivateQuotationHTML = (data: PrivateQuotationPDFData): string => {
  console.log("=== Generando HTML Privado GALUR ===")
  console.log("Datos recibidos para HTML:", data)

  const formattedDate = format(new Date(data.quotationDate), "dd/MM/yyyy", { locale: es })
  const currentDate = format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })

  const colorGaluPrimary = "#1e7a3a"
  const colorGaluSecondary = "#2a9d54"
  const colorGaluAccent = "#fbbf24"
  const colorGaluLight = "#f0fdf4"

  // Obtener información bancaria automáticamente
  if (data.companyCode && !data.bankingInfo) {
    const bankingInfo = getBankingInfoByCompanyCode(data.companyCode)
    if (bankingInfo) {
      data.bankingInfo = bankingInfo
    }
  }

  // Obtener marcas únicas con logos
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
      <title>Cotización Privada ${data.quotationNumber}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Inter', sans-serif;
          font-size: 9px;
          line-height: 1.4;
          color: #1e293b;
          background: white;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        
        .container {
          width: 100%;
          max-width: 190mm;
          margin: 0 auto;
        }

        /* Header con diseño moderno GALUR */
        .header-galur {
          background: linear-gradient(135deg, ${colorGaluPrimary} 0%, ${colorGaluSecondary} 100%);
          color: white;
          padding: 8mm 6mm;
          margin-bottom: 4mm;
          page-break-inside: avoid;
        }

        .header-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 6mm;
          gap: 8mm;
        }

        .company-section {
          display: flex;
          gap: 6mm;
          flex: 1;
        }

        .company-logo-galur {
          width: 35mm;
          height: 25mm;
          background: white;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .company-logo-galur img {
          width: 90%;
          height: 90%;
          object-fit: contain;
        }

        .company-data {
          flex: 1;
        }

        .company-data h1 {
          font-size: 18px;
          font-weight: 800;
          margin-bottom: 2mm;
          letter-spacing: -0.5px;
        }

        .company-data p {
          font-size: 8px;
          margin: 1mm 0;
          opacity: 0.95;
        }

        .header-right {
          background: ${colorGaluAccent};
          color: ${colorGaluPrimary};
          padding: 5mm 8mm;
          border-radius: 3px;
          text-align: center;
          min-width: 45mm;
          flex-shrink: 0;
        }

        .quotation-label {
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 2mm;
        }

        .quotation-number {
          font-size: 20px;
          font-weight: 800;
          margin-bottom: 2mm;
        }

        .quotation-date {
          font-size: 9px;
          margin-bottom: 1mm;
          opacity: 0.9;
        }

        .status-badge {
          display: inline-block;
          background: ${colorGaluPrimary};
          color: white;
          padding: 2px 6px;
          border-radius: 2px;
          font-size: 8px;
          font-weight: 600;
          text-transform: uppercase;
        }

        /* Sección de marcas en horizontal */
        .brands-section {
          background: ${colorGaluLight};
          border-top: 2px solid ${colorGaluSecondary};
          border-bottom: 2px solid ${colorGaluAccent};
          padding: 4mm 6mm;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 8mm;
          flex-wrap: wrap;
          margin-bottom: 4mm;
        }

        .brands-label {
          font-size: 8px;
          font-weight: 700;
          text-transform: uppercase;
          color: ${colorGaluPrimary};
          white-space: nowrap;
        }

        .brand-logo-item {
          height: 12mm;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .brand-logo-item img {
          max-height: 12mm;
          max-width: 25mm;
          object-fit: contain;
        }

        /* Grid de 2 columnas para Cliente y Condiciones */
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4mm;
          margin-bottom: 4mm;
          page-break-inside: avoid;
        }

        .info-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-left: 3px solid ${colorGaluSecondary};
          padding: 4mm;
          border-radius: 2px;
        }

        .info-card-title {
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
          color: ${colorGaluPrimary};
          margin-bottom: 3mm;
          letter-spacing: 0.5px;
        }

        .info-row {
          display: flex;
          margin-bottom: 2mm;
          font-size: 8px;
        }

        .info-label {
          font-weight: 600;
          width: 35%;
          color: ${colorGaluPrimary};
        }

        .info-value {
          flex: 1;
          word-break: break-word;
          color: #374151;
        }

        /* Tabla de productos compacta */
        .products-section {
          margin-bottom: 4mm;
          page-break-inside: avoid;
        }

        .section-header {
          background: ${colorGaluPrimary};
          color: white;
          padding: 3mm 4mm;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 3mm;
          border-radius: 2px;
        }

        .products-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 3mm;
          font-size: 8px;
        }

        .products-table thead {
          background: ${colorGaluLight};
          border-bottom: 2px solid ${colorGaluSecondary};
        }

        .products-table thead th {
          padding: 3mm 2mm;
          text-align: left;
          font-weight: 700;
          color: ${colorGaluPrimary};
          font-size: 7px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .products-table tbody tr {
          border-bottom: 1px solid #e5e7eb;
        }

        .products-table tbody tr:nth-child(even) {
          background: ${colorGaluLight};
        }

        .products-table tbody td {
          padding: 2.5mm 2mm;
          vertical-align: middle;
        }

        .product-number {
          font-weight: 700;
          color: ${colorGaluSecondary};
          text-align: center;
        }

        .product-desc {
          font-weight: 500;
          color: #1e293b;
        }

        .product-price {
          text-align: right;
          font-weight: 600;
          color: ${colorGaluPrimary};
        }

        /* Sección de Totales con diseño destacado */
        .totals-section {
          background: ${colorGaluLight};
          border: 1px solid ${colorGaluSecondary};
          border-radius: 3px;
          padding: 4mm;
          margin-bottom: 4mm;
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 3mm;
          page-break-inside: avoid;
        }

        .total-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 2mm;
        }

        .total-label {
          font-size: 7px;
          text-transform: uppercase;
          font-weight: 700;
          color: ${colorGaluPrimary};
          margin-bottom: 2mm;
          letter-spacing: 0.5px;
        }

        .total-value {
          font-size: 14px;
          font-weight: 800;
          color: ${colorGaluSecondary};
        }

        .total-value.main {
          font-size: 18px;
          color: ${colorGaluPrimary};
          border-top: 2px solid ${colorGaluAccent};
          padding-top: 3mm;
          margin-top: 1mm;
        }

        /* Sección de Información Bancaria */
        .banking-section {
          background: white;
          border: 2px solid ${colorGaluAccent};
          border-radius: 3px;
          padding: 4mm;
          margin-bottom: 4mm;
          page-break-inside: avoid;
        }

        .banking-section h3 {
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
          color: ${colorGaluPrimary};
          margin-bottom: 3mm;
          letter-spacing: 0.5px;
          border-bottom: 1px solid ${colorGaluAccent};
          padding-bottom: 2mm;
        }

        .banking-info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4mm;
        }

        .banking-item {
          font-size: 8px;
        }

        .banking-label {
          font-weight: 600;
          color: ${colorGaluSecondary};
          margin-bottom: 1mm;
        }

        .banking-value {
          font-family: monospace;
          background: ${colorGaluLight};
          padding: 2mm;
          border-radius: 2px;
          color: #1e293b;
          word-break: break-all;
        }

        /* Condiciones en layout diagonal/moderno */
        .conditions-section {
          margin-bottom: 4mm;
          page-break-inside: avoid;
        }

        .conditions-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2mm;
          margin-bottom: 3mm;
        }

        .condition-item {
          background: ${colorGaluLight};
          border-left: 3px solid ${colorGaluAccent};
          padding: 3mm;
          border-radius: 2px;
          font-size: 8px;
          line-height: 1.3;
        }

        .condition-number {
          display: inline-block;
          background: ${colorGaluPrimary};
          color: white;
          width: 5mm;
          height: 5mm;
          border-radius: 50%;
          text-align: center;
          line-height: 5mm;
          font-weight: 700;
          font-size: 7px;
          margin-right: 2mm;
        }

        .condition-text {
          display: inline;
        }

        /* QR y Validación */
        .validation-section {
          background: white;
          border: 1px solid ${colorGaluSecondary};
          border-radius: 3px;
          padding: 4mm;
          display: flex;
          gap: 6mm;
          align-items: center;
          justify-content: center;
          page-break-inside: avoid;
        }

        .qr-container {
          flex-shrink: 0;
        }

        .qr-container img {
          width: 30mm;
          height: 30mm;
        }

        .validation-text {
          flex: 1;
          font-size: 8px;
        }

        .validation-text h4 {
          font-size: 10px;
          font-weight: 700;
          color: ${colorGaluPrimary};
          margin-bottom: 2mm;
        }

        .validation-text p {
          margin: 1mm 0;
          line-height: 1.3;
        }

        /* Footer */
        .footer {
          margin-top: 4mm;
          padding-top: 3mm;
          border-top: 1px solid #e5e7eb;
          font-size: 7px;
          color: #9ca3af;
          text-align: center;
          page-break-inside: avoid;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header Galur -->
        <div class="header-galur">
          <div class="header-top">
            <div class="company-section">
              ${
                data.companyLogoUrl
                  ? `
                <div class="company-logo-galur">
                  <img src="${data.companyLogoUrl}" alt="${data.companyName}">
                </div>
              `
                  : ""
              }
              <div class="company-data">
                <h1>${data.companyName}</h1>
                <p><strong>RUC:</strong> ${data.companyRuc}</p>
                <p><strong>Código:</strong> ${data.companyCode}</p>
                ${data.companyAddress ? `<p><strong>Dirección:</strong> ${data.companyAddress}</p>` : ""}
                ${data.companyEmail ? `<p><strong>Email:</strong> ${data.companyEmail}</p>` : ""}
                ${data.companyPhone ? `<p><strong>Teléfono:</strong> ${data.companyPhone}</p>` : ""}
              </div>
            </div>
            <div class="header-right">
              <div class="quotation-label">Cotización</div>
              <div class="quotation-number">${data.quotationNumber}</div>
              <div class="quotation-date">${formattedDate}</div>
              <div class="status-badge">${getStatusLabel(data.status)}</div>
            </div>
          </div>
        </div>

        <!-- Marcas -->
        ${
          uniqueBrands.length > 0
            ? `
          <div class="brands-section">
            <span class="brands-label">Marcas Disponibles:</span>
            ${uniqueBrands.map((brand) => `<div class="brand-logo-item"><img src="${brand.logoUrl}" alt="${brand.name}"></div>`).join("")}
          </div>
        `
            : ""
        }

        <!-- Info Grid: Cliente + Condiciones de Pago -->
        <div class="info-grid">
          <div class="info-card">
            <div class="info-card-title">Información del Cliente</div>
            <div class="info-row">
              <span class="info-label">Cliente:</span>
              <span class="info-value">${data.clientName}</span>
            </div>
            <div class="info-row">
              <span class="info-label">RUC:</span>
              <span class="info-value">${data.clientRuc}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Atención:</span>
              <span class="info-value">${data.clientAttention}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Dirección:</span>
              <span class="info-value">${addressToDisplay}</span>
            </div>
          </div>

          <div class="info-card">
            <div class="info-card-title">Detalles de Cotización</div>
            <div class="info-row">
              <span class="info-label">Moneda:</span>
              <span class="info-value">${data.currency}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Fecha:</span>
              <span class="info-value">${formattedDate}</span>
            </div>
            ${
              data.validUntil
                ? `
              <div class="info-row">
                <span class="info-label">Válida hasta:</span>
                <span class="info-value">${formatDate(data.validUntil)}</span>
              </div>
            `
                : ""
            }
            <div class="info-row">
              <span class="info-label">Estado:</span>
              <span class="info-value">${getStatusLabel(data.status)}</span>
            </div>
          </div>
        </div>

        <!-- Productos -->
        <div class="products-section">
          <div class="section-header">Detalle de Productos</div>
          <table class="products-table">
            <thead>
              <tr>
                <th style="width: 5%;">#</th>
                <th style="width: 10%;">Código</th>
                <th style="width: 35%;">Descripción</th>
                <th style="width: 12%;">Marca</th>
                <th style="width: 8%;">Cantidad</th>
                <th style="width: 8%;">Unidad</th>
                <th style="width: 11%;">P. Unitario</th>
                <th style="width: 11%;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${data.products
                .map(
                  (product, index) => `
                <tr>
                  <td class="product-number">${index + 1}</td>
                  <td style="font-family: monospace; font-size: 7px;">${product.code || "-"}</td>
                  <td class="product-desc">${product.description}</td>
                  <td style="text-align: center; font-size: 8px;">${product.brand || "-"}</td>
                  <td style="text-align: center; font-weight: 600;">${product.quantity.toLocaleString()}</td>
                  <td style="text-align: center;">${product.unit}</td>
                  <td class="product-price">S/ ${product.unitPrice.toFixed(2)}</td>
                  <td class="product-price" style="font-weight: 700;">S/ ${product.totalPrice.toFixed(2)}</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
        </div>

        <!-- Totales destacados -->
        <div class="totals-section">
          <div class="total-item">
            <div class="total-label">Subtotal</div>
            <div class="total-value">S/ ${data.subtotal.toFixed(2)}</div>
          </div>
          <div class="total-item">
            <div class="total-label">IGV (18%)</div>
            <div class="total-value">S/ ${data.igv.toFixed(2)}</div>
          </div>
          <div class="total-item">
            <div class="total-label">Total</div>
            <div class="total-value main">S/ ${data.total.toFixed(2)}</div>
          </div>
        </div>

        <!-- Información Bancaria -->
        ${
          data.bankingInfo?.bankAccount
            ? `
          <div class="banking-section">
            <h3>Información para Depósito</h3>
            <div class="banking-info-grid">
              <div class="banking-item">
                <div class="banking-label">BANCO:</div>
                <div class="banking-value">${data.bankingInfo.bankAccount.bank}</div>
              </div>
              <div class="banking-item">
                <div class="banking-label">TIPO DE CUENTA:</div>
                <div class="banking-value">${data.bankingInfo.bankAccount.type}</div>
              </div>
              <div class="banking-item">
                <div class="banking-label">NÚMERO DE CUENTA:</div>
                <div class="banking-value">${data.bankingInfo.bankAccount.accountNumber}</div>
              </div>
              <div class="banking-item">
                <div class="banking-label">CCI:</div>
                <div class="banking-value">${data.bankingInfo.bankAccount.cci}</div>
              </div>
              <div class="banking-item" style="grid-column: 1 / -1;">
                <div class="banking-label">DIRECCIÓN FISCAL:</div>
                <div class="banking-value">${data.bankingInfo.fiscalAddress}</div>
              </div>
              <div class="banking-item" style="grid-column: 1 / -1;">
                <div class="banking-label">CONTACTO:</div>
                <div class="banking-value">${data.bankingInfo.contactInfo?.email || ""} | ${data.bankingInfo.contactInfo?.phone || ""}</div>
              </div>
            </div>
          </div>
        `
            : data.companyAccountInfo
              ? `
          <div class="banking-section">
            <h3>Información para Depósito</h3>
            <div class="banking-info-grid">
              <div class="banking-item" style="grid-column: 1 / -1;">
                <div class="banking-label">CUENTA:</div>
                <div class="banking-value">${data.companyAccountInfo}</div>
              </div>
            </div>
          </div>
        `
              : ""
        }

        <!-- Condiciones -->
        <div class="conditions-section">
          <div class="section-header">Condiciones de Venta</div>
          <div class="conditions-grid">
            ${[
              "Plazo de entrega: 07 días hábiles, contados dos días después de verificado la recepción de pago al 100%.",
              "Lugar de entrega: Recojo en almacén de 9.00am-12.00pm / 2pm-5:30pm.",
              "FORMA DE PAGO: Contado.",
              "Validez de esta oferta: Solo por 3 días hábiles.",
              "No hay devolución de dinero, posterior al recojo.",
              "Si el producto presentara fallas por desperfecto de fábrica, se procederá a resolver el reclamo en un plazo máximo de 7 días.",
            ]
              .map(
                (condition, index) => `
              <div class="condition-item">
                <span class="condition-number">${index + 1}</span><span class="condition-text">${condition}</span>
              </div>
            `,
              )
              .join("")}
          </div>
        </div>

        <!-- QR y Validación -->
        <div class="validation-section">
          <div class="qr-container">
            ${data.qrCodeBase64 ? `<img src="${data.qrCodeBase64}" alt="QR Code">` : ""}
          </div>
          <div class="validation-text">
            <h4>Validar Cotización</h4>
            <p>Escanee el código QR con su dispositivo móvil para validar la autenticidad de esta cotización.</p>
            <p><strong>N° Cotización:</strong> ${data.quotationNumber}</p>
            <p><strong>Generada:</strong> ${currentDate}</p>
          </div>
        </div>

        <!-- Footer -->
        <div class="footer">
          <p>Cotización generada automáticamente por ATLAS | ${data.createdBy} | Válida hasta: ${data.validUntil ? formatDate(data.validUntil) : "No especificado"}</p>
        </div>
      </div>
    </body>
    </html>
  `
}
