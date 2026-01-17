"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Filter, Layers, List, CheckSquare } from "lucide-react"
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

export default function FilterByCategoryPage() {
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
          <div className="p-3 bg-teal-100 dark:bg-teal-900/30 rounded-xl">
            <Filter className="h-8 w-8 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              Filtrar por Categoría
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Organiza tu vista del calendario enfocándote en lo importante
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
          <Card className="border-l-4 border-l-teal-500 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center text-teal-600 font-bold">1</div>
                <CardTitle className="text-xl">Panel de Categorías</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="ml-11">
              <div className="flex items-start gap-4 p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                <Layers className="h-6 w-6 text-teal-500 mt-1" />
                <div>
                  <h4 className="font-semibold text-slate-700 dark:text-slate-200">Barra Lateral</h4>
                  <p className="text-sm text-slate-500">
                    A la izquierda (o en el menú superior en móviles), encontrarás la lista de tipos de evento: Reuniones, Tareas, Personales, etc.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="border-l-4 border-l-cyan-500 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-cyan-100 dark:bg-cyan-900/50 flex items-center justify-center text-cyan-600 font-bold">2</div>
                <CardTitle className="text-xl">Selección Múltiple</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="ml-11">
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                  <div className="h-5 w-5 rounded border-2 border-cyan-500 bg-cyan-500 flex items-center justify-center text-white">
                    <CheckSquare className="h-3 w-3" />
                  </div>
                  <span className="text-sm font-medium">Reuniones</span>
                  <div className="h-2 w-2 rounded-full bg-blue-500 ml-auto" />
                </div>
                <div className="flex items-center gap-3 p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                  <div className="h-5 w-5 rounded border-2 border-slate-300 dark:border-slate-600" />
                  <span className="text-sm font-medium text-slate-500">Tareas</span>
                  <div className="h-2 w-2 rounded-full bg-orange-500 ml-auto" />
                </div>
                <p className="text-xs text-slate-500 mt-2 pl-2">
                  Marca o desmarca las casillas para mostrar u ocultar grupos de eventos al instante.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="border-l-4 border-l-sky-500 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-sky-100 dark:bg-sky-900/50 flex items-center justify-center text-sky-600 font-bold">3</div>
                <CardTitle className="text-xl">Vista Personalizada</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="ml-11">
              <div className="p-4 bg-sky-50 dark:bg-sky-900/20 rounded-lg border border-sky-100 dark:border-sky-800 flex items-center gap-3">
                <List className="h-5 w-5 text-sky-600" />
                <p className="text-sm text-sky-900 dark:text-sky-200">
                  El sistema recordará tu última selección de filtros para la próxima vez que entres al calendario.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  )
}



