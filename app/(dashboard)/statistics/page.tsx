"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  RefreshCw,
  TrendingUp,
  BarChart3,
  PieChart,
  Calendar,
  Users,
  FileText,
  ArrowRightLeft,
  Package,
  AlertTriangle,
  DollarSign,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend,
  Area,
  AreaChart,
} from "recharts"
import { useCompany } from "@/lib/company-context"

interface StatisticsData {
  documentsByDepartment: Array<{ name: string; value: number; color: string }>
  documentsByStatus: Array<{ name: string; value: number; color: string }>
  documentsByMonth: Array<{ name: string; value: number; month: string }>
  movementsByDepartment: Array<{ name: string; value: number; color: string }>
  totalStats: {
    totalDocuments: number
    totalMovements: number
    totalDepartments: number
    totalUsers: number
  }
  recentActivity: Array<{
    date: string
    documents: number
    movements: number
  }>
}

interface WarehouseStats {
  productsByCategory: Array<{ name: string; value: number; color: string }>
  productsByBrand: Array<{ name: string; value: number; color: string }>
  lowStockProducts: Array<{ name: string; code: string; current: number; minimum: number; difference: number }>
  inventoryValue: {
    totalCostValue: number
    totalSaleValue: number
    totalProducts: number
    lowStockCount: number
  }
  movementsByType: Array<{ name: string; value: number; color: string }>
  movementsByMonth: Array<{
    name: string
    month: string
    year: number
    entries: number
    exits: number
    adjustments: number
  }>
  topProducts: Array<{ name: string; value: number }>
}

// Componente personalizado para tooltips modernos
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-lg">
        <p className="font-medium text-foreground">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {`${entry.name}: ${entry.value}`}
          </p>
        ))}
      </div>
    )
  }
  return null
}

// Gradientes para los gráficos
const renderGradients = () => (
  <defs>
    <linearGradient id="colorDocuments" x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
      <stop offset="95%" stopColor="#1E40AF" stopOpacity={0.2} />
    </linearGradient>
    <linearGradient id="colorMovements" x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%" stopColor="#10B981" stopOpacity={0.8} />
      <stop offset="95%" stopColor="#047857" stopOpacity={0.2} />
    </linearGradient>
    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.8} />
      <stop offset="100%" stopColor="#5B21B6" stopOpacity={0.6} />
    </linearGradient>
  </defs>
)

