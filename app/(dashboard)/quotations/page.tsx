"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { toast } from "sonner"
import {
  Plus,
  Search,
  FileText,
  DollarSign,
  TrendingUp,
  Clock,
  Eye,
  Route,
  MapPin,
  AlertTriangle,
  Package,
  Edit,
  MoreHorizontal,
  Trash2,
  RefreshCw,
  ShoppingCart,
  Filter,
  Users,
  Calendar,
  CheckCircle2,
  XCircle,
  Send,
  FileCheck,
  Printer
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Skeleton } from "@/components/ui/skeleton"

import { useAuth } from "@/lib/auth-context"
import { useCompany } from "@/lib/company-context"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import { createNotification } from "@/lib/notifications"

import MultiProductQuotationForm from "@/components/quotations/multi-product-quotation-form"
import MultiProductQuotationEditForm from "@/components/quotations/multi-product-quotation-edit-form"
import RoutePlanner from "@/components/quotations/route-planner"
import QuotationPDFGenerator from "@/components/quotations/quotation-pdf-generator"
import EntityQuotationPDFGenerator from "@/components/quotations/entity-quotation-pdf-generator"
import PrivateQuotationPDFGenerator from "@/components/quotations/private-quotation-pdf-generator"
import ARMEntityQuotationPDFGenerator from "@/components/quotations/entity-quotation-pdf-generator-arm"
import ARMPrivateQuotationPDFGenerator from "@/components/quotations/private-quotation-pdf-generator-arm"
import GALUREntityQuotationPDFGenerator from "@/components/quotations/entity-quotation-pdf-generator-galur"
import GALURPrivateQuotationPDFGenerator from "@/components/quotations/private-quotation-pdf-generator-galur"

// Interfaces
interface QuotationItem {
  id: string
  quotation_id: string
  product_id: string | null
  product_code: string
  product_name: string
  product_description: string | null
  product_brand: string | null
  quantity: number
  platform_unit_price_with_tax: number
  platform_total: number
  supplier_unit_price_with_tax: number | null
  supplier_total: number | null
  offer_unit_price_with_tax: number | null
  offer_total_with_tax: number | null
  reference_image_url: string | null
  budget_ceiling_unit_price_with_tax: number | null
  budget_ceiling_total: number | null
  item_commission_percentage: number | null
  item_commission_base_amount: number | null
  item_commission_amount: number | null
  created_at: string
  updated_at: string
}

interface Quotation {
  id: string
  quotation_date: string
  quotation_number: string | null
  company_id: string
  company_name: string
  company_ruc: string
  entity_id: string
  entity_name: string
  entity_ruc: string
  delivery_location: string
  status: string
  valid_until: string | null
  observations: string | null
  created_by: string
  created_at: string
  updated_at: string
  // Campos de ruta
  route_origin_address: string | null
  route_destination_address: string | null
  route_distance_km: number | null
  route_duration_minutes: number | null
  route_google_maps_url: string | null
  route_created_at: string | null
  route_created_by: string | null
  // Campos de multi-producto
  is_multi_product: boolean | null
  items_count: number | null
  budget_ceiling_total: number | null
  // Campos de comisión
  contact_person: string | null
  commission_percentage: number | null
  commission_base_amount: number | null
  commission_amount: number | null
  commission_notes: string | null
  // Relaciones
  profiles?: {
    full_name: string
  }
  sales_entities?: {
    fiscal_address: string | null
    client_type: string | null
  }
  quotation_items?: QuotationItem[]
}

interface QuotationsStats {
  totalQuotations: number
  draftQuotations: number
  sentQuotations: number
  approvedQuotations: number
  totalQuotedAmount: number
  averageQuotation: number
}

// Animations
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

interface DeleteConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  title: string
  description: string
  itemName: string
  isDeleting: boolean
}

