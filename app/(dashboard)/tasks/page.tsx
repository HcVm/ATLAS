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
import { Calendar, Clock, Plus, CheckCircle, Circle, AlertCircle, XCircle, Users, Eye } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { es } from "date-fns/locale"

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
  urgent: "bg-purple-100 text-purple-800 border-purple-200",
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
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"))
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
  const isCurrentDateBoard = currentBoard?.board_date === format(new Date(), "yyyy-MM-dd")
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

  // Función para cerrar automáticamente las pizarras a las 8 PM
  useEffect(() => {
    const checkAndCloseBoards = () => {
      const now = new Date()
      const currentHour = now.getHours()

      if (currentHour >= 20) {
        // 8 PM o después
        closePastBoards()
      }
    }

    // Verificar cada minuto
    const interval = setInterval(checkAndCloseBoards, 60000)

    // Verificar inmediatamente
    checkAndCloseBoards()

    return () => clearInterval(interval)
  }, [])

  const closePastBoards = async () => {
    try {
      const today = format(new Date(), "yyyy-MM-dd")

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
            user_profile:profiles(full_name, email)
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
      const today = format(new Date(), "yyyy-MM-dd")

      const { data, error } = await supabase
        .from("task_boards")
        .insert({
          user_id: user?.id,
          company_id: profile?.company_id,
          board_date: today,
          title: `Tareas del ${format(new Date(), "dd/MM/yyyy", { locale: es })}`,
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
      const { error } = await supabase
        .from("tasks")
        .update({
          status: newStatus,
          completed_at: newStatus === "completed" ? new Date().toISOString() : null,
          updated_by: user?.id,
        })
        .eq("id", taskId)

      if (error) throw error

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

      toast({
        title: "Estado actualizado",
        description: `La tarea se marcó como ${newStatus === "completed" ? "completada" : newStatus}`,
      })
    } catch (error) {
      console.error("Error updating task:", error)
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado de la tarea",
        variant: "destructive",
      })
    }
  }

  const todayBoard = boards.find(
    (board) => board.board_date === format(new Date(), "yyyy-MM-dd") && board.user_id === user?.id,
  )
  const needsTodayBoard = viewMode === "my" && selectedDate === format(new Date(), "yyyy-MM-dd") && !todayBoard

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

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Pizarrones de Tareas</h1>
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
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No tienes un pizarrón para hoy</h3>
            <p className="text-muted-foreground text-center mb-4">Crea tu pizarrón de tareas para organizar tu día</p>
            <Button onClick={createTodayBoard}>
              <Plus className="h-4 w-4 mr-2" />
              Crear Pizarrón de Hoy
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Boards List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Pizarrones
                {viewMode === "all" && <Users className="h-4 w-4" />}
              </CardTitle>
              <CardDescription>
                {format(new Date(selectedDate), "dd 'de' MMMM 'de' yyyy", { locale: es })}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {boards.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No hay pizarrones para esta fecha</p>
              ) : (
                boards.map((board) => (
                  <div
                    key={board.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      currentBoard?.id === board.id ? "bg-primary/10 border-primary" : "hover:bg-muted/50"
                    }`}
                    onClick={() => setCurrentBoard(board)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium">{board.title}</h4>
                        {viewMode === "all" && (
                          <p className="text-sm text-muted-foreground">{board.user_profile?.full_name}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {board.status === "closed" && (
                          <Badge variant="secondary" className="text-xs">
                            Cerrado
                          </Badge>
                        )}
                        {board.user_id !== user?.id && <Eye className="h-4 w-4 text-muted-foreground" />}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tasks */}
        <div className="lg:col-span-2">
          {currentBoard ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{currentBoard.title}</CardTitle>
                    <CardDescription>
                      {tasks.length} tareas • {tasks.filter((t) => t.status === "completed").length} completadas
                    </CardDescription>
                  </div>

                  {canEditBoard && (
                    <Dialog open={isCreateTaskOpen} onOpenChange={setIsCreateTaskOpen}>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          Nueva Tarea
                        </Button>
                      </DialogTrigger>
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

              <CardContent className="space-y-3">
                {tasks.length === 0 ? (
                  <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No hay tareas en este pizarrón</p>
                  </div>
                ) : (
                  tasks.map((task) => {
                    const StatusIcon = statusIcons[task.status]
                    return (
                      <div key={task.id} className="p-4 border rounded-lg space-y-2 hover:shadow-sm transition-shadow">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <StatusIcon className="h-4 w-4" />
                              <h4 className="font-medium">{task.title}</h4>
                              <Badge className={priorityColors[task.priority]}>{task.priority}</Badge>
                            </div>

                            {task.description && (
                              <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                            )}

                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              {task.estimated_time && <span>Est: {task.estimated_time}min</span>}
                              {task.due_time && <span>Límite: {task.due_time}</span>}
                              {task.completed_at && (
                                <span>Completada: {format(new Date(task.completed_at), "HH:mm")}</span>
                              )}
                            </div>
                          </div>

                          {canEditBoard && (
                            <div className="flex gap-1">
                              {task.status !== "completed" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateTaskStatus(task.id, "completed")}
                                >
                                  <CheckCircle className="h-3 w-3" />
                                </Button>
                              )}

                              {task.status === "pending" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateTaskStatus(task.id, "in_progress")}
                                >
                                  <Clock className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          )}
                        </div>

                        <Badge className={statusColors[task.status]}>
                          {task.status === "pending" && "Pendiente"}
                          {task.status === "in_progress" && "En Progreso"}
                          {task.status === "completed" && "Completada"}
                          {task.status === "cancelled" && "Cancelada"}
                        </Badge>
                      </div>
                    )
                  })
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Selecciona un pizarrón para ver las tareas</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
