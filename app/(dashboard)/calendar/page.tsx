"use client"

import { useState, useEffect, useMemo } from "react"
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
  isSameDay,
} from "date-fns"
import { es } from "date-fns/locale"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Plus, CalendarIcon, Filter } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useCompany } from "@/lib/company-context"
import { supabase } from "@/lib/supabase"
import type { Database } from "@/lib/database.types"
import { EventFormDialog } from "@/components/calendar/event-form-dialog"
import { EventDetailsDialog } from "@/components/calendar/event-details-dialog"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { createNotification } from "@/lib/notifications"

type CalendarEvent = Database["public"]["Tables"]["calendar_events"]["Row"]

const importanceColors: Record<string, string> = {
  low: "bg-blue-100 text-blue-700 border-blue-300",
  medium: "bg-yellow-100 text-yellow-700 border-yellow-300",
  high: "bg-orange-100 text-orange-700 border-orange-300",
  critical: "bg-red-100 text-red-700 border-red-300",
  completed: "bg-emerald-100 text-emerald-700 border-emerald-300",
}

const importanceLabels: Record<string, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  critical: "Crítica",
  completed: "Completada",
}

const eventCategoryColors: Record<string, string> = {
  personal: "bg-purple-100 text-purple-700 border-purple-300",
  work: "bg-blue-100 text-blue-700 border-blue-300",
  meeting: "bg-green-100 text-green-700 border-green-300",
  reminder: "bg-indigo-100 text-indigo-700 border-indigo-300",
  other: "bg-gray-100 text-gray-700 border-gray-300",
}

const eventCategoryLabels: Record<string, string> = {
  personal: "Personal",
  work: "Trabajo",
  meeting: "Reunión",
  reminder: "Recordatorio",
  other: "Otro",
}

// Helper function to parse YYYY-MM-DD string into a local Date object
const parseDateStringAsLocal = (dateString: string): Date => {
  const [year, month, day] = dateString.split("-").map(Number)
  return new Date(year, month - 1, day) // month - 1 because Date months are 0-indexed
}

