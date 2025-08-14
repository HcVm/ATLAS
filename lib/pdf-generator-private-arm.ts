import { format } from "date-fns"
import { es } from "date-fns/locale"
import { getBankingInfoByCompanyCode, type BankingInfo } from "./company-banking-info"
import QRCode from "qrcode"

export interface ARMPrivateQuotationPDFData {
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
  clientAddress: string // Dirección de entrega
  clientFiscalAddress?: string // Nueva dirección fiscal
  clientDepartment?: string
  clientEmail: string
  contactPerson: string

  // Productos con información de marca
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

  // Totales
  subtotal: number
  igv: number
  total: number

  // Creado por
  createdBy: string
  qrCodeBase64?: string // Añadido para pasar el QR al HTML
}

export const generateQRForQuotation = async (
  quotationNumber: string,
  data: ARMPrivateQuotationPDFData,
): Promise<string> => {
  try {
    console.log("🔐 Creando validación ARM a través de API...")

    // Llamar al endpoint de validación
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

    console.log("✅ Validación ARM creada:", validationHash.substring(0, 16) + "...")
    console.log("🔗 URL de validación:", validationUrl)

    // Generar QR usando la misma configuración que funciona en documentos
    console.log("📱 Generando código QR...")
    const qrCodeDataUrl = await QRCode.toDataURL(validationUrl, {
      width: 256,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    })

    console.log("✅ QR Code ARM generado exitosamente")
    return qrCodeDataUrl
  } catch (error) {
    console.error("Error generating ARM QR code:", error)
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

// Esta función ahora solo genera el HTML
export const generateARMPrivateQuotationHTML = (data: ARMPrivateQuotationPDFData): string => {
  console.log("=== Generando HTML ARM Privado ===")
  console.log("Datos recibidos para HTML:", data)

  const formattedDate = format(new Date(data.quotationDate), "dd/MM/yyyy", { locale: es })
  const currentDate = format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })

  // Obtener información bancaria automáticamente si tenemos el código de empresa
  if (data.companyCode && !data.bankingInfo) {
    const bankingInfo = getBankingInfoByCompanyCode(data.companyCode)
    if (bankingInfo) {
      data.bankingInfo = bankingInfo
    }
    console.log("✅ Banking info obtained for ARM company:", data.companyCode, data.bankingInfo)
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
      <title>Cotización ARM Privada ${data.quotationNumber}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        
        @page {
          /* Remove size and margin for continuous flow, or keep if you want to define a "virtual" page size */
          /* size: A4; */
          /* margin: 5mm; */
        }
        
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
          max-width: 200mm; /* Keep max-width for layout, but allow height to grow */
          margin: 0 auto;
          background: white;
          position: relative;
          /* min-height: 287mm; REMOVED TO ALLOW CONTENT TO FLOW */
        }

        /* Header como tabla única - Usando colores del entity ARM */
        .header-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 4mm;
          page-break-inside: avoid; /* Keep header together */
          height: 25mm;
        }

        .header-table td {
          vertical-align: middle;
          padding: 3mm;
          border: none;
          height: 25mm;
        }

        .logo-cell {
          width: 25%;
          text-align: center;
          background: white;
          border: 2px solid #dc2626;
          border-radius: 4mm;
          position: relative;
        }

        .company-logo-header {
          width: 100%;
          max-width: 80px;
          height: auto;
          object-fit: contain;
          margin-bottom: 1mm;
        }

        .logo-text-header {
          font-size: 7px;
          font-weight: 700;
          color: #dc2626;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .company-cell {
          width: 50%;
          background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
          color: white;
          border-radius: 4mm;
          text-align: center;
          position: relative;
          overflow: hidden;
        }

        .company-cell::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="rgba(255,255,255,0.1)"/><circle cx="75" cy="75" r="1" fill="rgba(255,255,255,0.1)"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
          opacity: 0.3;
        }

        .company-name-header {
          font-size: 14px;
          font-weight: 900;
          margin-bottom: 1mm;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
          position: relative;
          z-index: 1;
        }

        .company-ruc-header {
          font-size: 10px;
          opacity: 0.9;
          position: relative;
          z-index: 1;
        }

        .company-ruc-header::before {
          content: '▶ ';
          color: rgba(255,255,255,0.7);
          font-size: 7px;
        }

        .quotation-cell {
          width: 25%;
          text-align: center;
          background: white;
          border: 2px solid #dc2626;
          border-radius: 4mm;
        }

        .quotation-badge-header {
          background: linear-gradient(135deg, #dc2626, #b91c1c);
          color: white;
          padding: 1mm 2mm;
          border-radius: 12px;
          font-size: 8px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          margin-bottom: 1mm;
          display: inline-block;
        }

        .quotation-number-header {
          font-size: 13px;
          font-weight: 900;
          color: #dc2626;
          margin-bottom: 1mm;
        }

        .quotation-date-header {
          font-size: 8px;
          color: #666;
          margin-bottom: 1mm;
        }

        .status-badge-header {
          background: #f59e0b;
          color: white;
          padding: 1mm 2mm;
          border-radius: 8px;
          font-size: 7px;
          font-weight: 600;
          display: inline-block;
        }

        /* Brands section - Usando colores del entity ARM */
        .brands-showcase {
          background: linear-gradient(135deg, #fafafa 0%, #f0f0f0 100%);
          border: 1px solid #e5e5e5;
          border-radius: 3mm;
          padding: 3mm;
          margin-bottom: 4mm;
          page-break-inside: avoid; /* Keep brands together */
        }

        .brands-title {
          text-align: center;
          font-size: 10px;
          font-weight: 700;
          color: #1a1a1a;
          margin-bottom: 2mm;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .brands-horizontal-grid {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 4mm;
          flex-wrap: wrap;
        }

        .brand-item-horizontal {
          display: flex;
          flex-direction: column;
          align-items: center;
          background: white;
          padding: 2mm;
          border-radius: 2mm;
          box-shadow: 0 1mm 2mm rgba(0,0,0,0.1);
          min-width: 60px;
        }

        .brand-logo-horizontal {
          width: 60px;
          height: 45px;
          object-fit: contain;
          margin-bottom: 1mm;
        }

        .brand-name-horizontal {
          font-size: 7px;
          font-weight: 600;
          color: #1a1a1a;
          text-align: center;
        }

        /* Cliente y Condiciones - Usando colores del entity ARM */
        .client-conditions-combined {
          background: white;
          border: 1px solid #e5e5e5;
          border-radius: 3mm;
          margin-bottom: 4mm;
          overflow: hidden;
          page-break-inside: avoid; /* Keep client and conditions together */
          box-shadow: 0 1mm 2mm rgba(0,0,0,0.05);
        }

        .combined-header {
          background: #fafafa;
          color: #1a1a1a;
          padding: 2mm 3mm;
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          text-align: center;
          border-bottom: 1px solid #e5e5e5;
        }

        .combined-content {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0;
        }

        .client-side {
          padding: 3mm;
          background: white;
          border-right: 1px solid #f0f0f0;
        }

        .conditions-side {
          padding: 3mm;
          background: white;
        }

        .side-title {
          font-size: 9px;
          font-weight: 600;
          color: #666;
          margin-bottom: 2mm;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding-bottom: 1mm;
          border-bottom: 1px solid #f0f0f0;
        }

        .client-info-compact {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.5mm;
        }

        .client-field-compact {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5mm 0;
          border-bottom: 1px solid #fafafa;
        }

        .client-field-compact:last-child {
          border-bottom: none;
        }

        .client-label-compact {
          font-size: 7px;
          font-weight: 500;
          color: #999;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .client-value-compact {
          font-size: 8px;
          font-weight: 600;
          color: #1a1a1a;
          text-align: right;
        }

        .conditions-compact {
          display: flex;
          flex-direction: column;
          gap: 1.5mm;
        }

        .condition-item-compact {
          display: flex;
          align-items: flex-start;
          gap: 2mm;
          padding: 1.5mm 0;
          border-bottom: 1px solid #fafafa;
        }

        .condition-item-compact:last-child {
          border-bottom: none;
        }

        .condition-number-compact {
          background: #666;
          color: white;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 6px;
          flex-shrink: 0;
        }

        .condition-text-compact {
          font-size: 7px;
          line-height: 1.3;
          color: #666;
        }

        /* Products table - Usando colores del entity ARM */
        .products-section {
          margin-bottom: 4mm;
        }

        .section-header {
          background: linear-gradient(90deg, #dc2626, #ef4444);
          color: white;
          padding: 2mm 3mm;
          border-radius: 15px 15px 0 0;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .products-table-container {
          background: white;
          border: 2px solid #dc2626;
          border-top: none;
          border-radius: 0 0 3mm 3mm;
          overflow: hidden;
        }

        .products-table {
          width: 100%;
          border-collapse: collapse;
        }

        .products-table thead {
          background: linear-gradient(135deg, #1a1a1a 0%, #333 100%);
        }

        .products-table th {
          color: white;
          padding: 2mm 1.5mm;
          font-weight: 600;
          text-align: center;
          font-size: 8px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          border-right: 1px solid rgba(255,255,255,0.2);
        }

        .products-table th:last-child {
          border-right: none;
        }

        .products-table td {
          padding: 2mm 1.5mm;
          border-bottom: 1px solid #f0f0f0;
          font-size: 8px;
          vertical-align: middle;
        }

        .products-table tbody tr:nth-child(odd) {
          background: #fefefe;
        }

        .products-table tbody tr:nth-child(even) {
          background: #fafafa;
        }

        .product-index {
          background: #1a1a1a;
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
          line-height: 1.2;
        }

        .product-code-display {
          background: #1a1a1a;
          color: white;
          padding: 0.5mm 1.5mm;
          border-radius: 2mm;
          font-size: 8px;
          font-family: 'Courier New', monospace;
          display: inline-block;
          margin-top: 1mm;
        }

        .quantity-display {
          background: linear-gradient(135deg, #dc2626, #b91c1c);
          color: white;
          padding: 1.5mm;
          border-radius: 2mm;
          font-weight: 800;
          text-align: center;
          font-size: 9px;
        }

        .unit-display {
          background: #f0f0f0;
          color: #1a1a1a;
          padding: 1mm 1.5mm;
          border-radius: 2mm;
          font-weight: 600;
          text-align: center;
          font-size: 8px;
        }

        .brand-display {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1mm;
        }

        .brand-logo-table {
          width: 30px;
          height: 20px;
          object-fit: contain;
        }

        .brand-name-table {
          font-size: 6px;
          font-weight: 600;
          color: #1a1a1a;
          text-align: center;
        }

        .price-display {
          text-align: right;
          font-weight: 700;
          color: #059669;
          font-size: 8px;
        }

        .total-display {
          text-align: right;
          background: linear-gradient(135deg, #dc2626, #b91c1c);
          color: white;
          padding: 1.5mm;
          border-radius: 2mm;
          font-weight: 800;
          font-size: 8px;
        }

        /* Financial summary - Usando colores del entity ARM */
        .financial-summary-section {
          background: white;
          border: 1px solid #e5e5e5;
          border-radius: 3mm;
          margin-bottom: 4mm;
          overflow: hidden;
          page-break-inside: avoid; /* Keep financial summary together */
          box-shadow: 0 1mm 2mm rgba(0,0,0,0.05);
        }

        .financial-summary-content {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 0;
        }

        .banking-column {
          padding: 3mm;
          background: white;
          border-right: 1px solid #f0f0f0;
        }

        .totals-column {
          padding: 3mm;
          background: white;
          border-right: 1px solid #f0f0f0;
        }

        .qr-column {
          padding: 3mm;
          background: white;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .column-title {
          font-size: 8px;
          font-weight: 600;
          color: #666;
          margin-bottom: 2mm;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          text-align: center;
          padding-bottom: 1mm;
          border-bottom: 1px solid #f0f0f0;
        }

        .banking-item-inline {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5mm;
          padding: 1mm 0;
          border-bottom: 1px solid #fafafa;
        }

        .banking-item-inline:last-child {
          border-bottom: none;
          margin-bottom: 0;
        }

        .banking-label-inline {
          font-size: 7px;
          color: #999;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .banking-value-inline {
          font-size: 8px;
          color: #1a1a1a;
          font-weight: 600;
          font-family: 'Courier New', monospace;
        }

        .total-line-inline {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5mm 0;
          margin-bottom: 1mm;
          border-bottom: 1px solid #fafafa;
          font-size: 8px;
          color: #666;
        }

        .total-line-inline:last-child {
          border-bottom: none;
        }

        .total-line-inline.final {
          background: #1a1a1a;
          color: white;
          font-weight: 700;
          font-size: 10px;
          margin: 2mm -3mm -3mm -3mm;
          padding: 2mm 3mm;
          border-radius: 0 0 3mm 3mm;
        }

        .qr-container-inline {
          background: #fafafa;
          padding: 2mm;
          border-radius: 2mm;
          margin-bottom: 2mm;
          border: 1px solid #f0f0f0;
        }

        .qr-image-inline {
          width: 20mm;
          height: 20mm;
          object-fit: contain;
        }

        .validation-info-inline {
          font-size: 7px;
          color: #666;
          line-height: 1.2;
        }

        .validation-info-inline p {
          margin-bottom: 0.5mm;
        }

        .validation-info-inline strong {
          color: #1a1a1a;
        }

        /* Observations */
        .observations-section {
          background: linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%);
          border: 2px solid #8b5cf6;
          border-radius: 3mm;
          margin-bottom: 4mm;
          overflow: hidden;
        }

        .observations-content {
          padding: 3mm;
          background: white;
        }

        .observations-text {
          font-size: 8px;
          line-height: 1.4;
          color: #1a1a1a;
          text-align: justify;
        }

        /* Footer - Usando colores del entity ARM */
        .document-footer {
          background: linear-gradient(135deg, #1a1a1a 0%, #333 100%);
          color: white;
          border-radius: 3mm;
          padding: 3mm;
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          gap: 3mm;
          align-items: center;
          page-break-inside: avoid; /* Keep footer together */
          position: relative;
          overflow: hidden;
          margin-top: auto;
        }

        .document-footer::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #dc2626, #f59e0b, #10b981, #3b82f6);
        }

        .footer-left {
          padding-top: 1mm;
        }

        .footer-center {
          text-align: center;
          padding-top: 1mm;
        }

        .footer-right {
          text-align: right;
          padding-top: 1mm;
        }

        .footer-logo {
          width: 60px;
          height: 45px;
          object-fit: contain;
          opacity: 0.8;
        }

        .footer-text {
          font-size: 7px;
          color: #ccc;
          margin: 0.5mm 0;
        }

        .footer-signature {
          font-size: 8px;
          font-weight: 600;
          color: white;
        }

        /* Remove print media queries if you truly want no pagination */
        /* @media print {
          .document-container {
            max-width: none;
            min-height: auto;
          }
          
          .header-table {
            margin-bottom: 3mm;
          }
          
          .client-conditions-combined,
          .products-section,
          .financial-summary-section {
            margin-bottom: 3mm;
          }
          
          .brands-showcase {
            margin-bottom: 3mm;
          }
        } */
      </style>
    </head>
    <body>
      <div class="document-container">
        <!-- Header como tabla única -->
        <table class="header-table">
          <tr>
            <!-- Logo Cell -->
            <td class="logo-cell">
              ${
                data.companyLogoUrl
                  ? `<img src="${data.companyLogoUrl}" alt="${data.companyName}" class="company-logo-header">`
                  : ""
              }
              <div class="logo-text-header">ARM CORPORATIONS</div>
            </td>

            <!-- Company Cell -->
            <td class="company-cell">
              <div class="company-name-header">${data.companyName}</div>
              <div class="company-ruc-header">RUC: ${data.companyRuc}</div>
            </td>

            <!-- Quotation Cell -->
            <td class="quotation-cell">
              <div class="quotation-badge-header">Cotización Comercial</div>
              <div class="quotation-number-header">N° ${data.quotationNumber}</div>
              <div class="quotation-date-header">${formattedDate}</div>
              <div class="status-badge-header">${getStatusLabel(data.status)}</div>
            </td>
          </tr>
        </table>

        <!-- Brands Showcase - Horizontal -->
        ${
          uniqueBrands.length > 0
            ? `
          <div class="brands-showcase">
            <div class="brands-title">Marcas Representadas</div>
            <div class="brands-horizontal-grid">
              ${uniqueBrands
                .map(
                  ({ name, logoUrl }) => `
                <div class="brand-item-horizontal">
                  <img src="${logoUrl}" alt="${name}" class="brand-logo-horizontal" onerror="this.style.display='none'">
                  <div class="brand-name-horizontal">${name}</div>
                </div>
              `,
                )
                .join("")}
            </div>
          </div>
        `
            : ""
        }

        <!-- Cliente y Condiciones COMBINADOS -->
        <div class="client-conditions-combined">
          <div class="combined-header">Información del Cliente y Condiciones de Venta</div>
          <div class="combined-content">
            <!-- Lado del Cliente -->
            <div class="client-side">
              <div class="side-title">Datos del Cliente</div>
              <div class="client-info-compact">
                <div class="client-field-compact">
                  <span class="client-label-compact">Código:</span>
                  <span class="client-value-compact">${data.clientCode}</span>
                </div>
                <div class="client-field-compact">
                  <span class="client-label-compact">Razón Social:</span>
                  <span class="client-value-compact">${data.clientName}</span>
                </div>
                <div class="client-field-compact">
                  <span class="client-label-compact">RUC:</span>
                  <span class="client-value-compact">${data.clientRuc}</span>
                </div>
                <div class="client-field-compact">
                  <span class="client-label-compact">Dirección Fiscal:</span>
                  <span class="client-value-compact">${addressToDisplay}</span>
                </div>
                <div class="client-field-compact">
                  <span class="client-label-compact">Correo:</span>
                  <span class="client-value-compact">${data.clientEmail}</span>
                </div>
                <div class="client-field-compact">
                  <span class="client-label-compact">Persona de Contacto:</span>
                  <span class="client-value-compact">${data.contactPerson}</span>
                </div>
              </div>
            </div>

            <!-- Lado de las Condiciones -->
            <div class="conditions-side">
              <div class="side-title">Condiciones de Venta</div>
              <div class="conditions-compact">
                ${[
                  "Plazo: 07 días hábiles después del pago",
                  "Entrega: Recojo en almacén 9am-12pm / 2pm-5:30pm",
                  "Pago: Contado al 100%",
                  "Validez: Solo por 3 días hábiles",
                  "Sin devolución posterior al recojo",
                  "Garantía por defecto de fábrica: 7 días",
                  "Verificar producto antes del retiro",
                ]
                  .map(
                    (condition, index) => `
                  <div class="condition-item-compact">
                    <div class="condition-number-compact">${index + 1}</div>
                    <div class="condition-text-compact">${condition}</div>
                  </div>
                `,
                  )
                  .join("")}
              </div>
            </div>
          </div>
        </div>

        <!-- Products Table -->
        <div class="products-section">
          <div class="section-header">Detalle de Productos y Servicios</div>
          <div class="products-table-container">
            <table class="products-table">
              <thead>
                <tr>
                  <th style="width: 5%;">#</th>
                  <th style="width: 35%;">Descripción</th>
                  <th style="width: 8%;">Cant.</th>
                  <th style="width: 8%;">Unid.</th>
                  <th style="width: 12%;">Marca</th>
                  <th style="width: 12%;">P. Unit.</th>
                  <th style="width: 12%;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${data.products
                  .map(
                    (product, index) => `
                  <tr>
                    <td style="text-align: center;">
                      <div class="product-index">${index + 1}</div>
                    </td>
                    <td>
                      <div class="product-description-cell">${product.description}</div>
                      ${product.code ? `<div class="product-code-display">${product.code}</div>` : ""}
                    </td>
                    <td style="text-align: center;">
                      <div class="quantity-display">${product.quantity}</div>
                    </td>
                    <td style="text-align: center;">
                      <div class="unit-display">${product.unit}</div>
                    </td>
                    <td style="text-align: center;">
                      ${
                        product.brand && product.brandLogoUrl
                          ? `
                        <div class="brand-display">
                          <img src="${product.brandLogoUrl}" alt="${product.brand}" class="brand-logo-table" />
                          <div class="brand-name-table">${product.brand}</div>
                        </div>
                      `
                          : product.brand
                            ? `<div class="brand-name-table">${product.brand}</div>`
                            : "—"
                      }
                    </td>
                    <td class="price-display">S/ ${product.unitPrice.toFixed(4)}</td>
                    <td style="text-align: center;">
                      <div class="total-display">S/ ${product.totalPrice.toFixed(2)}</div>
                    </td>
                  </tr>
                `,
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Banking, Totals y QR TODO JUNTO -->
        <div class="financial-summary-section">
          <div class="combined-header">Resumen Financiero, Información Bancaria y Validación</div>
          <div class="financial-summary-content">
            <!-- Columna Banking -->
            <div class="banking-column">
              <div class="column-title">Información Bancaria</div>
              ${
                data.bankingInfo?.bankAccount
                  ? `
                <div class="banking-item-inline">
                  <span class="banking-label-inline">Empresa:</span>
                  <span class="banking-value-inline">${data.companyName}</span>
                </div>
                <div class="banking-item-inline">
                  <span class="banking-label-inline">Banco:</span>
                  <span class="banking-value-inline">${data.bankingInfo.bankAccount.bank}</span>
                </div>
                <div class="banking-item-inline">
                  <span class="banking-label-inline">Tipo:</span>
                  <span class="banking-value-inline">${data.bankingInfo.bankAccount.type}</span>
                </div>
                <div class="banking-item-inline">
                  <span class="banking-label-inline">Cuenta:</span>
                  <span class="banking-value-inline">${data.bankingInfo.bankAccount.accountNumber}</span>
                </div>
                <div class="banking-item-inline">
                  <span class="banking-label-inline">CCI:</span>
                  <span class="banking-value-inline">${data.bankingInfo.bankAccount.cci}</span>
                </div>
              `
                  : data.companyAccountInfo
                    ? `
                <div class="banking-item-inline">
                  <span class="banking-label-inline">Cuenta:</span>
                  <span class="banking-value-inline">${data.companyAccountInfo}</span>
                </div>
              `
                    : ""
              }
            </div>

            <!-- Columna Totales -->
            <div class="totals-column">
              <div class="column-title">Resumen Financiero</div>
              <div class="total-line-inline">
                <span>Subtotal:</span>
                <span>S/ ${data.subtotal.toFixed(2)}</span>
              </div>
              <div class="total-line-inline">
                <span>IGV (18%):</span>
                <span>S/ ${data.igv.toFixed(2)}</span>
              </div>
              <div class="total-line-inline final">
                <span>TOTAL:</span>
                <span>S/ ${data.total.toFixed(2)}</span>
              </div>
            </div>

            <!-- Columna QR -->
            <div class="qr-column">
              <div class="column-title">Validación</div>
              <div class="qr-container-inline">
                ${data.qrCodeBase64 ? `<img src="${data.qrCodeBase64}" alt="QR Code" class="qr-image-inline">` : ""}
              </div>
              <div class="validation-info-inline">
                <p><strong>Escanee para validar</strong></p>
                <p>Código: ${data.quotationNumber}</p>
                <p>Generado: ${currentDate}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="document-footer">
          <div class="footer-left">
            <div class="footer-text">ARM Corporations S.A.C.</div>
            <div class="footer-text">RUC: ${data.companyRuc}</div>
            <div class="footer-text">Tel: ${data.companyPhone}</div>
            <div class="footer-text">Email: ${data.companyEmail}</div>

          </div>
          
          <div class="footer-center">
            ${data.companyLogoUrl ? `<img src="${data.companyLogoUrl}" alt="ARM Logo" class="footer-logo">` : ""}
          </div>
          
          <div class="footer-right">
            <div class="footer-signature">${data.createdBy}</div>
            <div class="footer-text">Generado: ${currentDate}</div>
            <div class="footer-text">Estado: ${getStatusLabel(data.status)}</div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `
}
