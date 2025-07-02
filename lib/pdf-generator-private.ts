import { format } from "date-fns"
import { es } from "date-fns/locale"
import jsPDF from "jspdf"
import "jspdf-autotable"
// Define UserOptions type locally since jspdf-autotable types are not available
type UserOptions = {
  html?: string | HTMLTableElement;
  head?: any[][];
  body?: any[][];
  foot?: any[][];
  columns?: any[];
  startY?: number;
  margin?: { top?: number; right?: number; bottom?: number; left?: number };
  pageBreak?: 'auto' | 'avoid' | 'always';
  rowPageBreak?: 'auto' | 'avoid';
  showHead?: 'everyPage' | 'firstPage' | 'never';
  showFoot?: 'everyPage' | 'lastPage' | 'never';
  theme?: string;
  styles?: any;
  headStyles?: any;
  bodyStyles?: any;
  footStyles?: any;
  alternateRowStyles?: any;
  columnStyles?: any;
  didParseCell?: (data: any) => void;
  willDrawCell?: (data: any) => void;
  didDrawCell?: (data: any) => void;
  didDrawPage?: (data: any) => void;
}

interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: UserOptions) => jsPDF
}

interface QuotationItem {
  id: string
  product_name: string
  product_brand: string
  quantity: number
  unit_price: number
  total_price: number
}

interface Quotation {
  id: string
  quotation_number: string
  client_name: string
  client_email: string
  client_phone: string
  client_address: string
  total_amount: number
  status: string
  created_at: string
  observations?: string
  quotation_items: QuotationItem[]
}

interface Company {
  name: string
  ruc: string
  address: string
  phone: string
  email: string
  logo_url?: string
}

