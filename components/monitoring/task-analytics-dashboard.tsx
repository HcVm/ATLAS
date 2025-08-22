"use client"

import { useState, useEffect } from "react"
import { useCompany } from "@/lib/company-context"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { TrendingUp, TrendingDown, Users, Target, AlertTriangle, CheckCircle, BarChart3, Calendar } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface AnalyticsData {
  totalEmployees: number
  totalTasks: number
  completedTasks: number
  overdueTasks: number
  avgCompletionRate: number
  avgTasksPerEmployee: number
  productivityTrend: number
  topPerformers: Array<{
    id: string
    name: string
    completionRate: number
    tasksCompleted: number
  }>
  departmentStats: Array<{
    department: string
    employees: number
    completionRate: number
    totalTasks: number
  }>
  dailyStats: Array<{
    date: string
    tasksCreated: number
    tasksCompleted: number
    completionRate: number
  }>
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

      console.log("[v0] Loading analytics for company:", selectedCompany?.id)

      const { data: employees, error: employeesError } = await supabase
        .from("profiles")
        .select(`
          id, 
          full_name, 
          department_id,
          departments!profiles_department_id_fkey (
            id,
            name,
            color
          )
        `)
        .eq("company_id", selectedCompany?.id)
        .in("role", ["user", "supervisor"])

      if (employeesError) {
        console.error("[v0] Error loading employees:", employeesError)
        throw employeesError
      }

      console.log("[v0] Loaded employees:", employees?.length)

      const { data: tasksData, error: tasksError } = await supabase
        .from("tasks")
        .select(`
          id,
          title,
          status,
          priority,
          due_time,
          completed_at,
          created_at,
          board_id,
          task_boards!tasks_board_id_fkey (
            id,
            user_id,
            board_date,
            company_id,
            created_at
          )
        `)
        .not("task_boards", "is", null)
        .order("created_at", { ascending: false })

      if (tasksError) {
        console.error("[v0] Error loading tasks:", tasksError)
        throw tasksError
      }

      const companyTasks = tasksData?.filter((task) => task.task_boards?.company_id === selectedCompany?.id) || []

      console.log("[v0] ALL Tasks from DB:", {
        totalTasks: tasksData?.length,
        companyTasks: companyTasks.length,
        sampleTasks: companyTasks.slice(0, 5).map((task) => ({
          id: task.id,
          title: task.title,
          status: task.status,
          board_id: task.board_id,
          board_date: task.task_boards?.board_date,
          user_id: task.task_boards?.user_id,
        })),
      })

      const allTasks =
        companyTasks?.map((task) => ({
          id: task.id,
          title: task.title || "Sin título",
          status: task.status || "pending",
          priority: task.priority || "media",
          due_time: task.due_time,
          completed_at: task.completed_at,
          created_at: task.created_at,
          user_id: task.task_boards?.user_id,
          board_date: task.task_boards?.board_date,
        })) || []

      console.log("[v0] PROCESSED TASKS (filtered by company):", {
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
        })),
      })

      const completedTasks = allTasks.filter((task) => task.status === "completed")
      const overdueTasks = allTasks.filter((task) => {
        if (!task.due_time || task.status === "completed") return false

        const now = new Date()
        const taskDate = new Date(task.board_date + "T" + task.due_time)

        return taskDate < now
      })

      const avgCompletionRate = allTasks.length > 0 ? (completedTasks.length / allTasks.length) * 100 : 0

      const userStats =
        employees?.map((employee) => {
          const userTasks = allTasks.filter((task) => task.user_id === employee.id)
          const userCompleted = userTasks.filter((task) => task.status === "completed")
          const completionRate = userTasks.length > 0 ? (userCompleted.length / userTasks.length) * 100 : 0

          return {
            id: employee.id,
            name: employee.full_name,
            completionRate,
            tasksCompleted: userCompleted.length,
            totalTasks: userTasks.length,
          }
        }) || []

      const topPerformers = userStats
        .filter((user) => user.totalTasks > 0)
        .sort((a, b) => b.completionRate - a.completionRate)
        .slice(0, 5)

      const departmentMap = new Map()
      employees?.forEach((emp) => {
        if (emp.departments) {
          departmentMap.set(emp.department_id, emp.departments.name)
        }
      })

      const departments = [...new Set(employees?.map((emp) => emp.department_id).filter(Boolean))]
      const departmentStats = departments.map((deptId) => {
        const deptEmployees = employees?.filter((emp) => emp.department_id === deptId) || []
        const deptTasks = allTasks.filter((task) => deptEmployees.some((emp) => emp.id === task.user_id))
        const deptCompleted = deptTasks.filter((task) => task.status === "completed")
        const completionRate = deptTasks.length > 0 ? (deptCompleted.length / deptTasks.length) * 100 : 0

        return {
          department: departmentMap.get(deptId) || "Sin departamento",
          employees: deptEmployees.length,
          completionRate,
          totalTasks: deptTasks.length,
        }
      })

      const dailyStats = []
      const today = new Date()

      for (let i = 6; i >= 0; i--) {
        const date = new Date(today)
        date.setDate(date.getDate() - i)
        const dateStr = format(date, "yyyy-MM-dd")

        const dayTasks = allTasks.filter((task) => task.board_date === dateStr)
        const dayCompleted = dayTasks.filter((task) => task.status === "completed")

        dailyStats.push({
          date: dateStr,
          tasksCreated: dayTasks.length,
          tasksCompleted: dayCompleted.length,
          completionRate: dayTasks.length > 0 ? (dayCompleted.length / dayTasks.length) * 100 : 0,
        })
      }

      const midPoint = Math.floor(dailyStats.length / 2)
      const recentStats = dailyStats.slice(midPoint)
      const olderStats = dailyStats.slice(0, midPoint)

      const recentAvg =
        recentStats.length > 0 ? recentStats.reduce((sum, day) => sum + day.completionRate, 0) / recentStats.length : 0
      const olderAvg =
        olderStats.length > 0 ? olderStats.reduce((sum, day) => sum + day.completionRate, 0) / olderStats.length : 0
      const productivityTrend = recentAvg - olderAvg

      console.log("[v0] Analytics calculated successfully:", {
        totalTasks: allTasks.length,
        completedTasks: completedTasks.length,
        overdueTasks: overdueTasks.length,
        avgCompletionRate,
        topPerformers: topPerformers.length,
        departmentStats: departmentStats.length,
        dailyStatsCount: dailyStats.length,
        departmentDetails: departmentStats.map((d) => ({
          name: d.department,
          tasks: d.totalTasks,
          rate: d.completionRate,
        })),
      })

      setAnalytics({
        totalEmployees: employees?.length || 0,
        totalTasks: allTasks.length,
        completedTasks: completedTasks.length,
        overdueTasks: overdueTasks.length,
        avgCompletionRate,
        avgTasksPerEmployee: employees?.length ? allTasks.length / employees.length : 0,
        productivityTrend,
        topPerformers,
        departmentStats,
        dailyStats,
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
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Selecciona una empresa para ver los análisis</p>
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
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
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
          <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No se pudieron cargar los datos de análisis</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Análisis de Rendimiento</h3>
          <p className="text-sm text-gray-600">Métricas y tendencias de productividad</p>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Empleados</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.totalEmployees}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Tareas</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.totalTasks}</p>
                <p className="text-xs text-gray-500">{analytics.avgTasksPerEmployee.toFixed(1)} por empleado</p>
              </div>
              <Target className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Tasa de Completado</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.avgCompletionRate.toFixed(1)}%</p>
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
                <p className="text-sm font-medium text-gray-600">Tendencia</p>
                <div className="flex items-center space-x-1">
                  <p className="text-2xl font-bold text-gray-900">
                    {Math.abs(analytics.productivityTrend).toFixed(1)}%
                  </p>
                  {analytics.productivityTrend >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                </div>
                <p className="text-xs text-gray-500">{analytics.productivityTrend >= 0 ? "Mejorando" : "Declinando"}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {analytics.overdueTasks > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <p className="font-medium text-red-800">{analytics.overdueTasks} tareas vencidas requieren atención</p>
                <p className="text-sm text-red-600">
                  Revisa las tareas pendientes para evitar retrasos en los proyectos
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Mejores Desempeños
            </CardTitle>
            <CardDescription>Empleados con mayor tasa de completado</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {analytics.topPerformers.map((performer, index) => (
              <div key={performer.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{performer.name}</p>
                    <p className="text-sm text-gray-600">{performer.tasksCompleted} tareas completadas</p>
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
              <p className="text-center text-gray-500 py-4">No hay datos suficientes para mostrar</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Rendimiento por Departamento
            </CardTitle>
            <CardDescription>Comparación de productividad entre departamentos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {analytics.departmentStats.map((dept) => (
              <div key={dept.department} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{dept.department}</p>
                    <p className="text-sm text-gray-600">
                      {dept.employees} empleados • {dept.totalTasks} tareas
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
              <p className="text-center text-gray-500 py-4">No hay departamentos configurados</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Tendencia Diaria
          </CardTitle>
          <CardDescription>Evolución de la productividad en el período seleccionado</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analytics.dailyStats.map((day) => (
              <div key={day.date} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">
                    {format(new Date(day.date), "EEEE, dd MMM", { locale: es })}
                  </p>
                  <p className="text-sm text-gray-600">
                    {day.tasksCompleted}/{day.tasksCreated} tareas completadas
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
