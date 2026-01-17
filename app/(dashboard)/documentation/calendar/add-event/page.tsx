"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, CalendarPlus, Clock, AlignLeft, Tag, Users } from "lucide-react"
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

export default function AddEventPage() {
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
          <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
            <CalendarPlus className="h-8 w-8 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              Añadir un Nuevo Evento
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Programa reuniones, tareas y recordatorios en el calendario compartido
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
          <Card className="border-l-4 border-l-purple-500 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-purple-600 font-bold">1</div>
                <CardTitle className="text-xl">Iniciar Creación</CardTitle>
              </div>
              <CardDescription className="ml-11">
                Dos formas rápidas de agendar.
              </CardDescription>
            </CardHeader>
            <CardContent className="ml-11">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-center">
                  <span className="block text-2xl font-bold text-purple-600 mb-1">+</span>
                  <p className="text-sm text-slate-600 dark:text-slate-300">Botón flotante "Nuevo Evento"</p>
                </div>
                <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-center">
                  <span className="block text-2xl font-bold text-purple-600 mb-1">Click</span>
                  <p className="text-sm text-slate-600 dark:text-slate-300">Directamente en una celda de día/hora</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="border-l-4 border-l-fuchsia-500 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-fuchsia-100 dark:bg-fuchsia-900/50 flex items-center justify-center text-fuchsia-600 font-bold">2</div>
                <CardTitle className="text-xl">Detalles del Evento</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="ml-11">
              <div className="space-y-4">
                {[
                  { icon: AlignLeft, label: "Título y Descripción", desc: "Nombre claro y detalles de la agenda." },
                  { icon: Clock, label: "Fecha y Hora", desc: "Define inicio/fin o marca 'Todo el día'." },
                  { icon: Tag, label: "Categoría", desc: "Color para diferenciar (Reunión, Tarea, etc.)." },
                  { icon: Users, label: "Invitados", desc: "Añade participantes para que reciban notificación." }
                ].map((field, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <field.icon className="h-5 w-5 text-fuchsia-500 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-slate-700 dark:text-slate-200">{field.label}</h4>
                      <p className="text-sm text-slate-500">{field.desc}</p>
                    </div>
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
                <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 font-bold">3</div>
                <CardTitle className="text-xl">Confirmación</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="ml-11">
              <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-100 dark:border-indigo-800">
                <p className="text-sm text-indigo-800 dark:text-indigo-200">
                  Al guardar, el evento aparecerá instantáneamente en el calendario de todos los invitados y se enviarán las notificaciones correspondientes.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  )
}



