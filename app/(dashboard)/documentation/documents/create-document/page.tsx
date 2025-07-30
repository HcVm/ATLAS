"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, FileText } from "lucide-react"
import Link from "next/link"

export default function CreateDocumentPage() {
  return (
    <div className="flex flex-col gap-6 p-6 md:p-8">
      <Link href="/documentation" className="flex items-center text-blue-600 hover:underline dark:text-blue-400">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Volver a Documentación
      </Link>

      <div className="flex items-center gap-4">
        <FileText className="h-8 w-8 text-slate-600 dark:text-slate-400" />
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Crear un Nuevo Documento</h1>
      </div>
      <p className="text-slate-600 dark:text-slate-300 max-w-2xl">
        Esta guía te ayudará a registrar y organizar nuevos documentos en la plataforma de manera eficiente.
      </p>

      <Separator className="my-4 bg-slate-200 dark:bg-slate-700" />

      <Card className="bg-white dark:bg-slate-850 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            Paso 1: Acceder al Formulario de Creación
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            Navega a la sección de documentos y selecciona la opción para crear uno nuevo.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-slate-600 dark:text-slate-300 space-y-4">
          <p>
            Desde el panel de control, haz clic en "Documentos" en el menú lateral. Una vez en la página de documentos,
            busca y haz clic en el botón "Nuevo Documento" o un icono similar (usualmente un signo `+`).
          </p>
          <p>
            Esto te redirigirá al formulario de creación de documentos, donde podrás ingresar toda la información
            relevante.
          </p>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-slate-850 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            Paso 2: Rellenar los Campos del Documento
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            Completa la información requerida en el formulario.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-slate-600 dark:text-slate-300 space-y-4">
          <p>Asegúrate de rellenar todos los campos obligatorios, que suelen incluir:</p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>
              <strong>Título del Documento:</strong> Un nombre descriptivo para el documento.
            </li>
            <li>
              <strong>Tipo de Documento:</strong> Selecciona la categoría a la que pertenece (ej. Contrato, Factura,
              Informe).
            </li>
            <li>
              <strong>Fecha de Emisión:</strong> La fecha en que el documento fue creado o emitido.
            </li>
            <li>
              <strong>Descripción:</strong> Un resumen breve del contenido del documento.
            </li>
            <li>
              <strong>Departamento:</strong> El departamento al que pertenece el documento.
            </li>
          </ul>
          <p>También puedes añadir información adicional en campos opcionales si es necesario.</p>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-slate-850 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            Paso 3: Guardar el Documento
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            Confirma la creación del documento.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-slate-600 dark:text-slate-300 space-y-4">
          <p>
            Una vez que hayas rellenado todos los campos, haz clic en el botón "Guardar" o "Crear Documento". El sistema
            procesará la información y el nuevo documento aparecerá en tu lista de documentos.
          </p>
          <p>Recibirás una notificación de confirmación si el documento se ha guardado correctamente.</p>
        </CardContent>
      </Card>
    </div>
  )
}
