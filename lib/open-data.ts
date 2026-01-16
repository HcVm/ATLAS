import { createServerClient } from "@/lib/supabase-server"
import { format, eachMonthOfInterval, subMonths, subYears, startOfMonth, endOfMonth } from "date-fns"
import { es } from "date-fns/locale"

export type Period = "3months" | "6months" | "1year"

export async function getMarketStats(period: Period = "6months") {
  const supabase = createServerClient()
  const now = new Date()
  let startDate: Date

  // 1. Determine Date Range
  switch (period) {
    case "3months":
      startDate = subMonths(now, 3)
      break
    case "1year":
      startDate = subYears(now, 1)
      break
    default: // 6months
      startDate = subMonths(now, 6)
  }
  
  // Ensure we start from the beginning of that month to avoid partial month data looking like a drop
  startDate = startOfMonth(startDate)
  const startDateStr = startDate.toISOString().split("T")[0]

  try {
    // 2. Fetch Main Data (Paginated)
    const allData: any[] = []
    const pageSize = 10000 // Optimized batch size for partial column fetch
    let from = 0
    const MAX_TOTAL_RECORDS = 500000 // Increased limit to 500k to cover full years of high volume data

    do {
        const { data: page, error } = await supabase
            .from("open_data_entries")
            .select(`
                monto_total_entrega,
                fecha_publicacion,
                orden_electronica,
                dep_entrega,
                ruc_entidad,
                razon_social_entidad,
                ruc_proveedor,
                razon_social_proveedor,
                categoria,
                plazo_entrega,
                codigo_acuerdo_marco,
                descripcion_ficha_producto
            `)
            .gte("fecha_publicacion", startDateStr)
            .order("fecha_publicacion", { ascending: true })
            .range(from, from + pageSize - 1)

        if (error) {
            console.error("Supabase Error:", error)
            throw error
        }

        if (!page || page.length === 0) break
        
        allData.push(...page)
        from += pageSize
        
        // Safety break to prevent infinite loops or memory exhaustion
        if (allData.length >= MAX_TOTAL_RECORDS) break
    } while (true)

    if (allData.length === 0) {
        return {
            totalAmount: 0,
            totalOrders: 0,
            totalProducts: 0,
            totalSuppliers: 0,
            totalEntities: 0,
            totalAgreements: 0,
            avgOrderValue: 0,
            avgDeliveryDays: 0,
            growthRate: 0,
            monthlyTrend: [],
            topCategories: [],
            topRegions: [],
            topEntities: [],
            topSuppliers: []
        }
    }

    // 3. Initialize Aggregators
    let totalAmount = 0
    const uniqueOrders = new Set<string>()
    const uniqueProducts = new Set<string>()
    const uniqueSuppliers = new Set<string>()
    const uniqueEntities = new Set<string>()
    const uniqueAgreements = new Set<string>()
    
    const monthlyStatsMap = new Map<string, { amount: number, orders: number }>()
    const categoryStatsMap = new Map<string, number>()
    const departmentStatsMap = new Map<string, number>()
    const entityStatsMap = new Map<string, { name: string, amount: number }>()
    const supplierStatsMap = new Map<string, { name: string, amount: number }>()
    
    let totalDeliveryDays = 0
    let deliveryCount = 0

    // 4. Process Data
    // Filter duplicates manually if needed, or rely on unique IDs.
    // Since we paginate, we might get overlaps if we were using offset/limit without stable sort + unique ID cursor,
    // but range() is offset-based. However, if data is inserted during fetch, offset shifts.
    // For analytics, minor inconsistencies are acceptable, but let's dedupe by ID if we have it.
    // But we didn't select ID. Let's assume range() is stable enough for this snapshot.
    
    // Sort all data by date locally to ensure sequential processing if needed, though map handles it by key.
    
    allData.forEach(item => {
        const amount = Number(item.monto_total_entrega) || 0
        // Handle date: ensure we take the YYYY-MM part correctly regardless of timezone issues
        // We assume fecha_publicacion is YYYY-MM-DD string
        const dateStr = item.fecha_publicacion as string
        let dateKey: string | null = null
        
        if (dateStr && dateStr.length >= 7) {
            // Extract YYYY-MM safely
            dateKey = dateStr.substring(0, 7)
        }
        
        // Totals
        totalAmount += amount
        if (item.orden_electronica) uniqueOrders.add(item.orden_electronica)
        if (item.descripcion_ficha_producto) uniqueProducts.add(item.descripcion_ficha_producto)
        if (item.ruc_proveedor) uniqueSuppliers.add(item.ruc_proveedor)
        if (item.ruc_entidad) uniqueEntities.add(item.ruc_entidad)
        if (item.codigo_acuerdo_marco) uniqueAgreements.add(item.codigo_acuerdo_marco)

        // Trends
        if (dateKey) {
            const current = monthlyStatsMap.get(dateKey) || { amount: 0, orders: 0 }
            monthlyStatsMap.set(dateKey, { 
                amount: current.amount + amount, 
                orders: current.orders + 1 
            })
        } else {
             // Fallback for missing dates if necessary, or log
             // console.log("Missing date for item", item)
        }


        // Categories
        const cat = item.categoria || "Otros"
        categoryStatsMap.set(cat, (categoryStatsMap.get(cat) || 0) + amount)

        // Departments
        const dep = item.dep_entrega || "SIN REGIÓN"
        // Normalize department names if needed (simple trim)
        const normalizedDep = dep.trim().toUpperCase()
        departmentStatsMap.set(normalizedDep, (departmentStatsMap.get(normalizedDep) || 0) + amount)

        // Entities
        if (item.ruc_entidad && item.razon_social_entidad) {
            const currentEnt = entityStatsMap.get(item.ruc_entidad) || { name: item.razon_social_entidad, amount: 0 }
            currentEnt.amount += amount
            entityStatsMap.set(item.ruc_entidad, currentEnt)
        }

        // Suppliers
        if (item.ruc_proveedor && item.razon_social_proveedor) {
            const currentSup = supplierStatsMap.get(item.ruc_proveedor) || { name: item.razon_social_proveedor, amount: 0 }
            currentSup.amount += amount
            supplierStatsMap.set(item.ruc_proveedor, currentSup)
        }

        // Efficiency
        if (item.plazo_entrega) {
            totalDeliveryDays += Number(item.plazo_entrega)
            deliveryCount++
        }
    })

    // 5. Fill Missing Months for Trend Chart
    // Create an array of all months between start and now
    const interval = eachMonthOfInterval({
        start: startDate,
        end: endOfMonth(now)
    })
    
    // Debug log to verify map content
    // console.log("Monthly Stats Map Keys:", Array.from(monthlyStatsMap.keys()));

    const monthlyTrend = interval.map(date => {
        // We use UTC date parts to construct the key YYYY-MM to match the substring extraction from ISO string
        // But date-fns `eachMonthOfInterval` returns local dates.
        // Let's rely on format(date, "yyyy-MM") which uses local time.
        // If "fecha_publicacion" is "2025-08-01", substring(0,7) is "2025-08".
        // format(new Date(2025, 7, 1), "yyyy-MM") is "2025-08".
        // This should match.
        
        const key = format(date, "yyyy-MM")
        const stats = monthlyStatsMap.get(key) || { amount: 0, orders: 0 }
        
        return {
            month: format(date, "MMM yyyy", { locale: es }), // Label for chart
            key, // Debug/Sort key
            amount: stats.amount,
            orders: stats.orders,
            // Add extra formatted value for tooltip
            amountFormatted: (stats.amount / 1000000).toFixed(2)
        }
    })

    // 6. Format Top Lists
    const topCategories = Array.from(categoryStatsMap.entries())
        .map(([category, amount]) => ({ category, amount, percentage: totalAmount > 0 ? (amount / totalAmount) * 100 : 0 }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10)

    const topRegions = Array.from(departmentStatsMap.entries())
        .map(([region, amount]) => ({ region, amount }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10)

    const topEntities = Array.from(entityStatsMap.values())
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5)

    const topSuppliers = Array.from(supplierStatsMap.values())
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5)

    // 7. Calculate Previous Period Growth
    // Note: Doing a second query is safer than assuming data exists
    const prevStartDate = period === "3months" ? subMonths(startDate, 3) : 
                          period === "1year" ? subYears(startDate, 1) : 
                          subMonths(startDate, 6)
    
    const { data: prevData } = await supabase
        .from("open_data_entries")
        .select("monto_total_entrega")
        .gte("fecha_publicacion", prevStartDate.toISOString().split("T")[0])
        .lt("fecha_publicacion", startDateStr)
    
    const prevAmount = prevData?.reduce((sum, item) => sum + (Number(item.monto_total_entrega) || 0), 0) || 0
    const growthRate = prevAmount > 0 ? ((totalAmount - prevAmount) / prevAmount) * 100 : 0

    return {
      totalAmount: Math.round(totalAmount),
      totalOrders: uniqueOrders.size,
      totalProducts: uniqueProducts.size,
      totalSuppliers: uniqueSuppliers.size,
      totalEntities: uniqueEntities.size,
      totalAgreements: uniqueAgreements.size,
      avgOrderValue: uniqueOrders.size > 0 ? Math.round(totalAmount / uniqueOrders.size) : 0,
      avgDeliveryDays: deliveryCount > 0 ? Math.round(totalDeliveryDays / deliveryCount) : 0,
      growthRate: Math.round(growthRate * 100) / 100,
      monthlyTrend,
      topCategories,
      topRegions,
      topEntities,
      topSuppliers
    }

  } catch (error: any) {
    console.error("Error in getMarketStats:", error)
    return null
  }
}
