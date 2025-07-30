"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Package } from "lucide-react"
import Link from "next/link"

export default function ManageProductsPage() {
  return (
    <div className="flex flex-col gap-6 p-6 md:p-8">
      <Link href="/documentation" className="flex items-center text-blue-600 hover:underline dark:text-blue-400">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Volver a Documentación
      </Link>

      <div className="flex items-center gap-4">
        <Package className="h-8 w-8 text-slate-600 dark:text-slate-400" />
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
          Gestión de Productos (Almacén General)
        </h1>
      </div>
      <p className="text-slate-600 dark:text-slate-300 max-w-2xl">
        Esta guía te ayudará a añadir, editar y eliminar productos en el inventario de tu almacén general.
      </p>

      <Separator className="my-4 bg-slate-200 dark:bg-slate-700" />

      <Card className="bg-white dark:bg-slate-850 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            Paso 1: Acceder a la Sección de Productos
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            Navega a la sección de productos del almacén.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-slate-600 dark:text-slate-300 space-y-4">
          <p>
            Desde el panel de control, haz clic en "Almacén" y luego en "Productos" en el menú lateral. Esto te llevará
            a la lista de todos los productos en tu inventario general.
          </p>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-slate-850 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            Paso 2: Añadir un Nuevo Producto
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            Registra un nuevo artículo en el inventario.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-slate-600 dark:text-slate-300 space-y-4">
          <p>
            En la página de productos, haz clic en el botón "Nuevo Producto" o un icono similar. Rellena los campos
            requeridos como nombre, descripción, SKU, precio y cantidad inicial. Haz clic en "Guardar" para añadirlo.
          </p>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-slate-850 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            Paso 3: Editar un Producto Existente
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            Modifica la información de un producto.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-slate-600 dark:text-slate-300 space-y-4">
          <p>
            En la lista de productos, haz clic en el botón "Editar" (icono de lápiz) junto al producto que deseas
            modificar. Realiza los cambios necesarios y haz clic en "Guardar Cambios".
          </p>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-slate-850 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            Paso 4: Eliminar un Producto
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            Remueve un producto del inventario.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-slate-600 dark:text-slate-300 space-y-4">
          <p>
            Para eliminar un producto, haz clic en el botón "Eliminar" (icono de papelera) junto al producto. Confirma
            la acción cuando se te solicite. Ten en cuenta que esta acción es irreversible.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
