"use client"

import { useState, useEffect } from "react"
import { useCompany } from "@/lib/company-context"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import {
  TrendingUp,
  TrendingDown,
  Users,
  Target,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Calendar,
  Clock,
  Award,
  Building,
} from "lucide-react"
import { subDays } from "date-fns"

interface AnalyticsData {
  totalEmployees: number
  totalTasks: number
  completedTasks: number
  overdueTasks: number
  avgCompletionRate: number
  avgTasksPerEmployee: number
  productivityTrend: number
  avgCompletionTime: number
  topPerformers: Array<{
    id: string
    name: string
    role: string
    department: string
    completionRate: number
    tasksCompleted: number
    totalTasks: number
    avgCompletionTime: number
  }>
  departmentStats: Array<{
    department: string
    employees: number
    completionRate: number
    totalTasks: number
    avgCompletionTime: number
  }>
  roleStats: Array<{
    role: string
    employees: number
    completionRate: number
    totalTasks: number
  }>
  dailyStats: Array<{
    date: string
    tasksCreated: number
    tasksCompleted: number
    completionRate: number
    employeesActive: number
  }>
  weeklyComparison: {
    thisWeek: number
    lastWeek: number
    improvement: number
  }
}

interface TaskAnalyticsDashboardProps {
  dateRange?: string
  refreshTrigger?: number
}

