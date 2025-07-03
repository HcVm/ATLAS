"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  ArrowLeft,
  Edit,
  Package,
  AlertTriangle,
  MapPin,
  Barcode,
  Hash,
  ImageIcon,
  FileText,
  ExternalLink,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import Link from "next/link"

interface Product {
  id: string
  name: string
  description: string | null
  code: string
  barcode: string | null
  modelo: string | null
  ficha_tecnica: string | null
  unit_of_measure: string
  minimum_stock: number
  current_stock: number
  cost_price: number
  sale_price: number
  location: string | null
  is_active: boolean
  image_url: string | null
  created_at: string
  updated_at: string
  brands?: { id: string; name: string; color: string } | null
  product_categories?: { id: string; name: string; color: string } | null
}

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Si el ID es "new", redirigir a la página de nuevo producto
    if (params.id === "new") {
      router.replace("/warehouse/products/new")
      return
    }

    console.log("ProductDetail: User data:", {
      userId: user?.id,
      role: user?.role,
      companyId: user?.company_id,
      selectedCompanyId: user?.selectedCompanyId,
      paramId: params.id,
    })

    if (params.id && user) {
      fetchProduct()
    } else {
      console.log("ProductDetail: Missing params.id or user")
    }
  }, [params.id, user, router])

  const fetchProduct = async () => {
    try {
      setLoading(true)
      setError(null)

      // Determinar el company_id correcto
      let companyId: string | null = null

      if (user?.role === "admin") {
        companyId = user?.selectedCompanyId || user?.company_id || null
      } else {
        companyId = user?.company_id || null
      }

      console.log("ProductDetail: Using companyId:", companyId)

      if (!companyId) {
        setError("No se pudo determinar la empresa")
        return
      }

      console.log("ProductDetail: Fetching product with:", {
        productId: params.id,
        companyId: companyId,
      })

      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          brands!products_brand_id_fkey (id, name, color),
          product_categories!products_category_id_fkey (id, name, color)
        `)
        .eq("id", params.id)
        .eq("company_id", companyId)
        .single()

      console.log("ProductDetail: Query result:", { data, error })

      if (error) {
        if (error.code === "PGRST116") {
          setError("Producto no encontrado")
        } else {
          console.error("ProductDetail: Database error:", error)
          setError(`Error de base de datos: ${error.message}`)
        }
        return
      }

      if (!data) {
        setError("Producto no encontrado")
        return
      }

      console.log("ProductDetail: Product loaded successfully:", data.name)
      setProduct(data)
    } catch (error) {
      console.error("ProductDetail: Unexpected error:", error)
      setError("Error inesperado al cargar el producto")
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-PE", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getStockStatus = (current: number, minimum: number) => {
    if (current === 0) return { label: "Sin stock", variant: "destructive" as const, color: "text-red-600" }
    if (current <= minimum) return { label: "Stock bajo", variant: "secondary" as const, color: "text-orange-600" }
    return { label: "Disponible", variant: "default" as const, color: "text-green-600" }
  }

  // Debug info
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <div className="space-y-6 p-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild className="hover:bg-slate-100">
              <Link href="/warehouse/products">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Link>
            </Button>
          </div>
          <Card className="bg-gradient-to-br from-white to-slate-50/50 border-slate-200/60 shadow-lg">
            <CardContent className="p-6">
              <div className="text-center text-slate-600">Usuario no autenticado</div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <div className="space-y-6 p-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild className="hover:bg-slate-100">
              <Link href="/warehouse/products">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Link>
            </Button>
          </div>
          <Card className="bg-gradient-to-br from-white to-slate-50/50 border-slate-200/60 shadow-lg">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="text-slate-700">Cargando producto...</div>
                <div className="text-xs text-slate-500 mt-2">
                  Debug: User ID: {user?.id}, Company:{" "}
                  {user?.role === "admin" ? user?.selectedCompanyId || user?.company_id : user?.company_id}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <div className="space-y-6 p-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild className="hover:bg-slate-100">
              <Link href="/warehouse/products">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Link>
            </Button>
          </div>
          <Card className="bg-gradient-to-br from-white to-slate-50/50 border-slate-200/60 shadow-lg">
            <CardContent className="p-6">
              <div className="text-center text-slate-600">
                <div>{error || "Producto no encontrado"}</div>
                <div className="text-xs mt-2">
                  Debug Info:
                  <br />
                  Product ID: {params.id}
                  <br />
                  User Role: {user?.role}
                  <br />
                  Company ID: {user?.role === "admin" ? user?.selectedCompanyId || user?.company_id : user?.company_id}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const stockStatus = getStockStatus(product.current_stock, product.minimum_stock)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild className="hover:bg-slate-100">
              <Link href="/warehouse/products">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-700 via-slate-600 to-slate-500 bg-clip-text text-transparent">
                {product.name}
              </h1>
              <p className="text-slate-600">Detalles del producto</p>
            </div>
          </div>
          <Button
            asChild
            className="bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white"
          >
            <Link href={`/warehouse/products/edit/${product.id}`}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Link>
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Imagen del producto */}
          {product.image_url && (
            <Card className="md:col-span-1 bg-gradient-to-br from-white to-slate-50/50 border-slate-200/60 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-800">
                  <div className="w-6 h-6 bg-gradient-to-br from-slate-100 to-slate-200 rounded-md flex items-center justify-center">
                    <ImageIcon className="h-4 w-4 text-slate-600" />
                  </div>
                  Imagen del Producto
                </CardTitle>
              </CardHeader>
              <CardContent>
                <img
                  src={product.image_url || "/placeholder.svg"}
                  alt={product.name}
                  className="w-full h-64 object-contain rounded-lg border border-slate-200 bg-slate-50"
                />
              </CardContent>
            </Card>
          )}

          {/* Información básica */}
          <Card
            className={`${product.image_url ? "md:col-span-2" : "md:col-span-3"} bg-gradient-to-br from-white to-slate-50/50 border-slate-200/60 shadow-lg`}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-800">
                <div className="w-6 h-6 bg-gradient-to-br from-slate-100 to-slate-200 rounded-md flex items-center justify-center">
                  <Package className="h-4 w-4 text-slate-600" />
                </div>
                Información General
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-500">Nombre</label>
                <p className="text-lg font-semibold text-slate-800">{product.name}</p>
              </div>

              {product.description && (
                <div>
                  <label className="text-sm font-medium text-slate-500">Descripción</label>
                  <p className="text-sm text-slate-700">{product.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-500 flex items-center gap-1">
                    <Hash className="h-3 w-3" />
                    Código
                  </label>
                  <Badge variant="outline" className="font-mono border-slate-300 text-slate-700">
                    {product.code}
                  </Badge>
                </div>

                {product.barcode && (
                  <div>
                    <label className="text-sm font-medium text-slate-500 flex items-center gap-1">
                      <Barcode className="h-3 w-3" />
                      Código de barras
                    </label>
                    <p className="text-sm font-mono text-slate-700">{product.barcode}</p>
                  </div>
                )}
              </div>

              {/* Nuevos campos: Modelo y Ficha Técnica */}
              <div className="grid grid-cols-2 gap-4">
                {product.modelo && (
                  <div>
                    <label className="text-sm font-medium text-slate-500 flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      Modelo
                    </label>
                    <p className="text-sm text-slate-700">{product.modelo}</p>
                  </div>
                )}

                {product.ficha_tecnica && (
                  <div>
                    <label className="text-sm font-medium text-slate-500 flex items-center gap-1">
                      <ExternalLink className="h-3 w-3" />
                      Ficha Técnica
                    </label>
                    <a
                      href={product.ficha_tecnica}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
                    >
                      Ver ficha técnica
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>

              {product.location && (
                <div>
                  <label className="text-sm font-medium text-slate-500 flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    Ubicación
                  </label>
                  <p className="text-sm text-slate-700">{product.location}</p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-slate-500">Unidad de medida</label>
                <p className="text-sm text-slate-700">{product.unit_of_measure}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-500">Estado</label>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={product.is_active ? "default" : "secondary"}
                    className={product.is_active ? "bg-slate-100 text-slate-700 border-slate-300" : ""}
                  >
                    {product.is_active ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stock y precios */}
          <Card className="md:col-span-2 bg-gradient-to-br from-white to-slate-50/50 border-slate-200/60 shadow-lg">
            <CardHeader>
              <CardTitle className="text-slate-800">Stock y Precios</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-500">Stock actual</label>
                  <p className="text-2xl font-bold text-slate-800">{product.current_stock}</p>
                  <p className="text-xs text-slate-500">{product.unit_of_measure}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-500">Stock mínimo</label>
                  <p className="text-2xl font-bold text-slate-800">{product.minimum_stock}</p>
                  <p className="text-xs text-slate-500">{product.unit_of_measure}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-500">Estado del stock</label>
                <div className="flex items-center gap-2">
                  <Badge variant={stockStatus.variant}>{stockStatus.label}</Badge>
                  {product.current_stock <= product.minimum_stock && (
                    <div className="flex items-center gap-1 text-orange-600 text-xs">
                      <AlertTriangle className="h-3 w-3" />
                      Requiere reposición
                    </div>
                  )}
                </div>
              </div>

              <Separator className="bg-slate-200" />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-500">Precio de costo</label>
                  <p className="text-xl font-semibold text-slate-800">{formatCurrency(product.cost_price)}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-500">Precio de venta (sin IGV)</label>
                  <p className="text-xl font-semibold text-green-600">{formatCurrency(product.sale_price)}</p>
                  <p className="text-sm text-green-700 font-medium">
                    Con IGV (18%): {formatCurrency(product.sale_price * 1.18)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-500">Margen de ganancia</label>
                  <p className="text-lg font-semibold text-slate-800">
                    {(((product.sale_price - product.cost_price) / product.cost_price) * 100).toFixed(1)}%
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-500">IGV (18%)</label>
                  <p className="text-lg font-semibold text-blue-600">{formatCurrency(product.sale_price * 0.18)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Categorización */}
          <Card className="bg-gradient-to-br from-white to-slate-50/50 border-slate-200/60 shadow-lg">
            <CardHeader>
              <CardTitle className="text-slate-800">Categorización</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {product.brands ? (
                <div>
                  <label className="text-sm font-medium text-slate-500">Marca</label>
                  <div className="mt-1">
                    <Badge
                      variant="secondary"
                      style={{
                        backgroundColor: `${product.brands.color}20`,
                        color: product.brands.color,
                      }}
                    >
                      {product.brands.name}
                    </Badge>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-sm font-medium text-slate-500">Marca</label>
                  <p className="text-sm text-slate-500">Sin marca asignada</p>
                </div>
              )}

              {product.product_categories ? (
                <div>
                  <label className="text-sm font-medium text-slate-500">Categoría</label>
                  <div className="mt-1">
                    <Badge
                      variant="outline"
                      style={{
                        borderColor: product.product_categories.color,
                        color: product.product_categories.color,
                      }}
                    >
                      {product.product_categories.name}
                    </Badge>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-sm font-medium text-slate-500">Categoría</label>
                  <p className="text-sm text-slate-500">Sin categoría asignada</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Información del sistema */}
          <Card className="md:col-span-3 bg-gradient-to-br from-white to-slate-50/50 border-slate-200/60 shadow-lg">
            <CardHeader>
              <CardTitle className="text-slate-800">Información del Sistema</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-500">Fecha de creación</label>
                  <p className="text-sm text-slate-700">{formatDate(product.created_at)}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-500">Última actualización</label>
                  <p className="text-sm text-slate-700">{formatDate(product.updated_at)}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-500">ID del producto</label>
                  <p className="text-xs font-mono text-slate-500">{product.id}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
