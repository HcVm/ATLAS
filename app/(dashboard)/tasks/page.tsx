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
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd"
import { motion, AnimatePresence } from "framer-motion"
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
import {
  LayoutGrid,
  List as ListIcon,
  Calendar,
  Clock,
  Plus,
  CheckCircle,
  Circle,
  AlertCircle,
  XCircle,
  Users,
  Eye,
  Target,
  Zap,
  ArrowRight,
  ArrowUpRight,
} from "lucide-react"
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
  status: "pending" | "in_progress" | "completed" | "cancelled" | "migrated"
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
  migrated_from_board?: string
  migrated_from_date?: string
  migrated_at?: string
  migrated_to_date?: string
  migrated_to_board?: string
}

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  in_progress: "bg-blue-100 text-blue-800 border-blue-200",
  completed: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
  migrated: "bg-purple-100 text-purple-800 border-purple-200",
}

const statusIcons = {
  pending: Circle,
  in_progress: Clock,
  completed: CheckCircle,
  cancelled: XCircle,
  migrated: ArrowRight,
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
  const [layoutMode, setLayoutMode] = useState<"list" | "kanban">("kanban")
  const [filterPriority, setFilterPriority] = useState<string>("all")

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
    if (!user) return

    const executeMigrationProcess = async () => {
      try {

        const peruTime = new Date().toLocaleString("en-US", { timeZone: "America/Lima" })
        const now = new Date(peruTime)
        const currentHour = now.getHours()
        const currentMinute = now.getMinutes()
        const today = getCurrentDatePeru()

        console.log("Tiempo actual en Perú:", {
          peruTime,
          currentHour,
          currentMinute,
          today,
        })

        const migrationKey = `task_migration_${user.id}_${today}`
        const sessionMigrationKey = `session_${migrationKey}`

        const lastMigrationTime = localStorage.getItem(migrationKey) || sessionStorage.getItem(sessionMigrationKey)
        const now_timestamp = now.getTime()

        const sixHoursInMs = 6 * 60 * 60 * 1000
        const shouldExecuteMigration =
          !lastMigrationTime || now_timestamp - Number.parseInt(lastMigrationTime) > sixHoursInMs

        const isBusinessHours = currentHour >= 7 && currentHour < 23

        console.log("Estado de migración:", {
          shouldExecuteMigration,
          isBusinessHours,
          lastMigrationTime,
          timeSinceLastMigration: lastMigrationTime
            ? Math.round((now_timestamp - Number.parseInt(lastMigrationTime)) / (1000 * 60 * 60))
            : null,
        })

        if (shouldExecuteMigration && isBusinessHours) {
          console.log("Ejecutando comprobación de tareas pendientes...")

          const migrationResult = await migratePendingTasks()

          if (migrationResult.success) {
            const timestamp = now_timestamp.toString()
            localStorage.setItem(migrationKey, timestamp)
            sessionStorage.setItem(sessionMigrationKey, timestamp)

            if (migrationResult.migratedTasks > 0) {
              console.log("Recargando boards después de migración exitosa")
              await loadBoards()
            }
          }
        }

        if (currentHour === 23) {
          console.log("Ejecutando cierre de boards pasados")
          await closePastBoards()
        }
      } catch (error) {
        console.error("Error en proceso de migración automática:", error)
      }
    }

    executeMigrationProcess()

    const migrationInterval = setInterval(executeMigrationProcess, 10 * 60 * 1000)

    return () => {
      clearInterval(migrationInterval)
    }
  }, [user])

  const migratePendingTasks = async (retryCount = 0) => {
    const maxRetries = 2

    try {
      console.log(`Llamando al endpoint de migración (intento ${retryCount + 1})...`)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 45000)

      const response = await fetch("/api/migrate-pending-tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      console.log("[v0] Resultado de migración:", result)

      if (result.success) {
        if (result.data.migratedTasks > 0) {
          toast({
            title: "✅ Tareas comprobadas",
            description: `Se realizó la comprobación de tareas pendientes.`,
            duration: 6000,
          })
        } else {
          console.log("No había tareas para migrar")
        }
        return { success: true, migratedTasks: result.data.migratedTasks }
      } else {
        console.error("Error en migración:", result.error)

        if (retryCount === maxRetries) {
          toast({
            title: "⚠️ Error en migración automática",
            description: result.error || "Error desconocido en la migración",
            variant: "destructive",
            duration: 8000,
          })
        }

        return { success: false, migratedTasks: 0 }
      }
    } catch (error) {
      console.error(`Error ejecutando migración (intento ${retryCount + 1}):`, error)

      if (retryCount < maxRetries && (error.name === "TypeError" || error.message.includes("fetch"))) {
        console.log(`[v0] Reintentando migración en 5 segundos...`)
        await new Promise((resolve) => setTimeout(resolve, 5000))
        return migratePendingTasks(retryCount + 1)
      }

      if (retryCount === maxRetries && error.name !== "AbortError") {
        toast({
          title: "⚠️ Error en migración automática",
          description: "No se pudieron migrar las tareas pendientes. Verifique su conexión.",
          variant: "destructive",
          duration: 8000,
        })
      }

      return { success: false, migratedTasks: 0 }
    }
  }

  const forceMigration = async () => {
    console.log("Forzando migración manual...")

    const loadingToast = toast({
      title: "🔄 Migración en progreso",
      description: "Verificando tareas pendientes...",
      duration: 0,
    })

    try {
      const result = await migratePendingTasks()

      loadingToast.dismiss?.()

      if (result.success) {
        await loadBoards()
        toast({
          title: "✅ Migración completada",
          description: `Se procesaron ${result.migratedTasks} tareas`,
          duration: 5000,
        })
      }
    } catch (error) {
      loadingToast.dismiss?.()
      toast({
        title: "❌ Error en migración manual",
        description: "No se pudo completar la migración",
        variant: "destructive",
        duration: 5000,
      })
    }
  }

  const closePastBoards = async () => {
    try {
      console.log("Cerrando boards pasados...")
      const today = getCurrentDatePeru()

      const { data, error } = await supabase
        .from("task_boards")
        .update({
          status: "closed",
          closed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .lt("board_date", today)
        .eq("status", "active")
        .select("id, board_date, user_id")

      if (error) {
        console.error("Error cerrando boards pasados:", error)
        return
      }

      if (data && data.length > 0) {
        console.log(`Se cerraron ${data.length} boards pasados:`, data)
        await loadBoards()
        toast({
          title: "📋 Boards cerrados automáticamente",
          description: `Se cerraron ${data.length} pizarrones de fechas pasadas`,
          duration: 4000,
        })
      }
    } catch (error) {
      console.error("Error cerrando boards pasados:", error)
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
        .select(`
          *,
          migrated_from_board,
          migrated_from_date,
          migrated_at,
          migrated_to_date,
          migrated_to_board
        `)
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

      await migratePendingTasks()
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


      if (error) {
        console.error("Database error:", error)
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
        migrated: "migrada",
      }

      toast({
        title: "Estado actualizado",
        description: `La tarea se marcó como ${statusText[newStatus]}`,
      })
    } catch (error) {
      console.error("Error updating task:", error)
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

  const currentBoardTasks = currentBoard ? tasks : []

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result

    if (!destination) return

    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return
    }

    const task = tasks.find((t) => t.id === draggableId)
    if (!task) return

    // Optimistic update
    const newStatus = destination.droppableId as Task["status"]
    const newTasks = Array.from(tasks)

    // If moving to a different column
    if (source.droppableId !== destination.droppableId) {
      const updatedTask = {
        ...task,
        status: newStatus,
        completed_at: newStatus === "completed" ? new Date().toISOString() :
          (newStatus === "in_progress" || newStatus === "pending") ? undefined : task.completed_at
      }

      setTasks(tasks.map(t => t.id === draggableId ? updatedTask : t))

      // Call API
      try {
        await updateTaskStatus(draggableId, newStatus)
      } catch (error) {
        // Revert on error (could be improved with a proper revert)
        console.error("Failed to update status on drag", error)
        loadTasks(currentBoard?.id!)
      }
    }
  }

  const tasksByStatus = {
    pending: currentBoardTasks.filter(t => t.status === "pending" || t.status === "migrated"),
    in_progress: currentBoardTasks.filter(t => t.status === "in_progress"),
    completed: currentBoardTasks.filter(t => t.status === "completed" || t.status === "cancelled"),
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen p-4 sm:p-6 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600 dark:border-slate-400"></div>
          <p className="text-slate-600 dark:text-slate-300">Cargando pizarrones...</p>
        </div>
      </div>
    )
  }

  const boardStats = getBoardStats(currentBoardTasks)
  const boardProgress = calculateBoardProgress(currentBoardTasks)

  return (
    <motion.div
      className="w-full max-w-full p-6 space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col sm:flex-row items-center justify-between gap-6 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm p-8 rounded-3xl border border-slate-200/50 dark:border-slate-700/50 shadow-xl"
      >
        <div className="flex-1">
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-slate-800 via-slate-600 to-slate-500 dark:from-white dark:via-slate-200 dark:to-slate-400 bg-clip-text text-transparent">
            Pizarrones de Tareas
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2 flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5 text-indigo-500" />
            Gestiona tu día a día con eficacia
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-auto border-none shadow-none focus-visible:ring-0 bg-transparent"
            />
          </div>

          <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <Button
              variant={layoutMode === "list" ? "white" : "ghost"}
              size="sm"
              onClick={() => setLayoutMode("list")}
              className={`h-9 px-4 rounded-lg transition-all ${layoutMode === "list" ? "bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400 font-medium" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"}`}
            >
              <ListIcon className="h-4 w-4 mr-2" />
              Lista
            </Button>
            <Button
              variant={layoutMode === "kanban" ? "white" : "ghost"}
              size="sm"
              onClick={() => setLayoutMode("kanban")}
              className={`h-9 px-4 rounded-lg transition-all ${layoutMode === "kanban" ? "bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400 font-medium" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"}`}
            >
              <LayoutGrid className="h-4 w-4 mr-2" />
              Tablero
            </Button>
          </div>

          {canViewAllBoards && (
            <Select value={viewMode} onValueChange={(value: "my" | "all") => setViewMode(value)}>
              <SelectTrigger className="w-[180px] bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 h-12 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="my">Mis Pizarrones</SelectItem>
                <SelectItem value="all">Todos los Pizarrones</SelectItem>
              </SelectContent>
            </Select>
          )}

          {/* Botón para migración manual (solo para admins o en desarrollo) */}
          {(canViewAllBoards || process.env.NODE_ENV === "development") && (
            <Button
              variant="outline"
              size="icon"
              onClick={forceMigration}
              className="h-12 w-12 rounded-xl border-slate-200 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 transition-colors"
              title="Forzar migración"
            >
              <ArrowRight className="h-5 w-5" />
            </Button>
          )}
        </div>
      </motion.div>

      {/* Create Today Board Button */}
      {needsTodayBoard && (
        <motion.div variants={itemVariants}>
          <Card className="border-dashed border-2 border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-900/10 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all duration-300 group cursor-pointer">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="w-20 h-20 rounded-full bg-white dark:bg-slate-800 shadow-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Calendar className="h-10 w-10 text-indigo-500" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">Comienza tu día</h3>
              <p className="text-slate-600 dark:text-slate-400 text-center mb-8 max-w-md">
                No tienes un pizarrón activo para hoy. Crea uno nuevo para empezar a organizar tus tareas y aumentar tu productividad.
              </p>
              <Button
                onClick={createTodayBoard}
                className="h-12 px-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all hover:-translate-y-1"
              >
                <Plus className="h-5 w-5 mr-2" />
                Crear Pizarrón de Hoy
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Boards List */}
        <motion.div variants={itemVariants} className="lg:col-span-1">
          <Card className="border-none shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md overflow-hidden rounded-2xl">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 border-b border-slate-100 dark:border-slate-800 p-6">
              <CardTitle className="flex items-center gap-3 text-lg font-bold text-slate-800 dark:text-slate-200">
                <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                  <Calendar className="h-5 w-5" />
                </div>
                Historial de Pizarrones
              </CardTitle>
              <CardDescription className="text-slate-500 mt-1">
                {formatDateLong(selectedDate)}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[600px] overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {boards.length === 0 ? (
                  <div className="text-center py-12 px-6">
                    <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                      <Calendar className="h-8 w-8 text-slate-400" />
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">No hay pizarrones para esta fecha</p>
                  </div>
                ) : (
                  boards.map((board) => {
                    const boardTasks = board.id === currentBoard?.id ? tasks : []
                    const isActive = currentBoard?.id === board.id
                    const progress = isActive ? calculateBoardProgress(tasks) : 0

                    return (
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        key={board.id}
                        className={`
                        p-5 rounded-xl cursor-pointer transition-all duration-200 border
                        ${isActive
                            ? "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 shadow-md"
                            : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-700 hover:shadow-md"
                          }
                      `}
                        onClick={() => setCurrentBoard(board)}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex-1">
                            <h4 className={`font-bold ${isActive ? "text-indigo-700 dark:text-indigo-300" : "text-slate-700 dark:text-slate-300"}`}>
                              {board.title}
                            </h4>
                            {viewMode === "all" && (
                              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {board.user_profile?.full_name}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {board.status === "closed" ? (
                              <Badge variant="secondary" className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                Cerrado
                              </Badge>
                            ) : (
                              <Badge className="bg-green-100 text-green-700 border-green-200">Activo</Badge>
                            )}
                          </div>
                        </div>

                        {isActive && (
                          <div className="space-y-3">
                            <div className="flex justify-between items-center text-xs font-medium">
                              <span className="text-slate-500">Progreso diario</span>
                              <span className="text-indigo-600 dark:text-indigo-400">{progress}%</span>
                            </div>
                            <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                              <motion.div
                                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 1, ease: "easeOut" }}
                              />
                            </div>
                            <div className="flex justify-between text-xs text-slate-500">
                              <span>{tasks.filter((t) => t.status === "completed").length} completadas</span>
                              <span>{tasks.length} total</span>
                            </div>
                          </div>
                        )}

                        {!isActive && (
                          <p className="text-xs text-slate-400 mt-2 text-right">Click para ver detalles</p>
                        )}
                      </motion.div>
                    )
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tasks Area */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          {currentBoard ? (
            layoutMode === "kanban" ? (
              <div className="overflow-x-auto pb-4 custom-scrollbar">
                <DragDropContext onDragEnd={onDragEnd}>
                  <div className="flex gap-6 min-w-[900px]">
                    {/* Pending Column */}
                    <div className="flex-1 min-w-[300px]">
                      <div className="flex items-center justify-between mb-4 p-2 bg-yellow-50/80 dark:bg-yellow-900/10 rounded-xl border border-yellow-100 dark:border-yellow-900/30">
                        <h3 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-yellow-100 dark:bg-yellow-900/40 text-yellow-600 dark:text-yellow-400">
                            <Circle className="h-4 w-4" />
                          </div>
                          Pendientes
                        </h3>
                        <Badge variant="outline" className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 font-mono">
                          {tasksByStatus.pending.length}
                        </Badge>
                      </div>
                      <Droppable droppableId="pending">
                        {(provided, snapshot) => (
                          <div
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            className={`p-3 rounded-2xl min-h-[500px] transition-all duration-300 ${snapshot.isDraggingOver
                                ? "bg-yellow-50/80 dark:bg-yellow-900/20 border-2 border-dashed border-yellow-300 dark:border-yellow-700 shadow-inner"
                                : "bg-slate-50/50 dark:bg-slate-800/30 border border-transparent"
                              }`}
                          >
                            <div className="space-y-4">
                              {tasksByStatus.pending.map((task, index) => (
                                <Draggable key={task.id} draggableId={task.id} index={index}>
                                  {(provided, snapshot) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      className={`
                                        bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700
                                        hover:shadow-lg hover:border-indigo-200 dark:hover:border-indigo-700 hover:-translate-y-1 transition-all duration-200 group relative
                                        ${snapshot.isDragging ? "shadow-2xl ring-2 ring-indigo-500 rotate-2 z-50 scale-105" : ""}
                                      `}
                                    >
                                      <div className={`absolute left-0 top-3 bottom-3 w-1 rounded-r-full priority-${task.priority}`} />
                                      <div className="pl-3">
                                        <div className="flex justify-between items-start mb-3">
                                          <Badge className={`status-badge status-${task.priority} text-[10px] px-2 py-0.5 h-auto uppercase tracking-wider font-bold`}>
                                            {task.priority}
                                          </Badge>
                                          {task.estimated_time && (
                                            <div className="flex items-center text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/50 px-2 py-1 rounded-md">
                                              <Clock className="h-3 w-3 mr-1.5" />
                                              {task.estimated_time}m
                                            </div>
                                          )}
                                        </div>
                                        <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-2 leading-tight">{task.title}</h4>
                                        {task.description && (
                                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3 leading-relaxed">{task.description}</p>
                                        )}
                                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/50">
                                          <div className="flex items-center gap-2">
                                            {task.migrated_from_board && (
                                              <div className="flex items-center text-xs text-blue-500 font-medium bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded">
                                                <ArrowUpRight className="h-3 w-3 mr-1" /> Migrada
                                              </div>
                                            )}
                                          </div>
                                          <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-x-2 group-hover:translate-x-0">
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              className="h-8 w-8 p-0 rounded-full hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/30 dark:hover:text-blue-400"
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                updateTaskStatus(task.id, "in_progress")
                                              }}
                                              title="Mover a En Progreso"
                                            >
                                              <ArrowRight className="h-4 w-4" />
                                            </Button>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}
                            </div>
                          </div>
                        )}
                      </Droppable>
                    </div>

                    {/* In Progress Column */}
                    <div className="flex-1 min-w-[300px]">
                      <div className="flex items-center justify-between mb-4 p-2 bg-blue-50/80 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30">
                        <h3 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
                            <Clock className="h-4 w-4" />
                          </div>
                          En Progreso
                        </h3>
                        <Badge variant="outline" className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 font-mono">
                          {tasksByStatus.in_progress.length}
                        </Badge>
                      </div>
                      <Droppable droppableId="in_progress">
                        {(provided, snapshot) => (
                          <div
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            className={`p-3 rounded-2xl min-h-[500px] transition-all duration-300 ${snapshot.isDraggingOver
                                ? "bg-blue-50/80 dark:bg-blue-900/20 border-2 border-dashed border-blue-300 dark:border-blue-700 shadow-inner"
                                : "bg-slate-50/50 dark:bg-slate-800/30 border border-transparent"
                              }`}
                          >
                            <div className="space-y-4">
                              {tasksByStatus.in_progress.map((task, index) => (
                                <Draggable key={task.id} draggableId={task.id} index={index}>
                                  {(provided, snapshot) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      className={`
                                        bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700
                                        hover:shadow-lg hover:border-indigo-200 dark:hover:border-indigo-700 hover:-translate-y-1 transition-all duration-200 group relative
                                        ${snapshot.isDragging ? "shadow-2xl ring-2 ring-indigo-500 rotate-2 z-50 scale-105" : ""}
                                      `}
                                    >
                                      <div className={`absolute left-0 top-3 bottom-3 w-1 rounded-r-full priority-${task.priority}`} />
                                      <div className="pl-3">
                                        <div className="flex justify-between items-start mb-3">
                                          <Badge className={`status-badge status-${task.priority} text-[10px] px-2 py-0.5 h-auto uppercase tracking-wider font-bold`}>
                                            {task.priority}
                                          </Badge>
                                          {task.estimated_time && (
                                            <div className="flex items-center text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/50 px-2 py-1 rounded-md">
                                              <Clock className="h-3 w-3 mr-1.5" />
                                              {task.estimated_time}m
                                            </div>
                                          )}
                                        </div>
                                        <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-2 leading-tight">{task.title}</h4>
                                        {task.description && (
                                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3 leading-relaxed">{task.description}</p>
                                        )}
                                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/50">
                                          <div className="flex items-center gap-2">
                                            {task.migrated_from_board && (
                                              <div className="flex items-center text-xs text-blue-500 font-medium bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded">
                                                <ArrowUpRight className="h-3 w-3 mr-1" /> Migrada
                                              </div>
                                            )}
                                          </div>
                                          <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-x-2 group-hover:translate-x-0">
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              className="h-8 w-8 p-0 rounded-full hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-900/30 dark:hover:text-green-400"
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                updateTaskStatus(task.id, "completed")
                                              }}
                                              title="Marcar como Completada"
                                            >
                                              <CheckCircle className="h-4 w-4" />
                                            </Button>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}
                            </div>
                          </div>
                        )}
                      </Droppable>
                    </div>

                    {/* Completed Column */}
                    <div className="flex-1 min-w-[300px]">
                      <div className="flex items-center justify-between mb-4 p-2 bg-green-50/80 dark:bg-green-900/10 rounded-xl border border-green-100 dark:border-green-900/30">
                        <h3 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400">
                            <CheckCircle className="h-4 w-4" />
                          </div>
                          Completadas
                        </h3>
                        <Badge variant="outline" className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 font-mono">
                          {tasksByStatus.completed.length}
                        </Badge>
                      </div>
                      <Droppable droppableId="completed">
                        {(provided, snapshot) => (
                          <div
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            className={`p-3 rounded-2xl min-h-[500px] transition-all duration-300 ${snapshot.isDraggingOver
                                ? "bg-green-50/80 dark:bg-green-900/20 border-2 border-dashed border-green-300 dark:border-green-700 shadow-inner"
                                : "bg-slate-50/50 dark:bg-slate-800/30 border border-transparent"
                              }`}
                          >
                            <div className="space-y-4">
                              {tasksByStatus.completed.map((task, index) => (
                                <Draggable key={task.id} draggableId={task.id} index={index}>
                                  {(provided, snapshot) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      className={`
                                        bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700
                                        transition-all duration-200 group relative opacity-70 hover:opacity-100
                                        ${snapshot.isDragging ? "shadow-2xl ring-2 ring-indigo-500 rotate-2 z-50 scale-105 opacity-100" : ""}
                                      `}
                                    >
                                      <div className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full bg-green-500" />
                                      <div className="pl-3">
                                        <div className="flex justify-between items-start mb-3">
                                          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 border-transparent text-[10px] px-2 py-0.5 h-auto uppercase tracking-wider font-bold">
                                            Completada
                                          </Badge>
                                          {task.completed_at && (
                                            <div className="flex items-center text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-md">
                                              <CheckCircle className="h-3 w-3 mr-1.5" />
                                              {format(new Date(task.completed_at), "HH:mm")}
                                            </div>
                                          )}
                                        </div>
                                        <h4 className="font-bold text-slate-500 dark:text-slate-400 mb-2 leading-tight line-through decoration-slate-400">{task.title}</h4>
                                        <div className="flex items-center justify-end mt-2">
                                          <div className="text-xs text-slate-400">
                                            Finalizada hace {format(new Date(task.completed_at || new Date()), "m")} min
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}
                            </div>
                          </div>
                        )}
                      </Droppable>
                    </div>
                  </div>
                </DragDropContext>
              </div>
            ) : (
              <Card className="border-none shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800 p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-3 text-2xl font-bold text-slate-800 dark:text-slate-200">
                        {currentBoard.title}
                        <div className="flex items-center gap-2">
                          <Badge className={`
                           px-3 py-1 text-sm font-medium
                           ${currentBoard.status === "active" ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-slate-100 text-slate-600"}
                        `}>
                            {currentBoard.status === "active" ? "Activo" : "Cerrado"}
                          </Badge>
                        </div>
                      </CardTitle>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                          <div className="text-2xl font-bold text-slate-700 dark:text-slate-200">{boardStats.total}</div>
                          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-1">Total</div>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/10 p-3 rounded-xl border border-green-100 dark:border-green-900/30">
                          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{boardStats.completed}</div>
                          <div className="text-xs font-medium text-green-600/70 dark:text-green-400/70 uppercase tracking-wider mt-1">Completadas</div>
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-900/10 p-3 rounded-xl border border-blue-100 dark:border-blue-900/30">
                          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{boardStats.inProgress}</div>
                          <div className="text-xs font-medium text-blue-600/70 dark:text-blue-400/70 uppercase tracking-wider mt-1">En Progreso</div>
                        </div>
                        <div className="bg-yellow-50 dark:bg-yellow-900/10 p-3 rounded-xl border border-yellow-100 dark:border-yellow-900/30">
                          <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{boardStats.pending}</div>
                          <div className="text-xs font-medium text-yellow-600/70 dark:text-yellow-400/70 uppercase tracking-wider mt-1">Pendientes</div>
                        </div>
                      </div>

                      <div className="space-y-2 mt-6">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Progreso General</span>
                          <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{boardProgress}%</span>
                        </div>
                        <Progress value={boardProgress} className="h-3 rounded-full bg-slate-100 dark:bg-slate-700" />
                      </div>
                    </div>

                    {canEditBoard && (
                      <Dialog open={isCreateTaskOpen} onOpenChange={setIsCreateTaskOpen}>
                        <DialogTrigger asChild>
                          <Button className="h-12 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-all hover:-translate-y-0.5 ml-6">
                            <Plus className="h-5 w-5 mr-2" />
                            Nueva Tarea
                          </Button>
                        </DialogTrigger>

                        <DialogContent className="sm:max-w-[600px] rounded-2xl border-none shadow-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl">
                          <DialogHeader>
                            <DialogTitle className="text-2xl font-bold text-slate-800 dark:text-slate-100">Crear Nueva Tarea</DialogTitle>
                            <DialogDescription className="text-slate-500">Agrega una nueva tarea al pizarrón</DialogDescription>
                          </DialogHeader>

                          <div className="space-y-6 py-4">
                            <div className="space-y-2">
                              <Label htmlFor="title" className="text-slate-700 dark:text-slate-300 font-medium">Título de la tarea <span className="text-red-500">*</span></Label>
                              <Input
                                id="title"
                                value={newTask.title}
                                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                                placeholder="Ej: Revisar documentación mensual"
                                className="h-11 rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-indigo-500"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="description" className="text-slate-700 dark:text-slate-300 font-medium">Descripción</Label>
                              <Textarea
                                id="description"
                                value={newTask.description}
                                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                                placeholder="Detalles adicionales sobre la tarea..."
                                className="min-h-[100px] rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-indigo-500 resize-none"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                              <div className="space-y-2">
                                <Label htmlFor="priority" className="text-slate-700 dark:text-slate-300 font-medium">Prioridad</Label>
                                <Select
                                  value={newTask.priority}
                                  onValueChange={(value: any) => setNewTask({ ...newTask, priority: value })}
                                >
                                  <SelectTrigger className="h-11 rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
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

                              <div className="space-y-2">
                                <Label htmlFor="estimated_time" className="text-slate-700 dark:text-slate-300 font-medium">Tiempo estimado (min)</Label>
                                <div className="relative">
                                  <Clock className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                                  <Input
                                    id="estimated_time"
                                    type="number"
                                    value={newTask.estimated_time}
                                    onChange={(e) => setNewTask({ ...newTask, estimated_time: e.target.value })}
                                    placeholder="60"
                                    className="h-11 pl-10 rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-indigo-500"
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="due_time" className="text-slate-700 dark:text-slate-300 font-medium">Hora límite</Label>
                              <Input
                                id="due_time"
                                type="time"
                                value={newTask.due_time}
                                onChange={(e) => setNewTask({ ...newTask, due_time: e.target.value })}
                                className="h-11 rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-indigo-500"
                              />
                            </div>
                          </div>

                          <DialogFooter className="gap-2 sm:gap-0">
                            <Button variant="ghost" onClick={() => setIsCreateTaskOpen(false)} className="rounded-xl h-11 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600">
                              Cancelar
                            </Button>
                            <Button onClick={createTask} disabled={!newTask.title.trim()} className="rounded-xl h-11 bg-indigo-600 hover:bg-indigo-700 text-white px-8 shadow-lg shadow-indigo-500/20">
                              Crear Tarea
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 p-6">
                  {tasks.length === 0 ? (
                    <div className="text-center py-16 bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                      <div className="w-20 h-20 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="h-10 w-10 text-indigo-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">No hay tareas</h3>
                      <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-2">Este pizarrón está vacío. ¡Crea tu primera tarea para comenzar!</p>
                    </div>
                  ) : (
                    tasks.map((task) => {
                      const isActuallyMigrated =
                        task.status === "cancelled" && task.migrated_from_board && task.migrated_at
                      const effectiveStatus = isActuallyMigrated ? "migrated" : task.status
                      const StatusIcon = statusIcons[effectiveStatus]
                      const isMigratedFromPast = task.migrated_from_board && task.migrated_from_date

                      return (
                        <div key={task.id} className="group flex flex-col sm:flex-row gap-4 p-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:shadow-lg hover:border-indigo-200 dark:hover:border-indigo-700 transition-all duration-200">
                          <div className={`w-1.5 self-stretch rounded-full priority-${task.priority}`} />

                          <div className="flex-1">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                              <div className="flex items-center gap-3">
                                <h4 className={`font-bold text-lg ${effectiveStatus === "completed" ? "line-through text-slate-400" : "text-slate-800 dark:text-slate-200"}`}>
                                  {task.title}
                                </h4>
                                <Badge className={`status-badge status-${task.priority} text-[10px] px-2 py-0.5 uppercase tracking-wider`}>
                                  {task.priority}
                                </Badge>
                              </div>

                              <div className="flex items-center gap-2">
                                <Badge className={`
                                   flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border
                                   ${effectiveStatus === "completed" ? "bg-green-50 text-green-700 border-green-200" :
                                    effectiveStatus === "in_progress" ? "bg-blue-50 text-blue-700 border-blue-200" :
                                      effectiveStatus === "pending" ? "bg-yellow-50 text-yellow-700 border-yellow-200" : "bg-slate-100 text-slate-600 border-slate-200"}
                                `}>
                                  <StatusIcon className="h-3.5 w-3.5" />
                                  {effectiveStatus === "pending" && "Pendiente"}
                                  {effectiveStatus === "in_progress" && "En Progreso"}
                                  {effectiveStatus === "completed" && "Completada"}
                                  {effectiveStatus === "cancelled" && "Cancelada"}
                                  {effectiveStatus === "migrated" && "Migrada"}
                                </Badge>
                              </div>
                            </div>

                            {task.description && (
                              <p className="text-sm text-slate-600 dark:text-slate-400 mb-3 line-clamp-2">{task.description}</p>
                            )}

                            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-500 dark:text-slate-400 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/50">
                              {task.estimated_time && (
                                <div className="flex items-center gap-1.5">
                                  <Clock className="h-3.5 w-3.5 text-indigo-400" />
                                  <span>Est: <span className="font-medium text-slate-700 dark:text-slate-300">{task.estimated_time} min</span></span>
                                </div>
                              )}
                              {task.due_time && (
                                <div className="flex items-center gap-1.5">
                                  <AlertCircle className="h-3.5 w-3.5 text-orange-400" />
                                  <span>Límite: <span className="font-medium text-slate-700 dark:text-slate-300">{task.due_time}</span></span>
                                </div>
                              )}
                              {task.completed_at && (
                                <div className="flex items-center gap-1.5">
                                  <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                                  <span>Completada: <span className="font-medium text-slate-700 dark:text-slate-300">{format(new Date(task.completed_at), "HH:mm")}</span></span>
                                </div>
                              )}

                              {isMigratedFromPast && (
                                <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full">
                                  <ArrowUpRight className="h-3 w-3" />
                                  <span>Migrada</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {!isActuallyMigrated && task.status !== "completed" && (
                            <div className="flex flex-row sm:flex-col gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateTaskStatus(task.id, "completed")}
                                className="h-9 w-9 p-0 rounded-full border-green-200 text-green-600 hover:bg-green-50 hover:text-green-700 hover:border-green-300 shadow-sm"
                                title="Completar"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>

                              {task.status === "pending" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateTaskStatus(task.id, "in_progress")}
                                  className="h-9 w-9 p-0 rounded-full border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 shadow-sm"
                                  title="Iniciar"
                                >
                                  <Clock className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                </CardContent>
              </Card>
            )
          ) : (
            <Card className="border-none shadow-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
              <CardContent className="flex flex-col items-center justify-center py-24">
                <div className="w-24 h-24 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center mb-6 animate-pulse">
                  <LayoutGrid className="h-12 w-12 text-indigo-300" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">Selecciona un pizarrón</h3>
                <p className="text-slate-500 dark:text-slate-400 text-center max-w-md">
                  Elige un pizarrón de la lista de la izquierda para ver y gestionar las tareas, o crea uno nuevo si no tienes ninguno para hoy.
                </p>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>
    </motion.div>
  )
}
