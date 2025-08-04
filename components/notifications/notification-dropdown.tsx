"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Check, Trash2, ExternalLink, Loader2, Settings } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth-context"
import { useCompany } from "@/lib/company-context"
import {
  getUserNotifications,
  markNotificationAsRead,
  deleteNotification,
  markAllNotificationsAsRead,
  getRelatedInfo,
} from "@/lib/notifications"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

export function NotificationDropdown() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("all")
  const [counts, setCounts] = useState({ all: 0, unread: 0, read: 0 })
  const { toast } = useToast()
  const router = useRouter()
  const { user } = useAuth()
  const { selectedCompany } = useCompany()

  const fetchNotifications = useCallback(
    async (filter: "all" | "unread" | "read") => {
      if (!user) return

      setLoading(true)
      try {
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
  )

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
        case "payment_voucher":
          router.push(`/sales?voucher=${notification.related_id}`)
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
      case "payment_voucher_uploaded":
        return "Comprobante subido"
      case "payment_voucher_confirmed":
        return "Comprobante confirmado"
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
      case "payment_voucher_uploaded":
        return "bg-orange-100 text-orange-700 dark:bg-orange-800 dark:text-orange-300"
      case "payment_voucher_confirmed":
        return "bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-300"
      default:
        return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
    }
  }

  const isNavigable = (notification: any) => {
    return notification.type && notification.related_id
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-40">
        <p className="text-slate-500 text-sm">Debe iniciar sesión para ver las notificaciones</p>
      </div>
    )
  }

  return (
    <div className="w-80 sm:w-96 p-2">
      <div className="flex items-center justify-between px-2 py-1">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Notificaciones</h3>
        <div className="flex gap-1">
          {counts.unread > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="h-7 px-2 text-xs text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
            >
              <Check className="h-3 w-3 mr-1" /> Marcar todas
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/notifications")}
            className="h-7 w-7 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
            title="Ir a la página de notificaciones"
          >
            <Settings className="h-4 w-4" />
            <span className="sr-only">Ir a la página de notificaciones</span>
          </Button>
        </div>
      </div>
      <Separator className="my-2 bg-slate-200 dark:bg-slate-700" />

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-2 bg-slate-100 dark:bg-slate-800 w-full grid grid-cols-3 h-8">
          <TabsTrigger
            value="all"
            className="data-[state=active]:bg-slate-200 data-[state=active]:text-slate-800 dark:data-[state=active]:bg-slate-700 dark:data-[state=active]:text-slate-100 transition-all duration-200 text-xs h-7"
          >
            Todas
            {counts.all > 0 && (
              <Badge
                variant="secondary"
                className="ml-1 bg-slate-300 text-slate-700 dark:bg-slate-600 dark:text-slate-200 text-xs h-4 px-1"
              >
                {counts.all}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="unread"
            className="data-[state=active]:bg-slate-200 data-[state=active]:text-slate-800 dark:data-[state=active]:bg-slate-700 dark:data-[state=active]:text-slate-100 transition-all duration-200 text-xs h-7"
          >
            No leídas
            {counts.unread > 0 && (
              <Badge variant="destructive" className="ml-1 bg-red-500 text-white text-xs h-4 px-1">
                {counts.unread}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="read"
            className="data-[state=active]:bg-slate-200 data-[state=active]:text-slate-800 dark:data-[state=active]:bg-slate-700 dark:data-[state=active]:text-slate-100 transition-all duration-200 text-xs h-7"
          >
            Leídas
            {counts.read > 0 && (
              <Badge
                variant="outline"
                className="ml-1 border-slate-300 text-slate-600 dark:border-slate-600 dark:text-slate-400 text-xs h-4 px-1"
              >
                {counts.read}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {["all", "unread", "read"].map((tab) => (
          <TabsContent key={tab} value={tab} className="space-y-2 mt-0">
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-slate-600" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-slate-500 text-sm">
                  No hay notificaciones {tab === "unread" ? "no leídas" : tab === "read" ? "leídas" : ""}
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[300px] pr-2">
                <div className="space-y-2">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-2 rounded-md border transition-all duration-200 ${
                        notification.read
                          ? "bg-slate-50/50 dark:bg-slate-900/20 border-slate-200 dark:border-slate-700"
                          : "bg-white dark:bg-slate-900/40 border-slate-300 dark:border-slate-600 shadow-sm"
                      } ${
                        isNavigable(notification) ? "cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800" : ""
                      }`}
                      onClick={() => isNavigable(notification) && handleNotificationClick(notification)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5 flex-1 min-w-0">
                          <div className="flex items-center gap-1 flex-wrap">
                            <h3 className="font-medium text-sm truncate text-slate-700 dark:text-slate-200">
                              {notification.title}
                            </h3>
                            {notification.type && (
                              <Badge
                                className={`text-xs px-1 py-0.5 shadow-sm ${getNotificationTypeColor(notification.type)}`}
                              >
                                {getNotificationTypeLabel(notification.type)}
                              </Badge>
                            )}
                            {isNavigable(notification) && (
                              <div className="p-0.5 rounded-sm bg-slate-600 text-white">
                                <ExternalLink className="h-2.5 w-2.5" />
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 leading-relaxed break-words">{notification.message}</p>
                          <div className="text-xs text-slate-400 flex items-center gap-1">
                            <span className="w-1 h-1 rounded-full bg-slate-400"></span>
                            {notification.created_at &&
                              format(new Date(notification.created_at), "d 'de' MMMM, yyyy 'a las' HH:mm", {
                                locale: es,
                              })}
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          {!notification.read && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200 text-slate-500"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleMarkAsRead(notification.id)
                              }}
                            >
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDelete(notification.id)
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
