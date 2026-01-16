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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
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
  RefreshCw,
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
  XCircle,
  LayoutGrid,
  List,
} from "lucide-react"
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd"
import { DeliveryAttachments } from "@/components/deliveries/delivery-attachments"
import { DeliveryDocumentsLink } from "@/components/deliveries/delivery-documents-link"
import { motion, AnimatePresence } from "framer-motion"

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
    color: "bg-yellow-50/50 border-yellow-200/50 dark:bg-yellow-950/10 dark:border-yellow-800/50",
    icon: Clock,
  },
  {
    id: "en-preparacion",
    title: "En Preparación",
    deliveryStatus: "preparing",
    color: "bg-blue-50/50 border-blue-200/50 dark:bg-blue-950/10 dark:border-blue-800/50",
    icon: Package,
  },
  {
    id: "enviado",
    title: "Enviado",
    deliveryStatus: "shipped",
    color: "bg-purple-50/50 border-purple-200/50 dark:bg-purple-950/10 dark:border-purple-800/50",
    icon: Truck,
  },
  {
    id: "entregado",
    title: "Entregado",
    deliveryStatus: "delivered",
    color: "bg-green-50/50 border-green-200/50 dark:bg-green-950/10 dark:border-green-800/50",
    icon: CheckCircle,
  },
  {
    id: "guia-firmada",
    title: "Guía Firmada",
    deliveryStatus: "signed_guide",
    color: "bg-emerald-50/50 border-emerald-300/50 dark:bg-emerald-950/20 dark:border-emerald-700/50",
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
        cancelled: "Cancelado", // Added cancelled status
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
        cancelled: "bg-red-100 text-red-800", // Added cancelled status color
      }
      return map[status] || "bg-gray-100 text-gray-800"
    }

    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-slate-200/50 dark:border-slate-700/50 shadow-2xl">
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
                        : delivery.delivery_status === "cancelled"
                          ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200" // Added cancelled badge color
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
    const isCancelled = delivery.delivery_status === "cancelled"

    const parseDate = (dateString: string) => {
      if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = dateString.split("-").map(Number)
        return new Date(year, month - 1, day)
      }
      return new Date(dateString)
    }

    const cardColorClass = isCancelled
      ? "bg-red-50/50 dark:bg-red-950/10 border-red-200/60 dark:border-red-800/60 hover:border-red-300 dark:hover:border-red-700"
      : isSignedGuide
        ? "bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-200/60 dark:border-emerald-800/60 hover:border-emerald-300 dark:hover:border-emerald-700"
        : isDelivered
          ? "bg-green-50/50 dark:bg-green-950/10 border-green-200/60 dark:border-green-800/60 hover:border-green-300 dark:hover:border-green-700"
          : "bg-white/80 dark:bg-slate-900/80 border-slate-200/60 dark:border-slate-700/60 hover:border-indigo-300 dark:hover:border-indigo-700"

    const cardContent = (provided?: any, snapshot?: any) => (
      <div
        ref={provided?.innerRef}
        {...(provided?.draggableProps || {})}
        {...(provided?.dragHandleProps || {})}
        className={`group relative mb-3 rounded-2xl border backdrop-blur-xl transition-all duration-300 ease-out will-change-transform max-w-full overflow-hidden ${
          snapshot?.isDragging
            ? "shadow-2xl scale-105 z-50 bg-white/95 dark:bg-slate-900/95 border-primary/50 ring-2 ring-primary/20"
            : "hover:shadow-xl hover:shadow-slate-200/40 dark:hover:shadow-slate-900/40 hover:-translate-y-1 shadow-sm"
        } ${!canEditDeliveryStatus || !isDraggable ? "cursor-default" : "cursor-grab active:cursor-grabbing"} ${cardColorClass}`}
        style={provided?.draggableProps?.style}
      >
        {/* Decorative Gradient Background on Hover */}
        <div className={`absolute inset-0 bg-gradient-to-br from-white/0 to-white/0 group-hover:from-indigo-500/5 group-hover:to-purple-500/5 transition-all duration-500`} />

        <div className={`relative ${isDelivered && !isSignedGuide ? "p-3 sm:p-4" : "p-4 sm:p-5"}`}>
          {/* Header: Sale Number & Date */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className={`h-8 w-8 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center shadow-inner flex-shrink-0 ${
                isCancelled ? "bg-red-100 dark:bg-red-900/30 text-red-600" :
                isSignedGuide ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600" :
                isDelivered ? "bg-green-100 dark:bg-green-900/30 text-green-600" :
                "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/30 group-hover:text-indigo-600 transition-colors"
              }`}>
                <Package2 className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100 leading-tight">
                  #{delivery.sales.sale_number || "S/N"}
                </h4>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Badge variant="outline" className="text-[10px] h-4 px-1.5 bg-white/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 text-slate-500">
                    {format(parseDate(delivery.sales.sale_date), "dd MMM", { locale: es })}
                  </Badge>
                  {delivery.sales.ocam && (
                    <Badge variant="secondary" className="text-[10px] h-4 px-1.5 bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300 border-0">
                      OCAM
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex gap-1">
               {/* Actions */}
               <div className="flex bg-slate-100 dark:bg-slate-800/50 rounded-lg p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded-md hover:bg-white dark:hover:bg-slate-700 hover:text-indigo-600 hover:shadow-sm transition-all"
                  onClick={(e) => { e.stopPropagation(); onEditDelivery(delivery); }}
                  title="Editar"
                >
                  <Edit className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded-md hover:bg-white dark:hover:bg-slate-700 hover:text-indigo-600 hover:shadow-sm transition-all"
                  onClick={(e) => { e.stopPropagation(); onViewDetails(delivery); }}
                  title="Ver Detalles"
                >
                  <Maximize2 className="h-3 w-3" />
                </Button>
               </div>
            </div>
          </div>

          {/* Content: Client & Details */}
          <div className="space-y-2 mb-3">
             <div className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300 group/item">
                <User className="h-4 w-4 text-slate-400 group-hover/item:text-indigo-500 transition-colors flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                   <p className="font-medium truncate leading-tight">{delivery.sales.entity_name}</p>
                   <p className="text-[10px] text-slate-400 font-mono mt-0.5">RUC: {delivery.sales.entity_ruc}</p>
                </div>
             </div>

             <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 group/item">
                <DollarSign className="h-4 w-4 text-slate-400 group-hover/item:text-emerald-500 transition-colors flex-shrink-0" />
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                   S/ {delivery.sales.total_sale.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                </span>
             </div>

             {delivery.sales.final_destination && (
                <div className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400 group/item">
                   <MapPin className="h-3.5 w-3.5 text-slate-400 group-hover/item:text-red-500 transition-colors flex-shrink-0 mt-0.5" />
                   <p className="truncate leading-relaxed">{delivery.sales.final_destination}</p>
                </div>
             )}
          </div>

          {/* Footer: Tags & Status */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700/50 mt-2">
            <div className="flex items-center gap-2">
               {delivery.sales.warehouse_manager && (
                  <div className="flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-full bg-slate-50 dark:bg-slate-800/50 text-slate-500 border border-slate-100 dark:border-slate-800">
                     <User className="h-3 w-3" />
                     <span className="truncate max-w-[80px]">{delivery.sales.warehouse_manager}</span>
                  </div>
               )}
            </div>
            
            {delivery.actual_delivery_date && (
               <Badge variant="outline" className={`text-[10px] font-medium border-0 ${
                  isSignedGuide ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : 
                  "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
               }`}>
                  {isSignedGuide ? "Firmado: " : "Entregado: "}
                  {format(parseDate(delivery.actual_delivery_date), "dd/MM", { locale: es })}
               </Badge>
            )}
          </div>

            {!isDraggable && canEditDeliveryStatus && onMoveCard && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-700/50 mt-2">
                <Label className="text-[10px] text-muted-foreground mb-1 block">Mover a:</Label>
                <Select value={delivery.delivery_status} onValueChange={(value) => onMoveCard(delivery.id, value)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {KANBAN_COLUMNS.map(
                      (
                        col,
                      ) => (
                        <SelectItem key={col.deliveryStatus} value={col.deliveryStatus} className="text-xs">
                          <div className="flex items-center gap-2">
                            <col.icon className="h-3 w-3" />
                            {col.title}
                          </div>
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
        </div>
      </div>
    )

    if (isDraggable) {
      return (
        <Draggable
          key={delivery.id}
          draggableId={delivery.id}
          index={index}
          isDragDisabled={!canEditDeliveryStatus}
        >
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
  const [viewMode, setViewMode] = useState<"board" | "list">("board")

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

  const canEditDeliveryStatus = canSupervise || user?.departments?.name === "Ventas"

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
        .neq("sale_status", "rechazada")

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

      // Prevent moving if the delivery is already 'signed_guide'
      if (delivery.delivery_status === "signed_guide") {
        toast.error(`No se puede mover una entrega con estado "${delivery.delivery_status}"`)
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
                collection_status: "pendiente",
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

        // Register in history
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

      if (oldStatus === "cancelled") {
        toast.error("No se puede mover una entrega cancelada")
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
                collection_status: "pendiente",
                days_in_current_status: 0,
                status_start_date: new Date().toISOString(),
                green_days: 10,
                yellow_days: 5,
              })
              .select()
              .single()

            if (collectionError) {
              // If the record already exists, it's not a critical error
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
        toast.success(`Entrega movida a ${destColumnInfo?.title || newStatus}`)
      } catch (error: any) {
        setColumns(originalColumns)
        toast.error("Error al mover la entrega: " + error.message)
      }
    },
    [canEditDeliveryStatus, columns, user?.id],
  )

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  }

  if (loading && columns.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-muted-foreground animate-pulse">Cargando tablero...</p>
        </div>
      </div>
    )
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "preparing":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "shipped":
        return "bg-purple-100 text-purple-800 border-purple-200"
      case "delivered":
        return "bg-green-100 text-green-800 border-green-200"
      case "signed_guide":
        return "bg-emerald-100 text-emerald-800 border-emerald-200"
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-200"
      default:
        return "bg-slate-100 text-slate-800 border-slate-200"
    }
  }

  const getStatusLabel = (status: string) => {
    const col = KANBAN_COLUMNS.find((c) => c.deliveryStatus === status)
    return col ? col.title : status
  }

  return (
    <>
      <div className="h-[calc(100vh-4rem)] flex flex-col bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-900 dark:to-slate-800/50 p-2 sm:p-4 overflow-hidden">
        <motion.div 
          className="space-y-4 flex-shrink-0 mb-4"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600 dark:from-white dark:via-slate-200 dark:to-slate-400 bg-clip-text text-transparent flex items-center gap-2">
              <Truck className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              Tablero de Entregas
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
              Gestión de: <span className="font-semibold text-foreground">{companyToUse?.name || "N/A"}</span>
              {!canViewAllSales && <span className="ml-2 text-xs text-orange-600 font-medium">(Tus ventas)</span>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg flex items-center">
              <Button
                variant={viewMode === "board" ? "white" : "ghost"}
                size="sm"
                className={`h-7 px-2 text-xs rounded-md transition-all ${viewMode === "board" ? "bg-white dark:bg-slate-700 shadow-sm" : ""}`}
                onClick={() => setViewMode("board")}
              >
                <LayoutGrid className="h-3.5 w-3.5 mr-1.5" />
                Tablero
              </Button>
              <Button
                variant={viewMode === "list" ? "white" : "ghost"}
                size="sm"
                className={`h-7 px-2 text-xs rounded-md transition-all ${viewMode === "list" ? "bg-white dark:bg-slate-700 shadow-sm" : ""}`}
                onClick={() => setViewMode("list")}
              >
                <List className="h-3.5 w-3.5 mr-1.5" />
                Lista
              </Button>
            </div>
            
            <div className="flex items-center gap-1.5">
              {canEditDeliveryStatus ? (
                <Badge variant="default" className="text-[10px] h-7 px-2">
                  <Edit className="h-3 w-3 mr-1" />
                  Edición
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-[10px] h-7 px-2">
                  <Eye className="h-3 w-3 mr-1" />
                  Lectura
                </Badge>
              )}
            </div>
            <Button
              onClick={fetchDeliveries}
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Actualizar
            </Button>
          </div>
        </motion.div>

        {viewMode === "board" ? (
          /* Kanban Board View */
          <div className="flex-1 overflow-x-auto overflow-y-hidden">
            <DragDropContext onDragEnd={handleDragEnd} onDragStart={handleDragStart}>
              <div className="flex h-full min-w-full w-max gap-3 pb-2 px-1">
                {columns.map((column) => (
                  <div key={column.id} className="w-[310px] 2xl:w-[350px] flex-shrink-0 flex flex-col h-full max-h-full">
                    <Droppable droppableId={column.id} isDropDisabled={!canEditDeliveryStatus}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`rounded-xl border-2 ${column.color} flex flex-col h-full max-h-full transition-all duration-300 ${
                            snapshot.isDraggingOver && canEditDeliveryStatus
                              ? "ring-2 ring-primary/50 scale-[1.01] bg-slate-50/80 dark:bg-slate-900/80 z-10"
                              : ""
                          }`}
                        >
                          <div className="flex-shrink-0 p-3 border-b border-black/5 dark:border-white/5 flex items-center justify-between">
                            <h3 className="font-bold text-sm flex items-center gap-2 text-slate-700 dark:text-slate-200">
                              <column.icon className="h-4 w-4" />
                              {column.title}
                            </h3>
                            <Badge variant="secondary" className="bg-white/50 dark:bg-black/20 backdrop-blur-sm font-mono text-[10px] h-5 min-w-[1.25rem] flex items-center justify-center px-1">
                              {column.deliveries.length}
                            </Badge>
                          </div>

                          <div className="flex-1 overflow-y-auto p-2 min-h-0 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
                            <div className="space-y-2">
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
                                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground opacity-50 border-2 border-dashed rounded-lg border-slate-200 dark:border-slate-700 m-1">
                                  <column.icon className="h-6 w-6 mb-1" />
                                  <p className="text-xs font-medium">Vacío</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </Droppable>
                  </div>
                ))}
              </div>
            </DragDropContext>
          </div>
        ) : (
          /* List View */
          <div className="flex-1 overflow-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl shadow-lg">
            <table className="w-full text-sm text-left relative">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-medium sticky top-0 z-10 backdrop-blur-md">
                <tr>
                  <th className="px-4 py-3">Venta</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Fecha Venta</th>
                  <th className="px-4 py-3">Entrega</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {columns.flatMap(col => col.deliveries).map((delivery) => (
                  <tr key={delivery.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        #{delivery.sales.sale_number || "S/N"}
                      </div>
                      {delivery.sales.ocam && (
                        <span className="text-[10px] text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100">
                          OCAM: {delivery.sales.ocam}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium max-w-[200px] truncate" title={delivery.sales.entity_name}>
                        {delivery.sales.entity_name}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {delivery.sales.entity_ruc}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {canEditDeliveryStatus ? (
                        <Select
                          value={delivery.delivery_status}
                          onValueChange={(value) => handleMoveCard(delivery.id, value)}
                          disabled={delivery.delivery_status === "cancelled"}
                        >
                          <SelectTrigger className={`h-8 w-fit min-w-[140px] border-0 ${getStatusBadge(delivery.delivery_status)}`}>
                            <SelectValue>{getStatusLabel(delivery.delivery_status)}</SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {KANBAN_COLUMNS.map((col) => (
                              <SelectItem key={col.deliveryStatus} value={col.deliveryStatus}>
                                <div className="flex items-center gap-2">
                                  <col.icon className="h-4 w-4" />
                                  {col.title}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="outline" className={`${getStatusBadge(delivery.delivery_status)} font-normal`}>
                          {getStatusLabel(delivery.delivery_status)}
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {format(new Date(delivery.sales.sale_date), "dd MMM yyyy", { locale: es })}
                    </td>
                    <td className="px-4 py-3">
                      {delivery.actual_delivery_date ? (
                        <span className="text-green-600 font-medium flex items-center gap-1.5">
                          <CheckCircle className="h-3.5 w-3.5" />
                          {format(new Date(delivery.actual_delivery_date), "dd/MM", { locale: es })}
                        </span>
                      ) : delivery.sales.delivery_end_date ? (
                        <span className="text-blue-600 flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          {format(new Date(delivery.sales.delivery_end_date), "dd/MM", { locale: es })}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs italic">Sin fecha</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      S/ {delivery.sales.total_sale.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-500 hover:text-indigo-600"
                          onClick={() => handleEditDelivery(delivery)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-500 hover:text-indigo-600"
                          onClick={() => handleViewDetails(delivery)}
                        >
                          <Maximize2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {columns.every(col => col.deliveries.length === 0) && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                      No se encontraron entregas
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <DeliveryDetailsDialog
          delivery={viewingDelivery}
          open={!!viewingDelivery}
          onClose={() => setViewingDelivery(null)}
        />

        <Dialog open={!!selectedDelivery} onOpenChange={(open) => !open && setSelectedDelivery(null)}>
          <DialogContent className="sm:max-w-[425px] rounded-2xl">
            <DialogHeader>
              <DialogTitle>Editar Entrega</DialogTitle>
              <DialogDescription>Actualiza los detalles de la entrega.</DialogDescription>
            </DialogHeader>
            {selectedDelivery && (
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="tracking">Número de Tracking</Label>
                  <Input
                    id="tracking"
                    value={editingDelivery.tracking_number || ""}
                    onChange={(e) => setEditingDelivery({ ...editingDelivery, tracking_number: e.target.value })}
                    placeholder="Ej: 123456789"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="assigned">Asignado a</Label>
                  <Input
                    id="assigned"
                    value={editingDelivery.assigned_to || ""}
                    onChange={(e) => setEditingDelivery({ ...editingDelivery, assigned_to: e.target.value })}
                    placeholder="Nombre del repartidor"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="notes">Notas</Label>
                  <Textarea
                    id="notes"
                    value={editingDelivery.notes || ""}
                    onChange={(e) => setEditingDelivery({ ...editingDelivery, notes: e.target.value })}
                    placeholder="Notas adicionales..."
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Documentos</Label>
                  <DeliveryDocumentsLink 
                    deliveryId={selectedDelivery.id} 
                    linkedDocuments={selectedDelivery.delivery_documents || []}
                    onDocumentsChange={(docs: any) => {
                        setSelectedDelivery((prev) => prev ? ({ ...prev, delivery_documents: docs }) : null)
                    }}
                    companyId={selectedDelivery.sales.company_id}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Adjuntos</Label>
                  <DeliveryAttachments
                    deliveryId={selectedDelivery.id}
                    attachments={selectedDelivery.delivery_attachments || []}
                    onAttachmentsChange={(atts: any) => {
                        setSelectedDelivery((prev) => prev ? ({ ...prev, delivery_attachments: atts }) : null)
                    }}
                    canEdit={canEditDeliveryStatus}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedDelivery(null)}>
                Cancelar
              </Button>
              <Button onClick={handleUpdateDelivery}>Guardar Cambios</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>
    </div>
    </>
  )
}
