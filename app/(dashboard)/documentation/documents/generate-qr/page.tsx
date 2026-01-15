"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, QrCode, Smartphone, Download, Printer, Share2 } from "lucide-react"
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

export default function GenerateQrPage() {
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
          <div className="p-3 bg-slate-200 dark:bg-slate-800 rounded-xl">
            <QrCode className="h-8 w-8 text-slate-700 dark:text-slate-300" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              Generar Códigos QR
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Acceso rápido a documentos mediante escaneo móvil
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
          <Card className="border-l-4 border-l-slate-500 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 font-bold">1</div>
                <CardTitle className="text-xl">Localizar la Opción</CardTitle>
              </div>
              <CardDescription className="ml-11">
                Disponible en la vista de detalle de cualquier documento público.
              </CardDescription>
            </CardHeader>
            <CardContent className="ml-11">
              <div className="flex items-center gap-4 p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                <Share2 className="h-6 w-6 text-slate-400" />
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Busca el botón <strong className="inline-flex items-center px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded border border-slate-300 dark:border-slate-700 text-xs"><QrCode className="h-3 w-3 mr-1"/> QR</strong> en la barra de herramientas superior del documento.
                  </p>
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
                <CardTitle className="text-xl">Usos del Código</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="ml-11">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex flex-col items-center text-center gap-2">
                  <Smartphone className="h-8 w-8 text-blue-500" />
                  <h4 className="font-semibold text-blue-900 dark:text-blue-200">Acceso Móvil</h4>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    Permite a los usuarios abrir el documento en sus celulares sin necesidad de iniciar sesión (si es público).
                  </p>
                </div>
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex flex-col items-center text-center gap-2">
                  <Printer className="h-8 w-8 text-blue-500" />
                  <h4 className="font-semibold text-blue-900 dark:text-blue-200">Etiquetado Físico</h4>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    Imprime el QR y pégalo en carpetas, expedientes o activos para vincularlos con su registro digital.
                  </p>
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
                <CardTitle className="text-xl">Descarga</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="ml-11">
              <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="h-16 w-16 bg-white p-1 border border-slate-200 rounded">
                    <QrCode className="h-full w-full text-black" />
                  </div>
                  <div className="space-y-1">
                    <span className="font-medium text-slate-900 dark:text-slate-100">Código Generado</span>
                    <p className="text-xs text-slate-500">Formato PNG de alta calidad</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-medium cursor-pointer hover:underline">
                  <Download className="h-4 w-4" /> Guardar
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  )
}
