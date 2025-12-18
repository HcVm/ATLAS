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
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"

export function ChatWidget() {
  const { user } = useAuth()
  const {
    conversations,
    currentConversation,
    messages,
    onlineUsers,
    isLoading,
    isChatOpen,
    unreadTotal,
    setIsChatOpen,
    selectConversation,
    sendMessage,
    createConversation,
    searchUsers,
  } = useChat()

  const [view, setView] = useState<"list" | "chat" | "new">("list")
  const [messageInput, setMessageInput] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<ChatParticipant[]>([])
  const [selectedUsers, setSelectedUsers] = useState<ChatParticipant[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isSending, setIsSending] = useState(false)

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

  if (!user) return null

  return (
    <TooltipProvider>
      {/* Botón flotante */}
      <motion.div
        className="fixed bottom-6 right-6 z-50"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="lg"
              className={cn(
                "h-14 w-14 rounded-full shadow-lg transition-all duration-300",
                isChatOpen ? "bg-destructive hover:bg-destructive/90" : "bg-primary hover:bg-primary/90",
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
                        className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground flex items-center justify-center"
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
            className="fixed bottom-24 right-6 z-50 w-[380px] h-[520px] bg-background border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="shrink-0 px-4 py-3 border-b border-border bg-muted/50">
              <div className="flex items-center gap-3">
                {(view === "chat" || view === "new") && (
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleBack}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                )}

                {view === "list" && (
                  <>
                    <MessageCircle className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm">Chat ATLAS</h3>
                      <p className="text-xs text-muted-foreground">Mensajes temporales (7 días)</p>
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setView("new")}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Nueva conversación</TooltipContent>
                    </Tooltip>
                  </>
                )}

                {view === "chat" && currentConversation && (
                  <>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={getConversationAvatar(currentConversation) || ""} />
                      <AvatarFallback className="text-xs bg-primary/10">
                        {currentConversation.is_group ? (
                          <Users className="h-4 w-4" />
                        ) : (
                          getInitials(getConversationName(currentConversation))
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm truncate">{getConversationName(currentConversation)}</h3>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        {!currentConversation.is_group && (
                          <>
                            <Circle
                              className={cn(
                                "h-2 w-2 fill-current",
                                isUserOnline(
                                  currentConversation.participants.find((p) => p.user_id !== user.id)?.user_id || "",
                                )
                                  ? "text-green-500"
                                  : "text-muted-foreground",
                              )}
                            />
                            {isUserOnline(
                              currentConversation.participants.find((p) => p.user_id !== user.id)?.user_id || "",
                            )
                              ? "En línea"
                              : "Desconectado"}
                          </>
                        )}
                        {currentConversation.is_group && (
                          <span>{currentConversation.participants.length} participantes</span>
                        )}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Info className="h-4 w-4 mr-2" />
                          Ver detalles
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar chat
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                )}

                {view === "new" && (
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm">Nueva conversación</h3>
                    <p className="text-xs text-muted-foreground">Selecciona usuarios para chatear</p>
                  </div>
                )}
              </div>
            </div>

            {/* Contenido */}
            <div className="flex-1 overflow-hidden flex flex-col">
              {/* Vista de lista de conversaciones */}
              {view === "list" && (
                <ScrollArea className="flex-1">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-full p-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                    </div>
                  ) : conversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                      <MessageCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
                      <p className="text-sm text-muted-foreground">No tienes conversaciones</p>
                      <Button variant="link" size="sm" onClick={() => setView("new")} className="mt-2">
                        Iniciar una nueva
                      </Button>
                    </div>
                  ) : (
                    <div className="p-2 space-y-1">
                      {conversations.map((conv) => {
                        const otherParticipant = conv.participants.find((p) => p.user_id !== user.id)
                        const isOnline = otherParticipant ? isUserOnline(otherParticipant.user_id) : false

                        return (
                          <button
                            key={conv.id}
                            onClick={() => handleOpenConversation(conv)}
                            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors text-left group"
                          >
                            <div className="relative">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={getConversationAvatar(conv) || ""} />
                                <AvatarFallback className="text-xs bg-primary/10">
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
                                    "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background",
                                    isOnline ? "bg-green-500" : "bg-muted-foreground",
                                  )}
                                />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-sm truncate">{getConversationName(conv)}</span>
                                {conv.last_message && (
                                  <span className="text-[10px] text-muted-foreground">
                                    {formatDistanceToNow(new Date(conv.last_message.created_at), {
                                      addSuffix: false,
                                      locale: es,
                                    })}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center justify-between">
                                <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                  {conv.last_message ? (
                                    <>
                                      {conv.last_message.sender_id === user.id && (
                                        <span className="text-primary">Tú: </span>
                                      )}
                                      {conv.last_message.content}
                                    </>
                                  ) : (
                                    "Sin mensajes"
                                  )}
                                </p>
                                {(conv.unread_count || 0) > 0 && (
                                  <Badge
                                    variant="default"
                                    className="h-5 w-5 p-0 flex items-center justify-center text-[10px] rounded-full"
                                  >
                                    {conv.unread_count}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </ScrollArea>
              )}

              {/* Vista de chat */}
              {view === "chat" && currentConversation && (
                <>
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                      {messages.map((message, index) => {
                        const isOwn = message.sender_id === user.id
                        const showAvatar =
                          !isOwn && (index === 0 || messages[index - 1]?.sender_id !== message.sender_id)

                        return (
                          <div
                            key={message.id}
                            className={cn("flex items-end gap-2", isOwn ? "justify-end" : "justify-start")}
                          >
                            {!isOwn && (
                              <div className="w-6">
                                {showAvatar && (
                                  <Avatar className="h-6 w-6">
                                    <AvatarImage src={message.sender?.avatar_url || ""} />
                                    <AvatarFallback className="text-[8px] bg-primary/10">
                                      {getInitials(message.sender?.full_name || "?")}
                                    </AvatarFallback>
                                  </Avatar>
                                )}
                              </div>
                            )}
                            <div
                              className={cn(
                                "max-w-[70%] px-3 py-2 rounded-2xl",
                                isOwn ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted rounded-bl-md",
                              )}
                            >
                              {!isOwn && currentConversation.is_group && showAvatar && (
                                <p className="text-[10px] font-medium mb-1 opacity-70">{message.sender?.full_name}</p>
                              )}
                              <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                              <div
                                className={cn("flex items-center gap-1 mt-1", isOwn ? "justify-end" : "justify-start")}
                              >
                                <Clock className="h-3 w-3 opacity-50" />
                                <span className="text-[10px] opacity-50">
                                  {formatDistanceToNow(new Date(message.created_at), {
                                    addSuffix: false,
                                    locale: es,
                                  })}
                                </span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>

                  {/* Input de mensaje */}
                  <div className="shrink-0 p-3 border-t border-border bg-muted/30">
                    <div className="flex items-end gap-2">
                      <Textarea
                        ref={inputRef}
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Escribe un mensaje..."
                        className="min-h-[40px] max-h-[120px] resize-none rounded-xl"
                        rows={1}
                      />
                      <Button
                        size="icon"
                        className="h-10 w-10 rounded-xl shrink-0"
                        onClick={handleSendMessage}
                        disabled={!messageInput.trim() || isSending}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2 text-center">
                      Los mensajes se eliminan automáticamente después de 7 días
                    </p>
                  </div>
                </>
              )}

              {/* Vista de nueva conversación */}
              {view === "new" && (
                <>
                  <div className="p-3 border-b border-border">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar usuarios..."
                        className="pl-9 rounded-xl"
                      />
                    </div>

                    {/* Usuarios seleccionados */}
                    {selectedUsers.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {selectedUsers.map((u) => (
                          <Badge key={u.user_id} variant="secondary" className="flex items-center gap-1 pr-1">
                            {u.full_name}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-4 w-4 hover:bg-transparent"
                              onClick={() => setSelectedUsers(selectedUsers.filter((s) => s.user_id !== u.user_id))}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <ScrollArea className="flex-1">
                    {isSearching ? (
                      <div className="flex items-center justify-center p-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
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
                            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors text-left"
                          >
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={u.avatar_url || ""} />
                              <AvatarFallback className="text-xs bg-primary/10">
                                {getInitials(u.full_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm">{u.full_name}</p>
                              <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                            </div>
                            <div className="relative">
                              <Circle
                                className={cn(
                                  "h-2.5 w-2.5 fill-current",
                                  isUserOnline(u.user_id) ? "text-green-500" : "text-muted-foreground",
                                )}
                              />
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : searchQuery.length >= 2 ? (
                      <div className="flex flex-col items-center justify-center p-8 text-center">
                        <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
                        <p className="text-sm text-muted-foreground">No se encontraron usuarios</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center p-8 text-center">
                        <Search className="h-12 w-12 text-muted-foreground/50 mb-4" />
                        <p className="text-sm text-muted-foreground">Escribe al menos 2 caracteres para buscar</p>
                      </div>
                    )}
                  </ScrollArea>

                  {/* Botón de crear */}
                  {selectedUsers.length > 0 && (
                    <div className="shrink-0 p-3 border-t border-border">
                      <Button className="w-full rounded-xl" onClick={handleCreateConversation}>
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
    </TooltipProvider>
  )
}
