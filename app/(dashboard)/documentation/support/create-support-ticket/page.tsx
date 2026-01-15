"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, LifeBuoy, AlertCircle, Laptop, Bell, Activity, CheckCircle } from "lucide-react"
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

export default function CreateSupportTicketPage() {
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
          <div className="p-3 bg-rose-100 dark:bg-rose-900/30 rounded-xl">
            <LifeBuoy className="h-8 w-8 text-rose-600 dark:text-rose-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              Crear un Ticket de Soporte
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Centro de ayuda y reporte de incidencias técnicas
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
          <Card className="border-l-4 border-l-rose-500 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center text-rose-600 font-bold">1</div>
                <CardTitle className="text-xl">Formulario de Incidencia</CardTitle>
              </div>
              <CardDescription className="ml-11">
                Proporciona la información clave para que podamos ayudarte.
              </CardDescription>
            </CardHeader>
            <CardContent className="ml-11">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                    <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-2">Campos Requeridos</h3>
                    <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                      <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Asunto (Título breve)</li>
                      <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Descripción detallada</li>
                      <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Categoría del problema</li>
                      <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Nivel de Prioridad</li>
                    </ul>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="font-semibold text-slate-700 dark:text-slate-200">Niveles de Prioridad</h3>
                  <div className="space-y-2">
                    {[
                      { label: "Baja", desc: "Consultas, dudas menores", color: "bg-blue-100 text-blue-700" },
                      { label: "Media", desc: "Problemas no críticos", color: "bg-yellow-100 text-yellow-700" },
                      { label: "Alta", desc: "Afecta el trabajo", color: "bg-orange-100 text-orange-700" },
                      { label: "Urgente", desc: "Detención total", color: "bg-red-100 text-red-700" },
                    ].map((p, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${p.color}`}>{p.label}</span>
                        <span className="text-xs text-slate-500">{p.desc}</span>
                      </div>
                    ))}
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
                <CardTitle className="text-xl">Ciclo de Vida del Ticket</CardTitle>
              </div>
              <CardDescription className="ml-11">
                Entiende cómo procesamos tu solicitud.
              </CardDescription>
            </CardHeader>
            <CardContent className="ml-11">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-50 dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="text-center">
                  <div className="mx-auto w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mb-2">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                  <span className="font-semibold text-sm">Abierto</span>
                </div>
                <div className="h-0.5 w-12 bg-slate-300 dark:bg-slate-700 hidden md:block" />
                <div className="text-center">
                  <div className="mx-auto w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600 mb-2">
                    <Activity className="h-5 w-5" />
                  </div>
                  <span className="font-semibold text-sm">En Progreso</span>
                </div>
                <div className="h-0.5 w-12 bg-slate-300 dark:bg-slate-700 hidden md:block" />
                <div className="text-center">
                  <div className="mx-auto w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 mb-2">
                    <CheckCircle className="h-5 w-5" />
                  </div>
                  <span className="font-semibold text-sm">Resuelto</span>
                </div>
              </div>
              
              <div className="mt-4 flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-800 dark:text-blue-200">
                <Bell className="h-5 w-5" />
                <p className="text-sm">Recibirás notificaciones por correo y en la app cada vez que haya una actualización.</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  )
}
