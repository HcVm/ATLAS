"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Users, Kanban, UserPlus, Filter, CheckCircle, XCircle } from "lucide-react"
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

export default function ApplicantTrackingDoc() {
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
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                        <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                            Reclutamiento y Selección (ATS)
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">
                            Sistema integral de seguimiento de candidatos y gestión de vacantes
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
                                <CardTitle className="text-xl">Tablero Kanban</CardTitle>
                            </div>
                            <CardDescription className="ml-11">
                                Visualización interactiva del flujo de postulantes.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="ml-11">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="flex items-start gap-3 p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                                    <Kanban className="h-5 w-5 text-blue-500 mt-1" />
                                    <div>
                                        <h4 className="font-semibold text-slate-700 dark:text-slate-200">Arrastrar y Soltar</h4>
                                        <p className="text-xs text-slate-500 mt-1">
                                            Mueva candidatos entre columnas (Nuevos, En Revisión, Entrevista, Oferta, Contratado) para actualizar su estado automáticamente.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                                    <Filter className="h-5 w-5 text-blue-500 mt-1" />
                                    <div>
                                        <h4 className="font-semibold text-slate-700 dark:text-slate-200">Filtros Rápidos</h4>
                                        <p className="text-xs text-slate-500 mt-1">
                                            Busque por nombre o filtre por vacante específica usando los selectores superiores.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div variants={item}>
                    <Card className="border-l-4 border-l-indigo-500 shadow-lg hover:shadow-xl transition-shadow duration-300">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 font-bold">2</div>
                                <CardTitle className="text-xl">Gestión de Vacantes</CardTitle>
                            </div>
                            <CardDescription className="ml-11">
                                Administración de ofertas laborales activas e históricas.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="ml-11">
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                                    <UserPlus className="h-5 w-5 text-indigo-600" />
                                    <p className="text-sm text-indigo-900 dark:text-indigo-200">
                                        Use <strong>"Nueva Vacante"</strong> para definir título, departamento, salario y ubicación. Cada vacante genera un enlace público único.
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <div className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium border border-green-200">Publicada</div>
                                    <div className="px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-medium border border-yellow-200">Pausada</div>
                                    <div className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">Archivada</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div variants={item}>
                    <Card className="border-l-4 border-l-emerald-500 shadow-lg hover:shadow-xl transition-shadow duration-300">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 font-bold">3</div>
                                <CardTitle className="text-xl">Base de Talentos</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="ml-11">
                            <div className="flex flex-col gap-3">
                                <p className="text-sm text-slate-600 dark:text-slate-300">
                                    La pestaña <strong>"Lista Candidatos"</strong> funciona como un repositorio histórico completo.
                                </p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-3 border rounded bg-slate-50 dark:bg-slate-900 text-sm">
                                        <div className="flex items-center gap-2 mb-1 text-slate-900 dark:text-slate-100 font-medium">
                                            <CheckCircle className="h-4 w-4 text-emerald-500" />
                                            Historial
                                        </div>
                                        Acceda a datos de contacto y CVs de postulantes anteriores.
                                    </div>
                                    <div className="p-3 border rounded bg-slate-50 dark:bg-slate-900 text-sm">
                                        <div className="flex items-center gap-2 mb-1 text-slate-900 dark:text-slate-100 font-medium">
                                            <XCircle className="h-4 w-4 text-red-500" />
                                            Calificación
                                        </div>
                                        Visualice el puntaje (estrellas) asignado en entrevistas previas.
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
