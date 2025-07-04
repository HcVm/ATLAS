"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Package, Calendar, ArrowUp, ArrowDown, RotateCcw, Building, User, MapPin } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface Movement {
  id: string
  product_id: string
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
  internal_products: {
    id: string
    code: string
    name: string
    description: string | null
    unit_of_measure: string
    current_stock: number
    cost_price: number
    location: string | null
    internal_product_categories?: {
      name: string
      color: string
    }
  }
}

const MOVEMENT_TYPES = [
  {
    value: "entrada",
    label: "Entrada",
    icon: ArrowUp,
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
  },
  {
    value: "salida",
    label: "Salida",
    icon: ArrowDown,
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
  },
  {
    value: "ajuste",
    label: "Ajuste",
    icon: RotateCcw,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
  },
]

export default function InternalMovementDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [movement, setMovement] = useState<Movement | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (params.id && user?.company_id) {
      fetchMovementDetails()
    }
  }, [params.id, user?.company_id])

  const fetchMovementDetails = async () => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from("internal_inventory_movements")
        .select(`
          *,
          internal_products (
            id,
            code,
            name,
            description,
            unit_of_measure,
            current_stock,
            cost_price,
            location,
            internal_product_categories (
              name,
              color
            )
          )
        `)
        .eq("id", params.id)
        .eq("company_id", user?.company_id)
        .single()

      if (error) throw error

      setMovement(data)
    } catch (error) {
      console.error("Error fetching movement details:", error)
      toast.error("Error al cargar los detalles del movimiento")
      router.push("/warehouse/internal/movements")
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

  if (!movement) {
    return (
      <div className="text-center py-8">
        <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold">Movimiento no encontrado</h3>
        <p className="text-muted-foreground">El movimiento que buscas no existe o no tienes permisos para verlo.</p>
        <Button asChild className="mt-4">
          <Link href="/warehouse/internal/movements">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a Movimientos
          </Link>
        </Button>
      </div>
    )
  }

  const movementType = MOVEMENT_TYPES.find((t) => t.value === movement.movement_type)
  const Icon = movementType?.icon || Package

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/warehouse/internal/movements">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Detalle del Movimiento</h1>
            <p className="text-muted-foreground">ID: {movement.id.slice(-8)}</p>
          </div>
        </div>
        <Badge
          variant="outline"
          className={`${movementType?.bgColor} ${movementType?.borderColor} ${movementType?.color}`}
        >
          <Icon className="h-4 w-4 mr-1" />
          {movementType?.label}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Movement Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icon className={`h-5 w-5 ${movementType?.color}`} />
                Información del Movimiento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Tipo de Movimiento</label>
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${movementType?.color}`} />
                    <span className="text-sm font-medium">{movementType?.label}</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Cantidad</label>
                  <p className={`text-sm font-semibold ${movementType?.color}`}>
                    {movement.movement_type === "salida" ? "-" : "+"}
                    {movement.quantity} {movement.internal_products.unit_of_measure}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Costo Unitario</label>
                  <p className="text-sm">S/ {movement.cost_price.toFixed(2)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Valor Total</label>
                  <p className="text-sm font-semibold">S/ {movement.total_amount.toFixed(2)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Fecha del Movimiento</label>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm">
                      {format(new Date(movement.movement_date), "dd/MM/yyyy", { locale: es })}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Hora de Registro</label>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm">
                      {format(new Date(movement.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Solicitado por</label>
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm">{movement.requested_by}</span>
                  </div>
                </div>
                {movement.department_requesting && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Departamento Solicitante</label>
                    <div className="flex items-center gap-1">
                      <Building className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm">{movement.department_requesting}</span>
                    </div>
                  </div>
                )}
                {movement.supplier && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Proveedor/Fuente</label>
                    <div className="flex items-center gap-1">
                      <Package className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm">{movement.supplier}</span>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              <div>
                <label className="text-sm font-medium text-muted-foreground">Motivo</label>
                <p className="text-sm mt-1">{movement.reason}</p>
              </div>

              {movement.notes && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Notas Adicionales</label>
                  <div className="mt-1 p-3 bg-muted rounded-lg">
                    <p className="text-sm">{movement.notes}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Product Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Producto Relacionado
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <h3 className="font-semibold">{movement.internal_products.name}</h3>
                <p className="text-sm text-muted-foreground font-mono">{movement.internal_products.code}</p>
              </div>

              <Separator />

              <div className="space-y-3">
                {movement.internal_products.description && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Descripción</label>
                    <p className="text-sm">{movement.internal_products.description}</p>
                  </div>
                )}

                {movement.internal_products.internal_product_categories && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Categoría</label>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: movement.internal_products.internal_product_categories.color }}
                      />
                      <span className="text-sm">{movement.internal_products.internal_product_categories.name}</span>
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-xs font-medium text-muted-foreground">Stock Actual</label>
                  <p className="text-sm font-semibold">
                    {movement.internal_products.current_stock} {movement.internal_products.unit_of_measure}
                  </p>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground">Costo Unitario</label>
                  <p className="text-sm">S/ {movement.internal_products.cost_price.toFixed(2)}</p>
                </div>

                {movement.internal_products.location && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Ubicación</label>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm">{movement.internal_products.location}</span>
                    </div>
                  </div>
                )}
              </div>

              <Button variant="outline" size="sm" asChild className="w-full bg-transparent">
                <Link href={`/warehouse/internal/products/${movement.internal_products.id}`}>
                  Ver Producto Completo
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Movement Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Resumen del Movimiento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className={`p-4 rounded-lg ${movementType?.bgColor} ${movementType?.borderColor} border`}>
                <div className="text-center">
                  <Icon className={`h-8 w-8 mx-auto mb-2 ${movementType?.color}`} />
                  <div className={`text-2xl font-bold ${movementType?.color}`}>
                    {movement.movement_type === "salida" ? "-" : "+"}
                    {movement.quantity}
                  </div>
                  <p className="text-sm text-muted-foreground">{movement.internal_products.unit_of_measure}</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Valor unitario:</span>
                  <span>S/ {movement.cost_price.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Cantidad:</span>
                  <span>
                    {movement.quantity} {movement.internal_products.unit_of_measure}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>Valor total:</span>
                  <span>S/ {movement.total_amount.toFixed(2)}</span>
                </div>
              </div>

              <div className="text-center text-xs text-muted-foreground">ID: {movement.id}</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
