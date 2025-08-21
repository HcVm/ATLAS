"use client"

import { DialogTrigger } from "@/components/ui/dialog"
import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Plus,
  Search,
  FileText,
  DollarSign,
  TrendingUp,
  Package,
  Edit,
  Eye,
  AlertTriangle,
  ShoppingCart,
  Shield,
  CreditCard,
  MoreHorizontal,
  Receipt,
  Check,
  Clock,
  Users,
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useCompany } from "@/lib/company-context"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import MultiProductSaleForm from "@/components/sales/multi-product-sale-form"
import SaleEditForm from "@/components/sales/sale-edit-form"
import SalesExportDialog from "@/components/sales/sales-export-dialog"
import { Label } from "@/components/ui/label"
import MultiProductSaleEditForm from "@/components/sales/multi-product-sale-edit-form"
import PaymentVoucherDialog from "@/components/sales/payment-voucher-dialog"
import { generateWarrantyLetter } from "@/lib/warranty-letter-generator"
import { generateCCILetter } from "@/lib/cci-letter-generator"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SalesEntityManagementDialog } from "@/components/sales/sales-entity-management-dialog" // Import the new management dialog
import { DateSelectorDialog } from "@/components/sales/date-selector-dialog"

interface Sale {
  id: string
  sale_number?: string
  sale_date: string
  entity_id: string
  entity_name: string
  entity_ruc: string
  entity_executing_unit: string | null
  quotation_code: string
  total_quantity: number
  total_items: number
  display_product_name: string
  display_product_code: string
  total_sale: number
  payment_method: string
  delivery_date: string | null
  created_by: string
  profiles?: {
    full_name: string
  }
  sale_status: string
  exp_siaf?: string | null
  ocam?: string | null
  physical_order?: string | null
  project_meta?: string | null
  final_destination?: string | null
  warehouse_manager?: string | null
  delivery_term?: string | null
  observations?: string | null
  created_at?: string | null
  is_multi_product: boolean
  payment_vouchers?: {
    id: string
    status: "pending" | "confirmed" | "rejected"
    admin_confirmed: boolean
    accounting_confirmed: boolean
    file_name: string
    file_url?: string
    uploaded_at: string
    uploaded_by: string
    notes?: string // Changed to 'notes'
    profiles?: {
      full_name: string
    }
  }[]
}

interface SaleItem {
  id: string
  product_code: string
  product_name: string
  product_description: string | null
  product_brand: string | null
  quantity: number
  unit_price_with_tax: number
  total_amount: number
}

interface ProductDetails {
  id: string
  code: string
  name: string
  description: string | null
  modelo: string | null
  brand_id: string | null
  brands?: {
    name: string
  } | null
}

interface SalesStats {
  totalSales: number
  totalAmount: number
  averageTicket: number
  pendingDeliveries: number
}

// Define SalesEntity interface here or import from a shared types file
interface SalesEntity {
  id: string
  name: string
  ruc: string
  executing_unit: string | null
  fiscal_address: string | null
}

