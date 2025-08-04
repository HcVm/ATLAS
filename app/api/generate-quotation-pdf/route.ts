import { type NextRequest, NextResponse } from "next/server";
import chromium from "@sparticuz/chrome-aws-lambda";
import puppeteer from "puppeteer-core"; // en producción no trae Chromium
import { generatePrivateQuotationHTML } from "@/lib/pdf-generator-private";
import { generateARMPrivateQuotationHTML } from "@/lib/pdf-generator-private-arm";
import type { PrivateQuotationPDFData } from "@/lib/pdf-generator-private";
import type { ARMPrivateQuotationPDFData } from "@/lib/pdf-generator-private-arm";

export async function POST(req: NextRequest) {
  try {
    const { pdfData, type } = await req.json();

    if (!pdfData || !type) {
      return NextResponse.json({ error: "Missing pdfData or type" }, { status: 400 });
    }

    let htmlContent: string;
    let filenamePrefix: string;

    if (type === "private") {
      htmlContent = generatePrivateQuotationHTML(pdfData as PrivateQuotationPDFData);
      filenamePrefix = `Cotizacion_Privada_${pdfData.quotationNumber.replace(/[^a-zA-Z0-9]/g, "_")}`;
    } else if (type === "arm-private") {
      htmlContent = generateARMPrivateQuotationHTML(pdfData as ARMPrivateQuotationPDFData);
      filenamePrefix = `Cotizacion_ARM_Privada_${pdfData.quotationNumber.replace(/[^a-zA-Z0-9]/g, "_")}`;
    } else {
      return NextResponse.json({ error: "Invalid PDF type" }, { status: 400 });
    }

    // Lanzar Chromium dependiendo del entorno
    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath:
        process.env.AWS_REGION // si estamos en lambda/vercel
          ? await chromium.executablePath
          : undefined, // en local puppeteer trae su Chromium
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
    headers.set("Content-Disposition", `attachment; filename="${filenamePrefix}.pdf"`);

    return new NextResponse(pdfBuffer, { headers });
  } catch (error) {
    console.error("Error generating PDF on server:", error);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}


