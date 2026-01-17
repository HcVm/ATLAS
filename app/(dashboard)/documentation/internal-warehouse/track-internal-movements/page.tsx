"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Truck, PlusCircle, FileText, ArrowRightCircle, AlertTriangle, Trash2 } from "lucide-react"
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

export default function TrackInternalMovementsPage() {
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
          <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
            <Truck className="h-8 w-8 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              Seguimiento de Movimientos
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Control de entradas, salidas y trazabilidad de activos
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
          <Card className="border-l-4 border-l-orange-500 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center text-orange-600 font-bold">1</div>
                <CardTitle className="text-xl">Tipos de Movimientos</CardTitle>
              </div>
              <CardDescription className="ml-11">
                Conoce las diferentes operaciones disponibles en el sistema.
              </CardDescription>
            </CardHeader>
            <CardContent className="ml-11">
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { title: "Entrada", icon: PlusCircle, color: "text-green-500", desc: "Ingreso de nuevo stock. Genera seriales nuevos." },
                  { title: "Asignación", icon: ArrowRightCircle, color: "text-blue-500", desc: "Entrega a personal o departamentos." },
                  { title: "Ajuste", icon: AlertTriangle, color: "text-yellow-500", desc: "Corrección de inventario por errores." },
                  { title: "Baja", icon: Trash2, color: "text-red-500", desc: "Retiro permanente por daño o pérdida." },
                ].map((type, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 shadow-sm">
                    <type.icon className={`h-5 w-5 mt-0.5 ${type.color}`} />
                    <div>
                      <h3 className="font-semibold text-slate-800 dark:text-slate-200">{type.title}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 leading-snug">{type.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="border-l-4 border-l-blue-500 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 font-bold">2</div>
                <CardTitle className="text-xl">Registrar un Nuevo Movimiento</CardTitle>
              </div>
              <CardDescription className="ml-11">
                Proceso paso a paso para documentar operaciones.
              </CardDescription>
            </CardHeader>
            <CardContent className="ml-11">
              <div className="space-y-4">
                <p className="text-slate-600 dark:text-slate-300">
                  Haz clic en <strong><PlusCircle className="inline h-4 w-4 text-blue-500" /> Registrar Nuevo Movimiento</strong>:
                </p>
                <div className="flex flex-col gap-2">
                  {[
                    "Selecciona Categoría y Producto.",
                    "Elige el Tipo de Movimiento adecuado.",
                    "Para productos serializados: Ingresa cantidad (Entrada) o escanea seriales (Salida).",
                    "Completa Motivo y Solicitante.",
                  ].map((step, i) => (
                    <div key={i} className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-900/50 rounded-md">
                      <div className="h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-400">
                        {i + 1}
                      </div>
                      <span className="text-sm text-slate-700 dark:text-slate-300">{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  )
}



