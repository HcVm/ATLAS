"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Briefcase, Target, TrendingUp, Users, DollarSign } from "lucide-react"
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

export default function CrmGuidePage() {
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
            <Briefcase className="h-8 w-8 text-sky-600 dark:text-sky-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              Gestión de Oportunidades (CRM)
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Optimiza tu proceso comercial y maximiza las conversiones
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
                <CardTitle className="text-xl">Crear una Oportunidad</CardTitle>
              </div>
              <CardDescription className="ml-11">
                Registra cada nuevo prospecto en el sistema.
              </CardDescription>
            </CardHeader>
            <CardContent className="ml-11">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 mb-2 font-semibold text-slate-700 dark:text-slate-200">
                    <Users className="h-4 w-4 text-sky-500" /> Cliente
                  </div>
                  <p className="text-sm text-slate-500">Vincula la oportunidad a una empresa o contacto existente.</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 mb-2 font-semibold text-slate-700 dark:text-slate-200">
                    <DollarSign className="h-4 w-4 text-green-500" /> Valor Estimado
                  </div>
                  <p className="text-sm text-slate-500">Proyección económica del negocio para el forecast.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="border-l-4 border-l-indigo-500 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 font-bold">2</div>
                <CardTitle className="text-xl">Pipeline de Ventas</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="ml-11">
              <div className="relative flex justify-between items-center bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
                {["Prospecto", "Calificado", "Propuesta", "Negociación", "Cierre"].map((stage, i) => (
                  <div key={i} className="flex flex-col items-center min-w-[80px] z-10">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mb-2 ${
                      i === 4 ? "bg-green-100 text-green-700" : "bg-indigo-100 text-indigo-600"
                    }`}>
                      {i + 1}
                    </div>
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{stage}</span>
                  </div>
                ))}
                <div className="absolute top-[30px] left-0 w-full h-0.5 bg-slate-200 dark:bg-slate-700 z-0" />
              </div>
              <p className="mt-4 text-sm text-slate-500">
                <TrendingUp className="inline h-4 w-4 mr-1 text-indigo-500" />
                Arrastra y suelta las tarjetas entre columnas para avanzar el estado del negocio.
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="border-l-4 border-l-purple-500 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-purple-600 font-bold">3</div>
                <CardTitle className="text-xl">Seguimiento 360°</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="ml-11">
              <div className="flex items-start gap-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <Target className="h-10 w-10 text-purple-500" />
                <div>
                  <h4 className="font-semibold text-purple-900 dark:text-purple-200">Bitácora de Actividades</h4>
                  <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                    Registra cada interacción (llamadas, emails, reuniones) dentro de la ficha del cliente. 
                    El sistema te enviará recordatorios automáticos para las tareas pendientes.
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



