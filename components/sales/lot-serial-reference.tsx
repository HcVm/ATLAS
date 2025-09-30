"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Barcode, ExternalLink } from "lucide-react"
import Link from "next/link"

interface LotSerialReferenceProps {
  saleId: string
  lots?: Array<{
    lot_number: string
    quantity: number
    status: string
  }>
}

export function LotSerialReference({ saleId, lots = [] }: LotSerialReferenceProps) {
  if (lots.length === 0) {
    return <div className="text-sm text-muted-foreground">No hay lotes asociados a esta venta</div>
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Barcode className="h-4 w-4" />
          Lotes Asociados ({lots.length})
        </h4>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/warehouse/lots-serials">
            <ExternalLink className="h-3 w-3 mr-1" />
            Ver en Inventario
          </Link>
        </Button>
      </div>
      <div className="space-y-1">
        {lots.map((lot, index) => (
          <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm">
            <span className="font-mono">{lot.lot_number}</span>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{lot.quantity} unidades</Badge>
              <Badge variant={lot.status === "in_inventory" ? "default" : "secondary"}>
                {lot.status === "pending" ? "Pendiente" : lot.status === "in_inventory" ? "En Inventario" : "Entregado"}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
