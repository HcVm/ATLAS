"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, ShoppingCart, User, Package, Calculator, FileText, Truck, CreditCard } from "lucide-react"
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

export default function CreateSalePage() {
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
            <ShoppingCart className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              Registrar Nueva Venta
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Flujo completo para el registro, facturación y salida de mercancía
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
                <CardTitle className="text-xl">Vinculación y Cliente</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="ml-11">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-start gap-3 p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                  <FileText className="h-5 w-5 text-emerald-500 mt-1" />
                  <div>
                    <h4 className="font-semibold text-slate-700 dark:text-slate-200">Desde Cotización</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Ingresa el código (ej: <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">COT-2024-001</span>) para precargar automáticamente los datos del cliente y productos aprobados.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                  <User className="h-5 w-5 text-emerald-500 mt-1" />
                  <div>
                    <h4 className="font-semibold text-slate-700 dark:text-slate-200">Selección de Entidad</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Busca la entidad (Cliente) por RUC o nombre. Si tiene Unidad Ejecutora asociada, se mostrará automáticamente.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="border-l-4 border-l-teal-500 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center text-teal-600 font-bold">2</div>
                <CardTitle className="text-xl">Detalles del Producto y Logística</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="ml-11">
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-teal-50 dark:bg-teal-900/20 rounded-lg">
                  <Package className="h-5 w-5 text-teal-600" />
                  <p className="text-sm text-teal-900 dark:text-teal-200">
                    Selecciona el producto del inventario. El sistema validará el <strong>stock disponible</strong> y mostrará alertas si la cantidad excede las existencias.
                  </p>
                </div>
                <div className="grid sm:grid-cols-3 gap-3 text-sm">
                  <div className="p-3 border rounded-lg bg-slate-50 dark:bg-slate-900">
                    <span className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Datos Administrativos</span>
                    <ul className="list-disc list-inside text-slate-500 text-xs space-y-1">
                      <li>EXP. SIAF</li>
                      <li>OCAM (Orden Electrónica)</li>
                      <li>Orden Física</li>
                    </ul>
                  </div>
                  <div className="p-3 border rounded-lg bg-slate-50 dark:bg-slate-900">
                    <span className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Ubicación</span>
                    <ul className="list-disc list-inside text-slate-500 text-xs space-y-1">
                      <li>Proyecto Meta</li>
                      <li>Lugar de Destino Final</li>
                      <li>Encargado de Almacén</li>
                    </ul>
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
                <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 font-bold">3</div>
                <CardTitle className="text-xl">Finanzas y Entrega</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="ml-11">
              <div className="grid gap-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <CreditCard className="h-5 w-5 text-blue-600 mt-1" />
                    <div>
                      <h4 className="font-semibold text-blue-900 dark:text-blue-200">Condiciones Financieras</h4>
                      <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                        Define el <strong>Método de Pago</strong> (Contado/Crédito) y el <strong>Estado de Venta</strong> (Comprometido, Devengado, Girado, Firmado).
                      </p>
                    </div>
                  </div>
                  <div className="flex-1 flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <Truck className="h-5 w-5 text-blue-600 mt-1" />
                    <div>
                      <h4 className="font-semibold text-blue-900 dark:text-blue-200">Programación de Entrega</h4>
                      <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                        Establece el rango de fechas (Inicio y Fin) para la entrega del producto y añade observaciones relevantes.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Calculado</span>
                  <div className="text-right">
                    <span className="text-xs text-slate-500 block">Cantidad × Precio Unitario</span>
                    <span className="font-bold text-lg text-slate-900 dark:text-slate-100">S/ 0.00</span>
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
