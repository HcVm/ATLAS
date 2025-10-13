"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Package,
  Search,
  Barcode,
  Hash,
  Calendar,
  TrendingUp,
  Download,
  ChevronDown,
  ChevronUp,
  ShoppingCart,
  Box,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { useCompany } from "@/lib/company-context"
import { useToast } from "@/hooks/use-toast"
import * as XLSX from "xlsx"
import { updateLotStatus as updateLotStatusWithMovement } from "@/lib/lot-serial-generator"

interface ProductLot {
  id: string
  lot_number: string
  product_id: string
  sale_id: string | null
  quantity: number
  status: "pending" | "in_inventory" | "delivered"
  generated_date: string
  ingress_date: string | null
  delivery_date: string | null
  products?: {
    name: string
    code: string
  }
  sales?: {
    sale_number: string
  }
  product_serials?: Array<{
    id: string
    serial_number: string
    status: string
  }>
}

export default function LotsAndSerialsPage() {
  const { user } = useAuth()
  const { selectedCompany } = useCompany()
  const { toast } = useToast()
  const [lots, setLots] = useState<ProductLot[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [expandedLot, setExpandedLot] = useState<string | null>(null)

  useEffect(() => {
    const companyId = user?.role === "admin" ? selectedCompany?.id : user?.company_id

    if (companyId) {
      fetchLots(companyId)
    }
  }, [user, selectedCompany])

  const fetchLots = async (companyId: string) => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from("product_lots")
        .select(`
          id,
          lot_number,
          product_id,
          sale_id,
          quantity,
          status,
          generated_date,
          ingress_date,
          delivery_date,
          products (name, code),
          sales (sale_number),
          product_serials (id, serial_number, status)
        `)
        .eq("company_id", companyId)
        .order("generated_date", { ascending: false })

      if (error) {
        console.error("Error fetching lots:", error)
        throw error
      }

      setLots(data || [])
    } catch (error) {
      console.error("Error fetching lots:", error)
      toast({
        title: "Error",
        description: "Error al cargar los lotes",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const updateLotStatus = async (lotId: string, newStatus: "pending" | "in_inventory" | "delivered") => {
    try {
      const companyId = user?.role === "admin" ? selectedCompany?.id : user?.company_id

      if (!companyId) {
        throw new Error("No company ID available")
      }

      await updateLotStatusWithMovement(lotId, newStatus, companyId)

      toast({
        title: "Éxito",
        description: "Estado del lote actualizado y movimiento creado correctamente",
      })

      fetchLots(companyId)
    } catch (error) {
      console.error("Error updating lot status:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al actualizar el estado del lote",
        variant: "destructive",
      })
    }
  }

  const filteredLots = lots.filter((lot) => {
    const matchesSearch =
      lot.lot_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lot.products?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lot.products?.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lot.sales?.sale_number?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" || lot.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-300">
            Pendiente
          </Badge>
        )
      case "in_inventory":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 border-green-300">
            En Inventario
          </Badge>
        )
      case "delivered":
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
            Entregado
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-"
    return new Date(dateString).toLocaleDateString("es-PE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const exportToExcel = () => {
    const dataToExport = filteredLots.flatMap(
      (lot) =>
        lot.product_serials?.map((serial) => ({
          "Número de Lote": lot.lot_number,
          Producto: lot.products?.name || "N/A",
          "Código Producto": lot.products?.code || "N/A",
          "Número de Serie": serial.serial_number,
          Estado:
            lot.status === "pending" ? "Pendiente" : lot.status === "in_inventory" ? "En Inventario" : "Entregado",
          "Fecha Generación": formatDate(lot.generated_date),
          "Fecha Ingreso": formatDate(lot.ingress_date),
          "Fecha Entrega": formatDate(lot.delivery_date),
          "Venta Asociada": lot.sales?.sale_number || "N/A",
        })) || [],
    )

    const ws = XLSX.utils.json_to_sheet(dataToExport)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Lotes y Series")

    const fileName = `lotes_series_${new Date().toISOString().split("T")[0]}.xlsx`
    XLSX.writeFile(wb, fileName)

    toast({
      title: "Exportación exitosa",
      description: `Se exportaron ${dataToExport.length} registros a Excel.`,
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="space-y-6 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground via-foreground/80 to-foreground/60 bg-clip-text text-transparent">
                Lotes y Números de Serie
              </h1>
              <p className="text-muted-foreground">Gestión de trazabilidad de productos</p>
            </div>
          </div>
          <Card className="bg-card border-border shadow-lg">
            <CardContent className="p-6">
              <div className="text-center text-muted-foreground">Cargando lotes...</div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-foreground via-foreground/80 to-foreground/60 bg-clip-text text-transparent">
              Lotes y Números de Serie
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Sistema de trazabilidad completa de productos</p>
          </div>
        </div>

        <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-4">
          <Card className="bg-card border-border shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium">Total Lotes</CardTitle>
              <Package className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              <div className="text-xl sm:text-2xl font-bold">{lots.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium">Pendientes</CardTitle>
              <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-600" />
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              <div className="text-xl sm:text-2xl font-bold text-yellow-600">
                {lots.filter((l) => l.status === "pending").length}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium">En Inventario</CardTitle>
              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              <div className="text-xl sm:text-2xl font-bold text-green-600">
                {lots.filter((l) => l.status === "in_inventory").length}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium">Total Series</CardTitle>
              <Hash className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              <div className="text-xl sm:text-2xl font-bold">
                {lots.reduce((sum, lot) => sum + (lot.product_serials?.length || 0), 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-card border-border shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground text-base sm:text-lg">
              <Barcode className="h-4 w-4 sm:h-5 sm:w-5" />
              Gestión de Lotes y Series
            </CardTitle>
            <CardDescription className="text-muted-foreground text-xs sm:text-sm">
              {filteredLots.length} de {lots.length} lotes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-3 w-3 sm:h-4 sm:w-4" />
                    <Input
                      placeholder="Buscar por lote, producto, serie..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 sm:pl-10 border-border focus:border-ring focus:ring-ring text-xs sm:text-sm"
                    />
                  </div>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-48 border-border focus:border-ring focus:ring-ring text-xs sm:text-sm">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="pending">Pendientes</SelectItem>
                    <SelectItem value="in_inventory">En Inventario</SelectItem>
                    <SelectItem value="delivered">Entregados</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={exportToExcel}
                  disabled={filteredLots.length === 0}
                  className="border-border text-foreground hover:bg-accent bg-transparent text-xs sm:text-sm"
                  size="sm"
                >
                  <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                  Exportar
                </Button>
              </div>

              <div className="lg:hidden space-y-3">
                {filteredLots.length > 0 ? (
                  filteredLots.map((lot) => (
                    <Card key={lot.id} className="border-2">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Barcode className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="font-mono font-bold text-sm truncate">{lot.lot_number}</span>
                            </div>
                            {getStatusBadge(lot.status)}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpandedLot(expandedLot === lot.id ? null : lot.id)}
                            className="h-8 w-8 p-0 flex-shrink-0"
                          >
                            {expandedLot === lot.id ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-start gap-2">
                          <Box className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{lot.products?.name || "N/A"}</p>
                            <p className="text-xs text-muted-foreground font-mono">{lot.products?.code}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-2 border-t">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <Badge variant="outline" className="text-xs">
                              {lot.quantity} unidades
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <Hash className="h-4 w-4 text-muted-foreground" />
                            <Badge variant="secondary" className="text-xs">
                              {lot.product_serials?.length || 0} series
                            </Badge>
                          </div>
                        </div>

                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>Generado: {formatDate(lot.generated_date)}</span>
                          </div>
                          {lot.ingress_date && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <TrendingUp className="h-3 w-3" />
                              <span>Ingreso: {formatDate(lot.ingress_date)}</span>
                            </div>
                          )}
                          {lot.sales?.sale_number && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <ShoppingCart className="h-3 w-3" />
                              <span>Venta: {lot.sales.sale_number}</span>
                            </div>
                          )}
                        </div>

                        {expandedLot === lot.id && lot.product_serials && lot.product_serials.length > 0 && (
                          <div className="pt-3 border-t space-y-2">
                            <div className="flex items-center gap-2 text-sm font-medium">
                              <Hash className="h-4 w-4" />
                              Números de Serie ({lot.product_serials.length})
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                              {lot.product_serials.map((serial) => (
                                <div
                                  key={serial.id}
                                  className="p-2 bg-muted rounded border font-mono text-xs truncate"
                                  title={serial.serial_number}
                                >
                                  {serial.serial_number}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex gap-2 pt-2 border-t">
                          {lot.status === "pending" && (
                            <Button
                              size="sm"
                              onClick={() => updateLotStatus(lot.id, "in_inventory")}
                              className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs"
                            >
                              Ingresar
                            </Button>
                          )}
                          {lot.status === "in_inventory" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateLotStatus(lot.id, "delivered")}
                              className="flex-1 border-blue-300 text-blue-700 hover:bg-blue-50 text-xs"
                            >
                              Entregar
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card>
                    <CardContent className="text-center py-8">
                      <div className="text-muted-foreground text-sm">
                        {lots.length === 0
                          ? "No hay lotes registrados"
                          : "No se encontraron lotes con los filtros aplicados"}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Desktop table layout */}
              <div className="hidden lg:block rounded-md border border-border bg-card overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 border-border">
                      <TableHead className="text-foreground font-semibold text-xs sm:text-sm whitespace-nowrap">
                        Número de Lote
                      </TableHead>
                      <TableHead className="text-foreground font-semibold text-xs sm:text-sm whitespace-nowrap">
                        Producto
                      </TableHead>
                      <TableHead className="text-foreground font-semibold text-xs sm:text-sm whitespace-nowrap">
                        Cantidad
                      </TableHead>
                      <TableHead className="text-foreground font-semibold text-xs sm:text-sm whitespace-nowrap">
                        Estado
                      </TableHead>
                      <TableHead className="text-foreground font-semibold text-xs sm:text-sm whitespace-nowrap hidden md:table-cell">
                        Fecha Generación
                      </TableHead>
                      <TableHead className="text-foreground font-semibold text-xs sm:text-sm whitespace-nowrap hidden lg:table-cell">
                        Venta
                      </TableHead>
                      <TableHead className="text-foreground font-semibold text-xs sm:text-sm whitespace-nowrap">
                        Acciones
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLots.length > 0 ? (
                      filteredLots.map((lot) => (
                        <>
                          <TableRow key={lot.id} className="hover:bg-muted/50 border-border">
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Barcode className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                                <span className="font-mono font-medium text-xs sm:text-sm whitespace-nowrap">
                                  {lot.lot_number}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="min-w-0">
                                <div className="font-medium text-foreground text-xs sm:text-sm truncate max-w-[150px]">
                                  {lot.products?.name || "N/A"}
                                </div>
                                <div className="text-[10px] sm:text-xs text-muted-foreground truncate">
                                  {lot.products?.code}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[10px] sm:text-xs whitespace-nowrap">
                                {lot.quantity} unidades
                              </Badge>
                            </TableCell>
                            <TableCell>{getStatusBadge(lot.status)}</TableCell>
                            <TableCell className="hidden md:table-cell">
                              <div className="text-xs sm:text-sm whitespace-nowrap">
                                {formatDate(lot.generated_date)}
                              </div>
                              {lot.ingress_date && (
                                <div className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">
                                  Ingreso: {formatDate(lot.ingress_date)}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              <div className="text-xs sm:text-sm whitespace-nowrap">
                                {lot.sales?.sale_number || "N/A"}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1 sm:gap-2 flex-wrap">
                                {lot.status === "pending" && (
                                  <Button
                                    size="sm"
                                    onClick={() => updateLotStatus(lot.id, "in_inventory")}
                                    className="bg-green-600 hover:bg-green-700 text-white text-xs whitespace-nowrap"
                                  >
                                    Ingresar
                                  </Button>
                                )}
                                {lot.status === "in_inventory" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => updateLotStatus(lot.id, "delivered")}
                                    className="border-blue-300 text-blue-700 hover:bg-blue-50 text-xs whitespace-nowrap"
                                  >
                                    Entregar
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setExpandedLot(expandedLot === lot.id ? null : lot.id)}
                                  className="text-xs whitespace-nowrap"
                                >
                                  {expandedLot === lot.id ? "Ocultar" : "Ver"}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                          {expandedLot === lot.id && lot.product_serials && lot.product_serials.length > 0 && (
                            <TableRow>
                              <TableCell colSpan={7} className="bg-muted/30">
                                <div className="p-3 sm:p-4">
                                  <h4 className="font-semibold mb-2 flex items-center gap-2 text-xs sm:text-sm">
                                    <Hash className="h-3 w-3 sm:h-4 sm:w-4" />
                                    Números de Serie ({lot.product_serials.length})
                                  </h4>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                    {lot.product_serials.map((serial) => (
                                      <div
                                        key={serial.id}
                                        className="p-2 bg-background rounded border border-border font-mono text-xs sm:text-sm truncate"
                                        title={serial.serial_number}
                                      >
                                        {serial.serial_number}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <div className="text-muted-foreground text-xs sm:text-sm">
                            {lots.length === 0
                              ? "No hay lotes registrados"
                              : "No se encontraron lotes con los filtros aplicados"}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
