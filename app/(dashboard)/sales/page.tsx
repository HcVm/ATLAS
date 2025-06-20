"use client"

import { DialogTrigger } from "@/components/ui/dialog"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Plus, Search, FileText, DollarSign, TrendingUp, Package, Edit, Eye } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useCompany } from "@/lib/company-context"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import SaleForm from "@/components/sales/sale-form"
import SaleEditForm from "@/components/sales/sale-edit-form"
import SalesExportDialog from "@/components/sales/sales-export-dialog"
import { Label } from "@/components/ui/label"

interface Sale {
  id: string
  sale_number?: string
  sale_date: string
  entity_id: string
  entity_name: string
  entity_ruc: string
  entity_executing_unit: string | null
  quotation_code: string
  quantity: number
  product_id: string
  product_name: string
  total_sale: number
  payment_method: string
  delivery_date: string | null
  created_by: string
  profiles?: {
    full_name: string
  }
  sale_status: string
  exp_siaf?: string | null
  ocam?: string | null
  physical_order?: string | null
  project_meta?: string | null
  final_destination?: string | null
  warehouse_manager?: string | null
  delivery_term?: string | null
  observations?: string | null
  product_code?: string | null
  product_description?: string | null
  product_brand?: string | null
  unit_price_with_tax?: number | null
  created_at?: string | null
}

interface SalesStats {
  totalSales: number
  totalAmount: number
  averageTicket: number
  pendingDeliveries: number
}

