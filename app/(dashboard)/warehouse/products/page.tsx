"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Plus, Search, Package, MoreHorizontal, Edit, Eye, AlertTriangle, Filter, Download } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { useCompany } from "@/lib/company-context"
import { toast } from "sonner"

interface Product {
  id: string
  code: string
  name: string
  description: string | null
  current_stock: number
  minimum_stock: number
  unit_of_measure: string
  cost_price: number
  sale_price: number
  is_active: boolean
  image_url: string | null
  created_at: string
  brands?: {
    id: string
    name: string
  }
  categories?: {
    id: string
    name: string
  }
}

export default function ProductsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { selectedCompany } = useCompany()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])

  useEffect(() => {
    if (selectedCompany) {
      fetchProducts()
    }
  }, [selectedCompany])

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredProducts(products)
    } else {
      const filtered = products.filter(
        (product) =>
          product.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (product.brands?.name && product.brands.name.toLowerCase().includes(searchTerm.toLowerCase())),
      )
      setFilteredProducts(filtered)
    }
  }, [searchTerm, products])

  const fetchProducts = async () => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from("products")
        .select(`
          id, code, name, description, current_stock, minimum_stock, 
          unit_of_measure, cost_price, sale_price, is_active, image_url, created_at,
          brands (id, name),
          categories (id, name)
        `)
        .eq("company_id", selectedCompany?.id)
        .order("created_at", { ascending: false })

      if (error) throw error

      setProducts(data || [])
    } catch (error: any) {
      console.error("Error fetching products:", error)
      toast.error("Error al cargar productos")
    } finally {
      setLoading(false)
    }
  }

  const getStockStatus = (currentStock: number, minimumStock: number) => {
    if (currentStock === 0) {
      return { label: "Sin stock", variant: "destructive" as const }
    } else if (currentStock <= minimumStock) {
      return { label: "Stock bajo", variant: "secondary" as const }
    } else {
      return { label: "En stock", variant: "default" as const }
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "PEN",
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 dark:from-background dark:via-background dark:to-muted/10">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-96" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
          <Card className="shadow-lg border-border/50 dark:border-border/50">
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 dark:bg-primary/20 rounded-lg">
              <Package className="h-6 w-6 text-primary dark:text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-700 via-slate-600 to-slate-500 dark:from-slate-200 dark:via-slate-100 dark:to-slate-200 bg-clip-text text-transparent">
                Productos
              </h1>
              <p className="text-slate-600 dark:text-slate-300">
                Gestiona el catálogo de productos de {selectedCompany?.name}
              </p>
            </div>
          </div>
          <Button
            onClick={() => router.push("/warehouse/products/new")}
            className="bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 dark:from-slate-600 dark:to-slate-700 dark:hover:from-slate-700 dark:hover:to-slate-800 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Producto
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-700/50 border-slate-200/60 dark:border-slate-700/60 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground dark:text-muted-foreground">
                    Total Productos
                  </p>
                  <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{products.length}</p>
                </div>
                <Package className="h-8 w-8 text-primary dark:text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-700/50 border-slate-200/60 dark:border-slate-700/60 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground dark:text-muted-foreground">
                    Productos Activos
                  </p>
                  <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                    {products.filter((p) => p.is_active).length}
                  </p>
                </div>
                <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                  <div className="h-4 w-4 rounded-full bg-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-700/50 border-slate-200/60 dark:border-slate-700/60 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground dark:text-muted-foreground">Stock Bajo</p>
                  <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                    {products.filter((p) => p.current_stock <= p.minimum_stock && p.current_stock > 0).length}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-orange-600 dark:text-orange-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-700/50 border-slate-200/60 dark:border-slate-700/60 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground dark:text-muted-foreground">Sin Stock</p>
                  <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                    {products.filter((p) => p.current_stock === 0).length}
                  </p>
                </div>
                <div className="h-8 w-8 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                  <div className="h-4 w-4 rounded-full bg-red-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6 border-border/50 dark:border-border/50 bg-card/95 dark:bg-card/95">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground dark:text-muted-foreground" />
                <Input
                  placeholder="Buscar por código, nombre, descripción o marca..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-background dark:bg-background border-border dark:border-border"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="border-border dark:border-border">
                  <Filter className="h-4 w-4 mr-2" />
                  Filtros
                </Button>
                <Button variant="outline" size="sm" className="border-border dark:border-border">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Products Table */}
        <Card className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-700/50 border-slate-200/60 dark:border-slate-700/60 shadow-lg">
          <CardHeader className="border-b border-border/50 dark:border-border/50">
            <CardTitle className="text-slate-800 dark:text-slate-100 font-semibold">
              Lista de Productos ({filteredProducts.length})
            </CardTitle>
            <CardDescription className="text-muted-foreground dark:text-muted-foreground">
              Gestiona y visualiza todos los productos del inventario
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-muted-foreground dark:text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium text-slate-800 dark:text-card-foreground mb-2">
                  {searchTerm ? "No se encontraron productos" : "No hay productos registrados"}
                </h3>
                <p className="text-muted-foreground dark:text-muted-foreground mb-4">
                  {searchTerm
                    ? "Intenta con otros términos de búsqueda"
                    : "Comienza agregando tu primer producto al inventario"}
                </p>
                {!searchTerm && (
                  <Button onClick={() => router.push("/warehouse/products/new")}>
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Producto
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50 dark:border-border/50">
                      <TableHead className="text-muted-foreground dark:text-muted-foreground">Código</TableHead>
                      <TableHead className="text-muted-foreground dark:text-muted-foreground">Producto</TableHead>
                      <TableHead className="text-muted-foreground dark:text-muted-foreground">Marca</TableHead>
                      <TableHead className="text-muted-foreground dark:text-muted-foreground">Stock</TableHead>
                      <TableHead className="text-muted-foreground dark:text-muted-foreground">Estado</TableHead>
                      <TableHead className="text-muted-foreground dark:text-muted-foreground">Precio Venta</TableHead>
                      <TableHead className="text-muted-foreground dark:text-muted-foreground">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product) => {
                      const stockStatus = getStockStatus(product.current_stock, product.minimum_stock)
                      return (
                        <TableRow
                          key={product.id}
                          className="border-border/50 dark:border-border/50 hover:bg-slate-50/50 dark:hover:bg-slate-700/50"
                        >
                          <TableCell className="font-mono text-sm text-slate-800 dark:text-slate-100">
                            {product.code}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {product.image_url ? (
                                <img
                                  src={product.image_url || "/placeholder.svg"}
                                  alt={product.name}
                                  className="h-10 w-10 rounded-lg object-cover"
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-lg bg-muted dark:bg-muted flex items-center justify-center">
                                  <Package className="h-5 w-5 text-muted-foreground dark:text-muted-foreground" />
                                </div>
                              )}
                              <div>
                                <p className="font-medium text-slate-800 dark:text-slate-100">{product.name}</p>
                                {product.description && (
                                  <p className="text-sm text-slate-500 dark:text-slate-300 truncate max-w-xs">
                                    {product.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-800 dark:text-slate-100">
                            {product.brands?.name || "-"}
                          </TableCell>
                          <TableCell>
                            <div className="text-slate-800 dark:text-slate-100">
                              {product.current_stock} {product.unit_of_measure}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-300">
                              Mín: {product.minimum_stock}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <Badge variant={stockStatus.variant}>{stockStatus.label}</Badge>
                              <Badge variant={product.is_active ? "default" : "secondary"}>
                                {product.is_active ? "Activo" : "Inactivo"}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium text-slate-800 dark:text-slate-100">
                            {formatCurrency(product.sale_price)}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-muted dark:hover:bg-muted">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className="bg-popover dark:bg-popover border-border dark:border-border"
                              >
                                <DropdownMenuLabel className="text-popover-foreground dark:text-popover-foreground">
                                  Acciones
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator className="bg-border dark:bg-border" />
                                <DropdownMenuItem
                                  onClick={() => router.push(`/warehouse/products/${product.id}`)}
                                  className="text-popover-foreground dark:text-popover-foreground hover:bg-accent dark:hover:bg-accent"
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  Ver detalles
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => router.push(`/warehouse/products/edit/${product.id}`)}
                                  className="text-popover-foreground dark:text-popover-foreground hover:bg-accent dark:hover:bg-accent"
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
