"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Bell, Check, Trash2, RefreshCw, ExternalLink, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth-context"
import {
  getUserNotifications,
  markNotificationAsRead,
  deleteNotification,
  markAllNotificationsAsRead,
  getRelatedInfo,
} from "@/lib/notifications"

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("all")
  const [counts, setCounts] = useState({ all: 0, unread: 0, read: 0 })
  const { toast } = useToast()
  const router = useRouter()
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      fetchNotifications(activeTab as "all" | "unread" | "read")
    }
  }, [user, activeTab])

  const fetchNotifications = async (filter: "all" | "unread" | "read") => {
    if (!user) return

    setLoading(true)
    try {
      const data = await getUserNotifications(user.id, filter)
      setNotifications(data)

      // Actualizar contadores
      const all = await getUserNotifications(user.id, "all")
      const unread = await getUserNotifications(user.id, "unread")
      const read = await getUserNotifications(user.id, "read")

      setCounts({
        all: all.length,
        unread: unread.length,
        read: read.length,
      })
    } catch (error) {
      console.error("Error fetching notifications:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar las notificaciones",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAsRead = async (id: string) => {
    try {
      await markNotificationAsRead(id)
      toast({
        title: "Notificación marcada como leída",
        description: "La notificación ha sido marcada como leída",
      })
      fetchNotifications(activeTab as "all" | "unread" | "read")
    } catch (error) {
      console.error("Error marking notification as read:", error)
      toast({
        title: "Error",
        description: "No se pudo marcar la notificación como leída",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteNotification(id)
      toast({
        title: "Notificación eliminada",
        description: "La notificación ha sido eliminada",
      })
      fetchNotifications(activeTab as "all" | "unread" | "read")
    } catch (error) {
      console.error("Error deleting notification:", error)
      toast({
        title: "Error",
        description: "No se pudo eliminar la notificación",
        variant: "destructive",
      })
    }
  }

  const handleMarkAllAsRead = async () => {
    if (!user) return

    try {
      await markAllNotificationsAsRead(user.id)
      toast({
        title: "Notificaciones marcadas como leídas",
        description: "Todas las notificaciones han sido marcadas como leídas",
      })
      fetchNotifications(activeTab as "all" | "unread" | "read")
    } catch (error) {
      console.error("Error marking all notifications as read:", error)
      toast({
        title: "Error",
        description: "No se pudieron marcar todas las notificaciones como leídas",
        variant: "destructive",
      })
    }
  }

  const handleRefresh = () => {
    fetchNotifications(activeTab as "all" | "unread" | "read")
  }

  const handleNotificationClick = async (notification: any) => {
    if (!notification.type || !notification.related_id) return

    try {
      // Marcar como leída al hacer clic
      if (!notification.read) {
        await markNotificationAsRead(notification.id)
      }

      // Navegar según el tipo
      const relatedInfo = await getRelatedInfo(notification.type, notification.related_id)
      if (!relatedInfo) return

      switch (relatedInfo.type) {
        case "document":
          router.push(`/documents/${notification.related_id}`)
          break
        case "news":
          router.push(`/news/view/${notification.related_id}`)
          break
        case "department":
          router.push(`/departments`)
          break
        default:
          break
      }

      // Actualizar la lista después de marcar como leída
      fetchNotifications(activeTab as "all" | "unread" | "read")
    } catch (error) {
      console.error("Error handling notification click:", error)
    }
  }

  const getNotificationTypeLabel = (type: string) => {
    switch (type) {
      case "document_created":
        return "Documento creado"
      case "document_moved":
        return "Documento movido"
      case "document_status_changed":
        return "Estado de documento"
      case "news_published":
        return "Noticia publicada"
      case "department_created":
        return "Departamento creado"
      case "user_created":
        return "Usuario creado"
      default:
        return "Sistema"
    }
  }

  const getNotificationTypeColor = (type: string) => {
    switch (type) {
      case "document_created":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      case "document_moved":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
      case "document_status_changed":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
      case "news_published":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300"
      case "department_created":
        return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300"
      case "user_created":
        return "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
    }
  }

  const isNavigable = (notification: any) => {
    return notification.type && notification.related_id
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <p className="text-muted-foreground">Debe iniciar sesión para ver las notificaciones</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6" />
            Notificaciones
          </h1>
          <p className="text-muted-foreground">Gestiona tus notificaciones del sistema</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Actualizar
          </Button>
          {counts.unread > 0 && (
            <Button variant="default" size="sm" onClick={handleMarkAllAsRead}>
              <Check className="h-4 w-4 mr-1" />
              Marcar todas como leídas
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Centro de notificaciones</CardTitle>
          <CardDescription>Revisa tus notificaciones y actualizaciones del sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">
                Todas{" "}
                {counts.all > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {counts.all}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="unread">
                No leídas{" "}
                {counts.unread > 0 && (
                  <Badge variant="destructive" className="ml-1">
                    {counts.unread}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="read">
                Leídas{" "}
                {counts.read > 0 && (
                  <Badge variant="outline" className="ml-1">
                    {counts.read}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {["all", "unread", "read"].map((tab) => (
              <TabsContent key={tab} value={tab} className="space-y-4">
                {loading ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="text-center py-10">
                    <Bell className="h-12 w-12 mx-auto text-muted-foreground opacity-20" />
                    <p className="mt-2 text-muted-foreground">
                      No hay notificaciones {tab === "unread" ? "no leídas" : tab === "read" ? "leídas" : ""}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-4 rounded-lg border ${notification.read ? "bg-muted/30" : "bg-card"} ${
                          isNavigable(notification) ? "cursor-pointer hover:bg-muted/50" : ""
                        }`}
                        onClick={() => isNavigable(notification) && handleNotificationClick(notification)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium">{notification.title}</h3>
                              {notification.type && (
                                <Badge className={`text-xs ${getNotificationTypeColor(notification.type)}`}>
                                  {getNotificationTypeLabel(notification.type)}
                                </Badge>
                              )}
                              {isNavigable(notification) && <ExternalLink className="h-3 w-3 text-muted-foreground" />}
                            </div>
                            <p className="text-sm text-muted-foreground">{notification.message}</p>
                            <p className="text-xs text-muted-foreground">
                              {notification.created_at &&
                                format(new Date(notification.created_at), "d 'de' MMMM, yyyy 'a las' HH:mm", {
                                  locale: es,
                                })}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            {!notification.read && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleMarkAsRead(notification.id)
                                }}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDelete(notification.id)
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
