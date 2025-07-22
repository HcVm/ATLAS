"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import {
  ArrowLeft,
  Package,
  AlertTriangle,
  Edit,
  Calendar,
  MapPin,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  User,
  Eye,
  QrCode,
  Tag,
} from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import QRCodeDisplay from "@/components/qr-code-display"

interface Product {
  id: string
  code: string
  name: string
  description: string | null
  category_id: number
  unit_of_measure: string
  current_stock: number
  minimum_stock: number
  cost_price: number
  location: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  qr_code_hash: string | null
  serial_number: string | null // Added serial_number
  internal_product_categories?: {
    id: number
    name: string
    color: string
  }
}

interface Movement {
  id: string
  movement_type: "entrada" | "salida" | "ajuste"
  quantity: number
  cost_price: number
  total_amount: number
  reason: string
  notes: string | null
  requested_by: string
  department_requesting: string | null
  supplier: string | null
  movement_date: string
  created_at: string
}

const MOVEMENT_TYPES = [
  { value: "entrada", label: "Entrada", icon: ArrowUp, color: "text-green-600", bgColor: "bg-green-50" },
  { value: "salida", label: "Salida", icon: ArrowDown, color: "text-red-600", bgColor: "bg-red-50" },
  { value: "ajuste", label: "Ajuste", icon: RotateCcw, color: "text-blue-600", bgColor: "bg-blue-50" },
]

