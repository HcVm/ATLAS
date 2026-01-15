"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, UserPlus, Shield, Mail, Key } from "lucide-react"
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

export default function CreateUserAccountsPage() {
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
          <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
            <UserPlus className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              Crear Cuentas de Usuario
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Guía administrativa para el alta de nuevo personal
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
          <Card className="border-l-4 border-l-green-500 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center text-green-600 font-bold">1</div>
                <CardTitle className="text-xl">Datos Personales</CardTitle>
              </div>
              <CardDescription className="ml-11">
                Información básica de identidad.
              </CardDescription>
            </CardHeader>
            <CardContent className="ml-11">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="flex items-start gap-3 p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                  <UserPlus className="h-5 w-5 text-green-500 mt-1" />
                  <div>
                    <h4 className="font-semibold text-slate-700 dark:text-slate-200">Nombre Completo</h4>
                    <p className="text-sm text-slate-500">Tal como aparecerá en reportes y chats.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                  <Mail className="h-5 w-5 text-green-500 mt-1" />
                  <div>
                    <h4 className="font-semibold text-slate-700 dark:text-slate-200">Email Corporativo</h4>
                    <p className="text-sm text-slate-500">Será su ID de acceso único.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="border-l-4 border-l-teal-500 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center text-teal-600 font-bold">2</div>
                <CardTitle className="text-xl">Seguridad Inicial</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="ml-11">
              <div className="flex items-center gap-4 p-4 bg-teal-50 dark:bg-teal-900/20 rounded-lg border border-teal-100 dark:border-teal-800">
                <Key className="h-6 w-6 text-teal-600" />
                <div>
                  <h4 className="font-semibold text-teal-900 dark:text-teal-200">Contraseña Temporal</h4>
                  <p className="text-sm text-teal-700 dark:text-teal-300">
                    Asigna una clave provisional segura. El sistema solicitará obligatoriamente el cambio en el primer inicio de sesión.
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
                <CardTitle className="text-xl">Configuración de Acceso</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="ml-11">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-blue-500 mt-1" />
                  <div>
                    <h4 className="font-semibold text-slate-700 dark:text-slate-200">Rol de Sistema</h4>
                    <p className="text-sm text-slate-500">Define qué puede ver o editar (Admin, Supervisor, Usuario, Lector).</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-5 w-5 rounded bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600 mt-1">D</div>
                  <div>
                    <h4 className="font-semibold text-slate-700 dark:text-slate-200">Departamento</h4>
                    <p className="text-sm text-slate-500">Vincula al usuario a su área para flujos de aprobación y chat.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  )
}
