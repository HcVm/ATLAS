"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Package, Tag, MapPin, Calendar, Loader2, AlertTriangle, ArrowLeft } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Button } from "@/components/ui/button"

interface Product {
  id: string
  code: string
  name: string
  description: string | null
  category_id: string
  unit_of_measure: string
  current_stock: number
  minimum_stock: number
  cost_price: number
  location: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  qr_code_hash: string | null
  is_serialized: boolean
  internal_product_categories?: {
    id: number
    name: string
    color: string
  }
}

interface SerializedProduct {
  id: string
  serial_number: string
  status: string
  current_location: string | null
  created_at: string
  updated_at: string
  product_id: string
  qr_code_hash: string | null
  internal_products: {
    name: string
    code: string
    unit_of_measure: string
    is_serialized: boolean
    internal_product_categories?: {
      id: number
      name: string
      color: string
    }
  }
}

export default function PublicInternalProductPage() {
  const params = useParams()
  const [data, setData] = useState<Product | SerializedProduct | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (params.hash) {
      fetchProductOrSerial()
    }
  }, [params.hash])

  const fetchProductOrSerial = async () => {
    setLoading(true)
    setError(null)
    try {
      // First, try to fetch as a product model
      const { data: productData, error: productError } = await supabase
        .from("internal_products")
        .select(
          `
          *,
          internal_product_categories (
            id,
            name,
            color
          )
        `,
        )
        .eq("qr_code_hash", params.hash)
        .single()

      if (productData) {
        setData(productData as Product)
        return
      }

      // If not found as a product, try to fetch as a serialized product
      const { data: serialData, error: serialError } = await supabase
        .from("internal_product_serials")
        .select(
          `
          *,
          internal_products (
            name,
            code,
            unit_of_measure,
            is_serialized,
            internal_product_categories (
              id,
              name,
              color
            )
          )
        `,
        )
        .eq("qr_code_hash", params.hash)
        .single()

      if (serialData) {
        setData(serialData as SerializedProduct)
        return
      }

      if (productError || serialError) {
        // Log both errors for debugging, but only show a generic not found message
        console.error("Error fetching product:", productError)
        console.error("Error fetching serial:", serialError)
        setError("Producto o número de serie no encontrado.")
      } else {
        setError("Producto o número de serie no encontrado.")
      }
    } catch (err) {
      console.error("Unexpected error:", err)
      setError("Ocurrió un error inesperado al cargar la información.")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4 text-center">
        <AlertTriangle className="h-16 w-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50 mb-2">Error</h1>
        <p className="text-gray-700 dark:text-gray-300 mb-6">{error}</p>
        <Button asChild>
          <Link href="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al inicio
          </Link>
        </Button>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4 text-center">
        <Package className="h-16 w-16 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50 mb-2">Información no disponible</h1>
        <p className="text-gray-700 dark:text-gray-300 mb-6">No se pudo cargar la información del producto o serie.</p>
        <Button asChild>
          <Link href="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al inicio
          </Link>
        </Button>
      </div>
    )
  }

  const isSerializedUnit = "serial_number" in data

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold flex items-center justify-center gap-2">
            {isSerializedUnit ? (
              <>
                <Tag className="h-7 w-7" />
                Detalles de Serie
              </>
            ) : (
              <>
                <Package className="h-7 w-7" />
                Detalles de Producto
              </>
            )}
          </CardTitle>
          <CardDescription className="text-lg">{isSerializedUnit ? data.serial_number : data.name}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isSerializedUnit && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Número de Serie</label>
                  <p className="text-lg font-semibold">{data.serial_number}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Estado</label>
                  <Badge
                    variant={
                      data.status === "in_stock"
                        ? "default"
                        : data.status === "out_of_stock"
                          ? "destructive"
                          : "secondary"
                    }
                    className="text-base"
                  >
                    {data.status === "in_stock"
                      ? "En Stock"
                      : data.status === "out_of_stock"
                        ? "Asignado"
                        : data.status === "in_repair"
                          ? "En Reparación"
                          : "Desechado"}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Ubicación Actual</label>
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <p className="text-base">{data.current_location || "No asignado"}</p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Registrado</label>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <p className="text-base">{format(new Date(data.created_at), "dd/MM/yyyy HH:mm", { locale: es })}</p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Última Actualización</label>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <p className="text-base">{format(new Date(data.updated_at), "dd/MM/yyyy HH:mm", { locale: es })}</p>
                  </div>
                </div>
              </div>
              <hr className="my-4" />
              <h3 className="text-xl font-semibold mb-4">Información del Modelo Asociado</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Nombre del Modelo</label>
                  <p className="text-base">{data.internal_products.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Código del Modelo</label>
                  <p className="text-base font-mono">{data.internal_products.code}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Unidad de Medida</label>
                  <p className="text-base">{data.internal_products.unit_of_measure}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Categoría</label>
                  {data.internal_products.internal_product_categories ? (
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: data.internal_products.internal_product_categories.color }}
                      />
                      <span className="text-base">{data.internal_products.internal_product_categories.name}</span>
                    </div>
                  ) : (
                    <p className="text-base text-muted-foreground">Sin categoría</p>
                  )}
                </div>
              </div>
            </>
          )}

          {!isSerializedUnit && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Código</label>
                <p className="text-base font-mono">{data.code}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Nombre</label>
                <p className="text-base">{data.name}</p>
              </div>
              {data.description && (
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-muted-foreground">Descripción</label>
                  <p className="text-base">{data.description}</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Unidad de Medida</label>
                <p className="text-base">{data.unit_of_measure}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Stock Actual</label>
                <p className="text-base font-semibold">
                  {data.current_stock} {data.unit_of_measure}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Stock Mínimo</label>
                <p className="text-base">
                  {data.minimum_stock} {data.unit_of_measure}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Costo Unitario</label>
                <p className="text-base">S/ {data.cost_price.toFixed(2)}</p>
              </div>
              {data.location && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Ubicación</label>
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <p className="text-base">{data.location}</p>
                  </div>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Categoría</label>
                {data.internal_product_categories ? (
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: data.internal_product_categories.color }}
                    />
                    <span className="text-base">{data.internal_product_categories.name}</span>
                  </div>
                ) : (
                  <p className="text-base text-muted-foreground">Sin categoría</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Estado</label>
                <Badge variant={data.is_active ? "default" : "secondary"} className="text-base">
                  {data.is_active ? "Activo" : "Inactivo"}
                </Badge>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Creado</label>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <p className="text-base">{format(new Date(data.created_at), "dd/MM/yyyy HH:mm", { locale: es })}</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Última Actualización</label>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <p className="text-base">{format(new Date(data.updated_at), "dd/MM/yyyy HH:mm", { locale: es })}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
