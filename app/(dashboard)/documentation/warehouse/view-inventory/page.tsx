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

export default function ViewInventoryPage() {
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
          <div className="p-3 bg-cyan-100 dark:bg-cyan-900/30 rounded-xl">
            <Boxes className="h-8 w-8 text-cyan-600 dark:text-cyan-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              Inventario General
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Visualiza existencias en tiempo real y gestiona reabastecimientos
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
          <Card className="border-l-4 border-l-cyan-500 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-cyan-100 dark:bg-cyan-900/50 flex items-center justify-center text-cyan-600 font-bold">1</div>
                <CardTitle className="text-xl">Datos del Tablero</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="ml-11">
              <div className="space-y-4">
                <p className="text-slate-600 dark:text-slate-300">
                  La tabla maestra muestra el estado actual de cada SKU. Columnas clave:
                </p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded border border-slate-100 dark:border-slate-800">
                    <span className="font-semibold text-slate-700 dark:text-slate-200 block">Stock Físico</span>
                    <span className="text-xs text-slate-500">Unidades reales en almacén.</span>
                  </div>
                  <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded border border-slate-100 dark:border-slate-800">
                    <span className="font-semibold text-slate-700 dark:text-slate-200 block">Stock Comprometido</span>
                    <span className="text-xs text-slate-500">Reservado para pedidos en curso.</span>
                  </div>
                  <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded border border-slate-100 dark:border-slate-800">
                    <span className="font-semibold text-slate-700 dark:text-slate-200 block">Disponible</span>
                    <span className="text-xs text-slate-500">Libre para venta inmediata.</span>
                  </div>
                  <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded border border-slate-100 dark:border-slate-800">
                    <span className="font-semibold text-slate-700 dark:text-slate-200 block">Valorización</span>
                    <span className="text-xs text-slate-500">Costo total del inventario.</span>
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
                <CardTitle className="text-xl">Herramientas de Búsqueda</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="ml-11">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <Search className="h-5 w-5 text-purple-600" />
                  <p className="text-sm text-purple-900 dark:text-purple-200">
                    Localiza rápidamente por nombre, marca o escaneando el código de barras.
                  </p>
                </div>
                <div className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <Filter className="h-5 w-5 text-purple-600" />
                  <p className="text-sm text-purple-900 dark:text-purple-200">
                    Filtra por Categoría (ej. Electrónica) o Estado (ej. Solo productos activos).
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="border-l-4 border-l-orange-500 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center text-orange-600 font-bold">3</div>
                <CardTitle className="text-xl">Alertas de Stock</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="ml-11">
              <div className="flex items-start gap-3 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-100 dark:border-orange-800">
                <AlertTriangle className="h-6 w-6 text-orange-500 mt-1" />
                <div>
                  <h4 className="font-semibold text-orange-800 dark:text-orange-200">Reabastecimiento Necesario</h4>
                  <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                    Los productos con stock por debajo del mínimo configurado aparecerán resaltados en rojo o en la pestaña "Por Comprar" para facilitar la reposición.
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
