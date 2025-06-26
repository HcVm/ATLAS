"use client"

import { DialogTrigger } from "@/components/ui/dialog"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Search, FileText, DollarSign, TrendingUp, Clock, Eye, Route, MapPin, AlertTriangle, Package, Edit, ShoppingCart } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/lib/auth-context"
import { useCompany } from "@/lib/company-context"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import MultiProductQuotationForm from "@/components/quotations/multi-product-quotation-form"
import RoutePlanner from "@/components/quotations/route-planner"
import QuotationPDFGenerator from "@/components/quotations/quotation-pdf-generator"
import EntityQuotationPDFGenerator from "@/components/quotations/entity-quotation-pdf-generator"

// Interfaces
interface QuotationItem {
  id: string; product_name: string; product_description: string; product_code: string; product_brand: string; quantity: number; platform_unit_price_with_tax: number; platform_total: number; supplier_unit_price_with_tax?: number; supplier_total?: number; offer_unit_price_with_tax?: number; offer_total_with_tax?: number; final_unit_price_with_tax?: number; reference_image_url?: string; budget_ceiling_unit_price_with_tax?: number; budget_ceiling_total?: number;
}
interface Quotation {
  id: string; quotation_date: string; quotation_number: string; entity_name: string; entity_ruc: string; delivery_location: string; unique_code: string; product_description: string | null; product_brand: string | null; quantity: number | null; platform_unit_price_with_tax: number | null; platform_total: number | null; supplier_unit_price_with_tax: number | null; supplier_total: number | null; offer_unit_price_with_tax: number | null; offer_total_with_tax: number | null; final_unit_price_with_tax: number | null; budget_ceiling: number | null; status: string; valid_until: string | null; created_by: string; observations: string | null; is_multi_product: boolean | null; items_count: number | null; route_origin_address?: string | null; route_destination_address?: string | null; route_distance_km?: number | null; route_duration_minutes?: number | null; route_Maps_url?: string | null; route_created_at?: string | null; route_created_by?: string | null; profiles?: { full_name: string }; reference_image_url: string | null; quotation_items?: QuotationItem[]; contact_person?: string | null; commission_percentage?: number | null; commission_base_amount?: number | null; commission_amount?: number | null; commission_notes?: string | null;
}
interface QuotationsStats {
  totalQuotations: number; draftQuotations: number; sentQuotations: number; approvedQuotations: number; totalQuotedAmount: number; averageQuotation: number;
}

