"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Package, Search, Barcode, Hash, Calendar, TrendingUp, Download, ChevronDown, ChevronUp, ShoppingCart, Box, AlertCircle, ScanBarcode } from 'lucide-react'
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { useCompany } from "@/lib/company-context"
import { useToast } from "@/hooks/use-toast"
import * as XLSX from "xlsx"
import { updateLotStatus as updateLotStatusWithMovement } from "@/lib/lot-serial-generator"
import { motion } from "framer-motion"

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
  is_archived?: boolean
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

interface GroupedLots {
  [key: string]: ProductLot[]
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

export default function LotsAndSerialsPage() {
  const { user } = useAuth()
  const { selectedCompany } = useCompany()
  const { toast } = useToast()
  const [lots, setLots] = useState<ProductLot[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [expandedLot, setExpandedLot] = useState<string | null>(null)
  const [collapsedSaleGroups, setCollapsedSaleGroups] = useState<Set<string>>(new Set())

  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    lotId: "",
    newStatus: "" as "pending" | "in_inventory" | "delivered" | "",
    currentLot: null as ProductLot | null,
  })
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    const companyId = user?.role === "admin" ? selectedCompany?.id : user?.company_id

    if (companyId) {
      fetchLots(companyId)
    }
  }, [user, selectedCompany])

  const fetchLots = async (companyId: string) => {
    try {
      setLoading(true)

      let allLots: ProductLot[] = []
      let offset = 0
      const pageSize = 1000

      while (true) {
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
            is_archived,
            products (name, code),
            sales (sale_number),
            product_serials (id, serial_number, status)
          `)
          .eq("company_id", companyId)
          .order("generated_date", { ascending: false })
          .range(offset, offset + pageSize - 1)

        if (error) {
          console.error("Error fetching lots:", error)
          throw error
        }

        if (!data || data.length === 0) break

        allLots = [...allLots, ...data]

        if (data.length < pageSize) break

        offset += pageSize
      }

      setLots(allLots)
      if (allLots && allLots.length > 0) {
        const saleKeys = new Set<string>()
        allLots.forEach((lot) => {
          const saleKey = lot.sales?.sale_number || "sin-asignar"
          saleKeys.add(saleKey)
        })
        setCollapsedSaleGroups(saleKeys)
      }
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

  const handleStatusChangeClick = (lotId: string, newStatus: "pending" | "in_inventory" | "delivered") => {
    const lot = lots.find((l) => l.id === lotId)
    if (lot) {
      setConfirmDialog({
        open: true,
        lotId,
        newStatus,
        currentLot: lot,
      })
    }
  }

  const confirmStatusChange = async () => {
    if (!confirmDialog.lotId || !confirmDialog.newStatus) return

    try {
      setIsUpdating(true)
      const companyId = user?.role === "admin" ? selectedCompany?.id : user?.company_id

      if (!companyId) {
        throw new Error("No company ID available")
      }

      await updateLotStatusWithMovement(confirmDialog.lotId, confirmDialog.newStatus, companyId)

      toast({
        title: "Éxito",
        description: "Estado del lote actualizado y movimiento creado correctamente",
      })

      setConfirmDialog({ open: false, lotId: "", newStatus: "", currentLot: null })
      fetchLots(companyId)
    } catch (error) {
      console.error("Error updating lot status:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al actualizar el estado del lote",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const filteredLots = lots.filter((lot) => {
    if (lot.is_archived) return false

    const matchesSearch =
      lot.lot_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lot.products?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lot.products?.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lot.sales?.sale_number?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" || lot.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const groupedLots: GroupedLots = filteredLots.reduce((acc, lot) => {
    const saleKey = lot.sales?.sale_number || "sin-asignar"
    if (!acc[saleKey]) {
      acc[saleKey] = []
    }
    acc[saleKey].push(lot)
    return acc
  }, {} as GroupedLots)

  const sortedGroupKeys = Object.keys(groupedLots).sort((a, b) => {
    const aHasDelivered = groupedLots[a].every((lot) => lot.status === "delivered")
    const bHasDelivered = groupedLots[b].every((lot) => lot.status === "delivered")

    if (aHasDelivered === bHasDelivered) {
      return a.localeCompare(b)
    }
    return aHasDelivered ? 1 : -1
  })

  const getStatusBadge = (status: string, isArchived?: boolean) => {
    if (isArchived) {
      return (
        <Badge variant="secondary" className="bg-slate-200 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
          Archivado
        </Badge>
      )
    }

    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800">
            Pendiente
          </Badge>
        )
      case "in_inventory":
        return (
          <Badge variant="default" className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800">
            En Inventario
          </Badge>
        )
      case "delivered":
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800">
            Entregado
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getConfirmationContent = () => {
    const { currentLot, newStatus } = confirmDialog
    if (!currentLot) return null

    const productInfo = `${currentLot.quantity} unidades de ${currentLot.products?.name || "N/A"} (${currentLot.products?.code || "N/A"})`

    if (currentLot.status === "pending" && newStatus === "in_inventory") {
      return {
        title: "Confirmar Ingreso al Inventario",
        description: `Estás a punto de ingresar estos productos al sistema. Recuerda que se generará un movimiento de inventario de ingreso, lo que aumentará el stock del producto.\n\n${productInfo}`,
      }
    }

    if (currentLot.status === "in_inventory" && newStatus === "delivered") {
      return {
        title: "Confirmar Entrega",
        description: `Estás a punto de marcar como entregado ${productInfo}. Tras esta acción se generará un movimiento de inventario de salida, lo que disminuirá el stock del producto y bloqueará la creación de etiquetas de esta venta.`,
      }
    }

    return null
  }

  const toggleSaleGroupCollapse = (saleKey: string) => {
    setCollapsedSaleGroups((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(saleKey)) {
        newSet.delete(saleKey)
      } else {
        newSet.add(saleKey)
      }
      return newSet
    })
  }

  const isGroupFullyDelivered = (saleLots: ProductLot[]): boolean => {
    return saleLots.every((lot) => lot.status === "delivered")
  }

  const formatDate = (dateString: string): string => {
    if (!dateString) return "N/A"
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString("es-ES", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    } catch {
      return dateString
    }
  }

  const exportToExcel = () => {
    try {
      const exportData = filteredLots.map((lot) => ({
        "Número de Lote": lot.lot_number,
        "Número de Venta": lot.sales?.sale_number || "Sin asignar",
        "Producto": lot.products?.name || "N/A",
        "Código": lot.products?.code || "N/A",
        "Cantidad": lot.quantity,
        "Estado": lot.status === "pending" ? "Pendiente" : lot.status === "in_inventory" ? "En Inventario" : "Entregado",
        "Fecha Generación": formatDate(lot.generated_date),
        "Fecha Ingreso": lot.ingress_date ? formatDate(lot.ingress_date) : "N/A",
        "Fecha Entrega": lot.delivery_date ? formatDate(lot.delivery_date) : "N/A",
        "Total Series": lot.product_serials?.length || 0,
      }))

      const ws = XLSX.utils.json_to_sheet(exportData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Lotes")

      // Ajustar ancho de columnas
      const colWidths = [
        { wch: 18 },
        { wch: 15 },
        { wch: 20 },
        { wch: 12 },
        { wch: 10 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 12 },
      ]
      ws["!cols"] = colWidths

      XLSX.writeFile(wb, `lotes_y_series_${new Date().toISOString().split("T")[0]}.xlsx`)

      toast({
        title: "Éxito",
        description: "Archivo exportado correctamente",
      })
    } catch (error) {
      console.error("Error exporting to Excel:", error)
      toast({
        title: "Error",
        description: "Error al exportar los datos",
        variant: "destructive",
      })
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
      </div>
    )
  }

  const confirmationContent = getConfirmationContent()

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
             <Barcode className="h-8 w-8 text-indigo-500" />
             Lotes y Números de Serie
           </h1>
           <p className="text-slate-500 dark:text-slate-400 mt-1">
             Gestión de trazabilidad de productos
           </p>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="grid gap-6 sm:grid-cols-2 md:grid-cols-4">
          <Card className="border-none shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-md overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
               <Package className="h-16 w-16 text-slate-500" />
            </div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Lotes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{lots.length}</div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-md overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
               <Calendar className="h-16 w-16 text-amber-500" />
            </div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">Pendientes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {lots.filter((l) => l.status === "pending").length}
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-md overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
               <TrendingUp className="h-16 w-16 text-emerald-500" />
            </div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">En Inventario</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {lots.filter((l) => l.status === "in_inventory").length}
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-md overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
               <Hash className="h-16 w-16 text-indigo-500" />
            </div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Series</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                {lots.reduce((sum, lot) => sum + (lot.product_serials?.length || 0), 0)}
              </div>
            </CardContent>
          </Card>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className="border-none shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-md overflow-hidden">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <CardTitle className="flex items-center gap-2 text-lg text-slate-800 dark:text-slate-100">
              <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400">
                 <ScanBarcode className="h-5 w-5" />
              </div>
              Gestión de Lotes y Series
            </CardTitle>
            <CardDescription>
              {filteredLots.length} de {lots.length} lotes • Agrupados por venta
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                    <Input
                      placeholder="Buscar por lote, producto, serie..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 h-11"
                    />
                  </div>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-48 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 h-11">
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
                  className="rounded-xl border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 h-11"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </div>

              {/* Mobile view - Grouped by sale */}
              <div className="lg:hidden space-y-4">
                {sortedGroupKeys.length > 0 ? (
                  sortedGroupKeys.map((saleKey) => {
                    const saleLots = groupedLots[saleKey]
                    const isFullyDelivered = isGroupFullyDelivered(saleLots)
                    const isCollapsed = collapsedSaleGroups.has(saleKey)

                    return (
                      <div key={saleKey} className="space-y-3">
                        <div
                          className={`p-4 rounded-xl border cursor-pointer transition-all ${
                            isFullyDelivered
                              ? "bg-blue-50/50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-900/30"
                              : "bg-amber-50/50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-900/30"
                          }`}
                          onClick={() => toggleSaleGroupCollapse(saleKey)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className={`p-2 rounded-lg ${isFullyDelivered ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'} dark:bg-slate-800`}>
                                 <ShoppingCart className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-sm text-slate-700 dark:text-slate-200">
                                  {saleKey === "sin-asignar" ? "Sin asignar a venta" : `Venta: ${saleKey}`}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                  {saleLots.length} lote{saleLots.length !== 1 ? "s" : ""} •{" "}
                                  {saleLots.reduce((sum, lot) => sum + (lot.product_serials?.length || 0), 0)} series
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 flex-shrink-0 rounded-full hover:bg-white/50 dark:hover:bg-black/20"
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleSaleGroupCollapse(saleKey)
                              }}
                            >
                              {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>

                        {isCollapsed && isFullyDelivered && (
                          <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-xs text-slate-500 italic text-center border border-dashed border-slate-200 dark:border-slate-700">
                            {saleLots.length} lote{saleLots.length !== 1 ? "s" : ""} entregado
                            {saleLots.length !== 1 ? "s" : ""} • Haz clic para expandir
                          </div>
                        )}

                        {!isCollapsed &&
                          saleLots.map((lot) => (
                            <Card key={lot.id} className="border border-slate-200 dark:border-slate-800 ml-4 shadow-sm">
                              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Barcode className="h-4 w-4 text-slate-400 flex-shrink-0" />
                                      <span className="font-mono font-bold text-sm truncate text-slate-700 dark:text-slate-200">{lot.lot_number}</span>
                                    </div>
                                    {getStatusBadge(lot.status, lot.is_archived)}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setExpandedLot(expandedLot === lot.id ? null : lot.id)}
                                    className="h-8 w-8 p-0 flex-shrink-0 rounded-full"
                                  >
                                    {expandedLot === lot.id ? (
                                      <ChevronUp className="h-4 w-4" />
                                    ) : (
                                      <ChevronDown className="h-4 w-4" />
                                    )}
                                  </Button>
                                </div>
                              </CardHeader>
                              <CardContent className="space-y-4 pt-4">
                                <div className="flex items-start gap-3">
                                  <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                                     <Box className="h-4 w-4 text-slate-500" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate text-slate-700 dark:text-slate-200">{lot.products?.name || "N/A"}</p>
                                    <p className="text-xs text-slate-500 font-mono mt-0.5">{lot.products?.code}</p>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                  <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
                                    <Package className="h-4 w-4 text-slate-400" />
                                    <span className="text-xs font-medium">{lot.quantity} unidades</span>
                                  </div>
                                  <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
                                    <Hash className="h-4 w-4 text-slate-400" />
                                    <span className="text-xs font-medium">{lot.product_serials?.length || 0} series</span>
                                  </div>
                                </div>

                                <div className="space-y-1 text-xs pt-2">
                                  <div className="flex items-center gap-2 text-slate-500">
                                    <Calendar className="h-3 w-3" />
                                    <span>Generado: {formatDate(lot.generated_date)}</span>
                                  </div>
                                  {lot.ingress_date && (
                                    <div className="flex items-center gap-2 text-slate-500">
                                      <TrendingUp className="h-3 w-3" />
                                      <span>Ingreso: {formatDate(lot.ingress_date)}</span>
                                    </div>
                                  )}
                                </div>

                                {expandedLot === lot.id && lot.product_serials && lot.product_serials.length > 0 && (
                                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                                      <Hash className="h-4 w-4 text-indigo-500" />
                                      Números de Serie ({lot.product_serials.length})
                                    </div>
                                    <div className="grid grid-cols-1 gap-2">
                                      {lot.product_serials.map((serial) => (
                                        <div
                                          key={serial.id}
                                          className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700 font-mono text-xs truncate text-slate-600 dark:text-slate-300"
                                          title={serial.serial_number}
                                        >
                                          {serial.serial_number}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                <div className="flex gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                                  {lot.status === "pending" && (
                                    <Button
                                      size="sm"
                                      onClick={() => handleStatusChangeClick(lot.id, "in_inventory")}
                                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-lg shadow-sm"
                                    >
                                      Ingresar a Inventario
                                    </Button>
                                  )}
                                  {lot.status === "in_inventory" && (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleStatusChangeClick(lot.id, "delivered")}
                                        disabled={!lot.sale_id}
                                        title={
                                          !lot.sale_id ? "El lote debe estar asignado a una venta para entregarlo" : ""
                                        }
                                        className={`flex-1 text-xs rounded-lg ${
                                          !lot.sale_id
                                            ? "border-slate-200 text-slate-400 cursor-not-allowed opacity-50"
                                            : "border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/20"
                                        }`}
                                      >
                                        Marcar Entregado
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                      </div>
                    )
                  })
                ) : (
                  <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                     <Search className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                     <p className="text-slate-500 dark:text-slate-400">No se encontraron lotes</p>
                  </div>
                )}
              </div>

              {/* Desktop table layout - Grouped by sale */}
              <div className="hidden lg:block space-y-4">
                {sortedGroupKeys.length > 0 ? (
                  sortedGroupKeys.map((saleKey) => {
                    const saleLots = groupedLots[saleKey]
                    const isFullyDelivered = isGroupFullyDelivered(saleLots)
                    const isCollapsed = collapsedSaleGroups.has(saleKey)

                    return (
                      <div key={saleKey} className="space-y-3">
                        <div
                          className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                            isFullyDelivered
                              ? "bg-blue-50/50 border-blue-100 hover:bg-blue-50 dark:bg-blue-900/10 dark:border-blue-900/30 dark:hover:bg-blue-900/20"
                              : "bg-amber-50/50 border-amber-100 hover:bg-amber-50 dark:bg-amber-900/10 dark:border-amber-900/30 dark:hover:bg-amber-900/20"
                          }`}
                          onClick={() => toggleSaleGroupCollapse(saleKey)}
                        >
                          <div className="flex items-center gap-4 flex-1">
                            <div className={`p-2.5 rounded-xl ${isFullyDelivered ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'} dark:bg-slate-800 shadow-sm`}>
                               <ShoppingCart className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="font-semibold text-base text-slate-800 dark:text-slate-200">
                                {saleKey === "sin-asignar" ? "Sin asignar a venta" : `Venta: ${saleKey}`}
                              </p>
                              <div className="flex items-center gap-2 mt-1 text-sm">
                                <span className="text-slate-500 dark:text-slate-400">{saleLots.length} lote{saleLots.length !== 1 ? "s" : ""}</span>
                                <span className="text-slate-300 dark:text-slate-600">•</span>
                                <span className="text-slate-500 dark:text-slate-400">{saleLots.reduce((sum, lot) => sum + (lot.product_serials?.length || 0), 0)} series</span>
                                <span className="text-slate-300 dark:text-slate-600">•</span>
                                {isFullyDelivered ? (
                                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800">Todos entregados</Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800">En proceso</Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 flex-shrink-0 rounded-full hover:bg-white/50 dark:hover:bg-black/20"
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleSaleGroupCollapse(saleKey)
                            }}
                          >
                            {isCollapsed ? <ChevronDown className="h-5 w-5 text-slate-500" /> : <ChevronUp className="h-5 w-5 text-slate-500" />}
                          </Button>
                        </div>

                        {isCollapsed && isFullyDelivered && (
                          <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-sm text-slate-500 italic border border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2">
                            <AlertCircle className="h-4 w-4" />
                            <span>{saleLots.length} lote{saleLots.length !== 1 ? "s" : ""} entregado{saleLots.length !== 1 ? "s" : ""} • Haz clic para expandir</span>
                          </div>
                        )}

                        {!isCollapsed && (
                          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
                            <Table>
                              <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
                                <TableRow>
                                  <TableHead className="text-slate-600 dark:text-slate-400 font-semibold text-xs sm:text-sm whitespace-nowrap pl-6">
                                    Número de Lote
                                  </TableHead>
                                  <TableHead className="text-slate-600 dark:text-slate-400 font-semibold text-xs sm:text-sm whitespace-nowrap">
                                    Producto
                                  </TableHead>
                                  <TableHead className="text-slate-600 dark:text-slate-400 font-semibold text-xs sm:text-sm whitespace-nowrap">
                                    Cantidad
                                  </TableHead>
                                  <TableHead className="text-slate-600 dark:text-slate-400 font-semibold text-xs sm:text-sm whitespace-nowrap">
                                    Estado
                                  </TableHead>
                                  <TableHead className="text-slate-600 dark:text-slate-400 font-semibold text-xs sm:text-sm whitespace-nowrap hidden md:table-cell">
                                    Fecha Generación
                                  </TableHead>
                                  <TableHead className="text-slate-600 dark:text-slate-400 font-semibold text-xs sm:text-sm whitespace-nowrap text-right pr-6">
                                    Acciones
                                  </TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {saleLots.map((lot) => (
                                  <>
                                    <TableRow key={lot.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 border-slate-100 dark:border-slate-800">
                                      <TableCell className="pl-6">
                                        <div className="flex items-center gap-2">
                                          <Barcode className="h-4 w-4 text-slate-400 flex-shrink-0" />
                                          <span className="font-mono font-medium text-sm text-slate-700 dark:text-slate-200">
                                            {lot.lot_number}
                                          </span>
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <div className="min-w-0">
                                          <div className="font-medium text-slate-700 dark:text-slate-200 text-sm truncate max-w-[200px]">
                                            {lot.products?.name || "N/A"}
                                          </div>
                                          <div className="text-xs text-slate-500 font-mono mt-0.5">
                                            {lot.products?.code}
                                          </div>
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <Badge variant="outline" className="bg-slate-50 dark:bg-slate-800">
                                          {lot.quantity} unidades
                                        </Badge>
                                      </TableCell>
                                      <TableCell>{getStatusBadge(lot.status, lot.is_archived)}</TableCell>
                                      <TableCell className="hidden md:table-cell">
                                        <div className="text-sm text-slate-600 dark:text-slate-300">
                                          {formatDate(lot.generated_date)}
                                        </div>
                                        {lot.ingress_date && (
                                          <div className="text-xs text-slate-400 mt-0.5">
                                            Ingreso: {formatDate(lot.ingress_date)}
                                          </div>
                                        )}
                                      </TableCell>
                                      <TableCell className="text-right pr-6">
                                        <div className="flex justify-end gap-2">
                                          {lot.status === "pending" && (
                                            <Button
                                              size="sm"
                                              onClick={() => handleStatusChangeClick(lot.id, "in_inventory")}
                                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-lg shadow-sm"
                                            >
                                              Ingresar
                                            </Button>
                                          )}
                                          {lot.status === "in_inventory" && (
                                            <>
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleStatusChangeClick(lot.id, "delivered")}
                                                disabled={!lot.sale_id}
                                                title={
                                                  !lot.sale_id
                                                    ? "El lote debe estar asignado a una venta para entregarlo"
                                                    : ""
                                                }
                                                className={`text-xs rounded-lg ${
                                                  !lot.sale_id
                                                    ? "border-slate-200 text-slate-400 cursor-not-allowed opacity-50"
                                                    : "border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/20"
                                                }`}
                                              >
                                                Entregar
                                              </Button>
                                            </>
                                          )}
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => setExpandedLot(expandedLot === lot.id ? null : lot.id)}
                                            className="text-xs rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                                          >
                                            {expandedLot === lot.id ? "Ocultar" : "Ver Series"}
                                          </Button>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                    {expandedLot === lot.id &&
                                      lot.product_serials &&
                                      lot.product_serials.length > 0 && (
                                        <TableRow className="bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                                          <TableCell colSpan={6} className="p-0 border-b border-slate-200 dark:border-slate-800">
                                            <div className="p-6">
                                              <h4 className="font-semibold mb-4 flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                                                <Hash className="h-4 w-4 text-indigo-500" />
                                                Números de Serie ({lot.product_serials.length})
                                              </h4>
                                              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                                {lot.product_serials.map((serial) => (
                                                  <div
                                                    key={serial.id}
                                                    className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-600 dark:text-slate-300 truncate text-center shadow-sm"
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
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </div>
                    )
                  })
                ) : (
                  <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                     <Search className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                     <p className="text-slate-500 dark:text-slate-400">No se encontraron lotes</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {confirmationContent && (
        <AlertDialog open={confirmDialog.open} onOpenChange={(open) => {
          if (!open) {
            setConfirmDialog({ open: false, lotId: "", newStatus: "", currentLot: null })
          }
        }}>
          <AlertDialogContent className="max-w-md rounded-2xl bg-white dark:bg-slate-900 border-none shadow-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-full">
                   <AlertCircle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                {confirmationContent.title}
              </AlertDialogTitle>
              <AlertDialogDescription className="mt-4 text-slate-600 dark:text-slate-300 whitespace-pre-wrap text-base leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl">
                {confirmationContent.description}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex gap-3 justify-end mt-6">
              <AlertDialogCancel disabled={isUpdating} className="rounded-xl border-slate-200 hover:bg-slate-100 text-slate-600">
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmStatusChange}
                disabled={isUpdating}
                className={`rounded-xl text-white shadow-lg ${
                  confirmDialog.newStatus === "delivered"
                    ? "bg-blue-600 hover:bg-blue-700 shadow-blue-500/20"
                    : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20"
                }`}
              >
                {isUpdating ? "Procesando..." : confirmDialog.newStatus === "delivered" ? "Confirmar Entrega" : "Confirmar Ingreso"}
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </motion.div>
  )
}
