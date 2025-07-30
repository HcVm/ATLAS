"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Paperclip } from "lucide-react"
import Link from "next/link"

export default function UploadAttachmentsPage() {
  return (
    <div className="flex flex-col gap-6 p-6 md:p-8">
      <Link href="/documentation" className="flex items-center text-blue-600 hover:underline dark:text-blue-400">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Volver a Documentación
      </Link>

      <div className="flex items-center gap-4">
        <Paperclip className="h-8 w-8 text-slate-600 dark:text-slate-400" />
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Subir Archivos Adjuntos</h1>
      </div>
      <p className="text-slate-600 dark:text-slate-300 max-w-2xl">
        Aprende a adjuntar archivos relevantes a tus documentos existentes para mantener toda la información
        centralizada.
      </p>

      <Separator className="my-4 bg-slate-200 dark:bg-slate-700" />

      <Card className="bg-white dark:bg-slate-850 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            Paso 1: Seleccionar el Documento
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            Encuentra el documento al que deseas añadir archivos.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-slate-600 dark:text-slate-300 space-y-4">
          <p>
            Desde la lista de documentos, haz clic en el documento específico al que deseas adjuntar archivos. Esto te
            llevará a la vista de detalles o edición del documento.
          </p>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-slate-850 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            Paso 2: Acceder a la Sección de Adjuntos
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            Localiza la opción para gestionar archivos adjuntos.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-slate-600 dark:text-slate-300 space-y-4">
          <p>
            Dentro de la vista del documento, busca una sección o pestaña etiquetada como "Adjuntos", "Archivos" o un
            icono de clip. Haz clic en ella para expandir las opciones de adjuntos.
          </p>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-slate-850 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            Paso 3: Subir los Archivos
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            Selecciona y carga los archivos desde tu dispositivo.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-slate-600 dark:text-slate-300 space-y-4">
          <p>
            Haz clic en el botón "Subir Archivo" o arrastra y suelta los archivos directamente en el área designada.
            Puedes seleccionar uno o varios archivos a la vez.
          </p>
          <p>
            Una vez que los archivos se hayan cargado, asegúrate de guardar los cambios en el documento para que los
            adjuntos queden asociados permanentemente.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
