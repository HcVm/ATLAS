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
  getDay,
} from "date-fns"
import { es } from "date-fns/locale"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Filter, Check } from "lucide-react"
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
import { motion, AnimatePresence } from "framer-motion"

type CalendarEvent = Database["public"]["Tables"]["calendar_events"]["Row"]

const importanceColors: Record<string, string> = {
  low: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
  medium: "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800",
  high: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800",
  critical: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
  completed: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800",
}

const importanceLabels: Record<string, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  critical: "Crítica",
  completed: "Completada",
}

const eventCategoryColors: Record<string, string> = {
  personal: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800",
  work: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
  meeting: "bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800",
  reminder: "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800",
  other: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
  cobranza: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800",
}

const eventCategoryLabels: Record<string, string> = {
  personal: "Personal",
  work: "Trabajo",
  meeting: "Reunión",
  reminder: "Recordatorio",
  other: "Otro",
  cobranza: "Cobranza",
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
  const [filterImportance, setFilterImportance] = useState<string[]>(Object.keys(importanceLabels))
  const [filterCategory, setFilterCategory] = useState<string[]>(Object.keys(eventCategoryLabels))
  const [direction, setDirection] = useState(0)

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

  const changeMonth = (val: number) => {
    setDirection(val)
    setCurrentMonth(val > 0 ? addMonths(currentMonth, 1) : subMonths(currentMonth, 1))
  }

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const eventImportance = event.is_completed ? "completed" : event.importance
      const eventCategory = event.category || "personal" // Default to 'personal' if null

      return filterImportance.includes(eventImportance) && filterCategory.includes(eventCategory)
    })
  }, [events, filterImportance, filterCategory])

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 50 : -50,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction > 0 ? -50 : 50,
      opacity: 0,
    }),
  }

  if (loading) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
          <p className="text-slate-600 dark:text-slate-300 font-medium">Cargando calendario...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-8">
      {/* Header Section */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm p-8 rounded-3xl border border-slate-200/50 dark:border-slate-700/50 shadow-xl"
      >
        <div className="flex-1">
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-slate-800 via-slate-600 to-slate-500 dark:from-white dark:via-slate-200 dark:to-slate-400 bg-clip-text text-transparent">
            Calendario de Actividades
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2 flex items-center gap-2 text-lg">
            <CalendarIcon className="h-5 w-5 text-indigo-500" />
            Organiza tus tareas y eventos importantes
          </p>
        </div>
        
        <div className="flex gap-3">
          <Button
            className="h-12 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all hover:-translate-y-1"
            onClick={() => handleOpenEventForm()}
          >
            <Plus className="h-5 w-5 mr-2" />
            <span>Nuevo Evento</span>
          </Button>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="h-12 w-12 rounded-xl border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Filter className="h-5 w-5 text-slate-600 dark:text-slate-300" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-slate-200 dark:border-slate-700 shadow-2xl rounded-xl p-4">
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                    <Check className="h-4 w-4 text-indigo-500" /> Importancia
                  </h4>
                  <div className="space-y-2">
                    {Object.keys(importanceLabels).map((key) => (
                      <div key={key} className="flex items-center space-x-2">
                        <Checkbox
                          id={`popover-filter-importance-${key}`}
                          checked={filterImportance.includes(key)}
                          onCheckedChange={(checked) => handleImportanceFilterChange(key, checked as boolean)}
                          className="data-[state=checked]:bg-indigo-600 border-slate-300 dark:border-slate-600"
                        />
                        <Label htmlFor={`popover-filter-importance-${key}`} className="text-sm font-normal cursor-pointer">
                          {importanceLabels[key]}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                  <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                    <Filter className="h-4 w-4 text-indigo-500" /> Categoría
                  </h4>
                  <div className="space-y-2">
                    {Object.keys(eventCategoryLabels).map((key) => (
                      <div key={key} className="flex items-center space-x-2">
                        <Checkbox
                          id={`popover-filter-category-${key}`}
                          checked={filterCategory.includes(key)}
                          onCheckedChange={(checked) => handleCategoryFilterChange(key, checked as boolean)}
                          className="data-[state=checked]:bg-indigo-600 border-slate-300 dark:border-slate-600"
                        />
                        <Label htmlFor={`popover-filter-category-${key}`} className="text-sm font-normal cursor-pointer">
                          {eventCategoryLabels[key]}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-8">
        {/* Sidebar Filters */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-none shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-6">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 border-b border-slate-100 dark:border-slate-800 p-6">
              <CardTitle className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                  <Filter className="h-5 w-5" />
                </div>
                Filtros
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-8">
              <div>
                <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">Importancia</h3>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(importanceLabels).map(([key, label]) => (
                    <Badge
                      key={key}
                      variant="outline"
                      className={`
                        px-3 py-1.5 rounded-lg cursor-pointer transition-all duration-200 text-xs font-medium border
                        ${importanceColors[key]}
                        ${filterImportance.includes(key)
                          ? "shadow-md scale-105 ring-1 ring-offset-1 ring-offset-white dark:ring-offset-slate-900 ring-indigo-500/50"
                          : "opacity-60 grayscale hover:grayscale-0 hover:opacity-100"
                        }
                      `}
                      onClick={() => handleImportanceFilterChange(key, !filterImportance.includes(key))}
                    >
                      {label}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">Categoría</h3>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(eventCategoryLabels).map(([key, label]) => (
                    <Badge
                      key={key}
                      variant="outline"
                      className={`
                        px-3 py-1.5 rounded-lg cursor-pointer transition-all duration-200 text-xs font-medium border
                        ${eventCategoryColors[key]}
                        ${filterCategory.includes(key)
                          ? "shadow-md scale-105 ring-1 ring-offset-1 ring-offset-white dark:ring-offset-slate-900 ring-indigo-500/50"
                          : "opacity-60 grayscale hover:grayscale-0 hover:opacity-100"
                        }
                      `}
                      onClick={() => handleCategoryFilterChange(key, !filterCategory.includes(key))}
                    >
                      {label}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Main Calendar Grid */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-none shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md overflow-hidden rounded-3xl">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800 p-6 bg-white/50 dark:bg-slate-900/50">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => changeMonth(-1)}
                className="h-10 w-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <ChevronLeft className="h-6 w-6 text-slate-600 dark:text-slate-400" />
              </Button>
              
              <motion.div
                key={currentMonth.toISOString()}
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="text-center"
              >
                <CardTitle className="text-2xl font-bold text-slate-800 dark:text-slate-100 capitalize">
                  {format(currentMonth, "MMMM", { locale: es })}
                </CardTitle>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  {format(currentMonth, "yyyy", { locale: es })}
                </p>
              </motion.div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => changeMonth(1)}
                className="h-10 w-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <ChevronRight className="h-6 w-6 text-slate-600 dark:text-slate-400" />
              </Button>
            </CardHeader>
            
            <CardContent className="p-6">
              <div className="grid grid-cols-7 mb-4">
                {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((day) => (
                  <div key={day} className="text-center py-2 text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    {day}
                  </div>
                ))}
              </div>
              
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={currentMonth.toISOString()}
                  custom={direction}
                  variants={variants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ type: "tween", ease: "easeInOut", duration: 0.3 }}
                  className="grid grid-cols-7 gap-3"
                >
                  {daysInMonth.map((day, index) => {
                    const dayEvents = filteredEvents.filter((event) =>
                      isSameDay(parseDateStringAsLocal(event.event_date), day),
                    )
                    const isCurrentMonth = isSameMonth(day, currentMonth)
                    const isTodayDate = isToday(day)

                    return (
                      <motion.div
                        key={index}
                        whileHover={{ scale: 1.02, zIndex: 10 }}
                        className={`
                          relative min-h-[120px] rounded-2xl p-3 flex flex-col items-start justify-start cursor-pointer transition-colors duration-200 border
                          ${isCurrentMonth 
                            ? "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-800" 
                            : "bg-slate-50/50 dark:bg-slate-900/30 border-transparent text-slate-300 dark:text-slate-600"
                          }
                          ${isTodayDate ? "ring-2 ring-indigo-500 border-transparent bg-indigo-50/30 dark:bg-indigo-900/10" : ""}
                        `}
                        onClick={() => handleOpenEventForm(undefined, day)}
                      >
                        <span
                          className={`
                            text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full mb-2
                            ${isTodayDate 
                              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30" 
                              : isCurrentMonth ? "text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700" : "text-slate-400 dark:text-slate-600"
                            }
                          `}
                        >
                          {format(day, "d")}
                        </span>
                        
                        <div className="w-full space-y-1.5 overflow-hidden">
                          {dayEvents.slice(0, 3).map((event) => (
                            <div
                              key={event.id}
                              className={`
                                w-full text-[10px] font-medium truncate px-2 py-1 rounded-md cursor-pointer flex items-center gap-1.5 border-l-2 transition-all hover:brightness-95
                                ${event.is_completed
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-500 dark:bg-emerald-900/20 dark:text-emerald-400"
                                  : importanceColors[event.importance] || importanceColors.medium
                                }
                              `}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleOpenEventDetails(event)
                              }}
                            >
                              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${event.is_completed ? "bg-emerald-500" : "bg-current opacity-50"}`} />
                              <span className="truncate">{event.title}</span>
                            </div>
                          ))}
                          {dayEvents.length > 3 && (
                            <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium pl-1">
                              + {dayEvents.length - 3} más
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )
                  })}
                </motion.div>
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>
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
          eventCategoryColors={eventCategoryColors}
          eventCategoryLabels={eventCategoryLabels}
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
          eventCategoryColors={eventCategoryColors}
          eventCategoryLabels={eventCategoryLabels}
        />
      )}
    </div>
  )
}
