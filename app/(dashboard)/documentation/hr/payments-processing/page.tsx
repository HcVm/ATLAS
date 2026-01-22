"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, DollarSign, CreditCard, Banknote, Building } from "lucide-react"
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

export default function PaymentsProcessingDoc() {
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
                    <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
                        <DollarSign className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                            Registro de Información Salarial
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">
                            Gestión centralizada de datos bancarios y remunerativos
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
                    <Card className="border-l-4 border-l-green-500 shadow-lg hover:shadow-xl transition-shadow duration-300">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center text-green-600 font-bold">1</div>
                                <CardTitle className="text-xl">Datos Remunerativos</CardTitle>
                            </div>
                            <CardDescription className="ml-11">
                                Información base para reporte de planillas.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="ml-11">
                            <div className="flex flex-col gap-4">
                                <div className="flex items-start gap-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                    <Banknote className="h-6 w-6 text-green-600 mt-1" />
                                    <div>
                                        <h4 className="font-semibold text-green-900 dark:text-green-200">Sueldo Bruto y Moneda</h4>
                                        <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                                            Desde la ficha de edición del empleado, registre el monto contractual mensual y la moneda (PEN/USD). Esta información es visible <strong>solo para roles autorizados</strong> (Admin/HR).
                                        </p>
                                    </div>
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
                                <CardTitle className="text-xl">Cuentas Bancarias</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="ml-11">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="p-4 border rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-3">
                                    <Building className="h-8 w-8 text-slate-400" />
                                    <div>
                                        <h4 className="font-medium text-slate-900 dark:text-slate-100">Entidad Financiera</h4>
                                        <p className="text-xs text-slate-500">BCP, BBVA, Interbank, etc.</p>
                                    </div>
                                </div>
                                <div className="p-4 border rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-3">
                                    <CreditCard className="h-8 w-8 text-slate-400" />
                                    <div>
                                        <h4 className="font-medium text-slate-900 dark:text-slate-100">Número de Cuenta</h4>
                                        <p className="text-xs text-slate-500">CCI para transferencias interbancarias.</p>
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
