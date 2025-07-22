"use client"

import type React from "react"
import { QRCodeSVG } from "qrcode.react"

interface QRCodeDisplayProps {
  value: string
  size?: number
  level?: "L" | "M" | "Q" | "H"
  bgColor?: string
  fgColor?: string
  includeMargin?: boolean
}

const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  value,
  size = 128,
  level = "H",
  bgColor = "#ffffff",
  fgColor = "#000000",
  includeMargin = false,
}) => {
  if (!value) {
    return <div className="text-sm text-muted-foreground">No hay datos para generar QR.</div>
  }

  return (
    <QRCodeSVG
      value={value}
      size={size}
      level={level}
      bgColor={bgColor}
      fgColor={fgColor}
      includeMargin={includeMargin}
    />
  )
}

export default QRCodeDisplay
