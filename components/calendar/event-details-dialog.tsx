"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Pencil, X } from "lucide-react"
import type { Database } from "@/lib/database.types"

type CalendarEvent = Database["public"]["Tables"]["calendar_events"]["Row"]

interface EventDetailsDialogProps {
  isOpen: boolean
  onClose: () => void
  event: CalendarEvent | null
  onEdit: (event: CalendarEvent) => void
  importanceColors: Record<string, string>
  importanceLabels: Record<string, string>
}

// Helper function to parse YYYY-MM-DD string into a local Date object
// This function is duplicated here for self-containment, but ideally could be a shared utility.
const parseDateStringAsLocal = (dateString: string): Date => {
  const [year, month, day] = dateString.split("-").map(Number)
  return new Date(year, month - 1, day) // month - 1 because Date months are 0-indexed
}

export function EventDetailsDialog({
  isOpen,
  onClose,
  event,
  onEdit,
  importanceColors,
  importanceLabels,
}: EventDetailsDialogProps) {
  if (!event) return null

  const eventImportanceClass = event.is_completed
    ? importanceColors.completed
    : importanceColors[event.importance] || importanceColors.medium

  const eventImportanceLabel = event.is_completed
    ? importanceLabels.completed
    : importanceLabels[event.importance] || importanceLabels.medium

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-white text-slate-900 border-slate-200">
        <DialogHeader>
          <DialogTitle className="text-slate-900">Detalles del Evento</DialogTitle>
          <p className="text-sm text-slate-600">Información detallada de tu evento.</p>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right text-slate-700">Título</Label>
            <div className="col-span-3 text-slate-900 font-medium">{event.title}</div>
          </div>
          {event.description && (
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right text-slate-700">Descripción</Label>
              <div className="col-span-3 text-slate-700 break-words">{event.description}</div>
            </div>
          )}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right text-slate-700">Fecha</Label>
            <div className="col-span-3 text-slate-900">
              {format(parseDateStringAsLocal(event.event_date), "PPP", { locale: es })}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right text-slate-700">Importancia</Label>
            <div className="col-span-3">
              <Badge variant="outline" className={`px-2 py-0.5 rounded-sm ${eventImportanceClass}`}>
                {eventImportanceLabel}
              </Badge>
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right text-slate-700">Estado</Label>
            <div className="col-span-3 text-slate-900">
              <Badge
                variant="outline"
                className={`px-2 py-0.5 rounded-sm ${
                  event.is_completed ? importanceColors.completed : "bg-slate-100 text-slate-700 border-slate-300"
                }`}
              >
                {event.is_completed ? "Completado" : "Pendiente"}
              </Badge>
            </div>
          </div>
        </div>
        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="w-full sm:w-auto bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200 hover:text-slate-800"
          >
            <X className="h-4 w-4 mr-2" />
            Cerrar
          </Button>
          <Button onClick={() => onEdit(event)} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white">
            <Pencil className="h-4 w-4 mr-2" />
            Editar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
