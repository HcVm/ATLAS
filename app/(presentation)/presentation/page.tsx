"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    ChevronRight,
    ChevronLeft,
    Database,
    Users,
    ShoppingCart,
    Package,
    BarChart3,
    FileText,
    Zap,
    Clock,
    Shield,
    CheckCircle,
    Search,
    Lock,
    TrendingUp,
    Globe,
    AlertTriangle,
    Bell,
    Target,
    MessageSquare,
    Newspaper,
    UserPlus,
    Phone,
    Briefcase,
    QrCode,
    Printer,
    FileCheck,
    Share2,
    Tags,
    FileSignature,
    Calendar,
    CreditCard,
    GraduationCap,
    UserCheck,
    Settings,
    Archive,
    PlusCircle,
    Image as ImageIcon,
    LayoutTemplate,
    UploadCloud,
    FileImage,
    Eye,
    XCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

const slides = [
    {
        id: "intro",
        content: (
            <div className="relative z-10 flex flex-col items-center justify-center h-full text-center space-y-8">
                {/* Background Glow Effect */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[100px] animate-pulse" />

                <motion.div
                    initial={{ scale: 0.5, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    transition={{ duration: 1, ease: [0.2, 0.8, 0.2, 1] }}
                    className="relative z-20"
                >
                    {/* Official Logo */}
                    <div className="relative w-64 h-64 md:w-80 md:h-80 mx-auto mb-8 filter drop-shadow-[0_0_30px_rgba(59,130,246,0.5)]">
                        <img
                            src="/logos/atlas-logo-white.png"
                            alt="ATLAS Logo"
                            className="w-full h-full object-contain"
                        />
                    </div>
                </motion.div>

                <div className="space-y-4 relative z-20">
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 0.8 }}
                        className="text-6xl md:text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-slate-200 to-slate-500"
                    >
                        ATLAS
                    </motion.h1>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6, duration: 0.8 }}
                        className="flex flex-col gap-2"
                    >
                        <p className="text-2xl md:text-3xl font-light text-slate-300">
                            Enterprise Operating System
                        </p>
                        <div className="h-1 w-24 bg-blue-500 mx-auto rounded-full mt-4 mb-4" />
                        <p className="text-sm md:text-base text-slate-500 uppercase tracking-[0.3em] font-bold">
                            Centralización &bull; Automatización &bull; Control
                        </p>
                    </motion.div>
                </div>
            </div>
        )
    },
    {
        id: "problem",
        content: (
            <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center max-w-6xl mx-auto">
                <div className="space-y-6">
                    <div className="inline-block p-3 bg-red-500/10 rounded-xl text-red-400 font-semibold mb-4 border border-red-500/20 text-sm md:text-base">
                        La Realidad Actual
                    </div>
                    <h2 className="text-3xl md:text-4xl font-bold text-white">
                        El Costo de lo <span className="text-red-400">Manual</span>
                    </h2>
                    <ul className="space-y-4 text-lg md:text-xl text-slate-300">
                        <li className="flex items-center gap-3">
                            <Clock className="w-6 h-6 text-red-500 shrink-0" />
                            Pérdida de tiempo buscando documentos físicos.
                        </li>
                        <li className="flex items-center gap-3">
                            <FileText className="w-6 h-6 text-red-500 shrink-0" />
                            Errores humanos en transcripción de datos.
                        </li>
                        <li className="flex items-center gap-3">
                            <Shield className="w-6 h-6 text-red-500 shrink-0" />
                            Riesgo de pérdida de información sensible.
                        </li>
                    </ul>
                </div>
                <div className="grid grid-cols-2 gap-4 opacity-50">
                    <div className="bg-slate-800 p-4 md:p-8 rounded-2xl border border-slate-700 aspect-square flex flex-col items-center justify-center gap-4">
                        <FileText className="w-8 h-8 md:w-12 md:h-12 text-slate-500" />
                        <span className="text-slate-500 font-mono text-sm md:text-base">Papel</span>
                    </div>
                    <div className="bg-slate-800 p-4 md:p-8 rounded-2xl border border-slate-700 aspect-square flex flex-col items-center justify-center gap-4">
                        <Clock className="w-8 h-8 md:w-12 md:h-12 text-slate-500" />
                        <span className="text-slate-500 font-mono text-sm md:text-base">Demora</span>
                    </div>
                </div>
            </div>
        )
    },
    {
        id: "solution",
        content: (
            <div className="text-center space-y-8 md:space-y-12 max-w-5xl mx-auto">
                <h2 className="text-3xl md:text-4xl font-bold">
                    La Solución: <span className="text-emerald-400">Centralización Digital</span>
                </h2>
                <div className="grid md:grid-cols-3 gap-4 md:gap-8">
                    <motion.div
                        whileHover={{ y: -10 }}
                        className="p-6 md:p-8 rounded-3xl bg-slate-900 border border-slate-800 hover:border-blue-500/50 transition-all group"
                    >
                        <div className="w-12 h-12 md:w-16 md:h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 md:mb-6 group-hover:bg-blue-500/20">
                            <Zap className="w-6 h-6 md:w-8 md:h-8 text-blue-400" />
                        </div>
                        <h3 className="text-xl md:text-2xl font-bold mb-2 md:mb-4">Automatización</h3>
                        <p className="text-sm md:text-base text-slate-400">Flujos de trabajo que funcionan solos. Alertas, migraciones de tareas y cálculos automáticos.</p>
                    </motion.div>

                    <motion.div
                        whileHover={{ y: -10 }}
                        className="p-6 md:p-8 rounded-3xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 transition-all group"
                    >
                        <div className="w-12 h-12 md:w-16 md:h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 md:mb-6 group-hover:bg-emerald-500/20">
                            <Database className="w-6 h-6 md:w-8 md:h-8 text-emerald-400" />
                        </div>
                        <h3 className="text-xl md:text-2xl font-bold mb-2 md:mb-4">Dato Único</h3>
                        <p className="text-sm md:text-base text-slate-400">Una sola fuente de verdad. Se acabó tener 5 versiones diferentes de un Excel.</p>
                    </motion.div>

                    <motion.div
                        whileHover={{ y: -10 }}
                        className="p-6 md:p-8 rounded-3xl bg-slate-900 border border-slate-800 hover:border-purple-500/50 transition-all group"
                    >
                        <div className="w-12 h-12 md:w-16 md:h-16 bg-purple-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 md:mb-6 group-hover:bg-purple-500/20">
                            <Shield className="w-6 h-6 md:w-8 md:h-8 text-purple-400" />
                        </div>
                        <h3 className="text-xl md:text-2xl font-bold mb-2 md:mb-4">Seguridad</h3>
                        <p className="text-sm md:text-base text-slate-400">Roles, permisos y auditoría. Control total sobre quién ve y edita la información.</p>
                    </motion.div>
                </div>
            </div>
        )
    },
    {
        id: "module-hr-talent",
        content: (
            <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center max-w-6xl mx-auto">
                <div className="order-2 md:order-1 relative">
                    <div className="relative bg-slate-900 border border-slate-800 p-4 md:p-8 rounded-2xl space-y-4">
                        {/* Card de Candidato */}
                        <div className="flex items-center gap-4 p-3 md:p-4 bg-slate-800 rounded-xl border border-slate-700">
                            <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm md:text-base">CN</div>
                            <div className="flex-1">
                                <h4 className="font-bold text-white text-sm md:text-base">Carlos Núñez</h4>
                                <p className="text-xs md:text-sm text-slate-400">Desarrollador Senior</p>
                            </div>
                            <span className="px-2 py-1 md:px-3 rounded-full bg-blue-500/20 text-blue-400 text-[10px] md:text-xs font-bold">ENTREVISTA</span>
                        </div>
                        {/* Pipeline Visual */}
                        <div className="flex justify-between items-center text-[10px] md:text-xs text-slate-500 pt-2 px-1 md:px-2">
                            <div className="flex flex-col items-center gap-1 md:gap-2">
                                <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-slate-600" />
                                <span>Nuevo</span>
                            </div>
                            <div className="h-[2px] w-8 md:w-12 bg-slate-700" />
                            <div className="flex flex-col items-center gap-1 md:gap-2">
                                <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                                <span className="text-blue-400 font-bold">En Proceso</span>
                            </div>
                            <div className="h-[2px] w-8 md:w-12 bg-slate-700" />
                            <div className="flex flex-col items-center gap-1 md:gap-2">
                                <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-slate-600" />
                                <span>Oferta</span>
                            </div>
                            <div className="h-[2px] w-8 md:w-12 bg-slate-700" />
                            <div className="flex flex-col items-center gap-1 md:gap-2">
                                <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-slate-600" />
                                <span>Contratado</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="order-1 md:order-2 space-y-4 md:space-y-6">
                    <div className="inline-flex items-center gap-2 text-pink-400 font-bold uppercase tracking-wider text-sm md:text-base">
                        <GraduationCap className="w-5 h-5" /> Adquisición de Talento
                    </div>
                    <h2 className="text-3xl md:text-4xl font-bold">Reclutamiento Estratégico</h2>
                    <p className="text-lg md:text-xl text-slate-400">
                        Deje de perder buenos candidatos por desorden. Centralice todo el proceso de selección.
                    </p>
                    <ul className="space-y-4 text-base md:text-lg text-slate-300">
                        <li className="flex items-start gap-3">
                            <div className="mt-1 bg-pink-500/20 p-1 rounded"><Users className="w-4 h-4 text-pink-400" /></div>
                            <span><strong>ATS Integrado:</strong> Gestione sus vacantes y postulantes en tableros Kanban intuitivos.</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <div className="mt-1 bg-pink-500/20 p-1 rounded"><Database className="w-4 h-4 text-pink-400" /></div>
                            <span><strong>Base de Talentos:</strong> Si un candidato no califica hoy, sus datos quedan guardados para el futuro.</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <div className="mt-1 bg-pink-500/20 p-1 rounded"><UserCheck className="w-4 h-4 text-pink-400" /></div>
                            <span><strong>Contratación en un Clic:</strong> Convierta un postulante en "Empleado" automáticamente, transfiriendo todos sus datos al legajo.</span>
                        </li>
                    </ul>
                </div>
            </div>
        )
    },
    {
        id: "module-hr-admin",
        content: (
            <div className="grid md:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
                <div className="space-y-6">
                    <div className="inline-flex items-center gap-2 text-indigo-400 font-bold uppercase tracking-wider">
                        <FileSignature className="w-5 h-5" /> Gestión Administrativa
                    </div>
                    <h2 className="text-4xl font-bold">El Ciclo de Vida Laboral</h2>
                    <p className="text-xl text-slate-400">
                        Administre la relación laboral con precisión legal y financiera, desde el primer día hasta el cese.
                    </p>
                    <ul className="space-y-4 text-lg text-slate-300">
                        <li className="flex items-start gap-3">
                            <div className="mt-1 bg-indigo-500/20 p-1 rounded"><AlertTriangle className="w-4 h-4 text-indigo-400" /></div>
                            <span><strong>Control de Contratos:</strong> ATLAS le avisa 30, 15 y 7 días antes de que venza un contrato. Nunca más una renovación tardía.</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <div className="mt-1 bg-indigo-500/20 p-1 rounded"><CreditCard className="w-4 h-4 text-indigo-400" /></div>
                            <span><strong>Datos de Pago:</strong> Centralice cuentas bancarias, fondo de pensiones (AFP) y condiciones salariales para una planilla sin errores.</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <div className="mt-1 bg-indigo-500/20 p-1 rounded"><Calendar className="w-4 h-4 text-indigo-400" /></div>
                            <span><strong>Vacaciones y Licencias:</strong> Cálculo automático de récord vacacional y registro de ausencias médicas.</span>
                        </li>
                    </ul>
                </div>
                <div className="relative">
                    <div className="absolute inset-0 bg-indigo-500/10 blur-3xl rounded-full" />
                    <div className="relative bg-slate-900 border border-slate-800 p-6 rounded-2xl grid gap-4">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                            <span className="font-bold text-white">Estado del Contrato</span>
                            <span className="flex items-center gap-1 text-green-400 text-xs font-bold bg-green-500/10 px-2 py-1 rounded">
                                <CheckCircle className="w-3 h-3" /> VIGENTE
                            </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 bg-slate-800/50 rounded-lg">
                                <div className="text-xs text-slate-500 mb-1">Inicio</div>
                                <div className="text-white font-mono">01/01/2024</div>
                            </div>
                            <div className="p-3 bg-slate-800/50 rounded-lg border border-indigo-500/30 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-2 h-2 bg-indigo-500 rounded-bl" />
                                <div className="text-xs text-slate-500 mb-1">Fin (Renovación)</div>
                                <div className="text-indigo-300 font-mono font-bold">30/06/2024</div>
                            </div>
                        </div>
                        <div className="p-4 bg-slate-800/30 rounded-lg flex items-center gap-3">
                            <div className="p-2 bg-slate-700 rounded text-slate-300">
                                <FileText className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                                <div className="text-sm text-white">contrato_firmado.pdf</div>
                                <div className="text-xs text-slate-500">Subido el 02 Ene 10:30 AM</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    },
    {
        id: "module-sales",
        content: (
            <div className="grid md:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
                <div className="space-y-6">
                    <div className="inline-flex items-center gap-2 text-emerald-400 font-bold uppercase tracking-wider">
                        <ShoppingCart className="w-5 h-5" /> Ciclo Comercial
                    </div>
                    <h2 className="text-4xl font-bold">Ventas Inteligentes</h2>
                    <p className="text-xl text-slate-400">
                        Potencie su equipo comercial con herramientas que cierran tratos. Del contacto inicial a la facturación en segundos.
                    </p>
                    <ul className="space-y-4 text-lg text-slate-300">
                        <li className="flex items-start gap-3">
                            <div className="mt-1 bg-emerald-500/20 p-1 rounded"><FileCheck className="w-4 h-4 text-emerald-400" /></div>
                            <span><strong>Quote-to-Cash:</strong> Flujo continuo. Convierta una cotización aprobada en una orden de venta sin reescribir datos.</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <div className="mt-1 bg-emerald-500/20 p-1 rounded"><Lock className="w-4 h-4 text-emerald-400" /></div>
                            <span><strong>Reserva de Stock:</strong> Al emitir una cotización, el sistema puede "congelar" el inventario temporalmente para evitar sobreventas.</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <div className="mt-1 bg-emerald-500/20 p-1 rounded"><Zap className="w-4 h-4 text-emerald-400" /></div>
                            <span><strong>PDFs Interactivos:</strong> Genere documentos con QR de validación y firma digital integrada listos para enviar por WhatsApp.</span>
                        </li>
                    </ul>
                </div>

                <div className="relative">
                    <div className="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full" />

                    {/* Main Window Mockup */}
                    <div className="relative bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
                        {/* Fake Browser Toolbar */}
                        <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                            <div className="flex gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-500/50" />
                                <div className="w-3 h-3 rounded-full bg-amber-500/50" />
                                <div className="w-3 h-3 rounded-full bg-green-500/50" />
                            </div>
                            <div className="text-xs text-slate-500 font-mono">atlas.app/ventas/COT-001</div>
                            <div className="w-4" />
                        </div>

                        {/* App Content */}
                        <div className="p-5 space-y-5">
                            {/* Header Row */}
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                        COT-2024-001
                                        <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">APROBADO</span>
                                    </h3>
                                    <p className="text-xs text-slate-400">Cliente: MINERA LAS BAMBAS S.A.</p>
                                </div>
                                <div className="flex gap-2">
                                    <div className="p-2 bg-slate-800 rounded hover:bg-slate-700 transition">
                                        <Printer className="w-4 h-4 text-slate-300" />
                                    </div>
                                    <div className="p-2 bg-emerald-600 rounded shadow-lg shadow-emerald-500/20 hover:bg-emerald-500 transition">
                                        <Share2 className="w-4 h-4 text-white" />
                                    </div>
                                </div>
                            </div>

                            {/* Status Pipeline */}
                            <div className="flex items-center justify-between relative px-2">
                                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-800 -z-0" />
                                <div className="relative z-10 flex flex-col items-center gap-1">
                                    <div className="w-2 h-2 bg-emerald-500 rounded-full ring-4 ring-slate-900" />
                                    <span className="text-[10px] text-emerald-500 font-bold">Borrador</span>
                                </div>
                                <div className="relative z-10 flex flex-col items-center gap-1">
                                    <div className="w-2 h-2 bg-emerald-500 rounded-full ring-4 ring-slate-900" />
                                    <span className="text-[10px] text-emerald-500 font-bold">Enviado</span>
                                </div>
                                <div className="relative z-10 flex flex-col items-center gap-1">
                                    <div className="w-3 h-3 bg-emerald-500 rounded-full ring-4 ring-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
                                    <span className="text-[10px] text-white font-bold bg-slate-900 px-1">Aprobado</span>
                                </div>
                                <div className="relative z-10 flex flex-col items-center gap-1">
                                    <div className="w-2 h-2 bg-slate-700 rounded-full ring-4 ring-slate-900" />
                                    <span className="text-[10px] text-slate-500">Facturado</span>
                                </div>
                            </div>

                            {/* Data Table Mock */}
                            <div className="border border-slate-800 rounded-lg overflow-hidden">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-800/50 text-slate-400 text-xs">
                                        <tr>
                                            <th className="p-2 pl-3 font-medium">Producto</th>
                                            <th className="p-2 font-medium text-right">Cant.</th>
                                            <th className="p-2 pr-3 font-medium text-right">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-slate-300 text-xs">
                                        <tr className="border-b border-slate-800/50">
                                            <td className="p-2 pl-3">
                                                <div className="font-bold text-white">Laptop Workstation</div>
                                                <div className="text-[10px] text-slate-500">SERIE: LENO-X1-009</div>
                                            </td>
                                            <td className="p-2 text-right">2</td>
                                            <td className="p-2 pr-3 text-right text-emerald-400 font-mono">S/ 12k</td>
                                        </tr>
                                        <tr>
                                            <td className="p-2 pl-3">
                                                <div className="font-bold text-white">Licencia Software</div>
                                                <div className="text-[10px] text-slate-500">Anual Ent-Plus</div>
                                            </td>
                                            <td className="p-2 text-right">5</td>
                                            <td className="p-2 pr-3 text-right text-emerald-400 font-mono">S/ 2.5k</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* Totals */}
                            <div className="flex justify-end gap-8 pt-2 border-t border-slate-800">
                                <div className="text-right">
                                    <div className="text-xs text-slate-500">IGV (18%)</div>
                                    <div className="text-sm font-mono text-slate-300">S/ 2,610</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-emerald-500 font-bold uppercase">Total General</div>
                                    <div className="text-xl font-bold font-mono text-white">S/ 17,110.00</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Floating Notification Badge */}
                    <div className="absolute -bottom-4 -right-4 bg-slate-800 border border-slate-700 p-3 rounded-xl shadow-xl flex items-center gap-3 animate-bounce-slow">
                        <div className="bg-blue-500/20 p-2 rounded-lg">
                            <FileSignature className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <div className="text-xs font-bold text-white">Firma Validada</div>
                            <div className="text-[10px] text-slate-400">Hace 2 min por Gerencia</div>
                        </div>
                    </div>
                </div>
            </div>
        )
    },
    {
        id: "module-crm",
        content: (
            <div className="grid md:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
                <div className="relative order-2 md:order-1">
                    <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full" />

                    {/* CRM Interface Mockup */}
                    <div className="relative bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
                        {/* Header Profile */}
                        <div className="p-6 bg-slate-950 border-b border-slate-800 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
                                MS
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-white">Ministerio de Salud</h3>
                                <div className="flex items-center gap-2 text-xs">
                                    <span className="text-slate-400">RUC: 20131373237</span>
                                    <span className="w-1 h-1 rounded-full bg-slate-600" />
                                    <span className="text-blue-400 font-bold bg-blue-400/10 px-2 py-0.5 rounded-full">Cliente VIP</span>
                                </div>
                            </div>
                            <Button size="sm" variant="outline" className="h-8 border-slate-700 text-slate-300">
                                <Phone className="w-3 h-3 mr-2" />
                                Llamar
                            </Button>
                        </div>

                        <div className="flex">
                            {/* Left: Info & Deals */}
                            <div className="w-1/3 border-r border-slate-800 p-4 space-y-4 bg-slate-900/50">
                                <div className="space-y-1">
                                    <div className="text-[10px] uppercase text-slate-500 font-bold">Contacto Principal</div>
                                    <div className="text-sm text-white font-medium">Dr. Juan Pérez</div>
                                    <div className="text-xs text-slate-400">Jefe de Logística</div>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-[10px] uppercase text-slate-500 font-bold">Oportunidades</div>
                                    <div className="bg-slate-800 p-2 rounded border border-slate-700">
                                        <div className="text-xs font-bold text-white mb-1">Licitación PC-2024</div>
                                        <div className="flex justify-between items-end">
                                            <span className="text-[10px] text-slate-400">Negociación</span>
                                            <span className="text-xs font-mono text-emerald-400">S/ 120k</span>
                                        </div>
                                        <div className="w-full h-1 bg-slate-700 rounded-full mt-2 overflow-hidden">
                                            <div className="h-full bg-blue-500 w-[70%]" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right: Activity Feed */}
                            <div className="flex-1 p-4 bg-slate-900">
                                <div className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">Actividad Reciente</div>
                                <div className="space-y-4 relative pl-2">
                                    {/* Timeline Line */}
                                    <div className="absolute top-2 bottom-2 left-[19px] w-0.5 bg-slate-800" />

                                    <div className="flex gap-3 relative z-10">
                                        <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/50 flex items-center justify-center shrink-0 text-blue-400">
                                            <MessageSquare className="w-3 h-3" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-sm text-white">Reunión de seguimiento</div>
                                            <div className="text-xs text-slate-400">Se acordó enviar muestras el Lunes.</div>
                                            <div className="text-[10px] text-slate-600 mt-1">Hace 2 horas • Pedro V.</div>
                                        </div>
                                    </div>

                                    <div className="flex gap-3 relative z-10">
                                        <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500/50 flex items-center justify-center shrink-0 text-purple-400">
                                            <FileText className="w-3 h-3" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-sm text-white">Cotización Enviada #402</div>
                                            <div className="text-xs text-slate-400">Vista por el cliente 3 veces.</div>
                                            <div className="text-[10px] text-slate-600 mt-1">Ayer 15:30 • Sistema</div>
                                        </div>
                                    </div>

                                    <div className="flex gap-3 relative z-10 opacity-50">
                                        <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 text-slate-500">
                                            <Phone className="w-3 h-3" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-sm text-white">Llamada entrante</div>
                                            <div className="text-xs text-slate-400">Consulta sobre stock disponible.</div>
                                            <div className="text-[10px] text-slate-600 mt-1">10 Feb • Recepción</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6 order-1 md:order-2">
                    <div className="inline-flex items-center gap-2 text-blue-400 font-bold uppercase tracking-wider">
                        <Users className="w-5 h-5" /> CRM Integrado
                    </div>
                    <h2 className="text-4xl font-bold">Relaciones que Valen Oro</h2>
                    <p className="text-xl text-slate-400">
                        Más que una agenda, es la memoria de su equipo comercial. Centralice cada interacción para nunca perder una oportunidad.
                    </p>
                    <ul className="space-y-4 text-lg text-slate-300">
                        <li className="flex items-start gap-3">
                            <div className="mt-1 bg-blue-500/20 p-1 rounded"><UserPlus className="w-4 h-4 text-blue-400" /></div>
                            <span><strong>Visión 360°:</strong> Datos fiscales, contactos clave, historial de compras y documentos en una sola ficha.</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <div className="mt-1 bg-blue-500/20 p-1 rounded"><MessageSquare className="w-4 h-4 text-blue-400" /></div>
                            <span><strong>Timeline Infinito:</strong> Sepa quién habló con el cliente, qué se dijo y cuándo, sin preguntar a nadie.</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <div className="mt-1 bg-blue-500/20 p-1 rounded"><Target className="w-4 h-4 text-blue-400" /></div>
                            <span><strong>Pipeline Visual:</strong> Monitoree el estado de sus licitaciones y ventas privadas con probabilidades de cierre.</span>
                        </li>
                    </ul>
                </div>
            </div>
        )
    },
    {
        id: "module-inventory",
        content: (
            <div className="grid md:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
                <div className="space-y-6">
                    <div className="inline-flex items-center gap-2 text-amber-400 font-bold uppercase tracking-wider">
                        <Package className="w-5 h-5" /> Logística 4.0
                    </div>
                    <h2 className="text-4xl font-bold">Control de Inventario</h2>
                    <p className="text-xl text-slate-400">
                        Olvídese del inventario manual. ATLAS descuenta automáticamente cada venta y registra cada ingreso, manteniendo el kardex actualizado al segundo.
                    </p>
                    <ul className="space-y-4 text-lg text-slate-300">
                        <li className="flex items-start gap-3">
                            <div className="mt-1 bg-amber-500/20 p-1 rounded"><Tags className="w-4 h-4 text-amber-400" /></div>
                            <span><strong>Kardex Automatizado:</strong> Cada factura emitida resta stock. Cada guía de remisión lo suma. Sin doble digitación.</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <div className="mt-1 bg-amber-500/20 p-1 rounded"><LayoutTemplate className="w-4 h-4 text-amber-400" /></div>
                            <span><strong>Multi-Almacén:</strong> Sepa exactamente cuánto tiene en Tienda, cuánto en el Depósito y cuánto está en tránsito.</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <div className="mt-1 bg-amber-500/20 p-1 rounded"><AlertTriangle className="w-4 h-4 text-amber-400" /></div>
                            <span><strong>Alertas de Quiebre:</strong> El sistema le avisa antes de que se quede sin stock de sus productos estrella.</span>
                        </li>
                    </ul>
                </div>

                <div className="relative">
                    <div className="absolute inset-0 bg-amber-500/20 blur-3xl rounded-full" />

                    {/* Inventory Interface Mockup */}
                    <div className="relative bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
                        {/* Header Product Info */}
                        <div className="p-6 bg-slate-950 border-b border-slate-800 flex justify-between items-start">
                            <div className="flex gap-4">
                                <div className="w-16 h-16 bg-white rounded-lg p-1">
                                    {/* Placeholder for Product Image */}
                                    <div className="w-full h-full bg-slate-200 rounded flex items-center justify-center text-slate-400">
                                        <Package className="w-8 h-8" />
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white">Silla Ergonómica Executive X1</h3>
                                    <div className="font-mono text-sm text-slate-400">SKU: FUR-CHR-005</div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-800 px-2 py-0.5 rounded">Mobiliario</span>
                                        <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-800 px-2 py-0.5 rounded">Oficina</span>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-2xl font-bold text-white font-mono">47 <span className="text-sm font-sans text-slate-400 font-normal">und</span></div>
                                <div className="text-xs text-green-400 font-bold">En Stock Total</div>
                            </div>
                        </div>

                        {/* Stock Distribution Stats */}
                        <div className="grid grid-cols-2 divide-x divide-slate-800 border-b border-slate-800 bg-slate-900/50">
                            <div className="p-4">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs text-slate-400">Almacén Central</span>
                                    <span className="text-sm font-bold text-white">45</span>
                                </div>
                                <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                    <div className="h-full bg-green-500 w-[80%]" />
                                </div>
                            </div>
                            <div className="p-4 relative">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs text-slate-400">Tienda Surco</span>
                                    <span className="text-sm font-bold text-red-400">2</span>
                                </div>
                                <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                    <div className="h-full bg-red-500 w-[15%]" />
                                </div>
                                {/* Alert Tooltip */}
                                <div className="absolute top-2 right-2 flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                </div>
                            </div>
                        </div>

                        {/* Kardex Movements Table */}
                        <div className="p-4">
                            <div className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">Movimientos Recientes</div>
                            <div className="space-y-0">
                                {/* Table Header */}
                                <div className="grid grid-cols-4 text-[10px] uppercase text-slate-500 font-bold pb-2 border-b border-slate-800 mb-2">
                                    <div className="col-span-1">Fecha</div>
                                    <div className="col-span-2">Concepto</div>
                                    <div className="col-span-1 text-right">Cant.</div>
                                </div>

                                {/* Row 1 */}
                                <div className="grid grid-cols-4 text-xs py-2 border-b border-slate-800/50 items-center">
                                    <div className="text-slate-400">Hace 10m</div>
                                    <div className="col-span-2 text-white truncate">Salida por Venta <span className="text-slate-500">#F001-492</span></div>
                                    <div className="text-right text-red-400 font-mono font-bold">- 1</div>
                                </div>
                                {/* Row 2 */}
                                <div className="grid grid-cols-4 text-xs py-2 border-b border-slate-800/50 items-center">
                                    <div className="text-slate-400">Ayer</div>
                                    <div className="col-span-2 text-white truncate">Ingreso Compra <span className="text-slate-500">#GR-2023</span></div>
                                    <div className="text-right text-green-400 font-mono font-bold">+ 50</div>
                                </div>
                                {/* Row 3 */}
                                <div className="grid grid-cols-4 text-xs py-2 items-center opacity-50">
                                    <div className="text-slate-400">10 Feb</div>
                                    <div className="col-span-2 text-white truncate">Traslado Interno</div>
                                    <div className="text-right text-slate-400 font-mono font-bold">0</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    },
    {
        id: "module-labeling",
        content: (
            <div className="grid md:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
                <div className="space-y-6">
                    <div className="inline-flex items-center gap-2 text-orange-400 font-bold uppercase tracking-wider">
                        <Tags className="w-5 h-5" /> Identificación Global
                    </div>
                    <h2 className="text-4xl font-bold">Trazabilidad y Confianza</h2>
                    <p className="text-xl text-slate-400">
                        Cada producto tiene una huella digital única. Conecte el mundo físico con el digital mediante QR dinámicos.
                    </p>
                    <ul className="space-y-4 text-lg text-slate-300">
                        <li className="flex items-start gap-3">
                            <div className="mt-1 bg-orange-500/20 p-1 rounded"><QrCode className="w-4 h-4 text-orange-400" /></div>
                            <span><strong>Portal de Verificación:</strong> Cualquier usuario puede escanear el código para validar la autenticidad y ver la ficha técnica.</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <div className="mt-1 bg-orange-500/20 p-1 rounded"><Shield className="w-4 h-4 text-orange-400" /></div>
                            <span><strong>Anti-Falsificación:</strong> El sistema detecta y alerta si un número de serie clonado es escaneado en ubicaciones sospechosas.</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <div className="mt-1 bg-orange-500/20 p-1 rounded"><Printer className="w-4 h-4 text-orange-400" /></div>
                            <span><strong>Etiquetado Inteligente:</strong> Genere series, lotes y fechas de vencimiento con un solo clic.</span>
                        </li>
                    </ul>
                </div>

                <div className="relative h-[400px] flex items-center justify-center">
                    <div className="absolute inset-0 bg-orange-500/10 blur-3xl rounded-full" />

                    {/* Physical Label */}
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 bg-white p-5 rounded-lg -rotate-6 shadow-2xl w-64 z-10 border border-slate-200">
                        <div className="border border-slate-900 p-3 rounded-md space-y-3">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-bold text-slate-900 text-sm leading-tight">SILLA ERGO X1</h3>
                                    <p className="text-slate-500 text-[10px]">SKU: FUR-005</p>
                                </div>
                                <QrCode className="w-12 h-12 text-slate-900" />
                            </div>
                            <div className="space-y-1 pt-2 border-t border-slate-200">
                                <div className="flex justify-between text-[10px] font-mono text-slate-600">
                                    <span>LOTE: 2024-A</span>
                                    <span>EXP: 12/28</span>
                                </div>
                                <div className="w-full bg-slate-900 h-6 rounded mt-1 flex items-center justify-center text-white font-mono text-[10px] tracking-widest">
                                    * 775123456 *
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Scanning Line Animation */}
                    <div className="absolute left-32 top-1/2 -translate-y-1/2 w-48 border-t-2 border-dashed border-orange-400/50 z-0"></div>

                    {/* Smartphone Mockup */}
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 bg-slate-950 border-[6px] border-slate-800 rounded-[2rem] w-60 h-[380px] rotate-6 shadow-2xl z-20 overflow-hidden flex flex-col">
                        {/* Phone Notch */}
                        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-4 bg-slate-900 rounded-b-xl z-30" />

                        {/* Internal App Browser */}
                        <div className="bg-slate-900 p-3 pt-8 pb-2 border-b border-slate-800 flex items-center justify-center gap-2">
                            <Lock className="w-3 h-3 text-green-500" />
                            <span className="text-[10px] text-slate-400">atlas.verify/check/7751...</span>
                        </div>

                        {/* Validation Screen */}
                        <div className="flex-1 bg-slate-950 p-4 space-y-4 flex flex-col items-center pt-8">
                            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-2">
                                <CheckCircle className="w-8 h-8 text-green-500" />
                            </div>
                            <div className="text-center space-y-1">
                                <h4 className="text-green-500 font-bold text-sm uppercase tracking-wide">Autenticidad Verificada</h4>
                                <p className="text-white font-bold">Silla Erg. Executive X1</p>
                                <p className="text-slate-500 text-xs">AGLE PERUVIAN E.I.R.L.</p>
                            </div>

                            <div className="w-full bg-slate-900 rounded-lg p-3 space-y-2 mt-4">
                                <div className="flex justify-between text-[10px]">
                                    <span className="text-slate-500">Número de Serie</span>
                                    <span className="text-white font-mono">SN-993821</span>
                                </div>
                                <div className="flex justify-between text-[10px]">
                                    <span className="text-slate-500">Fecha Fabricación</span>
                                    <span className="text-white">15 Ene 2024</span>
                                </div>
                                <div className="flex justify-between text-[10px]">
                                    <span className="text-slate-500">Garantía</span>
                                    <span className="text-green-400">Vigente (1 Año)</span>
                                </div>
                            </div>

                            <div className="w-full mt-auto">
                                <Button size="sm" className="w-full bg-orange-600 hover:bg-orange-500 text-xs h-8">
                                    Ver Manual PDF
                                </Button>
                            </div>
                        </div>

                        {/* Phone Home Bar */}
                        <div className="h-1 w-1/3 bg-slate-700/50 rounded-full mx-auto mb-2 mt-2" />
                    </div>
                </div>
            </div>
        )
    },
    {
        id: "module-documents",
        content: (
            <div className="grid md:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
                <div className="space-y-6">
                    <div className="inline-flex items-center gap-2 text-teal-400 font-bold uppercase tracking-wider">
                        <FileCheck className="w-5 h-5" /> Gestión Documental
                    </div>
                    <h2 className="text-4xl font-bold">Adiós a la Hoja de Ruta</h2>
                    <p className="text-xl text-slate-400">
                        ¿Dónde está el expediente? Ya no necesita preguntar. Reemplazamos el papel por flujos digitales transparentes.
                    </p>
                    <ul className="space-y-4 text-lg text-slate-300">
                        <li className="flex items-start gap-3">
                            <div className="mt-1 bg-teal-500/20 p-1 rounded"><Share2 className="w-4 h-4 text-teal-400" /></div>
                            <span><strong>Colaboración Real:</strong> Ventas crea, Logística despacha, Finanzas factura. Todos sobre el mismo registro digital.</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <div className="mt-1 bg-teal-500/20 p-1 rounded"><Clock className="w-4 h-4 text-teal-400" /></div>
                            <span><strong>Trazabilidad Total:</strong> Sepa exactamente quién aprobó, quién modificó y cuándo se imprimió cada documento.</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <div className="mt-1 bg-teal-500/20 p-1 rounded"><Database className="w-4 h-4 text-teal-400" /></div>
                            <span><strong>Archivo Histórico:</strong> Sus documentos a un clic. Búsquedas instantáneas por cliente, fecha o monto.</span>
                        </li>
                    </ul>
                </div>

                <div className="relative h-[400px] flex items-center justify-center">
                    <div className="absolute inset-0 bg-teal-500/20 blur-3xl rounded-full" />

                    {/* Central Digital Folder */}
                    <div className="relative z-10 w-64 h-48 bg-slate-900 border-2 border-slate-700 rounded-xl flex items-center justify-center shadow-2xl skew-y-3 transform hover:scale-105 transition-transform duration-500 group">
                        {/* Folder Tab */}
                        <div className="absolute -top-6 left-0 w-24 h-8 bg-slate-800 rounded-t-lg border-t-2 border-l-2 border-r-2 border-slate-700 group-hover:bg-teal-900/50 transition-colors" />

                        <div className="text-center space-y-2">
                            <div className="bg-teal-500/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto border border-teal-500/50 shadow-[0_0_15px_rgba(20,184,166,0.5)]">
                                <Database className="w-8 h-8 text-teal-400" />
                            </div>
                            <div className="font-bold text-white tracking-wider">EXPEDIENTE DIGITAL</div>
                            <div className="text-[10px] text-teal-400 font-mono">ID: EXP-2024-8839</div>
                        </div>

                        {/* Floating File: PDF */}
                        <div className="absolute -top-12 -right-8 w-32 bg-slate-800 p-2 rounded-lg border border-slate-600 shadow-xl rotate-[15deg] group-hover:translate-x-4 transition-transform z-20">
                            <div className="flex items-center gap-2">
                                <FileText className="w-8 h-8 text-red-400" />
                                <div className="flex-1 min-w-0">
                                    <div className="text-[10px] font-bold text-white truncate">Contrato_2024.pdf</div>
                                    <div className="text-[8px] text-slate-400">1.2 MB</div>
                                </div>
                            </div>
                        </div>

                        {/* Floating File: XML */}
                        <div className="absolute -bottom-8 -left-8 w-32 bg-slate-800 p-2 rounded-lg border border-slate-600 shadow-xl rotate-[-10deg] group-hover:-translate-x-4 transition-transform z-20">
                            <div className="flex items-center gap-2">
                                <FileCheck className="w-8 h-8 text-blue-400" />
                                <div className="flex-1 min-w-0">
                                    <div className="text-[10px] font-bold text-white truncate">Factura_F001.xml</div>
                                    <div className="text-[8px] text-slate-400">FE - SUNAT</div>
                                </div>
                            </div>
                        </div>

                        {/* Floating File: Image */}
                        <div className="absolute top-1/2 -right-20 w-32 bg-slate-800 p-2 rounded-lg border border-slate-600 shadow-xl rotate-[5deg] group-hover:translate-x-2 transition-transform z-10">
                            <div className="flex items-center gap-2">
                                <ImageIcon className="w-8 h-8 text-yellow-400" />
                                <div className="flex-1 min-w-0">
                                    <div className="text-[10px] font-bold text-white truncate">Evidencia.jpg</div>
                                    <div className="text-[8px] text-slate-400">Foto Entrega</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Connecting Users */}
                    <div className="absolute top-10 left-10 flex flex-col items-center gap-1 animate-pulse-slow delay-75">
                        <div className="w-10 h-10 rounded-full bg-indigo-500 border-2 border-slate-900 flex items-center justify-center text-xs font-bold text-white shadow-lg">VN</div>
                        <div className="text-[10px] font-bold text-indigo-400 bg-slate-900 px-2 rounded-full border border-indigo-900">Ventas</div>
                        <div className="w-0.5 h-16 border-l-2 border-dashed border-indigo-500/30 transform rotate-[-30deg] origin-bottom translate-y-2 translate-x-4" />
                    </div>

                    <div className="absolute bottom-10 right-20 flex flex-col items-center gap-1 animate-pulse-slow">
                        <div className="w-0.5 h-12 border-l-2 border-dashed border-emerald-500/30 transform rotate-[20deg] origin-top -translate-y-2 -translate-x-2" />
                        <div className="w-10 h-10 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center text-xs font-bold text-white shadow-lg">FN</div>
                        <div className="text-[10px] font-bold text-emerald-400 bg-slate-900 px-2 rounded-full border border-emerald-900">Finanzas</div>
                    </div>

                    {/* Search Bar Floating */}
                    <div className="absolute -top-8 w-64 bg-slate-900/90 backdrop-blur border border-teal-500/50 rounded-full px-4 py-2 flex items-center gap-2 shadow-[0_0_20px_rgba(20,184,166,0.2)]">
                        <Search className="w-4 h-4 text-teal-400" />
                        <span className="text-sm text-slate-400 font-mono animate-typing overflow-hidden whitespace-nowrap border-r-2 border-teal-500 pr-1">Buscar: OC-2024-992...</span>
                    </div>
                </div>
            </div>
        )
    },
    {
        id: "open-data",
        content: (
            <div className="grid md:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
                <div className="space-y-6">
                    <div className="inline-flex items-center gap-2 text-cyan-400 font-bold uppercase tracking-wider">
                        <Globe className="w-5 h-5" /> Inteligencia de Mercado
                    </div>
                    <h2 className="text-4xl font-bold">Open Data Analytics</h2>
                    <p className="text-xl text-slate-400">
                        No tome decisiones a ciegas. ATLAS se conecta directamente con las bases de datos del gobierno (Peru Compras) para analizar el mercado.
                    </p>
                    <ul className="space-y-4 text-lg text-slate-300">
                        <li className="flex items-start gap-3">
                            <div className="mt-1 bg-cyan-500/20 p-1 rounded"><TrendingUp className="w-4 h-4 text-cyan-400" /></div>
                            <span><strong>Análisis de Competencia:</strong> Vea qué venden sus competidores y a qué precios.</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <div className="mt-1 bg-cyan-500/20 p-1 rounded"><AlertTriangle className="w-4 h-4 text-cyan-400" /></div>
                            <span><strong>Alertas de Marca:</strong> El sistema le avisa si alguien más está vendiendo sus productos registrados.</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <div className="mt-1 bg-cyan-500/20 p-1 rounded"><Search className="w-4 h-4 text-cyan-400" /></div>
                            <span><strong>Histórico de Precios:</strong> Consulte adjudicaciones pasadas para definir su estrategia de oferta.</span>
                        </li>
                    </ul>
                </div>
                <div className="relative">
                    <div className="absolute inset-0 bg-cyan-500/10 blur-3xl rounded-full" />
                    <div className="relative bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                            <span className="text-sm font-mono text-slate-500">DATA_SOURCE: GOV_PERU</span>
                            <div className="flex gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                <span className="text-xs text-green-500 font-bold">LIVE</span>
                            </div>
                        </div>
                        <div className="space-y-3 font-mono text-sm">
                            <div className="flex justify-between p-2 bg-slate-800/50 rounded">
                                <span className="text-slate-400">ORDEN_CAM-2024</span>
                                <span className="text-cyan-400">S/ 12,450.00</span>
                            </div>
                            <div className="flex justify-between p-2 bg-slate-800/50 rounded">
                                <span className="text-slate-400">ORDEN_CAM-2025</span>
                                <span className="text-cyan-400">S/ 8,900.00</span>
                            </div>
                            <div className="flex justify-between p-2 bg-slate-800/50 rounded">
                                <span className="text-slate-400">ORDEN_CAM-2026</span>
                                <span className="text-cyan-400">S/ 45,200.00</span>
                            </div>
                        </div>
                        <div className="pt-4 border-t border-slate-800">
                            <div className="flex items-center gap-2 text-cyan-500">
                                <TrendingUp className="w-4 h-4" />
                                <span className="font-bold">Tendencia Detectada: +15%</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    },
    {
        id: "open-data-management",
        content: (
            <div className="grid md:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
                <div className="order-2 md:order-1 relative">
                    <div className="absolute inset-0 bg-slate-500/20 blur-3xl rounded-full" />
                    <div className="relative bg-slate-900 border border-slate-800 p-8 rounded-2xl space-y-6">
                        {/* Mock Interface */}
                        <div className="bg-slate-950 rounded-lg border border-slate-800 p-4 space-y-3">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                                <div className="flex items-center gap-2">
                                    <Settings className="w-4 h-4 text-slate-400" />
                                    <span className="text-sm font-bold text-white">Configuración Global</span>
                                </div>
                                <div className="text-xs text-slate-500">v2.4.0</div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between p-2 bg-slate-900 rounded border border-slate-800">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-green-500" />
                                        <span className="text-xs text-slate-300">Año Fiscal Activo</span>
                                    </div>
                                    <span className="text-xs font-mono text-green-400 bg-green-400/10 px-2 py-0.5 rounded">2026</span>
                                </div>
                                <div className="flex items-center justify-between p-2 bg-slate-900 rounded border border-slate-800 op-50">
                                    <div className="flex items-center gap-2">
                                        <Archive className="w-3 h-3 text-slate-500" />
                                        <span className="text-xs text-slate-500">Catálogos Archivados</span>
                                    </div>
                                    <span className="text-xs font-mono text-slate-600">12</span>
                                </div>
                            </div>
                            <div className="pt-2">
                                <div className="w-full bg-blue-600/20 border border-blue-600/50 rounded p-2 text-center text-xs text-blue-400 font-bold">
                                    + Crear Nuevo Catálogo
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="flex-1 bg-slate-800 p-3 rounded-xl flex flex-col items-center gap-2 text-center">
                                <Archive className="w-6 h-6 text-slate-400" />
                                <span className="text-xs text-slate-300">Limpieza Histórica</span>
                            </div>
                            <div className="flex-1 bg-slate-800 p-3 rounded-xl flex flex-col items-center gap-2 text-center">
                                <Settings className="w-6 h-6 text-slate-400" />
                                <span className="text-xs text-slate-300">Params. Globales</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="space-y-6 order-1 md:order-2">
                    <div className="inline-flex items-center gap-2 text-slate-400 font-bold uppercase tracking-wider">
                        <Settings className="w-5 h-5" /> Gestión Administrativa
                    </div>
                    <h2 className="text-4xl font-bold">Control Total del Sistema</h2>
                    <p className="text-xl text-slate-400">
                        Mantenga su plataforma actualizada sin depender de soporte técnico. Gestione los catálogos y periodos usted mismo.
                    </p>
                    <ul className="space-y-4 text-lg text-slate-300">
                        <li className="flex items-start gap-3">
                            <div className="mt-1 bg-slate-700/50 p-1 rounded"><PlusCircle className="w-4 h-4 text-white" /></div>
                            <span><strong>Alta de Catálogos:</strong> Cree nuevos Acuerdos Marco (ej. "IM-CE-2026-3") al instante. Defina colores, iconos y nombres.</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <div className="mt-1 bg-slate-700/50 p-1 rounded"><Archive className="w-4 h-4 text-white" /></div>
                            <span><strong>Archivo Inteligente:</strong> Oculte catálogos antiguos para mantener la interfaz limpia, sin perder la data histórica.</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <div className="mt-1 bg-slate-700/50 p-1 rounded"><Calendar className="w-4 h-4 text-white" /></div>
                            <span><strong>Transición Fiscal:</strong> Cambie el "Año Actual" con un clic para actualizar todos los reportes y filtros del sistema.</span>
                        </li>
                    </ul>
                </div>
            </div>
        )
    },
    {
        id: "letterhead-management",
        content: (
            <div className="grid md:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
                <div className="space-y-6">
                    <div className="inline-flex items-center gap-2 text-orange-400 font-bold uppercase tracking-wider">
                        <LayoutTemplate className="w-5 h-5" /> Identidad Corporativa
                    </div>
                    <h2 className="text-4xl font-bold">Gestión de Membretes</h2>
                    <p className="text-xl text-slate-400">
                        Sus documentos, siempre profesionales. Centralice y actualice la imagen de sus marcas en tiempo real.
                    </p>
                    <ul className="space-y-4 text-lg text-slate-300">
                        <li className="flex items-start gap-3">
                            <div className="mt-1 bg-orange-500/20 p-1 rounded"><UploadCloud className="w-4 h-4 text-orange-400" /></div>
                            <span><strong>Carga Autónoma:</strong> Olvídese de solicitar cambios al equipo de TI. Suba sus nuevos diseños (PNG) directamente.</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <div className="mt-1 bg-orange-500/20 p-1 rounded"><Settings className="w-4 h-4 text-orange-400" /></div>
                            <span><strong>Estandarización Automática:</strong> El sistema renombra y optimiza los archivos para asegurar compatibilidad total con el generador PDF.</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <div className="mt-1 bg-orange-500/20 p-1 rounded"><FileImage className="w-4 h-4 text-orange-400" /></div>
                            <span><strong>Multi-Marca:</strong> Administre membrtes diferenciados para AGLE, ARM, GMC, y más, desde un solo panel.</span>
                        </li>
                    </ul>
                </div>
                <div className="relative">
                    <div className="absolute inset-0 bg-orange-500/10 blur-3xl rounded-full" />
                    <div className="relative bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                        {/* Visual Representation of Letterhead Manager */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white p-2 rounded-lg rotate-[-2deg] shadow-lg transform translate-y-2">
                                <div className="aspect-[210/297] bg-slate-50 border border-slate-100 flex flex-col relative overflow-hidden">
                                    <div className="h-16 bg-gradient-to-r from-blue-600 to-blue-800 w-full" />
                                    <div className="flex-1 p-2 space-y-2">
                                        <div className="h-2 w-3/4 bg-slate-200 rounded" />
                                        <div className="h-2 w-full bg-slate-200 rounded" />
                                        <div className="h-2 w-5/6 bg-slate-200 rounded" />
                                    </div>
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity">
                                        <ImageIcon className="text-white w-8 h-8" />
                                    </div>
                                </div>
                                <div className="mt-2 text-center text-[10px] text-slate-500 font-bold">AGLE PERUVIAN</div>
                            </div>
                            <div className="bg-white p-2 rounded-lg rotate-[2deg] shadow-lg transform translate-x-[-10px]">
                                <div className="aspect-[210/297] bg-slate-50 border border-slate-100 flex flex-col relative overflow-hidden">
                                    <div className="h-16 bg-gradient-to-r from-red-600 to-red-800 w-full" />
                                    <div className="flex-1 p-2 space-y-2">
                                        <div className="h-2 w-3/4 bg-slate-200 rounded" />
                                        <div className="h-2 w-full bg-slate-200 rounded" />
                                        <div className="h-2 w-5/6 bg-slate-200 rounded" />
                                    </div>
                                </div>
                                <div className="mt-2 text-center text-[10px] text-slate-500 font-bold">ARM CORPORATIONS</div>
                            </div>
                        </div>

                        <div className="mt-6 bg-slate-800 p-3 rounded-xl border border-slate-700 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="bg-green-500/20 p-2 rounded-lg">
                                    <CheckCircle className="w-5 h-5 text-green-500" />
                                </div>
                                <div>
                                    <div className="text-white text-sm font-bold">Sincronización PDF</div>
                                    <div className="text-slate-400 text-xs">Actualización inmediata</div>
                                </div>
                            </div>
                            <Settings className="text-slate-500 w-5 h-5 animate-spin-slow" />
                        </div>
                    </div>
                </div>
            </div>
        )
    },
    {
        id: "supervision-intro",
        content: (
            <div className="grid md:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
                <div className="space-y-6">
                    <div className="inline-flex items-center gap-2 text-pink-400 font-bold uppercase tracking-wider">
                        <Target className="w-5 h-5" /> Supervisión 2.0
                    </div>
                    <h2 className="text-4xl font-bold">Liderazgo Basado en Datos</h2>
                    <p className="text-xl text-slate-400">
                        ATLAS empodera a los supervisores con visión de rayos X sobre la operación. Ya no se trata solo de marcar asistencia, sino de medir resultados reales.
                    </p>
                    <div className="grid grid-cols-2 gap-4 pt-4">
                        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                            <div className="text-3xl font-bold text-white mb-1">94%</div>
                            <div className="text-sm text-slate-400">Eficacia Operativa</div>
                            <div className="w-full h-1 bg-slate-800 rounded-full mt-2 overflow-hidden">
                                <div className="h-full bg-pink-500 w-[94%]" />
                            </div>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                            <div className="text-3xl font-bold text-white mb-1">12m</div>
                            <div className="text-sm text-slate-400">Tiempo de Respuesta</div>
                            <div className="w-full h-1 bg-slate-800 rounded-full mt-2 overflow-hidden">
                                <div className="h-full bg-emerald-500 w-[80%]" />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="relative">
                    <div className="absolute inset-0 bg-pink-500/20 blur-3xl rounded-full" />
                    <div className="relative bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center space-y-8">
                        <div className="inline-block p-4 rounded-full bg-slate-800 border-4 border-slate-700 shadow-2xl">
                            <Target className="w-24 h-24 text-pink-500" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-bold text-white">Centro de Comando</h3>
                            <p className="text-slate-400">Monitoree KPIs individuales y grupales en tiempo real.</p>
                        </div>
                        <div className="flex justify-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
                            <div className="text-xs text-pink-500 font-bold uppercase tracking-widest">Sincronizado</div>
                        </div>
                    </div>
                </div>
            </div>
        )
    },
    {
        id: "supervision-kanban",
        content: (
            <div className="text-center space-y-8 max-w-6xl mx-auto">
                <div className="max-w-3xl mx-auto space-y-4">
                    <div className="inline-flex items-center gap-2 text-pink-400 font-bold uppercase tracking-wider">
                        <LayoutTemplate className="w-5 h-5" /> Gestión Visual
                    </div>
                    <h2 className="text-4xl font-bold text-white">Tableros Kanban Integrados</h2>
                    <p className="text-xl text-slate-400">
                        Visualice la carga de trabajo de cada empleado. Arrastre y suelte tareas para reasignar responsabilidades al instante.
                    </p>
                </div>

                <div className="relative text-left bg-slate-900 border border-slate-800 rounded-xl p-6 overflow-hidden shadow-2xl">
                    <div className="grid grid-cols-3 gap-6">
                        {/* Column: Pending */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider pb-2 border-b border-slate-800">
                                <span>Por Hacer</span>
                                <span className="bg-slate-800 px-2 py-0.5 rounded text-white">3</span>
                            </div>
                            {/* Card 1 */}
                            <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 hover:border-pink-500/50 transition-colors cursor-pointer group">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-[10px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20">Ventas</span>
                                    <Clock className="w-3 h-3 text-slate-500" />
                                </div>
                                <div className="text-sm font-bold text-white mb-2 group-hover:text-pink-400 transition-colors">Llamar a Proveedor ABC</div>
                                <div className="flex items-center justify-between mt-3">
                                    <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-[10px] text-white font-bold">JP</div>
                                    <span className="text-[10px] text-slate-500">Hoy</span>
                                </div>
                            </div>
                            {/* Card 2 */}
                            <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 opacity-75">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-[10px] bg-orange-500/10 text-orange-400 px-1.5 py-0.5 rounded border border-orange-500/20">Admin</span>
                                </div>
                                <div className="text-sm font-bold text-white mb-2">Revisar Facturas</div>
                                <div className="flex items-center justify-between mt-3">
                                    <div className="w-6 h-6 rounded-full bg-slate-600 flex items-center justify-center text-[10px] text-white font-bold">--</div>
                                    <span className="text-[10px] text-slate-500">Mañana</span>
                                </div>
                            </div>
                        </div>

                        {/* Column: In Progress */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between text-xs font-bold text-pink-500 uppercase tracking-wider pb-2 border-b border-pink-500/30">
                                <span>En Proceso</span>
                                <span className="bg-pink-500/20 px-2 py-0.5 rounded text-pink-400">1</span>
                            </div>
                            {/* Active Card */}
                            <div className="bg-slate-800 p-3 rounded-lg border-l-4 border-l-pink-500 border-y border-r border-slate-700 shadow-lg shadow-pink-500/10">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20">Cotización</span>
                                    <div className="animate-pulse w-2 h-2 rounded-full bg-pink-500" />
                                </div>
                                <div className="text-sm font-bold text-white mb-2">Preparar Propuesta MINSA</div>
                                <div className="w-full bg-slate-900 rounded-full h-1.5 mb-3 overflow-hidden">
                                    <div className="bg-pink-500 w-2/3 h-full" />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex -space-x-2">
                                        <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-[10px] text-white font-bold border-2 border-slate-800">YR</div>
                                        <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-[10px] text-white font-bold border-2 border-slate-800">JP</div>
                                    </div>
                                    <span className="text-[10px] text-pink-400 font-bold">En curso...</span>
                                </div>
                            </div>
                        </div>

                        {/* Column: Done */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between text-xs font-bold text-emerald-500 uppercase tracking-wider pb-2 border-b border-emerald-500/30">
                                <span>Terminado</span>
                                <span className="bg-emerald-500/20 px-2 py-0.5 rounded text-emerald-400">5</span>
                            </div>
                            {/* Done Card */}
                            <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                                <div className="text-sm font-bold text-slate-400 line-through mb-2">Informe Mensual</div>
                                <div className="flex items-center gap-2 text-[10px] text-emerald-500 font-bold">
                                    <CheckCircle className="w-3 h-3" /> Completado 10:30 AM
                                </div>
                            </div>
                            <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                                <div className="text-sm font-bold text-slate-400 line-through mb-2">Pago Proveedores</div>
                                <div className="flex items-center gap-2 text-[10px] text-emerald-500 font-bold">
                                    <CheckCircle className="w-3 h-3" /> Completado 09:15 AM
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    },
    {
        id: "supervision-alerts",
        content: (
            <div className="grid md:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
                <div className="order-2 md:order-1 relative">
                    <div className="absolute inset-0 bg-red-500/10 blur-3xl rounded-full" />
                    <div className="relative bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                        {/* Alert Header */}
                        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                            <div className="flex items-center gap-2">
                                <Bell className="w-5 h-5 text-white" />
                                <h3 className="font-bold text-white">Centro de Alertas</h3>
                            </div>
                            <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">3 Nuevas</span>
                        </div>

                        {/* Alert Items */}
                        <div className="space-y-3">
                            <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg flex gap-3 items-start">
                                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                <div>
                                    <div className="text-sm font-bold text-red-400">Baja Productividad Detectada</div>
                                    <div className="text-xs text-slate-400">Equipo Ventas Norte &bull; -15% vs Promedio</div>
                                </div>
                            </div>

                            <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg flex gap-3 items-start">
                                <Clock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                <div>
                                    <div className="text-sm font-bold text-amber-400">Tareas Vencidas (48h)</div>
                                    <div className="text-xs text-slate-400">u: Carlos Núñez &bull; 3 Cotizaciones pendientes</div>
                                </div>
                            </div>

                            <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg flex gap-3 items-start">
                                <Zap className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                                <div>
                                    <div className="text-sm font-bold text-blue-400">Migración Automática Ejecutada</div>
                                    <div className="text-xs text-slate-400">00:00 AM &bull; 12 tareas movidas a "Hoy"</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="space-y-6 order-1 md:order-2">
                    <div className="inline-flex items-center gap-2 text-pink-400 font-bold uppercase tracking-wider">
                        <Bell className="w-5 h-5" /> Notificaciones Inteligentes
                    </div>
                    <h2 className="text-4xl font-bold">El Sistema Trabaja por Usted</h2>
                    <p className="text-xl text-slate-400">
                        No pierda tiempo revisando si la gente trabaja. ATLAS le avisa solo cuando algo requiere su atención.
                    </p>
                    <ul className="space-y-4 text-lg text-slate-300">
                        <li className="flex items-start gap-3">
                            <div className="mt-1 bg-pink-500/20 p-1 rounded"><AlertTriangle className="w-4 h-4 text-pink-400" /></div>
                            <span><strong>Detección de Anomalías:</strong> Identifique cuellos de botella y sobrecarga laboral antes de que afecten al cliente.</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <div className="mt-1 bg-pink-500/20 p-1 rounded"><Zap className="w-4 h-4 text-pink-400" /></div>
                            <span><strong>Migración Nocturna:</strong> ¿Quedaron pendientes? ATLAS mueve las tareas incompletas al día siguiente automáticamente. Nada se olvida.</span>
                        </li>
                    </ul>
                </div>
            </div>
        )
    },
    {
        id: "module-communication",
        content: (
            <div className="grid md:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
                <div className="space-y-6">
                    <div className="inline-flex items-center gap-2 text-indigo-400 font-bold uppercase tracking-wider">
                        <MessageSquare className="w-5 h-5" /> Conectividad Total
                    </div>
                    <h2 className="text-4xl font-bold">Comunicación Fluida</h2>
                    <p className="text-xl text-slate-400">
                        Cierre la brecha entre la oficina y el campo. Mantenga a todos informados al instante.
                    </p>
                    <ul className="space-y-4 text-lg text-slate-300">
                        <li className="flex items-start gap-3">
                            <div className="mt-1 bg-indigo-500/20 p-1 rounded"><Newspaper className="w-4 h-4 text-indigo-400" /></div>
                            <span><strong>Módulo de Noticias:</strong> Publique comunicados oficiales, cambios de política o anuncios de RRHH visibles para toda la empresa.</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <div className="mt-1 bg-indigo-500/20 p-1 rounded"><MessageSquare className="w-4 h-4 text-indigo-400" /></div>
                            <span><strong>Chat Corporativo:</strong> Mensajería segura integrada. Sin depender de WhatsApp personales.</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <div className="mt-1 bg-indigo-500/20 p-1 rounded"><Users className="w-4 h-4 text-indigo-400" /></div>
                            <span><strong>Colaboración en Contexto:</strong> Discuta sobre una tarea o cliente específico sin salir de la ficha.</span>
                        </li>
                    </ul>
                </div>
                <div className="relative">
                    <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full" />
                    <div className="relative bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col gap-4">
                        {/* News Item Simulation */}
                        <div className="bg-slate-800 p-4 rounded-xl border-l-4 border-indigo-500">
                            <div className="flex justify-between items-start mb-2">
                                <span className="bg-indigo-500/20 text-indigo-300 text-xs px-2 py-1 rounded">COMUNICADO OFICIAL</span>
                                <span className="text-slate-500 text-xs">Hace 2 horas</span>
                            </div>
                            <h4 className="font-bold text-white mb-1">Nueva Política de Vacaciones</h4>
                            <p className="text-slate-400 text-sm">Se actualizó el procedimiento para solicitar descansos...</p>
                        </div>

                        {/* Chat Simulation */}
                        <div className="bg-slate-800 p-4 rounded-xl">
                            <div className="text-xs text-slate-500 mb-3 border-b border-slate-700 pb-2">Chat de Equipo: Ventas Lima</div>
                            <div className="space-y-3">
                                <div className="flex gap-3">
                                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold text-white">JP</div>
                                    <div className="bg-slate-700 p-2 rounded-lg rounded-tl-none text-sm text-slate-200">
                                        ¿Ya se envió la cotización al MINSA?
                                    </div>
                                </div>
                                <div className="flex gap-3 flex-row-reverse">
                                    <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-xs font-bold text-white">YR</div>
                                    <div className="bg-indigo-600 p-2 rounded-lg rounded-tr-none text-sm text-white">
                                        Sí, acaba de salir aprobada por el gerente.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    },
    {
        id: "conventions",
        content: (
            <div className="grid md:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
                <div className="space-y-6">
                    <div className="inline-flex items-center gap-2 text-amber-400 font-bold uppercase tracking-wider">
                        <CheckCircle className="w-5 h-5" /> Estándares de Calidad
                    </div>
                    <h2 className="text-4xl font-bold text-white">
                        El Poder de la <span className="text-amber-400">Uniformidad</span>
                    </h2>
                    <p className="text-xl text-slate-300">
                        Para que ATLAS funcione como un cerebro inteligente, necesita datos limpios y ordenados. La disciplina en el ingreso de información es no negociable.
                    </p>
                    <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl">
                        <h3 className="text-xl font-bold text-white mb-4">Regla de Oro: MAYÚSCULAS</h3>
                        <div className="space-y-4">
                            <div className="flex items-center gap-4 p-3 bg-red-500/10 rounded-lg border border-red-500/20 opacity-50">
                                <span className="text-red-500 font-bold text-xl">✕</span>
                                <span className="text-slate-400 font-mono line-through">juan perez - av. larco 123</span>
                            </div>
                            <div className="flex items-center gap-4 p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                                <span className="text-emerald-500 font-bold text-xl">✓</span>
                                <span className="text-emerald-400 font-mono font-bold">JUAN PEREZ - AV. LARCO 123</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="space-y-6 text-lg text-slate-400">
                    <p>¿Por qué es importante?</p>
                    <ul className="space-y-4">
                        <li className="flex items-start gap-3">
                            <div className="mt-1 bg-blue-500/20 p-1 rounded"><FileText className="w-4 h-4 text-blue-400" /></div>
                            <span><strong>Reportes Impecables:</strong> Los documentos generados (contratos, cotizaciones) se ven profesionales.</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <div className="mt-1 bg-blue-500/20 p-1 rounded"><Search className="w-4 h-4 text-blue-400" /></div>
                            <span><strong>Búsquedas Precisas:</strong> Encuentra clientes y productos más rápido sin errores de duplicidad.</span>
                        </li>
                    </ul>
                </div>
            </div>
        )
    },
    {
        id: "security",
        content: (
            <div className="grid md:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
                <div className="space-y-6">
                    <div className="inline-flex items-center gap-2 text-purple-400 font-bold uppercase tracking-wider">
                        <Shield className="w-5 h-5" /> Seguridad Corporativa
                    </div>
                    <h2 className="text-4xl font-bold">Fortaleza Digital</h2>
                    <p className="text-xl text-slate-400">
                        ATLAS no solo organiza su empresa, la protege. Implementamos estándares de seguridad bancaria para asegurar que su información estratégica nunca caiga en manos equivocadas.
                    </p>
                    <ul className="space-y-4 text-lg text-slate-300">
                        <li className="flex items-start gap-3">
                            <div className="mt-1 bg-purple-500/20 p-1 rounded"><Lock className="w-4 h-4 text-purple-400" /></div>
                            <span><strong>Encriptación de Grado Bancario:</strong> Toda la información viaja encriptada (AES-256) desde su dispositivo hasta nuestros servidores.</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <div className="mt-1 bg-purple-500/20 p-1 rounded"><Users className="w-4 h-4 text-purple-400" /></div>
                            <span><strong>Permisos Granulares (RLS):</strong> Un vendedor no ve planillas; un RRHH no ve costos. Cada rol ve estrictamente lo necesario.</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <div className="mt-1 bg-purple-500/20 p-1 rounded"><Eye className="w-4 h-4 text-purple-400" /></div>
                            <span><strong>Auditoría Forense:</strong> Registro inmutable de cada acceso. Sepa quién vio qué y cuándo.</span>
                        </li>
                    </ul>
                </div>

                <div className="relative h-[450px] flex items-center justify-center">
                    <div className="absolute inset-0 bg-purple-500/20 blur-3xl rounded-full" />

                    {/* Central Shield Layer */}
                    <div className="relative z-10">
                        <div className="w-64 h-64 bg-slate-900 border-2 border-purple-500/50 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(168,85,247,0.3)] animate-pulse-slow">
                            <Shield className="w-32 h-32 text-purple-500" />
                        </div>
                        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-slate-900 border border-purple-500 px-3 py-1 rounded-full text-xs font-mono text-purple-400 flex items-center gap-2">
                            <Lock className="w-3 h-3" /> SECURE ENCLAVE
                        </div>
                    </div>

                    {/* Permission Cards Orbiting */}
                    <div className="absolute top-10 right-0 z-20 w-48 bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-xl rotate-6 hover:rotate-0 transition-transform">
                        <div className="text-[10px] text-slate-500 font-bold uppercase mb-2">Control de Acceso</div>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center bg-slate-800 p-2 rounded">
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded-full bg-indigo-500 text-[8px] flex items-center justify-center text-white">G</div>
                                    <span className="text-xs text-white">Gerencia</span>
                                </div>
                                <CheckCircle className="w-3 h-3 text-green-500" />
                            </div>
                            <div className="flex justify-between items-center bg-slate-800 p-2 rounded opacity-75">
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded-full bg-slate-500 text-[8px] flex items-center justify-center text-white">V</div>
                                    <span className="text-xs text-white">Ventas</span>
                                </div>
                                <div className="flex gap-1">
                                    <CheckCircle className="w-3 h-3 text-green-500" />
                                    <XCircle className="w-3 h-3 text-red-500" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Audit Log Stream Background Effect */}
                    <div className="absolute -left-4 top-20 z-0 w-48 opacity-30 pointer-events-none select-none overflow-hidden space-y-1 text-[8px] font-mono text-purple-300">
                        <div className="bg-slate-800/50 p-1 rounded">ACCESS_GRANTED: USER_ID_992</div>
                        <div className="bg-slate-800/50 p-1 rounded">UPDATE_RECORD: TABLE_SALES</div>
                        <div className="bg-red-900/20 p-1 rounded text-red-300">ACCESS_DENIED: RESTRICTED_AREA</div>
                        <div className="bg-slate-800/50 p-1 rounded">LOGIN_SUCCESS: IP_192.168.1.1</div>
                    </div>
                </div>
            </div>
        )
    },
    {
        id: "final",
        content: (
            <div className="text-center space-y-8">
                <h1 className="text-5xl font-bold text-white">
                    ¿Listos para comenzar?
                </h1>
                <p className="text-2xl text-slate-400">
                    ATLAS ENTERPRISE SYSTEM.
                </p>
                <div className="flex flex-col md:flex-row justify-center gap-4 pt-8">
                    <Link href="/dashboard">
                        <Button size="lg" className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-xl rounded-full shadow-lg shadow-blue-600/20">
                            Ir al Dashboard
                        </Button>
                    </Link>
                    <Link href="/documentation">
                        <Button size="lg" className="w-full md:w-auto bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 px-8 py-6 text-xl rounded-full transition-colors">
                            Ver Manuales
                        </Button>
                    </Link>
                </div>
            </div>
        )
    }
]

export default function PresentationPage() {
    const [currentSlide, setCurrentSlide] = useState(0)

    const nextSlide = () => {
        if (currentSlide < slides.length - 1) setCurrentSlide(curr => curr + 1)
    }

    const prevSlide = () => {
        if (currentSlide > 0) setCurrentSlide(curr => curr - 1)
    }

    return (
        <div className="h-screen w-full flex flex-col relative bg-slate-950">
            {/* Background Effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[250px] md:w-[500px] h-[250px] md:h-[500px] bg-blue-500/10 rounded-full blur-[50px] md:blur-[100px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[250px] md:w-[500px] h-[250px] md:h-[500px] bg-purple-500/10 rounded-full blur-[50px] md:blur-[100px]" />
            </div>

            {/* Slide Content */}
            <div className="flex-1 overflow-y-auto z-10 scroll-smooth relative w-full">
                <div className="min-h-full w-full flex items-center justify-center px-4 py-12 md:p-8">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentSlide}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.5 }}
                            className="w-full max-w-7xl"
                        >
                            {slides[currentSlide].content}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            {/* Navigation Controls */}
            <div className="h-16 md:h-20 border-t border-slate-900 bg-slate-950/50 backdrop-blur-sm flex items-center justify-between px-4 md:px-8 z-20 shrink-0">
                <div className="flex items-center gap-4">
                    <span className="text-slate-500 font-mono text-xs md:text-sm">
                        {currentSlide + 1}/{slides.length}
                    </span>
                    <div className="hidden md:flex gap-1">
                        {slides.map((_, idx) => (
                            <div
                                key={idx}
                                className={`h-1.5 w-8 rounded-full transition-colors ${idx === currentSlide ? "bg-blue-500" : "bg-slate-800"
                                    }`}
                            />
                        ))}
                    </div>
                </div>

                <div className="flex gap-4">
                    <Button
                        variant="ghost"
                        onClick={prevSlide}
                        disabled={currentSlide === 0}
                        className="text-slate-400 hover:text-white text-sm"
                        size="sm"
                    >
                        <ChevronLeft className="mr-2 h-4 w-4" /> <span className="hidden md:inline">Anterior</span>
                    </Button>
                    <Button
                        onClick={nextSlide}
                        disabled={currentSlide === slides.length - 1}
                        className="bg-white text-slate-950 hover:bg-slate-200 text-sm"
                        size="sm"
                    >
                        <span className="hidden md:inline">Siguiente</span> <span className="md:hidden">Sig.</span> <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    )
}
