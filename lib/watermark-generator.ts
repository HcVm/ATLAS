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

// Función simplificada para crear un PDF de portada con información de descarga
export async function createWatermarkCoverPDF(options: WatermarkOptions): Promise<Blob> {
  try {
    // Importar jsPDF dinámicamente para evitar problemas de SSR
    const { jsPDF } = await import("jspdf")

    const pdf = new jsPDF()

    // Configurar la página de portada con información de descarga
    pdf.setFontSize(20)
    pdf.setTextColor(0, 0, 0)
    pdf.text("DOCUMENTO CON CONTROL DE DESCARGA", 20, 30)

    // Línea separadora
    pdf.setLineWidth(0.5)
    pdf.line(20, 35, 190, 35)

    pdf.setFontSize(14)
    pdf.text(`Título: ${options.documentTitle}`, 20, 50)

    pdf.setFontSize(12)
    pdf.text("INFORMACIÓN DE DESCARGA:", 20, 70)

    // Información del usuario
    const lines = [
      `• Descargado por: ${options.downloadedBy}`,
      `• Organización: ${options.organization}`,
      `• Fecha de descarga: ${options.downloadDate}`,
      `• Token de verificación: ${options.downloadToken}`,
      `• ID del documento: ${options.documentId}`,
    ]

    let yPosition = 85
    lines.forEach((line) => {
      pdf.text(line, 25, yPosition)
      yPosition += 10
    })

    // Agregar advertencia legal
    pdf.setFontSize(11)
    pdf.setTextColor(200, 0, 0)
    pdf.text("ADVERTENCIA LEGAL:", 20, yPosition + 15)

    pdf.setTextColor(0, 0, 0)
    pdf.setFontSize(10)
    const warningLines = [
      "• Este documento está protegido y su descarga ha sido registrada.",
      "• Cualquier uso indebido será investigado y puede tener consecuencias legales.",
      "• La información de descarga se mantiene en nuestros registros de seguridad.",
      "• Este documento no debe ser modificado, alterado o redistribuido sin autorización.",
    ]

    yPosition += 25
    warningLines.forEach((line) => {
      pdf.text(line, 25, yPosition)
      yPosition += 8
    })

    // Agregar marca de agua diagonal
    pdf.setTextColor(220, 220, 220)
    pdf.setFontSize(50)

    // Guardar el estado gráfico
    pdf.saveGraphicsState()

    // Rotar y agregar texto
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()

    pdf.text("COPIA CONTROLADA", pageWidth / 2, pageHeight / 2, {
      align: "center",
      angle: 45,
    })

    // Restaurar el estado gráfico
    pdf.restoreGraphicsState()

    // Agregar pie de página
    pdf.setFontSize(8)
    pdf.setTextColor(100, 100, 100)
    pdf.text(
      "Este documento ha sido generado automáticamente por el sistema de gestión documental.",
      20,
      pageHeight - 20,
    )
    pdf.text(`Generado el: ${new Date().toLocaleString("es-ES")}`, 20, pageHeight - 15)

    // Convertir a blob
    const pdfBlob = pdf.output("blob")
    return pdfBlob
  } catch (error) {
    console.error("Error creating watermark PDF:", error)
    throw new Error("No se pudo crear el documento de información")
  }
}

// Función para crear un archivo de texto con información de la descarga
export function createWatermarkInfoFile(options: WatermarkOptions): Blob {
  const infoText = `
INFORMACIÓN DE DESCARGA CONTROLADA
==================================

Documento: ${options.documentTitle}
Descargado por: ${options.downloadedBy}
Organización: ${options.organization}
Fecha: ${options.downloadDate}
Token: ${options.downloadToken}
ID Documento: ${options.documentId}

ADVERTENCIA: 
Este archivo ha sido descargado de forma rastreada.
El uso indebido de este documento será investigado.
La información de descarga se mantiene en nuestros registros.

TÉRMINOS DE USO:
- No modificar el contenido del documento
- No redistribuir sin autorización
- Usar únicamente para los fines declarados
- Respetar los derechos de autor y propiedad intelectual

Generado automáticamente el: ${new Date().toLocaleString("es-ES")}
  `.trim()

  return new Blob([infoText], { type: "text/plain" })
}

// Función simplificada para descargar archivos sin usar createElement
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
