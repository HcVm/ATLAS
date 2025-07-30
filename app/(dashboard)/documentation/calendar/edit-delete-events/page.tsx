"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, CalendarCheck } from "lucide-react"
import Link from "next/link"

export default function EditDeleteEventsPage() {
  return (
    <div className="flex flex-col gap-6 p-6 md:p-8">
      <Link href="/documentation" className="flex items-center text-blue-600 hover:underline dark:text-blue-400">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Volver a Documentación
      </Link>

      <div className="flex items-center gap-4">
        <CalendarCheck className="h-8 w-8 text-slate-600 dark:text-slate-400" />
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
          Editar y Eliminar Eventos del Calendario
        </h1>
      </div>
      <p className="text-slate-600 dark:text-slate-300 max-w-2xl">
        Aprende a modificar o eliminar eventos existentes en tu calendario.
      </p>

      <Separator className="my-4 bg-slate-200 dark:bg-slate-700" />

      <Card className="bg-white dark:bg-slate-850 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            Paso 1: Seleccionar el Evento
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            Encuentra el evento que deseas modificar o eliminar.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-slate-600 dark:text-slate-300 space-y-4">
          <p>
            Desde la vista del calendario, haz clic en el evento específico que deseas editar o eliminar. Esto abrirá
            los detalles del evento o un diálogo de edición.
          </p>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-slate-850 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            Paso 2: Editar un Evento
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            Modifica los detalles del evento.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-slate-600 dark:text-slate-300 space-y-4">
          <p>
            En el diálogo de detalles del evento, busca un botón de "Editar" (usualmente un icono de lápiz). Haz clic en
            él para habilitar la edición de los campos.
          </p>
          <p>
            Realiza los cambios necesarios (ej. título, fecha, hora, descripción, categoría). Una vez que hayas
            terminado, haz clic en "Guardar Cambios" para aplicar las modificaciones.
          </p>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-slate-850 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            Paso 3: Eliminar un Evento
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            Remueve un evento de tu calendario.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-slate-600 dark:text-slate-300 space-y-4">
          <p>
            En el diálogo de detalles del evento, busca un botón de "Eliminar" (usualmente un icono de papelera). Haz
            clic en él.
          </p>
          <p>
            Se te pedirá una confirmación antes de eliminar el evento permanentemente. Confirma para proceder. El evento
            desaparecerá de tu calendario.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
