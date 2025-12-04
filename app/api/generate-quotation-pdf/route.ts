import { type NextRequest, NextResponse } from "next/server"
import puppeteer from "puppeteer-core"
import chromiumImport from "@sparticuz/chromium"
import type { Viewport } from "puppeteer-core"

const chromium = chromiumImport as unknown as {
  args: string[]
  defaultViewport: Viewport
  executablePath: () => Promise<string>
  headless: boolean
}

import { generatePrivateQuotationHTML } from "@/lib/pdf-generator-private"
import { generateARMPrivateQuotationHTML } from "@/lib/pdf-generator-private-arm"
import { generateGALURPrivateQuotationHTML } from "@/lib/pdf-generator-private-galur"
import type { PrivateQuotationPDFData } from "@/lib/pdf-generator-private"
import type { ARMPrivateQuotationPDFData } from "@/lib/pdf-generator-private-arm"
import type { GALURPrivateQuotationPDFData } from "@/lib/pdf-generator-private-galur"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  try {
    const { pdfData, type } = await req.json()
    if (!pdfData || !type) {
      return NextResponse.json({ error: "Missing pdfData or type" }, { status: 400 })
    }

    let htmlContent: string | null = null

    if (type === "private") {
      htmlContent = generatePrivateQuotationHTML(pdfData as PrivateQuotationPDFData)
    } else if (type === "arm-private") {
      htmlContent = generateARMPrivateQuotationHTML(pdfData as ARMPrivateQuotationPDFData)
    } else if (type === "galur-private") {
      htmlContent = generateGALURPrivateQuotationHTML(pdfData as GALURPrivateQuotationPDFData)
    }

    if (!htmlContent) {
      return NextResponse.json({ error: "Invalid PDF type" }, { status: 400 })
    }

    const typeMap: Record<string, string> = {
      private: "Cotizacion_Privada",
      "arm-private": "Cotizacion_ARM_Privada",
      "galur-private": "Cotizacion_GALUR_Privada",
    }

    const filenamePrefix = `${typeMap[type] || type}_${pdfData.quotationNumber.replace(/[^a-zA-Z0-9]/g, "_")}`

    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    })

    const page = await browser.newPage()
    await page.setContent(htmlContent, { waitUntil: "networkidle0" })

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "5mm", right: "5mm", bottom: "5mm", left: "5mm" },
    })

    await browser.close()

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filenamePrefix}.pdf"`,
      },
    })
  } catch (err: any) {
    console.error("🔥 PDF generation error:", err)
    return NextResponse.json({ error: err.message || "Failed to generate PDF" }, { status: 500 })
  }
}