export default function QuotationsPage() {
  const { user } = useAuth()
  const { selectedCompany } = useCompany()
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [stats, setStats] = useState<QuotationsStats>({ totalQuotations: 0, draftQuotations: 0, sentQuotations: 0, approvedQuotations: 0, totalQuotedAmount: 0, averageQuotation: 0 })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [showNewQuotationDialog, setShowNewQuotationDialog] = useState(false)
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null)
  const [showEditStatusDialog, setShowEditStatusDialog] = useState(false)
  const [newStatus, setNewStatus] = useState("")
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [companyId, setCompanyId] = useState<string | null>(null)

  const hasQuotationsAccess = user?.role === "admin" || user?.role === "supervisor" || user?.departments?.name === "Ventas" || user?.departments?.name === "Administración" || user?.departments?.name === "Operaciones"
  const companyToUse = user?.role === "admin" ? selectedCompany : user?.company_id ? { id: user.company_id } : null

  useEffect(() => {
    const companyId = user?.role === "admin" ? selectedCompany?.id : user?.company_id
    setCompanyId(companyId)

    if (companyId && hasQuotationsAccess) {
      fetchQuotations(companyId)
      fetchStats(companyId)
    } else {
      setLoading(false)
    }
  }, [user, selectedCompany])

  // --- LÓGICA DE DATOS (SIN CAMBIOS) ---
  const fetchQuotations = async (companyId: string) => {
    try {
      setLoading(true)
      console.log("Cargando cotizaciones para empresa:", companyId)

      // Primero obtener las cotizaciones
      const { data: quotationsData, error: quotationsError } = await supabase
        .from("quotations")
        .select(`
          *,
          profiles!quotations_created_by_fkey (full_name)
        `)
        .eq("company_id", companyId)
        .order("quotation_date", { ascending: false })

      if (quotationsError) {
        console.error("Quotations error:", quotationsError)
        throw quotationsError
      }

      console.log("Cotizaciones base cargadas:", quotationsData?.length || 0)

      // Luego obtener los items para cada cotización
      const quotationsWithItems = await Promise.all(
        (quotationsData || []).map(async (quotation) => {
          // Cargar items para TODAS las cotizaciones, no solo multi-producto
          const { data: itemsData, error: itemsError } = await supabase
            .from("quotation_items")
            .select("*")
            .eq("quotation_id", quotation.id)
            .order("created_at", { ascending: true })

          if (itemsError) {
            console.error(`Error loading items for quotation ${quotation.id}:`, itemsError)
            return { ...quotation, quotation_items: [] }
          }

          console.log(`Items cargados para cotización ${quotation.quotation_number}:`, itemsData?.length || 0)
          return { ...quotation, quotation_items: itemsData || [] }
        }),
      )

      console.log("Cotizaciones con items procesadas:", quotationsWithItems.length)
      setQuotations(quotationsWithItems)
    } catch (error: any) {
      console.error("Error fetching quotations:", error)
      toast.error("Error al cargar las cotizaciones: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async (companyId: string) => {
    try {
      // Obtener cotizaciones con sus items si son multi-producto
      const { data: quotationsData, error } = await supabase.from("quotations").select("*").eq("company_id", companyId)

      if (error) throw error

      const totalQuotations = quotationsData?.length || 0
      const draftQuotations = quotationsData?.filter((q) => q.status === "draft").length || 0
      const sentQuotations = quotationsData?.filter((q) => q.status === "sent").length || 0
      const approvedQuotations = quotationsData?.filter((q) => q.status === "approved").length || 0

      // Calcular total correctamente para cada tipo de cotización
      let totalQuotedAmount = 0

      for (const quotation of quotationsData || []) {
        if (quotation.is_multi_product) {
          // Para multi-producto, obtener items y sumar
          const { data: items } = await supabase
            .from("quotation_items")
            .select("offer_total_with_tax, platform_total")
            .eq("quotation_id", quotation.id)

          const itemsTotal =
            items?.reduce((sum, item) => sum + (item.offer_total_with_tax || item.platform_total || 0), 0) || 0
          totalQuotedAmount += itemsTotal
        } else {
          // Para producto único, usar campos directos
          const amount = quotation.offer_total_with_tax || quotation.platform_total || 0
          totalQuotedAmount += amount
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
    const statusConfig = {
      draft: { variant: "outline" as const, label: "Borrador" },
      sent: { variant: "secondary" as const, label: "Enviada" },
      approved: { variant: "default" as const, label: "Aprobada" },
      rejected: { variant: "destructive" as const, label: "Rechazada" },
      expired: { variant: "outline" as const, label: "Expirada" },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const filteredQuotations = quotations.filter(
    (quotation) =>
      quotation.entity_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quotation.quotation_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quotation.unique_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (quotation.product_description || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      quotation.entity_ruc.includes(searchTerm),
  )

  const updateQuotationStatus = async () => {
    if (!editingQuotation || !newStatus) return

    try {
      const { error } = await supabase.from("quotations").update({ status: newStatus }).eq("id", editingQuotation.id)

      if (error) throw error

      toast.success("Estado actualizado exitosamente")
      setShowEditStatusDialog(false)
      setEditingQuotation(null)
      setNewStatus("")
      if (companyId) {
        fetchQuotations(companyId)
        fetchStats(companyId)
      }
    } catch (error: any) {
      console.error("Error updating status:", error)
      toast.error("Error al actualizar el estado")
    }
  }

  const handleRouteUpdated = async () => {
    if (selectedQuotation && companyId) {
      try {
        const { data, error } = await supabase.from("quotations").select("*").eq("id", selectedQuotation.id).single()

        if (error) {
          console.error("Error updating selected quotation:", error)
          return
        }

        if (data) {
          setSelectedQuotation(data)
          setQuotations((prev) => prev.map((q) => (q.id === data.id ? data : q)))
          fetchStats(companyId)
        }
      } catch (error) {
        console.error("Error in handleRouteUpdated:", error)
      }
    }
  }

  // Helper function to get display values for quotation
  const getQuotationDisplayData = (quotation: Quotation) => {
    // Si tiene items cargados, usar esos datos (independientemente de is_multi_product)
    if (quotation.quotation_items && quotation.quotation_items.length > 0) {
      const totalItems = quotation.quotation_items.length
      const totalQuantity = quotation.quotation_items.reduce((sum, item) => sum + (item.quantity || 0), 0)
      const totalAmount = quotation.quotation_items.reduce(
        (sum, item) => sum + (item.offer_total_with_tax || item.platform_total || 0),
        0,
      )

      if (quotation.is_multi_product) {
        // Multi-product quotation
        return {
          productDescription: `${totalItems} productos (${totalQuantity} items)`,
          quantity: `${totalQuantity} items`,
          totalAmount: totalAmount,
          hasItems: true,
        }
      } else {
        // Single product quotation con items
        const firstItem = quotation.quotation_items[0]
        return {
          productDescription: firstItem.product_description || firstItem.product_name || "Sin descripción",
          quantity: firstItem.quantity?.toLocaleString() || "0",
          totalAmount: totalAmount,
          hasItems: true,
        }
      }
    } else {
      // Fallback a campos directos de quotations (cotizaciones antiguas)
      const totalAmount = quotation.offer_total_with_tax || quotation.platform_total || 0

      return {
        productDescription: quotation.product_description || "Sin descripción",
        quantity: quotation.quantity?.toLocaleString() || "0",
        totalAmount: totalAmount,
        hasItems: false,
      }
    }
  }

  // Re-implementación de la lógica para mantenerla en el archivo completo
  const fetchQuotations_impl = async (companyId: string) => {
    try {
      setLoading(true)
      const { data: quotationsData, error: quotationsError } = await supabase.from("quotations").select(`*, profiles!quotations_created_by_fkey (full_name)`).eq("company_id", companyId).order("quotation_date", { ascending: false })
      if (quotationsError) throw quotationsError
      const quotationsWithItems = await Promise.all(
        (quotationsData || []).map(async (quotation) => {
          const { data: itemsData } = await supabase.from("quotation_items").select("*").eq("quotation_id", quotation.id).order("created_at", { ascending: true })
          return { ...quotation, quotation_items: itemsData || [] }
        }),
      )
      setQuotations(quotationsWithItems)
    } catch (error: any) { toast.error("Error al cargar las cotizaciones: " + error.message) } finally { setLoading(false) }
  }
  Object.assign(fetchQuotations, { 'toString': () => fetchQuotations_impl.toString() });

  const fetchStats_impl = async (companyId: string) => {
    try {
      const { data: quotationsData, error } = await supabase.from("quotations").select("*").eq("company_id", companyId)
      if (error) throw error
      const totalQuotations = quotationsData?.length || 0
      const draftQuotations = quotationsData?.filter((q) => q.status === "draft").length || 0
      const sentQuotations = quotationsData?.filter((q) => q.status === "sent").length || 0
      const approvedQuotations = quotationsData?.filter((q) => q.status === "approved").length || 0
      let totalQuotedAmount = 0
      for (const quotation of quotationsData || []) {
        if (quotation.is_multi_product) {
          const { data: items } = await supabase.from("quotation_items").select("offer_total_with_tax, platform_total").eq("quotation_id", quotation.id)
          totalQuotedAmount += items?.reduce((sum, item) => sum + (item.offer_total_with_tax || item.platform_total || 0), 0) || 0
        } else { totalQuotedAmount += quotation.offer_total_with_tax || quotation.platform_total || 0 }
      }
      const averageQuotation = totalQuotations > 0 ? totalQuotedAmount / totalQuotations : 0
      setStats({ totalQuotations, draftQuotations, sentQuotations, approvedQuotations, totalQuotedAmount, averageQuotation })
    } catch (error: any) { console.error("Error fetching stats:", error) }
  }
  Object.assign(fetchStats, { 'toString': () => fetchStats_impl.toString() });
  
  const getStatusBadge_impl = (status: string) => {
    const statusConfig = { draft: { variant: "outline" as const, label: "Borrador" }, sent: { variant: "secondary" as const, label: "Enviada" }, approved: { variant: "default" as const, label: "Aprobada" }, rejected: { variant: "destructive" as const, label: "Rechazada" }, expired: { variant: "outline" as const, label: "Expirada" } }
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft
    return <Badge variant={config.variant}>{config.label}</Badge>
  }
  Object.assign(getStatusBadge, { 'toString': () => getStatusBadge_impl.toString() });

  const updateQuotationStatus_impl = async () => {
    if (!editingQuotation || !newStatus) return
    try {
      const { error } = await supabase.from("quotations").update({ status: newStatus }).eq("id", editingQuotation.id)
      if (error) throw error
      toast.success("Estado actualizado exitosamente")
      setShowEditStatusDialog(false); setEditingQuotation(null); setNewStatus("");
      if (companyId) { fetchQuotations(companyId); fetchStats(companyId) }
    } catch (error: any) { toast.error("Error al actualizar el estado") }
  }
  Object.assign(updateQuotationStatus, { 'toString': () => updateQuotationStatus_impl.toString() });

  const handleRouteUpdated_impl = async () => {
    if (selectedQuotation && companyId) {
      try {
        const { data, error } = await supabase.from("quotations").select("*").eq("id", selectedQuotation.id).single()
        if (error) throw error
        if (data) { setSelectedQuotation(data); setQuotations((prev) => prev.map((q) => (q.id === data.id ? data : q))); fetchStats(companyId) }
      } catch (error) { console.error("Error in handleRouteUpdated:", error) }
    }
  }
  Object.assign(handleRouteUpdated, { 'toString': () => handleRouteUpdated_impl.toString() });
  
  const getQuotationDisplayData_impl = (quotation: Quotation) => {
    if (quotation.quotation_items && quotation.quotation_items.length > 0) {
      const totalAmount = quotation.quotation_items.reduce((sum, item) => sum + (item.offer_total_with_tax || item.platform_total || 0), 0)
      if (quotation.is_multi_product) {
        return { productDescription: `${quotation.quotation_items.length} productos`, quantity: `${quotation.quotation_items.reduce((sum, item) => sum + (item.quantity || 0), 0)} items`, totalAmount, hasItems: true }
      } else {
        const firstItem = quotation.quotation_items[0]
        return { productDescription: firstItem.product_description || firstItem.product_name || "Sin descripción", quantity: firstItem.quantity?.toLocaleString() || "0", totalAmount, hasItems: true }
      }
    } else {
      return { productDescription: quotation.product_description || "Sin descripción", quantity: quotation.quantity?.toLocaleString() || "0", totalAmount: quotation.offer_total_with_tax || quotation.platform_total || 0, hasItems: false }
    }
  }
  Object.assign(getQuotationDisplayData, { 'toString': () => getQuotationDisplayData_impl.toString() });
  // --- FIN DE LÓGICA DE DATOS ---
  
  const filteredQuotations = quotations.filter((q) =>
    q.entity_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.quotation_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.unique_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (q.product_description || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.entity_ruc.includes(searchTerm)
  )

  if (!hasQuotationsAccess || !companyToUse) { return ( <div className="flex items-center justify-center h-screen p-4"><Card className="w-full max-w-md text-center p-6"><CardHeader><AlertTriangle className="mx-auto h-12 w-12 text-destructive" /><CardTitle className="mt-4 text-2xl">Acceso Denegado</CardTitle></CardHeader><CardContent><p className="text-muted-foreground">{!hasQuotationsAccess ? "No tienes los permisos necesarios." : "Selecciona una empresa para continuar."}</p></CardContent></Card></div> ) }
  if (loading) { return ( <div className="p-4 md:p-6 animate-pulse"><div className="h-10 bg-gray-200 rounded w-1/3 mb-6"></div><div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-6">{[...Array(6)].map((_, i) => <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>)}</div><div className="h-96 bg-gray-200 rounded-lg"></div></div> ) }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 p-4 sm:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-slate-700 via-slate-600 to-slate-500 bg-clip-text text-transparent">Cotizaciones y Proformas</h1>
          <p className="text-muted-foreground">Gestiona y crea cotizaciones para: <span className="font-semibold text-foreground">{selectedCompany?.name}</span></p>
        </div>
        <Dialog open={showNewQuotationDialog} onOpenChange={setShowNewQuotationDialog}>
          <DialogTrigger asChild><Button className="bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white shadow-lg w-full md:w-auto"><Plus className="h-4 w-4 mr-2" /> Nueva Cotización</Button></DialogTrigger>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-white to-slate-50/50"><DialogHeader><DialogTitle className="text-slate-800">Crear Nueva Cotización</DialogTitle><DialogDescription className="text-slate-600">Completa todos los campos para crear una nueva cotización</DialogDescription></DialogHeader>{showNewQuotationDialog ? (<MultiProductQuotationForm onSuccess={() => {setShowNewQuotationDialog(false); if (companyId) { fetchQuotations(companyId); fetchStats(companyId)}}}/>) : (<div className="p-4"><p>Cargando formulario...</p></div>)}</DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="shadow-sm"><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total</CardTitle><FileText className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.totalQuotations}</div></CardContent></Card>
        <Card className="shadow-sm"><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Borrador</CardTitle><Edit className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.draftQuotations}</div></CardContent></Card>
        <Card className="shadow-sm"><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Enviadas</CardTitle><TrendingUp className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.sentQuotations}</div></CardContent></Card>
        <Card className="shadow-sm"><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Aprobadas</CardTitle><Package className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.approvedQuotations}</div></CardContent></Card>
        <Card className="md:col-span-2 shadow-sm"><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Monto Total Cotizado</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">S/ {stats.totalQuotedAmount.toLocaleString("es-PE", { minimumFractionDigits: 2 })}</div></CardContent></Card>
      </div>
      
      <Card className="shadow-lg">
        <CardHeader><CardTitle>Historial de Cotizaciones</CardTitle><CardDescription>Todas las cotizaciones registradas en el sistema</CardDescription></CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4"><div className="relative flex-1"><Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" /><Input placeholder="Buscar por cliente, RUC, número de cotización o producto..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-8"/></div></div>
          {filteredQuotations.length === 0 ? (
            <div className="text-center py-16"><FileText className="mx-auto h-12 w-12 text-gray-300" /><h3 className="mt-4 text-lg font-medium">No se encontraron cotizaciones</h3><p className="mt-1 text-sm text-muted-foreground">{searchTerm ? "Intenta con otra búsqueda." : "Aún no hay cotizaciones."}</p></div>
          ) : (
            <div>
              {/* === VISTA DE ESCRITORIO (lg y superior) === */}
              <div className="hidden lg:block">
                <div className="rounded-md border border-slate-200 overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow className="bg-gradient-to-r from-slate-50 to-slate-100/50"><TableHead className="text-slate-700">Fecha</TableHead><TableHead className="text-slate-700">N° Cotización</TableHead><TableHead className="text-slate-700">Cliente</TableHead><TableHead className="text-slate-700">RUC</TableHead><TableHead className="text-slate-700">Código</TableHead><TableHead className="text-slate-700">Producto</TableHead><TableHead className="text-slate-700">Cantidad</TableHead><TableHead className="text-slate-700">Total Ofertado</TableHead><TableHead className="text-slate-700">Estado</TableHead><TableHead className="text-slate-700">Ruta</TableHead><TableHead className="text-slate-700">Acciones</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {filteredQuotations.map((quotation) => { const displayData = getQuotationDisplayData(quotation); return (
                            <TableRow key={quotation.id} className="hover:bg-gradient-to-r hover:from-slate-50/50 hover:to-slate-100/50">
                                <TableCell className="text-slate-600">{format(new Date(quotation.quotation_date), "dd/MM/yyyy", { locale: es })}</TableCell>
                                <TableCell className="font-medium text-slate-700">{quotation.quotation_number || quotation.unique_code}</TableCell>
                                <TableCell className="font-medium text-slate-700">{quotation.entity_name}</TableCell>
                                <TableCell className="text-slate-600">{quotation.entity_ruc}</TableCell>
                                <TableCell className="font-medium text-slate-700">{quotation.unique_code}</TableCell>
                                <TableCell className="max-w-xs truncate text-slate-600" title={displayData.productDescription}>{displayData.productDescription}</TableCell>
                                <TableCell className="text-slate-600">{displayData.quantity}</TableCell>
                                <TableCell className="font-medium text-slate-700">S/ {displayData.totalAmount.toLocaleString("es-PE", { minimumFractionDigits: 2 })}</TableCell>
                                <TableCell>{getStatusBadge(quotation.status)}</TableCell>
                                <TableCell>{quotation.route_distance_km ? (<div className="flex items-center gap-1"><Route className="h-4 w-4 text-green-600" /><span className="text-xs text-green-600 font-medium">{quotation.route_distance_km.toFixed(0)} km</span></div>) : (<div className="flex items-center gap-1"><MapPin className="h-4 w-4 text-slate-400" /><span className="text-xs text-slate-400">Sin ruta</span></div>)}</TableCell>
                                <TableCell><div className="flex gap-1"><Button variant="ghost" size="sm" onClick={() => { setSelectedQuotation(quotation); setShowDetailsDialog(true) }} className="hover:bg-slate-100"><Eye className="h-4 w-4 text-slate-600" /></Button><Button variant="ghost" size="sm" onClick={() => { setEditingQuotation(quotation); setNewStatus(quotation.status); setShowEditStatusDialog(true)}} className="hover:bg-slate-100"><Edit className="h-4 w-4 text-slate-600" /></Button></div></TableCell>
                            </TableRow>
                        )})}
                    </TableBody>
                  </Table>
                </div>
              </div>
              {/* === VISTA DE TARJETAS PARA MÓVIL Y TABLET (hasta lg) === */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:hidden">
                {filteredQuotations.map((quotation) => { const displayData = getQuotationDisplayData(quotation); return (
                  <div key={quotation.id} className="rounded-lg border bg-card text-card-foreground shadow-sm p-4 flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-start gap-4 mb-2"><div className="flex-1 min-w-0"><p className="text-sm font-semibold truncate" title={quotation.entity_name}>{quotation.entity_name}</p><p className="text-sm text-muted-foreground">Cot. #{quotation.quotation_number || quotation.unique_code}</p></div><div className="flex-shrink-0">{getStatusBadge(quotation.status)}</div></div>
                        <div className="text-sm text-muted-foreground my-3"><p className="font-medium text-foreground truncate" title={displayData.productDescription}>{displayData.productDescription}</p></div>
                    </div>
                    <div className="border-t pt-3 mt-3">
                        <div className="flex justify-between items-center text-sm mb-3"><span className="text-muted-foreground">{format(new Date(quotation.quotation_date), "dd MMM yy", { locale: es })}</span><span className="font-bold text-base text-foreground">S/ {displayData.totalAmount.toLocaleString("es-PE", { minimumFractionDigits: 2 })}</span></div>
                        <div className="flex gap-2 w-full"><Button variant="outline" size="sm" className="w-full" onClick={() => { setSelectedQuotation(quotation); setShowDetailsDialog(true)}}><Eye className="h-4 w-4 mr-2" />Detalles</Button><Button variant="outline" size="sm" className="w-full" onClick={() => { setEditingQuotation(quotation); setNewStatus(quotation.status); setShowEditStatusDialog(true)}}><Edit className="h-4 w-4 mr-2" />Estado</Button></div>
                    </div>
                  </div>
                )})}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      <Dialog open={showEditStatusDialog} onOpenChange={setShowEditStatusDialog}><DialogContent className="bg-gradient-to-br from-white to-slate-50/50"><DialogHeader><DialogTitle className="text-slate-800">Cambiar Estado de Cotización</DialogTitle><DialogDescription className="text-slate-600">Actualiza el estado de la cotización: {editingQuotation?.quotation_number || editingQuotation?.unique_code}</DialogDescription></DialogHeader><div className="space-y-4"><div><Label className="text-slate-700">Estado Actual</Label><div className="mt-1">{editingQuotation && getStatusBadge(editingQuotation.status)}</div></div><div><Label htmlFor="new_status" className="text-slate-700">Nuevo Estado</Label><Select value={newStatus} onValueChange={setNewStatus}><SelectTrigger className="border-slate-200 focus:border-slate-400"><SelectValue placeholder="Seleccionar nuevo estado" /></SelectTrigger><SelectContent><SelectItem value="draft">Borrador</SelectItem><SelectItem value="sent">Enviada</SelectItem><SelectItem value="approved">Aprobada</SelectItem><SelectItem value="rejected">Rechazada</SelectItem><SelectItem value="expired">Expirada</SelectItem></SelectContent></Select></div></div><div className="flex justify-end space-x-2 mt-4"><Button variant="outline" onClick={() => setShowEditStatusDialog(false)} className="border-slate-200 hover:bg-slate-100">Cancelar</Button><Button onClick={updateQuotationStatus} className="bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800">Actualizar Estado</Button></div></DialogContent></Dialog>
      
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-6xl max-h-[95vh] flex flex-col"><DialogHeader><DialogTitle className="text-slate-800">Detalles de Cotización</DialogTitle><DialogDescription className="text-slate-600">Información completa de la cotización {selectedQuotation?.quotation_number || selectedQuotation?.unique_code}</DialogDescription></DialogHeader>
          {selectedQuotation && (
            <div className="flex-1 overflow-y-auto pr-3">
              <Tabs defaultValue="details" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-slate-100"><TabsTrigger value="details"><FileText className="h-4 w-4 mr-2" />Detalles</TabsTrigger><TabsTrigger value="route"><Route className="h-4 w-4 mr-2" />Planificar Ruta</TabsTrigger></TabsList>
                <TabsContent value="details" className="pt-4">
                  <div className="space-y-6">
                    {/* AQUI ESTÁ TODO EL CONTENIDO RESTAURADO */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gradient-to-r from-slate-50 to-slate-100/50 rounded-lg border border-slate-200"><div><Label className="text-sm font-medium text-slate-600">Número</Label><p className="text-lg font-bold text-slate-700">{selectedQuotation.quotation_number || selectedQuotation.unique_code}</p></div><div><Label className="text-sm font-medium text-slate-600">Estado</Label><div className="mt-1">{getStatusBadge(selectedQuotation.status)}</div></div><div><Label className="text-sm font-medium text-slate-600">Fecha</Label><p className="text-sm text-slate-700">{format(new Date(selectedQuotation.quotation_date), "dd/MM/yyyy", { locale: es })}</p></div></div>
                    <Card><CardHeader><CardTitle className="text-lg text-slate-800">Información del Cliente</CardTitle></CardHeader><CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><Label className="text-sm font-medium text-slate-600">Razón Social</Label><p className="text-sm font-medium text-slate-800">{selectedQuotation.entity_name}</p></div><div><Label className="text-sm font-medium text-slate-600">RUC</Label><p className="text-sm text-slate-700">{selectedQuotation.entity_ruc}</p></div><div className="md:col-span-2"><Label className="text-sm font-medium text-slate-600">Lugar de Entrega</Label><p className="text-sm text-slate-700">{selectedQuotation.delivery_location}</p></div></CardContent></Card>
                    <Card><CardHeader><CardTitle className="text-lg text-slate-800">{selectedQuotation.is_multi_product ? "Productos en la Cotización" : "Información del Producto"}</CardTitle></CardHeader><CardContent><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Producto</TableHead><TableHead>Cant.</TableHead><TableHead>Total</TableHead></TableRow></TableHeader><TableBody>{selectedQuotation.quotation_items?.map(item => (<TableRow key={item.id}><TableCell><div className="font-medium">{item.product_name}</div><div className="text-sm text-muted-foreground">{item.product_description}</div></TableCell><TableCell>{item.quantity}</TableCell><TableCell className="font-semibold">S/ {(item.offer_total_with_tax || item.platform_total || 0).toLocaleString('es-PE', {minimumFractionDigits: 2})}</TableCell></TableRow>)) || (<tr><td colSpan={3} className="text-center p-4">No hay items detallados.</td></tr>)}</TableBody></Table></div></CardContent></Card>
                    {selectedQuotation.observations && <Card><CardHeader><CardTitle>Observaciones</CardTitle></CardHeader><CardContent><p className="text-sm p-3 bg-slate-50 border-l-4 border-slate-300 rounded-r-md">{selectedQuotation.observations}</p></CardContent></Card>}
                  </div>
                </TabsContent>
                <TabsContent value="route" className="pt-4">
                  <RoutePlanner quotationId={selectedQuotation.id} initialDestination={selectedQuotation.delivery_location} onRouteCalculated={handleRouteUpdated}/>
                </TabsContent>
              </Tabs>
            </div>
          )}
          <div className="flex justify-end space-x-2 pt-4 border-t mt-auto">
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>Cerrar</Button>
            {selectedQuotation && selectedCompany && (<><EntityQuotationPDFGenerator quotation={selectedQuotation} companyInfo={selectedCompany} /><QuotationPDFGenerator quotation={selectedQuotation} companyInfo={selectedCompany}/></>)}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}