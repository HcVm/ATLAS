"use client"

import type React from "react"
import { RoleGuard } from "@/components/role-guard"

export default function SupervisionLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <RoleGuard requiredRoles={["admin", "supervisor"]} redirectTo="/dashboard">
      {children}
    </RoleGuard>
  )
}
    