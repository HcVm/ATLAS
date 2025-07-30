"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Download } from "lucide-react"
import Link from "next/link"

export default function ExportSalesDataPage() {
  return (
    <div className="flex flex-col gap-6 p-6 md:p-8">
      <Link href="/documentation" className="flex items-center text-blue-600 hover:underline dark:text-blue-400">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Volver a Documentación
      </Link>

      <div className="flex items-center gap-4">
        <Download className="h-8 w-8 text-slate-600 dark:text-slate-400" />
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Exportar Datos de Ventas</h1>
      </div>
      <p className="text-slate-600 dark:text-slate-300 max-w-2xl">
        Esta guía te ayudará a descargar tus datos de ventas para análisis y reportes externos.
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
            Paso 2: Seleccionar Opciones de Exportación
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            Elige el formato y el rango de datos a exportar.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-slate-600 dark:text-slate-300 space-y-4">
          <p>
            En la página de ventas, busca el botón "Exportar" o un icono similar (usualmente una flecha hacia abajo).
            Haz clic en él para abrir las opciones de exportación.
          </p>
          <p>Podrás seleccionar:</p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>
              <strong>Formato:</strong> CSV, Excel (XLSX) o PDF.
            </li>
            <li>
              <strong>Rango de Fechas:</strong> Define un período específico para los datos de ventas.
            </li>
            <li>
              <strong>Filtros:</strong> Si has aplicado filtros a la tabla de ventas, puedes elegir si exportar solo los
              datos filtrados o todos los datos.
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-slate-850 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            Paso 3: Descargar el Archivo
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            Inicia la descarga de tus datos de ventas.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-slate-600 dark:text-slate-300 space-y-4">
          <p>
            Una vez que hayas configurado las opciones de exportación, haz clic en "Descargar" o "Generar Reporte". El
            archivo se descargará automáticamente a tu dispositivo.
          </p>
          <p>
            Podrás abrir este archivo con el software correspondiente (ej. Microsoft Excel, Google Sheets) para realizar
            análisis adicionales.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
