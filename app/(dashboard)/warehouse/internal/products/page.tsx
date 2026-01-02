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

      const { data: productsData, error: productsError } = await productsQuery
      if (productsError) throw productsError

      const productsWithAggregatedStock = await Promise.all(
        (productsData || []).map(async (product) => {
          if (product.is_serialized) {
            const { count, error: serialCountError } = await supabase
              .from("internal_product_serials")
              .select("id", { count: "exact", head: true })
              .eq("product_id", product.id)
              .eq("status", "in_stock")
              .eq("company_id", companyId)

            if (serialCountError) {
              console.error(`Error fetching serial count for product ${product.id}:`, serialCountError)
              return { ...product, current_stock: 0 }
            }
            return { ...product, current_stock: count || 0 }
          }
          return product
        }),
      )

      const { data: categoriesData, error: categoriesError } = await supabase
        .from("internal_product_categories")
        .select("id, name, color")
        .or(`company_id.eq.${companyId},company_id.is.null`)
        .order("name")
      if (categoriesError) throw categoriesError

      setProducts(productsWithAggregatedStock || [])
      setCategories(categoriesData || [])
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

  const handleBulkPrintStickers = async () => {
    try {
      setIsBulkPrinting(true)
      const { data: companyData } = await supabase.from("companies").select("name").eq("id", companyId).single()
      const companyName = companyData?.name || "EMPRESA"
      const currentYear = new Date().getFullYear()

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
        .in("product_id", selectedProductIds)
        .eq("status", "in_stock")
        .eq("company_id", companyId)

      if (serialsError) throw serialsError
      if (!serials || serials.length === 0) {
        toast.error("No se encontraron seriales en stock para los productos seleccionados")
        return
      }

      const stickersHtml = await Promise.all(
        serials.map(async (serial: any) => {
          let qrCodeUrl = ""
          if (serial.qr_code_hash) {
            const publicUrl = `${window.location.origin}/public/internal-product/${serial.qr_code_hash}`
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
                <div class="serial">${serial.serial_number}</div>
                <div class="product-name">${serial.internal_products?.name || ""}</div>
                <div class="info-grid">
                  <div class="info-row">
                    <span class="info-label">Ubic:</span>
                    <span class="info-value">${serial.current_location || "N/A"}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Ref:</span>
                    <span class="info-value">${serial.internal_products?.code || ""}</span>
                  </div>
                </div>
              </div>
              ${qrCodeUrl ? `<div class="qr-column"><img src="${qrCodeUrl}" alt="QR" /><div class="qr-label">Escanear</div></div>` : ""}
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
                .qr-column { display: flex; flex-direction: column; align-items: center; justify-content: center; width: 14mm; padding-right: 2mm; }
                .qr-column img { width: 13mm; height: 13mm; }
                .qr-label { font-size: 5pt; text-align: center; margin-top: 0.5mm; font-weight: 600; }
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
    } catch (error) {
      console.error("Error printing bulk stickers:", error)
      toast.error("Error al imprimir etiquetas")
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
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
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
    </div>
  )
}
