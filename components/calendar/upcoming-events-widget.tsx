"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, ChevronRight } from "lucide-react"
import { format, addDays, isToday, isTomorrow } from "date-fns"
import { es } from "date-fns/locale"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { useCompany } from "@/lib/company-context"
import type { Database } from "@/lib/database.types"

type CalendarEvent = Database["public"]["Tables"]["calendar_events"]["Row"]

const importanceColors: Record<string, string> = {
  low: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-600",
  medium:
    "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-600",
  high: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-600",
  critical: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-600",
}

const parseDateStringAsLocal = (dateString: string): Date => {
  const [year, month, day] = dateString.split("-").map(Number)
  return new Date(year, month - 1, day)
}

export function UpcomingEventsWidget() {
  const { user } = useAuth()
  const { selectedCompany } = useCompany()
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchUpcomingEvents()
    }
  }, [user, selectedCompany])

  const fetchUpcomingEvents = async () => {
    try {
      setLoading(true)
      const today = format(new Date(), "yyyy-MM-dd")
      const nextWeek = format(addDays(new Date(), 7), "yyyy-MM-dd")

      let query = supabase
        .from("calendar_events")
        .select("*")
        .eq("user_id", user?.id!)
        .gte("event_date", today)
        .lte("event_date", nextWeek)
        .eq("is_completed", false)
        .order("event_date", { ascending: true })
        .order("created_at", { ascending: true })
        .limit(5)

      if (user?.role === "admin" && selectedCompany) {
        query = query.eq("company_id", selectedCompany.id)
      } else if (user?.company_id) {
        query = query.eq("company_id", user.company_id)
      }

      const { data, error } = await query

      if (error) throw error
      setUpcomingEvents(data || [])
    } catch (error: any) {
      console.error("Error fetching upcoming events:", error.message)
    } finally {
      setLoading(false)
    }
  }

  const getDateLabel = (dateString: string) => {
    const date = parseDateStringAsLocal(dateString)
    if (isToday(date)) return "Hoy"
    if (isTomorrow(date)) return "Mañana"
    return format(date, "dd MMM", { locale: es })
  }

  if (loading) {
    return (
      <Card className="shadow-lg border-slate-200 dark:border-slate-700 bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-900/50">
        <CardHeader className="border-b border-slate-100 dark:border-slate-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600">
              <Calendar className="h-5 w-5 text-slate-600 dark:text-slate-300" />
            </div>
            <CardTitle className="text-lg font-semibold text-slate-800 dark:text-slate-200">Próximos Eventos</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600 dark:border-slate-400"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="shadow-lg border-slate-200 dark:border-slate-700 bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-900/50 hover:shadow-xl transition-all duration-300">
      <CardHeader className="border-b border-slate-100 dark:border-slate-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600">
              <Calendar className="h-5 w-5 text-slate-600 dark:text-slate-300" />
            </div>
            <CardTitle className="text-lg font-semibold text-slate-800 dark:text-slate-200">Próximos Eventos</CardTitle>
          </div>
          <Button asChild variant="ghost" size="sm" className="text-slate-600 dark:text-slate-400">
            <Link href="/calendar">
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {upcomingEvents.length === 0 ? (
          <div className="text-center py-8">
            <div className="flex flex-col items-center gap-3">
              <div className="p-3 rounded-full bg-slate-100 dark:bg-slate-800">
                <Calendar className="h-6 w-6 text-slate-400 dark:text-slate-500" />
              </div>
              <div>
                <p className="text-slate-600 dark:text-slate-300 font-medium text-sm">No hay eventos próximos</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Tus eventos de los próximos 7 días aparecerán aquí
                </p>
              </div>
              <Button asChild variant="outline" size="sm" className="mt-2 bg-transparent">
                <Link href="/calendar">Ver calendario</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50/50 to-white dark:from-slate-800/50 dark:to-slate-900/50 hover:shadow-md transition-all duration-200"
              >
                <div className="flex-shrink-0 flex flex-col items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    {getDateLabel(event.event_date)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm text-slate-800 dark:text-slate-200 truncate">{event.title}</h4>
                  {event.description && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">{event.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <Badge
                      variant="outline"
                      className={`text-xs px-2 py-0.5 ${importanceColors[event.importance] || importanceColors.medium}`}
                    >
                      {event.importance === "low"
                        ? "Baja"
                        : event.importance === "medium"
                          ? "Media"
                          : event.importance === "high"
                            ? "Alta"
                            : "Crítica"}
                    </Badge>
                    <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(parseDateStringAsLocal(event.event_date), "dd MMM", { locale: es })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {upcomingEvents.length > 0 && (
              <Button asChild variant="outline" size="sm" className="w-full mt-2 bg-transparent">
                <Link href="/calendar">Ver todos los eventos</Link>
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