export default function InternalProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [product, setProduct] = useState<Product | null>(null)
  const [movements, setMovements] = useState<Movement[]>([])
  const [loading, setLoading] = useState(true)
  const [publicProductUrl, setPublicProductUrl] = useState<string | null>(null)

  useEffect(() => {
    if (params.id && user?.company_id) {
      fetchProductDetails()
    }
  }, [params.id, user?.company_id])

  const fetchProductDetails = async () => {
    try {
      setLoading(true)

      // Fetch product details
      const { data: productData, error: productError } = await supabase
        .from("internal_products")
        .select(`
          *,
          internal_product_categories (
            id,
            name,
            color
          )
        `)
        .eq("id", params.id)
        .eq("company_id", user?.company_id)
        .single()

      if (productError) throw productError

      // Fetch product movements
      const { data: movementsData, error: movementsError } = await supabase
        .from("internal_inventory_movements")
        .select("*")
        .eq("product_id", params.id)
        .eq("company_id", user?.company_id)
        .order("created_at", { ascending: false })

      if (movementsError) throw movementsError

      setProduct(productData)
      setMovements(movementsData || [])

      if (productData?.qr_code_hash) {
        // Construct the public URL for the QR code
        const origin = window.location.origin
        setPublicProductUrl(`${origin}/public/internal-product/${productData.qr_code_hash}`)
      }
    } catch (error) {
      console.error("Error fetching product details:", error)
      toast.error("Error al cargar los detalles del producto")
      router.push("/warehouse/internal/products")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Package className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="text-center py-8">
        <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold">Producto no encontrado</h3>
        <p className="text-muted-foreground">El producto que buscas no existe o no tienes permisos para verlo.</p>
        <Button asChild className="mt-4">
          <Link href="/warehouse/internal/products">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a Productos
          </Link>
        </Button>
      </div>
    )
  }

  const stockStatus = product.current_stock <= product.minimum_stock ? "low" : "normal"
  const stockPercentage = product.minimum_stock > 0 ? (product.current_stock / product.minimum_stock) * 100 : 100

  const movementStats = {
    total: movements.length,
    entradas: movements.filter((m) => m.movement_type === "entrada").length,
    salidas: movements.filter((m) => m.movement_type === "salida").length,
    ajustes: movements.filter((m) => m.movement_type === "ajuste").length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/warehouse/internal/products">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{product.name}</h1>
            <p className="text-muted-foreground">Código: {product.code}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={`/warehouse/internal/products/edit/${product.id}`}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Link>
          </Button>
          <Badge variant={product.is_active ? "default" : "secondary"}>
            {product.is_active ? "Activo" : "Inactivo"}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Product Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Información del Producto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Nombre</label>
                  <p className="text-sm">{product.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Código</label>
                  <p className="text-sm font-mono">{product.code}</p>
                </div>
                {product.description && (
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-muted-foreground">Descripción</label>
                    <p className="text-sm">{product.description}</p>
                  </div>
                )}
                {product.serial_number && ( // Display serial number if it exists
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Número de Serie</label>
                    <div className="flex items-center gap-1">
                      <Tag className="h-3 w-3 text-muted-foreground" />
                      <p className="text-sm">{product.serial_number}</p>
                    </div>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Categoría</label>
                  {product.internal_product_categories ? (
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: product.internal_product_categories.color }}
                      />
                      <span className="text-sm">{product.internal_product_categories.name}</span>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Sin categoría</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Unidad de Medida</label>
                  <p className="text-sm">{product.unit_of_measure}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Costo Unitario</label>
                  <p className="text-sm font-semibold">S/ {product.cost_price.toFixed(2)}</p>
                </div>
                {product.location && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Ubicación</label>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm">{product.location}</span>
                    </div>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Creado</label>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm">
                      {format(new Date(product.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Última Actualización</label>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm">
                      {format(new Date(product.updated_at), "dd/MM/yyyy HH:mm", { locale: es })}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Movement History */}
          <Card>
            <CardHeader>
              <CardTitle>Historial de Movimientos</CardTitle>
              <CardDescription>{movements.length} movimientos registrados</CardDescription>
            </CardHeader>
            <CardContent>
              {movements.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-muted-foreground">No hay movimientos registrados</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Cantidad</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Motivo</TableHead>
                        <TableHead>Solicitante</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {movements.map((movement) => {
                        const movementType = MOVEMENT_TYPES.find((t) => t.value === movement.movement_type)
                        const Icon = movementType?.icon || Package
                        return (
                          <TableRow key={movement.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <div className="font-medium">
                                    {format(new Date(movement.movement_date), "dd/MM/yyyy", { locale: es })}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {format(new Date(movement.created_at), "HH:mm", { locale: es })}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="flex items-center gap-1 w-fit">
                                <Icon className={`h-3 w-3 ${movementType?.color}`} />
                                {movementType?.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <span className={`font-medium ${movementType?.color}`}>
                                  {movement.movement_type === "salida" ? "-" : "+"}
                                  {movement.quantity}
                                </span>
                                <span className="text-muted-foreground text-sm">{product.unit_of_measure}</span>
                              </div>
                            </TableCell>
                            <TableCell>S/ {movement.total_amount.toFixed(2)}</TableCell>
                            <TableCell>
                              <div className="max-w-[200px] truncate" title={movement.reason}>
                                {movement.reason}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3 text-muted-foreground" />
                                <span className="text-sm">{movement.requested_by}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" asChild>
                                <Link href={`/warehouse/internal/movements/${movement.id}`}>
                                  <Eye className="h-4 w-4" />
                                </Link>
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stock Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Estado del Stock
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className={`text-3xl font-bold ${stockStatus === "low" ? "text-red-600" : "text-green-600"}`}>
                  {product.current_stock}
                </div>
                <p className="text-sm text-muted-foreground">{product.unit_of_measure}</p>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Stock mínimo:</span>
                  <span>
                    {product.minimum_stock} {product.unit_of_measure}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Valor total:</span>
                  <span className="font-semibold">S/ {(product.current_stock * product.cost_price).toFixed(2)}</span>
                </div>
              </div>

              {stockStatus === "low" && (
                <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <div className="text-sm">
                    <p className="font-medium text-orange-800">Stock Bajo</p>
                    <p className="text-orange-600">Requiere reposición</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* QR Code Section */}
          {publicProductUrl && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5" />
                  Código QR del Producto
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-center">
                <div className="flex justify-center">
                  <QRCodeDisplay value={publicProductUrl} size={180} />
                </div>
                <p className="text-sm text-muted-foreground">
                  Escanea este código para ver la información pública del producto.
                </p>
                <Button variant="outline" size="sm" asChild>
                  <a href={publicProductUrl} target="_blank" rel="noopener noreferrer">
                    <Eye className="h-4 w-4 mr-2" />
                    Ver Página Pública
                  </a>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Movement Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Estadísticas de Movimientos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <ArrowUp className="h-6 w-6 mx-auto mb-1 text-green-600" />
                  <div className="text-2xl font-bold text-green-600">{movementStats.entradas}</div>
                  <p className="text-xs text-green-700">Entradas</p>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <ArrowDown className="h-6 w-6 mx-auto mb-1 text-red-600" />
                  <div className="text-2xl font-bold text-red-600">{movementStats.salidas}</div>
                  <p className="text-xs text-red-700">Salidas</p>
                </div>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <RotateCcw className="h-6 w-6 mx-auto mb-1 text-blue-600" />
                <div className="text-2xl font-bold text-blue-600">{movementStats.ajustes}</div>
                <p className="text-xs text-blue-700">Ajustes</p>
              </div>
              <Separator />
              <div className="text-center">
                <div className="text-lg font-semibold">{movementStats.total}</div>
                <p className="text-sm text-muted-foreground">Total de movimientos</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
