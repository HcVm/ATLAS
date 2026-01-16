"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  ArrowLeft,
  Package,
  Calendar,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Building,
  User,
  MapPin,
  Loader2,
} from "lucide-react"
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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
    },
  },
}

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
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!movement) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
          <Package className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-gray-800">Movimiento no encontrado</h3>
        <p className="text-muted-foreground mt-1 max-w-sm mx-auto">
          El movimiento que buscas no existe o no tienes permisos para verlo.
        </p>
        <Button asChild className="mt-6 bg-gradient-to-r from-blue-600 to-indigo-600">
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
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 mt-10 w-full max-w-[95%] mx-auto"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild className="hover:bg-background/80 transition-colors">
            <Link href="/warehouse/internal/movements">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
              Detalle del Movimiento
            </h1>
            <p className="text-muted-foreground font-mono text-sm mt-1">ID: {movement.id.slice(-8)}</p>
          </div>
        </div>
        <Badge
          variant="outline"
          className={`${movementType?.bgColor} ${movementType?.borderColor} ${movementType?.color} border px-3 py-1 text-sm`}
        >
          <Icon className="h-4 w-4 mr-1.5" />
          {movementType?.label}
        </Badge>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <motion.div variants={itemVariants} className="lg:col-span-2 space-y-6">
          {/* Movement Information */}
          <Card className="border-none shadow-lg bg-white/80 backdrop-blur-md overflow-hidden">
            <CardHeader className="bg-gray-50/30 border-b border-gray-100">
              <CardTitle className="flex items-center gap-2 text-lg font-bold text-gray-800">
                <Icon className={`h-5 w-5 ${movementType?.color}`} />
                Información del Movimiento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Tipo de Movimiento
                  </label>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Icon className={`h-4 w-4 ${movementType?.color}`} />
                    <span className="text-sm font-medium text-gray-700">{movementType?.label}</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Cantidad
                  </label>
                  <p className={`text-lg font-bold mt-1 ${movementType?.color}`}>
                    {movement.movement_type === "salida" ? "-" : "+"}
                    {movement.quantity} {movement.internal_products.unit_of_measure}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Costo Unitario
                  </label>
                  <p className="text-sm font-medium mt-1 text-gray-700">S/ {movement.cost_price.toFixed(2)}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Valor Total
                  </label>
                  <p className="text-sm font-bold mt-1 text-gray-800">S/ {movement.total_amount.toFixed(2)}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Fecha del Movimiento
                  </label>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-gray-700">
                      {format(new Date(movement.movement_date), "dd/MM/yyyy", { locale: es })}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Hora de Registro
                  </label>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-gray-700">
                      {format(new Date(movement.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Solicitado por
                  </label>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                      <User className="h-3 w-3 text-gray-500" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">{movement.requested_by}</span>
                  </div>
                </div>
                {movement.department_requesting && (
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Departamento Solicitante
                    </label>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center">
                        <Building className="h-3 w-3 text-blue-500" />
                      </div>
                      <span className="text-sm font-medium text-gray-700">{movement.department_requesting}</span>
                    </div>
                  </div>
                )}
                {movement.supplier && (
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Proveedor/Fuente
                    </label>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="w-6 h-6 rounded-full bg-purple-50 flex items-center justify-center">
                        <Package className="h-3 w-3 text-purple-500" />
                      </div>
                      <span className="text-sm font-medium text-gray-700">{movement.supplier}</span>
                    </div>
                  </div>
                )}
              </div>

              <Separator className="bg-gray-100" />

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Motivo</label>
                <p className="text-sm mt-2 text-gray-700 leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-100">
                  {movement.reason}
                </p>
              </div>

              {movement.notes && (
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Notas Adicionales
                  </label>
                  <div className="mt-2 p-3 bg-yellow-50/50 rounded-lg border border-yellow-100">
                    <p className="text-sm text-gray-700">{movement.notes}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Sidebar */}
        <motion.div variants={itemVariants} className="space-y-6">
          {/* Product Information */}
          <Card className="border-none shadow-lg bg-white/80 backdrop-blur-md overflow-hidden">
            <CardHeader className="bg-gray-50/30 border-b border-gray-100">
              <CardTitle className="flex items-center gap-2 text-lg font-bold text-gray-800">
                <Package className="h-5 w-5 text-indigo-600" />
                Producto Relacionado
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 p-6">
              <div className="text-center">
                <h3 className="font-bold text-gray-900 text-lg">{movement.internal_products.name}</h3>
                <p className="text-xs text-muted-foreground font-mono mt-1 bg-gray-100 px-2 py-0.5 rounded-full inline-block">
                  {movement.internal_products.code}
                </p>
              </div>

              <Separator className="bg-gray-100" />

              <div className="space-y-4">
                {movement.internal_products.description && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Descripción</label>
                    <p className="text-sm text-gray-700 mt-1 line-clamp-2">{movement.internal_products.description}</p>
                  </div>
                )}

                {movement.internal_products.internal_product_categories && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Categoría</label>
                    <div className="flex items-center gap-2 mt-1">
                      <div
                        className="w-2.5 h-2.5 rounded-full ring-2 ring-gray-50"
                        style={{ backgroundColor: movement.internal_products.internal_product_categories.color }}
                      />
                      <span className="text-sm font-medium text-gray-700">
                        {movement.internal_products.internal_product_categories.name}
                      </span>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Stock Actual</label>
                    <p className="text-sm font-bold text-gray-800 mt-0.5">
                      {movement.internal_products.current_stock} {movement.internal_products.unit_of_measure}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Costo Unitario</label>
                    <p className="text-sm font-bold text-gray-800 mt-0.5">
                      S/ {movement.internal_products.cost_price.toFixed(2)}
                    </p>
                  </div>
                </div>

                {movement.internal_products.location && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Ubicación</label>
                    <div className="flex items-center gap-1.5 mt-1 text-gray-700">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm">{movement.internal_products.location}</span>
                    </div>
                  </div>
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                asChild
                className="w-full bg-white/50 border-gray-200 hover:bg-gray-50 hover:text-indigo-600 transition-colors"
              >
                <Link href={`/warehouse/internal/products/${movement.internal_products.id}`}>Ver Producto Completo</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Movement Summary */}
          <Card className="border-none shadow-lg bg-white/80 backdrop-blur-md overflow-hidden">
            <CardHeader className="bg-gray-50/30 border-b border-gray-100">
              <CardTitle className="text-lg font-bold text-gray-800">Resumen del Movimiento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              <div
                className={`p-6 rounded-xl ${movementType?.bgColor} ${movementType?.borderColor} border border-dashed`}
              >
                <div className="text-center">
                  <div className="inline-flex items-center justify-center p-3 rounded-full bg-white shadow-sm mb-3">
                    <Icon className={`h-6 w-6 ${movementType?.color}`} />
                  </div>
                  <div className={`text-3xl font-black ${movementType?.color} tracking-tight`}>
                    {movement.movement_type === "salida" ? "-" : "+"}
                    {movement.quantity}
                  </div>
                  <p className="text-sm font-medium text-muted-foreground mt-1">
                    {movement.internal_products.unit_of_measure}
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Valor unitario:</span>
                  <span className="font-medium text-gray-700">S/ {movement.cost_price.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Cantidad:</span>
                  <span className="font-medium text-gray-700">
                    {movement.quantity} {movement.internal_products.unit_of_measure}
                  </span>
                </div>
                <Separator className="bg-gray-100" />
                <div className="flex justify-between text-base font-bold">
                  <span className="text-gray-800">Valor total:</span>
                  <span className="text-indigo-600">S/ {movement.total_amount.toFixed(2)}</span>
                </div>
              </div>

              <div className="text-center pt-2">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-mono">
                  ID: {movement.id}
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  )
}
