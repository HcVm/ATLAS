"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { useTheme } from "next-themes"
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
  PackageOpen,
  Activity,
  Box,
  ClipboardList,
  Headphones,
  ShoppingCart,
  CalendarDays,
  BookText,
  Database,
  CheckSquare,
  Eye,
  ChevronDown,
  ChevronRight,
  Clock,
  FileCheck,
  UserCheck,
  Barcode,
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/lib/auth-context"

// Organizamos los elementos del menú por secciones
const menuSections = {
  main: {
    title: "PRINCIPAL",
    items: [
      {
        title: "Dashboard",
        url: "/dashboard",
        icon: LayoutDashboard,
        roles: ["admin", "supervisor", "user"],
      },
      {
        title: "Tareas Diarias",
        url: "/tasks",
        icon: CheckSquare,
        roles: ["admin", "supervisor", "user"],
      },
      {
        title: "Notificaciones",
        url: "/notifications",
        icon: Bell,
        roles: ["admin", "supervisor", "user"],
      },
      {
        title: "Calendario",
        url: "/calendar",
        icon: CalendarDays,
        roles: ["admin", "supervisor", "user"],
      },
    ],
  },
  requests: {
    title: "SOLICITUDES",
    items: [
      {
        title: "Mis Solicitudes",
        url: "/requests",
        icon: FileCheck,
        roles: ["admin", "supervisor", "user"],
      },
      {
        title: "Nueva Solicitud",
        url: "/requests/new",
        icon: Plus,
        roles: ["admin", "supervisor", "user"],
      },
      {
        title: "Aprobaciones",
        url: "/requests/approvals",
        icon: UserCheck,
        roles: ["admin", "supervisor"],
      },
      {
        title: "Administrar Solicitudes",
        url: "/requests/admin",
        icon: Settings,
        roles: ["admin"],
      },
    ],
  },
  documents: {
    title: "DOCUMENTOS",
    items: [
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
    ],
  },
  sales: {
    title: "VENTAS",
    items: [
      {
        title: "Ventas",
        url: "/sales",
        icon: ShoppingCart,
        roles: ["admin", "supervisor", "user"],
        departments: [
          "ventas",
          "administración",
          "administracion",
          "operaciones",
          "jefatura de ventas",
          "contabilidad",
        ],
      },
      {
        title: "Tablero de Entregas",
        url: "/sales/kanban",
        icon: Activity,
        roles: ["admin", "supervisor", "user"],
        departments: ["ventas", "administración", "administracion", "operaciones", "jefatura de ventas"],
      },
      {
        title: "Cotizaciones",
        url: "/quotations",
        icon: FileText,
        roles: ["admin", "supervisor", "user"],
        departments: ["ventas", "administración", "administracion", "operaciones", "jefatura de ventas"],
      },
    ],
  },
  warehouse: {
    title: "ALMACÉN",
    items: [
      {
        title: "Almacén",
        url: "/warehouse",
        icon: Package,
        roles: ["admin", "supervisor", "user"],
        departments: [
          "almacén",
          "almacen",
          "contabilidad",
          "administración",
          "administracion",
          "operaciones",
          "gerencia logística",
          "jefatura de ventas",
        ],
        excludeDepartments: ["ventas"],
      },
      {
        title: "Productos",
        url: "/warehouse/products",
        icon: Box,
        roles: ["admin", "supervisor", "user"],
        departments: [
          "almacén",
          "almacen",
          "contabilidad",
          "administración",
          "administracion",
          "operaciones",
          "acuerdos marco",
          "acuerdos",
          "ventas",
          "jefatura de ventas",
          "gerencia logística",
          "gerencia logistica",
        ],
        readOnly: ["ventas"],
      },
      {
        title: "Inventario",
        url: "/warehouse/inventory",
        icon: ClipboardList,
        roles: ["admin", "supervisor", "user"],
        departments: [
          "almacén",
          "almacen",
          "contabilidad",
          "administración",
          "administracion",
          "operaciones",
          "gerencia logística",
          "jefatura de ventas",
        ],
        excludeDepartments: ["ventas"],
      },
      {
        title: "Etiquetado",
        url: "/warehouse/etiquetado",
        icon: Barcode,
        roles: ["admin", "supervisor", "user"],
        departments: [
          "almacén",
          "almacen",
          "administración",
          "administracion",
          "operaciones",
          "ventas",
          "jefatura de ventas",
        ],
      },
      {
        title: "Lotes y Series",
        url: "/warehouse/lots-serials",
        icon: Package,
        roles: ["admin", "supervisor", "user"],
        departments: [
          "almacén",
          "almacen",
          "administración",
          "administracion",
          "operaciones",
          "gerencia logística",
          "jefatura de ventas",
        ],
      },
    ],
  },
  internal_warehouse: {
    title: "ALMACÉN INTERNO",
    items: [
      {
        title: "Almacén Interno",
        url: "/warehouse/internal",
        icon: PackageOpen,
        roles: ["admin", "supervisor", "user"],
        departments: ["almacén", "almacen", "administración", "administracion", "operaciones"],
      },
      {
        title: "Productos Internos",
        url: "/warehouse/internal/products",
        icon: Package,
        roles: ["admin", "supervisor", "user"],
        departments: ["almacén", "almacen", "administración", "administracion", "operaciones"],
      },
      {
        title: "Movimientos Internos",
        url: "/warehouse/internal/movements",
        icon: Activity,
        roles: ["admin", "supervisor", "user"],
        departments: ["almacén", "almacen", "administración", "administracion", "operaciones"],
      },
    ],
  },
  support: {
    title: "SOPORTE",
    items: [
      {
        title: "Soporte",
        url: "/support",
        icon: Headphones,
        roles: ["admin", "supervisor", "user"],
      },
    ],
  },
  analytics: {
    title: "ANÁLISIS",
    items: [
      {
        title: "Estadísticas",
        url: "/statistics",
        icon: BarChart3,
        roles: ["admin", "supervisor"],
      },
      {
        title: "Supervisión",
        url: "/supervision",
        icon: Eye,
        roles: ["admin", "supervisor"],
      },
      {
        title: "Asistencia",
        url: "/attendance",
        icon: Clock,
        roles: ["admin", "supervisor"],
      },
    ],
  },
  admin: {
    title: "ADMINISTRACIÓN",
    items: [
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
    ],
  },
  help: {
    title: "AYUDA",
    items: [
      {
        title: "Documentación",
        url: "/documentation",
        icon: BookText,
        roles: ["admin", "supervisor", "user"],
      },
      {
        title: "Datos Abiertos",
        url: "/open-data",
        icon: Database,
        roles: ["admin", "supervisor", "user"],
      },
    ],
  },
}