const DeleteConfirmationDialog: React.FC<DeleteConfirmationDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  itemName,
  isDeleting,
}) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-slate-900 dark:text-slate-100">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-slate-500 dark:text-slate-400">
            {description}
            <br />
            <span className="font-medium text-slate-700 dark:text-slate-300">{itemName}</span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting} className="border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800">
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={isDeleting}
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isDeleting ? "Eliminando..." : "Eliminar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default function QuotationsPage() {
  const { user } = useAuth()
  const { selectedCompany } = useCompany()
  const [selectedYear, setSelectedYear] = useState<string>("2026")
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [stats, setStats] = useState<QuotationsStats>({
    totalQuotations: 0,
    draftQuotations: 0,
    sentQuotations: 0,
    approvedQuotations: 0,
    totalQuotedAmount: 0,
    averageQuotation: 0,
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [showNewQuotationDialog, setShowNewQuotationDialog] = useState(false)
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null) // For status change
  const [editingQuotationContent, setEditingQuotationContent] = useState<Quotation | null>(null) // For content edit
  const [showEditStatusDialog, setShowEditStatusDialog] = useState(false)
  const [showEditContentDialog, setShowEditContentDialog] = useState(false)
  const [newStatus, setNewStatus] = useState("")
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [quotationToDelete, setQuotationToDelete] = useState<Quotation | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Permissions
  const hasQuotationsAccess =
    user?.role === "admin" ||
    user?.role === "supervisor" ||
    ["Ventas", "Administración", "Operaciones", "Jefatura de Ventas"].includes(user?.departments?.name || "")

  const canViewAllQuotations =
    user?.role === "admin" ||
    user?.role === "supervisor" ||
    ["Administración", "Operaciones", "Jefatura de Ventas"].includes(user?.departments?.name || "")

  const isReadOnlyYear = selectedYear === "2025"
  const canModify = !isReadOnlyYear

  const companyToUse = user?.role === "admin" ? selectedCompany : user?.company_id ? { id: user.company_id } : null

  useEffect(() => {
    const companyId = user?.role === "admin" ? selectedCompany?.id : user?.company_id
    setCompanyId(companyId)

    if (companyId && hasQuotationsAccess) {
      fetchQuotations(companyId, false, selectedYear)
      fetchStats(companyId, selectedYear)
    } else {
      setLoading(false)
    }
  }, [user, selectedCompany, selectedYear])

  const fetchQuotations = async (companyId: string, isRefresh = false, year = selectedYear) => {
    try {
      if (isRefresh) setRefreshing(true)
      else setLoading(true)

      console.log("Cargando cotizaciones para empresa:", companyId, "Año:", year)

      let query = supabase
        .from("quotations")
        .select(`
          *,
          profiles!quotations_created_by_fkey (full_name),
          sales_entities!quotations_entity_id_fkey (fiscal_address, client_type),
          quotation_items (
            id,
            product_id,
            product_code,
            product_name,
            product_description,
            product_brand,
            quantity,
            platform_unit_price_with_tax,
            platform_total,
            supplier_unit_price_with_tax,
            supplier_total,
            offer_unit_price_with_tax,
            offer_total_with_tax,
            reference_image_url,
            budget_ceiling_unit_price_with_tax,
            budget_ceiling_total,
            item_commission_percentage,
            item_commission_base_amount,
            item_commission_amount
          )
        `)
        .eq("company_id", companyId)

      const startDate = `${year}-01-01T00:00:00Z`
      const endDate = `${year}-12-31T23:59:59Z`
      query = query.gte("quotation_date", startDate).lte("quotation_date", endDate)

      if (!canViewAllQuotations && user?.id) {
        query = query.eq("created_by", user.id)
      }

      const { data: quotationsData, error: quotationsError } = await query.order("quotation_date", { ascending: false })

      if (quotationsError) {
        console.error("Quotations error:", quotationsError)
        throw quotationsError
      }

      setQuotations(quotationsData || [])
    } catch (error: any) {
      console.error("Error fetching quotations:", error)
      toast.error("Error al cargar las cotizaciones: " + error.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const fetchStats = async (companyId: string, year = selectedYear) => {
    try {
      let query = supabase
        .from("quotations")
        .select(`
          *,
          quotation_items (
            platform_total,
            supplier_total,
            offer_total_with_tax,
            quantity
          )
        `)
        .eq("company_id", companyId)

      const startDate = `${year}-01-01T00:00:00Z`
      const endDate = `${year}-12-31T23:59:59Z`
      query = query.gte("quotation_date", startDate).lte("quotation_date", endDate)

      if (!canViewAllQuotations && user?.id) {
        query = query.eq("created_by", user.id)
      }

      const { data: quotationsData, error } = await query

      if (error) throw error

      const totalQuotations = quotationsData?.length || 0
      const draftQuotations = quotationsData?.filter((q) => q.status === "draft").length || 0
      const sentQuotations = quotationsData?.filter((q) => q.status === "sent").length || 0
      const approvedQuotations = quotationsData?.filter((q) => q.status === "approved").length || 0

      let totalQuotedAmount = 0

      for (const quotation of quotationsData || []) {
        if (quotation.quotation_items && quotation.quotation_items.length > 0) {
          const quotationTotal = quotation.quotation_items.reduce((sum: number, item: any) => {
            return sum + (item.offer_total_with_tax || item.platform_total || 0)
          }, 0)
          totalQuotedAmount += quotationTotal
        }
      }

      const averageQuotation = totalQuotations > 0 ? totalQuotedAmount / totalQuotations : 0

      setStats({
        totalQuotations,
        draftQuotations,
        sentQuotations,
        approvedQuotations,
        totalQuotedAmount,
        averageQuotation,
      })
    } catch (error: any) {
      console.error("Error fetching stats:", error)
    }
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
      sent: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
      approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
      rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
      expired: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
    }

    const labels: Record<string, string> = {
      draft: "Borrador",
      sent: "Enviada",
      approved: "Aprobada",
      rejected: "Rechazada",
      expired: "Expirada",
    }

    const icons: Record<string, any> = {
      draft: Edit,
      sent: Send,
      approved: CheckCircle2,
      rejected: XCircle,
      expired: Clock,
    }

    const Icon = icons[status] || FileText

    return (
      <Badge variant="outline" className={cn("border-0 font-medium px-2 py-1 flex items-center gap-1.5", styles[status] || styles.draft)}>
        <Icon className="h-3 w-3" />
        {labels[status] || "Desconocido"}
      </Badge>
    )
  }

  const filteredQuotations = quotations.filter((quotation) => {
    if (!searchTerm) return true
    const searchLower = searchTerm.toLowerCase()
    const containsSearch = (value: string | null | undefined): boolean => {
      if (!value) return false
      return value.toLowerCase().includes(searchLower)
    }

    const quotationMatch =
      containsSearch(quotation.entity_name) ||
      containsSearch(quotation.quotation_number) ||
      containsSearch(quotation.entity_ruc) ||
      containsSearch(quotation.company_name) ||
      containsSearch(quotation.contact_person)

    const itemsMatch =
      quotation.quotation_items?.some(
        (item) =>
          containsSearch(item.product_name) ||
          containsSearch(item.product_description) ||
          containsSearch(item.product_code) ||
          containsSearch(item.product_brand),
      ) || false

    return quotationMatch || itemsMatch
  })

  const updateQuotationStatus = async () => {
    if (!editingQuotation || !newStatus) return
    const oldStatus = editingQuotation.status
    const isCreator = editingQuotation.created_by === user?.id
    const canChangeStatus = canViewAllQuotations || isCreator

    if (!canChangeStatus) {
      toast.error("No tienes permisos para cambiar el estado de esta cotización.")
      return
    }

    try {
      const { error } = await supabase.from("quotations").update({ status: newStatus }).eq("id", editingQuotation.id)

      if (error) throw error

      toast.success("Estado actualizado exitosamente")

      // Notificaciones
      if (selectedCompany?.id) {
        if (isCreator && oldStatus === "draft" && newStatus === "sent") {
          const { data: salesHeadDept } = await supabase
            .from("departments")
            .select("id")
            .eq("name", "Jefatura de Ventas")
            .eq("company_id", selectedCompany.id)
            .single()

          if (salesHeadDept) {
            const { data: salesHeads } = await supabase
              .from("profiles")
              .select("id")
              .eq("department_id", salesHeadDept.id)
              .eq("company_id", selectedCompany.id)

            for (const head of salesHeads || []) {
              await createNotification({
                userId: head.id,
                title: "Nueva Cotización Enviada para Revisión",
                message: `La cotización #${editingQuotation.quotation_number || editingQuotation.id.slice(0, 8)} de ${editingQuotation.entity_name} ha sido enviada por ${user?.full_name} y requiere tu revisión.`,
                type: "quotation_review",
                relatedId: editingQuotation.id,
                companyId: selectedCompany.id,
              })
            }
          }
        }

        if ((newStatus === "approved" || newStatus === "rejected") && editingQuotation.created_by) {
          await createNotification({
            userId: editingQuotation.created_by,
            title: `Cotización ${newStatus === "approved" ? "Aprobada" : "Rechazada"}`,
            message: `Tu cotización #${editingQuotation.quotation_number || editingQuotation.id.slice(0, 8)} para ${editingQuotation.entity_name} ha sido ${newStatus === "approved" ? "APROBADA" : "RECHAZADA"}.`,
            type: "quotation_status_update",
            relatedId: editingQuotation.id,
            companyId: selectedCompany.id,
          })
        }
      }

      setShowEditStatusDialog(false)
      setEditingQuotation(null)
      setNewStatus("")
      if (companyId) {
        fetchQuotations(companyId, false, selectedYear)
        fetchStats(companyId, selectedYear)
      }
    } catch (error: any) {
      toast.error("Error al actualizar el estado: " + error.message)
    }
  }

  const handleDeleteQuotation = async () => {
    if (!quotationToDelete) return
    setIsDeleting(true)
    try {
      const { error } = await supabase.from("quotations").delete().eq("id", quotationToDelete.id)
      if (error) throw error
      toast.success("Cotización eliminada exitosamente")
      setShowDeleteDialog(false)
      setQuotationToDelete(null)
      if (companyId) {
        fetchQuotations(companyId, false, selectedYear)
        fetchStats(companyId, selectedYear)
      }
    } catch (error: any) {
      toast.error("Error al eliminar la cotización: " + error.message)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleRouteUpdated = async () => {
    if (selectedQuotation && companyId) {
      try {
        const { data, error } = await supabase
          .from("quotations")
          .select(`
            *,
            profiles!quotations_created_by_fkey (full_name),
            sales_entities!quotations_entity_id_fkey (fiscal_address, client_type),
            quotation_items (
              id,
              product_id,
              product_code,
              product_name,
              product_description,
              product_brand,
              quantity,
              platform_unit_price_with_tax,
              platform_total,
              supplier_unit_price_with_tax,
              supplier_total,
              offer_unit_price_with_tax,
              offer_total_with_tax,
              reference_image_url,
              budget_ceiling_unit_price_with_tax,
              budget_ceiling_total,
              item_commission_percentage,
              item_commission_base_amount,
              item_commission_amount
            )
          `)
          .eq("id", selectedQuotation.id)
          .single()

        if (error) throw error

        if (data) {
          setSelectedQuotation(data)
          setQuotations((prev) => prev.map((q) => (q.id === data.id ? data : q)))
          if (companyId) fetchStats(companyId, selectedYear)
          toast.success("Información de ruta actualizada correctamente")
        }
      } catch (error) {
        toast.error("Error al actualizar la información de la cotización")
      }
    }
  }

  const getQuotationDisplayData = (quotation: Quotation) => {
    if (quotation.quotation_items && quotation.quotation_items.length > 0) {
      const totalItems = quotation.quotation_items.length
      const totalQuantity = quotation.quotation_items.reduce((sum, item) => sum + (item.quantity || 0), 0)
      const totalAmount = quotation.quotation_items.reduce((sum, item) => {
        return sum + (item.offer_total_with_tax || item.platform_total || 0)
      }, 0)

      if (quotation.is_multi_product) {
        return {
          productDescription: `${totalItems} productos (${totalQuantity} items)`,
          quantity: `${totalQuantity} items`,
          totalAmount: totalAmount,
          hasItems: true,
        }
      } else {
        const firstItem = quotation.quotation_items[0]
        return {
          productDescription: firstItem.product_description || firstItem.product_name || "Sin descripción",
          quantity: firstItem.quantity?.toLocaleString() || "0",
          totalAmount: totalAmount,
          hasItems: true,
        }
      }
    } else {
      return {
        productDescription: "Sin productos",
        quantity: "0",
        totalAmount: 0,
        hasItems: false,
      }
    }
  }

  if (!hasQuotationsAccess || !companyToUse) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Card className="max-w-md w-full border-none shadow-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
          <CardContent className="p-8 text-center space-y-4">
            <AlertTriangle className="mx-auto h-12 w-12 text-amber-500" />
            <h3 className="text-xl font-bold">Acceso Restringido</h3>
            <p className="text-slate-500">No tienes permisos para ver este módulo o no has seleccionado una empresa.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="p-4 sm:p-6 lg:p-8 space-y-8 min-h-[calc(100vh-4rem)]"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-slate-900 via-slate-700 to-slate-600 dark:from-white dark:via-slate-200 dark:to-slate-400 bg-clip-text text-transparent flex items-center gap-3">
            <FileText className="h-8 w-8 text-indigo-500" />
            Cotizaciones
          </h1>
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1">
            Gestiona propuestas y presupuestos
            {!canViewAllQuotations && <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full dark:bg-amber-900/30 dark:text-amber-300">Mis Cotizaciones</span>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[120px] rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <SelectValue placeholder="Año" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="2026">2026</SelectItem>
              <SelectItem value="2025">2025</SelectItem>
            </SelectContent>
          </Select>

          {canModify && (
            <Button
              onClick={() => setShowNewQuotationDialog(true)}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20"
            >
              <Plus className="h-4 w-4 mr-2" /> Nueva Cotización
            </Button>
          )}
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Cotizaciones", value: stats.totalQuotations, icon: FileText, color: "blue" },
          { label: "Monto Cotizado", value: `S/ ${stats.totalQuotedAmount.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`, icon: DollarSign, color: "emerald" },
          { label: "Ticket Promedio", value: `S/ ${stats.averageQuotation.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`, icon: TrendingUp, color: "indigo" },
          { label: "Aprobadas", value: stats.approvedQuotations, icon: CheckCircle2, color: "amber" }
        ].map((stat, i) => (
          <Card key={i} className="border-none shadow-sm hover:shadow-md transition-all duration-300 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{stat.label}</p>
                <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{stat.value}</h3>
              </div>
              <div className={`p-3 rounded-xl bg-${stat.color}-50 dark:bg-${stat.color}-900/20 text-${stat.color}-600`}>
                <stat.icon className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Toolbar & Search */}
      <motion.div variants={itemVariants}>
        <Card className="border-none shadow-md bg-white/50 dark:bg-slate-900/50 backdrop-blur-md rounded-2xl overflow-hidden">
          <CardContent className="p-4 sm:p-6 bg-slate-50/30 dark:bg-slate-900/30 flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="relative w-full md:max-w-md group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <Input
                placeholder="Buscar por cliente, RUC, número..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-11 rounded-xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <Button variant="ghost" onClick={() => { if (companyId) fetchQuotations(companyId, true, selectedYear) }} disabled={refreshing} className="rounded-xl text-slate-500 hover:text-indigo-600">
              <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
              Actualizar
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Quotations List - Card View */}
      <motion.div variants={itemVariants}>
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : filteredQuotations.length === 0 ? (
          <Card className="border-none shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl p-12 text-center">
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full">
                <FileText className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-200">No se encontraron cotizaciones</h3>
              <p className="text-slate-500">Intenta ajustar tu búsqueda o crea una nueva cotización.</p>
            </div>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredQuotations.map((quotation, index) => {
              const displayData = getQuotationDisplayData(quotation)
              const hasRoute = quotation.route_distance_km && quotation.route_distance_km > 0

              return (
                <motion.div
                  key={quotation.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="group border-none shadow-sm hover:shadow-md transition-all duration-300 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-xl overflow-hidden">
                    <CardContent className="p-0">
                      <div className="flex flex-col lg:flex-row">
                        {/* Status Stripe */}
                        <div className={cn("w-full lg:w-2 transition-colors",
                          quotation.status === "approved" ? "bg-emerald-500" :
                            quotation.status === "rejected" ? "bg-red-500" :
                              quotation.status === "sent" ? "bg-blue-500" :
                                quotation.status === "expired" ? "bg-orange-500" :
                                  "bg-slate-300 dark:bg-slate-700 group-hover:bg-indigo-500"
                        )} />

                        <div className="flex-1 p-5 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                          {/* Info Principal */}
                          <div className="lg:col-span-4 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-500">
                                {quotation.quotation_number || `#${quotation.id.slice(0, 8)}`}
                              </span>
                              <span className="text-xs text-slate-400">
                                {format(new Date(quotation.quotation_date), "dd MMM yyyy", { locale: es })}
                              </span>
                            </div>
                            <h3 className="font-bold text-slate-800 dark:text-slate-100 line-clamp-1" title={quotation.entity_name}>
                              {quotation.entity_name}
                            </h3>
                            <p className="text-sm text-slate-500">{quotation.entity_ruc}</p>
                          </div>

                          {/* Producto */}
                          <div className="lg:col-span-3 space-y-1">
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-200 line-clamp-2" title={displayData.productDescription}>
                              {displayData.productDescription}
                            </p>
                            <p className="text-xs text-slate-500">
                              {displayData.quantity}
                            </p>
                          </div>

                          {/* Monto y Estado */}
                          <div className="lg:col-span-3 flex flex-col lg:items-end gap-2">
                            <p className="font-bold text-slate-800 dark:text-slate-100">
                              S/ {displayData.totalAmount.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                            </p>
                            <div className="flex gap-2 items-center">
                              {getStatusBadge(quotation.status)}
                              {hasRoute && (
                                <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800 flex gap-1">
                                  <Route className="h-3 w-3" /> {quotation.route_distance_km?.toFixed(0)} km
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Acciones */}
                          <div className="lg:col-span-2 flex justify-end gap-2">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                                  <MoreHorizontal className="h-5 w-5 text-slate-500" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="rounded-xl w-56">
                                <DropdownMenuItem onClick={() => { setSelectedQuotation(quotation); setShowDetailsDialog(true); }}>
                                  <Eye className="mr-2 h-4 w-4" /> Ver Detalles
                                </DropdownMenuItem>

                                {canModify && ((quotation.status === "draft" && quotation.created_by === user?.id) ||
                                  (quotation.status === "sent" &&
                                    (user?.departments?.name === "Jefatura de Ventas" ||
                                      user?.role === "admin" ||
                                      user?.role === "supervisor"))) && (
                                    <DropdownMenuItem onClick={() => { setEditingQuotationContent(quotation); setShowEditContentDialog(true); }}>
                                      <Edit className="mr-2 h-4 w-4" /> {quotation.status === "sent" ? "Revisar y Editar" : "Editar Contenido"}
                                    </DropdownMenuItem>
                                  )}

                                {canModify && (canViewAllQuotations || quotation.created_by === user?.id) && (
                                  <DropdownMenuItem onClick={() => { setEditingQuotation(quotation); setNewStatus(quotation.status); setShowEditStatusDialog(true); }}>
                                    <Clock className="mr-2 h-4 w-4" /> Cambiar Estado
                                  </DropdownMenuItem>
                                )}

                                <DropdownMenuSeparator />

                                <DropdownMenuSub>
                                  <DropdownMenuSubTrigger>
                                    <Printer className="mr-2 h-4 w-4" /> Generar PDFs
                                  </DropdownMenuSubTrigger>
                                  <DropdownMenuSubContent className="rounded-xl">
                                    {selectedCompany?.code === "GALUR" ? (
                                      <>
                                        <DropdownMenuItem asChild>
                                          <GALUREntityQuotationPDFGenerator quotation={quotation} companyInfo={selectedCompany} />
                                        </DropdownMenuItem>
                                        <DropdownMenuItem asChild>
                                          <GALURPrivateQuotationPDFGenerator quotation={quotation} companyInfo={selectedCompany} />
                                        </DropdownMenuItem>
                                      </>
                                    ) : selectedCompany?.code === "ARM" ? (
                                      <>
                                        <DropdownMenuItem asChild>
                                          <ARMEntityQuotationPDFGenerator quotation={quotation} companyInfo={selectedCompany} />
                                        </DropdownMenuItem>
                                        <DropdownMenuItem asChild>
                                          <ARMPrivateQuotationPDFGenerator quotation={quotation} companyInfo={selectedCompany} />
                                        </DropdownMenuItem>
                                      </>
                                    ) : (
                                      <>
                                        <DropdownMenuItem asChild>
                                          <EntityQuotationPDFGenerator
                                            quotation={{ ...quotation, fiscal_address: quotation.sales_entities?.fiscal_address || null }}
                                            companyInfo={selectedCompany}
                                          />
                                        </DropdownMenuItem>
                                        <DropdownMenuItem asChild>
                                          <PrivateQuotationPDFGenerator
                                            quotation={{ ...quotation, fiscal_address: quotation.sales_entities?.fiscal_address || null }}
                                            companyInfo={selectedCompany}
                                          />
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                    <DropdownMenuItem asChild>
                                      <QuotationPDFGenerator quotation={quotation} companyInfo={selectedCompany} />
                                    </DropdownMenuItem>
                                  </DropdownMenuSubContent>
                                </DropdownMenuSub>

                                {canModify && (quotation.status === "draft" || quotation.status === "rejected") &&
                                  (quotation.created_by === user?.id || canViewAllQuotations) && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem onClick={() => { setQuotationToDelete(quotation); setShowDeleteDialog(true); }} className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/20">
                                        <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                                      </DropdownMenuItem>
                                    </>
                                  )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        )}
      </motion.div>

      {/* Dialogs */}

      {/* New Quotation Dialog */}
      <Dialog open={showNewQuotationDialog} onOpenChange={setShowNewQuotationDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>Crear Nueva Cotización</DialogTitle>
            <DialogDescription>Completa todos los campos para crear una nueva cotización</DialogDescription>
          </DialogHeader>
          {showNewQuotationDialog && (
            <MultiProductQuotationForm
              onSuccess={() => {
                setShowNewQuotationDialog(false)
                if (companyId) {
                  fetchQuotations(companyId)
                  fetchStats(companyId)
                }
              }}
              onCancel={() => setShowNewQuotationDialog(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Content Dialog */}
      <Dialog open={showEditContentDialog} onOpenChange={setShowEditContentDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>Editar Cotización</DialogTitle>
            <DialogDescription>
              Modifica el contenido de la cotización: {editingQuotationContent?.quotation_number || `#${editingQuotationContent?.id.slice(0, 8)}`}
            </DialogDescription>
          </DialogHeader>
          {editingQuotationContent && (
            <MultiProductQuotationEditForm
              quotation={editingQuotationContent}
              onSuccess={() => {
                setShowEditContentDialog(false)
                setEditingQuotationContent(null)
                if (companyId) {
                  fetchQuotations(companyId)
                  fetchStats(companyId)
                }
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Status Dialog */}
      <Dialog open={showEditStatusDialog} onOpenChange={setShowEditStatusDialog}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Cambiar Estado</DialogTitle>
            <DialogDescription>Selecciona el nuevo estado para la cotización</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="grid gap-2">
              {["draft", "sent", "approved", "rejected", "expired"].map((status) => (
                <Button
                  key={status}
                  variant="outline"
                  onClick={() => setNewStatus(status)}
                  className={cn(
                    "justify-start h-12 rounded-xl",
                    newStatus === status ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300" : ""
                  )}
                >
                  {getStatusBadge(status)}
                  <span className="ml-2 capitalize hidden">Select</span>
                </Button>
              ))}
            </div>
            <div className="flex justify-end pt-4">
              <Button onClick={updateQuotationStatus} className="rounded-xl bg-indigo-600 hover:bg-indigo-700">
                Confirmar Cambio
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-slate-200/50 dark:border-slate-700/50 shadow-2xl p-0">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
              Detalles de Cotización
            </DialogTitle>
          </DialogHeader>

          {selectedQuotation && (
            <Tabs defaultValue="details" className="w-full">
              <div className="px-6">
                <TabsList className="grid w-full grid-cols-2 rounded-xl bg-slate-100 dark:bg-slate-800">
                  <TabsTrigger value="details" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm">
                    <FileText className="h-4 w-4 mr-2" /> Detalles
                  </TabsTrigger>
                  {canModify && (
                    <TabsTrigger value="route" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm">
                      <Route className="h-4 w-4 mr-2" /> Planificar Ruta
                    </TabsTrigger>
                  )}
                </TabsList>
              </div>

              <TabsContent value="details" className="max-h-[70vh] overflow-y-auto p-6 pt-4 space-y-6">
                {/* Header Summary */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-6 rounded-2xl bg-slate-50/50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 backdrop-blur-sm">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-3xl font-bold text-slate-900 dark:text-white">
                        {selectedQuotation.quotation_number || `#${selectedQuotation.id.slice(0, 8)}`}
                      </h3>
                      {getStatusBadge(selectedQuotation.status)}
                    </div>
                    <p className="text-slate-500 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(selectedQuotation.quotation_date), "PPP", { locale: es })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Cotizado</p>
                    <p className="text-4xl font-extrabold text-indigo-600 dark:text-indigo-400">
                      S/ {getQuotationDisplayData(selectedQuotation).totalAmount.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                {/* Client & Delivery Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="border-slate-200/60 dark:border-slate-700/60 shadow-sm bg-white/60 dark:bg-slate-900/60">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2 text-slate-700 dark:text-slate-200">
                        <Users className="h-4 w-4 text-indigo-500" /> Cliente
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <Label className="text-xs text-slate-400 uppercase">Razón Social</Label>
                        <p className="font-medium text-slate-900 dark:text-slate-100">{selectedQuotation.entity_name}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-slate-400 uppercase">RUC</Label>
                        <p className="font-medium text-slate-700 dark:text-slate-300 font-mono">{selectedQuotation.entity_ruc}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-slate-400 uppercase">Dirección Fiscal</Label>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {selectedQuotation.sales_entities?.fiscal_address || "No especificada"}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-slate-200/60 dark:border-slate-700/60 shadow-sm bg-white/60 dark:bg-slate-900/60">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2 text-slate-700 dark:text-slate-200">
                        <MapPin className="h-4 w-4 text-emerald-500" /> Entrega
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <Label className="text-xs text-slate-400 uppercase">Lugar de Entrega</Label>
                        <p className="text-sm text-slate-600 dark:text-slate-400">{selectedQuotation.delivery_location}</p>
                      </div>
                      {selectedQuotation.route_distance_km && (
                        <div className="grid grid-cols-2 gap-4 pt-2">
                          <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded border border-emerald-100 dark:border-emerald-800">
                            <span className="text-xs text-emerald-600 font-bold block">Distancia</span>
                            <span className="text-emerald-800 dark:text-emerald-300">{selectedQuotation.route_distance_km.toFixed(1)} km</span>
                          </div>
                          <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-100 dark:border-blue-800">
                            <span className="text-xs text-blue-600 font-bold block">Tiempo Est.</span>
                            <span className="text-blue-800 dark:text-blue-300">
                              {selectedQuotation.route_duration_minutes ? `${Math.floor(selectedQuotation.route_duration_minutes / 60)}h ${selectedQuotation.route_duration_minutes % 60}m` : "N/A"}
                            </span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Items List */}
                <Card className="border-slate-200/60 dark:border-slate-700/60 shadow-sm bg-white/60 dark:bg-slate-900/60 overflow-hidden">
                  <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                    <CardTitle className="text-base flex items-center gap-2 text-slate-700 dark:text-slate-200">
                      <Package className="h-4 w-4 text-blue-500" /> Items ({selectedQuotation.items_count || selectedQuotation.quotation_items?.length || 0})
                    </CardTitle>
                  </CardHeader>
                  <div className="p-0 overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50">
                        <TableRow>
                          <TableHead>Producto</TableHead>
                          <TableHead className="text-right">Cantidad</TableHead>
                          <TableHead className="text-right">Unitario</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedQuotation.quotation_items?.map((item, idx) => (
                          <TableRow key={item.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                            <TableCell>
                              <div className="font-medium text-slate-700 dark:text-slate-200">{item.product_name}</div>
                              <div className="text-xs text-slate-500 whitespace-pre-wrap">{item.product_description}</div>
                              {item.product_brand && <Badge variant="outline" className="text-[10px] mt-1">{item.product_brand}</Badge>}
                            </TableCell>
                            <TableCell className="text-right font-medium">{item.quantity}</TableCell>
                            <TableCell className="text-right text-slate-500">
                              S/ {(item.offer_unit_price_with_tax || item.platform_unit_price_with_tax).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-right font-bold text-slate-700 dark:text-slate-200">
                              S/ {(item.offer_total_with_tax || item.platform_total).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </Card>

                {/* Commission Info if exists */}
                {(selectedQuotation.contact_person || selectedQuotation.commission_percentage) && (
                  <div className="p-4 rounded-xl bg-violet-50/50 dark:bg-violet-900/10 border border-violet-100 dark:border-violet-800/50">
                    <h4 className="font-semibold text-violet-800 dark:text-violet-300 mb-2 flex items-center gap-2">
                      <DollarSign className="h-4 w-4" /> Datos de Comisión
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                      {selectedQuotation.contact_person && (
                        <div>
                          <span className="text-violet-600/70 block text-xs uppercase">Contacto</span>
                          <span className="font-medium text-violet-900 dark:text-violet-100">{selectedQuotation.contact_person}</span>
                        </div>
                      )}
                      {selectedQuotation.commission_percentage && (
                        <div>
                          <span className="text-violet-600/70 block text-xs uppercase">Porcentaje</span>
                          <span className="font-medium text-violet-900 dark:text-violet-100">{selectedQuotation.commission_percentage}%</span>
                        </div>
                      )}
                      {selectedQuotation.commission_amount && (
                        <div>
                          <span className="text-violet-600/70 block text-xs uppercase">Monto Comisión</span>
                          <span className="font-bold text-violet-900 dark:text-violet-100">S/ {selectedQuotation.commission_amount.toLocaleString("es-PE", { minimumFractionDigits: 2 })}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="route" className="max-h-[70vh] overflow-y-auto p-6">
                <RoutePlanner
                  quotationId={selectedQuotation.id}
                  initialDestination={selectedQuotation.delivery_location}
                  onRouteCalculated={handleRouteUpdated}
                />
              </TabsContent>
            </Tabs>
          )}
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-end">
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)} className="rounded-xl">Cerrar</Button>
          </div>
        </DialogContent>
      </Dialog>

      <DeleteConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleDeleteQuotation}
        title="Eliminar Cotización"
        description="¿Estás seguro de que quieres eliminar esta cotización? Esta acción no se puede deshacer."
        itemName={quotationToDelete?.quotation_number || `#${quotationToDelete?.id.slice(0, 8)}`}
        isDeleting={isDeleting}
      />
    </motion.div>
  )
}