export default function SalesPage() {
  const { user } = useAuth()
  const { selectedCompany } = useCompany()
  const router = useRouter()
  const searchParams = useSearchParams()
  const voucherParam = searchParams.get("voucher")

  const [sales, setSales] = useState<Sale[]>([])
  const [stats, setStats] = useState<SalesStats>({
    totalSales: 0,
    totalAmount: 0,
    averageTicket: 0,
    pendingDeliveries: 0,
  })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [showNewSaleDialog, setShowNewSaleDialog] = useState(false)
  const [editingSale, setEditingSale] = useState<Sale | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [selectedSaleItems, setSelectedSaleItems] = useState<SaleItem[]>([])
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [showStatusDialog, setShowStatusDialog] = useState(false)
  const [statusSale, setStatusSale] = useState<Sale | null>(null)
  const [showMultiEditDialog, setShowMultiEditDialog] = useState(false)
  const [editingMultiSale, setEditingMultiSale] = useState<Sale | null>(null)
  const [showVoucherDialog, setShowVoucherDialog] = useState(false)
  const [voucherSale, setVoucherSale] = useState<Sale | null>(null)

  // New state for Sales Entity Management Dialog
  const [showSalesEntityManagementDialog, setShowSalesEntityManagementDialog] = useState(false)

  const [warrantyDateDialog, setWarrantyDateDialog] = useState<{
    open: boolean
    sale: Sale | null
    isGenerating: boolean
  }>({
    open: false,
    sale: null,
    isGenerating: false,
  })

  const [cciDateDialog, setCciDateDialog] = useState<{
    open: boolean
    sale: Sale | null
    isGenerating: boolean
  }>({
    open: false,
    sale: null,
    isGenerating: false,
  })

  const hasSalesAccess =
    user?.role === "admin" ||
    user?.role === "supervisor" ||
    user?.departments?.name === "Ventas" ||
    user?.departments?.name === "Administración" ||
    user?.departments?.name === "Operaciones" ||
    user?.departments?.name === "Jefatura de Ventas" ||
    user?.departments?.name === "Contabilidad"

  // Determinar si el usuario puede ver todas las ventas de la empresa o solo las suyas
  const canViewAllSales =
    user?.role === "admin" ||
    user?.role === "supervisor" ||
    user?.departments?.name === "Administración" ||
    user?.departments?.name === "Operaciones" ||
    user?.departments?.name === "Jefatura de Ventas" ||
    user?.departments?.name === "Contabilidad"

  const companyToUse =
    user?.role === "admin"
      ? selectedCompany
      : user?.company_id
        ? { id: user.company_id, name: user.company_name }
        : null

  useEffect(() => {
    const companyId = companyToUse?.id

    if (companyId && hasSalesAccess) {
      fetchSales(companyId)
      fetchStats(companyId)
    } else {
      setLoading(false)
    }
  }, [user, selectedCompany])

  // Handle voucher parameter from notification
  useEffect(() => {
    const companyId = companyToUse?.id
    if (voucherParam && sales.length > 0 && companyId) {
      console.log("🔍 Buscando venta con voucher:", voucherParam)

      // Find the sale that has this voucher
      const saleWithVoucher = sales.find((sale) =>
        sale.payment_vouchers?.some((voucher) => voucher.id === voucherParam),
      )

      console.log("📋 Venta encontrada:", saleWithVoucher)

      if (saleWithVoucher) {
        setVoucherSale(saleWithVoucher)
        setShowVoucherDialog(true)
        // Clean up the URL parameter
        router.replace("/sales", { scroll: false })
      } else {
        console.warn("⚠️ No se encontró venta con el voucher:", voucherParam)
        toast.error("No se encontró la venta asociada al comprobante")
        router.replace("/sales", { scroll: false })
      }
    }
  }, [voucherParam, sales, router, companyToUse])

  const fetchSales = async (companyId: string) => {
    try {
      setLoading(true)

      let query = supabase
        .from("sales_with_items")
        .select(`
          id, sale_number, sale_date, entity_id, entity_name, entity_ruc, entity_executing_unit,
          quotation_code, exp_siaf, total_quantity, total_items, display_product_name, display_product_code,
          ocam, physical_order, project_meta, final_destination, warehouse_manager, payment_method,
          total_sale, delivery_date, delivery_term, observations, sale_status, created_at, is_multi_product,
          created_by, profiles!sales_created_by_fkey (full_name),
          payment_vouchers (id, status, admin_confirmed, accounting_confirmed, file_name, file_url, uploaded_at, uploaded_by, notes, profiles!payment_vouchers_uploaded_by_fkey (full_name))
        `)
        .eq("company_id", companyId)

      // Si el usuario no puede ver todas las ventas, filtrar solo por las suyas
      if (!canViewAllSales && user?.id) {
        query = query.eq("created_by", user.id)
      }

      const { data, error } = await query.order("sale_date", { ascending: false })

      if (error) throw error
      setSales(data || [])
    } catch (error: any) {
      toast.error("Error al cargar las ventas: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async (companyId: string) => {
    try {
      let query = supabase
        .from("sales_with_items")
        .select("total_sale, delivery_date, created_by")
        .eq("company_id", companyId)

      // Si el usuario no puede ver todas las ventas, filtrar solo por las suyas
      if (!canViewAllSales && user?.id) {
        query = query.eq("created_by", user.id)
      }

      const { data, error } = await query

      if (error) throw error

      const totalSales = data?.length || 0
      const totalAmount = data?.reduce((sum, sale) => sum + (sale.total_sale || 0), 0) || 0
      const averageTicket = totalSales > 0 ? totalAmount / totalSales : 0
      const pendingDeliveries =
        data?.filter((sale) => sale.delivery_date && new Date(sale.delivery_date) > new Date()).length || 0

      setStats({ totalSales, totalAmount, averageTicket, pendingDeliveries })
    } catch (error: any) {
      console.error("Error fetching stats:", error)
    }
  }

  const fetchSaleDetails = async (saleId: string) => {
    setLoadingDetails(true)
    try {
      const { data: items, error: itemsError } = await supabase
        .from("sale_items")
        .select(
          "id, product_code, product_name, product_description, product_brand, quantity, unit_price_with_tax, total_amount",
        )
        .eq("sale_id", saleId)
        .order("product_name")

      if (itemsError) setSelectedSaleItems([])
      else setSelectedSaleItems(items || [])
    } catch (error: any) {
      toast.error("Error al cargar detalles de la venta")
    } finally {
      setLoadingDetails(false)
    }
  }

  // Nueva función para obtener detalles completos de productos desde la tabla products
  const fetchProductDetailsByCodes = async (productCodes: string[]): Promise<ProductDetails[]> => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select(`
          id,
          code,
          name,
          description,
          modelo,
          brand_id,
          brands (
            name
          )
        `)
        .in("code", productCodes)
        .eq("company_id", companyToUse?.id)

      if (error) {
        console.error("Error fetching product details:", error)
        return []
      }

      return data || []
    } catch (error) {
      console.error("Error in fetchProductDetailsByCodes:", error)
      return []
    }
  }

  // Función para obtener la dirección fiscal de una entidad
  const fetchEntityFiscalAddress = async (entityId: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.from("sales_entities").select("fiscal_address").eq("id", entityId).single()

      if (error) {
        console.error("Error fetching entity fiscal address:", error)
        return null
      }
      return data?.fiscal_address || null
    } catch (error) {
      console.error("Error in fetchEntityFiscalAddress:", error)
      return null
    }
  }

  const handleEditSale = (sale: Sale) => {
    // Verificar si el usuario puede editar esta venta
    if (!canViewAllSales && sale.created_by !== user?.id) {
      toast.error("No tienes permisos para editar esta venta")
      return
    }

    if (sale.is_multi_product) {
      setEditingMultiSale(sale)
      setShowMultiEditDialog(true)
    } else {
      const editableSale = {
        id: sale.id,
        sale_number: sale.sale_number,
        sale_date: sale.sale_date,
        entity_id: sale.entity_id,
        entity_name: sale.entity_name,
        entity_ruc: sale.entity_ruc,
        entity_executing_unit: sale.entity_executing_unit,
        quotation_code: sale.quotation_code,
        quantity: sale.total_quantity,
        product_id: "",
        product_name: sale.display_product_name,
        product_code: sale.display_product_code,
        product_description: "",
        product_brand: "",
        total_sale: sale.total_sale,
        payment_method: sale.payment_method,
        delivery_date: sale.delivery_date,
        sale_status: sale.sale_status,
        exp_siaf: sale.exp_siaf,
        ocam: sale.ocam,
        physical_order: sale.physical_order,
        project_meta: sale.project_meta,
        final_destination: sale.final_destination,
        warehouse_manager: sale.warehouse_manager,
        delivery_term: sale.delivery_term,
        observations: sale.observations,
        unit_price_with_tax: sale.total_quantity > 0 ? sale.total_sale / sale.total_quantity : 0,
        created_at: sale.created_at,
      }
      setEditingSale(editableSale)
      setShowEditDialog(true)
    }
  }

  const handleEditSuccess = () => {
    setShowEditDialog(false)
    setEditingSale(null)
    if (companyToUse?.id) {
      fetchSales(companyToUse.id)
      fetchStats(companyToUse.id)
    }
  }

  const handleMultiEditSuccess = () => {
    setShowMultiEditDialog(false)
    setEditingMultiSale(null)
    if (companyToUse?.id) {
      fetchSales(companyToUse.id)
      fetchStats(companyToUse.id)
    }
  }

  const handleViewDetails = async (sale: Sale) => {
    setSelectedSale(sale)
    setShowDetailsDialog(true)
    await fetchSaleDetails(sale.id)
  }

  const handleStatusChange = (sale: Sale) => {
    // Verificar si el usuario puede cambiar el estado de esta venta
    if (!canViewAllSales && sale.created_by !== user?.id) {
      toast.error("No tienes permisos para cambiar el estado de esta venta")
      return
    }

    setStatusSale(sale)
    setShowStatusDialog(true)
  }

  const handleStatusUpdate = async (newStatus: string) => {
    if (!statusSale || !companyToUse?.id) return

    try {
      const { error } = await supabase
        .from("sales")
        .update({
          sale_status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", statusSale.id)

      if (error) throw error

      toast.success(`Estado actualizado a ${newStatus.toUpperCase()}`)
      setShowStatusDialog(false)
      setStatusSale(null)

      // Actualizar la lista de ventas
      fetchSales(companyToUse.id)
      fetchStats(companyToUse.id)
    } catch (error: any) {
      toast.error("Error al actualizar el estado: " + error.message)
    }
  }

  const handleVoucherDialog = (sale: Sale) => {
    setVoucherSale(sale)
    setShowVoucherDialog(true)
  }

  const handleVoucherUploaded = async () => {
    if (!voucherSale?.id || !companyToUse?.id) return

    try {
      // Re-fetch only the specific sale that was updated
      const { data, error } = await supabase
        .from("sales_with_items")
        .select(`
          id, sale_number, sale_date, entity_id, entity_name, entity_ruc, entity_executing_unit,
          quotation_code, exp_siaf, total_quantity, total_items, display_product_name, display_product_code,
          ocam, physical_order, project_meta, final_destination, warehouse_manager, payment_method,
          total_sale, delivery_date, delivery_term, observations, sale_status, created_at, is_multi_product,
          created_by, profiles!sales_created_by_fkey (full_name),
          payment_vouchers (id, status, admin_confirmed, accounting_confirmed, file_name, file_url, uploaded_at, uploaded_by, notes, profiles!payment_vouchers_uploaded_by_fkey (full_name))
        `)
        .eq("id", voucherSale.id)
        .eq("company_id", companyToUse.id)
        .single()

      if (error) throw error

      if (data) {
        setVoucherSale(data) // Update the specific sale in the dialog's state
        // Also update the main sales list to reflect the change
        setSales((prevSales) => prevSales.map((s) => (s.id === data.id ? data : s)))
      }
    } catch (error: any) {
      toast.error("Error al actualizar la venta después de subir el comprobante: " + error.message)
    }
  }

  const handleGenerateWarrantyLetter = async (sale: Sale, selectedDate?: Date) => {
    if (!selectedDate) {
      // Abrir diálogo de selección de fecha
      setWarrantyDateDialog({
        open: true,
        sale: sale,
        isGenerating: false,
      })
      return
    }

    try {
      setWarrantyDateDialog((prev) => ({ ...prev, isGenerating: true }))
      toast.info("Generando carta de garantía...")

      // Obtener la dirección fiscal de la entidad
      const clientFiscalAddress = await fetchEntityFiscalAddress(sale.entity_id)

      // Obtener los productos de la venta
      const { data: saleItems, error: saleItemsError } = await supabase
        .from("sale_items")
        .select("product_code, product_name, product_description, product_brand, quantity")
        .eq("sale_id", sale.id)

      if (saleItemsError) throw saleItemsError

      let productCodes: string[] = []
      let finalProducts: any[] = []

      if (saleItems && saleItems.length > 0) {
        // Venta multi-producto: obtener códigos de todos los productos
        productCodes = saleItems.map((item) => item.product_code).filter(Boolean)
      } else {
        // Venta simple: usar el código del producto principal
        if (sale.display_product_code) {
          productCodes = [sale.display_product_code]
        }
      }

      console.log("🔍 Códigos de productos a buscar:", productCodes)

      if (productCodes.length > 0) {
        // Obtener detalles completos de los productos desde la tabla products
        const productDetails = await fetchProductDetailsByCodes(productCodes)
        console.log("📦 Detalles de productos obtenidos:", productDetails)

        if (saleItems && saleItems.length > 0) {
          // Mapear productos de venta multi-producto con detalles completos
          finalProducts = saleItems.map((saleItem) => {
            const productDetail = productDetails.find((p) => p.code === saleItem.product_code)
            return {
              quantity: saleItem.quantity,
              description: saleItem.product_description || saleItem.product_name,
              modelo: productDetail?.modelo || null,
              brand: saleItem.product_brand || productDetail?.brands?.name || "N/A",
              code: saleItem.product_code,
            }
          })
        } else {
          // Venta simple: usar datos de la venta principal con detalles del producto
          const productDetail = productDetails.find((p) => p.code === sale.display_product_code)
          finalProducts = [
            {
              quantity: sale.total_quantity,
              description: sale.display_product_name,
              modelo: productDetail?.modelo || null,
              brand: productDetail?.brands?.name || "N/A",
              code: sale.display_product_code,
            },
          ]
        }
      } else {
        // Fallback si no hay códigos de productos
        finalProducts = [
          {
            quantity: sale.total_quantity,
            description: sale.display_product_name,
            modelo: null,
            brand: "N/A",
            code: sale.display_product_code || "N/A",
          },
        ]
      }

      console.log("🎯 Productos finales para garantía:", finalProducts)

      await generateWarrantyLetter({
        companyName: companyToUse?.name || "",
        companyRuc: companyToUse?.ruc || "",
        companyCode: companyToUse?.code || "",
        letterNumber: `${String(Math.floor(Math.random() * 999) + 1).padStart(3, "0")}`,
        clientName: sale.entity_name,
        clientRuc: sale.entity_ruc,
        clientAddress: sale.final_destination || "Dirección no especificada",
        clientFiscalAddress: clientFiscalAddress || undefined,
        products: finalProducts,
        warrantyMonths: 12,
        createdBy: user?.full_name || "Usuario",
        customDate: selectedDate, // Pasando la fecha seleccionada
      })

      toast.success("Carta de garantía generada exitosamente")
      setWarrantyDateDialog({ open: false, sale: null, isGenerating: false })
    } catch (error: any) {
      console.error("Error generating warranty letter:", error)
      toast.error("Error al generar la carta de garantía: " + error.message)
      setWarrantyDateDialog((prev) => ({ ...prev, isGenerating: false }))
    }
  }

  const handleGenerateCCILetter = async (sale: Sale, selectedDate?: Date) => {
    if (!selectedDate) {
      // Abrir diálogo de selección de fecha
      setCciDateDialog({
        open: true,
        sale: sale,
        isGenerating: false,
      })
      return
    }

    try {
      setCciDateDialog((prev) => ({ ...prev, isGenerating: true }))
      toast.info("Generando carta de CCI...")

      // Obtener la dirección fiscal de la entidad
      const clientFiscalAddress = await fetchEntityFiscalAddress(sale.entity_id)

      await generateCCILetter({
        companyName: companyToUse?.name || "",
        companyRuc: companyToUse?.ruc || "",
        companyCode: companyToUse?.code || "",
        letterNumber: `${String(Math.floor(Math.random() * 999) + 1).padStart(3, "0")}`,
        clientName: sale.entity_name,
        clientRuc: sale.entity_ruc,
        clientAddress: sale.final_destination || "Dirección no especificada",
        clientFiscalAddress: clientFiscalAddress || undefined,
        ocam: sale.ocam || "N/A",
        siaf: sale.exp_siaf || "N/A",
        createdBy: user?.full_name || "Usuario",
        customDate: selectedDate, // Pasando la fecha seleccionada
      })

      toast.success("Carta de CCI generada exitosamente")
      setCciDateDialog({ open: false, sale: null, isGenerating: false })
    } catch (error: any) {
      console.error("Error generating CCI letter:", error)
      toast.error("Error al generar la carta de CCI: " + error.message)
      setCciDateDialog((prev) => ({ ...prev, isGenerating: false }))
    }
  }

  const filteredSales = sales.filter(
    (sale) =>
      sale.entity_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.quotation_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.display_product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.entity_ruc.includes(searchTerm) ||
      (sale.sale_number && sale.sale_number.toLowerCase().includes(searchTerm.toLowerCase())),
  )

  const renderStatusBadge = (status: string) => (
    <Badge
      variant={
        status === "compromiso"
          ? "default"
          : status === "devengado"
            ? "secondary"
            : status === "girado"
              ? "destructive"
              : "outline"
      }
    >
      {status?.toUpperCase() || "PENDIENTE"}
    </Badge>
  )

  const renderVoucherStatus = (vouchers: any[]) => {
    if (!vouchers || vouchers.length === 0) {
      return (
        <Badge variant="outline" className="text-gray-500">
          Sin comprobante
        </Badge>
      )
    }

    const voucher = vouchers[0]
    if (voucher.status === "confirmed") {
      return (
        <Badge variant="default" className="text-green-600 bg-green-50 border-green-200">
          <Check className="h-3 w-3 mr-1" />
          Confirmado
        </Badge>
      )
    } else if (voucher.admin_confirmed && voucher.accounting_confirmed) {
      return (
        <Badge variant="default" className="text-green-600 bg-green-50 border-green-200">
          <Check className="h-3 w-3 mr-1" />
          Confirmado
        </Badge>
      )
    } else {
      return (
        <Badge variant="outline" className="text-yellow-600 border-yellow-600">
          <Clock className="h-3 w-3 mr-1" />
          Pendiente
        </Badge>
      )
    }
  }

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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
        <div className="h-96 bg-gray-200 rounded-lg"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-700 via-slate-600 to-slate-500 bg-clip-text text-transparent">
            Módulo de Ventas
          </h1>
          <p className="text-muted-foreground">
            Gestión de ventas de:{" "}
            <span className="font-semibold text-foreground">{selectedCompany?.name || "N/A"}</span>
            {!canViewAllSales && <span className="ml-2 text-sm text-orange-600 font-medium">(Solo tus ventas)</span>}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <SalesExportDialog onExport={() => toast.success("Exportación completada")} />
          <Button
            className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-white shadow-md"
            onClick={() => setShowSalesEntityManagementDialog(true)}
            disabled={!hasSalesAccess} // Changed from !canViewAllSales to !hasSalesAccess
          >
            <Users className="h-4 w-4 mr-2" /> Gestionar Clientes
          </Button>
          <Dialog open={showNewSaleDialog} onOpenChange={setShowNewSaleDialog}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-white shadow-md">
                <Plus className="h-4 w-4 mr-2" /> Nueva Venta
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-700/50">
              <DialogHeader>
                <DialogTitle className="text-slate-800 dark:text-slate-100">Registrar Nueva Venta</DialogTitle>
                <DialogDescription className="text-slate-600 dark:text-slate-300">
                  Completa todos los campos para registrar una nueva venta
                </DialogDescription>
              </DialogHeader>
              <MultiProductSaleForm
                onSuccess={() => {
                  setShowNewSaleDialog(false)
                  if (companyToUse?.id) {
                    fetchSales(companyToUse.id)
                    fetchStats(companyToUse.id)
                  }
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-700/50 border-slate-200 dark:border-slate-700 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-200">Total Ventas</CardTitle>
            <div className="w-8 h-8 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-600 dark:to-slate-700 rounded-lg flex items-center justify-center">
              <FileText className="h-4 w-4 text-slate-600 dark:text-slate-300" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stats.totalSales}</div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {canViewAllSales ? "Ventas registradas" : "Tus ventas"}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-700/50 border-slate-200 dark:border-slate-700 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-200">Monto Total</CardTitle>
            <div className="w-8 h-8 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-600 dark:to-slate-700 rounded-lg flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-slate-600 dark:text-slate-300" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              S/ {stats.totalAmount.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {canViewAllSales ? "Valor total de ventas" : "Valor de tus ventas"}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-700/50 border-slate-200 dark:border-slate-700 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-200">Ticket Promedio</CardTitle>
            <div className="w-8 h-8 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-600 dark:to-slate-700 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-slate-600 dark:text-slate-300" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              S/ {stats.averageTicket.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Promedio por venta</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-700/50 border-slate-200 dark:border-slate-700 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Entregas Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stats.pendingDeliveries}</div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Por entregar</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-700/50 border-slate-200 dark:border-slate-700 shadow-lg">
        <CardHeader>
          <CardTitle className="text-slate-800 dark:text-slate-100">
            {canViewAllSales ? "Historial de Ventas" : "Mis Ventas"}
          </CardTitle>
          <CardDescription className="text-slate-600 dark:text-slate-300">
            {canViewAllSales ? "Todas las ventas registradas en el sistema" : "Tus ventas registradas en el sistema"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por cliente, RUC, cotización, producto o número de venta..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 border-slate-200 dark:border-slate-700 focus:border-slate-400"
              />
            </div>
          </div>

          {filteredSales.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-slate-500 dark:text-slate-400">
                {searchTerm ? "No se encontraron ventas que coincidan" : "No hay ventas registradas"}
              </div>
            </div>
          ) : (
            <div>
              <div className="hidden lg:block rounded-md border border-slate-200 dark:border-slate-700">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gradient-to-r from-slate-50 to-slate-100/50">
                      <TableHead className="text-slate-700 dark:text-slate-200">N° Venta</TableHead>
                      <TableHead className="text-slate-700 dark:text-slate-200">Fecha</TableHead>
                      <TableHead className="text-slate-700 dark:text-slate-200">Cliente</TableHead>
                      <TableHead className="text-slate-700 dark:text-slate-200">RUC</TableHead>
                      <TableHead className="text-slate-700 dark:text-slate-200">N° Cotización</TableHead>
                      <TableHead className="text-slate-700 dark:text-slate-200">Producto(s)</TableHead>
                      <TableHead className="text-slate-700 dark:text-slate-200">Items</TableHead>
                      <TableHead className="text-slate-700 dark:text-slate-200">Cantidad</TableHead>
                      <TableHead className="text-slate-700 dark:text-slate-200">Total</TableHead>
                      <TableHead className="text-slate-700 dark:text-slate-200">Estado</TableHead>
                      <TableHead className="text-slate-700 dark:text-slate-200">Comprobante</TableHead>
                      {canViewAllSales && (
                        <TableHead className="text-slate-700 dark:text-slate-200">Vendedor</TableHead>
                      )}
                      <TableHead className="text-slate-700 dark:text-slate-200">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSales.map((sale) => (
                      <TableRow
                        key={sale.id}
                        className="hover:bg-gradient-to-r hover:from-slate-50/50 hover:to-slate-100/50 dark:hover:from-slate-700/50 dark:hover:to-slate-600/50"
                      >
                        <TableCell className="font-medium text-slate-700 dark:text-slate-200">
                          {sale.sale_number || "N/A"}
                        </TableCell>
                        <TableCell className="text-slate-600 dark:text-slate-300">
                          {format(new Date(sale.sale_date), "dd/MM/yyyy", { locale: es })}
                        </TableCell>
                        <TableCell className="font-medium text-slate-700 dark:text-slate-200">
                          {sale.entity_name}
                        </TableCell>
                        <TableCell className="text-slate-600 dark:text-slate-300">{sale.entity_ruc}</TableCell>
                        <TableCell className="font-medium text-slate-700 dark:text-slate-200">
                          {sale.quotation_code}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <div className="flex items-center gap-2">
                            <span
                              className="truncate text-slate-600 dark:text-slate-300"
                              title={sale.display_product_name}
                            >
                              {sale.display_product_name}
                            </span>
                            {sale.is_multi_product && (
                              <Badge variant="secondary" className="text-xs">
                                <ShoppingCart className="h-3 w-3 mr-1" />
                                Multi
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="text-xs">
                            {sale.total_items || 1}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-600 dark:text-slate-300">
                          {(sale.total_quantity || 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="font-medium text-slate-700 dark:text-slate-200">
                          S/ {(sale.total_sale || 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>{renderStatusBadge(sale.sale_status)}</TableCell>
                        <TableCell>{renderVoucherStatus(sale.payment_vouchers || [])}</TableCell>
                        {canViewAllSales && (
                          <TableCell className="text-slate-600 dark:text-slate-300">
                            {sale.profiles?.full_name || "N/A"}
                          </TableCell>
                        )}
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Abrir menú</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => handleViewDetails(sale)}>
                                <Eye className="mr-2 h-4 w-4" />
                                Ver detalles
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleEditSale(sale)}
                                disabled={!canViewAllSales && sale.created_by !== user?.id}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Editar venta
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleStatusChange(sale)}
                                disabled={!canViewAllSales && sale.created_by !== user?.id}
                              >
                                <Badge className="mr-2 h-4 w-4" />
                                Cambiar estado
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleVoucherDialog(sale)}>
                                <Receipt className="mr-2 h-4 w-4 text-blue-600" />
                                Comprobante de pago
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleGenerateWarrantyLetter(sale)}>
                                <Shield className="mr-2 h-4 w-4 text-green-600" />
                                Carta de garantía
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleGenerateCCILetter(sale)}>
                                <CreditCard className="mr-2 h-4 w-4 text-blue-600" />
                                Carta de CCI
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:hidden">
                {filteredSales.map((sale) => (
                  <div
                    key={sale.id}
                    className="rounded-lg border bg-card text-card-foreground shadow-sm p-4 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-start gap-4 mb-2">
                        <div className="flex-1">
                          <p className="text-sm font-semibold truncate" title={sale.entity_name}>
                            {sale.entity_name}
                          </p>
                          <p className="text-sm text-muted-foreground">Venta #{sale.sale_number || "N/A"}</p>
                          {canViewAllSales && (
                            <p className="text-xs text-muted-foreground">Por: {sale.profiles?.full_name || "N/A"}</p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {renderStatusBadge(sale.sale_status)}
                          {renderVoucherStatus(sale.payment_vouchers || [])}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground my-3">
                        <p className="font-medium text-foreground truncate" title={sale.display_product_name}>
                          {sale.display_product_name}
                        </p>
                        {sale.is_multi_product && <p className="text-xs">y {sale.total_items - 1} más</p>}
                      </div>
                    </div>
                    <div className="border-t pt-3 mt-3">
                      <div className="flex justify-between items-center text-sm mb-3">
                        <span className="text-muted-foreground">
                          {format(new Date(sale.sale_date), "dd MMM yy", { locale: es })}
                        </span>
                        <span className="font-bold text-base text-foreground">
                          S/ {sale.total_sale.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 w-full mb-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full bg-transparent"
                          onClick={() => handleViewDetails(sale)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Detalles
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full bg-transparent"
                          onClick={() => handleEditSale(sale)}
                          disabled={!canViewAllSales && sale.created_by !== user?.id}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </Button>
                      </div>
                      <div className="grid grid-cols-4 gap-2 w-full">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full bg-transparent"
                          onClick={() => handleStatusChange(sale)}
                          disabled={!canViewAllSales && sale.created_by !== user?.id}
                        >
                          <Badge className="h-4 w-4 mr-1" />
                          Estado
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full bg-transparent text-blue-600 hover:bg-blue-50"
                          onClick={() => handleVoucherDialog(sale)}
                        >
                          <Receipt className="h-4 w-4 mr-1" />
                          Comp.
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full bg-transparent text-green-600 hover:bg-green-50"
                          onClick={() => handleGenerateWarrantyLetter(sale)}
                        >
                          <Shield className="h-4 w-4 mr-1" />
                          Garantía
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full bg-transparent text-blue-600 hover:bg-blue-50"
                          onClick={() => handleGenerateCCILetter(sale)}
                        >
                          <CreditCard className="h-4 w-4 mr-1" />
                          CCI
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-700/50">
          <DialogHeader>
            <DialogTitle className="text-slate-800 dark:text-slate-100">Editar Venta</DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-300">
              Modifica los datos de la venta seleccionada
            </DialogDescription>
          </DialogHeader>
          {editingSale && (
            <SaleEditForm sale={editingSale} onSuccess={handleEditSuccess} onCancel={() => setShowEditDialog(false)} />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-700/50">
          <DialogHeader>
            <DialogTitle className="text-slate-800 dark:text-slate-100">Detalles de la Venta</DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-300">
              Información completa de la venta seleccionada
            </DialogDescription>
          </DialogHeader>
          {selectedSale && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-slate-50 to-slate-100/50 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4 md:gap-0">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      Venta #{selectedSale.sale_number || "N/A"}
                      {selectedSale.is_multi_product && (
                        <Badge variant="secondary" className="text-sm">
                          <ShoppingCart className="h-4 w-4 mr-1" />
                          Multi-Producto
                        </Badge>
                      )}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-300">
                      {format(new Date(selectedSale.sale_date), "dd 'de' MMMM 'de' yyyy", { locale: es })}
                    </p>
                  </div>
                  <div className="text-left md:text-right">
                    <p className="text-sm text-slate-600 dark:text-slate-300">Total de la Venta</p>
                    <p className="text-3xl font-bold text-slate-700 dark:text-slate-200">
                      S/ {selectedSale.total_sale.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  {renderStatusBadge(selectedSale.sale_status)}
                  {renderVoucherStatus(selectedSale.payment_vouchers || [])}
                  <span className="text-sm text-slate-600 dark:text-slate-300">
                    Vendedor: {selectedSale.profiles?.full_name || "N/A"}
                  </span>
                  <span className="text-sm text-slate-600 dark:text-slate-300">
                    Items: {selectedSale.total_items || 1}
                  </span>
                  <span className="text-sm text-slate-600 dark:text-slate-300">
                    Cantidad Total: {selectedSale.total_quantity.toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-700/50 border-slate-200 dark:border-slate-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg text-slate-800 dark:text-slate-100">
                      <div className="w-2 h-2 bg-slate-500 rounded-full"></div>Cliente
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                        Razón Social
                      </Label>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                        {selectedSale.entity_name}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                        RUC
                      </Label>
                      <p className="text-sm text-slate-700 dark:text-slate-200">{selectedSale.entity_ruc}</p>
                    </div>
                    {selectedSale.entity_executing_unit && (
                      <div>
                        <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                          Unidad Ejecutora
                        </Label>
                        <Badge
                          variant="outline"
                          className="text-xs border-slate-300 text-slate-600 dark:text-slate-300"
                        >
                          {selectedSale.entity_executing_unit}
                        </Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-700/50 border-slate-200 dark:border-slate-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg text-slate-800 dark:text-slate-100">
                      <DollarSign className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                      Información Financiera
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="text-center p-3 bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-lg border border-slate-200 dark:border-slate-700">
                        <p className="text-xs text-slate-600 dark:text-slate-300 mb-1">Items</p>
                        <p className="text-lg font-bold text-slate-700 dark:text-slate-200">
                          {selectedSale.total_items || 1}
                        </p>
                      </div>
                      <div className="text-center p-3 bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-lg border border-slate-200 dark:border-slate-700">
                        <p className="text-xs text-slate-600 dark:text-slate-300 mb-1">Cantidad</p>
                        <p className="text-lg font-bold text-slate-700 dark:text-slate-200">
                          {selectedSale.total_quantity.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-center p-3 bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-lg border border-slate-200 dark:border-slate-700">
                      <p className="text-sm text-slate-600 dark:text-slate-300 mb-1">Total</p>
                      <p className="text-xl font-bold text-slate-700 dark:text-slate-200">
                        S/{" "}
                        {selectedSale.total_sale.toLocaleString("es-PE", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 4,
                        })}
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Método de Pago:</span>
                        <Badge variant={selectedSale.payment_method === "CONTADO" ? "default" : "secondary"}>
                          {selectedSale.payment_method}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              {selectedSaleItems.length > 0 ? (
                <Card className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-700/50 border-slate-200 dark:border-slate-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg text-slate-800 dark:text-slate-100">
                      <Package className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                      Productos Vendidos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loadingDetails ? (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600 mx-auto"></div>
                        <p className="text-sm text-slate-600 mt-2">Cargando productos...</p>
                      </div>
                    ) : (
                      <div className="rounded-md border border-slate-200 dark:border-slate-700 overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-gradient-to-r from-slate-50 to-slate-100/50">
                              <TableHead className="text-slate-700 dark:text-slate-200">Código</TableHead>
                              <TableHead className="text-slate-700 dark:text-slate-200">Producto</TableHead>
                              <TableHead className="text-slate-700 dark:text-slate-200">Marca</TableHead>
                              <TableHead className="text-slate-700 dark:text-slate-200">Cantidad</TableHead>
                              <TableHead className="text-slate-700 dark:text-slate-200">Precio Unit.</TableHead>
                              <TableHead className="text-slate-700 dark:text-slate-200">Total</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedSaleItems.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell className="font-mono text-sm text-slate-600 dark:text-slate-300">
                                  {item.product_code}
                                </TableCell>
                                <TableCell>
                                  <div>
                                    <p className="font-medium text-slate-800 dark:text-slate-100">
                                      {item.product_name}
                                    </p>
                                    {item.product_description && (
                                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                        {item.product_description}
                                      </p>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="text-slate-600 dark:text-slate-300">
                                  {item.product_brand || "N/A"}
                                </TableCell>
                                <TableCell className="text-slate-600 dark:text-slate-300">
                                  {item.quantity.toLocaleString()}
                                </TableCell>
                                <TableCell className="text-slate-600 dark:text-slate-300">
                                  S/{" "}
                                  {item.unit_price_with_tax.toLocaleString("es-PE", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 4,
                                  })}
                                </TableCell>
                                <TableCell className="font-medium text-slate-700 dark:text-slate-200">
                                  S/ {item.total_amount.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-700/50 border-slate-200 dark:border-slate-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg text-slate-800 dark:text-slate-100">
                      <Package className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                      Producto
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                        Nombre
                      </Label>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                        {selectedSale.display_product_name}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                        Código
                      </Label>
                      <p className="text-sm text-slate-700 dark:text-slate-200">{selectedSale.display_product_code}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="text-center p-3 bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-lg border border-slate-200 dark:border-slate-700">
                        <p className="text-xs text-slate-600 dark:text-slate-300 mb-1">Cantidad</p>
                        <p className="text-lg font-bold text-slate-700 dark:text-slate-200">
                          {selectedSale.total_quantity.toLocaleString()}
                        </p>
                      </div>
                      <div className="text-center p-3 bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-lg border border-slate-200 dark:border-slate-700">
                        <p className="text-xs text-slate-600 dark:text-slate-300 mb-1">Precio Unit.</p>
                        <p className="text-lg font-bold text-slate-700 dark:text-slate-200">
                          S/{" "}
                          {selectedSale.total_quantity > 0
                            ? (selectedSale.total_sale / selectedSale.total_quantity).toLocaleString("es-PE", {
                                minimumFractionDigits: 2,
                              })
                            : "0.00"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-700/50 border-slate-200 dark:border-slate-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg text-slate-800 dark:text-slate-100">
                      <Package className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                      Entrega
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                        Fecha de Entrega
                      </Label>
                      <p className="text-sm text-slate-700 dark:text-slate-200">
                        {selectedSale.delivery_date
                          ? format(new Date(selectedSale.delivery_date), "dd/MM/yyyy", { locale: es })
                          : "No especificada"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                        Término de Entrega
                      </Label>
                      <p className="text-sm text-slate-700 dark:text-slate-200">
                        {selectedSale.delivery_term || "N/A"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                        Destino Final
                      </Label>
                      <p className="text-sm text-slate-700 dark:text-slate-200">
                        {selectedSale.final_destination || "N/A"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                        Almacenero
                      </Label>
                      <p className="text-sm text-slate-700 dark:text-slate-200">
                        {selectedSale.warehouse_manager || "N/A"}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-700/50 border-slate-200 dark:border-slate-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg text-slate-800 dark:text-slate-100">
                      <FileText className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                      Documentos
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                        N° Cotización
                      </Label>
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                        {selectedSale.quotation_code}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                        Exp SIAF
                      </Label>
                      <p className="text-sm text-slate-700 dark:text-slate-200">{selectedSale.exp_siaf || "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                        OCAM
                      </Label>
                      <p className="text-sm text-slate-700 dark:text-slate-200">{selectedSale.ocam || "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                        Orden Física
                      </Label>
                      <p className="text-sm text-slate-700 dark:text-slate-200">
                        {selectedSale.physical_order || "N/A"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                        Meta Proyecto
                      </Label>
                      <p className="text-sm text-slate-700 dark:text-slate-200">{selectedSale.project_meta || "N/A"}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
              {selectedSale.observations && (
                <Card className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-700/50 border-slate-200 dark:border-slate-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg text-slate-800 dark:text-slate-100">
                      <div className="w-2 h-2 bg-slate-500 rounded-full"></div>Observaciones
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-700 dark:text-slate-200 bg-slate-50 rounded-lg border-l-4 border-slate-400 p-3">
                      {selectedSale.observations}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent className="max-w-md bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-700/50">
          <DialogHeader>
            <DialogTitle className="text-slate-800 dark:text-slate-100">Cambiar Estado de Venta</DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-300">
              Selecciona el nuevo estado para la venta {statusSale?.sale_number || "N/A"}
            </DialogDescription>
          </DialogHeader>
          {statusSale && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg border">
                <p className="text-sm font-medium text-slate-700">Venta actual:</p>
                <p className="text-lg font-semibold text-slate-800">{statusSale.entity_name}</p>
                <p className="text-sm text-slate-600">Estado actual: {renderStatusBadge(statusSale.sale_status)}</p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">Nuevo estado:</p>
                <div className="grid grid-cols-1 gap-2">
                  <Button
                    variant={statusSale.sale_status === "compromiso" ? "default" : "outline"}
                    onClick={() => handleStatusUpdate("compromiso")}
                    className="justify-start"
                  >
                    <Badge variant="default" className="mr-2">
                      COMPROMISO
                    </Badge>
                    Compromiso
                  </Button>
                  <Button
                    variant={statusSale.sale_status === "devengado" ? "default" : "outline"}
                    onClick={() => handleStatusUpdate("devengado")}
                    className="justify-start"
                  >
                    <Badge variant="secondary" className="mr-2">
                      DEVENGADO
                    </Badge>
                    Devengado
                  </Button>
                  <Button
                    variant={statusSale.sale_status === "girado" ? "default" : "outline"}
                    onClick={() => handleStatusUpdate("girado")}
                    className="justify-start"
                  >
                    <Badge variant="destructive" className="mr-2">
                      GIRADO
                    </Badge>
                    Girado
                  </Button>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setShowStatusDialog(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showMultiEditDialog} onOpenChange={setShowMultiEditDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-700/50">
          <DialogHeader>
            <DialogTitle className="text-slate-800 dark:text-slate-100">Editar Venta Multi-Producto</DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-300">
              Modifica los productos y datos de la venta multi-producto
            </DialogDescription>
          </DialogHeader>
          {editingMultiSale && (
            <MultiProductSaleEditForm
              sale={editingMultiSale}
              onSuccess={handleMultiEditSuccess}
              onCancel={() => setShowMultiEditDialog(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {voucherSale && (
        <PaymentVoucherDialog
          sale={voucherSale}
          open={showVoucherDialog}
          onOpenChange={setShowVoucherDialog}
          onVoucherUploaded={handleVoucherUploaded}
        />
      )}

      {/* Sales Entity Management Dialog */}
      {companyToUse?.id && (
        <SalesEntityManagementDialog
          open={showSalesEntityManagementDialog}
          onOpenChange={setShowSalesEntityManagementDialog}
          companyId={companyToUse.id}
          canEdit={hasSalesAccess} // Cambiado de canViewAllSales a hasSalesAccess
        />
      )}

      <DateSelectorDialog
        open={warrantyDateDialog.open}
        onOpenChange={(open) => setWarrantyDateDialog({ open, sale: null, isGenerating: false })}
        onConfirm={(selectedDate) => {
          if (warrantyDateDialog.sale) {
            handleGenerateWarrantyLetter(warrantyDateDialog.sale, selectedDate)
          }
        }}
        title="Generar Carta de Garantía"
        description="Selecciona la fecha que aparecerá en la carta de garantía."
        isGenerating={warrantyDateDialog.isGenerating}
      />

      <DateSelectorDialog
        open={cciDateDialog.open}
        onOpenChange={(open) => setCciDateDialog({ open, sale: null, isGenerating: false })}
        onConfirm={(selectedDate) => {
          if (cciDateDialog.sale) {
            handleGenerateCCILetter(cciDateDialog.sale, selectedDate)
          }
        }}
        title="Generar Carta de CCI"
        description="Selecciona la fecha que aparecerá en la carta de CCI."
        isGenerating={cciDateDialog.isGenerating}
      />
    </div>
  )
}
