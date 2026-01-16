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
  Edit,
  MoreVertical,
  ClipboardList,
  Filter,
  ArrowUpDown
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { MovementFormDialog } from "@/components/warehouse/movement-form-dialog"
import { MovementAttachmentsDialog } from "@/components/warehouse/movement-attachments-dialog"
import { MovementEditDialog } from "@/components/warehouse/movement-edit-dialog"
import { useCompany } from "@/lib/company-context"
import { useToast } from "@/hooks/use-toast"
import * as XLSX from "xlsx"
import { createLotsForInventoryEntry } from "@/lib/lot-serial-generator"
import InboundNotePDFGenerator from "@/components/warehouse/inbound-note-pdf-generator"
import { motion } from "framer-motion"

interface InventoryMovement {
  id: string
  movement_type: string
  quantity: number
  sale_price: number | null
  entry_price: number | null
  exit_price: number | null
  total_amount: number | null
  purchase_order_number: string | null
  destination_entity_name: string | null
  destination_address: string | null
  destination_department_id: string | null
  supplier: string | null
  reason: string | null
  notes: string | null
  movement_date: string
  created_at: string
  product_id: string
  products?: {
    id: string
    name: string
    code: string
    unit_of_measure: string
    description: string
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
  attachment_type: "factura" | "adjunto"
  created_at: string
  profiles?: {
    full_name: string
  } | null
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.4 }
  }
}

