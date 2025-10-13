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
  MessageCircle,
  Send,
  Sparkles,
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
import { Textarea } from "@/components/ui/textarea"

interface AtlixAssistantProps {
  onClose?: () => void
}

interface ChatMessage {
  role: "user" | "assistant"
  content: string
  timestamp: Date
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

  const [showAIChat, setShowAIChat] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [userQuestion, setUserQuestion] = useState("")
  const [isLoadingAI, setIsLoadingAI] = useState(false)

  const getMessages = useCallback(() => {
    const messages = [
      `¡Hola! Soy Atlix, tu asistente personal del sistema ATLAS. 🤖`,
      `Tienes ${unreadCount} notificación${unreadCount !== 1 ? "es" : ""} sin leer. ¿Las marco como leídas?`,
      `Hay ${pendingDocs} documento${pendingDocs !== 1 ? "s" : ""} pendiente${pendingDocs !== 1 ? "s" : ""} en ${userDepartment || "tu área"}.`,
      `¿Necesitas crear un evento rápido en tu calendario?`,
      `Mantén tu flujo de trabajo actualizado revisando tus documentos regularmente.`,
      `¿Necesitas ayuda navegando? Puedo llevarte a cualquier sección.`,
      `¡Excelente trabajo! Todo está al día en tu área.`,
      `¿Tienes alguna pregunta? Ahora puedo responderte con inteligencia artificial. 💡`,
    ]

    return messages.filter((_, index) => {
      if (index === 1 && unreadCount === 0) return false
      if (index === 2 && pendingDocs === 0) return false
      if (index === 6 && (unreadCount > 0 || pendingDocs > 0)) return false
      return true
    })
  }, [unreadCount, pendingDocs, userDepartment])

