"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, MessageSquare, Paperclip, Send, Edit, Save, X, Download, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  open: { label: "Abierto", color: "bg-blue-500" },
  in_progress: { label: "En Progreso", color: "bg-yellow-500" },
  resolved: { label: "Resuelto", color: "bg-green-500" },
  closed: { label: "Cerrado", color: "bg-gray-500" },
}

const priorityConfig = {
  low: { label: "Baja", color: "bg-gray-500" },
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
    if (!companyId) {
      console.log("No company ID available for fetching tech users")
      return
    }

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

      console.log("📊 All users found:", allUsers?.length || 0)
      console.log("👥 Users data:", allUsers)

      if (!allUsers || allUsers.length === 0) {
        console.log("⚠️ No users found for company")
        toast.error("No se encontraron usuarios en la empresa")
        return
      }

      const techUsers = allUsers.filter((user) => {
        const isAdmin = user.role === "admin"
        const isTech = user.departments?.name === "Tecnología"

        console.log(`👤 ${user.full_name || user.email}:`, {
          role: user.role,
          department: user.departments?.name,
          isAdmin,
          isTech,
          qualifies: isAdmin || isTech,
        })

        return isAdmin || isTech
      })

      console.log("🔧 Tech users filtered:", techUsers.length)

      const formattedUsers: TechUser[] = techUsers.map((user) => ({
        id: user.id,
        full_name: user.full_name || user.email,
        email: user.email,
        avatar_url: user.avatar_url,
        role: user.role,
        department_name: user.departments?.name,
      }))

      console.log("✅ Final tech users:", formattedUsers)
      setTechUsers(formattedUsers)

      if (formattedUsers.length === 0) {
        toast.error("No se encontraron usuarios de tecnología en esta empresa")
      }
    } catch (error) {
      console.error("💥 Error in fetchTechUsers:", error)
      toast.error("Error al cargar usuarios de tecnología")
      setTechUsers([])
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
      <div className="container mx-auto p-6">
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
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Ticket no encontrado</h2>
          <p className="text-muted-foreground mb-4">El ticket que buscas no existe o no tienes permisos para verlo.</p>
          <Link href="/support">
            <Button>Volver a Soporte</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/support">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold">{ticket.title}</h1>
            <Badge variant="outline">{ticket.ticket_number}</Badge>
          </div>
          <p className="text-muted-foreground">
            Creado por {ticket.profiles?.full_name} •{" "}
            {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true, locale: es })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ticket Details */}
          <Card>
            <CardHeader>
              <CardTitle>Descripción</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="whitespace-pre-wrap text-sm">{ticket.description}</div>
            </CardContent>
          </Card>

          {/* Attachments */}
          {attachments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Paperclip className="h-4 w-4" />
                  Adjuntos ({attachments.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {attachments.map((attachment) => (
                    <div key={attachment.id} className="border rounded-lg p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{attachment.file_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {attachment.file_size && `${(attachment.file_size / 1024 / 1024).toFixed(2)} MB • `}
                            Por {attachment.profiles.full_name}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => downloadAttachment(attachment)}
                          className="h-8 w-8 p-0"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                      {attachment.file_type?.startsWith("image/") && (
                        <div className="mt-2">
                          <img
                            src={attachment.file_url || "/placeholder.svg"}
                            alt={attachment.file_name}
                            className="w-full h-32 object-cover rounded"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Comments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Comentarios ({comments.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {comments.map((comment, index) => (
                <div key={comment.id}>
                  <div className="flex items-start gap-3">
                    <Avatar className="h-8 w-8">
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
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{comment.profiles.full_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: es })}
                        </span>
                      </div>
                      <div className="text-sm whitespace-pre-wrap bg-muted p-3 rounded-lg">{comment.content}</div>
                    </div>
                  </div>
                  {index < comments.length - 1 && <Separator className="mt-4" />}
                </div>
              ))}

              {comments.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">No hay comentarios aún</div>
              )}

              {/* Add Comment */}
              {ticket.status !== "closed" ? (
                <div className="border-t pt-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user?.avatar_url || ""} />
                      <AvatarFallback>
                        {user?.full_name
                          ?.split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-2">
                      <Textarea
                        placeholder="Agregar un comentario..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        rows={3}
                      />
                      <div className="flex justify-end">
                        <Button onClick={handleAddComment} disabled={!newComment.trim() || submittingComment} size="sm">
                          <Send className="h-4 w-4 mr-2" />
                          {submittingComment ? "Enviando..." : "Comentar"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border-t pt-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      Este ticket está cerrado. No se pueden agregar más comentarios.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Debug Info */}
          {process.env.NODE_ENV === "development" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Debug Info</CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-1">
                <div>Company: {selectedCompany?.name || user?.company_id}</div>
                <div>Tech Users: {techUsers.length}</div>
                <div>Can Manage: {canManageTicket ? "Yes" : "No"}</div>
                <div>User Role: {user?.role}</div>
                <div>User Dept: {user?.departments?.name}</div>
              </CardContent>
            </Card>
          )}

          {/* Status & Assignment */}
          <Card>
            <CardHeader>
              <CardTitle>Gestión</CardTitle>
            </CardHeader>
            <CardContent>
              {editingStatus && canManageTicket ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Estado:</label>
                    <Select value={newStatus} onValueChange={setNewStatus}>
                      <SelectTrigger className="mt-1">
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
                    <label className="text-sm font-medium">Asignar a:</label>
                    <Select value={assigningTo} onValueChange={setAssigningTo}>
                      <SelectTrigger className="mt-1">
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

                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleStatusUpdate} disabled={updatingTicket}>
                      <Save className="h-4 w-4 mr-1" />
                      {updatingTicket ? "Guardando..." : "Guardar"}
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
                    >
                      <X className="h-4 w-4 mr-1" />
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Estado:</span>
                    <Badge className={`${statusConfig[ticket.status].color} text-white`}>
                      {statusConfig[ticket.status].label}
                    </Badge>
                  </div>

                  {canManageTicket && (
                    <Button size="sm" variant="outline" onClick={() => setEditingStatus(true)} className="w-full">
                      <Edit className="h-4 w-4 mr-2" />
                      Gestionar Ticket
                    </Button>
                  )}

                  {(user?.role === "admin" || user?.departments?.name === "Tecnología") &&
                    ticket.status === "closed" && (
                      <div className="text-center p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-600 font-medium">🔒 Ticket Cerrado</p>
                        <p className="text-xs text-red-500 mt-1">Este ticket no se puede modificar</p>
                      </div>
                    )}

                  {user?.role !== "admin" && user?.departments?.name !== "Tecnología" && (
                    <div className="text-center p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-600 font-medium">👁️ Solo Lectura</p>
                      <p className="text-xs text-blue-500 mt-1">Puedes ver detalles y agregar comentarios</p>
                    </div>
                  )}

                  {!canManageTicket &&
                    (user?.role === "admin" || user?.departments?.name === "Tecnología") &&
                    ticket.status !== "closed" && (
                      <p className="text-xs text-muted-foreground">
                        Solo el personal de Tecnología puede gestionar tickets
                      </p>
                    )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Priority & Category */}
          <Card>
            <CardHeader>
              <CardTitle>Detalles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <span className="text-sm font-medium">Prioridad:</span>
                <Badge className={`ml-2 ${priorityConfig[ticket.priority].color} text-white`}>
                  {priorityConfig[ticket.priority].label}
                </Badge>
              </div>
              <div>
                <span className="text-sm font-medium">Categoría:</span>
                <Badge variant="secondary" className="ml-2">
                  {categoryConfig[ticket.category].label}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* People */}
          <Card>
            <CardHeader>
              <CardTitle>Personas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <span className="text-sm font-medium">Creado por:</span>
                <div className="flex items-center gap-2 mt-1">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={ticket.profiles?.avatar_url || ""} />
                    <AvatarFallback className="text-xs">
                      {ticket.profiles?.full_name
                        ?.split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{ticket.profiles?.full_name}</span>
                </div>
              </div>

              <div>
                <span className="text-sm font-medium">Asignado a:</span>
                {ticket.assigned_profile ? (
                  <div className="flex items-center gap-2 mt-1">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={ticket.assigned_profile.avatar_url || ""} />
                      <AvatarFallback className="text-xs">
                        {ticket.assigned_profile.full_name
                          ?.split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{ticket.assigned_profile.full_name}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mt-1">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Sin asignar</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Timestamps */}
          <Card>
            <CardHeader>
              <CardTitle>Fechas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Creado:</span>
                <div className="text-muted-foreground">{new Date(ticket.created_at).toLocaleString("es-ES")}</div>
              </div>
              <div>
                <span className="font-medium">Actualizado:</span>
                <div className="text-muted-foreground">{new Date(ticket.updated_at).toLocaleString("es-ES")}</div>
              </div>
              {ticket.resolved_at && (
                <div>
                  <span className="font-medium">Resuelto:</span>
                  <div className="text-muted-foreground">{new Date(ticket.resolved_at).toLocaleString("es-ES")}</div>
                </div>
              )}
              {ticket.closed_at && (
                <div>
                  <span className="font-medium">Cerrado:</span>
                  <div className="text-muted-foreground">{new Date(ticket.closed_at).toLocaleString("es-ES")}</div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
