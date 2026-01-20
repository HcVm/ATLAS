"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Search, Edit, Eye, AlertTriangle, Package, Filter, RefreshCw, Archive, SlidersHorizontal } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { useCompany } from "@/lib/company-context"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import { Skeleton } from "@/components/ui/skeleton"
import { exportToExcel } from "@/lib/export-utils"
import { generateProductReportPDF } from "@/lib/product-report-generator"
import { FileDown, FileText, Table as TableIcon } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3 }
  }
}

export default function ProductsPage() {
  const { user } = useAuth()
  const { selectedCompany } = useCompany()
  const searchParams = useSearchParams()
  const [products, setProducts] = useState<Product[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedBrand, setSelectedBrand] = useState<string>("all")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [stockFilter, setStockFilter] = useState<string>("all")

  // Verificar si el usuario es del área de ventas (solo lectura)
  const isSalesUser =
    (user as any)?.departments?.name?.toLowerCase().includes("ventas") &&
    !(user as any)?.departments?.name?.toLowerCase().includes("jefatura") &&
    user?.role !== "admin" &&
    user?.role !== "supervisor"

  useEffect(() => {
    // Check if user has warehouse access
    const hasWarehouseAccess =
      user?.role === "admin" ||
      user?.role === "supervisor" ||
      ["Almacén", "Contabilidad", "Operaciones", "Acuerdos Marco", "Administración", "Ventas", "Gerencia Logística", "Jefatura de Ventas"].some(dept =>
        (user as any)?.departments?.name?.toLowerCase() === dept.toLowerCase()
      )

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

  const fetchData = async (companyId: string, isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true)
      else setLoading(true)

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

      if (productsError) throw productsError

      // Obtener marcas
      const { data: brandsData } = await supabase
        .from("brands")
        .select("id, name, color")
        .eq("company_id", companyId)
        .order("name")

      // Obtener categorías
      const { data: categoriesData } = await supabase
        .from("product_categories")
        .select("id, name, color")
        .eq("company_id", companyId)
        .order("name")

      setProducts(productsData || [])
      setBrands(brandsData || [])
      setCategories(categoriesData || [])

    } catch (error: any) {
      console.error("Error fetching data:", error)
      toast.error(error.message || "Error al cargar los datos")
    } finally {
      setLoading(false)
      setRefreshing(false)
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
    if (current === 0) return { label: "Sin stock", variant: "destructive" as const, color: "text-red-600 bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800" }
    if (current <= minimum) return { label: "Stock bajo", variant: "secondary" as const, color: "text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800" }
    return { label: "Disponible", variant: "default" as const, color: "text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800" }
  }

  const handleExportExcel = () => {
    const dataToExport = filteredProducts.map(product => ({
      "Nombre": product.name,
      "Código": product.code,
      "Código de Barras": product.barcode || "-",
      "Marca": product.brands?.name || "-",
      "Categoría": product.product_categories?.name || "-",
      "Unidad": product.unit_of_measure,
      "Stock Actual": product.current_stock,
      "Stock Mínimo": product.minimum_stock,
      "Ubicación": product.location || "-",
      "Precio Costo": product.cost_price,
      "Precio Venta": product.sale_price,
      "Estado": product.is_active ? "Activo" : "Inactivo"
    }))

    exportToExcel(dataToExport, {
      filename: `reporte-productos-${new Date().toISOString().split('T')[0]}`,
      sheetName: "Productos",
    })

    toast.success("Reporte Excel generado exitosamente")
  }

  const handleExportPDF = () => {
    // Preparar lista de productos
    const reportProducts = filteredProducts.map(p => ({
      ...p,
      brand: p.brands?.name || "",
      category: p.product_categories?.name || "",
    }))

    // Preparar nombre de marca/categoría para filtros
    // Si ID es "all", mostramos todos, si no buscamos el nombre
    let brandName = "Todas"
    if (selectedBrand !== "all") {
      brandName = brands.find(b => b.id === selectedBrand)?.name || selectedBrand
    }

    let categoryName = "Todas"
    if (selectedCategory !== "all") {
      categoryName = categories.find(c => c.id === selectedCategory)?.name || selectedCategory
    }

    generateProductReportPDF({
      companyName: selectedCompany?.name || "Empresa",
      generatedBy: user?.full_name || "Usuario",
      products: reportProducts,
      filters: {
        brand: brandName,
        category: categoryName,
        stockStatus: stockFilter,
        search: searchTerm
      }
    })

    toast.success("Reporte PDF generado exitosamente")
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-8 p-4 sm:p-6 lg:p-8 min-h-[calc(100vh-4rem)]"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-slate-900 via-slate-700 to-slate-600 dark:from-white dark:via-slate-200 dark:to-slate-400 bg-clip-text text-transparent flex items-center gap-3">
            <Package className="h-8 w-8 text-indigo-500" />
            Catálogo de Productos
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {isSalesUser ? "Consulta de disponibilidad y precios" : "Gestión maestra de inventario"}
            {user?.role === "admin" && selectedCompany && (
              <span className="ml-2 font-medium text-indigo-600 dark:text-indigo-400">- {selectedCompany.name}</span>
            )}
          </p>
        </div>
        <div className="flex gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="rounded-xl border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 gap-2"
              >
                <FileDown className="h-4 w-4 text-slate-500" />
                <span className="hidden sm:inline">Exportar</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportExcel} className="cursor-pointer">
                <TableIcon className="h-4 w-4 mr-2 text-indigo-500" />
                <span>Exportar a Excel</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPDF} className="cursor-pointer">
                <FileText className="h-4 w-4 mr-2 text-red-500" />
                <span>Exportar a PDF</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            onClick={() => {
              const companyId = user?.role === "admin" ? selectedCompany?.id : user?.company_id
              if (companyId) fetchData(companyId, true)
            }}
            disabled={refreshing}
            className="rounded-xl border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
          {!isSalesUser && (
            <Button
              asChild
              className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20"
            >
              <Link href="/warehouse/products/new">
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Producto
              </Link>
            </Button>
          )}
        </div>
      </motion.div>

      {isSalesUser && (
        <motion.div variants={itemVariants} className="p-4 bg-blue-50/80 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg">
            <Eye className="h-5 w-5 text-blue-600 dark:text-blue-300" />
          </div>
          <div>
            <h4 className="font-semibold text-blue-700 dark:text-blue-300 text-sm">Modo Consulta</h4>
            <p className="text-xs text-blue-600 dark:text-blue-400">Visualización de stock y precios en tiempo real</p>
          </div>
        </motion.div>
      )}

      <motion.div variants={itemVariants}>
        <Card className="border-none shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-md overflow-hidden rounded-2xl">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
              <div className="relative w-full lg:max-w-md group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <Input
                  placeholder="Buscar por nombre, código o código de barras..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-11 rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
              </div>

              <div className="flex flex-wrap gap-2 w-full lg:w-auto">
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  <Filter className="h-4 w-4 text-slate-500" />
                  <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                    <SelectTrigger className="w-[140px] border-none bg-transparent h-8 p-0 focus:ring-0">
                      <SelectValue placeholder="Marca" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las marcas</SelectItem>
                      {brands.map((brand) => (
                        <SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  <Archive className="h-4 w-4 text-slate-500" />
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-[140px] border-none bg-transparent h-8 p-0 focus:ring-0">
                      <SelectValue placeholder="Categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las categorías</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  <SlidersHorizontal className="h-4 w-4 text-slate-500" />
                  <Select value={stockFilter} onValueChange={setStockFilter}>
                    <SelectTrigger className="w-[140px] border-none bg-transparent h-8 p-0 focus:ring-0">
                      <SelectValue placeholder="Estado Stock" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los estados</SelectItem>
                      <SelectItem value="available">Disponible</SelectItem>
                      <SelectItem value="low">Stock bajo</SelectItem>
                      <SelectItem value="out">Sin stock</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded-lg" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-3 w-1/4" />
                    </div>
                    <Skeleton className="h-8 w-24 rounded-full" />
                  </div>
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-full mb-4">
                  <Search className="h-10 w-10 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">No se encontraron productos</h3>
                <p className="text-slate-500 max-w-sm mt-1">
                  Prueba ajustando los filtros o buscando con otros términos.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50/50 dark:bg-slate-800/50">
                    <TableRow className="hover:bg-transparent border-slate-100 dark:border-slate-800">
                      <TableHead className="pl-6 font-semibold text-slate-700 dark:text-slate-200">Producto</TableHead>
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-200">Clasificación</TableHead>
                      <TableHead className="text-right font-semibold text-slate-700 dark:text-slate-200">Stock</TableHead>
                      <TableHead className="text-right font-semibold text-slate-700 dark:text-slate-200">Precio Venta</TableHead>
                      <TableHead className="text-center font-semibold text-slate-700 dark:text-slate-200">Estado</TableHead>
                      <TableHead className="text-right pr-6 font-semibold text-slate-700 dark:text-slate-200">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence>
                      {filteredProducts.map((product, index) => {
                        const stockStatus = getStockStatus(product.current_stock, product.minimum_stock)
                        return (
                          <motion.tr
                            key={product.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.03 }}
                            className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 last:border-0"
                          >
                            <TableCell className="pl-6 py-4">
                              <div className="flex items-start gap-3">
                                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-600 dark:text-indigo-400 mt-1">
                                  <Package className="h-4 w-4" />
                                </div>
                                <div>
                                  <div className="font-semibold text-slate-800 dark:text-slate-100">{product.name}</div>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="outline" className="font-mono text-[10px] h-5 border-slate-200 dark:border-slate-700 text-slate-500">
                                      {product.code}
                                    </Badge>
                                    {product.location && (
                                      <span className="text-xs text-slate-500 flex items-center gap-1">
                                        📍 {product.location}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="py-4">
                              <div className="flex flex-col gap-1.5">
                                {product.brands && (
                                  <Badge
                                    variant="secondary"
                                    className="w-fit text-[10px] font-normal"
                                    style={{
                                      backgroundColor: `${product.brands.color}15`,
                                      color: product.brands.color,
                                      border: `1px solid ${product.brands.color}30`
                                    }}
                                  >
                                    {product.brands.name}
                                  </Badge>
                                )}
                                {product.product_categories && (
                                  <span className="text-xs text-slate-500">
                                    {product.product_categories.name}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right py-4">
                              <div className="flex flex-col items-end">
                                <span className="font-bold text-slate-700 dark:text-slate-200">
                                  {product.current_stock}
                                </span>
                                <span className="text-xs text-slate-500 lowercase">{product.unit_of_measure}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right py-4">
                              <div className="flex flex-col items-end">
                                <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                                  {formatCurrency(product.sale_price)}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  + IGV: {formatCurrency(product.sale_price * 1.18)}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center py-4">
                              <div className="flex justify-center">
                                <Badge className={`border-none ${stockStatus.color}`}>
                                  {stockStatus.label}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell className="text-right pr-6 py-4">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  asChild
                                  className="h-8 w-8 rounded-full hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-900/20 dark:hover:text-indigo-400 transition-colors"
                                >
                                  <Link href={`/warehouse/products/${product.id}`}>
                                    <Eye className="h-4 w-4" />
                                  </Link>
                                </Button>
                                {!isSalesUser && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    asChild
                                    className="h-8 w-8 rounded-full hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-orange-900/20 dark:hover:text-orange-400 transition-colors"
                                  >
                                    <Link href={`/warehouse/products/edit/${product.id}`}>
                                      <Edit className="h-4 w-4" />
                                    </Link>
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </motion.tr>
                        )
                      })}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
