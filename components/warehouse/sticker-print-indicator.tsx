"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, AlertCircle, AlertTriangle } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { formatInTimeZone } from "date-fns-tz"
import { es } from "date-fns/locale"

interface StickerPrintIndicatorProps {
  serialId?: string | null
  productId?: string | null
  isSerializedProduct: boolean
  lastPrintInfo?: {
    printed_at: string
    printed_by_name?: string
    quantity_printed?: number
  } | null
  printStats?: {
    totalInStock: number
    printedCount: number
    lastPrintAt: string | null
  }
}

export function StickerPrintIndicator({
  serialId,
  productId,
  isSerializedProduct,
  lastPrintInfo,
  printStats,
}: StickerPrintIndicatorProps) {
  const [isPrinted, setIsPrinted] = useState(false)

  useEffect(() => {
    setIsPrinted(!!lastPrintInfo || (!!printStats && printStats.printedCount > 0))
  }, [lastPrintInfo, printStats])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (seconds < 60) return "hace unos segundos"
    if (seconds < 3600) return `hace ${Math.floor(seconds / 60)} minutos`
    if (seconds < 86400) return `hace ${Math.floor(seconds / 3600)} horas`
    if (seconds < 604800) return `hace ${Math.floor(seconds / 86400)} días`

    return formatInTimeZone(dateString, "America/Lima", "dd/MM/yyyy HH:mm", { locale: es })
  }

  // Case 1: Serialized Product Summary (List View)
  if (isSerializedProduct && !serialId && printStats) {
    const { totalInStock, printedCount, lastPrintAt } = printStats

    if (totalInStock === 0) {
      return (
        <Badge variant="outline" className="bg-gray-50 text-gray-500">
          Sin stock
        </Badge>
      )
    }

    if (printedCount === 0) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="bg-amber-50 border-amber-200 text-amber-700">
                <AlertCircle className="h-3 w-3 mr-1" />
                Sin imprimir
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p className="text-xs">Ninguna de las {totalInStock} series en stock ha sido impresa.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
    }

    if (printedCount < totalInStock) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="bg-orange-50 border-orange-200 text-orange-700">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Parcial ({printedCount}/{totalInStock})
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p className="text-xs">
                Solo {printedCount} de {totalInStock} series han sido impresas.
                <br />
                Última impresión: {lastPrintAt ? formatDate(lastPrintAt) : "N/A"}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
    }

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Completo ({printedCount}/{totalInStock})
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p className="text-xs">
              Todas las series en stock han sido impresas.
              <br />
              Última impresión: {lastPrintAt ? formatDate(lastPrintAt) : "N/A"}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // Case 2: Individual Item (Serial or Bulk Product)
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

  const tooltipText = `Impreso ${lastPrintInfo?.printed_at ? formatDate(lastPrintInfo.printed_at) : ""}${
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
