"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  FileText,
  CalendarDays,
  Users,
  Package,
  ShoppingCart,
  LifeBuoy,
  Newspaper,
  Building2,
  BarChart,
  Warehouse,
  MessageSquare,
  FileCheck,
  Briefcase,
  Monitor,
  Clock,
  ArrowRight,
} from "lucide-react"

const documentationSections = [
  {
    title: "Gestión de Documentos",
    description: "Guías para crear, subir, buscar y gestionar documentos en la plataforma.",
    icon: FileText,
    color: "text-blue-500",
    bg: "bg-blue-50 dark:bg-blue-900/20",
    pages: [
      { title: "Crear un nuevo documento", href: "/documentation/documents/create-document" },
      { title: "Subir archivos adjuntos", href: "/documentation/documents/upload-attachments" },
      { title: "Buscar y filtrar documentos", href: "/documentation/documents/search-documents" },
      { title: "Generar códigos QR", href: "/documentation/documents/generate-qr" },
    ],
  },
  {
    title: "Uso del Calendario",
    description: "Cómo añadir, editar y gestionar eventos en el calendario de la plataforma.",
    icon: CalendarDays,
    color: "text-purple-500",
    bg: "bg-purple-50 dark:bg-purple-900/20",
    pages: [
      { title: "Añadir un nuevo evento", href: "/documentation/calendar/add-event" },
      { title: "Editar y eliminar eventos", href: "/documentation/calendar/edit-delete-events" },
      { title: "Filtrar eventos por categoría", href: "/documentation/calendar/filter-by-category" },
    ],
  },
  {
    title: "Administración de Usuarios",
    description: "Procedimientos para la gestión de usuarios, roles y permisos.",
    icon: Users,
    color: "text-green-500",
    bg: "bg-green-50 dark:bg-green-900/20",
    pages: [
      { title: "Crear nuevas cuentas de usuario", href: "/documentation/users/create-user-accounts" },
      { title: "Asignar roles y departamentos", href: "/documentation/users/assign-roles-departments" },
      { title: "Restablecer contraseñas", href: "/documentation/users/reset-passwords" },
    ],
  },
  {
    title: "Gestión de Departamentos",
    description: "Cómo crear, editar y administrar los departamentos de la organización.",
    icon: Building2,
    color: "text-orange-500",
    bg: "bg-orange-50 dark:bg-orange-900/20",
    pages: [{ title: "Crear un nuevo departamento", href: "/documentation/departments/create-new-department" }],
  },
  {
    title: "Almacén General",
    description: "Guías para gestionar productos, movimientos e inventario en el almacén principal.",
    icon: Package,
    color: "text-amber-500",
    bg: "bg-amber-50 dark:bg-amber-900/20",
    pages: [
      { title: "Gestionar productos", href: "/documentation/warehouse/manage-products" },
      { title: "Seguimiento de movimientos", href: "/documentation/warehouse/track-movements" },
      { title: "Visualizar el inventario", href: "/documentation/warehouse/view-inventory" },
    ],
  },
  {
    title: "Almacén Interno",
    description: "Guías específicas para la gestión de productos y movimientos dentro del almacén interno.",
    icon: Warehouse,
    color: "text-indigo-500",
    bg: "bg-indigo-50 dark:bg-indigo-900/20",
    pages: [
      { title: "Gestionar productos internos", href: "/documentation/internal-warehouse/manage-internal-products" },
      {
        title: "Seguimiento de movimientos internos",
        href: "/documentation/internal-warehouse/track-internal-movements",
      },
      { title: "Visualizar inventario interno", href: "/documentation/internal-warehouse/view-internal-inventory" },
    ],
  },
  {
    title: "Ventas y Cotizaciones",
    description: "Procedimientos para crear ventas, generar cotizaciones y exportar datos.",
    icon: ShoppingCart,
    color: "text-emerald-500",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    pages: [
      { title: "Crear una nueva venta", href: "/documentation/sales-quotations/create-sale" },
      { title: "Generar una cotización", href: "/documentation/sales-quotations/generate-quotation" },
      { title: "Exportar datos de ventas", href: "/documentation/sales-quotations/export-sales-data" },
    ],
  },
  {
    title: "Sistema de Soporte",
    description: "Cómo crear, gestionar y añadir comentarios a los tickets de soporte.",
    icon: LifeBuoy,
    color: "text-rose-500",
    bg: "bg-rose-50 dark:bg-rose-900/20",
    pages: [
      { title: "Crear un ticket de soporte", href: "/documentation/support/create-support-ticket" },
      { title: "Gestionar tickets de soporte", href: "/documentation/support/manage-tickets" },
      { title: "Añadir comentarios a un ticket", href: "/documentation/support/add-ticket-comments" },
    ],
  },
  {
    title: "Noticias y Anuncios",
    description: "Guías para crear y visualizar publicaciones en el feed de noticias.",
    icon: Newspaper,
    color: "text-cyan-500",
    bg: "bg-cyan-50 dark:bg-cyan-900/20",
    pages: [
      { title: "Crear una nueva publicación", href: "/documentation/news/create-news-post" },
      { title: "Visualizar el feed de noticias", href: "/documentation/news/view-news-feed" },
    ],
  },
  {
    title: "Estadísticas de la Plataforma",
    description: "Accede y comprende las métricas clave y el rendimiento general del sistema.",
    icon: BarChart,
    color: "text-teal-500",
    bg: "bg-teal-50 dark:bg-teal-900/20",
    pages: [
      { title: "Visualizar estadísticas del panel", href: "/documentation/statistics/view-dashboard-statistics" },
    ],
  },
  {
    title: "Chat Corporativo",
    description: "Guía para el uso del sistema de mensajería interna y colaboración.",
    icon: MessageSquare,
    color: "text-violet-500",
    bg: "bg-violet-50 dark:bg-violet-900/20",
    pages: [{ title: "Uso del chat y grupos", href: "/documentation/chat/use-chat" }],
  },
  {
    title: "Solicitudes y Aprobaciones",
    description: "Gestión de solicitudes administrativas, permisos y flujos de aprobación.",
    icon: FileCheck,
    color: "text-lime-500",
    bg: "bg-lime-50 dark:bg-lime-900/20",
    pages: [
      { title: "Crear una solicitud", href: "/documentation/requests/create-request" },
      { title: "Gestionar aprobaciones", href: "/documentation/requests/manage-approvals" },
    ],
  },
  {
    title: "Ventas Avanzadas y CRM",
    description: "Herramientas de seguimiento de clientes, Kanban de ventas y cobranzas.",
    icon: Briefcase,
    color: "text-sky-500",
    bg: "bg-sky-50 dark:bg-sky-900/20",
    pages: [
      { title: "Gestión de oportunidades (CRM)", href: "/documentation/sales/crm-guide" },
      { title: "Tablero Kanban de entregas", href: "/documentation/sales/kanban-guide" },
      { title: "Gestión de cobranzas", href: "/documentation/collections/manage-collections" },
    ],
  },
  {
    title: "Activos Fijos",
    description: "Control, depreciación y seguimiento de activos fijos de la empresa.",
    icon: Monitor,
    color: "text-slate-500",
    bg: "bg-slate-50 dark:bg-slate-900/20",
    pages: [
      { title: "Gestión de activos fijos", href: "/documentation/internal-warehouse/fixed-assets" },
    ],
  },
  {
    title: "Asistencia y Supervisión",
    description: "Control de asistencia de personal y herramientas de supervisión.",
    icon: Clock,
    color: "text-pink-500",
    bg: "bg-pink-50 dark:bg-pink-900/20",
    pages: [
      { title: "Registro de asistencia", href: "/documentation/attendance/track-attendance" },
    ],
  },
]

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

