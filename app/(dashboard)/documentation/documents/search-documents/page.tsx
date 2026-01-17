"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Search, Filter, Calendar, XCircle, ListFilter } from "lucide-react"
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

export default function SearchDocumentsPage() {
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
          <div className="p-3 bg-violet-100 dark:bg-violet-900/30 rounded-xl">
            <Search className="h-8 w-8 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              Buscar y Filtrar Documentos
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Encuentra rápidamente la información que necesitas
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
          <Card className="border-l-4 border-l-violet-500 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center text-violet-600 font-bold">1</div>
                <CardTitle className="text-xl">Búsqueda Inteligente</CardTitle>
              </div>
              <CardDescription className="ml-11">
                Localiza archivos por contenido clave.
              </CardDescription>
            </CardHeader>
            <CardContent className="ml-11">
              <div className="flex items-center gap-4 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <div className="w-full pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm text-slate-500">
                    Escribe título, descripción o código...
                  </div>
                </div>
                <div className="hidden sm:block text-xs text-slate-400">
                  Presiona <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded border border-slate-300 dark:border-slate-600 font-mono">Enter</kbd>
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
                <CardTitle className="text-xl">Filtros Avanzados</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="ml-11">
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { label: "Tipo", icon: ListFilter, desc: "Contratos, Facturas, Manuales" },
                  { label: "Fecha", icon: Calendar, desc: "Rango de emisión o creación" },
                  { label: "Área", icon: Filter, desc: "Departamento propietario" },
                  { label: "Estado", icon: CheckCircle, desc: "Borrador, Publicado, Archivado" }
                ].map((f, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800">
                    <f.icon className="h-5 w-5 text-fuchsia-500" />
                    <div>
                      <span className="font-medium text-slate-700 dark:text-slate-200 text-sm">{f.label}</span>
                      <p className="text-xs text-slate-500">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="border-l-4 border-l-rose-500 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center text-rose-600 font-bold">3</div>
                <CardTitle className="text-xl">Restablecer Vista</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="ml-11">
              <div className="flex items-center justify-between p-4 bg-rose-50 dark:bg-rose-900/20 rounded-lg border border-rose-100 dark:border-rose-900/50">
                <div className="flex items-center gap-2 text-rose-800 dark:text-rose-200">
                  <XCircle className="h-5 w-5" />
                  <span className="font-medium text-sm">Limpiar Filtros</span>
                </div>
                <p className="text-xs text-rose-600 dark:text-rose-300">
                  Usa este botón para eliminar todos los criterios y volver a ver la lista completa.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  )
}

function CheckCircle(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}



