"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, QrCode } from "lucide-react"
import Link from "next/link"

export default function GenerateQrPage() {
  return (
    <div className="flex flex-col gap-6 p-6 md:p-8">
      <Link href="/documentation" className="flex items-center text-blue-600 hover:underline dark:text-blue-400">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Volver a Documentación
      </Link>

      <div className="flex items-center gap-4">
        <QrCode className="h-8 w-8 text-slate-600 dark:text-slate-400" />
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Generar Códigos QR para Documentos</h1>
      </div>
      <p className="text-slate-600 dark:text-slate-300 max-w-2xl">
        Aprende a generar códigos QR para tus documentos, facilitando el acceso rápido y la verificación.
      </p>

      <Separator className="my-4 bg-slate-200 dark:bg-slate-700" />

      <Card className="bg-white dark:bg-slate-850 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            Paso 1: Seleccionar el Documento
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            Elige el documento para el cual deseas generar un código QR.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-slate-600 dark:text-slate-300 space-y-4">
          <p>
            Desde la lista de documentos, haz clic en el documento específico. Esto te llevará a la vista de detalles
            del documento.
          </p>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-slate-850 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            Paso 2: Acceder a la Opción de QR
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            Localiza la funcionalidad para generar el código QR.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-slate-600 dark:text-slate-300 space-y-4">
          <p>
            Dentro de la vista de detalles del documento, busca un botón o una sección etiquetada como "Generar QR" o un
            icono de código QR. Haz clic en esta opción.
          </p>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-slate-850 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            Paso 3: Descargar o Imprimir el QR
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            Utiliza el código QR generado.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-slate-600 dark:text-slate-300 space-y-4">
          <p>
            Una vez generado, el código QR se mostrará en pantalla. Tendrás opciones para descargarlo como imagen (PNG,
            JPG) o imprimirlo directamente.
          </p>
          <p>
            Este código QR puede ser escaneado para acceder directamente al documento en la plataforma, facilitando su
            distribución y verificación.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
