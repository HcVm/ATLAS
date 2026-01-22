"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Bell, CheckSquare, FileDown, AlertTriangle } from "lucide-react"
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

export default function BrandAlertsDoc() {
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
                        <Bell className="h-8 w-8 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                            Alertas de Marca
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">
                            Monitoreo activo de ventas de productos propios por terceros
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
                                <CardTitle className="text-xl">Configuración de Alertas</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="ml-11">
                            <div className="space-y-4">
                                <p className="text-sm text-slate-600 dark:text-slate-300">
                                    Detecta automáticamente cuando una orden de compra incluye productos de marcas registradas.
                                </p>
                                <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
                                    <h4 className="font-semibold text-sm mb-2 text-slate-700 dark:text-slate-300">Marcas Monitoreadas:</h4>
                                    <div className="flex flex-wrap gap-2">
                                        <span className="px-2 py-1 bg-white dark:bg-slate-800 border rounded text-xs font-mono">HOPE LIFE</span>
                                        <span className="px-2 py-1 bg-white dark:bg-slate-800 border rounded text-xs font-mono">WORLDLIFE</span>
                                        <span className="px-2 py-1 bg-white dark:bg-slate-800 border rounded text-xs font-mono">ZEUS</span>
                                        <span className="px-2 py-1 bg-white dark:bg-slate-800 border rounded text-xs font-mono">VALHALLA</span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div variants={item}>
                    <Card className="border-l-4 border-l-orange-500 shadow-lg hover:shadow-xl transition-shadow duration-300">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center text-orange-600 font-bold">2</div>
                                <CardTitle className="text-xl">Gestión de Incidencias</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="ml-11">
                            <div className="grid gap-3 sm:grid-cols-3 text-center">
                                <div className="p-3 border border-slate-200 rounded bg-slate-50">
                                    <div className="font-bold text-slate-700">Pendiente</div>
                                    <div className="text-xs text-slate-500">Nueva detección sin revisar</div>
                                </div>
                                <div className="p-3 border border-green-200 rounded bg-green-50">
                                    <div className="font-bold text-green-700">Atendida</div>
                                    <div className="text-xs text-green-600">Venta validada y correcta</div>
                                </div>
                                <div className="p-3 border border-red-200 rounded bg-red-50">
                                    <div className="font-bold text-red-700">Observada</div>
                                    <div className="text-xs text-red-600">Sospechosa / Requiere acción</div>
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
                                <CardTitle className="text-xl">Reportes PDF</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="ml-11">
                            <div className="flex items-center gap-4 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                                <FileDown className="h-8 w-8 text-indigo-600" />
                                <div>
                                    <h4 className="font-semibold text-indigo-900 dark:text-indigo-200">Generación Automática</h4>
                                    <p className="text-sm text-indigo-700 dark:text-indigo-300 mt-1">
                                        Vaya a la pestaña "Reportes", seleccione marcas y fechas. Si existen alertas observadas, el sistema solicitará el motivo para incluirlo en el informe legal/comercial.
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
