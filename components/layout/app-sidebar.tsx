"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  FileText,
  Plus,
  Bell,
  BarChart3,
  Users,
  Building2,
  Newspaper,
  User,
  Settings,
  LogOut,
  AlertTriangle,
  MapPin,
  Package,
  Box,
  ClipboardList,
  Headphones,
  ShoppingCart,
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
    title: "Soporte",
    url: "/support",
    icon: Headphones,
    roles: ["admin", "supervisor", "user"],
  },
  {
    title: "Ventas",
    url: "/sales",
    icon: ShoppingCart,
    roles: ["admin", "supervisor", "user"],
    departments: ["ventas", "administración", "administracion", "operaciones"],
  },
  {
    title: "Almacén",
    url: "/warehouse",
    icon: Package,
    roles: ["admin", "supervisor", "user"],
    departments: ["almacén", "almacen", "contabilidad", "administración", "administracion", "operaciones"],
  },
  {
    title: "Productos",
    url: "/warehouse/products",
    icon: Box,
    roles: ["admin", "supervisor", "user"],
    departments: ["almacén", "almacen", "contabilidad", "administración", "administracion", "operaciones"],
  },
  {
    title: "Inventario",
    url: "/warehouse/inventory",
    icon: ClipboardList,
    roles: ["admin", "supervisor", "user"],
    departments: ["almacén", "almacen", "contabilidad", "administración", "administracion", "operaciones"],
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

  // Función para verificar acceso por departamento
  const hasAccessByDepartment = (allowedDepartments: string[]) => {
    if (!user.departments?.name) return false

    const userDepartment = user.departments.name.toLowerCase()
    return allowedDepartments.some(
      (dept) => userDepartment.includes(dept.toLowerCase()) || dept.toLowerCase().includes(userDepartment),
    )
  }

  const filteredMenuItems = user.role
    ? menuItems.filter((item) => {
        // Admin y supervisor tienen acceso a todo
        if (user.role === "admin" || user.role === "supervisor") {
          return item.roles.includes(user.role)
        }

        // Para usuarios regulares, verificar roles permitidos
        if (!item.roles.includes(user.role)) {
          return false
        }

        // Si el item tiene restricciones de departamento, verificarlas
        if (item.departments) {
          return hasAccessByDepartment(item.departments)
        }

        // Si no hay restricciones de departamento, permitir acceso
        return true
      })
    : []

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <FileText className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">Sistema Docs Corp</span>
            <span className="text-xs text-muted-foreground">v3.0</span>
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
                      <Link
                        href={item.url}
                        className="flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-300 hover:bg-primary/10 group"
                      >
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-md ${pathname === item.url ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary"} transition-colors duration-300`}
                        >
                          <item.icon className="h-4 w-4" />
                        </div>
                        <span
                          className={`${pathname === item.url ? "font-medium text-foreground" : "text-muted-foreground group-hover:text-foreground"} transition-colors duration-300`}
                        >
                          {item.title}
                        </span>
                        {item.title === "Notificaciones" && (
                          <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                            <Bell className="h-4 w-4" />
                          </span>
                        )}
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

        {/* Debug info - remover en producción */}
        {process.env.NODE_ENV === "development" && user && (
          <SidebarGroup>
            <SidebarGroupLabel>DEBUG INFO</SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="text-xs text-muted-foreground p-2">
                <div>Rol: {user.role}</div>
                <div>Departamento: {user.departments?.name || "Sin departamento"}</div>
                <div>Items visibles: {filteredMenuItems.length}</div>
              </div>
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

        {user && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors duration-300 mt-4 border border-border/50">
            <Avatar className="h-10 w-10 ring-2 ring-primary/20">
              <AvatarImage src={user.avatar_url || ""} />
              <AvatarFallback className="bg-primary/10 text-primary">
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
                <Badge
                  variant={user.role === "admin" ? "default" : user.role === "supervisor" ? "secondary" : "outline"}
                  className="text-xs px-2 py-0 h-5"
                >
                  {user.role || "Sin rol"}
                </Badge>
              </div>
            </div>
          </div>
        )}

        <Button
          variant="ghost"
          className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 mt-4 transition-colors duration-300"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Cerrar sesión
        </Button>
      </SidebarFooter>
    </Sidebar>
  )
}
