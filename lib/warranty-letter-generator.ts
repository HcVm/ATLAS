import jsPDF from "jspdf"
import html2canvas from "html2canvas"
import { getBankingInfoByCompanyCode, type BankingInfo } from "./company-banking-info"

export interface WarrantyLetterData {
  // Información de la empresa
  companyName: string
  companyRuc: string
  companyCode: string
  companyLogoUrl?: string

  // Información bancaria (se obtiene automáticamente por código de empresa)
  bankingInfo?: BankingInfo

  // Información de la carta
  letterNumber: string

  // Información del cliente
  clientName: string
  clientRuc: string
  clientAddress: string

  // Productos con garantía
  products: Array<{
    quantity: number
    description: string
    brand: string
    code: string
  }>

  // Garantía
  warrantyMonths: number

  // Creado por
  createdBy: string
}

export const generateWarrantyLetter = async (data: WarrantyLetterData): Promise<void> => {
  console.log("🚀 Iniciando generación de Carta de Garantía...")

  // Obtener información bancaria automáticamente si tenemos el código de empresa
  if (data.companyCode && !data.bankingInfo) {
    const bankingInfo = getBankingInfoByCompanyCode(data.companyCode)
    if (bankingInfo) {
      data.bankingInfo = bankingInfo
    }
    console.log("✅ Banking info obtained for company:", data.companyCode, data.bankingInfo)
  }

  console.log("🎨 Creando contenido HTML de la Carta de Garantía...")

  // Crear el HTML temporal para el PDF
  const htmlContent = createWarrantyLetterHTML(data)

  // Crear un elemento temporal en el DOM
  const tempDiv = document.createElement("div")
  tempDiv.innerHTML = htmlContent
  tempDiv.style.position = "absolute"
  tempDiv.style.left = "-9999px"
  tempDiv.style.top = "0"
  tempDiv.style.width = "210mm" // A4 width exactly
  tempDiv.style.backgroundColor = "white"
  tempDiv.style.fontFamily = "Arial, sans-serif"
  document.body.appendChild(tempDiv)

  try {
    console.log("⏳ Esperando renderizado del contenido...")

    // Esperar un poco para que el contenido se renderice
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Obtener las dimensiones reales del contenido
    const contentHeight = tempDiv.scrollHeight
    const contentWidth = tempDiv.scrollWidth

    console.log("📏 Dimensiones del contenido:", { width: contentWidth, height: contentHeight })

    // Convertir HTML a canvas con configuración para A4
    console.log("🖼️ Convirtiendo HTML a canvas...")

    const canvas = await html2canvas(tempDiv, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      width: 794, // A4 width in pixels at 96 DPI
      height: contentHeight,
      scrollX: 0,
      scrollY: 0,
      logging: false,
    })

    // Dimensiones A4 en mm
    const a4Width = 210
    const a4Height = 297

    const imgWidth = canvas.width
    const imgHeight = canvas.height

    // Calcular altura proporcional manteniendo el ancho A4
    const pdfHeight = (imgHeight * a4Width) / imgWidth

    console.log("📄 Creando PDF con dimensiones A4:", { width: a4Width, height: pdfHeight })

    // Crear PDF con formato A4
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: pdfHeight > a4Height ? [a4Width, pdfHeight] : "a4",
    })

    // Convertir canvas a imagen
    const imgData = canvas.toDataURL("image/png", 1.0) // Máxima calidad

    // Agregar la imagen al PDF ocupando todo el ancho A4
    pdf.addImage(imgData, "PNG", 0, 0, a4Width, pdfHeight, undefined, "FAST")

    // Descargar el PDF
    const fileName = `Carta_Garantia_${data.letterNumber}_${data.clientName.replace(/\s+/g, "_")}.pdf`
    pdf.save(fileName)

    console.log("✅ Carta de Garantía generada y descargada exitosamente:", fileName)
  } catch (error) {
    console.error("❌ Error en generación de Carta de Garantía:", error)
    throw error
  } finally {
    // Limpiar el elemento temporal
    if (document.body.contains(tempDiv)) {
      document.body.removeChild(tempDiv)
    }
  }
}

