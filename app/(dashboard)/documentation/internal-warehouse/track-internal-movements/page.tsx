"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Truck } from "lucide-react"
import Link from "next/link"

export default function TrackInternalMovementsPage() {
  return (
    <div className="flex flex-col gap-6 p-6 md:p-8">
      <Link href="/documentation" className="flex items-center text-blue-600 hover:underline dark:text-blue-400">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Volver a Documentación
      </Link>

      <div className="flex items-center gap-4">
        <Truck className="h-8 w-8 text-slate-600 dark:text-slate-400" />
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
          Seguimiento de Movimientos Internos (Almacén Interno)
        </h1>
      </div>
      <p className="text-slate-600 dark:text-slate-300 max-w-2xl">
        Esta guía te ayudará a registrar y consultar las entradas y salidas de productos dentro del almacén interno.
      </p>

      <Separator className="my-4 bg-slate-200 dark:bg-slate-700" />

      <Card className="bg-white dark:bg-slate-850 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            Paso 1: Acceder a la Sección de Movimientos Internos
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            Navega a la sección de movimientos del almacén interno.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-slate-600 dark:text-slate-300 space-y-4">
          <p>
            Desde el panel de control, haz clic en "Almacén", luego en "Interno" y finalmente en "Movimientos" en el
            menú lateral. Esto te llevará a la lista de todos los movimientos internos registrados.
          </p>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-slate-850 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            Paso 2: Registrar un Nuevo Movimiento Interno
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            Documenta una entrada o salida de productos internos.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-slate-600 dark:text-slate-300 space-y-4">
          <p>
            En la página de movimientos internos, haz clic en el botón "Nuevo Movimiento" o un icono similar. Rellena
            los campos como tipo de movimiento (entrada/salida), producto interno, cantidad, fecha y cualquier nota
            relevante.
          </p>
          <p>
            Asegúrate de seleccionar el producto interno correcto y la cantidad exacta para mantener el inventario
            preciso. Haz clic en "Guardar" para registrar el movimiento.
          </p>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-slate-850 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            Paso 3: Consultar Movimientos Internos
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            Revisa el historial de movimientos de productos internos.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-slate-600 dark:text-slate-300 space-y-4">
          <p>
            La tabla de movimientos internos te mostrará un registro cronológico de todas las transacciones. Puedes usar
            las opciones de búsqueda y filtrado para encontrar movimientos específicos por producto, fecha o tipo.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
