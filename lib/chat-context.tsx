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
  company_id?: string
  company_name?: string
  company_code?: string
  company_color?: string
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
  sendMessage: (content: string, messageType?: string, file?: File) => Promise<void>
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
  const currentConversationRef = useRef<ChatConversation | null>(null)
  const isChatOpenRef = useRef(false)
  const conversationsRef = useRef<ChatConversation[]>([])

  useEffect(() => {
    currentConversationRef.current = currentConversation
  }, [currentConversation])

  useEffect(() => {
    isChatOpenRef.current = isChatOpen
  }, [isChatOpen])

  useEffect(() => {
    conversationsRef.current = conversations
  }, [conversations])

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

  const sendMessage = useCallback(
    async (content: string, messageType = "text", file?: File) => {
      if (!user || !currentConversation) return

      try {
        let fileUrl: string | undefined
        let fileName: string | undefined

        if (file) {
          const formData = new FormData()
          formData.append("file", file)
          formData.append("conversationId", currentConversation.id)

          const uploadResponse = await fetch("/api/chat/upload", {
            method: "POST",
            body: formData,
          })

          if (!uploadResponse.ok) {
            const errorData = await uploadResponse.json()
            throw new Error(errorData.error || "Error al subir archivo")
          }

          const uploadData = await uploadResponse.json()
          fileUrl = uploadData.url
          fileName = uploadData.name

          // Detectar si es imagen
          if (file.type.startsWith("image/")) {
            messageType = "image"
          } else {
            messageType = "file"
          }
        }

        const messageData: any = {
          conversation_id: currentConversation.id,
          sender_id: user.id,
          content: content.trim() || fileName || "Archivo adjunto",
          message_type: messageType,
        }

        if (fileUrl) {
          messageData.file_url = fileUrl
          messageData.file_name = fileName
        }

        const { error } = await supabase.from("chat_messages").insert(messageData)

        if (error) throw error
      } catch (error) {
        console.error("Error sending message:", error)
        throw error
      }
    },
    [user, currentConversation],
  )

  const createConversation = useCallback(
    async (participantIds: string[], name?: string): Promise<ChatConversation | null> => {
      if (!user) return null

      try {
        if (participantIds.length === 1) {
          const existingConv = conversations.find(
            (c) =>
              !c.is_group && c.participants.length === 2 && c.participants.some((p) => p.user_id === participantIds[0]),
          )
          if (existingConv) {
            console.log("[v0] Found existing 1:1 conversation in cache:", existingConv.id)
            return existingConv
          }
        }

        console.log("[v0] Creating conversation via API with participants:", participantIds)

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

        console.log("[v0] API returned conversation:", conversation.id, "existing:", existing)

        if (existing) {
          const existingConv = conversations.find((c) => c.id === conversation.id)
          if (existingConv) {
            console.log("[v0] Found existing conversation in state")
            return existingConv
          }
        }

        await loadConversations()

        await new Promise((resolve) => setTimeout(resolve, 100))

        const newConv = conversationsRef.current.find((c) => c.id === conversation.id)
        if (newConv) {
          console.log("[v0] Found newly created conversation in state")
          return newConv
        }

        console.error("[v0] Could not find conversation after creation")
        return null
      } catch (error) {
        console.error("[v0] Error creating conversation:", error)
        return null
      }
    },
    [user, conversations, loadConversations],
  )

  const loadMoreMessages = useCallback(async () => {
    if (!currentConversation) return
    await loadMessages(currentConversation.id, messages.length)
  }, [currentConversation, messages.length, loadMessages])

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

        setConversations((prev) => prev.map((c) => (c.id === conversationId ? { ...c, unread_count: 0 } : c)))
        setUnreadTotal((prev) => {
          const conv = conversationsRef.current.find((c) => c.id === conversationId)
          return Math.max(0, prev - (conv?.unread_count || 0))
        })
      } catch (error) {
        console.error("Error marking as read:", error)
      }
    },
    [user],
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
          company_id: u.company_id,
          company_name: u.companies?.name,
          company_code: u.companies?.code,
          company_color: u.companies?.color,
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

  useEffect(() => {
    if (!user) return

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

          const isParticipant = conversationsRef.current.some((c) => c.id === newMessage.conversation_id)
          if (!isParticipant) {
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

          if (currentConversationRef.current?.id === newMessage.conversation_id) {
            setMessages((prev) => [...prev, messageWithSender])
            if (isChatOpenRef.current) {
              await markAsRead(newMessage.conversation_id)
            }
          } else {
            setConversations((prev) =>
              prev.map((c) =>
                c.id === newMessage.conversation_id
                  ? { ...c, unread_count: (c.unread_count || 0) + 1, last_message: messageWithSender }
                  : c,
              ),
            )
            setUnreadTotal((prev) => prev + 1)
          }

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

    loadConversations()

    updatePresence(true)

    return () => {
      participantsChannel?.unsubscribe()
      channelRef.current?.unsubscribe()
      presenceChannelRef.current?.unsubscribe()
      updatePresence(false)
    }
  }, [user, loadConversations, updatePresence, markAsRead])

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
