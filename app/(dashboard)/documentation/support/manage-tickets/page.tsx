"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Ticket, Search, Filter, Eye } from "lucide-react"
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

export default function ManageTicketsPage() {
  return (
    <div className="flex flex-col gap-8 p-6 md:p-12 min-h-[calc(100vh-4rem)]">
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
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
            <Ticket className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-slate-900 via-slate-700 to-slate-600 dark:from-white dark:via-slate-200 dark:to-slate-400 bg-clip-text text-transparent">
              Gestión de Tickets
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Visualiza, filtra y da seguimiento a tus solicitudes de soporte
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
          <Card className="border-none shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-md overflow-hidden border-l-4 border-l-blue-500">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 font-bold">1</div>
                <CardTitle className="text-xl">Panel de Tickets</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="ml-11">
              <div className="flex items-start gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                <Ticket className="h-6 w-6 text-blue-500 mt-1" />
                <div>
                  <h4 className="font-semibold text-slate-700 dark:text-slate-200">Vista General</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                    Accede a la sección <strong>"Soporte"</strong> para ver un listado completo de todos los tickets que has creado o que te han sido asignados. Cada fila muestra el estado actual, la prioridad y la fecha de creación.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="border-none shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-md overflow-hidden border-l-4 border-l-indigo-500">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 font-bold">2</div>
                <CardTitle className="text-xl">Búsqueda y Filtros</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="ml-11">
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-100 dark:border-indigo-800/50">
                  <Filter className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  <p className="text-sm text-indigo-900 dark:text-indigo-200">
                    Utiliza las herramientas de la barra superior para organizar tu vista.
                  </p>
                </div>
                <div className="grid sm:grid-cols-3 gap-3 text-sm">
                  <div className="p-3 border border-slate-100 dark:border-slate-800 rounded-lg bg-slate-50/50 dark:bg-slate-800/50 text-center">
                    <Search className="h-5 w-5 mx-auto mb-2 text-slate-500" />
                    <span className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Búsqueda</span>
                    <p className="text-slate-500 text-xs">Por palabras clave en asunto o descripción.</p>
                  </div>
                  <div className="p-3 border border-slate-100 dark:border-slate-800 rounded-lg bg-slate-50/50 dark:bg-slate-800/50 text-center">
                    <div className="h-5 w-5 mx-auto mb-2 rounded-full border-2 border-slate-400 border-t-transparent animate-spin" style={{ animationDuration: '3s' }}></div>
                    <span className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Estado</span>
                    <p className="text-slate-500 text-xs">Abierto, En Progreso, Resuelto, Cerrado.</p>
                  </div>
                  <div className="p-3 border border-slate-100 dark:border-slate-800 rounded-lg bg-slate-50/50 dark:bg-slate-800/50 text-center">
                    <div className="h-5 w-5 mx-auto mb-2 flex items-center justify-center">
                      <span className="block w-2 h-2 rounded-full bg-red-500 mr-1"></span>
                      <span className="block w-2 h-2 rounded-full bg-yellow-500 mr-1"></span>
                      <span className="block w-2 h-2 rounded-full bg-green-500"></span>
                    </div>
                    <span className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Prioridad</span>
                    <p className="text-slate-500 text-xs">Alta, Media, Baja.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="border-none shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-md overflow-hidden border-l-4 border-l-violet-500">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center text-violet-600 font-bold">3</div>
                <CardTitle className="text-xl">Detalle y Seguimiento</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="ml-11">
              <div className="flex items-start gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                <Eye className="h-6 w-6 text-violet-500 mt-1" />
                <div>
                  <h4 className="font-semibold text-slate-700 dark:text-slate-200">Vista Completa</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                    Haz clic en cualquier ticket para ver toda la conversación, los archivos adjuntos y quién está atendiendo tu solicitud.
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


