"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Monitor, Bell, Download, Shield, Sun, Moon } from "lucide-react"
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

export default function SettingsDoc() {
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
                    <div className="p-3 bg-slate-200 dark:bg-slate-800 rounded-xl">
                        <Shield className="h-8 w-8 text-slate-700 dark:text-slate-300" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                            Configuración
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">
                            Preferencias del sistema, notificaciones y privacidad
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
                    <Card className="border-l-4 border-l-slate-600 shadow-lg hover:shadow-xl transition-shadow duration-300">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-700 font-bold">1</div>
                                <CardTitle className="text-xl">Apariencia</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="ml-11">
                            <div className="flex items-center gap-6 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                                <Monitor className="h-10 w-10 text-slate-400" />
                                <div>
                                    <h4 className="font-semibold text-slate-900 dark:text-slate-100">Tema Visual</h4>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                                        Personalice su experiencia alternando entre modos.
                                    </p>
                                    <div className="flex gap-2">
                                        <span className="flex items-center gap-1 text-xs bg-white dark:bg-slate-950 px-2 py-1 rounded border shadow-sm"><Sun className="h-3 w-3" /> Claro</span>
                                        <span className="flex items-center gap-1 text-xs bg-slate-900 text-white px-2 py-1 rounded border shadow-sm"><Moon className="h-3 w-3" /> Oscuro</span>
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
                                <CardTitle className="text-xl">Notificaciones</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="ml-11">
                            <div className="space-y-3">
                                <div className="flex items-start gap-3">
                                    <Bell className="h-5 w-5 text-yellow-500 mt-0.5" />
                                    <p className="text-sm text-slate-600 dark:text-slate-300">Active o desactive las alertas que recibe por correo electrónico.</p>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 ml-8">
                                    <div className="bg-slate-50 p-2 rounded border">Nuevos Documentos</div>
                                    <div className="bg-slate-50 p-2 rounded border">Movimientos</div>
                                    <div className="bg-slate-50 p-2 rounded border">Actualizaciones de Ventas</div>
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
                                <CardTitle className="text-xl">Exportación de Datos</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="ml-11">
                            <div className="flex items-center gap-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                <Download className="h-8 w-8 text-green-600" />
                                <div>
                                    <h4 className="font-semibold text-green-900 dark:text-green-200">Portabilidad de Información</h4>
                                    <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                                        Descargue un archivo JSON completo con todo su historial de actividad en la plataforma (documentos, ventas, perfil) para su respaldo personal.
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
