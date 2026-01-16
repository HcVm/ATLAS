"use client"

import type React from "react"

import { useState, useRef, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
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
  AlertTriangle,
  RefreshCw,
  Paperclip,
  X,
  Download,
  ZoomIn,
  Edit2,
  Check,
  Trash2,
  ArrowLeft,
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
import { formatDistanceToNow, format } from "date-fns" // Added isToday, isYesterday
import { es } from "date-fns/locale"
import { toast } from "@/components/ui/use-toast"
import {
  AlertDialog, // Added
  AlertDialogAction, // Added
  AlertDialogCancel, // Added
  AlertDialogContent, // Added
  AlertDialogDescription, // Added
  AlertDialogFooter, // Added
  AlertDialogHeader, // Added
  AlertDialogTitle, // Added
} from "@/components/ui/alert-dialog"

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
    updateConversationName,
    getAllUsers,
    deleteConversation, // Added deleteConversation
    setIsWidgetVisible, // importado setter de visibilidad
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

  const [imageModalOpen, setImageModalOpen] = useState(false)
  const [selectedImage, setSelectedImage] = useState<{ url: string; name: string } | null>(null)
  const [isEditingName, setIsEditingName] = useState(false)
  const [editedName, setEditedName] = useState("")
  const [allUsers, setAllUsers] = useState<ChatParticipant[]>([])
  const [sidebarUsers, setSidebarUsers] = useState<ChatParticipant[]>([])
  const [showDeleteDialog, setShowDeleteDialog] = useState(false) // Added showDeleteDialog

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setIsWidgetVisible(true)
  }, [setIsWidgetVisible])

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

  useEffect(() => {
    const loadAllUsers = async () => {
      if (!user) return
      const users = await getAllUsers()
      setAllUsers(users.filter((u) => u.user_id !== user.id))
      setSidebarUsers(users.filter((u) => u.user_id !== user.id))
    }
    loadAllUsers()
  }, [user, getAllUsers])

  // Filtrar conversaciones por búsqueda
  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery) return true
    const name = getConversationName(conv).toLowerCase()
    return name.includes(searchQuery.toLowerCase())
  })

  const isUserOnline = useCallback(
    (userId: string) => {
      return onlineUsers.has(userId)
    },
    [onlineUsers],
  )

  const onlineUsersList = sidebarUsers.filter((u) => isUserOnline(u.user_id))
  const offlineUsersList = sidebarUsers.filter((u) => !isUserOnline(u.user_id))

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

  const handleImageClick = (url: string, name: string) => {
    setSelectedImage({ url, name })
    setImageModalOpen(true)
  }

  const handleFileDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = blobUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(blobUrl)
    } catch (error) {
      console.error("Error downloading file:", error)
      toast({
        title: "Error",
        description: "No se pudo descargar el archivo",
        variant: "destructive",
      })
    }
  }

  const handleSaveConversationName = async () => {
    if (!currentConversation || !editedName.trim()) return

    try {
      await updateConversationName(currentConversation.id, editedName.trim())
      setIsEditingName(false)
      toast({
        title: "Nombre actualizado",
        description: "El nombre del grupo ha sido actualizado",
      })
      await refreshConversations()
    } catch (error) {
      console.error("Error updating name:", error)
      toast({
        title: "Error",
        description: "No se pudo actualizar el nombre",
        variant: "destructive",
      })
    }
  }

  const handleStartConversationFromSidebar = async (userId: string) => {
    const existingConv = conversations.find(
      (c) => !c.is_group && c.participants.length === 2 && c.participants.some((p) => p.user_id === userId),
    )

    if (existingConv) {
      await selectConversation(existingConv)
    } else {
      const newConv = await createConversation([userId])
      if (newConv) {
        await selectConversation(newConv)
      }
    }
  }

  // Obtener nombre de la conversación
  function getConversationName(conv: ChatConversation) {
    if (conv.name) return conv.name
    if (conv.is_group) return `Grupo (${conv.participants.length})`
    const otherParticipant = conv.participants.find((p) => p.user_id !== user.id)
    return otherParticipant?.full_name || "Chat"
  }

  // Obtener avatar de la conversación
  function getConversationAvatar(conv: ChatConversation) {
    if (conv.is_group) return null
    const otherParticipant = conv.participants.find((p) => p.user_id !== user.id)
    return otherParticipant?.avatar_url
  }

  // Verificar si usuario está online
  // const isUserOnline = useCallback(
  //   (userId: string) => {
  //     return onlineUsers.has(userId)
  //   },
  //   [onlineUsers],
  // )

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
      const permanentlyDeleted = await deleteConversation(currentConversation.id)

      if (permanentlyDeleted) {
        // Show feedback that it was permanently deleted
        console.log("Conversación eliminada permanentemente")
      }

      setShowDeleteDialog(false)
    } catch (error) {
      console.error("Error al eliminar conversación:", error)
    }
  }

  const variants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 }
  }

  const messageVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <Card className="w-96 glass-card">
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
      <div className="h-[calc(100vh-8rem)] flex flex-col pt-4 px-2 sm:px-4 space-y-4">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md p-4 sm:p-6 rounded-3xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm shrink-0"
        >
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold bg-gradient-to-r from-slate-800 via-slate-600 to-slate-500 dark:from-white dark:via-slate-200 dark:to-slate-400 bg-clip-text text-transparent flex items-center gap-2">
              <MessageCircle className="h-6 w-6 text-indigo-500" />
              Chat ATLAS
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-1">
              <Clock className="h-3.5 w-3.5" />
              Mensajes temporales (se eliminan después de 7 días)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => refreshConversations()} className="rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
                  <RefreshCw className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Actualizar conversaciones</TooltipContent>
            </Tooltip>
            <Button onClick={() => setShowNewChatDialog(true)} className="w-full sm:w-auto rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20 transition-all hover:-translate-y-0.5">
              <Plus className="h-5 w-5 mr-2" />
              <span className="hidden sm:inline">Nueva conversación</span>
              <span className="sm:hidden">Nueva</span>
            </Button>
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
          {/* Lista de conversaciones */}
          <Card
            className={cn(
              "w-full lg:w-80 lg:shrink-0 flex flex-col border-none shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md overflow-hidden rounded-3xl", 
              currentConversation ? "hidden lg:flex" : "flex"
            )}
          >
            <CardHeader className="pb-3 px-4 pt-4 border-b border-slate-100 dark:border-slate-800">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar conversaciones..."
                  className="pl-10 h-11 rounded-xl bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:ring-indigo-500/20"
                />
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-2 overflow-hidden">
              <ScrollArea className="h-full pr-2">
                {isLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center h-full">
                    <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                      <MessageCircle className="h-8 w-8 text-slate-400" />
                    </div>
                    <p className="text-sm text-slate-500 font-medium">
                      {searchQuery ? "No se encontraron resultados" : "No tienes conversaciones"}
                    </p>
                    {!searchQuery && (
                      <Button variant="link" size="sm" onClick={() => setShowNewChatDialog(true)} className="mt-2 text-indigo-600">
                        Iniciar una nueva
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredConversations.map((conv) => {
                      const otherParticipant = conv.participants.find((p) => p.user_id !== user.id)
                      const isOnline = otherParticipant ? isUserOnline(otherParticipant.user_id) : false
                      const isSelected = currentConversation?.id === conv.id

                      return (
                        <motion.button
                          layout
                          key={conv.id}
                          onClick={() => selectConversation(conv)}
                          className={cn(
                            "w-full flex items-center gap-3 p-3 rounded-2xl transition-all duration-200 text-left border border-transparent",
                            isSelected 
                              ? "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800/50 shadow-sm" 
                              : "hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:border-slate-100 dark:hover:border-slate-800"
                          )}
                        >
                          <div className="relative shrink-0">
                            <Avatar className="h-12 w-12 border-2 border-white dark:border-slate-900 shadow-sm">
                              <AvatarImage src={getConversationAvatar(conv) || undefined} className="object-cover" />
                              <AvatarFallback className="text-sm bg-gradient-to-br from-indigo-100 to-slate-100 text-indigo-600 dark:from-indigo-900 dark:to-slate-900 dark:text-indigo-300">
                                {conv.is_group ? <Users className="h-5 w-5" /> : getInitials(getConversationName(conv))}
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
                              <span className={cn("font-semibold text-sm truncate", isSelected ? "text-indigo-900 dark:text-indigo-100" : "text-slate-700 dark:text-slate-200")}>
                                {getConversationName(conv)}
                              </span>
                              {conv.last_message && (
                                <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap ml-2">
                                  {formatDistanceToNow(new Date(conv.last_message.created_at), {
                                    addSuffix: false,
                                    locale: es,
                                  })}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center justify-between">
                              <p className={cn("text-xs truncate max-w-[140px]", isSelected ? "text-indigo-600/70 dark:text-indigo-300/70" : "text-slate-500 dark:text-slate-400")}>
                                {conv.last_message ? (
                                  <>
                                    {conv.last_message.sender_id === user.id && (
                                      <span className="font-medium">Tú: </span>
                                    )}
                                    {conv.last_message.content}
                                  </>
                                ) : (
                                  <span className="italic opacity-70">Sin mensajes</span>
                                )}
                              </p>
                              {(conv.unread_count || 0) > 0 && (
                                <Badge
                                  className="h-5 min-w-[1.25rem] px-1 flex items-center justify-center text-[10px] rounded-full bg-indigo-600 text-white shadow-md shadow-indigo-500/20 border-none"
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
            </CardContent>
          </Card>

          {/* Área de chat */}
          <Card className={cn(
            "flex-1 flex flex-col overflow-hidden border-none shadow-xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-3xl", 
            currentConversation ? "flex" : "hidden lg:flex"
          )}>
            {currentConversation ? (
              <>
                {/* Header del chat */}
                <CardHeader className="py-3 px-6 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="lg:hidden shrink-0 -ml-2 rounded-full"
                        onClick={() => selectConversation(null as any)}
                      >
                        <ArrowLeft className="h-5 w-5 text-slate-600" />
                      </Button>
                      <Avatar className="h-12 w-12 shrink-0 border-2 border-white dark:border-slate-800 shadow-sm cursor-pointer hover:scale-105 transition-transform" onClick={() => setShowInfoDialog(true)}>
                        <AvatarImage src={getConversationAvatar(currentConversation) || undefined} />
                        <AvatarFallback className="text-sm bg-gradient-to-br from-indigo-500 to-purple-500 text-white">
                          {currentConversation.is_group ? (
                            <Users className="h-5 w-5" />
                          ) : (
                            getInitials(getConversationName(currentConversation))
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        {isEditingName ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={editedName}
                              onChange={(e) => setEditedName(e.target.value)}
                              className="h-9 text-sm rounded-lg"
                              placeholder="Nombre del grupo"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  handleSaveConversationName()
                                } else if (e.key === "Escape") {
                                  setIsEditingName(false)
                                }
                              }}
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-9 w-9 text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={handleSaveConversationName}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-9 w-9 text-red-500 hover:text-red-600 hover:bg-red-50"
                              onClick={() => setIsEditingName(false)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 group cursor-pointer" onClick={() => currentConversation.is_group && setIsEditingName(true)}>
                              <CardTitle className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 truncate">
                                {getConversationName(currentConversation)}
                              </CardTitle>
                              {currentConversation.is_group && (
                                <Edit2 className="h-3.5 w-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                              )}
                            </div>
                            <CardDescription className="flex items-center gap-1.5 text-xs font-medium">
                              {!currentConversation.is_group && (
                                <>
                                  <span className={cn(
                                    "flex items-center gap-1.5 px-2 py-0.5 rounded-full",
                                    isUserOnline(currentConversation.participants.find((p) => p.user_id !== user.id)?.user_id || "")
                                      ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400"
                                      : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                                  )}>
                                    <Circle className={cn("h-1.5 w-1.5 fill-current")} />
                                    {isUserOnline(currentConversation.participants.find((p) => p.user_id !== user.id)?.user_id || "") ? "En línea" : "Desconectado"}
                                  </span>
                                </>
                              )}
                              {currentConversation.is_group && (
                                <span className="text-slate-500">{currentConversation.participants.length} participantes</span>
                              )}
                            </CardDescription>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                            <MoreVertical className="h-5 w-5 text-slate-500" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 rounded-xl shadow-xl border-slate-100 dark:border-slate-800">
                          <DropdownMenuItem onClick={() => setShowInfoDialog(true)} className="py-2.5">
                            <Info className="h-4 w-4 mr-2 text-indigo-500" />
                            Ver detalles
                          </DropdownMenuItem>
                          {currentConversation.is_group && (
                            <DropdownMenuItem className="py-2.5">
                              <UserPlus className="h-4 w-4 mr-2 text-slate-500" />
                              Agregar participantes
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/20 py-2.5"
                            onClick={() => setShowDeleteDialog(true)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar conversación
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>

                {/* Mensajes */}
                <CardContent className="flex-1 p-0 overflow-hidden bg-slate-50/30 dark:bg-slate-900/30 relative">
                  {/* Background pattern opcional */}
                  <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/subtle-dots.png')]"></div>
                  
                  <ScrollArea className="h-full">
                    <div className="space-y-6 p-4 sm:p-6">
                      {/* Info de mensajes temporales */}
                      <div className="flex justify-center">
                        <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 text-[10px] sm:text-xs px-3 py-1.5 rounded-full border border-amber-100 dark:border-amber-800/30 flex items-center gap-1.5 shadow-sm">
                          <Clock className="h-3 w-3" />
                          Los mensajes se eliminan automáticamente después de 7 días
                        </div>
                      </div>

                      {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                          <div className="w-24 h-24 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
                            <MessageCircle className="h-10 w-10 text-indigo-400" />
                          </div>
                          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">Comienza la conversación</h3>
                          <p className="text-slate-500 dark:text-slate-400 max-w-xs mt-2">
                            Envía un mensaje para iniciar el chat con {getConversationName(currentConversation)}.
                          </p>
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
                                <div className="flex justify-center my-6">
                                  <span className="text-[10px] font-medium text-slate-400 bg-white dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-100 dark:border-slate-700 shadow-sm uppercase tracking-wide">
                                    {format(new Date(message.created_at), "EEEE, d 'de' MMMM", { locale: es })}
                                  </span>
                                </div>
                              )}
                              <motion.div 
                                initial="hidden"
                                animate="visible"
                                variants={messageVariants}
                                className={cn("flex items-end gap-3 group mb-1", isOwn ? "justify-end" : "justify-start")}
                              >
                                {!isOwn && (
                                  <div className="w-8 shrink-0 flex flex-col items-center">
                                    {showAvatar ? (
                                      <Avatar className="h-8 w-8 shadow-sm border border-white dark:border-slate-800">
                                        <AvatarImage src={message.sender?.avatar_url || undefined} />
                                        <AvatarFallback className="text-[9px] bg-gradient-to-br from-indigo-100 to-slate-100 text-indigo-600">
                                          {getInitials(message.sender?.full_name || "?")}
                                        </AvatarFallback>
                                      </Avatar>
                                    ) : (
                                      <div className="w-8" />
                                    )}
                                  </div>
                                )}
                                <div
                                  className={cn(
                                    "max-w-[80%] sm:max-w-[65%] px-4 py-3 shadow-sm relative transition-all duration-200",
                                    isOwn
                                      ? "bg-indigo-600 text-white rounded-2xl rounded-tr-sm hover:shadow-md"
                                      : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-700 rounded-2xl rounded-tl-sm hover:shadow-md",
                                  )}
                                >
                                  {!isOwn && currentConversation.is_group && showAvatar && (
                                    <p className="text-[10px] font-bold mb-1 text-indigo-500 dark:text-indigo-400">
                                      {message.sender?.full_name}
                                    </p>
                                  )}
                                  
                                  {message.message_type === "image" && message.file_url ? (
                                    <div className="space-y-2 -mx-2 -mt-2">
                                      <div className="relative group overflow-hidden rounded-xl">
                                        <img
                                          src={message.file_url || "/placeholder.svg"}
                                          alt={message.file_name || "Imagen"}
                                          className="max-w-full max-h-80 object-cover cursor-zoom-in hover:scale-105 transition-transform duration-500"
                                          onClick={() =>
                                            handleImageClick(message.file_url!, message.file_name || "imagen.jpg")
                                          }
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                          <Button
                                            size="icon"
                                            variant="secondary"
                                            className="h-9 w-9 rounded-full shadow-lg bg-white/90 hover:bg-white"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              handleImageClick(message.file_url!, message.file_name || "imagen.jpg")
                                            }}
                                          >
                                            <ZoomIn className="h-4 w-4 text-slate-800" />
                                          </Button>
                                          <Button
                                            size="icon"
                                            variant="secondary"
                                            className="h-9 w-9 rounded-full shadow-lg bg-white/90 hover:bg-white"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              handleFileDownload(message.file_url!, message.file_name || "imagen.jpg")
                                            }}
                                          >
                                            <Download className="h-4 w-4 text-slate-800" />
                                          </Button>
                                        </div>
                                      </div>
                                      {message.content && message.content !== message.file_name && (
                                        <p className="text-sm whitespace-pre-wrap break-words px-2 pb-1">{message.content}</p>
                                      )}
                                    </div>
                                  ) : message.message_type === "file" && message.file_url ? (
                                    <div className="space-y-2">
                                      <div
                                        className={cn(
                                          "flex items-center gap-3 p-3 rounded-xl border transition-colors cursor-pointer",
                                          isOwn 
                                            ? "bg-indigo-700/50 border-indigo-500/50 hover:bg-indigo-700" 
                                            : "bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800",
                                        )}
                                        onClick={() => handleFileDownload(message.file_url!, message.file_name || "archivo")}
                                      >
                                        <div className={cn("p-2 rounded-lg", isOwn ? "bg-white/20" : "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600")}>
                                          <Paperclip className="h-5 w-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium truncate">{message.file_name}</p>
                                          <p className={cn("text-[10px]", isOwn ? "text-indigo-200" : "text-slate-400")}>Descargar archivo</p>
                                        </div>
                                        <Download className={cn("h-4 w-4 opacity-70", isOwn ? "text-white" : "text-slate-500")} />
                                      </div>
                                      {message.content && message.content !== message.file_name && (
                                        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                                      )}
                                    </div>
                                  ) : (
                                    <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
                                  )}
                                  
                                  <div
                                    className={cn(
                                      "flex items-center gap-1 mt-1 opacity-70 select-none",
                                      isOwn ? "justify-end text-indigo-100" : "justify-start text-slate-400"
                                    )}
                                  >
                                    <span className="text-[10px] font-medium">
                                      {format(new Date(message.created_at), "HH:mm")}
                                    </span>
                                    {isOwn && (
                                      <Check className="h-3 w-3" />
                                    )}
                                  </div>
                                </div>
                              </motion.div>
                            </div>
                          )
                        })
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>
                </CardContent>

                {attachedFile && (
                  <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                      {filePreview ? (
                        <div className="relative h-12 w-12 shrink-0 group">
                          <img
                            src={filePreview || "/placeholder.svg"}
                            alt="Preview"
                            className="h-full w-full rounded-lg object-cover"
                          />
                          <div className="absolute inset-0 bg-black/20 rounded-lg" />
                        </div>
                      ) : (
                        <div className="h-12 w-12 shrink-0 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600">
                          <Paperclip className="h-6 w-6" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate text-slate-700 dark:text-slate-200">{attachedFile.name}</p>
                        <p className="text-xs text-slate-500">{(attachedFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full" onClick={clearAttachedFile}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Input de mensaje */}
                <div className="shrink-0 p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <div className="flex items-end gap-3 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-2xl border border-slate-200 dark:border-slate-700 focus-within:border-indigo-300 dark:focus-within:border-indigo-700 focus-within:ring-4 focus-within:ring-indigo-100 dark:focus-within:ring-indigo-900/20 transition-all">
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={handleFileSelect}
                      accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
                    />
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 shrink-0 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isSending}
                        >
                          <Paperclip className="h-5 w-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Adjuntar archivo</TooltipContent>
                    </Tooltip>
                    
                    <Textarea
                      ref={inputRef}
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Escribe un mensaje..."
                      className="min-h-[44px] max-h-[120px] resize-none border-none shadow-none focus-visible:ring-0 bg-transparent py-3 text-sm"
                      rows={1}
                    />
                    
                    <Button
                      size="icon"
                      className={cn(
                        "h-10 w-10 shrink-0 rounded-xl transition-all",
                        (!messageInput.trim() && !attachedFile) 
                          ? "bg-slate-200 text-slate-400 dark:bg-slate-700 dark:text-slate-500 cursor-not-allowed" 
                          : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20 hover:scale-105 active:scale-95"
                      )}
                      onClick={handleSendMessage}
                      disabled={(!messageInput.trim() && !attachedFile) || isSending}
                    >
                      <Send className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <CardContent className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="w-32 h-32 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center mb-6 shadow-sm">
                  <MessageCircle className="h-16 w-16 text-indigo-400 dark:text-indigo-500" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-3">Bienvenido al Chat ATLAS</h3>
                <p className="text-slate-500 dark:text-slate-400 max-w-md mb-8 text-lg leading-relaxed">
                  Selecciona una conversación de la lista o inicia una nueva para comenzar a chatear con tus compañeros de equipo de forma segura y efímera.
                </p>
                <Button onClick={() => setShowNewChatDialog(true)} size="lg" className="h-12 px-8 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-500/20 hover:-translate-y-1 transition-all">
                  <Plus className="h-5 w-5 mr-2" />
                  Nueva conversación
                </Button>
              </CardContent>
            )}
          </Card>

          <Card className="w-full lg:w-72 shrink-0 flex flex-col border-none shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-3xl hidden xl:flex">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Users className="h-4 w-4 text-indigo-500" />
                Usuarios disponibles
              </CardTitle>
              <CardDescription className="text-xs">Haz clic para iniciar chat</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden">
              <ScrollArea className="h-full">
                {/* Online Users */}
                {onlineUsersList.length > 0 && (
                  <div className="px-3 py-2">
                    <div className="flex items-center gap-2 mb-2">
                      <Circle className="h-2 w-2 fill-green-500 text-green-500" />
                      <span className="text-xs font-medium text-muted-foreground uppercase">
                        En línea ({onlineUsersList.length})
                      </span>
                    </div>
                    <div className="space-y-1">
                      {onlineUsersList.map((u) => (
                        <button
                          key={u.user_id}
                          onClick={() => handleStartConversationFromSidebar(u.user_id)}
                          className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
                        >
                          <div className="relative">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={u.avatar_url || undefined} />
                              <AvatarFallback className="text-[10px] bg-primary/10">
                                {getInitials(u.full_name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-background" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{u.full_name}</p>
                            {u.company_code && (
                              <p className="text-xs text-muted-foreground truncate">{u.company_code}</p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Offline Users */}
                {offlineUsersList.length > 0 && (
                  <div className="px-3 py-2">
                    <div className="flex items-center gap-2 mb-2 mt-3">
                      <Circle className="h-2 w-2 fill-muted-foreground text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground uppercase">
                        Desconectados ({offlineUsersList.length})
                      </span>
                    </div>
                    <div className="space-y-1">
                      {offlineUsersList.map((u) => (
                        <button
                          key={u.user_id}
                          onClick={() => handleStartConversationFromSidebar(u.user_id)}
                          className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
                        >
                          <Avatar className="h-8 w-8 opacity-70">
                            <AvatarImage src={u.avatar_url || undefined} />
                            <AvatarFallback className="text-[10px] bg-muted">{getInitials(u.full_name)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate opacity-70">{u.full_name}</p>
                            {u.company_code && (
                              <p className="text-xs text-muted-foreground truncate opacity-70">{u.company_code}</p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {sidebarUsers.length === 0 && (
                  <div className="flex flex-col items-center justify-center p-8 text-center">
                    <Users className="h-12 w-12 text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">No hay usuarios disponibles</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={imageModalOpen} onOpenChange={setImageModalOpen}>
        <DialogContent className="max-w-4xl p-0 border-0 bg-transparent shadow-none">
          <DialogTitle className="sr-only">Vista previa de imagen</DialogTitle>
          <DialogDescription className="sr-only">Vista ampliada de la imagen {selectedImage?.name}</DialogDescription>
          <div className="relative">
            {selectedImage && (
              <>
                <img
                  src={selectedImage.url || "/placeholder.svg"}
                  alt={selectedImage.name}
                  className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
                />
                <div className="absolute top-4 right-4">
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-10 w-10 rounded-full shadow-lg"
                    onClick={() => handleFileDownload(selectedImage.url, selectedImage.name)}
                  >
                    <Download className="h-5 w-5" />
                  </Button>
                </div>
                <div className="absolute bottom-4 left-4 right-4 bg-background/90 backdrop-blur-sm rounded-lg p-3">
                  <p className="text-sm font-medium truncate">{selectedImage.name}</p>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

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

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar conversación?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta conversación se eliminará de tu bandeja de entrada. Si todos los participantes eliminan la
              conversación, se borrará permanentemente junto con todos los mensajes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConversation}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  )
}
