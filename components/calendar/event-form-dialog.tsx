"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Trash2, Save, X } from "lucide-react"
import { format } from "date-fns"
import { DatePickerImproved } from "@/components/ui/date-picker-improved"
import type { Database } from "@/lib/database.types"
import { toast } from "@/components/ui/use-toast"

type CalendarEvent = Database["public"]["Tables"]["calendar_events"]["Row"]

interface EventFormDialogProps {
  isOpen: boolean
  onClose: () => void
  onSave: (event: Partial<CalendarEvent>) => void
  onDelete: (id: string) => void
  event: Partial<CalendarEvent> | null
  importanceColors: Record<string, string>
  importanceLabels: Record<string, string>
  eventCategoryColors: Record<string, string> // New prop
  eventCategoryLabels: Record<string, string> // New prop
}

export function EventFormDialog({
  isOpen,
  onClose,
  onSave,
  onDelete,
  event,
  importanceColors,
  importanceLabels,
  eventCategoryColors,
  eventCategoryLabels,
}: EventFormDialogProps) {
  const [title, setTitle] = useState(event?.title || "")
  const [description, setDescription] = useState(event?.description || "")
  const [eventDate, setEventDate] = useState<Date | undefined>(
    event?.event_date
      ? (() => {
          const [year, month, day] = event.event_date.split("-").map(Number)
          return new Date(year, month - 1, day) // Create date in local timezone
        })()
      : undefined,
  )
  const [importance, setImportance] = useState(event?.importance || "medium")
  const [category, setCategory] = useState(event?.category || "personal") // New state for category
  const [isCompleted, setIsCompleted] = useState(event?.is_completed || false)

  useEffect(() => {
    if (event) {
      setTitle(event.title || "")
      setDescription(event.description || "")
      if (event.event_date) {
        const [year, month, day] = event.event_date.split("-").map(Number)
        const updatedDate = new Date(year, month - 1, day) // Create date in local timezone
        setEventDate(updatedDate)
      } else {
        setEventDate(undefined)
      }
      setImportance(event.importance || "medium")
      setCategory(event.category || "personal") // Set category from event
      setIsCompleted(event.is_completed || false)
    } else {
      // Reset form for new event
      setTitle("")
      setDescription("")
      setEventDate(undefined)
      setImportance("medium")
      setCategory("personal") // Default category for new events
      setIsCompleted(false)
    }
  }, [event])

  const handleSubmit = () => {
    if (!title || !eventDate) {
      toast({
        title: "Error",
        description: "El título y la fecha del evento son obligatorios.",
        variant: "destructive",
      })
      return
    }

    onSave({
      id: event?.id,
      title,
      description,
      event_date: eventDate ? format(eventDate, "yyyy-MM-dd") : undefined,
      importance,
      category, // Save new category
      is_completed: isCompleted,
      notification_sent: event?.notification_sent,
    })
  }

  const handleDelete = () => {
    if (event?.id) {
      onDelete(event.id)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-white text-slate-900 border-slate-200">
        <DialogHeader>
          <DialogTitle className="text-slate-900">{event?.id ? "Editar Evento" : "Crear Nuevo Evento"}</DialogTitle>
          <p className="text-sm text-slate-600">
            {event?.id ? "Modifica los detalles de tu evento." : "Añade un nuevo evento a tu calendario."}
          </p>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="title" className="text-right text-slate-700">
              Título
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="col-span-3 bg-slate-50 border-slate-200 text-slate-900 focus:ring-blue-500"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right text-slate-700">
              Descripción
            </Label>
            <Textarea
              id="description"
              value={description || ""}
              onChange={(e) => setDescription(e.target.value)}
              className="col-span-3 bg-slate-50 border-slate-200 text-slate-900 focus:ring-blue-500"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="eventDate" className="text-right text-slate-700">
              Fecha
            </Label>
            <div className="col-span-3">
              <DatePickerImproved date={eventDate} setDate={setEventDate} />
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="importance" className="text-right text-slate-700">
              Importancia
            </Label>
            <Select value={importance} onValueChange={setImportance}>
              <SelectTrigger className="col-span-3 bg-slate-50 border-slate-200 text-slate-900 focus:ring-blue-500">
                <SelectValue placeholder="Selecciona importancia" />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200 text-slate-900">
                {Object.keys(importanceLabels).map((key) => (
                  <SelectItem key={key} value={key} className="hover:bg-slate-100">
                    <span
                      className={`inline-block h-3 w-3 rounded-full mr-2 ${importanceColors[key].split(" ")[0]}`}
                    ></span>
                    {importanceLabels[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="category" className="text-right text-slate-700">
              Categoría
            </Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="col-span-3 bg-slate-50 border-slate-200 text-slate-900 focus:ring-blue-500">
                <SelectValue placeholder="Selecciona categoría" />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200 text-slate-900">
                {Object.keys(eventCategoryLabels).map((key) => (
                  <SelectItem key={key} value={key} className="hover:bg-slate-100">
                    <span
                      className={`inline-block h-3 w-3 rounded-full mr-2 ${eventCategoryColors[key].split(" ")[0]}`}
                    ></span>
                    {eventCategoryLabels[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="isCompleted" className="text-right text-slate-700">
              Completado
            </Label>
            <Checkbox
              id="isCompleted"
              checked={isCompleted}
              onCheckedChange={(checked) => setIsCompleted(checked as boolean)}
              className="col-span-3 border-slate-300 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white"
            />
          </div>
        </div>
        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2">
          {event?.id && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="w-full sm:w-auto bg-red-500 hover:bg-red-600 text-white"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar
            </Button>
          )}
          <div className="flex flex-col-reverse sm:flex-row gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={onClose}
              className="w-full sm:w-auto bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200 hover:text-slate-800"
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={handleSubmit} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white">
              <Save className="h-4 w-4 mr-2" />
              Guardar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
