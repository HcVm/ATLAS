"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Building2, Plus, PenTool, LayoutGrid } from "lucide-react"
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

export default function CreateNewDepartmentPage() {
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
          <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
            <Building2 className="h-8 w-8 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              Crear Nuevo Departamento
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Estructura tu organización definiendo áreas operativas
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
          <Card className="border-l-4 border-l-orange-500 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center text-orange-600 font-bold">1</div>
                <CardTitle className="text-xl">Iniciar Registro</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="ml-11">
              <div className="flex items-center gap-4 p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="h-10 w-10 bg-orange-500 rounded-lg flex items-center justify-center text-white">
                  <Plus className="h-6 w-6" />
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  En el módulo de Departamentos, haz clic en el botón principal <strong>"Nuevo Departamento"</strong> ubicado en la esquina superior derecha.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="border-l-4 border-l-amber-500 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600 font-bold">2</div>
                <CardTitle className="text-xl">Información Clave</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="ml-11">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <PenTool className="h-5 w-5 text-amber-500 mt-1" />
                  <div>
                    <h4 className="font-semibold text-slate-700 dark:text-slate-200">Nombre del Departamento</h4>
                    <p className="text-sm text-slate-500">
                      Ej. "Recursos Humanos", "Logística", "TI". Este nombre será visible en todos los selectores del sistema.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <LayoutGrid className="h-5 w-5 text-amber-500 mt-1" />
                  <div>
                    <h4 className="font-semibold text-slate-700 dark:text-slate-200">Descripción</h4>
                    <p className="text-sm text-slate-500">
                      Opcional. Breve resumen de las funciones o responsabilidades del área.
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
                <CardTitle className="text-xl">Activación</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="ml-11">
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-100 dark:border-yellow-800">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  Al guardar, el departamento estará inmediatamente disponible para asignar usuarios, crear documentos y gestionar solicitudes.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  )
}



