"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Rss } from "lucide-react"
import Link from "next/link"

export default function ViewNewsFeedPage() {
  return (
    <div className="flex flex-col gap-6 p-6 md:p-8">
      <Link href="/documentation" className="flex items-center text-blue-600 hover:underline dark:text-blue-400">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Volver a Documentación
      </Link>

      <div className="flex items-center gap-4">
        <Rss className="h-8 w-8 text-slate-600 dark:text-slate-400" />
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Visualizar el Feed de Noticias</h1>
      </div>
      <p className="text-slate-600 dark:text-slate-300 max-w-2xl">
        Esta guía te ayudará a mantenerte al día con los últimos anuncios y actualizaciones de la plataforma.
      </p>

      <Separator className="my-4 bg-slate-200 dark:bg-slate-700" />

      <Card className="bg-white dark:bg-slate-850 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            Paso 1: Acceder a la Sección de Noticias
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            Navega a la sección de noticias para ver las publicaciones.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-slate-600 dark:text-slate-300 space-y-4">
          <p>
            Desde el panel de control, haz clic en "Noticias" en el menú lateral. Esto te llevará directamente al feed
            de noticias, donde verás las publicaciones más recientes.
          </p>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-slate-850 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            Paso 2: Navegar por el Feed
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            Explora las diferentes publicaciones de noticias.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-slate-600 dark:text-slate-300 space-y-4">
          <p>
            El feed de noticias mostrará las publicaciones en orden cronológico inverso (las más recientes primero).
            Puedes desplazarte hacia abajo para ver publicaciones anteriores.
          </p>
          <p>
            Cada publicación mostrará un título, una breve descripción y la fecha de publicación. Haz clic en el título
            o en la publicación para ver el contenido completo.
          </p>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-slate-850 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            Paso 3: Interacción (si aplica)
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            Algunas publicaciones pueden permitir comentarios o reacciones.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-slate-600 dark:text-slate-300 space-y-4">
          <p>
            Dependiendo de la configuración de la plataforma, algunas publicaciones de noticias pueden permitirte dejar
            comentarios o reaccionar a ellas. Si estas opciones están disponibles, las encontrarás en la parte inferior
            de cada publicación.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
