"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Monitor, TrendingDown, Tag, Plus, Calendar, AlertTriangle } from "lucide-react"
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

export default function FixedAssetsPage() {
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
          <div className="p-3 bg-slate-200 dark:bg-slate-800 rounded-xl">
            <Monitor className="h-8 w-8 text-slate-700 dark:text-slate-300" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              Gestión de Activos Fijos
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Control, depreciación y seguimiento de bienes patrimoniales
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
          <Card className="border-l-4 border-l-slate-500 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 font-bold">1</div>
                <CardTitle className="text-xl">Registro de Activos</CardTitle>
              </div>
              <CardDescription className="ml-11">
                Alta de nuevos bienes en el inventario patrimonial.
              </CardDescription>
            </CardHeader>
            <CardContent className="ml-11">
              <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-200 dark:border-slate-800 space-y-4">
                <p className="text-slate-600 dark:text-slate-300">
                  Usa el botón <strong className="inline-flex items-center text-xs bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded"><Plus className="h-3 w-3 mr-1"/> Nuevo Activo</strong> e ingresa los datos críticos:
                </p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-2 bg-white dark:bg-slate-900 rounded border border-slate-100 dark:border-slate-800">
                    <span className="block font-semibold text-slate-700 dark:text-slate-200">Código Patrimonial</span>
                    <span className="text-slate-500">Etiqueta única de la empresa</span>
                  </div>
                  <div className="p-2 bg-white dark:bg-slate-900 rounded border border-slate-100 dark:border-slate-800">
                    <span className="block font-semibold text-slate-700 dark:text-slate-200">Serie del Fabricante</span>
                    <span className="text-slate-500">S/N del equipo físico</span>
                  </div>
                  <div className="p-2 bg-white dark:bg-slate-900 rounded border border-slate-100 dark:border-slate-800">
                    <span className="block font-semibold text-slate-700 dark:text-slate-200">Valor de Compra</span>
                    <span className="text-slate-500">Base para depreciación</span>
                  </div>
                  <div className="p-2 bg-white dark:bg-slate-900 rounded border border-slate-100 dark:border-slate-800">
                    <span className="block font-semibold text-slate-700 dark:text-slate-200">Categoría</span>
                    <span className="text-slate-500">Define % de vida útil</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="border-l-4 border-l-blue-500 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 font-bold">2</div>
                <CardTitle className="text-xl">Asignación y Ubicación</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="ml-11">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-start gap-3">
                  <Tag className="h-6 w-6 text-blue-500 mt-1" />
                  <div>
                    <h4 className="font-semibold text-blue-900 dark:text-blue-200">Custodio Responsable</h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      Todo activo debe estar asignado a un empleado. Al cambiar de manos, se debe generar un acta de entrega/recepción digital.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="border-l-4 border-l-red-500 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center text-red-600 font-bold">3</div>
                <CardTitle className="text-xl">Depreciación Automática</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="ml-11">
              <div className="flex items-center gap-6 p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900">
                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                  <TrendingDown className="h-6 w-6 text-red-600" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-semibold">Cálculo Mensual</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    El sistema aplica la tasa anual (ej. 25% para laptops) y actualiza el valor neto en libros automáticamente cada cierre de mes.
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
