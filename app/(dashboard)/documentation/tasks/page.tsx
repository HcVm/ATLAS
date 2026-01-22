"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, CheckCircle, Kanban, Zap, Clock } from "lucide-react"
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

export default function TasksDoc() {
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
                    <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                        <CheckCircle className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                            Gestión de Tareas
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">
                            Organización personal y migración automática de pendientes
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
                    <Card className="border-l-4 border-l-purple-500 shadow-lg hover:shadow-xl transition-shadow duration-300">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-purple-600 font-bold">1</div>
                                <CardTitle className="text-xl">Tablero Personal</CardTitle>
                            </div>
                            <CardDescription className="ml-11">
                                ATLAS genera automáticamente un "Tablero del Día" nuevo cada madrugada.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="ml-11">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="flex items-start gap-3 p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                                    <Kanban className="h-5 w-5 text-purple-500 mt-1" />
                                    <div>
                                        <h4 className="font-semibold text-slate-700 dark:text-slate-200">Metodología Kanban</h4>
                                        <p className="text-xs text-slate-500 mt-1">
                                            Organice tareas en columnas: <em>Pendiente, En Progreso, Completada</em>. Use prioridades (Baja a Urgente) para enfocar su atención.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                                    <Clock className="h-5 w-5 text-purple-500 mt-1" />
                                    <div>
                                        <h4 className="font-semibold text-slate-700 dark:text-slate-200">Registro de Tiempo</h4>
                                        <p className="text-xs text-slate-500 mt-1">
                                            Compare el <code>Tiempo Estimado</code> vs <code>Tiempo Real</code> al finalizar cada tarea para mejorar sus métricas de productividad.
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
                                <div className="h-8 w-8 rounded-full bg-yellow-100 dark:bg-yellow-900/50 flex items-center justify-center text-yellow-600 font-bold">2</div>
                                <CardTitle className="text-xl">Migración Automática</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="ml-11">
                            <div className="flex items-center gap-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-100 dark:border-yellow-900">
                                <Zap className="h-8 w-8 text-yellow-600" />
                                <div>
                                    <h4 className="font-semibold text-yellow-900 dark:text-yellow-200">Cierre de Día Inteligente</h4>
                                    <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                                        A las <strong>00:00 horas</strong>, el sistema cierra el tablero actual. Las tareas no terminadas no se pierden: se <strong>MIGRAN</strong> automáticamente al día siguiente con una etiqueta especial, asegurando que nada se olvide.
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
