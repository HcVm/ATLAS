"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Rss, Bell, Newspaper, MousePointer } from "lucide-react"
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

export default function ViewNewsFeedPage() {
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
          <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
            <Rss className="h-8 w-8 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              Feed de Noticias
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Mantente informado con los últimos anuncios y actualizaciones corporativas
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
          <Card className="border-l-4 border-l-orange-500 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center text-orange-600 font-bold">1</div>
                <CardTitle className="text-xl">Acceso a Noticias</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="ml-11">
              <div className="flex items-start gap-4 p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                <Newspaper className="h-6 w-6 text-orange-500 mt-1" />
                <div>
                  <h4 className="font-semibold text-slate-700 dark:text-slate-200">Centro de Novedades</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                    Encuentra la sección <strong>"Noticias"</strong> en el menú lateral. Aquí se centralizan todos los comunicados oficiales, actualizaciones del sistema y anuncios importantes de la empresa.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="border-l-4 border-l-amber-500 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600 font-bold">2</div>
                <CardTitle className="text-xl">Exploración del Feed</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="ml-11">
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                  <MousePointer className="h-5 w-5 text-amber-600" />
                  <p className="text-sm text-amber-900 dark:text-amber-200">
                    Las publicaciones aparecen en orden cronológico inverso (lo más nuevo arriba).
                  </p>
                </div>
                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  <div className="p-3 border rounded-lg bg-slate-50 dark:bg-slate-900">
                    <span className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Vista Previa</span>
                    <p className="text-slate-500 text-xs">
                      Muestra el título, fecha y un resumen breve. Haz clic para expandir.
                    </p>
                  </div>
                  <div className="p-3 border rounded-lg bg-slate-50 dark:bg-slate-900">
                    <span className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Multimedia</span>
                    <p className="text-slate-500 text-xs">
                      Las noticias pueden incluir imágenes o documentos adjuntos importantes.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="border-l-4 border-l-yellow-500 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-yellow-100 dark:bg-yellow-900/50 flex items-center justify-center text-yellow-600 font-bold">3</div>
                <CardTitle className="text-xl">Interacción</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="ml-11">
              <div className="flex items-start gap-4 p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                <Bell className="h-6 w-6 text-yellow-500 mt-1" />
                <div>
                  <h4 className="font-semibold text-slate-700 dark:text-slate-200">Participación</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                    Si está habilitado, puedes dejar <strong>comentarios</strong> o reaccionar a las publicaciones para dar feedback o confirmar la lectura de comunicados importantes.
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
