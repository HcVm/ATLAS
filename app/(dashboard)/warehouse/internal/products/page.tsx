"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { useCompany } from "@/lib/company-context"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Plus,
  Search,
  Package,
  AlertTriangle,
  Edit,
  Eye,
  MoreHorizontal,
  QrCode,
  Trash2,
  Printer,
  CheckSquare,
  Square,
  ArrowUpCircle,
} from "lucide-react"
import Link from "next/link"
import { deleteInternalProduct } from "@/app/actions/internal-products"
import QRCodeLib from "qrcode"
import { QuickInternalEntryDialog } from "@/components/warehouse/quick-internal-entry-dialog"
import { StickerPrintIndicator } from "@/components/warehouse/sticker-print-indicator"
import { getLastStickerPrint, hasStickerBeenPrinted, registerStickerPrint } from "@/lib/sticker-print-service"
import { format } from "date-fns"
import { formatInTimeZone } from "date-fns-tz"
import { es } from "date-fns/locale"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogPortal,
  AlertDialogOverlay,
} from "@/components/ui/alert-dialog"

interface Category {
  id: string
  name: string
  color: string
}

interface Product {
  id: string
  code: string
  name: string
  description: string | null
  category_id: string
  unit_of_measure: string
  current_stock: number
  minimum_stock: number
  cost_price: number | null
  location: string | null
  is_active: boolean
  is_serialized: boolean
  created_at: string
  internal_product_categories?: {
    id: string
    name: string
    color: string
  }
  qr_code_hash?: string
}

