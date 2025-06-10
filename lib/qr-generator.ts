import QRCode from "qrcode"

export async function generateDocumentQR(documentId: string): Promise<string> {
  try {
    // Obtener la URL base del sitio
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"

    // Crear la URL pública del documento
    const documentUrl = `${baseUrl}/public/document/${documentId}`

    // Generar el código QR como data URL
    const qrCodeDataUrl = await QRCode.toDataURL(documentUrl, {
      width: 256,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    })

    return qrCodeDataUrl
  } catch (error) {
    console.error("Error generating QR code:", error)
    throw new Error("Failed to generate QR code")
  }
}

export async function generateQRCodeBuffer(text: string): Promise<Buffer> {
  try {
    const buffer = await QRCode.toBuffer(text, {
      width: 256,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    })

    return buffer
  } catch (error) {
    console.error("Error generating QR code buffer:", error)
    throw new Error("Failed to generate QR code buffer")
  }
}
