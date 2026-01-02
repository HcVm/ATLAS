"use client"

import type React from "react"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { format } from "date-fns"

interface Product {
  id: string
  name: string
  code: string
  cost_price: number | null
}

interface QuickInternalEntryDialogProps {
  product: Product | null
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  companyId: string
  onSuccess: () => void
}

export function QuickInternalEntryDialog({
  product,
  isOpen,
  onOpenChange,
  companyId,
  onSuccess,
}: QuickInternalEntryDialogProps) {
  const [quantity, setQuantity] = useState<number>(1)
  const [costPrice, setCostPrice] = useState<number>(product?.cost_price || 0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Update cost price when product changes
  useState(() => {
    if (product?.cost_price) {
      setCostPrice(product.cost_price)
    }
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!product || !companyId) return

    if (quantity <= 0) {
      toast.error("La cantidad debe ser mayor a 0")
      return
    }

    setIsSubmitting(true)

    try {
      const payload = {
        product_id: product.id,
        movement_type: "entrada",
        quantity: quantity,
        cost_price: costPrice,
        reason: "Uso Interno",
        requested_by: "Franco Quintos",
        department_requesting: "Almacén",
        movement_date: format(new Date(), "yyyy-MM-dd"),
        company_id: companyId,
        notes: "Entrada rápida desde lista de productos",
      }

      const response = await fetch("/api/internal-inventory-movements", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al registrar la entrada")
      }

      toast.success("Entrada registrada exitosamente")
      onSuccess()
      onOpenChange(false)
      // Reset form
      setQuantity(1)
    } catch (error: any) {
      console.error("Error submitting quick movement:", error)
      toast.error(error.message || "Error al registrar la entrada")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Registrar Entrada - Uso Interno</DialogTitle>
          <DialogDescription>
            Ingresa la cantidad y el costo para <strong>{product?.name}</strong>.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="quantity">Cantidad</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              step="1"
              value={quantity}
              onChange={(e) => setQuantity(Number.parseInt(e.target.value) || 0)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="costPrice">Costo Unitario (S/)</Label>
            <Input
              id="costPrice"
              type="number"
              min="0"
              step="0.01"
              value={costPrice}
              onChange={(e) => setCostPrice(Number.parseFloat(e.target.value) || 0)}
              required
            />
          </div>
          <div className="pt-2 text-xs text-muted-foreground space-y-1">
            <p>
              <strong>Motivo:</strong> Uso Interno
            </p>
            <p>
              <strong>Solicitado Por:</strong> Franco Quintos
            </p>
            <p>
              <strong>Departamento:</strong> Almacén
            </p>
            <p>
              <strong>Fecha:</strong> {format(new Date(), "dd/MM/yyyy")}
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registrando...
                </>
              ) : (
                "Registrar Entrada"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
