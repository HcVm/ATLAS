"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, BarChart2, PieChart, Activity, MousePointer, Calendar } from "lucide-react"
import Link from "next/link"

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

export default function ViewDashboardStatisticsPage() {
  return (
    <div className="flex flex-col gap-8 p-6 md:p-12 min-h-screen bg-slate-50/50 dark:bg-slate-950/50">
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex flex-col gap-4"
      >
        <Link href="/documentation" className="inline-flex items-center text-sm text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a Documentación
        </Link>

        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
            <BarChart2 className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              Estadísticas del Panel
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Guía para interpretar métricas clave y el rendimiento del sistema
            </p>
          </div>
        </div>
      </motion.div>

      <Separator className="bg-slate-200 dark:bg-slate-800" />

      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid gap-8 max-w-5xl"
      >
        <motion.div variants={item}>
          <Card className="border-l-4 border-l-indigo-500 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 font-bold">1</div>
                <CardTitle className="text-xl">Acceso al Panel</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="ml-11">
              <div className="flex items-start gap-4 p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                <MousePointer className="h-6 w-6 text-indigo-500 mt-1" />
                <div>
                  <h4 className="font-semibold text-slate-700 dark:text-slate-200">Navegación</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                    En el menú lateral principal, selecciona la opción <strong>"Estadísticas"</strong> o <strong>"Dashboard"</strong>. Esto cargará la vista general con los indicadores más relevantes de tu área.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="border-l-4 border-l-violet-500 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center text-violet-600 font-bold">2</div>
                <CardTitle className="text-xl">Interpretación de Datos</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="ml-11">
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="p-3 bg-violet-50 dark:bg-violet-900/20 rounded-lg border border-violet-100 dark:border-violet-800 text-center">
                  <Activity className="h-6 w-6 text-violet-600 mx-auto mb-2" />
                  <h5 className="font-medium text-slate-800 dark:text-slate-200 text-sm">Actividad Reciente</h5>
                  <p className="text-xs text-slate-500 mt-1">
                    Gráficos de línea o área que muestran tendencias temporales (ej. ventas del mes).
                  </p>
                </div>
                <div className="p-3 bg-violet-50 dark:bg-violet-900/20 rounded-lg border border-violet-100 dark:border-violet-800 text-center">
                  <PieChart className="h-6 w-6 text-violet-600 mx-auto mb-2" />
                  <h5 className="font-medium text-slate-800 dark:text-slate-200 text-sm">Distribución</h5>
                  <p className="text-xs text-slate-500 mt-1">
                    Gráficos circulares para ver proporciones (ej. inventario por categoría).
                  </p>
                </div>
                <div className="p-3 bg-violet-50 dark:bg-violet-900/20 rounded-lg border border-violet-100 dark:border-violet-800 text-center">
                  <div className="h-6 w-6 flex items-center justify-center font-bold text-violet-600 mx-auto mb-2 text-lg">123</div>
                  <h5 className="font-medium text-slate-800 dark:text-slate-200 text-sm">KPIs</h5>
                  <p className="text-xs text-slate-500 mt-1">
                    Tarjetas con números grandes que indican totales actuales (ej. Total Usuarios).
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="border-l-4 border-l-purple-500 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-purple-600 font-bold">3</div>
                <CardTitle className="text-xl">Filtros y Segmentación</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="ml-11">
              <div className="flex items-start gap-4 p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                <Calendar className="h-6 w-6 text-purple-500 mt-1" />
                <div>
                  <h4 className="font-semibold text-slate-700 dark:text-slate-200">Personalización de Vista</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                    Utiliza los controles en la parte superior derecha para filtrar los datos por <strong>Rango de Fechas</strong> (Hoy, Esta Semana, Este Mes) o por <strong>Departamento</strong>. Los gráficos se actualizarán automáticamente.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  )
}
