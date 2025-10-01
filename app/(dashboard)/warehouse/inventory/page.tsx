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
import * as XLSX from "xlsx"

interface InventoryMovement {
  id: string
  movement_type: string
  quantity: number
  sale_price: number | null
  entry_price: number | null // Added entry_price field
  exit_price: number | null // Added exit_price field
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

const AttachmentsList = ({ movementId }: { movementId: string }) => {
  const { attachments } = useAttachments(movementId)

  if (attachments.length === 0) return null

  return (
    <div className="mt-2 space-y-1">
      <p className="text-xs text-muted-foreground font-medium">Documentos adjuntos ({attachments.length}):</p>
      {attachments.slice(0, 2).map((attachment) => (
        <div key={attachment.id} className="flex items-center gap-2 p-1">
          <Paperclip className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          <a
            href={attachment.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:underline truncate flex-1"
            title={attachment.file_name}
          >
            {attachment.file_name}
          </a>
          <span className="text-xs text-muted-foreground">({formatFileSize(attachment.file_size)})</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-accent"
            onClick={() => window.open(attachment.file_url, "_blank")}
            title="Descargar archivo"
          >
            <Download className="h-3 w-3" />
          </Button>
        </div>
      ))}
      {attachments.length > 2 && (
        <p className="text-xs text-muted-foreground">y {attachments.length - 2} archivo(s) más...</p>
      )}
    </div>
  )
}

const formatFileSize = (bytes: number) => {
  return (bytes / 1024 / 1024).toFixed(1) + " MB"
}

const useAttachments = (movementId: string) => {
  const [attachments, setAttachments] = useState<MovementAttachment[]>([])

  useEffect(() => {
    const fetchAttachments = async () => {
      const { data, error } = await supabase
        .from("inventory_movement_attachments")
        .select("*")
        .eq("movement_id", movementId)

      if (error) {
        console.warn("Could not fetch attachments:", error.message)
        return
      }

      setAttachments(data || [])
    }

    fetchAttachments()
  }, [movementId])

  return { attachments }
}

export default function InventoryPage() {
  const { user } = useAuth()
  const { selectedCompany } = useCompany()
  const { toast } = useToast()
  const [movements, setMovements] = useState<InventoryMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [movementTypeFilter, setMovementTypeFilter] = useState<string>("all")
  const [dateFilter, setDateFilter] = useState<string>("all")
  const [dateFrom, setDateFrom] = useState<string>("")
  const [dateTo, setDateTo] = useState<string>("")
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [showMovementForm, setShowMovementForm] = useState(false)
  const [selectedMovement, setSelectedMovement] = useState<InventoryMovement | null>(null)
  const [showAttachmentsDialog, setShowAttachmentsDialog] = useState(false)

  useEffect(() => {
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
          entry_price,
          exit_price,
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

    if (dateFrom || dateTo) {
      const fromDate = dateFrom ? new Date(dateFrom) : new Date("1900-01-01")
      const toDate = dateTo ? new Date(dateTo + "T23:59:59") : new Date("2100-12-31")
      matchesDate = movementDate >= fromDate && movementDate <= toDate
    } else if (dateFilter !== "all") {
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
      "Precio de Entrada": movement.entry_price ? formatCurrency(movement.entry_price) : "-", // Added entry price
      "Precio de Salida": movement.exit_price ? formatCurrency(movement.exit_price) : "-", // Added exit price
      Total: movement.total_amount ? formatCurrency(movement.total_amount) : "-",
      "Orden de Compra": movement.purchase_order_number || "-",
      "Cliente/Entidad": movement.destination_entity_name || "-",
      "Dirección Destino": movement.destination_address || "-",
      "Departamento Destino": movement.peru_departments?.name || "-",
      Proveedor: movement.supplier || "-",
      Motivo: movement.reason || "-",
      Notas: movement.notes || "-",
      Usuario: movement.profiles?.full_name || "Usuario eliminado",
    }))

    const ws = XLSX.utils.json_to_sheet(dataToExport)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Movimientos de Inventario")

    const colWidths = [
      { wch: 15 }, // Fecha
      { wch: 25 }, // Producto
      { wch: 15 }, // Código
      { wch: 15 }, // Tipo
      { wch: 12 }, // Cantidad
      { wch: 10 }, // Unidad
      { wch: 15 }, // Precio Entrada
      { wch: 15 }, // Precio Salida
      { wch: 15 }, // Total
      { wch: 20 }, // OC
      { wch: 25 }, // Cliente
      { wch: 30 }, // Dirección
      { wch: 15 }, // Departamento
      { wch: 20 }, // Proveedor
      { wch: 20 }, // Motivo
      { wch: 30 }, // Notas
      { wch: 20 }, // Usuario
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
      "Precio de Entrada": movement.entry_price || 0, // Added entry price
      "Precio de Salida": movement.exit_price || 0, // Added exit price
      Total: movement.total_amount || 0,
      "Orden de Compra": movement.purchase_order_number || "",
      "Cliente/Entidad": movement.destination_entity_name || "",
      "Dirección Destino": movement.destination_address || "",
      "Departamento Destino": movement.peru_departments?.name || "",
      Proveedor: movement.supplier || "",
      Motivo: movement.reason || "",
      Notas: movement.notes || "",
      Usuario: movement.profiles?.full_name || "Usuario eliminado",
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

      return createdMovement
    } catch (error: any) {
      console.error("Error creating movement:", error)
      toast({
        title: "Error",
        description: error.message || "Error al crear el movimiento",
        variant: "destructive",
      })
      throw error
    }
  }

  const handleDialogClose = () => {
    setShowMovementForm(false)
    const companyId = user?.role === "admin" ? selectedCompany?.id : user?.company_id
    if (companyId) {
      fetchMovements(companyId)
    }
  }

  const openAttachmentsDialog = (movement: InventoryMovement) => {
    setSelectedMovement(movement)
    setShowAttachmentsDialog(true)
  }

  const closeAttachmentsDialog = () => {
    setShowAttachmentsDialog(false)
    setSelectedMovement(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="space-y-6 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground via-foreground/80 to-foreground/60 bg-clip-text text-transparent">
                Movimientos de Inventario
              </h1>
              <p className="text-muted-foreground">Historial de entradas, salidas y ajustes</p>
            </div>
            <Button disabled className="bg-muted text-muted-foreground">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Movimiento
            </Button>
          </div>
          <Card className="bg-card border-border shadow-lg">
            <CardContent className="p-6">
              <div className="text-center text-muted-foreground">Cargando movimientos...</div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground via-foreground/80 to-foreground/60 bg-clip-text text-transparent">
              Movimientos de Inventario
            </h1>
            <p className="text-muted-foreground">Historial de entradas, salidas y ajustes de inventario</p>
          </div>
          <Button
            onClick={() => setShowMovementForm(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Movimiento
          </Button>
        </div>

        <Card className="bg-card border-border shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <div className="w-6 h-6 bg-muted rounded-md flex items-center justify-center">
                <FileText className="h-4 w-4 text-muted-foreground" />
              </div>
              Historial de Movimientos
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {filteredMovements.length} de {movements.length} movimientos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Buscar por producto, orden, entidad..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 border-border focus:border-ring focus:ring-ring"
                    />
                  </div>
                </div>
                <Select value={movementTypeFilter} onValueChange={setMovementTypeFilter}>
                  <SelectTrigger className="w-full sm:w-48 border-border focus:border-ring focus:ring-ring">
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
                  className="w-full sm:w-auto border-border text-foreground hover:bg-accent"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  {showAdvancedFilters ? "Ocultar Filtros" : "Filtros Avanzados"}
                </Button>
              </div>

              {showAdvancedFilters && (
                <Card className="p-4 bg-muted/50 border-border">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div className="font-medium text-foreground">Filtros de Fecha</div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <div className="text-sm text-foreground">Desde</div>
                        <Input
                          type="date"
                          value={dateFrom}
                          onChange={(e) => setDateFrom(e.target.value)}
                          className="border-border focus:border-ring"
                        />
                      </div>
                      <div>
                        <div className="text-sm text-foreground">Hasta</div>
                        <Input
                          type="date"
                          value={dateTo}
                          onChange={(e) => setDateTo(e.target.value)}
                          className="border-border focus:border-ring"
                        />
                      </div>
                      <div>
                        <div className="text-sm text-foreground">Filtros Rápidos</div>
                        <Select value={dateFilter} onValueChange={setDateFilter} disabled={!!(dateFrom || dateTo)}>
                          <SelectTrigger className="border-border focus:border-ring">
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
                          className="w-full border-border text-foreground hover:bg-accent bg-transparent"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Limpiar Fechas
                        </Button>
                      </div>
                    </div>

                    {(dateFrom || dateTo) && (
                      <div className="text-sm text-muted-foreground">
                        <strong>Rango seleccionado:</strong> {dateFrom || "Inicio"} → {dateTo || "Fin"}
                      </div>
                    )}
                  </div>
                </Card>
              )}

              <div className="flex flex-col sm:flex-row gap-2 justify-between items-start sm:items-center">
                <div className="text-sm text-muted-foreground">
                  Mostrando {filteredMovements.length} de {movements.length} movimientos
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportToCSV}
                    disabled={filteredMovements.length === 0}
                    className="border-border text-foreground hover:bg-accent bg-transparent"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Exportar CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportToExcel}
                    disabled={filteredMovements.length === 0}
                    className="border-border text-foreground hover:bg-accent bg-transparent"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Exportar Excel
                  </Button>
                </div>
              </div>
            </div>

            <div className="rounded-md border border-border bg-card">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 border-border">
                    <TableHead className="text-foreground font-semibold">Fecha</TableHead>
                    <TableHead className="text-foreground font-semibold">Producto</TableHead>
                    <TableHead className="text-foreground font-semibold">Tipo</TableHead>
                    <TableHead className="text-foreground font-semibold">Cantidad</TableHead>
                    <TableHead className="text-foreground font-semibold">Precios</TableHead>
                    <TableHead className="text-foreground font-semibold">Detalles</TableHead>
                    <TableHead className="text-foreground font-semibold">Usuario</TableHead>
                    <TableHead className="text-foreground font-semibold">Adjuntos</TableHead>
                    <TableHead className="text-foreground font-semibold">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMovements.length > 0 ? (
                    filteredMovements.map((movement) => (
                      <TableRow key={movement.id} className="hover:bg-muted/50 border-border">
                        <TableCell>
                          <div className="text-sm text-foreground">{formatDate(movement.movement_date)}</div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium text-foreground">
                              {movement.products?.name || "Producto eliminado"}
                            </div>
                            <div className="text-sm text-muted-foreground">{movement.products?.code}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getMovementIcon(movement.movement_type)}
                            {getMovementBadge(movement.movement_type)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-foreground">
                            {movement.movement_type === "entrada"
                              ? "+"
                              : movement.movement_type === "salida"
                                ? "-"
                                : "±"}
                            {movement.quantity} {movement.products?.unit_of_measure}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm space-y-1">
                            {movement.entry_price && movement.movement_type === "entrada" && (
                              <div>
                                <div className="text-xs text-muted-foreground">Precio entrada:</div>
                                <div className="font-medium text-blue-600">{formatCurrency(movement.entry_price)}</div>
                                <div className="text-xs text-green-600 font-semibold">
                                  Total: {formatCurrency(movement.total_amount)}
                                </div>
                              </div>
                            )}
                            {movement.exit_price && movement.movement_type === "salida" && (
                              <div>
                                <div className="text-xs text-muted-foreground">Precio salida:</div>
                                <div className="font-medium text-orange-600">{formatCurrency(movement.exit_price)}</div>
                                <div className="text-xs text-green-600 font-semibold">
                                  Total: {formatCurrency(movement.total_amount)}
                                </div>
                              </div>
                            )}
                            {!movement.entry_price && !movement.exit_price && (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm space-y-1">
                            {movement.purchase_order_number && (
                              <div className="text-foreground">
                                <span className="font-medium">OC:</span> {movement.purchase_order_number}
                              </div>
                            )}
                            {movement.destination_entity_name && (
                              <div className="text-foreground">
                                <span className="font-medium">Cliente:</span> {movement.destination_entity_name}
                                {movement.destination_address && (
                                  <div className="text-xs text-muted-foreground ml-2">
                                    {movement.destination_address}
                                  </div>
                                )}
                              </div>
                            )}
                            {movement.peru_departments?.name && (
                              <div className="text-foreground">
                                <span className="font-medium">Destino:</span> {movement.peru_departments.name}
                              </div>
                            )}
                            {movement.supplier && (
                              <div className="text-foreground">
                                <span className="font-medium">Proveedor:</span> {movement.supplier}
                              </div>
                            )}
                            {movement.reason && (
                              <div className="text-foreground">
                                <span className="font-medium">Motivo:</span> {movement.reason}
                              </div>
                            )}
                            {movement.notes && <div className="text-muted-foreground">{movement.notes}</div>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-foreground">
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
                            className="border-border text-foreground hover:bg-accent"
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        <div className="text-muted-foreground">
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
            onClose={closeAttachmentsDialog}
            movementId={selectedMovement.id}
            movementInfo={selectedMovement}
          />
        )}
      </div>
    </div>
  )
}
