"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { useTheme } from "next-themes"
import { motion, AnimatePresence } from "framer-motion"
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
  Wrench,
  DollarSign,
  Landmark,
  MessageCircle,
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
      {
        title: "Chat",
        url: "/chat",
        icon: MessageCircle,
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
          "acuerdos marco",
          "acuerdos",
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
      {
        title: "Operaciones Manuales",
        url: "/manual-operations",
        icon: Wrench,
        roles: ["admin", "supervisor", "user"],
        departments: [
          "ventas",
          "administración",
          "administracion",
          "operaciones",
          "jefatura de ventas",
          "contabilidad",
          "acuerdos marco",
          "acuerdos",
        ],
      },
      {
        title: "Cobranzas",
        url: "/collections",
        icon: DollarSign,
        roles: ["admin", "supervisor", "user"],
        departments: ["cobranzas", "contabilidad", "administración", "administracion", "ventas", "operaciones"],
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
          "contabilidad",
          "administración",
          "administracion",
          "operaciones",
          "ventas",
          "jefatura de ventas",
          "acuerdos marco",
          "acuerdos",
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
          "contabilidad",
          "administración",
          "administracion",
          "operaciones",
          "gerencia logística",
          "jefatura de ventas",
          "acuerdos marco",
          "acuerdos",
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
        departments: ["almacén", "almacen", "administración", "administracion", "operaciones", "contabilidad"],
      },
      {
        title: "Productos Internos",
        url: "/warehouse/internal/products",
        icon: Package,
        roles: ["admin", "supervisor", "user"],
        departments: ["almacén", "almacen", "administración", "administracion", "operaciones", "contabilidad"],
      },
      {
        title: "Movimientos Internos",
        url: "/warehouse/internal/movements",
        icon: Activity,
        roles: ["admin", "supervisor", "user"],
        departments: ["almacén", "almacen", "administración", "administracion", "operaciones", "contabilidad"],
      },
      {
        title: "Activos Fijos",
        url: "/warehouse/internal/fixed-assets",
        icon: Landmark,
        roles: ["admin", "supervisor"],
        departments: ["contabilidad", "administración", "administracion", "gerencia"],
      },
    ],
  },
  hr: {
    title: "RECURSOS HUMANOS",
    items: [
      {
        title: "Panel RRHH",
        url: "/hr",
        icon: Users,
        roles: ["admin", "supervisor", "user"],
        departments: ["recursos humanos", "rrhh", "administración", "administracion", "gerencia"],
      },
      {
        title: "Personal",
        url: "/hr/personnel",
        icon: User,
        roles: ["admin", "supervisor", "user"],
        departments: ["recursos humanos", "rrhh", "administración", "administracion", "gerencia"],
      },
      {
        title: "Asistencia",
        url: "/hr/attendance",
        icon: Clock,
        roles: ["admin", "supervisor", "user"],
        departments: ["recursos humanos", "rrhh", "administración", "administracion", "gerencia"],
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
    hr: false,
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
    <Sidebar className="border-r border-slate-200/50 dark:border-slate-800/50 flex flex-col bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl transition-all duration-300">
      <SidebarHeader className="shrink-0 p-4 border-b border-slate-200/50 dark:border-slate-800/50 z-20">
        <div className="rounded-xl p-2 transition-all duration-300 hover:bg-slate-50 dark:hover:bg-slate-900/50">
          <div className="flex flex-col items-center justify-center gap-2">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center justify-center rounded-lg overflow-hidden shadow-lg shadow-blue-500/10"
            >
              <img
                src={theme === "dark" ? "/logos/atlas-logo-dark.png" : "/logos/atlas-logo-white.png"}
                alt="logo"
                className="h-16 w-auto object-contain"
              />
            </motion.div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-widest">Enterprise Edition</span>
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="flex-1 overflow-y-auto !overflow-x-hidden px-3 py-4 pb-32 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800 scrollbar-track-transparent min-h-0 space-y-2">
        {user.role ? (
          <AnimatePresence>
            {Object.entries(menuSections).map(([sectionKey, section]) => {
              const filteredItems = filterSectionItems(section.items)

              // Solo mostrar la sección si tiene items visibles
              if (filteredItems.length === 0) return null

              const isExpanded = expandedSections[sectionKey]

              return (
                <Collapsible key={sectionKey} open={isExpanded} onOpenChange={() => toggleSection(sectionKey)}>
                  <SidebarGroup className="py-0">
                    <CollapsibleTrigger asChild>
                      <SidebarGroupLabel className="text-xs font-bold text-slate-400 dark:text-slate-500 px-2 py-3 uppercase tracking-wider cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 flex items-center justify-between group select-none">
                        <span className="truncate leading-tight">{section.title}</span>
                        <motion.div
                          animate={{ rotate: isExpanded ? 0 : -90 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronDown className="h-3 w-3 shrink-0 opacity-50 group-hover:opacity-100" />
                        </motion.div>
                      </SidebarGroupLabel>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarGroupContent>
                        <SidebarMenu className="space-y-1">
                          {filteredItems.map((item) => {
                            const isActive = pathname === item.url
                            return (
                              <SidebarMenuItem key={item.title}>
                                <SidebarMenuButton asChild isActive={isActive} className="w-full">
                                  <Link
                                    href={item.url}
                                    className={`relative flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-300 group overflow-hidden ${isActive
                                        ? "text-white shadow-sm shadow-blue-500/10"
                                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200"
                                      }`}
                                  >
                                    {isActive && (
                                      <motion.div
                                        layoutId="activeTab"
                                        className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                      />
                                    )}
                                    <div className={`relative z-10 flex h-5 w-5 shrink-0 items-center justify-center transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                                      <item.icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400'}`} />
                                    </div>
                                    <span className="relative z-10 font-medium text-sm truncate">
                                      {item.title}
                                    </span>
                                    {item.title === "Notificaciones" && (
                                      <span className="relative z-10 ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-slate-950">
                                        <Bell className="h-3 w-3" />
                                      </span>
                                    )}
                                  </Link>
                                </SidebarMenuButton>
                              </SidebarMenuItem>
                            )
                          })}
                        </SidebarMenu>
                      </SidebarGroupContent>
                    </CollapsibleContent>
                  </SidebarGroup>
                </Collapsible>
              )
            })}
          </AnimatePresence>
        ) : (
          <SidebarGroup className="px-4">
            <SidebarGroupContent>
              <Alert variant="destructive" className="bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800">
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <AlertDescription className="text-red-800 dark:text-red-300">Sin rol asignado. Contacta al administrador.</AlertDescription>
              </Alert>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="shrink-0 p-4 border-t border-slate-200/50 dark:border-slate-800/50 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md z-20 space-y-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-bold text-slate-400 dark:text-slate-500 px-2 uppercase tracking-wider mb-2">
            CUENTA
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {[
                { title: "Perfil", url: "/profile", icon: User },
                { title: "Configuración", url: "/settings", icon: Settings }
              ].map((item) => {
                const isActive = pathname === item.url
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link
                        href={item.url}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ${isActive
                            ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
                            : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200"
                          }`}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {user && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border border-slate-200/50 dark:border-slate-700/50 shadow-sm">
            <Avatar className="h-9 w-9 ring-2 ring-white dark:ring-slate-700 shrink-0">
              <AvatarImage src={user.avatar_url || ""} />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-xs">
                {user.full_name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 overflow-hidden">
              <p className="text-sm font-semibold truncate text-slate-700 dark:text-slate-200">{user.full_name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className={`h-1.5 w-1.5 rounded-full ${user.role === 'admin' ? 'bg-purple-500' : 'bg-emerald-500'}`} />
                <span className="text-xs text-slate-500 dark:text-slate-400 capitalize truncate">
                  {user.role || "Sin rol"}
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              onClick={handleSignOut}
              title="Cerrar sesión"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  )
}
