import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
)

// Helper function to get Peru date consistently
function getPeruDate() {
  const peruTime = new Date().toLocaleString("en-US", { timeZone: "America/Lima" })
  return new Date(peruTime).toISOString().split("T")[0]
}

async function checkAttendanceNotifications() {
  try {
    console.log("[v0] Starting attendance notifications check...")

    const currentDate = getPeruDate()
    const yesterdayDate = new Date(new Date(currentDate).getTime() - 24 * 60 * 60 * 1000).toISOString().split("T")[0]

    console.log("[v0] Checking attendance for date:", yesterdayDate)

    // Get all active employees
    const { data: employees, error: employeesError } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, company_id")
      .eq("status", "active")
      .not("role", "eq", "admin") // Skip admins from attendance checks

    if (employeesError) {
      console.error("[v0] Error fetching employees:", employeesError)
      return
    }

    console.log(`[v0] Found ${employees?.length || 0} active employees to check`)

    if (employees && employees.length > 0) {
      const employeeIds = employees.map((e) => e.id)

      // Batch fetch attendance for yesterday
      const { data: allAttendance, error: attendanceError } = await supabaseAdmin
        .from("attendance")
        .select("id, user_id, is_late, absence_notified")
        .in("user_id", employeeIds)
        .eq("date", yesterdayDate)

      if (attendanceError) {
        console.error("[v0] Error fetching attendance records:", attendanceError)
        return
      }

      const attendanceMap = new Map()
      allAttendance?.forEach((att) => {
        attendanceMap.set(att.user_id, att)
      })

      // Batch fetch existing notifications
      const { data: existingAbsenceNotifs, error: absenceNotifError } = await supabaseAdmin
        .from("notifications")
        .select("user_id")
        .in("user_id", employeeIds)
        .eq("type", "attendance_absence")
        .eq("metadata->absence_date", yesterdayDate)

      if (absenceNotifError) {
        console.error("[v0] Error fetching existing absence notifications:", absenceNotifError)
        return
      }
      const absenceNotifSet = new Set(existingAbsenceNotifs?.map((n) => n.user_id))

      const { data: existingTardinessNotifs, error: tardinessNotifError } = await supabaseAdmin
        .from("notifications")
        .select("user_id")
        .in("user_id", employeeIds)
        .eq("type", "attendance_tardiness")
        .eq("metadata->tardiness_date", yesterdayDate)

      if (tardinessNotifError) {
        console.error("[v0] Error fetching existing tardiness notifications:", tardinessNotifError)
        return
      }
      const tardinessNotifSet = new Set(existingTardinessNotifs?.map((n) => n.user_id))

      const notificationsToInsert: any[] = []
      const attendanceIdsToUpdate: string[] = []

      // Check for absences (no attendance record for yesterday)
      for (const employee of employees) {
        const attendance = attendanceMap.get(employee.id)

        // If no attendance record found, it's an absence
        if (!attendance) {
          console.log(`[v0] Found absence for ${employee.full_name} on ${yesterdayDate}`)

          // Check if absence notification already sent
          if (!absenceNotifSet.has(employee.id)) {
            // Add to insert list
            notificationsToInsert.push({
              user_id: employee.id,
              company_id: employee.company_id,
              type: "attendance_absence",
              title: "Justificación de Ausencia Requerida",
              message: `No se registró tu asistencia el ${new Date(yesterdayDate).toLocaleDateString("es-ES")}. Tienes 24 horas para justificar tu ausencia.`,
              metadata: {
                absence_date: yesterdayDate,
                deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                action_url: "/requests/new/justificacion-ausencia",
              },
              created_at: new Date().toISOString(),
            })

            console.log(`[v0] Queueing absence notification for ${employee.full_name}`)
          }
        }
        // If attendance exists but was late and not notified
        else if (attendance.is_late && !attendance.absence_notified) {
          console.log(`[v0] Found unnotified tardiness for ${employee.full_name} on ${yesterdayDate}`)

          // Check if tardiness notification already sent
          if (!tardinessNotifSet.has(employee.id)) {
            // Add to insert list
            notificationsToInsert.push({
              user_id: employee.id,
              company_id: employee.company_id,
              type: "attendance_tardiness",
              title: "Justificación de Tardanza Requerida",
              message: `Llegaste tarde el ${new Date(yesterdayDate).toLocaleDateString("es-ES")}. Tienes 24 horas para justificar tu tardanza.`,
              metadata: {
                tardiness_date: yesterdayDate,
                deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                action_url: "/requests/new/justificacion-tardanza",
              },
              created_at: new Date().toISOString(),
            })

            attendanceIdsToUpdate.push(attendance.id)
            console.log(`[v0] Queueing tardiness notification for ${employee.full_name}`)
          }
        }
      }

      // Execute Bulk Actions
      if (notificationsToInsert.length > 0) {
        console.log(`[v0] Sending ${notificationsToInsert.length} notifications...`)
        const { error: insertError } = await supabaseAdmin.from("notifications").insert(notificationsToInsert)
        if (insertError) {
          console.error("[v0] Error bulk inserting notifications:", insertError)
        } else {
          console.log("[v0] Notifications sent successfully.")
        }
      }

      if (attendanceIdsToUpdate.length > 0) {
        console.log(`[v0] Updating ${attendanceIdsToUpdate.length} attendance records as notified...`)
        const { error: updateError } = await supabaseAdmin
          .from("attendance")
          .update({ absence_notified: true })
          .in("id", attendanceIdsToUpdate)

        if (updateError) {
          console.error("[v0] Error bulk updating attendance:", updateError)
        } else {
          console.log("[v0] Attendance records updated successfully.")
        }
      }
    }

    console.log("[v0] Attendance notifications check completed")
  } catch (error) {
    console.error("[v0] Error in attendance notifications check:", error)
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Starting automatic task migration...")

    await checkAttendanceNotifications()

    const currentDate = getPeruDate()
    console.log("[v0] Current Peru date:", currentDate)

    // STEP 1: Debug - First let's see all tasks and boards to understand the data structure
    console.log("[v0] === DEBUGGING QUERY STEP BY STEP ===")

    // Check all tasks with their board info
    const { data: allTasksDebug, error: debugError } = await supabaseAdmin
      .from("tasks")
      .select(`
        id,
        title,
        status,
        created_at,
        task_boards!tasks_board_id_fkey (
          id,
          board_date,
          user_id,
          company_id,
          status,
          title
        )
      `)
      .in("status", ["pending", "in_progress"])

    if (debugError) {
      console.error("[v0] Debug query error:", debugError)
    } else {
      console.log(`[v0] Found ${allTasksDebug?.length || 0} pending/in_progress tasks total:`)
      allTasksDebug?.forEach((task) => {
        if (task.task_boards) {
          console.log(
            `[v0] Task: "${task.title}" - Status: ${task.status} - Board Date: ${task.task_boards.board_date} - Board Status: ${task.task_boards.status}`,
          )
        } else {
          console.log(`[v0] Task: "${task.title}" - Status: ${task.status} - Board: NULL`)
        }
      })
    }

    // First get all pending/in_progress tasks, then filter in memory
    const { data: allPendingTasks, error: allTasksError } = await supabaseAdmin
      .from("tasks")
      .select(`
        id,
        title,
        description,
        priority,
        estimated_time,
        due_time,
        created_by,
        assigned_by,
        status,
        created_at,
        board_id,
        task_boards!tasks_board_id_fkey (
          id,
          board_date,
          user_id,
          company_id,
          status,
          title
        )
      `)
      .in("status", ["pending", "in_progress"])

    if (allTasksError) {
      console.error("[v0] All tasks query error:", allTasksError)
      throw allTasksError
    }

    const tasksFromPastBoards =
      allPendingTasks?.filter((task) => task.task_boards && task.task_boards.board_date < currentDate) || []

    console.log(`[v0] Found ${tasksFromPastBoards.length} pending/in_progress tasks from past boards:`)
    tasksFromPastBoards.forEach((task) => {
      console.log(
        `[v0] Past Task: "${task.title}" - Status: ${task.status} - Board Date: ${task.task_boards.board_date} - Board Status: ${task.task_boards.status}`,
      )
    })

    const tasksToMigrate = tasksFromPastBoards

    console.log("[v0] Migration query details:")
    console.log("- Looking for tasks with status: pending, in_progress")
    console.log("- From boards with date <", currentDate)
    console.log("- Any board status (removed the closed filter temporarily)")

    console.log(`[v0] Migration query found ${tasksToMigrate.length} tasks to migrate:`)
    tasksToMigrate.forEach((task) => {
      console.log(
        `[v0] Migrate: "${task.title}" - Status: ${task.status} - Board Date: ${task.task_boards.board_date} - Board Status: ${task.task_boards.status} - User: ${task.task_boards.user_id} - Created By: ${task.created_by}`,
      )
    })

    if (!tasksToMigrate || tasksToMigrate.length === 0) {
      console.log("[v0] No tasks found for migration")
      return NextResponse.json({
        success: true,
        data: {
          migratedTasks: 0,
          createdBoards: 0,
          affectedUsers: [],
          message: "No hay tareas pendientes para migrar",
          debug: {
            currentDate,
            totalPendingTasks: allTasksDebug?.length || 0,
            tasksFromPastBoards: tasksFromPastBoards.length,
          },
        },
      })
    }

    // Continue with migration logic...
    const userTasks = new Map<string, any[]>()
    tasksToMigrate.forEach((task) => {
      const userId = task.task_boards.user_id
      if (!userTasks.has(userId)) {
        userTasks.set(userId, [])
      }
      userTasks.get(userId)!.push(task)
    })

    let totalMigratedTasks = 0
    let totalCreatedBoards = 0
    const affectedUsers: string[] = []

    console.log(`[v0] Processing tasks for ${userTasks.size} users`)

    // Process each user's tasks
    for (const [userId, userTasksList] of userTasks) {
      try {
        console.log(`[v0] Processing ${userTasksList.length} tasks for user ${userId}`)

        const companyId = userTasksList[0].task_boards.company_id

        // Check if user already has a board for today
        const { data: existingBoard, error: boardCheckError } = await supabaseAdmin
          .from("task_boards")
          .select("id, title")
          .eq("user_id", userId)
          .eq("board_date", currentDate)
          .eq("status", "active")
          .single()

        if (boardCheckError && boardCheckError.code !== "PGRST116") {
          console.error(`[v0] Error checking existing board for user ${userId}:`, boardCheckError)
          continue
        }

        let targetBoardId: string

        if (existingBoard) {
          console.log(`[v0] Using existing board ${existingBoard.id} for user ${userId}`)
          targetBoardId = existingBoard.id
        } else {
          // Create new board for today
          const boardTitle = `Tareas del ${new Date(currentDate + "T00:00:00").toLocaleDateString("es-ES", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })}`

          console.log(`[v0] Creating new board with title: "${boardTitle}"`)

          const { data: newBoard, error: boardCreateError } = await supabaseAdmin
            .from("task_boards")
            .insert({
              user_id: userId,
              company_id: companyId,
              board_date: currentDate,
              title: boardTitle,
              status: "active",
            })
            .select("id")
            .single()

          if (boardCreateError) {
            console.error(`[v0] Error creating board for user ${userId}:`, boardCreateError)
            continue
          }

          targetBoardId = newBoard.id
          totalCreatedBoards++
          console.log(`[v0] Created new board ${targetBoardId} for user ${userId}`)
        }

        // Get current max position in target board
        const { data: maxPositionData } = await supabaseAdmin
          .from("tasks")
          .select("position")
          .eq("board_id", targetBoardId)
          .order("position", { ascending: false })
          .limit(1)

        const startPosition = (maxPositionData?.[0]?.position || -1) + 1
        console.log(`[v0] Starting position for new tasks: ${startPosition}`)

        // Migrate tasks to new board
        const tasksToInsert = userTasksList.map((task, index) => ({
          board_id: targetBoardId,
          title: task.title,
          description: task.description,
          priority: task.priority,
          estimated_time: task.estimated_time,
          due_time: task.due_time,
          created_by: task.created_by,
          assigned_by: task.assigned_by,
          status: task.status, // Keep original status (pending or in_progress)
          position: startPosition + index,
          migrated_from_board: task.task_boards.id,
          migrated_from_date: task.task_boards.board_date,
          migrated_at: new Date().toISOString(),
        }))

        console.log(`[v0] Inserting ${tasksToInsert.length} tasks:`)
        tasksToInsert.forEach((task, index) => {
          console.log(
            `[v0] - Task ${index + 1}: "${task.title}" - Status: ${task.status} - Position: ${task.position} - Created By: ${task.created_by}`,
          )
        })

        const { error: insertError } = await supabaseAdmin.from("tasks").insert(tasksToInsert)

        if (insertError) {
          console.error(`[v0] Error inserting migrated tasks for user ${userId}:`, insertError)
          continue
        }

        // Mark original tasks as migrated
        const originalTaskIds = userTasksList.map((task) => task.id)
        console.log(`[v0] Marking ${originalTaskIds.length} original tasks as migrated`)

        const { error: updateError } = await supabaseAdmin
          .from("tasks")
          .update({
            status: "migrated", // Now using proper 'migrated' status after CHECK constraint update
            migrated_from_board: userTasksList[0].task_boards.id,
            migrated_from_date: userTasksList[0].task_boards.board_date,
            migrated_to_board: targetBoardId,
            migrated_to_date: currentDate,
            migrated_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            updated_by: userTasksList[0].created_by, // Set updated_by to prevent task_history trigger error
          })
          .in("id", originalTaskIds)

        if (updateError) {
          console.error(`[v0] Error updating original tasks for user ${userId}:`, updateError)
          continue
        }

        totalMigratedTasks += userTasksList.length
        affectedUsers.push(userId)

        console.log(`[v0] Successfully migrated ${userTasksList.length} tasks for user ${userId}`)
      } catch (userError) {
        console.error(`[v0] Error processing tasks for user ${userId}:`, userError)
        continue
      }
    }

    const result = {
      migratedTasks: totalMigratedTasks,
      createdBoards: totalCreatedBoards,
      affectedUsers,
      message: `Se migraron ${totalMigratedTasks} tareas. Se crearon ${totalCreatedBoards} nuevos pizarrones.`,
    }

    console.log("[v0] Migration completed successfully:", result)

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error: any) {
    console.error("[v0] Unexpected error in task migration:", error)
    return NextResponse.json(
      {
        error: error.message || "Error interno del servidor",
        success: false,
        details: error.stack,
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  try {
    const currentDate = getPeruDate()

    console.log("[v0] Checking pending tasks for migration. Current Peru date:", currentDate)

    const { data: allPendingTasks, error } = await supabaseAdmin
      .from("tasks")
      .select(`
        id,
        title,
        description,
        priority,
        estimated_time,
        due_time,
        created_by,
        assigned_by,
        status,
        created_at,
        task_boards!tasks_board_id_fkey (
          id,
          board_date,
          status,
          user_id,
          profiles!task_boards_user_id_fkey (
            full_name,
            email
          )
        )
      `)
      .in("status", ["pending", "in_progress"])

    if (error) {
      console.error("[v0] Error checking pending tasks:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const pendingTasks =
      allPendingTasks?.filter((task) => task.task_boards && task.task_boards.board_date < currentDate) || []

    console.log("[v0] Found pending tasks for migration:", pendingTasks.length)

    return NextResponse.json({
      currentPeruTime: new Date().toLocaleString("en-US", { timeZone: "America/Lima" }),
      currentDate: currentDate,
      pendingMigrations: pendingTasks.length,
      tasks: pendingTasks.map((task) => ({
        id: task.id,
        title: task.title,
        status: task.status,
        boardDate: task.task_boards.board_date,
        boardStatus: task.task_boards.status,
        userName: task.task_boards.profiles?.full_name,
        daysOverdue: Math.floor(
          (new Date(currentDate).getTime() - new Date(task.task_boards.board_date).getTime()) / (1000 * 60 * 60 * 24),
        ),
      })),
    })
  } catch (error: any) {
    console.error("[v0] Error in migration status check:", error)
    return NextResponse.json(
      {
        error: error.message || "Error interno del servidor",
      },
      { status: 500 },
    )
  }
}
