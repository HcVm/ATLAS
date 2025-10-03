"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Loader2, AlertTriangle, ExternalLink, FileText, CheckCircle2, ChevronDown, ShoppingCart } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { SerialValidator } from "@/components/serial-validator"
import { AnimatedBackground } from "@/components/animated-background"
import Link from "next/link"

// --- INTERFACES (Sin cambios) ---
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

// --- FUNCIÓN HELPER MEJORADA ---
function parseDescription(description: string | null | undefined): string[] {
  if (!description) return []
  const lines = description.split("\n").map(line => line.trim()).filter(Boolean)
  return lines.length > 1 ? lines : [description.trim()]
}

// --- SKELETON COMPONENT PARA ESTADO DE CARGA ---
const ProductPageSkeleton = () => (
  <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 relative">
    <AnimatedBackground />
    <div className="relative z-10 max-w-7xl mx-auto p-4 md:p-8 lg:p-12 space-y-12">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
        {/* Image Skeleton */}
        <Skeleton className="w-full aspect-square rounded-2xl" />
        {/* Info Skeleton */}
        <div className="space-y-6">
          <Skeleton className="h-6 w-40 rounded-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-8 w-3/4" />
          <div className="space-y-4 pt-4">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-5/6" />
          </div>
          <div className="flex gap-4 pt-4">
            <Skeleton className="h-12 flex-1 rounded-lg" />
            <Skeleton className="h-12 flex-1 rounded-lg" />
          </div>
        </div>
      </div>
       {/* Validator Skeleton */}
      <Skeleton className="h-48 w-full rounded-2xl" />
    </div>
  </div>
)

