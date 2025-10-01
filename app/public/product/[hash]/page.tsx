"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Package, MapPin, Calendar, Loader2, AlertTriangle, ArrowLeft, ExternalLink, FileText } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import Link from "next/link"
import { Button } from "@/components/ui/button"

interface Product {
  id: string
  code: string
  name: string
  description: string | null
  unit_of_measure: string
  current_stock: number
  minimum_stock: number
  cost_price: number
  sale_price: number
  location: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  qr_code_hash: string | null
  modelo: string | null
  ficha_tecnica: string | null
  manual: string | null
  image_url: string | null
  brands?: {
    id: string
    name: string
    color: string
  } | null
  product_categories?: {
    id: string
    name: string
    color: string
  } | null
}

export default function PublicProductPage() {
  const params = useParams()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (params.hash) {
      fetchProduct()
    }
  }, [params.hash])

  const fetchProduct = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: productData, error: productError } = await supabase
        .from("products")
        .select(
          `
          *,
          brands (
            id,
            name,
            color
          ),
          product_categories (
            id,
            name,
            color
          )
        `,
        )
        .eq("qr_code_hash", params.hash)
        .single()

      if (productError) {
        console.error("Error fetching product:", productError)
        setError("Producto no encontrado.")
        return
      }

      if (productData) {
        setProduct(productData as Product)
      } else {
        setError("Producto no encontrado.")
      }
    } catch (err) {
      console.error("Unexpected error:", err)
      setError("Ocurrió un error inesperado al cargar la información.")
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "PEN",
    }).format(amount)
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

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4 text-center">
        <Package className="h-16 w-16 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50 mb-2">Información no disponible</h1>
        <p className="text-gray-700 dark:text-gray-300 mb-6">No se pudo cargar la información del producto.</p>
        <Button asChild>
          <Link href="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al inicio
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold flex items-center justify-center gap-2">
            <Package className="h-7 w-7" />
            Información del Producto
          </CardTitle>
          <CardDescription className="text-lg">{product.name}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Product Image */}
          {product.image_url && (
            <div className="flex justify-center">
              <img
                src={product.image_url || "/placeholder.svg"}
                alt={product.name}
                className="w-full max-w-md h-64 object-contain rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
              />
            </div>
          )}

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Código</label>
              <p className="text-base font-mono">{product.code}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Nombre</label>
              <p className="text-base font-semibold">{product.name}</p>
            </div>
            {product.description && (
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-muted-foreground">Descripción</label>
                <p className="text-base">{product.description}</p>
              </div>
            )}
            {product.modelo && (
              <div>
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  Modelo
                </label>
                <p className="text-base">{product.modelo}</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-muted-foreground">Unidad de Medida</label>
              <p className="text-base">{product.unit_of_measure}</p>
            </div>
          </div>

          {/* Documents Section */}
          {(product.ficha_tecnica || product.manual) && (
            <>
              <hr className="my-4" />
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documentación
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {product.ficha_tecnica && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Ficha Técnica</label>
                    <a
                      href={product.ficha_tecnica}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline mt-1"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Ver ficha técnica
                    </a>
                  </div>
                )}
                {product.manual && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Manual del Producto</label>
                    <a
                      href={product.manual}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline mt-1"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Ver manual
                    </a>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Pricing Information */}
          <hr className="my-4" />
          <h3 className="text-xl font-semibold mb-4">Información de Precios</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Precio de Venta (sin IGV)</label>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {formatCurrency(product.sale_price)}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Precio con IGV (18%)</label>
              <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                {formatCurrency(product.sale_price * 1.18)}
              </p>
            </div>
          </div>

          {/* Category and Brand */}
          {(product.brands || product.product_categories) && (
            <>
              <hr className="my-4" />
              <h3 className="text-xl font-semibold mb-4">Categorización</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {product.brands && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Marca</label>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: product.brands.color }} />
                      <span className="text-base">{product.brands.name}</span>
                    </div>
                  </div>
                )}
                {product.product_categories && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Categoría</label>
                    <div className="flex items-center gap-2 mt-1">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: product.product_categories.color }}
                      />
                      <span className="text-base">{product.product_categories.name}</span>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Additional Information */}
          {product.location && (
            <>
              <hr className="my-4" />
              <div>
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  Ubicación
                </label>
                <p className="text-base mt-1">{product.location}</p>
              </div>
            </>
          )}

          {/* System Information */}
          <hr className="my-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
            <div>
              <label className="text-xs font-medium flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Creado
              </label>
              <p>{format(new Date(product.created_at), "dd/MM/yyyy HH:mm", { locale: es })}</p>
            </div>
            <div>
              <label className="text-xs font-medium flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Última Actualización
              </label>
              <p>{format(new Date(product.updated_at), "dd/MM/yyyy HH:mm", { locale: es })}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
