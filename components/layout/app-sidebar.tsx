"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  FileText,
  Plus,
  Bell,
  QrCode,
  BarChart3,
  Users,
  Building2,
  Newspaper,
  User,
  Settings,
  LogOut,
  Bug,
  AlertTriangle,
  MapPin,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ThemeToggle } from "@/components/theme-toggle"
import { useAuth } from "@/lib/auth-context"

const menuItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
    roles: ["admin", "supervisor", "user"],
  },
  {
    title: "Documentos",
    url: "/documents",
    icon: FileText,
    roles: ["admin", "supervisor", "user"],
  },
  {
    title: "Crear Documento",
    url: "/documents/new",
    icon: Plus,
    roles: ["admin", "supervisor", "user"],
  },
  {
    title: "Movimientos",
    url: "/movements",
    icon: MapPin,
    roles: ["admin", "supervisor", "user"],
  },
  {
    title: "Notificaciones",
    url: "/notifications",
    icon: Bell,
    roles: ["admin", "supervisor", "user"],
  },
  {
    title: "Estadísticas",
    url: "/statistics",
    icon: BarChart3,
    roles: ["admin", "supervisor"],
  },
  {
    title: "Usuarios",
    url: "/users",
    icon: Users,
    roles: ["admin"],
  },
  {
    title: "Departamentos",
    url: "/departments",
    icon: Building2,
    roles: ["admin"],
  },
  {
    title: "Noticias",
    url: "/news",
    icon: Newspaper,
    roles: ["admin", "supervisor"],
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { user, signOut } = useAuth()

  const handleSignOut = async () => {
    await signOut()
    window.location.href = "/login"
  }

  // Si no hay usuario, mostrar sidebar básico
  if (!user) {
    return (
      <Sidebar>
        <SidebarHeader className="p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <FileText className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold">Sistema Docs</span>
              <span className="text-xs text-muted-foreground">Cargando...</span>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <div className="p-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>Verificando autenticación...</AlertDescription>
            </Alert>
          </div>
        </SidebarContent>
      </Sidebar>
    )
  }

  const filteredMenuItems = user.role ? menuItems.filter((item) => item.roles.includes(user.role)) : []

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <FileText className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">Sistema Docs</span>
            <span className="text-xs text-muted-foreground">Seguimiento</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {user.role ? (
          <SidebarGroup>
            <SidebarGroupLabel>NAVEGACIÓN</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filteredMenuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={pathname === item.url}>
                      <Link href={item.url} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : (
          <SidebarGroup>
            <SidebarGroupContent>
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>Sin rol asignado. Contacta al administrador.</AlertDescription>
              </Alert>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Debug section - solo mostrar si no es admin */}
        {user.role !== "admin" && (
          <SidebarGroup>
            <SidebarGroupLabel>DIAGNÓSTICO</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href="/user-debug" className="flex items-center gap-2">
                      <Bug className="h-4 w-4" />
                      <span>Diagnóstico Usuario</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarSeparator />

      <SidebarFooter className="p-4">
        <SidebarGroup>
          <SidebarGroupLabel>USUARIO</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/profile"}>
                  <Link href="/profile" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>Perfil</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/settings"}>
                  <Link href="/settings" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    <span>Configuración</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Theme Toggle */}
        <div className="flex items-center justify-center p-2 mt-2">
          <ThemeToggle />
        </div>

        {user && (
          <div className="flex items-center gap-3 p-2 rounded-lg bg-muted mt-4">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.avatar_url || ""} />
              <AvatarFallback>
                {user.full_name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.full_name}</p>
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">Rol:</span>
                <Badge
                  variant={user.role === "admin" ? "default" : user.role === "supervisor" ? "secondary" : "outline"}
                  className="text-xs"
                >
                  {user.role || "Sin rol"}
                </Badge>
              </div>
            </div>
          </div>
        )}

        <Button
          variant="ghost"
          className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 mt-4"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Cerrar sesión
        </Button>
      </SidebarFooter>
    </Sidebar>
  )
}
