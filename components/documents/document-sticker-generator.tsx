"use client"

import { useState, useRef, useEffect } from "react"
import { Download, QrCode, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import html2canvas from "html2canvas"
import QRCodeLib from "qrcode"

interface DocumentStickerGeneratorProps {
  documentId: string
  documentNumber: string
  createdAt: string
  creatorName: string
  trackingHash: string
}

export function DocumentStickerGenerator({
  documentId,
  documentNumber,
  createdAt,
  creatorName,
  trackingHash,
}: DocumentStickerGeneratorProps) {
  const [showPreview, setShowPreview] = useState(false)
  const [qrCode, setQrCode] = useState<string>("")
  const stickerRef = useRef<HTMLDivElement>(null)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (showPreview && isClient) {
      generateQR()
    }
  }, [showPreview, isClient])

  const generateQR = async () => {
    try {
      const trackingUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/public/document-tracking/${trackingHash}`
      const qrDataUrl = await QRCodeLib.toDataURL(trackingUrl, {
        errorCorrectionLevel: "H",
        type: "image/png",
        width: 200,
        margin: 0,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      })
      setQrCode(qrDataUrl)
    } catch (error) {
      console.error("Error generating QR code:", error)
    }
  }

  const downloadSticker = async () => {
    if (!stickerRef.current) return

    try {
      const canvas = await html2canvas(stickerRef.current, {
        scale: 4,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        imageTimeout: 5000,
      })

      const link = document.createElement("a")
      link.href = canvas.toDataURL("image/png")
      link.download = `etiqueta-${documentNumber}.png`
      link.click()
    } catch (error) {
      console.error("Error downloading sticker:", error)
    }
  }

  const printSticker = () => {
    const printWindow = window.open("", "_blank")
    if (printWindow && stickerRef.current) {
      const stickerHTML = stickerRef.current.innerHTML

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Etiqueta - ${documentNumber}</title>
            <style>
              @page {
                size: 62mm 37mm;
                margin: 0;
              }
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              body {
                font-family: Arial, sans-serif;
                background: #ffffff;
              }
              .sticker {
                width: 62mm;
                height: 37mm;
                display: flex;
                gap: 3mm;
                padding: 2mm;
                background: white;
                page-break-after: always;
                page-break-inside: avoid;
              }
              .qr-section {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: space-between;
                flex-shrink: 0;
              }
              .qr-code {
                width: 28mm;
                height: 28mm;
                display: flex;
                align-items: center;
                justify-content: center;
              }
              .qr-code img {
                width: 100%;
                height: 100%;
                object-fit: contain;
                image-rendering: pixelated;
              }
              .scan-text {
                font-size: 5pt;
                font-weight: bold;
                text-align: center;
                color: #000000;
                margin-top: 1mm;
              }
              .info-section {
                flex: 1;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
              }
              .info-top {
                display: flex;
                flex-direction: column;
                gap: 1mm;
              }
              .doc-number {
                font-size: 8pt;
                font-weight: bold;
                color: #000000;
                line-height: 1;
              }
              .doc-date {
                font-size: 7pt;
                color: #333333;
                line-height: 1;
              }
              .doc-creator {
                font-size: 6pt;
                color: #555555;
                line-height: 1;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
              }
              .info-bottom {
                font-size: 5pt;
                color: #666666;
                text-align: right;
                font-weight: 600;
              }
            </style>
          </head>
          <body>
            <div class="sticker">
              <div class="qr-section">
                <div class="qr-code">
                  ${qrCode ? `<img src="${qrCode}" alt="QR Code"/>` : ""}
                </div>
                <div class="scan-text">ESCANEAR</div>
              </div>
              <div class="info-section">
                <div class="info-top">
                  <div class="doc-number">No. ${documentNumber}</div>
                  <div class="doc-date">${new Date(createdAt).toLocaleDateString("es-PE", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                  })}</div>
                  <div class="doc-creator">${creatorName}</div>
                </div>
                <div class="info-bottom">${trackingHash.substring(0, 8).toUpperCase()}</div>
              </div>
            </div>
          </body>
        </html>
      `)
      printWindow.document.close()
      setTimeout(() => printWindow.print(), 250)
    }
  }

  const formattedDate = new Date(createdAt).toLocaleDateString("es-PE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })

  return (
    <>
      <Button onClick={() => setShowPreview(true)} variant="outline" size="sm" className="gap-2">
        <QrCode className="h-4 w-4" />
        Generar Etiqueta de Seguimiento
      </Button>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Vista Previa de Etiqueta (62mm x 37mm)</DialogTitle>
            <DialogDescription>Imprime directamente o descarga como PNG</DialogDescription>
          </DialogHeader>

          {/* Sticker Preview */}
          <div className="flex justify-center bg-gray-50 p-4 rounded-lg overflow-auto border border-gray-200">
            <div
              ref={stickerRef}
              style={{
                width: "234px",
                height: "140px",
              }}
              className="bg-white border-2 border-gray-300 rounded flex gap-2 p-2 shadow-sm"
            >
              {/* QR Code Section */}
              <div className="flex flex-col items-center justify-between flex-shrink-0">
                {qrCode && (
                  <img
                    src={qrCode || "/placeholder.svg"}
                    alt="QR Code de Seguimiento"
                    style={{
                      width: "105px",
                      height: "105px",
                      imageRendering: "pixelated",
                    }}
                    className="border border-gray-200 bg-white"
                  />
                )}
                <div className="text-[6pt] text-center text-gray-700 font-bold leading-none">ESCANEAR</div>
              </div>

              {/* Document Info Section */}
              <div className="flex-1 flex flex-col justify-between text-[7pt]">
                <div className="space-y-0.5">
                  <div className="font-bold text-gray-900 truncate text-[8pt]">No. {documentNumber}</div>
                  <div className="text-gray-700 text-[7pt]">{formattedDate}</div>
                  <div className="text-gray-600 text-[6pt] truncate">{creatorName}</div>
                </div>
                <div className="text-[5pt] text-gray-500 text-right font-semibold">
                  {trackingHash.substring(0, 8).toUpperCase()}
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={printSticker} className="gap-2 bg-transparent">
              <Printer className="h-4 w-4" />
              Imprimir Etiqueta
            </Button>
            <Button onClick={downloadSticker} className="gap-2">
              <Download className="h-4 w-4" />
              Descargar PNG
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
