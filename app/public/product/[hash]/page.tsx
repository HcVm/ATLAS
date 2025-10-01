"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Loader2, AlertTriangle, ExternalLink, FileText, CheckCircle2, ChevronDown } from "lucide-react"
import { createClient } from "@supabase/supabase-js"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Card, CardContent } from "@/components/ui/card"
import { SerialValidator } from "@/components/serial-validator"
import { AnimatedBackground } from "@/components/animated-background"

interface Product {
  id: string
  code: string
  name: string
  description: string | null
  unit_of_measure: string
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

function parseDescription(description: string) {
  const lines = description.split("\n").filter((line) => line.trim())

  // If description has clear line breaks, display them as bullet points
  if (lines.length > 1) {
    return lines.map((line) => line.trim())
  }

  // Otherwise return as single item
  return [description.trim()]
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabasePublic = createClient(supabaseUrl, supabaseAnonKey)

export default function PublicProductPage() {
  const params = useParams()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [caracteristicasOpen, setCaracteristicasOpen] = useState(false)
  const [especificacionesOpen, setEspecificacionesOpen] = useState(false)

  useEffect(() => {
    if (params.hash) {
      fetchProduct()
    }
  }, [params.hash])

  const fetchProduct = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: productData, error: productError } = await supabasePublic
        .from("products")
        .select(
          `
          id,
          code,
          name,
          description,
          unit_of_measure,
          modelo,
          ficha_tecnica,
          manual,
          image_url,
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
        <AnimatedBackground />
        <Loader2 className="h-12 w-12 animate-spin text-primary relative z-10" />
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 p-4 text-center">
        <AnimatedBackground />
        <AlertTriangle className="h-16 w-16 text-red-500 mb-4 relative z-10" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50 mb-2 relative z-10">
          Producto no encontrado
        </h1>
        <p className="text-gray-600 dark:text-gray-400 relative z-10">
          {error || "No se pudo cargar la información del producto."}
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-100 dark:from-gray-900 dark:via-blue-950/20 dark:to-gray-950 relative">
      <AnimatedBackground />

      <div className="relative z-10">
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 sticky top-0 z-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <span>Inicio</span>
              <span>/</span>
              {product.product_categories && (
                <>
                  <span>{product.product_categories.name}</span>
                  <span>/</span>
                </>
              )}
              <span className="text-gray-900 dark:text-gray-100 font-medium">{product.code}</span>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            {/* Product Image */}
            <div className="relative">
              <div className="sticky top-24">
                <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-gray-200 dark:border-gray-700 hover:shadow-blue-500/20 transition-shadow duration-300">
                  <img
                    src={product.image_url || "/placeholder.svg?height=500&width=500"}
                    alt={product.name}
                    className="w-full h-auto object-contain rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* Product Information */}
            <div className="space-y-8">
              {/* Category Badge */}
              {product.product_categories && (
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full text-sm font-medium shadow-md border border-gray-200 dark:border-gray-700">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: product.product_categories.color }} />
                  {product.product_categories.name}
                </div>
              )}

              {/* Product Title */}
              <div>
                <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-gray-50 mb-4 leading-tight">
                  {product.name}
                </h1>
                <p className="text-lg text-gray-600 dark:text-gray-400 font-mono">{product.code}</p>
              </div>

              {/* Key Features */}
              <div className="space-y-3">
                {product.modelo && (
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Modelo</p>
                      <p className="text-base text-gray-900 dark:text-gray-100">{product.modelo}</p>
                    </div>
                  </div>
                )}
                {product.brands && (
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Marca</p>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: product.brands.color }} />
                        <p className="text-base text-gray-900 dark:text-gray-100">{product.brands.name}</p>
                      </div>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Unidad de medida</p>
                    <p className="text-base text-gray-900 dark:text-gray-100">{product.unit_of_measure}</p>
                  </div>
                </div>
              </div>

              {/* Documentation Buttons */}
              {(product.ficha_tecnica || product.manual) && (
                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  {product.ficha_tecnica && (
                    <Button
                      asChild
                      size="lg"
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all"
                    >
                      <a href={product.ficha_tecnica} target="_blank" rel="noopener noreferrer">
                        <FileText className="h-5 w-5 mr-2" />
                        Ver Ficha Técnica
                      </a>
                    </Button>
                  )}
                  {product.manual && (
                    <Button
                      asChild
                      size="lg"
                      variant="outline"
                      className="flex-1 border-2 shadow-md hover:shadow-lg transition-all bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm"
                    >
                      <a href={product.manual} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-5 w-5 mr-2" />
                        Ver Manual
                      </a>
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Serial Number Validator Section */}
          <div className="mt-16">
            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50 mb-2">Verifica tu número de serie</h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Ingresa el número de serie de tu producto para verificar su autenticidad y consultar el estado de
                  garantía.
                </p>
              </div>
              <SerialValidator />
            </div>
          </div>

          {product.description && (
            <div className="mt-16">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50 mb-6">Descripción del producto</h2>
              <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-gray-200 dark:border-gray-700 shadow-xl">
                <CardContent className="p-8">
                  <ul className="space-y-3">
                    {parseDescription(product.description).map((line, index) => (
                      <li key={index} className="flex items-start gap-3 text-gray-700 dark:text-gray-300">
                        <CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                        <span className="leading-relaxed text-base">{line}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="mt-12 space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50 mb-6">Información técnica</h2>

            {/* Características */}
            <Collapsible open={caracteristicasOpen} onOpenChange={setCaracteristicasOpen}>
              <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden transition-all hover:shadow-xl">
                <CollapsibleTrigger className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                  <span className="text-lg font-semibold text-gray-900 dark:text-gray-50">Características</span>
                  <ChevronDown
                    className={`h-5 w-5 text-gray-500 transition-transform duration-200 ${
                      caracteristicasOpen ? "rotate-180" : ""
                    }`}
                  />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-6 py-5 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Código</p>
                        <p className="text-base text-gray-900 dark:text-gray-100 font-mono">{product.code}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Nombre</p>
                        <p className="text-base text-gray-900 dark:text-gray-100">{product.name}</p>
                      </div>
                      {product.modelo && (
                        <div>
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Modelo</p>
                          <p className="text-base text-gray-900 dark:text-gray-100">{product.modelo}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Unidad de Medida</p>
                        <p className="text-base text-gray-900 dark:text-gray-100">{product.unit_of_measure}</p>
                      </div>
                      {product.brands && (
                        <div>
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Marca</p>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: product.brands.color }} />
                            <p className="text-base text-gray-900 dark:text-gray-100">{product.brands.name}</p>
                          </div>
                        </div>
                      )}
                      {product.product_categories && (
                        <div>
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Categoría</p>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: product.product_categories.color }}
                            />
                            <p className="text-base text-gray-900 dark:text-gray-100">
                              {product.product_categories.name}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>

            {/* Especificaciones */}
            <Collapsible open={especificacionesOpen} onOpenChange={setEspecificacionesOpen}>
              <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden transition-all hover:shadow-xl">
                <CollapsibleTrigger className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                  <span className="text-lg font-semibold text-gray-900 dark:text-gray-50">Documentación</span>
                  <ChevronDown
                    className={`h-5 w-5 text-gray-500 transition-transform duration-200 ${
                      especificacionesOpen ? "rotate-180" : ""
                    }`}
                  />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-6 py-5 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
                    {(product.ficha_tecnica || product.manual) && (
                      <div className="space-y-3">
                        {product.ficha_tecnica && (
                          <a
                            href={product.ficha_tecnica}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 transition-colors group"
                          >
                            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 transition-colors">
                              <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-gray-900 dark:text-gray-100">Ficha técnica del producto</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                Especificaciones técnicas detalladas
                              </p>
                            </div>
                            <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                          </a>
                        )}
                        {product.manual && (
                          <a
                            href={product.manual}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 transition-colors group"
                          >
                            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 transition-colors">
                              <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-gray-900 dark:text-gray-100">Manual del producto</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                Guía de uso e instrucciones completas
                              </p>
                            </div>
                            <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          </div>
        </div>
      </div>
    </div>
  )
}
