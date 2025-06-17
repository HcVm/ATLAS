"use client"

import type React from "react"

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
  Building2,
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
  LineChart,
  Line,
  RadialBarChart,
  RadialBar,
} from "recharts"
import { useCompany } from "@/lib/company-context"

interface StatisticsData {
  documentsByDepartment: Array<{
    name: string
    value: number
    color: string
    company?: string
    fullName?: string
  }>
  documentsByStatus: Array<{ name: string; value: number; color: string }>
  documentsByMonth: Array<{ name: string; value: number; month: string }>
  movementsByDepartment: Array<{
    name: string
    value: number
    color: string
    company?: string
    fullName?: string
  }>
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

// Componente personalizado para tooltips modernos con animaciones
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg p-4 shadow-xl animate-in fade-in-0 zoom-in-95 duration-200">
        <p className="font-semibold text-foreground mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: entry.color }} />
            <p className="text-sm text-foreground">
              <span className="font-medium">{entry.name}:</span> {entry.value}
            </p>
          </div>
        ))}
      </div>
    )
  }
  return null
}

// Componente para tooltip de pie chart con información de empresa
const PieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg p-4 shadow-xl animate-in fade-in-0 zoom-in-95 duration-200">
        <p className="font-semibold text-foreground mb-2">{data.fullName || data.name}</p>
        {data.company && (
          <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
            <Building2 className="h-3 w-3" />
            <span>{data.company}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: data.color }} />
          <p className="text-sm text-foreground">
            <span className="font-medium">Documentos:</span> {data.value}
          </p>
        </div>
      </div>
    )
  }
  return null
}

// Gradientes mejorados para los gráficos
const renderGradients = () => (
  <defs>
    <linearGradient id="colorDocuments" x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.9} />
      <stop offset="95%" stopColor="#1E40AF" stopOpacity={0.1} />
    </linearGradient>
    <linearGradient id="colorMovements" x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%" stopColor="#10B981" stopOpacity={0.9} />
      <stop offset="95%" stopColor="#047857" stopOpacity={0.1} />
    </linearGradient>
    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.9} />
      <stop offset="100%" stopColor="#5B21B6" stopOpacity={0.3} />
    </linearGradient>
    <linearGradient id="pieGradient1" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stopColor="#FF6B6B" stopOpacity={0.8} />
      <stop offset="100%" stopColor="#FF8E8E" stopOpacity={0.6} />
    </linearGradient>
    <linearGradient id="pieGradient2" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stopColor="#4ECDC4" stopOpacity={0.8} />
      <stop offset="100%" stopColor="#6EDDD6" stopOpacity={0.6} />
    </linearGradient>
  </defs>
)