export function AppSidebar() {
  const pathname = usePathname()
  const { user, signOut } = useAuth()
  const { theme } = useTheme()

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    main: true,
    requests: false,
    documents: false,
    sales: false,
    warehouse: false,
    internal_warehouse: false,
    support: false,
    analytics: false,
    admin: false,
    help: false,
  })

  const toggleSection = (sectionKey: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }))
  }

  const handleSignOut = async () => {
    await signOut()
    window.location.href = "/login"
  }

  // Función para verificar acceso por departamento
  const hasAccessByDepartment = (allowedDepartments: string[]) => {
    if (!user.departments?.name) return false

    const userDepartment = user.departments.name.toLowerCase()
    return allowedDepartments.some(
      (dept) => userDepartment.includes(dept.toLowerCase()) || dept.toLowerCase().includes(userDepartment),
    )
  }

  // Función para filtrar items de una sección
  const filterSectionItems = (items: any[]) => {
    return items.filter((item) => {
      // Admin y supervisor tienen acceso a todo
      if (user.role === "admin" || user.role === "supervisor") {
        return item.roles.includes(user.role)
      }

      // Para usuarios regulares, verificar roles permitidos
      if (!item.roles.includes(user.role)) {
        return false
      }

      // Verificar exclusiones de departamento
      if (item.excludeDepartments && user.departments?.name) {
        const userDepartment = user.departments.name.toLowerCase()
        const isExcluded = item.excludeDepartments.some(
          (dept: string) => userDepartment.includes(dept.toLowerCase()) || dept.toLowerCase().includes(userDepartment),
        )
        if (isExcluded) {
          return false
        }
      }

      // Si el item tiene restricciones de departamento, verificarlas
      if (item.departments) {
        return hasAccessByDepartment(item.departments)
      }

      // Si no hay restricciones de departamento, permitir acceso
      return true
    })
  }

  return (
    <Sidebar className="glass-sidebar">
      <SidebarHeader className="p-4 border-b border-slate-200/50 dark:border-slate-700/50">
        <div className="sidebar-header-glass rounded-xl p-4">
          <div className="flex items-center gap-2 justify-center">
            <div className="flex h-24 w-28 items-center justify-center rounded-lg  dark:from-slate-600 dark:to-slate-700 text-white shadow-lg">
              <img
                src={theme === "dark" ? "/logos/atlas-logo-dark.png" : "/logos/atlas-logo-white.png"}
                alt="logo"
                className="h-22 w-25"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-slate-500 dark:text-slate-400">v1</span>
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        {user.role ? (
          <>
            {Object.entries(menuSections).map(([sectionKey, section]) => {
              const filteredItems = filterSectionItems(section.items)

              // Solo mostrar la sección si tiene items visibles
              if (filteredItems.length === 0) return null

              const isExpanded = expandedSections[sectionKey]

              return (
                <Collapsible key={sectionKey} open={isExpanded} onOpenChange={() => toggleSection(sectionKey)}>
                  <SidebarGroup className="py-2">
                    <CollapsibleTrigger asChild>
                      <SidebarGroupLabel className="text-xs font-semibold text-slate-500 dark:text-slate-400 px-3 py-2 uppercase tracking-wider cursor-pointer hover:text-slate-600 dark:hover:text-slate-300 transition-colors duration-200 flex items-center justify-between group">
                        <span>{section.title}</span>
                        {isExpanded ? (
                          <ChevronDown className="h-3 w-3 transition-all duration-300 ease-out group-hover:text-slate-600 dark:group-hover:text-slate-300" />
                        ) : (
                          <ChevronRight className="h-3 w-3 transition-all duration-300 ease-out group-hover:text-slate-600 dark:group-hover:text-slate-300" />
                        )}
                      </SidebarGroupLabel>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="overflow-hidden transition-all duration-500 ease-out data-[state=closed]:animate-out data-[state=closed]:slide-out-to-top-1 data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:slide-in-from-top-1 data-[state=open]:fade-in-0">
                      <SidebarGroupContent>
                        <SidebarMenu className="px-2">
                          {filteredItems.map((item) => (
                            <SidebarMenuItem key={item.title}>
                              <SidebarMenuButton asChild isActive={pathname === item.url}>
                                <Link
                                  href={item.url}
                                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-300 group ${
                                    pathname === item.url
                                      ? "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-sm"
                                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200"
                                  }`}
                                >
                                  <div
                                    className={`flex h-8 w-8 items-center justify-center rounded-md transition-all duration-300 ${
                                      pathname === item.url
                                        ? "bg-slate-300 dark:bg-slate-600 text-slate-700 dark:text-slate-200"
                                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-slate-700 group-hover:text-slate-700 dark:group-hover:text-slate-200"
                                    }`}
                                  >
                                    <item.icon className="h-4 w-4" />
                                  </div>
                                  <span className="font-medium transition-colors duration-300">{item.title}</span>
                                  {item.title === "Notificaciones" && (
                                    <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-slate-400 dark:bg-slate-600 text-[10px] font-medium text-white shadow-sm">
                                      <Bell className="h-3 w-3" />
                                    </span>
                                  )}
                                </Link>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          ))}
                        </SidebarMenu>
                      </SidebarGroupContent>
                    </CollapsibleContent>
                  </SidebarGroup>
                </Collapsible>
              )
            })}
          </>
        ) : (
          <SidebarGroup className="px-4">
            <SidebarGroupContent>
              <Alert variant="destructive" className="glass-card">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>Sin rol asignado. Contacta al administrador.</AlertDescription>
              </Alert>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarSeparator className="bg-slate-200/50 dark:bg-slate-700/50" />

      <SidebarFooter className="p-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-slate-500 dark:text-slate-400 px-3 py-2 uppercase tracking-wider">
            USUARIO
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="px-2">
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/profile"}>
                  <Link
                    href="/profile"
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-300 ${
                      pathname === "/profile"
                        ? "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200"
                    }`}
                  >
                    <User className="h-4 w-4" />
                    <span className="font-medium">Perfil</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/settings"}>
                  <Link
                    href="/settings"
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-300 ${
                      pathname === "/settings"
                        ? "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200"
                    }`}
                  >
                    <Settings className="h-4 w-4" />
                    <span className="font-medium">Configuración</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {user && (
          <div className="glass-card rounded-xl p-3 mt-4 mx-2 border border-slate-200/50 dark:border-slate-700/50">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 ring-2 ring-slate-200 dark:ring-slate-700">
                <AvatarImage src={user.avatar_url || ""} />
                <AvatarFallback className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold">
                  {user.full_name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate text-slate-700 dark:text-slate-200">{user.full_name}</p>
                <div className="flex items-center gap-1">
                  <Badge
                    variant={user.role === "admin" ? "default" : user.role === "supervisor" ? "secondary" : "outline"}
                    className={`text-xs px-2 py-0 h-5 ${
                      user.role === "admin"
                        ? "bg-slate-700 dark:bg-slate-600 text-white"
                        : user.role === "supervisor"
                          ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                          : "border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    {user.role || "Sin rol"}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        )}

        <Button
          variant="ghost"
          className="w-full justify-start text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/20 mt-4 mx-2 transition-all duration-300 font-medium"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Cerrar sesión
        </Button>
      </SidebarFooter>
    </Sidebar>
  )
}
