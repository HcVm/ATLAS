"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Search, Edit, Eye, AlertTriangle, Package } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { useCompany } from "@/lib/company-context"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

interface Product {
  id: string
  name: string
  description: string | null
  code: string
  barcode: string | null
  unit_of_measure: string
  minimum_stock: number
  current_stock: number
  cost_price: number
  sale_price: number
  location: string | null
  is_active: boolean
  brands?: { id: string; name: string; color: string } | null
  product_categories?: { id: string; name: string; color: string } | null
}

interface Brand {
  id: string
  name: string
  color: string
}

interface Category {
  id: string
  name: string
  color: string
}

export default function ProductsPage() {
  const { user } = useAuth()
  const { selectedCompany } = useCompany()
  const searchParams = useSearchParams()
  const [products, setProducts] = useState<Product[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedBrand, setSelectedBrand] = useState<string>("all")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [stockFilter, setStockFilter] = useState<string>("all")

  useEffect(() => {
    // Check if user has warehouse access
    const hasWarehouseAccess =
      user?.role === "admin" ||
      user?.role === "supervisor" ||
      user?.departments?.name === "Almacén" ||
      user?.departments?.name === "Contabilidad" ||
      user?.departments?.name === "Operaciones" ||
      user?.departments?.name === "Acuerdos Marco" ||
      user?.departments?.name === "Administración"

    // For admin users, use selectedCompany; for others, use their assigned company
    const companyId = user?.role === "admin" ? selectedCompany?.id : user?.company_id

    if (companyId && hasWarehouseAccess) {
      fetchData(companyId)
    } else {
      setLoading(false)
    }
  }, [user, selectedCompany])

  useEffect(() => {
    // Aplicar filtro de URL si existe
    const filter = searchParams.get("filter")
    if (filter === "low-stock") {
      setStockFilter("low")
    }
  }, [searchParams])

  const fetchData = async (companyId: string) => {
    try {
      setLoading(true)

      // Obtener productos
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select(`
          id,
          name,
          description,
          code,
          barcode,
          unit_of_measure,
          minimum_stock,
          current_stock,
          cost_price,
          sale_price,
          location,
          is_active,
          brands!products_brand_id_fkey (id, name, color),
          product_categories!products_category_id_fkey (id, name, color)
        `)
        .eq("company_id", companyId)
        .order("name")

      if (productsError) {
        console.error("Products error:", productsError)
        throw productsError
      }

      // Obtener marcas
      const { data: brandsData, error: brandsError } = await supabase
        .from("brands")
        .select("id, name, color")
        .eq("company_id", companyId)
        .order("name")

      if (brandsError) throw brandsError

      // Obtener categorías
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("product_categories")
        .select("id, name, color")
        .eq("company_id", companyId)
        .order("name")

      if (categoriesError) throw categoriesError

      setProducts(productsData || [])
      setBrands(brandsData || [])
      setCategories(categoriesData || [])
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.barcode && product.barcode.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesBrand = selectedBrand === "all" || product.brands?.id === selectedBrand
    const matchesCategory = selectedCategory === "all" || product.product_categories?.id === selectedCategory

    const matchesStock =
      stockFilter === "all" ||
      (stockFilter === "low" && product.current_stock <= product.minimum_stock) ||
      (stockFilter === "out" && product.current_stock === 0) ||
      (stockFilter === "available" && product.current_stock > 0)

    return matchesSearch && matchesBrand && matchesCategory && matchesStock
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "PEN",
    }).format(amount)
  }

  const getStockStatus = (current: number, minimum: number) => {
    if (current === 0) return { label: "Sin stock", variant: "destructive" as const }
    if (current <= minimum) return { label: "Stock bajo", variant: "secondary" as const }
    return { label: "Disponible", variant: "default" as const }
  }

  // Check if user has warehouse access
  const hasWarehouseAccess =
    user?.role === "admin" ||
    user?.role === "supervisor" ||
    user?.departments?.name === "Almacén" ||
    user?.departments?.name === "Contabilidad" ||
    user?.departments?.name === "Operaciones" ||
    user?.departments?.name === "Acuerdos Marco" ||
    user?.departments?.name === "Administración"

  // Get the company to use
  const companyToUse = user?.role === "admin" ? selectedCompany : user?.company_id ? { id: user.company_id } : null

  if (!hasWarehouseAccess) {
    return (
      <div className="min-h-screen">
        <div className="space-y-6 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-700 via-slate-600 to-slate-500 dark:from-slate-200 dark:via-slate-100 dark:to-slate-200 bg-clip-text text-transparent">
                Productos
              </h1>
              <p className="text-slate-600 dark:text-slate-300">Gestión de productos del inventario</p>
            </div>
          </div>
          <Card className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-700/50 border-slate-200/60 dark:border-slate-700/60 shadow-lg">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 rounded-full flex items-center justify-center">
                  <AlertTriangle className="h-8 w-8 text-slate-500 dark:text-slate-300" />
                </div>
                <p className="text-slate-600 dark:text-slate-300">No tienes permisos para acceder a los productos.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!companyToUse) {
    return (
      <div className="min-h-screen">
        <div className="space-y-6 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-700 via-slate-600 to-slate-500 dark:from-slate-200 dark:via-slate-100 dark:to-slate-200 bg-clip-text text-transparent">
                Productos
              </h1>
              <p className="text-slate-600 dark:text-slate-300">Gestión de productos del inventario</p>
            </div>
          </div>
          <Card className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-700/50 border-slate-200/60 dark:border-slate-700/60 shadow-lg">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 rounded-full flex items-center justify-center">
                  <Package className="h-8 w-8 text-slate-500 dark:text-slate-300" />
                </div>
                <p className="text-slate-600 dark:text-slate-300">
                  {user?.role === "admin"
                    ? "Selecciona una empresa para ver sus productos."
                    : "No tienes una empresa asignada. Contacta al administrador."}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="space-y-6 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-700 via-slate-600 to-slate-500 dark:from-slate-200 dark:via-slate-100 dark:to-slate-200 bg-clip-text text-transparent">
                Productos
              </h1>
              <p className="text-slate-600 dark:text-slate-300">Gestión de productos del inventario</p>
            </div>
            <Button disabled className="bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Producto
            </Button>
          </div>
          <Card className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-700/50 border-slate-200/60 dark:border-slate-700/60 shadow-lg">
            <CardContent className="p-6">
              <div className="text-center text-slate-600 dark:text-slate-300">Cargando productos...</div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-700 via-slate-600 to-slate-500 dark:from-slate-200 dark:via-slate-100 dark:to-slate-200 bg-clip-text text-transparent">
              Productos
            </h1>
            <p className="text-slate-600 dark:text-slate-300">
              Gestión de productos del inventario
              {user?.role === "admin" && selectedCompany && (
                <span className="ml-2 text-slate-700 dark:text-slate-200 font-medium">- {selectedCompany.name}</span>
              )}
            </p>
          </div>
          <Button
            asChild
            className="bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 dark:from-slate-600 dark:to-slate-700 dark:hover:from-slate-700 dark:hover:to-slate-800 text-white"
          >
            <Link href="/warehouse/products/new">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Producto
            </Link>
          </Button>
        </div>

        <Card className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-700/50 border-slate-200/60 dark:border-slate-700/60 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
              <div className="w-6 h-6 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 rounded-md flex items-center justify-center">
                <Package className="h-4 w-4 text-slate-600 dark:text-slate-300" />
              </div>
              Lista de Productos
            </CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-300">
              {filteredProducts.length} de {products.length} productos
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Filtros */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500 h-4 w-4" />
                  <Input
                    placeholder="Buscar por nombre, código o código de barras..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 border-slate-300 dark:border-slate-600 focus:border-slate-500 dark:focus:border-slate-400 focus:ring-slate-500 dark:focus:ring-slate-400 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>
              <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                <SelectTrigger className="w-full sm:w-48 border-slate-300 dark:border-slate-600 focus:border-slate-500 dark:focus:border-slate-400 focus:ring-slate-500 dark:focus:ring-slate-400 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
                  <SelectValue placeholder="Todas las marcas" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                  <SelectItem value="all" className="text-slate-900 dark:text-slate-100">
                    Todas las marcas
                  </SelectItem>
                  {brands.map((brand) => (
                    <SelectItem key={brand.id} value={brand.id} className="text-slate-900 dark:text-slate-100">
                      {brand.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full sm:w-48 border-slate-300 dark:border-slate-600 focus:border-slate-500 dark:focus:border-slate-400 focus:ring-slate-500 dark:focus:ring-slate-400 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
                  <SelectValue placeholder="Todas las categorías" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                  <SelectItem value="all" className="text-slate-900 dark:text-slate-100">
                    Todas las categorías
                  </SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id} className="text-slate-900 dark:text-slate-100">
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={stockFilter} onValueChange={setStockFilter}>
                <SelectTrigger className="w-full sm:w-48 border-slate-300 dark:border-slate-600 focus:border-slate-500 dark:focus:border-slate-400 focus:ring-slate-500 dark:focus:ring-slate-400 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
                  <SelectValue placeholder="Estado del stock" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                  <SelectItem value="all" className="text-slate-900 dark:text-slate-100">
                    Todos los estados
                  </SelectItem>
                  <SelectItem value="available" className="text-slate-900 dark:text-slate-100">
                    Disponible
                  </SelectItem>
                  <SelectItem value="low" className="text-slate-900 dark:text-slate-100">
                    Stock bajo
                  </SelectItem>
                  <SelectItem value="out" className="text-slate-900 dark:text-slate-100">
                    Sin stock
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tabla de productos */}
            <div className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 border-slate-200 dark:border-slate-700">
                    <TableHead className="text-slate-700 dark:text-slate-200 font-semibold">Producto</TableHead>
                    <TableHead className="text-slate-700 dark:text-slate-200 font-semibold">Código</TableHead>
                    <TableHead className="text-slate-700 dark:text-slate-200 font-semibold">Marca/Categoría</TableHead>
                    <TableHead className="text-slate-700 dark:text-slate-200 font-semibold">Stock</TableHead>
                    <TableHead className="text-slate-700 dark:text-slate-200 font-semibold">Precios</TableHead>
                    <TableHead className="text-slate-700 dark:text-slate-200 font-semibold">Estado</TableHead>
                    <TableHead className="text-right text-slate-700 dark:text-slate-200 font-semibold">
                      Acciones
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.length > 0 ? (
                    filteredProducts.map((product) => {
                      const stockStatus = getStockStatus(product.current_stock, product.minimum_stock)
                      return (
                        <TableRow
                          key={product.id}
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 border-slate-200 dark:border-slate-700"
                        >
                          <TableCell>
                            <div>
                              <div className="font-medium text-slate-800 dark:text-slate-100">{product.name}</div>
                              {product.description && (
                                <div className="text-sm text-slate-500 dark:text-slate-400">{product.description}</div>
                              )}
                              {product.location && (
                                <div className="text-xs text-slate-500 dark:text-slate-400">📍 {product.location}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <Badge
                                variant="outline"
                                className="font-mono border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200"
                              >
                                {product.code}
                              </Badge>
                              {product.barcode && (
                                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{product.barcode}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {product.brands && (
                                <Badge
                                  variant="secondary"
                                  className="text-xs"
                                  style={{
                                    backgroundColor: `${product.brands.color}20`,
                                    color: product.brands.color,
                                  }}
                                >
                                  {product.brands.name}
                                </Badge>
                              )}
                              {product.product_categories && (
                                <Badge
                                  variant="outline"
                                  className="text-xs"
                                  style={{
                                    borderColor: product.product_categories.color,
                                    color: product.product_categories.color,
                                  }}
                                >
                                  {product.product_categories.name}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-right">
                              <div className="font-medium text-slate-800 dark:text-slate-100">
                                {product.current_stock} {product.unit_of_measure}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">
                                Mín: {product.minimum_stock}
                              </div>
                              {product.current_stock <= product.minimum_stock && (
                                <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400 text-xs mt-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  Stock bajo
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-right">
                              <div className="font-medium text-slate-800 dark:text-slate-100">
                                {formatCurrency(product.sale_price)}
                              </div>
                              <div className="text-xs text-green-600 dark:text-green-400">
                                Con IGV: {formatCurrency(product.sale_price * 1.18)}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">
                                Costo: {formatCurrency(product.cost_price)}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={stockStatus.variant}>{stockStatus.label}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                asChild
                                className="hover:bg-slate-100 dark:hover:bg-slate-700"
                              >
                                <Link href={`/warehouse/products/${product.id}`}>
                                  <Eye className="h-4 w-4" />
                                </Link>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                asChild
                                className="hover:bg-slate-100 dark:hover:bg-slate-700"
                              >
                                <Link href={`/warehouse/products/edit/${product.id}`}>
                                  <Edit className="h-4 w-4" />
                                </Link>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <div className="text-slate-500 dark:text-slate-400">
                          {products.length === 0
                            ? "No hay productos registrados"
                            : "No se encontraron productos con los filtros aplicados"}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
