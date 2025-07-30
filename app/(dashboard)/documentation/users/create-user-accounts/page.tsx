"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, UserPlus } from "lucide-react"
import Link from "next/link"

export default function CreateUserAccountsPage() {
  return (
    <div className="flex flex-col gap-6 p-6 md:p-8">
      <Link href="/documentation" className="flex items-center text-blue-600 hover:underline dark:text-blue-400">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Volver a Documentación
      </Link>

      <div className="flex items-center gap-4">
        <UserPlus className="h-8 w-8 text-slate-600 dark:text-slate-400" />
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Crear Nuevas Cuentas de Usuario</h1>
      </div>
      <p className="text-slate-600 dark:text-slate-300 max-w-2xl">
        Esta guía es para administradores y explica cómo registrar nuevos usuarios en la plataforma y asignarles roles
        iniciales.
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
            Paso 2: Iniciar la Creación de Usuario
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            Haz clic en el botón para añadir un nuevo usuario.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-slate-600 dark:text-slate-300 space-y-4">
          <p>
            En la página de gestión de usuarios, busca y haz clic en el botón "Crear Usuario", "Nuevo Usuario" o un
            icono similar (usualmente un signo `+`).
          </p>
          <p>Esto abrirá un formulario donde podrás ingresar los datos del nuevo usuario.</p>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-slate-850 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            Paso 3: Rellenar los Datos del Usuario
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            Completa la información del nuevo usuario y asigna un rol.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-slate-600 dark:text-slate-300 space-y-4">
          <p>Ingresa la siguiente información obligatoria:</p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>
              <strong>Nombre Completo:</strong> Nombre y apellido del usuario.
            </li>
            <li>
              <strong>Correo Electrónico:</strong> La dirección de correo electrónico que usará para iniciar sesión.
            </li>
            <li>
              <strong>Contraseña:</strong> Una contraseña inicial para el usuario. Se recomienda que el usuario la
              cambie en su primer inicio de sesión.
            </li>
            <li>
              <strong>Rol:</strong> Asigna el rol adecuado (ej. Administrador, Editor, Lector).
            </li>
            <li>
              <strong>Departamento:</strong> Asigna el departamento al que pertenece el usuario.
            </li>
          </ul>
          <p>Una vez completado, haz clic en "Guardar" o "Crear Cuenta". El nuevo usuario será añadido al sistema.</p>
        </CardContent>
      </Card>
    </div>
  )
}
