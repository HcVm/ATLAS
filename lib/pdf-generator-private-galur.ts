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
  const fechaCot = format(new Date(data.quotationDate), "dd/MM/yyyy", { locale: es })
  const hoy = format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })
  const validez = data.validUntil ? format(new Date(data.validUntil), "dd/MM/yyyy", { locale: es }) : "15 días"

  if (data.companyCode && !data.bankingInfo) {
    const info = getBankingInfoByCompanyCode(data.companyCode)
    if (info) data.bankingInfo = info
  }

  const simbolo = data.currency === "USD" ? "US$" : "S/"

  // QR con fallback seguro
  const qrSrc = data.qrCodeBase64 ||
    `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent('COT-' + data.quotationNumber)}`

  const uniqueBrands = data.products
    .products.filter(p => p.brand && p.brandLogoUrl)
    .reduce((acc: any[], p) => {
      if (!acc.find(b => b.name === p.brand)) acc.push({ name: p.brand!, logoUrl: p.brandLogoUrl! })
      return acc
    }, [])

  return `
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>COT-${data.quotationNumber}</title>
<style>
  body,html{margin:0;padding:0;font-family:'Segoe UI',Tahoma,sans-serif;background:white;color:#222;font-size:10px}
  table{width:100%;border-collapse:collapse}
  img{max-width:100%;height:auto}
  .page{width:210mm;min-height:297mm;margin:0 auto;padding:14mm 16mm;background:white}
  .text-center{text-align:center}
  .text-right{text-align:right}
  .fw-bold{font-weight:800}
  .mb1{margin-bottom:4mm}
  .mb2{margin-bottom:8mm}
  .green{color:#006f3d}
  .gold{color:#d4af37}
  .bg-green{background:#006f3d}
  .bg-gold{background:#d4af37}
  .br6{border-radius:6px}
  .br0{border-radius:0}
  .shadow{box-shadow:0 4px 20px rgba(0,111,61,0.25)}
  
  .header-table td{vertical-align:middle;padding:6mm 4mm}
  .logo-td{width:120px;background:white;border:3px solid #006f3d;text-align:center}
  .logo-img{height:76px}
  .company-td{background:#006f3d;color:white;text-align:center}
  .company-name{font-size:28px;font-weight:900;letter-spacing:-0.5px}
  .quo-td{width:160px;background:white;border:3px solid #006f3d;text-align:center}
  .quo-num{font-size:36px;font-weight:900;color:#006f3d;margin:0}
  .status-badge{background:#d4af37;color:black;padding:4px 16px;border-radius:20px;font-weight:800;font-size:11px;margin-top:4px;display:inline-block}
  
  .brands-row td{padding:6px 0;background:#f8f9f5;border:1px solid #e0e8e2}
  .brand-img{height:40px;margin:0 12px}
  
  .info-table td{padding:8px 10px;border:1px solid #ddd}
  .info-header{background:#006f3d;color:white;font-weight:700;padding:10px}
  .info-header-gold{background:#d4af37;color:black}
  
  .prod-table th{background:#006f3d;color:white;padding:10px 8px;font-weight:700;text-align:center}
  .prod-table td{padding:12px 8px;border-bottom:1px solid #eee;vertical-align:middle}
  .prod-table tbody tr:hover{background:#f8fff8}
  .item-circle{background:#d4af37;color:black;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:900;margin:0 auto}
  .total-cell{background:#006f3d;color:white;padding:8px 14px;border-radius:6px;font-weight:800;display:inline-block}
  
  .footer-grid td{padding:10px;vertical-align:top}
  .total-final-td{background:#006f3d;color:white;text-align:right;padding:16px;font-size:24px;font-weight:900}
  .qr-td{background:#f8fff9;border:2px dashed #006f3d;text-align:center;padding:12px}
  .qr-img{width:100px;height:100px;background:white;padding:8px;border-radius:8px}
</style>
</head>
<body>
<div class="page">

  <!-- HEADER (tabla ultra compatible) -->
  <table class="header-table mb2">
    <tr>
      <td class="logo-td br6">
        ${data.companyLogoUrl ? `<img src="${data.companyLogoUrl}" class="logo-img">` : '<div style="font-size:32px;font-weight:900;color:#006f3d">GALUR</div>'}
      </td>
      <td class="company-td br0">
        <div class="company-name">${data.companyName}</div>
        <div style="margin-top:4px;font-size:12px">RUC ${data.companyRuc}</div>
      </td>
      <td class="quo-td br6">
        <div class="quo-num">${data.quotationNumber}</div>
        <div style="font-size:12px;margin:4px 0">Cotización Privada</div>
        <div style="font-size:11px;color:#666">${fechaCot}</div>
        <div class="status-badge">${getStatusLabel(data.status).toUpperCase()}</div>
      </td>
    </tr>
  </table>

  <!-- MARCAS -->
  ${uniqueBrands.length > 0 ? `
  <table class="brands-row mb2">
    <tr>
      <td class="text-center" colspan="7">
        ${uniqueBrands.map(b => `<img src="${b.logoUrl}" class="brand-img" alt="${b.name}">`).join('')}
      </td>
    </tr>
  </table>
  ` : ''}

  <!-- CLIENTE + CONDICIONES -->
  <table style="width:100%;margin-bottom:10px">
    <tr>
      <td style="width:60%">
        <table class="info-table" style="width:100%">
          <tr><td class="info-header" colspan="2">DATOS DEL CLIENTE</td></tr>
          <tr><td class="label">Razón Social</td><td class="value fw-bold">${data.clientName}</td></tr>
          <tr><td class="label">RUC</td><td class="value fw-bold">${data.clientRuc}</td></tr>
          <tr><td class="label">Código</td><td class="value fw-bold">${data.clientCode}</td></tr>
          <tr><td class="label">Dirección</td><td class="value fw-bold">${data.clientFiscalAddress || data.clientAddress || '-'}</td></tr>
          ${data.contactPerson ? `<tr><td class="label">Atención</td><td class="value fw-bold">${data.contactPerson}</td></tr>` : ''}
        </table>
      </td>
      <td style="width:40%;padding-left:12px">
        <table class="info-table" style="width:100%">
          <tr><td class="info-header-gold" colspan="2">CONDICIONES</td></tr>
          <tr><td class="label">Moneda</td><td class="value fw-bold">${data.currency === "USD" ? "DÓLARES" : "SOLES"}</td></tr>
          <tr><td class="label">IGV</td><td class="value fw-bold">INCLUIDO</td></tr>
          <tr><td class="label">Validez</td><td class="value fw-bold">${validez}</td></tr>
          <tr><td class="label">Entrega</td><td class="value fw-bold">SEGÚN COORDINACIÓN</td></tr>
        </table>
      </td>
    </tr>
  </table>

  <!-- PRODUCTOS -->
  <table class="prod-table mb2">
    <thead>
      <tr>
        <th style="width:6%">#</th>
        <th style="width:38%">DESCRIPCIÓN</th>
        <th style="width:9%">CANT.</th>
        <th style="width:9%">UND</th>
        <th style="width:12%">MARCA</th>
        <th style="width:12%">P. UNIT.</th>
        <th style="width:14%">TOTAL</th>
      </tr>
    </thead>
    <tbody>
      ${data.products.map((p, i) => `
      <tr>
        <td><div class="item-circle">${i + 1}</div></td>
        <td style="font-weight:600">
          ${p.description}
          ${p.code ? `<br><small style="color:#006f3d;font-family:monospace">${p.code}</small>` : ''}
        </td>
        <td class="text-center fw-bold">${p.quantity}</td>
        <td class="text-center">${p.unit}</td>
        <td class="text-center">
          ${p.brandLogoUrl ? `<img src="${p.brandLogoUrl}" style="height:32px">` : (p.brand || '-')}
        </td>
        <td class="text-right fw-bold">${simbolo} ${p.unitPrice.toFixed(2)}</td>
        <td class="text-right"><span class="total-cell">${simbolo} ${p.totalPrice.toFixed(2)}</span></td>
      </tr>
      `).join('')}
    </tbody>
  </table>

  <!-- FOOTER 3 COLUMNAS -->
  <table class="footer-grid">
    <tr>
      <!-- Bancos -->
      <td style="width:38%">
        <table style="width:100%;border:2px solid #006f3d" class="br6">
          <tr><td class="bg-green" style="color:white;padding:10px;font-weight:700">DATOS BANCARIOS</td></tr>
          <tr><td style="padding:10px">
            ${data.bankingInfo?.bankAccount ? `
              <div><strong>Banco:</strong> ${data.bankingInfo.bankAccount.bank}</div>
              <div><strong>Cuenta ${data.bankingInfo.bankAccount.type}:</strong> ${data.bankingInfo.bankAccount.accountNumber}</div>
              <div><strong>CCI:</strong> ${data.bankingInfo.bankAccount.cci}</div>
              ${data.bankingInfo.detractionAccount ? `<div style="margin-top:6px"><strong>Cta. Detracción:</strong> ${data.bankingInfo.detractionAccount.accountNumber}</div>` : ''}
            ` : '<em>No registrada</em>'}
          </td></tr>
        </table>
      </td>

      <!-- Totales -->
      <td style="width:32%;padding:0 10px">
        <table style="width:100%;border:2px solid #d4af37" class="br6">
          <tr><td class="bg-gold" style="color:black;padding:10px;font-weight:700;text-align:center">RESUMEN</td></tr>
          <tr><td style="padding:10px">
            <div style="display:flex;justify-content:space-between"><span>Subtotal:</span><strong>${simbolo} ${data.subtotal.toFixed(2)}</strong></div>
            <div style="display:flex;justify-content:space-between"><span>IGV 18%:</span><strong>${simbolo} ${data.igv.toFixed(2)}</strong></div>
          </td></tr>
          <tr><td class="total-final-td">TOTAL ${simbolo} ${data.total.toFixed(2)}</td></tr>
        </table>
      </td>

      <!-- QR -->
      <td style="width:30%" class="qr-td br6">
        <img src="${qrSrc}" class="qr-img">
        <div style="margin-top:8px;font-weight:700;color:#006f3d">Escanee para verificar autenticidad</div>
      </td>
    </tr>
  </table>

  <!-- PIE FINAL -->
  <div style="margin-top:16px;padding-top:12px;border-top:3px solid #d4af37;text-align:center;color:#555;font-size:11px">
    Elaborado por: <strong>${data.createdBy}</strong> • Generado: ${hoy}<br>
    <strong style="color:#006f3d;font-size:16px">GALUR</strong> — Confianza • Calidad • Servicio
  </div>

</div>
</body>
</html>
  `
}