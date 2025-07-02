"use client"

import { DialogTrigger } from "@/components/ui/dialog"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Plus,
  Search,
  FileText,
  DollarSign,
  TrendingUp,
  Clock,
  Eye,
  Route,
  MapPin,
  AlertTriangle,
  Package,
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useCompany } from "@/lib/company-context"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import MultiProductQuotationForm from "@/components/quotations/multi-product-quotation-form"
import { Edit } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import RoutePlanner from "@/components/quotations/route-planner"
import QuotationPDFGenerator from "@/components/quotations/quotation-pdf-generator"
import EntityQuotationPDFGenerator from "@/components/quotations/entity-quotation-pdf-generator"
import PrivateQuotationPDFGenerator from "@/components/quotations/private-quotation-pdf-generator"
import ARMEntityQuotationPDFGenerator from "@/components/quotations/entity-quotation-pdf-generator-arm"
import ARMPrivateQuotationPDFGenerator from "@/components/quotations/private-quotation-pdf-generator-arm"


// Interfaces actualizadas después de la migración
interface QuotationItem {
  id: string
  quotation_id: string
  product_id: string | null
  product_code: string
  product_name: string
  product_description: string | null
  product_brand: string | null
  quantity: number
  platform_unit_price_with_tax: number
  platform_total: number
  supplier_unit_price_with_tax: number | null
  supplier_total: number | null
  offer_unit_price_with_tax: number | null
  offer_total_with_tax: number | null
  final_unit_price_with_tax: number | null
  reference_image_url: string | null
  budget_ceiling_unit_price_with_tax: number | null
  budget_ceiling_total: number | null
  item_commission_percentage: number | null
  item_commission_base_amount: number | null
  item_commission_amount: number | null
  created_at: string
  updated_at: string
}

interface Quotation {
  id: string
  quotation_date: string
  quotation_number: string | null
  company_id: string
  company_name: string
  company_ruc: string
  entity_id: string
  entity_name: string
  entity_ruc: string
  delivery_location: string
  status: string
  valid_until: string | null
  observations: string | null
  created_by: string
  created_at: string
  updated_at: string
  // Campos de ruta
  route_origin_address: string | null
  route_destination_address: string | null
  route_distance_km: number | null
  route_duration_minutes: number | null
  route_google_maps_url: string | null
  route_created_at: string | null
  route_created_by: string | null
  // Campos de multi-producto
  is_multi_product: boolean | null
  items_count: number | null
  budget_ceiling_total: number | null
  // Campos de comisión
  contact_person: string | null
  commission_percentage: number | null
  commission_base_amount: number | null
  commission_amount: number | null
  commission_notes: string | null
  // Relaciones
  profiles?: {
    full_name: string
  }
  quotation_items?: QuotationItem[]
}

interface QuotationsStats {
  totalQuotations: number
  draftQuotations: number
  sentQuotations: number
  approvedQuotations: number
  totalQuotedAmount: number
  averageQuotation: number
}