// Componente de animación para las cards
const AnimatedCard = ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => (
  <div className="animate-in slide-in-from-bottom-4 fade-in-0 duration-700" style={{ animationDelay: `${delay}ms` }}>
    {children}
  </div>
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

      // Obtener departamentos con información de empresa
      let departmentsQuery = supabase.from("departments").select(`
          id, name, color, company_id,
          companies (name)
        `)

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

      // Obtener movimientos de documentos con información de departamento y empresa
      let movements: any[] = []
      try {
        let movementsQuery = supabase.from("document_movements").select(`
          id, to_department_id, created_at, company_id,
          departments!document_movements_to_department_id_fkey (
            name, color,
            companies (name)
          )
        `)

        if (selectedCompany) {
          movementsQuery = movementsQuery.eq("company_id", selectedCompany.id)
        }

        const { data: movementsData, error: movError } = await movementsQuery
        if (movError) {
          console.warn("Error fetching movements (continuing without them):", movError)
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

      // Obtener movimientos de inventario
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

    // Colores modernos con gradientes
    const modernColors = [
      "#FF6B6B",
      "#4ECDC4",
      "#45B7D1",
      "#96CEB4",
      "#FFEAA7",
      "#DDA0DD",
      "#98D8C8",
      "#F7DC6F",
      "#BB8FCE",
      "#85C1E9",
    ]

    // Documentos por departamento con información de empresa
    const documentsByDepartment = departments
      .map((dept, index) => {
        const count = documents.filter((doc) => doc.current_department_id === dept.id).length
        const companyName = dept.companies?.name
        const displayName = selectedCompany ? dept.name : `${dept.name}`
        const fullName = selectedCompany ? dept.name : `${dept.name} (${companyName || "Sin empresa"})`

        return {
          name: displayName,
          fullName: fullName,
          value: count,
          color: dept.color || modernColors[index % modernColors.length],
          company: companyName,
        }
      })
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value)

    console.log("Documents by department:", documentsByDepartment)

    // Documentos por estado con colores mejorados
    const statusColors = {
      pending: "#FF9F43",
      in_progress: "#3B82F6",
      completed: "#00D68F",
      cancelled: "#FF5B5B",
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

    // Movimientos por departamento con información de empresa
    const movementsByDepartment = departments
      .map((dept, index) => {
        const count = movements.filter((mov) => mov.to_department_id === dept.id).length
        const companyName = dept.companies?.name
        const displayName = selectedCompany ? dept.name : `${dept.name}`
        const fullName = selectedCompany ? dept.name : `${dept.name} (${companyName || "Sin empresa"})`

        return {
          name: displayName,
          fullName: fullName,
          value: count,
          color: dept.color || modernColors[index % modernColors.length],
          company: companyName,
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
      entry: { name: "Entradas", value: 0, color: "#00D68F" },
      exit: { name: "Salidas", value: 0, color: "#FF5B5B" },
      adjustment: { name: "Ajustes", value: 0, color: "#FF9F43" },
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
      {/* Header con gradiente mejorado */}
      <AnimatedCard>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold flex items-center gap-3 bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-600 bg-clip-text text-transparent">
              <BarChart3 className="h-10 w-10 text-blue-600 animate-pulse" />
              Estadísticas Avanzadas
            </h1>
            <p className="text-muted-foreground mt-2">
              Análisis y métricas del sistema de documentos
              {selectedCompany ? ` - ${selectedCompany.name}` : " - Vista General"}
            </p>
          </div>
          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            variant="outline"
            className="gap-2 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 dark:hover:from-blue-950 dark:hover:to-purple-950 transition-all duration-300"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Actualizando..." : "Actualizar"}
          </Button>
        </div>
      </AnimatedCard>

      {/* Stats Cards Mejoradas con animaciones */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <AnimatedCard delay={100}>
          <Card className="relative overflow-hidden group hover:shadow-xl transition-all duration-500 hover:scale-105 border-0 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-blue-600/10"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
              <CardTitle className="text-sm font-medium">Total Documentos</CardTitle>
              <div className="p-3 bg-blue-500/20 rounded-xl group-hover:animate-bounce">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold text-blue-600 mb-1">{stats.totalStats.totalDocuments}</div>
              <p className="text-xs text-muted-foreground">Documentos en el sistema</p>
            </CardContent>
          </Card>
        </AnimatedCard>

        <AnimatedCard delay={200}>
          <Card className="relative overflow-hidden group hover:shadow-xl transition-all duration-500 hover:scale-105 border-0 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-green-600/10"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
              <CardTitle className="text-sm font-medium">Total Movimientos</CardTitle>
              <div className="p-3 bg-green-500/20 rounded-xl group-hover:animate-bounce">
                <ArrowRightLeft className="h-5 w-5 text-green-600" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold text-green-600 mb-1">{stats.totalStats.totalMovements}</div>
              <p className="text-xs text-muted-foreground">Movimientos registrados</p>
            </CardContent>
          </Card>
        </AnimatedCard>

        <AnimatedCard delay={300}>
          <Card className="relative overflow-hidden group hover:shadow-xl transition-all duration-500 hover:scale-105 border-0 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-purple-600/10"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
              <CardTitle className="text-sm font-medium">Departamentos</CardTitle>
              <div className="p-3 bg-purple-500/20 rounded-xl group-hover:animate-bounce">
                <PieChart className="h-5 w-5 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold text-purple-600 mb-1">{stats.totalStats.totalDepartments}</div>
              <p className="text-xs text-muted-foreground">Departamentos activos</p>
            </CardContent>
          </Card>
        </AnimatedCard>

        <AnimatedCard delay={400}>
          <Card className="relative overflow-hidden group hover:shadow-xl transition-all duration-500 hover:scale-105 border-0 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 to-orange-600/10"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
              <CardTitle className="text-sm font-medium">Usuarios</CardTitle>
              <div className="p-3 bg-orange-500/20 rounded-xl group-hover:animate-bounce">
                <Users className="h-5 w-5 text-orange-600" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold text-orange-600 mb-1">{stats.totalStats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">Usuarios registrados</p>
            </CardContent>
          </Card>
        </AnimatedCard>
      </div>

      {/* Warehouse Stats Cards con animaciones */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <AnimatedCard delay={500}>
          <Card className="relative overflow-hidden group hover:shadow-xl transition-all duration-500 hover:scale-105 border-0 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-emerald-600/10"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
              <CardTitle className="text-sm font-medium">Productos Activos</CardTitle>
              <div className="p-3 bg-emerald-500/20 rounded-xl group-hover:animate-bounce">
                <Package className="h-5 w-5 text-emerald-600" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold text-emerald-600 mb-1">
                {warehouseStats.inventoryValue.totalProducts}
              </div>
              <p className="text-xs text-muted-foreground">Productos en inventario</p>
            </CardContent>
          </Card>
        </AnimatedCard>

        <AnimatedCard delay={600}>
          <Card className="relative overflow-hidden group hover:shadow-xl transition-all duration-500 hover:scale-105 border-0 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/20 to-red-600/10"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
              <CardTitle className="text-sm font-medium">Stock Bajo</CardTitle>
              <div className="p-3 bg-red-500/20 rounded-xl group-hover:animate-pulse">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold text-red-600 mb-1">{warehouseStats.inventoryValue.lowStockCount}</div>
              <p className="text-xs text-muted-foreground">Productos con stock bajo</p>
            </CardContent>
          </Card>
        </AnimatedCard>

        <AnimatedCard delay={700}>
          <Card className="relative overflow-hidden group hover:shadow-xl transition-all duration-500 hover:scale-105 border-0 bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-950 dark:to-cyan-900">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-cyan-600/10"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
              <CardTitle className="text-sm font-medium">Valor Costo</CardTitle>
              <div className="p-3 bg-cyan-500/20 rounded-xl group-hover:animate-bounce">
                <DollarSign className="h-5 w-5 text-cyan-600" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-2xl font-bold text-cyan-600 mb-1">
                S/ {warehouseStats.inventoryValue.totalCostValue.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground">Valor total a costo</p>
            </CardContent>
          </Card>
        </AnimatedCard>

        <AnimatedCard delay={800}>
          <Card className="relative overflow-hidden group hover:shadow-xl transition-all duration-500 hover:scale-105 border-0 bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-950 dark:to-indigo-900">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-indigo-600/10"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
              <CardTitle className="text-sm font-medium">Valor Venta</CardTitle>
              <div className="p-3 bg-indigo-500/20 rounded-xl group-hover:animate-bounce">
                <TrendingUp className="h-5 w-5 text-indigo-600" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-2xl font-bold text-indigo-600 mb-1">
                S/ {warehouseStats.inventoryValue.totalSaleValue.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground">Valor total de venta</p>
            </CardContent>
          </Card>
        </AnimatedCard>
      </div>

      {/* Charts Grid Modernos con animaciones */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Documentos por Departamento - Mejorado */}
        <AnimatedCard delay={900}>
          <Card className="hover:shadow-2xl transition-all duration-500 border-0 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <PieChart className="h-6 w-6 text-blue-600" />
                </div>
                Documentos por Departamento
              </CardTitle>
              <CardDescription className="text-base">
                Distribución de documentos por departamento
                {!selectedCompany && " (con información de empresa)"}
              </CardDescription>
            </CardHeader>
            <CardContent className="h-96">
              {stats.documentsByDepartment.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    {renderGradients()}
                    <Pie
                      data={stats.documentsByDepartment}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={120}
                      innerRadius={40}
                      fill="#8884d8"
                      dataKey="value"
                      stroke="#fff"
                      strokeWidth={3}
                      animationBegin={0}
                      animationDuration={1500}
                    >
                      {stats.documentsByDepartment.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color}
                          className="hover:opacity-80 transition-opacity duration-300"
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      formatter={(value, entry) => <span className="text-sm font-medium">{value}</span>}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <PieChart className="h-16 w-16 mx-auto mb-4 opacity-50 animate-pulse" />
                    <p className="text-lg">No hay datos disponibles</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </AnimatedCard>

        {/* Documentos por Estado - Radial Bar Chart */}
        <AnimatedCard delay={1000}>
          <Card className="hover:shadow-2xl transition-all duration-500 border-0 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-green-600" />
                </div>
                Documentos por Estado
              </CardTitle>
              <CardDescription className="text-base">Distribución de documentos por estado actual</CardDescription>
            </CardHeader>
            <CardContent className="h-96">
              {stats.documentsByStatus.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart cx="50%" cy="50%" innerRadius="20%" outerRadius="80%" data={stats.documentsByStatus}>
                    {renderGradients()}
                    <RadialBar
                      dataKey="value"
                      cornerRadius={10}
                      fill="#8884d8"
                      animationBegin={0}
                      animationDuration={2000}
                    >
                      {stats.documentsByStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </RadialBar>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                  </RadialBarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-50 animate-pulse" />
                    <p className="text-lg">No hay datos disponibles</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </AnimatedCard>

        {/* Documentos por Mes - Line Chart con animación */}
        <AnimatedCard delay={1100}>
          <Card className="hover:shadow-2xl transition-all duration-500 border-0 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
                Tendencia de Documentos
              </CardTitle>
              <CardDescription className="text-base">Documentos creados en los últimos 6 meses</CardDescription>
            </CardHeader>
            <CardContent className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.documentsByMonth}>
                  {renderGradients()}
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" opacity={0.5} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#6b7280" axisLine={{ stroke: "#e0e7ff" }} />
                  <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" axisLine={{ stroke: "#e0e7ff" }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#8B5CF6"
                    strokeWidth={4}
                    dot={{ fill: "#8B5CF6", strokeWidth: 2, r: 6 }}
                    activeDot={{ r: 8, stroke: "#8B5CF6", strokeWidth: 2 }}
                    name="Documentos"
                    animationDuration={2000}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </AnimatedCard>

        {/* Movimientos por Departamento - Mejorado */}
        <AnimatedCard delay={1200}>
          <Card className="hover:shadow-2xl transition-all duration-500 border-0 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 bg-orange-500/20 rounded-lg">
                  <ArrowRightLeft className="h-6 w-6 text-orange-600" />
                </div>
                Movimientos por Departamento
              </CardTitle>
              <CardDescription className="text-base">
                Distribución de movimientos por departamento destino
                {!selectedCompany && " (con información de empresa)"}
              </CardDescription>
            </CardHeader>
            <CardContent className="h-96">
              {stats.movementsByDepartment.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.movementsByDepartment} layout="vertical">
                    {renderGradients()}
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" opacity={0.5} />
                    <XAxis type="number" tick={{ fontSize: 12 }} stroke="#6b7280" axisLine={{ stroke: "#e0e7ff" }} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={120}
                      tick={{ fontSize: 11 }}
                      stroke="#6b7280"
                      axisLine={{ stroke: "#e0e7ff" }}
                    />
                    <Tooltip content={<PieTooltip />} />
                    <Bar dataKey="value" name="Movimientos" radius={[0, 8, 8, 0]} animationDuration={1500}>
                      {stats.movementsByDepartment.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color}
                          className="hover:opacity-80 transition-opacity duration-300"
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <ArrowRightLeft className="h-16 w-16 mx-auto mb-4 opacity-50 animate-pulse" />
                    <p className="text-lg">No hay datos disponibles</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </AnimatedCard>
      </div>

      {/* Resto de los gráficos de warehouse... */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Products by Category */}
        <AnimatedCard delay={1300}>
          <Card className="hover:shadow-2xl transition-all duration-500 border-0 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 bg-emerald-500/20 rounded-lg">
                  <Package className="h-6 w-6 text-emerald-600" />
                </div>
                Productos por Categoría
              </CardTitle>
              <CardDescription className="text-base">Distribución de productos por categoría</CardDescription>
            </CardHeader>
            <CardContent className="h-96">
              {warehouseStats.productsByCategory.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={warehouseStats.productsByCategory}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={120}
                      innerRadius={40}
                      fill="#8884d8"
                      dataKey="value"
                      stroke="#fff"
                      strokeWidth={3}
                      animationBegin={0}
                      animationDuration={1500}
                    >
                      {warehouseStats.productsByCategory.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color}
                          className="hover:opacity-80 transition-opacity duration-300"
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                  </RechartsPieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <Package className="h-16 w-16 mx-auto mb-4 opacity-50 animate-pulse" />
                    <p className="text-lg">No hay datos disponibles</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </AnimatedCard>

        {/* Movements by Type */}
        <AnimatedCard delay={1400}>
          <Card className="hover:shadow-2xl transition-all duration-500 border-0 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <ArrowRightLeft className="h-6 w-6 text-blue-600" />
                </div>
                Movimientos por Tipo
              </CardTitle>
              <CardDescription className="text-base">Distribución de movimientos de inventario</CardDescription>
            </CardHeader>
            <CardContent className="h-96">
              {warehouseStats.movementsByType.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={warehouseStats.movementsByType}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={120}
                      innerRadius={40}
                      fill="#8884d8"
                      dataKey="value"
                      stroke="#fff"
                      strokeWidth={3}
                      animationBegin={0}
                      animationDuration={1500}
                    >
                      {warehouseStats.movementsByType.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color}
                          className="hover:opacity-80 transition-opacity duration-300"
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                  </RechartsPieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <ArrowRightLeft className="h-16 w-16 mx-auto mb-4 opacity-50 animate-pulse" />
                    <p className="text-lg">No hay datos disponibles</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </AnimatedCard>

        {/* Inventory Movements by Month */}
        <AnimatedCard delay={1500}>
          <Card className="hover:shadow-2xl transition-all duration-500 border-0 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Calendar className="h-6 w-6 text-purple-600" />
                </div>
                Movimientos por Mes
              </CardTitle>
              <CardDescription className="text-base">Movimientos de inventario en los últimos 6 meses</CardDescription>
            </CardHeader>
            <CardContent className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={warehouseStats.movementsByMonth}>
                  {renderGradients()}
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" opacity={0.5} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#6b7280" axisLine={{ stroke: "#e0e7ff" }} />
                  <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" axisLine={{ stroke: "#e0e7ff" }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar
                    dataKey="entries"
                    name="Entradas"
                    fill="#00D68F"
                    radius={[4, 4, 0, 0]}
                    animationDuration={1500}
                  />
                  <Bar dataKey="exits" name="Salidas" fill="#FF5B5B" radius={[4, 4, 0, 0]} animationDuration={1500} />
                  <Bar
                    dataKey="adjustments"
                    name="Ajustes"
                    fill="#FF9F43"
                    radius={[4, 4, 0, 0]}
                    animationDuration={1500}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </AnimatedCard>

        {/* Top Products by Movement */}
        <AnimatedCard delay={1600}>
          <Card className="hover:shadow-2xl transition-all duration-500 border-0 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 bg-orange-500/20 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-orange-600" />
                </div>
                Productos Más Movidos
              </CardTitle>
              <CardDescription className="text-base">Top 10 productos con más movimientos</CardDescription>
            </CardHeader>
            <CardContent className="h-96">
              {warehouseStats.topProducts.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={warehouseStats.topProducts} layout="vertical">
                    {renderGradients()}
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" opacity={0.5} />
                    <XAxis type="number" tick={{ fontSize: 12 }} stroke="#6b7280" axisLine={{ stroke: "#e0e7ff" }} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={140}
                      tick={{ fontSize: 11 }}
                      stroke="#6b7280"
                      axisLine={{ stroke: "#e0e7ff" }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                      dataKey="value"
                      name="Movimientos"
                      fill="url(#barGradient)"
                      radius={[0, 8, 8, 0]}
                      animationDuration={1500}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <TrendingUp className="h-16 w-16 mx-auto mb-4 opacity-50 animate-pulse" />
                    <p className="text-lg">No hay datos disponibles</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </AnimatedCard>
      </div>

      {/* Low Stock Alert mejorado */}
      {warehouseStats.lowStockProducts.length > 0 && (
        <AnimatedCard delay={1700}>
          <Card className="hover:shadow-2xl transition-all duration-500 border-0 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 border-red-200 dark:border-red-800">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-xl text-red-600">
                <div className="p-2 bg-red-500/20 rounded-lg animate-pulse">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                Productos con Stock Bajo
                <span className="text-sm bg-red-100 dark:bg-red-900 px-2 py-1 rounded-full">
                  {warehouseStats.lowStockProducts.length}
                </span>
              </CardTitle>
              <CardDescription className="text-base">Productos que requieren reposición urgente</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {warehouseStats.lowStockProducts.map((product, index) => (
                  <div
                    key={index}
                    className="p-4 border rounded-xl bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 hover:shadow-lg transition-all duration-300 hover:scale-105"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-sm text-red-900 dark:text-red-100">{product.name}</h4>
                      <span className="text-xs text-muted-foreground bg-white dark:bg-gray-800 px-2 py-1 rounded">
                        {product.code}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-red-600 font-medium">Stock: {product.current}</span>
                        <span className="text-muted-foreground">Mín: {product.minimum}</span>
                      </div>
                      <div className="text-xs text-red-600 font-bold bg-red-100 dark:bg-red-900/30 px-2 py-1 rounded">
                        ⚠️ Faltan: {product.difference} unidades
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </AnimatedCard>
      )}
    </div>
  )
}
