import jsPDF from "jspdf"
import html2canvas from "html2canvas"

export interface QuotationPDFData {
  // Información de la empresa
  companyName: string
  companyRuc: string
  companyAddress?: string
  companyPhone?: string
  companyEmail?: string

  // Información de la cotización
  quotationNumber: string
  quotationDate: string
  validUntil?: string
  status: string

  // Información del cliente
  clientName: string
  clientRuc: string
  deliveryLocation: string

  // Información del producto
  productCode: string
  productDescription: string
  productBrand?: string
  quantity: number
  unitPrice: number
  totalPrice: number

  // Información de ruta (opcional)
  routeInfo?: {
    origin: string
    destination: string
    distance: string
    duration: string
    mapImageUrl?: string
  }

  // Observaciones
  observations?: string

  // Creado por
  createdBy: string
}

export const generateQuotationPDF = async (data: QuotationPDFData): Promise<void> => {
  // Crear el HTML temporal para el PDF
  const htmlContent = createQuotationHTML(data)

  // Crear un elemento temporal en el DOM
  const tempDiv = document.createElement("div")
  tempDiv.innerHTML = htmlContent
  tempDiv.style.position = "absolute"
  tempDiv.style.left = "-9999px"
  tempDiv.style.top = "0"
  tempDiv.style.width = "210mm" // A4 width
  tempDiv.style.backgroundColor = "white"
  tempDiv.style.fontFamily = "Arial, sans-serif"

  document.body.appendChild(tempDiv)

  try {
    // Esperar un poco para que las imágenes se carguen
    await new Promise((resolve) => setTimeout(resolve, 3000))

    // Convertir HTML a canvas
    const canvas = await html2canvas(tempDiv, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      width: 794, // A4 width in pixels at 96 DPI
      height: 1123, // A4 height in pixels at 96 DPI
    })

    // Crear PDF
    const pdf = new jsPDF("p", "mm", "a4")
    const imgData = canvas.toDataURL("image/png")

    // Calcular dimensiones para ajustar a A4
    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = pdf.internal.pageSize.getHeight()
    const imgWidth = pdfWidth
    const imgHeight = (canvas.height * pdfWidth) / canvas.width

    // Si la imagen es más alta que la página, ajustar
    if (imgHeight > pdfHeight) {
      const ratio = pdfHeight / imgHeight
      pdf.addImage(imgData, "PNG", 0, 0, imgWidth * ratio, pdfHeight)
    } else {
      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight)
    }

    // Descargar el PDF
    pdf.save(`Cotizacion_${data.quotationNumber}_${data.clientName.replace(/\s+/g, "_")}.pdf`)
  } finally {
    // Limpiar el elemento temporal
    document.body.removeChild(tempDiv)
  }
}

