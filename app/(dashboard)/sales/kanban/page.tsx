"use client"

import type React from "react"

import { useState, useEffect, useCallback, useMemo, memo } from "react"
import { useAuth } from "@/lib/auth-context"
import { useCompany } from "@/lib/company-context"
import { useRoleAccess } from "@/hooks/use-role-access"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertTriangle,
  Package,
  DollarSign,
  Clock,
  CheckCircle,
  Truck,
  ArrowRight,
  Eye,
  Edit,
  Info,
  Calendar,
  User,
  MapPin,
  Package2,
  Maximize2,
} from "lucide-react"
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd"

interface Delivery {
  id: string
  sale_id: string
  delivery_status: string
  tracking_number?: string | null
  estimated_delivery_date?: string | null
  actual_delivery_date?: string | null
  notes?: string | null
  assigned_to?: string | null
  created_at: string
  updated_at: string
  sales: {
    id: string
    sale_number?: string
    sale_date: string
    entity_name: string
    entity_ruc: string
    quotation_code: string
    total_sale: number
    sale_status: string
    ocam?: string | null
    is_multi_product?: boolean
    items_count?: number
    final_destination?: string | null
    profiles?: {
      full_name: string
    }
    sale_items?: {
      product_name: string
      product_brand?: string | null
      product_code?: string | null // agregando product_code al tipo
      product_description?: string | null
      quantity: number
    }[]
  }
  assigned_user?: {
    full_name: string
  }
}

interface KanbanColumn {
  id: string
  title: string
  deliveryStatus: string
  color: string
  icon: React.ComponentType<any>
  deliveries: Delivery[]
}

const KANBAN_COLUMNS: Omit<KanbanColumn, "deliveries">[] = [
  {
    id: "entrega-pendiente",
    title: "Entrega Pendiente",
    deliveryStatus: "pending",
    color: "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800",
    icon: Clock,
  },
  {
    id: "en-preparacion",
    title: "En Preparación",
    deliveryStatus: "preparing",
    color: "bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800",
    icon: Package,
  },
  {
    id: "enviado",
    title: "Enviado",
    deliveryStatus: "shipped",
    color: "bg-purple-50 border-purple-200 dark:bg-purple-950/20 dark:border-purple-800",
    icon: Truck,
  },
  {
    id: "entregado",
    title: "Entregado",
    deliveryStatus: "delivered",
    color: "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800",
    icon: CheckCircle,
  },
]

