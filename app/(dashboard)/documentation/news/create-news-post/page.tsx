"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Megaphone, Edit, Image as ImageIcon, Send } from "lucide-react"
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

export default function CreateNewsPostPage() {
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
          <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl">
            <Megaphone className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              Crear Publicación
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Difunde información importante a toda la organización
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
          <Card className="border-l-4 border-l-red-500 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center text-red-600 font-bold">1</div>
                <CardTitle className="text-xl">Iniciar Redacción</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="ml-11">
              <div className="flex items-start gap-4 p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                <Edit className="h-6 w-6 text-red-500 mt-1" />
                <div>
                  <h4 className="font-semibold text-slate-700 dark:text-slate-200">Botón de Creación</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                    En el módulo de Noticias, busca el botón <strong>"Crear Noticia"</strong> (generalmente un icono <span className="inline-flex items-center justify-center w-5 h-5 bg-slate-200 rounded text-xs font-bold">+</span>). Esto abrirá el editor de contenido.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="border-l-4 border-l-rose-500 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center text-rose-600 font-bold">2</div>
                <CardTitle className="text-xl">Contenido y Formato</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="ml-11">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span> Título Atractivo
                  </div>
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span> Cuerpo del Mensaje
                  </div>
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span> Fecha de Publicación
                  </div>
                </div>
                <div className="p-4 bg-rose-50 dark:bg-rose-900/20 rounded-lg border border-rose-100 dark:border-rose-800 flex items-center gap-3">
                  <ImageIcon className="h-8 w-8 text-rose-500" />
                  <div>
                    <h5 className="font-semibold text-rose-900 dark:text-rose-200 text-sm">Multimedia</h5>
                    <p className="text-xs text-rose-700 dark:text-rose-300">
                      Enriquece tu noticia subiendo imágenes o adjuntando documentos relevantes.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="border-l-4 border-l-pink-500 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-pink-100 dark:bg-pink-900/50 flex items-center justify-center text-pink-600 font-bold">3</div>
                <CardTitle className="text-xl">Publicación</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="ml-11">
              <div className="flex items-center gap-4 p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="p-3 bg-green-100 rounded-full">
                  <Send className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-700 dark:text-slate-200">Lanzamiento</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Al hacer clic en <strong>"Publicar"</strong>, la noticia será visible inmediatamente para todos los usuarios en su Feed. Verifica el contenido antes de confirmar.
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



