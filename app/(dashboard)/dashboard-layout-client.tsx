"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar"
import { useAuth } from "@/lib/auth-context"
import { Sun, User, RefreshCw, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { NotificationBadge } from "@/components/notifications/notification-badge"
import { ThemeToggle } from "@/components/theme-toggle"
import { Suspense } from "react"
import { CompanySelector } from "@/components/layout/company-selector"

export default function DashboardLayoutClient({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading, error, refreshUser, signOut } = useAuth()
  const router = useRouter()
  const [redirecting, setRedirecting] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (!loading && !user && !error && !redirecting) {
      console.log("No user found, redirecting to login")
      setRedirecting(true)
      router.push("/login")
    }
  }, [user, loading, error, router, redirecting])

  const handleSignOut = async () => {
    await signOut()
    router.push("/login")
  }

  const handleRefresh = async () => {
    try {
      setRefreshing(true)
      await refreshUser()
    } finally {
      setRefreshing(false)
    }
  }

  // Mostrar loading mientras se verifica la autenticación
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Cargando aplicación...</p>
        </div>
      </div>
    )
  }

  // Si hay un error de autenticación
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="max-w-md w-full space-y-4">
          <Alert variant="destructive">
            <AlertDescription>Error: {error}</AlertDescription>
          </Alert>
          <div className="space-y-2">
            <Button onClick={handleRefresh} className="w-full" disabled={refreshing}>
              {refreshing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Actualizando...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reintentar
                </>
              )}
            </Button>
            <Button onClick={() => router.push("/login")} variant="outline" className="w-full">
              Volver al Login
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Si no hay usuario y no estamos cargando, mostrar mensaje de redirección
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Redirigiendo al login...</p>
          <Button onClick={() => router.push("/login")}>Ir al Login</Button>
        </div>
      </div>
    )
  }

  // Si el usuario no tiene rol, mostrar error y opciones
  if (!user.role) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="max-w-md w-full space-y-4">
          <Alert variant="destructive">
            <AlertDescription>
              Tu cuenta no tiene un rol asignado. Contacta al administrador para que configure tu cuenta.
            </AlertDescription>
          </Alert>
          <div className="space-y-2">
            <Button onClick={() => router.push("/user-debug")} className="w-full">
              Diagnóstico de Usuario
            </Button>
            <Button onClick={handleSignOut} variant="outline" className="w-full">
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">Sistema de Seguimiento de Documentos</span>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2 px-4">
            {user.role === "admin" && (
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <Suspense fallback={<div className="w-[200px] h-9 bg-muted animate-pulse rounded-md"></div>}>
                  <CompanySelector />
                </Suspense>
              </div>
            )}
            <ThemeToggle />
            <NotificationBadge />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatar_url || ""} alt={user.full_name} />
                    <AvatarFallback>
                      {user.full_name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.full_name}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                    <p className="text-xs leading-none text-muted-foreground">Rol: {user.role}</p>
                    {user.company_id && (
                      <p className="text-xs leading-none text-muted-foreground">
                        Empresa: {user.companies?.name || "Sin asignar"}
                      </p>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push("/profile")}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Perfil</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/settings")}>
                  <Sun className="mr-2 h-4 w-4" />
                  <span>Configuración</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleRefresh} disabled={refreshing}>
                  {refreshing ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      <span>Actualizando...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      <span>Actualizar Sesión</span>
                    </>
                  )}
                </DropdownMenuItem>
                {user.role !== "admin" && (
                  <DropdownMenuItem onClick={() => router.push("/user-debug")}>
                    <span>Diagnóstico</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <span>Cerrar sesión</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <main className="flex-1">{children}</main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
