"use client"

import { useEffect, useState, useCallback } from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { useCompany } from "@/lib/company-context"
import { getUnreadNotificationsCount } from "@/lib/notifications"
import { NotificationDropdown } from "./notification-dropdown"
import { supabase } from "@/lib/supabase"

export function NotificationBadge() {
  const { user } = useAuth()
  const { selectedCompany } = useCompany()
  const router = useRouter()
  const [unreadCount, setUnreadCount] = useState(0)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  const fetchUnreadCount = useCallback(async () => {
    if (!user) return

    try {
      const companyId = user.role === "admin" && selectedCompany ? selectedCompany.id : undefined
      const count = await getUnreadNotificationsCount(user.id, companyId)
      setUnreadCount(count)
    } catch (error) {
      console.error("Error fetching unread notifications count:", error)
    }
  }, [user, selectedCompany])

  useEffect(() => {
    if (!user) return

    // Fetch initial count
    fetchUnreadCount()

    // Set up more frequent polling for better responsiveness
    const interval = setInterval(fetchUnreadCount, 10000) // Every 10 seconds

    // Set up realtime subscription as backup
    const companyId = user.role === "admin" && selectedCompany ? selectedCompany.id : undefined

    console.log("🔔 Setting up realtime notifications for user:", user.id, "company:", companyId)

    const channel = supabase
      .channel("notifications-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("🔔 Notification change detected:", payload)

          const notification = payload.new || payload.old

          // For admins, filter by company if one is selected
          if (user.role === "admin" && selectedCompany) {
            if (notification?.company_id !== selectedCompany.id) {
              console.log("🔔 Notification filtered out - different company")
              return
            }
          }

          // Refresh the count immediately
          fetchUnreadCount()
        },
      )
      .subscribe((status) => {
        console.log("🔔 Realtime subscription status:", status)
      })

    // Cleanup
    return () => {
      clearInterval(interval)
      console.log("🔔 Cleaning up realtime subscription")
      supabase.removeChannel(channel)
    }
  }, [user, selectedCompany, fetchUnreadCount])

  // More frequent polling when dropdown is open
  useEffect(() => {
    if (!isDropdownOpen || !user) return

    const activeInterval = setInterval(fetchUnreadCount, 3000) // Every 3 seconds when active

    return () => clearInterval(activeInterval)
  }, [isDropdownOpen, fetchUnreadCount, user])

  return (
    <DropdownMenu onOpenChange={setIsDropdownOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-slate-600 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800"
        >
          <Bell className="h-5 w-5 text-slate-600 dark:text-slate-400" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-red-500 text-white animate-pulse"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 sm:w-96 p-0" align="end" forceMount>
        <NotificationDropdown onCountChange={setUnreadCount} />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
