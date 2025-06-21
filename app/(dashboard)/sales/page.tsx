"use client"

import { DialogTrigger } from "@/components/ui/dialog"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Plus, Search, FileText, DollarSign, TrendingUp, Package, Edit, Eye, AlertTriangle } from "lucide-react"
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

  // Check if user has sales access - igual que warehouse
  const hasSalesAccess =
    user?.role === "admin" ||
    user?.role === "supervisor" ||
    user?.departments?.name === "Ventas" ||
    user?.departments?.name === "Administración" ||
    user?.departments?.name === "Operaciones"

  // Get the company to use - igual que warehouse
  const companyToUse = user?.role === "admin" ? selectedCompany : user?.company_id ? { id: user.company_id } : null

  useEffect(() => {
    // Check if user has sales access - igual que warehouse
    const hasSalesAccess =
      user?.role === "admin" ||
      user?.role === "supervisor" ||
      user?.departments?.name === "Ventas" ||
      user?.departments?.name === "Administración" ||
      user?.departments?.name === "Operaciones"

    // For admin users, use selectedCompany; for others, use their assigned company
    const companyId = user?.role === "admin" ? selectedCompany?.id : user?.company_id

    if (companyId && hasSalesAccess) {
      fetchSales(companyId)
      fetchStats(companyId)
    } else {
      setLoading(false)
    }
  }, [user, selectedCompany])

  const fetchSales = async (companyId: string) => {
    try {
      setLoading(true)
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

      if (error) {
        console.error("Sales error:", error)
        throw error
      }

      console.log("Ventas cargadas:", data?.length || 0)
      setSales(data || [])
    } catch (error: any) {
      console.error("Error fetching sales:", error)
      toast.error("Error al cargar las ventas: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async (companyId: string) => {
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
    fetchSales(companyToUse?.id || "")
    fetchStats(companyToUse?.id || "")
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

  if (!hasSalesAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-700 via-slate-600 to-slate-500 bg-clip-text text-transparent">
                Ventas
              </h1>
              <p className="text-slate-500 dark:text-slate-400">Gestión de ventas</p>
            </div>
          </div>
          <Card className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-700/50 border-slate-200 dark:border-slate-700 shadow-lg">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-600 dark:to-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="h-8 w-8 text-slate-600 dark:text-slate-300" />
                </div>
                <p className="text-slate-600 dark:text-slate-300">No tienes permisos para acceder a las ventas.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!companyToUse) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-700 via-slate-600 to-slate-500 bg-clip-text text-transparent">
                Ventas
              </h1>
              <p className="text-slate-500 dark:text-slate-400">Gestión de ventas</p>
            </div>
          </div>
          <Card className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-700/50 border-slate-200 dark:border-slate-700 shadow-lg">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-600 dark:to-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Package className="h-8 w-8 text-slate-600 dark:text-slate-300" />
                </div>
                <p className="text-slate-600 dark:text-slate-300">
                  {user?.role === "admin"
                    ? "Selecciona una empresa para ver sus ventas."
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-6">
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-6">
      <div className="container mx-auto py-8 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-700 via-slate-600 to-slate-500 bg-clip-text text-transparent">
              Módulo de Ventas
            </h1>
            <p className="text-slate-600 dark:text-slate-300">
              Gestiona y registra todas las ventas de la empresa
              {selectedCompany && (
                <span className="ml-2 text-slate-700 dark:text-slate-200 font-medium">- {selectedCompany.name}</span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <SalesExportDialog onExport={() => toast.success("Exportación completada")} />
            <Dialog open={showNewSaleDialog} onOpenChange={setShowNewSaleDialog}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white shadow-lg">
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Venta
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-700/50">
                <DialogHeader>
                  <DialogTitle className="text-slate-800 dark:text-slate-100">Registrar Nueva Venta</DialogTitle>
                  <DialogDescription className="text-slate-600 dark:text-slate-300">
                    Completa todos los campos para registrar una nueva venta
                  </DialogDescription>
                </DialogHeader>
                <SaleForm
                  onSuccess={() => {
                    setShowNewSaleDialog(false)
                    fetchSales(companyToUse?.id || "")
                    fetchStats(companyToUse?.id || "")
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-700/50 border-slate-200 dark:border-slate-700 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-200">Total Ventas</CardTitle>
              <div className="w-8 h-8 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-600 dark:to-slate-700 rounded-lg flex items-center justify-center">
                <FileText className="h-4 w-4 text-slate-600 dark:text-slate-300" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stats.totalSales}</div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Ventas registradas</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-700/50 border-slate-200 dark:border-slate-700 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-200">Monto Total</CardTitle>
              <div className="w-8 h-8 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-600 dark:to-slate-700 rounded-lg flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-slate-600 dark:text-slate-300" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                S/ {stats.totalAmount.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Valor total de ventas</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-700/50 border-slate-200 dark:border-slate-700 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-200">Ticket Promedio</CardTitle>
              <div className="w-8 h-8 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-600 dark:to-slate-700 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-slate-600 dark:text-slate-300" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                S/ {stats.averageTicket.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Promedio por venta</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-700/50 border-slate-200 dark:border-slate-700 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Entregas Pendientes
              </CardTitle>
              <div className="w-8 h-8 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-600 dark:to-slate-700 rounded-lg flex items-center justify-center">
                <Package className="h-4 w-4 text-slate-600 dark:text-slate-300" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stats.pendingDeliveries}</div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Por entregar</p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-700/50 border-slate-200 dark:border-slate-700 shadow-lg">
          <CardHeader>
            <CardTitle className="text-slate-800 dark:text-slate-100">Historial de Ventas</CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-300">
              Todas las ventas registradas en el sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar por cliente, RUC, cotización, producto o número de venta..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 border-slate-200 dark:border-slate-700 focus:border-slate-400"
                />
              </div>
            </div>

            {/* Sales Table */}
            <div className="rounded-md border border-slate-200 dark:border-slate-700">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-slate-50 to-slate-100/50">
                    <TableHead className="text-slate-700 dark:text-slate-200">N° Venta</TableHead>
                    <TableHead className="text-slate-700 dark:text-slate-200">Fecha</TableHead>
                    <TableHead className="text-slate-700 dark:text-slate-200">Cliente</TableHead>
                    <TableHead className="text-slate-700 dark:text-slate-200">RUC</TableHead>
                    <TableHead className="text-slate-700 dark:text-slate-200">N° Cotización</TableHead>
                    <TableHead className="text-slate-700 dark:text-slate-200">Producto</TableHead>
                    <TableHead className="text-slate-700 dark:text-slate-200">Cantidad</TableHead>
                    <TableHead className="text-slate-700 dark:text-slate-200">Total</TableHead>
                    <TableHead className="text-slate-700 dark:text-slate-200">Estado</TableHead>
                    <TableHead className="text-slate-700 dark:text-slate-200">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSales.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8">
                        <div className="text-slate-500 dark:text-slate-400">
                          {searchTerm
                            ? "No se encontraron ventas que coincidan con la búsqueda"
                            : "No hay ventas registradas"}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSales.map((sale) => (
                      <TableRow
                        key={sale.id}
                        className="hover:bg-gradient-to-r hover:from-slate-50/50 hover:to-slate-100/50 dark:hover:from-slate-700/50 dark:hover:to-slate-600/50"
                      >
                        <TableCell className="font-medium text-slate-700 dark:text-slate-200">
                          {sale.sale_number || "N/A"}
                        </TableCell>
                        <TableCell className="text-slate-600 dark:text-slate-300">
                          {format(new Date(sale.sale_date), "dd/MM/yyyy", { locale: es })}
                        </TableCell>
                        <TableCell className="font-medium text-slate-700 dark:text-slate-200">
                          {sale.entity_name}
                        </TableCell>
                        <TableCell className="text-slate-600 dark:text-slate-300">{sale.entity_ruc}</TableCell>
                        <TableCell className="font-medium text-slate-700 dark:text-slate-200">
                          {sale.quotation_code}
                        </TableCell>
                        <TableCell
                          className="max-w-xs truncate text-slate-600 dark:text-slate-300"
                          title={sale.product_name}
                        >
                          {sale.product_name}
                        </TableCell>
                        <TableCell className="text-slate-600 dark:text-slate-300">
                          {sale.quantity.toLocaleString()}
                        </TableCell>
                        <TableCell className="font-medium text-slate-700 dark:text-slate-200">
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
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDetails(sale)}
                              className="hover:bg-slate-100 dark:hover:bg-slate-700"
                            >
                              <Eye className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditSale(sale)}
                              className="hover:bg-slate-100 dark:hover:bg-slate-700"
                            >
                              <Edit className="h-4 w-4 text-slate-600 dark:text-slate-300" />
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
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-700/50">
            <DialogHeader>
              <DialogTitle className="text-slate-800 dark:text-slate-100">Editar Venta</DialogTitle>
              <DialogDescription className="text-slate-600 dark:text-slate-300">
                Modifica los datos de la venta seleccionada
              </DialogDescription>
            </DialogHeader>
            {editingSale && (
              <SaleEditForm
                sale={editingSale}
                onSuccess={handleEditSuccess}
                onCancel={() => setShowEditDialog(false)}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Sale Details Dialog */}
        <Dialog open={showDetailsDialog} onOpenChange={() => setShowDetailsDialog(false)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-700/50">
            <DialogHeader>
              <DialogTitle className="text-slate-800 dark:text-slate-100">Detalles de la Venta</DialogTitle>
              <DialogDescription className="text-slate-600 dark:text-slate-300">
                Información completa de la venta seleccionada
              </DialogDescription>
            </DialogHeader>
            {selectedSale && (
              <div className="space-y-6">
                {/* Header con información clave */}
                <div className="bg-gradient-to-r from-slate-50 to-slate-100/50 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                        Venta #{selectedSale.sale_number || "N/A"}
                      </h3>
                      <p className="text-slate-600 dark:text-slate-300">
                        {format(new Date(selectedSale.sale_date), "dd 'de' MMMM 'de' yyyy", { locale: es })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-600 dark:text-slate-300">Total de la Venta</p>
                      <p className="text-3xl font-bold text-slate-700 dark:text-slate-200">
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
                    <span className="text-sm text-slate-600 dark:text-slate-300">
                      Vendedor: {selectedSale.profiles?.full_name || "N/A"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Información del Cliente */}
                  <Card className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-700/50 border-slate-200 dark:border-slate-700">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg text-slate-800 dark:text-slate-100">
                        <div className="w-2 h-2 bg-slate-500 rounded-full"></div>
                        Cliente
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                          Razón Social
                        </Label>
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                          {selectedSale.entity_name}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                          RUC
                        </Label>
                        <p className="text-sm text-slate-700 dark:text-slate-200">{selectedSale.entity_ruc}</p>
                      </div>
                      {selectedSale.entity_executing_unit && (
                        <div>
                          <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                            Unidad Ejecutora
                          </Label>
                          <Badge
                            variant="outline"
                            className="text-xs border-slate-300 text-slate-600 dark:text-slate-300"
                          >
                            {selectedSale.entity_executing_unit}
                          </Badge>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Información del Producto */}
                  <Card className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-700/50 border-slate-200 dark:border-slate-700">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg text-slate-800 dark:text-slate-100">
                        <div className="w-2 h-2 bg-slate-500 rounded-full"></div>
                        Producto
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                          Nombre
                        </Label>
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                          {selectedSale.product_name}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                            Código
                          </Label>
                          <p className="text-sm text-slate-700 dark:text-slate-200">
                            {selectedSale.product_code || "N/A"}
                          </p>
                        </div>
                        <div>
                          <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                            Marca
                          </Label>
                          <p className="text-sm text-slate-700 dark:text-slate-200">
                            {selectedSale.product_brand || "N/A"}
                          </p>
                        </div>
                      </div>
                      {selectedSale.product_description && (
                        <div>
                          <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                            Descripción
                          </Label>
                          <p className="text-sm text-slate-700 dark:text-slate-200">
                            {selectedSale.product_description}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Información Financiera */}
                <Card className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-700/50 border-slate-200 dark:border-slate-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg text-slate-800 dark:text-slate-100">
                      <DollarSign className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                      Información Financiera
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="text-center p-4 bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-lg border border-slate-200 dark:border-slate-700">
                        <p className="text-sm text-slate-600 dark:text-slate-300 mb-1">Cantidad</p>
                        <p className="text-2xl font-bold text-slate-700 dark:text-slate-200">
                          {selectedSale.quantity.toLocaleString()}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">unidades</p>
                      </div>
                      <div className="text-center p-4 bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-lg border border-slate-200 dark:border-slate-700">
                        <p className="text-sm text-slate-600 dark:text-slate-300 mb-1">Precio Unitario</p>
                        <p className="text-2xl font-bold text-slate-700 dark:text-slate-200">
                          S/{" "}
                          {selectedSale.unit_price_with_tax?.toLocaleString("es-PE", { minimumFractionDigits: 2 }) ||
                            "N/A"}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">con IGV</p>
                      </div>
                      <div className="text-center p-4 bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-lg border border-slate-200 dark:border-slate-700">
                        <p className="text-sm text-slate-600 dark:text-slate-300 mb-1">Total</p>
                        <p className="text-2xl font-bold text-slate-700 dark:text-slate-200">
                          S/ {selectedSale.total_sale.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">monto final</p>
                      </div>
                    </div>
                    <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Método de Pago:</span>
                        <Badge variant={selectedSale.payment_method === "CONTADO" ? "default" : "secondary"}>
                          {selectedSale.payment_method}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Información de Entrega y Documentos */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-700/50 border-slate-200 dark:border-slate-700">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg text-slate-800 dark:text-slate-100">
                        <Package className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                        Entrega
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                          Fecha de Entrega
                        </Label>
                        <p className="text-sm text-slate-700 dark:text-slate-200">
                          {selectedSale.delivery_date
                            ? format(new Date(selectedSale.delivery_date), "dd/MM/yyyy", { locale: es })
                            : "No especificada"}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                          Término de Entrega
                        </Label>
                        <p className="text-sm text-slate-700 dark:text-slate-200">
                          {selectedSale.delivery_term || "N/A"}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                          Destino Final
                        </Label>
                        <p className="text-sm text-slate-700 dark:text-slate-200">
                          {selectedSale.final_destination || "N/A"}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                          Almacenero
                        </Label>
                        <p className="text-sm text-slate-700 dark:text-slate-200">
                          {selectedSale.warehouse_manager || "N/A"}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-700/50 border-slate-200 dark:border-slate-700">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg text-slate-800 dark:text-slate-100">
                        <FileText className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                        Documentos
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                          N° Cotización
                        </Label>
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                          {selectedSale.quotation_code}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                          Exp SIAF
                        </Label>
                        <p className="text-sm text-slate-700 dark:text-slate-200">{selectedSale.exp_siaf || "N/A"}</p>
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                          OCAM
                        </Label>
                        <p className="text-sm text-slate-700 dark:text-slate-200">{selectedSale.ocam || "N/A"}</p>
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                          Orden Física
                        </Label>
                        <p className="text-sm text-slate-700 dark:text-slate-200">
                          {selectedSale.physical_order || "N/A"}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                          Meta Proyecto
                        </Label>
                        <p className="text-sm text-slate-700 dark:text-slate-200">
                          {selectedSale.project_meta || "N/A"}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Observaciones */}
                {selectedSale.observations && (
                  <Card className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-700/50 border-slate-200 dark:border-slate-700">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg text-slate-800 dark:text-slate-100">
                        <div className="w-2 h-2 bg-slate-500 rounded-full"></div>
                        Observaciones
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-slate-700 dark:text-slate-200 bg-slate-50 rounded-lg border-l-4 border-slate-400 p-3">
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
    </div>
  )
}
