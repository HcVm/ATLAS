"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, FileText } from "lucide-react"
import Link from "next/link"

export default function GenerateQuotationPage() {
  return (
    <div className="flex flex-col gap-6 p-6 md:p-8">
      <Link href="/documentation" className="flex items-center text-blue-600 hover:underline dark:text-blue-400">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Volver a Documentación
      </Link>

      <div className="flex items-center gap-4">
        <FileText className="h-8 w-8 text-slate-600 dark:text-slate-400" />
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Generar una Cotización</h1>
      </div>
      <p className="text-slate-600 dark:text-slate-300 max-w-2xl">
        Esta guía te ayudará a crear y descargar cotizaciones profesionales para tus clientes.
      </p>

      <Separator className="my-4 bg-slate-200 dark:bg-slate-700" />

      <Card className="bg-white dark:bg-slate-850 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            Paso 1: Acceder a la Sección de Cotizaciones
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            Navega a la sección de gestión de cotizaciones.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-slate-600 dark:text-slate-300 space-y-4">
          <p>
            Desde el panel de control, haz clic en "Cotizaciones" en el menú lateral. Esto te llevará a la lista de
            todas las cotizaciones existentes.
          </p>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-slate-850 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            Paso 2: Iniciar la Creación de una Cotización
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            Haz clic en el botón para crear una nueva cotización.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-slate-600 dark:text-slate-300 space-y-4">
          <p>En la página de cotizaciones, busca y haz clic en el botón "Nueva Cotización" o un icono similar.</p>
          <p>Esto abrirá un formulario donde podrás ingresar los detalles de la cotización.</p>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-slate-850 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            Paso 3: Rellenar los Detalles de la Cotización
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            Completa la información de la cotización, incluyendo productos y cliente.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-slate-600 dark:text-slate-300 space-y-4">
          <p>Ingresa la siguiente información obligatoria:</p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>
              <strong>Cliente:</strong> Selecciona el cliente de la lista existente o crea uno nuevo.
            </li>
            <li>
              <strong>Productos:</strong> Añade los productos que se están cotizando, especificando la cantidad de cada
              uno. El sistema calculará el total automáticamente.
            </li>
            <li>
              <strong>Fecha de Emisión:</strong> La fecha en que se generó la cotización.
            </li>
            <li>
              <strong>Validez:</strong> La fecha hasta la cual la cotización es válida.
            </li>
          </ul>
          <p>Una vez que hayas rellenado todos los campos, haz clic en "Generar Cotización" o "Guardar".</p>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-slate-850 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            Paso 4: Descargar la Cotización
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            Descarga la cotización en formato PDF.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-slate-600 dark:text-slate-300 space-y-4">
          <p>
            Después de guardar la cotización, verás una opción para "Descargar PDF" o "Imprimir". Haz clic en ella para
            obtener una versión en PDF de la cotización que puedes enviar a tu cliente.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
