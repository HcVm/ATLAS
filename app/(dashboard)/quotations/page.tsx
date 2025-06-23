"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
import QuotationForm from "@/components/quotations/quotation-form"
import { Edit } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import RoutePlanner from "@/components/quotations/route-planner"
import QuotationPDFGenerator from "@/components/quotations/quotation-pdf-generator"

interface Quotation {
  id: string
  quotation_date: string
  quotation_number: string
  entity_name: string
  entity_ruc: string
  delivery_location: string
  unique_code: string
  product_description: string
  product_brand: string
  quantity: number
  platform_unit_price_with_tax: number
  platform_total: number
  supplier_unit_price_with_tax: number | null
  supplier_total: number | null
  offer_unit_price_with_tax: number | null
  offer_total_with_tax: number | null
  final_unit_price_with_tax: number | null
  budget_ceiling: number | null
  status: string
  valid_until: string | null
  created_by: string
  observations: string | null
  // Campos de ruta simplificados
  route_origin_address?: string | null
  route_destination_address?: string | null
  route_distance_km?: number | null
  route_duration_minutes?: number | null
  route_google_maps_url?: string | null
  route_created_at?: string | null
  route_created_by?: string | null
  profiles?: {
    full_name: string
  }
  reference_image_url: string | null
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

      const { data, error } = await supabase
        .from("quotations")
        .select(`
       *,
       profiles!quotations_created_by_fkey (full_name)
     `)
        .eq("company_id", companyId)
        .order("quotation_date", { ascending: false })

      if (error) {
        console.error("Quotations error:", error)
        throw error
      }

