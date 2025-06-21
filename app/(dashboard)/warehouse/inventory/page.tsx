"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Plus,
  Search,
  TrendingUp,
  TrendingDown,
  RotateCcw,
  FileText,
  Paperclip,
  Download,
  Settings,
  X,
  Calendar,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { MovementFormDialog } from "@/components/warehouse/movement-form-dialog"
import { MovementAttachmentsDialog } from "@/components/warehouse/movement-attachments-dialog"
import { useCompany } from "@/lib/company-context"
import { useToast } from "@/hooks/use-toast"
import { Label } from "@/components/ui/label"
import * as XLSX from "xlsx"

interface InventoryMovement {
  id: string
  movement_type: string
  quantity: number
  sale_price: number | null
  total_amount: number | null
  purchase_order_number: string | null
  destination_entity_name: string | null
  destination_address: string | null
  supplier: string | null
  reason: string | null
  notes: string | null
  movement_date: string
  created_at: string
  products?: {
    id: string
    name: string
    code: string
    unit_of_measure: string
  } | null
  profiles?: {
    full_name: string
  } | null
  peru_departments?: {
    name: string
  } | null
}

interface MovementAttachment {
  id: string
  movement_id: string
  file_name: string
  file_url: string
  file_size: number
  file_type: string
  created_at: string
  profiles?: {
    full_name: string
  } | null
}

