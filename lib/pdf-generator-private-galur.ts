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

  // Filtramos marcas únicas
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
  /* CONFIGURACIÓN BASE */
  body, html { margin:0; padding:0; height:100%; font-family:'Segoe UI','Roboto','Helvetica',sans-serif; background:#555; color:#333; font-size:10px; line-height:1.4; }
  
  /* PÁGINA A4 CON DISEÑO DE FONDO */
  .page { 
    width:210mm; 
    min-height:297mm; 
    margin:0 auto; 
    padding:12mm 15mm; 
    background:white; 
    position:relative; 
    box-sizing:border-box; 
    overflow:hidden; /* Para cortar los elementos decorativos */
  }

  /* --- ELEMENTOS DE FONDO (BACKGROUND ART) --- */
  
  /* 1. Marca de Agua Central */
  .bg-watermark {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 60%;
    opacity: 0.04; /* Muy sutil */
    z-index: 0;
    pointer-events: none;
    filter: grayscale(100%);
  }

  /* 2. Acento Geométrico Esquina Superior Derecha */
  .bg-accent-top {
    position: absolute;
    top: -50px;
    right: -50px;
    width: 200px;
    height: 200px;
    background: linear-gradient(135deg, transparent 50%, rgba(212, 175, 55, 0.15) 50%); /* Dorado suave */
    z-index: 0;
  }
  
  /* 3. Acento Geométrico Esquina Inferior Izquierda */
  .bg-accent-bottom {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 8px;
    background: linear-gradient(90deg, #006f3d 0%, #006f3d 70%, #d4af37 70%, #d4af37 100%);
    z-index: 0;
  }

  /* Contenido por encima del fondo */
  .content-layer { position: relative; z-index: 1; }

  /* UTILIDADES */
  table { border-collapse:collapse; width:100%; }
  img { max-width:100%; height:auto; }
  .text-right { text-align:right; }
  .text-center { text-align:center; }
  .fw-bold { font-weight:700; }
  .text-green { color: #006f3d; }
  
  :root {
    --green: #006f3d;
    --gold: #d4af37;
    --gray-light: #f8f9fa;
    --border-color: #e9ecef;
  }

  /* --- HEADER --- */
  .header { margin-bottom:4mm; padding-bottom:4mm; border-bottom:3px solid var(--green); display:flex; justify-content:space-between; align-items:flex-end; }
  
  .logo-main img { height:75px; } /* Logo empresa principal un poco más grande */
  
  .header-info { text-align:right; }
  .quote-title { font-size:10px; text-transform:uppercase; color:#888; letter-spacing:2px; margin-bottom:2px; }
  .quote-number { font-size:26px; font-weight:900; color:var(--green); line-height:1; letter-spacing:-0.5px; }
  .status-badge { background:var(--gold); color:white; padding:2px 10px; border-radius:4px; font-size:9px; font-weight:bold; display:inline-block; margin-top:4px; box-shadow:0 2px 5px rgba(0,0,0,0.1); }

  /* --- BARRA DE MARCAS Y QR (NUEVA ZONA CENTRAL) --- */
  .middle-strip {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: linear-gradient(to right, #fcfcfc, #fff); /* Degradado sutil */
    border: 1px solid var(--border-color);
    border-left: 4px solid var(--gold); /* Detalle de color */
    border-radius: 6px;
    padding: 4mm 6mm;
    margin-bottom: 8mm;
    min-height: 60px;
  }

  .brands-container {
    display: flex;
    align-items: center;
    gap: 15px;
    flex: 1;
  }
  
  /* Logos de marcas MÁS GRANDES como pediste */
  .brand-logo { 
    height: 55px; /* Aumentado considerablemente */
    object-fit: contain;
    filter: grayscale(20%); /* Un toque elegante */
    transition: filter 0.3s;
  }

  .qr-container {
    display: flex;
    align-items: center;
    gap: 10px;
    border-left: 1px dashed #ccc;
    padding-left: 15px;
    margin-left: 15px;
  }

  .qr-text {
    text-align: right;
    font-size: 8px;
    color: #666;
    line-height: 1.2;
  }
  
  .qr-img {
    width: 70px;
    height: 70px;
    border-radius: 4px;
    border: 1px solid #eee;
    padding: 2px;
    background: white;
  }

  /* --- INFO CLIENTE (ESTILO LIMPIO) --- */
  .info-grid { display: grid; grid-template-columns: 1.5fr 1fr; gap: 10mm; margin-bottom: 8mm; }
  
  .info-block h3 {
    font-size: 10px;
    color: var(--green);
    text-transform: uppercase;
    border-bottom: 1px solid #ddd;
    padding-bottom: 2px;
    margin: 0 0 8px 0;
  }

  .data-line { display: flex; margin-bottom: 3px; font-size: 10px; }
  .label { width: 85px; color: #777; font-weight: 500; flex-shrink: 0; }
  .value { color: #222; font-weight: 600; }

  /* --- TABLA --- */
  .table-wrapper { margin-bottom: 6mm; border-radius: 8px 8px 0 0; overflow: hidden; border: 1px solid var(--border-color); border-top: none; }
  
  .table-prod thead { background: var(--green); color: white; }
  .table-prod th { padding: 4mm; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
  .table-prod tbody tr:nth-child(even) { background-color: var(--gray-light); } /* Filas cebradas sutiles */
  .table-prod td { padding: 4mm; border-bottom: 1px solid var(--border-color); vertical-align: middle; color: #444; }
  
  .desc-main { font-weight: 700; color: #222; font-size: 10.5px; display: block; margin-bottom: 2px; }
  .desc-sub { color: #666; font-size: 9px; line-height: 1.3; }

  /* --- FOOTER --- */
  .footer-area { display: flex; gap: 8mm; }
  
  .bank-box { 
    flex: 1.6; 
    background: var(--gray-light); 
    border-radius: 6px; 
    padding: 4mm; 
    border-left: 3px solid var(--green);
  }
  
  .totals-box { flex: 1; }
  
  .total-row { display: flex; justify-content: space-between; padding: 2mm 0; border-bottom: 1px solid #eee; font-size: 10px; }
  .total-final { 
    background: var(--green); 
    color: white; 
    padding: 3mm 4mm; 
    border-radius: 4px; 
    display: flex; 
    justify-content: space-between; 
    align-items: center; 
    margin-top: 2mm;
    font-weight: 800;
    font-size: 12px;
    box-shadow: 0 4px 6px rgba(0,111,61,0.2);
  }

  /* TEXTO LEGAL */
  .legal-text { font-size: 8px; color: #999; margin-top: 10mm; text-align: center; border-top: 1px solid #eee; padding-top: 3mm; }

</style>
</head>
<body>
<div class="page">
  
  ${data.companyLogoUrl ? `<img src="${data.companyLogoUrl}" class="bg-watermark">` : ''}
  <div class="bg-accent-top"></div>
  <div class="bg-accent-bottom"></div>

  <div class="content-layer">

    <div class="header">
      <div class="logo-main">
        ${data.companyLogoUrl ? `<img src="${data.companyLogoUrl}">` : ''}
        <div style="font-size:18px; font-weight:800; color:var(--green); margin-top:5px; line-height:1;">
          ${data.companyName}
        </div>
        <div style="font-size:10px; color:#666;">RUC: ${data.companyRuc}</div>
      </div>
      
      <div class="header-info">
        <div class="quote-title">COTIZACIÓN NRO</div>
        <div class="quote-number">${data.quotationNumber}</div>
        <div class="status-badge">${getStatusLabel(data.status)}</div>
      </div>
    </div>

    <div class="middle-strip">
      <div class="brands-container">
        ${uniqueBrands.length > 0 
          ? uniqueBrands.map(b => `<img src="${b.logoUrl}" class="brand-logo" alt="${b.name}">`).join('')
          : `<span style="color:#aaa; font-style:italic;">Distribuidor Autorizado</span>`
        }
      </div>

      <div class="qr-container">
        <div class="qr-text">
          Validación<br>
          <strong>Digital</strong>
        </div>
        ${data.qrCodeBase64 
          ? `<img src="${data.qrCodeBase64}" class="qr-img">` 
          : `<div class="qr-img" style="background:#eee;"></div>`
        }
      </div>
    </div>

    <div class="info-grid">
      <div class="info-block">
        <h3>Datos del Cliente</h3>
        <div class="data-line"><span class="label">Razón Social:</span> <span class="value">${data.clientName}</span></div>
        <div class="data-line"><span class="label">RUC:</span> <span class="value">${data.clientRuc}</span></div>
        <div class="data-line"><span class="label">Dirección:</span> <span class="value" style="font-size:9px;">${data.clientFiscalAddress || data.clientAddress || '-'}</span></div>
        <div class="data-line"><span class="label">Atención:</span> <span class="value">${data.contactPerson || '-'}</span></div>
      </div>

      <div class="info-block">
        <h3>Condiciones</h3>
        <div class="data-line"><span class="label">Emisión:</span> <span class="value">${fechaCotizacion}</span></div>
        <div class="data-line"><span class="label">Vencimiento:</span> <span class="value">${fechaValidez}</span></div>
        <div class="data-line"><span class="label">Moneda:</span> <span class="value">${nombreMoneda}</span></div>
        <div class="data-line"><span class="label">Pago:</span> <span class="value">A coordinar</span></div>
      </div>
    </div>

    <div class="table-wrapper">
      <table class="table-prod">
        <thead>
          <tr>
            <th width="5%" class="text-center">#</th>
            <th width="50%" style="text-align:left;">DESCRIPCIÓN</th>
            <th width="10%" class="text-center">CANT</th>
            <th width="10%" class="text-center">UND</th>
            <th width="10%" class="text-right">P. UNIT</th>
            <th width="15%" class="text-right">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          ${data.products.map((p, i) => `
            <tr>
              <td class="text-center fw-bold" style="color:var(--green);">${i + 1}</td>
              <td>
                <span class="desc-main">${p.description}</span>
                <div class="desc-sub">
                   ${p.brand ? `Marca: <strong>${p.brand}</strong>` : ''} 
                   ${p.code ? `| Cód: ${p.code}` : ''}
                </div>
              </td>
              <td class="text-center fw-bold">${p.quantity}</td>
              <td class="text-center" style="font-size:9px;">${p.unit}</td>
              <td class="text-right">${simbolo} ${p.unitPrice.toFixed(2)}</td>
              <td class="text-right fw-bold" style="color:#222;">${simbolo} ${p.totalPrice.toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div class="footer-area">
      
      <div class="bank-box">
        <h3 style="margin:0 0 5px 0; font-size:10px; color:var(--green);">INFORMACIÓN BANCARIA</h3>
        ${data.bankingInfo?.bankAccount ? `
          <div style="margin-bottom:4px;">
            <strong>${data.bankingInfo.bankAccount.bank}</strong> ${data.bankingInfo.bankAccount.currency} <br>
            <span style="font-family:monospace;">${data.bankingInfo.bankAccount.accountNumber}</span>
          </div>
          <div style="font-size:9px; color:#666;">CCI: ${data.bankingInfo.bankAccount.cci}</div>
          
          ${data.bankingInfo.detractionAccount ? `
            <div style="margin-top:5px; padding-top:5px; border-top:1px dashed #ccc;">
              <strong>Banco de la Nación</strong> (Detracciones)<br>
              <span style="font-family:monospace;">${data.bankingInfo.detractionAccount.accountNumber}</span>
            </div>
          ` : ''}
        ` : '<em>Consulte con su asesor comercial.</em>'}
      </div>

      <div class="totals-box">
        <div class="total-row">
          <span style="color:#666;">Subtotal</span>
          <span class="fw-bold">${simbolo} ${data.subtotal.toFixed(2)}</span>
        </div>
        <div class="total-row">
          <span style="color:#666;">IGV (18%)</span>
          <span class="fw-bold">${simbolo} ${data.igv.toFixed(2)}</span>
        </div>
        <div class="total-final">
          <span>TOTAL A PAGAR</span>
          <span style="font-size:14px;">${simbolo} ${data.total.toFixed(2)}</span>
        </div>
      </div>
    </div>

    <div class="legal-text">
      Generado digitalmente por <strong>${data.createdBy}</strong> el ${hoy} | 
      Documento validado por <strong>Galur Business Corporation</strong>
    </div>

  </div> </div>
</body>
</html>
  `
}