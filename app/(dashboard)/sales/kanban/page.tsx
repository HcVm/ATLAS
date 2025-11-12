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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  FileCheck,
  History,
} from "lucide-react"
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd"
import { DeliveryAttachments } from "@/components/deliveries/delivery-attachments"
import { DeliveryDocumentsLink } from "@/components/deliveries/delivery-documents-link"

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
    delivery_start_date?: string | null
    delivery_end_date?: string | null
    warehouse_manager?: string | null
    profiles?: {
      full_name: string
    }
    sale_items?: {
      product_name: string
      product_brand?: string | null
      product_code?: string | null
      product_description?: string | null
      quantity: number
    }[]
  }
  assigned_user?: {
    full_name: string
  }
  delivery_attachments?: {
    id: string
    file_name: string
    file_url: string
    file_size?: number
    file_type?: string
    created_at: string
  }[]
  delivery_documents?: {
    id: string
    document_id: string
    document: {
      id: string
      title: string
      document_number: string
      status: string
    }
  }[]
  delivery_status_history?: {
    id: string
    delivery_id: string
    previous_status: string | null
    new_status: string
    changed_at: string
    changed_by?: string | null
    changed_by_user?: {
      full_name: string
    }
  }[]
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
  {
    id: "guia-firmada",
    title: "Guía Firmada",
    deliveryStatus: "signed_guide",
    color: "bg-emerald-50 border-emerald-300 dark:bg-emerald-950/30 dark:border-emerald-700",
    icon: FileCheck,
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

    const parseDate = (dateString: string) => {
      if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = dateString.split("-").map(Number)
        return new Date(year, month - 1, day)
      }
      return new Date(dateString)
    }

    const statusToLabel = (status: string) => {
      const map: Record<string, string> = {
        pending: "Entrega Pendiente",
        preparing: "En Preparación",
        shipped: "Enviado",
        delivered: "Entregado",
        signed_guide: "Guía Firmada",
      }
      return map[status] || status
    }

    const statusToColor = (status: string) => {
      const map: Record<string, string> = {
        pending: "bg-yellow-100 text-yellow-800",
        preparing: "bg-blue-100 text-blue-800",
        shipped: "bg-purple-100 text-purple-800",
        delivered: "bg-green-100 text-green-800",
        signed_guide: "bg-emerald-100 text-emerald-800",
      }
      return map[status] || "bg-gray-100 text-gray-800"
    }

    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles Completos de Entrega</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
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
                    {format(parseDate(delivery.sales.sale_date), "dd/MM/yyyy", { locale: es })}
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
              {delivery.sales.warehouse_manager && (
                <div>
                  <p className="text-sm text-muted-foreground">Encargado de Almacén</p>
                  <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700">
                    {delivery.sales.warehouse_manager}
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

            {(delivery.sales.delivery_start_date || delivery.sales.delivery_end_date) && (
              <div className="space-y-3">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Plazo de Entrega
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {delivery.sales.delivery_start_date && (
                    <div>
                      <p className="text-sm text-muted-foreground">Fecha de Inicio</p>
                      <p className="font-medium text-blue-600">
                        {format(parseDate(delivery.sales.delivery_start_date), "dd/MM/yyyy", { locale: es })}
                      </p>
                    </div>
                  )}
                  {delivery.sales.delivery_end_date && (
                    <div>
                      <p className="text-sm text-muted-foreground">Fecha de Fin</p>
                      <p className="font-medium text-blue-600">
                        {format(parseDate(delivery.sales.delivery_end_date), "dd/MM/yyyy", { locale: es })}
                      </p>
                    </div>
                  )}
                </div>
                {delivery.sales.delivery_start_date && delivery.sales.delivery_end_date && (
                  <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                    <p className="text-sm text-blue-700">
                      <strong>Plazo:</strong>{" "}
                      {format(parseDate(delivery.sales.delivery_start_date), "dd/MM/yyyy", { locale: es })} -{" "}
                      {format(parseDate(delivery.sales.delivery_end_date), "dd/MM/yyyy", { locale: es })}
                    </p>
                  </div>
                )}
              </div>
            )}

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

            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Información de Entrega</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Estado</p>
                  <Badge
                    variant="secondary"
                    className={
                      delivery.delivery_status === "signed_guide"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                        : ""
                    }
                  >
                    {delivery.delivery_status}
                  </Badge>
                </div>
                {delivery.tracking_number && (
                  <div>
                    <p className="text-sm text-muted-foreground">Tracking</p>
                    <p className="font-mono text-sm">{delivery.tracking_number}</p>
                  </div>
                )}
                {delivery.actual_delivery_date && (
                  <div>
                    <p className="text-sm text-muted-foreground">Fecha de Entrega</p>
                    <p className="font-medium text-green-600">
                      {format(parseDate(delivery.actual_delivery_date), "dd/MM/yyyy", { locale: es })}
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

            {/* === HISTORIAL DE ESTADOS === */}
            {delivery.delivery_status_history && delivery.delivery_status_history.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Historial de Estados
                </h3>
                <div className="relative border-l-2 border-muted-foreground/20 ml-3">
                  {delivery.delivery_status_history
                    .sort((a, b) => new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime())
                    .map((entry, index) => (
                      <div key={entry.id} className="mb-4 ml-6 relative">
                        <div
                          className={`absolute -left-7 top-1 w-3 h-3 rounded-full ${statusToColor(entry.new_status)}`}
                        />
                        <div className="flex flex-col">
                          <p className="text-sm font-medium">
                            {entry.previous_status ? (
                              <>
                                {statusToLabel(entry.previous_status)} →{" "}
                                <span className="font-bold">{statusToLabel(entry.new_status)}</span>
                              </>
                            ) : (
                              <span className="font-bold">Inicio: {statusToLabel(entry.new_status)}</span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(parseDate(entry.changed_at), "dd/MM/yyyy HH:mm", { locale: es })}
                            {entry.changed_by_user?.full_name && ` • ${entry.changed_by_user.full_name}`}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
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
    isDraggable = true,
    onMoveCard,
  }: {
    delivery: Delivery
    index: number
    canEditDeliveryStatus: boolean
    getProductDisplayName: (delivery: Delivery) => string
    canViewAllSales: boolean
    onEditDelivery: (delivery: Delivery) => void
    onViewDetails: (delivery: Delivery) => void
    isDraggable?: boolean
    onMoveCard?: (deliveryId: string, newStatus: string) => Promise<void>
  }) => {
    const isDelivered = delivery.delivery_status === "delivered"
    const isSignedGuide = delivery.delivery_status === "signed_guide"

    const parseDate = (dateString: string) => {
      if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = dateString.split("-").map(Number)
        return new Date(year, month - 1, day)
      }
      return new Date(dateString)
    }

    const cardContent = (provided?: any, snapshot?: any) => (
      <div
        ref={provided?.innerRef}
        {...(provided?.draggableProps || {})}
        {...(provided?.dragHandleProps || {})}
        className={`board-card mb-3 rounded-lg border transition-all duration-200 ease-out will-change-transform max-w-full overflow-hidden ${
          snapshot?.isDragging
            ? "shadow-2xl scale-105 z-50 bg-background/95 backdrop-blur-sm border-primary/50"
            : "hover:shadow-lg hover:scale-[1.02]"
        } ${!canEditDeliveryStatus || !isDraggable ? "cursor-default" : "cursor-grab active:cursor-grabbing"} ${
          isSignedGuide ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800" : ""
        } ${isDelivered && !isSignedGuide ? "p-2 sm:p-3" : "p-3 sm:p-4"}`}
        style={provided?.draggableProps?.style}
      >
        {isDelivered || isSignedGuide ? (
          <div className="space-y-1.5 sm:space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-xs sm:text-sm text-foreground truncate">
                  Venta #{delivery.sales.sale_number || "N/A"}
                </h4>
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{delivery.sales.entity_name}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Badge
                  variant="secondary"
                  className={
                    isSignedGuide ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" : ""
                  }
                >
                  {format(parseDate(delivery.sales.sale_date), "dd/MM", { locale: es })}
                </Badge>

                {/* Botón de edición (i) */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 sm:h-6 sm:w-6 p-0 hover:bg-primary/10 transition-colors"
                  onClick={() => onEditDelivery(delivery)}
                >
                  <Info className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                </Button>

                {/* Botón de vista completa */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 sm:h-6 sm:w-6 p-0 hover:bg-primary/10 transition-colors"
                  onClick={() => onViewDetails(delivery)}
                >
                  <Maximize2 className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <DollarSign className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-muted-foreground" />
                <span className="text-xs sm:text-sm font-semibold text-foreground">
                  S/ {delivery.sales.total_sale.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                </span>
              </div>
              {delivery.actual_delivery_date && (
                <div
                  className={`text-[10px] sm:text-xs font-medium ${isSignedGuide ? "text-emerald-600" : "text-green-600"}`}
                >
                  {format(parseDate(delivery.actual_delivery_date), "dd/MM/yy", { locale: es })}
                </div>
              )}
            </div>

            {delivery.sales.warehouse_manager && (
              <div className="flex items-center gap-1">
                <User className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-muted-foreground flex-shrink-0" />
                <span className="text-[10px] sm:text-xs text-muted-foreground truncate">
                  Almacén: {delivery.sales.warehouse_manager}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h4 className="font-semibold text-xs sm:text-sm text-foreground truncate">
                  Venta #{delivery.sales.sale_number || "N/A"}
                </h4>
                {delivery.sales.ocam && (
                  <Badge
                    variant="outline"
                    className="text-[10px] sm:text-xs mt-1 bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-950/20 dark:border-orange-800 dark:text-orange-300 font-bold"
                  >
                    OCAM: {delivery.sales.ocam}
                  </Badge>
                )}
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <Badge variant="secondary" className="text-[10px] sm:text-xs px-1 py-0">
                  {format(parseDate(delivery.sales.sale_date), "dd/MM", { locale: es })}
                </Badge>
                <Badge variant="outline" className="text-[10px] sm:text-xs px-1 py-0">
                  {delivery.sales.sale_status}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 sm:h-6 sm:w-6 p-0 hover:bg-primary/10 transition-colors"
                  onClick={() => onEditDelivery(delivery)}
                >
                  <Info className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                </Button>
              </div>
            </div>

            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-medium text-foreground truncate" title={delivery.sales.entity_name}>
                {delivery.sales.entity_name}
              </p>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">RUC: {delivery.sales.entity_ruc}</p>
            </div>

            {delivery.sales.final_destination && (
              <div className="min-w-0">
                <div className="flex items-center gap-1 mb-0.5">
                  <MapPin className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-muted-foreground flex-shrink-0" />
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Dirección:</p>
                </div>
                <p className="text-xs sm:text-sm truncate" title={delivery.sales.final_destination}>
                  {delivery.sales.final_destination}
                </p>
              </div>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-1 mb-0.5">
                <Package2 className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-muted-foreground flex-shrink-0" />
                <p className="text-[10px] sm:text-xs text-muted-foreground">Productos:</p>
              </div>
              <div className="space-y-1">
                {delivery.sales.is_multi_product && delivery.sales.items_count && delivery.sales.items_count > 1 ? (
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-medium truncate">
                      {delivery.sales.items_count} productos diferentes
                    </p>
                    <div className="text-[10px] sm:text-xs text-muted-foreground space-y-0.5">
                      {delivery.sales.sale_items.slice(0, 2).map((item, index) => (
                        <p key={index} className="truncate">
                          • {item.product_name} (x{item.quantity})
                          {item.product_code && (
                            <span className="ml-1 font-mono text-[10px] bg-muted px-1 rounded">
                              {item.product_code}
                            </span>
                          )}
                        </p>
                      ))}
                      {delivery.sales.sale_items.length > 2 && (
                        <p className="text-[10px]">• +{delivery.sales.sale_items.length - 2} más</p>
                      )}
                    </div>
                  </div>
                ) : (
                  delivery.sales.sale_items &&
                  delivery.sales.sale_items.length > 0 && (
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm truncate" title={delivery.sales.sale_items[0].product_name}>
                        {delivery.sales.sale_items[0].product_name}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] sm:text-xs text-muted-foreground flex-wrap">
                        <span>Cantidad: {delivery.sales.sale_items[0].quantity}</span>
                        {delivery.sales.sale_items[0].product_code && (
                          <span className="font-mono bg-muted px-1 rounded truncate">
                            {delivery.sales.sale_items[0].product_code}
                          </span>
                        )}
                        {delivery.sales.sale_items[0].product_brand && (
                          <span className="truncate">• {delivery.sales.sale_items[0].product_brand}</span>
                        )}
                      </div>
                    </div>
                  )
                )}
                {(!delivery.sales.sale_items || delivery.sales.sale_items.length === 0) && (
                  <p className="text-xs sm:text-sm text-muted-foreground">Sin productos</p>
                )}
              </div>
            </div>

            {delivery.tracking_number && (
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs text-muted-foreground">Tracking:</p>
                <p className="text-xs sm:text-sm font-mono truncate">{delivery.tracking_number}</p>
              </div>
            )}

            {(delivery.sales.delivery_start_date || delivery.sales.delivery_end_date) && (
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <Calendar className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-muted-foreground flex-shrink-0" />
                  <span className="text-[10px] sm:text-xs text-muted-foreground">Plazo de Entrega:</span>
                </div>
                {delivery.sales.delivery_start_date && delivery.sales.delivery_end_date ? (
                  <div className="text-[10px] sm:text-xs bg-blue-50 border border-blue-200 p-1.5 sm:p-2 rounded">
                    <span className="text-blue-700 font-medium">
                      {format(parseDate(delivery.sales.delivery_start_date), "dd/MM", { locale: es })} -{" "}
                      {format(parseDate(delivery.sales.delivery_end_date), "dd/MM", { locale: es })}
                    </span>
                  </div>
                ) : (
                  <div className="text-[10px] sm:text-xs">
                    {delivery.sales.delivery_start_date && (
                      <span className="text-blue-600">
                        Inicio: {format(parseDate(delivery.sales.delivery_start_date), "dd/MM/yy", { locale: es })}
                      </span>
                    )}
                    {delivery.sales.delivery_end_date && (
                      <span className="text-blue-600">
                        Fin: {format(parseDate(delivery.sales.delivery_end_date), "dd/MM/yy", { locale: es })}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {delivery.sales.warehouse_manager && (
              <div className="flex items-center gap-1 min-w-0">
                <User className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-muted-foreground flex-shrink-0" />
                <span className="text-[10px] sm:text-xs text-muted-foreground truncate">
                  Almacén: {delivery.sales.warehouse_manager}
                </span>
              </div>
            )}

            {delivery.assigned_user?.full_name && (
              <div className="flex items-center gap-1 min-w-0">
                <User className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-muted-foreground flex-shrink-0" />
                <span className="text-[10px] sm:text-xs text-muted-foreground truncate">
                  Asignado: {delivery.assigned_user.full_name}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between pt-1.5 sm:pt-2 border-t border-border">
              <div className="flex items-center gap-1">
                <DollarSign className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-muted-foreground" />
                <span className="text-xs sm:text-sm font-semibold text-foreground">
                  S/ {delivery.sales.total_sale.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {canViewAllSales && delivery.sales.profiles?.full_name && (
              <div className="text-[10px] sm:text-xs text-muted-foreground truncate">
                Vendedor: {delivery.sales.profiles.full_name}
              </div>
            )}

            {!isDraggable && canEditDeliveryStatus && onMoveCard && (
              <div className="pt-2 border-t border-border">
                <Label className="text-[10px] text-muted-foreground mb-1 block">Mover a:</Label>
                <Select value={delivery.delivery_status} onValueChange={(value) => onMoveCard(delivery.id, value)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {KANBAN_COLUMNS.map((col) => (
                      <SelectItem key={col.deliveryStatus} value={col.deliveryStatus} className="text-xs">
                        <div className="flex items-center gap-2">
                          <col.icon className="h-3 w-3" />
                          {col.title}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}
      </div>
    )

    if (isDraggable) {
      return (
        <Draggable key={delivery.id} draggableId={delivery.id} index={index} isDragDisabled={!canEditDeliveryStatus}>
          {(provided, snapshot) => cardContent(provided, snapshot)}
        </Draggable>
      )
    }

    return cardContent()
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
  const [activeTab, setActiveTab] = useState("entrega-pendiente")

  const companyToUse = useMemo(() => {
    if (user?.role === "admin") {
      return selectedCompany
    }
    if (user?.company_id) {
      return { id: user.company_id, name: user.company_name }
    }
    return null
  }, [user?.role, user?.company_id, user?.company_name, selectedCompany])

  const hasSalesAccess = useMemo(
    () =>
      user?.role === "admin" ||
      user?.role === "supervisor" ||
      ["Ventas", "Administración", "Operaciones", "Jefatura de Ventas", "Contabilidad"].includes(
        user?.departments?.name ?? "",
      ),
    [user?.role, user?.departments?.name],
  )

  const canViewAllSales = useMemo(
    () =>
      user?.role === "admin" ||
      user?.role === "supervisor" ||
      ["Administración", "Operaciones", "Jefatura de Ventas", "Contabilidad"].includes(user?.departments?.name ?? ""),
    [user?.role, user?.departments?.name],
  )

  const canEditDeliveryStatus = canSupervise

  const fetchSingleDelivery = useCallback(async (deliveryId: string) => {
    try {
      const { data: delivery, error: deliveryError } = await supabase
        .from("deliveries")
        .select(`
        id, sale_id, delivery_status, tracking_number, estimated_delivery_date,
        actual_delivery_date, notes, assigned_to, created_at, updated_at,
        assigned_user:profiles!deliveries_assigned_to_fkey (full_name),
        delivery_attachments (
          id, file_name, file_url, file_size, file_type, created_at
        ),
        delivery_documents (
          id, document_id,
          document:document_id (id, title, document_number, status)
        ),
        delivery_status_history (
          id, delivery_id, previous_status, new_status, changed_at, changed_by
        )
      `)
        .eq("id", deliveryId)
        .single()

      if (deliveryError) throw deliveryError

      // Fetch the related sale
      const { data: sale, error: saleError } = await supabase
        .from("sales")
        .select(`
        id, sale_number, sale_date, entity_name, entity_ruc, quotation_code,
        total_sale, sale_status, ocam, company_id, is_multi_product, items_count,
        final_destination, delivery_start_date, delivery_end_date, warehouse_manager,
        created_by,
        profiles!sales_created_by_fkey (full_name),
        sale_items (product_name, product_brand, product_code, product_description, quantity)
      `)
        .eq("id", delivery.sale_id)
        .single()

      if (saleError) throw saleError

      // Fetch user info for history
      const changedByIds = new Set<string>()
      delivery.delivery_status_history?.forEach((entry) => {
        if (entry.changed_by) changedByIds.add(entry.changed_by)
      })

      const userMap = new Map<string, { full_name: string }>()
      if (changedByIds.size > 0) {
        const { data: users } = await supabase
          .from("auth.users")
          .select("id, raw_user_meta_data")
          .in("id", Array.from(changedByIds))

        users?.forEach((u) => {
          const full_name = u.raw_user_meta_data?.full_name || "Usuario desconocido"
          userMap.set(u.id, { full_name })
        })
      }

      const historyWithUser = (delivery.delivery_status_history || []).map((entry) => ({
        ...entry,
        changed_by_user: entry.changed_by ? userMap.get(entry.changed_by) || null : null,
      }))

      return {
        ...delivery,
        sales: sale,
        delivery_status_history: historyWithUser,
        delivery_attachments: delivery.delivery_attachments || [],
        delivery_documents: delivery.delivery_documents || [],
      } as Delivery
    } catch (error: any) {
      console.error("Error fetching single delivery:", error.message)
      return null
    }
  }, [])

  const fetchDeliveries = useCallback(async () => {
    if (!companyToUse) return
    try {
      setLoading(true)

      // Paso 1: Obtener entregas SIN join con auth.users
      const { data: deliveries, error: deliveriesError } = await supabase
        .from("deliveries")
        .select(`
        id, sale_id, delivery_status, tracking_number, estimated_delivery_date,
        actual_delivery_date, notes, assigned_to, created_at, updated_at,
        assigned_user:profiles!deliveries_assigned_to_fkey (full_name),
        delivery_attachments (
          id, file_name, file_url, file_size, file_type, created_at
        ),
        delivery_documents (
          id, document_id,
          document:document_id (id, title, document_number, status)
        ),
        delivery_status_history (
          id, delivery_id, previous_status, new_status, changed_at, changed_by
        )
      `)
        .order("created_at", { ascending: false })

      if (deliveriesError) throw deliveriesError

      // Paso 2: Obtener ventas
      let salesQuery = supabase
        .from("sales")
        .select(`
        id, sale_number, sale_date, entity_name, entity_ruc, quotation_code,
        total_sale, sale_status, ocam, company_id, is_multi_product, items_count,
        final_destination, delivery_start_date, delivery_end_date, warehouse_manager,
        created_by,
        profiles!sales_created_by_fkey (full_name),
        sale_items (product_name, product_brand, product_code, product_description, quantity)
      `)
        .eq("company_id", companyToUse.id)

      if (!canViewAllSales && user?.id) {
        salesQuery = salesQuery.eq("created_by", user.id)
      }

      const { data: sales, error: salesError } = await salesQuery
      if (salesError) throw salesError

      const salesMap = new Map(sales.map((s) => [s.id, s]))

      // Paso 3: Extraer todos los changed_by UUIDs
      const changedByIds = new Set<string>()
      deliveries.forEach((delivery) => {
        delivery.delivery_status_history?.forEach((entry) => {
          if (entry.changed_by) changedByIds.add(entry.changed_by)
        })
      })

      // Paso 4: Consultar usuarios solo si hay IDs
      const userMap = new Map<string, { full_name: string }>()
      if (changedByIds.size > 0) {
        const { data: users, error: usersError } = await supabase
          .from("auth.users")
          .select("id, raw_user_meta_data")
          .in("id", Array.from(changedByIds))

        if (usersError) {
          console.warn("No se pudieron cargar nombres de usuarios:", usersError)
        } else {
          users.forEach((u) => {
            const full_name = u.raw_user_meta_data?.full_name || "Usuario desconocido"
            userMap.set(u.id, { full_name })
          })
        }
      }

      // Paso 5: Unir todo
      const enrichedDeliveries = deliveries
        .map((delivery) => {
          const sale = salesMap.get(delivery.sale_id)
          if (!sale) return null

          const historyWithUser = (delivery.delivery_status_history || []).map((entry) => ({
            ...entry,
            changed_by_user: entry.changed_by ? userMap.get(entry.changed_by) || null : null,
          }))

          return {
            ...delivery,
            sales: sale,
            delivery_status_history: historyWithUser,
            delivery_attachments: delivery.delivery_attachments || [],
            delivery_documents: delivery.delivery_documents || [],
          } as Delivery
        })
        .filter((d): d is Delivery => d !== null)

      const organizedColumns = KANBAN_COLUMNS.map((col) => ({
        ...col,
        deliveries: enrichedDeliveries.filter((d) => d.delivery_status === col.deliveryStatus),
      }))

      setColumns(organizedColumns)
      const firstWithData = organizedColumns.find((c) => c.deliveries.length > 0)
      setActiveTab(firstWithData?.id || organizedColumns[0].id)
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
      const delivery = columns.flatMap((c) => c.deliveries).find((d) => d.id === draggableId)
      if (!delivery) return

      if (delivery.delivery_status === "signed_guide") {
        toast.error("No se puede mover una entrega con guía firmada")
        return
      }

      setColumns((prevColumns) => {
        const sourceCol = prevColumns.find((c) => c.id === source.droppableId)
        const destCol = prevColumns.find((c) => c.id === destination.droppableId)
        if (!sourceCol || !destCol) return prevColumns

        const movedItem = sourceCol.deliveries.find((d) => d.id === draggableId)
        if (!movedItem) return prevColumns

        const newSourceDeliveries = sourceCol.deliveries.filter((d) => d.id !== draggableId)
        const newDestDeliveries = [...destCol.deliveries]
        newDestDeliveries.splice(destination.index, 0, {
          ...movedItem,
          delivery_status: destCol.deliveryStatus,
        })

        if (source.droppableId !== destination.droppableId) {
          setActiveTab(destination.droppableId)
        }

        return prevColumns.map((col) => {
          if (col.id === source.droppableId) return { ...col, deliveries: newSourceDeliveries }
          if (col.id === destination.droppableId) return { ...col, deliveries: newDestDeliveries }
          return col
        })
      })

      const destColumnInfo = KANBAN_COLUMNS.find((c) => c.id === destination.droppableId)
      if (!destColumnInfo) return

      try {
        const getPeruDate = () => {
          const now = new Date()
          const peruDate = new Intl.DateTimeFormat("en-CA", {
            timeZone: "America/Lima",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }).format(now)
          return peruDate
        }

        const updateData: any = {
          delivery_status: destColumnInfo.deliveryStatus,
          updated_at: new Date().toISOString(),
        }

        if (destColumnInfo.deliveryStatus === "delivered" || destColumnInfo.deliveryStatus === "signed_guide") {
          updateData.actual_delivery_date = getPeruDate()
        }

        const { error: updateError } = await supabase.from("deliveries").update(updateData).eq("id", draggableId)
        if (updateError) throw updateError

        if (destColumnInfo.deliveryStatus === "signed_guide") {
          const { data: existingCollection } = await supabase
            .from("collection_tracking")
            .select("id")
            .eq("delivery_id", draggableId)
            .single()

          if (!existingCollection) {
            const { error: collectionError } = await supabase
              .from("collection_tracking")
              .insert({
                delivery_id: draggableId,
                sale_id: delivery.sale_id,
                collection_status: "verde",
                days_in_current_status: 0,
                status_start_date: new Date().toISOString(),
                green_days: 10,
                yellow_days: 5,
              })
              .select()
              .single()

            if (collectionError) {
              console.warn("No se pudo crear el registro de cobranzas:", collectionError)
            }
          }
        }

        // Registrar en historial
        const { error: historyError } = await supabase.from("delivery_status_history").insert({
          delivery_id: draggableId,
          previous_status: delivery.delivery_status,
          new_status: destColumnInfo.deliveryStatus,
          changed_at: new Date().toISOString(),
          changed_by: user?.id || null,
        })

        if (historyError) {
          console.warn("No se pudo registrar el historial:", historyError)
        }

        toast.success(`Entrega movida a ${destColumnInfo.title}`)
      } catch (error: any) {
        setColumns(originalColumns)
        toast.error("Error al actualizar el estado: " + error.message)
      }
    },
    [canEditDeliveryStatus, columns, user?.id],
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

  const handleEditDelivery = useCallback(
    (delivery: Delivery) => {
      fetchSingleDelivery(delivery.id).then((freshDelivery) => {
        if (freshDelivery) {
          setSelectedDelivery(freshDelivery)
          setEditingDelivery({
            tracking_number: freshDelivery.tracking_number || "",
            notes: freshDelivery.notes || "",
            assigned_to: freshDelivery.assigned_to || "",
          })
        }
      })
    },
    [fetchSingleDelivery],
  )

  const handleViewDetails = useCallback((delivery: Delivery) => {
    setViewingDelivery(delivery)
  }, [])

  const handleMoveCard = useCallback(
    async (deliveryId: string, newStatus: string) => {
      if (!canEditDeliveryStatus) {
        toast.error("Solo los supervisores pueden mover las entregas")
        return
      }

      const delivery = columns.flatMap((col) => col.deliveries).find((d) => d.id === deliveryId)
      if (!delivery) return

      const oldStatus = delivery.delivery_status
      if (oldStatus === newStatus) return

      if (oldStatus === "signed_guide") {
        toast.error("No se puede mover una entrega con guía firmada")
        return
      }

      const originalColumns = columns

      setColumns((prevColumns) => {
        const sourceCol = prevColumns.find((c) => c.deliveryStatus === oldStatus)
        const destCol = prevColumns.find((c) => c.deliveryStatus === newStatus)
        if (!sourceCol || !destCol) return prevColumns

        const movedItem = sourceCol.deliveries.find((d) => d.id === deliveryId)
        if (!movedItem) return prevColumns

        const newSourceDeliveries = sourceCol.deliveries.filter((d) => d.id !== deliveryId)
        const newDestDeliveries = [...destCol.deliveries, { ...movedItem, delivery_status: newStatus }]

        const destColumnInfo = KANBAN_COLUMNS.find((c) => c.deliveryStatus === newStatus)
        if (destColumnInfo) {
          setActiveTab(destColumnInfo.id)
        }

        return prevColumns.map((col) => {
          if (col.deliveryStatus === oldStatus) return { ...col, deliveries: newSourceDeliveries }
          if (col.deliveryStatus === newStatus) return { ...col, deliveries: newDestDeliveries }
          return col
        })
      })

      try {
        const getPeruDate = () => {
          const now = new Date()
          const peruDate = new Intl.DateTimeFormat("en-CA", {
            timeZone: "America/Lima",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }).format(now)
          return peruDate
        }

        const updateData: any = {
          delivery_status: newStatus,
          updated_at: new Date().toISOString(),
        }

        if (newStatus === "delivered" || newStatus === "signed_guide") {
          updateData.actual_delivery_date = getPeruDate()
        }

        const { error: updateError } = await supabase.from("deliveries").update(updateData).eq("id", deliveryId)
        if (updateError) throw updateError

        if (newStatus === "signed_guide") {
          const { data: existingCollection } = await supabase
            .from("collection_tracking")
            .select("id")
            .eq("delivery_id", deliveryId)
            .single()

          if (!existingCollection) {
            const { error: collectionError } = await supabase
              .from("collection_tracking")
              .insert({
                delivery_id: deliveryId,
                sale_id: delivery.sale_id,
                collection_status: "verde",
                days_in_current_status: 0,
                status_start_date: new Date().toISOString(),
                green_days: 10,
                yellow_days: 5,
              })
              .select()
              .single()

            if (collectionError) {
              // Si el registro ya existe, no es un error crítico
              console.warn("No se pudo crear el registro de cobranzas:", collectionError)
            }
          }
        }

        const { error: historyError } = await supabase.from("delivery_status_history").insert({
          delivery_id: deliveryId,
          previous_status: oldStatus,
          new_status: newStatus,
          changed_at: new Date().toISOString(),
          changed_by: user?.id || null,
        })

        if (historyError) {
          console.warn("No se pudo registrar el historial:", historyError)
        }

        const destColumnInfo = KANBAN_COLUMNS.find((c) => c.deliveryStatus === newStatus)
        toast.success(`Entrega movida a ${destColumnInfo?.title}`)
      } catch (error: any) {
        setColumns(originalColumns)
        toast.error("Error al actualizar el estado: " + error.message)
      }
    },
    [canEditDeliveryStatus, columns, user?.id],
  )

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-96 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground/80 to-foreground/60 bg-clip-text text-transparent">
            Tablero de Entregas
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Gestión visual del estado de entregas de:{" "}
            <span className="font-semibold text-foreground">{companyToUse?.name || "N/A"}</span>
            {!canViewAllSales && <span className="ml-2 text-xs text-orange-600 font-medium">(Solo tus ventas)</span>}
          </p>
          <div className="flex items-center gap-2 mt-2">
            {canEditDeliveryStatus ? (
              <Badge variant="default" className="text-[10px] sm:text-xs">
                <Edit className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" />
                Modo Edición
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-[10px] sm:text-xs">
                <Eye className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" />
                Solo Lectura
              </Badge>
            )}
          </div>
        </div>
        <Button onClick={fetchDeliveries} variant="outline" size="sm" className="w-full sm:w-auto bg-transparent">
          <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
          Actualizar
        </Button>
      </div>

      <div className="lg:hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full gap-1 h-auto p-1 bg-muted/50 overflow-x-auto">
            {memoizedColumns.map((column) => {
              const Icon = column.icon
              const isActive = activeTab === column.id
              return (
                <TabsTrigger
                  key={column.id}
                  value={column.id}
                  className={`flex flex-col items-center gap-1 py-2 px-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all ${
                    isActive ? "border-b-2 border-primary" : ""
                  }`}
                >
                  <Icon className={`h-3 w-3 sm:h-4 sm:w-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                  <span
                    className={`text-[8px] sm:text-xs font-medium leading-tight text-center truncate ${
                      isActive ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {column.title.split(" ")[0]}
                  </span>
                  <Badge
                    variant={isActive ? "default" : "secondary"}
                    className="text-[8px] px-1 py-0 min-w-[18px] justify-center"
                  >
                    {column.deliveries.length}
                  </Badge>
                </TabsTrigger>
              )
            })}
          </TabsList>

          {memoizedColumns.map((column) => (
            <TabsContent key={column.id} value={column.id} className="mt-4">
              <div className="space-y-3">
                {column.deliveries.length > 0 ? (
                  column.deliveries.map((delivery, index) => (
                    <DeliveryCard
                      key={delivery.id}
                      delivery={delivery}
                      index={index}
                      canEditDeliveryStatus={canEditDeliveryStatus}
                      getProductDisplayName={getProductDisplayName}
                      canViewAllSales={canViewAllSales}
                      onEditDelivery={handleEditDelivery}
                      onViewDetails={handleViewDetails}
                      isDraggable={false}
                      onMoveCard={handleMoveCard}
                    />
                  ))
                ) : (
                  <Card className={`${column.color} border-2`}>
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                      <column.icon className="h-12 w-12 text-muted-foreground/30 mb-3" />
                      <p className="text-sm text-muted-foreground font-medium">
                        No hay entregas en {column.title.toLowerCase()}
                      </p>
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        Las entregas aparecerán aquí cuando cambien de estado
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="hidden lg:grid lg:grid-cols-5 lg:gap-6">
          {memoizedColumns.map((column) => (
            <div key={column.id} className="space-y-4">
              <div className={`rounded-lg border-2 ${column.color} p-4 transition-all duration-200`}>
                <div className="flex items-center gap-2 mb-4">
                  <column.icon className="h-5 w-5 text-muted-foreground" />
                  <h3 className="font-semibold text-base text-foreground">{column.title}</h3>
                  <Badge variant="secondary" className="ml-auto text-xs">
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
                          isDraggable={true}
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
          <DialogContent className="max-w-2xl max-h-[90vh] p-0 overflow-hidden">
            <div className="p-6 pb-0">
              <DialogHeader>
                <DialogTitle>Detalles de Entrega - Venta #{selectedDelivery.sales.sale_number}</DialogTitle>
              </DialogHeader>
            </div>

            <Tabs defaultValue="info" className="w-full">
              <div className="px-6">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="info">Información</TabsTrigger>
                  <TabsTrigger value="archivos">Archivos</TabsTrigger>
                  <TabsTrigger value="documentos">Documentos</TabsTrigger>
                </TabsList>
              </div>

              <div className="max-h-[60vh] overflow-y-auto px-6 pb-6">
                {/* === PESTAÑA INFORMACIÓN === */}
                <TabsContent value="info" className="space-y-4 mt-4">
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
                    <Label htmlFor="notes">Notas de Entrega</Label>
                    <Textarea
                      id="notes"
                      value={editingDelivery.notes || ""}
                      onChange={(e) => setEditingDelivery((prev) => ({ ...prev, notes: e.target.value }))}
                      placeholder="Instrucciones especiales, dirección, etc."
                      rows={4}
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
                </TabsContent>

                {/* === PESTAÑA ARCHIVOS === */}
                <TabsContent value="archivos" className="space-y-4 mt-4">
                  <DeliveryAttachments
                    deliveryId={selectedDelivery.id}
                    attachments={selectedDelivery.delivery_attachments || []}
                    onAttachmentsChange={(attachments) => {
                      setSelectedDelivery((prev) => (prev ? { ...prev, delivery_attachments: attachments } : null))
                    }}
                    canEdit={true}
                  />
                </TabsContent>

                {/* === PESTAÑA DOCUMENTOS === */}
                <TabsContent value="documentos" className="space-y-4 mt-4">
                  <div className="max-w-full overflow-hidden">
                    <DeliveryDocumentsLink
                      deliveryId={selectedDelivery.id}
                      linkedDocuments={selectedDelivery.delivery_documents || []}
                      onDocumentsChange={(documents) => {
                        setSelectedDelivery((prev) => (prev ? { ...prev, delivery_documents: documents } : null))
                      }}
                      companyId={selectedDelivery.sales?.company_id}
                    />
                  </div>
                </TabsContent>
              </div>
            </Tabs>
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
            • <strong>Detalles:</strong> Haz clic en el ícono de información para agregar tracking, notas, subir
            archivos o vincular documentos
          </p>
          <p>
            • <strong>Historial:</strong> Se registra automáticamente cada cambio de estado con fecha, hora y usuario
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
          <p>
            • <strong>Guía Firmada:</strong> Entregas con guía firmada (venta exitosa con fondo verde tenuo)
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
