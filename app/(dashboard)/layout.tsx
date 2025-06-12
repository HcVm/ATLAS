"use client"

import type React from "react"
import { CompanyProvider } from "@/lib/company-context"
import { AuthProvider } from "@/lib/auth-context"
import DashboardLayoutClient from "./dashboard-layout-client"

export const dynamic = "force-dynamic"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <CompanyProvider>
        <DashboardLayoutClient>{children}</DashboardLayoutClient>
      </CompanyProvider>
    </AuthProvider>
  )
}
