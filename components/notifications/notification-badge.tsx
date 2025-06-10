"use client"

import { useEffect, useState } from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { getUnreadNotificationsCount } from "@/lib/notifications"

export function NotificationBadge() {
  const { user } = useAuth()
  const router = useRouter()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!user) return

    const fetchUnreadCount = async () => {
      try {
        const count = await getUnreadNotificationsCount(user.id)
        setUnreadCount(count)
      } catch (error) {
        console.error("Error fetching unread notifications count:", error)
      }
    }

    fetchUnreadCount()

    // Actualizar cada 30 segundos
    const interval = setInterval(fetchUnreadCount, 30000)

    return () => clearInterval(interval)
  }, [user])

  const handleClick = () => {
    router.push("/notifications")
  }

  return (
    <Button variant="ghost" size="icon" onClick={handleClick} className="relative">
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <Badge
          variant="destructive"
          className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
        >
          {unreadCount > 99 ? "99+" : unreadCount}
        </Badge>
      )}
    </Button>
  )
}
