"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, FileCheck, ClipboardList, Plane, ShoppingBag, Banknote, HelpCircle } from "lucide-react"
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

export default function CreateRequestPage() {
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
          <div className="p-3 bg-lime-100 dark:bg-lime-900/30 rounded-xl">
            <FileCheck className="h-8 w-8 text-lime-600 dark:text-lime-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              Crear una Solicitud
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Gestiona permisos, compras y requerimientos internos
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
          <Card className="border-l-4 border-l-lime-500 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-lime-100 dark:bg-lime-900/50 flex items-center justify-center text-lime-600 font-bold">1</div>
                <CardTitle className="text-xl">Tipos de Solicitud</CardTitle>
              </div>
              <CardDescription className="ml-11">
                Selecciona el formulario adecuado según tu necesidad.
              </CardDescription>
            </CardHeader>
            <CardContent className="ml-11">
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { title: "Vacaciones", icon: Plane, color: "text-blue-500", desc: "Ausencias planificadas." },
                  { title: "Compras", icon: ShoppingBag, color: "text-orange-500", desc: "Materiales y equipos." },
                  { title: "Anticipos", icon: Banknote, color: "text-green-500", desc: "Adelantos de sueldo." },
                  { title: "Servicios", icon: HelpCircle, color: "text-purple-500", desc: "Soporte de otras áreas." },
                ].map((type, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 shadow-sm hover:border-lime-200 transition-colors">
                    <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-full">
                      <type.icon className={`h-5 w-5 ${type.color}`} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-800 dark:text-slate-200">{type.title}</h4>
                      <p className="text-xs text-slate-500">{type.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="border-l-4 border-l-emerald-500 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 font-bold">2</div>
                <CardTitle className="text-xl">Completar el Formulario</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="ml-11">
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <ClipboardList className="h-6 w-6 text-emerald-500 mt-1" />
                  <div className="space-y-3 flex-1">
                    <p className="text-slate-600 dark:text-slate-300">
                      Cada solicitud requiere información específica para su aprobación:
                    </p>
                    <ul className="space-y-2">
                      <li className="flex items-center gap-2 text-sm bg-emerald-50 dark:bg-emerald-900/10 p-2 rounded text-emerald-900 dark:text-emerald-100">
                        <span className="font-bold">Motivo:</span> Justificación clara de la necesidad.
                      </li>
                      <li className="flex items-center gap-2 text-sm bg-emerald-50 dark:bg-emerald-900/10 p-2 rounded text-emerald-900 dark:text-emerald-100">
                        <span className="font-bold">Fechas:</span> Periodo de inicio y fin (si aplica).
                      </li>
                      <li className="flex items-center gap-2 text-sm bg-emerald-50 dark:bg-emerald-900/10 p-2 rounded text-emerald-900 dark:text-emerald-100">
                        <span className="font-bold">Monto:</span> Presupuesto estimado para compras.
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  )
}



