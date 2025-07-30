"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, BarChart } from "lucide-react"
import Link from "next/link"

export default function ViewDashboardStatisticsPage() {
  return (
    <div className="flex flex-col gap-6 p-6 md:p-8">
      <Link href="/documentation" className="flex items-center text-blue-600 hover:underline dark:text-blue-400">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Volver a Documentación
      </Link>

      <div className="flex items-center gap-4">
        <BarChart className="h-8 w-8 text-slate-600 dark:text-slate-400" />
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Visualizar Estadísticas del Panel</h1>
      </div>
      <p className="text-slate-600 dark:text-slate-300 max-w-2xl">
        Esta guía te ayudará a acceder y comprender las métricas clave y el rendimiento general del sistema a través del
        panel de estadísticas.
      </p>

      <Separator className="my-4 bg-slate-200 dark:bg-slate-700" />

      <Card className="bg-white dark:bg-slate-850 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            Paso 1: Acceder a la Sección de Estadísticas
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            Navega al panel de estadísticas.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-slate-600 dark:text-slate-300 space-y-4">
          <p>
            Desde el panel de control, haz clic en "Estadísticas" en el menú lateral. Esto te llevará a un panel
            interactivo que muestra diversas métricas y gráficos.
          </p>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-slate-850 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            Paso 2: Interpretar los Gráficos y Métricas
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            Comprende la información presentada en el panel.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-slate-600 dark:text-slate-300 space-y-4">
          <p>El panel de estadísticas puede incluir:</p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>
              <strong>Gráficos de Uso:</strong> Muestran la actividad de la plataforma a lo largo del tiempo (ej. número
              de documentos creados, eventos registrados).
            </li>
            <li>
              <strong>Métricas Clave:</strong> Resúmenes numéricos importantes (ej. total de usuarios, documentos
              activos, tickets resueltos).
            </li>
            <li>
              <strong>Distribuciones:</strong> Gráficos de pastel o barras que muestran la distribución de datos (ej.
              documentos por departamento, eventos por categoría).
            </li>
          </ul>
          <p>
            Cada gráfico y métrica estará etiquetado para indicar qué información representa. Pasa el ratón sobre los
            elementos para ver detalles adicionales.
          </p>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-slate-850 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            Paso 3: Filtrar Datos (si aplica)
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            Ajusta el rango de fechas o los filtros para un análisis más específico.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-slate-600 dark:text-slate-300 space-y-4">
          <p>
            Algunos paneles de estadísticas permiten filtrar los datos por rango de fechas (ej. Últimos 7 días, Este
            mes, Personalizado) o por otros criterios (ej. por departamento).
          </p>
          <p>Utiliza estos filtros para obtener una vista más granular de las estadísticas que te interesan.</p>
        </CardContent>
      </Card>
    </div>
  )
}
