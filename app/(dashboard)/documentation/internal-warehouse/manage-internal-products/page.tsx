"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Box, CheckSquare, Printer, Plus, ArrowUpCircle, Tag, Search, Filter } from "lucide-react"
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

export default function ManageInternalProductsPage() {
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
            <Box className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              Gestión de Productos Internos
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Guía completa para el control de inventario y activos internos
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
                <CardTitle className="text-xl">Crear un Nuevo Producto</CardTitle>
              </div>
              <CardDescription className="ml-11">
                Registra un nuevo ítem en el catálogo interno para su seguimiento.
              </CardDescription>
            </CardHeader>
            <CardContent className="ml-11 space-y-4">
              <p className="text-slate-600 dark:text-slate-300">
                Haz clic en el botón <span className="inline-flex items-center px-2 py-1 bg-blue-600 text-white text-xs rounded-md mx-1"><Plus className="h-3 w-3 mr-1" /> Nuevo Producto</span> y completa los campos:
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { label: "Código", desc: "Identificador único (ej. INT-001)" },
                  { label: "Nombre", desc: "Descripción clara del producto" },
                  { label: "Categoría", desc: "Clasificación (Electrónica, Muebles)" },
                  { label: "Unidad", desc: "Unidad de manejo (Unidad, Kg, m)" },
                  { label: "Stock Mínimo", desc: "Alerta de reabastecimiento" },
                  { label: "Serializado", desc: "Para control individual por serie" },
                ].map((field, i) => (
                  <div key={i} className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                    <div className="font-semibold text-slate-700 dark:text-slate-200">{field.label}</div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">{field.desc}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="border-l-4 border-l-emerald-500 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 font-bold">2</div>
                <CardTitle className="text-xl">Registrar Entrada de Stock</CardTitle>
              </div>
              <CardDescription className="ml-11">
                Aumenta el inventario de un producto existente de forma rápida.
              </CardDescription>
            </CardHeader>
            <CardContent className="ml-11">
              <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-800">
                <ol className="relative border-l border-slate-200 dark:border-slate-700 ml-3 space-y-6">
                  <li className="mb-2 ml-6">
                    <span className="absolute flex items-center justify-center w-6 h-6 bg-white rounded-full -left-3 ring-4 ring-white dark:ring-slate-900 dark:bg-slate-800">
                      <Search className="w-3 h-3 text-slate-500" />
                    </span>
                    <h3 className="font-medium leading-tight">Ubica el producto</h3>
                    <p className="text-sm text-slate-500">Encuentra el ítem en la lista principal.</p>
                  </li>
                  <li className="mb-2 ml-6">
                    <span className="absolute flex items-center justify-center w-6 h-6 bg-white rounded-full -left-3 ring-4 ring-white dark:ring-slate-900 dark:bg-slate-800">
                      <ArrowUpCircle className="w-3 h-3 text-emerald-500" />
                    </span>
                    <h3 className="font-medium leading-tight">Registrar Entrada</h3>
                    <p className="text-sm text-slate-500">Selecciona la opción en el menú de acciones.</p>
                  </li>
                  <li className="ml-6">
                    <span className="absolute flex items-center justify-center w-6 h-6 bg-white rounded-full -left-3 ring-4 ring-white dark:ring-slate-900 dark:bg-slate-800">
                      <CheckSquare className="w-3 h-3 text-slate-500" />
                    </span>
                    <h3 className="font-medium leading-tight">Confirmar Cantidad</h3>
                    <p className="text-sm text-slate-500">Ingresa la cantidad y seriales si corresponde.</p>
                  </li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="border-l-4 border-l-purple-500 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-purple-600 font-bold">3</div>
                <CardTitle className="text-xl">Impresión de Etiquetas</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="ml-11 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-white dark:from-purple-900/20 dark:to-slate-900 border border-purple-100 dark:border-purple-900/50">
                  <div className="flex items-center gap-2 mb-2 text-purple-700 dark:text-purple-400 font-semibold">
                    <Tag className="h-4 w-4" /> Individual
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Haz clic en el indicador de la columna "Sticker" para imprimir una sola etiqueta.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-white dark:from-purple-900/20 dark:to-slate-900 border border-purple-100 dark:border-purple-900/50">
                  <div className="flex items-center gap-2 mb-2 text-purple-700 dark:text-purple-400 font-semibold">
                    <Printer className="h-4 w-4" /> Masiva
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Selecciona múltiples ítems y usa el botón "Imprimir Seleccionados" para generar un PDF en lote.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  )
}
