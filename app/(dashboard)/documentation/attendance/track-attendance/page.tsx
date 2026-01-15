"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Clock, MapPin, Calendar, Smartphone, Globe, AlertTriangle } from "lucide-react"
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

export default function TrackAttendancePage() {
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
          <div className="p-3 bg-pink-100 dark:bg-pink-900/30 rounded-xl">
            <Clock className="h-8 w-8 text-pink-600 dark:text-pink-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              Registro de Asistencia
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Control de horarios y marcaciones biométricas
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
          <Card className="border-l-4 border-l-pink-500 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-pink-100 dark:bg-pink-900/50 flex items-center justify-center text-pink-600 font-bold">1</div>
                <CardTitle className="text-xl">Marcar Entrada/Salida</CardTitle>
              </div>
              <CardDescription className="ml-11">
                Registra tu jornada laboral diariamente.
              </CardDescription>
            </CardHeader>
            <CardContent className="ml-11">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center gap-3 shadow-sm">
                  <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                    <Smartphone className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800 dark:text-slate-200">Desde la App/Web</h4>
                    <p className="text-sm text-slate-500">Usa el botón "Marcar Asistencia" en el dashboard principal.</p>
                  </div>
                </div>
                <div className="flex-1 p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center gap-3 shadow-sm">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Globe className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800 dark:text-slate-200">Hora del Servidor</h4>
                    <p className="text-sm text-slate-500">El sistema usa la hora oficial de red, no la de tu dispositivo.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="border-l-4 border-l-violet-500 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center text-violet-600 font-bold">2</div>
                <CardTitle className="text-xl">Geolocalización</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="ml-11">
              <div className="flex items-start gap-4 p-4 bg-violet-50 dark:bg-violet-900/20 rounded-lg">
                <MapPin className="h-6 w-6 text-violet-500 mt-1" />
                <div>
                  <h4 className="font-semibold text-violet-900 dark:text-violet-200">Validación de Ubicación</h4>
                  <p className="text-sm text-violet-700 dark:text-violet-300 mt-1">
                    Para personal de campo o remoto, el sistema solicitará acceso a tu GPS al momento de marcar. 
                    Asegúrate de conceder los permisos en tu navegador o celular.
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
                <CardTitle className="text-xl">Historial y Regularizaciones</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="ml-11">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-slate-500" />
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Consulta tus marcas pasadas en la vista de Calendario.
                  </p>
                </div>
                <div className="flex items-start gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded border border-orange-100 dark:border-orange-800">
                  <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5" />
                  <div className="text-sm text-orange-800 dark:text-orange-200">
                    <strong>¿Olvidaste marcar?</strong> No te preocupes. Usa el módulo de <Link href="/documentation/requests/create-request" className="underline hover:text-orange-600">Solicitudes</Link> para justificar la omisión o tardanza.
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
