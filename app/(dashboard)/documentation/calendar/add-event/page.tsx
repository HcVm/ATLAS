"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, CalendarPlus } from "lucide-react"
import Link from "next/link"

export default function AddEventPage() {
  return (
    <div className="flex flex-col gap-6 p-6 md:p-8">
      <Link href="/documentation" className="flex items-center text-blue-600 hover:underline dark:text-blue-400">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Volver a Documentación
      </Link>

      <div className="flex items-center gap-4">
        <CalendarPlus className="h-8 w-8 text-slate-600 dark:text-slate-400" />
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Añadir un Nuevo Evento al Calendario</h1>
      </div>
      <p className="text-slate-600 dark:text-slate-300 max-w-2xl">
        Esta guía te mostrará cómo programar y registrar nuevos eventos en el calendario de la plataforma.
      </p>

      <Separator className="my-4 bg-slate-200 dark:bg-slate-700" />

      <Card className="bg-white dark:bg-slate-850 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            Paso 1: Acceder al Calendario
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            Navega a la sección del calendario.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-slate-600 dark:text-slate-300 space-y-4">
          <p>
            Desde el panel de control, haz clic en "Calendario" en el menú lateral. Esto te llevará a la vista del
            calendario mensual o semanal.
          </p>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-slate-850 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            Paso 2: Crear un Nuevo Evento
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            Inicia el proceso de creación de un evento.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-slate-600 dark:text-slate-300 space-y-4">
          <p>Puedes añadir un evento de varias maneras:</p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Haz clic en el botón "Añadir Evento" o un icono similar (usualmente un signo `+`).</li>
            <li>Haz clic directamente en una fecha u hora específica en la cuadrícula del calendario.</li>
          </ul>
          <p>Esto abrirá un formulario o un diálogo para ingresar los detalles del evento.</p>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-slate-850 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            Paso 3: Rellenar los Detalles del Evento
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            Completa la información del evento.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-slate-600 dark:text-slate-300 space-y-4">
          <p>Ingresa la siguiente información:</p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>
              <strong>Título del Evento:</strong> Un nombre claro para tu evento.
            </li>
            <li>
              <strong>Fecha y Hora:</strong> Define el inicio y fin del evento. Puedes marcarlo como "Todo el día" si es
              necesario.
            </li>
            <li>
              <strong>Descripción:</strong> Detalles adicionales sobre el evento.
            </li>
            <li>
              <strong>Categoría:</strong> Asigna una categoría (ej. Reunión, Tarea, Recordatorio) para facilitar el
              filtrado.
            </li>
            <li>
              <strong>Participantes:</strong> Si aplica, invita a otros usuarios al evento.
            </li>
          </ul>
          <p>
            Una vez que hayas rellenado todos los campos, haz clic en "Guardar" o "Crear Evento". El evento aparecerá
            inmediatamente en tu calendario.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
