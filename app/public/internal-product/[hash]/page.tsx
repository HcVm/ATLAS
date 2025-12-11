"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Package,
  Tag,
  MapPin,
  Calendar,
  Loader2,
  AlertTriangle,
  ArrowLeft,
  Building2,
  Hash,
  Layers,
  DollarSign,
  Box,
  Clock,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Wrench,
  Trash2,
  QrCode,
  FileText,
  BarChart3,
  Landmark,
  Calculator,
  Receipt,
  Users,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { format, formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import Image from "next/image"

interface Company {
  id: string
  name: string
  logo_url: string | null
  color: string | null
  code: string
}

interface Department {
  id: string
  name: string
}

interface FixedAsset {
  id: string
  code: string
  name: string
  description: string | null
  acquisition_date: string
  acquisition_cost: number
  book_value: number
  status: string
  current_location: string | null
  supplier_name: string | null
  fixed_asset_accounts: {
    id: string
    code: string
    name: string
    depreciation_rate: number
    useful_life_years: number
  } | null
  departments: { id: string; name: string } | null
}

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
  notes: string | null
  barcode: string | null
  company_id: string
  internal_product_categories?: {
    id: number
    name: string
    color: string
  }
  companies?: Company
}

interface Movement {
  id: string
  movement_type: string
  movement_date: string
  quantity: number
  reason: string | null
  notes: string | null
  department_requesting: string | null
  requested_by: string | null
  supplier: string | null
  cost_price: number | null
  created_at: string
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
  company_id: string
  condition: string | null
  fixed_asset_id: string | null
  internal_products: {
    id: string
    name: string
    code: string
    description: string | null
    unit_of_measure: string
    is_serialized: boolean
    cost_price: number | null
    location: string | null
    minimum_stock: number
    notes: string | null
    barcode: string | null
    internal_product_categories?: {
      id: number
      name: string
      color: string
    }
    companies?: Company
  }
}

