"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Kanban, Truck, CheckSquare, Package, Clock, MapPin } from "lucide-react"
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

export default function KanbanGuidePage() {
  return (
    <div className="flex flex-col gap-8 p-6 md:p-12 w-full">
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex flex-col gap-4 max-w-5xl mx-auto w-full"
      >
        <Link href="/documentation" className="inline-flex items-center text-sm text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a Documentación
        </Link>

        <div className="flex items-center gap-4">
          <div className="p-3 bg-sky-100 dark:bg-sky-900/30 rounded-xl">
            <Kanban className="h-8 w-8 text-sky-600 dark:text-sky-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              Tablero Kanban de Entregas
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Visualización y control de flujo de despachos en tiempo real
            </p>
          </div>
        </div>
      </motion.div>

      <Separator className="bg-slate-200 dark:bg-slate-800" />

      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid gap-8 max-w-5xl mx-auto"
      >
        <motion.div variants={item}>
          <Card className="border-l-4 border-l-sky-500 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-sky-100 dark:bg-sky-900/50 flex items-center justify-center text-sky-600 font-bold">1</div>
                <CardTitle className="text-xl">Estados del Flujo</CardTitle>
              </div>
              <CardDescription className="ml-11">
                Entiende cada columna del tablero de logística.
              </CardDescription>
            </CardHeader>
            <CardContent className="ml-11">
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { title: "Por Atender", icon: Clock, color: "text-slate-500", bg: "bg-slate-100", desc: "Pedidos nuevos confirmados." },
                  { title: "Picking", icon: Package, color: "text-orange-500", bg: "bg-orange-100", desc: "En preparación en almacén." },
                  { title: "En Ruta", icon: Truck, color: "text-blue-500", bg: "bg-blue-100", desc: "Salida a distribución." },
                  { title: "Entregado", icon: CheckSquare, color: "text-green-500", bg: "bg-green-100", desc: "Recibido por cliente." },
                ].map((state, i) => (
                  <div key={i} className="flex flex-col gap-2 p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-md ${state.bg} dark:bg-opacity-20`}>
                        <state.icon className={`h-4 w-4 ${state.color}`} />
                      </div>
                      <span className="font-semibold text-sm">{state.title}</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{state.desc}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="border-l-4 border-l-indigo-500 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 font-bold">2</div>
                <CardTitle className="text-xl">Gestión Visual</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="ml-11">
              <div className="flex items-start gap-4">
                <div className="relative min-w-[200px] p-3 bg-white dark:bg-slate-800 rounded shadow-md border border-slate-200 dark:border-slate-700">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-slate-400">#PED-001</span>
                    <div className="h-2 w-2 rounded-full bg-green-500" title="A tiempo" />
                  </div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200 mb-1">Cliente Empresa S.A.</div>
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <MapPin className="h-3 w-3" /> Lima, Centro
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
                    <div className="h-6 w-6 rounded-full bg-indigo-100 flex items-center justify-center text-xs text-indigo-600 font-bold">JP</div>
                    <span className="text-xs text-slate-400">Hoy 14:00</span>
                  </div>
                </div>
                <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                  <p><strong>Tarjetas de Pedido:</strong> Contienen toda la info clave sin necesidad de abrir el detalle.</p>
                  <p><strong>Arrastrar y Soltar:</strong> Mueve las tarjetas entre columnas para actualizar su estado instantáneamente.</p>
                  <p><strong>Asignación:</strong> Verás las iniciales del transportista responsable en la parte inferior.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  )
}



