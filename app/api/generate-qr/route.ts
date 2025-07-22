import { type NextRequest, NextResponse } from "next/server"
import qrcode from "qrcode"

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const data = searchParams.get("data")

  if (!data) {
    return NextResponse.json({ error: "Missing 'data' parameter" }, { status: 400 })
  }

  try {
    // Generate QR code as a data URL (base64 image)
    const qrDataUrl = await qrcode.toDataURL(data, { errorCorrectionLevel: "H", width: 256 })
    return NextResponse.json({ qrDataUrl })
  } catch (error) {
    console.error("Error generating QR code:", error)
    return NextResponse.json({ error: "Failed to generate QR code" }, { status: 500 })
  }
}
