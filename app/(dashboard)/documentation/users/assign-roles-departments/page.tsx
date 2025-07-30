"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, UserCog } from "lucide-react"
import Link from "next/link"

export default function AssignRolesDepartmentsPage() {
  return (
    <div className="flex flex-col gap-6 p-6 md:p-8">
      <Link href="/documentation" className="flex items-center text-blue-600 hover:underline dark:text-blue-400">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Volver a Documentación
      </Link>

      <div className="flex items-center gap-4">
        <UserCog className="h-8 w-8 text-slate-600 dark:text-slate-400" />
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
          Asignar Roles y Departamentos a Usuarios
        </h1>
      </div>
      <p className="text-slate-600 dark:text-slate-300 max-w-2xl">
        Esta guía para administradores explica cómo modificar los roles y departamentos de los usuarios existentes para
        controlar sus permisos y acceso.
      </p>

      <Separator className="my-4 bg-slate-200 dark:bg-slate-700" />

      <Card className="bg-white dark:bg-slate-850 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            Paso 1: Acceder a la Gestión de Usuarios
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            Navega a la sección de administración de usuarios.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-slate-600 dark:text-slate-300 space-y-4">
          <p>
            Desde el panel de control, haz clic en "Usuarios" o "Administración de Usuarios" en el menú lateral. Esto te
            llevará a la lista de usuarios existentes.
          </p>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-slate-850 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            Paso 2: Seleccionar el Usuario a Editar
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            Encuentra y selecciona el usuario cuyos permisos deseas modificar.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-slate-600 dark:text-slate-300 space-y-4">
          <p>
            En la lista de usuarios, busca el usuario deseado y haz clic en su nombre o en el botón de "Editar"
            (usualmente un icono de lápiz) junto a su entrada.
          </p>
          <p>Esto abrirá el formulario de edición de perfil del usuario.</p>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-slate-850 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            Paso 3: Modificar Rol y Departamento
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            Actualiza el rol y/o el departamento del usuario.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-slate-600 dark:text-slate-300 space-y-4">
          <p>Dentro del formulario de edición, localiza los campos "Rol" y "Departamento".</p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>
              <strong>Rol:</strong> Selecciona el nuevo rol del usuario de la lista desplegable (ej. Administrador,
              Editor, Lector).
            </li>
            <li>
              <strong>Departamento:</strong> Asigna el nuevo departamento si el usuario ha cambiado de área.
            </li>
          </ul>
          <p>
            Una vez realizados los cambios, haz clic en "Guardar Cambios" para aplicar las actualizaciones. Los nuevos
            permisos y asignaciones de departamento se aplicarán inmediatamente.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