export default function SalesPage() {
  const { user } = useAuth()
  const { selectedCompany } = useCompany()
  const [sales, setSales] = useState<Sale[]>([])
  const [stats, setStats] = useState<SalesStats>({
    totalSales: 0,
    totalAmount: 0,
    averageTicket: 0,
    pendingDeliveries: 0,
  })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [showNewSaleDialog, setShowNewSaleDialog] = useState(false)
  const [editingSale, setEditingSale] = useState<Sale | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)

  // Verificar permisos de acceso basado en departamento y rol
  const hasAccess =
    user &&
    (user.role === "admin" ||
      user.role === "supervisor" ||
      (user.departments?.name &&
        ["ventas", "administración", "operaciones"].includes(user.departments.name.toLowerCase())))

  useEffect(() => {
    if (hasAccess) {
      fetchSales()
      fetchStats()
    }
  }, [selectedCompany, hasAccess])

  const fetchSales = async () => {
    // Para administradores, requiere que haya una empresa seleccionada
    if (user?.role === "admin" && !selectedCompany) {
      console.log("Admin sin empresa seleccionada, no cargando ventas")
      setSales([])
      setLoading(false)
      return
    }

    // Para usuarios normales, usar su empresa asignada
    const companyId = user?.role === "admin" ? selectedCompany?.id : user?.company_id

    if (!companyId) {
      console.log("No hay empresa disponible para cargar ventas")
      setSales([])
      setLoading(false)
      return
    }

    try {
      console.log("Cargando ventas para empresa:", companyId)
      const { data, error } = await supabase
        .from("sales")
        .select(`
          id, sale_number, sale_date, entity_id, entity_name, entity_ruc, entity_executing_unit,
          quotation_code, exp_siaf, quantity, product_id, product_name, product_code,
          product_description, product_brand, ocam, physical_order,
          project_meta, final_destination, warehouse_manager, payment_method,
          unit_price_with_tax, total_sale, delivery_date, delivery_term,
          observations, sale_status, created_at,
          profiles!sales_created_by_fkey (full_name)
        `)
        .eq("company_id", companyId)
        .order("sale_date", { ascending: false })

      if (error) throw error
      console.log("Ventas cargadas:", data?.length || 0)
      setSales(data || [])
    } catch (error: any) {
      console.error("Error fetching sales:", error)
      toast.error("Error al cargar las ventas")
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    // Para administradores, requiere que haya una empresa seleccionada
    if (user?.role === "admin" && !selectedCompany) {
      setStats({
        totalSales: 0,
        totalAmount: 0,
        averageTicket: 0,
        pendingDeliveries: 0,
      })
      return
    }

    // Para usuarios normales, usar su empresa asignada
    const companyId = user?.role === "admin" ? selectedCompany?.id : user?.company_id

    if (!companyId) {
      setStats({
        totalSales: 0,
        totalAmount: 0,
        averageTicket: 0,
        pendingDeliveries: 0,
      })
      return
    }

    try {
      const { data, error } = await supabase
        .from("sales")
        .select("total_sale, delivery_date")
        .eq("company_id", companyId)

      if (error) throw error

      const totalSales = data?.length || 0
      const totalAmount = data?.reduce((sum, sale) => sum + (sale.total_sale || 0), 0) || 0
      const averageTicket = totalSales > 0 ? totalAmount / totalSales : 0
      const pendingDeliveries =
        data?.filter((sale) => sale.delivery_date && new Date(sale.delivery_date) > new Date()).length || 0

      setStats({
        totalSales,
        totalAmount,
        averageTicket,
        pendingDeliveries,
      })
    } catch (error: any) {
      console.error("Error fetching stats:", error)
    }
  }

  const handleEditSale = (sale: Sale) => {
    setEditingSale(sale)
    setShowEditDialog(true)
  }

  const handleEditSuccess = () => {
    setShowEditDialog(false)
    setEditingSale(null)
    fetchSales()
    fetchStats()
  }

  const handleViewDetails = (sale: Sale) => {
    setSelectedSale(sale)
    setShowDetailsDialog(true)
  }

  const filteredSales = sales.filter(
    (sale) =>
      sale.entity_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.quotation_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.entity_ruc.includes(searchTerm) ||
      (sale.sale_number && sale.sale_number.toLowerCase().includes(searchTerm.toLowerCase())),
  )

  if (!hasAccess) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Acceso Restringido</h2>
              <p className="text-gray-600">
                Solo usuarios de los departamentos de Ventas, Administración y Operaciones, o usuarios con rol de
                Supervisor/Admin pueden acceder al módulo de ventas.
                <br />
                Contacta al administrador si necesitas acceso.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Mensaje para administradores sin empresa seleccionada
  if (user?.role === "admin" && !selectedCompany) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Selecciona una Empresa</h2>
              <p className="text-gray-600">
                Para ver las ventas, selecciona una empresa específica usando el selector en la parte superior.
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
          <h1 className="text-3xl font-bold text-gray-900">Módulo de Ventas</h1>
          <p className="text-gray-600">
            Gestiona y registra todas las ventas de la empresa
            {selectedCompany && <span className="ml-2 text-blue-600 font-medium">- {selectedCompany.name}</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <SalesExportDialog onExport={() => toast.success("Exportación completada")} />
          <Dialog open={showNewSaleDialog} onOpenChange={setShowNewSaleDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nueva Venta
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Registrar Nueva Venta</DialogTitle>
                <DialogDescription>Completa todos los campos para registrar una nueva venta</DialogDescription>
              </DialogHeader>
              <SaleForm
                onSuccess={() => {
                  setShowNewSaleDialog(false)
                  fetchSales()
                  fetchStats()
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Ventas</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSales}</div>
            <p className="text-xs text-muted-foreground">Ventas registradas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monto Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              S/ {stats.totalAmount.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">Valor total de ventas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Promedio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              S/ {stats.averageTicket.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">Promedio por venta</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entregas Pendientes</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingDeliveries}</div>
            <p className="text-xs text-muted-foreground">Por entregar</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Ventas</CardTitle>
          <CardDescription>Todas las ventas registradas en el sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente, RUC, cotización, producto o número de venta..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          {/* Sales Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N° Venta</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>RUC</TableHead>
                  <TableHead>N° Cotización</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      <div className="text-muted-foreground">
                        {searchTerm
                          ? "No se encontraron ventas que coincidan con la búsqueda"
                          : "No hay ventas registradas"}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell className="font-medium">{sale.sale_number || "N/A"}</TableCell>
                      <TableCell>{format(new Date(sale.sale_date), "dd/MM/yyyy", { locale: es })}</TableCell>
                      <TableCell className="font-medium">{sale.entity_name}</TableCell>
                      <TableCell>{sale.entity_ruc}</TableCell>
                      <TableCell className="font-medium">{sale.quotation_code}</TableCell>
                      <TableCell className="max-w-xs truncate" title={sale.product_name}>
                        {sale.product_name}
                      </TableCell>
                      <TableCell>{sale.quantity.toLocaleString()}</TableCell>
                      <TableCell className="font-medium">
                        S/ {sale.total_sale.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            sale.sale_status === "conformidad"
                              ? "default"
                              : sale.sale_status === "devengado"
                                ? "secondary"
                                : sale.sale_status === "girado"
                                  ? "destructive"
                                  : "outline"
                          }
                        >
                          {sale.sale_status?.toUpperCase() || "PENDIENTE"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleViewDetails(sale)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleEditSale(sale)}>
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

      {/* Edit Sale Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Venta</DialogTitle>
            <DialogDescription>Modifica los datos de la venta seleccionada</DialogDescription>
          </DialogHeader>
          {editingSale && (
            <SaleEditForm sale={editingSale} onSuccess={handleEditSuccess} onCancel={() => setShowEditDialog(false)} />
          )}
        </DialogContent>
      </Dialog>

      {/* Sale Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={() => setShowDetailsDialog(false)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles de la Venta</DialogTitle>
            <DialogDescription>Información completa de la venta seleccionada</DialogDescription>
          </DialogHeader>
          {selectedSale && (
            <div className="space-y-6">
              {/* Header con información clave */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Venta #{selectedSale.sale_number || "N/A"}</h3>
                    <p className="text-gray-600">
                      {format(new Date(selectedSale.sale_date), "dd 'de' MMMM 'de' yyyy", { locale: es })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Total de la Venta</p>
                    <p className="text-3xl font-bold text-green-600">
                      S/ {selectedSale.total_sale.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Badge
                    variant={
                      selectedSale.sale_status === "conformidad"
                        ? "default"
                        : selectedSale.sale_status === "devengado"
                          ? "secondary"
                          : selectedSale.sale_status === "girado"
                            ? "destructive"
                            : "outline"
                    }
                    className="text-sm px-3 py-1"
                  >
                    {selectedSale.sale_status?.toUpperCase() || "PENDIENTE"}
                  </Badge>
                  <span className="text-sm text-gray-600">Vendedor: {selectedSale.profiles?.full_name || "N/A"}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Información del Cliente */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      Cliente
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Razón Social</Label>
                      <p className="text-sm font-semibold text-gray-900">{selectedSale.entity_name}</p>
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">RUC</Label>
                      <p className="text-sm text-gray-700">{selectedSale.entity_ruc}</p>
                    </div>
                    {selectedSale.entity_executing_unit && (
                      <div>
                        <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Unidad Ejecutora
                        </Label>
                        <Badge variant="outline" className="text-xs">
                          {selectedSale.entity_executing_unit}
                        </Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Información del Producto */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      Producto
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Nombre</Label>
                      <p className="text-sm font-semibold text-gray-900">{selectedSale.product_name}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Código</Label>
                        <p className="text-sm text-gray-700">{selectedSale.product_code || "N/A"}</p>
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Marca</Label>
                        <p className="text-sm text-gray-700">{selectedSale.product_brand || "N/A"}</p>
                      </div>
                    </div>
                    {selectedSale.product_description && (
                      <div>
                        <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Descripción</Label>
                        <p className="text-sm text-gray-700">{selectedSale.product_description}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Información Financiera */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <DollarSign className="w-5 h-5 text-green-600" />
                    Información Financiera
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Cantidad</p>
                      <p className="text-2xl font-bold text-blue-600">{selectedSale.quantity.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">unidades</p>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Precio Unitario</p>
                      <p className="text-2xl font-bold text-purple-600">
                        S/{" "}
                        {selectedSale.unit_price_with_tax?.toLocaleString("es-PE", { minimumFractionDigits: 2 }) ||
                          "N/A"}
                      </p>
                      <p className="text-xs text-gray-500">con IGV</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Total</p>
                      <p className="text-2xl font-bold text-green-600">
                        S/ {selectedSale.total_sale.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-gray-500">monto final</p>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600">Método de Pago:</span>
                      <Badge variant={selectedSale.payment_method === "CONTADO" ? "default" : "secondary"}>
                        {selectedSale.payment_method}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Información de Entrega y Documentos */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Package className="w-5 h-5 text-orange-600" />
                      Entrega
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Fecha de Entrega
                      </Label>
                      <p className="text-sm text-gray-700">
                        {selectedSale.delivery_date
                          ? format(new Date(selectedSale.delivery_date), "dd/MM/yyyy", { locale: es })
                          : "No especificada"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Término de Entrega
                      </Label>
                      <p className="text-sm text-gray-700">{selectedSale.delivery_term || "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Destino Final</Label>
                      <p className="text-sm text-gray-700">{selectedSale.final_destination || "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Almacenero</Label>
                      <p className="text-sm text-gray-700">{selectedSale.warehouse_manager || "N/A"}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <FileText className="w-5 h-5 text-indigo-600" />
                      Documentos
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">N° Cotización</Label>
                      <p className="text-sm font-semibold text-indigo-600">{selectedSale.quotation_code}</p>
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Exp SIAF</Label>
                      <p className="text-sm text-gray-700">{selectedSale.exp_siaf || "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">OCAM</Label>
                      <p className="text-sm text-gray-700">{selectedSale.ocam || "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Orden Física</Label>
                      <p className="text-sm text-gray-700">{selectedSale.physical_order || "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Meta Proyecto</Label>
                      <p className="text-sm text-gray-700">{selectedSale.project_meta || "N/A"}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Observaciones */}
              {selectedSale.observations && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      Observaciones
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-700 bg-yellow-50 p-3 rounded-lg border-l-4 border-yellow-400">
                      {selectedSale.observations}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
