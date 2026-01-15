"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Wallet, AlertCircle, CheckCircle, CreditCard, Banknote, FileText } from "lucide-react"
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

export default function ManageCollectionsPage() {
  return (
    <div className="flex flex-col gap-8 p-6 md:p-12 min-h-screen bg-slate-50/50 dark:bg-slate-950/50">
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex flex-col gap-4"
      >
        <Link href="/documentation" className="inline-flex items-center text-sm text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a Documentación
        </Link>

        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
            <Wallet className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              Gestión de Cobranzas
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Control de cuentas por cobrar, pagos y estados financieros
            </p>
          </div>
        </div>
      </motion.div>

      <Separator className="bg-slate-200 dark:bg-slate-800" />

      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid gap-8 max-w-5xl"
      >
        <motion.div variants={item}>
          <Card className="border-l-4 border-l-emerald-500 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 font-bold">1</div>
                <CardTitle className="text-xl">Registro de Pagos</CardTitle>
              </div>
              <CardDescription className="ml-11">
                Cómo ingresar un abono al sistema correctamente.
              </CardDescription>
            </CardHeader>
            <CardContent className="ml-11">
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-xs font-medium text-slate-600 dark:text-slate-300">
                    <Banknote className="h-3 w-3" /> Efectivo
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-xs font-medium text-slate-600 dark:text-slate-300">
                    <CreditCard className="h-3 w-3" /> Transferencia
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-xs font-medium text-slate-600 dark:text-slate-300">
                    <FileText className="h-3 w-3" /> Cheque
                  </div>
                </div>
                <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-300 ml-2">
                  <li>Ubica la factura pendiente en el módulo de Cobranzas.</li>
                  <li>Haz clic en el botón <strong>Registrar Pago</strong>.</li>
                  <li>Selecciona el método e ingresa el monto parcial o total.</li>
                  <li>Opcional: Adjunta la foto del voucher o comprobante.</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="border-l-4 border-l-orange-500 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center text-orange-600 font-bold">2</div>
                <CardTitle className="text-xl">Semáforo de Deuda</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="ml-11">
              <div className="space-y-3">
                <div className="flex items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-800">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                  <div>
                    <span className="font-semibold text-green-900 dark:text-green-200">Al Día</span>
                    <p className="text-xs text-green-700 dark:text-green-300">Facturas vigentes dentro del plazo de crédito.</p>
                  </div>
                </div>
                <div className="flex items-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-100 dark:border-yellow-800">
                  <AlertCircle className="h-5 w-5 text-yellow-500 mr-3" />
                  <div>
                    <span className="font-semibold text-yellow-900 dark:text-yellow-200">Por Vencer</span>
                    <p className="text-xs text-yellow-700 dark:text-yellow-300">Quedan menos de 7 días para el vencimiento.</p>
                  </div>
                </div>
                <div className="flex items-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-800">
                  <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
                  <div>
                    <span className="font-semibold text-red-900 dark:text-red-200">Vencido</span>
                    <p className="text-xs text-red-700 dark:text-red-300">Fecha límite excedida. Requiere gestión de cobro.</p>
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