export interface PrivateQuotationPDFData {
  // Información de la empresa
  companyName: string
  companyRuc: string
  companyCode: string
  companyAddress?: string
  companyPhone?: string
  companyEmail?: string
  companyLogoUrl?: string
  companyAccountInfo: string

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

// Función para obtener logos únicos de marcas
const getUniqueBrandLogos = (products: PrivateQuotationPDFData["products"]) => {
  const brandLogos = new Map<string, string>()

  products.forEach((product) => {
    if (product.brand && product.brandLogoUrl && !brandLogos.has(product.brand)) {
      brandLogos.set(product.brand, product.brandLogoUrl)
    }
  })

  return brandLogos
}

const generatePrivateQuotationHTML = (data: PrivateQuotationPDFData): string => {
  const brandLogos = getUniqueBrandLogos(data.products)
  const formattedDate = format(new Date(data.quotationDate), "dd/MM/yyyy", { locale: es })
  const currentDate = format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Cotización Privada ${data.quotationNumber}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        
        @page {
          size: A4;
          margin: 15mm;
        }
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Inter', sans-serif;
          font-size: 11px;
          line-height: 1.4;
          color: #1e293b;
          background: white;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        
        .container {
          max-width: 180mm;
          margin: 0 auto;
        }
        
        .header {
          background: linear-gradient(135deg, #1e40af 0%, #6366f1 100%);
          color: white;
          padding: 15mm;
          border-radius: 8px;
          margin-bottom: 8mm;
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
          gap: 15mm;
        }
        
        .company-logo {
          background: white;
          padding: 8mm;
          border-radius: 6mm;
          box-shadow: 0 2mm 6mm rgba(0,0,0,0.2);
        }
        
        .company-logo img {
          width: 40px;
          height: 40px;
          object-fit: contain;
        }
        
        .company-details h1 {
          font-size: 18px;
          font-weight: 800;
          margin-bottom: 3mm;
        }
        
        .company-details p {
          font-size: 10px;
          opacity: 0.9;
          margin-bottom: 1mm;
        }
        
        .quotation-panel {
          background: white;
          color: #1e293b;
          padding: 8mm;
          border-radius: 6mm;
          box-shadow: 0 3mm 8mm rgba(0,0,0,0.2);
          min-width: 60mm;
          text-align: center;
        }
        
        .quotation-panel h2 {
          font-size: 14px;
          font-weight: 700;
          color: #1d4ed8;
          margin-bottom: 2mm;
        }
        
        .quotation-panel .subtitle {
          font-size: 11px;
          font-weight: 600;
          color: #6366f1;
          margin-bottom: 4mm;
          padding-bottom: 3mm;
          border-bottom: 1px solid #e2e8f0;
        }
        
        .quotation-number {
          font-size: 12px;
          font-weight: 700;
          margin-bottom: 2mm;
        }
        
        .quotation-date {
          color: #64748b;
          margin-bottom: 3mm;
          font-size: 10px;
        }
        
        .status-badge {
          display: inline-block;
          padding: 2mm 4mm;
          background: #dbeafe;
          color: #1d4ed8;
          border-radius: 4mm;
          font-size: 9px;
          font-weight: 600;
        }
        
        .section {
          margin-bottom: 8mm;
          page-break-inside: avoid;
        }
        
        .section-title {
          display: flex;
          align-items: center;
          margin-bottom: 5mm;
        }
        
        .section-title h2 {
          font-size: 16px;
          font-weight: 700;
          color: #1e293b;
        }
        
        .section-title::after {
          content: '';
          flex: 1;
          height: 2px;
          background: linear-gradient(90deg, #3b82f6, #6366f1);
          border-radius: 1px;
          margin-left: 5mm;
          max-width: 40mm;
        }
        
        .brands-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 4mm;
        }
        
        .brand-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 4mm;
          padding: 4mm;
          text-align: center;
          box-shadow: 0 1mm 3mm rgba(0,0,0,0.05);
          page-break-inside: avoid;
        }
        
        .brand-logo-container {
          background: linear-gradient(135deg, #dbeafe, #f1f5f9);
          border-radius: 3mm;
          padding: 3mm;
          margin-bottom: 2mm;
          height: 20mm;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .brand-logo-container img {
          max-width: 24px;
          max-height: 24px;
          object-fit: contain;
        }
        
        .brand-name {
          font-size: 9px;
          font-weight: 700;
          color: #1d4ed8;
        }
        
        .client-info {
          background: linear-gradient(135deg, #f8fafc, #dbeafe);
          border: 1px solid #e2e8f0;
          border-radius: 6mm;
          padding: 6mm;
          page-break-inside: avoid;
        }
        
        .client-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6mm;
          margin-top: 3mm;
        }
        
        .client-field {
          margin-bottom: 3mm;
        }
        
        .client-field label {
          font-weight: 600;
          color: #64748b;
          display: block;
          margin-bottom: 1mm;
          font-size: 9px;
        }
        
        .client-field .value {
          font-size: 11px;
          font-weight: 600;
          color: #1e293b;
        }
        
        .products-table {
          width: 100%;
          border-collapse: collapse;
          border-radius: 4mm;
          overflow: hidden;
          box-shadow: 0 2mm 6mm rgba(0,0,0,0.1);
          page-break-after: auto;
        }
        
        .products-table thead {
          background: linear-gradient(90deg, #1e40af, #6366f1);
          color: white;
        }
        
        .products-table th {
          padding: 3mm 2mm;
          font-weight: 600;
          text-align: center;
          font-size: 8px;
        }
        
        .products-table td {
          padding: 3mm 2mm;
          border-bottom: 0.5px solid #e2e8f0;
          font-size: 9px;
        }
        
        .products-table tbody tr {
          page-break-inside: avoid;
        }
        
        .products-table tbody tr:nth-child(even) {
          background: #f8fafc;
        }
        
        .product-description {
          font-weight: 600;
          color: #1e293b;
          font-size: 9px;
        }
        
        .brand-badge {
          display: inline-block;
          padding: 1mm 2mm;
          background: #dbeafe;
          color: #1d4ed8;
          border-radius: 2mm;
          font-size: 8px;
          font-weight: 600;
        }
        
        .totals-container {
          display: flex;
          justify-content: flex-end;
          margin-top: 5mm;
          page-break-inside: avoid;
        }
        
        .totals-box {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 4mm;
          padding: 6mm;
          box-shadow: 0 2mm 6mm rgba(0,0,0,0.1);
          min-width: 60mm;
        }
        
        .totals-header {
          background: linear-gradient(135deg, #dbeafe, #f1f5f9);
          border-radius: 3mm;
          padding: 3mm;
          text-align: center;
          margin-bottom: 4mm;
        }
        
        .totals-header h3 {
          font-size: 12px;
          font-weight: 700;
          color: #1d4ed8;
        }
        
        .totals-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 2mm 0;
          font-size: 10px;
        }
        
        .totals-row.subtotal,
        .totals-row.igv {
          font-weight: 600;
          color: #64748b;
        }
        
        .totals-row.total {
          background: linear-gradient(90deg, #3b82f6, #6366f1);
          color: white;
          border-radius: 3mm;
          padding: 3mm;
          margin-top: 3mm;
          font-size: 12px;
          font-weight: 700;
        }
        
        .conditions {
          background: linear-gradient(135deg, #f8fafc, #dbeafe);
          border: 1px solid #e2e8f0;
          border-radius: 4mm;
          padding: 6mm;
          page-break-inside: avoid;
        }
        
        .condition-item {
          display: flex;
          align-items: flex-start;
          margin-bottom: 3mm;
        }
        
        .condition-number {
          width: 6mm;
          height: 6mm;
          background: linear-gradient(135deg, #3b82f6, #6366f1);
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 8px;
          margin-right: 3mm;
          flex-shrink: 0;
        }
        
        .condition-text {
          color: #374151;
          line-height: 1.4;
          font-size: 9px;
        }
        
        .footer {
          background: linear-gradient(135deg, #f1f5f9, #dbeafe);
          border-top: 2px solid #3b82f6;
          padding: 6mm;
          border-radius: 0 0 4mm 4mm;
          display: flex;
          justify-content: space-between;
          align-items: center;
          page-break-inside: avoid;
        }
        
        .qr-section {
          display: flex;
          align-items: center;
          gap: 5mm;
        }
        
        .qr-code {
          background: white;
          padding: 3mm;
          border-radius: 3mm;
          box-shadow: 0 1mm 3mm rgba(0,0,0,0.1);
        }
        
        .qr-placeholder {
          width: 20mm;
          height: 20mm;
          background: #e2e8f0;
          border-radius: 2mm;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 7px;
          color: #64748b;
          text-align: center;
        }
        
        .validation-info h3 {
          font-size: 12px;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 2mm;
        }
        
        .validation-info p {
          color: #64748b;
          margin-bottom: 1mm;
          font-size: 8px;
        }
        
        .system-info {
          text-align: right;
          color: #64748b;
        }
        
        .system-info p {
          margin-bottom: 1mm;
          font-size: 8px;
        }
        
        @media print {
          .container {
            max-width: none;
          }
          
          .header {
            margin-bottom: 5mm;
          }
          
          .section {
            margin-bottom: 5mm;
          }
          
          .products-table thead {
            display: table-header-group;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header Principal -->
        <div class="header">
          <div class="header-content">
            <!-- Logo y datos de empresa -->
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
              </div>
            </div>
            
            <!-- Panel de cotización -->
            <div class="quotation-panel">
              <h2>COTIZACIÓN</h2>
              <div class="subtitle">COMERCIAL PRIVADA</div>
              <div class="quotation-number">N° ${data.quotationNumber}</div>
              <div class="quotation-date">${formattedDate}</div>
              <div class="status-badge">${data.status}</div>
            </div>
          </div>
        </div>

        <!-- Sección de Marcas -->
        ${
          Array.from(
            data.products
              .reduce((acc, product) => {
                if (product.brandLogoUrl) {
                  acc.set(product.brand || "", product.brandLogoUrl)
                }
                return acc
              }, new Map())
              .entries(),
          ).length > 0
            ? `
          <div class="section">
            <div class="section-title">
              <h2>MARCAS REPRESENTADAS</h2>
            </div>
            
            <div class="brands-grid">
              ${Array.from(
                data.products
                  .reduce((acc, product) => {
                    if (product.brandLogoUrl) {
                      acc.set(product.brand || "", product.brandLogoUrl)
                    }
                    return acc
                  }, new Map())
                  .entries(),
              )
                .map(
                  ([brand, logoUrl]) => `
                <div class="brand-card">
                  <div class="brand-logo-container">
                    <img src="${logoUrl}" alt="${brand}" onerror="this.style.display='none'">
                  </div>
                  <div class="brand-name">${brand}</div>
                </div>
              `,
                )
                .join("")}
            </div>
          </div>
        `
            : ""
        }

        <!-- Información del Cliente -->
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

        <!-- Tabla de Productos -->
        <div class="section">
          <div class="section-title">
            <h2>DETALLE DE PRODUCTOS</h2>
          </div>
          
          <table class="products-table">
            <thead>
              <tr>
                <th style="width: 8%;">#</th>
                <th style="width: 15%;">Código</th>
                <th style="width: 35%;">Descripción</th>
                <th style="width: 12%;">Marca</th>
                <th style="width: 8%;">Cant.</th>
                <th style="width: 7%;">Unid.</th>
                <th style="width: 15%;">P. Unit.</th>
                <th style="width: 15%;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${data.products
                .map(
                  (product, index) => `
                <tr>
                  <td style="text-align: center; font-weight: 600;">${index + 1}</td>
                  <td style="text-align: center; font-family: monospace; font-size: 8px;">${product.code || "-"}</td>
                  <td>
                    <div class="product-description">${product.description}</div>
                  </td>
                  <td style="text-align: center;">
                    ${product.brand ? `<span class="brand-badge">${product.brand}</span>` : "-"}
                  </td>
                  <td style="text-align: center; font-weight: 600;">${product.quantity.toLocaleString()}</td>
                  <td style="text-align: center;">${product.unit}</td>
                  <td style="text-align: right; font-weight: 600;">S/ ${product.unitPrice.toFixed(2)}</td>
                  <td style="text-align: right; font-weight: 700; color: #1d4ed8;">S/ ${product.totalPrice.toFixed(2)}</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
        </div>

        <!-- Totales -->
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

        <!-- Condiciones de Venta -->
        <div class="section">
          <div class="section-title">
            <h2>CONDICIONES DE VENTA</h2>
          </div>
          
          <div class="conditions">
            ${[
              "Plazo de entrega: 07 días hábiles, contados dos días después de verificado la recepción de pago al 100%.",
              "Lugar de entrega: Recojo en almacén de 9.00am-12.00pm / 2pm-5:30pm.",
              "FORMA DE PAGO: Contado.",
              "Validez de esta oferta: Solo por 3 días hábiles.",
              "No hay devolución de dinero, posterior al recojo.",
              "Sí, el producto presentara fallas por desperfecto de fábrica, se procederá a resolver el reclamo en un plazo máximo de 7 días.",
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
        </div>

        <!-- Footer con QR -->
        <div class="footer">
          <div class="qr-section">
            <div class="qr-code">
              <div class="qr-placeholder">
                QR Code<br>Validación
              </div>
            </div>
            <div class="validation-info">
              <h3>VALIDACIÓN DEL DOCUMENTO</h3>
              <p>Escanee el código QR para validar la autenticidad</p>
              <p>Código: ${data.quotationNumber}</p>
              <p>Generado: ${currentDate}</p>
            </div>
          </div>
          
          <div class="system-info">
            <p>Creado por: ${data.createdBy}</p>
            <p>Sistema AGPC - Cotización Comercial Privada</p>
            <p>Documento generado automáticamente</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `
}

export const generatePrivateQuotationPDF = async (
  quotation: Quotation,
  company: Company,
  brandLogos: Map<string, string> = new Map(),
): Promise<Blob> => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  }) as jsPDFWithAutoTable

  const pageWidth = 210 // A4 width in mm
  const pageHeight = 297 // A4 height in mm
  const margin = 15

  // Add custom CSS for print optimization
  const style = document.createElement("style")
  style.textContent = `
    @page {
      size: A4;
      margin: 15mm;
    }
    .pdf-content {
      font-family: Arial, sans-serif;
      font-size: 10px;
      line-height: 1.2;
    }
    .brand-logos {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin: 10px 0;
      page-break-inside: avoid;
    }
    .brand-logo {
      text-align: center;
      page-break-inside: avoid;
    }
    .brand-logo img {
      max-width: 40px;
      max-height: 30px;
      object-fit: contain;
    }
  `
  document.head.appendChild(style)

  let yPosition = margin

  // Header with company logo and info
  if (company.logo_url) {
    try {
      const logoImg = new Image()
      logoImg.crossOrigin = "anonymous"
      logoImg.src = company.logo_url
      await new Promise((resolve, reject) => {
        logoImg.onload = resolve
        logoImg.onerror = reject
      })
      doc.addImage(logoImg, "PNG", margin, yPosition, 30, 20)
    } catch (error) {
      console.warn("Error loading company logo:", error)
    }
  }

  // Company info
  doc.setFontSize(16)
  doc.setFont("helvetica", "bold")
  doc.text(company.name, margin + 35, yPosition + 8)

  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")
  doc.text(`RUC: ${company.ruc}`, margin + 35, yPosition + 14)
  doc.text(company.address, margin + 35, yPosition + 18)
  doc.text(`Tel: ${company.phone} | Email: ${company.email}`, margin + 35, yPosition + 22)

  yPosition += 35

  // Title
  doc.setFontSize(18)
  doc.setFont("helvetica", "bold")
  doc.text("COTIZACIÓN PRIVADA", pageWidth / 2, yPosition, { align: "center" })
  yPosition += 15

  // Quotation info
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.text(`Cotización N°: ${quotation.quotation_number}`, margin, yPosition)
  doc.text(`Fecha: ${new Date(quotation.created_at).toLocaleDateString("es-PE")}`, pageWidth - margin - 40, yPosition)
  yPosition += 8

  doc.text(`Estado: ${quotation.status.toUpperCase()}`, margin, yPosition)
  yPosition += 15

  // Client info
  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  doc.text("INFORMACIÓN DEL CLIENTE", margin, yPosition)
  yPosition += 8

  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")
  doc.text(`Cliente: ${quotation.client_name}`, margin, yPosition)
  yPosition += 5
  doc.text(`Email: ${quotation.client_email}`, margin, yPosition)
  yPosition += 5
  doc.text(`Teléfono: ${quotation.client_phone}`, margin, yPosition)
  yPosition += 5
  doc.text(`Dirección: ${quotation.client_address}`, margin, yPosition)
  yPosition += 15

  // Products table
  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  doc.text("DETALLE DE PRODUCTOS", margin, yPosition)
  yPosition += 10

  const tableData = quotation.quotation_items.map((item) => [
    item.product_name,
    item.product_brand,
    item.quantity.toString(),
    `S/ ${item.unit_price.toFixed(2)}`,
    `S/ ${item.total_price.toFixed(2)}`,
  ])

  doc.autoTable({
    startY: yPosition,
    head: [["Producto", "Marca", "Cant.", "P. Unit.", "Total"]],
    body: tableData,
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { cellWidth: 35 },
      2: { cellWidth: 20, halign: "center" },
      3: { cellWidth: 25, halign: "right" },
      4: { cellWidth: 25, halign: "right" },
    },
    margin: { left: margin, right: margin },
  })

  yPosition = (doc as any).lastAutoTable.finalY + 10

  // Total
  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  doc.text(`TOTAL: S/ ${quotation.total_amount.toFixed(2)}`, pageWidth - margin - 40, yPosition)
  yPosition += 15

  // Observations
  if (quotation.observations) {
    doc.setFontSize(10)
    doc.setFont("helvetica", "bold")
    doc.text("OBSERVACIONES:", margin, yPosition)
    yPosition += 6

    doc.setFont("helvetica", "normal")
    const splitObservations = doc.splitTextToSize(quotation.observations, pageWidth - 2 * margin)
    doc.text(splitObservations, margin, yPosition)
    yPosition += splitObservations.length * 4 + 10
  }

  // Brand logos section
  if (brandLogos.size > 0) {
    // Check if we need a new page
    if (yPosition > pageHeight - 80) {
      doc.addPage()
      yPosition = margin
    }

    doc.setFontSize(12)
    doc.setFont("helvetica", "bold")
    doc.text("MARCAS DISPONIBLES", margin, yPosition)
    yPosition += 10

    const logosPerRow = 4
    const logoWidth = 25
    const logoHeight = 20
    const logoSpacing = (pageWidth - 2 * margin - logosPerRow * logoWidth) / (logosPerRow - 1)

    let currentRow = 0
    let currentCol = 0

    for (const [brandName, logoUrl] of brandLogos) {
      if (logoUrl) {
        try {
          const brandImg = new Image()
          brandImg.crossOrigin = "anonymous"
          brandImg.src = logoUrl

          await new Promise((resolve, reject) => {
            brandImg.onload = resolve
            brandImg.onerror = reject
          })

          const xPos = margin + currentCol * (logoWidth + logoSpacing)
          const yPos = yPosition + currentRow * (logoHeight + 15)

          // Add brand logo
          doc.addImage(brandImg, "PNG", xPos, yPos, logoWidth, logoHeight)

          // Add brand name
          doc.setFontSize(7)
          doc.setFont("helvetica", "normal")
          doc.text(brandName, xPos + logoWidth / 2, yPos + logoHeight + 4, { align: "center" })

          currentCol++
          if (currentCol >= logosPerRow) {
            currentCol = 0
            currentRow++
          }
        } catch (error) {
          console.warn(`Error loading brand logo for ${brandName}:`, error)
        }
      }
    }
  }

  // Footer
  const footerY = pageHeight - 20
  doc.setFontSize(8)
  doc.setFont("helvetica", "italic")
  doc.text("Esta cotización es válida por 30 días desde la fecha de emisión.", pageWidth / 2, footerY, {
    align: "center",
  })
  doc.text(`Generado el ${new Date().toLocaleString("es-PE")}`, pageWidth / 2, footerY + 5, { align: "center" })

  // Clean up style
  document.head.removeChild(style)

  return new Blob([doc.output("blob")], { type: "application/pdf" })
}
