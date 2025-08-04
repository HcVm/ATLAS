import { type NextRequest, NextResponse } from "next/server";
import { generatePrivateQuotationHTML } from "@/lib/pdf-generator-private";
import { generateARMPrivateQuotationHTML } from "@/lib/pdf-generator-private-arm";
import type { PrivateQuotationPDFData } from "@/lib/pdf-generator-private";
import type { ARMPrivateQuotationPDFData } from "@/lib/pdf-generator-private-arm";

// 👇 Garantiza que corre en Node.js (no en Edge)
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { pdfData, type } = await req.json();

    if (!pdfData || !type) {
      return NextResponse.json(
        { error: "Missing pdfData or type" },
        { status: 400 }
      );
    }

    let htmlContent: string;
    let filenamePrefix: string;

    if (type === "private") {
      htmlContent = generatePrivateQuotationHTML(
        pdfData as PrivateQuotationPDFData
      );
      filenamePrefix = `Cotizacion_Privada_${pdfData.quotationNumber.replace(
        /[^a-zA-Z0-9]/g,
        "_"
      )}`;
    } else if (type === "arm-private") {
      htmlContent = generateARMPrivateQuotationHTML(
        pdfData as ARMPrivateQuotationPDFData
      );
      filenamePrefix = `Cotizacion_ARM_Privada_${pdfData.quotationNumber.replace(
        /[^a-zA-Z0-9]/g,
        "_"
      )}`;
    } else {
      return NextResponse.json(
        { error: "Invalid PDF type" },
        { status: 400 }
      );
    }

    // 📌 Importar dinámicamente para evitar incluir en el bundle
    const chromiumModule = await import("@sparticuz/chrome-aws-lambda");
    const chromium = chromiumModule.default;

    const puppeteerModule = await import("puppeteer-core");
    const puppeteer = puppeteerModule.default;

    // Determinar executablePath según entorno
    const executablePath = process.env.AWS_REGION
      ? await chromium.executablePath // Lambda / Vercel
      : puppeteer.executablePath(); // Local

    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath,
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "5mm", right: "5mm", bottom: "5mm", left: "5mm" },
    });

    await browser.close();

    const headers = new Headers();
    headers.set("Content-Type", "application/pdf");
    headers.set(
      "Content-Disposition",
      `attachment; filename="${filenamePrefix}.pdf"`
    );

    return new NextResponse(pdfBuffer, { headers });
  } catch (error) {
    console.error("Error generating PDF on server:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
