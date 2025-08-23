"use client"

import { useState, useEffect } from "react"
import { useCompany } from "@/lib/company-context"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { AlertTriangle, Clock, TrendingDown, UserX, Target, Bell, X, Users, ArrowRight } from "lucide-react"
import { format } from "date-fns"

interface Alert {
  id: string
  type: "overdue" | "low_productivity" | "inactive_user" | "high_workload" | "pending_migration"
  severity: "low" | "medium" | "high" | "critical"
  title: string
  description: string
  employee?: {
    id: string
    name: string
    avatar_url?: string
  }
  data?: any
  created_at: string
}

interface RealTimeAlertsProps {
  refreshTrigger?: number
  onAlertClick?: (alert: Alert) => void
}

export function RealTimeAlerts({ refreshTrigger, onAlertClick }: RealTimeAlertsProps) {
  const { selectedCompany } = useCompany()
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (selectedCompany?.id) {
      generateAlerts()
    } else {
      setLoading(false)
      setAlerts([])
    }
  }, [selectedCompany, refreshTrigger])

  const generateAlerts = async () => {
    try {
      setLoading(true)
      const generatedAlerts: Alert[] = []

      console.log("[v0] Generating alerts for company:", selectedCompany?.id)

      const { data: employees, error: employeesError } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("company_id", selectedCompany?.id)
        .in("role", ["user", "supervisor"])

      if (employeesError) {
        console.error("[v0] Error loading employees for alerts:", employeesError)
        throw employeesError
      }

      console.log("[v0] Loaded employees for alerts:", employees?.length)

      const { data: taskBoards, error: boardsError } = await supabase
        .from("task_boards")
        .select(`
          id,
          user_id,
          board_date,
          created_at,
          status,
          tasks(
            id,
            title,
            status,
            priority,
            due_time,
            created_at,
            completed_at
          )
        `)
        .eq("company_id", selectedCompany?.id)
        .order("board_date", { ascending: false })

      if (boardsError) {
        console.error("[v0] Error loading task boards for alerts:", boardsError)
        throw boardsError
      }

      console.log("[v0] ALL Task boards for alerts:", {
        totalBoards: taskBoards?.length,
        boardsByUser: taskBoards?.reduce(
          (acc, board) => {
            const employee = employees?.find((e) => e.id === board.user_id)
            const employeeName = employee?.full_name || "Unknown"
            acc[employeeName] = (acc[employeeName] || 0) + 1
            return acc
          },
          {} as Record<string, number>,
        ),
        sampleBoards: taskBoards?.slice(0, 3).map((b) => ({
          user_id: b.user_id,
          board_date: b.board_date,
          tasksCount: b.tasks?.length || 0,
        })),
      })

      const today = format(new Date(), "yyyy-MM-dd")
      const pendingMigrationTasks =
        taskBoards?.filter((board) => {
          return (
            board.status === "closed" &&
            board.board_date < today &&
            board.tasks.some((task) => task.status === "pending" || task.status === "in_progress")
          )
        }) || []

      if (pendingMigrationTasks.length > 0) {
        const totalPendingTasks = pendingMigrationTasks.reduce(
          (sum, board) =>
            sum + board.tasks.filter((task) => task.status === "pending" || task.status === "in_progress").length,
          0,
        )

        const affectedEmployees = [...new Set(pendingMigrationTasks.map((board) => board.user_id))]

        generatedAlerts.push({
          id: `pending-migration-${Date.now()}`,
          type: "pending_migration",
          severity: totalPendingTasks > 10 ? "high" : totalPendingTasks > 5 ? "medium" : "low",
          title: `${totalPendingTasks} tareas pendientes de migración`,
          description: `Hay ${totalPendingTasks} tareas no completadas en pizarrones cerrados que necesitan ser migradas automáticamente. Afecta a ${affectedEmployees.length} empleado(s).`,
          data: {
            pendingTasks: totalPendingTasks,
            affectedEmployees: affectedEmployees.length,
            boards: pendingMigrationTasks.length,
          },
          created_at: new Date().toISOString(),
        })
      }

      const marleneEmployee = employees?.find((emp) => emp.full_name.includes("Marlene"))
      if (marleneEmployee) {
        const marleneBoards = taskBoards?.filter((board) => board.user_id === marleneEmployee.id) || []
        console.log("[v0] Marlene Gutierrez boards:", {
          employeeId: marleneEmployee.id,
          totalBoards: marleneBoards.length,
          boards: marleneBoards.map((b) => ({
            board_date: b.board_date,
            tasksCount: b.tasks?.length || 0,
          })),
        })
      }

      for (const board of taskBoards || []) {
        const employee = employees?.find((emp) => emp.id === board.user_id)
        if (!employee) continue

        const overdueTasks = board.tasks.filter((task) => {
          if (!task.due_time || task.status === "completed") return false

          const now = new Date()
          const taskDate = new Date(board.board_date)
          const [hours, minutes] = task.due_time.split(":").map(Number)
          taskDate.setHours(hours, minutes, 0, 0)

          return taskDate < now
        })

        if (overdueTasks.length > 0) {
          const highPriorityOverdue = overdueTasks.filter(
            (task) => task.priority === "high" || task.priority === "urgent",
          )

          generatedAlerts.push({
            id: `overdue-${board.user_id}-${board.id}`,
            type: "overdue",
            severity: highPriorityOverdue.length > 0 ? "high" : "medium",
            title: `${overdueTasks.length} tareas vencidas`,
            description: `${employee.full_name} tiene ${overdueTasks.length} tareas vencidas${
              highPriorityOverdue.length > 0 ? `, ${highPriorityOverdue.length} de alta prioridad` : ""
            }`,
            employee: {
              id: employee.id,
              name: employee.full_name,
              avatar_url: employee.avatar_url,
            },
            data: { overdueTasks, boardId: board.id },
            created_at: new Date().toISOString(),
          })
        }
      }

      for (const employee of employees || []) {
        const employeeBoards = taskBoards?.filter((board) => board.user_id === employee.id) || []
        const allTasks = employeeBoards.flatMap((board) => board.tasks)
        const completedTasks = allTasks.filter((task) => task.status === "completed")

        if (allTasks.length >= 5) {
          const completionRate = (completedTasks.length / allTasks.length) * 100

          if (completionRate < 50) {
            generatedAlerts.push({
              id: `low-productivity-${employee.id}`,
              type: "low_productivity",
              severity: completionRate < 30 ? "high" : "medium",
              title: "Baja productividad detectada",
              description: `${employee.full_name} tiene una tasa de completado del ${completionRate.toFixed(1)}% (${completedTasks.length}/${allTasks.length} tareas)`,
              employee: {
                id: employee.id,
                name: employee.full_name,
                avatar_url: employee.avatar_url,
              },
              data: { completionRate, totalTasks: allTasks.length, completedTasks: completedTasks.length },
              created_at: new Date().toISOString(),
            })
          }
        }
      }

      const fourteenDaysAgo = format(new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), "yyyy-MM-dd")
      for (const employee of employees || []) {
        const recentBoards =
          taskBoards?.filter((board) => board.user_id === employee.id && board.board_date >= fourteenDaysAgo) || []

        console.log(`[v0] Employee ${employee.full_name} recent boards (last 14 days):`, {
          recentBoardsCount: recentBoards.length,
          allBoardsCount: taskBoards?.filter((b) => b.user_id === employee.id).length || 0,
          cutoffDate: fourteenDaysAgo,
        })

        if (recentBoards.length === 0) {
          generatedAlerts.push({
            id: `inactive-${employee.id}`,
            type: "inactive_user",
            severity: "medium",
            title: "Usuario inactivo",
            description: `${employee.full_name} no ha creado pizarrones de tareas en los últimos 14 días`,
            employee: {
              id: employee.id,
              name: employee.full_name,
              avatar_url: employee.avatar_url,
            },
            data: { daysSinceLastActivity: 14 },
            created_at: new Date().toISOString(),
          })
        }
      }

      for (const employee of employees || []) {
        const todayBoards =
          taskBoards?.filter(
            (board) => board.user_id === employee.id && board.board_date === format(new Date(), "yyyy-MM-dd"),
          ) || []

        const pendingTasks = todayBoards.flatMap((board) => board.tasks.filter((task) => task.status === "pending"))

        if (pendingTasks.length > 10) {
          generatedAlerts.push({
            id: `high-workload-${employee.id}`,
            type: "high_workload",
            severity: pendingTasks.length > 15 ? "high" : "medium",
            title: "Carga de trabajo alta",
            description: `${employee.full_name} tiene ${pendingTasks.length} tareas pendientes para hoy`,
            employee: {
              id: employee.id,
              name: employee.full_name,
              avatar_url: employee.avatar_url,
            },
            data: { pendingTasks: pendingTasks.length },
            created_at: new Date().toISOString(),
          })
        }
      }

      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
      generatedAlerts.sort((a, b) => {
        const severityDiff = severityOrder[b.severity] - severityOrder[a.severity]
        if (severityDiff !== 0) return severityDiff
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })

      console.log("[v0] Generated alerts:", generatedAlerts.length)
      setAlerts(generatedAlerts)
    } catch (error) {
      console.error("[v0] Error generating alerts:", error)
      setAlerts([])
    } finally {
      setLoading(false)
    }
  }

  const dismissAlert = (alertId: string) => {
    setDismissedAlerts((prev) => new Set([...prev, alertId]))
  }

  const getAlertIcon = (type: Alert["type"]) => {
    switch (type) {
      case "overdue":
        return <Clock className="h-5 w-5" />
      case "low_productivity":
        return <TrendingDown className="h-5 w-5" />
      case "inactive_user":
        return <UserX className="h-5 w-5" />
      case "high_workload":
        return <Target className="h-5 w-5" />
      case "pending_migration":
        return <ArrowRight className="h-5 w-5" />
      default:
        return <AlertTriangle className="h-5 w-5" />
    }
  }

  const getSeverityColor = (severity: Alert["severity"]) => {
    switch (severity) {
      case "critical":
        return "border-red-500 bg-red-50 text-red-800"
      case "high":
        return "border-orange-500 bg-orange-50 text-orange-800"
      case "medium":
        return "border-yellow-500 bg-yellow-50 text-yellow-800"
      case "low":
        return "border-blue-500 bg-blue-50 text-blue-800"
      default:
        return "border-gray-500 bg-gray-50 text-gray-800"
    }
  }

  const visibleAlerts = alerts.filter((alert) => !dismissedAlerts.has(alert.id))

  if (!selectedCompany?.id) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Alertas en Tiempo Real
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Selecciona una empresa para ver las alertas</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Alertas en Tiempo Real
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse p-3 bg-gray-100 rounded-lg">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Alertas en Tiempo Real
          {visibleAlerts.length > 0 && (
            <Badge variant="destructive" className="ml-2">
              {visibleAlerts.length}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>Notificaciones importantes que requieren atención inmediata</CardDescription>
      </CardHeader>
      <CardContent>
        {visibleAlerts.length === 0 ? (
          <div className="text-center py-6">
            <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No hay alertas activas</p>
            <p className="text-sm text-gray-400">Todo está funcionando correctamente</p>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleAlerts.slice(0, 10).map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-lg border-l-4 ${getSeverityColor(alert.severity)} cursor-pointer hover:shadow-md transition-shadow`}
                onClick={() => onAlertClick?.(alert)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">{getAlertIcon(alert.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-medium text-gray-900">{alert.title}</h4>
                        <Badge variant="outline" className="text-xs">
                          {alert.severity === "critical"
                            ? "Crítico"
                            : alert.severity === "high"
                              ? "Alto"
                              : alert.severity === "medium"
                                ? "Medio"
                                : "Bajo"}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{alert.description}</p>
                      {alert.employee && (
                        <div className="flex items-center space-x-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={alert.employee.avatar_url || "/placeholder.svg"} />
                            <AvatarFallback className="text-xs">
                              {alert.employee.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-gray-500">{alert.employee.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      dismissAlert(alert.id)
                    }}
                    className="flex-shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {visibleAlerts.length > 10 && (
              <p className="text-center text-sm text-gray-500 pt-2">+{visibleAlerts.length - 10} alertas más</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
