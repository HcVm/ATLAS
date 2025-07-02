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

const generateQRForQuotation = async (quotationNumber: string, data: ARMPrivateQuotationPDFData): Promise<string> => {
  try {
    console.log("🔐 Creando validación ARM a través de API...")

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

    console.log("✅ Validación ARM creada:", validationHash.substring(0, 16) + "...")
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
    const qrCodeBase64 = await generateQRForQuotation(data.quotationNumber, data)
    const html = generateARMPrivateQuotationHTML({
      ...data,
      qrCodeBase64,
      quotationNumber: data.quotationNumber,
      quotationDate: data.quotationDate,
      status: data.status,
      observations: data.observations,
      createdBy: data.createdBy,
    })

    // Crear un iframe oculto para generar el PDF - IGUAL QUE AGLE
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
          background: linear-gradient(135deg, #dc2626 0%, #b91c1c 50%, #991b1b 100%);
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
          background: rgba(255,255,255,0.15);
          backdrop-filter: blur(10px);
          flex-shrink: 0;
        }
        
        .company-logo img {
          width: 140px;
          height: 100px;
          object-fit: contain;
        }
        
        .company-details {
          flex: 1;
        }
        
        .company-details h1 {
          font-size: 24px;
          font-weight: 800;
          margin-bottom: 2mm;
          text-shadow: 0 2px 4px rgba(0,0,0,0.3);
          letter-spacing: -0.5px;
        }

        .company-details p {
          font-size: 12px;
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
          background: rgba(255,255,255,0.1);
          color: white;
          padding: 5mm;
          border-radius: 3mm;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.2);
          min-width: 45mm;
          text-align: center;
          flex-shrink: 0;
        }
        
        .quotation-panel h2 {
          font-size: 13px;
          font-weight: 700;
          color: white;
          margin-bottom: 1mm;
        }
        
        .quotation-panel .subtitle {
          font-size: 11px;
          font-weight: 600;
          color: rgba(255,255,255,0.8);
          margin-bottom: 3mm;
          padding-bottom: 2mm;
          border-bottom: 1px solid rgba(255,255,255,0.2);
        }
        
        .quotation-number {
          font-size: 18px;
          font-weight: 900;
          margin-bottom: 1mm;
          text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        
        .quotation-date {
          color: rgba(255,255,255,0.8);
          margin-bottom: 2mm;
          font-size: 10px;
        }
        
        .status-badge {
          display: inline-block;
          padding: 1mm 2mm;
          background: rgba(255,255,255,0.2);
          color: white;
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
          background: linear-gradient(90deg, #dc2626, #b91c1c);
          border-radius: 0.5px;
          margin-left: 3mm;
          max-width: 30mm;
        }
        
        .client-info {
          background: linear-gradient(135deg, #f8fafc, #e2e8f0);
          border: 0.5px solid #cbd5e1;
          border-radius: 3mm;
          padding: 4mm;
          page-break-inside: avoid;
          position: relative;
          overflow: hidden;
        }

        .client-info::before {
          content: '';
          position: absolute;
          top: -20px;
          right: -20px;
          width: 80px;
          height: 80px;
          background: linear-gradient(45deg, #dc2626, #f59e0b);
          border-radius: 50%;
          opacity: 0.1;
        }
        
        .client-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 4mm;
          margin-top: 2mm;
        }
        
        .client-field {
          margin-bottom: 2mm;
        }
        
        .client-field label {
          font-weight: 600;
          color: #64748b;
          display: block;
          margin-bottom: 0.5mm;
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .client-field .value {
          font-size: 11px;
          font-weight: 600;
          color: #1e293b;
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
          background: linear-gradient(135deg, #1f2937 0%, #374151 100%);
          color: white;
        }
        
        .products-table th {
          padding: 3mm 2mm;
          font-weight: 600;
          text-align: center;
          font-size: 9px;
        }
        
        .products-table td {
          padding: 3mm 2mm;
          border-bottom: 0.25px solid #e2e8f0;
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
          font-size: 10px;
          line-height: 1.3;
        }

        .product-code {
          background: #f3f4f6;
          color: #6b7280;
          padding: 1mm 2mm;
          border-radius: 1mm;
          font-size: 8px;
          font-family: monospace;
          display: inline-block;
          margin-top: 1mm;
        }

        .quantity-badge {
          background: #dc2626;
          color: white;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto;
          font-size: 10px;
          font-weight: 800;
        }

        .unit-badge {
          background: #e5e7eb;
          color: #374151;
          padding: 1mm 2mm;
          border-radius: 1mm;
          font-size: 9px;
          font-weight: 600;
        }
        
        .brand-badge {
          display: inline-block;
          padding: 0.5mm 1mm;
          background: #dbeafe;
          color: #1d4ed8;
          border-radius: 1mm;
          font-size: 8px;
          font-weight: 600;
        }

        .brand-with-logo {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1mm;
        }

        .brand-with-logo img {
          width: 40px;
          height: 30px;
          object-fit: contain;
        }

        .brand-with-logo span {
          font-size: 8px;
          font-weight: 700;
          color: #374151;
        }

        .price-cell {
          text-align: right;
          font-weight: 700;
          color: #059669;
          font-size: 10px;
        }

        .total-cell {
          text-align: right;
        }

        .total-badge {
          background: linear-gradient(135deg, #dc2626, #b91c1c);
          color: white;
          padding: 2mm;
          border-radius: 1mm;
          font-weight: 800;
          font-size: 10px;
          text-align: center;
        }
        
        .totals-container {
          display: flex;
          justify-content: flex-end;
          page-break-inside: avoid;
        }
        
        .totals-box {
          background: white;
          border: 0.5px solid #e2e8f0;
          border-radius: 2mm;
          padding: 4mm;
          box-shadow: 0 1mm 3mm rgba(0,0,0,0.1);
          min-width: 60mm;
        }
        
        .totals-header {
          background: linear-gradient(135deg, #dbeafe, #f1f5f9);
          border-radius: 1.5mm;
          padding: 2mm;
          text-align: center;
          margin-bottom: 2mm;
        }
        
        .totals-header h3 {
          font-size: 11px;
          font-weight: 700;
          color: #1d4ed8;
        }
        
        .totals-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1mm 0;
          font-size: 10px;
        }
        
        .totals-row.subtotal,
        .totals-row.igv {
          font-weight: 600;
          color: #64748b;
        }
        
        .totals-row.total {
          background: linear-gradient(135deg, #dc2626, #b91c1c);
          color: white;
          border-radius: 1.5mm;
          padding: 2mm;
          margin-top: 2mm;
          font-size: 12px;
          font-weight: 700;
        }
        
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

        .banking-info {
          background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
          border: 1px solid #93c5fd;
          border-radius: 2mm;
          padding: 4mm;
        }

        .banking-title {
          font-size: 12px;
          font-weight: 700;
          color: #1e40af;
          margin-bottom: 2mm;
          display: flex;
          align-items: center;
          gap: 2mm;
        }

        .banking-title::before {
          content: '';
          width: 3px;
          height: 12px;
          background: linear-gradient(135deg, #1e40af, #3b82f6);
          border-radius: 1px;
        }

        .banking-content {
          background: white;
          border: 1px solid #bfdbfe;
          border-radius: 1.5mm;
          padding: 3mm;
        }

        .banking-field {
          margin-bottom: 2mm;
        }

        .banking-field:last-child {
          margin-bottom: 0;
        }

        .banking-field label {
          font-size: 8px;
          color: #6b7280;
          font-weight: 600;
          text-transform: uppercase;
          display: block;
          margin-bottom: 0.5mm;
        }

        .banking-field .value {
          font-size: 10px;
          color: #1f2937;
          font-weight: 700;
          font-family: monospace;
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
          background: linear-gradient(135deg, #f8fafc, #dbeafe);
          border: 0.5px solid #e2e8f0;
          border-radius: 2mm;
          padding: 4mm;
          page-break-inside: avoid;
        }

        .qr-validation-panel {
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          border: 1px solid #f59e0b;
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
          font-size: 10px;
          font-weight: 700;
          color: #92400e;
          margin-bottom: 1mm;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .validation-info-panel p {
          color: #92400e;
          margin-bottom: 0.5mm;
          font-size: 8px;
          line-height: 1.3;
        }
        
        .condition-item {
          display: flex;
          align-items: flex-start;
          margin-bottom: 2mm;
        }
        
        .condition-number {
          width: 4mm;
          height: 4mm;
          background: linear-gradient(135deg, #dc2626, #b91c1c);
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

        .observations-section {
          background: linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%);
          border: 1px solid #c084fc;
          border-radius: 2mm;
          padding: 4mm;
          margin-bottom: 5mm;
        }

        .observations-title {
          font-size: 12px;
          font-weight: 700;
          color: #7c3aed;
          margin-bottom: 2mm;
          display: flex;
          align-items: center;
          gap: 2mm;
        }

        .observations-title::before {
          content: '';
          width: 3px;
          height: 12px;
          background: linear-gradient(135deg, #7c3aed, #a855f7);
          border-radius: 1px;
        }

        .observations-content {
          background: white;
          border: 1px solid #c084fc;
          border-radius: 1.5mm;
          padding: 3mm;
        }

        .observations-text {
          font-size: 10px;
          line-height: 1.5;
          color: #374151;
          text-align: justify;
          margin: 0;
        }
        
        .footer {
          background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
          color: white;
          padding: 4mm;
          border-radius: 2mm;
          display: flex;
          justify-content: space-between;
          align-items: center;
          page-break-inside: avoid;
          position: relative;
          overflow: hidden;
        }

        .footer::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #dc2626, #f59e0b, #10b981, #3b82f6, #8b5cf6);
        }

        .footer-content {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 6mm;
          width: 100%;
          margin-top: 2mm;
        }

        .footer-section h4 {
          font-size: 10px;
          font-weight: 700;
          color: white;
          margin-bottom: 2mm;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          display: flex;
          align-items: center;
          gap: 2mm;
        }

        .footer-section h4::before {
          content: '';
          width: 2px;
          height: 10px;
          border-radius: 1px;
        }

        .footer-section:nth-child(1) h4::before {
          background: #f59e0b;
        }

        .footer-section:nth-child(2) h4::before {
          background: #10b981;
        }

        .footer-section:nth-child(3) h4::before {
          background: #3b82f6;
        }

        .footer-section p {
          font-size: 9px;
          color: #d1d5db;
          margin-bottom: 1mm;
          line-height: 1.4;
        }

        .footer-section p:last-child {
          margin-bottom: 0;
        }

        .footer-logo {
          text-align: right;
        }

        .footer-logo img {
          width: 100px;
          height: 75px;
          object-fit: contain;
          opacity: 0.9;
          margin-bottom: 2mm;
        }

        .footer-signature {
          background: rgba(255,255,255,0.1);
          padding: 2mm;
          border-radius: 1.5mm;
          backdrop-filter: blur(10px);
        }

        .footer-signature p {
          margin: 0;
          font-size: 10px;
          color: white;
          font-weight: 700;
        }

        .footer-signature p:last-child {
          font-size: 9px;
          color: #d1d5db;
          font-weight: 400;
        }

        .footer-bottom {
          border-top: 1px solid #374151;
          padding-top: 2mm;
          margin-top: 3mm;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .footer-dots {
          display: flex;
          gap: 1mm;
        }

        .footer-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }

        .footer-dot:nth-child(1) { background: #dc2626; }
        .footer-dot:nth-child(2) { background: #f59e0b; }
        .footer-dot:nth-child(3) { background: #10b981; }
        .footer-dot:nth-child(4) { background: #3b82f6; }

        .footer-info {
          text-align: right;
        }

        .footer-info p {
          margin: 0;
          font-size: 8px;
          color: #9ca3af;
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

                <!-- Sección de Marcas dentro del Header -->
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
            
            <!-- Panel de cotización -->
            <div class="quotation-panel">
              <h2>COTIZACIÓN</h2>
              <div class="subtitle">COMERCIAL PRIVADA</div>
              <div class="quotation-number">N° ${data.quotationNumber}</div>
              <div class="quotation-date">${formattedDate}</div>
              <div class="status-badge">${getStatusLabel(data.status)}</div>
            </div>
          </div>
        </div>

        <!-- Información del Cliente -->
        <div class="section">
          <div class="section-title">
            <h2>INFORMACIÓN DEL CLIENTE</h2>
          </div>
          
          <div class="client-info">
            <div class="client-grid">
              <div>
                <div class="client-field">
                  <label>Código Cliente:</label>
                  <div class="value">${data.clientCode}</div>
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
                  <label>Moneda:</label>
                  <div class="value">${data.currency}</div>
                </div>
              </div>
              <div>
                <div class="client-field">
                  <label>Razón Social:</label>
                  <div class="value">${data.clientName}</div>
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
            <h2>DETALLE DE PRODUCTOS Y SERVICIOS</h2>
          </div>
          
          <table class="products-table">
            <thead>
              <tr>
                <th style="width: 6%;">CANT.</th>
                <th style="width: 40%;">DESCRIPCIÓN</th>
                <th style="width: 8%;">UNID.</th>
                <th style="width: 12%;">MARCA</th>
                <th style="width: 12%;">P. UNIT.</th>
                <th style="width: 12%;">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              ${data.products
                .map(
                  (product, index) => `
                <tr>
                  <td style="text-align: center;">
                    <div class="quantity-badge">${product.quantity}</div>
                  </td>
                  <td>
                    <div class="product-description">${product.description}</div>
                    ${product.code ? `<div class="product-code">${product.code}</div>` : ""}
                  </td>
                  <td style="text-align: center;">
                    <div class="unit-badge">${product.unit}</div>
                  </td>
                  <td style="text-align: center;">
                    ${
                      product.brand && product.brandLogoUrl
                        ? `
                    <div class="brand-with-logo">
                      <img src="${product.brandLogoUrl}" alt="${product.brand}" />
                      <span>${product.brand}</span>
                    </div>
                  `
                        : product.brand
                          ? `<span class="brand-badge">${product.brand}</span>`
                          : "—"
                    }
                  </td>
                  <td class="price-cell">S/ ${product.unitPrice.toFixed(2)}</td>
                  <td class="total-cell">
                    <div class="total-badge">S/ ${product.totalPrice.toFixed(2)}</div>
                  </td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
        </div>

        <!-- Información Bancaria y Totales Combinados -->
        <div class="banking-totals-section">
          <div class="section-title">
            <h2>INFORMACIÓN BANCARIA Y RESUMEN</h2>
          </div>
          
          <div class="banking-totals-content">
            <div class="banking-info-container">
              ${
                data.bankingInfo?.bankAccount || data.companyAccountInfo
                  ? `
                <div class="banking-info">
                  <div class="banking-title">INFORMACIÓN BANCARIA</div>
                  <div class="banking-content">
                    <div class="banking-field">
                      <label>Empresa:</label>
                      <div class="value">${data.companyName}</div>
                    </div>
                    ${
                      data.bankingInfo?.bankAccount
                        ? `
                      <div class="banking-field">
                        <label>Banco:</label>
                        <div class="value">${data.bankingInfo.bankAccount.bank}</div>
                      </div>
                      <div class="banking-field">
                        <label>Tipo:</label>
                        <div class="value">${data.bankingInfo.bankAccount.type}</div>
                      </div>
                      <div class="banking-field">
                        <label>Cuenta:</label>
                        <div class="value">${data.bankingInfo.bankAccount.accountNumber}</div>
                      </div>
                      <div class="banking-field">
                        <label>CCI:</label>
                        <div class="value">${data.bankingInfo.bankAccount.cci}</div>
                      </div>
                    `
                        : data.companyAccountInfo
                          ? `
                      <div class="banking-field">
                        <label>Cuenta:</label>
                        <div class="value">${data.companyAccountInfo}</div>
                      </div>
                    `
                          : ""
                    }
                  </div>
                </div>
              `
                  : ""
              }
            </div>

            <!-- Totales -->
            <div class="totals-container">
              <div class="totals-box">
                <div class="totals-header">
                  <h3>RESUMEN FINANCIERO</h3>
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

        <!-- Condiciones de Venta y Validación -->
        <div class="section conditions-qr-combined-section">
          <div class="section-title">
            <h2>CONDICIONES DE VENTA Y VALIDACIÓN</h2>
          </div>
          
          <div class="conditions-qr-content">
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
          <!-- Observaciones -->
          <div class="section">
            <div class="section-title">
              <h2>OBSERVACIONES COMERCIALES</h2>
            </div>
            
            <div class="observations-section">
              <div class="observations-title">OBSERVACIONES COMERCIALES</div>
              <div class="observations-content">
                <p class="observations-text">${data.observations}</p>
              </div>
            </div>
          </div>
        `
            : ""
        }

        <!-- Footer -->
        <div class="footer">
          <div class="footer-content">
            <!-- Condiciones comerciales -->
            <div class="footer-section">
              <h4>Condiciones Comerciales</h4>
              <p>• Plazo de entrega: 07 días hábiles</p>
              <p>• Lugar: Recojo en almacén</p>
              <p>• Forma de pago: Contado</p>
              <p>• Validez: 3 días hábiles</p>
              <p>• Garantía: 24 meses</p>
            </div>

            <!-- Información de contacto -->
            <div class="footer-section">
              <h4>Información de Contacto</h4>
              ${data.companyAddress ? `<p>📍 ${data.companyAddress}</p>` : ""}
              ${data.companyPhone ? `<p>📞 ${data.companyPhone}</p>` : ""}
              ${data.companyEmail ? `<p>✉️ ${data.companyEmail}</p>` : ""}
              <p>🌐 www.armcorporations.pe</p>
            </div>

            <!-- Logo y firma -->
            <div class="footer-section footer-logo">
              ${
                data.companyLogoUrl
                  ? `
              <img src="${data.companyLogoUrl}" alt="ARM Logo" />
              `
                  : ""
              }
              <div class="footer-signature">
                <p>${data.createdBy}</p>
                <p>ARM Corporations S.A.C.</p>
              </div>
            </div>
          </div>

          <!-- Información del documento -->
          <div class="footer-bottom">
            <div class="footer-dots">
              <div class="footer-dot"></div>
              <div class="footer-dot"></div>
              <div class="footer-dot"></div>
              <div class="footer-dot"></div>
            </div>
            <div class="footer-info">
              <p>Generado el ${new Date().toLocaleDateString("es-PE")} a las ${new Date().toLocaleTimeString("es-PE")} | Estado: ${getStatusLabel(data.status)}</p>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `
}
