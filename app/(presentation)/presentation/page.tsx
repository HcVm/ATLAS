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
    UserCheck
} from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

const slides = [
    {
        id: "intro",
        content: (
            <div className="text-center space-y-4 md:space-y-6">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.8 }}
                    className="w-24 h-24 md:w-32 md:h-32 bg-blue-600 rounded-3xl mx-auto flex items-center justify-center shadow-[0_0_50px_-12px_rgba(37,99,235,0.5)]"
                >
                    <Database className="w-12 h-12 md:w-16 md:h-16 text-white" />
                </motion.div>
                <h1 className="text-4xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-violet-400">
                    ATLAS
                </h1>
                <p className="text-xl md:text-2xl text-slate-400 max-w-2xl mx-auto">
                    Plataforma Integral de Gestión Empresarial
                </p>
                <div className="pt-4 md:pt-8">
                    <p className="text-sm md:text-lg text-slate-500 uppercase tracking-widest font-semibold">
                        Capacitación y Transformación Digital
                    </p>
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
                        <ShoppingCart className="w-5 h-5" /> Ventas
                    </div>
                    <h2 className="text-4xl font-bold">Ciclo Comercial</h2>
                    <p className="text-xl text-slate-400">
                        Desde la cotización hasta la entrega final.
                    </p>
                    <ul className="space-y-3 text-lg text-slate-300">
                        <li>🚀 Generación de cotizaciones PDF en 1 clic.</li>
                        <li>🚀 Control de stock en tiempo real al vender.</li>
                        <li>🚀 Seguimiento de estados: Cotizado → Aprobado → Facturado.</li>
                    </ul>
                </div>
                <div className="relative">
                    <div className="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full" />
                    <div className="relative bg-slate-900 border border-slate-800 p-8 rounded-2xl">
                        <div className="flex justify-between items-center mb-8">
                            <div className="space-y-2">
                                <div className="h-4 w-24 bg-slate-800 rounded" />
                                <div className="h-8 w-48 bg-emerald-500/20 rounded text-emerald-400 flex items-center justify-center font-bold">S/ 45,200.00</div>
                            </div>
                            <div className="h-12 w-12 bg-slate-800 rounded-full flex items-center justify-center">
                                <BarChart3 className="w-6 h-6 text-emerald-500" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 w-3/4" />
                            </div>
                            <div className="flex justify-between text-xs text-slate-500">
                                <span>Meta Mensual</span>
                                <span>75% Completado</span>
                            </div>
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
                    <div className="relative bg-slate-900 border border-slate-800 p-8 rounded-2xl grid grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-800/50 rounded-xl space-y-2">
                            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                                <Briefcase className="w-5 h-5" />
                            </div>
                            <div className="font-bold text-white">Cartera</div>
                            <div className="text-xs text-slate-400">500+ Clientes Activos</div>
                        </div>
                        <div className="p-4 bg-slate-800/50 rounded-xl space-y-2">
                            <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                                <Phone className="w-5 h-5" />
                            </div>
                            <div className="font-bold text-white">Seguimiento</div>
                            <div className="text-xs text-slate-400">Historial de llamadas</div>
                        </div>
                        <div className="col-span-2 bg-slate-800/80 p-4 rounded-xl flex items-center gap-4">
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                            <div className="flex-1">
                                <div className="text-sm font-bold text-white">Ministerio de Salud</div>
                                <div className="text-xs text-slate-400">Oportunidad: S/ 120,000</div>
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
                        Más que una agenda, es la memoria de su equipo comercial.
                    </p>
                    <ul className="space-y-4 text-lg text-slate-300">
                        <li className="flex items-start gap-3">
                            <div className="mt-1 bg-blue-500/20 p-1 rounded"><UserPlus className="w-4 h-4 text-blue-400" /></div>
                            <span><strong>Directorio Unificado:</strong> Clientes, proveedores y contactos en un solo lugar.</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <div className="mt-1 bg-blue-500/20 p-1 rounded"><MessageSquare className="w-4 h-4 text-blue-400" /></div>
                            <span><strong>Historial de Interacciones:</strong> Sepa exactamente cuándo fue la última reunión o llamada.</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <div className="mt-1 bg-blue-500/20 p-1 rounded"><Target className="w-4 h-4 text-blue-400" /></div>
                            <span><strong>Pipeline de Oportunidades:</strong> Visualice el estado de cada negociación en curso.</span>
                        </li>
                    </ul>
                </div>
            </div>
        )
    },
    {
        id: "module-inventory",
        content: (
            <div className="text-center space-y-8 max-w-4xl mx-auto">
                <div className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Package className="w-10 h-10 text-amber-500" />
                </div>
                <h2 className="text-4xl font-bold">Control de Inventario</h2>
                <p className="text-xl text-slate-300">
                    Olvídese del inventario manual y las diferencias de stock. ATLAS descuenta automáticamente cada venta y registra cada ingreso, manteniendo el kardex actualizado al segundo.
                </p>
                <div className="grid grid-cols-3 gap-6 pt-8">
                    <div className="p-4 bg-slate-900 rounded-xl border border-slate-800">
                        <div className="text-3xl font-bold text-white mb-1">100%</div>
                        <div className="text-sm text-slate-500">Trazabilidad</div>
                    </div>
                    <div className="p-4 bg-slate-900 rounded-xl border border-slate-800">
                        <div className="text-3xl font-bold text-white mb-1">0</div>
                        <div className="text-sm text-slate-500">Papeles Perdidos</div>
                    </div>
                    <div className="p-4 bg-slate-900 rounded-xl border border-slate-800">
                        <div className="text-3xl font-bold text-white mb-1">24/7</div>
                        <div className="text-sm text-slate-500">Disponibilidad</div>
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
                    <h2 className="text-4xl font-bold">Etiquetado Inteligente</h2>
                    <p className="text-xl text-slate-400">
                        Cada producto tiene una huella digital única. Genere series y lotes al instante.
                    </p>
                    <ul className="space-y-4 text-lg text-slate-300">
                        <li className="flex items-start gap-3">
                            <div className="mt-1 bg-orange-500/20 p-1 rounded"><QrCode className="w-4 h-4 text-orange-400" /></div>
                            <span><strong>Códigos QR Dinámicos:</strong> Escanee para ver el historial completo del ítem.</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <div className="mt-1 bg-orange-500/20 p-1 rounded"><Printer className="w-4 h-4 text-orange-400" /></div>
                            <span><strong>Impresión de Lotes:</strong> Gestión de fechas de vencimiento y trazabilidad por serie.</span>
                        </li>
                    </ul>
                </div>
                <div className="flex items-center justify-center">
                    <div className="bg-white p-6 rounded-xl rotate-3 shadow-2xl max-w-sm">
                        <div className="border-2 border-slate-900 p-4 rounded-lg space-y-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-bold text-slate-900 text-lg">SILLA ERGONÓMICA</h3>
                                    <p className="text-slate-500 text-sm">MODELO: EXECUTIVE-X1</p>
                                </div>
                                <QrCode className="w-16 h-16 text-slate-900" />
                            </div>
                            <div className="space-y-1 pt-2 border-t border-slate-200">
                                <div className="flex justify-between text-xs font-mono text-slate-600">
                                    <span>LOTE: 2024-001A</span>
                                    <span>EXP: 12/2028</span>
                                </div>
                                <div className="w-full bg-slate-900 h-8 rounded mt-2 flex items-center justify-center text-white font-mono text-xs tracking-widest">
                                    * 7751234567890 *
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    },
    {
        id: "module-documents",
        content: (
            <div className="text-center space-y-12 max-w-5xl mx-auto">
                <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 text-teal-400 font-bold uppercase tracking-wider">
                        <FileCheck className="w-5 h-5" /> Gestión Documental
                    </div>
                    <h2 className="text-4xl font-bold">Adiós a la Hoja de Ruta Física</h2>
                    <p className="text-xl text-slate-300 max-w-3xl mx-auto">
                        ¿Dónde está el expediente? Ya no necesita preguntar. ATLAS reemplaza el papel por flujos digitales transparentes y accesibles en tiempo real.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-4">
                        <div className="mx-auto w-12 h-12 bg-teal-500/20 rounded-full flex items-center justify-center text-teal-400">
                            <Share2 className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold text-white">Acceso Compartido</h3>
                        <p className="text-slate-400 text-sm">
                            Múltiples áreas pueden trabajar sobre el mismo "documento" simultáneamente. Ventas crea, Logística despacha, Finanzas factura.
                        </p>
                    </div>
                    <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-4 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-2 opacity-10">
                            <FileText className="w-24 h-24" />
                        </div>
                        <div className="mx-auto w-12 h-12 bg-teal-500/20 rounded-full flex items-center justify-center text-teal-400">
                            <Clock className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold text-white">Trazabilidad Total</h3>
                        <p className="text-slate-400 text-sm">
                            Sepa exactamente quién aprobó, quién modificó y cuándo se imprimió cada documento. Historial inmutable.
                        </p>
                    </div>
                    <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-4">
                        <div className="mx-auto w-12 h-12 bg-teal-500/20 rounded-full flex items-center justify-center text-teal-400">
                            <Database className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold text-white">Archivo Digital</h3>
                        <p className="text-slate-400 text-sm">
                            Sus documentos históricos a un clic de distancia. Búsquedas instantáneas por cliente, fecha o monto.
                        </p>
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
        id: "supervision",
        content: (
            <div className="text-center space-y-12 max-w-5xl mx-auto">
                <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 text-pink-400 font-bold uppercase tracking-wider">
                        <Target className="w-5 h-5" /> Supervisión 2.0
                    </div>
                    <h2 className="text-4xl font-bold">Liderazgo Basado en Datos</h2>
                    <p className="text-xl text-slate-300 max-w-3xl mx-auto">
                        ATLAS empodera a los supervisores con visión de rayos X sobre la operación. Ya no se trata solo de marcar asistencia, sino de medir resultados reales.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-6 text-left">
                    <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl hover:border-pink-500/50 transition-colors group">
                        <Bell className="w-10 h-10 text-pink-500 mb-4 group-hover:scale-110 transition-transform" />
                        <h3 className="text-xl font-bold text-white mb-2">Alertas en Tiempo Real</h3>
                        <p className="text-slate-400 text-sm">
                            El sistema detecta anomalías automáticamente: "Baja Productividad", "Sobrecarga de Trabajo", "Tareas Vencidas".
                        </p>
                    </div>
                    <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl hover:border-pink-500/50 transition-colors group">
                        <div className="w-10 h-10 bg-slate-800 rounded flex items-center justify-center mb-4 border border-slate-700">
                            <div className="w-3/4 h-3/4 bg-slate-600 rounded flex gap-0.5 p-0.5">
                                <div className="w-1/3 bg-pink-500 rounded-sm"></div>
                                <div className="w-1/3 bg-pink-500 rounded-sm"></div>
                                <div className="w-1/3 bg-slate-500 rounded-sm"></div>
                            </div>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Tableros Kanban</h3>
                        <p className="text-slate-400 text-sm">
                            Visualice la carga de trabajo de cada empleado. Arrastre y suelte tareas para reasignar responsabilidades al instante.
                        </p>
                    </div>
                    <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl hover:border-pink-500/50 transition-colors group">
                        <Zap className="w-10 h-10 text-yellow-500 mb-4 group-hover:scale-110 transition-transform" />
                        <h3 className="text-xl font-bold text-white mb-2">Migración Automática</h3>
                        <p className="text-slate-400 text-sm">
                            ¿Quedaron pendientes? ATLAS mueve las tareas incompletas al día siguiente automáticamente a las 00:00 horas. Nada se olvida.
                        </p>
                    </div>
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
            <div className="text-center space-y-12 max-w-6xl mx-auto">
                <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 text-purple-400 font-bold uppercase tracking-wider">
                        <Shield className="w-5 h-5" /> Seguridad Corporativa
                    </div>
                    <h2 className="text-4xl font-bold">Sus Datos, <span className="text-purple-400">Blindados</span></h2>
                    <p className="text-xl text-slate-300 max-w-3xl mx-auto">
                        ATLAS no solo organiza su empresa, la protege. Implementamos estándares de seguridad bancaria para asegurar que su información estratégica nunca caiga en manos equivocadas.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8 text-left">
                    <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
                        <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center text-purple-400">
                            <Lock className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold text-white">Encriptación Total</h3>
                        <p className="text-slate-400 text-sm">
                            Toda la información viaja encriptada desde su dispositivo hasta nuestros servidores. Nadie puede interceptarla.
                        </p>
                    </div>
                    <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
                        <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-400">
                            <Users className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold text-white">Control de Acceso (RLS)</h3>
                        <p className="text-slate-400 text-sm">
                            Cada usuario ve <strong>solo lo que necesita ver</strong>. Un vendedor no ve planillas; un RRHH no ve costos de importación.
                        </p>
                    </div>
                    <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
                        <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400">
                            <Database className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold text-white">Respaldos Diarios</h3>
                        <p className="text-slate-400 text-sm">
                            Copias de seguridad automáticas garantizan que su historia empresarial jamás se pierda ante fallos.
                        </p>
                    </div>
                </div>

                <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6 max-w-3xl mx-auto flex items-center gap-6 text-left">
                    <div className="bg-red-500/10 p-3 rounded-full shrink-0">
                        <Zap className="w-8 h-8 text-red-400" />
                    </div>
                    <div>
                        <h4 className="text-lg font-bold text-red-400 mb-1">Su Responsabilidad: La Contraseña</h4>
                        <p className="text-slate-300 text-sm">
                            La tecnología protege la puerta, pero usted tiene la llave.
                            <strong className="text-white block mt-1">Cambie su contraseña cada 6 meses. No use su DNI.</strong>
                        </p>
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
                    El futuro de la gestión empresarial empieza hoy.
                </p>
                <div className="flex justify-center gap-4 pt-8">
                    <Link href="/dashboard">
                        <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-xl rounded-full shadow-lg shadow-blue-600/20">
                            Ir al Dashboard
                        </Button>
                    </Link>
                    <Link href="/documentation">
                        <Button size="lg" variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800 px-8 py-6 text-xl rounded-full">
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
            <div className="flex-1 flex items-center justify-center p-4 md:p-8 z-10 overflow-y-auto">
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
