"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, ShoppingCart } from "lucide-react"
import Link from "next/link"

export default function CreateSalePage() {
  return (
    <div className="flex flex-col gap-6 p-6 md:p-8">
      <Link href="/documentation" className="flex items-center text-blue-600 hover:underline dark:text-blue-400">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Volver a Documentación
      </Link>

      <div className="flex items-center gap-4">
        <ShoppingCart className="h-8 w-8 text-slate-600 dark:text-slate-400" />
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Crear una Nueva Venta</h1>
      </div>
      <p className="text-slate-600 dark:text-slate-300 max-w-2xl">
        Esta guía te ayudará a registrar nuevas transacciones de venta en la plataforma.
      </p>

      <Separator className="my-4 bg-slate-200 dark:bg-slate-700" />

      <Card className="bg-white dark:bg-slate-850 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            Paso 1: Acceder a la Sección de Ventas
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            Navega a la sección de gestión de ventas.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-slate-600 dark:text-slate-300 space-y-4">
          <p>
            Desde el panel de control, haz clic en "Ventas" en el menú lateral. Esto te llevará a la lista de todas las
            ventas registradas.
          </p>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-slate-850 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            Paso 2: Iniciar la Creación de una Venta
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            Haz clic en el botón para añadir una nueva venta.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-slate-600 dark:text-slate-300 space-y-4">
          <p>
            En la página de ventas, busca y haz clic en el botón "Nueva Venta" o un icono similar (usualmente un signo
            `+`).
          </p>
          <p>Esto abrirá un formulario donde podrás ingresar los detalles de la transacción.</p>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-slate-850 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            Paso 3: Rellenar los Detalles de la Venta
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            Completa la información de la venta, incluyendo productos y cliente.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-slate-600 dark:text-slate-300 space-y-4">
          <p>Ingresa la siguiente información obligatoria:</p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>
              <strong>Cliente:</strong> Selecciona el cliente de la lista existente o crea uno nuevo.
            </li>
            <li>
              <strong>Productos:</strong> Añade los productos que se están vendiendo, especificando la cantidad de cada
              uno. El sistema calculará el total automáticamente.
            </li>
            <li>
              <strong>Fecha de Venta:</strong> La fecha en que se realizó la transacción.
            </li>
            <li>
              <strong>Estado de la Venta:</strong> (ej. Pendiente, Completada, Cancelada).
            </li>
          </ul>
          <p>
            Una vez que hayas rellenado todos los campos, haz clic en "Guardar Venta" para registrar la transacción.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
