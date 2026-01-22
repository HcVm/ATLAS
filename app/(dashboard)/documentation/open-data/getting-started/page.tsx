"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Database, Search, Download, RefreshCw } from "lucide-react"
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

export default function OpenDataIntroDoc() {
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
                    <div className="p-3 bg-cyan-100 dark:bg-cyan-900/30 rounded-xl">
                        <Database className="h-8 w-8 text-cyan-600 dark:text-cyan-400" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                            Introducción a Datos Abiertos
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">
                            Inteligencia comercial con datos de Perú Compras
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
                    <Card className="border-l-4 border-l-cyan-500 shadow-lg hover:shadow-xl transition-shadow duration-300">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-cyan-100 dark:bg-cyan-900/50 flex items-center justify-center text-cyan-600 font-bold">1</div>
                                <CardTitle className="text-xl">Fuente de Datos</CardTitle>
                            </div>
                            <CardDescription className="ml-11">
                                Sincronización automática con registros públicos.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="ml-11">
                            <div className="flex items-start gap-3 p-3 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg">
                                <RefreshCw className="h-5 w-5 text-cyan-600 mt-1" />
                                <div>
                                    <h4 className="font-semibold text-cyan-900 dark:text-cyan-200">Actualización Diaria</h4>
                                    <p className="text-sm text-cyan-700 dark:text-cyan-300 mt-1">
                                        ATLAS descarga y procesa cada madrugada los registros de órdenes de compra de los Acuerdos Marco vigentes (Mobiliario, Útiles, Pinturas, Limpieza). El sistema analiza millones de registros históricos.
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
                                <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 font-bold">2</div>
                                <CardTitle className="text-xl">Búsqueda y Filtrado</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="ml-11">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="flex flex-col gap-2 p-3 border rounded bg-slate-50 dark:bg-slate-900">
                                    <span className="font-semibold text-slate-700 dark:text-slate-200 border-b pb-1">Por Entidad</span>
                                    <p className="text-xs text-slate-500">Analice patrones de compra de municipalidades o ministerios específicos.</p>
                                </div>
                                <div className="flex flex-col gap-2 p-3 border rounded bg-slate-50 dark:bg-slate-900">
                                    <span className="font-semibold text-slate-700 dark:text-slate-200 border-b pb-1">Por Proveedor</span>
                                    <p className="text-xs text-slate-500">Monitoree qué está vendiendo la competencia directa.</p>
                                </div>
                                <div className="flex flex-col gap-2 p-3 border rounded bg-slate-50 dark:bg-slate-900 sm:col-span-2">
                                    <span className="font-semibold text-slate-700 dark:text-slate-200 border-b pb-1">Por Producto</span>
                                    <p className="text-xs text-slate-500">Busque precios unitarios históricos adjudicados para ítems específicos.</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </motion.div>
        </div>
    )
}
