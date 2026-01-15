"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, FileText, Upload, Globe, Hash, Paperclip, Lock, Eye } from "lucide-react"
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

export default function CreateDocumentPage() {
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
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
            <FileText className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              Crear un Nuevo Documento
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Guía para el registro y digitalización de documentos oficiales
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
          <Card className="border-l-4 border-l-blue-500 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 font-bold">1</div>
                <CardTitle className="text-xl">Formulario de Creación</CardTitle>
              </div>
              <CardDescription className="ml-11">
                Completa los metadatos esenciales para indexar el documento.
              </CardDescription>
            </CardHeader>
            <CardContent className="ml-11">
              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 border border-slate-100 dark:border-slate-800 space-y-3">
                {[
                  { label: "Título", desc: "Nombre descriptivo y único (ej. 'Contrato de Servicios 2024').", req: true },
                  { label: "Departamento", desc: "Área propietaria. Define la serie de numeración.", req: true },
                  { label: "Descripción", desc: "Resumen del contenido o palabras clave para búsqueda.", req: false },
                ].map((field, i) => (
                  <div key={i} className="flex gap-3">
                    <div className={`mt-1.5 h-2 w-2 rounded-full ${field.req ? 'bg-red-500' : 'bg-slate-300'}`} />
                    <div>
                      <span className="font-semibold text-slate-700 dark:text-slate-200">{field.label}</span>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{field.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="border-l-4 border-l-teal-500 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center text-teal-600 font-bold">2</div>
                <CardTitle className="text-xl">Archivos y Adjuntos</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="ml-11">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg flex flex-col items-center text-center gap-2">
                  <Upload className="h-8 w-8 text-teal-500" />
                  <h3 className="font-medium">Archivo Principal</h3>
                  <p className="text-xs text-slate-500">PDF, DOCX, XLSX. Máx 10MB.</p>
                </div>
                <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg flex flex-col items-center text-center gap-2">
                  <Paperclip className="h-8 w-8 text-slate-400" />
                  <h3 className="font-medium">Adjuntos Extra</h3>
                  <p className="text-xs text-slate-500">Anexos, evidencias, fotos.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="border-l-4 border-l-indigo-500 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 font-bold">3</div>
                <CardTitle className="text-xl">Numeración y Privacidad</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="ml-11 space-y-4">
              <div className="flex items-center gap-4 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                <Hash className="h-6 w-6 text-indigo-500" />
                <div>
                  <h4 className="font-semibold text-indigo-900 dark:text-indigo-200">Autonumeración Inteligente</h4>
                  <p className="text-sm text-indigo-700 dark:text-indigo-300">Formato: <code className="bg-white/50 px-1 rounded">EMPRESA-DEPTO-AÑO-001</code></p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-3 border border-slate-200 dark:border-slate-700 rounded-lg flex items-start gap-3">
                  <Globe className="h-5 w-5 text-green-500 mt-1" />
                  <div>
                    <span className="font-medium">Público</span>
                    <p className="text-xs text-slate-500 mt-1">Genera enlace y código QR accesible sin login.</p>
                  </div>
                </div>
                <div className="p-3 border border-slate-200 dark:border-slate-700 rounded-lg flex items-start gap-3">
                  <Lock className="h-5 w-5 text-slate-500 mt-1" />
                  <div>
                    <span className="font-medium">Privado</span>
                    <p className="text-xs text-slate-500 mt-1">Solo visible para usuarios internos autorizados.</p>
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
