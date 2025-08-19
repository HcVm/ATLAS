"use client"

import { useAuth } from "@/lib/auth-context"
import { useMemo } from "react"

export type UserRole = "admin" | "supervisor" | "user"

export interface RolePermissions {
  canViewSupervision: boolean
  canAssignTasks: boolean
  canViewAllEmployees: boolean
  canManageUsers: boolean
  canViewReports: boolean
  canEditCompanySettings: boolean
  canViewAllCompanies: boolean
}

export function useRoleAccess() {
  const { user } = useAuth()

  const permissions = useMemo((): RolePermissions => {
    if (!user) {
      return {
        canViewSupervision: false,
        canAssignTasks: false,
        canViewAllEmployees: false,
        canManageUsers: false,
        canViewReports: false,
        canEditCompanySettings: false,
        canViewAllCompanies: false,
      }
    }

    const role = user.role || user.user_role

    switch (role) {
      case "admin":
        return {
          canViewSupervision: true,
          canAssignTasks: true,
          canViewAllEmployees: true,
          canManageUsers: true,
          canViewReports: true,
          canEditCompanySettings: true,
          canViewAllCompanies: true,
        }
      case "supervisor":
        return {
          canViewSupervision: true,
          canAssignTasks: true,
          canViewAllEmployees: true,
          canManageUsers: false,
          canViewReports: true,
          canEditCompanySettings: false,
          canViewAllCompanies: false,
        }
      case "user":
      default:
        return {
          canViewSupervision: false,
          canAssignTasks: false,
          canViewAllEmployees: false,
          canManageUsers: false,
          canViewReports: false,
          canEditCompanySettings: false,
          canViewAllCompanies: false,
        }
    }
  }, [user])

  const hasRole = (requiredRoles: UserRole | UserRole[]): boolean => {
    if (!user) return false

    const userRole = user.role || user.user_role
    const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles]

    return roles.includes(userRole as UserRole)
  }

  const hasPermission = (permission: keyof RolePermissions): boolean => {
    return permissions[permission]
  }

  return {
    user,
    role: (user?.role || user?.user_role) as UserRole,
    permissions,
    hasRole,
    hasPermission,
    isAdmin: hasRole("admin"),
    isSupervisor: hasRole("supervisor"),
    isUser: hasRole("user"),
    canSupervise: hasRole(["admin", "supervisor"]),
  }
}
