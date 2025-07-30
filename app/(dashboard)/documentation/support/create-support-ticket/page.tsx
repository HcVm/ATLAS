"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, LifeBuoy } from "lucide-react"
import Link from "next/link"

export default function CreateSupportTicketPage() {
  return (
    <div className="flex flex-col gap-6 p-6 md:p-8">
      <Link href="/documentation" className="flex items-center text-blue-600 hover:underline dark:text-blue-400">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Volver a Documentación
      </Link>

      <div className="flex items-center gap-4">
        <LifeBuoy className="h-8 w-8 text-slate-600 dark:text-slate-400" />
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Crear un Ticket de Soporte</h1>
      </div>
      <p className="text-slate-600 dark:text-slate-300 max-w-2xl">
        Esta guía te ayudará a enviar solicitudes de ayuda o reportar problemas al equipo de soporte técnico.
      </p>

      <Separator className="my-4 bg-slate-200 dark:bg-slate-700" />

      <Card className="bg-white dark:bg-slate-850 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            Paso 1: Acceder al Sistema de Soporte
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            Navega a la sección de soporte.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-slate-600 dark:text-slate-300 space-y-4">
          <p>
            Desde el panel de control, haz clic en "Soporte" en el menú lateral. Esto te llevará a la página principal
            del sistema de tickets.
          </p>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-slate-850 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            Paso 2: Iniciar la Creación de un Ticket
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            Haz clic en el botón para crear un nuevo ticket.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-slate-600 dark:text-slate-300 space-y-4">
          <p>
            En la página de soporte, busca y haz clic en el botón "Nuevo Ticket" o un icono similar (usualmente un signo
            `+`).
          </p>
          <p>Esto abrirá un formulario donde podrás ingresar los detalles de tu solicitud.</p>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-slate-850 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            Paso 3: Rellenar los Detalles del Ticket
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            Completa la información de tu solicitud de soporte.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-slate-600 dark:text-slate-300 space-y-4">
          <p>Ingresa la siguiente información obligatoria:</p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>
              <strong>Asunto:</strong> Un título breve y claro que resuma tu problema o solicitud.
            </li>
            <li>
              <strong>Descripción:</strong> Proporciona todos los detalles relevantes, incluyendo pasos para reproducir
              el problema, mensajes de error, y cualquier información adicional que pueda ser útil.
            </li>
            <li>
              <strong>Prioridad:</strong> Selecciona la prioridad del ticket (ej. Baja, Media, Alta, Urgente).
            </li>
            <li>
              <strong>Categoría:</strong> Asigna una categoría (ej. Fallo Técnico, Consulta, Sugerencia).
            </li>
          </ul>
          <p>
            Puedes adjuntar archivos (capturas de pantalla, logs) si es necesario. Una vez completado, haz clic en
            "Enviar Ticket". Recibirás una confirmación y el equipo de soporte se pondrá en contacto contigo.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