const DeliveryDetailsDialog = memo(
  ({
    delivery,
    open,
    onClose,
  }: {
    delivery: Delivery | null
    open: boolean
    onClose: () => void
  }) => {
    if (!delivery) return null

    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles Completos de Entrega</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Información de la venta */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Información de la Venta</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Número de Venta</p>
                  <p className="font-medium">#{delivery.sales.sale_number || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Fecha de Venta</p>
                  <p className="font-medium">
                    {format(new Date(delivery.sales.sale_date), "dd/MM/yyyy", { locale: es })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cliente</p>
                  <p className="font-medium">{delivery.sales.entity_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">RUC</p>
                  <p className="font-medium">{delivery.sales.entity_ruc}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="font-medium">
                    S/ {delivery.sales.total_sale.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Estado de Venta</p>
                  <Badge variant="outline">{delivery.sales.sale_status}</Badge>
                </div>
              </div>
              {delivery.sales.ocam && (
                <div>
                  <p className="text-sm text-muted-foreground">OCAM</p>
                  <Badge variant="outline" className="bg-orange-50 border-orange-200 text-orange-700">
                    {delivery.sales.ocam}
                  </Badge>
                </div>
              )}
            </div>

            {delivery.sales.final_destination && (
              <div className="space-y-2">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Dirección de Entrega
                </h3>
                <p className="text-sm bg-muted p-3 rounded-lg">{delivery.sales.final_destination}</p>
              </div>
            )}

            {/* Productos */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Package2 className="h-4 w-4" />
                Productos ({delivery.sales.sale_items?.length || 0})
              </h3>
              <div className="space-y-2">
                {delivery.sales.sale_items?.map((item, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{item.product_name}</p>
                      {item.product_code && (
                        <p className="text-sm text-muted-foreground">
                          Código: <span className="font-mono bg-background px-1 rounded">{item.product_code}</span>
                        </p>
                      )}
                      {item.product_brand && (
                        <p className="text-sm text-muted-foreground">Marca: {item.product_brand}</p>
                      )}
                      {item.product_description && (
                        <p className="text-sm text-muted-foreground">{item.product_description}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">Cantidad: {item.quantity}</p>
                    </div>
                  </div>
                )) || <p className="text-muted-foreground text-center py-4">No hay productos registrados</p>}
              </div>
            </div>

            {/* Información de entrega */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Información de Entrega</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Estado</p>
                  <Badge variant="secondary">{delivery.delivery_status}</Badge>
                </div>
                {delivery.tracking_number && (
                  <div>
                    <p className="text-sm text-muted-foreground">Tracking</p>
                    <p className="font-mono text-sm">{delivery.tracking_number}</p>
                  </div>
                )}
                {delivery.estimated_delivery_date && (
                  <div>
                    <p className="text-sm text-muted-foreground">Fecha Estimada</p>
                    <p className="font-medium">
                      {format(new Date(delivery.estimated_delivery_date), "dd/MM/yyyy", { locale: es })}
                    </p>
                  </div>
                )}
                {delivery.actual_delivery_date && (
                  <div>
                    <p className="text-sm text-muted-foreground">Fecha de Entrega</p>
                    <p className="font-medium text-green-600">
                      {format(new Date(delivery.actual_delivery_date), "dd/MM/yyyy", { locale: es })}
                    </p>
                  </div>
                )}
                {delivery.assigned_user?.full_name && (
                  <div>
                    <p className="text-sm text-muted-foreground">Asignado a</p>
                    <p className="font-medium">{delivery.assigned_user.full_name}</p>
                  </div>
                )}
              </div>
              {delivery.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Notas</p>
                  <p className="text-sm bg-muted p-3 rounded-lg">{delivery.notes}</p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  },
)

const DeliveryCard = memo(
  ({
    delivery,
    index,
    canEditDeliveryStatus,
    getProductDisplayName,
    canViewAllSales,
    onEditDelivery,
    onViewDetails,
  }: {
    delivery: Delivery
    index: number
    canEditDeliveryStatus: boolean
    getProductDisplayName: (delivery: Delivery) => string
    canViewAllSales: boolean
    onEditDelivery: (delivery: Delivery) => void
    onViewDetails: (delivery: Delivery) => void
  }) => {
    const isDelivered = delivery.delivery_status === "delivered"

    return (
      <Draggable key={delivery.id} draggableId={delivery.id} index={index} isDragDisabled={!canEditDeliveryStatus}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={`board-card mb-3 rounded-lg border transition-all duration-200 ease-out will-change-transform ${
              snapshot.isDragging
                ? "shadow-2xl scale-105 z-50 bg-background/95 backdrop-blur-sm border-primary/50"
                : "hover:shadow-lg hover:scale-[1.02]"
            } ${!canEditDeliveryStatus ? "cursor-default" : "cursor-grab active:cursor-grabbing"} ${
              isDelivered ? "p-3" : "p-4"
            }`}
            style={provided.draggableProps.style}
          >
            {isDelivered ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm text-foreground">
                      Venta #{delivery.sales.sale_number || "N/A"}
                    </h4>
                    <p className="text-xs text-muted-foreground truncate">{delivery.sales.entity_name}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="secondary" className="text-xs">
                      {format(new Date(delivery.sales.sale_date), "dd/MM", { locale: es })}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 hover:bg-primary/10 transition-colors"
                      onClick={() => onViewDetails(delivery)}
                    >
                      <Maximize2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm font-semibold text-foreground">
                      S/ {delivery.sales.total_sale.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  {delivery.actual_delivery_date && (
                    <div className="text-xs text-green-600 font-medium">
                      {format(new Date(delivery.actual_delivery_date), "dd/MM/yy", { locale: es })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-sm text-foreground">
                      Venta #{delivery.sales.sale_number || "N/A"}
                    </h4>
                    {delivery.sales.ocam && (
                      <Badge
                        variant="outline"
                        className="text-xs mt-1 bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-950/20 dark:border-orange-800 dark:text-orange-300 font-bold"
                      >
                        OCAM: {delivery.sales.ocam}
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant="secondary" className="text-xs">
                      {format(new Date(delivery.sales.sale_date), "dd/MM", { locale: es })}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {delivery.sales.sale_status}
                    </Badge>
                    {canEditDeliveryStatus && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-primary/10 transition-colors"
                        onClick={() => onEditDelivery(delivery)}
                      >
                        <Info className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-foreground truncate" title={delivery.sales.entity_name}>
                    {delivery.sales.entity_name}
                  </p>
                  <p className="text-xs text-muted-foreground">RUC: {delivery.sales.entity_ruc}</p>
                </div>

                {delivery.sales.final_destination && (
                  <div>
                    <div className="flex items-center gap-1 mb-1">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">Dirección:</p>
                    </div>
                    <p className="text-sm truncate" title={delivery.sales.final_destination}>
                      {delivery.sales.final_destination}
                    </p>
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <Package2 className="h-3 w-3 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Productos:</p>
                  </div>
                  {delivery.sales.sale_items && delivery.sales.sale_items.length > 0 ? (
                    <div className="space-y-1">
                      {delivery.sales.is_multi_product &&
                      delivery.sales.items_count &&
                      delivery.sales.items_count > 1 ? (
                        <div>
                          <p className="text-sm font-medium">{delivery.sales.items_count} productos diferentes</p>
                          <div className="text-xs text-muted-foreground space-y-0.5">
                            {delivery.sales.sale_items.slice(0, 3).map((item, index) => (
                              <p key={index}>
                                • {item.product_name} (x{item.quantity})
                                {item.product_code && (
                                  <span className="ml-1 font-mono text-xs bg-muted px-1 rounded">
                                    {item.product_code}
                                  </span>
                                )}
                              </p>
                            ))}
                            {delivery.sales.sale_items.length > 3 && (
                              <p>• +{delivery.sales.sale_items.length - 3} productos más</p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm truncate" title={delivery.sales.sale_items[0].product_name}>
                            {delivery.sales.sale_items[0].product_name}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>Cantidad: {delivery.sales.sale_items[0].quantity}</span>
                            {delivery.sales.sale_items[0].product_code && (
                              <span className="font-mono bg-muted px-1 rounded">
                                {delivery.sales.sale_items[0].product_code}
                              </span>
                            )}
                            {delivery.sales.sale_items[0].product_brand && (
                              <span>• {delivery.sales.sale_items[0].product_brand}</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Sin productos</p>
                  )}
                </div>

                {delivery.tracking_number && (
                  <div>
                    <p className="text-xs text-muted-foreground">Tracking:</p>
                    <p className="text-sm font-mono">{delivery.tracking_number}</p>
                  </div>
                )}

                {delivery.estimated_delivery_date && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Est: {format(new Date(delivery.estimated_delivery_date), "dd/MM/yy", { locale: es })}
                    </span>
                  </div>
                )}

                {delivery.assigned_user?.full_name && (
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Asignado: {delivery.assigned_user.full_name}</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm font-semibold text-foreground">
                      S/ {delivery.sales.total_sale.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {canViewAllSales && delivery.sales.profiles?.full_name && (
                  <div className="text-xs text-muted-foreground">Vendedor: {delivery.sales.profiles.full_name}</div>
                )}
              </div>
            )}
          </div>
        )}
      </Draggable>
    )
  },
)

export default function SalesKanbanPage() {
  const { user } = useAuth()
  const { selectedCompany } = useCompany()
  const { canSupervise } = useRoleAccess()
  const [columns, setColumns] = useState<KanbanColumn[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null)
  const [editingDelivery, setEditingDelivery] = useState<Partial<Delivery>>({})
  const [isDragging, setIsDragging] = useState(false)
  const [viewingDelivery, setViewingDelivery] = useState<Delivery | null>(null)

  const companyToUse = useMemo(() => {
  if (user?.role === "admin") {
    return selectedCompany
  }
  if (user?.company_id) {
    return { id: user.company_id, name: user.company_name }
  }
  return null
}, [user?.role, user?.company_id, user?.company_name, selectedCompany])

  const hasSalesAccess = useMemo(() => 
    user?.role === "admin" ||
    user?.role === "supervisor" ||
    ["Ventas", "Administración", "Operaciones", "Jefatura de Ventas", "Contabilidad"].includes(user?.departments?.name ?? ""),
  [user?.role, user?.departments?.name])
  
  const canViewAllSales = useMemo(() => 
    user?.role === "admin" ||
    user?.role === "supervisor" ||
    ["Administración", "Operaciones", "Jefatura de Ventas", "Contabilidad"].includes(user?.departments?.name ?? ""),
  [user?.role, user?.departments?.name])

  const canEditDeliveryStatus = canSupervise

  const fetchDeliveries = useCallback(async () => {
    if (!companyToUse) return
    try {
      setLoading(true)
      let query = supabase
        .from("deliveries")
        .select(`
          id, sale_id, delivery_status, tracking_number, estimated_delivery_date, 
          actual_delivery_date, notes, assigned_to, created_at, updated_at,
          sales!inner (
            id, sale_number, sale_date, entity_name, entity_ruc, quotation_code,
            total_sale, sale_status, ocam, company_id, is_multi_product, items_count,
            final_destination,
            profiles!sales_created_by_fkey (full_name),
            sale_items (product_name, product_brand, product_code, product_description, quantity)
          ),
          assigned_user:profiles!deliveries_assigned_to_fkey (full_name)
        `)
        .eq("sales.company_id", companyToUse.id)

      if (!canViewAllSales && user?.id) {
        query = query.eq("sales.created_by", user.id)
      }

      const { data, error } = await query.order("created_at", { ascending: false })
      if (error) throw error

      const organizedColumns = KANBAN_COLUMNS.map((col) => ({
        ...col,
        deliveries: (data || []).filter((delivery) => delivery.delivery_status === col.deliveryStatus),
      }))

      setColumns(organizedColumns)
    } catch (error: any) {
      toast.error("Error al cargar las entregas: " + error.message)
    } finally {
      setLoading(false)
    }
  }, [companyToUse, canViewAllSales, user?.id])

  useEffect(() => {
    if (companyToUse && hasSalesAccess) {
      fetchDeliveries()
    } else {
      setLoading(false)
      setColumns([])
    }
  }, [companyToUse, hasSalesAccess, fetchDeliveries])

  const handleDragEnd = useCallback(
    async (result: DropResult) => {
      if (!canEditDeliveryStatus) {
        toast.error("Solo los supervisores pueden mover las entregas")
        return
      }

      const { destination, source, draggableId } = result
      setIsDragging(false)

      if (!destination) return
      if (destination.droppableId === source.droppableId && destination.index === source.index) return

      const originalColumns = columns
      
      setColumns(prevColumns => {
        const sourceCol = prevColumns.find(c => c.id === source.droppableId);
        const destCol = prevColumns.find(c => c.id === destination.droppableId);
        if (!sourceCol || !destCol) return prevColumns;

        const movedItem = sourceCol.deliveries.find(d => d.id === draggableId);
        if (!movedItem) return prevColumns;

        const newSourceDeliveries = sourceCol.deliveries.filter(d => d.id !== draggableId);
        const newDestDeliveries = [...destCol.deliveries];
        newDestDeliveries.splice(destination.index, 0, {
          ...movedItem,
          delivery_status: destCol.deliveryStatus,
        });

        return prevColumns.map(col => {
          if (col.id === source.droppableId) return { ...col, deliveries: newSourceDeliveries };
          if (col.id === destination.droppableId) return { ...col, deliveries: newDestDeliveries };
          return col;
        });
      });

      const destColumnInfo = KANBAN_COLUMNS.find(c => c.id === destination.droppableId);
      if(!destColumnInfo) return;

      try {
        const updateData: any = { delivery_status: destColumnInfo.deliveryStatus, updated_at: new Date().toISOString() };
        if (destColumnInfo.deliveryStatus === "delivered") {
          updateData.actual_delivery_date = new Date().toISOString();
        }
        const { error } = await supabase.from("deliveries").update(updateData).eq("id", draggableId);
        if (error) throw error;
        toast.success(`Entrega movida a ${destColumnInfo.title}`);
      } catch (error: any) {
        setColumns(originalColumns);
        toast.error("Error al actualizar el estado: " + error.message);
      }
    },
    [canEditDeliveryStatus, columns],
  )

  const handleDragStart = useCallback(() => {
    setIsDragging(true)
  }, [])

  const handleUpdateDelivery = useCallback(async () => {
    if (!selectedDelivery || !canEditDeliveryStatus) return
    try {
      const { error } = await supabase
        .from("deliveries")
        .update({
          tracking_number: editingDelivery.tracking_number,
          estimated_delivery_date: editingDelivery.estimated_delivery_date,
          notes: editingDelivery.notes,
          assigned_to: editingDelivery.assigned_to,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedDelivery.id)

      if (error) throw error

      toast.success("Entrega actualizada correctamente")
      setSelectedDelivery(null)
      setEditingDelivery({})

      fetchDeliveries()

    } catch (error: any) {
      toast.error("Error al actualizar la entrega: " + error.message)
    }
  }, [selectedDelivery, canEditDeliveryStatus, editingDelivery, fetchDeliveries])

  const getProductDisplayName = useCallback((delivery: Delivery): string => {
    if (!delivery.sales.sale_items || delivery.sales.sale_items.length === 0) {
      return "Sin productos"
    }

    if (delivery.sales.is_multi_product && delivery.sales.items_count && delivery.sales.items_count > 1) {
      return `${delivery.sales.items_count} productos`
    }

    const firstItem = delivery.sales.sale_items[0]
    return firstItem.product_name || "Producto sin nombre"
  }, [])

  const handleEditDelivery = useCallback((delivery: Delivery) => {
    setSelectedDelivery(delivery)
    setEditingDelivery({
      tracking_number: delivery.tracking_number || "",
      estimated_delivery_date: delivery.estimated_delivery_date || "",
      notes: delivery.notes || "",
      assigned_to: delivery.assigned_to || "",
    })
  }, [])

  const handleViewDetails = useCallback((delivery: Delivery) => {
    setViewingDelivery(delivery)
  }, [])

  const memoizedColumns = useMemo(() => columns, [columns])

  if (!hasSalesAccess || !companyToUse) {
    return (
      <div className="flex items-center justify-center h-screen p-4">
        <Card className="w-full max-w-md text-center p-6">
          <CardHeader>
            <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
            <CardTitle className="mt-4 text-2xl">Acceso Denegado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              {!hasSalesAccess
                ? "No tienes los permisos necesarios para acceder a esta página."
                : "Por favor, selecciona una empresa para continuar."}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-4 md:p-6 animate-pulse">
        <div className="h-10 bg-gray-200 rounded w-1/3 mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-96 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground/80 to-foreground/60 bg-clip-text text-transparent">
            Tablero de Entregas
          </h1>
          <p className="text-muted-foreground">
            Gestión visual del estado de entregas de:{" "}
            <span className="font-semibold text-foreground">{companyToUse?.name || "N/A"}</span>
            {!canViewAllSales && <span className="ml-2 text-sm text-orange-600 font-medium">(Solo tus ventas)</span>}
          </p>
          <div className="flex items-center gap-2 mt-2">
            {canEditDeliveryStatus ? (
              <Badge variant="default" className="text-xs">
                <Edit className="h-3 w-3 mr-1" />
                Modo Edición
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                <Eye className="h-3 w-3 mr-1" />
                Solo Lectura
              </Badge>
            )}
          </div>
        </div>
        <Button onClick={fetchDeliveries} variant="outline">
          <ArrowRight className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {memoizedColumns.map((column) => (
          <Card key={column.id} className={`${column.color} border-2`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{column.title}</CardTitle>
              <column.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{column.deliveries.length}</div>
              <p className="text-xs text-muted-foreground">{column.deliveries.length === 1 ? "entrega" : "entregas"}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {memoizedColumns.map((column) => (
            <div key={column.id} className="space-y-4">
              <div className={`rounded-lg border-2 ${column.color} p-4 transition-all duration-200`}>
                <div className="flex items-center gap-2 mb-4">
                  <column.icon className="h-5 w-5 text-muted-foreground" />
                  <h3 className="font-semibold text-foreground">{column.title}</h3>
                  <Badge variant="secondary" className="ml-auto">
                    {column.deliveries.length}
                  </Badge>
                </div>

                <Droppable droppableId={column.id} isDropDisabled={!canEditDeliveryStatus}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`min-h-[400px] space-y-2 transition-all duration-200 ease-out rounded-lg ${
                        snapshot.isDraggingOver && canEditDeliveryStatus
                          ? "bg-primary/5 border-2 border-dashed border-primary/30 p-2"
                          : ""
                      } ${isDragging && canEditDeliveryStatus ? "bg-muted/30" : ""}`}
                    >
                      {column.deliveries.map((delivery, index) => (
                        <DeliveryCard
                          key={delivery.id}
                          delivery={delivery}
                          index={index}
                          canEditDeliveryStatus={canEditDeliveryStatus}
                          getProductDisplayName={getProductDisplayName}
                          canViewAllSales={canViewAllSales}
                          onEditDelivery={handleEditDelivery}
                          onViewDetails={handleViewDetails}
                        />
                      ))}
                      {provided.placeholder}

                      {column.deliveries.length === 0 && (
                        <div
                          className={`flex items-center justify-center h-32 text-muted-foreground text-sm border-2 border-dashed rounded-lg transition-all duration-200 ${
                            snapshot.isDraggingOver && canEditDeliveryStatus
                              ? "border-primary/50 bg-primary/5 text-primary"
                              : "border-muted"
                          }`}
                        >
                          {snapshot.isDraggingOver && canEditDeliveryStatus
                            ? "Suelta aquí para cambiar estado"
                            : "No hay entregas en esta etapa"}
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            </div>
          ))}
        </div>
      </DragDropContext>

      <DeliveryDetailsDialog
        delivery={viewingDelivery}
        open={!!viewingDelivery}
        onClose={() => setViewingDelivery(null)}
      />

      {selectedDelivery && (
        <Dialog open={!!selectedDelivery} onOpenChange={() => setSelectedDelivery(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Detalles de Entrega</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="tracking">Número de Seguimiento</Label>
                <Input
                  id="tracking"
                  value={editingDelivery.tracking_number || ""}
                  onChange={(e) => setEditingDelivery((prev) => ({ ...prev, tracking_number: e.target.value }))}
                  placeholder="Ej: TRK123456789"
                />
              </div>
              <div>
                <Label htmlFor="estimated">Fecha Estimada de Entrega</Label>
                <Input
                  id="estimated"
                  type="date"
                  value={editingDelivery.estimated_delivery_date?.split("T")[0] || ""}
                  onChange={(e) => setEditingDelivery((prev) => ({ ...prev, estimated_delivery_date: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="notes">Notas de Entrega</Label>
                <Textarea
                  id="notes"
                  value={editingDelivery.notes || ""}
                  onChange={(e) => setEditingDelivery((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Instrucciones especiales, dirección, etc."
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleUpdateDelivery} className="flex-1">
                  Guardar
                </Button>
                <Button variant="outline" onClick={() => setSelectedDelivery(null)} className="flex-1">
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-lg">Cómo usar el tablero</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            • <strong>Sistema independiente:</strong> Este tablero maneja entregas separadas de los estados de venta
          </p>
          <p>
            • <strong>Permisos:</strong> Solo supervisores y administradores pueden mover las tarjetas entre estados
          </p>
          <p>
            • <strong>Detalles:</strong> Haz clic en el ícono de información para agregar tracking y notas
          </p>
          <p>
            • <strong>Entrega Pendiente:</strong> Entregas que aún no han iniciado el proceso
          </p>
          <p>
            • <strong>En Preparación:</strong> Entregas que están siendo preparadas para envío
          </p>
          <p>
            • <strong>Enviado:</strong> Entregas que han sido enviadas al cliente
          </p>
          <p>
            • <strong>Entregado:</strong> Entregas completadas exitosamente
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
