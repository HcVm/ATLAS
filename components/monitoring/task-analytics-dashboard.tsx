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
  Activity
} from "lucide-react"
import { subDays, format } from "date-fns"
import { es } from "date-fns/locale"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  Legend
} from "recharts"

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
    formattedDate?: string
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

const renderGradients = () => (
  <defs>
    <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1} />
    </linearGradient>
    <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%" stopColor="#10B981" stopOpacity={0.8} />
      <stop offset="95%" stopColor="#10B981" stopOpacity={0.1} />
    </linearGradient>
  </defs>
)

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/60 dark:border-slate-800/60 rounded-xl p-3 shadow-xl">
        <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-xs mb-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
            <span className="text-slate-500 dark:text-slate-400">{entry.name}:</span>
            <span className="font-bold text-slate-700 dark:text-slate-300">{entry.value}</span>
          </div>
        ))}
      </div>
    )
  }
  return null
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
            tasks!tasks_board_id_fkey(
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

      if (employeesError) throw employeesError
      if (boardsError) throw boardsError

      const filteredBoardsData =
        boardsData?.filter((board) => {
          const boardCompanyId = board.company_id || board.user_profile?.company_id
          return boardCompanyId === selectedCompany?.id
        }) || []

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
      const uniqueBoardDates = [...new Set(filteredBoardsData?.map((board) => board.board_date).filter(Boolean))]
        .sort()
        .slice(-7)

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
        
        const dateObj = new Date(dateStr)
        const formattedDate = format(dateObj, "d MMM", { locale: es })

        dailyStats.push({
          date: dateStr,
          formattedDate,
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
      <Card className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-slate-200/60 dark:border-slate-800/60">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="h-8 w-8 text-slate-400 dark:text-slate-500" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Sin Empresa Seleccionada</h3>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Selecciona una empresa para ver los análisis de rendimiento</p>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse"></div>
        ))}
      </div>
    )
  }

  if (!analytics) {
    return (
      <Card className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-slate-200/60 dark:border-slate-800/60">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-8 w-8 text-red-400 dark:text-red-500" />
          </div>
          <p className="text-slate-500 dark:text-slate-400">No se pudieron cargar los datos de análisis</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold bg-gradient-to-r from-slate-800 via-slate-600 to-slate-500 dark:from-white dark:via-slate-200 dark:to-slate-400 bg-clip-text text-transparent flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-500" />
            Análisis de Rendimiento
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Métricas de productividad y eficiencia del equipo
          </p>
        </div>
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-full sm:w-40 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-slate-200/60 dark:border-slate-800/60">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Esta semana</SelectItem>
            <SelectItem value="month">Último mes</SelectItem>
            <SelectItem value="quarter">Último trimestre</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-white/60 dark:bg-slate-950/60 backdrop-blur-xl border-slate-200/60 dark:border-slate-800/60 shadow-lg hover:shadow-xl transition-all duration-300 group">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Empleados</p>
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{analytics.totalEmployees}</p>
              </div>
              <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-xl group-hover:scale-110 transition-transform">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/60 dark:bg-slate-950/60 backdrop-blur-xl border-slate-200/60 dark:border-slate-800/60 shadow-lg hover:shadow-xl transition-all duration-300 group">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Tareas</p>
                <div className="flex items-baseline gap-2 mt-1">
                   <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{analytics.totalTasks}</p>
                   <p className="text-xs text-slate-400">~{analytics.avgTasksPerEmployee.toFixed(0)}/emp</p>
                </div>
              </div>
              <div className="p-2.5 bg-purple-50 dark:bg-purple-900/20 rounded-xl group-hover:scale-110 transition-transform">
                <Target className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/60 dark:bg-slate-950/60 backdrop-blur-xl border-slate-200/60 dark:border-slate-800/60 shadow-lg hover:shadow-xl transition-all duration-300 group">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Completado</p>
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">
                  {analytics.avgCompletionRate.toFixed(0)}%
                </p>
              </div>
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl group-hover:scale-110 transition-transform">
                <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <Progress value={analytics.avgCompletionRate} className="h-1.5" />
          </CardContent>
        </Card>

        <Card className="bg-white/60 dark:bg-slate-950/60 backdrop-blur-xl border-slate-200/60 dark:border-slate-800/60 shadow-lg hover:shadow-xl transition-all duration-300 group">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Tiempo Promedio</p>
                <div className="flex items-baseline gap-1 mt-1">
                   <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{analytics.avgCompletionTime.toFixed(1)}</p>
                   <span className="text-xs text-slate-500">hrs</span>
                </div>
              </div>
              <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl group-hover:scale-110 transition-transform">
                <Clock className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/60 dark:bg-slate-950/60 backdrop-blur-xl border-slate-200/60 dark:border-slate-800/60 shadow-lg hover:shadow-xl transition-all duration-300 group">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Tendencia</p>
                <div className="flex items-center gap-2 mt-1">
                   <p className={`text-2xl font-bold ${analytics.productivityTrend >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {Math.abs(analytics.productivityTrend).toFixed(1)}%
                  </p>
                  {analytics.productivityTrend >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                </div>
              </div>
              <div className="p-2.5 bg-orange-50 dark:bg-orange-900/20 rounded-xl group-hover:scale-110 transition-transform">
                <BarChart3 className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Trend Chart */}
        <Card className="lg:col-span-2 bg-white/50 dark:bg-slate-950/50 backdrop-blur-xl border-slate-200/60 dark:border-slate-800/60 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
              <Calendar className="h-5 w-5 text-blue-500" />
              Productividad Diaria
            </CardTitle>
            <CardDescription>Tareas creadas vs completadas en los últimos 7 días</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
             <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.dailyStats} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  {renderGradients()}
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" vertical={false} />
                  <XAxis 
                    dataKey="formattedDate" 
                    tick={{ fill: '#94a3b8', fontSize: 12 }} 
                    axisLine={false} 
                    tickLine={false} 
                    dy={10}
                  />
                  <YAxis 
                    tick={{ fill: '#94a3b8', fontSize: 12 }} 
                    axisLine={false} 
                    tickLine={false} 
                    dx={-10}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="tasksCreated" 
                    name="Tareas Creadas"
                    stroke="#3B82F6" 
                    strokeWidth={2} 
                    fillOpacity={1} 
                    fill="url(#colorTasks)" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="tasksCompleted" 
                    name="Completadas"
                    stroke="#10B981" 
                    strokeWidth={2} 
                    fillOpacity={1} 
                    fill="url(#colorCompleted)" 
                  />
                  <Legend iconType="circle" />
                </AreaChart>
             </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Performers List */}
        <Card className="bg-white/50 dark:bg-slate-950/50 backdrop-blur-xl border-slate-200/60 dark:border-slate-800/60 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
              <Award className="h-5 w-5 text-yellow-500" />
              Top Desempeño
            </CardTitle>
            <CardDescription>Empleados con mayor eficiencia</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {analytics.topPerformers.map((performer, index) => (
              <div
                key={performer.id}
                className="flex items-center justify-between p-3 bg-white/40 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-white/60 dark:hover:bg-slate-900/60 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                    index === 0 ? "bg-yellow-100 text-yellow-700" :
                    index === 1 ? "bg-slate-100 text-slate-700" :
                    index === 2 ? "bg-orange-100 text-orange-700" :
                    "bg-slate-50 text-slate-500"
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{performer.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {performer.tasksCompleted} tareas
                    </p>
                  </div>
                </div>
                <div className="text-right">
                   <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                      {performer.completionRate.toFixed(0)}%
                   </Badge>
                </div>
              </div>
            ))}
            {analytics.topPerformers.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                 No hay datos suficientes
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Secondary Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Department */}
        <Card className="bg-white/50 dark:bg-slate-950/50 backdrop-blur-xl border-slate-200/60 dark:border-slate-800/60 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
              <Building className="h-5 w-5 text-indigo-500" />
              Por Departamento
            </CardTitle>
            <CardDescription>Eficiencia por área</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             {analytics.departmentStats.map((dept) => (
               <div key={dept.department} className="space-y-2">
                 <div className="flex justify-between text-sm">
                    <span className="font-medium text-slate-700 dark:text-slate-300">{dept.department}</span>
                    <span className="text-slate-500">{dept.completionRate.toFixed(1)}%</span>
                 </div>
                 <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500 rounded-full" 
                      style={{ width: `${dept.completionRate}%` }}
                    />
                 </div>
               </div>
             ))}
          </CardContent>
        </Card>

        {/* Alerts & Warnings */}
        <div className="space-y-4">
           {analytics.weeklyComparison.lastWeek > 0 && (
            <Card className={`border-l-4 shadow-sm ${
                analytics.weeklyComparison.improvement >= 0
                  ? "border-l-green-500 bg-green-50/50 dark:bg-green-900/10"
                  : "border-l-orange-500 bg-orange-50/50 dark:bg-orange-900/10"
              }`}>
              <CardContent className="p-4 flex items-center gap-4">
                 <div className={`p-2 rounded-full ${
                    analytics.weeklyComparison.improvement >= 0 ? "bg-green-100 text-green-600" : "bg-orange-100 text-orange-600"
                 }`}>
                    {analytics.weeklyComparison.improvement >= 0 ? <TrendingUp className="h-5 w-5"/> : <TrendingDown className="h-5 w-5"/>}
                 </div>
                 <div>
                    <h4 className="font-semibold text-slate-800 dark:text-slate-200">
                       {analytics.weeklyComparison.improvement >= 0 ? "Mejora de Productividad" : "Disminución de Productividad"}
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                       {Math.abs(analytics.weeklyComparison.improvement).toFixed(1)}% respecto a la semana anterior
                    </p>
                 </div>
              </CardContent>
            </Card>
           )}

           {analytics.overdueTasks > 0 && (
            <Card className="border-l-4 border-l-red-500 bg-red-50/50 dark:bg-red-900/10 shadow-sm">
              <CardContent className="p-4 flex items-center gap-4">
                 <div className="p-2 rounded-full bg-red-100 text-red-600">
                    <AlertTriangle className="h-5 w-5"/>
                 </div>
                 <div>
                    <h4 className="font-semibold text-red-800 dark:text-red-200">
                       {analytics.overdueTasks} Tareas Vencidas
                    </h4>
                    <p className="text-sm text-red-600 dark:text-red-300">
                       Requieren atención inmediata para evitar retrasos
                    </p>
                 </div>
              </CardContent>
            </Card>
           )}
        </div>
      </div>
    </div>
  )
}
