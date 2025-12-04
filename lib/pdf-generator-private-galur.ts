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
  console.log("=== Generando HTML Privado GALUR ===")
  console.log("Datos recibidos para HTML:", data)

  const formattedDate = format(new Date(data.quotationDate), "dd/MM/yyyy", { locale: es })
  const currentDate = format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })

  // Obtener información bancaria automáticamente si tenemos el código de empresa
  if (data.companyCode && !data.bankingInfo) {
    const bankingInfo = getBankingInfoByCompanyCode(data.companyCode)
    if (bankingInfo) {
      data.bankingInfo = bankingInfo
    }
    console.log("✅ Banking info obtained for GALUR:", data.companyCode, data.bankingInfo)
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
      <title>Cotización GALUR Privada ${data.quotationNumber}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap');
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Poppins', sans-serif;
          font-size: 9px;
          line-height: 1.4;
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
          padding: 5mm;
        }

        /* Header con diseño diagonal GALUR - Verde y Amarillo */
        .header-galur {
          background: linear-gradient(135deg, #166534 0%, #15803d 50%, #22c55e 100%);
          border-radius: 4mm;
          padding: 5mm;
          margin-bottom: 4mm;
          position: relative;
          overflow: hidden;
        }

        .header-galur::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -20%;
          width: 60%;
          height: 200%;
          background: linear-gradient(135deg, rgba(250,204,21,0.3) 0%, rgba(234,179,8,0.2) 100%);
          transform: rotate(-15deg);
        }

        .header-content-galur {
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: relative;
          z-index: 1;
        }

        .logo-section-galur {
          display: flex;
          align-items: center;
          gap: 4mm;
        }

        .logo-box-galur {
          background: white;
          border-radius: 3mm;
          padding: 3mm;
          box-shadow: 0 2mm 4mm rgba(0,0,0,0.2);
        }

        .logo-box-galur img {
          width: 70px;
          height: 50px;
          object-fit: contain;
        }

        .company-info-galur {
          color: white;
        }

        .company-name-galur {
          font-size: 20px;
          font-weight: 800;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
          margin-bottom: 1mm;
        }

        .company-ruc-galur {
          font-size: 10px;
          opacity: 0.9;
          background: rgba(255,255,255,0.2);
          padding: 1mm 2mm;
          border-radius: 2mm;
          display: inline-block;
        }

        .quotation-box-galur {
          background: white;
          border-radius: 3mm;
          padding: 4mm;
          text-align: center;
          box-shadow: 0 2mm 4mm rgba(0,0,0,0.2);
          border-left: 4px solid #eab308;
        }

        .quotation-label-galur {
          background: linear-gradient(90deg, #166534, #22c55e);
          color: white;
          font-size: 8px;
          font-weight: 700;
          padding: 1mm 3mm;
          border-radius: 10px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 2mm;
          display: inline-block;
        }

        .quotation-number-galur {
          font-size: 14px;
          font-weight: 800;
          color: #166534;
          margin-bottom: 1mm;
        }

        .quotation-date-galur {
          font-size: 9px;
          color: #666;
          margin-bottom: 2mm;
        }

        .status-galur {
          background: #fef3c7;
          color: #92400e;
          font-size: 8px;
          font-weight: 600;
          padding: 1mm 2mm;
          border-radius: 8px;
          display: inline-block;
        }

        /* Sección de marcas */
        .brands-section-galur {
          background: linear-gradient(90deg, #f0fdf4, #fefce8);
          border: 1px solid #86efac;
          border-radius: 3mm;
          padding: 3mm;
          margin-bottom: 4mm;
        }

        .brands-title-galur {
          text-align: center;
          font-size: 9px;
          font-weight: 600;
          color: #166534;
          margin-bottom: 2mm;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .brands-flex-galur {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 5mm;
          flex-wrap: wrap;
        }

        .brand-item-galur {
          background: white;
          padding: 2mm;
          border-radius: 2mm;
          box-shadow: 0 1mm 2mm rgba(0,0,0,0.1);
          text-align: center;
        }

        .brand-item-galur img {
          width: 50px;
          height: 35px;
          object-fit: contain;
        }

        /* Grid principal - Cliente y Condiciones */
        .main-grid-galur {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 3mm;
          margin-bottom: 4mm;
        }

        .client-card-galur {
          background: white;
          border: 1px solid #e5e5e5;
          border-radius: 3mm;
          overflow: hidden;
        }

        .card-header-galur {
          background: linear-gradient(90deg, #166534, #22c55e);
          color: white;
          padding: 2mm 3mm;
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .card-body-galur {
          padding: 3mm;
        }

        .field-row-galur {
          display: flex;
          justify-content: space-between;
          padding: 1.5mm 0;
          border-bottom: 1px solid #f5f5f5;
        }

        .field-row-galur:last-child {
          border-bottom: none;
        }

        .field-label-galur {
          font-size: 8px;
          color: #666;
          font-weight: 500;
          text-transform: uppercase;
        }

        .field-value-galur {
          font-size: 9px;
          color: #1a1a1a;
          font-weight: 600;
          text-align: right;
          max-width: 60%;
        }

        .conditions-card-galur {
          background: #fefce8;
          border: 1px solid #fde047;
          border-radius: 3mm;
          overflow: hidden;
        }

        .conditions-header-galur {
          background: linear-gradient(90deg, #ca8a04, #eab308);
          color: white;
          padding: 2mm 3mm;
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .conditions-body-galur {
          padding: 3mm;
        }

        .condition-item-galur {
          display: flex;
          align-items: flex-start;
          gap: 2mm;
          margin-bottom: 2mm;
        }

        .condition-num-galur {
          background: #166534;
          color: white;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 7px;
          font-weight: 700;
          flex-shrink: 0;
        }

        .condition-text-galur {
          font-size: 8px;
          color: #666;
          line-height: 1.3;
        }

        /* Tabla de productos */
        .products-section-galur {
          margin-bottom: 4mm;
        }

        .products-header-galur {
          background: linear-gradient(90deg, #166534, #15803d);
          color: white;
          padding: 2mm 3mm;
          border-radius: 3mm 3mm 0 0;
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .products-table-galur {
          width: 100%;
          border-collapse: collapse;
          border: 1px solid #166534;
          border-top: none;
        }

        .products-table-galur thead {
          background: #1a1a1a;
        }

        .products-table-galur th {
          color: white;
          padding: 2mm 1.5mm;
          font-size: 8px;
          font-weight: 600;
          text-align: center;
          text-transform: uppercase;
          border-right: 1px solid #333;
        }

        .products-table-galur th:last-child {
          border-right: none;
        }

        .products-table-galur td {
          padding: 2mm 1.5mm;
          font-size: 8px;
          border-bottom: 1px solid #e5e5e5;
          border-right: 1px solid #f0f0f0;
        }

        .products-table-galur td:last-child {
          border-right: none;
        }

        .products-table-galur tbody tr:nth-child(even) {
          background: #f9fafb;
        }

        .product-num-galur {
          background: #166534;
          color: white;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 8px;
          margin: 0 auto;
        }

        .product-desc-galur {
          font-weight: 600;
          color: #1a1a1a;
        }

        .product-code-galur {
          background: #166534;
          color: white;
          padding: 0.5mm 2mm;
          border-radius: 2mm;
          font-size: 7px;
          font-family: monospace;
          display: inline-block;
          margin-top: 1mm;
        }

        .qty-badge-galur {
          background: linear-gradient(135deg, #166534, #22c55e);
          color: white;
          padding: 1.5mm 2mm;
          border-radius: 2mm;
          font-weight: 700;
          text-align: center;
        }

        .unit-badge-galur {
          background: #f0fdf4;
          color: #166534;
          padding: 1mm 2mm;
          border-radius: 2mm;
          font-weight: 600;
          text-align: center;
        }

        .brand-cell-galur {
          text-align: center;
        }

        .brand-cell-galur img {
          width: 30px;
          height: 20px;
          object-fit: contain;
        }

        .price-cell-galur {
          text-align: right;
          font-weight: 600;
          color: #166534;
        }

        .total-cell-galur {
          text-align: right;
          background: linear-gradient(135deg, #166534, #22c55e);
          color: white;
          padding: 1.5mm 2mm;
          border-radius: 2mm;
          font-weight: 700;
        }

        /* Footer con Bancos, Totales y QR */
        .footer-grid-galur {
          display: grid;
          grid-template-columns: 1fr 1fr 0.8fr;
          gap: 3mm;
          margin-bottom: 4mm;
        }

        .banking-card-galur {
          background: white;
          border: 1px solid #e5e5e5;
          border-radius: 3mm;
          overflow: hidden;
        }

        .banking-header-galur {
          background: linear-gradient(90deg, #166534, #22c55e);
          color: white;
          padding: 2mm 3mm;
          font-size: 9px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .banking-body-galur {
          padding: 3mm;
        }

        .bank-row-galur {
          display: flex;
          justify-content: space-between;
          padding: 1mm 0;
          border-bottom: 1px solid #f5f5f5;
          font-size: 8px;
        }

        .bank-row-galur:last-child {
          border-bottom: none;
        }

        .bank-label-galur {
          color: #666;
          font-weight: 500;
        }

        .bank-value-galur {
          color: #1a1a1a;
          font-weight: 600;
          font-family: monospace;
        }

        .totals-card-galur {
          background: white;
          border: 1px solid #e5e5e5;
          border-radius: 3mm;
          overflow: hidden;
        }

        .totals-header-galur {
          background: linear-gradient(90deg, #ca8a04, #eab308);
          color: white;
          padding: 2mm 3mm;
          font-size: 9px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .totals-body-galur {
          padding: 3mm;
        }

        .total-row-galur {
          display: flex;
          justify-content: space-between;
          padding: 1.5mm 0;
          border-bottom: 1px solid #f5f5f5;
          font-size: 9px;
        }

        .total-row-galur.final {
          background: linear-gradient(90deg, #166534, #22c55e);
          color: white;
          margin: 2mm -3mm -3mm -3mm;
          padding: 2mm 3mm;
          border-bottom: none;
          font-size: 11px;
          font-weight: 700;
        }

        .qr-card-galur {
          background: #f0fdf4;
          border: 1px solid #86efac;
          border-radius: 3mm;
          padding: 3mm;
          text-align: center;
        }

        .qr-title-galur {
          font-size: 8px;
          font-weight: 600;
          color: #166534;
          margin-bottom: 2mm;
          text-transform: uppercase;
        }

        .qr-image-galur {
          background: white;
          padding: 2mm;
          border-radius: 2mm;
          display: inline-block;
          margin-bottom: 2mm;
        }

        .qr-image-galur img {
          width: 22mm;
          height: 22mm;
        }

        .qr-text-galur {
          font-size: 7px;
          color: #666;
          line-height: 1.3;
        }

        /* Footer final */
        .document-footer-galur {
          background: linear-gradient(90deg, #f0fdf4, #fefce8);
          border: 1px solid #86efac;
          border-radius: 3mm;
          padding: 3mm;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .footer-left-galur {
          font-size: 8px;
          color: #666;
        }

        .footer-right-galur {
          text-align: right;
          font-size: 8px;
          color: #666;
        }

        .footer-brand-galur {
          font-weight: 700;
          color: #166534;
        }
      </style>
    </head>
    <body>
      <div class="document-container">
        <!-- Header -->
        <div class="header-galur">
          <div class="header-content-galur">
            <div class="logo-section-galur">
              <div class="logo-box-galur">
                ${data.companyLogoUrl ? `<img src="${data.companyLogoUrl}" alt="Logo">` : `<div style="width:70px;height:50px;background:#166534;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;">GALUR</div>`}
              </div>
              <div class="company-info-galur">
                <div class="company-name-galur">${data.companyName}</div>
                <div class="company-ruc-galur">RUC: ${data.companyRuc}</div>
              </div>
            </div>
            <div class="quotation-box-galur">
              <div class="quotation-label-galur">Cotización Privada</div>
              <div class="quotation-number-galur">${data.quotationNumber}</div>
              <div class="quotation-date-galur">${formattedDate}</div>
              <div class="status-galur">${getStatusLabel(data.status)}</div>
            </div>
          </div>
        </div>

        <!-- Marcas -->
        ${
          uniqueBrands.length > 0
            ? `
        <div class="brands-section-galur">
          <div class="brands-title-galur">Marcas Representadas</div>
          <div class="brands-flex-galur">
            ${uniqueBrands
              .map(
                (brand) => `
              <div class="brand-item-galur">
                <img src="${brand.logoUrl}" alt="${brand.name}">
              </div>
            `,
              )
              .join("")}
          </div>
        </div>
        `
            : ""
        }

        <!-- Grid Cliente y Condiciones -->
        <div class="main-grid-galur">
          <div class="client-card-galur">
            <div class="card-header-galur">Información del Cliente</div>
            <div class="card-body-galur">
              <div class="field-row-galur">
                <span class="field-label-galur">Razón Social</span>
                <span class="field-value-galur">${data.clientName}</span>
              </div>
              <div class="field-row-galur">
                <span class="field-label-galur">RUC</span>
                <span class="field-value-galur">${data.clientRuc}</span>
              </div>
              <div class="field-row-galur">
                <span class="field-label-galur">Código</span>
                <span class="field-value-galur">${data.clientCode}</span>
              </div>
              <div class="field-row-galur">
                <span class="field-label-galur">Dirección</span>
                <span class="field-value-galur">${addressToDisplay}</span>
              </div>
              ${
                data.contactPerson
                  ? `
              <div class="field-row-galur">
                <span class="field-label-galur">Atención</span>
                <span class="field-value-galur">${data.contactPerson}</span>
              </div>
              `
                  : ""
              }
              ${
                data.clientEmail
                  ? `
              <div class="field-row-galur">
                <span class="field-label-galur">Email</span>
                <span class="field-value-galur">${data.clientEmail}</span>
              </div>
              `
                  : ""
              }
            </div>
          </div>
          <div class="conditions-card-galur">
            <div class="conditions-header-galur">Condiciones</div>
            <div class="conditions-body-galur">
              <div class="condition-item-galur">
                <span class="condition-num-galur">1</span>
                <span class="condition-text-galur">Moneda: ${data.currency === "USD" ? "Dólares" : "Soles"}</span>
              </div>
              <div class="condition-item-galur">
                <span class="condition-num-galur">2</span>
                <span class="condition-text-galur">Precios incluyen IGV</span>
              </div>
              <div class="condition-item-galur">
                <span class="condition-num-galur">3</span>
                <span class="condition-text-galur">Validez: ${data.validUntil ? formatDate(data.validUntil) : "15 días"}</span>
              </div>
              <div class="condition-item-galur">
                <span class="condition-num-galur">4</span>
                <span class="condition-text-galur">Stock sujeto a disponibilidad</span>
              </div>
              <div class="condition-item-galur">
                <span class="condition-num-galur">5</span>
                <span class="condition-text-galur">Lugar de entrega según coordinación</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Tabla de Productos -->
        <div class="products-section-galur">
          <div class="products-header-galur">Detalle de Productos</div>
          <table class="products-table-galur">
            <thead>
              <tr>
                <th style="width:5%">#</th>
                <th style="width:35%">Descripción</th>
                <th style="width:10%">Cant.</th>
                <th style="width:10%">Unidad</th>
                <th style="width:12%">Marca</th>
                <th style="width:14%">P. Unit.</th>
                <th style="width:14%">Total</th>
              </tr>
            </thead>
            <tbody>
              ${data.products
                .map(
                  (product, index) => `
                <tr>
                  <td><div class="product-num-galur">${index + 1}</div></td>
                  <td>
                    <div class="product-desc-galur">${product.description}</div>
                    ${product.code ? `<span class="product-code-galur">${product.code}</span>` : ""}
                  </td>
                  <td><div class="qty-badge-galur">${product.quantity}</div></td>
                  <td><div class="unit-badge-galur">${product.unit}</div></td>
                  <td class="brand-cell-galur">
                    ${product.brandLogoUrl ? `<img src="${product.brandLogoUrl}" alt="${product.brand || ""}">` : product.brand || "-"}
                  </td>
                  <td class="price-cell-galur">${data.currency === "USD" ? "$" : "S/"} ${product.unitPrice.toFixed(2)}</td>
                  <td><div class="total-cell-galur">${data.currency === "USD" ? "$" : "S/"} ${product.totalPrice.toFixed(2)}</div></td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
        </div>

        <!-- Footer Grid: Bancos, Totales, QR -->
        <div class="footer-grid-galur">
          <div class="banking-card-galur">
            <div class="banking-header-galur">Información Bancaria</div>
            <div class="banking-body-galur">
              ${
                data.bankingInfo?.bankAccount
                  ? `
                <div class="bank-row-galur">
                  <span class="bank-label-galur">Banco</span>
                  <span class="bank-value-galur">${data.bankingInfo.bankAccount.bank}</span>
                </div>
                <div class="bank-row-galur">
                  <span class="bank-label-galur">Cuenta ${data.bankingInfo.bankAccount.type}</span>
                  <span class="bank-value-galur">${data.bankingInfo.bankAccount.accountNumber}</span>
                </div>
                <div class="bank-row-galur">
                  <span class="bank-label-galur">CCI</span>
                  <span class="bank-value-galur">${data.bankingInfo.bankAccount.cci}</span>
                </div>
              `
                  : '<div class="bank-row-galur"><span class="bank-label-galur">Sin información bancaria</span></div>'
              }
              ${
                data.bankingInfo?.detractionAccount
                  ? `
                <div class="bank-row-galur" style="margin-top:2mm;padding-top:2mm;border-top:1px solid #e5e5e5;">
                  <span class="bank-label-galur">Cta. Detracción</span>
                  <span class="bank-value-galur">${data.bankingInfo.detractionAccount.accountNumber}</span>
                </div>
              `
                  : ""
              }
            </div>
          </div>

          <div class="totals-card-galur">
            <div class="totals-header-galur">Resumen</div>
            <div class="totals-body-galur">
              <div class="total-row-galur">
                <span>Subtotal</span>
                <span>${data.currency === "USD" ? "$" : "S/"} ${data.subtotal.toFixed(2)}</span>
              </div>
              <div class="total-row-galur">
                <span>IGV (18%)</span>
                <span>${data.currency === "USD" ? "$" : "S/"} ${data.igv.toFixed(2)}</span>
              </div>
              <div class="total-row-galur final">
                <span>TOTAL</span>
                <span>${data.currency === "USD" ? "$" : "S/"} ${data.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div class="qr-card-galur">
            <div class="qr-title-galur">Verificación</div>
            <div class="qr-image-galur">
              ${data.qrCodeBase64 ? `<img src="${data.qrCodeBase64}" alt="QR">` : '<div style="width:22mm;height:22mm;background:#e5e5e5;display:flex;align-items:center;justify-content:center;font-size:7px;color:#666;">QR</div>'}
            </div>
            <div class="qr-text-galur">Escanee para verificar autenticidad</div>
          </div>
        </div>

        <!-- Footer final -->
        <div class="document-footer-galur">
          <div class="footer-left-galur">
            <div>Elaborado por: <strong>${data.createdBy}</strong></div>
            <div>Generado: ${currentDate}</div>
          </div>
          <div class="footer-right-galur">
            <div class="footer-brand-galur">GALUR</div>
            <div>Sistema de Cotizaciones ATLAS</div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `
}
