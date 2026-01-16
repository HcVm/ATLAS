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
  Activity,
  Layers
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
    <filter id="dropshadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="3" floodOpacity="0.1" />
    </filter>
  </defs>
)

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/60 dark:border-slate-800/60 rounded-xl p-4 shadow-2xl">
        <div className="space-y-2">
          <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: entry.color || entry.fill }} />
              <p className="text-sm text-slate-600 dark:text-slate-400">
                <span className="font-medium">{entry.name}:</span>
                <span className="ml-1 font-bold text-slate-900 dark:text-slate-100">
                  {typeof entry.value === "number" && entry.name?.toLowerCase().includes("valor")
                    ? `S/ ${entry.value.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`
                    : entry.value}
                </span>
              </p>
            </div>
          ))}
        </div>
      </div>
    )
  }
  return null
}

const DepartmentTooltip = ({ active, payload }: any) => {
  const { selectedCompany } = useCompany()
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/60 dark:border-slate-800/60 rounded-xl p-4 shadow-2xl">
        <div className="space-y-2">
          <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{data.fullName || data.name}</p>
          {data.company && !selectedCompany && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <span>Empresa: {data.company}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: data.color }} />
            <p className="text-sm text-slate-600 dark:text-slate-400">
              <span className="font-medium">Documentos:</span>
              <span className="ml-1 font-bold text-slate-900 dark:text-slate-100">{data.value}</span>
            </p>
          </div>
        </div>
      </div>
    )
  }
  return null
}

