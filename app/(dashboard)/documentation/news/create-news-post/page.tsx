"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Megaphone } from "lucide-react"
import Link from "next/link"

export default function CreateNewsPostPage() {
  return (
    <div className="flex flex-col gap-6 p-6 md:p-8">
      <Link href="/documentation" className="flex items-center text-blue-600 hover:underline dark:text-blue-400">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Volver a Documentación
      </Link>

      <div className="flex items-center gap-4">
        <Megaphone className="h-8 w-8 text-slate-600 dark:text-slate-400" />
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
          Crear una Nueva Publicación de Noticias
        </h1>
      </div>
      <p className="text-slate-600 dark:text-slate-300 max-w-2xl">
        Esta guía te ayudará a publicar anuncios y noticias importantes para todos los usuarios de la plataforma.
      </p>

      <Separator className="my-4 bg-slate-200 dark:bg-slate-700" />

      <Card className="bg-white dark:bg-slate-850 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            Paso 1: Acceder a la Sección de Noticias
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            Navega a la sección de gestión de noticias.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-slate-600 dark:text-slate-300 space-y-4">
          <p>
            Desde el panel de control, haz clic en "Noticias" en el menú lateral. Esto te llevará al feed de noticias y
            a las opciones de gestión.
          </p>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-slate-850 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            Paso 2: Iniciar la Creación de una Publicación
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            Haz clic en el botón para crear una nueva noticia.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-slate-600 dark:text-slate-300 space-y-4">
          <p>
            En la página de noticias, busca y haz clic en el botón "Crear Noticia" o un icono similar (usualmente un
            signo `+`).
          </p>
          <p>Esto abrirá un formulario donde podrás redactar tu publicación.</p>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-slate-850 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            Paso 3: Redactar la Publicación
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            Completa el título y el contenido de la noticia.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-slate-600 dark:text-slate-300 space-y-4">
          <p>Ingresa la siguiente información obligatoria:</p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>
              <strong>Título:</strong> Un título atractivo para tu noticia.
            </li>
            <li>
              <strong>Contenido:</strong> El cuerpo de la noticia, donde puedes incluir texto, imágenes y otros
              elementos multimedia si la plataforma lo permite.
            </li>
            <li>
              <strong>Fecha de Publicación:</strong> La fecha en que la noticia se hará visible.
            </li>
          </ul>
          <p>
            Una vez que hayas terminado de redactar, haz clic en "Publicar" o "Guardar Noticia". La publicación
            aparecerá en el feed de noticias para todos los usuarios.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
