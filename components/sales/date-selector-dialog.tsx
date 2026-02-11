"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar, FileText } from "lucide-react"

interface DateSelectorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (selectedDate: Date, extraData?: { linkedWarrantyNumber?: string }) => void
  title: string
  description: string
  isGenerating?: boolean
  showLinkedWarrantyInput?: boolean
}

export function DateSelectorDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  isGenerating = false,
  showLinkedWarrantyInput = false,
}: DateSelectorDialogProps) {
  const today = new Date()
  const localDateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
  const [selectedDate, setSelectedDate] = useState<string>(localDateString)
  const [linkedNumber, setLinkedNumber] = useState("")

  const handleConfirm = () => {
    const [year, month, day] = selectedDate.split("-").map(Number)
    const date = new Date(year, month - 1, day)
    onConfirm(date, { linkedWarrantyNumber: linkedNumber })
  }

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="document-date" className="text-right">
              Fecha del documento
            </Label>
            <div className="col-span-3 relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input id="document-date" type="date" value={selectedDate} onChange={handleDateChange} className="pl-10" />
            </div>
          </div>

          {showLinkedWarrantyInput && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="linked-warranty" className="text-right">
                N° Garantía Original
              </Label>
              <div className="col-span-3">
                <Input
                  id="linked-warranty"
                  value={linkedNumber}
                  onChange={(e) => setLinkedNumber(e.target.value)}
                  placeholder="Ej: GAR-ARM-2025-001 (Opcional)"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Si se deja vacío, se generará uno automáticamente.
                </p>
              </div>
            </div>
          )}

          <div className="text-sm text-muted-foreground bg-blue-50 p-3 rounded-md border-l-4 border-blue-200">
            <p className="font-medium text-blue-800 mb-1">Información:</p>
            <p className="text-blue-700">
              Esta fecha aparecerá en el documento PDF generado. Puedes seleccionar cualquier fecha según tus necesidades.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isGenerating}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Generando...
              </>
            ) : (
              "Generar Documento"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
