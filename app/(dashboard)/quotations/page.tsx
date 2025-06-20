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
import { Plus, Search, FileText, DollarSign, TrendingUp, Clock, Eye, Route, MapPin } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useCompany } from "@/lib/company-context"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import QuotationForm from "@/components/quotations/quotation-form"
import RoutePlanner from "@/components/quotations/route-planner"
import { Edit } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"

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

  // Verificar permisos de acceso basado en departamento y rol
  const hasAccess =
    user &&
    (user.role === "admin" ||
      user.role === "supervisor" ||
      (user.departments?.name &&
        ["ventas", "administración", "operaciones"].some((dept) =>
          user.departments.name.toLowerCase().includes(dept.toLowerCase()),
        )))

  useEffect(() => {
    if (hasAccess && selectedCompany) {
      fetchQuotations()
      fetchStats()
    }
  }, [selectedCompany, hasAccess])

  const fetchQuotations = async () => {
    if (!selectedCompany) return

    try {
      const { data, error } = await supabase
        .from("quotations")
        .select(`
          *,
          profiles!quotations_created_by_fkey (full_name)
        `)
        .eq("company_id", selectedCompany.id)
        .order("quotation_date", { ascending: false })

      if (error) throw error
      setQuotations(data || [])
    } catch (error: any) {
      console.error("Error fetching quotations:", error)
      toast.error("Error al cargar las cotizaciones")
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    if (!selectedCompany) return

    try {
      const { data, error } = await supabase
        .from("quotations")
        .select("status, offer_total_with_tax")
        .eq("company_id", selectedCompany.id)

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
      fetchQuotations()
      fetchStats()
    } catch (error: any) {
      console.error("Error updating status:", error)
      toast.error("Error al actualizar el estado")
    }
  }

  const handleRouteUpdated = () => {
    // Refrescar la cotización seleccionada para mostrar la nueva información de ruta
    if (selectedQuotation) {
      fetchQuotations()
      // Actualizar la cotización seleccionada con los nuevos datos
      supabase
        .from("quotations")
        .select("*")
        .eq("id", selectedQuotation.id)
        .single()
        .then(({ data }) => {
          if (data) {
            setSelectedQuotation(data)
          }
        })
    }
  }

  if (!hasAccess) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Acceso Restringido</h2>
              <p className="text-gray-600">
                Solo usuarios de los departamentos de Ventas, Administración y Operaciones, o usuarios con rol de
                Supervisor/Admin pueden acceder al módulo de cotizaciones.
                <br />
                Contacta al administrador si necesitas acceso.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Cotizaciones y Proformas</h1>
          <p className="text-gray-600">Gestiona y crea cotizaciones para tus clientes</p>
        </div>
        <Dialog open={showNewQuotationDialog} onOpenChange={setShowNewQuotationDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Cotización
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Crear Nueva Cotización</DialogTitle>
              <DialogDescription>Completa todos los campos para crear una nueva cotización</DialogDescription>
            </DialogHeader>
            <QuotationForm
              onSuccess={() => {
                setShowNewQuotationDialog(false)
                fetchQuotations()
                fetchStats()
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cotizaciones</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalQuotations}</div>
            <p className="text-xs text-muted-foreground">Cotizaciones creadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monto Cotizado</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              S/ {stats.totalQuotedAmount.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">Valor total cotizado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Promedio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              S/ {stats.averageQuotation.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">Promedio por cotización</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aprobadas</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.approvedQuotations}</div>
            <p className="text-xs text-muted-foreground">Cotizaciones aprobadas</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Cotizaciones</CardTitle>
          <CardDescription>Todas las cotizaciones registradas en el sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente, RUC, número de cotización o producto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          {/* Quotations Table */}
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>N° Cotización</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>RUC</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Total Ofertado</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Ruta</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuotations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={20} className="text-center py-8">
                      <div className="text-muted-foreground">
                        {searchTerm
                          ? "No se encontraron cotizaciones que coincidan con la búsqueda"
                          : "No hay cotizaciones registradas"}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredQuotations.map((quotation) => (
                    <TableRow key={quotation.id}>
                      <TableCell>{format(new Date(quotation.quotation_date), "dd/MM/yyyy", { locale: es })}</TableCell>
                      <TableCell className="font-medium text-blue-600">
                        {quotation.quotation_number || quotation.unique_code}
                      </TableCell>
                      <TableCell className="font-medium">{quotation.entity_name}</TableCell>
                      <TableCell>{quotation.entity_ruc}</TableCell>
                      <TableCell className="font-medium">{quotation.unique_code}</TableCell>
                      <TableCell className="max-w-xs truncate" title={quotation.product_description}>
                        {quotation.product_description}
                      </TableCell>
                      <TableCell>{quotation.quantity.toLocaleString()}</TableCell>
                      <TableCell className="font-medium">
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
                            <MapPin className="h-4 w-4 text-gray-400" />
                            <span className="text-xs text-gray-400">Sin ruta</span>
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
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingQuotation(quotation)
                              setNewStatus(quotation.status)
                              setShowEditStatusDialog(true)
                            }}
                          >
                            <Edit className="h-4 w-4" />
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar Estado de Cotización</DialogTitle>
            <DialogDescription>
              Actualiza el estado de la cotización:{" "}
              {editingQuotation?.quotation_number || editingQuotation?.unique_code}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Estado Actual</Label>
              <div className="mt-1">{editingQuotation && getStatusBadge(editingQuotation.status)}</div>
            </div>
            <div>
              <Label htmlFor="new_status">Nuevo Estado</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
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
            <Button variant="outline" onClick={() => setShowEditStatusDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={updateQuotationStatus}>Actualizar Estado</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Details Dialog with Tabs */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Detalles de Cotización</DialogTitle>
            <DialogDescription>
              Información completa de la cotización{" "}
              {selectedQuotation?.quotation_number || selectedQuotation?.unique_code}
            </DialogDescription>
          </DialogHeader>

          {selectedQuotation && (
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Detalles
                </TabsTrigger>
                <TabsTrigger value="route" className="flex items-center gap-2">
                  <Route className="h-4 w-4" />
                  Planificar Ruta
                </TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="max-h-[70vh] overflow-y-auto">
                <div className="space-y-6">
                  {/* Header Info */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Número</Label>
                      <p className="text-lg font-bold text-blue-600">
                        {selectedQuotation.quotation_number || selectedQuotation.unique_code}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Estado</Label>
                      <div className="mt-1">{getStatusBadge(selectedQuotation.status)}</div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Fecha</Label>
                      <p className="text-sm">
                        {format(new Date(selectedQuotation.quotation_date), "dd/MM/yyyy", { locale: es })}
                      </p>
                    </div>
                  </div>

                  {/* Client Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Información del Cliente</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Razón Social</Label>
                        <p className="text-sm font-medium">{selectedQuotation.entity_name}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">RUC</Label>
                        <p className="text-sm">{selectedQuotation.entity_ruc}</p>
                      </div>
                      <div className="md:col-span-2">
                        <Label className="text-sm font-medium text-gray-600">Lugar de Entrega</Label>
                        <p className="text-sm">{selectedQuotation.delivery_location}</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Product Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Información del Producto</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-gray-600">Descripción</Label>
                          <p className="text-sm">{selectedQuotation.product_description}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-600">Marca</Label>
                          <p className="text-sm">{selectedQuotation.product_brand || "No especificada"}</p>
                        </div>
                      </div>
                      {selectedQuotation.reference_image_url && (
                        <div>
                          <Label className="text-sm font-medium text-gray-600">Imagen Referencial</Label>
                          <div className="mt-2 w-full max-w-md">
                            <img
                              src={selectedQuotation.reference_image_url || "/placeholder.svg"}
                              alt={selectedQuotation.product_description}
                              className="w-full h-48 object-contain bg-gray-50 rounded-lg border"
                              onError={(e) => {
                                e.currentTarget.style.display = "none"
                              }}
                            />
                          </div>
                        </div>
                      )}
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Cantidad</Label>
                        <p className="text-lg font-bold">{selectedQuotation.quantity.toLocaleString()} unidades</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Pricing Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Información de Precios</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Concepto</TableHead>
                              <TableHead>Precio Unitario</TableHead>
                              <TableHead>Total</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell className="font-medium">Precio Plataforma</TableCell>
                              <TableCell>
                                S/{" "}
                                {selectedQuotation.platform_unit_price_with_tax.toLocaleString("es-PE", {
                                  minimumFractionDigits: 2,
                                })}
                              </TableCell>
                              <TableCell>
                                S/{" "}
                                {selectedQuotation.platform_total.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                              </TableCell>
                            </TableRow>

                            {selectedQuotation.supplier_unit_price_with_tax && (
                              <TableRow>
                                <TableCell className="font-medium">Precio Proveedor</TableCell>
                                <TableCell>
                                  S/{" "}
                                  {selectedQuotation.supplier_unit_price_with_tax.toLocaleString("es-PE", {
                                    minimumFractionDigits: 2,
                                  })}
                                </TableCell>
                                <TableCell>
                                  S/{" "}
                                  {selectedQuotation.supplier_total?.toLocaleString("es-PE", {
                                    minimumFractionDigits: 2,
                                  }) || "0.00"}
                                </TableCell>
                              </TableRow>
                            )}

                            {selectedQuotation.offer_unit_price_with_tax && (
                              <TableRow className="bg-blue-50">
                                <TableCell className="font-bold">Precio Oferta</TableCell>
                                <TableCell className="font-bold">
                                  S/{" "}
                                  {selectedQuotation.offer_unit_price_with_tax.toLocaleString("es-PE", {
                                    minimumFractionDigits: 2,
                                  })}
                                </TableCell>
                                <TableCell className="font-bold text-blue-600">
                                  S/{" "}
                                  {selectedQuotation.offer_total_with_tax?.toLocaleString("es-PE", {
                                    minimumFractionDigits: 2,
                                  }) || "0.00"}
                                </TableCell>
                              </TableRow>
                            )}

                            {selectedQuotation.final_unit_price_with_tax && (
                              <TableRow className="bg-green-50">
                                <TableCell className="font-bold">Precio Final</TableCell>
                                <TableCell className="font-bold">
                                  S/{" "}
                                  {selectedQuotation.final_unit_price_with_tax.toLocaleString("es-PE", {
                                    minimumFractionDigits: 2,
                                  })}
                                </TableCell>
                                <TableCell className="font-bold text-green-600">
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
                        <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                          <Label className="text-sm font-medium text-gray-600">Techo Presupuestal</Label>
                          <p className="text-lg font-bold text-yellow-700">
                            S/ {selectedQuotation.budget_ceiling.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Route Information (if exists) */}
                  {selectedQuotation.route_distance_km && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Route className="h-5 w-5 text-green-600" />
                          Información de Ruta
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
                            <Route className="h-10 w-10 text-blue-600" />
                            <div>
                              <p className="text-sm text-gray-600">Distancia Total</p>
                              <p className="text-xl font-bold text-blue-600">
                                {selectedQuotation.route_distance_km.toFixed(1)} km
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
                            <Clock className="h-10 w-10 text-green-600" />
                            <div>
                              <p className="text-sm text-gray-600">Duración Estimada</p>
                              <p className="text-xl font-bold text-green-600">
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
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Información Adicional</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Creado por</Label>
                        <p className="text-sm">{selectedQuotation.profiles?.full_name || "N/A"}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Fecha de Creación</Label>
                        <p className="text-sm">
                          {format(new Date(selectedQuotation.quotation_date), "dd/MM/yyyy HH:mm", { locale: es })}
                        </p>
                      </div>
                      {selectedQuotation.valid_until && (
                        <div>
                          <Label className="text-sm font-medium text-gray-600">Válida hasta</Label>
                          <p className="text-sm">
                            {format(new Date(selectedQuotation.valid_until), "dd/MM/yyyy", { locale: es })}
                          </p>
                        </div>
                      )}
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Estado Actual</Label>
                        <div className="mt-1">{getStatusBadge(selectedQuotation.status)}</div>
                      </div>
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
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              Cerrar
            </Button>
            <Button
              onClick={() => {
                setShowDetailsDialog(false)
                setEditingQuotation(selectedQuotation)
                setNewStatus(selectedQuotation?.status || "")
                setShowEditStatusDialog(true)
              }}
            >
              Cambiar Estado
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
