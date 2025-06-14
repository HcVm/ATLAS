"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Search, TrendingUp, TrendingDown, RotateCcw, FileText } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import Link from "next/link"
import { MovementFormDialog } from "@/components/warehouse/movement-form-dialog"

interface InventoryMovement {
  id: string
  movement_type: string
  quantity: number
  unit_cost: number | null
  total_cost: number | null
  reference_document: string | null
  destination: string | null
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
}

export default function InventoryPage() {
  const { user } = useAuth()
  const [movements, setMovements] = useState<InventoryMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [movementTypeFilter, setMovementTypeFilter] = useState<string>("all")
  const [dateFilter, setDateFilter] = useState<string>("all")

  useEffect(() => {
    if (user?.company_id) {
      fetchMovements()
    }
  }, [user?.company_id])

  const fetchMovements = async () => {
    if (!user?.company_id) return

    try {
      setLoading(true)

      const { data, error } = await supabase
        .from("inventory_movements")
        .select(`
          id,
          movement_type,
          quantity,
          unit_cost,
          total_cost,
          reference_document,
          destination,
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
          )
        `)
        .eq("company_id", user.company_id)
        .order("movement_date", { ascending: false })
        .limit(100)

      if (error) throw error

      setMovements(data || [])
    } catch (error) {
      console.error("Error fetching movements:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredMovements = movements.filter((movement) => {
    const matchesSearch =
      movement.products?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      movement.products?.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      movement.reference_document?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      movement.destination?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      movement.supplier?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesType = movementTypeFilter === "all" || movement.movement_type === movementTypeFilter

    const now = new Date()
    const movementDate = new Date(movement.movement_date)
    let matchesDate = true

    if (dateFilter === "today") {
      matchesDate = movementDate.toDateString() === now.toDateString()
    } else if (dateFilter === "week") {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      matchesDate = movementDate >= weekAgo
    } else if (dateFilter === "month") {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      matchesDate = movementDate >= monthAgo
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
          <Badge variant="default" className="bg-green-100 text-green-800">
            Entrada
          </Badge>
        )
      case "salida":
        return <Badge variant="destructive">Salida</Badge>
      case "ajuste":
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            Ajuste
          </Badge>
        )
      default:
        return <Badge variant="outline">{type}</Badge>
    }
  }

  const [showMovementForm, setShowMovementForm] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<any>(null)

  const handleCreateMovement = async (movementData: any) => {
    try {
      const { error } = await supabase.from("inventory_movements").insert({
        ...movementData,
        company_id: user.company_id,
        created_by: user.id,
        movement_date: new Date().toISOString(),
      })

      if (error) throw error

      // Recargar movimientos
      fetchMovements()
      setShowMovementForm(false)
      setSelectedProduct(null)
    } catch (error) {
      console.error("Error creating movement:", error)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Movimientos de Inventario</h1>
            <p className="text-muted-foreground">Historial de entradas, salidas y ajustes</p>
          </div>
          <Button disabled>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Movimiento
          </Button>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">Cargando movimientos...</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Movimientos de Inventario</h1>
          <p className="text-muted-foreground">Historial de entradas, salidas y ajustes de inventario</p>
        </div>
        <Button asChild>
          <Link href="/warehouse/inventory/new">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Movimiento
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="flex items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Historial de Movimientos
            </CardTitle>
            <CardDescription>
              {filteredMovements.length} de {movements.length} movimientos
            </CardDescription>
          </div>
          <Button onClick={() => setShowMovementForm(true)} className="ml-2">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Movimiento
          </Button>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar por producto, documento, destino..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={movementTypeFilter} onValueChange={setMovementTypeFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Tipo de movimiento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="entrada">Entradas</SelectItem>
                <SelectItem value="salida">Salidas</SelectItem>
                <SelectItem value="ajuste">Ajustes</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-full sm:w-48">
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

          {/* Tabla de movimientos */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Costo</TableHead>
                  <TableHead>Detalles</TableHead>
                  <TableHead>Usuario</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMovements.length > 0 ? (
                  filteredMovements.map((movement) => (
                    <TableRow key={movement.id}>
                      <TableCell>
                        <div className="text-sm">{formatDate(movement.movement_date)}</div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{movement.products?.name || "Producto eliminado"}</div>
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
                        <div className="font-medium">
                          {movement.movement_type === "entrada" ? "+" : movement.movement_type === "salida" ? "-" : "±"}
                          {movement.quantity} {movement.products?.unit_of_measure}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="text-sm">Unit: {formatCurrency(movement.unit_cost)}</div>
                          <div className="font-medium">Total: {formatCurrency(movement.total_cost)}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm space-y-1">
                          {movement.reference_document && (
                            <div>
                              <span className="font-medium">Doc:</span> {movement.reference_document}
                            </div>
                          )}
                          {movement.destination && (
                            <div>
                              <span className="font-medium">Destino:</span> {movement.destination}
                            </div>
                          )}
                          {movement.supplier && (
                            <div>
                              <span className="font-medium">Proveedor:</span> {movement.supplier}
                            </div>
                          )}
                          {movement.reason && (
                            <div>
                              <span className="font-medium">Motivo:</span> {movement.reason}
                            </div>
                          )}
                          {movement.notes && <div className="text-muted-foreground">{movement.notes}</div>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{movement.profiles?.full_name || "Usuario eliminado"}</div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
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
        <MovementFormDialog
          open={showMovementForm}
          onClose={() => {
            setShowMovementForm(false)
            setSelectedProduct(null)
          }}
          onSubmit={handleCreateMovement}
          selectedProduct={selectedProduct}
        />
      )}
    </div>
  )
}
