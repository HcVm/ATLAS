"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react"
import { supabase } from "./supabase"
import { useAuth } from "./auth-context"
import type { RealtimeChannel } from "@supabase/supabase-js"

export interface ChatMessage {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  message_type: string
  file_url?: string
  file_name?: string
  is_edited: boolean
  created_at: string
  expires_at: string
  sender?: {
    id: string
    full_name: string
    avatar_url?: string
    email: string
  }
}

export interface ChatParticipant {
  user_id: string
  full_name: string
  avatar_url?: string
  email: string
}

export interface ChatConversation {
  id: string
  name?: string
  is_group: boolean
  company_id?: string
  created_by?: string
  created_at: string
  last_message_at: string
  participants: ChatParticipant[]
  unread_count?: number
  last_message?: ChatMessage
}

export interface UserPresence {
  user_id: string
  is_online: boolean
  last_seen: string
  status: string
}

interface ChatContextType {
  conversations: ChatConversation[]
  currentConversation: ChatConversation | null
  messages: ChatMessage[]
  onlineUsers: Map<string, UserPresence>
  isLoading: boolean
  isChatOpen: boolean
  unreadTotal: number
  setIsChatOpen: (open: boolean) => void
  selectConversation: (conversation: ChatConversation | null) => void
  sendMessage: (content: string, messageType?: string) => Promise<void>
  createConversation: (participantIds: string[], name?: string) => Promise<ChatConversation | null>
  loadMoreMessages: () => Promise<void>
  markAsRead: (conversationId: string) => Promise<void>
  refreshConversations: () => Promise<void>
  searchUsers: (query: string) => Promise<ChatParticipant[]>
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

export function useChat() {
  const context = useContext(ChatContext)
  if (context === undefined) {
    throw new Error("useChat must be used within a ChatProvider")
  }
  return context
}

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const [currentConversation, setCurrentConversation] = useState<ChatConversation | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [onlineUsers, setOnlineUsers] = useState<Map<string, UserPresence>>(new Map())
  const [isLoading, setIsLoading] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [unreadTotal, setUnreadTotal] = useState(0)

  const channelRef = useRef<RealtimeChannel | null>(null)
  const presenceChannelRef = useRef<RealtimeChannel | null>(null)

  const loadConversations = useCallback(async () => {
    if (!user) return

    try {
      setIsLoading(true)

      const response = await fetch("/api/chat/conversations")

      if (!response.ok) {
        throw new Error("Failed to load conversations")
      }

      const { conversations: data } = await response.json()

      setConversations(data || [])
      setUnreadTotal((data || []).reduce((sum: number, c: ChatConversation) => sum + (c.unread_count || 0), 0))
    } catch (error) {
      console.error("Error loading conversations:", error)
      setConversations([])
    } finally {
      setIsLoading(false)
    }
  }, [user])

  // Cargar mensajes de una conversación
  const loadMessages = useCallback(
    async (conversationId: string, offset = 0) => {
      if (!user) return

      try {
        const response = await fetch(`/api/chat/messages?conversation_id=${conversationId}&offset=${offset}&limit=50`)

        if (!response.ok) {
          throw new Error("Failed to load messages")
        }

        const { messages: data } = await response.json()

        const processedMessages = (data || []).reverse()

        if (offset === 0) {
          setMessages(processedMessages)
        } else {
          setMessages((prev) => [...processedMessages, ...prev])
        }
      } catch (error) {
        console.error("Error loading messages:", error)
      }
    },
    [user],
  )

  // Seleccionar conversación
  const selectConversation = useCallback(
    async (conversation: ChatConversation | null) => {
      setCurrentConversation(conversation)
      if (conversation) {
        await loadMessages(conversation.id)
        await markAsRead(conversation.id)
      } else {
        setMessages([])
      }
    },
    [loadMessages],
  )

