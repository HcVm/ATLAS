"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, BarChart, TrendingUp, Trophy } from "lucide-react"
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

export default function MarketAnalysisDoc() {
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
                    <div className="p-3 bg-fuchsia-100 dark:bg-fuchsia-900/30 rounded-xl">
                        <BarChart className="h-8 w-8 text-fuchsia-600 dark:text-fuchsia-400" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                            Análisis de Mercado
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">
                            Rankings estratégicos y estudio de tendencias
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
                    <Card className="border-l-4 border-l-amber-500 shadow-lg hover:shadow-xl transition-shadow duration-300">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600 font-bold">1</div>
                                <CardTitle className="text-xl">Rankings de Proveedores</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="ml-11">
                            <div className="flex items-start gap-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                                <Trophy className="h-6 w-6 text-amber-600 mt-1" />
                                <div>
                                    <h4 className="font-semibold text-amber-900 dark:text-amber-200">Top 10 Leaders</h4>
                                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                                        Visualice quién lidera las ventas en cada Acuerdo Marco. Puede filtrar por <strong>región</strong> o departamento para identificar competidores locales clave.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div variants={item}>
                    <Card className="border-l-4 border-l-green-500 shadow-lg hover:shadow-xl transition-shadow duration-300">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center text-green-600 font-bold">2</div>
                                <CardTitle className="text-xl">Tendencias de Precios</CardTitle>
                            </div>
                            <CardDescription className="ml-11">
                                Herramienta vital para estrategias de pricing.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="ml-11">
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="p-3 border rounded-lg bg-white dark:bg-slate-900 flex flex-col gap-2">
                                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Histórico de Adjudicaciones</span>
                                    <p className="text-xs text-slate-500">Busque un producto (ej: "Silla Giratoria") para ver los precios ganadores de los últimos meses.</p>
                                </div>
                                <div className="p-3 border rounded-lg bg-green-50 dark:bg-green-900/10 flex items-center justify-center">
                                    <div className="text-center">
                                        <TrendingUp className="h-6 w-6 text-green-600 mx-auto mb-1" />
                                        <span className="text-xs font-bold text-green-700">Detección de Tendencias</span>
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