const AttachmentsList = ({ movementId }: { movementId: string }) => {
  const { attachments } = useAttachments(movementId)

  const invoices = attachments.filter((a) => a.attachment_type === "factura")
  const otherAttachments = attachments.filter((a) => a.attachment_type === "adjunto")

  if (attachments.length === 0) return null

  return (
    <div className="mt-2 space-y-2">
      {invoices.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Facturas ({invoices.length}):</p>
          {invoices.slice(0, 1).map((attachment) => (
            <div key={attachment.id} className="flex items-center gap-2 p-1.5 bg-orange-50 dark:bg-orange-900/10 rounded-lg border border-orange-100 dark:border-orange-900/30">
              <FileText className="h-3 w-3 text-orange-600 dark:text-orange-400 flex-shrink-0" />
              <a
                href={attachment.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-orange-700 dark:text-orange-300 hover:underline truncate flex-1 font-medium"
                title={attachment.file_name}
              >
                {attachment.file_name}
              </a>
              <span className="text-[10px] text-slate-400">({formatFileSize(attachment.file_size)})</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 hover:bg-orange-200 dark:hover:bg-orange-800/50 rounded-full"
                onClick={(e) => {
                   e.preventDefault();
                   window.open(attachment.file_url, "_blank");
                }}
                title="Descargar archivo"
              >
                <Download className="h-3 w-3 text-orange-600 dark:text-orange-400" />
              </Button>
            </div>
          ))}
          {invoices.length > 1 && (
            <p className="text-[10px] text-slate-400 pl-1">+ {invoices.length - 1} más...</p>
          )}
        </div>
      )}

      {otherAttachments.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Adjuntos ({otherAttachments.length}):</p>
          {otherAttachments.slice(0, 1).map((attachment) => (
            <div key={attachment.id} className="flex items-center gap-2 p-1.5 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900/30">
              <Paperclip className="h-3 w-3 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <a
                href={attachment.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-700 dark:text-blue-300 hover:underline truncate flex-1 font-medium"
                title={attachment.file_name}
              >
                {attachment.file_name}
              </a>
              <span className="text-[10px] text-slate-400">({formatFileSize(attachment.file_size)})</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 hover:bg-blue-200 dark:hover:bg-blue-800/50 rounded-full"
                onClick={(e) => {
                   e.preventDefault();
                   window.open(attachment.file_url, "_blank");
                }}
                title="Descargar archivo"
              >
                <Download className="h-3 w-3 text-blue-600 dark:text-blue-400" />
              </Button>
            </div>
          ))}
          {otherAttachments.length > 1 && (
            <p className="text-[10px] text-slate-400 pl-1">+ {otherAttachments.length - 1} más...</p>
          )}
        </div>
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
  const [showEditDialog, setShowEditDialog] = useState(false)

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
          destination_department_id,
          supplier,
          reason,
          notes,
          movement_date,
          created_at,
          product_id,
          products!inventory_movements_product_id_fkey (
            id,
            name,
            code,
            unit_of_measure,
            description
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
      "Precio de Entrada": movement.entry_price ? formatCurrency(movement.entry_price) : "-",
      "Precio de Salida": movement.exit_price ? formatCurrency(movement.exit_price) : "-",
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
      "Precio de Entrada": movement.entry_price || 0,
      "Precio de Salida": movement.exit_price || 0,
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
        return <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
      case "salida":
        return <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
      case "ajuste":
        return <RotateCcw className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      default:
        return <FileText className="h-4 w-4 text-slate-500" />
    }
  }

  const getMovementBadge = (type: string) => {
    switch (type) {
      case "entrada":
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800">
            Entrada
          </Badge>
        )
      case "salida":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">Salida</Badge>
      case "ajuste":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800">
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

      const { data: productData, error: productError } = await supabase
        .from("products")
        .select("id, code, name, current_stock")
        .eq("id", movementData.product_id)
        .single()

      if (productError) throw productError

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

      if (movementData.movement_type === "entrada" && movementData.quantity > 0) {
        try {
          console.log("[v0] Creating lots for inventory entry movement")
          await createLotsForInventoryEntry(
            productData.id,
            productData.code,
            productData.name,
            movementData.quantity,
            companyId,
            user.id,
            createdMovement.id,
          )
          console.log("[v0] Lots and serials created successfully for inventory entry")

          toast({
            title: "Éxito",
            description: `Movimiento creado y ${movementData.quantity} lote(s) con series generados automáticamente`,
          })
        } catch (lotError) {
          console.error("[v0] Error creating lots for inventory entry:", lotError)
          toast({
            title: "Advertencia",
            description: "Movimiento creado pero hubo un error al generar los lotes automáticamente",
            variant: "destructive",
          })
        }
      } else {
        toast({
          title: "Éxito",
          description: "Movimiento creado correctamente",
        })
      }

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

  const openEditDialog = (movement: InventoryMovement) => {
    setSelectedMovement(movement)
    setShowEditDialog(true)
  }

  const closeEditDialog = () => {
    setShowEditDialog(false)
    setSelectedMovement(null)
  }

  const handleEditSuccess = () => {
    const companyId = user?.role === "admin" ? selectedCompany?.id : user?.company_id
    if (companyId) {
      fetchMovements(companyId)
    }
  }

  if (loading) {
    return (
      <div className="space-y-8 p-4 sm:p-6 lg:p-8 min-h-[calc(100vh-4rem)]">
         <div className="flex items-center gap-4 mb-8">
            <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse" />
            <div className="space-y-2">
               <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
               <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            </div>
         </div>
         <div className="h-96 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
      </div>
    )
  }

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-8 p-4 sm:p-6 lg:p-8 min-h-[calc(100vh-4rem)]"
    >
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h1 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-slate-900 via-slate-700 to-slate-600 dark:from-white dark:via-slate-200 dark:to-slate-400 bg-clip-text text-transparent flex items-center gap-3">
             <ClipboardList className="h-8 w-8 text-indigo-500" />
             Movimientos de Inventario
           </h1>
           <p className="text-slate-500 dark:text-slate-400 mt-1">
             Historial de entradas, salidas y ajustes de inventario
           </p>
        </div>
        <Button
          onClick={() => setShowMovementForm(true)}
          className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20 transition-all hover:scale-105"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Movimiento
        </Button>
      </motion.div>

      <motion.div variants={itemVariants}>
         <Card className="border-none shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-md overflow-hidden">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
               <CardTitle className="flex items-center gap-2 text-lg text-slate-800 dark:text-slate-100">
                 <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400">
                   <Filter className="h-5 w-5" />
                 </div>
                 Filtros y Búsqueda
               </CardTitle>
               <div className="flex gap-2">
                 <Button
                   variant="outline"
                   size="sm"
                   onClick={exportToCSV}
                   disabled={filteredMovements.length === 0}
                   className="rounded-lg border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                 >
                   <Download className="h-4 w-4 mr-2" />
                   CSV
                 </Button>
                 <Button
                   variant="outline"
                   size="sm"
                   onClick={exportToExcel}
                   disabled={filteredMovements.length === 0}
                   className="rounded-lg border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                 >
                   <Download className="h-4 w-4 mr-2" />
                   Excel
                 </Button>
               </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                    <Input
                      placeholder="Buscar por producto, orden, entidad..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50"
                    />
                  </div>
                </div>
                <Select value={movementTypeFilter} onValueChange={setMovementTypeFilter}>
                  <SelectTrigger className="w-full sm:w-48 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
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
                  className={`w-full sm:w-auto rounded-xl border-slate-200 dark:border-slate-700 ${showAdvancedFilters ? 'bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  {showAdvancedFilters ? "Ocultar Filtros" : "Filtros Avanzados"}
                </Button>
              </div>

              {showAdvancedFilters && (
                <motion.div 
                   initial={{ height: 0, opacity: 0 }}
                   animate={{ height: "auto", opacity: 1 }}
                   exit={{ height: 0, opacity: 0 }}
                   className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800"
                >
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-3 text-slate-700 dark:text-slate-300 font-medium">
                      <Calendar className="h-4 w-4 text-indigo-500" />
                      Filtros de Fecha
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Desde</div>
                        <Input
                          type="date"
                          value={dateFrom}
                          onChange={(e) => setDateFrom(e.target.value)}
                          className="rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                        />
                      </div>
                      <div>
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Hasta</div>
                        <Input
                          type="date"
                          value={dateTo}
                          onChange={(e) => setDateTo(e.target.value)}
                          className="rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                        />
                      </div>
                      <div>
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Filtros Rápidos</div>
                        <Select value={dateFilter} onValueChange={setDateFilter} disabled={!!(dateFrom || dateTo)}>
                          <SelectTrigger className="rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
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
                          variant="ghost"
                          onClick={clearDateFilters}
                          className="w-full text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Limpiar Fechas
                        </Button>
                      </div>
                    </div>

                    {(dateFrom || dateTo) && (
                      <div className="text-xs text-indigo-600 dark:text-indigo-400 font-medium bg-indigo-50 dark:bg-indigo-900/20 p-2 rounded-lg inline-block">
                        Rango: {dateFrom || "Inicio"} → {dateTo || "Fin"}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants}>
         <Card className="border-none shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-md overflow-hidden">
            <div className="overflow-x-auto">
               <Table>
                 <TableHeader>
                   <TableRow className="hover:bg-transparent border-slate-100 dark:border-slate-800">
                     <TableHead className="text-slate-600 dark:text-slate-400 font-semibold w-[140px]">Fecha</TableHead>
                     <TableHead className="text-slate-600 dark:text-slate-400 font-semibold">Producto</TableHead>
                     <TableHead className="text-slate-600 dark:text-slate-400 font-semibold">Tipo</TableHead>
                     <TableHead className="text-slate-600 dark:text-slate-400 font-semibold">Cantidad</TableHead>
                     <TableHead className="text-slate-600 dark:text-slate-400 font-semibold">Precios</TableHead>
                     <TableHead className="text-slate-600 dark:text-slate-400 font-semibold min-w-[200px]">Detalles</TableHead>
                     <TableHead className="text-slate-600 dark:text-slate-400 font-semibold">Usuario</TableHead>
                     <TableHead className="text-slate-600 dark:text-slate-400 font-semibold">Adjuntos</TableHead>
                     <TableHead className="text-slate-600 dark:text-slate-400 font-semibold text-right">Acciones</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {filteredMovements.length > 0 ? (
                     filteredMovements.map((movement) => (
                       <TableRow key={movement.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 border-slate-100 dark:border-slate-800 transition-colors">
                         <TableCell>
                           <div className="text-sm font-medium text-slate-700 dark:text-slate-300">{formatDate(movement.movement_date)}</div>
                           <div className="text-xs text-slate-400">{new Date(movement.movement_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                         </TableCell>
                         <TableCell>
                           <div>
                             <div className="font-medium text-slate-800 dark:text-slate-200">
                               {movement.products?.name || "Producto eliminado"}
                             </div>
                             <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary" className="font-mono text-[10px] bg-slate-100 text-slate-500 border-slate-200">
                                   {movement.products?.code}
                                </Badge>
                             </div>
                           </div>
                         </TableCell>
                         <TableCell>
                           <div className="flex items-center gap-2">
                             {getMovementIcon(movement.movement_type)}
                             {getMovementBadge(movement.movement_type)}
                           </div>
                         </TableCell>
                         <TableCell>
                           <div className={`font-bold ${
                              movement.movement_type === "entrada" ? "text-emerald-600 dark:text-emerald-400" : 
                              movement.movement_type === "salida" ? "text-red-600 dark:text-red-400" : 
                              "text-blue-600 dark:text-blue-400"
                           }`}>
                             {movement.movement_type === "entrada"
                               ? "+"
                               : movement.movement_type === "salida"
                                 ? "-"
                                 : "±"}
                             {movement.quantity} <span className="text-xs font-normal text-slate-500">{movement.products?.unit_of_measure}</span>
                           </div>
                         </TableCell>
                         <TableCell>
                           <div className="text-sm space-y-1">
                             {movement.entry_price && movement.movement_type === "entrada" && (
                               <div className="bg-emerald-50 dark:bg-emerald-900/10 p-2 rounded-lg border border-emerald-100 dark:border-emerald-900/20">
                                 <div className="flex justify-between gap-4 text-xs">
                                    <span className="text-slate-500">Unitario:</span>
                                    <span className="font-medium text-slate-700 dark:text-slate-300">{formatCurrency(movement.entry_price)}</span>
                                 </div>
                                 <div className="flex justify-between gap-4 text-xs font-bold mt-1 pt-1 border-t border-emerald-200/50">
                                   <span className="text-emerald-700 dark:text-emerald-400">Total:</span>
                                   <span className="text-emerald-700 dark:text-emerald-400">{formatCurrency(movement.total_amount)}</span>
                                 </div>
                               </div>
                             )}
                             {movement.exit_price && movement.movement_type === "salida" && (
                               <div className="bg-red-50 dark:bg-red-900/10 p-2 rounded-lg border border-red-100 dark:border-red-900/20">
                                 <div className="flex justify-between gap-4 text-xs">
                                    <span className="text-slate-500">Unitario:</span>
                                    <span className="font-medium text-slate-700 dark:text-slate-300">{formatCurrency(movement.exit_price)}</span>
                                 </div>
                                 <div className="flex justify-between gap-4 text-xs font-bold mt-1 pt-1 border-t border-red-200/50">
                                   <span className="text-red-700 dark:text-red-400">Total:</span>
                                   <span className="text-red-700 dark:text-red-400">{formatCurrency(movement.total_amount)}</span>
                                 </div>
                               </div>
                             )}
                             {!movement.entry_price && !movement.exit_price && (
                               <span className="text-slate-400">-</span>
                             )}
                           </div>
                         </TableCell>
                         <TableCell>
                           <div className="text-sm space-y-1.5">
                             {movement.purchase_order_number && (
                               <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                                 <Badge variant="outline" className="text-[10px] py-0 h-5 bg-slate-50">OC</Badge>
                                 <span className="font-medium text-xs">{movement.purchase_order_number}</span>
                               </div>
                             )}
                             {movement.destination_entity_name && (
                               <div className="text-slate-700 dark:text-slate-300">
                                 <div className="flex items-center gap-1.5">
                                    <Badge variant="outline" className="text-[10px] py-0 h-5 bg-slate-50">Cliente</Badge>
                                    <span className="font-medium text-xs truncate max-w-[150px]" title={movement.destination_entity_name}>{movement.destination_entity_name}</span>
                                 </div>
                                 {movement.destination_address && (
                                   <div className="text-[10px] text-slate-500 ml-1 mt-0.5 truncate max-w-[150px]" title={movement.destination_address}>
                                     {movement.destination_address}
                                   </div>
                                 )}
                               </div>
                             )}
                             {movement.peru_departments?.name && (
                               <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                                 <Badge variant="outline" className="text-[10px] py-0 h-5 bg-slate-50">Destino</Badge>
                                 <span className="text-xs">{movement.peru_departments.name}</span>
                               </div>
                             )}
                             {movement.supplier && (
                               <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                                 <Badge variant="outline" className="text-[10px] py-0 h-5 bg-slate-50">Prov.</Badge>
                                 <span className="font-medium text-xs truncate max-w-[150px]" title={movement.supplier}>{movement.supplier}</span>
                               </div>
                             )}
                             {movement.reason && (
                               <div className="text-slate-600 dark:text-slate-400 text-xs italic bg-slate-50 dark:bg-slate-800/50 p-1.5 rounded border border-slate-100 dark:border-slate-800">
                                 "{movement.reason}"
                               </div>
                             )}
                             {movement.notes && <div className="text-[10px] text-slate-400 truncate max-w-[180px]">{movement.notes}</div>}
                           </div>
                         </TableCell>
                         <TableCell>
                           <div className="flex items-center gap-2">
                              <div className="h-6 w-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-[10px] font-bold text-indigo-700 dark:text-indigo-400">
                                 {movement.profiles?.full_name?.charAt(0) || "U"}
                              </div>
                              <span className="text-xs text-slate-600 dark:text-slate-400 truncate max-w-[100px]" title={movement.profiles?.full_name || "Usuario eliminado"}>
                                 {movement.profiles?.full_name?.split(' ')[0] || "Usuario"}
                              </span>
                           </div>
                         </TableCell>
                         <TableCell>
                           <AttachmentsList movementId={movement.id} />
                         </TableCell>
                         <TableCell className="text-right">
                           <div className="flex items-center justify-end gap-2">
                             {movement.movement_type === "entrada" && (
                               <InboundNotePDFGenerator
                                 movement={movement}
                                 companyCode={selectedCompany?.code || ""}
                                 companyName={selectedCompany?.name || ""}
                                 companyLogo={selectedCompany?.logo_url}
                               />
                             )}
                             <DropdownMenu>
                               <DropdownMenuTrigger asChild>
                                 <Button
                                   variant="ghost"
                                   size="icon"
                                   className="h-8 w-8 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                                 >
                                   <MoreVertical className="h-4 w-4" />
                                 </Button>
                               </DropdownMenuTrigger>
                               <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-xl border-slate-100 dark:border-slate-800">
                                 <DropdownMenuItem onClick={() => openEditDialog(movement)} className="gap-2 cursor-pointer rounded-lg focus:bg-slate-50 dark:focus:bg-slate-800">
                                   <Edit className="h-4 w-4 text-indigo-500" />
                                   Editar Movimiento
                                 </DropdownMenuItem>
                                 <DropdownMenuItem onClick={() => openAttachmentsDialog(movement)} className="gap-2 cursor-pointer rounded-lg focus:bg-slate-50 dark:focus:bg-slate-800">
                                   <Paperclip className="h-4 w-4 text-blue-500" />
                                   Gestionar Archivos
                                 </DropdownMenuItem>
                               </DropdownMenuContent>
                             </DropdownMenu>
                           </div>
                         </TableCell>
                       </TableRow>
                     ))
                   ) : (
                     <TableRow>
                       <TableCell colSpan={9} className="text-center py-16">
                         <div className="flex flex-col items-center justify-center text-slate-400">
                           <div className="h-16 w-16 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-4">
                              <ClipboardList className="h-8 w-8 text-slate-300" />
                           </div>
                           <p className="text-lg font-medium text-slate-600 dark:text-slate-300">No se encontraron movimientos</p>
                           <p className="text-sm">
                             {movements.length === 0
                               ? "No hay movimientos registrados en el sistema."
                               : "Intenta ajustar los filtros de búsqueda."}
                           </p>
                           {movements.length > 0 && (
                              <Button variant="link" onClick={clearDateFilters} className="mt-2 text-indigo-600">
                                 Limpiar filtros
                              </Button>
                           )}
                         </div>
                       </TableCell>
                     </TableRow>
                   )}
                 </TableBody>
               </Table>
            </div>
         </Card>
      </motion.div>

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

      {showEditDialog && selectedMovement && (
        <MovementEditDialog
          open={showEditDialog}
          onClose={closeEditDialog}
          movementId={selectedMovement.id}
          movementData={selectedMovement}
          onSuccess={handleEditSuccess}
        />
      )}
    </motion.div>
  )
}
