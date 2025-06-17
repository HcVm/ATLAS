"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Edit, Package, AlertTriangle, MapPin, Barcode, Hash } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import Link from "next/link"

interface Product {
  id: string
  name: string
  description: string | null
  code: string
  barcode: string | null
  unit_of_measure: string
  minimum_stock: number
  current_stock: number
  cost_price: number
  sale_price: number
  location: string | null
  is_active: boolean
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
  }, [params.id, user])

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
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/warehouse/products">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Link>
          </Button>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-muted-foreground">Usuario no autenticado</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/warehouse/products">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Link>
          </Button>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div>Cargando producto...</div>
              <div className="text-xs text-muted-foreground mt-2">
                Debug: User ID: {user?.id}, Company:{" "}
                {user?.role === "admin" ? user?.selectedCompanyId || user?.company_id : user?.company_id}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/warehouse/products">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Link>
          </Button>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-muted-foreground">
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
    )
  }

  const stockStatus = getStockStatus(product.current_stock, product.minimum_stock)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/warehouse/products">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{product.name}</h1>
            <p className="text-muted-foreground">Detalles del producto</p>
          </div>
        </div>
        <Button asChild>
          <Link href={`/warehouse/products/edit/${product.id}`}>
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Información básica */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Información General
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Nombre</label>
              <p className="text-lg font-semibold">{product.name}</p>
            </div>

            {product.description && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Descripción</label>
                <p className="text-sm">{product.description}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <Hash className="h-3 w-3" />
                  Código
                </label>
                <Badge variant="outline" className="font-mono">
                  {product.code}
                </Badge>
              </div>

              {product.barcode && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <Barcode className="h-3 w-3" />
                    Código de barras
                  </label>
                  <p className="text-sm font-mono">{product.barcode}</p>
                </div>
              )}
            </div>

            {product.location && (
              <div>
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  Ubicación
                </label>
                <p className="text-sm">{product.location}</p>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-muted-foreground">Unidad de medida</label>
              <p className="text-sm">{product.unit_of_measure}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Estado</label>
              <div className="flex items-center gap-2">
                <Badge variant={product.is_active ? "default" : "secondary"}>
                  {product.is_active ? "Activo" : "Inactivo"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stock y precios */}
        <Card>
          <CardHeader>
            <CardTitle>Stock y Precios</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Stock actual</label>
                <p className="text-2xl font-bold">{product.current_stock}</p>
                <p className="text-xs text-muted-foreground">{product.unit_of_measure}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Stock mínimo</label>
                <p className="text-2xl font-bold">{product.minimum_stock}</p>
                <p className="text-xs text-muted-foreground">{product.unit_of_measure}</p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Estado del stock</label>
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

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Precio de costo</label>
                <p className="text-xl font-semibold">{formatCurrency(product.cost_price)}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Precio de venta</label>
                <p className="text-xl font-semibold text-green-600">{formatCurrency(product.sale_price)}</p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Margen de ganancia</label>
              <p className="text-lg font-semibold">
                {(((product.sale_price - product.cost_price) / product.cost_price) * 100).toFixed(1)}%
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Categorización */}
        <Card>
          <CardHeader>
            <CardTitle>Categorización</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {product.brands ? (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Marca</label>
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
                <label className="text-sm font-medium text-muted-foreground">Marca</label>
                <p className="text-sm text-muted-foreground">Sin marca asignada</p>
              </div>
            )}

            {product.product_categories ? (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Categoría</label>
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
                <label className="text-sm font-medium text-muted-foreground">Categoría</label>
                <p className="text-sm text-muted-foreground">Sin categoría asignada</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Información del sistema */}
        <Card>
          <CardHeader>
            <CardTitle>Información del Sistema</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Fecha de creación</label>
              <p className="text-sm">{formatDate(product.created_at)}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Última actualización</label>
              <p className="text-sm">{formatDate(product.updated_at)}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">ID del producto</label>
              <p className="text-xs font-mono text-muted-foreground">{product.id}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
