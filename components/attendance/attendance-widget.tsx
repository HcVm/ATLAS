"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Clock, MapPin, CheckCircle, XCircle, AlertCircle, Coffee, Sparkles } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { useAuth } from "@/lib/auth-context"
import { useCompany } from "@/lib/company-context"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { createNotification } from "@/lib/notifications"

interface TodayAttendance {
  id: string
  check_in_time: string | null
  check_out_time: string | null
  lunch_start_time: string | null // Added lunch break fields
  lunch_end_time: string | null
  is_late: boolean
  late_minutes: number
  worked_hours: number
  check_in_location?: string
  check_out_location?: string
}

export function AttendanceWidget() {
  const { user } = useAuth()
  const { selectedCompany } = useCompany()
  const [todayAttendance, setTodayAttendance] = useState<TodayAttendance | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())

  // Actualizar la hora cada segundo
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (user) {
      fetchTodayAttendance()
    }
  }, [user, selectedCompany])

  useEffect(() => {
    if (user && selectedCompany) {
      checkPendingAttendanceNotifications()
    }
  }, [user, selectedCompany])

  const WORK_START_TIME = { hours: 8, minutes: 0 } // 8:00 AM
  const EARLY_CHECKIN_MINUTES = 70 // 70 minutes before work start
  const LATE_THRESHOLD_MINUTES = 30 // 30 minutes after work start
  const LUNCH_WINDOW_1_START = { hours: 12, minutes: 55 } // 5 min before 1:00 PM
  const LUNCH_WINDOW_1_END = { hours: 13, minutes: 5 } // 5 min after 1:00 PM
  const LUNCH_WINDOW_2_START = { hours: 13, minutes: 55 } // 5 min before 2:00 PM
  const LUNCH_WINDOW_2_END = { hours: 14, minutes: 5 } // 5 min after 2:00 PM
  const CHECKOUT_START = { hours: 17, minutes: 20 } // 10 min before 5:20 PM
  const CHECKOUT_END = { hours: 23, minutes: 59 } // 11:59 PM

  const checkPendingAttendanceNotifications = async () => {
    try {
      const today = new Date()
      const todayFormatted = format(today, "yyyy-MM-dd")
      const currentHour = today.getHours()

      // Only check after 5:30 PM for absence notifications
      if (currentHour >= 17) {
        const { data: attendance } = await supabase
          .from("attendance")
          .select("id")
          .eq("user_id", user?.id)
          .eq("attendance_date", todayFormatted)
          .limit(1)

        // If no attendance record and after 5:30 PM, check if notification was sent
        if (!attendance || attendance.length === 0) {
          const { data: existingNotification } = await supabase
            .from("notifications")
            .select("id")
            .eq("user_id", user?.id)
            .eq("type", "attendance_absence")
            .eq("metadata->absence_date", todayFormatted)
            .limit(1)

          // Send notification if not already sent
          if (!existingNotification || existingNotification.length === 0) {
            await createNotification({
              userId: user?.id!,
              title: "Justificación de Ausencia Requerida",
              message: "No se registró asistencia hoy. Tienes 24 horas para justificar tu ausencia desde las 5:30 PM.",
              type: "attendance_absence",
              companyId: selectedCompany?.id!,
              actionUrl: "/requests/new/justificacion-ausencia",
            })
          }
        }
      }
    } catch (error) {
      console.error("Error checking pending attendance notifications:", error)
    }
  }

  const getTimeStatus = () => {
    const now = new Date()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    const currentTotalMinutes = currentHour * 60 + currentMinute

    // Work start time in minutes (8:00 AM = 480 minutes)
    const workStartMinutes = WORK_START_TIME.hours * 60 + WORK_START_TIME.minutes

    // Early check-in allowed from 6:50 AM (400 minutes)
    const earlyCheckinMinutes = workStartMinutes - EARLY_CHECKIN_MINUTES

    // Late threshold at 8:30 AM (510 minutes)
    const lateThresholdMinutes = workStartMinutes + LATE_THRESHOLD_MINUTES

    if (currentTotalMinutes < earlyCheckinMinutes) {
      return "too_early" // Before 6:50 AM
    } else if (currentTotalMinutes <= lateThresholdMinutes) {
      return "normal" // Between 7:50 AM and 8:30 AM
    } else {
      return "late" // After 8:30 AM
    }
  }

  const getLunchTimeStatus = () => {
    const now = new Date()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    const currentTotalMinutes = currentHour * 60 + currentMinute

    const lunchStartMinutes = LUNCH_WINDOW_1_START.hours * 60 + LUNCH_WINDOW_1_START.minutes // 12:55 PM
    const lunchEndMinutes = LUNCH_WINDOW_1_END.hours * 60 + LUNCH_WINDOW_1_END.minutes // 1:05 PM

    if (currentTotalMinutes >= lunchStartMinutes && currentTotalMinutes <= lunchEndMinutes) {
      return "lunch_available"
    }
    return "lunch_not_available"
  }

  const getLocation = (): Promise<string> => {
    return new Promise((resolve) => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords
            resolve(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`)
          },
          () => {
            resolve("Ubicación no disponible")
          },
        )
      } else {
        resolve("Geolocalización no soportada")
      }
    })
  }

  const handleCheckIn = async () => {
    try {
      setActionLoading(true)

      const location = await getLocation()
      const now = new Date()

      const { data, error } = await supabase
        .from("attendance")
        .insert({
          user_id: user?.id,
          company_id: selectedCompany?.id, // Added company_id to fix null constraint error
          department_id: user?.department_id,
          attendance_date: getLocalDateString(now),
          check_in_time: getLocalTimeString(now),
          check_in_location: location,
        })
        .select()
        .single()

      if (error) {
        console.error("Error checking in:", error)
        toast.error("Error al marcar entrada: " + error.message)
        return
      }

      setTodayAttendance(data)
      toast.success("Entrada marcada correctamente")
    } catch (error) {
      console.error("Error checking in:", error)
      toast.error("Error al marcar entrada")
    } finally {
      setActionLoading(false)
    }
  }

  const handleLateCheckIn = async () => {
    try {
      setActionLoading(true)

      const location = await getLocation()
      const now = new Date()

      console.log("[v0] Attempting late check-in with is_late: true")

      const { data, error } = await supabase
        .from("attendance")
        .insert({
          user_id: user?.id,
          company_id: selectedCompany?.id, // Added company_id to fix null constraint error
          department_id: user?.department_id,
          attendance_date: getLocalDateString(now),
          check_in_time: getLocalTimeString(now),
          check_in_location: location,
          is_late: true, // Explicitly mark as late
        })
        .select()
        .single()

      if (error) {
        console.error("Error checking in late:", error)
        toast.error("Error al marcar entrada con tardanza: " + error.message)
        return
      }

      console.log("[v0] Late check-in successful, data:", data)
      setTodayAttendance(data)
      toast.success("Entrada con tardanza marcada correctamente")

      try {
        await createNotification({
          userId: user?.id!,
          title: "Justificación de Tardanza Requerida",
          message: "Has marcado entrada con tardanza. Tienes 24 horas desde ahora para justificar tu tardanza.",
          type: "attendance_tardiness",
          companyId: selectedCompany?.id!,
          actionUrl: "/requests/new/justificacion-tardanza",
          metadata: {
            tardiness_date: getLocalDateString(now),
            deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            check_in_time: getLocalTimeString(now),
          },
        })
        console.log("[v0] Tardiness notification sent successfully")
      } catch (notificationError) {
        console.error("Error sending tardiness notification:", notificationError)
      }
    } catch (error) {
      console.error("Error checking in late:", error)
      toast.error("Error al marcar entrada con tardanza")
    } finally {
      setActionLoading(false)
    }
  }

  const handleCheckOut = async () => {
    try {
      setActionLoading(true)

      if (!todayAttendance) {
        toast.error("No hay registro de entrada para hoy")
        return
      }

      const location = await getLocation()
      const now = new Date()
      const checkOutTime = getLocalTimeString(now)

      console.log("[v0] Attempting checkout with data:", {
        id: todayAttendance.id,
        check_out_time: checkOutTime,
        check_out_location: location,
      })

      const { data, error, count } = await supabase
        .from("attendance")
        .update({
          check_out_time: checkOutTime,
          check_out_location: location,
        })
        .eq("id", todayAttendance.id)
        .select()

      if (error) {
        console.error("[v0] Supabase error details:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        })
        toast.error("Error al marcar salida: " + error.message)
        return
      }

      if (!data || data.length === 0) {
        console.error("[v0] No rows were updated")
        toast.error("No se pudo actualizar el registro de asistencia")
        return
      }

      console.log("[v0] Checkout successful:", data[0])
      setTodayAttendance(data[0])
      toast.success("Salida marcada correctamente")
    } catch (error) {
      console.error("[v0] Error checking out:", error)
      toast.error("Error al marcar salida")
    } finally {
      setActionLoading(false)
    }
  }

  const handleLunchStart = async () => {
    try {
      setActionLoading(true)

      if (!todayAttendance) {
        toast.error("Debe marcar entrada antes del almuerzo")
        return
      }

      const location = await getLocation()
      const now = new Date()

      const { data, error } = await supabase
        .from("attendance")
        .update({
          lunch_start_time: getLocalTimeString(now),
        })
        .eq("id", todayAttendance.id)
        .select()

      if (error) {
        console.error("Error starting lunch:", error)
        toast.error("Error al marcar inicio de almuerzo: " + error.message)
        return
      }

      if (!data || data.length === 0) {
        toast.error("No se pudo actualizar el registro")
        return
      }

      setTodayAttendance(data[0])
      toast.success("Inicio de almuerzo marcado correctamente")
    } catch (error) {
      console.error("Error starting lunch:", error)
      toast.error("Error al marcar inicio de almuerzo")
    } finally {
      setActionLoading(false)
    }
  }

  const handleLunchEnd = async () => {
    try {
      setActionLoading(true)

      if (!todayAttendance) {
        toast.error("No hay registro de almuerzo")
        return
      }

      const location = await getLocation()
      const now = new Date()

      const { data, error } = await supabase
        .from("attendance")
        .update({
          lunch_end_time: getLocalTimeString(now),
        })
        .eq("id", todayAttendance.id)
        .select()

      if (error) {
        console.error("Error ending lunch:", error)
        toast.error("Error al marcar fin de almuerzo: " + error.message)
        return
      }

      if (!data || data.length === 0) {
        toast.error("No se pudo actualizar el registro")
        return
      }

      setTodayAttendance(data[0])
      toast.success("Regreso de almuerzo marcado correctamente")
    } catch (error) {
      console.error("Error ending lunch:", error)
      toast.error("Error al marcar fin de almuerzo")
    } finally {
      setActionLoading(false)
    }
  }

  const fetchTodayAttendance = async () => {
    try {
      setLoading(true)

      const today = getLocalDateString(new Date())

      const { data, error } = await supabase
        .from("attendance")
        .select("*")
        .eq("user_id", user?.id)
        .eq("attendance_date", today)

      if (error) {
        console.error("Error fetching attendance:", error)
        return
      }

      setTodayAttendance(data && data.length > 0 ? data[0] : null)
    } catch (error) {
      console.error("Error fetching today's attendance:", error)
    } finally {
      setLoading(false)
    }
  }

  const getLocalTimeString = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    const hours = String(date.getHours()).padStart(2, "0")
    const minutes = String(date.getMinutes()).padStart(2, "0")
    const seconds = String(date.getSeconds()).padStart(2, "0")

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  }

  const getLocalDateString = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")

    return `${year}-${month}-${day}`
  }

  const formatTime = (timeString: string | null) => {
    if (!timeString) return "--:--"
    return format(new Date(timeString), "HH:mm", { locale: es })
  }

  const getStatusBadge = () => {
    if (!todayAttendance) {
      return (
        <Badge variant="outline" className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
          Sin marcar
        </Badge>
      )
    }

    if (!todayAttendance.check_in_time) {
      return (
        <Badge variant="outline" className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
          Sin entrada
        </Badge>
      )
    }

    if (todayAttendance.lunch_start_time && !todayAttendance.lunch_end_time) {
      return (
        <Badge
          variant="outline"
          className="bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800"
        >
          En almuerzo
        </Badge>
      )
    }

    if (todayAttendance.is_late && !todayAttendance.check_out_time) {
      return (
        <Badge
          variant="outline"
          className="bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
        >
          En trabajo (Tardanza)
        </Badge>
      )
    }

    if (!todayAttendance.check_out_time) {
      return (
        <Badge
          variant="outline"
          className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
        >
          En trabajo
        </Badge>
      )
    }

    if (todayAttendance.is_late) {
      return (
        <Badge
          variant="outline"
          className="bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
        >
          Completado (Tardanza)
        </Badge>
      )
    }

    return (
      <Badge
        variant="outline"
        className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800"
      >
        Completado
      </Badge>
    )
  }

  const getTimeRestrictionMessage = () => {
    const timeStatus = getTimeStatus()

    switch (timeStatus) {
      case "too_early":
        return "El marcado de asistencia estará disponible a partir de las 6:50 AM"
      case "too_late":
        return todayAttendance?.check_in_time
          ? "Horario de marcado finalizado"
          : "Horario normal finalizado. Use el botón de tardanza si aún no ha marcado."
      default:
        return null
    }
  }

  const isInLunchWindow = () => {
    const now = new Date()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    const currentTotalMinutes = currentHour * 60 + currentMinute

    const window1Start = LUNCH_WINDOW_1_START.hours * 60 + LUNCH_WINDOW_1_START.minutes
    const window1End = LUNCH_WINDOW_1_END.hours * 60 + LUNCH_WINDOW_1_END.minutes
    const window2Start = LUNCH_WINDOW_2_START.hours * 60 + LUNCH_WINDOW_2_START.minutes
    const window2End = LUNCH_WINDOW_2_END.hours * 60 + LUNCH_WINDOW_2_END.minutes

    return (
      (currentTotalMinutes >= window1Start && currentTotalMinutes <= window1End) ||
      (currentTotalMinutes >= window2Start && currentTotalMinutes <= window2End)
    )
  }

  const isInCheckoutWindow = () => {
    const now = new Date()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    const currentTotalMinutes = currentHour * 60 + currentMinute

    const checkoutStart = CHECKOUT_START.hours * 60 + CHECKOUT_START.minutes
    const checkoutEnd = CHECKOUT_END.hours * 60 + CHECKOUT_END.minutes

    return currentTotalMinutes >= checkoutStart && currentTotalMinutes <= checkoutEnd
  }

  const getActiveButtonType = () => {
    if (!todayAttendance?.check_in_time) {
      // No check-in yet, show entry button if in time window
      const timeStatus = getTimeStatus()
      if (timeStatus === "too_early") return "none"
      return "entry"
    }

    if (todayAttendance.check_out_time) {
      // Already checked out, no buttons
      return "none"
    }

    // Has checked in but not checked out
    // Priority: lunch buttons > checkout button

    // If lunch hasn't started yet
    if (!todayAttendance.lunch_start_time) {
      if (isInLunchWindow()) {
        return "lunch_start"
      }
    }

    // If lunch started but not ended
    if (todayAttendance.lunch_start_time && !todayAttendance.lunch_end_time) {
      if (isInLunchWindow()) {
        return "lunch_end"
      }
    }

    // Check if in checkout window
    if (isInCheckoutWindow()) {
      return "checkout"
    }

    return "none"
  }

  const renderLunchButtons = () => {
    const activeButton = getActiveButtonType()

    if (activeButton === "lunch_start") {
      return (
        <div className="space-y-2">
          <Button
            onClick={handleLunchStart}
            disabled={actionLoading}
            className="flex-1 w-full bg-orange-600 hover:bg-orange-700 text-white"
          >
            <Coffee className="h-4 w-4 mr-2" />
            {actionLoading ? "Marcando..." : "Iniciar Almuerzo"}
          </Button>
          <p className="text-xs text-orange-600 dark:text-orange-400 text-center">
            Disponible de 12:55-13:05 y 13:55-14:05
          </p>
        </div>
      )
    }

    if (activeButton === "lunch_end") {
      return (
        <div className="space-y-2">
          <Button
            onClick={handleLunchEnd}
            disabled={actionLoading}
            className="flex-1 w-full bg-green-600 hover:bg-green-700 text-white"
          >
            <Coffee className="h-4 w-4 mr-2" />
            {actionLoading ? "Marcando..." : "Regresar de Almuerzo"}
          </Button>
          <p className="text-xs text-green-600 dark:text-green-400 text-center">
            Disponible de 12:55-13:05 y 13:55-14:05
          </p>
        </div>
      )
    }

    return null
  }

  const renderCheckInButtons = () => {
    const activeButton = getActiveButtonType()
    const timeStatus = getTimeStatus()

    // Entry buttons (when no check-in yet)
    if (activeButton === "entry") {
      if (timeStatus === "normal") {
        return (
          <Button
            onClick={handleCheckIn}
            disabled={actionLoading}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            {actionLoading ? "Marcando..." : "Marcar Entrada"}
          </Button>
        )
      }

      if (timeStatus === "late") {
        return (
          <div className="space-y-2">
            <Button
              onClick={handleLateCheckIn}
              disabled={actionLoading}
              className="flex-1 w-full bg-orange-600 hover:bg-orange-700 text-white"
            >
              <AlertCircle className="h-4 w-4 mr-2" />
              {actionLoading ? "Marcando..." : "Marcar con Tardanza"}
            </Button>
            <p className="text-xs text-orange-600 dark:text-orange-400 text-center">
              Fuera del horario normal de entrada
            </p>
          </div>
        )
      }
    }

    // Lunch buttons
    if (activeButton === "lunch_start" || activeButton === "lunch_end") {
      return renderLunchButtons()
    }

    // Checkout button
    if (activeButton === "checkout") {
      return (
        <div className="space-y-2">
          <Button
            onClick={handleCheckOut}
            disabled={actionLoading}
            className="flex-1 w-full bg-red-600 hover:bg-red-700 text-white"
          >
            <XCircle className="h-4 w-4 mr-2" />
            {actionLoading ? "Marcando..." : "Marcar Salida"}
          </Button>
          <p className="text-xs text-red-600 dark:text-red-400 text-center">Disponible de 17:20 a 23:59</p>
        </div>
      )
    }

    // No active button - show appropriate message
    if (activeButton === "none") {
      if (!todayAttendance?.check_in_time) {
        if (timeStatus === "too_early") {
          return (
            <div className="space-y-2">
              <Button disabled className="flex-1 w-full bg-slate-400 text-white cursor-not-allowed">
                <Clock className="h-4 w-4 mr-2" />
                Marcar Entrada (Bloqueado)
              </Button>
              <p className="text-xs text-amber-600 dark:text-amber-400 text-center">
                Disponible a partir de las 6:50 AM
              </p>
            </div>
          )
        }
      } else if (todayAttendance.check_out_time) {
        return (
          <div className="flex-1 text-center py-2 text-sm text-slate-600 dark:text-slate-400">
            Asistencia completa para hoy
          </div>
        )
      } else {
        // Checked in but no button available at this time
        return (
          <div className="flex-1 text-center py-2 text-sm text-slate-600 dark:text-slate-400">
            <p>Esperando siguiente ventana de marcado</p>
            <p className="text-xs mt-1">
              {!todayAttendance.lunch_start_time && "Almuerzo: 12:55-13:05 o 13:55-14:05"}
              {todayAttendance.lunch_start_time &&
                !todayAttendance.lunch_end_time &&
                "Regreso: 12:55-13:05 o 13:55-14:05"}
              {todayAttendance.lunch_end_time && "Salida: 17:35-23:59"}
            </p>
          </div>
        )
      }
    }

    return null
  }

  if (loading) {
    return (
      <Card className="shadow-lg border-slate-200 dark:border-slate-700">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
            <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
            <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="shadow-2xl border border-slate-200/50 dark:border-slate-700/50 overflow-hidden relative group hover:shadow-slate-500/20 transition-all duration-500 bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-200/30 via-slate-100/20 to-slate-300/30 dark:from-slate-700/30 dark:via-slate-800/20 dark:to-slate-600/30" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(148,163,184,0.15),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(100,116,139,0.15),transparent_50%)]" />

      <CardHeader className="pb-4 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-slate-600 to-slate-700 dark:from-slate-500 dark:to-slate-600 shadow-lg shadow-slate-500/30 backdrop-blur-sm">
              <Clock className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 dark:from-slate-200 dark:to-slate-400 bg-clip-text text-transparent">
                Control de Asistencia
              </CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400 text-sm mt-0.5">
                {format(currentTime, "EEEE, dd 'de' MMMM", { locale: es })}
              </CardDescription>
            </div>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>

      <CardContent className="space-y-6 relative z-10">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-slate-300/30 via-slate-200/30 to-slate-300/30 dark:from-slate-600/30 dark:via-slate-700/30 dark:to-slate-600/30 blur-2xl" />
          <div className="relative text-center p-6 rounded-2xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-300/50 dark:border-slate-600/50 shadow-2xl">
            <div className="text-5xl font-bold bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900 dark:from-slate-100 dark:via-slate-200 dark:to-slate-300 bg-clip-text text-transparent font-mono tracking-tight">
              {format(currentTime, "HH:mm:ss")}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400 mt-2 font-medium flex items-center justify-center gap-2">
              <Sparkles className="h-4 w-4 text-cyan-500" />
              Hora actual - Perú
            </div>
          </div>
        </div>

        {todayAttendance && (
          <div className="grid grid-cols-2 gap-3">
            <div className="group/card relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-50/80 to-green-50/80 dark:from-emerald-950/40 dark:to-green-950/40 backdrop-blur-sm p-4 border border-emerald-200/50 dark:border-emerald-800/50 hover:shadow-lg hover:shadow-emerald-500/20 transition-all duration-300">
              <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/10 rounded-full blur-2xl group-hover/card:bg-emerald-500/20 transition-all" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-lg bg-emerald-500/20 backdrop-blur-sm">
                    <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <span className="font-semibold text-emerald-900 dark:text-emerald-100 text-sm">Entrada</span>
                </div>
                <div className="font-mono text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                  {formatTime(todayAttendance.check_in_time)}
                </div>
                {todayAttendance.is_late && (
                  <div className="flex items-center gap-1 mt-2 px-2 py-1 rounded-lg bg-amber-500/20 backdrop-blur-sm">
                    <AlertCircle className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                    <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                      {todayAttendance.late_minutes} min tarde
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="group/card relative overflow-hidden rounded-xl bg-gradient-to-br from-rose-50/80 to-red-50/80 dark:from-rose-950/40 dark:to-red-950/40 backdrop-blur-sm p-4 border border-rose-200/50 dark:border-rose-800/50 hover:shadow-lg hover:shadow-rose-500/20 transition-all duration-300">
              <div className="absolute top-0 right-0 w-20 h-20 bg-rose-500/10 rounded-full blur-2xl group-hover/card:bg-rose-500/20 transition-all" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-lg bg-rose-500/20 backdrop-blur-sm">
                    <XCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                  </div>
                  <span className="font-semibold text-rose-900 dark:text-rose-100 text-sm">Salida</span>
                </div>
                <div className="font-mono text-2xl font-bold text-rose-700 dark:text-rose-300">
                  {formatTime(todayAttendance.check_out_time)}
                </div>
                {todayAttendance.worked_hours > 0 && (
                  <div className="text-xs font-medium text-rose-600 dark:text-rose-400 mt-2 px-2 py-1 rounded-lg bg-rose-500/20 backdrop-blur-sm">
                    {todayAttendance.worked_hours.toFixed(1)}h trabajadas
                  </div>
                )}
              </div>
            </div>

            {(todayAttendance.lunch_start_time || todayAttendance.lunch_end_time) && (
              <>
                <div className="group/card relative overflow-hidden rounded-xl bg-gradient-to-br from-orange-50/80 to-amber-50/80 dark:from-orange-950/40 dark:to-amber-950/40 backdrop-blur-sm p-4 border border-orange-200/50 dark:border-orange-800/50 hover:shadow-lg hover:shadow-orange-500/20 transition-all duration-300">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/10 rounded-full blur-2xl group-hover/card:bg-orange-500/20 transition-all" />
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 rounded-lg bg-orange-500/20 backdrop-blur-sm">
                        <Coffee className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                      </div>
                      <span className="font-semibold text-orange-900 dark:text-orange-100 text-sm">Almuerzo</span>
                    </div>
                    <div className="font-mono text-2xl font-bold text-orange-700 dark:text-orange-300">
                      {formatTime(todayAttendance.lunch_start_time)}
                    </div>
                  </div>
                </div>

                <div className="group/card relative overflow-hidden rounded-xl bg-gradient-to-br from-cyan-50/80 to-blue-50/80 dark:from-cyan-950/40 dark:to-blue-950/40 backdrop-blur-sm p-4 border border-cyan-200/50 dark:border-cyan-800/50 hover:shadow-lg hover:shadow-cyan-500/20 transition-all duration-300">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-cyan-500/10 rounded-full blur-2xl group-hover/card:bg-cyan-500/20 transition-all" />
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 rounded-lg bg-cyan-500/20 backdrop-blur-sm">
                        <Coffee className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                      </div>
                      <span className="font-semibold text-cyan-900 dark:text-cyan-100 text-sm">Regreso</span>
                    </div>
                    <div className="font-mono text-2xl font-bold text-cyan-700 dark:text-cyan-300">
                      {formatTime(todayAttendance.lunch_end_time)}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        <div className="flex gap-3">{renderCheckInButtons()}</div>

        {todayAttendance?.check_in_location && (
          <div className="flex items-center justify-center gap-2 text-xs text-slate-600 dark:text-slate-400 p-3 rounded-xl bg-slate-100/60 dark:bg-slate-800/60 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50">
            <MapPin className="h-3.5 w-3.5 text-cyan-500" />
            <span className="font-medium">Ubicación registrada correctamente</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