export default function StatisticsPage() {
  const { user } = useAuth()
  const { selectedCompany } = useCompany()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [stats, setStats] = useState<StatisticsData>({
    documentsByDepartment: [],
    documentsByStatus: [],
    documentsByMonth: [],
    movementsByDepartment: [],
    totalStats: {
      totalDocuments: 0,
      totalMovements: 0,
      totalDepartments: 0,
      totalUsers: 0,
    },
    recentActivity: [],
  })

  const [warehouseStats, setWarehouseStats] = useState<WarehouseStats>({
    productsByCategory: [],
    productsByBrand: [],
    lowStockProducts: [],
    inventoryValue: {
      totalCostValue: 0,
      totalSaleValue: 0,
      totalProducts: 0,
      lowStockCount: 0,
    },
    movementsByType: [],
    movementsByMonth: [],
    topProducts: [],
  })

  useEffect(() => {
    if (user) {
      fetchStatistics()
    }
  }, [user, selectedCompany])

  const fetchStatistics = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    try {
      console.log("=== DEBUGGING STATISTICS ===")
      console.log("User:", user?.email, "Role:", user?.role)
      console.log("Selected Company:", selectedCompany?.name || "General Mode", "ID:", selectedCompany?.id)

      // Obtener departamentos con colores (filtrados por empresa si aplica)
      let departmentsQuery = supabase.from("departments").select("id, name, color, company_id")
      if (selectedCompany) {
        departmentsQuery = departmentsQuery.eq("company_id", selectedCompany.id)
      }
      const { data: departments, error: deptError } = await departmentsQuery
      if (deptError) {
        console.error("Error fetching departments:", deptError)
        throw deptError
      }
      console.log("Departments found:", departments?.length || 0)

      // Obtener documentos con información completa
      let documentsQuery = supabase.from("documents").select(`
        id, current_department_id, status, created_at, company_id, created_by
      `)

      // Aplicar filtros de empresa
      if (selectedCompany) {
        documentsQuery = documentsQuery.eq("company_id", selectedCompany.id)
      }

      // Aplicar filtros de permisos de usuario DESPUÉS del filtro de empresa
      if (user?.role === "user") {
        documentsQuery = documentsQuery.or(`created_by.eq.${user.id},current_department_id.eq.${user.department_id}`)
      }

      const { data: documents, error: docsError } = await documentsQuery
      if (docsError) {
        console.error("Error fetching documents:", docsError)
        throw docsError
      }
      console.log("Documents found:", documents?.length || 0)

      // Obtener movimientos de documentos (con manejo de errores)
      let movements: any[] = []
      try {
        let movementsQuery = supabase.from("document_movements").select(`
          id, to_department_id, created_at, company_id,
          departments!document_movements_to_department_id_fkey (name, color)
        `)

        if (selectedCompany) {
          movementsQuery = movementsQuery.eq("company_id", selectedCompany.id)
        }

        const { data: movementsData, error: movError } = await movementsQuery
        if (movError) {
          console.warn("Error fetching movements (continuing without them):", movError)
          // Continue without movements data
        } else {
          movements = movementsData || []
        }
      } catch (error) {
        console.warn("Failed to fetch document movements, continuing without them:", error)
      }
      console.log("Document movements found:", movements.length)

      // Obtener totales de usuarios
      let usersCountQuery = supabase.from("profiles").select("*", { count: "exact", head: true })
      if (selectedCompany) {
        usersCountQuery = usersCountQuery.eq("company_id", selectedCompany.id)
      }
      const { count: totalUsers } = await usersCountQuery
      console.log("Users found:", totalUsers || 0)

      // Obtener productos
      let productsQuery = supabase
        .from("products")
        .select(`
        id, name, code, current_stock, minimum_stock, cost_price, sale_price, company_id,
        brands (name, color),
        product_categories (name, color)
      `)
        .eq("is_active", true)

      if (selectedCompany) {
        productsQuery = productsQuery.eq("company_id", selectedCompany.id)
      }

      const { data: products, error: productsError } = await productsQuery
      if (productsError) {
        console.error("Error fetching products:", productsError)
        throw productsError
      }
      console.log("Products found:", products?.length || 0)

      // Obtener movimientos de inventario (con manejo de errores)
      let inventoryMovements: any[] = []
      try {
        let inventoryMovementsQuery = supabase
          .from("inventory_movements")
          .select(`
          id, movement_type, quantity, total_amount, movement_date, created_at, company_id,
          products (name, code)
        `)
          .order("created_at", { ascending: false })
          .limit(1000)

        if (selectedCompany) {
          inventoryMovementsQuery = inventoryMovementsQuery.eq("company_id", selectedCompany.id)
        }

        const { data: inventoryMovementsData, error: movementsError } = await inventoryMovementsQuery
        if (movementsError) {
          console.warn("Error fetching inventory movements (continuing without them):", movementsError)
          // Continue without inventory movements data
        } else {
          inventoryMovements = inventoryMovementsData || []
        }
      } catch (error) {
        console.warn("Failed to fetch inventory movements, continuing without them:", error)
      }
      console.log("Inventory movements found:", inventoryMovements.length)

      console.log("=== PROCESSING STATISTICS ===")

      // Procesar estadísticas
      const processedStats = processStatistics(documents || [], movements, departments || [], totalUsers || 0)
      console.log("Processed document stats:", processedStats.totalStats)
      setStats(processedStats)

      const warehouseProcessed = processWarehouseStatistics(products || [], inventoryMovements)
      console.log("Processed warehouse stats:", warehouseProcessed.inventoryValue)
      setWarehouseStats(warehouseProcessed)

      console.log("=== STATISTICS COMPLETE ===")
    } catch (error) {
      console.error("Error fetching statistics:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const processStatistics = (
    documents: any[],
    movements: any[],
    departments: any[],
    totalUsers: number,
  ): StatisticsData => {
    console.log("Processing statistics with:", {
      documents: documents.length,
      movements: movements.length,
      departments: departments.length,
      users: totalUsers,
    })

    // Documentos por departamento con colores modernos
    const modernColors = ["#3B82F6", "#8B5CF6", "#10B981", "#F59E0B", "#EC4899", "#06B6D4", "#84CC16", "#EF4444"]

    const documentsByDepartment = departments
      .map((dept, index) => {
        const count = documents.filter((doc) => doc.current_department_id === dept.id).length
        return {
          name: dept.name,
          value: count,
          color: dept.color || modernColors[index % modernColors.length],
        }
      })
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value)

    console.log("Documents by department:", documentsByDepartment)

    // Documentos por estado con gradientes
    const statusColors = {
      pending: "#F59E0B",
      in_progress: "#3B82F6",
      completed: "#10B981",
      cancelled: "#EF4444",
    }

    const statusLabels = {
      pending: "Pendiente",
      in_progress: "En Progreso",
      completed: "Completado",
      cancelled: "Cancelado",
    }

    const statusCounts = {
      pending: 0,
      in_progress: 0,
      completed: 0,
      cancelled: 0,
    }

    documents.forEach((doc) => {
      if (statusCounts[doc.status as keyof typeof statusCounts] !== undefined) {
        statusCounts[doc.status as keyof typeof statusCounts]++
      }
    })

    const documentsByStatus = Object.entries(statusCounts)
      .map(([status, count]) => ({
        name: statusLabels[status as keyof typeof statusLabels],
        value: count,
        color: statusColors[status as keyof typeof statusColors],
      }))
      .filter((item) => item.value > 0)

    console.log("Documents by status:", documentsByStatus)

    // Documentos por mes (últimos 6 meses)
    const now = new Date()
    const months = []
    for (let i = 5; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push({
        name: month.toLocaleDateString("es-ES", { month: "short", year: "2-digit" }),
        month: month.getMonth(),
        year: month.getFullYear(),
        fullName: month.toLocaleDateString("es-ES", { month: "long", year: "numeric" }),
      })
    }

    const documentsByMonth = months.map((monthData) => {
      const count = documents.filter((doc) => {
        const docDate = new Date(doc.created_at)
        return docDate.getMonth() === monthData.month && docDate.getFullYear() === monthData.year
      }).length
      return {
        name: monthData.name,
        value: count,
        month: monthData.fullName,
      }
    })

    // Movimientos por departamento
    const movementsByDepartment = departments
      .map((dept, index) => {
        const count = movements.filter((mov) => mov.to_department_id === dept.id).length
        return {
          name: dept.name,
          value: count,
          color: dept.color || modernColors[index % modernColors.length],
        }
      })
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value)

    // Actividad reciente (últimos 7 días)
    const recentActivity = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split("T")[0]

      const docsCount = documents.filter((doc) => doc.created_at.startsWith(dateStr)).length
      const movCount = movements.filter((mov) => mov.created_at.startsWith(dateStr)).length

      recentActivity.push({
        date: date.toLocaleDateString("es-ES", { weekday: "short", day: "numeric" }),
        documents: docsCount,
        movements: movCount,
      })
    }

    const result = {
      documentsByDepartment,
      documentsByStatus,
      documentsByMonth,
      movementsByDepartment,
      totalStats: {
        totalDocuments: documents.length,
        totalMovements: movements.length,
        totalDepartments: departments.length,
        totalUsers,
      },
      recentActivity,
    }

    console.log("Final processed stats:", result.totalStats)
    return result
  }

  const processWarehouseStatistics = (products: any[], movements: any[]) => {
    console.log("Processing warehouse statistics with:", {
      products: products.length,
      movements: movements.length,
    })

    // Process products by category
    const categoryStats = {}
    const brandStats = {}
    let totalCostValue = 0
    let totalSaleValue = 0
    let lowStockCount = 0
    const lowStockProducts = []

    products.forEach((product) => {
      // Category stats
      const categoryName = product.product_categories?.name || "Sin Categoría"
      if (!categoryStats[categoryName]) {
        categoryStats[categoryName] = {
          name: categoryName,
          value: 0,
          color: product.product_categories?.color || "#6B7280",
        }
      }
      categoryStats[categoryName].value++

      // Brand stats
      const brandName = product.brands?.name || "Sin Marca"
      if (!brandStats[brandName]) {
        brandStats[brandName] = {
          name: brandName,
          value: 0,
          color: product.brands?.color || "#6B7280",
        }
      }
      brandStats[brandName].value++

      // Value calculations
      totalCostValue += (product.current_stock || 0) * (product.cost_price || 0)
      totalSaleValue += (product.current_stock || 0) * (product.sale_price || 0)

      // Low stock check
      if (product.current_stock <= product.minimum_stock) {
        lowStockCount++
        lowStockProducts.push({
          name: product.name,
          code: product.code,
          current: product.current_stock,
          minimum: product.minimum_stock,
          difference: product.minimum_stock - product.current_stock,
        })
      }
    })

    // Process movements by type
    const movementTypes = {
      entry: { name: "Entradas", value: 0, color: "#10B981" },
      exit: { name: "Salidas", value: 0, color: "#EF4444" },
      adjustment: { name: "Ajustes", value: 0, color: "#F59E0B" },
      transfer: { name: "Transferencias", value: 0, color: "#8B5CF6" },
    }

    movements.forEach((movement) => {
      if (movementTypes[movement.movement_type]) {
        movementTypes[movement.movement_type].value++
      }
    })

    // Process movements by month (last 6 months)
    const now = new Date()
    const months = []
    for (let i = 5; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push({
        name: month.toLocaleDateString("es-ES", { month: "short", year: "2-digit" }),
        month: month.getMonth(),
        year: month.getFullYear(),
        entries: 0,
        exits: 0,
        adjustments: 0,
      })
    }

    movements.forEach((movement) => {
      const movDate = new Date(movement.movement_date || movement.created_at)
      const monthData = months.find((m) => m.month === movDate.getMonth() && m.year === movDate.getFullYear())
      if (monthData) {
        if (movement.movement_type === "entry") monthData.entries++
        else if (movement.movement_type === "exit") monthData.exits++
        else if (movement.movement_type === "adjustment") monthData.adjustments++
      }
    })

    // Top products by movement frequency
    const productMovements = {}
    movements.forEach((movement) => {
      const productName = movement.products?.name || "Producto Desconocido"
      if (!productMovements[productName]) {
        productMovements[productName] = 0
      }
      productMovements[productName]++
    })

    const topProducts = Object.entries(productMovements)
      .map(([name, count]) => ({ name, value: count }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)

    const result = {
      productsByCategory: Object.values(categoryStats).filter((item) => item.value > 0),
      productsByBrand: Object.values(brandStats).filter((item) => item.value > 0),
      lowStockProducts: lowStockProducts.sort((a, b) => b.difference - a.difference).slice(0, 10),
      inventoryValue: {
        totalCostValue,
        totalSaleValue,
        totalProducts: products.length,
        lowStockCount,
      },
      movementsByType: Object.values(movementTypes).filter((item) => item.value > 0),
      movementsByMonth: months,
      topProducts,
    }

    console.log("Final warehouse stats:", result.inventoryValue)
    return result
  }

  const handleRefresh = () => {
    fetchStatistics(true)
  }

  if (!user) {
    return <div>Cargando...</div>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando estadísticas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header con gradiente */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            <BarChart3 className="h-8 w-8 text-blue-600" />
            Estadísticas
          </h1>
          <p className="text-muted-foreground">
            Análisis y métricas del sistema de documentos
            {selectedCompany ? ` - ${selectedCompany.name}` : " - Vista General"}
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={refreshing}
          variant="outline"
          className="gap-2 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 dark:hover:from-blue-950 dark:hover:to-purple-950"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Actualizando..." : "Actualizar"}
        </Button>
      </div>

      {/* Stats Cards Mejoradas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-blue-600/5"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-medium">Total Documentos</CardTitle>
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <FileText className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold text-blue-600">{stats.totalStats.totalDocuments}</div>
            <p className="text-xs text-muted-foreground">Documentos en el sistema</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-green-600/5"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-medium">Total Movimientos</CardTitle>
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <ArrowRightLeft className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold text-green-600">{stats.totalStats.totalMovements}</div>
            <p className="text-xs text-muted-foreground">Movimientos registrados</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-purple-600/5"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-medium">Departamentos</CardTitle>
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <PieChart className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold text-purple-600">{stats.totalStats.totalDepartments}</div>
            <p className="text-xs text-muted-foreground">Departamentos activos</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-orange-600/5"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-medium">Usuarios</CardTitle>
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <Users className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold text-orange-600">{stats.totalStats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">Usuarios registrados</p>
          </CardContent>
        </Card>
      </div>

      {/* Warehouse Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-medium">Productos Activos</CardTitle>
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <Package className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold text-emerald-600">{warehouseStats.inventoryValue.totalProducts}</div>
            <p className="text-xs text-muted-foreground">Productos en inventario</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-red-600/5"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-medium">Stock Bajo</CardTitle>
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold text-red-600">{warehouseStats.inventoryValue.lowStockCount}</div>
            <p className="text-xs text-muted-foreground">Productos con stock bajo</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-cyan-600/5"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-medium">Valor Costo</CardTitle>
            <div className="p-2 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg">
              <DollarSign className="h-4 w-4 text-cyan-600" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold text-cyan-600">
              S/ {warehouseStats.inventoryValue.totalCostValue.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">Valor total a costo</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-indigo-600/5"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-medium">Valor Venta</CardTitle>
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <TrendingUp className="h-4 w-4 text-indigo-600" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold text-indigo-600">
              S/ {warehouseStats.inventoryValue.totalSaleValue.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">Valor total de venta</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid Modernos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Documentos por Departamento */}
        <Card className="hover:shadow-lg transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-blue-600" />
              Documentos por Departamento
            </CardTitle>
            <CardDescription>Distribución de documentos por departamento</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {stats.documentsByDepartment.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={stats.documentsByDepartment}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={90}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    stroke="#fff"
                    strokeWidth={2}
                  >
                    {stats.documentsByDepartment.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                </RechartsPieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <PieChart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No hay datos disponibles</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Documentos por Estado */}
        <Card className="hover:shadow-lg transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-green-600" />
              Documentos por Estado
            </CardTitle>
            <CardDescription>Distribución de documentos por estado</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {stats.documentsByStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={stats.documentsByStatus}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={90}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    stroke="#fff"
                    strokeWidth={2}
                  >
                    {stats.documentsByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                </RechartsPieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No hay datos disponibles</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Documentos por Mes */}
        <Card className="hover:shadow-lg transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              Documentos por Mes
            </CardTitle>
            <CardDescription>Documentos creados en los últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.documentsByMonth}>
                {renderGradients()}
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#6b7280" />
                <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#3B82F6"
                  strokeWidth={3}
                  fill="url(#colorDocuments)"
                  name="Documentos"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Movimientos por Departamento */}
        <Card className="hover:shadow-lg transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-orange-600" />
              Movimientos por Departamento
            </CardTitle>
            <CardDescription>Distribución de movimientos por departamento destino</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {stats.movementsByDepartment.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.movementsByDepartment} layout="vertical">
                  {renderGradients()}
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                  <XAxis type="number" tick={{ fontSize: 12 }} stroke="#6b7280" />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} stroke="#6b7280" />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Movimientos" radius={[0, 4, 4, 0]} fill="url(#barGradient)">
                    {stats.movementsByDepartment.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <ArrowRightLeft className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No hay datos disponibles</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Warehouse Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Products by Category */}
        <Card className="hover:shadow-lg transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-emerald-600" />
              Productos por Categoría
            </CardTitle>
            <CardDescription>Distribución de productos por categoría</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {warehouseStats.productsByCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={warehouseStats.productsByCategory}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={90}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    stroke="#fff"
                    strokeWidth={2}
                  >
                    {warehouseStats.productsByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                </RechartsPieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No hay datos disponibles</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Movements by Type */}
        <Card className="hover:shadow-lg transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-blue-600" />
              Movimientos por Tipo
            </CardTitle>
            <CardDescription>Distribución de movimientos de inventario</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {warehouseStats.movementsByType.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={warehouseStats.movementsByType}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={90}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    stroke="#fff"
                    strokeWidth={2}
                  >
                    {warehouseStats.movementsByType.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                </RechartsPieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <ArrowRightLeft className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No hay datos disponibles</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Inventory Movements by Month */}
        <Card className="hover:shadow-lg transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-600" />
              Movimientos por Mes
            </CardTitle>
            <CardDescription>Movimientos de inventario en los últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={warehouseStats.movementsByMonth}>
                {renderGradients()}
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#6b7280" />
                <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="entries" name="Entradas" fill="#10B981" radius={[2, 2, 0, 0]} />
                <Bar dataKey="exits" name="Salidas" fill="#EF4444" radius={[2, 2, 0, 0]} />
                <Bar dataKey="adjustments" name="Ajustes" fill="#F59E0B" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Products by Movement */}
        <Card className="hover:shadow-lg transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-orange-600" />
              Productos Más Movidos
            </CardTitle>
            <CardDescription>Top 10 productos con más movimientos</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {warehouseStats.topProducts.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={warehouseStats.topProducts} layout="vertical">
                  {renderGradients()}
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                  <XAxis type="number" tick={{ fontSize: 12 }} stroke="#6b7280" />
                  <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} stroke="#6b7280" />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Movimientos" radius={[0, 4, 4, 0]} fill="url(#barGradient)" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No hay datos disponibles</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alert */}
      {warehouseStats.lowStockProducts.length > 0 && (
        <Card className="hover:shadow-lg transition-shadow duration-300 border-red-200 dark:border-red-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Productos con Stock Bajo
            </CardTitle>
            <CardDescription>Productos que requieren reposición urgente</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {warehouseStats.lowStockProducts.map((product, index) => (
                <div
                  key={index}
                  className="p-4 border rounded-lg bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-sm">{product.name}</h4>
                    <span className="text-xs text-muted-foreground">{product.code}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-red-600">Stock: {product.current}</span>
                    <span className="text-muted-foreground">Mín: {product.minimum}</span>
                  </div>
                  <div className="mt-1 text-xs text-red-600 font-medium">Faltan: {product.difference} unidades</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