export default function InternalProductsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { selectedCompany } = useCompany()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])
  const [isBulkPrinting, setIsBulkPrinting] = useState(false)
  const [isQuickEntryOpen, setIsQuickEntryOpen] = useState(false)
  const [productForQuickEntry, setProductForQuickEntry] = useState<Product | null>(null)
  const [stickerPrintData, setStickerPrintData] = useState<Record<string, any>>({})
  const [reprintConfirmDialog, setReprintConfirmDialog] = useState<{
    open: boolean
    product: Product | null
    lastPrintData: any
  }>({
    open: false,
    product: null,
    lastPrintData: null,
  })

  const companyId = useMemo(() => {
    return user?.role === "admin" ? selectedCompany?.id : user?.company_id
  }, [user, selectedCompany])

  useEffect(() => {
    if (companyId) {
      fetchData()
    }
  }, [companyId, selectedCategory, statusFilter])

  const fetchData = async () => {
    try {
      setLoading(true)
      let productsQuery = supabase
        .from("internal_products")
        .select(
          `
          *,
          internal_product_categories (
            id,
            name,
            color
          )
        `,
        )
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })

      if (selectedCategory !== "all") {
        productsQuery = productsQuery.eq("category_id", selectedCategory)
      }

      // Fetch all necessary data in parallel
      const [productsResponse, serialsResponse, printsResponse, categoriesResponse] = await Promise.all([
        productsQuery,
        supabase
          .from("internal_product_serials")
          .select("id, product_id")
          .eq("status", "in_stock")
          .eq("company_id", companyId),
        supabase
          .from("sticker_prints")
          .select("product_id, serial_id, printed_at, quantity_printed, printed_by")
          .eq("company_id", companyId)
          .order("printed_at", { ascending: false }),
        supabase
          .from("internal_product_categories")
          .select("id, name, color")
          .or(`company_id.eq.${companyId},company_id.is.null`)
          .order("name"),
      ])

      if (productsResponse.error) throw productsResponse.error
      if (categoriesResponse.error) throw categoriesResponse.error

      const productsData = productsResponse.data || []
      const serialsData = serialsResponse.data || []
      const printsData = printsResponse.data || []

      // --- Process Serials and Stock ---
      const serialsByProduct = new Map<string, Set<string>>()
      const stockByProduct = new Map<string, number>()

      serialsData.forEach((s) => {
        // Track serial IDs per product
        if (!serialsByProduct.has(s.product_id)) {
          serialsByProduct.set(s.product_id, new Set())
        }
        serialsByProduct.get(s.product_id)?.add(s.id)

        // Count stock
        stockByProduct.set(s.product_id, (stockByProduct.get(s.product_id) || 0) + 1)
      })

      // --- Process Prints ---
      const printsBySerial = new Map<string, any>()
      const printsByProduct = new Map<string, any>()

      printsData.forEach((p) => {
        if (p.serial_id) {
          // If we haven't seen this serial yet, this is the latest print (due to sort order)
          if (!printsBySerial.has(p.serial_id)) {
            printsBySerial.set(p.serial_id, p)
          }
        } else if (p.product_id) {
          // Latest print for bulk product
          if (!printsByProduct.has(p.product_id)) {
            printsByProduct.set(p.product_id, p)
          }
        }
      })

      // --- Aggregate Data ---
      const productsWithAggregatedStock = productsData.map((product) => {
        if (product.is_serialized) {
          return {
            ...product,
            current_stock: stockByProduct.get(product.id) || 0,
          }
        }
        return product
      })

      const printDataMap: Record<string, any> = {}

      productsWithAggregatedStock.forEach((product) => {
        if (product.is_serialized) {
          const productSerials = serialsByProduct.get(product.id) || new Set()
          const totalInStock = productSerials.size
          let printedCount = 0
          let lastPrintAt: string | null = null

          // Count how many in-stock serials have been printed
          productSerials.forEach((serialId) => {
            const printInfo = printsBySerial.get(serialId)
            if (printInfo) {
              printedCount++
              // Update lastPrintAt if this print is more recent
              if (!lastPrintAt || new Date(printInfo.printed_at) > new Date(lastPrintAt)) {
                lastPrintAt = printInfo.printed_at
              }
            }
          })

          printDataMap[product.id] = {
            printStats: {
              totalInStock,
              printedCount,
              lastPrintAt,
            },
            lastPrintInfo: null,
          }
        } else {
          // Bulk Product
          const lastPrint = printsByProduct.get(product.id) || null
          printDataMap[product.id] = {
            lastPrintInfo: lastPrint,
            printStats: null,
          }
        }
      })

      setStickerPrintData(printDataMap)
      setProducts(productsWithAggregatedStock)
      setCategories(categoriesResponse.data || [])
    } catch (error) {
      console.error("Error fetching data:", error)
      toast.error("Error al cargar los datos")
    } finally {
      setLoading(false)
    }
  }

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()))

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && product.is_active) ||
        (statusFilter === "inactive" && !product.is_active) ||
        (statusFilter === "low_stock" && product.current_stock <= product.minimum_stock)

      return matchesSearch && matchesStatus
    })
  }, [products, searchTerm, statusFilter])

  const handleProductDelete = async (productId: string) => {
    // Guardamos el estado anterior por si hay un error y necesitamos revertir
    const previousProducts = [...products]

    // Eliminamos el producto localmente de inmediato
    setProducts((prev) => prev.filter((p) => p.id !== productId))
    setSelectedProductIds((prev) => prev.filter((id) => id !== productId))

    const result = await deleteInternalProduct(productId)

    if (result.success) {
      toast.success(result.message)
      // Ya no llamamos a fetchData() aquí para evitar la recarga de datos innecesaria
      // ya que la UI ya se actualizó de forma optimista
    } else {
      setProducts(previousProducts)
      toast.error(result.message)
    }
  }

  const executePrintStickers = async (
    itemsToPrint: Array<{
      type: "serial" | "product"
      data: any
      productName: string
      productCode: string
      qrHash: string | null
      location?: string
    }>,
  ) => {
    try {
      const { data: companyData } = await supabase.from("companies").select("name").eq("id", companyId).single()
      const companyName = companyData?.name || "EMPRESA"
      const currentYear = new Date().getFullYear()

      const stickersHtml = await Promise.all(
        itemsToPrint.map(async (item) => {
          let qrCodeUrl = ""
          if (item.qrHash) {
            const publicUrl = `${window.location.origin}/public/internal-product/${item.qrHash}`
            qrCodeUrl = await QRCodeLib.toDataURL(publicUrl, {
              errorCorrectionLevel: "H",
              width: 300,
              margin: 1,
            })
          }

          return `
            <div class="sticker">
              <div class="main-content">
                <div class="header-row">
                  <span class="company-text">${companyName} INV ${currentYear}</span>
                  <span class="atlas-badge">ATLAS</span>
                </div>
                <div class="serial">${item.type === "serial" ? item.data.serial_number : "A GRANEL"}</div>
                <div class="product-name">${item.productName}</div>
                <div class="info-grid">
                  <div class="info-row">
                    <span class="info-label">Ubic:</span>
                    <span class="info-value">${item.location || "N/A"}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Ref:</span>
                    <span class="info-value">${item.productCode}</span>
                  </div>
                </div>
              </div>
              ${qrCodeUrl ? `<div class="qr-column"><img src="${qrCodeUrl}" alt="QR" /></div>` : ""}
            </div>
          `
        }),
      )

      const printWindow = window.open("", "_blank")
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Etiquetas Masivas</title>
              <style>
                @page { size: 50mm 25mm; margin: 0; }
                body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
                .sticker { width: 50mm; height: 25mm; display: flex; flex-direction: row; padding: 0; overflow: hidden; page-break-after: always; }
                .main-content { flex: 1; display: flex; flex-direction: column; padding: 3mm 2mm; min-width: 0; }
                .header-row { display: flex; align-items: center; justify-content: space-between; border-bottom: 0.5px solid #ccc; margin-bottom: 1mm; padding-bottom: 0.5mm; }
                .company-text { font-size: 5pt; font-weight: 750; text-transform: uppercase; }
                .atlas-badge { font-size: 5pt; font-weight: 800; color: #fff; background: #000; padding: 0.5mm 1.5mm; border-radius: 2px; }
                .serial { font-weight: 700; font-size: 7pt; font-family: monospace; margin-bottom: 1mm; }
                .product-name { font-weight: 700; font-size: 6pt; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .info-grid { display: flex; flex-direction: column; gap: 0.5mm; }
                .info-row { display: flex; gap: 1mm; font-size: 6pt; }
                .info-label { font-weight: 700; }
                .qr-column { display: flex; flex-direction: column; align-items: center; justify-content: center; width: 17mm; padding-right: 1mm; }
                .qr-column img { width: 16mm; height: 16mm; }
              </style>
            </head>
            <body>${stickersHtml.join("")}</body>
          </html>
        `)
        printWindow.document.close()
        setTimeout(() => {
          printWindow.print()
          printWindow.close()
        }, 500)
      }

      // Registrar impresiones
      if (user?.id && companyId) {
        await Promise.all(
          itemsToPrint.map((item) =>
            registerStickerPrint({
              productId: item.type === "serial" ? item.data.product_id : item.data.id,
              serialId: item.type === "serial" ? item.data.id : undefined,
              userId: user.id,
              companyId: companyId,
              quantity: 1,
              client: supabase,
            }),
          ),
        )
      }

      toast.success("Impresión enviada correctamente")
      fetchData() // Actualizar estado
    } catch (error) {
      console.error("Error printing stickers:", error)
      toast.error("Error al generar las etiquetas")
    }
  }

  const handleBulkPrintStickers = async () => {
    try {
      setIsBulkPrinting(true)
      const selectedProducts = products.filter((p) => selectedProductIds.includes(p.id))

      // 1. Verificar si es un solo producto no serializado y ya fue impreso
      if (selectedProducts.length === 1 && !selectedProducts[0].is_serialized) {
        const product = selectedProducts[0]
        const lastPrint = stickerPrintData[product.id]?.lastPrintInfo

        if (lastPrint) {
          setReprintConfirmDialog({
            open: true,
            product,
            lastPrintData: lastPrint,
          })
          setIsBulkPrinting(false)
          return
        }
      }

      // 2. Preparar ítems para imprimir
      const itemsToPrint: any[] = []
      const serializedProducts = selectedProducts.filter((p) => p.is_serialized)
      const bulkProducts = selectedProducts.filter((p) => !p.is_serialized)

      // Agregar productos a granel
      for (const p of bulkProducts) {
        itemsToPrint.push({
          type: "product",
          data: p,
          productName: p.name,
          productCode: p.code,
          qrHash: p.qr_code_hash,
          location: p.location,
        })
      }

      // Buscar seriales para productos serializados
      if (serializedProducts.length > 0) {
        const { data: serials, error: serialsError } = await supabase
          .from("internal_product_serials")
          .select(`
            id,
            serial_number,
            current_location,
            qr_code_hash,
            product_id,
            internal_products (
              name,
              code
            )
          `)
          .in("product_id", serializedProducts.map((p) => p.id))
          .eq("status", "in_stock")
          .eq("company_id", companyId)

        if (serialsError) throw serialsError

        if (serials) {
          serials.forEach((s: any) => {
            itemsToPrint.push({
              type: "serial",
              data: s,
              productName: s.internal_products?.name || "Unknown",
              productCode: s.internal_products?.code || "Unknown",
              qrHash: s.qr_code_hash,
              location: s.current_location,
            })
          })
        }
      }

      if (itemsToPrint.length === 0) {
        toast.error("No se encontraron ítems para imprimir (verifique stock de seriales)")
        return
      }

      await executePrintStickers(itemsToPrint)
    } catch (error) {
      console.error("Error preparing bulk print:", error)
      toast.error("Error al preparar la impresión")
    } finally {
      setIsBulkPrinting(false)
    }
  }

  const handleReprintConfirm = async () => {
    if (!reprintConfirmDialog.product) return

    setIsBulkPrinting(true)
    setReprintConfirmDialog((prev) => ({ ...prev, open: false }))

    try {
      const product = reprintConfirmDialog.product
      const itemsToPrint = [
        {
          type: "product" as const,
          data: product,
          productName: product.name,
          productCode: product.code,
          qrHash: product.qr_code_hash,
          location: product.location,
        },
      ]

      await executePrintStickers(itemsToPrint)
    } catch (error) {
      console.error("Error executing reprint:", error)
      toast.error("Error al reimprimir")
    } finally {
      setIsBulkPrinting(false)
    }
  }

  const toggleProductSelection = (productId: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId],
    )
  }

  const toggleAllSelection = () => {
    if (selectedProductIds.length === filteredProducts.length) {
      setSelectedProductIds([])
    } else {
      setSelectedProductIds(filteredProducts.map((p) => p.id))
    }
  }

  const stats = useMemo(() => {
    const totalValue = products.reduce((sum, p) => sum + p.current_stock * (p.cost_price ?? 0), 0)
    return {
      total: products.length,
      active: products.filter((p) => p.is_active).length,
      lowStock: products.filter((p) => p.current_stock <= p.minimum_stock).length,
      totalValue: totalValue,
    }
  }, [products])

  const handleQuickEntrySuccess = (addedQuantity: number) => {
    if (productForQuickEntry) {
      setProducts((prevProducts) =>
        prevProducts.map((p) =>
          p.id === productForQuickEntry.id ? { ...p, current_stock: (p.current_stock || 0) + addedQuantity } : p,
        ),
      )
    }
  }

  if (!companyId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <h2 className="text-2xl font-bold">Selecciona una Empresa</h2>
        <p className="text-muted-foreground mt-2">
          Por favor, selecciona una empresa para ver y gestionar los productos internos.
        </p>
        {user?.role === "admin" && (
          <Button onClick={() => router.push("/settings")} className="mt-4">
            Ir a Configuración de Empresa
          </Button>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Package className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 mt-10">
      {/* Quick Entry Dialog */}
      <QuickInternalEntryDialog
        isOpen={isQuickEntryOpen}
        onOpenChange={setIsQuickEntryOpen}
        product={productForQuickEntry}
        companyId={companyId || ""}
        onSuccess={handleQuickEntrySuccess}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Productos Internos</h1>
          <p className="text-muted-foreground">Gestiona los productos de uso interno de la empresa</p>
        </div>
        <div className="flex gap-2">
          {selectedProductIds.length > 0 && (
            <Button variant="outline" onClick={handleBulkPrintStickers} disabled={isBulkPrinting}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimir Seleccionados ({selectedProductIds.length})
            </Button>
          )}
          <Button asChild>
            <Link href="/warehouse/internal/products/new">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Producto
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Modelos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">{stats.active} activos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Bajo</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.lowStock}</div>
            <p className="text-xs text-muted-foreground">Modelos requieren atención</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">S/ {stats.totalValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Inventario valorizado</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categorías</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categories.length}</div>
            <p className="text-xs text-muted-foreground">Diferentes tipos</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Busca y filtra productos internos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, código o descripción..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Todas las categorías" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id.toString()}>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color }} />
                      {category.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Activos</SelectItem>
                <SelectItem value="inactive">Inactivos</SelectItem>
                <SelectItem value="low_stock">Stock Bajo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Lista de Productos</CardTitle>
            <CardDescription>
              {filteredProducts.length} de {products.length} modelos de productos
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={toggleAllSelection}>
            {selectedProductIds.length === filteredProducts.length ? (
              <CheckSquare className="h-4 w-4 mr-2" />
            ) : (
              <Square className="h-4 w-4 mr-2" />
            )}
            Seleccionar Todos
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    {filteredProducts.length > 0 && (
                      <Button variant="ghost" size="sm" onClick={toggleAllSelection}>
                        {selectedProductIds.length === filteredProducts.length ? (
                          <CheckSquare className="h-4 w-4 text-primary" />
                        ) : (
                          <Square className="h-4 w-4 text-muted-foreground" />
                        )}
                        Seleccionar Todos
                      </Button>
                    )}
                  </TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Costo Unit.</TableHead>
                  <TableHead>Valor Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Sticker</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      <div className="text-muted-foreground">
                        <Package className="h-8 w-8 mx-auto mb-2" />
                        <p>No se encontraron productos</p>
                        <p className="text-sm">Intenta ajustar los filtros o crear un nuevo producto</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => toggleProductSelection(product.id)}
                        >
                          {selectedProductIds.includes(product.id) ? (
                            <CheckSquare className="h-4 w-4 text-primary" />
                          ) : (
                            <Square className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="font-mono">{product.code}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{product.name}</div>
                          {product.description && (
                            <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                              {product.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {product.internal_product_categories && (
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: product.internal_product_categories.color }}
                            />
                            <span className="text-sm">{product.internal_product_categories.name}</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span
                            className={
                              product.current_stock <= product.minimum_stock ? "text-red-600 font-semibold" : ""
                            }
                          >
                            {product.current_stock}
                          </span>
                          <span className="text-muted-foreground text-sm">{product.unit_of_measure}</span>
                          {product.current_stock <= product.minimum_stock && (
                            <AlertTriangle className="h-4 w-4 text-orange-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>S/ {product.cost_price !== null ? product.cost_price.toFixed(2) : "N/A"}</TableCell>
                      <TableCell>S/ {(product.current_stock * (product.cost_price ?? 0)).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={product.is_active ? "default" : "secondary"}>
                          {product.is_active ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {product.is_serialized ? "Serializado" : "No Serializado"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <StickerPrintIndicator
                          productId={product.id}
                          serialId={null}
                          isSerializedProduct={product.is_serialized}
                          lastPrintInfo={stickerPrintData[product.id]?.lastPrintInfo}
                          printStats={stickerPrintData[product.id]?.printStats}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Abrir menú</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => {
                                setProductForQuickEntry(product)
                                setIsQuickEntryOpen(true)
                              }}
                            >
                              <ArrowUpCircle className="mr-2 h-4 w-4 text-green-600" /> Registrar Entrada
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/warehouse/internal/products/${product.id}`}>
                                <Eye className="mr-2 h-4 w-4" /> Ver Detalles
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/warehouse/internal/products/edit/${product.id}`}>
                                <Edit className="mr-2 h-4 w-4" /> Editar
                              </Link>
                            </DropdownMenuItem>
                            {product.is_serialized && (
                              <DropdownMenuItem asChild>
                                <Link href={`/public/internal-product/${product.qr_code_hash || product.id}`}>
                                  <QrCode className="mr-2 h-4 w-4" /> Ver QRs
                                </Link>
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600" onClick={() => handleProductDelete(product.id)}>
                              <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      {/* Reprint Confirmation Dialog */}
      <AlertDialog
        open={reprintConfirmDialog.open}
        onOpenChange={(open) => !open && setReprintConfirmDialog({ open: false, product: null, lastPrintData: null })}
      >
        <AlertDialogPortal>
          <AlertDialogOverlay />
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-amber-600">Sticker ya ha sido impreso</AlertDialogTitle>
              <AlertDialogDescription className="space-y-2 pt-2">
                <p>El sticker para el producto "{reprintConfirmDialog.product?.name}" ya ha sido impreso anteriormente:</p>
                {reprintConfirmDialog.lastPrintData && (
                  <div className="bg-amber-50 border border-amber-200 rounded p-2 text-sm">
                    <p className="font-semibold text-amber-900">Última impresión:</p>
                    <p className="text-amber-800">
                      {reprintConfirmDialog.lastPrintData.printed_at
                        ? formatInTimeZone(
                            reprintConfirmDialog.lastPrintData.printed_at,
                            "America/Lima",
                            "d 'de' MMMM 'de' yyyy 'a las' HH:mm",
                            { locale: es },
                          )
                        : "Fecha desconocida"}
                    </p>
                    {reprintConfirmDialog.lastPrintData.printed_by_name && (
                      <p className="text-amber-800">Por: {reprintConfirmDialog.lastPrintData.printed_by_name}</p>
                    )}
                  </div>
                )}
                <p className="font-semibold">¿Deseas imprimir nuevamente?</p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleReprintConfirm} className="bg-amber-600 hover:bg-amber-700 text-white">
                Imprimir de todos modos
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogPortal>
      </AlertDialog>
    </div>
  )
}
