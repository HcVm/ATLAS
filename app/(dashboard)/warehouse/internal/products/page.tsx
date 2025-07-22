"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Search, Package, AlertTriangle, Edit, Eye } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

interface Category {
  id: number
  name: string
  color: string
}

interface Product {
  id: string // Changed to string for UUID
  code: string
  name: string
  description: string | null
  category_id: string // Changed to string for UUID
  unit_of_measure: string
  current_stock: number
  minimum_stock: number
  cost_price: number
  location: string | null
  is_active: boolean
  is_serialized: boolean // New field
  created_at: string
  internal_product_categories?: {
    id: number
    name: string
    color: string
  }
}

export default function InternalProductsPage() {
  const { user } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  useEffect(() => {
    if (user?.company_id) {
      fetchData()
    }
  }, [user?.company_id])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch products (models)
      const { data: productsData, error: productsError } = await supabase
        .from("internal_products")
        .select(`
          *,
          internal_product_categories (
            id,
            name,
            color
          )
        `)
        .eq("company_id", user?.company_id)
        .order("created_at", { ascending: false })

      if (productsError) throw productsError

      // For serialized products, calculate current_stock from internal_product_serials
      const productsWithAggregatedStock = await Promise.all(
        (productsData || []).map(async (product) => {
          if (product.is_serialized) {
            const { count, error: serialCountError } = await supabase
              .from("internal_product_serials")
              .select("id", { count: "exact", head: true })
              .eq("product_id", product.id)
              .eq("status", "in_stock")
              .eq("company_id", user?.company_id)

            if (serialCountError) {
              console.error(`Error fetching serial count for product ${product.id}:`, serialCountError)
              return { ...product, current_stock: 0 } // Default to 0 on error
            }
            return { ...product, current_stock: count || 0 }
          }
          return product
        }),
      )

      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("internal_product_categories")
        .select("*")
        .or(`company_id.eq.${user?.company_id},company_id.is.null`)
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

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesCategory = selectedCategory === "all" || product.category_id.toString() === selectedCategory

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && product.is_active) ||
      (statusFilter === "inactive" && !product.is_active) ||
      (statusFilter === "low_stock" && product.current_stock <= product.minimum_stock)

    return matchesSearch && matchesCategory && matchesStatus
  })

  const stats = {
    total: products.length,
    active: products.filter((p) => p.is_active).length,
    lowStock: products.filter((p) => p.current_stock <= p.minimum_stock).length,
    totalValue: products.reduce((sum, p) => sum + p.current_stock * p.cost_price, 0),
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Package className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Productos Internos</h1>
          <p className="text-muted-foreground">Gestiona los productos de uso interno de la empresa</p>
        </div>
        <Button asChild>
          <Link href="/warehouse/internal/products/new">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Producto
          </Link>
        </Button>
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
        <CardHeader>
          <CardTitle>Lista de Productos</CardTitle>
          <CardDescription>
            {filteredProducts.length} de {products.length} modelos de productos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Costo Unit.</TableHead>
                  <TableHead>Valor Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Tipo</TableHead> {/* New column */}
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
                      <TableCell>S/ {product.cost_price.toFixed(2)}</TableCell>
                      <TableCell>S/ {(product.current_stock * product.cost_price).toFixed(2)}</TableCell>
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
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/warehouse/internal/products/${product.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/warehouse/internal/products/edit/${product.id}`}>
                              <Edit className="h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
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
