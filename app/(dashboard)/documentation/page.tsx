"use client"

import Link from "next/link"
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
} from "lucide-react"

const documentationSections = [
  {
    title: "Gestión de Documentos",
    description: "Guías para crear, subir, buscar y gestionar documentos en la plataforma.",
    icon: FileText,
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
    pages: [{ title: "Crear un nuevo departamento", href: "/documentation/departments/create-new-department" }],
  },
  {
    title: "Almacén General",
    description: "Guías para gestionar productos, movimientos e inventario en el almacén principal.",
    icon: Package,
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
    pages: [
      { title: "Crear una nueva publicación", href: "/documentation/news/create-news-post" },
      { title: "Visualizar el feed de noticias", href: "/documentation/news/view-news-feed" },
    ],
  },
  {
    title: "Estadísticas de la Plataforma",
    description: "Accede y comprende las métricas clave y el rendimiento general del sistema.",
    icon: BarChart,
    pages: [
      { title: "Visualizar estadísticas del panel", href: "/documentation/statistics/view-dashboard-statistics" },
    ],
  },
]

export default function DocumentationPage() {
  return (
    <div className="flex flex-col gap-6 p-6 md:p-8">
      <div className="flex items-center gap-4">
        <FileText className="h-8 w-8 text-slate-600 dark:text-slate-400" />
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Manual de Procedimientos</h1>
      </div>
      <p className="text-slate-600 dark:text-slate-300 max-w-2xl">
        Bienvenido al manual de procedimientos de la plataforma. Aquí encontrarás guías detalladas sobre cómo utilizar
        cada una de las funcionalidades para optimizar tu trabajo diario.
      </p>

      <Separator className="my-4 bg-slate-200 dark:bg-slate-700" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {documentationSections.map((section, index) => (
          <Card
            key={index}
            className="bg-white dark:bg-slate-850 shadow-sm hover:shadow-md transition-shadow duration-200"
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
                <section.icon className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                {section.title}
              </CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400">{section.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside text-sm text-slate-600 dark:text-slate-300 space-y-1">
                {section.pages.map((page, pageIndex) => (
                  <li key={pageIndex}>
                    <Link href={page.href} className="text-blue-600 hover:underline dark:text-blue-400">
                      {page.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