export default function DocumentationPage() {
  return (
    <div className="w-full p-6 space-y-8">
      <div className="w-full space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center justify-center p-3 rounded-2xl bg-white dark:bg-slate-800 shadow-xl mb-4"
          >
            <div className="p-2 bg-blue-500 rounded-xl">
              <FileText className="h-8 w-8 text-white" />
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent"
          >
            Manual de Procedimientos
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed"
          >
            Bienvenido al centro de conocimiento de la plataforma. Encuentra guías detalladas,
            paso a paso y recursos para dominar todas las funcionalidades del sistema.
          </motion.p>
        </div>

        <Separator className="bg-slate-200 dark:bg-slate-800" />

        {/* Grid Section */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6"
        >
          {documentationSections.map((section, index) => (
            <motion.div key={index} variants={item}>
              <Card className="group h-full border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm hover:bg-white dark:hover:bg-slate-800 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 overflow-hidden">
                <div className={`h-1 w-full ${section.bg.replace('/20', '')}`} />
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`p-2 rounded-lg ${section.bg}`}>
                      <section.icon className={`h-6 w-6 ${section.color}`} />
                    </div>
                    <CardTitle className="text-lg font-bold text-slate-800 dark:text-slate-100">
                      {section.title}
                    </CardTitle>
                  </div>
                  <CardDescription className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
                    {section.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {section.pages.map((page, pageIndex) => (
                      <li key={pageIndex}>
                        <Link
                          href={page.href}
                          className="group/link flex items-center text-sm text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        >
                          <ArrowRight className="h-3 w-3 mr-2 opacity-0 -ml-5 group-hover/link:opacity-100 group-hover/link:ml-0 transition-all duration-300" />
                          <span className="truncate">{page.title}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  )
}
