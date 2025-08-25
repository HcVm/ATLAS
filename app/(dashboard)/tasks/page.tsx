"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Calendar, Clock, Plus, CheckCircle, Circle, AlertCircle, XCircle, Users, Eye, Target, Zap } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { formatDateDisplay, formatDateLong, getCurrentDatePeru } from "@/lib/date-utils"

interface TaskBoard {
  id: string
  user_id: string
  board_date: string
  title: string
  description?: string
  status: "active" | "closed"
  closed_at?: string
  created_at: string
  updated_at: string
  user_profile?: {
    full_name: string
    email: string
  }
}

interface Task {
  id: string
  board_id: string
  title: string
  description?: string
  status: "pending" | "in_progress" | "completed" | "cancelled"
  priority: "low" | "medium" | "high" | "urgent"
  estimated_time?: number
  actual_time?: number
  assigned_by?: string
  created_by: string
  due_time?: string
  completed_at?: string
  position: number
  created_at: string
  updated_at: string
}

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  in_progress: "bg-blue-100 text-blue-800 border-blue-200",
  completed: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
}

const priorityColors = {
  low: "bg-gray-100 text-gray-800 border-gray-200",
  medium: "bg-orange-100 text-orange-800 border-orange-200",
  high: "bg-red-100 text-red-800 border-red-200",
  urgent: "bg-red-200 text-red-900 border-red-300",
}

const statusIcons = {
  pending: Circle,
  in_progress: Clock,
  completed: CheckCircle,
  cancelled: XCircle,
}

