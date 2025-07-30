"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Filter } from "lucide-react"
import Link from "next/link"

export default function FilterByCategoryPage() {
  return (
    <div className="flex flex-col gap-6 p-6 md:p-8">
      <Link href="/documentation" className="flex items-center text-blue-600 hover:underline dark:text-blue-400">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Volver a Documentación
      </Link>

      <div className="flex items-center gap-4">
        <Filter className="h-8 w-8 text-slate-600 dark:text-slate-400" />
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Filtrar Eventos por Categoría</h1>
      </div>
      <p className="text-slate-600 dark:text-slate-300 max-w-2xl">
        Organiza tu vista del calendario filtrando eventos por sus categorías asignadas.
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
            calendario.
          </p>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-slate-850 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            Paso 2: Usar las Opciones de Filtrado
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            Selecciona las categorías que deseas visualizar.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-slate-600 dark:text-slate-300 space-y-4">
          <p>
            En la parte superior o lateral del calendario, encontrarás un menú desplegable o una lista de casillas de
            verificación para "Categorías".
          </p>
          <p>
            Haz clic en este filtro y selecciona las categorías de eventos que te interesan (ej. "Reuniones", "Tareas",
            "Recordatorios"). Puedes seleccionar una o varias categorías.
          </p>
          <p>
            El calendario se actualizará automáticamente para mostrar solo los eventos que pertenecen a las categorías
            seleccionadas.
          </p>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-slate-850 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            Paso 3: Limpiar Filtros
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            Restablece la vista a todos los eventos.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-slate-600 dark:text-slate-300 space-y-4">
          <p>
            Para ver todos los eventos nuevamente, desmarca todas las categorías o busca la opción "Limpiar Filtros" o
            "Mostrar Todos".
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
