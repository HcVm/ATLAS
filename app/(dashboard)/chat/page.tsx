"use client"

import type React from "react"

import { useState, useRef, useEffect, useCallback } from "react"
import {
  MessageCircle,
  Send,
  Search,
  Plus,
  Users,
  Circle,
  Clock,
  MoreVertical,
  Info,
  UserPlus,
  LogOut,
  AlertTriangle,
  RefreshCw,
  Paperclip,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { useChat, type ChatConversation, type ChatParticipant } from "@/lib/chat-context"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"
import { formatDistanceToNow, format } from "date-fns"
import { es } from "date-fns/locale"
import { toast } from "@/components/ui/use-toast"

export default function ChatPage() {
  const { user } = useAuth()
  const {
    conversations,
    currentConversation,
    messages,
    onlineUsers,
    isLoading,
    unreadTotal,
    selectConversation,
    sendMessage,
    createConversation,
    searchUsers,
    refreshConversations,
  } = useChat()

  const [messageInput, setMessageInput] = useState("")
  const [attachedFile, setAttachedFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [searchQuery, setSearchQuery] = useState("")
  const [userSearchQuery, setUserSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<ChatParticipant[]>([])
  const [selectedUsers, setSelectedUsers] = useState<ChatParticipant[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [showNewChatDialog, setShowNewChatDialog] = useState(false)
  const [showInfoDialog, setShowInfoDialog] = useState(false)
  const [groupName, setGroupName] = useState("")
  // Estado para controlar si el panel de chat está abierto
  const [isChatOpen, setIsChatOpen] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Scroll al último mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Buscar usuarios
  useEffect(() => {
    const search = async () => {
      if (userSearchQuery.trim().length < 2) {
        setSearchResults([])
        return
      }
      setIsSearching(true)
      const results = await searchUsers(userSearchQuery)
      setSearchResults(results.filter((r) => !selectedUsers.some((s) => s.user_id === r.user_id)))
      setIsSearching(false)
    }

    const debounce = setTimeout(search, 300)
    return () => clearTimeout(debounce)
  }, [userSearchQuery, searchUsers, selectedUsers])

  // Filtrar conversaciones por búsqueda
  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery) return true
    const name = getConversationName(conv).toLowerCase()
    return name.includes(searchQuery.toLowerCase())
  })

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAttachedFile(file)

      // Crear preview para imágenes
      if (file.type.startsWith("image/")) {
        const reader = new FileReader()
        reader.onload = (e) => {
          setFilePreview(e.target?.result as string)
        }
        reader.readAsDataURL(file)
      } else {
        setFilePreview(null)
      }
    }
  }

  const clearAttachedFile = () => {
    setAttachedFile(null)
    setFilePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  // Manejar envío de mensaje
  const handleSendMessage = async () => {
    // Verificar si hay mensaje o archivo adjunto y si la conversación está seleccionada
    if ((!messageInput.trim() && !attachedFile) || !currentConversation || isSending) return

    setIsSending(true)
    try {
      await sendMessage(messageInput, "text", attachedFile || undefined)
      setMessageInput("")
      clearAttachedFile()
      inputRef.current?.focus()
    } catch (error) {
      console.error("Error enviando mensaje:", error)
      toast({
        title: "Error",
        description: "No se pudo enviar el mensaje",
        variant: "destructive",
      })
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

  // Crear nueva conversación
  const handleCreateConversation = async () => {
    if (selectedUsers.length === 0) return

    try {
      const participantIds = selectedUsers.map((u) => u.user_id)
      const conversationName = selectedUsers.length > 1 ? groupName || undefined : undefined

      const newConv = await createConversation(participantIds, conversationName)

      if (newConv) {
        setShowNewChatDialog(false)
        setSelectedUsers([])
        setGroupName("")
        setUserSearchQuery("")
        await selectConversation(newConv)
        setIsChatOpen(true) // Abrir panel de chat después de crear
      } else {
        toast({
          title: "Error",
          description: "No se pudo crear la conversación",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error al crear conversación:", error)
      toast({
        title: "Error",
        description: "Ocurrió un error al crear la conversación",
        variant: "destructive",
      })
    }
  }

  // Obtener nombre de la conversación
  function getConversationName(conv: ChatConversation) {
    if (conv.name) return conv.name
    if (conv.is_group) return `Grupo (${conv.participants.length})`
    const otherParticipant = conv.participants.find((p) => p.user_id !== user?.id)
    return otherParticipant?.full_name || "Chat"
  }

  // Obtener avatar de la conversación
  function getConversationAvatar(conv: ChatConversation) {
    if (conv.is_group) return null
    const otherParticipant = conv.participants.find((p) => p.user_id !== user?.id)
    return otherParticipant?.avatar_url
  }

  // Verificar si usuario está online
  const isUserOnline = useCallback(
    (userId: string) => {
      return onlineUsers.has(userId)
    },
    [onlineUsers],
  )

  // Obtener iniciales
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <Card className="w-96">
          <CardContent className="pt-6">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>Debes iniciar sesión para usar el chat.</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="h-[calc(100vh-8rem)] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MessageCircle className="h-6 w-6 text-primary" />
              Chat ATLAS
            </h1>
            <p className="text-sm text-muted-foreground">
              Mensajes temporales entre usuarios (se eliminan después de 7 días)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={() => refreshConversations()}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Actualizar conversaciones</TooltipContent>
            </Tooltip>
            <Button onClick={() => setShowNewChatDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva conversación
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex gap-4 min-h-0">
          {/* Lista de conversaciones */}
          <Card className="w-80 shrink-0 flex flex-col">
            <CardHeader className="pb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar conversaciones..."
                  className="pl-9"
                />
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden">
              <ScrollArea className="h-full">
                {isLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center">
                    <MessageCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <p className="text-sm text-muted-foreground">
                      {searchQuery ? "No se encontraron conversaciones" : "No tienes conversaciones"}
                    </p>
                    {!searchQuery && (
                      <Button variant="link" size="sm" onClick={() => setShowNewChatDialog(true)} className="mt-2">
                        Iniciar una nueva
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {filteredConversations.map((conv) => {
                      const otherParticipant = conv.participants.find((p) => p.user_id !== user.id)
                      const isOnline = otherParticipant ? isUserOnline(otherParticipant.user_id) : false
                      const isSelected = currentConversation?.id === conv.id

                      return (
                        <button
                          key={conv.id}
                          onClick={() => selectConversation(conv)}
                          className={cn(
                            "w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left",
                            isSelected ? "bg-primary/10 border border-primary/20" : "hover:bg-muted/50",
                          )}
                        >
                          <div className="relative">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={getConversationAvatar(conv) || undefined} />
                              <AvatarFallback className="text-xs bg-primary/10">
                                {conv.is_group ? <Users className="h-5 w-5" /> : getInitials(getConversationName(conv))}
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
                              <p className="text-xs text-muted-foreground truncate max-w-[150px]">
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
            </CardContent>
          </Card>

          {/* Área de chat */}
          <Card className="flex-1 flex flex-col overflow-hidden">
            {currentConversation ? (
              <>
                {/* Header del chat */}
                <CardHeader className="pb-3 border-b shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={getConversationAvatar(currentConversation) || undefined} />
                        <AvatarFallback className="text-xs bg-primary/10">
                          {currentConversation.is_group ? (
                            <Users className="h-5 w-5" />
                          ) : (
                            getInitials(getConversationName(currentConversation))
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-base">{getConversationName(currentConversation)}</CardTitle>
                        <CardDescription className="flex items-center gap-1">
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
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => setShowInfoDialog(true)}>
                            <Info className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Información</TooltipContent>
                      </Tooltip>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setShowInfoDialog(true)}>
                            <Info className="h-4 w-4 mr-2" />
                            Ver detalles
                          </DropdownMenuItem>
                          {currentConversation.is_group && (
                            <DropdownMenuItem>
                              <UserPlus className="h-4 w-4 mr-2" />
                              Agregar participantes
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive">
                            <LogOut className="h-4 w-4 mr-2" />
                            Salir del chat
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>

                {/* Mensajes */}
                <CardContent className="flex-1 p-0 overflow-hidden">
                  <ScrollArea className="h-full p-4">
                    <div className="space-y-4">
                      {/* Info de mensajes temporales */}
                      <div className="flex justify-center">
                        <Badge variant="secondary" className="text-xs font-normal">
                          <Clock className="h-3 w-3 mr-1" />
                          Los mensajes se eliminan después de 7 días
                        </Badge>
                      </div>

                      {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <MessageCircle className="h-16 w-16 text-muted-foreground/30 mb-4" />
                          <p className="text-muted-foreground">No hay mensajes aún</p>
                          <p className="text-sm text-muted-foreground/70">Envía el primer mensaje</p>
                        </div>
                      ) : (
                        messages.map((message, index) => {
                          const isOwn = message.sender_id === user.id
                          const showAvatar =
                            !isOwn && (index === 0 || messages[index - 1]?.sender_id !== message.sender_id)
                          const showDate =
                            index === 0 ||
                            new Date(message.created_at).toDateString() !==
                              new Date(messages[index - 1]?.created_at).toDateString()

                          return (
                            <div key={message.id}>
                              {showDate && (
                                <div className="flex justify-center my-4">
                                  <Badge variant="outline" className="text-xs font-normal">
                                    {format(new Date(message.created_at), "EEEE, d 'de' MMMM", { locale: es })}
                                  </Badge>
                                </div>
                              )}
                              <div className={cn("flex items-end gap-2", isOwn ? "justify-end" : "justify-start")}>
                                {!isOwn && (
                                  <div className="w-8">
                                    {showAvatar && (
                                      <Avatar className="h-8 w-8">
                                        <AvatarImage src={message.sender?.avatar_url || undefined} />
                                        <AvatarFallback className="text-[10px] bg-primary/10">
                                          {getInitials(message.sender?.full_name || "?")}
                                        </AvatarFallback>
                                      </Avatar>
                                    )}
                                  </div>
                                )}
                                <div
                                  className={cn(
                                    "max-w-[60%] px-4 py-2 rounded-2xl shadow-sm",
                                    isOwn
                                      ? "bg-primary text-primary-foreground rounded-br-md"
                                      : "bg-muted rounded-bl-md",
                                  )}
                                >
                                  {!isOwn && currentConversation.is_group && showAvatar && (
                                    <p className="text-[11px] font-medium mb-1 opacity-80">
                                      {message.sender?.full_name}
                                    </p>
                                  )}
                                  {message.message_type === "image" && message.file_url ? (
                                    <div className="space-y-2">
                                      <img
                                        src={message.file_url || "/placeholder.svg"}
                                        alt={message.file_name || "Imagen"}
                                        className="rounded-lg max-w-full max-h-96 object-cover"
                                      />
                                      {message.content && message.content !== message.file_name && (
                                        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                                      )}
                                    </div>
                                  ) : message.message_type === "file" && message.file_url ? (
                                    <div className="space-y-2">
                                      <a
                                        href={message.file_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={cn(
                                          "flex items-center gap-2 p-2 rounded border",
                                          isOwn ? "border-primary-foreground/20" : "border-border",
                                        )}
                                      >
                                        <Paperclip className="h-4 w-4 shrink-0" />
                                        <span className="text-sm font-medium truncate">{message.file_name}</span>
                                      </a>
                                      {message.content && message.content !== message.file_name && (
                                        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                                      )}
                                    </div>
                                  ) : (
                                    <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                                  )}
                                  <div
                                    className={cn(
                                      "flex items-center gap-1 mt-1",
                                      isOwn ? "justify-end" : "justify-start",
                                    )}
                                  >
                                    <span className="text-[10px] opacity-60">
                                      {format(new Date(message.created_at), "HH:mm")}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>
                </CardContent>

                {attachedFile && (
                  <div className="px-4 py-2 border-t bg-muted/50">
                    <div className="flex items-center gap-3 p-2 rounded-lg bg-background">
                      {filePreview ? (
                        <img
                          src={filePreview || "/placeholder.svg"}
                          alt="Preview"
                          className="h-12 w-12 rounded object-cover"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded bg-muted flex items-center justify-center">
                          <Paperclip className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{attachedFile.name}</p>
                        <p className="text-xs text-muted-foreground">{(attachedFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={clearAttachedFile}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Input de mensaje */}
                <div className="shrink-0 p-4 border-t bg-muted/30">
                  <div className="flex items-end gap-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={handleFileSelect}
                      accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-11 w-11 shrink-0 bg-transparent"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isSending}
                    >
                      <Paperclip className="h-5 w-5" />
                    </Button>
                    <Textarea
                      ref={inputRef}
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Escribe un mensaje..."
                      className="min-h-[44px] max-h-[120px] resize-none"
                      rows={1}
                    />
                    <Button
                      size="icon"
                      className="h-11 w-11 shrink-0"
                      onClick={handleSendMessage}
                      disabled={(!messageInput.trim() && !attachedFile) || isSending}
                    >
                      <Send className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <CardContent className="flex-1 flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <MessageCircle className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Bienvenido al Chat ATLAS</h3>
                <p className="text-muted-foreground max-w-sm mb-4">
                  Selecciona una conversación de la lista o inicia una nueva para comenzar a chatear con tus compañeros.
                </p>
                <Button onClick={() => setShowNewChatDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva conversación
                </Button>
              </CardContent>
            )}
          </Card>
        </div>
      </div>

      {/* Dialog: Nueva conversación */}
      <Dialog open={showNewChatDialog} onOpenChange={setShowNewChatDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva conversación</DialogTitle>
            <DialogDescription>
              Busca usuarios de cualquier empresa ATLAS para iniciar una conversación.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Búsqueda de usuarios */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                placeholder="Buscar usuarios por nombre o email..."
                className="pl-9"
              />
            </div>

            {/* Usuarios seleccionados */}
            {selectedUsers.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Participantes seleccionados:</label>
                <div className="flex flex-wrap gap-2">
                  {selectedUsers.map((u) => (
                    <Badge key={u.user_id} variant="secondary" className="flex items-center gap-1 pr-1">
                      <Avatar className="h-4 w-4">
                        <AvatarImage src={u.avatar_url || undefined} />
                        <AvatarFallback className="text-[8px]">{getInitials(u.full_name)}</AvatarFallback>
                      </Avatar>
                      {u.full_name}
                      {u.company_code && (
                        <span
                          className="text-[10px] px-1 rounded"
                          style={{
                            backgroundColor: u.company_color || "#666",
                            color: "#fff",
                          }}
                        >
                          {u.company_code}
                        </span>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 hover:bg-transparent ml-1"
                        onClick={() => setSelectedUsers(selectedUsers.filter((s) => s.user_id !== u.user_id))}
                      >
                        <span className="text-xs">×</span>
                      </Button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Nombre del grupo (solo si hay múltiples usuarios) */}
            {selectedUsers.length > 1 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Nombre del grupo (opcional):</label>
                <Input
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Ej: Equipo de Ventas"
                />
              </div>
            )}

            {/* Resultados de búsqueda */}
            <ScrollArea className="h-[200px] border rounded-lg">
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
                        setUserSearchQuery("")
                      }}
                      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={u.avatar_url || undefined} />
                        <AvatarFallback className="text-xs bg-primary/10">{getInitials(u.full_name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{u.full_name}</p>
                          {u.company_code && (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0"
                              style={{
                                borderColor: u.company_color || "#666",
                                color: u.company_color || "#666",
                              }}
                            >
                              {u.company_code}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                      </div>
                      <Circle
                        className={cn(
                          "h-2.5 w-2.5 fill-current shrink-0",
                          isUserOnline(u.user_id) ? "text-green-500" : "text-muted-foreground",
                        )}
                      />
                    </button>
                  ))}
                </div>
              ) : userSearchQuery.length >= 2 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <Users className="h-10 w-10 text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">No se encontraron usuarios</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <Search className="h-10 w-10 text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">Escribe al menos 2 caracteres</p>
                </div>
              )}
            </ScrollArea>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewChatDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateConversation} disabled={selectedUsers.length === 0}>
              {selectedUsers.length === 0
                ? "Selecciona usuarios"
                : selectedUsers.length === 1
                  ? `Chatear con ${selectedUsers[0].full_name.split(" ")[0]}`
                  : `Crear grupo (${selectedUsers.length})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Info de la conversación */}
      <Dialog open={showInfoDialog} onOpenChange={setShowInfoDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Información del chat</DialogTitle>
          </DialogHeader>

          {currentConversation && (
            <div className="space-y-4">
              {/* Avatar y nombre */}
              <div className="flex items-center gap-3">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={getConversationAvatar(currentConversation) || undefined} />
                  <AvatarFallback className="text-lg bg-primary/10">
                    {currentConversation.is_group ? (
                      <Users className="h-8 w-8" />
                    ) : (
                      getInitials(getConversationName(currentConversation))
                    )}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">{getConversationName(currentConversation)}</h3>
                  <p className="text-sm text-muted-foreground">
                    {currentConversation.is_group
                      ? `Grupo • ${currentConversation.participants.length} participantes`
                      : "Chat directo"}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Participantes */}
              <div>
                <h4 className="text-sm font-medium mb-3">Participantes</h4>
                <div className="space-y-2">
                  {currentConversation.participants.map((p) => (
                    <div key={p.user_id} className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={p.avatar_url || undefined} />
                        <AvatarFallback className="text-xs bg-primary/10">{getInitials(p.full_name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {p.full_name}
                          {p.user_id === user.id && <span className="text-xs text-muted-foreground ml-1">(Tú)</span>}
                        </p>
                        <p className="text-xs text-muted-foreground">{p.email}</p>
                      </div>
                      <Circle
                        className={cn(
                          "h-2.5 w-2.5 fill-current",
                          isUserOnline(p.user_id) ? "text-green-500" : "text-muted-foreground",
                        )}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Info adicional */}
              <div className="text-sm text-muted-foreground space-y-1">
                <p className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Creado: {format(new Date(currentConversation.created_at), "d 'de' MMMM 'de' yyyy", { locale: es })}
                </p>
                <p className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Los mensajes se eliminan automáticamente después de 7 días
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}