export default function InventoryPage() {
  const { user } = useAuth()
  const { selectedCompany } = useCompany()
  const { toast } = useToast()
  const [movements, setMovements] = useState<InventoryMovement[]>([])
  const [attachments, setAttachments] = useState<Record<string, MovementAttachment[]>>({})
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [movementTypeFilter, setMovementTypeFilter] = useState<string>("all")
  const [dateFilter, setDateFilter] = useState<string>("all")
  const [dateFrom, setDateFrom] = useState<string>("")
  const [dateTo, setDateTo] = useState<string>("")
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [showMovementForm, setShowMovementForm] = useState(false)
  const [showAttachmentsDialog, setShowAttachmentsDialog] = useState(false)
  const [selectedMovement, setSelectedMovement] = useState<InventoryMovement | null>(null)

  useEffect(() => {
    // For admin users, use selectedCompany; for others, use their assigned company
    const companyId = user?.role === "admin" ? selectedCompany?.id : user?.company_id

    if (companyId) {
      fetchMovements(companyId)
    }
  }, [user, selectedCompany])

  const fetchMovements = async (companyId: string) => {
    if (!companyId) return

    try {
      setLoading(true)
      console.log("Fetching movements for company:", companyId)

      const { data, error } = await supabase
        .from("inventory_movements")
        .select(`
          id,
          movement_type,
          quantity,
          sale_price,
          total_amount,
          purchase_order_number,
          destination_entity_name,
          destination_address,
          supplier,
          reason,
          notes,
          movement_date,
          created_at,
          products!inventory_movements_product_id_fkey (
            id,
            name,
            code,
            unit_of_measure
          ),
          profiles!inventory_movements_created_by_fkey (
            full_name
          ),
          peru_departments (
            name
          )            
        `)
        .eq("company_id", companyId)
        .order("movement_date", { ascending: false })
        .limit(100)

      if (error) throw error

      console.log("Movements fetched:", data?.length || 0)
      setMovements(data || [])

      // Fetch attachments for these movements
      if (data && data.length > 0) {
        await fetchAttachments(data.map((m) => m.id))
      }
    } catch (error) {
      console.error("Error fetching movements:", error)
      toast({
        title: "Error",
        description: "Error al cargar los movimientos de inventario",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchAttachments = async (movementIds: string[]) => {
    try {
      // First check if we have any movement IDs
      if (!movementIds || movementIds.length === 0) {
        return
      }

      const { data, error } = await supabase
        .from("inventory_movement_attachments")
        .select(`
        id,
        movement_id,
        file_name,
        file_url,
        file_size,
        file_type,
        created_at,
        profiles:uploaded_by (
          full_name
        )
      `)
        .in("movement_id", movementIds)

      if (error) {
        // If the table doesn't exist or columns are missing, just log and continue
        console.warn("Could not fetch attachments:", error.message)
        return
      }

      // Group attachments by movement_id
      const groupedAttachments = (data || []).reduce(
        (acc, attachment) => {
          if (!acc[attachment.movement_id]) {
            acc[attachment.movement_id] = []
          }
          acc[attachment.movement_id].push(attachment)
          return acc
        },
        {} as Record<string, MovementAttachment[]>,
      )

      setAttachments(groupedAttachments)
    } catch (error) {
      console.warn("Error fetching attachments:", error)
      // Don't show error to user, just continue without attachments
    }
  }

  const filteredMovements = movements.filter((movement) => {
    const matchesSearch =
      movement.products?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      movement.products?.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      movement.purchase_order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      movement.destination_entity_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      movement.supplier?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesType = movementTypeFilter === "all" || movement.movement_type === movementTypeFilter

    const now = new Date()
    const movementDate = new Date(movement.movement_date)
    let matchesDate = true

    // Filtros de fecha específicos tienen prioridad
    if (dateFrom || dateTo) {
      const fromDate = dateFrom ? new Date(dateFrom) : new Date("1900-01-01")
      const toDate = dateTo ? new Date(dateTo + "T23:59:59") : new Date("2100-12-31")
      matchesDate = movementDate >= fromDate && movementDate <= toDate
    } else if (dateFilter !== "all") {
      // Filtros rápidos solo si no hay fechas específicas
      if (dateFilter === "today") {
        matchesDate = movementDate.toDateString() === now.toDateString()
      } else if (dateFilter === "week") {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        matchesDate = movementDate >= weekAgo
      } else if (dateFilter === "month") {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        matchesDate = movementDate >= monthAgo
      }
    }

    return matchesSearch && matchesType && matchesDate
  })

  const formatCurrency = (amount: number | null) => {
    if (!amount) return "-"
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "PEN",
    }).format(amount)
  }

  const exportToExcel = () => {
    const dataToExport = filteredMovements.map((movement) => ({
      Fecha: formatDate(movement.movement_date),
      Producto: movement.products?.name || "Producto eliminado",
      Código: movement.products?.code || "N/A",
      "Tipo de Movimiento": movement.movement_type.charAt(0).toUpperCase() + movement.movement_type.slice(1),
      Cantidad: `${movement.movement_type === "entrada" ? "+" : movement.movement_type === "salida" ? "-" : "±"}${movement.quantity}`,
      Unidad: movement.products?.unit_of_measure || "unidades",
      "Precio Unitario": movement.sale_price ? formatCurrency(movement.sale_price) : "-",
      Total: movement.total_amount ? formatCurrency(movement.total_amount) : "-",
      "Orden de Compra": movement.purchase_order_number || "-",
      "Cliente/Entidad": movement.destination_entity_name || "-",
      "Dirección Destino": movement.destination_address || "-",
      "Departamento Destino": movement.peru_departments?.name || "-",
      Proveedor: movement.supplier || "-",
      Motivo: movement.reason || "-",
      Notas: movement.notes || "-",
      Usuario: movement.profiles?.full_name || "Usuario eliminado",
      "Archivos Adjuntos": attachments[movement.id]?.length || 0,
    }))

    const ws = XLSX.utils.json_to_sheet(dataToExport)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Movimientos de Inventario")

    // Ajustar ancho de columnas
    const colWidths = [
      { wch: 15 }, // Fecha
      { wch: 25 }, // Producto
      { wch: 15 }, // Código
      { wch: 15 }, // Tipo
      { wch: 12 }, // Cantidad
      { wch: 10 }, // Unidad
      { wch: 15 }, // Precio
      { wch: 15 }, // Total
      { wch: 20 }, // OC
      { wch: 25 }, // Cliente
      { wch: 30 }, // Dirección
      { wch: 15 }, // Departamento
      { wch: 20 }, // Proveedor
      { wch: 20 }, // Motivo
      { wch: 30 }, // Notas
      { wch: 20 }, // Usuario
      { wch: 10 }, // Adjuntos
    ]
    ws["!cols"] = colWidths

    const fileName = `movimientos_inventario_${new Date().toISOString().split("T")[0]}.xlsx`
    XLSX.writeFile(wb, fileName)

    toast({
      title: "Exportación exitosa",
      description: `Se exportaron ${dataToExport.length} movimientos a Excel.`,
    })
  }

  const exportToCSV = () => {
    const dataToExport = filteredMovements.map((movement) => ({
      Fecha: formatDate(movement.movement_date),
      Producto: movement.products?.name || "Producto eliminado",
      Código: movement.products?.code || "N/A",
      "Tipo de Movimiento": movement.movement_type.charAt(0).toUpperCase() + movement.movement_type.slice(1),
      Cantidad: `${movement.movement_type === "entrada" ? "+" : movement.movement_type === "salida" ? "-" : "±"}${movement.quantity}`,
      Unidad: movement.products?.unit_of_measure || "unidades",
      "Precio Unitario": movement.sale_price || 0,
      Total: movement.total_amount || 0,
      "Orden de Compra": movement.purchase_order_number || "",
      "Cliente/Entidad": movement.destination_entity_name || "",
      "Dirección Destino": movement.destination_address || "",
      "Departamento Destino": movement.peru_departments?.name || "",
      Proveedor: movement.supplier || "",
      Motivo: movement.reason || "",
      Notas: movement.notes || "",
      Usuario: movement.profiles?.full_name || "Usuario eliminado",
      "Archivos Adjuntos": attachments[movement.id]?.length || 0,
    }))

    const ws = XLSX.utils.json_to_sheet(dataToExport)
    const csv = XLSX.utils.sheet_to_csv(ws)

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `movimientos_inventario_${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast({
      title: "Exportación exitosa",
      description: `Se exportaron ${dataToExport.length} movimientos a CSV.`,
    })
  }

  const clearDateFilters = () => {
    setDateFrom("")
    setDateTo("")
    setDateFilter("all")
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-PE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatFileSize = (bytes: number) => {
    return (bytes / 1024 / 1024).toFixed(1) + " MB"
  }

  const getMovementIcon = (type: string) => {
    switch (type) {
      case "entrada":
        return <TrendingUp className="h-4 w-4 text-green-600" />
      case "salida":
        return <TrendingDown className="h-4 w-4 text-red-600" />
      case "ajuste":
        return <RotateCcw className="h-4 w-4 text-blue-600" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const getMovementBadge = (type: string) => {
    switch (type) {
      case "entrada":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 border-green-300">
            Entrada
          </Badge>
        )
      case "salida":
        return <Badge variant="destructive">Salida</Badge>
      case "ajuste":
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-300">
            Ajuste
          </Badge>
        )
      default:
        return <Badge variant="outline">{type}</Badge>
    }
  }

  const handleCreateMovement = async (movementData: any) => {
    try {
      // For admin users, use selectedCompany; for others, use their assigned company
      const companyId = user?.role === "admin" ? selectedCompany?.id : user?.company_id

      if (!companyId) {
        toast({
          title: "Error",
          description: "No hay empresa seleccionada",
          variant: "destructive",
        })
        return
      }

      const { data: createdMovement, error } = await supabase
        .from("inventory_movements")
        .insert({
          ...movementData,
          company_id: companyId,
          created_by: user.id,
          movement_date: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) throw error

      // Update product stock
      const { data: productData } = await supabase
        .from("products")
        .select("current_stock")
        .eq("id", movementData.product_id)
        .single()

      if (productData) {
        let newStock = productData.current_stock

        if (movementData.movement_type === "entrada") {
          newStock += movementData.quantity
        } else if (movementData.movement_type === "salida") {
          newStock -= movementData.quantity
        } else if (movementData.movement_type === "ajuste") {
          newStock = movementData.quantity
        }

        const { error: updateError } = await supabase
          .from("products")
          .update({ current_stock: newStock })
          .eq("id", movementData.product_id)

        if (updateError) throw updateError
      }

      toast({
        title: "Éxito",
        description: "Movimiento creado correctamente",
      })

      // Return the created movement for attachment upload
      return createdMovement
    } catch (error: any) {
      console.error("Error creating movement:", error)
      toast({
        title: "Error",
        description: error.message || "Error al crear el movimiento",
        variant: "destructive",
      })
      throw error // Re-throw so the dialog can handle it
    }
  }

  const handleDialogClose = () => {
    setShowMovementForm(false)
    // Refresh movements when dialog closes
    const companyId = user?.role === "admin" ? selectedCompany?.id : user?.company_id
    if (companyId) {
      fetchMovements(companyId)
    }
  }

  const handleAttachmentsDialogClose = () => {
    setShowAttachmentsDialog(false)
    setSelectedMovement(null)
    // Refresh attachments when dialog closes
    const companyId = user?.role === "admin" ? selectedCompany?.id : user?.company_id
    if (companyId) {
      fetchMovements(companyId)
    }
  }

  const openAttachmentsDialog = (movement: InventoryMovement) => {
    setSelectedMovement(movement)
    setShowAttachmentsDialog(true)
  }

  const AttachmentsList = ({ movementId }: { movementId: string }) => {
    const movementAttachments = attachments[movementId] || []

    if (movementAttachments.length === 0) return null

    return (
      <div className="mt-2 space-y-1">
        <p className="text-xs text-slate-500 font-medium">Documentos adjuntos ({movementAttachments.length}):</p>
        {movementAttachments.slice(0, 2).map((attachment) => (
          <div key={attachment.id} className="flex items-center gap-2 p-1">
            <Paperclip className="h-3 w-3 text-slate-400 flex-shrink-0" />
            <a
              href={attachment.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline truncate flex-1"
              title={attachment.file_name}
            >
              {attachment.file_name}
            </a>
            <span className="text-xs text-slate-500">({formatFileSize(attachment.file_size)})</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-slate-100"
              onClick={() => window.open(attachment.file_url, "_blank")}
              title="Descargar archivo"
            >
              <Download className="h-3 w-3" />
            </Button>
          </div>
        ))}
        {movementAttachments.length > 2 && (
          <p className="text-xs text-slate-500">y {movementAttachments.length - 2} archivo(s) más...</p>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <div className="space-y-6 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-700 via-slate-600 to-slate-500 bg-clip-text text-transparent">
                Movimientos de Inventario
              </h1>
              <p className="text-slate-600">Historial de entradas, salidas y ajustes</p>
            </div>
            <Button disabled className="bg-slate-200 text-slate-500">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Movimiento
            </Button>
          </div>
          <Card className="bg-gradient-to-br from-white to-slate-50/50 border-slate-200/60 shadow-lg">
            <CardContent className="p-6">
              <div className="text-center text-slate-600">Cargando movimientos...</div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-700 via-slate-600 to-slate-500 bg-clip-text text-transparent">
              Movimientos de Inventario
            </h1>
            <p className="text-slate-600">Historial de entradas, salidas y ajustes de inventario</p>
          </div>
          <Button
            onClick={() => setShowMovementForm(true)}
            className="bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Movimiento
          </Button>
        </div>

        <Card className="bg-gradient-to-br from-white to-slate-50/50 border-slate-200/60 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-800">
              <div className="w-6 h-6 bg-gradient-to-br from-slate-100 to-slate-200 rounded-md flex items-center justify-center">
                <FileText className="h-4 w-4 text-slate-600" />
              </div>
              Historial de Movimientos
            </CardTitle>
            <CardDescription className="text-slate-600">
              {filteredMovements.length} de {movements.length} movimientos
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Filtros mejorados */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                    <Input
                      placeholder="Buscar por producto, orden, entidad..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 border-slate-300 focus:border-slate-500 focus:ring-slate-500"
                    />
                  </div>
                </div>
                <Select value={movementTypeFilter} onValueChange={setMovementTypeFilter}>
                  <SelectTrigger className="w-full sm:w-48 border-slate-300 focus:border-slate-500 focus:ring-slate-500">
                    <SelectValue placeholder="Tipo de movimiento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los tipos</SelectItem>
                    <SelectItem value="entrada">Entradas</SelectItem>
                    <SelectItem value="salida">Salidas</SelectItem>
                    <SelectItem value="ajuste">Ajustes</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className="w-full sm:w-auto border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  {showAdvancedFilters ? "Ocultar Filtros" : "Filtros Avanzados"}
                </Button>
              </div>

              {/* Filtros avanzados */}
              {showAdvancedFilters && (
                <Card className="p-4 bg-gradient-to-r from-slate-50 to-white border-slate-200">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar className="h-4 w-4 text-slate-600" />
                      <Label className="font-medium text-slate-700">Filtros de Fecha</Label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <Label htmlFor="date-from" className="text-sm text-slate-700">
                          Desde
                        </Label>
                        <Input
                          id="date-from"
                          type="date"
                          value={dateFrom}
                          onChange={(e) => setDateFrom(e.target.value)}
                          className="border-slate-300 focus:border-slate-500"
                        />
                      </div>
                      <div>
                        <Label htmlFor="date-to" className="text-sm text-slate-700">
                          Hasta
                        </Label>
                        <Input
                          id="date-to"
                          type="date"
                          value={dateTo}
                          onChange={(e) => setDateTo(e.target.value)}
                          className="border-slate-300 focus:border-slate-500"
                        />
                      </div>
                      <div>
                        <Label className="text-sm text-slate-700">Filtros Rápidos</Label>
                        <Select value={dateFilter} onValueChange={setDateFilter} disabled={!!(dateFrom || dateTo)}>
                          <SelectTrigger className="border-slate-300 focus:border-slate-500">
                            <SelectValue placeholder="Período" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos los períodos</SelectItem>
                            <SelectItem value="today">Hoy</SelectItem>
                            <SelectItem value="week">Última semana</SelectItem>
                            <SelectItem value="month">Último mes</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-end">
                        <Button
                          variant="outline"
                          onClick={clearDateFilters}
                          className="w-full border-slate-300 text-slate-700 hover:bg-slate-50"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Limpiar Fechas
                        </Button>
                      </div>
                    </div>

                    {(dateFrom || dateTo) && (
                      <div className="text-sm text-slate-600">
                        <strong>Rango seleccionado:</strong> {dateFrom || "Inicio"} → {dateTo || "Fin"}
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {/* Botones de exportación */}
              <div className="flex flex-col sm:flex-row gap-2 justify-between items-start sm:items-center">
                <div className="text-sm text-slate-600">
                  Mostrando {filteredMovements.length} de {movements.length} movimientos
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportToCSV}
                    disabled={filteredMovements.length === 0}
                    className="border-slate-300 text-slate-700 hover:bg-slate-50"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Exportar CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportToExcel}
                    disabled={filteredMovements.length === 0}
                    className="border-slate-300 text-slate-700 hover:bg-slate-50"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Exportar Excel
                  </Button>
                </div>
              </div>
            </div>

            {/* Tabla de movimientos */}
            <div className="rounded-md border border-slate-200 bg-white">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-slate-50 to-slate-100 border-slate-200">
                    <TableHead className="text-slate-700 font-semibold">Fecha</TableHead>
                    <TableHead className="text-slate-700 font-semibold">Producto</TableHead>
                    <TableHead className="text-slate-700 font-semibold">Tipo</TableHead>
                    <TableHead className="text-slate-700 font-semibold">Cantidad</TableHead>
                    <TableHead className="text-slate-700 font-semibold">Precio/Total</TableHead>
                    <TableHead className="text-slate-700 font-semibold">Detalles</TableHead>
                    <TableHead className="text-slate-700 font-semibold">Usuario</TableHead>
                    <TableHead className="text-slate-700 font-semibold">Adjuntos</TableHead>
                    <TableHead className="text-slate-700 font-semibold">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMovements.length > 0 ? (
                    filteredMovements.map((movement) => (
                      <TableRow key={movement.id} className="hover:bg-slate-50/50 border-slate-200">
                        <TableCell>
                          <div className="text-sm text-slate-800">{formatDate(movement.movement_date)}</div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium text-slate-800">
                              {movement.products?.name || "Producto eliminado"}
                            </div>
                            <div className="text-sm text-slate-500">{movement.products?.code}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getMovementIcon(movement.movement_type)}
                            {getMovementBadge(movement.movement_type)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-slate-800">
                            {movement.movement_type === "entrada"
                              ? "+"
                              : movement.movement_type === "salida"
                                ? "-"
                                : "±"}
                            {movement.quantity} {movement.products?.unit_of_measure}
                          </div>
                        </TableCell>
                        <TableCell>
                          {movement.movement_type === "salida" && movement.sale_price ? (
                            <div>
                              <div className="text-sm text-slate-600">
                                Precio: {formatCurrency(movement.sale_price)}
                              </div>
                              <div className="font-medium text-green-600">
                                Total: {formatCurrency(movement.total_amount)}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm space-y-1">
                            {movement.purchase_order_number && (
                              <div className="text-slate-700">
                                <span className="font-medium">OC:</span> {movement.purchase_order_number}
                              </div>
                            )}
                            {movement.destination_entity_name && (
                              <div className="text-slate-700">
                                <span className="font-medium">Cliente:</span> {movement.destination_entity_name}
                                {movement.destination_address && (
                                  <div className="text-xs text-slate-500 ml-2">{movement.destination_address}</div>
                                )}
                              </div>
                            )}
                            {movement.peru_departments?.name && (
                              <div className="text-slate-700">
                                <span className="font-medium">Destino:</span> {movement.peru_departments.name}
                              </div>
                            )}
                            {movement.supplier && (
                              <div className="text-slate-700">
                                <span className="font-medium">Proveedor:</span> {movement.supplier}
                              </div>
                            )}
                            {movement.reason && (
                              <div className="text-slate-700">
                                <span className="font-medium">Motivo:</span> {movement.reason}
                              </div>
                            )}
                            {movement.notes && <div className="text-slate-500">{movement.notes}</div>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-slate-700">
                            {movement.profiles?.full_name || "Usuario eliminado"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <AttachmentsList movementId={movement.id} />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openAttachmentsDialog(movement)}
                            title="Gestionar archivos adjuntos"
                            className="border-slate-300 text-slate-700 hover:bg-slate-50"
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        <div className="text-slate-500">
                          {movements.length === 0
                            ? "No hay movimientos registrados"
                            : "No se encontraron movimientos con los filtros aplicados"}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {showMovementForm && (
          <MovementFormDialog open={showMovementForm} onClose={handleDialogClose} onSubmit={handleCreateMovement} />
        )}

        {showAttachmentsDialog && selectedMovement && (
          <MovementAttachmentsDialog
            open={showAttachmentsDialog}
            onClose={handleAttachmentsDialogClose}
            movementId={selectedMovement.id}
            movementInfo={{
              movement_type: selectedMovement.movement_type,
              quantity: selectedMovement.quantity,
              movement_date: selectedMovement.movement_date,
              sale_price: selectedMovement.sale_price,
              total_amount: selectedMovement.total_amount,
              purchase_order_number: selectedMovement.purchase_order_number,
              destination_entity_name: selectedMovement.destination_entity_name,
              destination_address: selectedMovement.destination_address,
              supplier: selectedMovement.supplier,
              reason: selectedMovement.reason,
              notes: selectedMovement.notes,
              products: selectedMovement.products,
              profiles: selectedMovement.profiles,
              peru_departments: selectedMovement.peru_departments,
            }}
          />
        )}
      </div>
    </div>
  )
}
