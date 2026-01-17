"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Paperclip, FileText, UploadCloud, CheckCircle2 } from "lucide-react"
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

export default function UploadAttachmentsPage() {
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
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
            <Paperclip className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              Subir Archivos Adjuntos
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Centraliza la información adjuntando evidencias y anexos a tus documentos
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
          <Card className="border-l-4 border-l-blue-500 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 font-bold">1</div>
                <CardTitle className="text-xl">Seleccionar el Documento</CardTitle>
              </div>
              <CardDescription className="ml-11">
                Ubica el registro principal al que añadirás información.
              </CardDescription>
            </CardHeader>
            <CardContent className="ml-11">
              <div className="flex items-center gap-4 p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                <FileText className="h-10 w-10 text-slate-400" />
                <div>
                  <p className="text-slate-600 dark:text-slate-300 text-sm">
                    Navega a la lista de documentos y haz clic en el título del documento deseado para abrir su vista de detalles.
                  </p>
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
                <CardTitle className="text-xl">Panel de Adjuntos</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="ml-11">
              <p className="text-slate-600 dark:text-slate-300 mb-4">
                Busca la sección <strong className="text-indigo-600 dark:text-indigo-400">Archivos Adjuntos</strong> en la parte inferior o lateral de la ficha.
              </p>
              <div className="flex justify-center p-6 border-2 border-dashed border-indigo-200 dark:border-indigo-900 rounded-xl bg-indigo-50/50 dark:bg-indigo-900/10">
                <div className="text-center space-y-2">
                  <UploadCloud className="h-12 w-12 text-indigo-400 mx-auto" />
                  <p className="text-sm font-medium text-indigo-600 dark:text-indigo-300">Arrastra archivos aquí o haz clic para explorar</p>
                  <p className="text-xs text-slate-500">Soporta PDF, Imágenes, Excel (Máx 10MB)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="border-l-4 border-l-green-500 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center text-green-600 font-bold">3</div>
                <CardTitle className="text-xl">Confirmación de Carga</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="ml-11">
              <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-800">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                <p className="text-sm text-green-800 dark:text-green-200">
                  Una vez completada la barra de progreso, los archivos quedarán vinculados permanentemente al documento y estarán disponibles para descarga por los usuarios autorizados.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  )
}



