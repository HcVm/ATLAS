export interface WatermarkOptions {
  documentTitle: string
  downloadedBy: string
  organization: string
  downloadDate: string
  downloadToken: string
  documentId: string
}

// Función para generar un token único para cada descarga
export function generateDownloadToken(): string {
  const timestamp = Date.now().toString(36)
  const randomStr = Math.random().toString(36).substring(2, 15)
  return `DL-${timestamp}-${randomStr}`.toUpperCase()
}

// Función para aplicar marca de agua directamente al PDF original
export async function applyWatermarkToPdf(pdfBlob: Blob, options: WatermarkOptions): Promise<Blob> {
  try {
    // Importar PDFLib dinámicamente para evitar problemas de SSR
    const { PDFDocument, rgb, StandardFonts, degrees } = await import("pdf-lib")

    // Cargar el PDF original
    const pdfBytes = await pdfBlob.arrayBuffer()
    const pdfDoc = await PDFDocument.load(pdfBytes)

    // Obtener fuentes
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    // Aplicar marca de agua diagonal en cada página
    const pages = pdfDoc.getPages()

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i]
      const { width, height } = page.getSize()

      // Marca de agua diagonal más visible
      page.drawText("COPIA CONTROLADA", {
        x: width / 2 - 200,
        y: height / 2,
        size: 60,
        font: helveticaBold,
        color: rgb(0.85, 0.85, 0.85),
        rotate: degrees(45),
        opacity: 0.4,
      })

      // Información de control en la parte inferior
      const footerY = 20 // Posición Y desde el borde inferior

      // Dibujar un rectángulo para el fondo del footer
      page.drawRectangle({
        x: 0,
        y: 0,
        width: width,
        height: footerY + 25,
        color: rgb(0.9, 0.9, 0.95),
        opacity: 0.9,
        borderWidth: 0,
      })

      // Línea superior del footer
      page.drawLine({
        start: { x: 0, y: footerY + 25 },
        end: { x: width, y: footerY + 25 },
        thickness: 1,
        color: rgb(0.7, 0.7, 0.8),
      })

      // Información del documento en el footer
      page.drawText(`Documento: ${options.documentTitle}`, {
        x: 20,
        y: footerY + 15,
        size: 8,
        font: helveticaBold,
        color: rgb(0.2, 0.2, 0.2),
      })

      // Información de descarga en el footer
      page.drawText(`Descargado por: ${options.downloadedBy} | Fecha: ${options.downloadDate}`, {
        x: 20,
        y: footerY + 5,
        size: 8,
        font: helveticaFont,
        color: rgb(0.3, 0.3, 0.3),
      })

      // Token de verificación destacado
      const tokenText = `TOKEN DE VERIFICACIÓN: ${options.downloadToken}`
      const tokenWidth = helveticaBold.widthOfTextAtSize(tokenText, 9)

      page.drawRectangle({
        x: width - tokenWidth - 30,
        y: footerY + 2,
        width: tokenWidth + 20,
        height: 18,
        color: rgb(0.95, 0.95, 1),
        borderColor: rgb(0.7, 0.7, 0.9),
        borderWidth: 1,
        borderRadius: 4,
      })

      page.drawText(tokenText, {
        x: width - tokenWidth - 20,
        y: footerY + 8,
        size: 9,
        font: helveticaBold,
        color: rgb(0.1, 0.1, 0.5),
      })
    }

    // Guardar el PDF modificado
    const modifiedPdfBytes = await pdfDoc.save()
    return new Blob([modifiedPdfBytes], { type: "application/pdf" })
  } catch (error) {
    console.error("Error applying watermark to PDF:", error)
    // Si falla, devolver el PDF original
    return pdfBlob
  }
}

// Función para crear un resumen de información de descarga para mostrar en el popup
export function createDownloadSummary(options: WatermarkOptions): string {
  return `
    <div class="space-y-4">
      <div class="flex items-center gap-2 text-green-600">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check-circle"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        <h3 class="text-lg font-semibold">Descarga Controlada</h3>
      </div>
      
      <div class="bg-green-50 border border-green-200 p-3 rounded-md">
        <div class="grid grid-cols-1 gap-2">
          <div>
            <p class="text-sm text-muted-foreground">Documento</p>
            <p class="font-medium">${options.documentTitle}</p>
          </div>
          <div>
            <p class="text-sm text-muted-foreground">Descargado por</p>
            <p class="font-medium">${options.downloadedBy}</p>
          </div>
          <div>
            <p class="text-sm text-muted-foreground">Organización</p>
            <p class="font-medium">${options.organization}</p>
          </div>
          <div>
            <p class="text-sm text-muted-foreground">Fecha de descarga</p>
            <p class="font-medium">${options.downloadDate}</p>
          </div>
          <div>
            <p class="text-sm text-muted-foreground">Token de verificación</p>
            <p class="font-mono text-xs bg-white p-2 rounded border border-green-300 text-green-800 font-bold">${options.downloadToken}</p>
          </div>
        </div>
      </div>
      
      <div class="bg-amber-50 p-3 rounded-md border border-amber-200 text-sm text-amber-800">
        <p><strong>IMPORTANTE:</strong> Este documento ha sido marcado con información de descarga y un token único para su trazabilidad. El token aparece en el pie de página del documento descargado.</p>
      </div>
    </div>
  `
}

// Función simplificada para descargar archivos
export function downloadBlob(blob: Blob, filename: string): void {
  try {
    // Crear URL del blob
    const url = URL.createObjectURL(blob)

    // Crear enlace temporal
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    link.style.display = "none"

    // Agregar al DOM, hacer clic y limpiar
    document.body.appendChild(link)
    link.click()

    // Limpiar
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error("Error downloading file:", error)
    throw new Error("Error al descargar el archivo")
  }
}

export async function createVerificationRecord(documentId: string, token: string, anonymousData: any) {
  return {
    document_id: documentId,
    download_token: token,
    anonymous_name: anonymousData.name,
    anonymous_organization: anonymousData.organization,
    anonymous_contact: anonymousData.contact,
    anonymous_purpose: anonymousData.purpose,
    downloaded_at: new Date().toISOString(),
  }
}

// Función para verificar la autenticidad de un documento descargado
export async function verifyDocumentToken(documentId: string, downloadToken: string): Promise<boolean> {
  try {
    // Aquí se implementaría la verificación contra la base de datos
    // Por ahora es un placeholder
    return true
  } catch (error) {
    console.error("Error al verificar el token del documento:", error)
    return false
  }
}
