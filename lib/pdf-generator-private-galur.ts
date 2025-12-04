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
  clientFiscalAddress?: string
  clientDepartment?: string
  clientEmail?: string
  contactPerson?: string

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
  qrCodeBase64?: string
}

export const generateQRForGALURQuotation = async (
  quotationNumber: string,
  data: GALURPrivateQuotationPDFData,
): Promise<string> => {
  try {
    console.log("🔐 Creando validación GALUR a través de API...")

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

    console.log("✅ Validación GALUR creada:", validationHash.substring(0, 16) + "...")
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

// Función principal para generar el HTML
export const generateGALURPrivateQuotationHTML = (data: GALURPrivateQuotationPDFData): string => {
  console.log("Generando HTML Cotización GALUR - Diseño Premium 2025")

  const formattedDate = format(new Date(data.quotationDate), "dd 'de' MMMM 'de' yyyy", { locale: es })
  const validUntil = data.validUntil ? format(new Date(data.validUntil), "dd/MM/yyyy", { locale: es }) : "15 días"
  const currentDateTime = format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })

  // Banking info
  if (data.companyCode && !data.bankingInfo) {
    const bankingInfo = getBankingInfoByCompanyCode(data.companyCode)
    if (bankingInfo) data.bankingInfo = bankingInfo
  }

  // Marcas únicas
  const uniqueBrands = data.products
    .filter(p => p.brand && p.brandLogoUrl)
    .reduce((acc: Array<{name: string, logoUrl: string}>, p) => {
      if (!acc.find(b => b.name === p.brand)) acc.push({ name: p.brand!, logoUrl: p.brandLogoUrl! })
      return acc
    }, [])

  const currency = data.currency === "USD" ? "USD" : "PEN"
  const symbol = currency === "USD" ? "$" : "S/"

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cotización ${data.quotationNumber} - ${data.companyName}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #0f172a;      /* azul oscuro elegante */
      --accent: #c19a6b;        /* dorado sutil premium */
      --gray-100: #f8fafc;
      --gray-200: #e2e8f0;
      --gray-600: #475569;
      --gray-800: #1e293b;
      --success: #059669;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', sans-serif;
      background: white;
      color: var(--gray-800);
      line-height: 1.5;
      font-size: 10px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .container {
      max-width: 210mm;
      margin: 0 auto;
      padding: 15mm 12mm;
      background: white;
    }

    /* Header moderno
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 10mm;
      padding-bottom: 8mm;
      border-bottom: 3px solid var(--accent);
      position: relative;
    }

    .logo {
      max-width: 140px;
      max-height: 80px;
      object-fit: contain;
    }

    .company-info h1 {
      font-size: 24px;
      font-weight: 800;
      color: var(--primary);
      margin-bottom: 4px;
    }

    .company-info p {
      font-size: 11px;
      color: var(--gray-600);
      margin-bottom: 2px;
    }

    .ruc-badge {
      background: var(--primary);
      color: white;
      padding: 4px 12px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 11px;
      display: inline-block;
      margin-top: 6px;
    }

    .quotation-badge {
      background: var(--accent);
      color: white;
      text-align: center;
      padding: 12px 20px;
      border-radius: 12px;
      box-shadow: 0 8px 20px rgba(193,154,107,0.25);
    }

    .quotation-badge h2 {
      font-size: 22px;
      font-weight: 800;
      margin-bottom: 4px;
    }

    .quotation-badge p {
      font-size: 11px;
      opacity: 0.9;
    }

    .status {
      background: #fef3c7;
      color: #92400e;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 10px;
      font-weight: 600;
      margin-top: 6px;
      display: inline-block;
    }

    Marcas
    .brands {
      display: flex;
      justify-content: center;
      flex-wrap: wrap;
      gap: 20px;
      padding: 12px 0;
      margin: 12px 0;
      background: var(--gray-100);
      border-radius: 12px;
    }

    .brand {
      text-align: center;
      padding: 8px;
      background: white;
      border-radius: 10px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }

    .brand img {
      height: 40px;
      object-fit: contain;
      filter: grayscale(0%) contrast(1.1);
    }

    .brand p {
      margin-top: 6px;
      font-size: 9px;
      font-weight: 600;
      color: var(--gray-600);
    }

    Grid superior
    .info-grid {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 16px;
      margin-bottom: 16px;
    }

    .card {
      background: white;
      border: 1px solid var(--gray-200);
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 10px rgba(0,0,0,0.05);
    }

    .card-header {
      background: var(--primary);
      color: white;
      padding: 10px 16px;
      font-weight: 600;
      font-size: 12px;
      letter-spacing: 0.5px;
    }

    .card-body {
      padding: 14px 16px;
    }

    .row {
      display: flex;
      justify-content: space-between;
      padding: 7px 0;
      border-bottom: 1px solid var(--gray-200);
    }

    .row:last-child { border-bottom: none; }

    .label {
      color: var(--gray-600);
      font-size: 10px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .value {
      font-weight: 600;
      color: var(--primary);
      text-align: right;
      max-width: 65%;
      word-break: break-word;
    }

    Tabla productos
    .table-container {
      margin: 20px 0;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
      border: 1px solid var(--gray-200);
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    thead {
      background: var(--primary);
      color: white;
    }

    th {
      padding: 12px 10px;
      font-weight: 600;
      font-size: 10px;
      text-align: left;
    }

    th:nth-child(1) { width: 5%; text-align: center; }
    th:nth-child(2) { width: 38%; }
    th:nth-child(3) { width: 9%; text-align: center; }
    th:nth-child(4) { width: 9%; text-align: center; }
    th:nth-child(5) { width: 12%; text-align: center; }
    th:nth-child(6) { width: 12%; text-align: right; }
    th:nth-child(7) { width: 15%; text-align: right; }

    td {
      padding: 12px 10px;
      border-bottom: 1px solid var(--gray-200);
      vertical-align: middle;
    }

    tbody tr:hover {
      background: var(--gray-100);
    }

    .item-number {
      background: var(--accent);
      color: white;
      width: 26px;
      height: 26px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 11px;
      margin: 0 auto;
    }

    .price {
      text-align: right;
      font-weight: 600;
      color: var(--primary);
    }

    .total-price {
      background: var(--accent);
      color: white;
      padding: 6px 12px;
      border-radius: 8px;
      font-weight: 700;
      text-align: center;
    }

    Footer 3 columnas
    .footer-grid {
      display: grid;
      grid-template-columns: 1.2fr 1fr 0.8fr;
      gap: 16px;
      margin-top: 20px;
    }

    .total-card .card-header {
      background: var(--accent);
    }

    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      font-size: 11px;
    }

    .total-final {
      background: var(--primary);
      color: white;
      padding: 14px 16px;
      margin: 12px -16px -16px;
      font-size: 16px;
      font-weight: 800;
      border-radius: 0 0 12px 12px;
    }

    .qr-box {
      text-align: center;
      padding: 16px;
      background: var(--gray-100);
      border-radius: 12px;
    }

    .qr-box img {
      width: 80px;
      height: 80px;
      padding: 8px;
      background: white;
      border-radius: 10px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    .qr-box p {
      margin-top: 10px;
      font-size: 10px;
      color: var(--gray-600);
    }

    Footer final
    .final-footer {
      margin-top: 20px;
      padding-top: 16px;
      border-top: 2px solid var(--accent);
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: var(--gray-600);
    }

    .final-footer strong {
      color: var(--primary);
    }
  </style>
</head>
<body>
  <div class="container">

    <!-- Header Premium -->
    <div class="header">
      <div>
        ${data.companyLogoUrl 
          ? `<img src="${data.companyLogoUrl}" alt="Logo" class="logo">`
          : `<h1 style="color:var(--accent);font-size:32px;">GALUR</h1>`
        }
        <div class="company-info">
          <h1>${data.companyName}</h1>
          <p>${data.companyAddress || ''}</p>
          <p>${data.companyPhone || ''} • ${data.companyEmail || ''}</p>
          <span class="ruc-badge">RUC ${data.companyRuc}</span>
        </div>
      </div>

      <div class="quotation-badge">
        <h2>${data.quotationNumber}</h2>
        <p>COTIZACIÓN PRIVADA</p>
        <p>${formattedDate}</p>
        <div class="status">${getStatusLabel(data.status)}</div>
      </div>
    </div>

    <!-- Marcas representadas -->
    ${uniqueBrands.length > 0 ? `
      <div class="brands">
        ${uniqueBrands.map(b => `
          <div class="brand">
            <img src="${b.logoUrl}" alt="${b.name}">
            <p>${b.name}</p>
          </div>
        `).join('')}
      </div>
    ` : ''}

    <!-- Información cliente y condiciones -->
    <div class="info-grid">
      <div class="card">
        <div class="card-header">Cliente</div>
        <div class="card-body">
          <div class="row"><span class="label">Razón Social</span><span class="value">${data.clientName}</span></div>
          <div class="row"><span class="label">RUC</span><span class="value">${data.clientRuc}</span></div>
          <div class="row"><span class="label">Código</span><span class="value">${data.clientCode}</span></div>
          <div class="row"><span class="label">Dirección</span><span class="value">${data.clientFiscalAddress || data.clientAddress}</span></div>
          ${data.contactPerson ? `<div class="row"><span class="label">Atención</span><span class="value">${data.contactPerson}</span></div>` : ''}
          ${data.clientEmail ? `<div class="row"><span class="label">Email</span><span class="value">${data.clientEmail}</span></div>` : ''}
        </div>
      </div>

      <div class="card">
        <div class="card-header" style="background:var(--accent);">Condiciones Comerciales</div>
        <div class="card-body">
          <div class="row"><span class="label">Moneda</span><span class="value">${currency === 'USD' ? 'Dólares Americanos' : 'Soles'}</span></div>
          <div class="row"><span class="label">IGV</span><span class="value">Incluido</span></div>
          <div class="row"><span class="label">Validez</span><span class="value">${validUntil ? formatDate(data.validUntil) : '15 días'}</span></div>
          <div class="row"><span class="label">Entrega</span><span class="value">Según coordinación</span></div>
          <div class="row"><span class="label">Stock</span><span class="value">Sujeto a disponibilidad</span></div>
        </div>
      </div>
    </div>

    <!-- Tabla de productos -->
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>DESCRIPCIÓN DEL PRODUCTO</th>
            <th>CANT.</th>
            <th>UNID.</th>
            <th>MARCA</th>
            <th>P. UNIT.</th>
            <th>P. TOTAL</th>
          </tr>
        </thead>
        <tbody>
          ${data.products.map((p, i) => `
            <tr>
              <td><div class="item-number">${i + 1}</div></td>
              <td>
                <strong>${p.description}</strong>
                ${p.code ? `<br><small style="color:var(--accent);font-family:monospace;">${p.code}</small>` : ''}
              </td>
              <td style="text-align:center;font-weight:600;">${p.quantity}</td>
              <td style="text-align:center;">${p.unit}</td>
              <td style="text-align:center;">
                ${p.brandLogoUrl ? `<img src="${p.brandLogoUrl}" style="height:28px;object-fit:contain;">` : (p.brand || '-')}
              </td>
              <td class="price">${symbol} ${p.unitPrice.toFixed(2)}</td>
              <td><div class="total-price">${symbol} ${p.totalPrice.toFixed(2)}</div></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <!-- Footer: Bancos, Totales, QR -->
    <div class="footer-grid">
      <div class="card">
        <div class="card-header">Datos Bancarios</div>
        <div class="card-body">
          ${data.bankingInfo?.bankAccount ? `
            <div class="row"><span class="label">Banco</span><span class="value">${data.bankingInfo.bankAccount.bank}</span></div>
            <div class="row"><span class="label">Cuenta ${data.bankingInfo.bankAccount.type}</span><span class="value" style="font-family:monospace;">${data.bankingInfo.bankAccount.accountNumber}</span></div>
            <div class="row"><span class="label">CCI</span><span class="value" style="font-family:monospace;">${data.bankingInfo.bankAccount.cci}</span></div>
            ${data.bankingInfo.detractionAccount ? `
              <div class="row" style="margin-top:8px;padding-top:8px;border-top:1px solid #ddd;">
                <span class="label">Cta. Detracción</span>
                <span class="value" style="font-family:monospace;">${data.bankingInfo.detractionAccount.accountNumber}</span>
              </div>
            ` : ''}
          ` : '<p style="color:var(--gray-600);">No hay datos bancarios registrados</p>'}
        </div>
      </div>

      <div class="card total-card">
        <div class="card-header">Resumen de Importes</div>
        <div class="card-body">
          <div class="total-row"><span>Subtotal</span><span>${symbol} ${data.subtotal.toFixed(2)}</span></div>
          <div class="total-row"><span>IGV 18%</span><span>${symbol} ${data.igv.toFixed(2)}</span></div>
          <div class="total-final">
            <span>TOTAL A PAGAR</span>
            <span>${symbol} ${data.total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div class="qr-box">
        ${data.qrCodeBase64 
          ? `<img src="${data.qrCodeBase64}" alt="QR Verificación">`
          : `<div style="width:80px;height:80px;background:#e2e8f0;border-radius:10px;margin:0 auto;"></div>`
        }
        <p>Escanee para verificar<br>autenticidad del documento</p>
      </div>
    </div>

    <!-- Footer final -->
    <div class="final-footer">
      <div>
        <p>Elaborado por: <strong>${data.createdBy}</strong></p>
        <p>Fecha de generación: ${currentDateTime}</p>
      </div>
      <div style="text-align:right;">
        <p><strong>GALUR</strong> • Sistema de Cotizaciones</p>
        <p>Confianza • Calidad • Servicio</p>
      </div>
    </div>

  </div>
</body>
</html>
  `
}