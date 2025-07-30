"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Search } from "lucide-react"
import Link from "next/link"

export default function SearchDocumentsPage() {
  return (
    <div className="flex flex-col gap-6 p-6 md:p-8">
      <Link href="/documentation" className="flex items-center text-blue-600 hover:underline dark:text-blue-400">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Volver a Documentación
      </Link>

      <div className="flex items-center gap-4">
        <Search className="h-8 w-8 text-slate-600 dark:text-slate-400" />
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Buscar y Filtrar Documentos</h1>
      </div>
      <p className="text-slate-600 dark:text-slate-300 max-w-2xl">
        Aprende a utilizar las herramientas de búsqueda y filtrado para encontrar rápidamente los documentos que
        necesitas.
      </p>

      <Separator className="my-4 bg-slate-200 dark:bg-slate-700" />

      <Card className="bg-white dark:bg-slate-850 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            Paso 1: Usar la Barra de Búsqueda
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            Realiza búsquedas rápidas por palabras clave.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-slate-600 dark:text-slate-300 space-y-4">
          <p>
            En la página principal de "Documentos", encontrarás una barra de búsqueda en la parte superior. Ingresa
            palabras clave relacionadas con el documento que buscas (ej. título, descripción, nombre del archivo
            adjunto).
          </p>
          <p>Presiona `Enter` o haz clic en el icono de búsqueda para ver los resultados.</p>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-slate-850 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            Paso 2: Aplicar Filtros Avanzados
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            Refina tus resultados con opciones de filtrado específicas.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-slate-600 dark:text-slate-300 space-y-4">
          <p>
            Junto a la barra de búsqueda, o en una sección lateral, encontrarás opciones de filtrado. Puedes filtrar
            documentos por:
          </p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>
              <strong>Tipo de Documento:</strong> Selecciona una categoría específica.
            </li>
            <li>
              <strong>Fecha:</strong> Rango de fechas de emisión o creación.
            </li>
            <li>
              <strong>Departamento:</strong> Filtra por el departamento al que pertenece el documento.
            </li>
            <li>
              <strong>Estado:</strong> Si aplica, filtra por el estado del documento (ej. Borrador, Publicado,
              Archivador).
            </li>
          </ul>
          <p>Combina filtros para obtener resultados más precisos. Los resultados se actualizarán automáticamente.</p>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-slate-850 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            Paso 3: Limpiar Filtros
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            Restablece la vista a todos los documentos.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-slate-600 dark:text-slate-300 space-y-4">
          <p>
            Para eliminar todos los filtros aplicados y ver la lista completa de documentos, busca el botón "Limpiar
            Filtros" o "Restablecer".
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
