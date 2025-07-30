"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Building2 } from "lucide-react"
import Link from "next/link"

export default function CreateNewDepartmentPage() {
  return (
    <div className="flex flex-col gap-6 p-6 md:p-8">
      <Link href="/documentation" className="flex items-center text-blue-600 hover:underline dark:text-blue-400">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Volver a Documentación
      </Link>

      <div className="flex items-center gap-4">
        <Building2 className="h-8 w-8 text-slate-600 dark:text-slate-400" />
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Crear un Nuevo Departamento</h1>
      </div>
      <p className="text-slate-600 dark:text-slate-300 max-w-2xl">
        Esta guía explica cómo añadir nuevas áreas organizativas o departamentos a tu empresa dentro de la plataforma.
      </p>

      <Separator className="my-4 bg-slate-200 dark:bg-slate-700" />

      <Card className="bg-white dark:bg-slate-850 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            Paso 1: Acceder a la Gestión de Departamentos
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            Navega a la sección donde se administran los departamentos.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-slate-600 dark:text-slate-300 space-y-4">
          <p>
            Desde el panel de control, busca y haz clic en "Departamentos" en el menú lateral. Esto te llevará a la
            lista de todos los departamentos existentes en tu organización.
          </p>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-slate-850 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            Paso 2: Iniciar la Creación de un Nuevo Departamento
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            Haz clic en el botón para añadir un nuevo departamento.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-slate-600 dark:text-slate-300 space-y-4">
          <p>
            En la página de gestión de departamentos, busca y haz clic en el botón "Nuevo Departamento" o un icono
            similar (usualmente un signo `+`).
          </p>
          <p>Esto abrirá un formulario o un diálogo donde podrás ingresar los detalles del nuevo departamento.</p>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-slate-850 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            Paso 3: Rellenar los Datos del Departamento
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            Completa la información requerida para el nuevo departamento.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-slate-600 dark:text-slate-300 space-y-4">
          <p>Ingresa la siguiente información obligatoria:</p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>
              <strong>Nombre del Departamento:</strong> Un nombre claro y descriptivo para el departamento (ej.
              "Recursos Humanos", "Contabilidad", "Ventas").
            </li>
            <li>
              <strong>Descripción (Opcional):</strong> Una breve descripción de las funciones o responsabilidades del
              departamento.
            </li>
          </ul>
          <p>
            Una vez que hayas rellenado los campos, haz clic en "Guardar" o "Crear Departamento". El nuevo departamento
            será añadido a la lista y estará disponible para ser asignado a usuarios y documentos.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
