"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Plus,
  Search,
  Package,
  MoreHorizontal,
  Eye,
  Filter,
  Download,
  TrendingUp,
  TrendingDown,
  Activity,
  Paperclip,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { useCompany } from "@/lib/company-context"
import { toast } from "sonner"
import { MovementFormDialog } from "@/components/warehouse/movement-form-dialog"
import { MovementAttachmentsDialog } from "@/components/warehouse/movement-attachments-dialog"

interface InventoryMovement {
  id: string
  movement_type: "entrada" | "salida" | "ajuste"
  quantity: number
  movement_date: string
  sale_price: number | null
  total_amount: number | null
  purchase_order_number: string | null
  destination_entity_name: string | null
  destination_address: string | null
  supplier: string | null
  reason: string | null
  notes: string | null
  created_at: string
  products?: {
    id: string
    name: string
    code: string
    unit_of_measure: string
    current_stock: number
  } | null
  profiles?: {
    full_name: string
  } | null
  peru_departments?: {
    name: string
  } | null
}

export default function InventoryPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { selectedCompany } = useCompany()
  const [movements, setMovements] = useState<InventoryMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filteredMovements, setFilteredMovements] = useState<InventoryMovement[]>([])
  const [showMovementDialog, setShowMovementDialog] = useState(false)
  const [showAttachmentsDialog, setShowAttachmentsDialog] = useState(false)
  const [selectedMovement, setSelectedMovement] = useState<InventoryMovement | null>(null)

  useEffect(() => {
    if (selectedCompany) {
      fetchMovements()
    }
  }, [selectedCompany])

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredMovements(movements)
    } else {
      const filtered = movements.filter(
        (movement) =>
          movement.products?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          movement.products?.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          movement.destination_entity_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          movement.supplier?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          movement.purchase_order_number?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
      setFilteredMovements(filtered)
    }
  }, [searchTerm, movements])

  const fetchMovements = async () => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from("inventory_movements")
        .select(`
          id, movement_type, quantity, movement_date, sale_price, total_amount,
          purchase_order_number, destination_entity_name, destination_address,
          supplier, reason, notes, created_at,
          products (id, name, code, unit_of_measure, current_stock),
          profiles:created_by (full_name),
          peru_departments:destination_department_id (name)
        `)
        .eq("company_id", selectedCompany?.id)
        .order("created_at", { ascending: false })
        .limit(100)

      if (error) throw error

      setMovements(data || [])
    } catch (error: any) {
      console.error("Error fetching movements:", error)
      toast.error("Error al cargar movimientos de inventario")
    } finally {
      setLoading(false)
    }
  }

  const handleMovementCreated = async (movementData: any) => {
    try {
      const { data, error } = await supabase
        .from("inventory_movements")
        .insert([movementData])
        .select(`
          id, movement_type, quantity, movement_date, sale_price, total_amount,
          purchase_order_number, destination_entity_name, destination_address,
          supplier, reason, notes, created_at,
          products (id, name, code, unit_of_measure, current_stock),
          profiles:created_by (full_name),
          peru_departments:destination_department_id (name)
        `)
        .single()

      if (error) throw error

      // Actualizar el stock del producto
      if (movementData.movement_type === "entrada") {
        await supabase.rpc("increment_product_stock", {
          product_id: movementData.product_id,
          quantity: movementData.quantity,
        })
      } else if (movementData.movement_type === "salida") {
        await supabase.rpc("decrement_product_stock", {
          product_id: movementData.product_id,
          quantity: movementData.quantity,
        })
      } else if (movementData.movement_type === "ajuste") {
        await supabase
          .from("products")
          .update({ current_stock: movementData.quantity })
          .eq("id", movementData.product_id)
      }

      toast.success("Movimiento de inventario creado exitosamente")
      await fetchMovements()
      return data // Retornar el movimiento creado para que el diálogo pueda usar su ID
    } catch (error: any) {
      console.error("Error creating movement:", error)
      throw error
    }
  }

  const getMovementIcon = (type: string) => {
    switch (type) {
      case "entrada":
        return <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
      case "salida":
        return <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
      case "ajuste":
        return <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      default:
        return <Package className="h-4 w-4 text-muted-foreground dark:text-muted-foreground" />
    }
  }

  const getMovementBadgeVariant = (type: string) => {
    switch (type) {
      case "entrada":
        return "default"
      case "salida":
        return "destructive"
      case "ajuste":
        return "secondary"
      default:
        return "outline"
    }
  }

  const formatCurrency = (amount: number | null) => {
    if (!amount) return "-"
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "PEN",
    }).format(amount)
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

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-96" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="border-border/50 dark:border-border/50">
                <CardContent className="p-6">
                  <Skeleton className="h-16 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
          <Card className="shadow-lg border-border/50 dark:border-border/50">
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const totalEntradas = movements.filter((m) => m.movement_type === "entrada").length
  const totalSalidas = movements.filter((m) => m.movement_type === "salida").length
  const totalAjustes = movements.filter((m) => m.movement_type === "ajuste").length

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 dark:bg-primary/20 rounded-lg">
              <Package className="h-6 w-6 text-primary dark:text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-700 via-slate-600 to-slate-500 dark:from-slate-200 dark:via-slate-100 dark:to-slate-200 bg-clip-text text-transparent">
                Movimientos de Inventario
              </h1>
              <p className="text-slate-600 dark:text-slate-300">
                Historial de entradas, salidas y ajustes de {selectedCompany?.name}
              </p>
            </div>
          </div>
          <Button
            onClick={() => setShowMovementDialog(true)}
            className="bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 dark:from-slate-600 dark:to-slate-700 dark:hover:from-slate-700 dark:hover:to-slate-800 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Movimiento
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-700/50 border-slate-200/60 dark:border-slate-700/60 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground dark:text-muted-foreground">Entradas</p>
                  <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{totalEntradas}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-700/50 border-slate-200/60 dark:border-slate-700/60 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground dark:text-muted-foreground">Salidas</p>
                  <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{totalSalidas}</p>
                </div>
                <TrendingDown className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-700/50 border-slate-200/60 dark:border-slate-700/60 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground dark:text-muted-foreground">Ajustes</p>
                  <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{totalAjustes}</p>
                </div>
                <Activity className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6 bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-700/50 border-slate-200/60 dark:border-slate-700/60 shadow-lg">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground dark:text-muted-foreground" />
                <Input
                  placeholder="Buscar por producto, entidad, proveedor u orden..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-background dark:bg-background border-slate-300 dark:border-slate-600 focus:border-slate-500 dark:focus:border-slate-400 focus:ring-slate-500/20 dark:focus:ring-slate-400/20"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="border-border dark:border-border">
                  <Filter className="h-4 w-4 mr-2" />
                  Filtros
                </Button>
                <Button variant="outline" size="sm" className="border-border dark:border-border">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Movements Table */}
        <Card className="shadow-lg bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-700/50 border-slate-200/60 dark:border-slate-700/60">
          <CardHeader className="border-b border-border/50 dark:border-border/50">
            <CardTitle className="text-slate-800 dark:text-slate-100">
              Historial de Movimientos ({filteredMovements.length})
            </CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-300">
              Últimos movimientos de inventario registrados
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {filteredMovements.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-muted-foreground dark:text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-card-foreground dark:text-card-foreground mb-2">
                  {searchTerm ? "No se encontraron movimientos" : "No hay movimientos registrados"}
                </h3>
                <p className="text-slate-600 dark:text-muted-foreground mb-4">
                  {searchTerm
                    ? "Intenta con otros términos de búsqueda"
                    : "Comienza registrando tu primer movimiento de inventario"}
                </p>
                {!searchTerm && (
                  <Button onClick={() => setShowMovementDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Registrar Movimiento
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50 dark:border-border/50">
                      <TableHead className="text-muted-foreground dark:text-muted-foreground">Tipo</TableHead>
                      <TableHead className="text-muted-foreground dark:text-muted-foreground">Producto</TableHead>
                      <TableHead className="text-muted-foreground dark:text-muted-foreground">Cantidad</TableHead>
                      <TableHead className="text-muted-foreground dark:text-muted-foreground">Detalles</TableHead>
                      <TableHead className="text-muted-foreground dark:text-muted-foreground">Monto</TableHead>
                      <TableHead className="text-muted-foreground dark:text-muted-foreground">Fecha</TableHead>
                      <TableHead className="text-muted-foreground dark:text-muted-foreground">Usuario</TableHead>
                      <TableHead className="text-muted-foreground dark:text-muted-foreground">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMovements.map((movement) => (
                      <TableRow
                        key={movement.id}
                        className="border-border/50 dark:border-border/50 hover:bg-slate-50/50 dark:hover:bg-slate-700/50"
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getMovementIcon(movement.movement_type)}
                            <Badge variant={getMovementBadgeVariant(movement.movement_type)}>
                              {movement.movement_type.charAt(0).toUpperCase() + movement.movement_type.slice(1)}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-slate-800 dark:text-slate-100">
                              {movement.products?.name || "Producto eliminado"}
                            </p>
                            <p className="text-sm text-slate-600 dark:text-slate-300">
                              {movement.products?.code || "N/A"}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-slate-800 dark:text-slate-100">
                            <span
                              className={
                                movement.movement_type === "entrada"
                                  ? "text-green-600 dark:text-green-400"
                                  : movement.movement_type === "salida"
                                    ? "text-red-600 dark:text-red-400"
                                    : "text-blue-600 dark:text-blue-400"
                              }
                            >
                              {movement.movement_type === "entrada"
                                ? "+"
                                : movement.movement_type === "salida"
                                  ? "-"
                                  : "±"}
                              {movement.quantity}
                            </span>{" "}
                            {movement.products?.unit_of_measure || "unidades"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {movement.movement_type === "salida" && movement.destination_entity_name && (
                              <p className="text-slate-800 dark:text-slate-100">
                                <strong>Cliente:</strong> {movement.destination_entity_name}
                              </p>
                            )}
                            {movement.movement_type === "salida" && movement.purchase_order_number && (
                              <p className="text-slate-600 dark:text-slate-300">
                                <strong>OC:</strong> {movement.purchase_order_number}
                              </p>
                            )}
                            {movement.movement_type === "entrada" && movement.supplier && (
                              <p className="text-slate-800 dark:text-slate-100">
                                <strong>Proveedor:</strong> {movement.supplier}
                              </p>
                            )}
                            {movement.movement_type === "ajuste" && movement.reason && (
                              <p className="text-slate-800 dark:text-slate-100">
                                <strong>Motivo:</strong> {movement.reason}
                              </p>
                            )}
                            {movement.peru_departments?.name && (
                              <p className="text-slate-600 dark:text-slate-300">
                                <strong>Destino:</strong> {movement.peru_departments.name}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-slate-800 dark:text-slate-100">
                          {formatCurrency(movement.total_amount)}
                        </TableCell>
                        <TableCell className="text-slate-800 dark:text-slate-100">
                          {formatDate(movement.movement_date)}
                        </TableCell>
                        <TableCell className="text-slate-800 dark:text-slate-100">
                          {movement.profiles?.full_name || "Usuario eliminado"}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                className="h-8 w-8 p-0 hover:bg-slate-100 dark:hover:bg-slate-600"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="bg-popover dark:bg-popover border-border dark:border-border"
                            >
                              <DropdownMenuLabel className="text-popover-foreground dark:text-popover-foreground">
                                Acciones
                              </DropdownMenuLabel>
                              <DropdownMenuSeparator className="bg-border dark:bg-border" />
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedMovement(movement)
                                  setShowAttachmentsDialog(true)
                                }}
                                className="text-popover-foreground dark:text-popover-foreground hover:bg-accent dark:hover:bg-accent"
                              >
                                <Paperclip className="h-4 w-4 mr-2" />
                                Ver archivos adjuntos
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => router.push(`/warehouse/inventory/${movement.id}`)}
                                className="text-popover-foreground dark:text-popover-foreground hover:bg-accent dark:hover:bg-accent"
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Ver detalles
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Movement Form Dialog */}
        <MovementFormDialog
          open={showMovementDialog}
          onClose={() => setShowMovementDialog(false)}
          onSubmit={handleMovementCreated}
        />

        {/* Attachments Dialog */}
        {selectedMovement && (
          <MovementAttachmentsDialog
            open={showAttachmentsDialog}
            onClose={() => {
              setShowAttachmentsDialog(false)
              setSelectedMovement(null)
            }}
            movementId={selectedMovement.id}
            movementInfo={selectedMovement}
          />
        )}
      </div>
    </div>
  )
}
