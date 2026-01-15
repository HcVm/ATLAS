"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, MessageSquare, Users, Image, Paperclip, Search, Hash } from "lucide-react"
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

export default function UseChatPage() {
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
          <div className="p-3 bg-violet-100 dark:bg-violet-900/30 rounded-xl">
            <MessageSquare className="h-8 w-8 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              Uso del Chat Corporativo
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Colaboración en tiempo real y comunicación segura
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
          <Card className="border-l-4 border-l-violet-500 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center text-violet-600 font-bold">1</div>
                <CardTitle className="text-xl">Iniciar una Conversación</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="ml-11">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
                  <div className="flex items-center gap-2 mb-2 font-semibold text-slate-700 dark:text-slate-200">
                    <Search className="h-4 w-4 text-violet-500" /> Buscar Usuarios
                  </div>
                  <p className="text-sm text-slate-500">Usa la barra lateral para encontrar compañeros por nombre o cargo.</p>
                </div>
                <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
                  <div className="flex items-center gap-2 mb-2 font-semibold text-slate-700 dark:text-slate-200">
                    <div className="h-2 w-2 rounded-full bg-green-500" /> Estado en Línea
                  </div>
                  <p className="text-sm text-slate-500">El indicador verde muestra quién está disponible para chatear ahora.</p>
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
                <CardTitle className="text-xl">Grupos y Canales</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="ml-11">
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-fuchsia-50 dark:bg-fuchsia-900/20 rounded-lg">
                    <Hash className="h-6 w-6 text-fuchsia-500" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800 dark:text-slate-200">Canales de Departamento</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Al unirte a la empresa, serás añadido automáticamente a los grupos de tu área (ej. #Ventas, #Logística).
                    </p>
                  </div>
                </div>
                <Separator className="bg-slate-100 dark:bg-slate-800" />
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-fuchsia-50 dark:bg-fuchsia-900/20 rounded-lg">
                    <Users className="h-6 w-6 text-fuchsia-500" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800 dark:text-slate-200">Grupos Personalizados</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Crea salas temporales para proyectos específicos invitando a los miembros necesarios.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="border-l-4 border-l-indigo-500 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 font-bold">3</div>
                <CardTitle className="text-xl">Compartir Archivos</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="ml-11">
              <div className="flex flex-col sm:flex-row gap-6 items-center bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-xl border border-indigo-100 dark:border-indigo-800 border-dashed">
                <div className="flex gap-2">
                  <div className="h-12 w-12 bg-white dark:bg-slate-800 rounded-lg shadow-sm flex items-center justify-center">
                    <Image className="h-6 w-6 text-indigo-500" />
                  </div>
                  <div className="h-12 w-12 bg-white dark:bg-slate-800 rounded-lg shadow-sm flex items-center justify-center">
                    <Paperclip className="h-6 w-6 text-indigo-500" />
                  </div>
                </div>
                <div className="text-center sm:text-left">
                  <h4 className="font-semibold text-indigo-900 dark:text-indigo-200">Drag & Drop</h4>
                  <p className="text-sm text-indigo-700 dark:text-indigo-300">
                    Arrastra imágenes, documentos PDF o Excel directamente a la ventana de chat para enviarlos instantáneamente.
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
