import { PDFDocument, rgb, StandardFonts } from "pdf-lib"

export interface WatermarkOptions {
  documentTitle: string
  downloadedBy: string
  organization: string
  downloadDate: string
  downloadToken: string
  documentId: string
}

export function generateDownloadToken(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 15)
  return `${timestamp}-${random}`.toUpperCase()
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export async function applyWatermarkToPdf(pdfBlob: Blob, options: WatermarkOptions): Promise<Blob> {
  try {
    // Leer el PDF original
    const pdfBytes = await pdfBlob.arrayBuffer()
    const pdfDoc = await PDFDocument.load(pdfBytes)

    // Obtener fuente
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    // Obtener todas las páginas
    const pages = pdfDoc.getPages()

    // Aplicar marca de agua a cada página
    pages.forEach((page) => {
      const { width, height } = page.getSize()

      // Marca de agua diagonal "COPIA CONTROLADA"
      const watermarkText = "COPIA CONTROLADA"
      const watermarkSize = Math.min(width, height) * 0.15

      page.drawText(watermarkText, {
        x: width / 2 - (watermarkText.length * watermarkSize * 0.3) / 2,
        y: height / 2,
        size: watermarkSize,
        font: boldFont,
        color: rgb(0.7, 0.7, 0.7),
        opacity: 0.3,
        rotate: { angle: -45, type: "degrees" },
      })

      // Información de descarga en la parte inferior
      const footerHeight = 60
      const footerY = 10

      // Fondo para el pie de página
      page.drawRectangle({
        x: 0,
        y: footerY,
        width: width,
        height: footerHeight,
        color: rgb(0.95, 0.95, 0.95),
        opacity: 0.9,
      })

      // Línea superior del pie de página
      page.drawLine({
        start: { x: 0, y: footerY + footerHeight },
        end: { x: width, y: footerY + footerHeight },
        thickness: 1,
        color: rgb(0.6, 0.6, 0.6),
      })

      // Texto de información de descarga
      const infoText = `Descargado por: ${options.downloadedBy} | ${options.organization} | ${options.downloadDate}`
      const tokenText = `Token de verificación: ${options.downloadToken}`

      page.drawText(infoText, {
        x: 20,
        y: footerY + 35,
        size: 8,
        font: font,
        color: rgb(0.3, 0.3, 0.3),
      })

      // Token destacado
      page.drawRectangle({
        x: 15,
        y: footerY + 15,
        width: tokenText.length * 5 + 10,
        height: 15,
        color: rgb(1, 1, 0.8),
        opacity: 0.8,
      })

      page.drawText(tokenText, {
        x: 20,
        y: footerY + 18,
        size: 8,
        font: boldFont,
        color: rgb(0.2, 0.2, 0.2),
      })
    })

    // Generar el PDF modificado
    const modifiedPdfBytes = await pdfDoc.save()
    return new Blob([modifiedPdfBytes], { type: "application/pdf" })
  } catch (error) {
    console.error("Error applying watermark:", error)
    // Si falla la aplicación de marca de agua, devolver el PDF original
    return pdfBlob
  }
}

export function createDownloadSummary(options: WatermarkOptions): string {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.4;">
      <strong>Documento:</strong> ${options.documentTitle}<br/>
      <strong>Descargado por:</strong> ${options.downloadedBy}<br/>
      <strong>Organización:</strong> ${options.organization}<br/>
      <strong>Fecha:</strong> ${options.downloadDate}<br/>
      <strong>Token:</strong> <code style="background: #f0f0f0; padding: 2px 4px; border-radius: 3px;">${options.downloadToken}</code>
    </div>
  `
}

export function createWatermarkInfoFile(options: WatermarkOptions): Blob {
  const content = `
INFORMACIÓN DE DESCARGA CONTROLADA
==================================

Documento: ${options.documentTitle}
Descargado por: ${options.downloadedBy}
Organización: ${options.organization}
Fecha de descarga: ${options.downloadDate}
Token de verificación: ${options.downloadToken}
ID del documento: ${options.documentId}

Este documento ha sido descargado de forma controlada y contiene una marca de agua
con el token de verificación que permite su trazabilidad.

Para verificar la autenticidad de este documento, contacte al administrador
del sistema con el token de verificación proporcionado.
  `.trim()

  return new Blob([content], { type: "text/plain;charset=utf-8" })
}

export async function createWatermarkCoverPDF(options: WatermarkOptions): Promise<Blob> {
  try {
    // Crear un nuevo documento PDF
    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage([595.28, 841.89]) // A4 size

    // Obtener fuentes
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    const { width, height } = page.getSize()

    // Título
    page.drawText("INFORMACIÓN DE DESCARGA CONTROLADA", {
      x: 50,
      y: height - 100,
      size: 18,
      font: boldFont,
      color: rgb(0.2, 0.2, 0.2),
    })

    // Línea separadora
    page.drawLine({
      start: { x: 50, y: height - 120 },
      end: { x: width - 50, y: height - 120 },
      thickness: 2,
      color: rgb(0.3, 0.3, 0.3),
    })

    // Información del documento
    const infoY = height - 160
    const lineHeight = 25

    const infoItems = [
      { label: "Documento:", value: options.documentTitle },
      { label: "Descargado por:", value: options.downloadedBy },
      { label: "Organización:", value: options.organization },
      { label: "Fecha de descarga:", value: options.downloadDate },
      { label: "Token de verificación:", value: options.downloadToken },
      { label: "ID del documento:", value: options.documentId },
    ]

    infoItems.forEach((item, index) => {
      const y = infoY - index * lineHeight

      page.drawText(item.label, {
        x: 50,
        y,
        size: 12,
        font: boldFont,
        color: rgb(0.3, 0.3, 0.3),
      })

      page.drawText(item.value, {
        x: 180,
        y,
        size: 12,
        font: font,
        color: rgb(0.2, 0.2, 0.2),
      })
    })

    // Recuadro para el token
    const tokenY = infoY - 3 * lineHeight
    page.drawRectangle({
      x: 175,
      y: tokenY - 5,
      width: options.downloadToken.length * 7 + 10,
      height: 20,
      color: rgb(1, 1, 0.8),
      opacity: 0.8,
    })

    // Nota informativa
    const noteY = height - 400
    const noteText = [
      "Este documento ha sido descargado de forma controlada y contiene una marca",
      "de agua con el token de verificación que permite su trazabilidad.",
      "",
      "Para verificar la autenticidad de este documento, contacte al administrador",
      "del sistema con el token de verificación proporcionado.",
    ]

    noteText.forEach((line, index) => {
      page.drawText(line, {
        x: 50,
        y: noteY - index * 20,
        size: 11,
        font: font,
        color: rgb(0.4, 0.4, 0.4),
      })
    })

    // Generar el PDF
    const pdfBytes = await pdfDoc.save()
    return new Blob([pdfBytes], { type: "application/pdf" })
  } catch (error) {
    console.error("Error creating watermark cover PDF:", error)
    throw error
  }
}
