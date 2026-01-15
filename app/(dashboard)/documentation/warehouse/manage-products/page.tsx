"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Package, Barcode, Tag, Search, Box, AlertCircle } from "lucide-react"
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

export default function ManageProductsPage() {
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
          <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
            <Package className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              Gestión de Productos (Almacén General)
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Administración del catálogo maestro para ventas y distribución
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
          <Card className="border-l-4 border-l-amber-500 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600 font-bold">1</div>
                <CardTitle className="text-xl">Ficha del Producto</CardTitle>
              </div>
              <CardDescription className="ml-11">
                Datos esenciales para la venta y control logístico.
              </CardDescription>
            </CardHeader>
            <CardContent className="ml-11">
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { label: "Código de Barras", icon: Barcode, desc: "Escaneo rápido en POS." },
                  { label: "Marca/Categoría", icon: Tag, desc: "Para reportes y filtros." },
                  { label: "Precios", icon: Box, desc: "Costo vs Venta (Margen)." },
                  { label: "Ubicación", icon: MapPin, desc: "Pasillo/Estante físico." }
                ].map((field, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                    <field.icon className="h-5 w-5 text-amber-500 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-slate-700 dark:text-slate-200">{field.label}</h4>
                      <p className="text-xs text-slate-500">{field.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="border-l-4 border-l-cyan-500 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-cyan-100 dark:bg-cyan-900/50 flex items-center justify-center text-cyan-600 font-bold">2</div>
                <CardTitle className="text-xl">Semáforo de Stock</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="ml-11">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-800">
                  <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
                  <span className="font-medium text-green-900 dark:text-green-200">Disponible</span>
                </div>
                <div className="flex-1 flex items-center gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-100 dark:border-orange-800">
                  <div className="h-3 w-3 rounded-full bg-orange-500" />
                  <span className="font-medium text-orange-900 dark:text-orange-200">Bajo Stock</span>
                </div>
                <div className="flex-1 flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-800">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <span className="font-medium text-red-900 dark:text-red-200">Agotado</span>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
                <AlertCircle className="h-4 w-4" />
                <p>El estado cambia automáticamente según el nivel de "Stock Mínimo" configurado.</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="border-l-4 border-l-indigo-500 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 font-bold">3</div>
                <CardTitle className="text-xl">Búsqueda Avanzada</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="ml-11">
              <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-xl flex items-center gap-3 text-slate-400">
                <Search className="h-5 w-5" />
                <span className="text-sm">Buscar por nombre, SKU, marca o escanear código de barras...</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  )
}

function MapPin(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}