export default function QuotationsPage() {
  const { user } = useAuth()
  const { selectedCompany } = useCompany()
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [stats, setStats] = useState<QuotationsStats>({
    totalQuotations: 0,
    draftQuotations: 0,
    sentQuotations: 0,
    approvedQuotations: 0,
    totalQuotedAmount: 0,
    averageQuotation: 0,
  })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [showNewQuotationDialog, setShowNewQuotationDialog] = useState(false)
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null)
  const [showEditStatusDialog, setShowEditStatusDialog] = useState(false)
  const [newStatus, setNewStatus] = useState("")
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [companyId, setCompanyId] = useState<string | null>(null)

  // Check if user has quotations access
  const hasQuotationsAccess =
    user?.role === "admin" ||
    user?.role === "supervisor" ||
    user?.departments?.name === "Ventas" ||
    user?.departments?.name === "Administración" ||
    user?.departments?.name === "Operaciones"

  // Get the company to use
  const companyToUse = user?.role === "admin" ? selectedCompany : user?.company_id ? { id: user.company_id } : null

  useEffect(() => {
    const hasQuotationsAccess =
      user?.role === "admin" ||
      user?.role === "supervisor" ||
      user?.departments?.name === "Ventas" ||
      user?.departments?.name === "Administración" ||
      user?.departments?.name === "Operaciones"

    const companyId = user?.role === "admin" ? selectedCompany?.id : user?.company_id

    setCompanyId(companyId)

    if (companyId && hasQuotationsAccess) {
      fetchQuotations(companyId)
      fetchStats(companyId)
    } else {
      setLoading(false)
    }
  }, [user, selectedCompany])

  const fetchQuotations = async (companyId: string) => {
    try {
      setLoading(true)
      console.log("Cargando cotizaciones para empresa:", companyId)

      // Obtener cotizaciones con sus items
      const { data: quotationsData, error: quotationsError } = await supabase
        .from("quotations")
        .select(`
          *,
          profiles!quotations_created_by_fkey (full_name),
          quotation_items (
            id,
            product_id,
            product_code,
            product_name,
            product_description,
            product_brand,
            quantity,
            platform_unit_price_with_tax,
            platform_total,
            supplier_unit_price_with_tax,
            supplier_total,
            offer_unit_price_with_tax,
            offer_total_with_tax,
            final_unit_price_with_tax,
            reference_image_url,
            budget_ceiling_unit_price_with_tax,
            budget_ceiling_total,
            item_commission_percentage,
            item_commission_base_amount,
            item_commission_amount
          )
        `)
        .eq("company_id", companyId)
        .order("quotation_date", { ascending: false })

      if (quotationsError) {
        console.error("Quotations error:", quotationsError)
        throw quotationsError
      }

      console.log("Cotizaciones cargadas:", quotationsData?.length || 0)
      setQuotations(quotationsData || [])
    } catch (error: any) {
      console.error("Error fetching quotations:", error)
      toast.error("Error al cargar las cotizaciones: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async (companyId: string) => {
    try {
      // Obtener cotizaciones con sus items
      const { data: quotationsData, error } = await supabase
        .from("quotations")
        .select(`
          *,
          quotation_items (
            platform_total,
            supplier_total,
            offer_total_with_tax,
            final_unit_price_with_tax,
            quantity
          )
        `)
        .eq("company_id", companyId)

      if (error) throw error

      const totalQuotations = quotationsData?.length || 0
      const draftQuotations = quotationsData?.filter((q) => q.status === "draft").length || 0
      const sentQuotations = quotationsData?.filter((q) => q.status === "sent").length || 0
      const approvedQuotations = quotationsData?.filter((q) => q.status === "approved").length || 0

      // Calcular total desde items
      let totalQuotedAmount = 0

      for (const quotation of quotationsData || []) {
        if (quotation.quotation_items && quotation.quotation_items.length > 0) {
          const quotationTotal = quotation.quotation_items.reduce((sum: number, item: any) => {
            return sum + (item.offer_total_with_tax || item.platform_total || 0)
          }, 0)
          totalQuotedAmount += quotationTotal
        }
      }

      const averageQuotation = totalQuotations > 0 ? totalQuotedAmount / totalQuotations : 0

      setStats({
        totalQuotations,
        draftQuotations,
        sentQuotations,
        approvedQuotations,
        totalQuotedAmount,
        averageQuotation,
      })
    } catch (error: any) {
      console.error("Error fetching stats:", error)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { variant: "outline" as const, label: "Borrador" },
      sent: { variant: "secondary" as const, label: "Enviada" },
      approved: { variant: "default" as const, label: "Aprobada" },
      rejected: { variant: "destructive" as const, label: "Rechazada" },
      expired: { variant: "outline" as const, label: "Expirada" },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  // Función de filtrado actualizada - solo busca en campos que existen
  const filteredQuotations = quotations.filter((quotation) => {
    if (!searchTerm) return true

    const searchLower = searchTerm.toLowerCase()

    // Función helper para verificar si un valor contiene el término de búsqueda
    const containsSearch = (value: string | null | undefined): boolean => {
      if (!value) return false
      return value.toLowerCase().includes(searchLower)
    }

    // Buscar en campos de quotation que existen
    const quotationMatch =
      containsSearch(quotation.entity_name) ||
      containsSearch(quotation.quotation_number) ||
      containsSearch(quotation.entity_ruc) ||
      containsSearch(quotation.company_name) ||
      containsSearch(quotation.contact_person)

    // Buscar en items de la cotización
    const itemsMatch =
      quotation.quotation_items?.some(
        (item) =>
          containsSearch(item.product_name) ||
          containsSearch(item.product_description) ||
          containsSearch(item.product_code) ||
          containsSearch(item.product_brand),
      ) || false

    return quotationMatch || itemsMatch
  })

  const updateQuotationStatus = async () => {
    if (!editingQuotation || !newStatus) return

    try {
      const { error } = await supabase.from("quotations").update({ status: newStatus }).eq("id", editingQuotation.id)

      if (error) throw error

      toast.success("Estado actualizado exitosamente")
      setShowEditStatusDialog(false)
      setEditingQuotation(null)
      setNewStatus("")
      if (companyId) {
        fetchQuotations(companyId)
        fetchStats(companyId)
      }
    } catch (error: any) {
      console.error("Error updating status:", error)
      toast.error("Error al actualizar el estado")
    }
  }

  const handleRouteUpdated = async () => {
    if (selectedQuotation && companyId) {
      try {
        console.log("🔄 Refrescando cotización después de actualizar ruta:", selectedQuotation.id)

        // Obtener la cotización actualizada desde la base de datos con todos sus datos
        const { data, error } = await supabase
          .from("quotations")
          .select(`
        *,
        profiles!quotations_created_by_fkey (full_name),
        quotation_items (
          id,
          product_id,
          product_code,
          product_name,
          product_description,
          product_brand,
          quantity,
          platform_unit_price_with_tax,
          platform_total,
          supplier_unit_price_with_tax,
          supplier_total,
          offer_unit_price_with_tax,
          offer_total_with_tax,
          final_unit_price_with_tax,
          reference_image_url,
          budget_ceiling_unit_price_with_tax,
          budget_ceiling_total,
          item_commission_percentage,
          item_commission_base_amount,
          item_commission_amount
        )
      `)
          .eq("id", selectedQuotation.id)
          .single()

        if (error) {
          console.error("Error updating selected quotation:", error)
          toast.error("Error al actualizar la información de la cotización")
          return
        }

        if (data) {
          console.log("✅ Cotización actualizada con nueva información de ruta")

          // Actualizar la cotización seleccionada
          setSelectedQuotation(data)

          // Actualizar la cotización en la lista principal
          setQuotations((prev) => prev.map((q) => (q.id === data.id ? data : q)))

          // Refrescar las estadísticas
          if (companyId) {
            fetchStats(companyId)
          }

          // Mostrar mensaje de éxito
          toast.success("Información de ruta actualizada correctamente")
        }
      } catch (error) {
        console.error("Error in handleRouteUpdated:", error)
        toast.error("Error al actualizar la información de la cotización")
      }
    }
  }

  // Helper function to get display values for quotation
  const getQuotationDisplayData = (quotation: Quotation) => {
    if (quotation.quotation_items && quotation.quotation_items.length > 0) {
      const totalItems = quotation.quotation_items.length
      const totalQuantity = quotation.quotation_items.reduce((sum, item) => sum + (item.quantity || 0), 0)
      const totalAmount = quotation.quotation_items.reduce(
        (sum, item) => sum + (item.offer_total_with_tax || item.platform_total || 0),
        0,
      )

      if (quotation.is_multi_product) {
        // Multi-product quotation
        return {
          productDescription: `${totalItems} productos (${totalQuantity} items)`,
          quantity: `${totalQuantity} items`,
          totalAmount: totalAmount,
          hasItems: true,
        }
      } else {
        // Single product quotation
        const firstItem = quotation.quotation_items[0]
        return {
          productDescription: firstItem.product_description || firstItem.product_name || "Sin descripción",
          quantity: firstItem.quantity?.toLocaleString() || "0",
          totalAmount: totalAmount,
          hasItems: true,
        }
      }
    } else {
      // Cotización sin items (no debería pasar después de la migración)
      return {
        productDescription: "Sin productos",
        quantity: "0",
        totalAmount: 0,
        hasItems: false,
      }
    }
  }

  if (!hasQuotationsAccess) {
    return (
      <div className="min-h-screen p-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-700 via-slate-600 to-slate-500 bg-clip-text text-transparent">
                Cotizaciones
              </h1>
              <p className="text-slate-500">Gestión de cotizaciones</p>
            </div>
          </div>
          <Card className="bg-gradient-to-br from-white to-slate-50/50 border-slate-200 shadow-lg">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="h-8 w-8 text-slate-600" />
                </div>
                <p className="text-slate-600">No tienes permisos para acceder a las cotizaciones.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!companyToUse) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 p-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-700 via-slate-600 to-slate-500 bg-clip-text text-transparent">
                Cotizaciones
              </h1>
              <p className="text-slate-500">Gestión de cotizaciones</p>
            </div>
          </div>
          <Card className="bg-gradient-to-br from-white to-slate-50/50 border-slate-200 shadow-lg">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Package className="h-8 w-8 text-slate-600" />
                </div>
                <p className="text-slate-600">
                  {user?.role === "admin"
                    ? "Selecciona una empresa para ver sus cotizaciones."
                    : "No tienes una empresa asignada. Contacta al administrador."}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-slate-200 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-slate-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 p-6">
      <div className="container mx-auto py-8 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-700 via-slate-600 to-slate-500 bg-clip-text text-transparent">
              Cotizaciones y Proformas
            </h1>
            <p className="text-slate-600">
              Gestiona y crea cotizaciones para tus clientes
              {selectedCompany && <span className="ml-2 text-slate-700 font-medium">- {selectedCompany.name}</span>}
            </p>
          </div>
          <Dialog open={showNewQuotationDialog} onOpenChange={setShowNewQuotationDialog}>
            <DialogTrigger asChild>
              <Button
                className="bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white shadow-lg"
                onClick={() => {
                  console.log("Nueva Cotización button clicked")
                  setShowNewQuotationDialog(true)
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Nueva Cotización
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-white to-slate-50/50">
              <DialogHeader>
                <DialogTitle className="text-slate-800">Crear Nueva Cotización</DialogTitle>
                <DialogDescription className="text-slate-600">
                  Completa todos los campos para crear una nueva cotización
                </DialogDescription>
              </DialogHeader>
              {showNewQuotationDialog ? (
                <MultiProductQuotationForm
                  onSuccess={() => {
                    console.log("MultiProductQuotationForm onSuccess called")
                    setShowNewQuotationDialog(false)
                    if (companyId) {
                      fetchQuotations(companyId)
                      fetchStats(companyId)
                    }
                  }}
                />
              ) : (
                <div className="p-4">
                  <p>Cargando formulario...</p>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-white to-slate-50/50 border-slate-200 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-700">Total Cotizaciones</CardTitle>
              <div className="w-8 h-8 bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg flex items-center justify-center">
                <FileText className="h-4 w-4 text-slate-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-800">{stats.totalQuotations}</div>
              <p className="text-xs text-slate-500">Cotizaciones creadas</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-white to-slate-50/50 border-slate-200 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-700">Monto Cotizado</CardTitle>
              <div className="w-8 h-8 bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-slate-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-800">
                S/ {stats.totalQuotedAmount.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-slate-500">Valor total cotizado</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-white to-slate-50/50 border-slate-200 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-700">Promedio</CardTitle>
              <div className="w-8 h-8 bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-slate-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-800">
                S/ {stats.averageQuotation.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-slate-500">Promedio por cotización</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-white to-slate-50/50 border-slate-200 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-700">Aprobadas</CardTitle>
              <div className="w-8 h-8 bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg flex items-center justify-center">
                <Clock className="h-4 w-4 text-slate-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-800">{stats.approvedQuotations}</div>
              <p className="text-xs text-slate-500">Cotizaciones aprobadas</p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="bg-gradient-to-br from-white to-slate-50/50 border-slate-200 shadow-lg">
          <CardHeader>
            <CardTitle className="text-slate-800">Historial de Cotizaciones</CardTitle>
            <CardDescription className="text-slate-600">
              Todas las cotizaciones registradas en el sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar por cliente, RUC, número de cotización o producto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 border-slate-200 focus:border-slate-400"
                />
              </div>
            </div>

            {/* Quotations Table */}
            <div className="rounded-md border border-slate-200 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-slate-50 to-slate-100/50">
                    <TableHead className="text-slate-700">Fecha</TableHead>
                    <TableHead className="text-slate-700">N° Cotización</TableHead>
                    <TableHead className="text-slate-700">Cliente</TableHead>
                    <TableHead className="text-slate-700">RUC</TableHead>
                    <TableHead className="text-slate-700">Productos</TableHead>
                    <TableHead className="text-slate-700">Cantidad</TableHead>
                    <TableHead className="text-slate-700">Total</TableHead>
                    <TableHead className="text-slate-700">Estado</TableHead>
                    <TableHead className="text-slate-700">Ruta</TableHead>
                    <TableHead className="text-slate-700">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredQuotations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8">
                        <div className="text-slate-500">
                          {searchTerm
                            ? "No se encontraron cotizaciones que coincidan con la búsqueda"
                            : "No hay cotizaciones registradas"}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredQuotations.map((quotation) => {
                      const displayData = getQuotationDisplayData(quotation)
                      return (
                        <TableRow
                          key={quotation.id}
                          className="hover:bg-gradient-to-r hover:from-slate-50/50 hover:to-slate-100/50"
                        >
                          <TableCell className="text-slate-600">
                            {format(new Date(quotation.quotation_date), "dd/MM/yyyy", { locale: es })}
                          </TableCell>
                          <TableCell className="font-medium text-slate-700">
                            {quotation.quotation_number || `#${quotation.id.slice(0, 8)}`}
                          </TableCell>
                          <TableCell className="font-medium text-slate-700">{quotation.entity_name}</TableCell>
                          <TableCell className="text-slate-600">{quotation.entity_ruc}</TableCell>
                          <TableCell
                            className="max-w-xs truncate text-slate-600"
                            title={displayData.productDescription}
                          >
                            {displayData.productDescription}
                          </TableCell>
                          <TableCell className="text-slate-600">{displayData.quantity}</TableCell>
                          <TableCell className="font-medium text-slate-700">
                            S/ {displayData.totalAmount.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell>{getStatusBadge(quotation.status)}</TableCell>
                          <TableCell>
                            {quotation.route_distance_km ? (
                              <div className="flex items-center gap-1">
                                <Route className="h-4 w-4 text-green-600" />
                                <span className="text-xs text-green-600 font-medium">
                                  {quotation.route_distance_km.toFixed(0)} km
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-4 w-4 text-slate-400" />
                                <span className="text-xs text-slate-400">Sin ruta</span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  console.log("Viewing quotation:", quotation.id, quotation)
                                  setSelectedQuotation(quotation)
                                  setShowDetailsDialog(true)
                                }}
                                className="hover:bg-slate-100"
                              >
                                <Eye className="h-4 w-4 text-slate-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingQuotation(quotation)
                                  setNewStatus(quotation.status)
                                  setShowEditStatusDialog(true)
                                }}
                                className="hover:bg-slate-100"
                              >
                                <Edit className="h-4 w-4 text-slate-600" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Edit Status Dialog */}
        <Dialog open={showEditStatusDialog} onOpenChange={setShowEditStatusDialog}>
          <DialogContent className="bg-gradient-to-br from-white to-slate-50/50">
            <DialogHeader>
              <DialogTitle className="text-slate-800">Cambiar Estado de Cotización</DialogTitle>
              <DialogDescription className="text-slate-600">
                Actualiza el estado de la cotización:{" "}
                {editingQuotation?.quotation_number || `#${editingQuotation?.id.slice(0, 8)}`}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-slate-700">Estado Actual</Label>
                <div className="mt-1">{editingQuotation && getStatusBadge(editingQuotation.status)}</div>
              </div>
              <div>
                <Label htmlFor="new_status" className="text-slate-700">
                  Nuevo Estado
                </Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger className="border-slate-200 focus:border-slate-400">
                    <SelectValue placeholder="Seleccionar nuevo estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Borrador</SelectItem>
                    <SelectItem value="sent">Enviada</SelectItem>
                    <SelectItem value="approved">Aprobada</SelectItem>
                    <SelectItem value="rejected">Rechazada</SelectItem>
                    <SelectItem value="expired">Expirada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-4">
              <Button
                variant="outline"
                onClick={() => setShowEditStatusDialog(false)}
                className="border-slate-200 hover:bg-slate-100"
              >
                Cancelar
              </Button>
              <Button
                onClick={updateQuotationStatus}
                className="bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800"
              >
                Actualizar Estado
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Details Dialog with Tabs */}
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden bg-gradient-to-br from-white to-slate-50/50">
            <DialogHeader>
              <DialogTitle className="text-slate-800">Detalles de Cotización</DialogTitle>
              <DialogDescription className="text-slate-600">
                Información completa de la cotización{" "}
                {selectedQuotation?.quotation_number || `#${selectedQuotation?.id.slice(0, 8)}`}
              </DialogDescription>
            </DialogHeader>

            {selectedQuotation && (
              <Tabs defaultValue="details" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-slate-100">
                  <TabsTrigger value="details" className="flex items-center gap-2 data-[state=active]:bg-white">
                    <FileText className="h-4 w-4" />
                    Detalles
                  </TabsTrigger>
                  <TabsTrigger value="route" className="flex items-center gap-2 data-[state=active]:bg-white">
                    <Route className="h-4 w-4" />
                    Planificar Ruta
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="max-h-[70vh] overflow-y-auto">
                  <div className="space-y-6">
                    {/* Header Info */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gradient-to-r from-slate-50 to-slate-100/50 rounded-lg border border-slate-200">
                      <div>
                        <Label className="text-sm font-medium text-slate-600">Número</Label>
                        <p className="text-lg font-bold text-slate-700">
                          {selectedQuotation.quotation_number || `#${selectedQuotation.id.slice(0, 8)}`}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-slate-600">Estado</Label>
                        <div className="mt-1">{getStatusBadge(selectedQuotation.status)}</div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-slate-600">Fecha</Label>
                        <p className="text-sm text-slate-700">
                          {format(new Date(selectedQuotation.quotation_date), "dd/MM/yyyy", { locale: es })}
                        </p>
                      </div>
                    </div>

                    {/* Client Information */}
                    <Card className="bg-gradient-to-br from-white to-slate-50/50 border-slate-200">
                      <CardHeader>
                        <CardTitle className="text-lg text-slate-800">Información del Cliente</CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-slate-600">Razón Social</Label>
                          <p className="text-sm font-medium text-slate-800">{selectedQuotation.entity_name}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-slate-600">RUC</Label>
                          <p className="text-sm text-slate-700">{selectedQuotation.entity_ruc}</p>
                        </div>
                        <div className="md:col-span-2">
                          <Label className="text-sm font-medium text-slate-600">Lugar de Entrega</Label>
                          <p className="text-sm text-slate-700">{selectedQuotation.delivery_location}</p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Product Information */}
                    <Card className="bg-gradient-to-br from-white to-slate-50/50 border-slate-200">
                      <CardHeader>
                        <CardTitle className="text-lg text-slate-800">
                          {selectedQuotation.is_multi_product
                            ? "Productos en la Cotización"
                            : "Información del Producto"}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {selectedQuotation.quotation_items && selectedQuotation.quotation_items.length > 0 ? (
                          <div className="space-y-4">
                            {selectedQuotation.is_multi_product ? (
                              // Multi-product display
                              <>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div className="text-center p-3 bg-slate-50 rounded-lg">
                                    <p className="text-sm text-slate-600">Total de Productos</p>
                                    <p className="text-xl font-bold text-slate-700">
                                      {selectedQuotation.items_count || 0}
                                    </p>
                                  </div>
                                  <div className="text-center p-3 bg-slate-50 rounded-lg">
                                    <p className="text-sm text-slate-600">Cantidad Total</p>
                                    <p className="text-lg font-medium text-slate-700">
                                      {selectedQuotation.quotation_items?.reduce(
                                        (sum, item) => sum + (item.quantity || 0),
                                        0,
                                      ) || 0}{" "}
                                      items
                                    </p>
                                  </div>
                                  <div className="text-center p-3 bg-slate-50 rounded-lg">
                                    <p className="text-sm text-slate-600">Estado</p>
                                    <div className="mt-1">{getStatusBadge(selectedQuotation.status)}</div>
                                  </div>
                                </div>

                                <div className="mt-4">
                                  <h4 className="font-medium text-slate-700 mb-2">Lista de Productos:</h4>
                                  <div className="space-y-2">
                                    {selectedQuotation.quotation_items.map((item, index) => (
                                      <div
                                        key={item.id || index}
                                        className="p-3 bg-slate-50 rounded-lg border border-slate-200"
                                      >
                                        <div className="flex justify-between items-start">
                                          <div className="flex-1">
                                            <div className="flex items-start gap-3">
                                              {item.reference_image_url && (
                                                <img
                                                  src={item.reference_image_url || "/placeholder.svg"}
                                                  alt={item.product_name || "Producto"}
                                                  className="w-16 h-16 object-cover rounded-lg border border-slate-200"
                                                  onError={(e) => {
                                                    e.currentTarget.style.display = "none"
                                                  }}
                                                />
                                              )}
                                              <div className="flex-1">
                                                <p className="font-medium text-slate-800">
                                                  {item.product_name || "Producto sin nombre"}
                                                </p>
                                                <p className="text-sm text-slate-600">
                                                  {item.product_description || "Sin descripción"}
                                                </p>
                                                {item.product_code && (
                                                  <p className="text-xs text-slate-500">Código: {item.product_code}</p>
                                                )}
                                                {item.product_brand && (
                                                  <Badge variant="outline" className="text-xs mt-1">
                                                    {item.product_brand}
                                                  </Badge>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                          <div className="text-right ml-4">
                                            <p className="text-sm text-slate-600">
                                              Cantidad: {item.quantity?.toLocaleString() || 0}
                                            </p>
                                            <p className="text-sm font-medium text-slate-700">
                                              S/{" "}
                                              {(item.offer_total_with_tax || item.platform_total || 0).toLocaleString(
                                                "es-PE",
                                                { minimumFractionDigits: 2 },
                                              )}
                                            </p>
                                            {item.budget_ceiling_total && (
                                              <p className="text-xs text-orange-600">
                                                Techo: S/{" "}
                                                {item.budget_ceiling_total.toLocaleString("es-PE", {
                                                  minimumFractionDigits: 2,
                                                })}
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </>
                            ) : (
                              // Single product display
                              (() => {
                                const item = selectedQuotation.quotation_items[0]
                                return (
                                  <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div>
                                        <Label className="text-sm font-medium text-slate-600">Descripción</Label>
                                        <p className="text-sm text-slate-700">
                                          {item.product_description || item.product_name || "Sin descripción"}
                                        </p>
                                      </div>
                                      <div>
                                        <Label className="text-sm font-medium text-slate-600">Marca</Label>
                                        <p className="text-sm text-slate-700">
                                          {item.product_brand || "No especificada"}
                                        </p>
                                      </div>
                                    </div>

                                    {item.reference_image_url && (
                                      <div>
                                        <Label className="text-sm font-medium text-slate-600">Imagen Referencial</Label>
                                        <div className="mt-2 w-full max-w-md">
                                          <img
                                            src={item.reference_image_url || "/placeholder.svg"}
                                            alt={item.product_description || item.product_name || "Producto"}
                                            className="w-full h-48 object-contain bg-slate-50 rounded-lg border border-slate-200"
                                            onError={(e) => {
                                              e.currentTarget.style.display = "none"
                                            }}
                                          />
                                        </div>
                                      </div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div>
                                        <Label className="text-sm font-medium text-slate-600">Cantidad</Label>
                                        <p className="text-lg font-bold text-slate-800">
                                          {item.quantity?.toLocaleString() || 0} unidades
                                        </p>
                                      </div>
                                      <div>
                                        <Label className="text-sm font-medium text-slate-600">Total Cotizado</Label>
                                        <p className="text-lg font-bold text-primary">
                                          S/{" "}
                                          {(item.offer_total_with_tax || item.platform_total || 0).toLocaleString(
                                            "es-PE",
                                            {
                                              minimumFractionDigits: 2,
                                            },
                                          )}
                                        </p>
                                      </div>
                                    </div>
                                  </>
                                )
                              })()
                            )}
                          </div>
                        ) : (
                          <div className="text-center p-6 bg-slate-50 rounded-lg border border-slate-200">
                            <Package className="h-12 w-12 text-slate-400 mx-auto mb-2" />
                            <p className="text-slate-600">No se encontraron productos para esta cotización</p>
                            <p className="text-sm text-slate-500">
                              Los productos pueden no haberse cargado correctamente
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Route Information (if exists) */}
                    {selectedQuotation.route_distance_km && (
                      <Card className="bg-gradient-to-br from-white to-slate-50/50 border-slate-200">
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2 text-slate-800">
                            <Route className="h-5 w-5 text-slate-600" />
                            Información de Ruta
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                              <Route className="h-10 w-10 text-slate-600" />
                              <div>
                                <p className="text-sm text-slate-600">Distancia Total</p>
                                <p className="text-xl font-bold text-slate-700">
                                  {selectedQuotation.route_distance_km.toFixed(1)} km
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                              <Clock className="h-10 w-10 text-slate-600" />
                              <div>
                                <p className="text-sm text-slate-600">Duración Estimada</p>
                                <p className="text-xl font-bold text-slate-700">
                                  {selectedQuotation.route_duration_minutes
                                    ? `${Math.floor(selectedQuotation.route_duration_minutes / 60)}h ${selectedQuotation.route_duration_minutes % 60}m`
                                    : "N/A"}
                                </p>
                              </div>
                            </div>
                          </div>

                          {selectedQuotation.route_google_maps_url && (
                            <div className="mt-4">
                              <Button
                                variant="outline"
                                onClick={() => window.open(selectedQuotation.route_google_maps_url!, "_blank")}
                                className="border-slate-200 hover:bg-slate-100"
                              >
                                <MapPin className="h-4 w-4 mr-2" />
                                Ver Ruta en Google Maps
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    {/* Commission Information */}
                    {(selectedQuotation.contact_person || selectedQuotation.commission_percentage) && (
                      <Card className="bg-gradient-to-br from-white to-slate-50/50 border-slate-200">
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2 text-slate-800">
                            <DollarSign className="h-5 w-5 text-slate-600" />
                            Información de Comisión
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {selectedQuotation.contact_person && (
                              <div>
                                <Label className="text-sm font-medium text-slate-600">Contacto/Vendedor</Label>
                                <p className="text-sm font-medium text-slate-800">{selectedQuotation.contact_person}</p>
                              </div>
                            )}

                            {selectedQuotation.commission_percentage && (
                              <div>
                                <Label className="text-sm font-medium text-slate-600">Porcentaje de Comisión</Label>
                                <p className="text-sm font-medium text-slate-800">
                                  {selectedQuotation.commission_percentage.toFixed(2)}%
                                </p>
                              </div>
                            )}

                            {selectedQuotation.commission_base_amount && (
                              <div>
                                <Label className="text-sm font-medium text-slate-600">Base de Cálculo (Sin IGV)</Label>
                                <p className="text-sm font-medium text-slate-800">
                                  S/{" "}
                                  {selectedQuotation.commission_base_amount.toLocaleString("es-PE", {
                                    minimumFractionDigits: 2,
                                  })}
                                </p>
                              </div>
                            )}

                            {selectedQuotation.commission_amount && (
                              <div>
                                <Label className="text-sm font-medium text-slate-600">Monto de Comisión</Label>
                                <div className="bg-gradient-to-r from-green-50 to-green-100 p-3 rounded-lg border border-green-200">
                                  <p className="text-lg font-bold text-green-700">
                                    S/{" "}
                                    {selectedQuotation.commission_amount.toLocaleString("es-PE", {
                                      minimumFractionDigits: 2,
                                    })}
                                  </p>
                                </div>
                              </div>
                            )}

                            {selectedQuotation.commission_notes && (
                              <div className="md:col-span-2">
                                <Label className="text-sm font-medium text-slate-600">Notas de Comisión</Label>
                                <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200">
                                  {selectedQuotation.commission_notes}
                                </p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="route" className="max-h-[70vh] overflow-y-auto">
                  <RoutePlanner
                    quotationId={selectedQuotation.id}
                    initialDestination={selectedQuotation.delivery_location}
                    onRouteCalculated={handleRouteUpdated}
                  />
                </TabsContent>
              </Tabs>
            )}

            <div className="flex justify-end space-x-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowDetailsDialog(false)}
                className="border-slate-200 hover:bg-slate-100"
              >
                Cerrar
              </Button>
              {selectedQuotation && selectedCompany && (
                <>
                  {/* Mostrar botones según la empresa */}
                  {selectedCompany.code === "ARM" ? (
                    <>
                      <ARMEntityQuotationPDFGenerator quotation={selectedQuotation} companyInfo={selectedCompany} />
                      <ARMPrivateQuotationPDFGenerator quotation={selectedQuotation} companyInfo={selectedCompany} />
                    </>
                  ) : (
                    <>
                      <EntityQuotationPDFGenerator quotation={selectedQuotation} companyInfo={selectedCompany} />
                      <PrivateQuotationPDFGenerator quotation={selectedQuotation} companyInfo={selectedCompany} />
                    </>
                  )}
                  <QuotationPDFGenerator
                    quotation={selectedQuotation}
                    companyInfo={{
                      id: selectedCompany.id,
                      name: selectedCompany.name,
                      ruc: selectedCompany.ruc || "",
                      code: selectedCompany.code || "",
                      description: selectedCompany.description,
                      logo_url: selectedCompany.logo_url,
                      color: selectedCompany.color || "#3B82F6",
                      address: selectedCompany.address,
                      phone: selectedCompany.phone,
                      email: selectedCompany.email,
                    }}
                  />
                </>
              )}
              <Button
                onClick={() => {
                  setShowDetailsDialog(false)
                  setEditingQuotation(selectedQuotation)
                  setNewStatus(selectedQuotation?.status || "")
                  setShowEditStatusDialog(true)
                }}
                className="bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800"
              >
                Cambiar Estado
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