export default function TasksPage() {
  const { user, profile } = useAuth()
  const [boards, setBoards] = useState<TaskBoard[]>([])
  const [currentBoard, setCurrentBoard] = useState<TaskBoard | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState(getCurrentDatePeru())
  const [viewMode, setViewMode] = useState<"my" | "all">("my")

  // Form states
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "medium" as const,
    estimated_time: "",
    due_time: "",
  })

  const canViewAllBoards = profile?.role === "admin" || profile?.role === "supervisor"
  const isCurrentDateBoard = currentBoard?.board_date === getCurrentDatePeru()
  const isBoardClosed = currentBoard?.status === "closed"
  const canEditBoard = isCurrentDateBoard && !isBoardClosed && (currentBoard?.user_id === user?.id || canViewAllBoards)

  useEffect(() => {
    if (user) {
      loadBoards()
    }
  }, [user, selectedDate, viewMode])

  useEffect(() => {
    if (currentBoard) {
      loadTasks(currentBoard.id)
    }
  }, [currentBoard])

  useEffect(() => {
    const checkAndCloseBoards = async () => {
      const now = new Date()
      const currentHour = now.getHours()
      const currentMinute = now.getMinutes()

      // Cerrar pizarrones a las 11:59 PM
      if (currentHour === 23 && currentMinute >= 59) {
        await closePastBoards()
      }

      // Migrar tareas pendientes a las 12:01 AM (inicio del nuevo día)
      if (currentHour === 0 && currentMinute >= 1 && currentMinute <= 2) {
        await migratePendingTasks()
      }
    }

    // Verificar cada minuto
    const interval = setInterval(checkAndCloseBoards, 60000)

    // Verificar inmediatamente al cargar la página
    checkAndCloseBoards()

    return () => clearInterval(interval)
  }, [])

  // Función para migrar tareas pendientes automáticamente
  const migratePendingTasks = async () => {
    try {
      console.log("[v0] Executing automatic task migration...")

      const response = await fetch("/api/migrate-pending-tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const result = await response.json()

      if (result.success && result.data.migratedTasks > 0) {
        toast({
          title: "Tareas migradas automáticamente",
          description: result.data.message,
        })

        // Recargar los boards para mostrar las nuevas tareas migradas
        loadBoards()
      } else if (result.data.migratedTasks === 0) {
        console.log("[v0] No pending tasks to migrate")
      }
    } catch (error) {
      console.error("[v0] Error in automatic task migration:", error)
      // No mostrar error al usuario ya que es un proceso automático
    }
  }

  useEffect(() => {
    if (user && selectedDate === getCurrentDatePeru()) {
      // Solo ejecutar migración si estamos viendo el día actual
      const lastMigrationDate = localStorage.getItem("lastTaskMigration")
      const today = getCurrentDatePeru()

      if (lastMigrationDate !== today) {
        // Ejecutar migración si no se ha hecho hoy
        migratePendingTasks().then(() => {
          localStorage.setItem("lastTaskMigration", today)
        })
      }
    }
  }, [user, selectedDate])

  const closePastBoards = async () => {
    try {
      const today = getCurrentDatePeru()

      await supabase
        .from("task_boards")
        .update({
          status: "closed",
          closed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .lt("board_date", today)
        .eq("status", "active")

      // Recargar boards si hay cambios
      loadBoards()
    } catch (error) {
      console.error("Error closing past boards:", error)
    }
  }

  const loadBoards = async () => {
    try {
      setLoading(true)

      let query = supabase
        .from("task_boards")
        .select(`
          *,
          user_profile:profiles!task_boards_user_id_fkey(full_name, email)
        `)
        .eq("board_date", selectedDate)
        .order("created_at", { ascending: false })

      if (viewMode === "my") {
        query = query.eq("user_id", user?.id)
      }

      const { data, error } = await query

      if (error) throw error

      setBoards(data || [])

      // Si hay boards, seleccionar el primero
      if (data && data.length > 0) {
        setCurrentBoard(data[0])
      } else {
        setCurrentBoard(null)
        setTasks([])
      }
    } catch (error) {
      console.error("Error loading boards:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los pizarrones",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadTasks = async (boardId: string) => {
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("board_id", boardId)
        .order("position", { ascending: true })

      if (error) throw error

      setTasks(data || [])
    } catch (error) {
      console.error("Error loading tasks:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar las tareas",
        variant: "destructive",
      })
    }
  }

  const createTodayBoard = async () => {
    try {
      const today = getCurrentDatePeru()

      const { data, error } = await supabase
        .from("task_boards")
        .insert({
          user_id: user?.id,
          company_id: profile?.company_id,
          board_date: today,
          title: `Tareas del ${formatDateDisplay(new Date())}`,
        })
        .select(`
          *,
          user_profile:profiles!task_boards_user_id_fkey(full_name, email)
        `)
        .single()

      if (error) throw error

      setBoards([data, ...boards])
      setCurrentBoard(data)

      toast({
        title: "Pizarrón creado",
        description: "Se ha creado tu pizarrón de tareas para hoy",
      })
    } catch (error) {
      console.error("Error creating board:", error)
      toast({
        title: "Error",
        description: "No se pudo crear el pizarrón",
        variant: "destructive",
      })
    }
  }

  const createTask = async () => {
    if (!currentBoard || !newTask.title.trim()) return

    try {
      const { data, error } = await supabase
        .from("tasks")
        .insert({
          board_id: currentBoard.id,
          title: newTask.title,
          description: newTask.description || null,
          priority: newTask.priority,
          estimated_time: newTask.estimated_time ? Number.parseInt(newTask.estimated_time) : null,
          due_time: newTask.due_time || null,
          created_by: user?.id,
          assigned_by: currentBoard.user_id !== user?.id ? user?.id : null,
          position: tasks.length,
        })
        .select()
        .single()

      if (error) throw error

      setTasks([...tasks, data])
      setNewTask({
        title: "",
        description: "",
        priority: "medium",
        estimated_time: "",
        due_time: "",
      })
      setIsCreateTaskOpen(false)

      toast({
        title: "Tarea creada",
        description: "La tarea se ha agregado al pizarrón",
      })
    } catch (error) {
      console.error("Error creating task:", error)
      toast({
        title: "Error",
        description: "No se pudo crear la tarea",
        variant: "destructive",
      })
    }
  }

  const updateTaskStatus = async (taskId: string, newStatus: Task["status"]) => {
    try {
      console.log("[v0] Updating task status:", { taskId, newStatus, userId: user?.id })

      const { data, error } = await supabase
        .from("tasks")
        .update({
          status: newStatus,
          completed_at: newStatus === "completed" ? new Date().toISOString() : null,
          updated_by: user?.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", taskId)
        .select()

      console.log("[v0] Update result:", { data, error })

      if (error) {
        console.error("[v0] Database error:", error)
        throw error
      }

      setTasks(
        tasks.map((task) =>
          task.id === taskId
            ? {
                ...task,
                status: newStatus,
                completed_at: newStatus === "completed" ? new Date().toISOString() : undefined,
              }
            : task,
        ),
      )

      const statusText = {
        pending: "pendiente",
        in_progress: "en progreso",
        completed: "completada",
        cancelled: "cancelada",
      }

      toast({
        title: "Estado actualizado",
        description: `La tarea se marcó como ${statusText[newStatus]}`,
      })
    } catch (error) {
      console.error("[v0] Error updating task:", error)
      toast({
        title: "Error",
        description: `No se pudo actualizar el estado de la tarea: ${error.message || "Error desconocido"}`,
        variant: "destructive",
      })
    }
  }

  const calculateBoardProgress = (boardTasks: Task[]) => {
    if (boardTasks.length === 0) return 0
    const completedTasks = boardTasks.filter((task) => task.status === "completed").length
    return Math.round((completedTasks / boardTasks.length) * 100)
  }

  const getBoardStats = (boardTasks: Task[]) => {
    const total = boardTasks.length
    const completed = boardTasks.filter((t) => t.status === "completed").length
    const inProgress = boardTasks.filter((t) => t.status === "in_progress").length
    const pending = boardTasks.filter((t) => t.status === "pending").length
    const urgent = boardTasks.filter((t) => t.priority === "urgent").length

    return { total, completed, inProgress, pending, urgent }
  }

  const todayBoard = boards.find((board) => board.board_date === getCurrentDatePeru() && board.user_id === user?.id)
  const needsTodayBoard = viewMode === "my" && selectedDate === getCurrentDatePeru() && !todayBoard

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Cargando pizarrones...</p>
        </div>
      </div>
    )
  }

  const currentBoardTasks = currentBoard ? tasks : []
  const boardStats = getBoardStats(currentBoardTasks)
  const boardProgress = calculateBoardProgress(currentBoardTasks)

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Pizarrones de Tareas</h1>
          <p className="text-muted-foreground">Gestiona tus tareas diarias de forma organizada</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-auto"
          />

          {canViewAllBoards && (
            <Select value={viewMode} onValueChange={(value: "my" | "all") => setViewMode(value)}>
              <SelectTrigger className="w-auto">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="my">Mis Pizarrones</SelectItem>
                <SelectItem value="all">Todos los Pizarrones</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Create Today Board Button */}
      {needsTodayBoard && (
        <Card className="border-dashed border-2 hover:border-primary/50 transition-colors">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Calendar className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No tienes un pizarrón para hoy</h3>
            <p className="text-muted-foreground text-center mb-4">Crea tu pizarrón de tareas para organizar tu día</p>
            <Button onClick={createTodayBoard} className="bg-slate-700 hover:bg-slate-800 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Crear Pizarrón de Hoy
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Boards List */}
        <div className="lg:col-span-1">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Pizarrones
                {viewMode === "all" && <Users className="h-4 w-4 text-secondary" />}
              </CardTitle>
              <CardDescription>{formatDateLong(new Date(selectedDate))}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {boards.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                    <Calendar className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">No hay pizarrones para esta fecha</p>
                </div>
              ) : (
                boards.map((board) => {
                  const boardTasks = board.id === currentBoard?.id ? tasks : []
                  const progress = calculateBoardProgress(boardTasks)
                  const isActive = currentBoard?.id === board.id

                  return (
                    <div
                      key={board.id}
                      className={`board-card p-4 cursor-pointer ${isActive ? "active" : ""}`}
                      onClick={() => setCurrentBoard(board)}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm">{board.title}</h4>
                          {viewMode === "all" && (
                            <p className="text-xs text-muted-foreground mt-1">{board.user_profile?.full_name}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {board.status === "closed" && (
                            <Badge variant="secondary" className="text-xs">
                              Cerrado
                            </Badge>
                          )}
                          {board.user_id !== user?.id && <Eye className="h-3 w-3 text-muted-foreground" />}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-muted-foreground">Progreso</span>
                          <span className="font-medium text-primary">{progress}%</span>
                        </div>
                        <div className="task-progress-bar">
                          <div className="task-progress-fill" style={{ width: `${progress}%` }} />
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{boardTasks.filter((t) => t.status === "completed").length} completadas</span>
                          <span>{boardTasks.length} total</span>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tasks */}
        <div className="lg:col-span-2">
          {currentBoard ? (
            <Card className="glass-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      {currentBoard.title}
                      <div className="flex items-center gap-1">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            currentBoard.status === "active" ? "bg-green-500" : "bg-gray-400"
                          }`}
                        />
                        <span className="text-sm font-normal text-muted-foreground">
                          {currentBoard.status === "active" ? "Activo" : "Cerrado"}
                        </span>
                      </div>
                    </CardTitle>

                    <div className="board-stats mt-4">
                      <div className="stat-item">
                        <div className="stat-number">{boardStats.total}</div>
                        <div className="stat-label">Total</div>
                      </div>
                      <div className="stat-item">
                        <div className="stat-number text-green-600">{boardStats.completed}</div>
                        <div className="stat-label">Completadas</div>
                      </div>
                      <div className="stat-item">
                        <div className="stat-number text-blue-600">{boardStats.inProgress}</div>
                        <div className="stat-label">En Progreso</div>
                      </div>
                      <div className="stat-item">
                        <div className="stat-number text-yellow-600">{boardStats.pending}</div>
                        <div className="stat-label">Pendientes</div>
                      </div>
                      {boardStats.urgent > 0 && (
                        <div className="stat-item">
                          <div className="stat-number text-red-600">{boardStats.urgent}</div>
                          <div className="stat-label">Urgentes</div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Progreso General</span>
                        <span className="text-sm font-bold text-primary">{boardProgress}%</span>
                      </div>
                      <Progress value={boardProgress} className="h-2" />
                    </div>
                  </div>

                  {canEditBoard && (
                    <Dialog open={isCreateTaskOpen} onOpenChange={setIsCreateTaskOpen}>
                      <DialogTrigger asChild>
                        <Button className="bg-slate-700 hover:bg-slate-800 text-white">
                          <Plus className="h-4 w-4 mr-2" />
                          Nueva Tarea
                        </Button>
                      </DialogTrigger>
                      {/* ... existing dialog content ... */}
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Crear Nueva Tarea</DialogTitle>
                          <DialogDescription>Agrega una nueva tarea al pizarrón</DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="title">Título *</Label>
                            <Input
                              id="title"
                              value={newTask.title}
                              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                              placeholder="Título de la tarea"
                            />
                          </div>

                          <div>
                            <Label htmlFor="description">Descripción</Label>
                            <Textarea
                              id="description"
                              value={newTask.description}
                              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                              placeholder="Descripción opcional"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="priority">Prioridad</Label>
                              <Select
                                value={newTask.priority}
                                onValueChange={(value: any) => setNewTask({ ...newTask, priority: value })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="low">Baja</SelectItem>
                                  <SelectItem value="medium">Media</SelectItem>
                                  <SelectItem value="high">Alta</SelectItem>
                                  <SelectItem value="urgent">Urgente</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div>
                              <Label htmlFor="estimated_time">Tiempo estimado (min)</Label>
                              <Input
                                id="estimated_time"
                                type="number"
                                value={newTask.estimated_time}
                                onChange={(e) => setNewTask({ ...newTask, estimated_time: e.target.value })}
                                placeholder="60"
                              />
                            </div>
                          </div>

                          <div>
                            <Label htmlFor="due_time">Hora límite</Label>
                            <Input
                              id="due_time"
                              type="time"
                              value={newTask.due_time}
                              onChange={(e) => setNewTask({ ...newTask, due_time: e.target.value })}
                            />
                          </div>
                        </div>

                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsCreateTaskOpen(false)}>
                            Cancelar
                          </Button>
                          <Button onClick={createTask} disabled={!newTask.title.trim()}>
                            Crear Tarea
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {tasks.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                      <AlertCircle className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground">No hay tareas en este pizarrón</p>
                  </div>
                ) : (
                  tasks.map((task) => {
                    const StatusIcon = statusIcons[task.status]
                    return (
                      <div key={task.id} className="task-card p-4 relative">
                        <div className={`priority-indicator priority-${task.priority}`} />

                        <div className="flex items-start justify-between ml-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <div
                                className={`p-1.5 rounded-full ${
                                  task.status === "completed"
                                    ? "bg-green-100 text-green-600"
                                    : task.status === "in_progress"
                                      ? "bg-blue-100 text-blue-600"
                                      : task.status === "pending"
                                        ? "bg-yellow-100 text-yellow-600"
                                        : "bg-red-100 text-red-600"
                                }`}
                              >
                                <StatusIcon className="h-4 w-4" />
                              </div>
                              <h4 className="font-semibold text-base">{task.title}</h4>
                              <Badge className={`status-badge status-${task.priority}`}>
                                {task.priority === "urgent" && <Zap className="h-3 w-3" />}
                                {task.priority}
                              </Badge>
                            </div>

                            {task.description && (
                              <p className="text-sm text-muted-foreground mb-3 ml-10">{task.description}</p>
                            )}

                            <div className="flex items-center gap-4 text-xs text-muted-foreground ml-10">
                              {task.estimated_time && (
                                <div className="flex items-center gap-1">
                                  <Target className="h-3 w-3" />
                                  <span>Est: {task.estimated_time}min</span>
                                </div>
                              )}
                              {task.due_time && (
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  <span>Límite: {task.due_time}</span>
                                </div>
                              )}
                              {task.completed_at && (
                                <div className="flex items-center gap-1">
                                  <CheckCircle className="h-3 w-3" />
                                  <span>Completada: {format(new Date(task.completed_at), "HH:mm")}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {canEditBoard && (
                            <div className="flex gap-2">
                              {task.status !== "completed" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateTaskStatus(task.id, "completed")}
                                  className="hover:bg-green-50 hover:border-green-200 hover:text-green-700"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                              )}

                              {task.status === "pending" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateTaskStatus(task.id, "in_progress")}
                                  className="hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700"
                                >
                                  <Clock className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="mt-3 ml-2">
                          <Badge className={`status-badge status-${task.status}`}>
                            <StatusIcon className="h-3 w-3" />
                            {task.status === "pending" && "Pendiente"}
                            {task.status === "in_progress" && "En Progreso"}
                            {task.status === "completed" && "Completada"}
                            {task.status === "cancelled" && "Cancelada"}
                          </Badge>
                        </div>
                      </div>
                    )
                  })
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="glass-card">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                  <Calendar className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Selecciona un pizarrón</h3>
                <p className="text-muted-foreground text-center">
                  Elige un pizarrón de la lista para ver y gestionar las tareas
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
