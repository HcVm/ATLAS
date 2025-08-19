"use client"

import type React from "react"
import { useRoleAccess, type UserRole } from "@/hooks/use-role-access"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Shield, ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"

interface RoleGuardProps {
  children: React.ReactNode
  requiredRoles?: UserRole | UserRole[]
  requiredPermissions?: string[]
  fallback?: React.ReactNode
  redirectTo?: string
}

export function RoleGuard({
  children,
  requiredRoles,
  requiredPermissions,
  fallback,
  redirectTo = "/dashboard",
}: RoleGuardProps) {
  const { hasRole, hasPermission, user, role } = useRoleAccess()
  const router = useRouter()

  // Check if user is authenticated
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <CardTitle>Acceso Requerido</CardTitle>
            <CardDescription>Debes iniciar sesión para acceder a esta página</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => router.push("/login")}>Iniciar Sesión</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Check role requirements
  if (requiredRoles && !hasRole(requiredRoles)) {
    if (fallback) {
      return <>{fallback}</>
    }

    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Shield className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <CardTitle>Acceso Restringido</CardTitle>
            <CardDescription>
              No tienes los permisos necesarios para acceder a esta página.
              <br />
              <span className="text-sm text-gray-500 mt-2 block">
                Rol actual: <strong>{role}</strong>
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-2">
            <Button onClick={() => router.push(redirectTo)} className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver al Dashboard
            </Button>
            <p className="text-xs text-gray-500">Si crees que esto es un error, contacta a tu administrador.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Check permission requirements
  if (requiredPermissions && !requiredPermissions.every((permission) => hasPermission(permission as any))) {
    if (fallback) {
      return <>{fallback}</>
    }

    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Shield className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <CardTitle>Permisos Insuficientes</CardTitle>
            <CardDescription>No tienes los permisos necesarios para realizar esta acción.</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => router.push(redirectTo)} className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver al Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}
