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
    {/* Gradientes básicos */}
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

    {/* Gradientes animados para pie charts */}
    <linearGradient id="pieGradient1" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.9}>
        <animate attributeName="stop-color" values="#3B82F6;#1E40AF;#3B82F6" dur="4s" repeatCount="indefinite" />
      </stop>
      <stop offset="100%" stopColor="#1E40AF" stopOpacity={0.7}>
        <animate attributeName="stop-color" values="#1E40AF;#3B82F6;#1E40AF" dur="4s" repeatCount="indefinite" />
      </stop>
    </linearGradient>

    <linearGradient id="pieGradient2" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.9}>
        <animate attributeName="stop-color" values="#8B5CF6;#5B21B6;#8B5CF6" dur="5s" repeatCount="indefinite" />
      </stop>
      <stop offset="100%" stopColor="#5B21B6" stopOpacity={0.7}>
        <animate attributeName="stop-color" values="#5B21B6;#8B5CF6;#5B21B6" dur="5s" repeatCount="indefinite" />
      </stop>
    </linearGradient>

    <linearGradient id="pieGradient3" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stopColor="#10B981" stopOpacity={0.9}>
        <animate attributeName="stop-color" values="#10B981;#047857;#10B981" dur="6s" repeatCount="indefinite" />
      </stop>
      <stop offset="100%" stopColor="#047857" stopOpacity={0.7}>
        <animate attributeName="stop-color" values="#047857;#10B981;#047857" dur="6s" repeatCount="indefinite" />
      </stop>
    </linearGradient>

    <linearGradient id="pieGradient4" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.9}>
        <animate attributeName="stop-color" values="#F59E0B;#D97706;#F59E0B" dur="3.5s" repeatCount="indefinite" />
      </stop>
      <stop offset="100%" stopColor="#D97706" stopOpacity={0.7}>
        <animate attributeName="stop-color" values="#D97706;#F59E0B;#D97706" dur="3.5s" repeatCount="indefinite" />
      </stop>
    </linearGradient>

    <linearGradient id="pieGradient5" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stopColor="#EC4899" stopOpacity={0.9}>
        <animate attributeName="stop-color" values="#EC4899;#BE185D;#EC4899" dur="4.5s" repeatCount="indefinite" />
      </stop>
      <stop offset="100%" stopColor="#BE185D" stopOpacity={0.7}>
        <animate attributeName="stop-color" values="#BE185D;#EC4899;#BE185D" dur="4.5s" repeatCount="indefinite" />
      </stop>
    </linearGradient>

    <linearGradient id="pieGradient6" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stopColor="#06B6D4" stopOpacity={0.9}>
        <animate attributeName="stop-color" values="#06B6D4;#0891B2;#06B6D4" dur="5.5s" repeatCount="indefinite" />
      </stop>
      <stop offset="100%" stopColor="#0891B2" stopOpacity={0.7}>
        <animate attributeName="stop-color" values="#0891B2;#06B6D4;#0891B2" dur="5.5s" repeatCount="indefinite" />
      </stop>
    </linearGradient>

    {/* Gradiente de alerta animado */}
    <linearGradient id="alertGradient" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stopColor="#EF4444">
        <animate
          attributeName="stop-color"
          values="#EF4444;#DC2626;#B91C1C;#DC2626;#EF4444"
          dur="2s"
          repeatCount="indefinite"
        />
      </stop>
      <stop offset="50%" stopColor="#F87171">
        <animate
          attributeName="stop-color"
          values="#F87171;#EF4444;#DC2626;#EF4444;#F87171"
          dur="2s"
          repeatCount="indefinite"
        />
      </stop>
      <stop offset="100%" stopColor="#FCA5A5">
        <animate
          attributeName="stop-color"
          values="#FCA5A5;#F87171;#EF4444;#F87171;#FCA5A5"
          dur="2s"
          repeatCount="indefinite"
        />
      </stop>
    </linearGradient>

    {/* Gradiente de éxito animado */}
    <linearGradient id="successGradient" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stopColor="#10B981">
        <animate
          attributeName="stop-color"
          values="#10B981;#059669;#047857;#059669;#10B981"
          dur="3s"
          repeatCount="indefinite"
        />
      </stop>
      <stop offset="100%" stopColor="#34D399">
        <animate
          attributeName="stop-color"
          values="#34D399;#10B981;#059669;#10B981;#34D399"
          dur="3s"
          repeatCount="indefinite"
        />
      </stop>
    </linearGradient>

    {/* Filtros para efectos */}
    <filter id="dropshadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="3" floodOpacity="0.1" />
    </filter>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3" result="coloredBlur" />
      <feMerge>
        <feMergeNode in="coloredBlur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
    <filter id="pulseGlow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="4" result="coloredBlur" />
      <feMerge>
        <feMergeNode in="coloredBlur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
      <animate attributeName="stdDeviation" values="2;6;2" dur="2s" repeatCount="indefinite" />
    </filter>
  </defs>
)

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background/95 backdrop-blur-sm border border-border rounded-xl p-4 shadow-2xl transform transition-all duration-200 ease-out scale-105 animate-in fade-in-0 zoom-in-95">
        <div className="space-y-2">
          <p className="font-semibold text-foreground text-sm">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full shadow-sm animate-pulse" style={{ backgroundColor: entry.color }} />
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">{entry.name}:</span>
                <span className="ml-1 font-semibold text-foreground">
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
      <div className="bg-background/95 backdrop-blur-sm border border-border rounded-xl p-4 shadow-2xl transform transition-all duration-200 ease-out scale-105 animate-in fade-in-0 zoom-in-95">
        <div className="space-y-2">
          <p className="font-semibold text-foreground text-sm">{data.fullName || data.name}</p>
          {data.company && !selectedCompany && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <span>Empresa: {data.company}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full shadow-sm animate-pulse" style={{ backgroundColor: data.color }} />
            <p className="text-sm text-muted-foreground">
              <span className="font-medium">Documentos:</span>
              <span className="ml-1 font-semibold text-foreground">{data.value}</span>
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
      <div className="bg-background/95 backdrop-blur-sm border border-border rounded-xl p-4 shadow-2xl transform transition-all duration-200 ease-out scale-105 animate-in fade-in-0 zoom-in-95">
        <div className="space-y-2">
          <p className="font-semibold text-foreground text-sm">{data.fullName || data.name}</p>
          {data.company && !selectedCompany && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-orange-500"></div>
              <span>Empresa: {data.company}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full shadow-sm animate-pulse" style={{ backgroundColor: data.color }} />
            <p className="text-sm text-muted-foreground">
              <span className="font-medium">Movimientos:</span>
              <span className="ml-1 font-semibold text-foreground">{data.value}</span>
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
      console.log("=== DEBUGGING STATISTICS ===")
      console.log("User:", user?.email, "Role:", user?.role)
      console.log("Selected Company:", selectedCompany?.name || "General Mode", "ID:", selectedCompany?.id)

      let departmentsQuery = supabase.from("departments").select(`
        id, name, color, company_id,
        companies!departments_company_id_fkey (name)
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

      let documentsQuery = supabase.from("documents").select(`
        id, current_department_id, status, created_at, company_id, created_by
      `)
a
      if (selectedCompany) {
        documentsQuery = documentsQuery.eq("company_id", selectedCompany.id)
      }
      if (user?.role === "user") {
        documentsQuery = documentsQuery.or(`created_by.eq.${user.id},current_department_id.eq.${user.department_id}`)
      }

      const { data: documents, error: docsError } = await documentsQuery
      if (docsError) {
        console.error("Error fetching documents:", docsError)
        throw docsError
      }
      console.log("Documents found:", documents?.length || 0)

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

        const { data: movementsData, error: movError } = await movementsQuery
        if (movError) {
          console.warn("Error fetching movements (continuing without them):", movError)
        } else {
          movements = movementsData || []
        }
      } catch (error) {
        console.warn("Failed to fetch document movements, continuing without them:", error)
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

      const { data: products, error: productsError } = await productsQuery
      if (productsError) {
        console.error("Error fetching products:", productsError)
        throw productsError
      }
      const {
        data: basicCheck,
        error: basicError,
        count,
      } = await supabase.from("inventory_movements").select("*", { count: "exact" }).limit(1)


      if (basicError) {
        const processedStats = processStatistics(documents || [], movements, departments || [], totalUsers || 0)
        setStats(processedStats)
        const warehouseProcessed = processWarehouseStatistics(products || [], [])
        setWarehouseStats(warehouseProcessed)
        return
      }

      if (!basicCheck?.length) {
        const processedStats = processStatistics(documents || [], movements, departments || [], totalUsers || 0)
        setStats(processedStats)
        const warehouseProcessed = processWarehouseStatistics(products || [], [])
        setWarehouseStats(warehouseProcessed)
        return
      }

      const { data: sampleData, error: sampleError } = await supabase.from("inventory_movements").select("*").limit(5)



      if (sampleData?.length) {
        const firstRecord = sampleData[0]
      }

      let inventoryMovements: any[] = []
      if (selectedCompany) {
        console.log("Step 4: Applying company filter for:", selectedCompany.id)
        const { data: companyFiltered, error: companyError } = await supabase
          .from("inventory_movements")
          .select("*")
          .eq("company_id", selectedCompany.id)


        if (companyError) {
          console.error("❌ Company filter failed:", companyError)
          inventoryMovements = sampleData || []
        } else {
          inventoryMovements = companyFiltered || []
        }
      } else {
        inventoryMovements = sampleData || []
      }

      if (inventoryMovements.length > 0) {
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

          const { data: fullData, error: fullError } = await fullQuery

          console.log("Full query result:", {
            count: fullData?.length,
            error: fullError?.message,
          })

          if (fullError) {
            console.warn("⚠️ Full query failed, using basic data:", fullError)
          } else if (fullData) {
            inventoryMovements = fullData
          }
        } catch (relationError) {
          console.warn("⚠️ Relations query threw error:", relationError)
        }
      }

      if (inventoryMovements.length > 0) {
        console.log(
          "Movement types distribution:",
          inventoryMovements.reduce((acc, m) => {
            acc[m.movement_type] = (acc[m.movement_type] || 0) + 1
            return acc
          }, {}),
        )

        console.log("Date range:", {
          earliest: inventoryMovements.reduce(
            (min, m) => (m.created_at < min ? m.created_at : min),
            inventoryMovements[0].created_at,
          ),
          latest: inventoryMovements.reduce(
            (max, m) => (m.created_at > max ? m.created_at : max),
            inventoryMovements[0].created_at,
          ),
        })
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

    return result
  }

  const processWarehouseStatistics = (products: any[], movements: any[]) => {

    const categoryStats = {}
    const brandStats = {}
    let totalCostValue = 0
    let totalSaleValue = 0
    let lowStockCount = 0
    const lowStockProducts = []

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

    console.log("Products processed:", {
      categories: Object.keys(categoryStats).length,
      brands: Object.keys(brandStats).length,
    })

    const movementTypes = {
      entrada: { name: "Entradas", value: 0, color: "#10B981" },
      salida: { name: "Salidas", value: 0, color: "#EF4444" },
      ajuste: { name: "Ajustes", value: 0, color: "#F59E0B" },
      transferencia: { name: "Transferencias", value: 0, color: "#8B5CF6" },
    }

    movements.forEach((movement, index) => {
      const movementType = movement.movement_type
      console.log(`Movement ${index + 1}:`, {
        type: movementType,
        date: movement.created_at || movement.movement_date,
        product: movement.products?.name || movement.product_id,
      })

      if (movementTypes[movementType]) {
        movementTypes[movementType].value++
      } else {
        console.warn(`⚠️ Unknown movement type encountered: ${movementType}`)
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


    movements.forEach((movement, index) => {
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


    const productMovements = {}
    console.log("Processing top products...")
    movements.forEach((movement, index) => {
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
    <div className="space-y-6 mt-10">
      {/* Header con gradiente */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2 text-slate-800 dark:text-slate-200">
            <BarChart3 className="h-8 w-8 animate-pulse" />
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
          className="gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-300 bg-transparent"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : "animate-pulse"}`} />
          {refreshing ? "Actualizando..." : "Actualizar"}
        </Button>
      </div>

      {/* Stats Cards Mejoradas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-500/10 to-slate-600/5 animate-pulse"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-medium">Total Documentos</CardTitle>
            <div className="p-2 bg-slate-100 dark:bg-slate-800/30 rounded-lg">
              <FileText className="h-4 w-4 text-slate-600 animate-bounce" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold text-slate-600 animate-pulse">{stats.totalStats.totalDocuments}</div>
            <p className="text-xs text-muted-foreground">Documentos en el sistema</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-500/10 to-slate-600/5"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-medium">Total Movimientos</CardTitle>
            <div className="p-2 bg-slate-100 dark:bg-slate-800/30 rounded-lg">
              <ArrowRightLeft className="h-4 w-4 text-slate-600 animate-pulse" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold text-slate-600">{stats.totalStats.totalMovements}</div>
            <p className="text-xs text-muted-foreground">Movimientos registrados</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-500/10 to-slate-600/5"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-medium">Departamentos</CardTitle>
            <div className="p-2 bg-slate-100 dark:bg-slate-800/30 rounded-lg">
              <PieChart className="h-4 w-4 text-slate-600 animate-spin" style={{ animationDuration: "8s" }} />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold text-slate-600">{stats.totalStats.totalDepartments}</div>
            <p className="text-xs text-muted-foreground">Departamentos activos</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-500/10 to-slate-600/5"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-medium">Usuarios</CardTitle>
            <div className="p-2 bg-slate-100 dark:bg-slate-800/30 rounded-lg">
              <Users className="h-4 w-4 text-slate-600 animate-pulse" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold text-slate-600">{stats.totalStats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">Usuarios registrados</p>
          </CardContent>
        </Card>
      </div>

      {/* Warehouse Stats Cards con Animaciones */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-500/10 to-slate-600/5"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-medium">Productos Activos</CardTitle>
            <div className="p-2 bg-slate-100 dark:bg-slate-800/30 rounded-lg">
              <Package className="h-4 w-4 text-slate-600 animate-bounce" style={{ animationDelay: "0.5s" }} />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold text-slate-600">{warehouseStats.inventoryValue.totalProducts}</div>
            <p className="text-xs text-muted-foreground">Productos en inventario</p>
          </CardContent>
        </Card>

        <Card
          className={`relative overflow-hidden group hover:shadow-lg transition-all duration-300 ${warehouseStats.inventoryValue.lowStockCount > 0 ? "bg-red-50 dark:bg-red-900/10" : ""}`}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-400/80 to-red-300/80"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="flex items-center gap-3 text-lg text-red-500/80 dark:text-red-400/80">
              <AlertTriangle
                className={`h-4 w-4 text-red-500/80 ${warehouseStats.inventoryValue.lowStockCount > 0 ? "animate-pulse" : ""}`}
              />
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <div
              className={`text-2xl font-bold text-slate-600 ${warehouseStats.inventoryValue.lowStockCount > 0 ? "animate-pulse" : ""}`}
            >
              {warehouseStats.inventoryValue.lowStockCount}
            </div>
            <p className="text-xs text-muted-foreground">Productos con stock bajo</p>
            {warehouseStats.inventoryValue.lowStockCount > 0 && (
              <div className="absolute top-1 right-10 w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
            )}
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-500/10 to-slate-600/5"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-medium">Valor Costo</CardTitle>
            <div className="p-2 bg-slate-100 dark:bg-slate-800/30 rounded-lg">
              <DollarSign className="h-4 w-4 text-slate-600 animate-pulse" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold text-slate-600">
              S/ {warehouseStats.inventoryValue.totalCostValue.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">Valor total a costo</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-500/10 to-slate-600/5"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-medium">Valor Venta</CardTitle>
            <div className="p-2 bg-slate-100 dark:bg-slate-800/30 rounded-lg">
              <TrendingUp className="h-4 w-4 text-slate-600 animate-bounce" style={{ animationDelay: "1s" }} />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold text-slate-600">
              S/ {warehouseStats.inventoryValue.totalSaleValue.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">Valor total de venta</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid Modernos con Animaciones Permanentes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Documentos por Departamento */}
        <Card className="group hover:shadow-xl transition-all duration-500 hover:-translate-y-1 border-0 shadow-lg bg-gradient-to-br from-white to-slate-50/30 dark:from-gray-900 dark:to-slate-950/30">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-lg">
              <div className="p-2 bg-slate-100 dark:bg-slate-800/30 rounded-xl group-hover:scale-110 transition-transform duration-300">
                <PieChart className="h-5 w-5 text-slate-600 animate-spin" style={{ animationDuration: "10s" }} />
              </div>
              Documentos por Departamento
            </CardTitle>
            <CardDescription className="text-sm opacity-70">
              Distribución de documentos por departamento
              {!selectedCompany && " (con información de empresa)"}
            </CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {stats.documentsByDepartment.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  {renderGradients()}
                  <Pie
                    data={stats.documentsByDepartment}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={85}
                    innerRadius={25}
                    fill="#8884d8"
                    dataKey="value"
                    animationBegin={0}
                    animationDuration={1200}
                    animationEasing="ease-out"
                    label={({ name, percent }) => (percent > 5 ? `${name}: ${(percent * 100).toFixed(0)}%` : "")}
                    stroke="rgba(255,255,255,0.8)"
                    strokeWidth={2}
                    filter="url(#dropshadow)"
                  >
                    {stats.documentsByDepartment.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={`url(#pieGradient${(index % 6) + 1})`}
                        className="hover:opacity-80 transition-opacity duration-300"
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<DepartmentTooltip />} />
                  <Legend wrapperStyle={{ paddingTop: "20px" }} iconType="circle" />
                </RechartsPieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center space-y-3">
                  <div className="relative">
                    <PieChart className="h-16 w-16 mx-auto opacity-20 animate-pulse" />
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-full blur-xl animate-pulse"></div>
                  </div>
                  <p className="text-sm">No hay datos disponibles</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Documentos por Estado */}
        <Card className="group hover:shadow-xl transition-all duration-500 hover:-translate-y-1 border-0 shadow-lg bg-gradient-to-br from-white to-slate-50/30 dark:from-gray-900 dark:to-slate-950/30">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-lg">
              <div className="p-2 bg-slate-100 dark:bg-slate-800/30 rounded-xl group-hover:scale-110 transition-transform duration-300">
                <BarChart3 className="h-5 w-5 text-slate-600 animate-pulse" />
              </div>
              Documentos por Estado
            </CardTitle>
            <CardDescription className="text-sm opacity-70">Distribución de documentos por estado</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {stats.documentsByStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  {renderGradients()}
                  <Pie
                    data={stats.documentsByStatus}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={85}
                    innerRadius={25}
                    fill="#8884d8"
                    dataKey="value"
                    animationBegin={200}
                    animationDuration={1200}
                    animationEasing="ease-out"
                    label={({ name, percent }) => (percent > 8 ? `${(percent * 100).toFixed(0)}%` : "")}
                    stroke="rgba(255,255,255,0.8)"
                    strokeWidth={2}
                    filter="url(#dropshadow)"
                  >
                    {stats.documentsByStatus.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        className="hover:opacity-80 transition-opacity duration-300"
                        style={{
                          filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.1))",
                        }}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ paddingTop: "20px" }} iconType="circle" />
                </RechartsPieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center space-y-3">
                  <div className="relative">
                    <BarChart3 className="h-16 w-16 mx-auto opacity-20 animate-pulse" />
                    <div className="absolute inset-0 bg-gradient-to-r from-green-400/20 to-emerald-400/20 rounded-full blur-xl animate-pulse"></div>
                  </div>
                  <p className="text-sm">No hay datos disponibles</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Documentos por Mes */}
        <Card className="group hover:shadow-xl transition-all duration-500 hover:-translate-y-1 border-0 shadow-lg bg-gradient-to-br from-white to-slate-50/30 dark:from-gray-900 dark:to-slate-950/30">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-lg">
              <div className="p-2 bg-slate-100 dark:bg-slate-800/30 rounded-xl group-hover:scale-110 transition-transform duration-300">
                <TrendingUp className="h-5 w-5 text-slate-600 animate-bounce" />
              </div>
              Documentos por Mes
            </CardTitle>
            <CardDescription className="text-sm opacity-70">Documentos creados en los últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.documentsByMonth} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                {renderGradients()}
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  stroke="rgba(148, 163, 184, 0.5)"
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  stroke="rgba(148, 163, 184, 0.5)"
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#8B5CF6"
                  strokeWidth={3}
                  fill="url(#colorDocuments)"
                  name="Documentos"
                  animationDuration={1500}
                  animationEasing="ease-out"
                  filter="url(#glow)"
                  dot={{ fill: "#8B5CF6", strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: "#8B5CF6", strokeWidth: 2, fill: "#fff", className: "animate-ping" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Movimientos por Departamento */}
        <Card className="group hover:shadow-xl transition-all duration-500 hover:-translate-y-1 border-0 shadow-lg bg-gradient-to-br from-white to-slate-50/30 dark:from-gray-900 dark:to-slate-950/30">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-lg">
              <div className="p-2 bg-slate-100 dark:bg-slate-800/30 rounded-xl group-hover:scale-110 transition-transform duration-300">
                <ArrowRightLeft className="h-5 w-5 text-slate-600 animate-pulse" />
              </div>
              Movimientos por Departamento
            </CardTitle>
            <CardDescription className="text-sm opacity-70">
              Distribución de movimientos por departamento destino
              {!selectedCompany && " (con información de empresa)"}
            </CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {stats.movementsByDepartment.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={stats.movementsByDepartment}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  {renderGradients()}
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 12, fill: "#64748b" }}
                    stroke="rgba(148, 163, 184, 0.5)"
                    tickLine={false}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={100}
                    tick={{ fontSize: 12, fill: "#64748b" }}
                    stroke="rgba(148, 163, 184, 0.5)"
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<MovementTooltip />} />
                  <Bar
                    dataKey="value"
                    name="Movimientos"
                    radius={[0, 8, 8, 0]}
                    animationDuration={1000}
                    animationEasing="ease-out"
                  >
                    {stats.movementsByDepartment.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        className="hover:opacity-80 transition-opacity duration-300"
                        style={{
                          filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.1))",
                        }}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center space-y-3">
                  <div className="relative">
                    <ArrowRightLeft className="h-16 w-16 mx-auto opacity-20 animate-pulse" />
                    <div className="absolute inset-0 bg-gradient-to-r from-orange-400/20 to-red-400/20 rounded-full blur-xl animate-pulse"></div>
                  </div>
                  <p className="text-sm">No hay datos disponibles</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Warehouse Charts Grid Mejorados */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Products by Category */}
        <Card className="group hover:shadow-xl transition-all duration-500 hover:-translate-y-1 border-0 shadow-lg bg-gradient-to-br from-white to-slate-50/30 dark:from-gray-900 dark:to-slate-950/30">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-lg">
              <div className="p-2 bg-slate-100 dark:bg-slate-800/30 rounded-xl group-hover:scale-110 transition-transform duration-300">
                <Package className="h-5 w-5 text-slate-600 animate-bounce" style={{ animationDelay: "2s" }} />
              </div>
              Productos por Categoría
            </CardTitle>
            <CardDescription className="text-sm opacity-70">Distribución de productos por categoría</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {warehouseStats.productsByCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  {renderGradients()}
                  <Pie
                    data={warehouseStats.productsByCategory}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={85}
                    innerRadius={25}
                    fill="#8884d8"
                    dataKey="value"
                    animationBegin={400}
                    animationDuration={1200}
                    animationEasing="ease-out"
                    label={({ name, percent }) => (percent > 5 ? `${name}: ${(percent * 100).toFixed(0)}%` : "")}
                    stroke="rgba(255,255,255,0.8)"
                    strokeWidth={2}
                    filter="url(#dropshadow)"
                  >
                    {warehouseStats.productsByCategory.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        className="hover:opacity-80 transition-opacity duration-300"
                        style={{
                          filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.1))",
                        }}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ paddingTop: "20px" }} iconType="circle" />
                </RechartsPieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center space-y-3">
                  <div className="relative">
                    <Package className="h-16 w-16 mx-auto opacity-20 animate-pulse" />
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/20 to-green-400/20 rounded-full blur-xl animate-pulse"></div>
                  </div>
                  <p className="text-sm">No hay datos disponibles</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Movements by Type */}
        <Card className="group hover:shadow-xl transition-all duration-500 hover:-translate-y-1 border-0 shadow-lg bg-gradient-to-br from-white to-slate-50/30 dark:from-gray-900 dark:to-slate-950/30">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-lg">
              <div className="p-2 bg-slate-100 dark:bg-slate-800/30 rounded-xl group-hover:scale-110 transition-transform duration-300">
                <ArrowRightLeft className="h-5 w-5 text-slate-600 animate-pulse" />
              </div>
              Movimientos por Tipo
            </CardTitle>
            <CardDescription className="text-sm opacity-70">Distribución de movimientos de inventario</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {warehouseStats.movementsByType.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  {renderGradients()}
                  <Pie
                    data={warehouseStats.movementsByType}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={85}
                    innerRadius={25}
                    fill="#8884d8"
                    dataKey="value"
                    animationBegin={600}
                    animationDuration={1200}
                    animationEasing="ease-out"
                    label={({ name, percent }) => (percent > 8 ? `${(percent * 100).toFixed(0)}%` : "")}
                    stroke="rgba(255,255,255,0.8)"
                    strokeWidth={2}
                    filter="url(#dropshadow)"
                  >
                    {warehouseStats.movementsByType.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        className="hover:opacity-80 transition-opacity duration-300"
                        style={{
                          filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.1))",
                        }}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ paddingTop: "20px" }} iconType="circle" />
                </RechartsPieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center space-y-3">
                  <div className="relative">
                    <ArrowRightLeft className="h-16 w-16 mx-auto opacity-20 animate-pulse" />
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-cyan-400/20 rounded-full blur-xl animate-pulse"></div>
                  </div>
                  <p className="text-sm">No hay datos disponibles</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Inventory Movements by Month */}
        <Card className="group hover:shadow-xl transition-all duration-500 hover:-translate-y-1 border-0 shadow-lg bg-gradient-to-br from-white to-slate-50/30 dark:from-gray-900 dark:to-slate-950/30">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-lg">
              <div className="p-2 bg-slate-100 dark:bg-slate-800/30 rounded-xl group-hover:scale-110 transition-transform duration-300">
                <Calendar className="h-5 w-5 text-slate-600 animate-pulse" />
              </div>
              Movimientos por Mes
            </CardTitle>
            <CardDescription className="text-sm opacity-70">
              Movimientos de inventario en los últimos 6 meses
            </CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={warehouseStats.movementsByMonth} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                {renderGradients()}
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  stroke="rgba(148, 163, 184, 0.5)"
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  stroke="rgba(148, 163, 184, 0.5)"
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar
                  dataKey="entries"
                  name="Entradas"
                  fill="#10B981"
                  radius={[4, 4, 0, 0]}
                  animationDuration={1000}
                  animationEasing="ease-out"
                  style={{
                    filter: "drop-shadow(0 2px 4px rgba(16, 185, 129, 0.2))",
                  }}
                />
                <Bar
                  dataKey="exits"
                  name="Salidas"
                  fill="#EF4444"
                  radius={[4, 4, 0, 0]}
                  animationDuration={1200}
                  animationEasing="ease-out"
                  style={{
                    filter: "drop-shadow(0 2px 4px rgba(239, 68, 68, 0.2))",
                  }}
                />
                <Bar
                  dataKey="adjustments"
                  name="Ajustes"
                  fill="#F59E0B"
                  radius={[4, 4, 0, 0]}
                  animationDuration={1400}
                  animationEasing="ease-out"
                  style={{
                    filter: "drop-shadow(0 2px 4px rgba(245, 158, 11, 0.2))",
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Products by Movement */}
        <Card className="group hover:shadow-xl transition-all duration-500 hover:-translate-y-1 border-0 shadow-lg bg-gradient-to-br from-white to-slate-50/30 dark:from-gray-900 dark:to-slate-950/30">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-lg">
              <div className="p-2 bg-slate-100 dark:bg-slate-800/30 rounded-xl group-hover:scale-110 transition-transform duration-300">
                <TrendingUp className="h-5 w-5 text-slate-600 animate-bounce" style={{ animationDelay: "1.5s" }} />
              </div>
              Productos Más Movidos
            </CardTitle>
            <CardDescription className="text-sm opacity-70">Top 10 productos con más movimientos</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {warehouseStats.topProducts.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={warehouseStats.topProducts}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  {renderGradients()}
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 12, fill: "#64748b" }}
                    stroke="rgba(148, 163, 184, 0.5)"
                    tickLine={false}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={120}
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    stroke="rgba(148, 163, 184, 0.5)"
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="value"
                    name="Movimientos"
                    fill="url(#barGradient)"
                    radius={[0, 8, 8, 0]}
                    animationDuration={1600}
                    animationEasing="ease-out"
                    style={{
                      filter: "drop-shadow(0 2px 4px rgba(139, 92, 246, 0.2))",
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center space-y-3">
                  <div className="relative">
                    <TrendingUp className="h-16 w-16 mx-auto opacity-20 animate-pulse" />
                    <div className="absolute inset-0 bg-gradient-to-r from-orange-400/20 to-yellow-400/20 rounded-full blur-xl animate-pulse"></div>
                  </div>
                  <p className="text-sm">No hay datos disponibles</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alert Mejorado */}
      {warehouseStats.lowStockProducts.length > 0 && (
        <Card className="group hover:shadow-xl transition-all duration-500 hover:-translate-y-1 border-0 shadow-lg bg-gradient-to-br from-red-50/30 to-red-50/10 dark:from-red-950/10 dark:to-red-950/5 border-red-200/30 dark:border-red-800/30">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-lg text-red-500/80 dark:text-red-400/80">
              <div className="p-2 bg-slate-100 dark:bg-slate-800/30 rounded-xl group-hover:scale-110 transition-transform duration-300">
                <AlertTriangle className="h-5 w-5 animate-pulse" />
              </div>
              Productos con Stock Bajo
            </CardTitle>
            <CardDescription className="text-sm opacity-70">Productos que requieren reposición urgente</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {warehouseStats.lowStockProducts.map((product, index) => (
                <div
                  key={index}
                  className="group/item p-4 border rounded-xl bg-gradient-to-br from-red-50/50 to-red-50/20 dark:from-red-950/10 dark:to-red-950/5 border-red-200/50 dark:border-red-800/50 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                  style={{
                    animationDelay: `${index * 100}ms`,
                    animation: "fadeInUp 0.6s ease-out forwards",
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 group-hover/item:text-red-600 transition-colors duration-300">
                      {product.name}
                    </h4>
                    <span className="text-xs text-muted-foreground bg-white/50 dark:bg-gray-800/50 px-2 py-1 rounded-md">
                      {product.code}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-red-600 font-medium">Stock: {product.current}</span>
                    <span className="text-muted-foreground">Mín: {product.minimum}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-red-100 dark:bg-red-900/30 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full transition-all duration-1000 ease-out animate-pulse"
                        style={{
                          width: `${Math.max(10, (product.current / product.minimum) * 100)}%`,
                          animationDelay: `${index * 200}ms`,
                        }}
                      />
                    </div>
                    <span className="text-xs text-red-600 font-bold animate-pulse">Faltan: {product.difference}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
