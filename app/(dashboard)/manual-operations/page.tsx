"use client"

import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { useCompany } from "@/lib/company-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { AlertTriangle, Plus, FileText, Info, CheckCircle2, FileSignature, Settings2 } from "lucide-react"
import ManualCCILetterForm from "@/components/manual-operations/manual-cci-letter-form"
import { motion } from "framer-motion"

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.4 }
  }
}

export default function ManualOperationsPage() {
  const { user } = useAuth()
  const { selectedCompany } = useCompany()
  const [showNewCCIDialog, setShowNewCCIDialog] = useState(false)

  const hasSalesAccess =
    user?.role === "admin" ||
    user?.role === "supervisor" ||
    ["Ventas", "Administración", "Operaciones", "Jefatura de Ventas", "Contabilidad", "Acuerdos Marco", "acuerdos marco"].includes(user?.departments?.name || "")

  if (!hasSalesAccess || !selectedCompany) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)] p-4">
        <Card className="w-full max-w-md text-center p-8 border-none shadow-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
          <CardHeader>
            <div className="mx-auto p-4 bg-red-100 dark:bg-red-900/30 rounded-full mb-4">
               <AlertTriangle className="h-10 w-10 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle className="text-2xl font-bold text-slate-800 dark:text-slate-100">Acceso Restringido</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-500 dark:text-slate-400">
              {!hasSalesAccess
                ? "No tienes los permisos necesarios para acceder al módulo de operaciones manuales."
                : "Por favor, selecciona una empresa para continuar con las operaciones."}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <motion.div 
      initial="hidden" 
      animate="visible" 
      variants={containerVariants}
      className="space-y-8 p-4 sm:p-6 lg:p-8 min-h-[calc(100vh-4rem)]"
    >
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-slate-900 via-slate-700 to-slate-600 dark:from-white dark:via-slate-200 dark:to-slate-400 bg-clip-text text-transparent flex items-center gap-3">
            <Settings2 className="h-8 w-8 text-indigo-500" />
            Operaciones Manuales
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Gestión documental personalizada para <span className="font-semibold text-indigo-600 dark:text-indigo-400">{selectedCompany?.name}</span>
          </p>
        </div>
        <Dialog open={showNewCCIDialog} onOpenChange={setShowNewCCIDialog}>
          <DialogTrigger asChild>
            <Button className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20 px-6">
              <Plus className="h-4 w-4 mr-2" /> Crear Carta CCI Manual
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-slate-200/50 dark:border-slate-700/50">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                <FileSignature className="h-6 w-6 text-indigo-500" />
                Crear Carta CCI Manual
              </DialogTitle>
              <DialogDescription className="text-slate-500">
                Completa el formulario para generar una carta de autorización CCI sin vincular a una venta existente.
              </DialogDescription>
            </DialogHeader>
            <ManualCCILetterForm
              onSuccess={() => {
                setShowNewCCIDialog(false)
              }}
            />
          </DialogContent>
        </Dialog>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <motion.div variants={itemVariants}>
           <Card className="h-full border-none shadow-lg bg-white/60 dark:bg-slate-900/60 backdrop-blur-md overflow-hidden group hover:shadow-xl transition-all duration-300">
             <div className="h-2 w-full bg-gradient-to-r from-indigo-500 to-purple-500" />
             <CardHeader>
               <div className="mb-4 p-3 bg-indigo-50 dark:bg-indigo-900/20 w-fit rounded-xl">
                 <FileText className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
               </div>
               <CardTitle className="text-xl text-slate-800 dark:text-slate-100">Cartas CCI Manuales</CardTitle>
               <CardDescription className="text-slate-500">
                 Generación libre de documentos de acreditación bancaria
               </CardDescription>
             </CardHeader>
             <CardContent className="space-y-6">
               <div className="bg-slate-50/80 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-800">
                 <p className="text-sm text-slate-600 dark:text-slate-300 mb-3 font-medium">
                   Funcionalidades principales:
                 </p>
                 <ul className="space-y-3">
                   {[
                     "Ingreso manual de datos del cliente (Razón Social, RUC)",
                     "Selección flexible de tipo de orden (OCAM / OC)",
                     "Control de visibilidad de campos (SIAF, Orden Física)",
                     "Formato estandarizado idéntico al automático"
                   ].map((item, i) => (
                     <li key={i} className="flex items-start gap-3 text-sm text-slate-500">
                       <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                       <span>{item}</span>
                     </li>
                   ))}
                 </ul>
               </div>
               <Button
                 className="w-full rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900"
                 onClick={() => setShowNewCCIDialog(true)}
               >
                 Comenzar Proceso <Plus className="h-4 w-4 ml-2" />
               </Button>
             </CardContent>
           </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
           <Card className="h-full border-none shadow-lg bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800/50 backdrop-blur-md">
             <CardHeader>
               <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 w-fit rounded-xl">
                 <Info className="h-8 w-8 text-blue-600 dark:text-blue-400" />
               </div>
               <CardTitle className="text-xl text-slate-800 dark:text-slate-100">Guía de Uso</CardTitle>
               <CardDescription>
                 ¿Cuándo utilizar operaciones manuales?
               </CardDescription>
             </CardHeader>
             <CardContent className="space-y-6">
               <div className="space-y-4">
                 <div className="flex gap-4 p-4 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700">
                   <div className="shrink-0">
                     <span className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-sm font-bold text-slate-600">1</span>
                   </div>
                   <div>
                     <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">Clientes sin Venta Registrada</h4>
                     <p className="text-sm text-slate-500 mt-1">
                       Ideal para adelantar documentación administrativa antes de formalizar la venta en el sistema.
                     </p>
                   </div>
                 </div>

                 <div className="flex gap-4 p-4 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700">
                   <div className="shrink-0">
                     <span className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-sm font-bold text-slate-600">2</span>
                   </div>
                   <div>
                     <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">Correcciones Específicas</h4>
                     <p className="text-sm text-slate-500 mt-1">
                       Cuando se requiere una carta con datos ligeramente diferentes a la venta original por solicitud de la entidad.
                     </p>
                   </div>
                 </div>

                 <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30">
                   <h4 className="font-semibold text-amber-800 dark:text-amber-200 text-sm mb-2 flex items-center gap-2">
                     <AlertTriangle className="h-4 w-4" /> Datos Requeridos
                   </h4>
                   <p className="text-sm text-amber-700 dark:text-amber-300/80">
                     Ten a la mano: Razón Social, RUC, Dirección Fiscal, Tipo y Número de Orden.
                   </p>
                 </div>
               </div>
             </CardContent>
           </Card>
        </motion.div>
      </div>
    </motion.div>
  )
}
