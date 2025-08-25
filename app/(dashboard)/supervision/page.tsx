"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { useCompany } from "@/lib/company-context"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CalendarDays, Clock, CheckCircle, AlertCircle, Users, Search } from "lucide-react"
import { formatDateShort } from "@/lib/date-utils"
import { TaskAssignmentModal } from "@/components/task-assignment-modal"
import { TaskAnalyticsDashboard } from "@/components/monitoring/task-analytics-dashboard"
import { RealTimeAlerts } from "@/components/monitoring/real-time-alerts"

interface Employee {
  id: string
  full_name: string
  email: string
  role: string
  department_id: string
  avatar_url?: string
}

interface TaskBoard {
  id: string
  title: string
  description: string
  created_at: string
  user_id: string
  company_id: string
  user_profile: {
    full_name: string
    email: string
    role: string
    company_id: string
  }
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
  created_at: string
}

export default function SupervisionPage() {
  const { user } = useAuth()
  const { selectedCompany } = useCompany()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [taskBoards, setTaskBoards] = useState<TaskBoard[]>([])
  const [filteredBoards, setFilteredBoards] = useState<TaskBoard[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [loading, setLoading] = useState(true)
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false)
  const [selectedEmployeeForAssignment, setSelectedEmployeeForAssignment] = useState<string>("")
  const [selectedBoardForAssignment, setSelectedBoardForAssignment] = useState<string>("")
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const router = useRouter()

  useEffect(() => {
    if (user && selectedCompany) {
      loadEmployeesAndBoards()
    }
  }, [user, selectedCompany])

  const loadEmployeesAndBoards = async () => {
    try {
      setLoading(true)

      console.log("Loading supervision data for company:", selectedCompany?.id)

      const [employeesResult, boardsResult] = await Promise.all([
        // Load employees from the same company
        supabase
          .from("profiles")
          .select("id, full_name, email, role, department_id")
          .eq("company_id", selectedCompany?.id)
          .in("role", ["user", "supervisor"])
          .order("full_name"),

        // Enhanced query to get boards either by company_id or by user's company_id
        supabase
          .from("task_boards")
          .select(`
            id,
            title,
            description,
            created_at,
            user_id,
            company_id,
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
              created_at
            )
          `)
          .order("created_at", { ascending: false }),
      ])

      const { data: employeesData, error: employeesError } = employeesResult
      const { data: boardsData, error: boardsError } = boardsResult

      if (employeesError) {
        console.error("Error loading employees:", employeesError)
        throw employeesError
      }

      if (boardsError) {
        console.error("Error loading boards:", boardsError)
        throw boardsError
      }

      console.log("Raw boards loaded:", boardsData?.length)
      console.log("Sample board data:", boardsData?.[0])

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

      console.log("Loaded employees:", employeesData?.length)
      console.log("Filtered boards:", filteredBoardsData.length)
      console.log("Company ID used for filtering:", selectedCompany?.id)

      setEmployees(employeesData || [])
      setTaskBoards(filteredBoardsData)
      setFilteredBoards(filteredBoardsData)
    } catch (error) {
      console.error("Error loading supervision data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let filtered = taskBoards

    console.log("Filtering boards. Total boards:", taskBoards.length)
    console.log("Selected employee:", selectedEmployee)
    console.log("Search term:", searchTerm)
    console.log("Status filter:", statusFilter)

    if (selectedEmployee !== "all") {
      filtered = filtered.filter((board) => board.user_id === selectedEmployee)
      console.log("After employee filter:", filtered.length)
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (board) =>
          board.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          board.user_profile.full_name.toLowerCase().includes(searchTerm.toLowerCase()),
      )
      console.log("After search filter:", filtered.length)
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((board) => {
        const taskStatuses = board.tasks.map((task) => task.status)
        switch (statusFilter) {
          case "pending":
            return taskStatuses.includes("pending")
          case "in_progress":
            return taskStatuses.includes("in_progress")
          case "completed":
            return taskStatuses.includes("completed")
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

      console.log("After status filter:", filtered.length)
    }

    console.log("Final filtered boards:", filtered.length)
    setFilteredBoards(filtered)
  }, [taskBoards, selectedEmployee, searchTerm, statusFilter])

  const getTaskStats = (tasks: Task[]) => {
    const total = tasks.length
    const completed = tasks.filter((task) => task.status === "completed").length
    const pending = tasks.filter((task) => task.status === "pending").length
    const inProgress = tasks.filter((task) => task.status === "in_progress").length
    const overdue = tasks.filter((task) => {
      if (!task.due_time || task.status === "completed") return false

      // Create date objects in local timezone
      const now = new Date()
      const taskDate = new Date(task.created_at.split("T")[0])
      const [hours, minutes] = task.due_time.split(":").map(Number)
      taskDate.setHours(hours, minutes, 0, 0)

      return taskDate < now
    }).length

    return { total, completed, pending, inProgress, overdue }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
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

  const handleAssignTask = (employeeId: string, boardId?: string) => {
    setSelectedEmployeeForAssignment(employeeId)
    setSelectedBoardForAssignment(boardId || "")
    setIsAssignmentModalOpen(true)
  }

  const handleTaskAssigned = () => {
    // Reload boards to show updated data
    loadEmployeesAndBoards()
    // Trigger refresh for monitoring components
    setRefreshTrigger((prev) => prev + 1)
  }

  const handleAlertClick = (alert: any) => {
    if (alert.employee) {
      // Navigate to employee detail or open assignment modal
      if (alert.type === "overdue" || alert.type === "high_workload") {
        handleAssignTask(alert.employee.id, alert.data?.boardId)
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Supervisión de Tareas</h1>
            <p className="text-gray-600">Monitorea y gestiona las tareas de todos los empleados</p>
          </div>
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium">{employees.length} Empleados</span>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Vista General</TabsTrigger>
          <TabsTrigger value="boards">Pizarrones</TabsTrigger>
          <TabsTrigger value="analytics">Análisis</TabsTrigger>
          <TabsTrigger value="alerts">Alertas</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <TaskAnalyticsDashboard refreshTrigger={refreshTrigger} />
            </div>
            <div>
              <RealTimeAlerts refreshTrigger={refreshTrigger} onAlertClick={handleAlertClick} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="boards" className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nombre de empleado o título de pizarrón..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filtrar por empleado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los empleados</SelectItem>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="pending">Pendientes</SelectItem>
                <SelectItem value="in_progress">En progreso</SelectItem>
                <SelectItem value="completed">Completadas</SelectItem>
                <SelectItem value="overdue">Vencidas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredBoards.map((board) => {
              const stats = getTaskStats(board.tasks)
              return (
                <Card key={board.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={board.user_profile.avatar_url || "/placeholder.svg"} />
                          <AvatarFallback>
                            {board.user_profile.full_name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-lg">{board.title}</CardTitle>
                          <CardDescription className="text-sm">
                            {board.user_profile.full_name} • {board.user_profile.role}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {formatDateShort(new Date(board.created_at))}
                      </Badge>
                    </div>
                    {board.description && <p className="text-sm text-gray-600 mt-2">{board.description}</p>}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span>
                          {stats.completed}/{stats.total} Completadas
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-blue-600" />
                        <span>{stats.inProgress} En progreso</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CalendarDays className="h-4 w-4 text-yellow-600" />
                        <span>{stats.pending} Pendientes</span>
                      </div>
                      {stats.overdue > 0 && (
                        <div className="flex items-center space-x-2">
                          <AlertCircle className="h-4 w-4 text-red-600" />
                          <span>{stats.overdue} Vencidas</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-gray-700">Tareas recientes:</h4>
                      {board.tasks.slice(0, 3).map((task) => (
                        <div key={task.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge className={`text-xs ${getStatusColor(task.status)}`}>
                                {task.status === "pending"
                                  ? "Pendiente"
                                  : task.status === "in_progress"
                                    ? "En progreso"
                                    : "Completada"}
                              </Badge>
                              <Badge className={`text-xs ${getPriorityColor(task.priority)}`}>
                                {task.priority === "high" ? "Alta" : task.priority === "medium" ? "Media" : "Baja"}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                      {board.tasks.length > 3 && (
                        <p className="text-xs text-gray-500">+{board.tasks.length - 3} tareas más</p>
                      )}
                    </div>

                    <div className="flex space-x-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 bg-transparent"
                        onClick={() => router.push(`/supervision/employee/${board.user_id}`)}
                      >
                        Ver Detalles
                      </Button>
                      <Button size="sm" className="flex-1" onClick={() => handleAssignTask(board.user_id, board.id)}>
                        Asignar Tarea
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {filteredBoards.length === 0 && (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron pizarrones</h3>
              <p className="text-gray-600">
                {searchTerm || selectedEmployee !== "all" || statusFilter !== "all"
                  ? "Intenta ajustar los filtros para ver más resultados."
                  : "Los empleados aún no han creado pizarrones de tareas."}
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics">
          <TaskAnalyticsDashboard refreshTrigger={refreshTrigger} />
        </TabsContent>

        <TabsContent value="alerts">
          <RealTimeAlerts refreshTrigger={refreshTrigger} onAlertClick={handleAlertClick} />
        </TabsContent>
      </Tabs>

      <TaskAssignmentModal
        isOpen={isAssignmentModalOpen}
        onClose={() => setIsAssignmentModalOpen(false)}
        selectedEmployeeId={selectedEmployeeForAssignment}
        selectedBoardId={selectedBoardForAssignment}
        onTaskAssigned={handleTaskAssigned}
      />
    </div>
  )
}
