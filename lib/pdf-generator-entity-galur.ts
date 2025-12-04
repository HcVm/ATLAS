import type { BankingInfo } from "./company-banking-info"

export interface GALUREntityQuotationPDFData {
  companyName: string
  companyRuc: string
  companyCode: string
  companyAddress?: string
  companyPhone?: string
  companyEmail?: string
  companyLogoUrl?: string
  companyAccountInfo?: string
  bankingInfo?: BankingInfo

  quotationNumber: string
  quotationDate: string
  validUntil?: string
  status: string

  clientCode: string
  clientName: string
  clientRuc: string
  clientAddress: string
  clientFiscalAddress?: string
  clientDepartment?: string
  clientAttention?: string
  currency?: string

  products: Array<{
    quantity: number
    description: string
    unit: string
    brand?: string
    code?: string
    unitPrice: number
    totalPrice: number
  }>

  subtotal: number
  igv: number
  total: number

  conditions?: string[]
  observations?: string
  createdBy: string
}

export const generateGALUREntityQuotationHTML = (data: GALUREntityQuotationPDFData): string => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "PEN",
      minimumFractionDigits: 2,
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("es-PE", { year: "numeric", month: "long", day: "numeric" })
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background-color: #f5f5f5;
          color: #333;
          line-height: 1.6;
        }
        
        .page {
          width: 210mm;
          height: 297mm;
          background-color: white;
          margin: 0 auto;
          padding: 15mm;
          box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
        }
        
        /* Header */
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 3px solid #15803d;
          padding-bottom: 15px;
          margin-bottom: 20px;
        }
        
        .logo-section {
          display: flex;
          align-items: center;
          gap: 15px;
        }
        
        .logo {
          width: 60px;
          height: 60px;
          background-color: #15803d;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 24px;
        }
        
        .company-info h1 {
          color: #15803d;
          font-size: 24px;
          margin-bottom: 5px;
        }
        
        .company-info p {
          font-size: 12px;
          color: #666;
          margin: 2px 0;
        }
        
        .quotation-title {
          text-align: right;
        }
        
        .quotation-title h2 {
          color: #15803d;
          font-size: 20px;
          margin-bottom: 5px;
        }
        
        .quotation-number {
          font-size: 14px;
          font-weight: bold;
          color: #fbbf24;
          background-color: #ecfdf5;
          padding: 5px 10px;
          border-radius: 4px;
          display: inline-block;
        }
        
        /* Content Grid */
        .content {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 20px;
        }
        
        .section {
          background-color: #f9fafb;
          padding: 15px;
          border-radius: 6px;
          border-left: 3px solid #15803d;
        }
        
        .section h3 {
          color: #15803d;
          font-size: 12px;
          font-weight: bold;
          text-transform: uppercase;
          margin-bottom: 10px;
        }
        
        .section-content {
          font-size: 11px;
          line-height: 1.8;
        }
        
        .label {
          color: #666;
          font-weight: 600;
          margin-bottom: 2px;
        }
        
        .value {
          color: #333;
          margin-bottom: 8px;
        }
        
        /* Products Table */
        .products-section {
          margin-bottom: 20px;
        }
        
        .products-section h3 {
          color: #15803d;
          font-size: 12px;
          font-weight: bold;
          text-transform: uppercase;
          margin-bottom: 10px;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 15px;
        }
        
        th {
          background-color: #15803d;
          color: white;
          padding: 10px;
          text-align: left;
          font-size: 11px;
          font-weight: bold;
        }
        
        td {
          padding: 8px 10px;
          border-bottom: 1px solid #e5e7eb;
          font-size: 10px;
        }
        
        tr:last-child td {
          border-bottom: none;
        }
        
        tr:nth-child(even) {
          background-color: #f9fafb;
        }
        
        .text-right {
          text-align: right;
        }
        
        .text-center {
          text-align: center;
        }
        
        /* Totals */
        .totals {
          display: grid;
          grid-template-columns: 1fr 200px;
          gap: 20px;
          margin-bottom: 20px;
          align-items: flex-end;
        }
        
        .total-box {
          background: linear-gradient(135deg, #15803d 0%, #166534 100%);
          color: white;
          padding: 20px;
          border-radius: 8px;
          text-align: center;
        }
        
        .total-box .label {
          color: #fbbf24;
          font-size: 11px;
          margin-bottom: 5px;
        }
        
        .total-box .amount {
          font-size: 28px;
          font-weight: bold;
          color: white;
        }
        
        .summary-box {
          background-color: #f9fafb;
          padding: 15px;
          border-radius: 8px;
          border-top: 2px solid #fbbf24;
        }
        
        .summary-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          font-size: 11px;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .summary-row:last-child {
          border-bottom: none;
        }
        
        .summary-row.total {
          font-weight: bold;
          color: #15803d;
          font-size: 12px;
          padding-top: 10px;
        }
        
        /* Conditions */
        .conditions {
          margin-bottom: 15px;
          padding: 10px;
          background-color: #ecfdf5;
          border-radius: 6px;
          border-left: 3px solid #15803d;
        }
        
        .conditions h4 {
          color: #15803d;
          font-size: 11px;
          margin-bottom: 8px;
          font-weight: bold;
        }
        
        .conditions ul {
          margin-left: 15px;
          font-size: 10px;
          line-height: 1.6;
          color: #333;
        }
        
        .conditions li {
          margin-bottom: 4px;
        }
        
        /* Footer */
        .footer {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          border-top: 2px solid #15803d;
          padding-top: 15px;
          margin-top: 20px;
          font-size: 10px;
        }
        
        .bank-section h4 {
          color: #15803d;
          font-size: 11px;
          margin-bottom: 8px;
          font-weight: bold;
        }
        
        .bank-info {
          background-color: #ecfdf5;
          padding: 10px;
          border-radius: 4px;
          font-size: 10px;
          line-height: 1.6;
        }
        
        .bank-info strong {
          color: #15803d;
        }
      </style>
    </head>
    <body>
      <div class="page">
        <!-- Header -->
        <div class="header">
          <div class="logo-section">
            <div class="logo">G</div>
            <div class="company-info">
              <h1>GALUR</h1>
              <p>RUC: ${data.companyRuc}</p>
              <p>Código: ${data.companyCode}</p>
            </div>
          </div>
          <div class="quotation-title">
            <h2>COTIZACIÓN</h2>
            <div class="quotation-number">${data.quotationNumber}</div>
          </div>
        </div>
        
        <!-- Client and Company Info -->
        <div class="content">
          <div class="section">
            <h3>Proveedor</h3>
            <div class="section-content">
              <div class="label">Empresa</div>
              <div class="value">${data.companyName}</div>
              <div class="label">Dirección</div>
              <div class="value">${data.companyAddress || "N/A"}</div>
              <div class="label">Teléfono</div>
              <div class="value">${data.companyPhone || "N/A"}</div>
              <div class="label">Email</div>
              <div class="value">${data.companyEmail || "N/A"}</div>
            </div>
          </div>
          
          <div class="section">
            <h3>Cliente</h3>
            <div class="section-content">
              <div class="label">Empresa</div>
              <div class="value">${data.clientName}</div>
              <div class="label">RUC</div>
              <div class="value">${data.clientRuc}</div>
              <div class="label">Dirección</div>
              <div class="value">${data.clientAddress || "N/A"}</div>
              <div class="label">Atención</div>
              <div class="value">${data.clientAttention || "General"}</div>
            </div>
          </div>
        </div>
        
        <!-- Dates -->
        <div class="content" style="margin-bottom: 15px;">
          <div class="section">
            <div class="label">Fecha de emisión</div>
            <div class="value">${formatDate(data.quotationDate)}</div>
          </div>
          <div class="section">
            <div class="label">Válido hasta</div>
            <div class="value">${data.validUntil ? formatDate(data.validUntil) : "A especificar"}</div>
          </div>
        </div>
        
        <!-- Products -->
        <div class="products-section">
          <h3>Productos</h3>
          <table>
            <thead>
              <tr>
                <th style="width: 8%;">Cantidad</th>
                <th style="width: 42%;">Descripción</th>
                <th style="width: 12%;">Precio Unitario</th>
                <th style="width: 12%;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${data.products
                .map(
                  (product) => `
                <tr>
                  <td class="text-center">${product.quantity}</td>
                  <td>${product.description}${product.brand ? ` (${product.brand})` : ""}</td>
                  <td class="text-right">${formatCurrency(product.unitPrice)}</td>
                  <td class="text-right">${formatCurrency(product.totalPrice)}</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
        </div>
        
        <!-- Totals and Summary -->
        <div class="totals">
          <div class="summary-box">
            <div class="summary-row">
              <span>Subtotal (sin IGV)</span>
              <span>${formatCurrency(data.subtotal)}</span>
            </div>
            <div class="summary-row">
              <span>IGV (18%)</span>
              <span>${formatCurrency(data.igv)}</span>
            </div>
            <div class="summary-row total">
              <span>TOTAL A PAGAR</span>
              <span>${formatCurrency(data.total)}</span>
            </div>
          </div>
          
          <div class="total-box">
            <div class="label">TOTAL</div>
            <div class="amount">${formatCurrency(data.total)}</div>
          </div>
        </div>
        
        <!-- Conditions -->
        ${
          data.conditions && data.conditions.length > 0
            ? `
        <div class="conditions">
          <h4>Términos y Condiciones</h4>
          <ul>
            ${data.conditions.map((condition) => `<li>${condition}</li>`).join("")}
          </ul>
        </div>
        `
            : ""
        }
        
        <!-- Footer -->
        <div class="footer">
          <div></div>
          <div class="bank-section">
            <h4>Información de Pago</h4>
            <div class="bank-info">
              <strong>Cuenta Bancaria:</strong><br>
              ${data.companyAccountInfo || "N/A"}<br><br>
              <strong>Nota:</strong><br>
              Cotización válida según términos y condiciones de GALUR.
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `
}

export const generateGALUREntityQuotationPDF = async (data: GALUREntityQuotationPDFData): Promise<void> => {
  try {
    console.log("🚀 Iniciando generación de PDF GALUR Entidad...")

    const htmlContent = generateGALUREntityQuotationHTML(data)

    const response = await fetch("/api/generate-quotation-pdf", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ pdfData: data, type: "galur-entity" }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Server responded with error: ${response.status} - ${errorText}`)
    }

    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `Cotizacion_GALUR_Entidad_${data.quotationNumber.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.URL.revokeObjectURL(url)

    console.log("✅ PDF GALUR Entidad generado exitosamente")
  } catch (error) {
    console.error("❌ Error generating GALUR entity PDF:", error)
    throw error
  }
}
