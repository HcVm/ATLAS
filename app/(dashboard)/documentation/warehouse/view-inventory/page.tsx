"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Boxes } from "lucide-react"
import Link from "next/link"

export default function ViewInventoryPage() {
  return (
    <div className="flex flex-col gap-6 p-6 md:p-8">
      <Link href="/documentation" className="flex items-center text-blue-600 hover:underline dark:text-blue-400">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Volver a Documentación
      </Link>

      <div className="flex items-center gap-4">
        <Boxes className="h-8 w-8 text-slate-600 dark:text-slate-400" />
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
          Visualizar el Inventario (Almacén General)
        </h1>
      </div>
      <p className="text-slate-600 dark:text-slate-300 max-w-2xl">
        Esta guía te ayudará a consultar el estado actual de tu inventario general y la disponibilidad de productos.
      </p>

      <Separator className="my-4 bg-slate-200 dark:bg-slate-700" />

      <Card className="bg-white dark:bg-slate-850 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            Paso 1: Acceder a la Sección de Inventario
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            Navega a la vista general del inventario.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-slate-600 dark:text-slate-300 space-y-4">
          <p>
            Desde el panel de control, haz clic en "Almacén" y luego en "Inventario" en el menú lateral. Esto te llevará
            a una tabla o lista que muestra el stock actual de todos los productos.
          </p>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-slate-850 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            Paso 2: Interpretar la Información del Inventario
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            Comprende los datos mostrados en la tabla de inventario.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-slate-600 dark:text-slate-300 space-y-4">
          <p>La tabla de inventario generalmente incluye las siguientes columnas:</p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>
              <strong>Producto:</strong> Nombre del artículo.
            </li>
            <li>
              <strong>SKU/Código:</strong> Identificador único del producto.
            </li>
            <li>
              <strong>Cantidad en Stock:</strong> El número actual de unidades disponibles.
            </li>
            <li>
              <strong>Ubicación:</strong> Dónde se encuentra el producto en el almacén.
            </li>
            <li>
              <strong>Última Actualización:</strong> Fecha y hora del último movimiento o ajuste de inventario.
            </li>
          </ul>
          <p>
            Puedes ordenar la tabla por cualquier columna para facilitar la revisión, por ejemplo, para ver los
            productos con menor stock.
          </p>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-slate-850 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            Paso 3: Usar Filtros y Búsqueda
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            Encuentra productos específicos o filtra por criterios.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-slate-600 dark:text-slate-300 space-y-4">
          <p>
            Utiliza la barra de búsqueda para encontrar productos por nombre o SKU. También puedes aplicar filtros por
            categoría de producto, ubicación o estado de stock (ej. "bajo stock").
          </p>
          <p>Esto te permitirá obtener una vista más específica de tu inventario según tus necesidades.</p>
        </CardContent>
      </Card>
    </div>
  )
}