  const handleAskAI = async () => {
    if (!userQuestion.trim()) return

    const userMsg: ChatMessage = {
      role: "user",
      content: userQuestion,
      timestamp: new Date(),
    }

    setChatMessages((prev) => [...prev, userMsg])
    setUserQuestion("")
    setIsLoadingAI(true)

    try {
      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userQuestion,
          history: chatMessages, // Include conversation history
          context: {
            userId: user?.id,
            companyId: selectedCompany?.id || user?.company_id,
            department: userDepartment,
          },
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to get AI response")
      }

      const data = await response.json()

      const aiMsg: ChatMessage = {
        role: "assistant",
        content: data.response,
        timestamp: new Date(),
      }

      setChatMessages((prev) => [...prev, aiMsg])
    } catch (error: any) {
      console.error("Error asking AI:", error)
      toast({
        title: "Error",
        description: "No pude procesar tu pregunta. Intenta de nuevo.",
        variant: "destructive",
      })

      const errorMsg: ChatMessage = {
        role: "assistant",
        content: "Lo siento, tuve un problema procesando tu pregunta. Por favor intenta de nuevo.",
        timestamp: new Date(),
      }
      setChatMessages((prev) => [...prev, errorMsg])
    } finally {
      setIsLoadingAI(false)
    }
  }

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

  const fetchUserData = useCallback(async () => {
    if (!user) return

    try {
      const companyId = user.role === "admin" && selectedCompany ? selectedCompany.id : undefined
      const unreadNotifications = await getUnreadNotificationsCount(user.id, companyId)
      setUnreadCount(unreadNotifications)

      if (user.department_id) {
        const { data: documents, error } = await supabase
          .from("documents")
          .select("id, title, status")
          .eq("current_department_id", user.department_id)
          .eq("status", "pending")

        if (!error) {
          setPendingDocs(documents?.length || 0)
        }

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

  useEffect(() => {
    if (!user) {
      setIsVisible(false)
      return
    }

    const showTimer = setTimeout(() => {
      setIsVisible(true)
      fetchUserData()
    }, 3000)

    return () => clearTimeout(showTimer)
  }, [user, fetchUserData])

  useEffect(() => {
    if (!isVisible || !user) return

    const interval = setInterval(fetchUserData, 30000)
    return () => clearInterval(interval)
  }, [isVisible, user, fetchUserData])

  useEffect(() => {
    if (!isVisible) return

    const messages = getMessages()
    if (messages.length <= 1) return

    const interval = setInterval(() => {
      setCurrentMessage((prev) => (prev + 1) % messages.length)
    }, 6000)

    return () => clearInterval(interval)
  }, [isVisible, getMessages])

  useEffect(() => {
    if (!isVisible) return

    const hideTimer = setTimeout(() => {
      handleClose()
    }, 180000)

    return () => clearTimeout(hideTimer)
  }, [isVisible])

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => {
      setIsVisible(false)
      setIsClosing(false)
      onClose?.()
    }, 800)
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
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
          <div className="text-white font-bold text-lg z-10">Ax</div>
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-bounce"></div>
          <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-yellow-400 rounded-full border border-white animate-pulse"></div>

          {isMinimized && (
            <div className="absolute inset-0 bg-black/20 rounded-full flex items-center justify-center">
              <Maximize2 className="h-6 w-6 text-white animate-pulse" />
            </div>
          )}
        </div>

        {!isMinimized && (
          <div className="relative atlix-bubble rounded-2xl shadow-2xl p-4 max-w-sm animate-fadeIn">
            <div className="absolute -top-2 right-6 w-4 h-4 bg-white dark:bg-slate-800 border-l border-t border-purple-200 dark:border-purple-600 transform rotate-45"></div>

            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">Ax</span>
                </div>
                <span className="font-semibold text-gray-800 dark:text-gray-200 text-sm">Atlix</span>
                <Badge
                  variant="outline"
                  className="text-xs flex items-center gap-1 bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 border-purple-300 dark:border-purple-600"
                >
                  <Sparkles className="h-2 w-2" />
                  AI
                </Badge>
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

            {showAIChat ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-purple-800 dark:text-purple-200 flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Chat con IA
                  </h4>
                  <Button variant="ghost" size="sm" onClick={() => setShowAIChat(false)} className="h-6 text-xs">
                    Volver
                  </Button>
                </div>

                <div className="max-h-64 overflow-y-auto space-y-2 p-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                  {chatMessages.length === 0 ? (
                    <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-4">
                      <Sparkles className="h-8 w-8 mx-auto mb-2 text-purple-400" />
                      <p>Pregúntame lo que necesites sobre ATLAS</p>
                    </div>
                  ) : (
                    chatMessages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`p-2 rounded-lg text-xs ${
                          msg.role === "user"
                            ? "bg-purple-100 dark:bg-purple-900/30 ml-4"
                            : "bg-blue-100 dark:bg-blue-900/30 mr-4"
                        }`}
                      >
                        <div className="font-semibold mb-1 text-gray-700 dark:text-gray-300">
                          {msg.role === "user" ? "Tú" : "Atlix"}
                        </div>
                        <div className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{msg.content}</div>
                      </div>
                    ))
                  )}
                  {isLoadingAI && (
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 p-2">
                      <Clock className="h-3 w-3 animate-spin" />
                      Pensando...
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Textarea
                    placeholder="Escribe tu pregunta..."
                    value={userQuestion}
                    onChange={(e) => setUserQuestion(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        handleAskAI()
                      }
                    }}
                    className="text-sm min-h-[60px] resize-none"
                    disabled={isLoadingAI}
                  />
                  <Button
                    size="sm"
                    onClick={handleAskAI}
                    disabled={isLoadingAI || !userQuestion.trim()}
                    className="h-[60px] bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  >
                    {isLoadingAI ? <Clock className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            ) : (
              <>
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
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowEventForm(false)}
                          className="h-7 text-xs"
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="text-sm text-gray-700 dark:text-gray-300 mb-3 leading-relaxed">{currentMsg}</div>

                <div className="flex gap-2 flex-wrap mb-3">
                  {unreadCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="text-xs flex items-center gap-1 cursor-pointer hover:bg-red-600 transition-colors"
                      onClick={handleMarkAllNotifications}
                    >
                      {isMarkingNotifications ? (
                        <Clock className="h-3 w-3 animate-spin" />
                      ) : (
                        <Bell className="h-3 w-3" />
                      )}
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
                    onClick={() => setShowAIChat(true)}
                    className="w-full h-8 text-xs justify-between bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 hover:from-purple-100 hover:to-blue-100 dark:hover:from-purple-900/30 dark:hover:to-blue-900/30 border border-purple-200 dark:border-purple-700"
                  >
                    <span className="flex items-center gap-2">
                      <Sparkles className="h-3 w-3" />
                      Pregúntame con IA
                    </span>
                    <MessageCircle className="h-3 w-3" />
                  </Button>

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
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
