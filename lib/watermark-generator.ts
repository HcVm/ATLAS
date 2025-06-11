import { jsPDF } from "jspdf"

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

// Función simplificada para agregar marca de agua a un PDF
// Esta versión no intenta modificar el PDF existente, sino que crea un nuevo PDF con la información
export async function addWatermarkToPDF(originalPdfBlob: Blob, options: WatermarkOptions): Promise<Blob> {
  try {
    // Crear un nuevo PDF con marca de agua
    const pdf = new jsPDF()

    // Configurar la página de portada con información de descarga
    pdf.setFontSize(24)
    pdf.setTextColor(0, 0, 0)
    pdf.text("DOCUMENTO CON MARCA DE SEGURIDAD", 20, 30)

    pdf.setFontSize(16)
    pdf.text(`Título: ${options.documentTitle}`, 20, 50)

    pdf.setFontSize(12)
    pdf.text("INFORMACIÓN DE DESCARGA", 20, 70)
    pdf.text(`Descargado por: ${options.downloadedBy}`, 20, 80)
    pdf.text(`Organización: ${options.organization}`, 20, 90)
    pdf.text(`Fecha de descarga: ${options.downloadDate}`, 20, 100)
    pdf.text(`Token de verificación: ${options.downloadToken}`, 20, 110)
    pdf.text(`ID del documento: ${options.documentId}`, 20, 120)

    // Agregar advertencia legal
    pdf.setTextColor(255, 0, 0)
    pdf.text("ADVERTENCIA:", 20, 140)
    pdf.setTextColor(0, 0, 0)
    pdf.text("Este documento está protegido y su descarga ha sido registrada.", 20, 150)
    pdf.text("Cualquier uso indebido será investigado y puede tener consecuencias legales.", 20, 160)

    // Agregar marca de agua diagonal
    pdf.setTextColor(200, 200, 200)
    pdf.setFontSize(60)
    pdf.text("COPIA CONTROLADA", 105, 150, {
      align: "center",
      angle: 45,
    })

    // Agregar el PDF original como anexo
    try {
      const originalPdfUrl = URL.createObjectURL(originalPdfBlob)
      pdf.addPage()
      pdf.text("DOCUMENTO ORIGINAL A CONTINUACIÓN", 20, 20)
      pdf.addPage()

      // Intentar agregar el PDF original como anexo
      // Nota: esto es una simplificación, no estamos realmente incrustando el PDF original
      // Solo estamos agregando una referencia a él
      pdf.setTextColor(0, 0, 255)
      pdf.textWithLink("Ver documento original", 20, 30, { url: originalPdfUrl })

      // Liberar el URL
      URL.revokeObjectURL(originalPdfUrl)
    } catch (error) {
      console.error("Error al anexar el PDF original:", error)
      // Si falla, simplemente continuamos con la portada
    }

    // Convertir a blob
    const watermarkedPdfBlob = pdf.output("blob")
    return watermarkedPdfBlob
  } catch (error) {
    console.error("Error adding watermark:", error)
    // Si falla la marca de agua, devolver el original
    return originalPdfBlob
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

ADVERTENCIA: Este archivo ha sido descargado de forma rastreada.
El uso indebido de este documento será investigado.
  `.trim()

  return new Blob([infoText], { type: "text/plain" })
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
