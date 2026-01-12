"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, AlertCircle } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface StickerPrintIndicatorProps {
  serialId?: string | null
  productId?: string | null
  isSerializedProduct: boolean
  lastPrintInfo?: {
    printed_at: string
    printed_by_name?: string
    quantity_printed?: number
  } | null
}

export function StickerPrintIndicator({
  serialId,
  productId,
  isSerializedProduct,
  lastPrintInfo,
}: StickerPrintIndicatorProps) {
  const [isPrinted, setIsPrinted] = useState(false)

  useEffect(() => {
    setIsPrinted(!!lastPrintInfo)
  }, [lastPrintInfo])

  if (!isPrinted) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="bg-amber-50 border-amber-200 text-amber-700">
              <AlertCircle className="h-3 w-3 mr-1" />
              Sin imprimir
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="left" className="max-w-xs">
            <p className="text-xs">
              {isSerializedProduct
                ? "El sticker de esta serie aún no ha sido impreso"
                : "El sticker de este producto aún no ha sido impreso"}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (seconds < 60) return "hace unos segundos"
    if (seconds < 3600) return `hace ${Math.floor(seconds / 60)} minutos`
    if (seconds < 86400) return `hace ${Math.floor(seconds / 3600)} horas`
    if (seconds < 604800) return `hace ${Math.floor(seconds / 86400)} días`

    return date.toLocaleDateString("es-PE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  const tooltipText = `Impreso ${formatDate(lastPrintInfo!.printed_at)}${
    lastPrintInfo?.quantity_printed ? ` (${lastPrintInfo.quantity_printed} copias)` : ""
  }${lastPrintInfo?.printed_by_name ? ` por ${lastPrintInfo.printed_by_name}` : ""}`

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Impreso
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-xs">
          <p className="text-xs">{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
