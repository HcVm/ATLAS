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
  clientAddress: string
  clientDepartment?: string
  clientAttention: string
  currency: string

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

  // Observaciones
  observations?: string

  // Creado por
  createdBy: string
}

const generateQRForARMQuotation = async (
  quotationNumber: string,
  data: ARMPrivateQuotationPDFData,
): Promise<string> => {
  try {
    console.log("🔐 Creando validación ARM a través de API...")

    // Llamar al endpoint de validación - IGUAL QUE PDF ENTIDAD
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
    console.log("🔗 URL de validación ARM:", validationUrl)

    // Generar QR usando EXACTAMENTE la misma configuración que funciona en documentos
    console.log("📱 Generando código QR ARM...")
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

export const generateARMPrivateQuotationPDF = async (data: ARMPrivateQuotationPDFData) => {
  console.log("=== Generando PDF ARM Privado ===")
  console.log("Datos recibidos:", data)

  try {
    const qrCodeBase64 = await generateQRForARMQuotation(data.quotationNumber, data)
    const html = generateARMPrivateQuotationHTML({
      ...data,
      qrCodeBase64,
      quotationNumber: data.quotationNumber,
      quotationDate: data.quotationDate,
      status: data.status,
      observations: data.observations,
      createdBy: data.createdBy,
    })

    // Crear un iframe oculto para generar el PDF
    const iframe = document.createElement("iframe")
    iframe.style.position = "absolute"
    iframe.style.left = "-9999px"
    iframe.style.width = "210mm"
    iframe.style.height = "297mm"
    document.body.appendChild(iframe)

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
    if (!iframeDoc) {
      throw new Error("No se pudo acceder al documento del iframe")
    }

    iframeDoc.open()
    iframeDoc.write(html)
    iframeDoc.close()

    // Esperar a que se carguen las imágenes
    await new Promise((resolve) => {
      const images = iframeDoc.querySelectorAll("img")
      let loadedImages = 0
      const totalImages = images.length

      if (totalImages === 0) {
        resolve(void 0)
        return
      }

      images.forEach((img) => {
        if (img.complete) {
          loadedImages++
          if (loadedImages === totalImages) {
            resolve(void 0)
          }
        } else {
          img.onload = img.onerror = () => {
            loadedImages++
            if (loadedImages === totalImages) {
              resolve(void 0)
            }
          }
        }
      })

      // Timeout de seguridad
      setTimeout(() => resolve(void 0), 3000)
    })

    // Generar el PDF usando la API del navegador
    if (iframe.contentWindow) {
      iframe.contentWindow.print()
    }

    // Limpiar el iframe después de un tiempo
    setTimeout(() => {
      document.body.removeChild(iframe)
    }, 1000)

    console.log("✅ PDF ARM privado generado exitosamente")
  } catch (error) {
    console.error("❌ Error generando PDF ARM privado:", error)
    throw new Error(`Error al generar el PDF ARM privado: ${error}`)
  }
}

const generateARMPrivateQuotationHTML = (data: ARMPrivateQuotationPDFData): string => {
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

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Cotización ARM Privada ${data.quotationNumber}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        
        @page {
          size: A4;
          margin: 10mm;
        }
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Inter', sans-serif;
          font-size: 9px;
          line-height: 1.3;
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
        
        .header {
          background: linear-gradient(135deg, #ea580c 0%, #dc2626 100%);
          color: white;
          padding: 8mm;
          border-radius: 4mm;
          margin-bottom: 5mm;
          position: relative;
          overflow: hidden;
          page-break-inside: avoid;
        }
        
        .header::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-image: 
            radial-gradient(circle at 20% 20%, rgba(255,255,255,0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, rgba(255,255,255,0.1) 0%, transparent 50%);
          pointer-events: none;
        }
        
        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          position: relative;
          z-index: 1;
        }
        
        .company-info {
          display: flex;
          align-items: flex-start;
          gap: 8mm;
          flex: 1;
        }
        
        .company-logo {
          padding: 2mm;
          border-radius: 3mm;
          background: none;
          flex-shrink: 0;
        }
        
        .company-logo img {
          width: 140px;
          height: 100px;
          object-fit: contain;
          background: none;
        }
        
        .company-details {
          flex: 1;
        }
        
        .company-details h1 {
          font-size: 18px;
          font-weight: 800;
          margin-bottom: 2mm;
        }

        .conditions-qr-combined-section {
            margin-bottom: 5mm;
            page-break-inside: avoid;
        }

        .conditions-qr-content {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 5mm;
        }

        .conditions {
            width: 65%;
            background: linear-gradient(135deg, #fff7ed, #fed7aa);
            border: 0.5px solid #fed7aa;
            border-radius: 2mm;
            padding: 4mm;
            page-break-inside: avoid;
        }

        .qr-validation-panel {
            background: white;
            border: 0.5px solid #fed7aa;
            border-radius: 2mm;
            padding: 4mm;
            box-shadow: 0 1mm 3mm rgba(0,0,0,0.1);
            width: 35%;
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            page-break-inside: avoid;
        }

        .qr-code-panel {
            background: white;
            padding: 2mm;
            border-radius: 1.5mm;
            box-shadow: 0 0.5mm 1.5mm rgba(0,0,0,0.1);
            margin-bottom: 3mm;
        }

        .qr-code-panel img {
            width: 25mm;
            height: 25mm;
            object-fit: contain;
        }

        .validation-info-panel h3 {
            font-size: 11px;
            font-weight: 700;
            color: #1e293b;
            margin-bottom: 1mm;
        }

        .validation-info-panel p {
            color: #64748b;
            margin-bottom: 0.5mm;
            font-size: 8px;
        }

        .system-info-panel {
            margin-top: auto;
            padding-top: 3mm;
            border-top: 0.5px solid #fed7aa;
            width: 100%;
            font-size: 8px;
            color: #64748b;
            text-align: center;
        }
        
        .company-details p {
          font-size: 10px;
          opacity: 0.9;
          margin-bottom: 0.5mm;
        }
        
        .brands-in-header {
          margin-top: 4mm;
          padding-top: 3mm;
        }
        
        .brands-header-title {
          font-size: 12px;
          font-weight: 700;
          margin-bottom: 3mm;
          color: white;
          opacity: 0.9;
        }
        
        .brands-grid-header {
          display: flex;
          flex-wrap: wrap;
          gap: 4mm;
          align-items: center;
        }
        
        .brand-card-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          min-width: 60px;
        }
        
        .brand-logo-container-header {
          margin-bottom: 2mm;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .brand-logo-container-header img {
          width: 120px;
          height: auto;
          object-fit: contain;
        }

        .img-logo {
          width: 120px;
          height: auto;
        }
        
        .brand-name-header {
          font-size: 10px;
          font-weight: 700;
          color: white;
          text-shadow: 0 1px 2px rgba(0,0,0,0.5);
          background: rgba(0,0,0,0.2);
          padding: 1mm 2mm;
          border-radius: 2mm;
          backdrop-filter: blur(5px);
        }
        
        .quotation-panel {
          background: white;
          color: #1e293b;
          padding: 5mm;
          border-radius: 3mm;
          box-shadow: 0 2mm 5mm rgba(0,0,0,0.2);
          min-width: 45mm;
          text-align: center;
          flex-shrink: 0;
        }
        
        .quotation-panel h2 {
          font-size: 13px;
          font-weight: 700;
          color: #ea580c;
          margin-bottom: 1mm;
        }
        
        .quotation-panel .subtitle {
          font-size: 11px;
          font-weight: 600;
          color: #dc2626;
          margin-bottom: 3mm;
          padding-bottom: 2mm;
          border-bottom: 1px solid #fed7aa;
        }
        
        .quotation-number {
          font-size: 12px;
          font-weight: 700;
          margin-bottom: 1mm;
        }
        
        .quotation-date {
          color: #64748b;
          margin-bottom: 2mm;
          font-size: 10px;
        }
        
        .status-badge {
          display: inline-block;
          padding: 1mm 2mm;
          background: #fff7ed;
          color: #ea580c;
          border-radius: 2mm;
          font-size: 9px;
          font-weight: 600;
        }
        
        .section {
          margin-bottom: 5mm;
          page-break-inside: avoid;
        }
        
        .section-title {
          display: flex;
          align-items: center;
          margin-bottom: 3mm;
        }
        
        .section-title h2 {
          font-size: 14px;
          font-weight: 700;
          color: #1e293b;
        }
        
        .section-title::after {
          content: '';
          flex: 1;
          height: 1px;
          background: linear-gradient(90deg, #ea580c, #dc2626);
          border-radius: 0.5px;
          margin-left: 3mm;
          max-width: 30mm;
        }
        
        .client-info {
          background: linear-gradient(135deg, #fff7ed, #fed7aa);
          border: 0.5px solid #fed7aa;
          border-radius: 3mm;
          padding: 4mm;
          page-break-inside: avoid;
        }
        
        .client-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4mm;
          margin-top: 2mm;
        }
        
        .client-field {
          margin-bottom: 2mm;
        }
        
        .client-field label {
          font-weight: 600;
          color: #9a3412;
          display: block;
          margin-bottom: 0.5mm;
          font-size: 9px;
        }
        
        .client-field .value {
          font-size: 11px;
          font-weight: 600;
          color: #1e293b;
        }

        .banking-content {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 4mm;
        }
        
        .banking-text {
          font-family: 'Inter', monospace;
          font-size: 9px;
          line-height: 1.4;
          color: #1e293b;
          white-space: pre-wrap;
          margin: 0;
          flex: 1;
        }
        
        .products-table {
          width: 100%;
          border-collapse: collapse;
          border-radius: 2mm;
          overflow: hidden;
          box-shadow: 0 1mm 3mm rgba(0,0,0,0.1);
          page-break-after: auto;
        }
        
        .products-table thead {
          background: linear-gradient(90deg, #ea580c, #dc2626);
          color: white;
        }
        
        .products-table th {
          padding: 2mm 1mm;
          font-weight: 600;
          text-align: center;
          font-size: 9px;
        }
        
        .products-table td {
          padding: 2mm 1mm;
          border-bottom: 0.25px solid #fed7aa;
          font-size: 9px;
        }
        
        .products-table tbody tr {
          page-break-inside: avoid;
        }
        
        .products-table tbody tr:nth-child(even) {
          background: #fff7ed;
        }
        
        .product-description {
          font-weight: 600;
          color: #1e293b;
          font-size: 9px;
        }
        
        .brand-badge {
          display: inline-block;
          padding: 0.5mm 1mm;
          background: #fff7ed;
          color: #ea580c;
          border-radius: 1mm;
          font-size: 8px;
          font-weight: 600;
        }
        
        .totals-container {
          display: flex;
          justify-content: flex-end;
          page-break-inside: avoid;
        }
        
        .totals-box {
          background: white;
          border: 0.5px solid #fed7aa;
          border-radius: 2mm;
          padding: 4mm;
          box-shadow: 0 1mm 3mm rgba(0,0,0,0.1);
          min-width: 6mm;
        }
        
        .totals-header {
          background: linear-gradient(135deg, #fff7ed, #fed7aa);
          border-radius: 1.5mm;
          padding: 2mm;
          text-align: center;
          margin-bottom: 2mm;
        }
        
        .totals-header h3 {
          font-size: 11px;
          font-weight: 700;
          color: #ea580c;
        }
        
        .totals-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1mm 0;
          font-size: 8px;
        }
        
        .totals-row.subtotal,
        .totals-row.igv {
          font-weight: 600;
          color: #9a3412;
        }
        
        .totals-row.total {
          background: linear-gradient(90deg, #ea580c, #dc2626);
          color: white;
          border-radius: 1.5mm;
          padding: 2mm;
          margin-top: 2mm;
          font-size: 11px;
          font-weight: 700;
        }
        
        /* Sección combinada sin espacio extra */
        .banking-totals-section {
          page-break-inside: avoid;
        }
        
        .banking-totals-content {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 4mm;
        }
        
        .banking-info-container {
          flex: 1;
        }
        
        .condition-item {
          display: flex;
          align-items: flex-start;
          margin-bottom: 2mm;
        }
        
        .condition-number {
          width: 4mm;
          height: 4mm;
          background: linear-gradient(135deg, #ea580c, #dc2626);
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 8px;
          margin-right: 2mm;
          flex-shrink: 0;
        }
        
        .condition-text {
          color: #374151;
          line-height: 1.3;
          font-size: 9px;
        }
        
        .footer {
          background: linear-gradient(135deg, #fff7ed, #fed7aa);
          border-top: 1px solid #ea580c;
          padding: 4mm;
          border-radius: 0 0 2mm 2mm;
          display: flex;
          justify-content: space-between;
          align-items: center;
          page-break-inside: avoid;
        }
        
        .qr-section {
          display: flex;
          align-items: center;
          gap: 3mm;
        }
        
        .qr-code {
          background: white;
          padding: 2mm;
          border-radius: 1.5mm;
          box-shadow: 0 0.5mm 1.5mm rgba(0,0,0,0.1);
        }
        
        .qr-placeholder {
          width: 12mm;
          height: 12mm;
          background: #fed7aa;
          border-radius: 1mm;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 7px;
          color: #9a3412;
          text-align: center;
        }
        
        .validation-info h3 {
          font-size: 11px;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 1mm;
        }
        
        .validation-info p {
          color: #64748b;
          margin-bottom: 0.5mm;
          font-size: 8px;
        }
        
        .system-info {
          text-align: right;
          color: #64748b;
        }
        
        .system-info p {
          margin-bottom: 0.5mm;
          font-size: 8px;
        }
        
        @media print {
          .container {
            max-width: none;
          }
          
          .header {
            margin-bottom: 3mm;
          }
          
          .section {
            margin-bottom: 3mm;
          }
          
          .banking-totals-section {
            margin-bottom: 3mm;
          }
          
          .products-table thead {
            display: table-header-group;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header Principal ARM -->
        <div class="header">
          <div class="header-content">
            <!-- Logo y datos de empresa ARM -->
            <div class="company-info">
              ${
                data.companyLogoUrl
                  ? `
                <div class="company-logo">
                  <img src="${data.companyLogoUrl}" alt="${data.companyName}">
                </div>
              `
                  : ""
              }
              <div class="company-details">
                <h1>${data.companyName}</h1>
                <p>RUC: ${data.companyRuc}</p>
                ${data.companyAddress ? `<p>${data.companyAddress}</p>` : ""}
                ${
                  data.companyPhone || data.companyEmail
                    ? `<p>${[data.companyPhone, data.companyEmail].filter(Boolean).join(" • ")}</p>`
                    : ""
                }

                <!-- Sección de Marcas dentro del Header ARM - Sin Fondos -->
                ${
                  uniqueBrands.length > 0
                    ? `
                  <div class="brands-in-header">
                    <div class="brands-header-title">MARCAS REPRESENTADAS</div>
                    <div class="brands-grid-header">
                      ${uniqueBrands
                        .map(
                          ({ name, logoUrl }) => `
                        <div class="brand-card-header">
                          <div class="brand-logo-container-header">
                            <img class="img-logo" src="${logoUrl}" alt="${name}" onerror="this.style.display='none'">
                          </div>
                          <div class="brand-name-header">${name}</div>
                        </div>
                      `,
                        )
                        .join("")}
                    </div>
                  </div>
                `
                    : ""
                }
              </div>
            </div>
            
            <!-- Panel de cotización ARM -->
            <div class="quotation-panel">
              <h2>COTIZACIÓN</h2>
              <div class="subtitle">COMERCIAL PRIVADA</div>
              <div class="quotation-number">N° ${data.quotationNumber}</div>
              <div class="quotation-date">${formattedDate}</div>
              <div class="status-badge">${getStatusLabel(data.status)}</div>
            </div>
          </div>
        </div>

        <!-- Información del Cliente ARM -->
        <div class="section">
          <div class="section-title">
            <h2>INFORMACIÓN DEL CLIENTE</h2>
          </div>
          
          <div class="client-info">
            <div class="client-grid">
              <div>
                <div class="client-field">
                  <label>Cliente:</label>
                  <div class="value">${data.clientName}</div>
                </div>
                <div class="client-field">
                  <label>RUC:</label>
                  <div class="value">${data.clientRuc}</div>
                </div>
              </div>
              <div>
                <div class="client-field">
                  <label>Atención:</label>
                  <div class="value">${data.clientAttention}</div>
                </div>
                <div class="client-field">
                  <label>Dirección:</label>
                  <div class="value">${data.clientAddress}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Tabla de Productos ARM -->
        <div class="section">
          <div class="section-title">
            <h2>DETALLE DE PRODUCTOS</h2>
          </div>
          
          <table class="products-table">
            <thead>
              <tr>
                <th style="width: 6%;">#</th>
                <th style="width: 12%;">Código</th>
                <th style="width: 40%;">Descripción</th>
                <th style="width: 10%;">Marca</th>
                <th style="width: 8%;">Cant.</th>
                <th style="width: 6%;">Unid.</th>
                <th style="width: 9%;">P. Unit.</th>
                <th style="width: 9%;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${data.products
                .map(
                  (product, index) => `
                <tr>
                  <td style="text-align: center; font-weight: 600;">${index + 1}</td>
                  <td style="text-align: center; font-family: monospace; font-size: 6px;">${product.code || "-"}</td>
                  <td>
                    <div class="product-description">${product.description}</div>
                  </td>
                  <td style="text-align: center;">
                    ${product.brand ? `<span class="brand-badge">${product.brand}</span>` : "-"}
                  </td>
                  <td style="text-align: center; font-weight: 600;">${product.quantity.toLocaleString()}</td>
                  <td style="text-align: center;">${product.unit}</td>
                  <td style="text-align: right; font-weight: 600;">S/ ${product.unitPrice.toFixed(2)}</td>
                  <td style="text-align: right; font-weight: 700; color: #ea580c;">S/ ${product.totalPrice.toFixed(2)}</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
        </div>

        <!-- Información Bancaria y Totales Combinados ARM -->
        <div class="banking-totals-section">
          <div class="section-title">
            <h2>INFORMACIÓN BANCARIA Y CONTACTO</h2>
          </div>
          
          <div class="banking-totals-content">
            <div class="banking-info-container">
              ${
                data.bankingInfo?.bankAccount
                  ? `
                <div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 6px; padding: 10px; border-left: 4px solid #ea580c;">
                  <div style="margin-bottom: 6px;">
                    <span style="color: black; border-radius: 4px; padding: 2px 5px; font-size: 8px; font-weight: 700;">💳 DATOS BANCARIOS</span>
                  </div>
                  <p style="margin: 4px 0; font-size: 9px; color: #374151;"><strong>${data.bankingInfo.bankAccount.type} ${data.bankingInfo.bankAccount.bank}:</strong></p>
                  <p style="margin: 3px 0; font-size: 9px; color: #374151; font-family: monospace;"><strong>CTA:</strong> ${data.bankingInfo.bankAccount.accountNumber}</p>
                  <p style="margin: 0; font-size: 9px; color: #374151; font-family: monospace;"><strong>CCI:</strong> ${data.bankingInfo.bankAccount.cci}</p>

                  <p style="margin: 5px 0 5px 0; color: #374151; font-weight: 600; font-size: 8px;">${data.bankingInfo.fiscalAddress}</p>
                  <p style="margin: 0 0 5px 0; color: #374151; font-weight: 600; font-size: 8px;">Email: ${data.bankingInfo.contactInfo?.email}</p>
                  <p style="margin: 0 0 5px 0; color: #374151; font-weight: 600; font-size: 8px;">${data.bankingInfo.contactInfo?.phone}</p>
                </div>
                `
                  : data.companyAccountInfo
                    ? `
                <div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 6px; padding: 10px; border-left: 4px solid #ea580c;">
                  <p style="margin: 3px 0; font-size: 10px; color: #374151; font-family: monospace;"><strong>CUENTA:</strong> ${data.companyAccountInfo}</p>
                  <div style="margin-top: 6px;">
                    <span style="background: #9a3412; color: white; padding: 3px 6px; border-radius: 4px; font-size: 9px; font-weight: 700;">BCP</span>
                  </div>
                </div>
                `
                    : ""
              }
            </div>

            <!-- Totales ARM -->
            <div class="totals-container">
              <div class="totals-box">
                <div class="totals-header">
                  <h3>RESUMEN DE TOTALES</h3>
                </div>
                
                <div class="totals-row subtotal">
                  <span>Subtotal:</span>
                  <span>S/ ${data.subtotal.toFixed(2)}</span>
                </div>
                <div class="totals-row igv">
                  <span>IGV (18%):</span>
                  <span>S/ ${data.igv.toFixed(2)}</span>
                </div>
                <div class="totals-row total">
                  <span>TOTAL:</span>
                  <span>S/ ${data.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Condiciones de Venta ARM -->
        <div class="section conditions-qr-combined-section">
          <div class="section-title">
            <h2>CONDICIONES DE VENTA Y VALIDACIÓN</h2>
          </div>
          
          <div class="conditions-qr-content">
            <div class="conditions">
              ${[
                "Plazo de entrega: 10 días hábiles, contados dos días después de verificado la recepción de pago al 100%.",
                "Lugar de entrega: Recojo en almacén de 8.00am-12.00pm / 2pm-6:00pm.",
                "FORMA DE PAGO: Contado al 100%.",
                "Validez de esta oferta: Solo por 5 días hábiles.",
                "No hay devolución de dinero, posterior al recojo.",
                "Sí, el producto presentara fallas por desperfecto de fábrica, se procederá a resolver el reclamo en un plazo máximo de 10 días.",
                "Todo producto debe ser verificado antes de retirarse de nuestro almacén.",
              ]
                .map(
                  (condition, index) => `
                <div class="condition-item">
                  <div class="condition-number">${index + 1}</div>
                  <div class="condition-text">${condition}</div>
                </div>
              `,
                )
                .join("")}
            </div>

            <div class="qr-validation-panel">
                <div class="qr-code-panel">
                    <img src="${data.qrCodeBase64}" alt="QR Code" style="width: 25mm; height: 25mm;">
                </div>
                <div class="validation-info-panel">
                    <h3>VALIDACIÓN DEL DOCUMENTO</h3>
                    <p>Escanee el código QR para validar la autenticidad</p>
                    <p>Código: ${data.quotationNumber}</p>
                    <p>Generado: ${currentDate}</p>
                </div>
            </div>
          </div>
        </div>

        ${
          data.observations
            ? `
          <!-- Observaciones ARM -->
          <div class="section">
            <div class="section-title">
              <h2>OBSERVACIONES</h2>
            </div>
            
            <div class="conditions">
              <div class="condition-text" style="margin-left: 0;">
                ${data.observations}
              </div>
            </div>
          </div>
        `
            : ""
        }

        <!-- Información del documento ARM -->
          <div style="margin-top: 12px; text-align: center; font-size: 8px; color: #9ca3af; padding: 10px; border-top: 1px solid #fff7ed;">
            <p style="margin: 0 0 3px 0;">Cotización ARM generada el ${new Date().toLocaleDateString("es-PE")} por <strong>${data.createdBy}</strong></p>
            <p style="margin: 0;">Estado: <strong>${getStatusLabel(data.status)}</strong> | Válida hasta: <strong>${data.validUntil ? formatDate(data.validUntil) : "No especificado"}</strong></p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `
}
