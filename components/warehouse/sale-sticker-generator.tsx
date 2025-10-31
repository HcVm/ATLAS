"use client"

import { useRef, useEffect, useState } from "react"
import html2canvas from "html2canvas"
import JsBarcode from "jsbarcode"

// No longer requires manual input of brand, lot, or company

export interface SaleStickerData {
  clientName: string
  productName: string
  productCode: string
  productImage?: string
  totalHeight?: number // cm
  totalWidth?: number // cm
  depth?: number // cm
  brandName: string // Brand name from brands table
  brandColor?: string // Brand color for styling
  lotNumber: string // Fixed field name
  fabricationDate: string // formatted as "DD de Mes de AAAA"
  companyName: string // Distributor company name
  companyRuc?: string
  companyAddress?: string
}

interface SaleStickerGeneratorProps {
  data: SaleStickerData
  onGenerate?: (imageData: string) => void
  templateImage?: string
}

const STICKER_WIDTH_PX = 303 // 8cm at 96 DPI
const STICKER_HEIGHT_PX = 189 // 5cm at 96 DPI

export function SaleStickerGenerator({ data, onGenerate, templateImage }: SaleStickerGeneratorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [barcodeDataUrl, setBarcodeDataUrl] = useState<string>("")

  // Generate barcode
  useEffect(() => {
    const generateBarcode = async () => {
      try {
        const svg = document.createElement("div")
        svg.id = `barcode-${Math.random().toString(36).substr(2, 9)}`
        document.body.appendChild(svg)

        JsBarcode(`#${svg.id}`, data.productCode, {
          format: "CODE128",
          width: 1.5,
          height: 30,
          margin: 0,
        })

        const canvas = await html2canvas(svg, {
          backgroundColor: "transparent",
          scale: 2,
        })

        setBarcodeDataUrl(canvas.toDataURL("image/png"))
        document.body.removeChild(svg)
      } catch (error) {
        console.error("[v0] Error generating barcode:", error)
      }
    }

    generateBarcode()
  }, [data.productCode])

  const generateSticker = async () => {
    if (!containerRef.current) return

    try {
      const canvas = await html2canvas(containerRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      })

      const imageData = canvas.toDataURL("image/png")
      onGenerate?.(imageData)
    } catch (error) {
      console.error("[v0] Error generating sticker:", error)
    }
  }

  return (
    <div className="space-y-4">
      {/* Sticker Preview Container - Redesigned to match template layout */}
      <div
        ref={containerRef}
        style={{
          width: `${STICKER_WIDTH_PX}px`,
          height: `${STICKER_HEIGHT_PX}px`,
          backgroundImage: templateImage ? `url('${templateImage}')` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
          position: "relative",
          overflow: "hidden",
          border: "2px solid #0066cc",
          backgroundColor: "#ffffff",
        }}
        className="flex flex-col justify-between p-1.5"
      >
        {/* Top - Client name */}
        <div className="text-center border-b border-gray-300 pb-0.5">
          <p className="text-xs font-bold text-black leading-tight line-clamp-2">{data.clientName.toUpperCase()}</p>
        </div>

        {/* Brand Name - Large and prominent */}
        <div className="text-center py-0.5">
          <p className="text-sm font-bold text-blue-600 leading-none">{data.brandName.toUpperCase()}</p>
        </div>

        {/* Size info section */}
        <div className="text-xs leading-tight space-y-0.5">
          <p className="font-bold text-black italic">TAMAÑO DEL BIEN:</p>
          {data.totalHeight && (
            <p className="text-black">
              <span className="italic">ALTO TOTAL</span> → {data.totalHeight} cm
            </p>
          )}
          {data.totalWidth && (
            <p className="text-black">
              <span className="italic">ANCHO TOTAL</span> → {data.totalWidth} cm
            </p>
          )}
          {data.depth && (
            <p className="text-black">
              <span className="italic">PROFUNDIDAD</span> → {data.depth} cm
            </p>
          )}
        </div>

        {/* Product info and code - Right aligned */}
        <div className="flex justify-between items-center gap-1">
          {/* Product image */}
          {data.productImage && (
            <div className="flex-shrink-0">
              <img
                src={data.productImage || "/placeholder.svg"}
                alt={data.productName}
                style={{
                  maxWidth: "40px",
                  maxHeight: "40px",
                  objectFit: "contain",
                }}
                crossOrigin="anonymous"
              />
            </div>
          )}

          {/* Product code and barcode */}
          <div className="flex flex-col items-center gap-0.5">
            {barcodeDataUrl && (
              <img
                src={barcodeDataUrl || "/placeholder.svg"}
                alt="Barcode"
                style={{
                  maxWidth: "60px",
                  maxHeight: "25px",
                  objectFit: "contain",
                }}
              />
            )}
            <p className="text-xs font-bold text-black">{data.productCode}</p>
          </div>
        </div>

        {/* Distributor info */}
        <div className="text-xs leading-tight space-y-0.5 border-t border-gray-300 pt-0.5">
          <div>
            <p className="font-bold text-black italic">IMPORTADOR & DISTRIBUIDOR:</p>
            <p className="text-black font-semibold">{data.companyName}</p>
            {data.companyRuc && <p className="text-black">RUC: {data.companyRuc}</p>}
            {data.companyAddress && <p className="text-black text-xs">{data.companyAddress}</p>}
          </div>
        </div>

        {/* Lot and Fabrication - Bottom */}
        <div className="flex justify-between text-xs border-t border-gray-300 pt-0.5">
          <div className="flex gap-1">
            <span className="font-bold text-black">LOTE:</span>
            <span className="text-black">{data.lotNumber}</span>
          </div>
          <div className="flex gap-1">
            <span className="font-bold text-black">FABRICACIÓN:</span>
            <span className="text-black text-xs">{data.fabricationDate}</span>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <button
        onClick={generateSticker}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
      >
        Descargar Sticker para Imprimir
      </button>
    </div>
  )
}
