import jsPDF from "jspdf"
import html2canvas from "html2canvas"
import { getBankingInfoByCompanyCode, type BankingInfo } from "./company-banking-info"
import QRCode from "qrcode"
import { toast } from "sonner" // Import toast from sonner

export interface EntityQuotationPDFData {
  // Información de la empresa
  companyName: string
  companyRuc: string
  companyCode?: string
  companyAddress?: string
  companyPhone?: string
  companyEmail?: string
  companyLogoUrl?: string
  companyAccountInfo?: string

  // Información bancaria (se obtiene automáticamente por código de empresa)
  bankingInfo?: BankingInfo

  // Información de la cotización
  quotationNumber: string
  quotationDate: string
  validUntil?: string
  status: string

  // Información del cliente/entidad
  clientCode: string
  clientName: string
  clientRuc: string
  clientAddress: string
  clientDepartment?: string
  clientAttention?: string
  currency: string

  // Información de productos (puede ser multi-producto)
  products: Array<{
    quantity: number
    description: string
    unit: string
    brand?: string
    code?: string
    unitPrice: number
    totalPrice: number
  }>

  // Totales
  subtotal: number
  igv: number
  total: number

  // Condiciones
  conditions?: string[]

  // Observaciones adicionales
  observations?: string

  // Creado por
  createdBy: string
}

export const generateEntityQuotationPDF = async (data: EntityQuotationPDFData): Promise<void> => {
  console.log("🚀 Iniciando generación de PDF con validación...")

  // Obtener información bancaria automáticamente si tenemos el código de empresa
  if (data.companyCode && !data.bankingInfo) {
    const bankingInfo = getBankingInfoByCompanyCode(data.companyCode)
    if (bankingInfo) {
      data.bankingInfo = bankingInfo
    }
    console.log("✅ Banking info obtained for company:", data.companyCode, data.bankingInfo)
  }

  // Generar validación usando API endpoint
  let validationHash = ""
  let qrCodeDataUrl = ""

  try {
    console.log("🔐 Creando validación a través de API...")

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
    validationHash = validationData.validationHash
    const validationUrl = validationData.validationUrl

    console.log("✅ Validación creada:", validationHash.substring(0, 16) + "...")
    console.log("🔗 URL de validación:", validationUrl)

    // Generar QR usando EXACTAMENTE la misma configuración que funciona en documentos
    console.log("📱 Generando código QR...")
    qrCodeDataUrl = await QRCode.toDataURL(validationUrl, {
      width: 256,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    })

    console.log("✅ QR Code generado exitosamente")
    console.log("📏 QR length:", qrCodeDataUrl.length)
  } catch (error) {
    console.error("❌ Error completo en generación de validación:", error)

    // Mostrar error específico al usuario con toast
    const errorMessage = error instanceof Error ? error.message : "Error desconocido"
    toast.error("Error crítico: No se pudo generar el sistema de validación.", {
      description: `Detalle: ${errorMessage}. El PDF no se generará sin validación.`,
    })

    // No continuar sin validación
    throw new Error("No se puede generar PDF sin sistema de validación")
  }

  // Verificar que tenemos QR antes de continuar
  if (!qrCodeDataUrl) {
    console.error("❌ No se generó el código QR")
    toast.error("Error: No se pudo generar el código QR de validación.", {
      description: "El PDF no se creará sin validación.",
    })
    throw new Error("QR Code es requerido para la validación")
  }

  console.log("🎨 Creando contenido HTML del PDF...")

  // Crear el HTML temporal para el PDF
  const htmlContent = createEntityQuotationHTML(data, qrCodeDataUrl)

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
    const fileName = `Cotizacion_Entidad_${data.quotationNumber}_${data.clientName.replace(/\s+/g, "_")}.pdf`
    pdf.save(fileName)

    console.log("✅ PDF generado y descargado exitosamente:", fileName)

    // Mostrar mensaje de éxito con toast
    toast.success("PDF generado exitosamente con código QR de validación.", {
      description: `Archivo: ${fileName}\nHash de validación: ${validationHash.substring(0, 16)}...`,
      duration: 8000, // Show for a longer duration
    })
  } catch (error) {
    console.error("❌ Error en generación de PDF:", error)
    toast.error("Error al generar el PDF.", {
      description: `Por favor, intente nuevamente. Detalle: ${error instanceof Error ? error.message : "Error desconocido"}`,
    })
    throw error
  } finally {
    // Limpiar el elemento temporal
    if (document.body.contains(tempDiv)) {
      document.body.removeChild(tempDiv)
    }
  }
}

