import { BarChart3, Box, Package, Settings, ShoppingBag, User } from 'lucide-react';
import Link from "next/link";
import { useSession } from "next-auth/react";
import { LayoutDashboard, FileText, Plus, MapPin, ClipboardList, Bell, Users, Building2, Newspaper } from 'lucide-react';

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
  SidebarTrigger,
} from "@/components/ui/sidebar";

export function AppSidebar() {
  const { data: session } = useSession();
  const user = session?.user;

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
      title: "Almacén",
      url: "/warehouse",
      icon: Package,
      roles: ["admin", "supervisor"],
      departments: ["Almacén", "Contabilidad"],
    },
    {
      title: "Productos",
      url: "/warehouse/products",
      icon: Box,
      roles: ["admin", "supervisor"],
      departments: ["Almacén", "Contabilidad"],
    },
    {
      title: "Inventario",
      url: "/warehouse/inventory",
      icon: ClipboardList,
      roles: ["admin", "supervisor"],
      departments: ["Almacén", "Contabilidad"],
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
  ];

  const filteredMenuItems = user?.role ? menuItems.filter((item) => {
    // Check if user role is in the allowed roles
    if (item.roles.includes(user.role)) {
      return true;
    }
    
    // Check if user's department allows access (for items that have departments defined)
    if (item.departments && user.department_name) {
      return item.departments.includes(user.department_name);
    }
    
    return false;
  }) : [];

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarHeader>
          <Link href="/">Panel</Link>
        </SidebarHeader>
        <SidebarGroup>
          <SidebarGroupLabel>General</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/">
                    <ShoppingBag className="h-4 w-4" />
                    <span>Ventas</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin section - accessible only to admin role */}
        {user?.role === "admin" && (
          <SidebarGroup>
            <SidebarGroupLabel>Administración</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href="/admin/users">
                      <User className="h-4 w-4" />
                      <span>Usuarios</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href="/admin/settings">
                      <Settings className="h-4 w-4" />
                      <span>Configuración</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Warehouse section - accessible to admin, supervisor, and warehouse/accounting departments */}
        {(user?.role === "admin" || 
          user?.role === "supervisor" || 
          user?.departments?.name === "Almacén" || 
          user?.departments?.name === "Contabilidad") && (
          <SidebarGroup>
            <SidebarGroupLabel>Almacén</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href="/warehouse">
                      <Package className="h-4 w-4" />
                      <span>Panel de Almacén</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href="/warehouse/products">
                      <Box className="h-4 w-4" />
                      <span>Productos</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href="/warehouse/inventory">
                      <BarChart3 className="h-4 w-4" />
                      <span>Inventario</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Filtered menu items */}
        {filteredMenuItems.map((item) => (
          <SidebarGroup key={item.url}>
            <SidebarGroupLabel>{item.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href={item.url}>
                      {React.createElement(item.icon, { className: "h-4 w-4" })}
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <SidebarTrigger />
      </SidebarFooter>
    </Sidebar>
  );
}