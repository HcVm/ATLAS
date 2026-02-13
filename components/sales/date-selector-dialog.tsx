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
import { checkWarrantyExistence } from "@/app/actions/warranty-check"
import { Calendar, FileText, Check, X, Search, Loader2 } from "lucide-react"

interface DateSelectorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (selectedDate: Date, extraData?: { linkedWarrantyNumber?: string }) => void
  title: string
  description: string
  isGenerating?: boolean
  showLinkedWarrantyInput?: boolean
  initialLinkedWarranty?: string
  currentSaleId?: string
}

export function DateSelectorDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  isGenerating = false,
  showLinkedWarrantyInput = false,
  initialLinkedWarranty = "",
  currentSaleId,
}: DateSelectorDialogProps) {
  const today = new Date()
  const localDateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
  const [selectedDate, setSelectedDate] = useState<string>(localDateString)
  const [linkedNumber, setLinkedNumber] = useState(initialLinkedWarranty || "")

  // Validation State
  const [validationStatus, setValidationStatus] = useState<'idle' | 'loading' | 'valid' | 'invalid'>(
    initialLinkedWarranty ? 'valid' : 'idle'
  )
  const [validationMessage, setValidationMessage] = useState(
    initialLinkedWarranty ? "Garantía vinculada previamente" : ""
  )

  const handleConfirm = () => {
    const [year, month, day] = selectedDate.split("-").map(Number)
    const date = new Date(year, month - 1, day)
    onConfirm(date, { linkedWarrantyNumber: linkedNumber })
  }

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value)
  }

  const validateLinkedWarranty = async () => {
    if (!linkedNumber.trim()) return
    setValidationStatus('loading')
    setValidationMessage("")

    try {
      const result = await checkWarrantyExistence(linkedNumber.trim(), currentSaleId)

      if (result.success && result.data) {
        setValidationStatus('valid')
        setValidationMessage(`Garantía válida otorgada a: ${result.data.entity_name || "Cliente desconocido"}`)
      } else {
        setValidationStatus('invalid')
        setValidationMessage(result.message || "No se encontró ninguna garantía con este número en el sistema.")
      }
    } catch (err) {
      console.error("Error validating warranty:", err)
      setValidationStatus('invalid')
      setValidationMessage("Error al validar. Verifique su conexión.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
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
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="linked-warranty" className="text-right font-semibold text-red-600 pt-2">
                N° Garantía Original *
              </Label>
              <div className="col-span-3 space-y-2">
                <div className="flex gap-2">
                  <Input
                    id="linked-warranty"
                    value={linkedNumber}
                    onChange={(e) => {
                      setLinkedNumber(e.target.value)
                      setValidationStatus('idle')
                      setValidationMessage("")
                    }}
                    placeholder="Ej: GAR-ARM-2025-001"
                    className={`flex-1 ${validationStatus === 'valid' ? 'border-green-500 bg-green-50' : validationStatus === 'invalid' ? 'border-red-500 bg-red-50' : ''} ${initialLinkedWarranty ? 'cursor-not-allowed opacity-80' : ''}`}
                    readOnly={!!initialLinkedWarranty}
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={validateLinkedWarranty}
                    disabled={!linkedNumber.trim() || validationStatus === 'loading' || !!initialLinkedWarranty}
                    title={initialLinkedWarranty ? "Garantía ya vinculada" : "Validar Garantía"}
                  >
                    {validationStatus === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : initialLinkedWarranty ? <Check className="h-4 w-4" /> : <Search className="h-4 w-4" />}
                  </Button>
                </div>

                {/* Feedback Message */}
                {validationStatus !== 'idle' && (
                  <div className={`text-xs p-2 rounded flex items-start gap-2 ${validationStatus === 'valid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                    {validationStatus === 'valid' ? <Check className="h-4 w-4 mt-0.5 shrink-0" /> : <X className="h-4 w-4 mt-0.5 shrink-0" />}
                    <span>{validationMessage}</span>
                  </div>
                )}

                {validationStatus === 'idle' && (
                  <p className="text-[10px] text-muted-foreground">
                    Debe validar la garantía original antes de continuar.
                  </p>
                )}
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
            // Disable if validating linked warranty and it's NOT explicitly checking valid
            disabled={isGenerating || (showLinkedWarrantyInput && validationStatus !== 'valid')}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
