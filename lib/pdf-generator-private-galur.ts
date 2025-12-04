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
    .reduce((acc: any[], p => {
      if (!acc.find(b => b.name === p.brand)) acc.push({ name: p.brand!, logoUrl: p.brandLogoUrl! })
      return acc
    }, [])

  // QR fallback: si no viene base64, generamos uno local con el número de cotización
  const qrFinal = data.qrCodeBase64 || 
    `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=COT-${data.quotationNumber}-${data.clientRuc}`

  return `
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Cotización ${data.quotationNumber}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
  
  body, html { margin:0; padding:0; font-family: 'Inter', system-ui, sans-serif; background: white; color: #1a1a1a; font-size: 10.5px; line-height: 1.4; }
  .page { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 15mm 16mm; background: white; }

  :root {
    --green: #006f3d;
    --gold: #d4af37;
    --gray: #f4f4f4;
  }

  /* HEADER MINIMAL + ELEGANTE */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 12mm;
    border-bottom: 3px solid var(--green);
    margin-bottom: 10mm;
  }
  .logo { height: 82px; }
  .company { font-size: 26px; font-weight: 900; color: var(--green); margin: 0; letter-spacing: -0.8px; }
  .ruc { background: var(--green); color: white; padding: 4px 12px; border-radius: 6px; font-weight: 700; font-size: 11px; margin-top: 4px; display: inline-block; }

  .quo-box {
    background: var(--green);
    color: white;
    padding: 14px 20px;
    text-align: center;
    border-radius: 0; /* SIN bordes redondeados */
    min-width: 160px;
    box-shadow: 0 6px 20px rgba(0,111,61,0.3);
  }
  .quo-number { font-size: 34px; font-weight: 900; margin: 0; line-height: 1; }
  .quo-text { font-size: 11.5px; font-weight: 600; opacity: 0.95; }
  .status { 
    background: var(--gold); 
    color: black; 
    font-weight: 800; 
    padding: 5px 16px; 
    border-radius: 20px; 
    font-size: 11px; 
    margin-top: 8px; 
    display: inline-block; 
  }

  /* MARCAS EN LÍNEA SIMPLE */
  .brands { 
    text-align: center; 
    padding: 10px 0; 
    margin: 12px 0 16px; 
    border-top: 1px solid #eee; 
    border-bottom: 1px solid #eee; 
  }
  .brands img { height: 38px; margin: 0 10px; vertical-align: middle; }

  /* GRID CLIENTE + CONDICIONES - SIN BORDER RADIUS */
  .grid {
    display: grid;
    grid-template-columns: 1.8fr 1fr;
    gap: 16px;
    margin-bottom: 16px;
  }
  .box {
    border: 1.5px solid var(--green);
    background: white;
  }
  .box-header {
    background: var(--green);
    color: white;
    padding: 10px 14px;
    font-weight: 700;
    font-size: 12.5px;
  }
  .box-header.gold { background: var(--gold); color: black; }
  .box-body { padding: 14px; }
  .row {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid #eee;
    font-size: 10.8px;
  }
  .row:last-child { border-bottom: none; }
  .label { color: #555; font-weight: 600; text-transform: uppercase; font-size: 9.8px; }
  .value { font-weight: 700; color: #111; text-align: right; }

  /* TABLA LIMPIA Y MODERNA */
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 16px 0;
    font-size: 10.5px;
  }
  thead { background: var(--green); color: white; }
  th {
    padding: 12px 10px;
    font-weight: 700;
    text-align: center;
    font-size: 11px;
  }
  td { padding: 14px 10px; border-bottom: 1px solid #eee; vertical-align: middle; }
  tbody tr:hover { background: #f8fff9; }
  .item-num {
    background: var(--gold);
    color: black;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 900;
    font-size: 13px;
    margin: 0 auto;
  }
  .price { text-align: right; font-weight: 700; color: var(--green); }
  .total-price {
    background: var(--green);
    color: white;
    padding: 7px 14px;
    border-radius: 6px;
    font-weight: 800;
    display: inline-block;
  }

  /* FOOTER 3 COLUMNAS MINIMAL */
  .footer-grid {
    display: grid;
    grid-template-columns: 1.4fr 1fr 1fr;
    gap: 16px;
    margin-top: 20px;
  }
  .total-box {
    border: 1.5px solid var(--green);
  }
  .total-header {
    background: var(--gold);
    color: black;
    padding: 10px 14px;
    font-weight: 700;
    font-size: 12.5px;
  }
  .total-final {
    background: var(--green);
    color: white;
    padding: 16px 20px;
    font-size: 22px;
    font-weight: 900;
    text-align: right;
  }

  .qr-container {
    border: 2px dashed var(--green);
    padding: 16px;
    text-align: center;
    background: #f8fff9;
  }
  .qr-container img {
    width: 100px;
    height: 100px;
    padding: 8px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  }
  .qr-text {
    margin-top: 10px;
    font-weight: 700;
    color: var(--green);
    font-size: 11px;
  }

  .footer-line {
    margin-top: 20px;
    padding-top: 14px;
    border-top: 2px solid var(--gold);
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    color: #444;
  }
  .footer-line strong { color: var(--green); }
</style>
</head>
<body>
<div class="page">

  <!-- HEADER -->
  <div class="header">
    <div style="display:flex;align-items:center;gap:16px;">
      ${data.companyLogoUrl ? `<img src="${data.companyLogoUrl}" class="logo" alt="Logo">` : ''}
      <div>
        <div class="company">${data.companyName}</div>
        <div class="ruc">RUC ${data.companyRuc}</div>
      </div>
    </div>

    <div class="quo-box">
      <div class="quo-number">${data.quotationNumber}</div>
      <div class="quo-text">COTIZACIÓN PRIVADA</div>
      <div class="quo-text">${fechaCotizacion}</div>
      <div class="status">${getStatusLabel(data.status).toUpperCase()}</div>
    </div>
  </div>

  <!-- MARCAS -->
  ${uniqueBrands.length > 0 ? `
    <div class="brands">
      ${uniqueBrands.map(b => `<img src="${b.logoUrl}" alt="${b.name}">`).join('')}
    </div>
  ` : ''}

  <!-- CLIENTE + CONDICIONES -->
  <div class="grid">
    <div class="box">
      <div class="box-header">DATOS DEL CLIENTE</div>
      <div class="box-body">
        <div class="row"><span class="label">Razón Social</span><span class="value">${data.clientName}</span></div>
        <div class="row"><span class="label">RUC</span><span class="value">${data.clientRuc}</span></div>
        <div class="row"><span class="label">Código</span><span class="value">${data.clientCode}</span></div>
        <div class="row"><span class="label">Dirección Fiscal</span><span class="value">${data.clientFiscalAddress || data.clientAddress || '-'}</span></div>
        ${data.contactPerson ? `<div class="row"><span class="label">Atención</span><span class="value">${data.contactPerson}</span></div>` : ''}
      </div>
    </div>

    <div class="box">
      <div class="box-header gold">CONDICIONES COMERCIALES</div>
      <div class="box-body">
        <div class="row"><span class="label">Moneda</span><span class="value">${data.currency === "USD" ? "DÓLARES" : "SOLES"}</span></div>
        <div class="row"><span class="label">IGV</span><span class="value">INCLUIDO</span></div>
        <div class="row"><span class="label">Validez</span><span class="value">${fechaValidez}</span></div>
        <div class="row"><span class="label">Entrega</span><span class="value">SEGÚN COORDINACIÓN</span></div>
      </div>
    </div>
  </div>

  <!-- TABLA PRODUCTOS -->
  <table>
    <thead>
      <tr>
        <th style="width:6%;">ITEM</th>
        <th>DESCRIPCIÓN</th>
        <th style="width:10%;">CANT.</th>
        <th style="width:8%;">UND</th>
        <th style="width:12%;">MARCA</th>
        <th style="width:12%;">P. UNIT.</th>
        <th style="width:14%;">P. TOTAL</th>
      </tr>
    </thead>
    <tbody>
      ${data.products.map((p, i) => `
        <tr>
          <td style="text-align:center;"><div class="item-num">${i + 1}</div></td>
          <td style="font-weight:600;">${p.description}${p.code ? `<br><small style="color:var(--green);font-family:monospace;font-size:9.5px;">${p.code}</small>` : ''}</td>
          <td style="text-align:center;font-weight:700;">${p.quantity}</td>
          <td style="text-align:center;">${p.unit}</td>
          <td style="text-align:center;">${p.brandLogoUrl ? `<img src="${p.brandLogoUrl}" style="height:30px;">` : (p.brand || '-')}</td>
          <td class="price">${simbolo} ${p.unitPrice.toFixed(2)}</td>
          <td style="text-align:right;"><span class="total-price">${simbolo} ${p.totalPrice.toFixed(2)}</span></td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <!-- FOOTER -->
  <div class="footer-grid">
    <div class="box">
      <div class="box-header">DATOS BANCARIOS</div>
      <div class="box-body" style="font-size:10.5px;">
        ${data.bankingInfo?.bankAccount ? `
        <div class="row"><span class="label">Banco</span><span class="value">${data.bankingInfo.bankAccount.bank}</span></div>
        <div class="row"><span class="label">Cuenta ${data.bankingInfo.bankAccount.type}</span><span class="value" style="font-family:monospace;">${data.bankingInfo.bankAccount.accountNumber}</span></div>
        <div class="row"><span class="label">CCI</span><span class="value" style="font-family:monospace;">${data.bankingInfo.bankAccount.cci}</span></div>
        ${data.bankingInfo.detractionAccount ? `<div class="row" style="margin-top:8px;padding-top:8px;border-top:1px solid #eee;"><span class="label">Cta. Detracción</span><span class="value" style="font-family:monospace;">${data.bankingInfo.detractionAccount.accountNumber}</span></div>` : ''}
      ` : 'Sin información disponible'}
      </div>
    </div>

    <div class="total-box">
      <div class="total-header">RESUMEN</div>
      <div class="box-body" style="padding-bottom:0;">
        <div class="row"><span>Subtotal</span><span>${simbolo} ${data.subtotal.toFixed(2)}</span></div>
        <div class="row"><span>IGV 18%</span><span>${simbolo} ${data.igv.toFixed(2)}</span></div>
        <div class="total-final">TOTAL ${simbolo} ${data.total.toFixed(2)}</div>
      </div>
    </div>

    <div class="qr-container">
      <img src="${qrFinal}" alt="QR Verificación">
      <div class="qr-text">Escanee para verificar<br>autenticidad</div>
    </div>
  </div>

  <!-- PIE DE PÁGINA -->
  <div class="footer-line">
    <div>
      Elaborado por: <strong>${data.createdBy}</strong><br>
      Generado: ${hoy}
    </div>
    <div style="text-align:right;">
      <strong style="color:var(--green);font-size:18px;">GALUR</strong><br>
      Confianza • Calidad • Servicio
    </div>
  </div>

</div>
</body>
</html>
  `
}