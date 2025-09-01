import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { createNotification } from "@/lib/notifications"
import { format, addHours } from "date-fns"

export async function GET(request: NextRequest) {
  try {
    const today = format(new Date(), "yyyy-MM-dd")
    const currentTime = new Date()
    const currentHour = currentTime.getHours()
    const currentMinute = currentTime.getMinutes()

    console.log(`[Attendance Notifications] Checking at ${format(currentTime, "HH:mm")} for date ${today}`)

    // 1. Check for late arrivals (run every hour during work hours)
    if (currentHour >= 8 && currentHour <= 18) {
      await checkLateArrivals(today)
    }

    // 2. Check for missing attendance at 5:30 PM (17:30)
    if (currentHour === 17 && currentMinute >= 30 && currentMinute <= 35) {
      await checkMissingAttendance(today)
    }

    // 3. Check for incomplete attendance (missing check-out) at 6:00 PM (18:00)
    if (currentHour === 18 && currentMinute <= 5) {
      await checkIncompleteAttendance(today)
    }

    return NextResponse.json({
      message: "Attendance notifications checked successfully",
      timestamp: format(currentTime, "yyyy-MM-dd HH:mm:ss"),
    })
  } catch (error: any) {
    console.error("Error in attendance notifications check:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

async function checkLateArrivals(today: string) {
  try {
    // Get all late arrivals for today that haven't been notified yet
    const { data: lateArrivals, error } = await supabase
      .from("attendance")
      .select(`
        id,
        user_id,
        company_id,
        check_in_time,
        late_minutes,
        late_notification_sent,
        profiles!attendance_user_id_fkey(
          full_name,
          email
        )
      `)
      .eq("attendance_date", today)
      .eq("is_late", true)
      .eq("late_notification_sent", false)

    if (error) {
      console.error("Error fetching late arrivals:", error)
      return
    }

    if (!lateArrivals || lateArrivals.length === 0) {
      console.log("No new late arrivals found")
      return
    }

    console.log(`Found ${lateArrivals.length} late arrivals to notify`)

    for (const attendance of lateArrivals) {
      const checkInTime = new Date(attendance.check_in_time)
      const deadlineTime = addHours(checkInTime, 24)

      await createNotification({
        userId: attendance.user_id,
        title: "Justificación de Tardanza Requerida",
        message: `Has llegado ${attendance.late_minutes} minutos tarde hoy. Debes presentar una justificación de tardanza antes del ${format(deadlineTime, "dd/MM/yyyy 'a las' HH:mm")} (24 horas desde tu llegada).`,
        type: "attendance_late",
        relatedId: attendance.id,
        companyId: attendance.company_id,
      })

      // Mark notification as sent
      await supabase.from("attendance").update({ late_notification_sent: true }).eq("id", attendance.id)

      console.log(`Late arrival notification sent to user ${attendance.user_id}`)
    }
  } catch (error) {
    console.error("Error checking late arrivals:", error)
  }
}

async function checkMissingAttendance(today: string) {
  try {
    // Get all active employees
    const { data: activeEmployees, error: employeesError } = await supabase
      .from("profiles")
      .select("id, full_name, email, company_id")
      .eq("active", true)
      .not("role", "eq", "admin") // Exclude admins from attendance requirements

    if (employeesError) {
      console.error("Error fetching active employees:", employeesError)
      return
    }

    if (!activeEmployees || activeEmployees.length === 0) {
      console.log("No active employees found")
      return
    }

    // Get attendance records for today
    const { data: todayAttendance, error: attendanceError } = await supabase
      .from("attendance")
      .select("user_id, check_in_time")
      .eq("attendance_date", today)

    if (attendanceError) {
      console.error("Error fetching today's attendance:", attendanceError)
      return
    }

    const attendedUserIds = new Set(todayAttendance?.filter((a) => a.check_in_time).map((a) => a.user_id) || [])

    const absentEmployees = activeEmployees.filter((emp) => !attendedUserIds.has(emp.id))

    console.log(`Found ${absentEmployees.length} absent employees`)

    for (const employee of absentEmployees) {
      const deadlineTime = addHours(new Date(`${today} 17:30:00`), 24)

      await createNotification({
        userId: employee.id,
        title: "Justificación de Ausencia Requerida",
        message: `No has marcado asistencia hoy. Debes presentar una justificación de ausencia antes del ${format(deadlineTime, "dd/MM/yyyy 'a las' HH:mm")} (24 horas desde las 5:30 PM).`,
        type: "attendance_missing",
        relatedId: null,
        companyId: employee.company_id,
      })

      console.log(`Missing attendance notification sent to user ${employee.id}`)
    }
  } catch (error) {
    console.error("Error checking missing attendance:", error)
  }
}

async function checkIncompleteAttendance(today: string) {
  try {
    // Get employees who checked in but haven't checked out
    const { data: incompleteAttendance, error } = await supabase
      .from("attendance")
      .select(`
        id,
        user_id,
        company_id,
        check_in_time,
        check_out_time,
        incomplete_notification_sent,
        profiles!attendance_user_id_fkey(
          full_name,
          email
        )
      `)
      .eq("attendance_date", today)
      .not("check_in_time", "is", null)
      .is("check_out_time", null)
      .eq("incomplete_notification_sent", false)

    if (error) {
      console.error("Error fetching incomplete attendance:", error)
      return
    }

    if (!incompleteAttendance || incompleteAttendance.length === 0) {
      console.log("No incomplete attendance found")
      return
    }

    console.log(`Found ${incompleteAttendance.length} incomplete attendance records`)

    for (const attendance of incompleteAttendance) {
      await createNotification({
        userId: attendance.user_id,
        title: "Recordatorio: Marcar Salida",
        message: `Has marcado entrada hoy pero no has marcado salida. Recuerda marcar tu salida al finalizar tu jornada laboral.`,
        type: "attendance_incomplete",
        relatedId: attendance.id,
        companyId: attendance.company_id,
      })

      // Mark notification as sent
      await supabase.from("attendance").update({ incomplete_notification_sent: true }).eq("id", attendance.id)

      console.log(`Incomplete attendance notification sent to user ${attendance.user_id}`)
    }
  } catch (error) {
    console.error("Error checking incomplete attendance:", error)
  }
}
