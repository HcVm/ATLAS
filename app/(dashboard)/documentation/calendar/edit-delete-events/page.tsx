"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, CalendarCheck, Edit2, Trash2, AlertTriangle, Save } from "lucide-react"
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

export default function EditDeleteEventsPage() {
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
          <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
            <CalendarCheck className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              Editar y Eliminar Eventos
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Modifica tu agenda o cancela reuniones existentes
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
          <Card className="border-l-4 border-l-indigo-500 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 font-bold">1</div>
                <CardTitle className="text-xl">Selección</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="ml-11">
              <div className="flex items-center gap-4 p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 rounded flex items-center justify-center font-bold text-indigo-600 text-xs shadow-sm">
                  14
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Haz clic sobre cualquier tarjeta de evento en el calendario para abrir la vista de detalles.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="border-l-4 border-l-blue-500 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 font-bold">2</div>
                <CardTitle className="text-xl">Modificación</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="ml-11">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Edit2 className="h-5 w-5 text-blue-500 mt-1" />
                  <div>
                    <h4 className="font-semibold text-slate-700 dark:text-slate-200">Editar Datos</h4>
                    <p className="text-sm text-slate-500">
                      Usa el icono de lápiz para desbloquear los campos. Puedes cambiar hora, lugar, descripción o invitados.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Save className="h-5 w-5 text-blue-500 mt-1" />
                  <div>
                    <h4 className="font-semibold text-slate-700 dark:text-slate-200">Guardar Cambios</h4>
                    <p className="text-sm text-slate-500">
                      Confirma la actualización. Si el evento tiene invitados, se les notificará del cambio.
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
                <CardTitle className="text-xl">Eliminación</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="ml-11">
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-800 space-y-3">
                <div className="flex items-center gap-2 text-red-700 dark:text-red-300 font-bold">
                  <Trash2 className="h-5 w-5" /> Borrar Evento
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Usa el icono de papelera para cancelar.
                </p>
                <div className="flex items-center gap-2 text-xs text-red-600 bg-red-100 dark:bg-red-900/30 p-2 rounded">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Esta acción es irreversible.</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  )
}



