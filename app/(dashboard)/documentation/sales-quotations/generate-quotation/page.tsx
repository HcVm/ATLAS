"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, FileText, User, List, MapPin, Calculator, Calendar } from "lucide-react"
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

export default function GenerateQuotationPage() {
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
          <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
            <FileText className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              Generar Cotización
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Creación de propuestas comerciales y planificación logística
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
          <Card className="border-l-4 border-l-indigo-500 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 font-bold">1</div>
                <CardTitle className="text-xl">Datos Generales y Producto</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="ml-11">
              <div className="grid gap-4">
                <div className="flex items-start gap-3 p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                  <User className="h-5 w-5 text-indigo-500 mt-1" />
                  <div>
                    <h4 className="font-semibold text-slate-700 dark:text-slate-200">Cliente y Entidad</h4>
                    <p className="text-xs text-slate-500">Selecciona la empresa o entidad pública a la que va dirigida la cotización.</p>
                  </div>
                </div>
                
                <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-100 dark:border-slate-800">
                  <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                    <Calculator className="h-4 w-4" />
                    Estructura de Precios
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div className="p-2 bg-white dark:bg-slate-900 rounded border">
                      <span className="block text-slate-400">Plataforma</span>
                      <span className="font-medium text-slate-700 dark:text-slate-200">Base del sistema</span>
                    </div>
                    <div className="p-2 bg-white dark:bg-slate-900 rounded border">
                      <span className="block text-slate-400">Proveedor</span>
                      <span className="font-medium text-slate-700 dark:text-slate-200">Costo real</span>
                    </div>
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded border border-indigo-100">
                      <span className="block text-indigo-400">Oferta</span>
                      <span className="font-bold text-indigo-700 dark:text-indigo-300">Precio Final</span>
                    </div>
                    <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded border border-orange-100">
                      <span className="block text-orange-400">Techo</span>
                      <span className="font-medium text-orange-700 dark:text-orange-300">Presupuestal</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="border-l-4 border-l-violet-500 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center text-violet-600 font-bold">2</div>
                <CardTitle className="text-xl">Comisiones y Validez</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="ml-11">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 text-violet-700 dark:text-violet-300 font-medium text-sm">
                    <User className="h-4 w-4" /> Contacto/Vendedor
                  </div>
                  <p className="text-xs text-slate-500">
                    Define quién gestiona la venta y el <strong>porcentaje de comisión</strong> aplicable. El sistema calculará automáticamente el monto a pagar basado en el total sin IGV.
                  </p>
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 text-violet-700 dark:text-violet-300 font-medium text-sm">
                    <Calendar className="h-4 w-4" /> Estado y Vigencia
                  </div>
                  <p className="text-xs text-slate-500">
                    Establece hasta cuándo es válida la oferta y su estado actual (Borrador, Enviada, Aprobada, etc.).
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="border-l-4 border-l-fuchsia-500 shadow-lg hover:shadow-xl transition-shadow duration-300 bg-gradient-to-br from-white to-fuchsia-50/30 dark:from-slate-950 dark:to-fuchsia-900/10">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-fuchsia-100 dark:bg-fuchsia-900/50 flex items-center justify-center text-fuchsia-600 font-bold">3</div>
                <CardTitle className="text-xl flex items-center gap-2">
                  Planificador de Rutas
                  <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900 dark:text-fuchsia-300">
                    Powered by Google Maps
                  </span>
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="ml-11">
              <div className="space-y-4">
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Una vez creada la cotización, accede a la pestaña <strong>"Ruta"</strong> para calcular la logística de entrega:
                </p>
                
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                    <MapPin className="h-5 w-5 text-red-500 mb-2" />
                    <h5 className="font-medium text-slate-800 dark:text-slate-200 text-sm">Cálculo Automático</h5>
                    <p className="text-xs text-slate-500 mt-1">
                      Ingresa Origen y Destino para obtener la <strong>distancia exacta</strong> y el <strong>tiempo estimado</strong> de viaje.
                    </p>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                    <List className="h-5 w-5 text-blue-500 mb-2" />
                    <h5 className="font-medium text-slate-800 dark:text-slate-200 text-sm">Opciones de Ruta</h5>
                    <p className="text-xs text-slate-500 mt-1">
                      Configura preferencias como <strong>Evitar Peajes</strong> o <strong>Evitar Autopistas</strong> para optimizar costos logísticos.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-center p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-100 dark:border-green-900/50 text-xs text-green-700 dark:text-green-300">
                  <span className="font-semibold mr-1">Tip:</span> 
                  Guarda la ruta calculada para que aparezca en los reportes de logística.
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  )
}
