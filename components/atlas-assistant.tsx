"use client"

import { useState, useEffect, useCallback } from "react"
import {
  X,
  Bell,
  FileText,
  CheckCircle,
  Minimize2,
  Maximize2,
  Calendar,
  Plus,
  Users,
  BarChart3,
  ChevronRight,
  Clock,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/lib/auth-context"
import { useCompany } from "@/lib/company-context"
import { getUnreadNotificationsCount, markAllNotificationsAsRead } from "@/lib/notifications"
import { supabase } from "@/lib/supabase"
import { toast } from "@/components/ui/use-toast"
import { format } from "date-fns"

interface AtlixAssistantProps {
  onClose?: () => void
}

export function AtlasAssistant({ onClose }: AtlixAssistantProps) {
  const { user } = useAuth()
  const { selectedCompany } = useCompany()
  const [isVisible, setIsVisible] = useState(false)
  const [currentMessage, setCurrentMessage] = useState(0)
  const [unreadCount, setUnreadCount] = useState(0)
  const [pendingDocs, setPendingDocs] = useState(0)
  const [userDepartment, setUserDepartment] = useState<string>("")
  const [isMinimized, setIsMinimized] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [showQuickActions, setShowQuickActions] = useState(false)
  const [showEventForm, setShowEventForm] = useState(false)
  const [eventTitle, setEventTitle] = useState("")
  const [eventDate, setEventDate] = useState("")
  const [isCreatingEvent, setIsCreatingEvent] = useState(false)
  const [isMarkingNotifications, setIsMarkingNotifications] = useState(false)

  const getMessages = useCallback(() => {
    const messages = [
      `¡Hola! Soy Atlix, tu asistente personal del sistema ATLAS. 🤖`,
      `Tienes ${unreadCount} notificación${unreadCount !== 1 ? "es" : ""} sin leer. ¿Las marco como leídas?`,
      `Hay ${pendingDocs} documento${pendingDocs !== 1 ? "s" : ""} pendiente${pendingDocs !== 1 ? "s" : ""} en ${userDepartment || "tu área"}.`,
      `¿Necesitas crear un evento rápido en tu calendario?`,
      `Mantén tu flujo de trabajo actualizado revisando tus documentos regularmente.`,
      `¿Necesitas ayuda navegando? Puedo llevarte a cualquier sección.`,
      `¡Excelente trabajo! Todo está al día en tu área.`,
    ]

    // Filtrar mensajes según los datos
    return messages.filter((_, index) => {
      if (index === 1 && unreadCount === 0) return false
      if (index === 2 && pendingDocs === 0) return false
      if (index === 6 && (unreadCount > 0 || pendingDocs > 0)) return false
      return true
    })
  }, [unreadCount, pendingDocs, userDepartment])

  const handleCreateQuickEvent = async () => {
    if (!eventTitle.trim() || !eventDate) {
      toast({
        title: "Datos incompletos",
        description: "Por favor completa el título y la fecha del evento.",
        variant: "destructive",
      })
      return
    }

    setIsCreatingEvent(true)
    try {
      const { error } = await supabase.from("calendar_events").insert({
        user_id: user?.id!,
        company_id: user?.company_id || selectedCompany?.id || null,
        title: eventTitle,
        event_date: eventDate,
        importance: "medium",
        is_completed: false,
        notification_sent: false,
        category: "work",
      })

      if (error) throw error

      toast({
        title: "¡Evento creado!",
        description: `"${eventTitle}" se agregó a tu calendario.`,
      })

      setEventTitle("")
      setEventDate("")
      setShowEventForm(false)
    } catch (error: any) {
      toast({
        title: "Error",
        description: `No se pudo crear el evento: ${error.message}`,
        variant: "destructive",
      })
    } finally {
      setIsCreatingEvent(false)
    }
  }

  const handleMarkAllNotifications = async () => {
    if (unreadCount === 0) return

    setIsMarkingNotifications(true)
    try {
      const companyId = user?.role === "admin" && selectedCompany ? selectedCompany.id : undefined
      await markAllNotificationsAsRead(user?.id!, companyId)

      setUnreadCount(0)
      toast({
        title: "¡Listo!",
        description: "Todas las notificaciones han sido marcadas como leídas.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron marcar las notificaciones.",
        variant: "destructive",
      })
    } finally {
      setIsMarkingNotifications(false)
    }
  }

  const handleQuickNavigation = (path: string) => {
    window.location.href = path
  }

  // Obtener datos del usuario
  const fetchUserData = useCallback(async () => {
    if (!user) return

    try {
      // Obtener notificaciones no leídas
      const companyId = user.role === "admin" && selectedCompany ? selectedCompany.id : undefined
      const unreadNotifications = await getUnreadNotificationsCount(user.id, companyId)
      setUnreadCount(unreadNotifications)

      // Obtener documentos pendientes del departamento del usuario
      if (user.department_id) {
        const { data: documents, error } = await supabase
          .from("documents")
          .select("id, title, status")
          .eq("current_department_id", user.department_id)
          .eq("status", "pending")

        if (!error) {
          setPendingDocs(documents?.length || 0)
        }

        // Obtener nombre del departamento
        const { data: department } = await supabase
          .from("departments")
          .select("name")
          .eq("id", user.department_id)
          .single()

        if (department) {
          setUserDepartment(department.name)
        }
      }
    } catch (error) {
      console.error("Error fetching Atlix data:", error)
    }
  }, [user, selectedCompany])

  // Inicializar Atlix después del login
  useEffect(() => {
    if (!user) {
      setIsVisible(false)
      return
    }

    // Mostrar Atlix 3 segundos después del login
    const showTimer = setTimeout(() => {
      setIsVisible(true)
      fetchUserData()
    }, 3000)

    return () => clearTimeout(showTimer)
  }, [user, fetchUserData])

  // Actualizar datos cada 30 segundos
  useEffect(() => {
    if (!isVisible || !user) return

    const interval = setInterval(fetchUserData, 30000)
    return () => clearInterval(interval)
  }, [isVisible, user, fetchUserData])

  // Cambiar mensaje cada 6 segundos
  useEffect(() => {
    if (!isVisible) return

    const messages = getMessages()
    if (messages.length <= 1) return

    const interval = setInterval(() => {
      setCurrentMessage((prev) => (prev + 1) % messages.length)
    }, 6000)

    return () => clearInterval(interval)
  }, [isVisible, getMessages])

  // Auto-ocultar después de 3 minutos
  useEffect(() => {
    if (!isVisible) return

    const hideTimer = setTimeout(() => {
      handleClose()
    }, 180000) // 3 minutos

    return () => clearTimeout(hideTimer)
  }, [isVisible])

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => {
      setIsVisible(false)
      setIsClosing(false) // Reset del estado
      onClose?.()
    }, 800) // Reducido para coincidir mejor con la animación CSS
  }

  const handleMinimize = () => {
    setIsMinimized(!isMinimized)
  }

  const handleAvatarClick = () => {
    if (isMinimized) {
      setIsMinimized(false)
    }
  }

  if (!isVisible || !user) return null

  const messages = getMessages()
  const currentMsg = messages[currentMessage] || messages[0]

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 transition-all duration-500 ease-in-out ${
        isClosing ? "atlix-disintegrate opacity-0 pointer-events-none" : "atlix-entrance opacity-100"
      } ${isMinimized ? "scale-75" : "scale-100"}`}
    >
      <div className="relative">
        <div
          className={`w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 via-blue-500 to-cyan-500 shadow-2xl flex items-center justify-center mb-2 atlix-float border-4 border-white relative overflow-hidden ${isMinimized ? "cursor-pointer hover:scale-110 transition-transform" : ""}`}
          onClick={handleAvatarClick}
        >
          {/* Efecto de brillo */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
          <div className="text-white font-bold text-lg z-10">Ax</div>
          {/* Partículas decorativas */}
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-bounce"></div>
          <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-yellow-400 rounded-full border border-white animate-pulse"></div>

          {isMinimized && (
            <div className="absolute inset-0 bg-black/20 rounded-full flex items-center justify-center">
              <Maximize2 className="h-6 w-6 text-white animate-pulse" />
            </div>
          )}
        </div>

        {/* Message Bubble */}
        {!isMinimized && (
          <div className="relative atlix-bubble rounded-2xl shadow-2xl p-4 max-w-sm animate-fadeIn">
            {/* Speech bubble arrow */}
            <div className="absolute -top-2 right-6 w-4 h-4 bg-white dark:bg-slate-800 border-l border-t border-purple-200 dark:border-purple-600 transform rotate-45"></div>

            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">Ax</span>
                </div>
                <span className="font-semibold text-gray-800 dark:text-gray-200 text-sm">Atlix</span>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMinimize}
                  className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Minimize2 className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClose}
                  className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {showEventForm && (
              <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                <h4 className="text-sm font-semibold mb-2 text-blue-800 dark:text-blue-200">Crear Evento Rápido</h4>
                <div className="space-y-2">
                  <Input
                    placeholder="Título del evento..."
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                    className="text-sm h-8"
                  />
                  <Input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="text-sm h-8"
                    min={format(new Date(), "yyyy-MM-dd")}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleCreateQuickEvent}
                      disabled={isCreatingEvent}
                      className="h-7 text-xs bg-blue-600 hover:bg-blue-700"
                    >
                      {isCreatingEvent ? <Clock className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                      Crear
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setShowEventForm(false)} className="h-7 text-xs">
                      Cancelar
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Message */}
            <div className="text-sm text-gray-700 dark:text-gray-300 mb-3 leading-relaxed">{currentMsg}</div>

            {/* Status Indicators */}
            <div className="flex gap-2 flex-wrap mb-3">
              {unreadCount > 0 && (
                <Badge
                  variant="destructive"
                  className="text-xs flex items-center gap-1 cursor-pointer hover:bg-red-600 transition-colors"
                  onClick={handleMarkAllNotifications}
                >
                  {isMarkingNotifications ? <Clock className="h-3 w-3 animate-spin" /> : <Bell className="h-3 w-3" />}
                  {unreadCount}
                </Badge>
              )}
              {pendingDocs > 0 && (
                <Badge
                  variant="secondary"
                  className="text-xs flex items-center gap-1 cursor-pointer hover:bg-gray-300 transition-colors"
                  onClick={() => handleQuickNavigation("/documents")}
                >
                  <FileText className="h-3 w-3" />
                  {pendingDocs}
                </Badge>
              )}
              {unreadCount === 0 && pendingDocs === 0 && (
                <Badge
                  variant="outline"
                  className="text-xs flex items-center gap-1 text-green-600 border-green-200 dark:text-green-400 dark:border-green-600"
                >
                  <CheckCircle className="h-3 w-3" />
                  Todo al día
                </Badge>
              )}
            </div>

            <div className="space-y-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowQuickActions(!showQuickActions)}
                className="w-full h-7 text-xs justify-between hover:bg-purple-50 dark:hover:bg-purple-900/20"
              >
                <span>Acciones Rápidas</span>
                <ChevronRight className={`h-3 w-3 transition-transform ${showQuickActions ? "rotate-90" : ""}`} />
              </Button>

              {showQuickActions && (
                <div className="grid grid-cols-2 gap-1 p-2 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowEventForm(true)}
                    className="h-8 text-xs flex items-center gap-1 hover:bg-white dark:hover:bg-gray-800"
                  >
                    <Calendar className="h-3 w-3" />
                    Evento
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleQuickNavigation("/notifications")}
                    className="h-8 text-xs flex items-center gap-1 hover:bg-white dark:hover:bg-gray-800"
                  >
                    <Bell className="h-3 w-3" />
                    Notif.
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleQuickNavigation("/documents/new")}
                    className="h-8 text-xs flex items-center gap-1 hover:bg-white dark:hover:bg-gray-800"
                  >
                    <Plus className="h-3 w-3" />
                    Doc.
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleQuickNavigation("/calendar")}
                    className="h-8 text-xs flex items-center gap-1 hover:bg-white dark:hover:bg-gray-800"
                  >
                    <Calendar className="h-3 w-3" />
                    Agenda
                  </Button>
                  {user?.role === "admin" && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleQuickNavigation("/users")}
                        className="h-8 text-xs flex items-center gap-1 hover:bg-white dark:hover:bg-gray-800"
                      >
                        <Users className="h-3 w-3" />
                        Usuarios
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleQuickNavigation("/statistics")}
                        className="h-8 text-xs flex items-center gap-1 hover:bg-white dark:hover:bg-gray-800"
                      >
                        <BarChart3 className="h-3 w-3" />
                        Stats
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Progress dots */}
            {messages.length > 1 && (
              <div className="flex justify-center gap-1 mt-3">
                {messages.map((_, index) => (
                  <div
                    key={index}
                    className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                      index === currentMessage ? "bg-purple-500" : "bg-gray-300 dark:bg-gray-600"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
