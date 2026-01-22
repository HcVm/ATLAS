"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Users, Bell, Target, TrendingUp, BarChart3, AlertTriangle } from "lucide-react"
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

export default function RemoteMonitoringDoc() {
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
                    <div className="p-3 bg-pink-100 dark:bg-pink-900/30 rounded-xl">
                        <Users className="h-8 w-8 text-pink-600 dark:text-pink-400" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                            Monitoreo Remoto
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">
                            Herramientas de supervisión de productividad y seguimiento de equipos
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
                                <CardTitle className="text-xl">Visión General del Equipo</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="ml-11">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="flex flex-col gap-2 p-3 bg-slate-50 dark:bg-slate-900 rounded border border-slate-200">
                                    <span className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                        <Target className="h-4 w-4 text-blue-500" /> Pizarrones
                                    </span>
                                    <p className="text-xs text-slate-500">Visualice en tiempo real los tableros Kanban de cada colaborador para conocer el estado exacto de sus tareas.</p>
                                </div>
                                <div className="flex flex-col gap-2 p-3 bg-slate-50 dark:bg-slate-900 rounded border border-slate-200">
                                    <span className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                        <BarChart3 className="h-4 w-4 text-blue-500" /> Progreso
                                    </span>
                                    <p className="text-xs text-slate-500">Gráficos comparativos de tareas completadas vs pendientes para medir el avance diario.</p>
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
                                <CardTitle className="text-xl">Alertas Inteligentes</CardTitle>
                            </div>
                            <CardDescription className="ml-11">
                                Detección automática de anomalías y riesgos de productividad.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="ml-11">
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="p-3 border border-red-200 bg-red-50 rounded text-red-900 text-sm">
                                    <div className="font-bold mb-1 flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Sobrecarga</div>
                                    Más de 10 tareas pendientes para hoy.
                                </div>
                                <div className="p-3 border border-yellow-200 bg-yellow-50 rounded text-yellow-900 text-sm">
                                    <div className="font-bold mb-1 flex items-center gap-2"><TrendingUp className="h-4 w-4 rotate-180" /> Baja Productividad</div>
                                    Tasa de completado inferior al 50%.
                                </div>
                                <div className="p-3 border border-orange-200 bg-orange-50 rounded text-orange-900 text-sm">
                                    <div className="font-bold mb-1">Tareas Vencidas</div>
                                    Actividades que excedieron su hora límite.
                                </div>
                                <div className="p-3 border border-slate-200 bg-slate-100 rounded text-slate-700 text-sm">
                                    <div className="font-bold mb-1">Inactividad</div>
                                    Sin pizarrones en los últimos 14 días.
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div variants={item}>
                    <Card className="border-l-4 border-l-purple-500 shadow-lg hover:shadow-xl transition-shadow duration-300">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-purple-600 font-bold">3</div>
                                <CardTitle className="text-xl">Gestión Proactiva</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="ml-11">
                            <div className="space-y-3">
                                <div className="flex items-start gap-3">
                                    <div className="mt-1 bg-purple-100 p-1 rounded">
                                        <Target className="h-4 w-4 text-purple-700" />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-purple-900 dark:text-purple-200">Asignación Directa</h4>
                                        <p className="text-sm text-purple-700 dark:text-purple-300">
                                            Intervenga enviando tareas directamente al tablero de un empleado desde el botón "Asignar Tarea" en su perfil.
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
