"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { useCompany } from "@/lib/company-context"
import { supabase } from "@/lib/supabase"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CheckCircle, ArrowLeft, Calendar, Target, Timer, BarChart3, ChevronDown, ChevronUp } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { TaskAssignmentModal } from "@/components/task-assignment-modal"

interface Employee {
  id: string
  full_name: string
  email: string
  role: string // Changed from user_role to role
  department_id: string // Changed from department to department_id
  avatar_url?: string
  created_at: string
  company_id: string
}

interface TaskBoard {
  id: string
  title: string
  description: string
  board_date: string
  status: string
  created_at: string
  tasks: Task[]
}

interface Task {
  id: string
  title: string
  description: string
  status: string
  priority: string
  due_time: string
  estimated_time: number
  actual_time: number
  completed_at: string
  created_at: string
}

interface TaskStats {
  totalTasks: number
  completedTasks: number
  pendingTasks: number
  overdueTasks: number
  completionRate: number
  avgCompletionTime: number
  productivityTrend: number
}

export default function EmployeeDetailPage() {
  const { user } = useAuth()
  const { selectedCompany } = useCompany()
  const params = useParams()
  const router = useRouter()
  const employeeId = params.employee as string

  const [employee, setEmployee] = useState<Employee | null>(null)
  const [taskBoards, setTaskBoards] = useState<TaskBoard[]>([])
  const [filteredBoards, setFilteredBoards] = useState<TaskBoard[]>([])
  const [stats, setStats] = useState<TaskStats | null>(null)
  const [dateRange, setDateRange] = useState("week")
  const [statusFilter, setStatusFilter] = useState("all")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false)
  const [expandedBoards, setExpandedBoards] = useState<Set<string>>(new Set())

  useEffect(() => {
    console.log("[v0] useEffect triggered with:", { employeeId, selectedCompany, dateRange })

    if (!employeeId) {
      console.log("[v0] No employeeId provided")
      setError("ID de empleado no proporcionado")
      setLoading(false)
      return
    }

    if (selectedCompany === null) {
      console.log("[v0] No company selected")
      setError("No hay empresa seleccionada")
      setLoading(false)
      return
    }

    if (selectedCompany?.id) {
      loadEmployeeData()
    }
  }, [employeeId, selectedCompany, dateRange])

  useEffect(() => {
    console.log("[v0] Filtering boards with statusFilter:", statusFilter)
    filterBoards()
  }, [taskBoards, statusFilter])

  const loadEmployeeData = async () => {
    try {
      console.log("[v0] Starting loadEmployeeData...")
      setLoading(true)
      setError(null)

      console.log("[v0] Loading employee profile...")
      const { data: employeeData, error: employeeError } = await supabase
        .from("profiles")
        .select(`
          id,
          full_name,
          email,
          role,
          department_id,
          avatar_url,
          created_at,
          company_id
        `)
        .eq("id", employeeId)
        .single()

      console.log("[v0] Employee query result:", { employeeData, employeeError })

      if (employeeError) {
        console.error("[v0] Employee query error:", employeeError)
        throw new Error(`Error cargando empleado: ${employeeError.message}`)
      }

      if (!employeeData) {
        throw new Error("Empleado no encontrado")
      }

      if (selectedCompany?.id && employeeData.company_id !== selectedCompany.id) {
        throw new Error("El empleado no pertenece a tu empresa")
      }

      setEmployee(employeeData)
      console.log("[v0] Employee loaded successfully:", employeeData.full_name)

      const endDate = new Date()
      const startDate = new Date()

      switch (dateRange) {
        case "week":
          startDate.setDate(endDate.getDate() - 7)
          break
        case "month":
          startDate.setDate(endDate.getDate() - 30)
          break
        case "quarter":
          startDate.setDate(endDate.getDate() - 90)
          break
        default:
          startDate.setDate(endDate.getDate() - 7)
      }

      const startDateStr = format(startDate, "yyyy-MM-dd")
      const endDateStr = format(endDate, "yyyy-MM-dd")

      console.log("[v0] Loading task boards for date range:", { startDateStr, endDateStr })

      const { data: boardsData, error: boardsError } = await supabase
        .from("task_boards")
        .select(`
          id,
          title,
          description,
          board_date,
          status,
          created_at,
          tasks!tasks_board_id_fkey (
            id,
            title,
            description,
            status,
            priority,
            due_time,
            estimated_time,
            actual_time,
            completed_at,
            created_at
          )
        `)
        .eq("user_id", employeeId)
        .gte("board_date", startDateStr)
        .lte("board_date", endDateStr)
        .order("board_date", { ascending: false })

      console.log("[v0] Boards query result:", {
        boardsCount: boardsData?.length || 0,
        boardsError,
        firstBoard: boardsData?.[0],
      })

      if (boardsError) {
        console.error("[v0] Boards query error:", boardsError)
        throw new Error(`Error cargando pizarrones: ${boardsError.message}`)
      }

      const boards = boardsData || []
      setTaskBoards(boards)
      console.log("[v0] Task boards loaded:", boards.length)

      calculateStats(boards)
      console.log("[v0] Stats calculated successfully")
    } catch (error: any) {
      console.error("[v0] Error in loadEmployeeData:", error)
      setError(error.message || "Error cargando datos del empleado")
    } finally {
      setLoading(false)
      console.log("[v0] loadEmployeeData completed")
    }
  }

  const calculateStats = (boards: TaskBoard[]) => {
    const allTasks = boards.flatMap((board) => board.tasks)
    const completedTasks = allTasks.filter((task) => task.status === "completed")
    const pendingTasks = allTasks.filter((task) => task.status === "pending")
    const overdueTasks = allTasks.filter((task) => {
      if (!task.due_time || task.status === "completed") return false

      const now = new Date()
      const taskDate = new Date(task.created_at.split("T")[0])
      const [hours, minutes] = task.due_time.split(":").map(Number)
      taskDate.setHours(hours, minutes, 0, 0)

      return taskDate < now
    })

    const completionRate = allTasks.length > 0 ? (completedTasks.length / allTasks.length) * 100 : 0

    const avgCompletionTime =
      completedTasks.length > 0
        ? completedTasks.reduce((sum, task) => sum + (task.actual_time || task.estimated_time || 0), 0) /
          completedTasks.length
        : 0

    const midPoint = Math.floor(boards.length / 2)
    const recentBoards = boards.slice(0, midPoint)
    const olderBoards = boards.slice(midPoint)

    const recentCompletionRate =
      recentBoards.length > 0
        ? (recentBoards.flatMap((b) => b.tasks).filter((t) => t.status === "completed").length /
            recentBoards.flatMap((b) => b.tasks).length) *
          100
        : 0

    const olderCompletionRate =
      olderBoards.length > 0
        ? (olderBoards.flatMap((b) => b.tasks).filter((t) => t.status === "completed").length /
            olderBoards.flatMap((b) => b.tasks).length) *
          100
        : 0

    const productivityTrend = recentCompletionRate - olderCompletionRate

    setStats({
      totalTasks: allTasks.length,
      completedTasks: completedTasks.length,
      pendingTasks: pendingTasks.length,
      overdueTasks: overdueTasks.length,
      completionRate,
      avgCompletionTime,
      productivityTrend,
    })
  }

  const filterBoards = () => {
    let filtered = taskBoards

    if (statusFilter !== "all") {
      filtered = filtered.filter((board) => {
        const taskStatuses = board.tasks.map((task) => task.status)
        switch (statusFilter) {
          case "completed":
            return board.tasks.every((task) => task.status === "completed")
          case "pending":
            return taskStatuses.includes("pending")
          case "overdue":
            return board.tasks.some((task) => {
              if (!task.due_time || task.status === "completed") return false

              const now = new Date()
              const taskDate = new Date(task.created_at.split("T")[0])
              const [hours, minutes] = task.due_time.split(":").map(Number)
              taskDate.setHours(hours, minutes, 0, 0)

              return taskDate < now
            })
          default:
            return true
        }
      })
    }

    setFilteredBoards(filtered)
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-purple-100 text-purple-800"
      case "high":
        return "bg-red-100 text-red-800"
      case "medium":
        return "bg-yellow-100 text-yellow-800"
      case "low":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800"
      case "in_progress":
        return "bg-blue-100 text-blue-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const handleAssignTask = () => {
    setIsAssignmentModalOpen(true)
  }

  const handleTaskAssigned = () => {
    loadEmployeeData()
  }

  const toggleBoardExpansion = (boardId: string) => {
    const newExpanded = new Set(expandedBoards)
    if (newExpanded.has(boardId)) {
      newExpanded.delete(boardId)
    } else {
      newExpanded.add(boardId)
    }
    setExpandedBoards(newExpanded)
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => router.back()}>Volver</Button>
        </div>
      </div>
    )
  }

  if (loading || !selectedCompany) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando datos del empleado...</p>
        </div>
      </div>
    )
  }

  if (!employee) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Empleado no encontrado</h2>
          <p className="text-gray-600 mb-4">El empleado solicitado no existe o no tienes permisos para verlo.</p>
          <Button onClick={() => router.back()}>Volver</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <div className="flex items-center space-x-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={employee.avatar_url || "/placeholder.svg"} />
              <AvatarFallback>
                {employee.full_name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{employee.full_name}</h1>
              <p className="text-gray-600">
                {employee.role} • {employee.email}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button onClick={handleAssignTask}>
            <Target className="h-4 w-4 mr-2" />
            Asignar Tarea
          </Button>
          <Select value={dateRange} onValueChange={setDateRange}>
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
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total de Tareas</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalTasks}</p>
                </div>
                <Target className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Completadas</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.completedTasks}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pendientes</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.pendingTasks}</p>
                </div>
                <Timer className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Vencidas</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.overdueTasks}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="boards" className="space-y-4">
        <TabsList>
          <TabsTrigger value="boards">Pizarrones de Tareas ({filteredBoards.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="boards" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredBoards.map((board) => (
              <Card key={board.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">
                        Tareas del {format(new Date(board.board_date), "dd 'de' MMMM 'de' yyyy", { locale: es })}
                      </CardTitle>
                      <CardDescription>{board.title}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={board.status === "active" ? "default" : "secondary"}>
                        {board.status === "active" ? "Activo" : "Cerrado"}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleBoardExpansion(board.id)}
                        className="p-1 h-8 w-8"
                      >
                        {expandedBoards.has(board.id) ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="text-center">
                      <p className="font-medium text-gray-900">{board.tasks?.length || 0}</p>
                      <p className="text-gray-600">Total</p>
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-green-600">
                        {board.tasks?.filter((t) => t.status === "completed").length || 0}
                      </p>
                      <p className="text-gray-600">Completadas</p>
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-yellow-600">
                        {board.tasks?.filter((t) => t.status === "pending").length || 0}
                      </p>
                      <p className="text-gray-600">Pendientes</p>
                    </div>
                  </div>

                  {expandedBoards.has(board.id) && board.tasks && board.tasks.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-gray-700">Tareas:</h4>
                      {board.tasks.map((task) => (
                        <div key={task.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge className={`text-xs ${getStatusColor(task.status)}`}>
                                {task.status === "pending"
                                  ? "Pendiente"
                                  : task.status === "in_progress"
                                    ? "En progreso"
                                    : "Completada"}
                              </Badge>
                              {task.priority && (
                                <Badge className={`text-xs ${getPriorityColor(task.priority)}`}>
                                  {task.priority === "urgent"
                                    ? "Urgente"
                                    : task.priority === "high"
                                      ? "Alta"
                                      : task.priority === "medium"
                                        ? "Media"
                                        : "Baja"}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {filteredBoards.length === 0 && (
                    <div className="text-center py-12">
                      <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron pizarrones</h3>
                      <p className="text-gray-600">No hay pizarrones para el período seleccionado.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <TaskAssignmentModal
        isOpen={isAssignmentModalOpen}
        onClose={() => setIsAssignmentModalOpen(false)}
        selectedEmployeeId={employeeId}
        onTaskAssigned={handleTaskAssigned}
      />
    </div>
  )
}
