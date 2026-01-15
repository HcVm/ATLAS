"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, CheckCircle, XCircle, Clock, AlertCircle, FileText } from "lucide-react"
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

export default function ManageApprovalsPage() {
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
          <div className="p-3 bg-lime-100 dark:bg-lime-900/30 rounded-xl">
            <CheckCircle className="h-8 w-8 text-lime-600 dark:text-lime-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              Gestionar Aprobaciones
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Supervisión y autorización de solicitudes del equipo
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
          <Card className="border-l-4 border-l-lime-500 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-lime-100 dark:bg-lime-900/50 flex items-center justify-center text-lime-600 font-bold">1</div>
                <CardTitle className="text-xl">Bandeja de Pendientes</CardTitle>
              </div>
              <CardDescription className="ml-11">
                Identifica rápidamente qué requiere tu atención.
              </CardDescription>
            </CardHeader>
            <CardContent className="ml-11">
              <div className="flex items-center gap-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-100 dark:border-yellow-900/50">
                <Clock className="h-8 w-8 text-yellow-500" />
                <div>
                  <h4 className="font-semibold text-yellow-900 dark:text-yellow-200">Notificaciones</h4>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    Las solicitudes pendientes aparecerán marcadas con un punto amarillo en tu dashboard.
                    Recibirás también una alerta por correo electrónico.
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
                <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 font-bold">2</div>
                <CardTitle className="text-xl">Acciones de Aprobación</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="ml-11">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-lg flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-300 font-bold">
                    <CheckCircle className="h-5 w-5" /> Aprobar
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Autoriza la solicitud. Si hay múltiples niveles (ej. Jefe > Gerente > RRHH), pasará automáticamente al siguiente aprobador.
                  </p>
                </div>
                
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-lg flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-red-700 dark:text-red-300 font-bold">
                    <XCircle className="h-5 w-5" /> Rechazar
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Deniega la petición. Es <span className="font-semibold">obligatorio</span> ingresar un motivo para que el solicitante entienda la razón y pueda corregirla.
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