export default function PublicProductPage() {
  const params = useParams()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [caracteristicasOpen, setCaracteristicasOpen] = useState(true) // Abierto por defecto
  const [documentacionOpen, setDocumentacionOpen] = useState(false)

  useEffect(() => {
    if (params.hash) {
      fetchProduct()
    }
  }, [params.hash])

  const fetchProduct = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: productError } = await supabase
        .from("products")
        .select(`
          id, code, name, description, unit_of_measure, modelo, 
          ficha_tecnica, manual, image_url,
          brands (id, name, color),
          product_categories (id, name, color)
        `)
        .eq("qr_code_hash", params.hash)
        .maybeSingle()

      if (productError) throw productError
      if (!data) throw new Error("Producto no encontrado. Verifica que el código QR sea válido.")
      
      setProduct(data as Product)
    } catch (err: any) {
      setError(err.message || "Ocurrió un error inesperado al cargar la información.")
    } finally {
      setLoading(false)
    }
  }

  // --- ANIMATION VARIANTS ---
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    }
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.5 } }
  }

  // --- RENDER LOGIC ---
  if (loading) {
    return <ProductPageSkeleton />
  }

  if (error || !product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 p-4 text-center">
        <AnimatedBackground />
        <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative z-10 flex flex-col items-center">
          <AlertTriangle className="h-16 w-16 text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50 mb-2">
            Ocurrió un problema
          </h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-md">
            {error || "No se pudo cargar la información del producto."}
          </p>
        </motion.div>
      </div>
    )
  }

  const descriptionLines = parseDescription(product.description)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-100 dark:from-gray-900 dark:via-blue-950/20 dark:to-gray-950 relative overflow-hidden">
      <AnimatedBackground />
      <motion.main
        className="relative z-10"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* --- BREADCRUMBS HEADER --- */}
        <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 sticky top-0 z-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Link href="/" className="hover:text-primary transition-colors">Inicio</Link>
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
        </header>

        <div className="max-w-7xl mx-auto p-4 md:p-8 lg:p-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-start">
            
            {/* --- COLUMNA DE IMAGEN --- */}
            <motion.div variants={itemVariants} className="lg:sticky top-24">
              <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-2xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-blue-500/20 transition-shadow duration-300">
                <img
                  src={product.image_url || "/placeholder.svg?height=500&width=500"}
                  alt={product.name}
                  className="w-full aspect-square object-contain rounded-lg"
                />
              </div>
            </motion.div>

            {/* --- COLUMNA DE INFORMACIÓN --- */}
            <motion.div variants={itemVariants} className="space-y-8">
              {product.product_categories && (
                <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full text-sm font-medium shadow-md border border-gray-200 dark:border-gray-700">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: product.product_categories.color }} />
                  {product.product_categories.name}
                </motion.div>
              )}
              <motion.div variants={itemVariants}>
                <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-gray-50 mb-3 leading-tight tracking-tight">
                  {product.name}
                </h1>
                <p className="text-lg text-gray-600 dark:text-gray-400 font-mono">{product.code}</p>
              </motion.div>

              <motion.div variants={itemVariants} className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-6">
                {[
                  { label: "Modelo", value: product.modelo },
                  { label: "Marca", value: product.brands?.name, color: product.brands?.color },
                  { label: "Unidad de medida", value: product.unit_of_measure },
                ].map((item, index) => item.value && (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{item.label}</p>
                      <div className="flex items-center gap-2">
                        {item.color && <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />}
                        <p className="text-base text-gray-900 dark:text-gray-100">{item.value}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </motion.div>

              {/* --- BOTONES DE DOCUMENTACIÓN (CORREGIDO) --- */}
              {(product.ficha_tecnica || product.manual) && (
                <motion.div 
                  variants={itemVariants} 
                  // El único cambio es en esta línea:
                  className="flex flex-row gap-4 pt-4"
                >
                  {product.ficha_tecnica && (
                    <Button asChild size="lg" className="flex-1">
                      <a href={product.ficha_tecnica} target="_blank" rel="noopener noreferrer">
                        <FileText className="h-5 w-5 mr-2" /> Ficha Técnica
                      </a>
                    </Button>
                  )}
                  {product.manual && (
                    <Button asChild size="lg" variant="secondary" className="flex-1">
                      <a href={product.manual} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-5 w-5 mr-2" /> Manual
                      </a>
                    </Button>
                  )}
                </motion.div>
              )}
            </motion.div>
          </div>

          {/* --- VALIDADOR DE SERIES --- */}
          <motion.div variants={itemVariants} className="mt-16 lg:mt-24">
            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-xl p-6 md:p-8 border border-gray-200 dark:border-gray-700">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50 mb-2">Verifica la autenticidad de tu producto</h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Ingresa el número de serie para consultar su estado de garantía y procedencia.
                </p>
              </div>
              <SerialValidator />
            </div>
          </motion.div>

          {/* --- DESCRIPCIÓN --- */}
          {descriptionLines.length > 0 && (
            <motion.div variants={itemVariants} className="mt-16 lg:mt-24">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50 mb-6">Descripción del producto</h2>
              <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-gray-200 dark:border-gray-700 shadow-xl">
                <CardContent className="p-6 md:p-8">
                  <ul className="space-y-3">
                    {descriptionLines.map((line, index) => (
                      <li key={index} className="flex items-start gap-3 text-gray-700 dark:text-gray-300">
                        <CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-1 flex-shrink-0" />
                        <span className="leading-relaxed text-base">{line}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* --- INFORMACIÓN TÉCNICA (ACORDEONES ANIMADOS) --- */}
          <motion.div variants={itemVariants} className="mt-16 lg:mt-24 space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Información técnica</h2>
            {[
              { title: 'Características', open: caracteristicasOpen, onOpenChange: setCaracteristicasOpen, content: (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    {[
                      { label: "Código", value: product.code, mono: true }, { label: "Nombre", value: product.name },
                      { label: "Modelo", value: product.modelo }, { label: "Unidad de Medida", value: product.unit_of_measure },
                      { label: "Marca", value: product.brands?.name, color: product.brands?.color },
                      { label: "Categoría", value: product.product_categories?.name, color: product.product_categories?.color }
                    ].map((item, i) => item.value && (
                      <div key={i}>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{item.label}</p>
                        <div className="flex items-center gap-2">
                           {item.color && <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />}
                           <p className={`text-base text-gray-900 dark:text-gray-100 ${item.mono ? 'font-mono' : ''}`}>{item.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
              )},
              { title: 'Documentación', open: documentacionOpen, onOpenChange: setDocumentacionOpen, content: (
                  <div className="space-y-3">
                    {product.ficha_tecnica && (
                      <a href={product.ficha_tecnica} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary dark:hover:border-primary transition-colors group">
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg"><FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" /></div>
                        <div className="flex-1"><p className="font-medium text-gray-900 dark:text-gray-100">Ficha técnica</p></div>
                        <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-primary transition-colors" />
                      </a>
                    )}
                    {product.manual && (
                      <a href={product.manual} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary dark:hover:border-primary transition-colors group">
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg"><FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" /></div>
                        <div className="flex-1"><p className="font-medium text-gray-900 dark:text-gray-100">Manual de producto</p></div>
                        <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-primary transition-colors" />
                      </a>
                    )}
                  </div>
              )}
            ].map(({ title, open, onOpenChange, content }) => (
              <Collapsible key={title} open={open} onOpenChange={onOpenChange}>
                <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden transition-all hover:shadow-xl">
                  <CollapsibleTrigger className="w-full p-6 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <span className="text-lg font-semibold text-gray-900 dark:text-gray-50">{title}</span>
                    <ChevronDown className={`h-5 w-5 text-gray-500 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
                  </CollapsibleTrigger>
                  <AnimatePresence initial={false}>
                    {open && (
                      <CollapsibleContent forceMount asChild>
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1, transition: { type: "spring", duration: 0.4, bounce: 0 } }}
                          exit={{ height: 0, opacity: 0, transition: { type: "tween", duration: 0.2 } }}
                        >
                          <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-black/20">
                            {content}
                          </div>
                        </motion.div>
                      </CollapsibleContent>
                    )}
                  </AnimatePresence>
                </div>
              </Collapsible>
            ))}
          </motion.div>
        </div>
      </motion.main>
    </div>
  )
}