const MovementTooltip = ({ active, payload }: any) => {
  const { selectedCompany } = useCompany()
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/60 dark:border-slate-800/60 rounded-xl p-4 shadow-2xl">
        <div className="space-y-2">
          <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{data.fullName || data.name}</p>
          {data.company && !selectedCompany && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <div className="w-2 h-2 rounded-full bg-orange-500"></div>
              <span>Empresa: {data.company}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: data.color }} />
            <p className="text-sm text-slate-600 dark:text-slate-400">
              <span className="font-medium">Movimientos:</span>
              <span className="ml-1 font-bold text-slate-900 dark:text-slate-100">{data.value}</span>
            </p>
          </div>
        </div>
      </div>
    )
  }
  return null
}

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
      let departmentsQuery = supabase.from("departments").select(`
        id, name, color, company_id,
        companies!departments_company_id_fkey (name)
      `)
      if (selectedCompany) {
        departmentsQuery = departmentsQuery.eq("company_id", selectedCompany.id)
      }
      const { data: departments } = await departmentsQuery

      let documentsQuery = supabase.from("documents").select(`
        id, current_department_id, status, created_at, company_id, created_by
      `)

      if (selectedCompany) {
        documentsQuery = documentsQuery.eq("company_id", selectedCompany.id)
      }
      if (user?.role === "user") {
        documentsQuery = documentsQuery.or(`created_by.eq.${user.id},current_department_id.eq.${user.department_id}`)
      }

      const { data: documents } = await documentsQuery

      let movements: any[] = []
      try {
        let movementsQuery = supabase.from("document_movements").select(`
          id, to_department_id, created_at, company_id,
          departments!document_movements_to_department_id_fkey (
            name, color,
            companies!departments_company_id_fkey (name)
          )
        `)

        if (selectedCompany) {
          movementsQuery = movementsQuery.eq("company_id", selectedCompany.id)
        }

        const { data: movementsData } = await movementsQuery
        movements = movementsData || []
      } catch (error) {
        console.warn("Failed to fetch document movements:", error)
      }

      let usersCountQuery = supabase.from("profiles").select("*", { count: "exact", head: true })
      if (selectedCompany) {
        usersCountQuery = usersCountQuery.eq("company_id", selectedCompany.id)
      }
      const { count: totalUsers } = await usersCountQuery

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

      const { data: products } = await productsQuery

      let inventoryMovements: any[] = []
      try {
        let fullQuery = supabase
          .from("inventory_movements")
          .select(`
            id, movement_type, quantity, total_amount, movement_date, created_at, 
            company_id, product_id, created_by,
            products (name, code)
          `)
          .order("created_at", { ascending: false })
          .limit(1000)

        if (selectedCompany) {
          fullQuery = fullQuery.eq("company_id", selectedCompany.id)
        }

        const { data: fullData } = await fullQuery
        inventoryMovements = fullData || []
      } catch (error) {
        console.warn("Inventory query failed:", error)
      }

      const processedStats = processStatistics(documents || [], movements, departments || [], totalUsers || 0)
      setStats(processedStats)

      const warehouseProcessed = processWarehouseStatistics(products || [], inventoryMovements)
      setWarehouseStats(warehouseProcessed)

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
    
    const modernColors = ["#3B82F6", "#8B5CF6", "#10B981", "#F59E0B", "#EC4899", "#06B6D4", "#84CC16", "#EF4444"]

    const documentsByDepartment = departments
      .map((dept, index) => {
        const count = documents.filter((doc) => doc.current_department_id === dept.id).length
        const companyName = dept.companies?.name
        const displayName = selectedCompany ? dept.name : dept.name
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

    const movementsByDepartment = departments
      .map((dept, index) => {
        const count = movements.filter((mov) => mov.to_department_id === dept.id).length
        const companyName = dept.companies?.name
        const displayName = selectedCompany ? dept.name : dept.name
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

    return {
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
  }

  const processWarehouseStatistics = (products: any[], movements: any[]) => {
    const categoryStats: Record<string, any> = {}
    const brandStats: Record<string, any> = {}
    let totalCostValue = 0
    let totalSaleValue = 0
    let lowStockCount = 0
    const lowStockProducts: any[] = []

    products.forEach((product) => {
      const categoryName = product.product_categories?.name || "Sin Categoría"
      if (!categoryStats[categoryName]) {
        categoryStats[categoryName] = {
          name: categoryName,
          value: 0,
          color: product.product_categories?.color || "#6B7280",
        }
      }
      categoryStats[categoryName].value++

      const brandName = product.brands?.name || "Sin Marca"
      if (!brandStats[brandName]) {
        brandStats[brandName] = {
          name: brandName,
          value: 0,
          color: product.brands?.color || "#6B7280",
        }
      }
      brandStats[brandName].value++

      totalCostValue += (product.current_stock || 0) * (product.cost_price || 0)
      totalSaleValue += (product.current_stock || 0) * (product.sale_price || 0)

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

    const movementTypes: Record<string, any> = {
      entrada: { name: "Entradas", value: 0, color: "#10B981" },
      salida: { name: "Salidas", value: 0, color: "#EF4444" },
      ajuste: { name: "Ajustes", value: 0, color: "#F59E0B" },
      transferencia: { name: "Transferencias", value: 0, color: "#8B5CF6" },
    }

    movements.forEach((movement) => {
      const movementType = movement.movement_type
      if (movementTypes[movementType]) {
        movementTypes[movementType].value++
      }
    })

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
        if (movement.movement_type === "entrada") {
          monthData.entries++
        } else if (movement.movement_type === "salida") {
          monthData.exits++
        } else if (movement.movement_type === "ajuste") {
          monthData.adjustments++
        }
      }
    })

    const productMovements: Record<string, number> = {}
    movements.forEach((movement) => {
      const productName = movement.products?.name || `Producto ID: ${movement.product_id || "Desconocido"}`
      if (!productMovements[productName]) {
        productMovements[productName] = 0
      }
      productMovements[productName]++
    })

    const topProducts = Object.entries(productMovements)
      .map(([name, count]) => ({ name, value: count }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)

    return {
      productsByCategory: Object.values(categoryStats).filter((item: any) => item.value > 0),
      productsByBrand: Object.values(brandStats).filter((item: any) => item.value > 0),
      lowStockProducts: lowStockProducts.sort((a, b) => b.difference - a.difference).slice(0, 10),
      inventoryValue: {
        totalCostValue,
        totalSaleValue,
        totalProducts: products.length,
        lowStockCount,
      },
      movementsByType: Object.values(movementTypes).filter((item: any) => item.value > 0),
      movementsByMonth: months,
      topProducts,
    }
  }

  const handleRefresh = () => {
    fetchStatistics(true)
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600"></div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600 dark:border-slate-400 mx-auto mb-4"></div>
          <p className="text-slate-500 dark:text-slate-400">Cargando estadísticas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 p-4 sm:p-6 lg:p-8 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600 dark:from-white dark:via-slate-200 dark:to-slate-400 bg-clip-text text-transparent flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-slate-800 dark:text-slate-200" />
            Panel de Análisis
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Visión integral del rendimiento y métricas del sistema
            {selectedCompany && <span className="font-semibold text-slate-700 dark:text-slate-300"> • {selectedCompany.name}</span>}
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={refreshing}
          variant="outline"
          className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border-slate-200/60 dark:border-slate-800/60 hover:bg-white dark:hover:bg-slate-900 shadow-sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Actualizando..." : "Actualizar Datos"}
        </Button>
      </div>

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-white/60 dark:bg-slate-950/60 backdrop-blur-xl border-slate-200/60 dark:border-slate-800/60 shadow-lg hover:shadow-xl transition-all duration-300 group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Documentos</CardTitle>
            <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-xl group-hover:scale-110 transition-transform">
              <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">{stats.totalStats.totalDocuments}</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Documentos registrados</p>
          </CardContent>
        </Card>

        <Card className="bg-white/60 dark:bg-slate-950/60 backdrop-blur-xl border-slate-200/60 dark:border-slate-800/60 shadow-lg hover:shadow-xl transition-all duration-300 group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">Movimientos</CardTitle>
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl group-hover:scale-110 transition-transform">
              <ArrowRightLeft className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">{stats.totalStats.totalMovements}</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Transacciones totales</p>
          </CardContent>
        </Card>

        <Card className="bg-white/60 dark:bg-slate-950/60 backdrop-blur-xl border-slate-200/60 dark:border-slate-800/60 shadow-lg hover:shadow-xl transition-all duration-300 group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">Valor Inventario</CardTitle>
            <div className="p-2.5 bg-violet-50 dark:bg-violet-900/20 rounded-xl group-hover:scale-110 transition-transform">
              <DollarSign className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              S/ {warehouseStats.inventoryValue.totalCostValue.toLocaleString("es-PE", { maximumFractionDigits: 0, notation: "compact" })}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Costo total estimado</p>
          </CardContent>
        </Card>

        <Card className="bg-white/60 dark:bg-slate-950/60 backdrop-blur-xl border-slate-200/60 dark:border-slate-800/60 shadow-lg hover:shadow-xl transition-all duration-300 group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">Usuarios Activos</CardTitle>
            <div className="p-2.5 bg-orange-50 dark:bg-orange-900/20 rounded-xl group-hover:scale-110 transition-transform">
              <Users className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">{stats.totalStats.totalUsers}</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Colaboradores</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Documents Chart */}
        <Card className="bg-white/50 dark:bg-slate-950/50 backdrop-blur-xl border-slate-200/60 dark:border-slate-800/60 shadow-xl overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
              <Layers className="h-5 w-5 text-blue-500" />
              Documentos por Departamento
            </CardTitle>
            <CardDescription>Distribución de carga de trabajo</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                {renderGradients()}
                <Pie
                  data={stats.documentsByDepartment}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={120}
                  innerRadius={80}
                  dataKey="value"
                  paddingAngle={5}
                  cornerRadius={6}
                >
                  {stats.documentsByDepartment.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                  ))}
                </Pie>
                <Tooltip content={<DepartmentTooltip />} />
                <Legend iconType="circle" />
              </RechartsPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Monthly Trend Chart */}
        <Card className="bg-white/50 dark:bg-slate-950/50 backdrop-blur-xl border-slate-200/60 dark:border-slate-800/60 shadow-xl overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
              Tendencia Mensual
            </CardTitle>
            <CardDescription>Evolución de documentos y movimientos</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.documentsByMonth} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorDocs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  tick={{ fill: '#94a3b8', fontSize: 12 }} 
                  axisLine={false} 
                  tickLine={false} 
                  dy={10}
                />
                <YAxis 
                  tick={{ fill: '#94a3b8', fontSize: 12 }} 
                  axisLine={false} 
                  tickLine={false} 
                  dx={-10}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#8B5CF6" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#colorDocs)" 
                  name="Documentos"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-1 bg-white/50 dark:bg-slate-950/50 backdrop-blur-xl border-slate-200/60 dark:border-slate-800/60 shadow-xl">
          <CardHeader>
            <CardTitle className="text-base text-slate-800 dark:text-slate-200">Estado de Documentos</CardTitle>
          </CardHeader>
          <CardContent className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={stats.documentsByStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  cornerRadius={4}
                >
                  {stats.documentsByStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
              </RechartsPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 bg-white/50 dark:bg-slate-950/50 backdrop-blur-xl border-slate-200/60 dark:border-slate-800/60 shadow-xl">
          <CardHeader>
            <CardTitle className="text-base text-slate-800 dark:text-slate-200">Movimientos de Inventario</CardTitle>
          </CardHeader>
          <CardContent className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={warehouseStats.movementsByMonth} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" />
                <Bar dataKey="entries" name="Entradas" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="exits" name="Salidas" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alert */}
      {warehouseStats.lowStockProducts.length > 0 && (
        <Card className="bg-red-50/50 dark:bg-red-950/20 backdrop-blur-xl border-red-200/60 dark:border-red-900/60 shadow-xl">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <CardTitle className="text-red-900 dark:text-red-200">Alerta de Stock Bajo</CardTitle>
                <CardDescription className="text-red-700/80 dark:text-red-300/80">
                  {warehouseStats.lowStockProducts.length} productos requieren atención inmediata
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {warehouseStats.lowStockProducts.map((product, index) => (
                <div key={index} className="bg-white/60 dark:bg-slate-900/60 rounded-xl p-4 border border-red-100 dark:border-red-900/30 flex justify-between items-center shadow-sm">
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm truncate max-w-[150px]">{product.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{product.code}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-red-600 font-bold text-lg">{product.current}</p>
                    <p className="text-xs text-slate-400">Min: {product.minimum}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
