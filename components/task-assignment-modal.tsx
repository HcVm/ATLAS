"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { useCompany } from "@/lib/company-context"
import { useRoleAccess } from "@/hooks/use-role-access"
import { supabase } from "@/lib/supabase"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "@/hooks/use-toast"
import { Calendar, Target, User } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

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
  board_date: string
  status: string
  user_id: string
}

interface TaskAssignmentModalProps {
  isOpen: boolean
  onClose: () => void
  selectedEmployeeId?: string
  selectedBoardId?: string
  onTaskAssigned?: () => void
}

export function TaskAssignmentModal({
  isOpen,
  onClose,
  selectedEmployeeId,
  selectedBoardId,
  onTaskAssigned,
}: TaskAssignmentModalProps) {
  const { user } = useAuth()
  const { selectedCompany } = useCompany()
  const { hasPermission } = useRoleAccess()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [taskBoards, setTaskBoards] = useState<TaskBoard[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    employeeId: selectedEmployeeId || "",
    boardId: selectedBoardId || "",
    title: "",
    description: "",
    priority: "medium" as const,
    estimatedTime: "",
    dueTime: "",
    dueDate: format(new Date(), "yyyy-MM-dd"),
  })

  useEffect(() => {
    if (isOpen && selectedCompany) {
      loadEmployees()
    }
  }, [isOpen, selectedCompany])

  useEffect(() => {
    if (formData.employeeId) {
      loadEmployeeBoards(formData.employeeId)
    }
  }, [formData.employeeId])

  useEffect(() => {
    if (selectedEmployeeId) {
      setFormData((prev) => ({ ...prev, employeeId: selectedEmployeeId }))
    }
    if (selectedBoardId) {
      setFormData((prev) => ({ ...prev, boardId: selectedBoardId }))
    }
  }, [selectedEmployeeId, selectedBoardId])

  const loadEmployees = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, role, department_id, avatar_url")
        .eq("company_id", selectedCompany?.id)
        .in("role", ["user", "supervisor"])
        .order("full_name")

      if (error) throw error
      setEmployees(data || [])
    } catch (error) {
      console.error("Error loading employees:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los empleados",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadEmployeeBoards = async (employeeId: string) => {
    try {
      const { data, error } = await supabase
        .from("task_boards")
        .select("id, title, board_date, status, user_id")
        .eq("user_id", employeeId)
        .eq("status", "active")
        .gte("board_date", format(new Date(), "yyyy-MM-dd"))
        .order("board_date", { ascending: true })

      if (error) throw error
      setTaskBoards(data || [])

      const todayBoard = data?.find((board) => board.board_date === format(new Date(), "yyyy-MM-dd"))
      if (todayBoard && !selectedBoardId) {
        setFormData((prev) => ({ ...prev, boardId: todayBoard.id }))
      }
    } catch (error) {
      console.error("Error loading employee boards:", error)
      setTaskBoards([])
    }
  }

  const createBoardForEmployee = async (employeeId: string, date: string) => {
    try {
      const { data, error } = await supabase
        .from("task_boards")
        .insert({
          user_id: employeeId,
          company_id: selectedCompany?.id,
          board_date: date,
          title: `Tareas del ${format(new Date(date), "dd/MM/yyyy", { locale: es })}`,
          status: "active",
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error("Error creating board:", error)
      throw error
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.employeeId || !formData.title.trim()) return

    try {
      setSubmitting(true)

      let boardId = formData.boardId

      if (!boardId) {
        const newBoard = await createBoardForEmployee(formData.employeeId, formData.dueDate)
        boardId = newBoard.id
      }

      const { count } = await supabase.from("tasks").select("*", { count: "exact", head: true }).eq("board_id", boardId)

      const { data, error } = await supabase
        .from("tasks")
        .insert({
          board_id: boardId,
          title: formData.title,
          description: formData.description || null,
          priority: formData.priority,
          estimated_time: formData.estimatedTime ? Number.parseInt(formData.estimatedTime) : null,
          due_time: formData.dueTime || null,
          created_by: user?.id,
          assigned_by: user?.id,
          position: count || 0,
          status: "pending",
        })
        .select()
        .single()

      if (error) throw error

      await supabase.from("task_history").insert({
        task_id: data.id,
        action: "created",
        changed_by: user?.id,
        details: `Tarea asignada por ${user?.email}`,
      })

      toast({
        title: "Tarea asignada",
        description: `La tarea "${formData.title}" ha sido asignada exitosamente`,
      })

      setFormData({
        employeeId: selectedEmployeeId || "",
        boardId: selectedBoardId || "",
        title: "",
        description: "",
        priority: "medium",
        estimatedTime: "",
        dueTime: "",
        dueDate: format(new Date(), "yyyy-MM-dd"),
      })

      onTaskAssigned?.()
      onClose()
    } catch (error) {
      console.error("Error assigning task:", error)
      toast({
        title: "Error",
        description: "No se pudo asignar la tarea",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const selectedEmployee = employees.find((emp) => emp.id === formData.employeeId)
  const selectedBoard = taskBoards.find((board) => board.id === formData.boardId)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Asignar Nueva Tarea
          </DialogTitle>
          <DialogDescription>Crea y asigna una nueva tarea a un empleado de tu equipo</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Employee Selection */}
          <div className="space-y-2">
            <Label htmlFor="employee">Empleado *</Label>
            <Select
              value={formData.employeeId}
              onValueChange={(value) => setFormData({ ...formData, employeeId: value, boardId: "" })}
              disabled={!!selectedEmployeeId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar empleado" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    <div className="flex items-center space-x-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={employee.avatar_url || "/placeholder.svg"} />
                        <AvatarFallback className="text-xs">
                          {employee.full_name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <span className="font-medium">{employee.full_name}</span>
                        <span className="text-sm text-gray-500 ml-2">
                          ({employee.department_id || "Sin departamento"})
                        </span>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedEmployee && (
              <div className="flex items-center space-x-2 p-2 bg-blue-50 rounded-lg">
                <User className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-blue-800">
                  Asignando a: <strong>{selectedEmployee.full_name}</strong> ({selectedEmployee.email})
                </span>
              </div>
            )}
          </div>

          {/* Board Selection */}
          {formData.employeeId && (
            <div className="space-y-2">
              <Label htmlFor="board">Pizarrón de Tareas</Label>
              <Select
                value={formData.boardId}
                onValueChange={(value) => setFormData({ ...formData, boardId: value })}
                disabled={!!selectedBoardId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar pizarrón o crear uno nuevo" />
                </SelectTrigger>
                <SelectContent>
                  {taskBoards.map((board) => (
                    <SelectItem key={board.id} value={board.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{board.title}</span>
                        <Badge variant="outline" className="ml-2">
                          {format(new Date(board.board_date), "dd/MM", { locale: es })}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedBoard && (
                <div className="flex items-center space-x-2 p-2 bg-green-50 rounded-lg">
                  <Calendar className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-800">
                    Pizarrón: <strong>{selectedBoard.title}</strong>
                  </span>
                </div>
              )}

              {!formData.boardId && (
                <p className="text-sm text-gray-600">
                  Si no seleccionas un pizarrón, se creará uno nuevo para la fecha especificada.
                </p>
              )}
            </div>
          )}

          {/* Task Details */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="title">Título de la Tarea *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ej: Revisar documentos del cliente X"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detalles adicionales sobre la tarea..."
                rows={3}
              />
            </div>
          </div>

          {/* Task Properties */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="priority">Prioridad</Label>
              <Select
                value={formData.priority}
                onValueChange={(value: any) => setFormData({ ...formData, priority: value })}
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
              <Label htmlFor="estimatedTime">Tiempo Estimado (min)</Label>
              <Input
                id="estimatedTime"
                type="number"
                value={formData.estimatedTime}
                onChange={(e) => setFormData({ ...formData, estimatedTime: e.target.value })}
                placeholder="60"
                min="1"
              />
            </div>
          </div>

          {/* Due Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dueDate">Fecha Límite</Label>
              <Input
                id="dueDate"
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                min={format(new Date(), "yyyy-MM-dd")}
              />
            </div>

            <div>
              <Label htmlFor="dueTime">Hora Límite</Label>
              <Input
                id="dueTime"
                type="time"
                value={formData.dueTime}
                onChange={(e) => setFormData({ ...formData, dueTime: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!formData.employeeId || !formData.title.trim() || submitting}>
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Asignando...
                </>
              ) : (
                <>
                  <Target className="h-4 w-4 mr-2" />
                  Asignar Tarea
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