      console.log("Cotizaciones cargadas:", data?.length || 0)
      setQuotations(data || [])
    } catch (error: any) {
      console.error("Error fetching quotations:", error)
      toast.error("Error al cargar las cotizaciones: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async (companyId: string) => {
    try {
      const { data, error } = await supabase
        .from("quotations")
        .select("status, offer_total_with_tax")
        .eq("company_id", companyId)

      if (error) throw error

      const totalQuotations = data?.length || 0
      const draftQuotations = data?.filter((q) => q.status === "draft").length || 0
      const sentQuotations = data?.filter((q) => q.status === "sent").length || 0
      const approvedQuotations = data?.filter((q) => q.status === "approved").length || 0
      const totalQuotedAmount = data?.reduce((sum, q) => sum + (q.offer_total_with_tax || 0), 0) || 0
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

  const filteredQuotations = quotations.filter(
    (quotation) =>
      quotation.entity_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quotation.quotation_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quotation.unique_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quotation.product_description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quotation.entity_ruc.includes(searchTerm),
  )

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
      // Solo actualizar la cotización específica sin recargar toda la lista
      try {
        const { data, error } = await supabase.from("quotations").select("*").eq("id", selectedQuotation.id).single()

        if (error) {
          console.error("Error updating selected quotation:", error)
          return
        }

        if (data) {
          // Actualizar solo la cotización seleccionada sin cerrar el diálogo
          setSelectedQuotation(data)

          // Actualizar la cotización en la lista sin recargar todo
          setQuotations((prev) => prev.map((q) => (q.id === data.id ? data : q)))

          // Actualizar stats solo si es necesario
          fetchStats(companyId)
        }
      } catch (error) {
        console.error("Error in handleRouteUpdated:", error)
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
              <Button className="bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white shadow-lg">
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
              <QuotationForm
                onSuccess={() => {
                  setShowNewQuotationDialog(false)
                  if (companyId) {
                    fetchQuotations(companyId)
                    fetchStats(companyId)
                  }
                }}
              />
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
                    <TableHead className="text-slate-700">Código</TableHead>
                    <TableHead className="text-slate-700">Producto</TableHead>
                    <TableHead className="text-slate-700">Cantidad</TableHead>
                    <TableHead className="text-slate-700">Total Ofertado</TableHead>
                    <TableHead className="text-slate-700">Estado</TableHead>
                    <TableHead className="text-slate-700">Ruta</TableHead>
                    <TableHead className="text-slate-700">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredQuotations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={20} className="text-center py-8">
                        <div className="text-slate-500">
                          {searchTerm
                            ? "No se encontraron cotizaciones que coincidan con la búsqueda"
                            : "No hay cotizaciones registradas"}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredQuotations.map((quotation) => (
                      <TableRow
                        key={quotation.id}
                        className="hover:bg-gradient-to-r hover:from-slate-50/50 hover:to-slate-100/50"
                      >
                        <TableCell className="text-slate-600">
                          {format(new Date(quotation.quotation_date), "dd/MM/yyyy", { locale: es })}
                        </TableCell>
                        <TableCell className="font-medium text-slate-700">
                          {quotation.quotation_number || quotation.unique_code}
                        </TableCell>
                        <TableCell className="font-medium text-slate-700">{quotation.entity_name}</TableCell>
                        <TableCell className="text-slate-600">{quotation.entity_ruc}</TableCell>
                        <TableCell className="font-medium text-slate-700">{quotation.unique_code}</TableCell>
                        <TableCell className="max-w-xs truncate text-slate-600" title={quotation.product_description}>
                          {quotation.product_description}
                        </TableCell>
                        <TableCell className="text-slate-600">{quotation.quantity.toLocaleString()}</TableCell>
                        <TableCell className="font-medium text-slate-700">
                          {quotation.offer_total_with_tax
                            ? `S/ ${quotation.offer_total_with_tax.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`
                            : "-"}
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
                    ))
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
                {editingQuotation?.quotation_number || editingQuotation?.unique_code}
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
                {selectedQuotation?.quotation_number || selectedQuotation?.unique_code}
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
                          {selectedQuotation.quotation_number || selectedQuotation.unique_code}
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
                        <CardTitle className="text-lg text-slate-800">Información del Producto</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-medium text-slate-600">Descripción</Label>
                            <p className="text-sm text-slate-700">{selectedQuotation.product_description}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-slate-600">Marca</Label>
                            <p className="text-sm text-slate-700">
                              {selectedQuotation.product_brand || "No especificada"}
                            </p>
                          </div>
                        </div>
                        {selectedQuotation.reference_image_url && (
                          <div>
                            <Label className="text-sm font-medium text-slate-600">Imagen Referencial</Label>
                            <div className="mt-2 w-full max-w-md">
                              <img
                                src={selectedQuotation.reference_image_url || "/placeholder.svg"}
                                alt={selectedQuotation.product_description}
                                className="w-full h-48 object-contain bg-slate-50 rounded-lg border border-slate-200"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none"
                                }}
                              />
                            </div>
                          </div>
                        )}
                        <div>
                          <Label className="text-sm font-medium text-slate-600">Cantidad</Label>
                          <p className="text-lg font-bold text-slate-800">
                            {selectedQuotation.quantity.toLocaleString()} unidades
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Pricing Information */}
                    <Card className="bg-gradient-to-br from-white to-slate-50/50 border-slate-200">
                      <CardHeader>
                        <CardTitle className="text-lg text-slate-800">Información de Precios</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-slate-50">
                                <TableHead className="text-slate-700">Concepto</TableHead>
                                <TableHead className="text-slate-700">Precio Unitario</TableHead>
                                <TableHead className="text-slate-700">Total</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              <TableRow>
                                <TableCell className="font-medium text-slate-700">Precio Plataforma</TableCell>
                                <TableCell className="text-slate-600">
                                  S/{" "}
                                  {selectedQuotation.platform_unit_price_with_tax.toLocaleString("es-PE", {
                                    minimumFractionDigits: 2,
                                  })}
                                </TableCell>
                                <TableCell className="text-slate-600">
                                  S/{" "}
                                  {selectedQuotation.platform_total.toLocaleString("es-PE", {
                                    minimumFractionDigits: 2,
                                  })}
                                </TableCell>
                              </TableRow>

                              {selectedQuotation.supplier_unit_price_with_tax && (
                                <TableRow>
                                  <TableCell className="font-medium text-slate-700">Precio Proveedor</TableCell>
                                  <TableCell className="text-slate-600">
                                    S/{" "}
                                    {selectedQuotation.supplier_unit_price_with_tax.toLocaleString("es-PE", {
                                      minimumFractionDigits: 2,
                                    })}
                                  </TableCell>
                                  <TableCell className="text-slate-600">
                                    S/{" "}
                                    {selectedQuotation.supplier_total?.toLocaleString("es-PE", {
                                      minimumFractionDigits: 2,
                                    }) || "0.00"}
                                  </TableCell>
                                </TableRow>
                              )}

                              {selectedQuotation.offer_unit_price_with_tax && (
                                <TableRow className="bg-slate-50">
                                  <TableCell className="font-bold text-slate-800">Precio Oferta</TableCell>
                                  <TableCell className="font-bold text-slate-700">
                                    S/{" "}
                                    {selectedQuotation.offer_unit_price_with_tax.toLocaleString("es-PE", {
                                      minimumFractionDigits: 2,
                                    })}
                                  </TableCell>
                                  <TableCell className="font-bold text-slate-700">
                                    S/{" "}
                                    {selectedQuotation.offer_total_with_tax?.toLocaleString("es-PE", {
                                      minimumFractionDigits: 2,
                                    }) || "0.00"}
                                  </TableCell>
                                </TableRow>
                              )}

                              {selectedQuotation.final_unit_price_with_tax && (
                                <TableRow className="bg-slate-100">
                                  <TableCell className="font-bold text-slate-800">Precio Final</TableCell>
                                  <TableCell className="font-bold text-slate-700">
                                    S/{" "}
                                    {selectedQuotation.final_unit_price_with_tax.toLocaleString("es-PE", {
                                      minimumFractionDigits: 2,
                                    })}
                                  </TableCell>
                                  <TableCell className="font-bold text-slate-700">
                                    S/{" "}
                                    {(
                                      selectedQuotation.final_unit_price_with_tax * selectedQuotation.quantity
                                    ).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>

                        {selectedQuotation.budget_ceiling && (
                          <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                            <Label className="text-sm font-medium text-slate-600">Techo Presupuestal</Label>
                            <p className="text-lg font-bold text-slate-700">
                              S/{" "}
                              {selectedQuotation.budget_ceiling.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
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

                    {/* Additional Information */}
                    <Card className="bg-gradient-to-br from-white to-slate-50/50 border-slate-200">
                      <CardHeader>
                        <CardTitle className="text-lg text-slate-800">Información Adicional</CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-slate-600">Creado por</Label>
                          <p className="text-sm text-slate-700">{selectedQuotation.profiles?.full_name || "N/A"}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-slate-600">Fecha de Creación</Label>
                          <p className="text-sm text-slate-700">
                            {format(new Date(selectedQuotation.quotation_date), "dd/MM/yyyy HH:mm", { locale: es })}
                          </p>
                        </div>
                        {selectedQuotation.valid_until && (
                          <div>
                            <Label className="text-sm font-medium text-slate-600">Válida hasta</Label>
                            <p className="text-sm text-slate-700">
                              {format(new Date(selectedQuotation.valid_until), "dd/MM/yyyy", { locale: es })}
                            </p>
                          </div>
                        )}
                        <div>
                          <Label className="text-sm font-medium text-slate-600">Estado Actual</Label>
                          <div className="mt-1">{getStatusBadge(selectedQuotation.status)}</div>
                        </div>
                        {selectedQuotation.observations && (
                          <div className="md:col-span-2">
                            <Label className="text-sm font-medium text-slate-600">Observaciones</Label>
                            <p className="text-sm text-slate-700">{selectedQuotation.observations}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
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
                <QuotationPDFGenerator
                  quotation={selectedQuotation}
                  companyInfo={{
                    name: selectedCompany.name,
                    ruc: selectedCompany.ruc || "",
                    address: selectedCompany.address,
                    phone: selectedCompany.phone,
                    email: selectedCompany.email,
                  }}
                />
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
