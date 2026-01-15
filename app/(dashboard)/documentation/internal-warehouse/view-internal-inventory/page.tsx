"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Boxes, Search, Filter, AlertTriangle } from "lucide-react"
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

export default function ViewInternalInventoryPage() {
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
            <Boxes className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              Inventario Interno
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Control de suministros y activos para uso de la empresa
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
                <CardTitle className="text-xl">Diferencias Clave</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="ml-11">
              <div className="space-y-4">
                <p className="text-slate-600 dark:text-slate-300">
                  A diferencia del almacén general, este inventario gestiona bienes que no son para la venta:
                </p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800">
                    <span className="font-semibold text-slate-700 dark:text-slate-200 block mb-1">Suministros</span>
                    <span className="text-sm text-slate-500">Papelería, limpieza, repuestos.</span>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800">
                    <span className="font-semibold text-slate-700 dark:text-slate-200 block mb-1">Activos Fijos</span>
                    <span className="text-sm text-slate-500">Laptops, muebles, maquinaria (con serie única).</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="border-l-4 border-l-purple-500 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-purple-600 font-bold">2</div>
                <CardTitle className="text-xl">Filtros Específicos</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="ml-11">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <Search className="h-5 w-5 text-purple-600" />
                  <p className="text-sm text-purple-900 dark:text-purple-200">
                    Busca por código interno (ej. "SUM-001") o descripción.
                  </p>
                </div>
                <div className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <Filter className="h-5 w-5 text-purple-600" />
                  <p className="text-sm text-purple-900 dark:text-purple-200">
                    Filtra por "Categoría" (Limpieza, Oficina) o "Estado" (Disponible, Asignado, En reparación).
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="border-l-4 border-l-emerald-500 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 font-bold">3</div>
                <CardTitle className="text-xl">Control de Asignaciones</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="ml-11">
              <div className="flex items-start gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-100 dark:border-emerald-800">
                <AlertTriangle className="h-6 w-6 text-emerald-500 mt-1" />
                <div>
                  <h4 className="font-semibold text-emerald-800 dark:text-emerald-200">Trazabilidad</h4>
                  <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-1">
                    Para los activos fijos, puedes ver exactamente quién tiene asignado el equipo y en qué ubicación física se encuentra.
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