export default function PublicInternalProductPage() {
  const params = useParams()
  const [data, setData] = useState<Product | SerializedProduct | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [movements, setMovements] = useState<Movement[]>([])
  const [stockCount, setStockCount] = useState<number>(0)
  const [departments, setDepartments] = useState<Department[]>([])
  const [fixedAsset, setFixedAsset] = useState<FixedAsset | null>(null)

  useEffect(() => {
    if (params.hash) {
      fetchProductOrSerial()
    }
  }, [params.hash])

  const resolveLocation = (location: string | null): string => {
    if (!location) return "Sin asignar"
    // Check if it's a UUID (department ID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (uuidRegex.test(location)) {
      const dept = departments.find((d) => d.id === location)
      return dept?.name || location
    }
    return location
  }

  const fetchProductOrSerial = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: deptData } = await supabase.from("departments").select("id, name")

      if (deptData) {
        setDepartments(deptData)
      }

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
          ),
          companies (
            id,
            name,
            logo_url,
            color,
            code
          )
        `,
        )
        .eq("qr_code_hash", params.hash)
        .single()

      if (productData) {
        setData(productData as Product)

        // Fetch stock count for serialized products
        if (productData.is_serialized) {
          const { count } = await supabase
            .from("internal_product_serials")
            .select("id", { count: "exact", head: true })
            .eq("product_id", productData.id)
            .eq("status", "in_stock")

          setStockCount(count || 0)
        }

        // Fetch recent movements for this product
        const { data: movementsData } = await supabase
          .from("internal_inventory_movements")
          .select("*")
          .eq("product_id", productData.id)
          .order("movement_date", { ascending: false })
          .limit(5)

        setMovements(movementsData || [])
        return
      }

      // If not found as a product, try to fetch as a serialized product
      const { data: serialData, error: serialError } = await supabase
        .from("internal_product_serials")
        .select(
          `
          *,
          internal_products (
            id,
            name,
            code,
            description,
            unit_of_measure,
            is_serialized,
            cost_price,
            location,
            minimum_stock,
            notes,
            barcode,
            internal_product_categories (
              id,
              name,
              color
            ),
            companies (
              id,
              name,
              logo_url,
              color,
              code
            )
          )
        `,
        )
        .eq("qr_code_hash", params.hash)
        .single()

      if (serialData) {
        setData(serialData as SerializedProduct)

        if (serialData.fixed_asset_id) {
          const { data: assetData } = await supabase
            .from("fixed_assets")
            .select(`
              id,
              code,
              name,
              description,
              acquisition_date,
              acquisition_cost,
              book_value,
              status,
              current_location,
              supplier_name,
              fixed_asset_accounts (
                id,
                code,
                name,
                depreciation_rate,
                useful_life_years
              ),
              departments (
                id,
                name
              )
            `)
            .eq("id", serialData.fixed_asset_id)
            .single()

          if (assetData) {
            setFixedAsset(assetData as FixedAsset)
          }
        }

        // Fetch movements for this specific serial
        const { data: movementsData } = await supabase
          .from("internal_inventory_movements")
          .select("*")
          .eq("serial_id", serialData.id)
          .order("movement_date", { ascending: false })
          .limit(10)

        setMovements(movementsData || [])
        return
      }

      if (productError || serialError) {
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

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
      in_stock: {
        label: "En Stock",
        color: "text-emerald-700",
        bgColor: "bg-emerald-50 border-emerald-200",
        icon: <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />,
      },
      out_of_stock: {
        label: "Asignado",
        color: "text-blue-700",
        bgColor: "bg-blue-50 border-blue-200",
        icon: <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />,
      },
      in_repair: {
        label: "En Reparación",
        color: "text-amber-700",
        bgColor: "bg-amber-50 border-amber-200",
        icon: <Wrench className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" />,
      },
      disposed: {
        label: "Desechado",
        color: "text-red-700",
        bgColor: "bg-red-50 border-red-200",
        icon: <Trash2 className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />,
      },
    }
    return configs[status] || configs.in_stock
  }

  const getFixedAssetStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; color: string }> = {
      active: { label: "Activo", color: "bg-green-100 text-green-800" },
      retired: { label: "Retirado", color: "bg-gray-100 text-gray-800" },
      sold: { label: "Vendido", color: "bg-blue-100 text-blue-800" },
      damaged: { label: "Dañado", color: "bg-red-100 text-red-800" },
    }
    return configs[status] || configs.active
  }

  const getMovementTypeConfig = (type: string) => {
    const configs: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
      entrada: { label: "Entrada", color: "text-emerald-600", icon: <TrendingUp className="h-4 w-4" /> },
      salida: { label: "Salida", color: "text-red-600", icon: <TrendingDown className="h-4 w-4" /> },
      ajuste: { label: "Ajuste", color: "text-amber-600", icon: <RefreshCw className="h-4 w-4" /> },
      baja: { label: "Baja", color: "text-slate-600", icon: <AlertCircle className="h-4 w-4" /> },
    }
    return configs[type] || { label: type, color: "text-slate-600", icon: <Box className="h-4 w-4" /> }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
          <div className="relative bg-white p-4 rounded-full shadow-lg">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
        <p className="mt-4 text-slate-600 font-medium">Cargando información...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-red-50 via-slate-50 to-slate-100 p-4 text-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">No encontrado</h1>
          <p className="text-slate-600 mb-6">{error}</p>
          <Button asChild variant="outline">
            <Link href="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver al inicio
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 p-4 text-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="w-16 h-16 mx-auto bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <Package className="h-8 w-8 text-slate-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Información no disponible</h1>
          <p className="text-slate-600 mb-6">No se pudo cargar la información del producto o serie.</p>
          <Button asChild variant="outline">
            <Link href="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver al inicio
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  const isSerializedUnit = "serial_number" in data
  const company = isSerializedUnit ? data.internal_products.companies : data.companies
  const category = isSerializedUnit
    ? data.internal_products.internal_product_categories
    : data.internal_product_categories

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50">
      {/* Header with Company Info */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {company?.logo_url ? (
                <Image
                  src={company.logo_url || "/placeholder.svg"}
                  alt={company.name}
                  width={40}
                  height={40}
                  className="rounded-lg object-contain"
                />
              ) : (
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: company?.color || "#6366f1" }}
                >
                  <Building2 className="h-5 w-5 text-white" />
                </div>
              )}
              <div>
                <h1 className="font-semibold text-slate-900">{company?.name || "Sistema de Inventario"}</h1>
                <p className="text-xs text-slate-500">Inventario Interno</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-slate-500">
              <QrCode className="h-5 w-5" />
              <span className="text-sm font-mono">{String(params.hash).substring(0, 8)}...</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Main Product/Serial Card */}
        <Card className="overflow-hidden border-0 shadow-lg">
          {/* Card Header with Status */}
          <div
            className="px-4 sm:px-6 py-4"
            style={{
              background: `linear-gradient(135deg, ${category?.color || "#6366f1"}15, ${category?.color || "#6366f1"}05)`,
            }}
          >
            <div className="flex flex-col gap-4">
              {/* Top row: Icon + Info + Status Badge */}
              <div className="flex items-start gap-3 sm:gap-4">
                <div
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: category?.color || "#6366f1" }}
                >
                  {isSerializedUnit ? (
                    <Tag className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                  ) : (
                    <Package className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    {category && (
                      <Badge
                        variant="secondary"
                        className="text-xs font-medium"
                        style={{
                          backgroundColor: `${category.color}20`,
                          color: category.color,
                        }}
                      >
                        {category.name}
                      </Badge>
                    )}
                    {isSerializedUnit && (
                      <Badge variant="outline" className="text-xs">
                        Unidad Serializada
                      </Badge>
                    )}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 break-words">
                    {isSerializedUnit ? data.serial_number : data.name}
                  </h2>
                  {isSerializedUnit && (
                    <p className="text-slate-600 mt-1 text-sm sm:text-base">
                      {data.internal_products.name}
                      {fixedAsset && <span className="text-xs text-amber-600 ml-2">(Activo Fijo)</span>}
                    </p>
                  )}
                </div>
              </div>

              {/* Status Badge - Now in its own row on mobile */}
              {isSerializedUnit && (
                <div
                  className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl border w-full sm:w-auto sm:self-start ${getStatusConfig(data.status).bgColor}`}
                >
                  {getStatusConfig(data.status).icon}
                  <span className={`font-semibold text-sm sm:text-base ${getStatusConfig(data.status).color}`}>
                    {getStatusConfig(data.status).label}
                  </span>
                </div>
              )}

              {!isSerializedUnit && (
                <div
                  className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl border w-full sm:w-auto sm:self-start ${data.is_active ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200"}`}
                >
                  {data.is_active ? (
                    <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400" />
                  )}
                  <span
                    className={`text-sm sm:text-base ${data.is_active ? "font-semibold text-emerald-700" : "font-semibold text-slate-500"}`}
                  >
                    {data.is_active ? "Activo" : "Inactivo"}
                  </span>
                </div>
              )}
            </div>
          </div>

          <CardContent className="p-4 sm:p-6">
            {/* Quick Info Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
              <div className="bg-slate-50 rounded-xl p-3 sm:p-4">
                <div className="flex items-center gap-2 text-slate-500 mb-1">
                  <Hash className="h-4 w-4" />
                  <span className="text-xs font-medium uppercase">Código</span>
                </div>
                <p className="font-mono font-semibold text-slate-900 text-sm sm:text-base break-all">
                  {isSerializedUnit ? data.internal_products.code : data.code}
                </p>
              </div>

              <div className="bg-slate-50 rounded-xl p-3 sm:p-4">
                <div className="flex items-center gap-2 text-slate-500 mb-1">
                  <Layers className="h-4 w-4" />
                  <span className="text-xs font-medium uppercase">Unidad</span>
                </div>
                <p className="font-semibold text-slate-900 capitalize text-sm sm:text-base">
                  {isSerializedUnit ? data.internal_products.unit_of_measure : data.unit_of_measure}
                </p>
              </div>

              {isSerializedUnit ? (
                <div className="bg-slate-50 rounded-xl p-3 sm:p-4">
                  <div className="flex items-center gap-2 text-slate-500 mb-1">
                    <MapPin className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase">Ubicación</span>
                  </div>
                  <p className="font-semibold text-slate-900 text-sm sm:text-base">
                    {resolveLocation(data.current_location)}
                  </p>
                </div>
              ) : (
                <div className="bg-slate-50 rounded-xl p-3 sm:p-4">
                  <div className="flex items-center gap-2 text-slate-500 mb-1">
                    <BarChart3 className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase">Stock</span>
                  </div>
                  <p className="font-semibold text-slate-900 text-sm sm:text-base">
                    {data.is_serialized ? stockCount : data.current_stock}{" "}
                    <span className="text-slate-500 font-normal text-xs sm:text-sm">/ mín. {data.minimum_stock}</span>
                  </p>
                </div>
              )}

              <div className="bg-slate-50 rounded-xl p-3 sm:p-4">
                <div className="flex items-center gap-2 text-slate-500 mb-1">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-xs font-medium uppercase">Valor</span>
                </div>
                <p className="font-semibold text-slate-900 text-sm sm:text-base">
                  S/ {(isSerializedUnit ? data.internal_products.cost_price || 0 : data.cost_price || 0).toFixed(2)}
                </p>
              </div>
            </div>

            <Separator className="my-6" />

            {/* Detailed Information */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Información General
                </h3>

                {/* Description */}
                {(isSerializedUnit ? data.internal_products.description : data.description) && (
                  <div className="bg-slate-50 rounded-xl p-4">
                    <label className="text-xs font-medium text-slate-500 uppercase">Descripción</label>
                    <p className="text-slate-700 mt-1 text-sm sm:text-base">
                      {isSerializedUnit ? data.internal_products.description : data.description}
                    </p>
                  </div>
                )}

                {/* Location */}
                {!isSerializedUnit && data.location && (
                  <div className="flex items-start gap-3 p-3 rounded-lg border border-slate-200">
                    <MapPin className="h-5 w-5 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase">Ubicación Predeterminada</p>
                      <p className="text-slate-900 font-medium">{resolveLocation(data.location)}</p>
                    </div>
                  </div>
                )}

                {/* Notes */}
                {(isSerializedUnit ? data.internal_products.notes : data.notes) && (
                  <div className="flex items-start gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50">
                    <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-amber-700 uppercase">Notas</p>
                      <p className="text-amber-800 text-sm">
                        {isSerializedUnit ? data.internal_products.notes : data.notes}
                      </p>
                    </div>
                  </div>
                )}

                {/* Barcode */}
                {(isSerializedUnit ? data.internal_products.barcode : data.barcode) && (
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-200">
                    <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                      <svg className="h-6 w-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4v16m8-8H4M7 4v16M17 4v16M3 8h2m14 0h2M3 16h2m14 0h2"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase">Código de Barras</p>
                      <p className="font-mono text-slate-900 text-sm">
                        {isSerializedUnit ? data.internal_products.barcode : data.barcode}
                      </p>
                    </div>
                  </div>
                )}

                {isSerializedUnit && data.condition && (
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-200">
                    <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5 text-slate-600" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase">Condición</p>
                      <p className="font-medium text-slate-900 capitalize">{data.condition}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column - Dates & Timeline */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Fechas
                </h3>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-slate-400" />
                      <span className="text-sm text-slate-600">Registrado</span>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-slate-900 text-sm">
                        {format(new Date(data.created_at), "dd MMM yyyy", { locale: es })}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatDistanceToNow(new Date(data.created_at), { locale: es, addSuffix: true })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200">
                    <div className="flex items-center gap-3">
                      <RefreshCw className="h-5 w-5 text-slate-400" />
                      <span className="text-sm text-slate-600">Última actualización</span>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-slate-900 text-sm">
                        {format(new Date(data.updated_at), "dd MMM yyyy", { locale: es })}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatDistanceToNow(new Date(data.updated_at), { locale: es, addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Stock Alert for Products */}
                {!isSerializedUnit && (data.is_serialized ? stockCount : data.current_stock) <= data.minimum_stock && (
                  <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50">
                    <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-800">Stock Bajo</p>
                      <p className="text-sm text-amber-700">
                        El stock actual está por debajo del mínimo recomendado ({data.minimum_stock} unidades).
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {isSerializedUnit && fixedAsset && (
          <Card className="border-0 shadow-lg overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100">
              <CardTitle className="flex items-center gap-2 text-lg text-amber-900">
                <Landmark className="h-5 w-5 text-amber-600" />
                Activo Fijo Asociado
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="space-y-4">
                {/* Fixed Asset Header */}
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={getFixedAssetStatusConfig(fixedAsset.status).color}>
                        {getFixedAssetStatusConfig(fixedAsset.status).label}
                      </Badge>
                      {fixedAsset.fixed_asset_accounts && (
                        <Badge variant="outline" className="text-xs">
                          {fixedAsset.fixed_asset_accounts.name}
                        </Badge>
                      )}
                    </div>
                    <h4 className="text-lg font-bold text-slate-900">{fixedAsset.name}</h4>
                    <p className="text-sm text-slate-500 font-mono">{fixedAsset.code}</p>
                  </div>
                </div>

                {fixedAsset.description && (
                  <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">{fixedAsset.description}</p>
                )}

                {/* Fixed Asset Details Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="bg-amber-50 rounded-lg p-3">
                    <div className="flex items-center gap-1.5 text-amber-700 mb-1">
                      <DollarSign className="h-4 w-4" />
                      <span className="text-xs font-medium uppercase">Costo Adquisición</span>
                    </div>
                    <p className="font-bold text-amber-900">S/ {fixedAsset.acquisition_cost.toFixed(2)}</p>
                  </div>

                  <div className="bg-emerald-50 rounded-lg p-3">
                    <div className="flex items-center gap-1.5 text-emerald-700 mb-1">
                      <Calculator className="h-4 w-4" />
                      <span className="text-xs font-medium uppercase">Valor en Libros</span>
                    </div>
                    <p className="font-bold text-emerald-900">S/ {fixedAsset.book_value.toFixed(2)}</p>
                  </div>

                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="flex items-center gap-1.5 text-blue-700 mb-1">
                      <Calendar className="h-4 w-4" />
                      <span className="text-xs font-medium uppercase">Fecha Adquisición</span>
                    </div>
                    <p className="font-bold text-blue-900 text-sm">
                      {format(new Date(fixedAsset.acquisition_date), "dd/MM/yyyy")}
                    </p>
                  </div>

                  {fixedAsset.departments && (
                    <div className="bg-purple-50 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 text-purple-700 mb-1">
                        <Building2 className="h-4 w-4" />
                        <span className="text-xs font-medium uppercase">Departamento</span>
                      </div>
                      <p className="font-bold text-purple-900 text-sm">{fixedAsset.departments.name}</p>
                    </div>
                  )}

                  {fixedAsset.supplier_name && (
                    <div className="bg-slate-50 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 text-slate-700 mb-1">
                        <Users className="h-4 w-4" />
                        <span className="text-xs font-medium uppercase">Proveedor</span>
                      </div>
                      <p className="font-semibold text-slate-900 text-sm">{fixedAsset.supplier_name}</p>
                    </div>
                  )}

                  {fixedAsset.fixed_asset_accounts && (
                    <div className="bg-orange-50 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 text-orange-700 mb-1">
                        <Receipt className="h-4 w-4" />
                        <span className="text-xs font-medium uppercase">Depreciación</span>
                      </div>
                      <p className="font-bold text-orange-900">
                        {fixedAsset.fixed_asset_accounts.depreciation_rate}% anual
                      </p>
                      <p className="text-xs text-orange-700">
                        Vida útil: {fixedAsset.fixed_asset_accounts.useful_life_years} años
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Movement History */}
        {movements.length > 0 && (
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5 text-slate-600" />
                Historial de Movimientos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {movements.map((movement, index) => {
                  const config = getMovementTypeConfig(movement.movement_type)
                  return (
                    <div
                      key={movement.id}
                      className={`flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border border-slate-200 ${index === 0 ? "bg-slate-50" : ""}`}
                    >
                      <div
                        className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 ${config.color} bg-white border`}
                      >
                        {config.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className={config.color}>
                              {config.label}
                            </Badge>
                            <span className="font-semibold text-slate-900 text-sm sm:text-base">
                              {movement.quantity}{" "}
                              {isSerializedUnit ? data.internal_products.unit_of_measure : data.unit_of_measure}
                            </span>
                          </div>
                          <time className="text-xs sm:text-sm text-slate-500">
                            {format(new Date(movement.movement_date), "dd/MM/yyyy", { locale: es })}
                          </time>
                        </div>

                        {(movement.reason || movement.notes) && (
                          <p className="text-sm text-slate-600 mt-1">{movement.reason || movement.notes}</p>
                        )}

                        <div className="flex flex-wrap gap-2 sm:gap-3 mt-2 text-xs text-slate-500">
                          {movement.department_requesting && (
                            <span className="flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {resolveLocation(movement.department_requesting)}
                            </span>
                          )}
                          {movement.requested_by && (
                            <span className="flex items-center gap-1">Solicitado por: {movement.requested_by}</span>
                          )}
                          {movement.supplier && (
                            <span className="flex items-center gap-1">Proveedor: {movement.supplier}</span>
                          )}
                          {movement.cost_price && (
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              S/ {movement.cost_price.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <footer className="text-center py-6 text-sm text-slate-500">
          <p>Información verificada del sistema de inventario</p>
          <p className="mt-1">
            Escaneado el {format(new Date(), "dd 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es })}
          </p>
        </footer>
      </main>
    </div>
  )
}
