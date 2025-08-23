import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
)

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Starting automatic task migration...")

    // Ejecutar la función de migración
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
      migrated_tasks: 0,
      created_boards: 0,
      affected_users: [],
    }

    console.log("[v0] Task migration completed:", migrationResult)

    return NextResponse.json({
      success: true,
      data: {
        migratedTasks: migrationResult.migrated_tasks,
        createdBoards: migrationResult.created_boards,
        affectedUsers: migrationResult.affected_users,
        message: `Se migraron ${migrationResult.migrated_tasks} tareas pendientes. Se crearon ${migrationResult.created_boards} nuevos pizarrones.`,
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

// Método GET para verificar el estado de la migración
export async function GET() {
  try {
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
      .lt("task_boards.board_date", new Date().toISOString().split("T")[0])

    if (error) {
      console.error("[v0] Error checking pending tasks:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      pendingMigrations: pendingTasks?.length || 0,
      tasks:
        pendingTasks?.map((task) => ({
          id: task.id,
          title: task.title,
          status: task.status,
          boardDate: task.task_boards.board_date,
          userName: task.task_boards.profiles?.full_name,
          daysOverdue: Math.floor(
            (new Date().getTime() - new Date(task.task_boards.board_date).getTime()) / (1000 * 60 * 60 * 24),
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
