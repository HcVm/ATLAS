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

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Starting automatic task migration...")
    
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
        task_boards!inner (
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
      allTasksDebug?.forEach(task => {
        console.log(`[v0] Task: "${task.title}" - Status: ${task.status} - Board Date: ${task.task_boards.board_date} - Board Status: ${task.task_boards.status}`)
      })
    }

    // Check specifically for tasks from boards with date < currentDate
    const { data: tasksFromPastBoards, error: pastBoardsError } = await supabaseAdmin
      .from("tasks")
      .select(`
        id,
        title,
        status,
        created_at,
        task_boards!inner (
          id,
          board_date,
          user_id,
          company_id,
          status,
          title
        )
      `)
      .in("status", ["pending", "in_progress"])
      .lt("task_boards.board_date", currentDate)

    if (pastBoardsError) {
      console.error("[v0] Past boards query error:", pastBoardsError)
    } else {
      console.log(`[v0] Found ${tasksFromPastBoards?.length || 0} pending/in_progress tasks from past boards:`)
      tasksFromPastBoards?.forEach(task => {
        console.log(`[v0] Past Task: "${task.title}" - Status: ${task.status} - Board Date: ${task.task_boards.board_date} - Board Status: ${task.task_boards.status}`)
      })
    }

    // Now the actual migration query with detailed logging
    const { data: tasksToMigrate, error: tasksError } = await supabaseAdmin
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
        task_boards!inner (
          id,
          board_date,
          user_id,
          company_id,
          status,
          title
        )
      `)
      .in("status", ["pending", "in_progress"])
      .lt("task_boards.board_date", currentDate)

    console.log("[v0] Migration query details:")
    console.log("- Looking for tasks with status: pending, in_progress")
    console.log("- From boards with date <", currentDate)
    console.log("- Any board status (removed the closed filter temporarily)")

    if (tasksError) {
      console.error("[v0] Error finding tasks to migrate:", tasksError)
      throw tasksError
    }

    console.log(`[v0] Migration query found ${tasksToMigrate?.length || 0} tasks to migrate:`)
    tasksToMigrate?.forEach(task => {
      console.log(`[v0] Migrate: "${task.title}" - Status: ${task.status} - Board Date: ${task.task_boards.board_date} - Board Status: ${task.task_boards.status} - User: ${task.task_boards.user_id}`)
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
            tasksFromPastBoards: tasksFromPastBoards?.length || 0
          }
        },
      })
    }

    // Continue with migration logic...
    const userTasks = new Map<string, any[]>()
    tasksToMigrate.forEach(task => {
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

        if (boardCheckError && boardCheckError.code !== 'PGRST116') {
          console.error(`[v0] Error checking existing board for user ${userId}:`, boardCheckError)
          continue
        }

        let targetBoardId: string

        if (existingBoard) {
          console.log(`[v0] Using existing board ${existingBoard.id} for user ${userId}`)
          targetBoardId = existingBoard.id
        } else {
          // Create new board for today
          const boardTitle = `Tareas del ${new Date(currentDate + 'T00:00:00').toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit', 
            year: 'numeric'
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
        }))

        console.log(`[v0] Inserting ${tasksToInsert.length} tasks:`)
        tasksToInsert.forEach((task, index) => {
          console.log(`[v0] - Task ${index + 1}: "${task.title}" - Status: ${task.status} - Position: ${task.position}`)
        })

        const { error: insertError } = await supabaseAdmin
          .from("tasks")
          .insert(tasksToInsert)

        if (insertError) {
          console.error(`[v0] Error inserting migrated tasks for user ${userId}:`, insertError)
          continue
        }

        // Mark original tasks as cancelled
        const originalTaskIds = userTasksList.map(task => task.id)
        console.log(`[v0] Marking ${originalTaskIds.length} original tasks as cancelled`)

        const { error: updateError } = await supabaseAdmin
          .from("tasks")
          .update({ 
            status: "cancelled",
            updated_at: new Date().toISOString()
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

    // Find tasks that need migration - removed the board status filter to debug
    const { data: pendingTasks, error } = await supabaseAdmin
      .from("tasks")
      .select(`
        id,
        title,
        status,
        created_at,
        task_boards!inner (
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
      .lt("task_boards.board_date", currentDate)

    if (error) {
      console.error("[v0] Error checking pending tasks:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log("[v0] Found pending tasks for migration:", pendingTasks?.length || 0)

    return NextResponse.json({
      currentPeruTime: new Date().toLocaleString("en-US", { timeZone: "America/Lima" }),
      currentDate: currentDate,
      pendingMigrations: pendingTasks?.length || 0,
      tasks: pendingTasks?.map((task) => ({
        id: task.id,
        title: task.title,
        status: task.status,
        boardDate: task.task_boards.board_date,
        boardStatus: task.task_boards.status,
        userName: task.task_boards.profiles?.full_name,
        daysOverdue: Math.floor(
          (new Date(currentDate).getTime() - new Date(task.task_boards.board_date).getTime()) / 
          (1000 * 60 * 60 * 24)
        ),
      })) || [],
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