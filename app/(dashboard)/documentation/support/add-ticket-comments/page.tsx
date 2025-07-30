"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, MessageSquare } from "lucide-react"
import Link from "next/link"

export default function AddTicketCommentsPage() {
  return (
    <div className="flex flex-col gap-6 p-6 md:p-8">
      <Link href="/documentation" className="flex items-center text-blue-600 hover:underline dark:text-blue-400">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Volver a Documentación
      </Link>

      <div className="flex items-center gap-4">
        <MessageSquare className="h-8 w-8 text-slate-600 dark:text-slate-400" />
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
          Añadir Comentarios a un Ticket de Soporte
        </h1>
      </div>
      <p className="text-slate-600 dark:text-slate-300 max-w-2xl">
        Esta guía te ayudará a comunicarte con el equipo de soporte añadiendo notas y actualizaciones a tus tickets
        existentes.
      </p>

      <Separator className="my-4 bg-slate-200 dark:bg-slate-700" />

      <Card className="bg-white dark:bg-slate-850 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            Paso 1: Abrir el Ticket de Soporte
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            Accede al ticket al que deseas añadir un comentario.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-slate-600 dark:text-slate-300 space-y-4">
          <p>
            Desde la lista de tickets de soporte, haz clic en el asunto del ticket específico al que deseas añadir un
            comentario. Esto te llevará a la vista de detalles del ticket.
          </p>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-slate-850 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            Paso 2: Escribir y Enviar un Comentario
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            Añade tu mensaje al historial del ticket.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-slate-600 dark:text-slate-300 space-y-4">
          <p>
            En la vista de detalles del ticket, desplázate hacia abajo hasta encontrar la sección de "Comentarios" o
            "Historial de Actividad". Verás un campo de texto para "Añadir un comentario" o "Responder".
          </p>
          <p>
            Escribe tu mensaje en el campo de texto. Puedes proporcionar actualizaciones, solicitar más información o
            responder a un comentario anterior del equipo de soporte.
          </p>
          <p>
            Una vez que hayas terminado de escribir, haz clic en el botón "Enviar Comentario" o "Responder". Tu mensaje
            se añadirá al historial del ticket y será visible para el equipo de soporte.
          </p>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-slate-850 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            Consideraciones Adicionales
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            Consejos para una comunicación efectiva.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-slate-600 dark:text-slate-300 space-y-4">
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Sé claro y conciso en tus mensajes.</li>
            <li>Si es relevante, adjunta nuevas capturas de pantalla o archivos.</li>
            <li>Evita crear nuevos tickets para el mismo problema; utiliza los comentarios en el ticket original.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