export default function CalendarPage() {
  const { user } = useAuth()
  const { selectedCompany } = useCompany()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [isEventFormOpen, setIsEventFormOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [isEventDetailsOpen, setIsEventDetailsOpen] = useState(false)
  const [selectedEventForDetails, setSelectedEventForDetails] = useState<CalendarEvent | null>(null)
  const [filterImportance, setFilterImportance] = useState<string[]>(Object.keys(importanceLabels)) // Filter all by default
  const [filterCategory, setFilterCategory] = useState<string[]>(Object.keys(eventCategoryLabels)) // Filter all by default

  const firstDayOfMonth = startOfMonth(currentMonth)
  const lastDayOfMonth = endOfMonth(currentMonth)

  const daysInMonth = useMemo(() => {
    const startDay = new Date(firstDayOfMonth)
    startDay.setDate(startDay.getDate() - startDay.getDay()) // Go back to the first Sunday
    const endDay = new Date(lastDayOfMonth)
    endDay.setDate(endDay.getDate() + (6 - endDay.getDay())) // Go forward to the last Saturday
    return eachDayOfInterval({ start: startDay, end: endDay })
  }, [firstDayOfMonth, lastDayOfMonth])

  useEffect(() => {
    if (user) {
      fetchEvents()
    }
  }, [user, currentMonth, selectedCompany])

  useEffect(() => {
    if (user && events.length > 0) {
      checkAndSendNotifications()
    }
  }, [user, events])

  const fetchEvents = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from("calendar_events")
        .select("*")
        .eq("user_id", user?.id!)
        .gte("event_date", format(daysInMonth[0], "yyyy-MM-dd"))
        .lte("event_date", format(daysInMonth[daysInMonth.length - 1], "yyyy-MM-dd"))
        .order("event_date", { ascending: true })
        .order("created_at", { ascending: true })

      if (user?.role === "admin" && selectedCompany) {
        query = query.eq("company_id", selectedCompany.id)
      } else if (user?.company_id) {
        query = query.eq("company_id", user.company_id)
      }

      const { data, error } = await query

      if (error) throw error
      setEvents(data || [])
    } catch (error: any) {
      console.error("Error fetching calendar events:", error.message)
      toast({
        title: "Error",
        description: "No se pudieron cargar los eventos del calendario.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSaveEvent = async (eventData: Partial<CalendarEvent>) => {
    if (!user) return

    let result
    if (eventData.id) {
      // Update existing event
      result = await supabase
        .from("calendar_events")
        .update({
          title: eventData.title,
          description: eventData.description,
          event_date: eventData.event_date,
          importance: eventData.importance,
          color: eventData.color,
          is_completed: eventData.is_completed,
          notification_sent: eventData.notification_sent,
          category: eventData.category, // Save new category
        })
        .eq("id", eventData.id)
    } else {
      // Create new event
      result = await supabase.from("calendar_events").insert({
        user_id: user.id,
        company_id: user.company_id || selectedCompany?.id || null,
        title: eventData.title!,
        description: eventData.description,
        event_date: eventData.event_date!,
        importance: eventData.importance || "medium",
        color: eventData.color,
        is_completed: eventData.is_completed || false,
        notification_sent: false,
        category: eventData.category || "personal", // Save new category with default
      })
    }

    if (result.error) {
      console.error("Error saving event:", result.error.message)
      toast({
        title: "Error",
        description: `No se pudo guardar el evento: ${result.error.message}`,
        variant: "destructive",
      })
    } else {
      toast({
        title: "Éxito",
        description: "Evento guardado correctamente.",
      })
      fetchEvents()
      setIsEventFormOpen(false)
      setSelectedEvent(null)
      setIsEventDetailsOpen(false)
      setSelectedEventForDetails(null)
    }
  }

  const handleDeleteEvent = async (eventId: string) => {
    const { error } = await supabase.from("calendar_events").delete().eq("id", eventId)

    if (error) {
      console.error("Error deleting event:", error.message)
      toast({
        title: "Error",
        description: `No se pudo eliminar el evento: ${error.message}`,
        variant: "destructive",
      })
    } else {
      toast({
        title: "Éxito",
        description: "Evento eliminado correctamente.",
      })
      fetchEvents()
      setIsEventFormOpen(false)
      setSelectedEvent(null)
      setIsEventDetailsOpen(false)
      setSelectedEventForDetails(null)
    }
  }

  const handleOpenEventForm = (event?: CalendarEvent, date?: Date) => {
    if (event) {
      setSelectedEvent(event)
    } else if (date) {
      setSelectedEvent({
        id: "",
        user_id: user?.id || "",
        company_id: user?.company_id || selectedCompany?.id || null,
        title: "",
        description: null,
        event_date: format(date, "yyyy-MM-dd"),
        importance: "medium",
        color: null,
        is_completed: false,
        notification_sent: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        category: "personal", // Default category for new events
      })
    } else {
      setSelectedEvent(null)
    }
    setIsEventFormOpen(true)
    setIsEventDetailsOpen(false)
    setSelectedEventForDetails(null)
  }

  const handleOpenEventDetails = (event: CalendarEvent) => {
    setSelectedEventForDetails(event)
    setIsEventDetailsOpen(true)
    setIsEventFormOpen(false)
    setSelectedEvent(null)
  }

  const handleCloseEventForm = () => {
    setIsEventFormOpen(false)
    setSelectedEvent(null)
  }

  const handleCloseEventDetails = () => {
    setIsEventDetailsOpen(false)
    setSelectedEventForDetails(null)
  }

  const checkAndSendNotifications = async () => {
    if (!user || !user.id) return

    const today = new Date()
    const tomorrow = addMonths(today, 0)
    tomorrow.setDate(today.getDate() + 1)

    const upcomingEvents = events.filter(
      (event) =>
        !event.is_completed &&
        !event.notification_sent &&
        (isSameDay(parseDateStringAsLocal(event.event_date), today) ||
          isSameDay(parseDateStringAsLocal(event.event_date), tomorrow)),
    )

    for (const event of upcomingEvents) {
      const notificationTitle = isSameDay(parseDateStringAsLocal(event.event_date), today)
        ? "¡Evento para hoy!"
        : "Evento próximo mañana"
      const notificationMessage = `"${event.title}" - ${event.description || "Sin descripción"}`

      await createNotification({
        userId: user.id,
        title: notificationTitle,
        message: notificationMessage,
        type: "calendar_event",
        relatedId: event.id,
        companyId: event.company_id,
      })

      await supabase.from("calendar_events").update({ notification_sent: true }).eq("id", event.id)
    }
  }

  const handleImportanceFilterChange = (importance: string, checked: boolean) => {
    setFilterImportance((prev) => (checked ? [...prev, importance] : prev.filter((item) => item !== importance)))
  }

  const handleCategoryFilterChange = (category: string, checked: boolean) => {
    setFilterCategory((prev) => (checked ? [...prev, category] : prev.filter((item) => item !== category)))
  }

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const eventImportance = event.is_completed ? "completed" : event.importance
      const eventCategory = event.category || "personal" // Default to 'personal' if null

      return filterImportance.includes(eventImportance) && filterCategory.includes(eventCategory)
    })
  }, [events, filterImportance, filterCategory])

  if (loading) {
    return (
      <div className="min-h-screen p-4 sm:p-6 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
            <p className="text-slate-600 dark:text-slate-400">Cargando calendario...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
            Calendario de Actividades
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-1">
            Organiza tus tareas y eventos importantes.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-slate-200"
            onClick={() => handleOpenEventForm()}
          >
            <Plus className="h-4 w-4 mr-2" />
            <span>Nuevo Evento</span>
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-slate-200"
              >
                <Filter className="h-4 w-4 mr-2" />
                <span>Filtrar</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100">
              <div className="grid gap-2">
                <p className="text-sm font-medium mb-2">Importancia</p>
                {Object.keys(importanceLabels).map((key) => (
                  <div key={key} className="flex items-center space-x-2">
                    <Checkbox
                      id={`filter-importance-${key}`}
                      checked={filterImportance.includes(key)}
                      onCheckedChange={(checked) => handleImportanceFilterChange(key, checked as boolean)}
                      className="border-slate-300 dark:border-slate-600 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white"
                    />
                    <Label htmlFor={`filter-importance-${key}`} className="text-sm font-normal">
                      {importanceLabels[key]}
                    </Label>
                  </div>
                ))}
              </div>
              <div className="grid gap-2 mt-4">
                <p className="text-sm font-medium mb-2">Categoría</p>
                {Object.keys(eventCategoryLabels).map((key) => (
                  <div key={key} className="flex items-center space-x-2">
                    <Checkbox
                      id={`filter-category-${key}`}
                      checked={filterCategory.includes(key)}
                      onCheckedChange={(checked) => handleCategoryFilterChange(key, checked as boolean)}
                      className="border-slate-300 dark:border-slate-600 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white"
                    />
                    <Label htmlFor={`filter-category-${key}`} className="text-sm font-normal">
                      {eventCategoryLabels[key]}
                    </Label>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        {/* Sidebar for filters (adapted from image) */}
        <Card className="shadow-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
          <CardHeader className="border-b border-slate-200 dark:border-slate-700 p-4">
            <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              <CalendarIcon className="inline-block h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
              {"Calendario de Actividades"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-6">
            <div>
              <h3 className="text-md font-semibold text-slate-700 dark:text-slate-300 mb-3">Importancia</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {Object.entries(importanceLabels).map(([key, label]) => (
                  <Badge
                    key={key}
                    variant="outline"
                    className={`px-3 py-1 rounded-md cursor-pointer transition-all duration-200 ${
                      importanceColors[key]
                    } ${
                      filterImportance.includes(key)
                        ? "opacity-100 ring-2 ring-blue-500"
                        : "opacity-70 hover:opacity-100"
                    }`}
                    onClick={() => handleImportanceFilterChange(key, !filterImportance.includes(key))}
                  >
                    {label}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-md font-semibold text-slate-700 dark:text-slate-300 mb-3">Categoría</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {Object.entries(eventCategoryLabels).map(([key, label]) => (
                  <Badge
                    key={key}
                    variant="outline"
                    className={`px-3 py-1 rounded-md cursor-pointer transition-all duration-200 ${
                      eventCategoryColors[key]
                    } ${
                      filterCategory.includes(key) ? "opacity-100 ring-2 ring-blue-500" : "opacity-70 hover:opacity-100"
                    }`}
                    onClick={() => handleCategoryFilterChange(key, !filterCategory.includes(key))}
                  >
                    {label}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Calendar Grid */}
        <Card className="shadow-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-200 dark:border-slate-700 p-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-slate-200"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <CardTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {format(currentMonth, "MMMM yyyy", { locale: es })}
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-slate-200"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-7 text-center text-sm font-medium text-slate-600 dark:text-slate-400 mb-4">
              {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((day) => (
                <div key={day} className="py-2">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {daysInMonth.map((day, index) => {
                const dayEvents = filteredEvents.filter((event) =>
                  isSameDay(parseDateStringAsLocal(event.event_date), day),
                )
                const isCurrentMonth = isSameMonth(day, currentMonth)
                const isTodayDate = isToday(day)

                return (
                  <div
                    key={index}
                    className={`relative h-28 rounded-lg p-2 flex flex-col items-center justify-start text-center cursor-pointer transition-all duration-200
                      ${isCurrentMonth ? "bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600" : "bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500"}
                      ${isTodayDate ? "border-2 border-blue-500 ring-2 ring-blue-500" : "border border-slate-200 dark:border-slate-600"}
                    `}
                    onClick={() => handleOpenEventForm(undefined, day)}
                  >
                    <span
                      className={`text-sm font-semibold ${
                        isCurrentMonth ? "text-slate-900 dark:text-slate-100" : "text-slate-400 dark:text-slate-500"
                      } ${isTodayDate ? "text-blue-600 dark:text-blue-400" : ""}`}
                    >
                      {format(day, "d")}
                    </span>
                    <div className="mt-1 space-y-1 w-full overflow-hidden">
                      {dayEvents.map((event) => (
                        <Badge
                          key={event.id}
                          variant="outline"
                          className={`w-full text-xs font-normal truncate px-2 py-0.5 rounded-sm cursor-pointer ${
                            event.is_completed
                              ? importanceColors.completed
                              : importanceColors[event.importance] || importanceColors.medium
                          }`}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenEventDetails(event)
                          }}
                        >
                          {event.title}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {isEventFormOpen && (
        <EventFormDialog
          isOpen={isEventFormOpen}
          onClose={handleCloseEventForm}
          onSave={handleSaveEvent}
          onDelete={handleDeleteEvent}
          event={selectedEvent}
          importanceColors={importanceColors}
          importanceLabels={importanceLabels}
          eventCategoryColors={eventCategoryColors} // Pass new props
          eventCategoryLabels={eventCategoryLabels} // Pass new props
        />
      )}

      {isEventDetailsOpen && (
        <EventDetailsDialog
          isOpen={isEventDetailsOpen}
          onClose={handleCloseEventDetails}
          event={selectedEventForDetails}
          onEdit={handleOpenEventForm}
          importanceColors={importanceColors}
          importanceLabels={importanceLabels}
          eventCategoryColors={eventCategoryColors} // Pass new props
          eventCategoryLabels={eventCategoryLabels} // Pass new props
        />
      )}
    </div>
  )
}
