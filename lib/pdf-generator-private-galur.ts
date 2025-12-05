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
  const fechaCotizacion = format(new Date(data.quotationDate), "dd/MM/yyyy", { locale: es })
  const fechaValidez = data.validUntil ? format(new Date(data.validUntil), "dd/MM/yyyy", { locale: es }) : "15 días"
  const hoy = format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })

  if (data.companyCode && !data.bankingInfo) {
    const info = getBankingInfoByCompanyCode(data.companyCode)
    if (info) data.bankingInfo = info
  }

  const simbolo = data.currency === "USD" ? "US$" : "S/"
  const nombreMoneda = data.currency === "USD" ? "Dólares Americanos" : "Soles"

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
  /* CONFIGURACIÓN BÁSICA */
  body, html { margin:0; padding:0; height:100%; font-family:'Segoe UI','Roboto','Helvetica',sans-serif; background:white; color:#333; font-size:10px; line-height:1.4; }
  .page { width:210mm; min-height:297mm; margin:0 auto; padding:12mm 15mm; background:white; position:relative; box-sizing:border-box; }
  table { border-collapse:collapse; width:100%; }
  img { max-width:100%; height:auto; }
  
  /* UTILIDADES */
  .text-right { text-align:right; }
  .text-center { text-align:center; }
  .fw-bold { font-weight:700; }
  .text-green { color: #006f3d; }
  .text-gold { color: #d4af37; }
  .fs-9 { font-size:9px; }
  .fs-10 { font-size:10px; }
  .fs-12 { font-size:12px; }
  .fs-14 { font-size:14px; }
  .fs-24 { font-size:24px; }
  .mb-2 { margin-bottom:2mm; }
  .mb-4 { margin-bottom:4mm; }
  .d-flex { display:flex; }
  .justify-between { justify-content:space-between; }
  .align-start { align-items:flex-start; }
  .align-center { align-items:center; }
  .w-100 { width:100%; }

  /* COLORES DE MARCA */
  :root {
    --green: #006f3d;
    --gold: #d4af37;
    --gray-light: #f4f4f4;
    --border-color: #e0e0e0;
  }

  /* --- HEADER REESTRUCTURADO --- */
  .header { margin-bottom:6mm; padding-bottom:4mm; border-bottom:3px solid var(--green); }
  
  .logo-section img { height:65px; }
  .company-info { margin-top:2mm; }
  .company-name { font-size:20px; font-weight:800; color:var(--green); margin:0; line-height:1; }
  .company-ruc { font-size:11px; font-weight:600; color:#555; letter-spacing:1px; }

  /* Contenedor derecho del header: Info Cotización + QR */
  .header-meta { display:flex; gap:4mm; align-items:flex-start; justify-content:flex-end; }
  
  .quote-data { text-align:right; }
  .quote-label { font-size:10px; text-transform:uppercase; color:#888; letter-spacing:1px; margin-bottom:2px; }
  .quote-number { font-size:22px; font-weight:800; color:var(--green); line-height:1; margin-bottom:4px; }
  .status-pill { display:inline-block; background:var(--gold); color:#000; padding:2px 8px; border-radius:4px; font-size:9px; font-weight:bold; text-transform:uppercase; }

  .qr-header img { width:65px; height:65px; border:1px solid #ddd; padding:2px; border-radius:4px; }

  /* --- SECCIÓN DE INFORMACIÓN (CLIENTE Y CONDICIONES) SIN CAJAS --- */
  .info-strip { display:flex; margin-bottom:8mm; gap:10mm; }
  
  .info-col-left { flex:1.4; } /* Cliente tiene más espacio */
  .info-col-right { flex:1; border-left:1px solid var(--border-color); padding-left:6mm; }

  .section-title { 
    font-size:10px; 
    font-weight:700; 
    color:var(--green); 
    text-transform:uppercase; 
    letter-spacing:0.5px; 
    border-bottom:1px solid var(--border-color); 
    padding-bottom:1mm;
    margin-bottom:3mm; 
  }

  .data-row { display:flex; margin-bottom:1.5mm; font-size:10px; }
  .data-label { width:80px; color:#666; font-weight:500; flex-shrink:0; }
  .data-value { font-weight:600; color:#222; }

  /* --- TABLA PRODUCTOS --- */
  .table-prod { margin-bottom:6mm; }
  .table-prod thead { background:var(--green); color:white; }
  .table-prod th { padding:3mm; font-weight:600; font-size:9px; letter-spacing:0.5px; text-transform:uppercase; text-align:center; }
  .table-prod th:nth-child(2) { text-align:left; } /* Descripción alineada izq */
  
  .table-prod tbody tr { border-bottom:1px solid var(--border-color); }
  .table-prod td { padding:3mm; vertical-align:middle; color:#444; }
  
  .item-idx { color:#888; font-size:9px; }
  .prod-desc { font-weight:600; color:#222; }
  .prod-code { display:block; font-size:8px; color:#888; font-family:monospace; margin-top:1px; }
  
  .total-cell { font-weight:700; color:var(--green); }

  /* --- FOOTER: BANCOS Y TOTALES --- */
  .footer-grid { display:flex; gap:10mm; align-items:flex-start; margin-top:4mm; }
  
  /* Bancos a la izquierda, limpio */
  .bank-section { flex:1.5; }
  .bank-block { margin-bottom:3mm; font-size:9.5px; }
  .bank-name { font-weight:700; color:#333; display:inline-block; width:60px; }
  .bank-num { font-family:monospace; color:#555; }
  .cci-row { color:#888; margin-left:64px; font-size:8.5px; font-family:monospace; }

  /* Totales a la derecha, estilo lista */
  .totals-section { flex:1; padding-top:2mm; }
  .total-row { display:flex; justify-content:space-between; margin-bottom:2mm; padding-bottom:1mm; border-bottom:1px solid #f0f0f0; }
  .total-row.final { border-bottom:none; border-top:2px solid var(--green); padding-top:2mm; margin-top:2mm; align-items:center; }
  
  .t-label { color:#666; font-size:10px; }
  .t-val { font-weight:600; font-size:11px; }
  
  .final .t-label { font-size:12px; font-weight:800; color:var(--green); }
  .final .t-val { font-size:16px; font-weight:800; color:var(--green); }

  /* Disclaimer y firma */
  .legal-footer { margin-top:12mm; border-top:1px solid var(--border-color); padding-top:4mm; display:flex; justify-content:space-between; color:#777; font-size:9px; }
</style>
</head>
<body>
<div class="page">

  <div class="header d-flex justify-between align-start">
    <div class="logo-section">
      ${data.companyLogoUrl ? `<img src="${data.companyLogoUrl}" alt="Logo">` : ''}
      <div class="company-info">
        <h1 class="company-name">${data.companyName}</h1>
        <div class="company-ruc">RUC: ${data.companyRuc}</div>
      </div>
    </div>

    <div class="header-meta">
      <div class="quote-data">
        <div class="quote-label">N° de Cotización</div>
        <div class="quote-number">${data.quotationNumber}</div>
        <div class="status-pill">${getStatusLabel(data.status)}</div>
      </div>
      <div class="qr-header">
        ${data.qrCodeBase64 
          ? `<img src="${data.qrCodeBase64}" alt="QR Validación">` 
          : `<div style="width:65px;height:65px;background:#f4f4f4;border:1px dashed #ccc;"></div>`
        }
      </div>
    </div>
  </div>

  ${uniqueBrands.length > 0 ? `
    <div style="text-align:center; margin-bottom:6mm; padding-bottom:2mm; border-bottom:1px dashed #eee;">
      ${uniqueBrands.map(b => `<img src="${b.logoUrl}" style="height:32px; margin:0 10px; opacity:0.8;">`).join('')}
    </div>
  ` : ''}

  <div class="info-strip">
    
    <div class="info-col-left">
      <div class="section-title">Datos del Cliente</div>
      <div class="data-row"><span class="data-label">Razón Social:</span> <span class="data-value">${data.clientName}</span></div>
      <div class="data-row"><span class="data-label">RUC:</span> <span class="data-value">${data.clientRuc}</span></div>
      <div class="data-row"><span class="data-label">Dirección:</span> <span class="data-value" style="font-size:9px;">${data.clientFiscalAddress || data.clientAddress || '-'}</span></div>
      <div class="data-row"><span class="data-label">Contacto:</span> <span class="data-value">${data.contactPerson || data.clientEmail || '-'}</span></div>
    </div>

    <div class="info-col-right">
      <div class="section-title">Detalles Comerciales</div>
      <div class="data-row"><span class="data-label">Fecha Emisión:</span> <span class="data-value">${fechaCotizacion}</span></div>
      <div class="data-row"><span class="data-label">Válido hasta:</span> <span class="data-value">${fechaValidez}</span></div>
      <div class="data-row"><span class="data-label">Moneda:</span> <span class="data-value">${nombreMoneda}</span></div>
      <div class="data-row"><span class="data-label">Forma Pago:</span> <span class="data-value">A tratar</span></div>
    </div>

  </div>

  <table class="table-prod">
    <thead>
      <tr>
        <th width="5%">ITM</th>
        <th width="45%">DESCRIPCIÓN</th>
        <th width="10%">MARCA</th>
        <th width="10%">CANT.</th>
        <th width="10%">UND.</th>
        <th width="10%">P. UNIT</th>
        <th width="10%">TOTAL</th>
      </tr>
    </thead>
    <tbody>
      ${data.products.map((p, i) => `
        <tr>
          <td class="text-center"><span class="item-idx">${i + 1}</span></td>
          <td>
            <span class="prod-desc">${p.description}</span>
            ${p.code ? `<span class="prod-code">COD: ${p.code}</span>` : ''}
          </td>
          <td class="text-center" style="font-size:9px;">${p.brand || '-'}</td>
          <td class="text-center fw-bold">${p.quantity}</td>
          <td class="text-center" style="font-size:9px;">${p.unit}</td>
          <td class="text-right">${simbolo} ${p.unitPrice.toFixed(2)}</td>
          <td class="text-right total-cell">${simbolo} ${p.totalPrice.toFixed(2)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="footer-grid">
    
    <div class="bank-section">
      <div class="section-title">Información Bancaria</div>
      ${data.bankingInfo?.bankAccount ? `
        <div class="bank-block">
          <div><span class="bank-name">${data.bankingInfo.bankAccount.bank}:</span> <span class="bank-num">${data.bankingInfo.bankAccount.accountNumber}</span></div>
          <div class="cci-row">CCI: ${data.bankingInfo.bankAccount.cci}</div>
        </div>
        ${data.bankingInfo.detractionAccount ? `
          <div class="bank-block">
            <div><span class="bank-name">Banco Nación:</span> <span class="bank-num">${data.bankingInfo.detractionAccount.accountNumber}</span></div>
            <div class="cci-row">Cta. Detracciones (${data.bankingInfo.detractionAccount.percentage || '10'}%)</div>
          </div>
        ` : ''}
      ` : '<div style="font-style:italic; color:#888;">Cuentas bancarias no especificadas.</div>'}
      
      <div class="mt-4" style="font-size:9px; color:#666; margin-top:6mm;">
        * Los precios incluyen IGV.<br>
        * El tiempo de entrega corre a partir de la confirmación de la orden de compra.
      </div>
    </div>

    <div class="totals-section">
      <div class="total-row">
        <span class="t-label">Subtotal</span>
        <span class="t-val">${simbolo} ${data.subtotal.toFixed(2)}</span>
      </div>
      <div class="total-row">
        <span class="t-label">IGV (18%)</span>
        <span class="t-val">${simbolo} ${data.igv.toFixed(2)}</span>
      </div>
      <div class="total-row final">
        <span class="t-label">TOTAL A PAGAR</span>
        <span class="t-val">${simbolo} ${data.total.toFixed(2)}</span>
      </div>
    </div>
  </div>

  <div class="legal-footer">
    <div>
      Generado por: <strong>${data.createdBy}</strong> el ${hoy}
    </div>
    <div class="text-right">
      <strong>GALUR BUSINESS CORPORATION</strong><br>
      Confianza • Calidad • Servicio
    </div>
  </div>

</div>
</body>
</html>
  `
}