  // Enviar mensaje
  const sendMessage = useCallback(
    async (content: string, messageType = "text") => {
      if (!user || !currentConversation || !content.trim()) return

      try {
        const { error } = await supabase.from("chat_messages").insert({
          conversation_id: currentConversation.id,
          sender_id: user.id,
          content: content.trim(),
          message_type: messageType,
        })

        if (error) throw error
      } catch (error) {
        console.error("Error sending message:", error)
        throw error
      }
    },
    [user, currentConversation],
  )

  // Crear conversación
  const createConversation = useCallback(
    async (participantIds: string[], name?: string): Promise<ChatConversation | null> => {
      if (!user) return null

      try {
        console.log("[v0] Creating conversation via API with participants:", participantIds)

        // Verificar si ya existe una conversación 1:1
        if (participantIds.length === 1) {
          const existingConv = conversations.find(
            (c) =>
              !c.is_group && c.participants.length === 2 && c.participants.some((p) => p.user_id === participantIds[0]),
          )
          if (existingConv) {
            console.log("[v0] Found existing conversation locally:", existingConv.id)
            return existingConv
          }
        }

        // Usar el API endpoint para crear la conversación (bypass RLS con admin client)
        const response = await fetch("/api/chat/conversations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            participant_ids: participantIds,
            name: name || null,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          console.error("[v0] API error:", errorData)
          throw new Error(errorData.error || "Error al crear conversación")
        }

        const { conversation, existing } = await response.json()
        console.log("[v0] Conversation created/found:", conversation.id, "existing:", existing)

        // Recargar conversaciones para obtener la nueva
        await loadConversations()

        // Encontrar y retornar la conversación creada/encontrada
        const newConv = conversations.find((c) => c.id === conversation.id)
        if (newConv) {
          return newConv
        }

        // Si no está en la lista local aún, recargar y buscar nuevamente
        const { conversations: freshConversations } = await fetch("/api/chat/conversations").then((r) => r.json())
        const foundConv = freshConversations.find((c: any) => c.id === conversation.id)

        if (foundConv) {
          // Agregar a la lista local
          setConversations((prev) => [foundConv, ...prev])
          return foundConv
        }

        return null
      } catch (error) {
        console.error("[v0] Error creating conversation:", error)
        return null
      }
    },
    [user, conversations, loadConversations],
  )

  // Cargar más mensajes
  const loadMoreMessages = useCallback(async () => {
    if (!currentConversation) return
    await loadMessages(currentConversation.id, messages.length)
  }, [currentConversation, messages.length, loadMessages])

  // Marcar como leído
  const markAsRead = useCallback(
    async (conversationId: string) => {
      if (!user) return

      try {
        const response = await fetch("/api/chat/conversations/mark-read", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ conversation_id: conversationId }),
        })

        if (!response.ok) {
          throw new Error("Failed to mark as read")
        }

