"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Search, TrendingUp, TrendingDown, RotateCcw, FileText, Paperclip, Download } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { MovementFormDialog } from "@/components/warehouse/movement-form-dialog"
import { useCompany } from "@/lib/company-context"
import { useToast } from "@/hooks/use-toast"

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
  const [showMovementForm, setShowMovementForm] = useState(false)

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

  const AttachmentsList = ({ movementId }: { movementId: string }) => {
    const movementAttachments = attachments[movementId] || []

    if (movementAttachments.length === 0) return null

    return (
      <div className="mt-2 space-y-1">
        <p className="text-xs text-muted-foreground font-medium">Documentos adjuntos ({movementAttachments.length}):</p>
        {movementAttachments.map((attachment) => (
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
              className="h-6 w-6 p-0"
              onClick={() => window.open(attachment.file_url, "_blank")}
              title="Descargar archivo"
            >
              <Download className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
    )
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
        <Button onClick={() => setShowMovementForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Movimiento
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Historial de Movimientos
          </CardTitle>
          <CardDescription>
            {filteredMovements.length} de {movements.length} movimientos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar por producto, orden, entidad..."
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
                  <TableHead>Precio/Total</TableHead>
                  <TableHead>Detalles</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Adjuntos</TableHead>
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
                        {movement.movement_type === "salida" && movement.sale_price ? (
                          <div>
                            <div className="text-sm">Precio: {formatCurrency(movement.sale_price)}</div>
                            <div className="font-medium text-green-600">
                              Total: {formatCurrency(movement.total_amount)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm space-y-1">
                          {movement.purchase_order_number && (
                            <div>
                              <span className="font-medium">OC:</span> {movement.purchase_order_number}
                            </div>
                          )}
                          {movement.destination_entity_name && (
                            <div>
                              <span className="font-medium">Cliente:</span> {movement.destination_entity_name}
                            </div>
                          )}
                          {movement.peru_departments?.name && (
                            <div>
                              <span className="font-medium">Destino:</span> {movement.peru_departments.name}
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
                        <AttachmentsList movementId={movement.id} />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
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
    </div>
  )
}