const createQuotationHTML = (data: QuotationPDFData): string => {
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
    <div style="padding: 20px; max-width: 210mm; margin: 0 auto; background: white; font-family: Arial, sans-serif; font-size: 12px; line-height: 1.4;">
      <!-- Header -->
      <table style="width: 100%; border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px;">
        <tr>
          <td style="vertical-align: top; width: 60%;">
            <h1 style="color: #2563eb; font-size: 24px; font-weight: bold; margin: 0 0 5px 0;">
              ${data.companyName}
            </h1>
            <p style="color: #6b7280; margin: 0; font-size: 11px;">RUC: ${data.companyRuc}</p>
            ${data.companyAddress ? `<p style="color: #6b7280; margin: 2px 0 0 0; font-size: 11px;">${data.companyAddress}</p>` : ""}
            ${data.companyPhone ? `<p style="color: #6b7280; margin: 2px 0 0 0; font-size: 11px;">Tel: ${data.companyPhone}</p>` : ""}
            ${data.companyEmail ? `<p style="color: #6b7280; margin: 2px 0 0 0; font-size: 11px;">Email: ${data.companyEmail}</p>` : ""}
          </td>
          <td style="vertical-align: top; text-align: right; width: 40%;">
            <div style="; padding: 10px 15px; border-radius: 8px; display: inline-block;">
              <h2 style="margin: 0; font-size: 18px; font-weight: bold;">COTIZACIÓN</h2>
              <p style="margin: 5px 0 0 0; font-size: 14px;"># ${data.quotationNumber}</p>
            </div>
          </td>
        </tr>
      </table>
      
      <!-- Información de la Cotización -->
      <table style="width: 100%; margin-bottom: 30px;">
        <tr>
          <td style="vertical-align: top; width: 48%; padding-right: 2%;">
            <h3 style="color: #374151; font-size: 14px; font-weight: bold; margin: 0 0 15px 0; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px;">
              INFORMACIÓN DEL CLIENTE
            </h3>
            <div style="background: #f9fafb; padding: 15px; border-radius: 8px; border-left: 4px solid #2563eb;">
              <p style="margin: 0 0 8px 0;"><strong>Razón Social:</strong> ${data.clientName}</p>
              <p style="margin: 0 0 8px 0;"><strong>RUC:</strong> ${data.clientRuc}</p>
              <p style="margin: 0;"><strong>Lugar de Entrega:</strong> ${data.deliveryLocation}</p>
            </div>
          </td>
          
          <td style="vertical-align: top; width: 48%; padding-left: 2%;">
            <h3 style="color: #374151; font-size: 14px; font-weight: bold; margin: 0 0 15px 0; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px;">
              DETALLES DE LA COTIZACIÓN
            </h3>
            <div style="background: #f9fafb; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981;">
              <p style="margin: 0 0 8px 0;"><strong>Fecha:</strong> ${formatDate(data.quotationDate)}</p>
              ${data.validUntil ? `<p style="margin: 0 0 8px 0;"><strong>Válida hasta:</strong> ${formatDate(data.validUntil)}</p>` : ""}
              <p style="margin: 0 0 8px 0;"><strong>Estado:</strong> 
                <span style="background: #dbeafe; color: #1d4ed8; padding: 4px 4px; border-radius: 12px; font-size: 11px;">
                  ${data.status.toUpperCase()}
                </span>
              </p>
              <p style="margin: 0;"><strong>Elaborado por:</strong> ${data.createdBy}</p>
            </div>
          </td>
        </tr>
      </table>
      
      <!-- Información del Producto -->
      <div style="margin-bottom: 30px;">
        <h3 style="color: #374151; font-size: 14px; font-weight: bold; margin: 0 0 15px 0; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px;">
          DETALLE DEL PRODUCTO
        </h3>
        <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #f3f4f6;">
                <th style="padding: 12px; text-align: left; font-weight: bold; color: #374151; border-bottom: 1px solid #e5e7eb; width: 15%;">Código</th>
                <th style="padding: 12px; text-align: left; font-weight: bold; color: #374151; border-bottom: 1px solid #e5e7eb; width: 40%;">Descripción</th>
                <th style="padding: 12px; text-align: center; font-weight: bold; color: #374151; border-bottom: 1px solid #e5e7eb; width: 15%;">Cantidad</th>
                <th style="padding: 12px; text-align: right; font-weight: bold; color: #374151; border-bottom: 1px solid #e5e7eb; width: 15%;">P. Unitario</th>
                <th style="padding: 12px; text-align: right; font-weight: bold; color: #374151; border-bottom: 1px solid #e5e7eb; width: 15%;">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding: 15px 12px; border-bottom: 1px solid #f3f4f6; font-weight: 500; word-wrap: break-word;">${data.productCode}</td>
                <td style="padding: 15px 12px; border-bottom: 1px solid #f3f4f6; word-wrap: break-word;">
                  <div>
                    <p style="margin: 0; font-weight: 500;">${data.productDescription}</p>
                    ${data.productBrand ? `<p style="margin: 5px 0 0 0; color: #6b7280; font-size: 11px;">Marca: ${data.productBrand}</p>` : ""}
                  </div>
                </td>
                <td style="padding: 15px 12px; text-align: center; border-bottom: 1px solid #f3f4f6; font-weight: 500;">${data.quantity.toLocaleString()}</td>
                <td style="padding: 15px 12px; text-align: right; border-bottom: 1px solid #f3f4f6; font-weight: 500;">${formatCurrency(data.unitPrice)}</td>
                <td style="padding: 15px 12px; text-align: right; border-bottom: 1px solid #f3f4f6; font-weight: bold; color: #2563eb; font-size: 14px;">${formatCurrency(data.totalPrice)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <!-- Total destacado -->
        <div style="margin-top: 15px; text-align: right;">
          <div style=" padding: 15px 25px; border-radius: 8px; display: inline-block;">
            <p style="margin: 0; font-size: 11px; opacity: 0.9;">TOTAL COTIZADO (INC. IGV)</p>
            <p style="margin: 5px 0 0 0; font-size: 20px; font-weight: bold;">${formatCurrency(data.totalPrice)}</p>
          </div>
        </div>
      </div>
      
      ${
        data.routeInfo
          ? `
      <!-- Información de Ruta -->
      <div style="margin-bottom: 30px;">
        <h3 style="color: #374151; font-size: 14px; font-weight: bold; margin: 0 0 15px 0; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px;">
          INFORMACIÓN DE TRANSPORTE TERRESTRE
        </h3>
        <div style="background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 8px; padding: 20px;">
          <table style="width: 100%; margin-bottom: 20px;">
            <tr>
              <td style="vertical-align: top; width: 50%; padding-right: 10px;">
                <p style="margin: 0 0 10px 0;"><strong>🚛 Origen:</strong> ${data.routeInfo.origin}</p>
                <p style="margin: 0 0 10px 0;"><strong>📍 Destino:</strong> ${data.routeInfo.destination}</p>
              </td>
              <td style="vertical-align: top; width: 50%; padding-left: 10px;">
                <p style="margin: 0 0 10px 0;"><strong>📏 Distancia:</strong> ${data.routeInfo.distance}</p>
                <p style="margin: 0;"><strong>⏱️ Tiempo estimado:</strong> ${data.routeInfo.duration}</p>
              </td>
            </tr>
          </table>
          
          ${
            data.routeInfo.mapImageUrl
              ? `
          <div style="text-align: center; margin-top: 15px;">
            <img src="${data.routeInfo.mapImageUrl}" alt="Mapa de ruta" style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);" crossorigin="anonymous" />
            <p style="margin: 10px 0 0 0; font-size: 11px; color: #6b7280; font-style: italic;">Ruta calculada para transporte terrestre</p>
          </div>
          `
              : `
          <div style="text-align: center; margin-top: 15px; padding: 40px; background: #f3f4f6; border-radius: 8px; color: #6b7280;">
            <p style="margin: 0; font-style: italic;">Mapa no disponible</p>
          </div>
          `
          }
        </div>
      </div>
      `
          : ""
      }
      
      ${
        data.observations
          ? `
      <!-- Observaciones -->
      <div style="margin-bottom: 30px;">
        <h3 style="color: #374151; font-size: 14px; font-weight: bold; margin: 0 0 15px 0; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px;">
          OBSERVACIONES
        </h3>
        <div style="background: #fffbeb; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px;">
          <p style="margin: 0; color: #92400e;">${data.observations}</p>
        </div>
      </div>
      `
          : ""
      }
      
      <!-- Footer -->
      <div style="border-top: 2px solid #e5e7eb; padding-top: 20px; margin-top: 40px; text-align: center; color: #6b7280; font-size: 11px;">
        <p style="margin: 0 0 5px 0;">Esta cotización es válida por el período especificado y está sujeta a disponibilidad de stock.</p>
        <p style="margin: 0;">Documento generado automáticamente el ${new Date().toLocaleDateString("es-PE")} a las ${new Date().toLocaleTimeString("es-PE")}</p>
      </div>
    </div>
  `
}

// Función para obtener la ruta usando nuestra API route
export const getRoutePolyline = async (
  origin: string,
  destination: string,
): Promise<{
  polyline: string | null
  distance: string
  duration: string
}> => {
  try {
    const response = await fetch(
      `/api/maps/route?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`,
    )

    if (!response.ok) {
      const errorData = await response.json()
      console.error("Route API error:", errorData)
      return { polyline: null, distance: "N/A", duration: "N/A" }
    }

    const data = await response.json()

    if (data.success) {
      return {
        polyline: data.polyline,
        distance: data.distance,
        duration: data.duration,
      }
    } else {
      console.error("Route API returned error:", data.error)
      return { polyline: null, distance: "N/A", duration: "N/A" }
    }
  } catch (error) {
    console.error("Error fetching route:", error)
    return { polyline: null, distance: "N/A", duration: "N/A" }
  }
}

// Función mejorada para generar URL de imagen del mapa con marcadores visibles
export const generateMapWithRouteImageUrl = async (
  origin: string,
  destination: string,
  apiKey: string,
): Promise<string> => {
  const baseUrl = "https://maps.googleapis.com/maps/api/staticmap"

  // Clean addresses
  const cleanOrigin = origin.trim()
  const cleanDestination = destination.trim()

  console.log("Generating map for:", { cleanOrigin, cleanDestination })

  try {
    // Get the route polyline using our API
    const routeData = await getRoutePolyline(cleanOrigin, cleanDestination)
    console.log("Route data received:", routeData)

    // Construir URL paso a paso para mejor debugging
    let finalUrl = baseUrl

    // Parámetros base
    const baseParams = [`size=600x300`, `maptype=roadmap`, `format=png`, `language=es`, `region=PE`, `key=${apiKey}`]

    // Marcadores - construir de forma más simple
    const markers = [
      `markers=color:green%7Clabel:A%7Csize:mid%7C${encodeURIComponent(cleanOrigin)}`,
      `markers=color:red%7Clabel:B%7Csize:mid%7C${encodeURIComponent(cleanDestination)}`,
    ]

    // Ruta si está disponible
    const pathParam = routeData.polyline ? [`path=color:0x0000ff%7Cweight:4%7Cenc:${routeData.polyline}`] : []

    // Combinar todos los parámetros
    const allParams = [...baseParams, ...markers, ...pathParam]
    finalUrl = `${baseUrl}?${allParams.join("&")}`

    console.log("Generated Maps URL:", finalUrl)
    return finalUrl
  } catch (error) {
    console.error("Error generating map with route:", error)
    // Fallback to simple map with markers only
    return generateSimpleMapImageUrl(cleanOrigin, cleanDestination, apiKey)
  }
}

// Función de respaldo para mapa simple - también corregida
export const generateSimpleMapImageUrl = (origin: string, destination: string, apiKey: string): string => {
  const baseUrl = "https://maps.googleapis.com/maps/api/staticmap"

  const cleanOrigin = origin.trim()
  const cleanDestination = destination.trim()

  console.log("Generating simple map for:", { cleanOrigin, cleanDestination })

  // Construir URL de forma más directa
  const baseParams = [`size=600x300`, `maptype=roadmap`, `format=png`, `language=es`, `region=PE`, `key=${apiKey}`]

  const markers = [
    `markers=color:green%7Clabel:A%7Csize:mid%7C${encodeURIComponent(cleanOrigin)}`,
    `markers=color:red%7Clabel:B%7Csize:mid%7C${encodeURIComponent(cleanDestination)}`,
  ]

  const allParams = [...baseParams, ...markers]
  const finalUrl = `${baseUrl}?${allParams.join("&")}`

  console.log("Generated simple Maps URL:", finalUrl)
  return finalUrl
}
