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
  const fechaCotizacion = format(new Date(data.quotationDate), "dd 'de' MMMM 'de' yyyy", { locale: es }).toUpperCase()
  const fechaValidez = data.validUntil ? format(new Date(data.validUntil), "dd/MM/yyyy", { locale: es }) : "15 días"
  const hoy = format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })

  if (data.companyCode && !data.bankingInfo) {
    const info = getBankingInfoByCompanyCode(data.companyCode)
    if (info) data.bankingInfo = info
  }

  const simbolo = data.currency === "USD" ? "US$" : "S/"

  const uniqueBrands = data.products
    .filter(p => p.brand && p.brandLogoUrl)
    .reduce((acc: any[], p) => {
      if (!acc.find(b => b.name === p.brand)) acc.push({ name: p.brand!, logoUrl: p.brandLogoUrl! })
      return acc
    }, [])

  return `
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Cotización GALUR ${data.quotationNumber}</title>
<style>
  body, html { margin:0; padding:0; height:100%; font-family:'Segoe UI','Helvetica Neue',sans-serif; background:white; color:#222; font-size:10px; }
  .page { width:210mm; min-height:297mm; margin:0 auto; padding:12mm 14mm; background:white; position:relative; }
  table { border-collapse:collapse; width:100%; }
  img { max-width:100%; height:auto; }
  .text-right { text-align:right; }
  .text-center { text-align:center; }
  .fw-bold { font-weight:800; }
  .fs-9 { font-size:9px; }
  .fs-10 { font-size:10px; }
  .fs-11 { font-size:11px; }
  .fs-12 { font-size:12px; }
  .fs-14 { font-size:14px; }
  .fs-18 { font-size:18px; }
  .fs-24 { font-size:24px; }
  .mb-2 { margin-bottom:2mm; }
  .mb-3 { margin-bottom:3mm; }
  .mb-4 { margin-bottom:4mm; }
  .mt-4 { margin-top:4mm; }
  .w-100 { width:100%; }
  .d-flex { display:flex; }
  .justify-between { justify-content:space-between; }
  .align-center { align-items:center; }
  .gap-4 { gap:4mm; }

  /* COLORES GALUR OFICIALES */
  :root {
    --green: #006f3d;
    --gold: #d4af37;
    --light: #f9fafb;
  }

  /* HEADER */
  .header { border-bottom:4px solid var(--green); padding-bottom:8mm; margin-bottom:6mm; }
  .logo-galur { height:78px; }
  .company-title { font-size:28px; color:var(--green); font-weight:900; margin:0; letter-spacing:-0.5px; }
  .ruc-badge { background:var(--green); color:white; padding:3px 10px; border-radius:6px; font-weight:700; font-size:11px; display:inline-block; margin-top:4px; }

  .quo-box { background:var(--green); color:white; padding:10mm 8mm; border-radius:12px; text-align:center; min-width:135px; box-shadow:0 8px 25px rgba(0,111,61,0.3); }
  .quo-number { font-size:32px; font-weight:900; margin:0; line-height:1; }
  .quo-label { font-size:11px; opacity:0.9; margin:2px 0; }
  .status-badge { background:var(--gold); color:black; font-weight:800; padding:3px 14px; border-radius:30px; font-size:11px; margin-top:6px; display:inline-block; }

  /* MARCAS */
  .brands-bar { background:#f5f8f5; border:2px solid #e0ece4; border-radius:12px; padding:8mm 4mm; text-align:center; margin-bottom:6mm; }
  .brands-bar img { height:42px; margin:0 12px; }

  /* CLIENTE Y CONDICIONES */
  .info-grid { display:grid; grid-template-columns:1.7fr 1fr; gap:5mm; margin-bottom:6mm; }
  .card { background:white; border-radius:12px; overflow:hidden; box-shadow:0 4px 15px rgba(0,0,0,0.08); }
  .card-header { background:var(--green); color:white; padding:4mm 5mm; font-weight:700; font-size:12px; }
  .card-header.gold { background:var(--gold); color:black; }
  .card-body { padding:5mm; }
  .row { display:flex; justify-content:space-between; padding:2.5mm 0; border-bottom:1px solid #eee; font-size:10px; }
  .row:last-child { border:none; }
  .label { color:#666; font-weight:600; text-transform:uppercase; font-size:9.5px; }
  .value { font-weight:700; color:#222; }

  /* TABLA PRODUCTOS */
  .table-wrapper { border-radius:12px; overflow:hidden; box-shadow:0 6px 25px rgba(0,111,61,0.18); margin-bottom:6mm; }
  .table-prod thead { background:var(--green); color:white; }
  .table-prod th { padding:4mm 3mm; font-weight:700; font-size:10px; text-align:center; }
  .table-prod th:first-child { text-align:center; width:6%; }
  .table-prod td { padding:4mm 3mm; border-bottom:1px solid #eee; vertical-align:middle; }
  .table-prod tbody tr:hover { background:#f8fcf8; }
  .num-circle { background:var(--gold); color:black; width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:900; margin:0 auto; }
  .total-cell { background:var(--green); color:white; padding:3mm 5mm; border-radius:8px; font-weight:800; text-align:center; }

  /* FOOTER 3 COLUMNAS */
  .footer-grid { display:grid; grid-template-columns:1.3fr 1fr 0.9fr; gap:5mm; }
  .total-final { background:var(--green); color:white; padding:6mm; text-align:right; font-size:20px; font-weight:900; border-radius:0 0 12px 12px; margin:5mm -5mm -5mm; }

  .qr-box { background:#f5f8f5; border:3px dashed var(--green); border-radius:14px; padding:8mm; text-align:center; }
  .qr-box img { width:88px; height:88px; background:white; padding:6px; border-radius:10px; }

  .footer-final { margin-top:8mm; padding-top:6mm; border-top:3px solid var(--gold); display:flex; justify-content:space-between; font-size:10px; color:#555; }
  .footer-final strong { color:var(--green); }
</style>
</head>
<body>
<div class="page">

  <!-- HEADER -->
  <div class="header d-flex justify-between align-center">
    <div class="d-flex align-center gap-4">
      ${data.companyLogoUrl ? `<img src="${data.companyLogoUrl}" class="logo-galur">` : ''}
      <div>
        <h1 class="company-title">${data.companyName}</h1>
        <div class="ruc-badge">RUC ${data.companyRuc}</div>
      </div>
    </div>
    <div class="quo-box">
      <div class="quo-number">${data.quotationNumber}</div>
      <div class="quo-label">COTIZACIÓN PRIVADA</div>
      <div class="quo-label fs-11">${fechaCotizacion}</div>
      <div class="status-badge">${getStatusLabel(data.status)}</div>
    </div>
  </div>

  <!-- MARCAS -->
  ${uniqueBrands.length > 0 ? `
    <div class="brands-bar">
      ${uniqueBrands.map(b => `<img src="${b.logoUrl}" alt="${b.name}">`).join('')}
    </div>
  ` : ''}

  <!-- CLIENTE + CONDICIONES -->
  <div class="info-grid">
    <div class="card">
      <div class="card-header">DATOS DEL CLIENTE</div>
      <div class="card-body">
        <div class="row"><span class="label">Razón Social</span><span class="value">${data.clientName}</span></div>
        <div class="row"><span class="label">RUC</span><span class="value">${data.clientRuc}</span></div>
        <div class="row"><span class="label">Código Cliente</span><span class="value">${data.clientCode}</span></div>
        <div class="row"><span class="label">Dirección Fiscal</span><span class="value">${data.clientFiscalAddress || data.clientAddress || '-'}</span></div>
        ${data.contactPerson ? `<div class="row"><span class="label">Atención</span><span class="value">${data.contactPerson}</span></div>` : ''}
      </div>
    </div>

    <div class="card">
      <div class="card-header gold">CONDICIONES COMERCIALES</div>
      <div class="card-body">
        <div class="row"><span class="label">Moneda</span><span class="value">${data.currency === "USD" ? "DÓLARES AMERICANOS" : "SOLES"}</span></div>
        <div class="row"><span class="label">IGV</span><span class="value">INCLUIDO</span></div>
        <div class="row"><span class="label">Validez</span><span class="value">${fechaValidez}</span></div>
        <div class="row"><span class="label">Entrega</span><span class="value">SEGÚN COORDINACIÓN</span></div>
      </div>
    </div>
  </div>

  <!-- TABLA PRODUCTOS -->
  <div class="table-wrapper">
    <table class="table-prod">
      <thead>
        <tr>
          <th>ITEM</th>
          <th>DESCRIPCIÓN</th>
          <th>CANT.</th>
          <th>UND</th>
          <th>MARCA</th>
          <th>P. UNITARIO</th>
          <th>P. TOTAL</th>
        </tr>
      </thead>
      <tbody>
        ${data.products.map((p, i) => `
          <tr>
            <td><div class="num-circle">${i + 1}</div></td>
            <td style="font-weight:600;">${p.description}${p.code ? `<br><small style="color:var(--green);font-family:monospace;">${p.code}</small>` : ''}</td>
            <td class="text-center fw-bold">${p.quantity}</td>
            <td class="text-center">${p.unit}</td>
            <td class="text-center">${p.brandLogoUrl ? `<img src="${p.brandLogoUrl}" style="height:28px;">` : (p.brand || '-')}</td>
            <td class="text-right fw-bold">${simbolo} ${p.unitPrice.toFixed(2)}</td>
            <td><div class="total-cell">${simbolo} ${p.totalPrice.toFixed(2)}</div></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <!-- FOOTER 3 COLUMNAS -->
  <div class="footer-grid">
    <!-- Bancos -->
    <div class="card">
      <div class="card-header">DATOS BANCARIOS</div>
      <div class="card-body fs-10">
        ${data.bankingInfo?.bankAccount ? `
          <div class="row"><span class="label">Banco</span><span class="value">${data.bankingInfo.bankAccount.bank}</span></div>
          <div class="row"><span class="label">Cuenta ${data.bankingInfo.bankAccount.type}</span><span class="value" style="font-family:monospace;">${data.bankingInfo.bankAccount.accountNumber}</span></div>
          <div class="row"><span class="label">CCI</span><span class="value" style="font-family:monospace;">${data.bankingInfo.bankAccount.cci}</span></div>
          ${data.bankingInfo.detractionAccount ? `<div class="row mt-4" style="border-top:1px solid #eee;padding-top:6px;"><span class="label">Cta. Detracción</span><span class="value" style="font-family:monospace;">${data.bankingInfo.detractionAccount.accountNumber}</span></div>` : ''}
        ` : '<em>Sin información bancaria</em>'}
      </div>
    </div>

    <!-- Totales -->
    <div class="card">
      <div class="card-header gold">RESUMEN</div>
      <div class="card-body">
        <div class="row"><span>Subtotal</span><span>${simbolo} ${data.subtotal.toFixed(2)}</span></div>
        <div class="row"><span>IGV 18%</span><span>${simbolo} ${data.igv.toFixed(2)}</span></div>
        <div class="total-final">TOTAL ${simbolo} ${data.total.toFixed(2)}</div>
      </div>
    </div>

    <!-- QR -->
    <div class="qr-box">
      ${data.qrCodeBase64 ? `<img src="${data.qrCodeBase64}">` : `<div style="width:88px;height:88px;background:#eee;border-radius:10px;margin:0 auto;"></div>`}
      <div class="mt-4" style="color:var(--green);font-weight:700;">Escanee para verificar autenticidad</div>
    </div>
  </div>

  <!-- FOOTER FINAL -->
  <div class="footer-final">
    <div>
      Elaborado por: <strong>${data.createdBy}</strong><br>
      Generado: ${hoy}
    </div>
    <div class="text-right">
      <strong style="color:var(--green);font-size:18px;">GALUR</strong><br>
      Confianza • Calidad • Servicio
    </div>
  </div>

</div>
</body>
</html>
  `
}