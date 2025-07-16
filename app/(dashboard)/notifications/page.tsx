"use client"

import { useState, useEffect, useCallback } from "react"
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
import { useCompany } from "@/lib/company-context" // Import useCompany
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
  const { selectedCompany } = useCompany() // Use selectedCompany

  const fetchNotifications = useCallback(
    async (filter: "all" | "unread" | "read") => {
      if (!user) return

      setLoading(true)
      try {
        // Para admins, usar la empresa seleccionada
        const companyId = user.role === "admin" && selectedCompany ? selectedCompany.id : undefined
        const data = await getUserNotifications(user.id, filter, companyId)
        setNotifications(data)

        // Actualizar contadores
        const all = await getUserNotifications(user.id, "all", companyId)
        const unread = await getUserNotifications(user.id, "unread", companyId)
        const read = await getUserNotifications(user.id, "read", companyId)

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
    },
    [user, selectedCompany, toast],
  ) // Add selectedCompany to dependencies

  useEffect(() => {
    if (user) {
      fetchNotifications(activeTab as "all" | "unread" | "read")
    }
  }, [user, activeTab, fetchNotifications])

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
      const companyId = user.role === "admin" && selectedCompany ? selectedCompany.id : undefined
      await markAllNotificationsAsRead(user.id, companyId)
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
    if (!notification.type || !notification.related_id) {
      console.warn("Notification missing type or related_id, cannot navigate.", notification)
      toast({
        title: "Información incompleta",
        description: "Esta notificación no tiene un destino válido.",
        variant: "destructive",
      })
      return
    }

    try {
      // Marcar como leída al hacer clic
      if (!notification.read) {
        await markNotificationAsRead(notification.id)
      }

      const relatedInfo = await getRelatedInfo(notification.type, notification.related_id)
      console.log("Related Info:", relatedInfo) // Debugging line

      if (!relatedInfo || !relatedInfo.data) {
        // Ensure data exists
        console.warn(
          "No related info found for notification type:",
          notification.type,
          "and relatedId:",
          notification.related_id,
        )
        toast({
          title: "Información no disponible",
          description: "No se pudo encontrar la información relacionada con esta notificación.",
          variant: "destructive",
        })
        return
      }

      // Navegar según el tipo
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
        case "sale":
          router.push(`/sales`)
          break
        case "quotation":
          router.push(`/quotations`)
          break
        default:
          console.warn("Unhandled notification type for navigation:", relatedInfo.type)
          toast({
            title: "Tipo de notificación no soportado",
            description: "No se puede navegar a la vista para este tipo de notificación.",
            variant: "destructive",
          })
          break
      }

      // Actualizar la lista después de marcar como leída
      fetchNotifications(activeTab as "all" | "unread" | "read")
    } catch (error) {
      console.error("Error handling notification click:", error)
      toast({
        title: "Error de navegación",
        description: "Ocurrió un error al intentar navegar a la información relacionada.",
        variant: "destructive",
      })
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
      case "sale_created":
        return "Venta creada"
      case "quotation_review":
        return "Cotización en revisión"
      case "quotation_status_update":
        return "Estado de cotización"
      default:
        return "Sistema"
    }
  }

  const getNotificationTypeColor = (type: string) => {
    switch (type) {
      case "document_created":
        return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
      case "document_moved":
        return "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200"
      case "document_status_changed":
        return "bg-slate-300 text-slate-900 dark:bg-slate-600 dark:text-slate-100"
      case "news_published":
        return "bg-slate-400 text-white dark:bg-slate-500 dark:text-slate-100"
      case "department_created":
        return "bg-slate-500 text-white dark:bg-slate-400 dark:text-slate-900"
      case "user_created":
        return "bg-slate-600 text-white dark:bg-slate-300 dark:text-slate-900"
      case "sale_created":
        return "bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-300"
      case "quotation_review":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-800 dark:text-yellow-300"
      case "quotation_status_update":
        return "bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-300"
      default:
        return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
    }
  }

  const isNavigable = (notification: any) => {
    return notification.type && notification.related_id
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <p className="text-slate-500">Debe iniciar sesión para ver las notificaciones</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 sm:py-10 px-3 sm:px-4 min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 rounded-lg bg-gradient-to-br from-slate-600 to-slate-700 text-white shadow-lg">
              <Bell className="h-4 w-4 sm:h-6 sm:w-6" />
            </div>
            <span className="bg-gradient-to-r from-slate-700 via-slate-600 to-slate-500 bg-clip-text text-transparent">
              Notificaciones
            </span>
          </h1>
          <p className="text-sm sm:text-base text-slate-500">Gestiona tus notificaciones del sistema</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="w-full sm:w-auto hover:scale-105 transition-all duration-300 bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300 text-slate-600"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Actualizar
          </Button>
          {counts.unread > 0 && (
            <Button
              variant="default"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="w-full sm:w-auto bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              <Check className="h-4 w-4 mr-1" />
              <span className="sm:hidden">Marcar todas</span>
              <span className="hidden sm:inline">Marcar todas como leídas</span>
            </Button>
          )}
        </div>
      </div>

      <Card className="shadow-xl border-0 bg-gradient-to-br from-white to-slate-50/50 backdrop-blur-sm transition-all duration-300 hover:shadow-2xl">
        <CardHeader className="pb-3 p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <div className="p-1.5 sm:p-2 rounded-lg bg-gradient-to-br from-slate-600 to-slate-700 text-white shadow-lg">
              <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <span className="sm:hidden text-slate-700">Notificaciones</span>
            <span className="hidden sm:inline text-slate-700">Centro de notificaciones</span>
          </CardTitle>
          <CardDescription className="text-sm sm:text-base text-slate-500">
            Revisa tus notificaciones y actualizaciones del sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 w-full grid grid-cols-3">
              <TabsTrigger
                value="all"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-slate-600 data-[state=active]:to-slate-700 data-[state=active]:text-white transition-all duration-300 text-xs sm:text-sm text-slate-600"
              >
                <span className="sm:hidden">Todas</span>
                <span className="hidden sm:inline">Todas</span>
                {counts.all > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-1 bg-slate-200 text-slate-700 dark:bg-slate-600 dark:text-slate-200 text-xs"
                  >
                    {counts.all}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="unread"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-slate-700 data-[state=active]:to-slate-800 data-[state=active]:text-white transition-all duration-300 text-xs sm:text-sm text-slate-600"
              >
                <span className="sm:hidden">No leídas</span>
                <span className="hidden sm:inline">No leídas</span>
                {counts.unread > 0 && (
                  <Badge
                    variant="destructive"
                    className="ml-1 bg-gradient-to-r from-slate-700 to-slate-800 text-white shadow-md text-xs"
                  >
                    {counts.unread}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="read"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-slate-500 data-[state=active]:to-slate-600 data-[state=active]:text-white transition-all duration-300 text-xs sm:text-sm text-slate-600"
              >
                <span className="sm:hidden">Leídas</span>
                <span className="hidden sm:inline">Leídas</span>
                {counts.read > 0 && (
                  <Badge
                    variant="outline"
                    className="ml-1 border-slate-300 text-slate-600 dark:border-slate-600 dark:text-slate-400 text-xs"
                  >
                    {counts.read}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {["all", "unread", "read"].map((tab) => (
              <TabsContent key={tab} value={tab} className="space-y-4">
                {loading ? (
                  <div className="flex items-center justify-center py-10">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
                      <p className="text-slate-500">Cargando notificaciones...</p>
                    </div>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="text-center py-10">
                    <div className="p-3 sm:p-4 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 flex items-center justify-center">
                      <Bell className="h-8 w-8 sm:h-12 sm:w-12 text-slate-400 opacity-60" />
                    </div>
                    <p className="mt-2 text-slate-500 text-base sm:text-lg">
                      No hay notificaciones {tab === "unread" ? "no leídas" : tab === "read" ? "leídas" : ""}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 sm:space-y-4">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-3 sm:p-4 rounded-lg border transition-all duration-300 hover:shadow-lg hover:scale-[1.02] ${
                          notification.read
                            ? "bg-gradient-to-r from-slate-50/50 to-slate-100/50 dark:from-slate-900/20 dark:to-slate-800/20 border-slate-200 dark:border-slate-700"
                            : "bg-gradient-to-r from-white via-slate-50/30 to-slate-100/50 dark:from-slate-900/40 dark:via-slate-800/20 dark:to-slate-700/20 border-slate-300 dark:border-slate-600 shadow-md"
                        } ${
                          isNavigable(notification)
                            ? "cursor-pointer hover:bg-gradient-to-r hover:from-slate-100/50 hover:to-slate-200/50 dark:hover:from-slate-800/30 dark:hover:to-slate-700/30"
                            : ""
                        }`}
                        onClick={() => isNavigable(notification) && handleNotificationClick(notification)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-medium text-sm sm:text-lg truncate text-slate-700">
                                {notification.title}
                              </h3>
                              {notification.type && (
                                <Badge
                                  className={`text-xs shadow-sm transition-all duration-300 hover:scale-105 ${getNotificationTypeColor(notification.type)}`}
                                >
                                  {getNotificationTypeLabel(notification.type)}
                                </Badge>
                              )}
                              {isNavigable(notification) && (
                                <div className="p-1 rounded-md bg-gradient-to-br from-slate-600 to-slate-700 text-white">
                                  <ExternalLink className="h-3 w-3" />
                                </div>
                              )}
                            </div>
                            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed break-words">
                              {notification.message}
                            </p>
                            <div className="text-xs text-slate-400 flex items-center gap-1">
                              <span className="w-1 h-1 rounded-full bg-slate-400"></span>
                              {notification.created_at &&
                                format(new Date(notification.created_at), "d 'de' MMMM, yyyy 'a las' HH:mm", {
                                  locale: es,
                                })}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {!notification.read && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:bg-slate-100 hover:text-slate-700 transition-all duration-300 hover:scale-110 text-slate-500"
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
                              className="h-8 w-8 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all duration-300 hover:scale-110"
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
