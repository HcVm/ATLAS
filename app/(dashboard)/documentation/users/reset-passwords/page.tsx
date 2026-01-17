"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, LockIcon as LockReset, Key, Mail, ShieldAlert } from "lucide-react"
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

export default function ResetPasswordsPage() {
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
            <LockReset className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              Restablecer Contraseñas
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Recuperación de acceso para usuarios que olvidaron sus credenciales
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
                <CardTitle className="text-xl">Opción de Seguridad</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="ml-11">
              <div className="flex items-center gap-4 p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                <ShieldAlert className="h-6 w-6 text-red-500" />
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  En el perfil del usuario, localiza la sección de seguridad. Solo los Administradores tienen permiso para realizar esta acción crítica.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="border-l-4 border-l-orange-500 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center text-orange-600 font-bold">2</div>
                <CardTitle className="text-xl">Método de Recuperación</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="ml-11">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-100 dark:border-orange-800 flex flex-col gap-2">
                  <div className="flex items-center gap-2 font-semibold text-orange-800 dark:text-orange-200">
                    <Mail className="h-4 w-4" /> Enviar Enlace
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    La opción más segura. Envía un correo al usuario con un link temporal para que él mismo elija su nueva clave.
                  </p>
                </div>
                <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-100 dark:border-orange-800 flex flex-col gap-2">
                  <div className="flex items-center gap-2 font-semibold text-orange-800 dark:text-orange-200">
                    <Key className="h-4 w-4" /> Manual
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Establece una contraseña temporal manualmente. Útil si el usuario no tiene acceso a su correo corporativo.
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
                <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 font-bold">3</div>
                <CardTitle className="text-xl">Confirmación</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="ml-11">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Si elegiste el método manual, copia la contraseña generada y compártela con el usuario por un canal seguro (nunca por email). El sistema le pedirá cambiarla inmediatamente.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  )
}



