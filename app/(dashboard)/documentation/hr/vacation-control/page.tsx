"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, UserCheck, UserX, AlertTriangle, UserMinus } from "lucide-react"
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

export default function VacationControlDoc() {
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
                        <UserCheck className="h-8 w-8 text-teal-600 dark:text-teal-400" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                            Gestión de Estados y Licencias
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">
                            Control del ciclo de vida laboral, licencias y procesos de cese
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
                                <CardTitle className="text-xl">Estados del Personal</CardTitle>
                            </div>
                            <CardDescription className="ml-11">
                                Clasificación automática en el directorio para filtrado rápido.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="ml-11">
                            <div className="grid gap-3 sm:grid-cols-3 text-center">
                                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-lg">
                                    <UserCheck className="h-6 w-6 text-emerald-600 mx-auto mb-2" />
                                    <h4 className="font-bold text-emerald-800">Activo</h4>
                                    <p className="text-xs text-emerald-600">Laborando actualmente</p>
                                </div>
                                <div className="p-4 bg-yellow-50 border border-yellow-100 rounded-lg">
                                    <UserMinus className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
                                    <h4 className="font-bold text-yellow-800">Licencia</h4>
                                    <p className="text-xs text-yellow-600">Vacaciones / Descanso Médico</p>
                                </div>
                                <div className="p-4 bg-red-50 border border-red-100 rounded-lg">
                                    <UserX className="h-6 w-6 text-red-600 mx-auto mb-2" />
                                    <h4 className="font-bold text-red-800">Cesado</h4>
                                    <p className="text-xs text-red-600">Ex-colaborador</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div variants={item}>
                    <Card className="border-l-4 border-l-red-500 shadow-lg hover:shadow-xl transition-shadow duration-300">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center text-red-600 font-bold">2</div>
                                <CardTitle className="text-xl">Registro de Cese</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="ml-11">
                            <div className="space-y-4">
                                <div className="flex items-start gap-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-900">
                                    <AlertTriangle className="h-6 w-6 text-red-600 mt-1" />
                                    <div>
                                        <h4 className="font-semibold text-red-900 dark:text-red-200">Proceso Irreversible</h4>
                                        <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                                            Al cambiar el estado a <strong>"Cesado"</strong> e ingresar la <strong>Fecha de Fin</strong>, el sistema bloqueará automáticamente el acceso del usuario y lo moverá al archivo histórico.
                                        </p>
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