export function TaskAnalyticsDashboard({ dateRange = "week", refreshTrigger }: TaskAnalyticsDashboardProps) {
  const { selectedCompany } = useCompany()
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState(dateRange)

  useEffect(() => {
    if (selectedCompany?.id) {
      loadAnalytics()
    } else {
      setLoading(false)
      setAnalytics(null)
    }
  }, [selectedCompany, selectedPeriod, refreshTrigger])

  const loadAnalytics = async () => {
    try {
      setLoading(true)

      console.log("[v0] Loading enhanced analytics for company:", selectedCompany?.id)

      const [employeesResult, boardsResult] = await Promise.all([
        supabase
          .from("profiles")
          .select(`
            id, 
            full_name, 
            role,
            department_id,
            created_at,
            departments!profiles_department_id_fkey (
              id,
              name,
              color
            )
          `)
          .eq("company_id", selectedCompany?.id)
          .in("role", ["user", "supervisor"])
          .order("full_name"),

        supabase
          .from("task_boards")
          .select(`
            id,
            title,
            description,
            created_at,
            user_id,
            company_id,
            board_date,
            user_profile:profiles!task_boards_user_id_fkey(
              full_name, 
              email, 
              role, 
              company_id
            ),
            tasks(
              id,
              title,
              description,
              status,
              priority,
              due_time,
              estimated_time,
              created_at,
              completed_at
            )
          `)
          .order("created_at", { ascending: false }),
      ])

      const { data: employeesData, error: employeesError } = employeesResult
      const { data: boardsData, error: boardsError } = boardsResult

      if (employeesError) {
        console.error("[v0] Error loading employees:", employeesError)
        throw employeesError
      }

      if (boardsError) {
        console.error("[v0] Error loading boards:", boardsError)
        throw boardsError
      }

      console.log("[v0] Raw boards loaded:", boardsData?.length)
      console.log("[v0] Sample board data:", boardsData?.[0])

      const filteredBoardsData =
        boardsData?.filter((board) => {
          const boardCompanyId = board.company_id || board.user_profile?.company_id
          const matches = boardCompanyId === selectedCompany?.id

          console.log("[v0] Board filter check:", {
            boardId: board.id,
            boardTitle: board.title,
            boardCompanyId: board.company_id,
            userCompanyId: board.user_profile?.company_id,
            selectedCompanyId: selectedCompany?.id,
            matches,
          })

          return matches
        }) || []

      console.log("[v0] Loaded employees:", employeesData?.length)
      console.log("[v0] Filtered boards:", filteredBoardsData.length)
      console.log("[v0] Company ID used for filtering:", selectedCompany?.id)

      const allTasks =
        filteredBoardsData?.flatMap((board) =>
          board.tasks.map((task) => ({
            id: task.id,
            title: task.title || "Sin título",
            status: task.status || "pending",
            priority: task.priority || "media",
            due_time: task.due_time,
            completed_at: task.completed_at,
            created_at: task.created_at,
            estimated_time: task.estimated_time,
            user_id: board.user_id,
            board_date: board.board_date,
            board_created_at: board.created_at,
            user_profile: board.user_profile,
          })),
        ) || []

      console.log("[v0] PROCESSED TASKS:", {
        totalTasks: allTasks.length,
        tasksByStatus: {
          completed: allTasks.filter((t) => t.status === "completed").length,
          pending: allTasks.filter((t) => t.status === "pending").length,
          in_progress: allTasks.filter((t) => t.status === "in_progress").length,
        },
        sampleTasks: allTasks.slice(0, 3).map((t) => ({
          title: t.title,
          status: t.status,
          board_date: t.board_date,
          user_id: t.user_id,
          user_name: t.user_profile?.full_name,
        })),
      })

      const completedTasks = allTasks.filter((task) => task.status === "completed")
      const overdueTasks = allTasks.filter((task) => {
        if (!task.due_time || task.status === "completed") return false

        const now = new Date()
        const taskDate = new Date(task.created_at.split("T")[0])
        const [hours, minutes] = task.due_time.split(":").map(Number)
        taskDate.setHours(hours, minutes, 0, 0)

        return taskDate < now
      })

      const avgCompletionRate = allTasks.length > 0 ? (completedTasks.length / allTasks.length) * 100 : 0

      const completedTasksWithTime = completedTasks.filter((task) => task.completed_at && task.created_at)
      const avgCompletionTime =
        completedTasksWithTime.length > 0
          ? completedTasksWithTime.reduce((sum, task) => {
              const created = new Date(task.created_at)
              const completed = new Date(task.completed_at!)
              return sum + (completed.getTime() - created.getTime()) / (1000 * 60 * 60)
            }, 0) / completedTasksWithTime.length
          : 0

      const userStats =
        employeesData?.map((employee) => {
          const userTasks = allTasks.filter((task) => task.user_id === employee.id)
          const userCompleted = userTasks.filter((task) => task.status === "completed")
          const completionRate = userTasks.length > 0 ? (userCompleted.length / userTasks.length) * 100 : 0

          const userCompletedWithTime = userCompleted.filter((task) => task.completed_at && task.created_at)
          const userAvgTime =
            userCompletedWithTime.length > 0
              ? userCompletedWithTime.reduce((sum, task) => {
                  const created = new Date(task.created_at)
                  const completed = new Date(task.completed_at!)
                  return sum + (completed.getTime() - created.getTime()) / (1000 * 60 * 60)
                }, 0) / userCompletedWithTime.length
              : 0

          return {
            id: employee.id,
            name: employee.full_name,
            role: employee.role,
            department: employee.departments?.name || "Sin departamento",
            completionRate,
            tasksCompleted: userCompleted.length,
            totalTasks: userTasks.length,
            avgCompletionTime: userAvgTime,
          }
        }) || []

      const topPerformers = userStats
        .filter((user) => user.totalTasks > 0)
        .sort((a, b) => {
          if (Math.abs(a.completionRate - b.completionRate) < 5) {
            return b.tasksCompleted - a.tasksCompleted
          }
          return b.completionRate - a.completionRate
        })
        .slice(0, 5)

      const departmentMap = new Map()
      employeesData?.forEach((emp) => {
        if (emp.departments) {
          departmentMap.set(emp.department_id, emp.departments.name)
        }
      })

      const departments = [...new Set(employeesData?.map((emp) => emp.department_id).filter(Boolean))]
      const departmentStats = departments.map((deptId) => {
        const deptEmployees = employeesData?.filter((emp) => emp.department_id === deptId) || []
        const deptTasks = allTasks.filter((task) => deptEmployees.some((emp) => emp.id === task.user_id))
        const deptCompleted = deptTasks.filter((task) => task.status === "completed")
        const completionRate = deptTasks.length > 0 ? (deptCompleted.length / deptTasks.length) * 100 : 0

        const deptCompletedWithTime = deptCompleted.filter((task) => task.completed_at && task.created_at)
        const deptAvgTime =
          deptCompletedWithTime.length > 0
            ? deptCompletedWithTime.reduce((sum, task) => {
                const created = new Date(task.created_at)
                const completed = new Date(task.completed_at!)
                return sum + (completed.getTime() - created.getTime()) / (1000 * 60 * 60)
              }, 0) / deptCompletedWithTime.length
            : 0

        return {
          department: departmentMap.get(deptId) || "Sin departamento",
          employees: deptEmployees.length,
          completionRate,
          totalTasks: deptTasks.length,
          avgCompletionTime: deptAvgTime,
        }
      })

      const roles = [...new Set(employeesData?.map((emp) => emp.role).filter(Boolean))]
      const roleStats = roles.map((role) => {
        const roleEmployees = employeesData?.filter((emp) => emp.role === role) || []
        const roleTasks = allTasks.filter((task) => roleEmployees.some((emp) => emp.id === task.user_id))
        const roleCompleted = roleTasks.filter((task) => task.status === "completed")
        const completionRate = roleTasks.length > 0 ? (roleCompleted.length / roleTasks.length) * 100 : 0

        return {
          role: role === "user" ? "Usuario" : role === "supervisor" ? "Supervisor" : role,
          employees: roleEmployees.length,
          completionRate,
          totalTasks: roleTasks.length,
        }
      })

      const dailyStats = []
      const today = new Date()

      const formatDatePeru = (date: Date | string): string => {
        const dateObj = typeof date === "string" ? new Date(date) : date
        return dateObj
          .toLocaleDateString("es-PE", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          })
          .split("/")
          .reverse()
          .join("-")
      }

      const formatDateDisplay = (dateString: string): string => {
        return new Date(dateString).toLocaleDateString("es-PE", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      }

      const uniqueBoardDates = [...new Set(filteredBoardsData?.map((board) => board.board_date).filter(Boolean))]
        .sort()
        .slice(-7)

      console.log("[v0] Unique board dates found:", uniqueBoardDates)

      for (const dateStr of uniqueBoardDates) {
        const dayBoards = filteredBoardsData?.filter((board) => board.board_date === dateStr) || []
        const dayTasks = dayBoards.flatMap((board) => board.tasks)

        const dayTasksCompleted = dayTasks.filter((task) => {
          if (task.status !== "completed" || !task.completed_at) return false
          const completedDate = new Date(task.completed_at)
            .toLocaleDateString("es-PE", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            })
            .split("/")
            .reverse()
            .join("-")
          return completedDate === dateStr
        })

        const activeEmployeeIds = new Set(dayBoards.map((board) => board.user_id))

        const completionRate = dayTasks.length > 0 ? (dayTasksCompleted.length / dayTasks.length) * 100 : 0

        console.log(`[v0] Daily stats for ${dateStr}:`, {
          dayBoards: dayBoards.length,
          dayTasks: dayTasks.length,
          dayTasksCompleted: dayTasksCompleted.length,
          activeEmployees: activeEmployeeIds.size,
          completionRate: completionRate.toFixed(1),
        })

        dailyStats.push({
          date: dateStr,
          tasksCreated: dayTasks.length,
          tasksCompleted: dayTasksCompleted.length,
          completionRate,
          employeesActive: activeEmployeeIds.size,
        })
      }

      const thisWeekTasks = allTasks.filter((task) => {
        const taskDate = new Date(task.created_at)
        const weekAgo = subDays(new Date(), 7)
        return taskDate >= weekAgo
      })

      const lastWeekTasks = allTasks.filter((task) => {
        const taskDate = new Date(task.created_at)
        const twoWeeksAgo = subDays(new Date(), 14)
        const weekAgo = subDays(new Date(), 7)
        return taskDate >= twoWeeksAgo && taskDate < weekAgo
      })

      const thisWeekCompleted = thisWeekTasks.filter((t) => t.status === "completed").length
      const lastWeekCompleted = lastWeekTasks.filter((t) => t.status === "completed").length

      const thisWeekRate = thisWeekTasks.length > 0 ? (thisWeekCompleted / thisWeekTasks.length) * 100 : 0
      const lastWeekRate = lastWeekTasks.length > 0 ? (lastWeekCompleted / lastWeekTasks.length) * 100 : 0

      const productivityTrend = thisWeekRate - lastWeekRate
      const improvement = lastWeekRate > 0 ? ((thisWeekRate - lastWeekRate) / lastWeekRate) * 100 : 0

      console.log("[v0] Enhanced analytics calculated successfully:", {
        totalTasks: allTasks.length,
        completedTasks: completedTasks.length,
        overdueTasks: overdueTasks.length,
        avgCompletionRate,
        avgCompletionTime,
        topPerformers: topPerformers.length,
        departmentStats: departmentStats.length,
        roleStats: roleStats.length,
        dailyStatsCount: dailyStats.length,
        thisWeekRate,
        lastWeekRate,
        productivityTrend,
      })

      setAnalytics({
        totalEmployees: employeesData?.length || 0,
        totalTasks: allTasks.length,
        completedTasks: completedTasks.length,
        overdueTasks: overdueTasks.length,
        avgCompletionRate,
        avgTasksPerEmployee: employeesData?.length ? allTasks.length / employeesData.length : 0,
        productivityTrend,
        avgCompletionTime,
        topPerformers,
        departmentStats,
        roleStats,
        dailyStats,
        weeklyComparison: {
          thisWeek: thisWeekRate,
          lastWeek: lastWeekRate,
          improvement,
        },
      })
    } catch (error) {
      console.error("[v0] Error loading analytics:", error)
      setAnalytics(null)
    } finally {
      setLoading(false)
    }
  }

  if (!selectedCompany?.id) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Users className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Selecciona una empresa para ver los análisis</p>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!analytics) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">No se pudieron cargar los datos de análisis</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Análisis de Rendimiento</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Métricas y tendencias de productividad</p>
        </div>
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Esta semana</SelectItem>
            <SelectItem value="month">Último mes</SelectItem>
            <SelectItem value="quarter">Último trimestre</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Empleados</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{analytics.totalEmployees}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Tareas</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{analytics.totalTasks}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {analytics.avgTasksPerEmployee.toFixed(1)} por empleado
                </p>
              </div>
              <Target className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Tasa de Completado</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {analytics.avgCompletionRate.toFixed(1)}%
                </p>
                <Progress value={analytics.avgCompletionRate} className="mt-2" />
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Tiempo Promedio</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {analytics.avgCompletionTime.toFixed(1)}h
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">para completar</p>
              </div>
              <Clock className="h-8 w-8 text-indigo-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Tendencia</p>
                <div className="flex items-center space-x-1">
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {Math.abs(analytics.productivityTrend).toFixed(1)}%
                  </p>
                  {analytics.productivityTrend >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {analytics.productivityTrend >= 0 ? "Mejorando" : "Declinando"}
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {analytics.weeklyComparison.lastWeek > 0 && (
        <Card
          className={`border-2 ${
            analytics.weeklyComparison.improvement >= 0
              ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20"
              : "border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20"
          }`}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {analytics.weeklyComparison.improvement >= 0 ? (
                  <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                ) : (
                  <TrendingDown className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                )}
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    Comparación Semanal: {analytics.weeklyComparison.improvement >= 0 ? "Mejora" : "Declive"} del{" "}
                    {Math.abs(analytics.weeklyComparison.improvement).toFixed(1)}%
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Esta semana: {analytics.weeklyComparison.thisWeek.toFixed(1)}% vs Semana pasada:{" "}
                    {analytics.weeklyComparison.lastWeek.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {analytics.overdueTasks > 0 && (
        <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              <div>
                <p className="font-medium text-red-800 dark:text-red-200">
                  {analytics.overdueTasks} tareas vencidas requieren atención
                </p>
                <p className="text-sm text-red-600 dark:text-red-300">
                  Revisa las tareas pendientes para evitar retrasos en los proyectos
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
              <Award className="h-5 w-5" />
              Mejores Desempeños
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Empleados con mayor tasa de completado
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {analytics.topPerformers.map((performer, index) => (
              <div
                key={performer.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 rounded-full text-sm font-medium">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{performer.name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {performer.role} • {performer.department}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {performer.tasksCompleted}/{performer.totalTasks} tareas •{" "}
                      {performer.avgCompletionTime.toFixed(1)}h promedio
                    </p>
                  </div>
                </div>
                <Badge
                  variant={
                    performer.completionRate >= 80
                      ? "default"
                      : performer.completionRate >= 60
                        ? "secondary"
                        : "destructive"
                  }
                >
                  {performer.completionRate.toFixed(1)}%
                </Badge>
              </div>
            ))}
            {analytics.topPerformers.length === 0 && (
              <p className="text-center text-gray-500 dark:text-gray-400 py-4">No hay datos suficientes para mostrar</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
              <Building className="h-5 w-5" />
              Por Departamento
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Comparación de productividad entre departamentos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {analytics.departmentStats.map((dept) => (
              <div key={dept.department} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{dept.department}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {dept.employees} empleados • {dept.totalTasks} tareas • {dept.avgCompletionTime.toFixed(1)}h
                      promedio
                    </p>
                  </div>
                  <Badge variant={dept.completionRate >= 80 ? "default" : "secondary"}>
                    {dept.completionRate.toFixed(1)}%
                  </Badge>
                </div>
                <Progress value={dept.completionRate} className="h-2" />
              </div>
            ))}
            {analytics.departmentStats.length === 0 && (
              <p className="text-center text-gray-500 dark:text-gray-400 py-4">No hay departamentos configurados</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
              <Users className="h-5 w-5" />
              Por Rol
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Rendimiento según el rol del empleado
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {analytics.roleStats.map((role) => (
              <div key={role.role} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{role.role}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {role.employees} empleados • {role.totalTasks} tareas
                    </p>
                  </div>
                  <Badge variant={role.completionRate >= 80 ? "default" : "secondary"}>
                    {role.completionRate.toFixed(1)}%
                  </Badge>
                </div>
                <Progress value={role.completionRate} className="h-2" />
              </div>
            ))}
            {analytics.roleStats.length === 0 && (
              <p className="text-center text-gray-500 dark:text-gray-400 py-4">No hay roles configurados</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
            <Calendar className="h-5 w-5" />
            Tendencia Diaria
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            Evolución de la productividad en el período seleccionado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analytics.dailyStats.map((day) => (
              <div
                key={day.date}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {new Date(day.date).toLocaleDateString("es-PE", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {day.tasksCompleted}/{day.tasksCreated} tareas completadas • {day.employeesActive} empleados activos
                  </p>
                </div>
                <div className="text-right">
                  <Badge
                    variant={
                      day.completionRate >= 80 ? "default" : day.completionRate >= 60 ? "secondary" : "destructive"
                    }
                  >
                    {day.completionRate.toFixed(1)}%
                  </Badge>
                  <Progress value={day.completionRate} className="w-20 h-2 mt-1" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
