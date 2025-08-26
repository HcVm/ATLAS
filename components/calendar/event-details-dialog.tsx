"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Edit, X } from "lucide-react"
import type { Database } from "@/lib/database.types"

type CalendarEvent = Database["public"]["Tables"]["calendar_events"]["Row"]

interface EventDetailsDialogProps {
  isOpen: boolean
  onClose: () => void
  event: CalendarEvent | null
  onEdit: (event: CalendarEvent) => void
  importanceColors: Record<string, string>
  importanceLabels: Record<string, string>
  eventCategoryColors: Record<string, string> // New prop
  eventCategoryLabels: Record<string, string> // New prop
}

// Helper function to parse YYYY-MM-DD string into a local Date object
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
  eventCategoryColors,
  eventCategoryLabels,
}: EventDetailsDialogProps) {
  if (!event) return null

  const eventDate = parseDateStringAsLocal(event.event_date)
  const importanceLabel = importanceLabels[event.importance] || event.importance
  const importanceColorClass = event.is_completed
    ? importanceColors.completed
    : importanceColors[event.importance] || importanceColors.medium

  const categoryLabel = eventCategoryLabels[event.category || "personal"] || event.category || "Personal"
  const categoryColorClass = eventCategoryColors[event.category || "personal"] || eventCategoryColors.personal

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-slate-900 dark:text-slate-100">Detalles del Evento</DialogTitle>
          <p className="text-sm text-slate-600 dark:text-slate-400">Información detallada de tu evento.</p>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-3 items-center gap-4">
            <span className="text-right font-medium text-slate-700 dark:text-slate-300">Título</span>
            <span className="col-span-2 text-slate-900 dark:text-slate-100">{event.title}</span>
          </div>
          {event.description && (
            <div className="grid grid-cols-3 items-start gap-4">
              <span className="text-right font-medium text-slate-700 dark:text-slate-300">Descripción</span>
              <span className="col-span-2 text-slate-900 dark:text-slate-100">{event.description}</span>
            </div>
          )}
          <div className="grid grid-cols-3 items-center gap-4">
            <span className="text-right font-medium text-slate-700 dark:text-slate-300">Fecha</span>
            <span className="col-span-2 text-slate-900 dark:text-slate-100">
              {format(eventDate, "PPP", { locale: es })}
            </span>
          </div>
          <div className="grid grid-cols-3 items-center gap-4">
            <span className="text-right font-medium text-slate-700 dark:text-slate-300">Importancia</span>
            <div className="col-span-2">
              <Badge variant="outline" className={`px-2 py-0.5 rounded-md ${importanceColorClass}`}>
                {importanceLabel}
              </Badge>
            </div>
          </div>
          <div className="grid grid-cols-3 items-center gap-4">
            <span className="text-right font-medium text-slate-700 dark:text-slate-300">Categoría</span>
            <div className="col-span-2">
              <Badge variant="outline" className={`px-2 py-0.5 rounded-md ${categoryColorClass}`}>
                {categoryLabel}
              </Badge>
            </div>
          </div>
          <div className="grid grid-cols-3 items-center gap-4">
            <span className="text-right font-medium text-slate-700 dark:text-slate-300">Estado</span>
            <div className="col-span-2">
              <Badge
                variant="outline"
                className={`px-2 py-0.5 rounded-md ${
                  event.is_completed
                    ? "bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-600"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600"
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
            className="w-full sm:w-auto bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-4 w-4 mr-2" />
            Cerrar
          </Button>
          <Button onClick={() => onEdit(event)} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white">
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
