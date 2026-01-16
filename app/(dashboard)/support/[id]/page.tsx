"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, MessageSquare, Paperclip, Send, Edit, Save, X, Download, User, Ticket, Calendar, Clock, CheckCircle, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/lib/auth-context"
import { useCompany } from "@/lib/company-context"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { motion } from "framer-motion"

interface SupportTicket {
  id: string
  ticket_number: string
  title: string
  description: string
  status: "open" | "in_progress" | "resolved" | "closed"
  priority: "low" | "medium" | "high" | "urgent"
  category: "hardware" | "software" | "network" | "email" | "system" | "other"
  created_by: string
  assigned_to?: string
  company_id: string
  created_at: string
  updated_at: string
  resolved_at?: string
  closed_at?: string
  profiles?: {
    full_name: string
    avatar_url?: string
  }
  assigned_profile?: {
    full_name: string
    avatar_url?: string
  }
}

interface SupportComment {
  id: string
  ticket_id: string
  user_id: string
  content: string
  is_internal: boolean
  created_at: string
  profiles: {
    full_name: string
    avatar_url?: string
  }
}

interface SupportAttachment {
  id: string
  ticket_id: string
  comment_id?: string
  file_name: string
  file_url: string
  file_size?: number
  file_type?: string
  uploaded_by: string
  created_at: string
  profiles: {
    full_name: string
  }
}

interface TechUser {
  id: string
  full_name: string
  email: string
  avatar_url?: string
  role?: string
  department_name?: string
}

const statusConfig = {
  open: { label: "Abierto", color: "bg-blue-500", icon: Ticket },
  in_progress: { label: "En Progreso", color: "bg-yellow-500", icon: Clock },
  resolved: { label: "Resuelto", color: "bg-green-500", icon: CheckCircle },
  closed: { label: "Cerrado", color: "bg-gray-500", icon: XCircle },
}

const priorityConfig = {
  low: { label: "Baja", color: "bg-slate-500" },
  medium: { label: "Media", color: "bg-blue-500" },
  high: { label: "Alta", color: "bg-orange-500" },
  urgent: { label: "Urgente", color: "bg-red-500" },
}

const categoryConfig = {
  hardware: { label: "Hardware" },
  software: { label: "Software" },
  network: { label: "Red" },
  email: { label: "Email" },
  system: { label: "Sistema" },
  other: { label: "Otro" },
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4 },
  },
}

