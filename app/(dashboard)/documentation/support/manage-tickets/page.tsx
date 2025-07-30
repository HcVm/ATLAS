"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Ticket } from "lucide-react"
import Link from "next/link"

export default function ManageTicketsPage() {
  return (
    <div className="flex flex-col gap-6 p-6 md:p-8">
      <Link href="/documentation" className="flex items-center text-blue-600 hover:underline dark:text-blue-400">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Volver a Documentación
      </Link>

      <div className="flex items-center gap-4">
        <Ticket className="h-8 w-8 text-slate-600 dark:text-slate-400" />
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Gestionar Tickets de Soporte</h1>
      </div>
      <p className="text-slate-600 dark:text-slate-300 max-w-2xl">
        Esta guía te ayudará a visualizar, filtrar y responder a los tickets de soporte existentes.
      </p>

      <Separator className="my-4 bg-slate-200 dark:bg-slate-700" />

      <Card className="bg-white dark:bg-slate-850 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            Paso 1: Acceder a la Lista de Tickets
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            Navega a la sección de soporte para ver tus tickets.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-slate-600 dark:text-slate-300 space-y-4">
          <p>
            Desde el panel de control, haz clic en "Soporte" en el menú lateral. Esto te llevará a la lista de todos los
            tickets de soporte que has creado o que te han sido asignados.
          </p>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-slate-850 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            Paso 2: Filtrar y Buscar Tickets
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            Encuentra tickets específicos utilizando las opciones de búsqueda y filtrado.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-slate-600 dark:text-slate-300 space-y-4">
          <p>Puedes usar las siguientes opciones para organizar tu vista:</p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>
              <strong>Barra de Búsqueda:</strong> Ingresa palabras clave del asunto o descripción del ticket.
            </li>
            <li>
              <strong>Filtros de Estado:</strong> Filtra por tickets "Abiertos", "En Progreso", "Resueltos" o
              "Cerrados".
            </li>
            <li>
              <strong>Filtros de Prioridad/Categoría:</strong> Ordena por prioridad (Alta, Media, Baja) o por tipo de
              problema.
            </li>
          </ul>
          <p>Esto te ayudará a priorizar y gestionar tus tickets de manera más eficiente.</p>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-slate-850 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            Paso 3: Ver Detalles del Ticket
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            Haz clic en un ticket para ver su información completa y el historial de comentarios.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-slate-600 dark:text-slate-300 space-y-4">
          <p>
            Haz clic en el asunto de cualquier ticket en la lista para abrir su vista de detalles. Aquí podrás ver la
            descripción completa, el historial de comentarios, el estado actual y la información del agente asignado.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