const createWarrantyLetterHTML = (data: WarrantyLetterData): string => {
  const currentDate = new Date().toLocaleDateString("es-PE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return `
    <div style="width: 210mm; min-height: 297mm; background: white; font-family: 'Inter', 'Segoe UI', sans-serif; color: #1a1a1a; position: relative; overflow: hidden; padding: 15mm; margin: 0;">

      <!-- Header oficial con acento -->
      <div style="text-align: center; margin-bottom: 15mm; padding: 8mm; background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); border-radius: 6mm; border-left: 3mm solid #dc2626;">
        <p style="margin: 0; font-size: 11px; font-weight: 700; color: #dc2626; letter-spacing: 0.5px;">
          "Año de la Recuperación y Consolidación de la Economía Peruana"
        </p>
      </div>

      <!-- Header con logo y datos de empresa -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15mm; gap: 10mm;">
        
        <!-- Logo y datos de empresa -->
        <div style="flex: 1;">
          ${
            data.companyLogoUrl
              ? `
          <div style="margin-bottom: 8mm;">
            <img src="${data.companyLogoUrl}" alt="Logo ${data.companyName}" style="max-width: 120px; max-height: 80px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));" crossorigin="anonymous" />
          </div>
          `
              : ""
          }
          
          <div style="background: #fafafa; padding: 8mm; border-radius: 4mm; border-left: 3mm solid #dc2626;">
            <h2 style="margin: 0 0 4mm 0; font-size: 16px; font-weight: 800; color: #dc2626;">${data.companyName}</h2>
            <p style="margin: 0 0 2mm 0; font-size: 10px; color: #666;">RUC: ${data.companyRuc}</p>
            
            ${
              data.bankingInfo?.fiscalAddress
                ? `<p style="margin: 0 0 2mm 0; font-size: 9px; color: #666; line-height: 1.3;">OFICINA: ${data.bankingInfo.fiscalAddress}</p>`
                : ""
            }
            
            ${
              data.bankingInfo?.contactInfo?.email && data.bankingInfo.contactInfo.email.length > 0
                ? `<p style="margin: 0 0 2mm 0; font-size: 9px; color: #666;">E-MAIL: ${data.bankingInfo.contactInfo.email.join(" / ")}</p>`
                : ""
            }
            
            ${
              data.bankingInfo?.contactInfo?.phone || data.bankingInfo?.contactInfo?.mobile
                ? `<p style="margin: 0; font-size: 9px; color: #666;">
                    ${data.bankingInfo.contactInfo.phone ? `CENTRAL TELEFÓNICA: ${data.bankingInfo.contactInfo.phone}` : ""}
                    ${data.bankingInfo.contactInfo.phone && data.bankingInfo.contactInfo.mobile ? " / " : ""}
                    ${data.bankingInfo.contactInfo.mobile ? `MÓVIL: ${data.bankingInfo.contactInfo.mobile}` : ""}
                  </p>`
                : ""
            }
          </div>
        </div>
        
        <!-- Título y número de carta -->
        <div style="flex: 0 0 80mm; text-align: center;">
          <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; padding: 8mm; border-radius: 6mm; box-shadow: 0 4mm 6mm rgba(220,38,38,0.25);">
            <h1 style="margin: 0 0 4mm 0; font-size: 18px; font-weight: 800; letter-spacing: 1px;">CARTA DE GARANTÍA</h1>
            <p style="margin: 0; font-size: 14px; font-weight: 600;">N°${data.letterNumber}</p>
          </div>
        </div>
      </div>

      <!-- Fecha -->
      <div style="text-align: right; margin-bottom: 15mm;">
        <p style="margin: 0; font-size: 11px; font-weight: 600; color: #1a1a1a;">Lima, ${currentDate}.</p>
      </div>

      <!-- Información del destinatario -->
      <div style="margin-bottom: 15mm;">
        <div style="background: white; border: 1px solid #e5e7eb; border-radius: 4mm; overflow: hidden; box-shadow: 0 2mm 6mm rgba(0,0,0,0.08);">
          <div style="background: linear-gradient(90deg, #374151 0%, #4b5563 100%); color: white; padding: 6mm 10mm;">
            <h3 style="margin: 0; font-size: 12px; font-weight: 700; letter-spacing: 0.5px;">DESTINATARIO</h3>
          </div>
          
          <div style="padding: 10mm;">
            <p style="margin: 0 0 4mm 0; font-size: 11px; font-weight: 600; color: #374151;">Señor(a)(es):</p>
            <h3 style="margin: 0 0 6mm 0; font-size: 14px; font-weight: 800; color: #1a1a1a;">${data.clientName}</h3>
            <p style="margin: 0 0 4mm 0; font-size: 10px; color: #666;">RUC: ${data.clientRuc}</p>
            <p style="margin: 0; font-size: 10px; color: #666; line-height: 1.4;">DIRECCIÓN: ${data.clientAddress}</p>
          </div>
        </div>
      </div>

      <!-- Contenido principal -->
      <div style="margin-bottom: 15mm; line-height: 1.6;">
        <p style="margin: 0 0 8mm 0; font-size: 11px; color: #374151; text-align: justify;">
          Por medio de la presente, la empresa <strong style="color: #dc2626;">${data.companyName}</strong> les garantiza que las siguientes herramientas:
        </p>

        <!-- Lista de productos -->
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4mm; padding: 8mm; margin: 8mm 0;">
          ${data.products
            .map(
              (product) => `
            <div style="margin-bottom: 6mm; padding: 4mm; background: white; border-radius: 3mm; border-left: 3mm solid #dc2626;">
              <p style="margin: 0; font-size: 12px; font-weight: 700; color: #1a1a1a; line-height: 1.4;">
                ${product.quantity} ${product.description.toUpperCase()} DE MARCA ${product.brand.toUpperCase()}
                ${product.code ? ` CON CÓDIGO ${product.code.toUpperCase()}` : ""}.
              </p>
            </div>
          `,
            )
            .join("")}
        </div>

        <p style="margin: 8mm 0; font-size: 11px; color: #374151; text-align: justify;">
          Cuentan con una garantía de <strong style="color: #dc2626;">${data.warrantyMonths} MESES</strong>, en todas sus partes y mano de obra, contra cualquier defecto 
          de fabricación y funcionamiento a partir de la fecha entregada al consumidor final. El producto adquirido 
          ha sido sometido a los más estrictos procesos de control de calidad antes de llegar a usted; por lo que, si 
          se presenta algún desperfecto en su funcionamiento, atribuible a su fabricación, durante la vigencia del 
          plazo de esta garantía, le rogaríamos contactarnos a través de algunos de los medios especificados en el 
          presente certificado.
        </p>

        <p style="margin: 8mm 0; font-size: 11px; color: #374151; text-align: justify;">
          Asimismo, <strong style="color: #dc2626;">${data.companyName}</strong> no se responsabiliza de modo alguno por lucro de 
          pérdida de utilidades, daños indirectos, ni por ningún otro perjuicio que surja como consecuencia de un 
          indebido funcionamiento del producto adquirido.
        </p>
      </div>

      <!-- Condiciones de garantía -->
      <div style="margin-bottom: 15mm;">
        <div style="background: white; border: 1px solid #e5e7eb; border-radius: 4mm; overflow: hidden; box-shadow: 0 2mm 6mm rgba(0,0,0,0.08);">
          <div style="background: linear-gradient(90deg, #dc2626 0%, #ef4444 100%); color: white; padding: 6mm 10mm;">
            <h3 style="margin: 0; font-size: 12px; font-weight: 700; letter-spacing: 0.5px;">CONDICIONES DE GARANTÍA</h3>
          </div>
          
          <div style="padding: 10mm;">
            <p style="margin: 0 0 6mm 0; font-size: 11px; font-weight: 700; color: #dc2626;">ESTA GARANTÍA NO ES VÁLIDA EN CUALQUIERA DE LOS SIGUIENTES CASOS:</p>
            
            <div style="margin-bottom: 4mm;">
              <div style="display: flex; align-items: flex-start; gap: 4mm; margin-bottom: 3mm;">
                <div style="width: 6mm; height: 6mm; background: #dc2626; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 8px; flex-shrink: 0;">•</div>
                <p style="margin: 0; font-size: 10px; line-height: 1.4; color: #374151;">Cuando el producto se hubiese utilizado en condiciones distintas a lo normal.</p>
              </div>
              
              <div style="display: flex; align-items: flex-start; gap: 4mm; margin-bottom: 3mm;">
                <div style="width: 6mm; height: 6mm; background: #dc2626; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 8px; flex-shrink: 0;">•</div>
                <p style="margin: 0; font-size: 10px; line-height: 1.4; color: #374151;">Cuando el producto hubiese sido alterado o manipulado por terceros.</p>
              </div>
              
              <div style="display: flex; align-items: flex-start; gap: 4mm; margin-bottom: 3mm;">
                <div style="width: 6mm; height: 6mm; background: #dc2626; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 8px; flex-shrink: 0;">•</div>
                <p style="margin: 0; font-size: 10px; line-height: 1.4; color: #374151;">Cuando el producto haya tenido un mal uso por parte del usuario final.</p>
              </div>
            </div>
            
            <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 3mm; padding: 6mm; margin-top: 6mm;">
              <p style="margin: 0; font-size: 11px; font-weight: 700; color: #92400e; text-align: center;">
                ESTA GARANTÍA AMPARA ÚNICAMENTE AL PRODUCTO DESCRITO EN ESTE DOCUMENTO.
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Firma -->
      <div style="margin-top: 20mm;">
        <p style="margin: 0 0 15mm 0; font-size: 11px; color: #374151;">Atentamente,</p>
        
        <div style="text-align: center; margin-top: 25mm;">
          <div style="border-bottom: 1px solid #374151; width: 200px; margin: 0 auto 4mm auto;"></div>
          <p style="margin: 0; font-size: 11px; font-weight: 600; color: #374151;">${data.createdBy}</p>
          <p style="margin: 0; font-size: 10px; color: #666;">${data.companyName}</p>
        </div>
      </div>

      <!-- Footer con información del documento -->
      <div style="position: absolute; bottom: 10mm; left: 15mm; right: 15mm; text-align: center; font-size: 8px; color: #9ca3af; padding: 6mm; border-top: 1px solid #f3f4f6;">
        <p style="margin: 0;">Carta de Garantía generada el ${new Date().toLocaleDateString("es-PE")} | ${data.companyName}</p>
      </div>
    </div>
  `
}
