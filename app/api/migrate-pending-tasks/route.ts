import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
)

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Starting automatic task migration...")

    const peruTime = new Date().toLocaleString("en-US", { timeZone: "America/Lima" })
    const now = new Date(peruTime)
    console.log("[v0] Current Peru time:", now.toISOString())

    const { data, error } = await supabaseAdmin.rpc("migrate_pending_tasks")

    if (error) {
      console.error("[v0] Error in task migration:", error)
      return NextResponse.json(
        {
          error: error.message,
          success: false,
        },
        { status: 500 },
      )
    }

    const migrationResult = data?.[0] || {
      migrated_count: 0,
      created_boards_count: 0,
      affected_users_array: [],
    }

    console.log("[v0] Task migration completed:", migrationResult)

    return NextResponse.json({
      success: true,
      data: {
        migratedTasks: migrationResult.migrated_count,
        createdBoards: migrationResult.created_boards_count,
        affectedUsers: migrationResult.affected_users_array,
        message: `Se migraron ${migrationResult.migrated_count} tareas pendientes. Se crearon ${migrationResult.created_boards_count} nuevos pizarrones.`,
      },
    })
  } catch (error: any) {
    console.error("[v0] Unexpected error in task migration:", error)
    return NextResponse.json(
      {
        error: error.message || "Error interno del servidor",
        success: false,
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  try {
    const peruTime = new Date().toLocaleString("en-US", { timeZone: "America/Lima" })
    const currentDate = new Date(peruTime).toISOString().split("T")[0]

    console.log("[v0] Checking pending tasks for migration. Current Peru date:", currentDate)

    // Consultar tareas pendientes que necesitan migración
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
      .eq("task_boards.status", "closed")
      .lt("task_boards.board_date", currentDate)

    if (error) {
      console.error("[v0] Error checking pending tasks:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log("[v0] Found pending tasks for migration:", pendingTasks?.length || 0)

    return NextResponse.json({
      currentPeruTime: peruTime,
      currentDate: currentDate,
      pendingMigrations: pendingTasks?.length || 0,
      tasks:
        pendingTasks?.map((task) => ({
          id: task.id,
          title: task.title,
          status: task.status,
          boardDate: task.task_boards.board_date,
          userName: task.task_boards.profiles?.full_name,
          daysOverdue: Math.floor(
            (new Date(currentDate).getTime() - new Date(task.task_boards.board_date).getTime()) / (1000 * 60 * 60 * 24),
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