const createEntityQuotationHTML = (data: EntityQuotationPDFData, qrCodeDataUrl: string): string => {
  const formatCurrency = (amount: number) => {
    return `S/ ${amount.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-PE", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  return `
  <div style="padding: 12px 8px; width: 100%; margin: 0 auto; background: white; font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif; font-size: 11px; line-height: 1.4; position: relative; color: #1f2937;">
    
    <!-- Marca de agua del logo -->
    ${
      data.companyLogoUrl
        ? `
    <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); opacity: 0.05; z-index: 0; pointer-events: none;">
      <img src="${data.companyLogoUrl}" alt="Logo" style="max-width: 500px; max-height: 95px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));" crossorigin="anonymous" />
    </div>
    `
        : ""
    }
    
    <!-- Contenido principal -->
    <div style="position: relative; z-index: 1;">
      
      <!-- Header oficial con acento azul -->
      <div style="text-align: center; margin-bottom: 18px; padding: 12px; background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); border-radius: 8px; border-left: 4px solid #3b82f6;">
        <p style="margin: 0; font-size: 12px; font-weight: 700; color: #1e40af; letter-spacing: 0.5px;">
          "Año de la Recuperación y Consolidación de la Economía Peruana"
        </p>
      </div>

      <!-- Layout en tres columnas para header -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 18px; gap: 15px;">
        
        <!-- Columna izquierda: Logo -->
        <div style="flex: 0 0 170px;">
          ${
            data.companyLogoUrl
              ? `
          <div style="margin-bottom: 12px;">
            <img src="${data.companyLogoUrl}" alt="Logo ${data.companyName}" style="max-width: 150px; max-height: 95px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));" crossorigin="anonymous" />
          </div>
          `
              : ""
          }
        </div>
        
        <!-- Columna central: Información de comercialización -->
        <div style="flex: 1; padding: 0 15px;">
          <div style="background: #f8fafc; padding: 12px; border-radius: 6px; border-left: 4px solid rgba(30, 53, 156, 0.76);">
            <p style="margin: 0 0 6px 0; font-size: 11px; font-weight: 700; color:rgba(30, 53, 156, 0.76); text-transform: uppercase; letter-spacing: 0.5px;">Comercialización, Representación, Consignación, Promoción, Publicidad, Importación, Exportación, Distribución, Compra y Venta al por mayor y menor de artículos y productos de la industria peruana.</p>
          </div>
        </div>
        
        <!-- Columna derecha: Fecha y cotización -->
        <div style="flex: 0 0 240px; text-align: right;">
          <div style="background: white; border: 2px solid #e5e7eb; border-radius: 6px; padding: 12px; margin-bottom: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
            <p style="margin: 0 0 4px 0; font-size: 10px; color: #6b7280; font-weight: 500;">FECHA</p>
            <p style="margin: 0; font-size: 11px; font-weight: 700; color: #1f2937;">Lima, ${formatDate(data.quotationDate)}</p>
          </div>
          
          <!-- Título de cotización destacado -->
          <div style="background: linear-gradient(135deg, #1e40af 0%, #2563eb 100%); color: white; padding: 12px; border-radius: 6px; box-shadow: 0 4px 6px rgba(220,38,38,0.25);">
            <p style="margin: 0 0 4px 0; font-size: 10px; opacity: 0.9; font-weight: 500;">COTIZACIÓN</p>
            <h2 style="margin: 0; font-size: 15px; font-weight: 800; letter-spacing: 1px;">N° ${data.quotationNumber}</h2>
          </div>
        </div>
      </div>

      <!-- Información del cliente en tarjeta compacta -->
      <div style="margin-bottom: 18px; background: white; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; box-shadow: 0 2px 6px rgba(0,0,0,0.08);">
        <div style="background: linear-gradient(90deg, #374151 0%, #4b5563 100%); color: white; padding: 10px 15px;">
          <h3 style="margin: 0; font-size: 12px; font-weight: 700; letter-spacing: 0.5px;">DATOS DEL CLIENTE</h3>
        </div>
        
        <div style="padding: 15px;">
          <!-- Grid de información del cliente en 3 columnas -->
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 12px;">
            <div>
              <p style="margin: 0 0 4px 0; font-size: 10px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Código</p>
              <p style="margin: 0; font-size: 11px; color: #1f2937; font-weight: 600;">${data.clientCode}</p>
            </div>
            <div>
              <p style="margin: 0 0 4px 0; font-size: 10px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">RUC</p>
              <p style="margin: 0; font-size: 11px; color: #1f2937; font-weight: 700; font-family: monospace;">${data.clientRuc}</p>
            </div>
            <div>
              <p style="margin: 0 0 4px 0; font-size: 10px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Moneda</p>
              <p style="margin: 0; font-size: 11px; color: #1f2937; font-weight: 700;">${data.currency}</p>
            </div>
          </div>
          
          <div style="margin-bottom: 12px;">
            <p style="margin: 0 0 4px 0; font-size: 10px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Razón Social</p>
            <p style="margin: 0; font-size: 11px; color: #1f2937; font-weight: 700;">${data.clientName}</p>
          </div>
          
          <div style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 12px;">
            <div>
              <p style="margin: 0 0 4px 0; font-size: 10px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Dirección</p>
              <p style="margin: 0; font-size: 11px; color: #374151; line-height: 1.3;">${data.clientAddress}</p>
            </div>
            ${
              data.clientDepartment
                ? `
            <div>
              <p style="margin: 0 0 4px 0; font-size: 10px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Dependencia</p>
              <p style="margin: 0; font-size: 11px; color: #374151;">${data.clientDepartment}</p>
            </div>
            `
                : "<div></div>"
            }
            ${
              data.clientAttention
                ? `
            <div>
              <p style="margin: 0 0 4px 0; font-size: 10px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Atención</p>
              <p style="margin: 0; font-size: 11px; color: #374151;">${data.clientAttention}</p>
            </div>
            `
                : "<div></div>"
            }
          </div>
        </div>
      </div>

      <!-- Mensaje de presentación compacto -->
      <div style="margin-bottom: 15px; padding: 12px; background: #f8fafc; border-radius: 6px; border-left: 4px solid #3b82f6;">
        <p style="margin: 0; line-height: 1.4; font-size: 10px; color: #374151; text-align: justify;">
          <strong style="color: #1e40af;">${data.companyName}</strong>, identificado con RUC <strong>${data.companyRuc}</strong>, 
          tenemos el agrado de dirigirnos a ustedes para saludarlos cordialmente y presentar nuestra propuesta económica para la adquisición de:
        </p>
      </div>

      <!-- Tabla de productos moderna y compacta -->
      ${
        data.products && data.products.length > 0
          ? `
      <div style="margin-bottom: 20px; border-radius: 6px; overflow: hidden; box-shadow: 0 3px 6px rgba(0,0,0,0.1);">
        <table style="width: 100%; border-collapse: collapse; font-size: 9px; table-layout: fixed;">
          <thead>
            <tr style="background: linear-gradient(135deg, #1f2937 0%, #374151 100%); color: white;">
              <th style="padding: 10px 6px; text-align: center; font-weight: 700; width: 7%; font-size: 9px;">CANT.</th>
              <th style="padding: 10px 6px; text-align: center; font-weight: 700; width: 40%; font-size: 9px;">DESCRIPCIÓN</th>
              <th style="padding: 10px 6px; text-align: center; font-weight: 700; width: 8%; font-size: 9px;">UNIDAD</th>
              <th style="padding: 10px 6px; text-align: center; font-weight: 700; width: 12%; font-size: 9px;">MARCA</th>
              <th style="padding: 10px 6px; text-align: center; font-weight: 700; width: 10%; font-size: 9px;">CÓDIGO</th>
              <th style="padding: 10px 6px; text-align: center; font-weight: 700; width: 11%; font-size: 9px;">P. UNIT.</th>
              <th style="padding: 10px 6px; text-align: center; font-weight: 700; width: 12%; font-size: 9px;">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            ${data.products
              .map(
                (product, index) => `
              <tr border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 8px 6px; text-align: center; font-weight: 700; color: #1f2937;">${product.quantity.toLocaleString()}</td>
                <td style="padding: 8px 6px; text-align: left; font-size: 8px; line-height: 1.3; color: #374151; word-wrap: break-word;">${product.description}</td>
                <td style="padding: 8px 6px; text-align: center; color: #6b7280; font-weight: 500;">${product.unit}</td>
                <td style="padding: 8px 6px; text-align: center; color: #6b7280; font-weight: 500;">${product.brand || "—"}</td>
                <td style="padding: 8px 6px; text-align: center; color: #6b7280; font-weight: 500; font-family: monospace; font-size: 10px;">${product.code || "—"}</td>
                <td style="padding: 8px 6px; text-align: right; color: #059669; font-weight: 700;">${formatCurrency(product.unitPrice)}</td>
                <td style="padding: 8px 6px; text-align: right; color: #dc2626; font-weight: 800; font-size: 9px;">${formatCurrency(product.totalPrice)}</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
      </div>
      `
          : `
      <!-- Mensaje de error si no hay productos -->
      <div style="margin-bottom: 15px; padding: 12px; background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; border-left: 4px solid #f59e0b;">
        <p style="margin: 0; font-size: 11px; color: #92400e; text-align: center; font-weight: 600;">
          ⚠️ No se encontraron productos para mostrar en esta cotización
        </p>
      </div>
      `
      }

      <!-- Layout horizontal para totales, condiciones y validación -->
      <div style="display: flex; gap: 15px; margin-bottom: 15px;">
        
        <!-- Columna izquierda: Condiciones de venta -->
        <div style="flex: 1;">
          <div style="background: white; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; box-shadow: 0 2px 6px rgba(0,0,0,0.08);">
            <div style="background: linear-gradient(90deg, #059669 0%, #10b981 100%); color: white; padding: 10px 15px;">
              <h4 style="margin: 0; font-size: 11px; font-weight: 700; letter-spacing: 0.5px;">CONDICIONES DE VENTA</h4>
            </div>
            
            <div style="padding: 15px;">
              ${
                data.conditions && data.conditions.length > 0
                  ? data.conditions
                      .map(
                        (condition, index) => `
                <div style="margin: 6px 0; display: flex; align-items: flex-start; gap: 8px;">
                  <div style="margin: 0; color: black; width: 10px; height: 10px; display: flex; font-size: 9px; font-weight: 700;">${index + 1}</div>
                  <p style="margin: 0; font-size: 9px; line-height: 1.3; color: #374151; flex: 1;">${condition}</p>
                </div>
              `,
                      )
                      .join("")
                  : `
                <div style="margin: 6px 0; display: flex; align-items: flex-start; gap: 8px;">
                  <div style="margin: 0; color: black; width: 10px; height: 10px; display: flex; font-size: 9px; font-weight: 700;">1</div>
                  <p style="margin: 0; font-size: 9px; line-height: 1.3; color: #374151;">Plazo de entrega: 10 días hábiles.</p>
                </div>
                <div style="margin: 6px 0; display: flex; align-items: flex-start; gap: 8px;">
                  <div style="margin: 0; color: black; width: 10px; height: 10px; display: flex; font-size: 9px; font-weight: 700;">2</div>
                  <p style="margin: 0; font-size: 9px; line-height: 1.3; color: #374151;">Entrega en almacén central.</p>
                </div>
                <div style="margin: 6px 0; display: flex; align-items: flex-start; gap: 8px;">
                  <div style="margin: 0; color: black; width: 10px; height: 10px; display: flex; font-size: 9px; font-weight: 700;">3</div>
                  <p style="margin: 0; font-size: 9px; line-height: 1.3; color: #374151;">Forma de pago: Crédito 15 días.</p>
                </div>
                <div style="margin: 6px 0; display: flex; align-items: flex-start; gap: 8px;">
                  <div style="margin: 0; color: black; width: 10px; height: 10px; display: flex; font-size: 9px; font-weight: 700;">4</div>
                  <p style="margin: 0; font-size: 9px; line-height: 1.3; color: #374151;">Garantía por defectos de fábrica 24 meses.</p>
                </div>
              `
              }
            </div>
          </div>
        </div>
        
        <!-- Columna central: Totales -->
        <div style="flex: 0 0 260px;">
          <div style="background: white; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; box-shadow: 0 2px 6px rgba(0,0,0,0.08); margin-bottom: 12px;">
            
            <!-- Subtotal -->
            <div style="padding: 10px 12px; border-bottom: 1px solid #f3f4f6; display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 11px; font-weight: 600; color: #6b7280;">Subtotal:</span>
              <span style="font-size: 12px; font-weight: 700; color: #1f2937;">${formatCurrency(data.subtotal)}</span>
            </div>
            
            <!-- IGV -->
            <div style="padding: 10px 12px; border-bottom: 1px solid #f3f4f6; display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 11px; font-weight: 600; color: #6b7280;">I.G.V. (18%):</span>
              <span style="font-size: 12px; font-weight: 700; color: #f59e0b;">${formatCurrency(data.igv)}</span>
            </div>
            
            <!-- Total -->
            <div style="padding: 12px; background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); color: white;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 12px; font-weight: 800; letter-spacing: 0.5px;">TOTAL:</span>
                <span style="font-size: 14px; font-weight: 900;">${formatCurrency(data.total)}</span>
              </div>
            </div>
          </div>
          
          <!-- Monto en letras compacto -->
          <div style="background: #f1f5f9; border: 2px solid #cbd5e1; padding: 12px; border-radius: 6px; text-align: center;">
            <p style="margin: 0; font-size: 11px; font-weight: 800; color: #1e40af; letter-spacing: 0.5px; text-transform: uppercase;">
              Son: ${convertNumberToWords(data.total)} Soles
            </p>
          </div>
        </div>
        
        <!-- Columna derecha: QR de Validación -->
        <div style="flex: 0 0 140px;">
          <div style="background: white; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; box-shadow: 0 2px 6px rgba(0,0,0,0.08); text-align: center;">
            <div style="background: linear-gradient(90deg, #dc2626 0%, #ef4444 100%); color: white; padding: 8px;">
              <h4 style="margin: 0; font-size: 10px; font-weight: 700; letter-spacing: 0.5px;">VALIDACIÓN</h4>
            </div>
            
            <div style="padding: 15px;">
              <div style="border: 2px solid #e2e8f0; border-radius: 6px; padding: 8px; display: flex; justify-content: center; align-items: center;">
                <img 
                  src="${qrCodeDataUrl}" 
                  alt="QR Validación" 
                  style="width: 70px; height: 70px;" 
                />
              </div>
              <p style="margin: 8px 0 0 0; font-size: 8px; color: #6b7280; font-weight: 500; line-height: 1.2;">
                Escanee para verificar autenticidad
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Información bancaria horizontal -->
      ${
        data.bankingInfo || data.companyAccountInfo
          ? `
      <div style="margin-bottom: 20px;">
        <div style="background: white; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; box-shadow: 0 2px 6px rgba(0,0,0,0.08);">
          <div style="background: linear-gradient(90deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 10px 15px;">
            <h4 style="margin: 0; font-size: 10px; font-weight: 700; letter-spacing: 0.5px;">INFORMACIÓN BANCARIA</h4>
          </div>
          
          <div style="padding: 15px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <p style="margin: 0 0 8px 0; font-size: 11px; font-weight: 700; color: #1f2937;">${data.companyName}</p>
              
              ${
                data.bankingInfo?.bankAccount
                  ? `
              <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 10px; border-left: 4px solid #3b82f6;">
                <div style="margin-bottom: 6px;">
                  <span color: black; border-radius: 4px; padding: 2px 5px; font-size: 8px; font-weight: 700;">💳 DATOS BANCARIOS</span>
                </div>
                <p style="margin: 4px 0; font-size: 9px; color: #374151;"><strong>${data.bankingInfo.bankAccount.type} ${data.bankingInfo.bankAccount.bank}:</strong></p>
                <p style="margin: 3px 0; font-size: 9px; color: #374151; font-family: monospace;"><strong>CTA:</strong> ${data.bankingInfo.bankAccount.accountNumber}</p>
                <p style="margin: 0; font-size: 9px; color: #374151; font-family: monospace;"><strong>CCI:</strong> ${data.bankingInfo.bankAccount.cci}</p>
              </div>
              `
                  : data.companyAccountInfo
                    ? `
              <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 10px; border-left: 4px solid #3b82f6;">
                <p style="margin: 3px 0; font-size: 10px; color: #374151; font-family: monospace;"><strong>CUENTA:</strong> ${data.companyAccountInfo}</p>
                <div style="margin-top: 6px;">
                  <span style="background: #1f2937; color: white; padding: 3px 6px; border-radius: 4px; font-size: 9px; font-weight: 700;">BCP</span>
                </div>
              </div>
              `
                    : ""
              }
            </div>
          </div>
        </div>
      </div>
      `
          : ""
      }

      ${
        data.observations
          ? `
      <!-- Observaciones -->
      <div style="margin-bottom: 15px;">
        <div style="background: white; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; box-shadow: 0 2px 6px rgba(0,0,0,0.08);">
          <div style="background: linear-gradient(90deg, #7c3aed 0%, #8b5cf6 100%); color: white; padding: 10px 15px;">
            <h4 style="margin: 0; font-size: 12px; font-weight: 700; letter-spacing: 0.5px;">OBSERVACIONES</h4>
          </div>
          <div style="padding: 15px;">
            <p style="margin: 0; font-size: 10px; line-height: 1.4; color: #374151; word-wrap: break-word;">${data.observations}</p>
          </div>
        </div>
      </div>
      `
          : ""
      }

      <!-- Footer con información de contacto compacto -->
      <div style="border-top: 2px solid #e5e7eb; padding-top: 15px; margin-top: 25px;">
        <div style="text-align: center; background: #f8fafc; padding: 12px; border-radius: 6px;">
          <div style="margin-bottom: 10px;">
            ${
              data.companyAddress || data.bankingInfo?.fiscalAddress
                ? `<p style="margin: 0 0 5px 0; color: #374151; font-weight: 600; font-size: 10px;">${data.companyAddress || data.bankingInfo?.fiscalAddress}</p>`
                : `<p style="margin: 0 0 5px 0; color: #374151; font-weight: 600; font-size: 10px;">Jr. Huantar Nro. 3311 Urb. Ca Huantar 5030 N 3311 Urb Parque El Naranjal 2da Etapa Los Olivos-Lima</p>`
            }
          </div>
          
          <div style="display: flex; justify-content: center; gap: 20px; flex-wrap: wrap;">
            ${
              data.bankingInfo?.contactInfo?.email && data.bankingInfo.contactInfo.email.length > 0
                ? `<div style="color:rgb(0, 0, 0); font-weight: 600; font-size: 9px;"><strong>📧 E-MAIL:</strong> ${data.bankingInfo.contactInfo.email.join(" / ")}</div>`
                : data.companyEmail
                  ? `<div style="color:rgb(0, 0, 0); font-weight: 600; font-size: 9px;"><strong>📧 E-MAIL:</strong> ${data.companyEmail}</div>`
                  : ""
            }
            
            ${
              data.bankingInfo?.contactInfo?.mobile || data.bankingInfo?.contactInfo?.phone
                ? `<div style="color:rgb(0, 0, 0); font-weight: 600; font-size: 9px;">
                    ${data.bankingInfo.contactInfo.mobile ? `<strong>📱 Móvil:</strong> ${data.bankingInfo.contactInfo.mobile}` : ""}
                    ${data.bankingInfo.contactInfo.mobile && data.bankingInfo.contactInfo.phone ? " / " : ""}
                    ${data.bankingInfo.contactInfo.phone ? `<strong>☎️ Telf:</strong> ${data.bankingInfo.contactInfo.phone}` : ""}
                  </div>`
                : data.companyPhone
                  ? `<div style="color: #059669; font-weight: 600; font-size: 9px;"><strong>📱 Móvil:</strong> ${data.companyPhone} / <strong>☎️ Telf:</strong> ${data.companyPhone}</div>`
                  : `<div style="color: #059669; font-weight: 600; font-size: 9px;"><strong>📱 Móvil:</strong> 999999999 / <strong>☎️ Telf:</strong> (01)111 1111 anexo:102</div>`
            }
          </div>
        </div>
        
        <!-- Información del documento -->
        <div style="margin-top: 12px; text-align: center; font-size: 8px; color: #9ca3af; padding: 10px; border-top: 1px solid #f3f4f6;">
          <p style="margin: 0 0 3px 0;">Cotización generada el ${new Date().toLocaleDateString("es-PE")} por <strong>${data.createdBy}</strong></p>
          <p style="margin: 0;">Estado: <strong>${getStatusLabel(data.status)}</strong> | Válida hasta: <strong>${data.validUntil ? formatDate(data.validUntil) : "No especificado"}</strong></p>
        </div>
      </div>
    </div>
  </div>
`
}

// Función auxiliar para convertir números a palabras (simplificada)
const convertNumberToWords = (amount: number): string => {
  // Esta es una implementación simplificada
  // En producción, podrías usar una librería como 'numero-a-letras'
  const integerPart = Math.floor(amount)
  const decimalPart = Math.round((amount - integerPart) * 100)

  // Implementación básica para números comunes
  if (integerPart < 1000) {
    return `${integerPart.toString().toUpperCase()} CON ${decimalPart.toString().padStart(2, "0")}/100`
  }

  // Para números más grandes, usar una aproximación
  return `${integerPart.toLocaleString("es-PE").toUpperCase().replace(/,/g, " MIL ")} CON ${decimalPart.toString().padStart(2, "0")}/100`
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