export default function SupportTicketDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const { selectedCompany } = useCompany()
  const [ticket, setTicket] = useState<SupportTicket | null>(null)
  const [comments, setComments] = useState<SupportComment[]>([])
  const [attachments, setAttachments] = useState<SupportAttachment[]>([])
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState("")
  const [submittingComment, setSubmittingComment] = useState(false)
  const [editingStatus, setEditingStatus] = useState(false)
  const [newStatus, setNewStatus] = useState("")
  const [canManageTicket, setCanManageTicket] = useState(false)
  const [techUsers, setTechUsers] = useState<TechUser[]>([])
  const [assigningTo, setAssigningTo] = useState<string>("")
  const [updatingTicket, setUpdatingTicket] = useState(false)

  const ticketId = params.id as string

  useEffect(() => {
    if (user && ticketId) {
      fetchTicketDetails()
    }
  }, [user, ticketId])

  useEffect(() => {
    if (user && (selectedCompany || user.company_id)) {
      fetchTechUsers()
    }
  }, [user, selectedCompany])

  const fetchTechUsers = async () => {
    const companyId = selectedCompany?.id || user?.company_id
    if (!companyId) return

    try {
      setTechUsers([])
      const { data: allUsers, error: usersError } = await supabase
        .from("profiles")
        .select(`
          id, 
          full_name, 
          email, 
          avatar_url, 
          role,
          department_id,
          departments!profiles_department_id_fkey (
            id,
            name
          )
        `)
        .eq("company_id", companyId)

      if (usersError) {
        console.error("❌ Error fetching users:", usersError)
        return
      }

      const techUsers = (allUsers || []).filter((user) => {
        const isAdmin = user.role === "admin"
        const isTech = user.departments?.name === "Tecnología"
        return isAdmin || isTech
      })

      const formattedUsers: TechUser[] = techUsers.map((user) => ({
        id: user.id,
        full_name: user.full_name || user.email,
        email: user.email,
        avatar_url: user.avatar_url,
        role: user.role,
        department_name: user.departments?.name,
      }))

      setTechUsers(formattedUsers)
    } catch (error) {
      console.error("💥 Error in fetchTechUsers:", error)
      toast.error("Error al cargar usuarios de tecnología")
    }
  }

  const fetchTicketDetails = async () => {
    if (!ticketId || ticketId === "new" || ticketId === "undefined") {
      router.push("/support")
      return
    }

    try {
      setLoading(true)

      const { data: ticketData, error: ticketError } = await supabase
        .from("support_tickets")
        .select(`
          *,
          profiles!support_tickets_created_by_fkey (
            full_name,
            avatar_url
          ),
          assigned_profile:profiles!support_tickets_assigned_to_fkey (
            full_name,
            avatar_url
          )
        `)
        .eq("id", ticketId)
        .single()

      if (ticketError) {
        console.error("Error fetching ticket:", ticketError)
        toast.error("Error al cargar el ticket")
        router.push("/support")
        return
      }

      setTicket(ticketData)
      setNewStatus(ticketData.status)
      setAssigningTo(ticketData.assigned_to || "none")

      const canManage =
        (user?.role === "admin" || user?.departments?.name === "Tecnología") && ticketData.status !== "closed"
      setCanManageTicket(canManage)

      const { data: commentsData, error: commentsError } = await supabase
        .from("support_comments")
        .select(`
          *,
          profiles (
            full_name,
            avatar_url
          )
        `)
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true })

      if (!commentsError) {
        setComments(commentsData || [])
      }

      const { data: attachmentsData, error: attachmentsError } = await supabase
        .from("support_attachments")
        .select(`
          *,
          profiles (
            full_name
          )
        `)
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true })

      if (!attachmentsError) {
        setAttachments(attachmentsData || [])
      }
    } catch (error) {
      console.error("Error:", error)
      toast.error("Error al cargar los detalles del ticket")
    } finally {
      setLoading(false)
    }
  }

  const handleAddComment = async () => {
    if (!newComment.trim() || !user) return

    try {
      setSubmittingComment(true)

      const { data, error } = await supabase
        .from("support_comments")
        .insert({
          ticket_id: ticketId,
          user_id: user.id,
          content: newComment.trim(),
          is_internal: false,
        })
        .select(`
          *,
          profiles (
            full_name,
            avatar_url
          )
        `)
        .single()

      if (error) {
        console.error("Error adding comment:", error)
        toast.error("Error al agregar comentario")
        return
      }

      setComments((prev) => [...prev, data])
      setNewComment("")
      toast.success("Comentario agregado")
    } catch (error) {
      console.error("Error:", error)
      toast.error("Error al agregar comentario")
    } finally {
      setSubmittingComment(false)
    }
  }

  const handleStatusUpdate = async () => {
    if (!ticket || !canManageTicket || ticket.status === "closed") {
      toast.error("No se puede modificar un ticket cerrado")
      return
    }

    try {
      setUpdatingTicket(true)

      const assignedToValue = assigningTo === "none" ? null : assigningTo

      const updateData: any = {
        status: newStatus,
        assigned_to: assignedToValue,
        updated_at: new Date().toISOString(),
      }

      if (newStatus === "resolved") {
        updateData.resolved_at = new Date().toISOString()
      } else if (newStatus === "closed") {
        updateData.closed_at = new Date().toISOString()
      }

      const { error: directError } = await supabase.from("support_tickets").update(updateData).eq("id", ticketId)

      if (directError) {
        console.error("Error updating ticket:", directError)
        toast.error("Error al actualizar ticket")
        return
      }

      toast.success("Ticket actualizado correctamente")
      setEditingStatus(false)
      await fetchTicketDetails()
    } catch (error) {
      console.error("Error:", error)
      toast.error("Error al actualizar ticket")
    } finally {
      setUpdatingTicket(false)
    }
  }

  const downloadAttachment = async (attachment: SupportAttachment) => {
    try {
      const response = await fetch(attachment.file_url)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = attachment.file_name
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("Error downloading file:", error)
      toast.error("Error al descargar archivo")
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6 min-h-[calc(100vh-4rem)]">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Cargando ticket...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="container mx-auto p-6 min-h-[calc(100vh-4rem)]">
        <div className="text-center py-20">
          <h2 className="text-2xl font-bold mb-2">Ticket no encontrado</h2>
          <p className="text-muted-foreground mb-4">El ticket que buscas no existe o no tienes permisos para verlo.</p>
          <Link href="/support">
            <Button>Volver a Soporte</Button>
          </Link>
        </div>
      </div>
    )
  }

  const StatusIcon = statusConfig[ticket.status].icon

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="container mx-auto p-6 max-w-6xl min-h-[calc(100vh-4rem)]"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
           <Button variant="ghost" size="sm" asChild className="pl-0 hover:bg-transparent hover:text-blue-600 dark:hover:text-blue-400 mb-2">
            <Link href="/support">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a Soporte
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-slate-900 via-slate-700 to-slate-600 dark:from-white dark:via-slate-200 dark:to-slate-400 bg-clip-text text-transparent">
              {ticket.title}
            </h1>
            <Badge variant="outline" className="text-sm py-1 px-3 bg-white/50 dark:bg-slate-800/50">
              {ticket.ticket_number}
            </Badge>
          </div>
          <p className="text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
            Creado por <span className="font-medium text-slate-700 dark:text-slate-300">{ticket.profiles?.full_name}</span> •{" "}
            {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true, locale: es })}
          </p>
        </div>
        
        <div className={`px-4 py-2 rounded-full flex items-center gap-2 ${statusConfig[ticket.status].color} text-white shadow-lg`}>
          <StatusIcon className="h-5 w-5" />
          <span className="font-bold">{statusConfig[ticket.status].label}</span>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ticket Details */}
          <motion.div variants={itemVariants}>
            <Card className="border-none shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
              <CardHeader>
                <CardTitle>Descripción</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-100 dark:border-slate-800">
                  {ticket.description}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Attachments */}
          {attachments.length > 0 && (
            <motion.div variants={itemVariants}>
              <Card className="border-none shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Paperclip className="h-4 w-4 text-blue-500" />
                    Adjuntos ({attachments.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {attachments.map((attachment) => (
                      <div key={attachment.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate text-slate-700 dark:text-slate-200">{attachment.file_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {attachment.file_size && `${(attachment.file_size / 1024 / 1024).toFixed(2)} MB • `}
                              Por {attachment.profiles.full_name}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => downloadAttachment(attachment)}
                            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                        {attachment.file_type?.startsWith("image/") && (
                          <div className="mt-2">
                            <img
                              src={attachment.file_url || "/placeholder.svg"}
                              alt={attachment.file_name}
                              className="w-full h-32 object-cover rounded bg-slate-100 dark:bg-slate-800"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Comments */}
          <motion.div variants={itemVariants}>
            <Card className="border-none shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-blue-500" />
                  Comentarios ({comments.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex items-start gap-4 group">
                      <Avatar className="h-10 w-10 border-2 border-white dark:border-slate-700 shadow-sm">
                        <AvatarImage src={comment.profiles.avatar_url || ""} />
                        <AvatarFallback>
                          {comment.profiles.full_name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{comment.profiles.full_name}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: es })}
                          </span>
                        </div>
                        <div className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-r-xl rounded-bl-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                          {comment.content}
                        </div>
                      </div>
                    </div>
                  ))}

                  {comments.length === 0 && (
                    <div className="text-center py-12 bg-slate-50/50 dark:bg-slate-800/20 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                      <MessageSquare className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-slate-500 dark:text-slate-400">No hay comentarios aún</p>
                    </div>
                  )}
                </div>

                {/* Add Comment */}
                {ticket.status !== "closed" ? (
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-10 w-10 border-2 border-white dark:border-slate-700 shadow-sm">
                        <AvatarImage src={user?.avatar_url || ""} />
                        <AvatarFallback>
                          {user?.full_name
                            ?.split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-3">
                        <Textarea
                          placeholder="Escribe un comentario o respuesta..."
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          rows={3}
                          className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 resize-none focus:ring-blue-500"
                        />
                        <div className="flex justify-end">
                          <Button 
                            onClick={handleAddComment} 
                            disabled={!newComment.trim() || submittingComment} 
                            className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20"
                          >
                            <Send className="h-4 w-4 mr-2" />
                            {submittingComment ? "Enviando..." : "Enviar Comentario"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                    <div className="text-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        🔒 Este ticket está cerrado. No se pueden agregar más comentarios.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status & Assignment */}
          <motion.div variants={itemVariants}>
            <Card className="border-none shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="text-lg">Gestión del Ticket</CardTitle>
              </CardHeader>
              <CardContent>
                {editingStatus && canManageTicket ? (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Estado:</label>
                      <Select value={newStatus} onValueChange={setNewStatus}>
                        <SelectTrigger className="mt-1 bg-white/50 dark:bg-slate-800/50">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Abierto</SelectItem>
                          <SelectItem value="in_progress">En Progreso</SelectItem>
                          <SelectItem value="resolved">Resuelto</SelectItem>
                          <SelectItem value="closed">Cerrado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Asignar a:</label>
                      <Select value={assigningTo} onValueChange={setAssigningTo}>
                        <SelectTrigger className="mt-1 bg-white/50 dark:bg-slate-800/50">
                          <SelectValue placeholder="Sin asignar" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sin asignar</SelectItem>
                          {techUsers.map((techUser) => (
                            <SelectItem key={techUser.id} value={techUser.id}>
                              <div className="flex items-center gap-2">
                                <span>{techUser.full_name}</span>
                                <Badge variant="secondary" className="text-xs">
                                  {techUser.role === "admin" ? "Admin" : techUser.department_name}
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {techUsers.length === 0 && (
                        <p className="text-xs text-muted-foreground mt-1">No hay usuarios de tecnología disponibles</p>
                      )}
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button size="sm" onClick={handleStatusUpdate} disabled={updatingTicket} className="flex-1 bg-blue-600 hover:bg-blue-700">
                        <Save className="h-4 w-4 mr-1" />
                        Guardar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingStatus(false)
                          setNewStatus(ticket.status)
                          setAssigningTo(ticket.assigned_to || "none")
                        }}
                        disabled={updatingTicket}
                        className="flex-1"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Estado Actual</span>
                      <Badge className={`${statusConfig[ticket.status].color} text-white border-none shadow-sm`}>
                        {statusConfig[ticket.status].label}
                      </Badge>
                    </div>

                    {canManageTicket && (
                      <Button size="sm" variant="outline" onClick={() => setEditingStatus(true)} className="w-full border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-900 dark:text-blue-400 dark:hover:bg-blue-900/20">
                        <Edit className="h-4 w-4 mr-2" />
                        Gestionar Ticket
                      </Button>
                    )}

                    {!canManageTicket &&
                      (user?.role === "admin" || user?.departments?.name === "Tecnología") &&
                      ticket.status !== "closed" && (
                        <p className="text-xs text-center text-muted-foreground bg-slate-50 dark:bg-slate-800/50 p-2 rounded">
                          Solo el personal de Tecnología puede gestionar tickets
                        </p>
                      )}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Details */}
          <motion.div variants={itemVariants}>
            <Card className="border-none shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="text-lg">Detalles Adicionales</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Prioridad</span>
                  <div className="mt-1">
                    <Badge className={`${priorityConfig[ticket.priority].color} text-white border-none shadow-sm`}>
                      {priorityConfig[ticket.priority].label}
                    </Badge>
                  </div>
                </div>
                <Separator />
                <div>
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Categoría</span>
                  <div className="mt-1">
                    <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {categoryConfig[ticket.category].label}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* People */}
          <motion.div variants={itemVariants}>
            <Card className="border-none shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="text-lg">Personas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Creado por</span>
                  <div className="flex items-center gap-3 mt-2 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={ticket.profiles?.avatar_url || ""} />
                      <AvatarFallback className="text-xs">
                        {ticket.profiles?.full_name
                          ?.split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{ticket.profiles?.full_name}</span>
                  </div>
                </div>

                <Separator />

                <div>
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Asignado a</span>
                  {ticket.assigned_profile ? (
                    <div className="flex items-center gap-3 mt-2 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={ticket.assigned_profile.avatar_url || ""} />
                        <AvatarFallback className="text-xs">
                          {ticket.assigned_profile.full_name
                            ?.split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{ticket.assigned_profile.full_name}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mt-2 p-2 text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span className="text-sm">Sin asignar</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Timestamps */}
          <motion.div variants={itemVariants}>
            <Card className="border-none shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="text-lg">Cronología</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Creado</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">{new Date(ticket.created_at).toLocaleDateString("es-ES")}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Actualizado</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">{new Date(ticket.updated_at).toLocaleDateString("es-ES")}</span>
                </div>
                {ticket.resolved_at && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Resuelto</span>
                    <span className="font-medium text-green-600 dark:text-green-400">{new Date(ticket.resolved_at).toLocaleDateString("es-ES")}</span>
                  </div>
                )}
                {ticket.closed_at && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Cerrado</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">{new Date(ticket.closed_at).toLocaleDateString("es-ES")}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}
