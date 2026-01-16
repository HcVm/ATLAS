"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar"
import { useAuth } from "@/lib/auth-context"
import { Cog, User, RefreshCw, Building2 } from "lucide-react"
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
import { ThemeProvider } from "@/components/theme-provider"
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
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground animate-pulse">Cargando aplicación...</p>
        </div>
      </div>
    )
  }

  // Si hay un error de autenticación
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <div className="max-w-md w-full space-y-4 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl">
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
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
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
      <div className="flex items-center justify-center min-h-screen p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <div className="max-w-md w-full space-y-4 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl">
          <Alert variant="destructive">
            <AlertDescription>
              Tu cuenta no tiene un rol asignado. Contacta al administrador para que configure tu cuenta.
            </AlertDescription>
          </Alert>
          <div className="space-y-2">
            <Button onClick={() => router.push("/user-debug")} className="w-full">
              Diagnóstico de Usuario
            </Button>
            <Button onClick={handleSignOut} variant="outline" className="w-full bg-transparent">
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="bg-transparent">
          {/* Fondo global con gradiente sutil */}
          <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-100/20 via-slate-50/10 to-transparent dark:from-indigo-900/20 dark:via-slate-900/10 pointer-events-none -z-10" />
          
          <header className="flex h-16 shrink-0 items-center gap-2 transition-all ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 sticky top-0 z-30 shadow-sm">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" />
              <div className="flex items-center gap-2 text-sm">
                <span className="font-semibold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent hidden sm:inline-block">
                  Sistema de Seguimiento de Documentos
                </span>
                <span className="font-semibold text-foreground sm:hidden">SSD</span>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-3 px-4">
              {user.role === "admin" && (
                <div className="hidden md:flex items-center gap-2 bg-slate-100/50 dark:bg-slate-800/50 p-1 rounded-lg border border-slate-200/50 dark:border-slate-700/50">
                  <Building2 className="h-4 w-4 text-slate-500 ml-2" />
                  <Suspense fallback={<div className="w-[200px] h-8 bg-slate-200 dark:bg-slate-700 animate-pulse rounded-md"></div>}>
                    <CompanySelector />
                  </Suspense>
                </div>
              )}
              
              <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block" />
              
              <ThemeToggle />
              <NotificationBadge />
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:ring-2 focus:ring-indigo-500/20">
                    <Avatar className="h-9 w-9 ring-2 ring-white dark:ring-slate-800 shadow-sm transition-transform hover:scale-105">
                      <AvatarImage src={user.avatar_url || ""} alt={user.full_name} />
                      <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-xs">
                        {user.full_name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-slate-200/50 dark:border-slate-800/50 shadow-xl rounded-xl" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal p-3">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-semibold leading-none text-foreground">{user.full_name}</p>
                      <p className="text-xs leading-none text-muted-foreground opacity-80">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-slate-200/50 dark:bg-slate-700/50" />
                  <DropdownMenuItem onClick={() => router.push("/profile")} className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 focus:bg-slate-100 dark:focus:bg-slate-800 rounded-lg m-1">
                    <User className="mr-2 h-4 w-4 text-indigo-500" />
                    <span>Perfil</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => router.push("/settings")}
                    className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 focus:bg-slate-100 dark:focus:bg-slate-800 rounded-lg m-1"
                  >
                    <Cog className="mr-2 h-4 w-4 text-slate-500" />
                    <span>Configuración</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-slate-200/50 dark:bg-slate-700/50" />
                  <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 focus:bg-red-50 dark:focus:bg-red-950/30 rounded-lg m-1">
                    <span>Cerrar sesión</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <div className="flex flex-1 flex-col gap-4 p-4 sm:p-6 lg:p-8 pt-6 overflow-x-hidden relative z-10">
            <main className="flex-1 w-full max-w-[1600px] mx-auto animate-in fade-in zoom-in-95 duration-500">
              {children}
            </main>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ThemeProvider>
  )
}
