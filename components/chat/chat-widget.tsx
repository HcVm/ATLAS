"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  MessageCircle,
  X,
  Send,
  Search,
  ArrowLeft,
  Plus,
  Users,
  Circle,
  Clock,
  MoreVertical,
  Trash2,
  Info,
  Minimize2,
  X as CloseIcon,
  Check,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useChat, type ChatConversation, type ChatParticipant } from "@/lib/chat-context"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"
import { formatDistanceToNow, format } from "date-fns"
import { es } from "date-fns/locale"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "@/components/ui/use-toast"

export function ChatWidget() {
  const { user } = useAuth()
  const {
    conversations,
    currentConversation,
    messages,
    onlineUsers,
    isLoading,
    isChatOpen,
    isWidgetVisible,
    unreadTotal,
    setIsChatOpen,
    setIsWidgetVisible,
    selectConversation,
    sendMessage,
    createConversation,
    searchUsers,
    deleteConversation,
  } = useChat()

  const [view, setView] = useState<"list" | "chat" | "new">("list")
  const [messageInput, setMessageInput] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<ChatParticipant[]>([])
  const [selectedUsers, setSelectedUsers] = useState<ChatParticipant[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Scroll al último mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Buscar usuarios
  useEffect(() => {
    const search = async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults([])
        return
      }
      setIsSearching(true)
      const results = await searchUsers(searchQuery)
      setSearchResults(results.filter((r) => !selectedUsers.some((s) => s.user_id === r.user_id)))
      setIsSearching(false)
    }

    const debounce = setTimeout(search, 300)
    return () => clearTimeout(debounce)
  }, [searchQuery, searchUsers, selectedUsers])

  // Manejar envío de mensaje
  const handleSendMessage = async () => {
    if (!messageInput.trim() || isSending) return

    try {
      setIsSending(true)
      await sendMessage(messageInput)
      setMessageInput("")
      inputRef.current?.focus()
    } catch (error) {
      console.error("Error sending message:", error)
    } finally {
      setIsSending(false)
    }
  }

  // Manejar tecla Enter
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Abrir conversación
  const handleOpenConversation = (conv: ChatConversation) => {
    selectConversation(conv)
    setView("chat")
    if (isMobile && !isChatOpen) {
      setIsChatOpen(true)
    }
  }

  // Crear nueva conversación
  const handleCreateConversation = async () => {
    if (selectedUsers.length === 0) return

    const conv = await createConversation(
      selectedUsers.map((u) => u.user_id),
      selectedUsers.length > 1 ? `Grupo (${selectedUsers.length + 1})` : undefined,
    )

    if (conv) {
      selectConversation(conv)
      setView("chat")
      setSelectedUsers([])
      setSearchQuery("")
    }
  }

  // Volver a la lista
  const handleBack = () => {
    selectConversation(null)
    setView("list")
    setSelectedUsers([])
    setSearchQuery("")
  }

  // Obtener nombre de la conversación
  const getConversationName = (conv: ChatConversation) => {
    if (conv.name) return conv.name
    if (conv.is_group) return `Grupo (${conv.participants.length})`
    const otherParticipant = conv.participants.find((p) => p.user_id !== user?.id)
    return otherParticipant?.full_name || "Chat"
  }

  // Obtener avatar de la conversación
  const getConversationAvatar = (conv: ChatConversation) => {
    if (conv.is_group) return null
    const otherParticipant = conv.participants.find((p) => p.user_id !== user?.id)
    return otherParticipant?.avatar_url
  }

  // Verificar si usuario está online
  const isUserOnline = (userId: string) => {
    return onlineUsers.has(userId)
  }

  // Obtener iniciales
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const handleDeleteConversation = async () => {
    if (!currentConversation) return

    try {
      await deleteConversation(currentConversation.id)
      setShowDeleteDialog(false)
      handleBack()

      toast({
        title: "Conversación eliminada",
        description: "La conversación ha sido eliminada de tu bandeja",
      })
    } catch (error) {
      console.error("Error al eliminar conversación:", error)
      toast({
        title: "Error",
        description: "No se pudo eliminar la conversación",
        variant: "destructive",
      })
    }
  }

  const handleMinimize = () => {
    setIsChatOpen(false)
    if (isMobile) {
      selectConversation(null)
      setView("list")
    }
  }

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640)
    }
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  useEffect(() => {
    if (isMobile && currentConversation && !isChatOpen) {
      setIsChatOpen(true)
      setView("chat")
    }
  }, [currentConversation, isMobile, isChatOpen, setIsChatOpen])

  if (!user || !isWidgetVisible) return null

  return (
    <TooltipProvider>
      {/* Botón flotante */}
      <motion.div
        className="fixed bottom-20 right-4 sm:bottom-24 sm:right-6 z-50"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="lg"
              className={cn(
                "h-12 w-12 sm:h-14 sm:w-14 rounded-full shadow-lg shadow-indigo-500/30 transition-all duration-300 hover:scale-110",
                isChatOpen 
                  ? "bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600 text-white" 
                  : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white",
              )}
              onClick={() => setIsChatOpen(!isChatOpen)}
            >
              <AnimatePresence mode="wait">
                {isChatOpen ? (
                  <motion.div
                    key="close"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <X className="h-6 w-6" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="chat"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="relative"
                  >
                    <MessageCircle className="h-6 w-6" />
                    {unreadTotal > 0 && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center border-2 border-white dark:border-slate-900"
                      >
                        {unreadTotal > 99 ? "99+" : unreadTotal}
                      </motion.span>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>{isChatOpen ? "Cerrar chat" : "Abrir chat"}</p>
          </TooltipContent>
        </Tooltip>
      </motion.div>

      {/* Panel de chat */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={cn(
              "fixed z-50 overflow-hidden flex flex-col",
              "bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 shadow-2xl",
              "bottom-0 left-0 right-0 top-20 sm:top-auto sm:bottom-24 sm:left-auto sm:right-6 sm:w-[400px] sm:h-[600px] sm:rounded-3xl",
            )}
          >
            {/* Header */}
            <div className="shrink-0 px-4 py-3 border-b border-slate-100/50 dark:border-slate-800/50 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                {(view === "chat" || view === "new") && (
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800" onClick={handleBack}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                )}

                {view === "list" && (
                  <>
                    <div className="h-8 w-8 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                      <MessageCircle className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-sm bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">Chat ATLAS</h3>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Mensajes temporales
                      </p>
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 rounded-full"
                          onClick={() => {
                            setIsWidgetVisible(false)
                            setIsChatOpen(false)
                          }}
                        >
                          <CloseIcon className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Quitar widget</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-slate-500" onClick={handleMinimize}>
                          <Minimize2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Minimizar</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-indigo-600 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40" onClick={() => setView("new")}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Nueva conversación</TooltipContent>
                    </Tooltip>
                  </>
                )}

                {view === "chat" && currentConversation && (
                  <>
                    <Avatar className="h-9 w-9 border-2 border-white dark:border-slate-800 shadow-sm">
                      <AvatarImage src={getConversationAvatar(currentConversation) || ""} />
                      <AvatarFallback className="text-xs bg-gradient-to-br from-indigo-100 to-slate-100 text-indigo-600">
                        {currentConversation.is_group ? (
                          <Users className="h-4 w-4" />
                        ) : (
                          getInitials(getConversationName(currentConversation))
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm truncate text-slate-800 dark:text-slate-100">{getConversationName(currentConversation)}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        {!currentConversation.is_group && (
                          <>
                            <span className={cn(
                              "h-2 w-2 rounded-full",
                              isUserOnline(
                                currentConversation.participants.find((p) => p.user_id !== user.id)?.user_id || "",
                              )
                                ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"
                                : "bg-slate-300 dark:bg-slate-600",
                            )} />
                            <span className="hidden sm:inline">
                              {isUserOnline(
                                currentConversation.participants.find((p) => p.user_id !== user.id)?.user_id || "",
                              )
                                ? "En línea"
                                : "Desconectado"}
                            </span>
                          </>
                        )}
                        {currentConversation.is_group && (
                          <span>{currentConversation.participants.length} participantes</span>
                        )}
                      </p>
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 rounded-full"
                          onClick={() => {
                            setIsWidgetVisible(false)
                            setIsChatOpen(false)
                          }}
                        >
                          <CloseIcon className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Quitar widget</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-slate-500" onClick={handleMinimize}>
                          <Minimize2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Minimizar</TooltipContent>
                    </Tooltip>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-slate-500">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl border-slate-100 dark:border-slate-800 shadow-xl">
                        <DropdownMenuItem className="py-2">
                          <Info className="h-4 w-4 mr-2 text-indigo-500" />
                          Ver detalles
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600 focus:bg-red-50 dark:focus:bg-red-900/20 py-2" onClick={() => setShowDeleteDialog(true)}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar chat
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                )}

                {view === "new" && (
                  <>
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm">Nueva conversación</h3>
                      <p className="text-xs text-muted-foreground hidden sm:block">Selecciona usuarios para chatear</p>
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={handleMinimize}>
                          <Minimize2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Minimizar</TooltipContent>
                    </Tooltip>
                  </>
                )}
              </div>
            </div>

            {/* Contenido */}
            <div className="flex-1 overflow-hidden flex flex-col bg-slate-50/50 dark:bg-slate-900/50 relative">
              {/* Pattern Background */}
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/subtle-dots.png')]"></div>
              
              {/* Vista de lista de conversaciones */}
              {view === "list" && (
                <ScrollArea className="flex-1 relative z-10">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-full p-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
                    </div>
                  ) : conversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                      <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                        <MessageCircle className="h-8 w-8 text-slate-400" />
                      </div>
                      <p className="text-sm text-slate-500 font-medium">No tienes conversaciones</p>
                      <Button variant="link" size="sm" onClick={() => setView("new")} className="mt-2 text-indigo-600">
                        Iniciar una nueva
                      </Button>
                    </div>
                  ) : (
                    <div className="p-2 space-y-1">
                      {conversations.map((conv) => {
                        const otherParticipant = conv.participants.find((p) => p.user_id !== user.id)
                        const isOnline = otherParticipant ? isUserOnline(otherParticipant.user_id) : false

                        return (
                          <motion.button
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            key={conv.id}
                            onClick={() => handleOpenConversation(conv)}
                            className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-white/80 dark:hover:bg-slate-800/80 transition-all text-left group border border-transparent hover:border-slate-100 dark:hover:border-slate-700 hover:shadow-sm"
                          >
                            <div className="relative">
                              <Avatar className="h-12 w-12 border-2 border-white dark:border-slate-900 shadow-sm">
                                <AvatarImage src={getConversationAvatar(conv) || ""} />
                                <AvatarFallback className="text-xs bg-gradient-to-br from-indigo-100 to-slate-100 text-indigo-600">
                                  {conv.is_group ? (
                                    <Users className="h-5 w-5" />
                                  ) : (
                                    getInitials(getConversationName(conv))
                                  )}
                                </AvatarFallback>
                              </Avatar>
                              {!conv.is_group && (
                                <span
                                  className={cn(
                                    "absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-slate-900",
                                    isOnline ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600",
                                  )}
                                />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="font-semibold text-sm truncate text-slate-800 dark:text-slate-200">{getConversationName(conv)}</span>
                                {conv.last_message && (
                                  <span className="text-[10px] text-slate-400 font-medium">
                                    {formatDistanceToNow(new Date(conv.last_message.created_at), {
                                      addSuffix: false,
                                      locale: es,
                                    })}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center justify-between">
                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[150px] sm:max-w-[200px]">
                                  {conv.last_message ? (
                                    <>
                                      {conv.last_message.sender_id === user.id && (
                                        <span className="font-medium text-indigo-600 dark:text-indigo-400">Tú: </span>
                                      )}
                                      {conv.last_message.content}
                                    </>
                                  ) : (
                                    <span className="italic opacity-70">Sin mensajes</span>
                                  )}
                                </p>
                                {(conv.unread_count || 0) > 0 && (
                                  <Badge
                                    className="h-5 min-w-[1.25rem] px-1 flex items-center justify-center text-[10px] rounded-full bg-indigo-600 border-none shadow-sm shadow-indigo-500/20"
                                  >
                                    {conv.unread_count}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </motion.button>
                        )
                      })}
                    </div>
                  )}
                </ScrollArea>
              )}

              {/* Vista de chat */}
              {view === "chat" && currentConversation && (
                <>
                  <ScrollArea className="flex-1 p-4 relative z-10">
                    <div className="space-y-4">
                      {messages.map((message, index) => {
                        const isOwn = message.sender_id === user.id
                        const showAvatar =
                          !isOwn && (index === 0 || messages[index - 1]?.sender_id !== message.sender_id)
                        
                        const showDate = index === 0 || 
                          new Date(message.created_at).toDateString() !== new Date(messages[index - 1]?.created_at).toDateString()

                        return (
                          <div key={message.id}>
                            {showDate && (
                              <div className="flex justify-center my-4">
                                <span className="text-[10px] font-medium text-slate-400 bg-white/50 dark:bg-slate-800/50 px-2 py-0.5 rounded-full border border-slate-100 dark:border-slate-700">
                                  {format(new Date(message.created_at), "EEEE, d MMM", { locale: es })}
                                </span>
                              </div>
                            )}
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={cn("flex items-end gap-2", isOwn ? "justify-end" : "justify-start")}
                            >
                              {!isOwn && (
                                <div className="w-6 shrink-0">
                                  {showAvatar && (
                                    <Avatar className="h-6 w-6 border border-white dark:border-slate-800 shadow-sm">
                                      <AvatarImage src={message.sender?.avatar_url || ""} />
                                      <AvatarFallback className="text-[8px] bg-gradient-to-br from-indigo-100 to-slate-100 text-indigo-600">
                                        {getInitials(message.sender?.full_name || "?")}
                                      </AvatarFallback>
                                    </Avatar>
                                  )}
                                </div>
                              )}
                              <div
                                className={cn(
                                  "max-w-[80%] sm:max-w-[75%] px-3 py-2 rounded-2xl shadow-sm relative group",
                                  isOwn 
                                    ? "bg-indigo-600 text-white rounded-br-sm" 
                                    : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-700 rounded-bl-sm",
                                )}
                              >
                                {!isOwn && currentConversation.is_group && showAvatar && (
                                  <p className="text-[10px] font-bold mb-1 text-indigo-500">{message.sender?.full_name}</p>
                                )}
                                <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                                <div
                                  className={cn(
                                    "flex items-center gap-1 mt-1 opacity-70 select-none",
                                    isOwn ? "justify-end text-indigo-100" : "justify-start text-slate-400"
                                  )}
                                >
                                  <span className="text-[10px] font-medium">
                                    {format(new Date(message.created_at), "HH:mm")}
                                  </span>
                                  {isOwn && <Check className="h-3 w-3" />}
                                </div>
                              </div>
                            </motion.div>
                          </div>
                        )
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>

                  {/* Input de mensaje */}
                  <div className="shrink-0 p-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 relative z-20">
                    <div className="flex items-end gap-2 bg-slate-50 dark:bg-slate-800/50 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 focus-within:ring-2 focus-within:ring-indigo-100 dark:focus-within:ring-indigo-900/20 transition-all">
                      <Textarea
                        ref={inputRef}
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Escribe un mensaje..."
                        className="min-h-[40px] max-h-[100px] resize-none border-none shadow-none focus-visible:ring-0 bg-transparent py-2.5 text-sm"
                        rows={1}
                      />
                      <Button
                        size="icon"
                        className={cn(
                          "h-9 w-9 rounded-xl shrink-0 transition-all",
                          !messageInput.trim() 
                            ? "bg-slate-200 text-slate-400 dark:bg-slate-700 dark:text-slate-500" 
                            : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20"
                        )}
                        onClick={handleSendMessage}
                        disabled={!messageInput.trim() || isSending}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {/* Vista de nueva conversación */}
              {view === "new" && (
                <>
                  <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar usuarios..."
                        className="pl-9 rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                      />
                    </div>

                    {/* Usuarios seleccionados */}
                    {selectedUsers.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {selectedUsers.map((u) => (
                          <Badge key={u.user_id} variant="secondary" className="flex items-center gap-1 pr-1 pl-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                            <span className="truncate max-w-[120px]">{u.full_name}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-4 w-4 hover:bg-white/50 rounded-full ml-1"
                              onClick={() => setSelectedUsers(selectedUsers.filter((s) => s.user_id !== u.user_id))}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <ScrollArea className="flex-1 relative z-10">
                    {isSearching ? (
                      <div className="flex items-center justify-center p-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500" />
                      </div>
                    ) : searchResults.length > 0 ? (
                      <div className="p-2 space-y-1">
                        {searchResults.map((u) => (
                          <button
                            key={u.user_id}
                            onClick={() => {
                              setSelectedUsers([...selectedUsers, u])
                              setSearchQuery("")
                            }}
                            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left"
                          >
                            <Avatar className="h-10 w-10 border border-slate-100 dark:border-slate-800">
                              <AvatarImage src={u.avatar_url || ""} />
                              <AvatarFallback className="text-xs bg-indigo-50 text-indigo-600">
                                {getInitials(u.full_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate text-slate-800 dark:text-slate-200">{u.full_name}</p>
                              <p className="text-xs text-slate-500 truncate">{u.email}</p>
                            </div>
                            <div className="relative">
                              <Circle
                                className={cn(
                                  "h-2.5 w-2.5 fill-current",
                                  isUserOnline(u.user_id) ? "text-emerald-500" : "text-slate-300 dark:text-slate-600",
                                )}
                              />
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : searchQuery.length >= 2 ? (
                      <div className="flex flex-col items-center justify-center p-8 text-center">
                        <Users className="h-12 w-12 text-slate-300 mb-4" />
                        <p className="text-sm text-slate-500">No se encontraron usuarios</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center p-8 text-center">
                        <Search className="h-12 w-12 text-slate-300 mb-4" />
                        <p className="text-sm text-slate-500">Escribe al menos 2 caracteres para buscar</p>
                      </div>
                    )}
                  </ScrollArea>

                  {/* Botón de crear */}
                  {selectedUsers.length > 0 && (
                    <div className="shrink-0 p-3 border-t border-slate-100 dark:border-slate-800 relative z-20">
                      <Button className="w-full rounded-xl text-sm bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/20" onClick={handleCreateConversation}>
                        {selectedUsers.length === 1
                          ? `Chatear con ${selectedUsers[0].full_name}`
                          : `Crear grupo (${selectedUsers.length} personas)`}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar conversación?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará la conversación de tu bandeja. Si todos los participantes eliminan el chat, se
              borrará permanentemente de la base de datos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConversation} className="bg-red-600 hover:bg-red-700 rounded-xl">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  )
}
