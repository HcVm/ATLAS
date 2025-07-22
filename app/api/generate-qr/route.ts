// /app/api/generate-qr/route.ts

import { type NextRequest, NextResponse } from "next/server"
import { createCanvas } from '@napi-rs/canvas'
import QRCode from "qrcode"

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const data = searchParams.get("data")

  if (!data) {
    return NextResponse.json({ error: "Missing 'data' parameter" }, { status: 400 })
  }

  try {
    // Crear un canvas para el QR
    const qrCanvas = createCanvas(400, 400)
    await QRCode.toCanvas(qrCanvas, data, {
      errorCorrectionLevel: "H",
      margin: 1,
      width: 400,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    })

    // Crear un canvas más grande para incluir texto
    const finalCanvas = createCanvas(420, 480)
    const ctx = finalCanvas.getContext("2d")

    // Fondo blanco
    ctx.fillStyle = "#FFFFFF"
    ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height)

    // Dibujar el QR
    ctx.drawImage(qrCanvas, 10, 10)

    // Texto: INVENTARIO ARM 2025
    ctx.fillStyle = "#000000"
    ctx.font = "bold 25px sans-serif"
    ctx.textAlign = "center"
    ctx.fillText("INVENTARIO ARM", finalCanvas.width / 2, 440)
    ctx.fillText("2025", finalCanvas.width / 2, 465)

    // Convertir a imagen base64
    const qrDataUrl = finalCanvas.toDataURL()

    return NextResponse.json({ qrDataUrl })
  } catch (error) {
    console.error("Error generating QR code:", error)
    return NextResponse.json({ error: "Failed to generate QR code" }, { status: 500 })
  }
}