        // Actualizar conteo local
        setConversations((prev) => prev.map((c) => (c.id === conversationId ? { ...c, unread_count: 0 } : c)))
        setUnreadTotal((prev) => {
          const conv = conversations.find((c) => c.id === conversationId)
          return Math.max(0, prev - (conv?.unread_count || 0))
        })
      } catch (error) {
        console.error("Error marking as read:", error)
      }
    },
    [user, conversations],
  )

  const searchUsers = useCallback(
    async (query: string): Promise<ChatParticipant[]> => {
      if (!user || !query.trim()) return []

      try {
        const response = await fetch(`/api/chat/users/search?q=${encodeURIComponent(query)}`)

        if (!response.ok) {
          throw new Error("Failed to search users")
        }

        const { users } = await response.json()

        return (users || []).map((u: any) => ({
          user_id: u.id,
          full_name: u.full_name,
          avatar_url: u.avatar_url,
          email: u.email,
        }))
      } catch (error) {
        console.error("Error searching users:", error)
        return []
      }
    },
    [user],
  )

  const updatePresence = useCallback(
    async (isOnline: boolean) => {
      if (!user) return

      try {
        await fetch("/api/chat/presence", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ is_online: isOnline }),
        })
      } catch (error) {
        console.error("Error updating presence:", error)
      }
    },
    [user],
  )

  // Configurar suscripciones en tiempo real
  useEffect(() => {
    if (!user) return

    // Suscripción a chat_participants para detectar nuevas conversaciones
    const participantsChannel = supabase
      .channel(`chat_participants_${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_participants",
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          console.log("[v0] New participant record detected, reloading conversations")
          // Nueva conversación donde el usuario fue agregado
          await loadConversations()
        },
      )
      .subscribe()

    channelRef.current = supabase
      .channel(`chat_messages_${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
        },
        async (payload) => {
          const newMessage = payload.new as ChatMessage

          // Verificar si el usuario es participante de esta conversación
          const isParticipant = conversations.some((c) => c.id === newMessage.conversation_id)
          if (!isParticipant) {
            console.log("[v0] Message from unknown conversation, reloading...")
            // Puede ser una nueva conversación, recargar
            await loadConversations()
            return
          }

          const senderResponse = await fetch(`/api/users/${newMessage.sender_id}`)
          const senderData = senderResponse.ok ? await senderResponse.json() : null

          const messageWithSender = {
            ...newMessage,
            sender: senderData
              ? {
                  id: senderData.id,
                  full_name: senderData.full_name,
                  avatar_url: senderData.avatar_url,
                  email: senderData.email,
                }
              : undefined,
          }

          // Si es la conversación actual, agregar mensaje
          if (currentConversation?.id === newMessage.conversation_id) {
            setMessages((prev) => [...prev, messageWithSender])
            // Marcar como leído si el chat está abierto
            if (isChatOpen) {
              await markAsRead(newMessage.conversation_id)
            }
          } else {
            // Incrementar contador de no leídos
            setConversations((prev) =>
              prev.map((c) =>
                c.id === newMessage.conversation_id
                  ? { ...c, unread_count: (c.unread_count || 0) + 1, last_message: messageWithSender }
                  : c,
              ),
            )
            setUnreadTotal((prev) => prev + 1)
          }

          // Actualizar last_message en la conversación
          setConversations((prev) =>
            prev
              .map((c) =>
                c.id === newMessage.conversation_id
                  ? { ...c, last_message_at: newMessage.created_at, last_message: messageWithSender }
                  : c,
              )
              .sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()),
          )
        },
      )
      .subscribe()

    // Suscripción a presencia
    presenceChannelRef.current = supabase
      .channel("online_users")
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannelRef.current?.presenceState()
        if (state) {
          const newOnlineUsers = new Map<string, UserPresence>()
          Object.values(state).forEach((presences: any) => {
            presences.forEach((presence: any) => {
              newOnlineUsers.set(presence.user_id, {
                user_id: presence.user_id,
                is_online: true,
                last_seen: new Date().toISOString(),
                status: presence.status || "available",
              })
            })
          })
          setOnlineUsers(newOnlineUsers)
        }
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await presenceChannelRef.current?.track({
            user_id: user.id,
            status: "available",
          })
        }
      })

    // Cargar conversaciones iniciales
    loadConversations()

    // Actualizar presencia como online
    updatePresence(true)

    // Limpiar al desmontar
    return () => {
      participantsChannel?.unsubscribe()
      channelRef.current?.unsubscribe()
      presenceChannelRef.current?.unsubscribe()
      updatePresence(false)
    }
  }, [user, loadConversations, currentConversation, isChatOpen, markAsRead, updatePresence])

  // Actualizar presencia cuando la ventana pierde/gana foco
  useEffect(() => {
    const handleVisibilityChange = () => {
      updatePresence(!document.hidden)
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [updatePresence])

  const value: ChatContextType = {
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
    loadMoreMessages,
    markAsRead,
    refreshConversations: loadConversations,
    searchUsers,
  }

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}
