"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, MessageSquare, Ticket, Send, FileText } from "lucide-react"
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

export default function AddTicketCommentsPage() {
  return (
    <div className="flex flex-col gap-8 p-6 md:p-12 min-h-[calc(100vh-4rem)]">
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
            <MessageSquare className="h-8 w-8 text-cyan-600 dark:text-cyan-400" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-slate-900 via-slate-700 to-slate-600 dark:from-white dark:via-slate-200 dark:to-slate-400 bg-clip-text text-transparent">
              Comentarios en Tickets
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Mantén una comunicación fluida con el equipo de soporte
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
          <Card className="border-none shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-md overflow-hidden border-l-4 border-l-cyan-500">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-cyan-100 dark:bg-cyan-900/50 flex items-center justify-center text-cyan-600 font-bold">1</div>
                <CardTitle className="text-xl">Acceder al Ticket</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="ml-11">
              <div className="flex items-start gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                <Ticket className="h-6 w-6 text-cyan-500 mt-1" />
                <div>
                  <h4 className="font-semibold text-slate-700 dark:text-slate-200">Selección</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                    En tu lista de tickets, haz clic en el <strong>Asunto</strong> o título del caso que deseas actualizar. Esto te llevará a la vista detallada del incidente.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="border-none shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-md overflow-hidden border-l-4 border-l-sky-500">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-sky-100 dark:bg-sky-900/50 flex items-center justify-center text-sky-600 font-bold">2</div>
                <CardTitle className="text-xl">Redactar Respuesta</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="ml-11">
              <div className="space-y-4">
                <div className="p-4 bg-sky-50 dark:bg-sky-900/20 rounded-lg border border-sky-100 dark:border-sky-800/50">
                  <h4 className="font-semibold text-slate-700 dark:text-slate-200 mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Historial y Nueva Entrada
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Desplázate hacia abajo hasta la sección <strong>"Actividad"</strong> o <strong>"Comentarios"</strong>. Encontrarás un cuadro de texto para escribir tu mensaje.
                  </p>
                </div>
                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  <div className="p-3 border border-slate-100 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900">
                    <span className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Actualizaciones</span>
                    <p className="text-slate-500 text-xs">
                      Proporciona nueva información o responde preguntas del agente.
                    </p>
                  </div>
                  <div className="p-3 border border-slate-100 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900">
                    <span className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Archivos</span>
                    <p className="text-slate-500 text-xs">
                      Puedes adjuntar capturas de pantalla adicionales si es necesario.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="border-none shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-md overflow-hidden border-l-4 border-l-blue-500">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 font-bold">3</div>
                <CardTitle className="text-xl">Enviar</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="ml-11">
              <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                <div className="p-3 bg-blue-100 rounded-full">
                  <Send className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-700 dark:text-slate-200">Notificación Instantánea</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Al hacer clic en <strong>"Enviar Comentario"</strong>, el equipo de soporte será notificado y tu mensaje quedará registrado permanentemente en el historial del caso.
                  </p>
                </div>
              </div>
              <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/50 rounded-lg text-xs text-amber-700 dark:text-amber-300">
                <strong>Nota:</strong> No crees un nuevo ticket para el mismo problema; mantén toda la conversación en un solo hilo.
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  )
}
