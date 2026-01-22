"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, User, Shield, Camera, BarChart3, Mail, Smartphone } from "lucide-react"
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

export default function ProfileDoc() {
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
                    <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl">
                        <User className="h-8 w-8 text-slate-600 dark:text-slate-400" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                            Mi Perfil
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">
                            Gestión de identidad digital y credenciales
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
                    <Card className="border-l-4 border-l-slate-500 shadow-lg hover:shadow-xl transition-shadow duration-300">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 font-bold">1</div>
                                <CardTitle className="text-xl">Información Personal</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="ml-11">
                            <div className="space-y-4">
                                <div className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                                    <div className="h-12 w-12 bg-white rounded-full flex items-center justify-center shadow-sm text-slate-400 border">
                                        <Camera className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-slate-900 dark:text-slate-100">Foto de Perfil</h4>
                                        <p className="text-xs text-slate-500">Suba una imagen profesional para facilitar su identificación en la plataforma.</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                        <Smartphone className="h-4 w-4" />
                                        <span>Teléfono / Móvil</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                        <Mail className="h-4 w-4" />
                                        <span>Correo Corporativo</span>
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
                                <CardTitle className="text-xl">Estadísticas de Usuario</CardTitle>
                            </div>
                            <CardDescription className="ml-11">
                                Métricas personales de uso de la plataforma.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="ml-11">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
                                    <span className="text-2xl font-bold text-blue-700 dark:text-blue-300 block">--</span>
                                    <span className="text-xs text-blue-600 dark:text-blue-400 uppercase font-semibold">Documentos Creados</span>
                                </div>
                                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-center">
                                    <span className="text-2xl font-bold text-indigo-700 dark:text-indigo-300 block">--</span>
                                    <span className="text-xs text-indigo-600 dark:text-indigo-400 uppercase font-semibold">Movimientos</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </motion.div>
        </div>
    )
}
