"use client"

import type React from "react"
import { CompanyProvider } from "@/lib/company-context"
import { AuthProvider } from "@/lib/auth-context"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { AtlasAssistant } from "@/components/atlas-assistant"
import { ChatProvider } from "@/lib/chat-context"
import { ChatWidget } from "@/components/chat/chat-widget"
import DashboardLayoutClient from "./dashboard-layout-client"

export const dynamic = "force-dynamic"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <AuthProvider>
        <CompanyProvider>
          <ChatProvider>
            <DashboardLayoutClient>
              {children}
              <Toaster position="bottom-right" expand={true} richColors={true} closeButton={true} duration={5000} />
              <AtlasAssistant />
              <ChatWidget />
            </DashboardLayoutClient>
          </ChatProvider>
        </CompanyProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
