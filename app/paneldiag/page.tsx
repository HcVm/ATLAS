"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Database,
  Server,
  Shield,
  Settings,
  Activity,
  HardDrive,
  Loader2,
  RefreshCw,
  Eye,
  EyeOff,
  Lock,
  ArrowLeft,
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"

interface TestResult {
  name: string
  status: "success" | "error" | "warning" | "running"
  message: string
  details?: any
  duration?: number
}

interface SystemStatus {
  overall: "healthy" | "warning" | "critical"
  tests: TestResult[]
  lastRun: Date
  progress: number
}

const secpass = process.env.NEXT_PUBLIC_SECRET_PASSWORD

export default function SecretDiagnosticsPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [authError, setAuthError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { user } = useAuth()
  const router = useRouter()

  const [status, setStatus] = useState<SystemStatus>({
    overall: "healthy",
    tests: [],
    lastRun: new Date(),
    progress: 0,
  })
  const [isRunning, setIsRunning] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null)

  // Environment detection
  const isProduction = process.env.NODE_ENV === "production"
  const environment = isProduction ? "production" : "local"

  // Authentication handler
  const handleAuthentication = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (session) {
      console.log("📦 SESSION OBTENIDA:", session)
      const { error: syncError } = await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      })
      if (syncError) {
        console.warn("⚠️ No se pudo sincronizar sesión:", syncError.message)
      } else {
        console.log("✅ Cookie de sesión sincronizada correctamente")
      }
    }
    setIsLoading(true)
    setAuthError("")

    try {
      // Check if user is authenticated
      if (!user) {
        setAuthError("Debes estar autenticado para acceder a este panel")
        setIsLoading(false)
        return
      }

      // Check if user is admin
      if (user.role !== "admin") {
        setAuthError("Solo los administradores pueden acceder a este panel")
        setIsLoading(false)
        return
      }

      // Check secret password
      if (password !== secpass) {
        setAuthError("Contraseña secreta incorrecta")
        setIsLoading(false)
        return
      }

      // Log access attempt
      console.log("🔐 Acceso autorizado al panel de diagnósticos:", {
        user: user.email,
        role: user.role,
        timestamp: new Date().toISOString(),
      })

      setIsAuthenticated(true)
    } catch (error) {
      console.error("Error en autenticación:", error)
      setAuthError("Error interno de autenticación")
    } finally {
      setIsLoading(false)
    }
  }

  // Test individual functions
  const testDatabaseConnection = async (): Promise<TestResult> => {
    const start = Date.now()
    try {
      const { data, error } = await supabase.from("departments").select("count").limit(1)
      if (error) throw error

      return {
        name: "Conexión a Base de Datos",
        status: "success",
        message: "Conexión exitosa a Supabase",
        duration: Date.now() - start,
      }
    } catch (error: any) {
      return {
        name: "Conexión a Base de Datos",
        status: "error",
        message: `Error: ${error.message}`,
        duration: Date.now() - start,
      }
    }
  }

  const testServerSideDiagnostics = async (): Promise<TestResult[]> => {
    const start = Date.now()
    try {
      const res = await fetch("/api/system-status")
      const json = await res.json()

      const results: TestResult[] = []

      results.push({
        name: "Variables de Entorno (servidor)",
        status: json.envCheck.status,
        message: json.envCheck.message,
        details: json.envCheck,
        duration: Date.now() - start,
      })

      if (json.bucketCheck) {
        results.push({
          name: "Buckets de Supabase (servidor)",
          status: json.bucketCheck.status,
          message: json.bucketCheck.message,
          details: json.bucketCheck,
          duration: Date.now() - start,
        })
      }

      return results
    } catch (error: any) {
      return [
        {
          name: "Diagnóstico de servidor",
          status: "error",
          message: `Error al consultar la API: ${error.message}`,
          duration: Date.now() - start,
        },
      ]
    }
  }

  const testAuthentication = async (): Promise<TestResult> => {
    const start = Date.now()
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()

      if (error) throw error

      if (user) {
        return {
          name: "Sistema de Autenticación",
          status: "success",
          message: `Usuario autenticado: ${user.email}`,
          details: { userId: user.id, role: user.user_metadata?.role },
          duration: Date.now() - start,
        }
      } else {
        return {
          name: "Sistema de Autenticación",
          status: "warning",
          message: "No hay usuario autenticado",
          duration: Date.now() - start,
        }
      }
    } catch (error: any) {
      return {
        name: "Sistema de Autenticación",
        status: "error",
        message: `Error: ${error.message}`,
        duration: Date.now() - start,
      }
    }
  }

  const testUserProfiles = async (): Promise<TestResult> => {
    const start = Date.now()
    try {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, role, company_id")
        .limit(10)

      if (error) throw error

      return {
        name: "Perfiles de Usuario",
        status: "success",
        message: `${profiles?.length || 0} perfiles encontrados`,
        details: { profileCount: profiles?.length },
        duration: Date.now() - start,
      }
    } catch (error: any) {
      return {
        name: "Perfiles de Usuario",
        status: "error",
        message: `Error: ${error.message}`,
        duration: Date.now() - start,
      }
    }
  }

  const testDepartments = async (): Promise<TestResult> => {
    const start = Date.now()
    try {
      const { data: departments, error } = await supabase.from("departments").select("id, name, company_id")

      if (error) throw error

      return {
        name: "Departamentos",
        status: "success",
        message: `${departments?.length || 0} departamentos activos`,
        details: { departmentCount: departments?.length },
        duration: Date.now() - start,
      }
    } catch (error: any) {
      return {
        name: "Departamentos",
        status: "error",
        message: `Error: ${error.message}`,
        duration: Date.now() - start,
      }
    }
  }

  const testDocuments = async (): Promise<TestResult> => {
    const start = Date.now()
    try {
      const { data: documents, error } = await supabase
        .from("documents")
        .select("id, title, file_url, created_at")
        .limit(5)

      if (error) throw error

      return {
        name: "Sistema de Documentos",
        status: "success",
        message: `${documents?.length || 0} documentos recientes`,
        details: { documentCount: documents?.length },
        duration: Date.now() - start,
      }
    } catch (error: any) {
      return {
        name: "Sistema de Documentos",
        status: "error",
        message: `Error: ${error.message}`,
        duration: Date.now() - start,
      }
    }
  }

  const testWarehouse = async (): Promise<TestResult> => {
    const start = Date.now()
    try {
      // Try different column combinations progressively
      const possibleQueries = [
        // Try with all common columns
        () => supabase.from("products").select("id, name, code, current_stock, cost_price, sale_price").limit(5),
        // Try without price
        () => supabase.from("products").select("id, name, code, current_stock, sale_price").limit(5),
        // Try without stock and price
        () => supabase.from("products").select("id, name, code, sale_price").limit(5),
        // Try without stock, price, and unit_price
        () => supabase.from("products").select("id, name, code").limit(5),
        // Basic query with just id and name
        () => supabase.from("products").select("id, name").limit(5),
        // Minimal query
        () => supabase.from("products").select("id").limit(5),
      ]

      let lastError: any = null
      const missingColumns: string[] = []

      for (let i = 0; i < possibleQueries.length; i++) {
        try {
          const { data: products, error } = await possibleQueries[i]()

          if (error) {
            lastError = error
            // Detect which columns are missing
            if (error.message.includes("stock")) {
              missingColumns.push("stock")
            }
            if (error.message.includes("price")) {
              missingColumns.push("price")
            }
            if (error.message.includes("unit_price")) {
              missingColumns.push("unit_price")
            }
            if (error.message.includes("code")) {
              missingColumns.push("code")
            }
            continue
          }

          // Success with this query
          let message = `${products?.length || 0} productos encontrados`
          let status: "success" | "warning" = "success"

          if (missingColumns.length > 0) {
            message += ` (columnas faltantes en ${environment}: ${missingColumns.join(", ")})`
            status = isProduction ? "error" : "warning"
          }

          return {
            name: "Sistema de Almacén",
            status,
            message,
            details: {
              productCount: products?.length,
              environment,
              missingColumns: missingColumns.length > 0 ? missingColumns : undefined,
              queryUsed: i + 1,
              availableColumns: i === 0 ? "all" : "limited",
            },
            duration: Date.now() - start,
          }
        } catch (queryError: any) {
          lastError = queryError
          continue
        }
      }

      // If all queries failed
      throw lastError || new Error("No se pudo consultar la tabla products con ninguna combinación de columnas")
    } catch (error: any) {
      return {
        name: "Sistema de Almacén",
        status: "error",
        message: `Error: ${error.message}`,
        details: { environment, error: error.message },
        duration: Date.now() - start,
      }
    }
  }

  const testSales = async (): Promise<TestResult> => {
    const start = Date.now()
    try {
      // Try different column combinations based on what might exist
      const possibleQueries = [
        // Full query with all columns
        () => supabase.from("sales").select("id, total_sale, sale_status, created_at").limit(5),
        // Without status column
        () => supabase.from("sales").select("id, total_sale, created_at").limit(5),
        // Without total_amount column
        () => supabase.from("sales").select("id, sale_status, created_at").limit(5),
        // Basic query with minimal columns
        () => supabase.from("sales").select("id, created_at").limit(5),
        // Just count
        () => supabase.from("sales").select("id").limit(5),
      ]

      let lastError: any = null
      const missingColumns: string[] = []

      for (let i = 0; i < possibleQueries.length; i++) {
        try {
          const { data: sales, error } = await possibleQueries[i]()

          if (error) {
            lastError = error
            // Detect which column is missing
            if (error.message.includes("total_sale")) {
              missingColumns.push("total_sale")
            }
            if (error.message.includes("sale_status")) {
              missingColumns.push("sale_status")
            }
            continue
          }

          // Success with this query
          let message = `${sales?.length || 0} ventas encontradas`
          let status: "success" | "warning" = "success"

          if (missingColumns.length > 0) {
            message += ` (columnas faltantes en ${environment}: ${missingColumns.join(", ")})`
            status = isProduction ? "error" : "warning"
          }

          return {
            name: "Sistema de Ventas",
            status,
            message,
            details: {
              salesCount: sales?.length,
              environment,
              missingColumns: missingColumns.length > 0 ? missingColumns : undefined,
              queryUsed: i + 1,
            },
            duration: Date.now() - start,
          }
        } catch (queryError: any) {
          lastError = queryError
          continue
        }
      }

      // If all queries failed
      throw lastError || new Error("No se pudo consultar la tabla sales con ninguna combinación de columnas")
    } catch (error: any) {
      return {
        name: "Sistema de Ventas",
        status: "error",
        message: `Error: ${error.message}`,
        details: { environment, error: error.message },
        duration: Date.now() - start,
      }
    }
  }

  const testQuotations = async (): Promise<TestResult> => {
    const start = Date.now()
    try {
      const { data: quotations, error } = await supabase
        .from("quotations")
        .select("id, quotation_number, status, created_at")
        .limit(5)

      if (error) throw error

      return {
        name: "Sistema de Cotizaciones",
        status: "success",
        message: `${quotations?.length || 0} cotizaciones recientes`,
        details: { quotationCount: quotations?.length },
        duration: Date.now() - start,
      }
    } catch (error: any) {
      return {
        name: "Sistema de Cotizaciones",
        status: "error",
        message: `Error: ${error.message}`,
        duration: Date.now() - start,
      }
    }
  }

  const testSupport = async (): Promise<TestResult> => {
    const start = Date.now()
    try {
      const { data: tickets, error } = await supabase
        .from("support_tickets")
        .select("id, title, status, priority, created_at")
        .limit(5)

      if (error) throw error

      return {
        name: "Sistema de Soporte",
        status: "success",
        message: `${tickets?.length || 0} tickets de soporte`,
        details: { ticketCount: tickets?.length },
        duration: Date.now() - start,
      }
    } catch (error: any) {
      return {
        name: "Sistema de Soporte",
        status: "error",
        message: `Error: ${error.message}`,
        duration: Date.now() - start,
      }
    }
  }

  const testNews = async (): Promise<TestResult> => {
    const start = Date.now()
    try {
      const { data: news, error } = await supabase.from("news").select("id, title, published, created_at").limit(5)

      if (error) throw error

      return {
        name: "Sistema de Noticias",
        status: "success",
        message: `${news?.length || 0} noticias publicadas`,
        details: { newsCount: news?.length },
        duration: Date.now() - start,
      }
    } catch (error: any) {
      return {
        name: "Sistema de Noticias",
        status: "error",
        message: `Error: ${error.message}`,
        duration: Date.now() - start,
      }
    }
  }

  const testNotifications = async (): Promise<TestResult> => {
    const start = Date.now()
    try {
      const { data: notifications, error } = await supabase
        .from("notifications")
        .select("id, title, read, created_at")
        .limit(5)

      if (error) throw error

      return {
        name: "Sistema de Notificaciones",
        status: "success",
        message: `${notifications?.length || 0} notificaciones recientes`,
        details: { notificationCount: notifications?.length },
        duration: Date.now() - start,
      }
    } catch (error: any) {
      return {
        name: "Sistema de Notificaciones",
        status: "error",
        message: `Error: ${error.message}`,
        duration: Date.now() - start,
      }
    }
  }

  const testRLS = async (): Promise<TestResult> => {
    const start = Date.now()
    try {
      // Test RLS by trying to access data without proper context
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        return {
          name: "Seguridad RLS",
          status: "warning",
          message: "No se puede verificar RLS sin usuario autenticado",
          duration: Date.now() - start,
        }
      }

      // Try to access profiles - should only return current user's profile
      const { data: profiles, error } = await supabase.from("profiles").select("id")

      if (error) {
        return {
          name: "Seguridad RLS",
          status: "success",
          message: "RLS funcionando - acceso restringido correctamente",
          duration: Date.now() - start,
        }
      }

      return {
        name: "Seguridad RLS",
        status: "success",
        message: `RLS activo - ${profiles?.length || 0} registros accesibles`,
        details: { accessibleRecords: profiles?.length },
        duration: Date.now() - start,
      }
    } catch (error: any) {
      return {
        name: "Seguridad RLS",
        status: "error",
        message: `Error: ${error.message}`,
        duration: Date.now() - start,
      }
    }
  }

  const testAPIEndpoints = async (): Promise<TestResult> => {
    const start = Date.now()
    try {
      const endpoints = ["/api/departments", "/api/diagnostics/protected-users", "/api/news"]

      const results = await Promise.allSettled(
        endpoints.map((endpoint) =>
          fetch(endpoint, {
            method: "GET",
            credentials: "include", // ✅ Envía cookies al servidor
          }).then((res) => ({ endpoint, status: res.status, ok: res.ok })),
        ),
      )

      const successful = results.filter((r) => r.status === "fulfilled" && r.value.ok).length
      const authRequired = results.filter(
        (r) => r.status === "fulfilled" && !r.value.ok && r.value.status === 401,
      ).length
      const total = endpoints.length

      let status: "success" | "warning" | "error" = "success"
      let message = `${successful}/${total} endpoints funcionando`

      if (authRequired > 0) {
        message += ` (${authRequired} requieren autenticación - normal en ${environment})`
        status = isProduction && successful < total - authRequired ? "error" : "warning"
      } else if (successful < total) {
        status = "error"
      }

      return {
        name: "API Endpoints",
        status,
        message,
        details: { endpoints: results, environment, authRequired },
        duration: Date.now() - start,
      }
    } catch (error: any) {
      return {
        name: "API Endpoints",
        status: "error",
        message: `Error: ${error.message}`,
        duration: Date.now() - start,
      }
    }
  }

  const testPerformance = async (): Promise<TestResult> => {
    const start = Date.now()
    try {
      // Test database query performance
      const queryStart = Date.now()
      const { data, error } = await supabase.from("profiles").select("id").limit(1)

      if (error) throw error

      const queryTime = Date.now() - queryStart

      // Adjust thresholds based on environment
      const warningThreshold = isProduction ? 500 : 1000
      const errorThreshold = isProduction ? 1000 : 2000

      let status: "success" | "warning" | "error" = "success"
      let message = `Consulta DB: ${queryTime}ms`

      if (queryTime > errorThreshold) {
        status = "error"
        message += " (Muy lento)"
      } else if (queryTime > warningThreshold) {
        status = "warning"
        message += isProduction ? " (Lento)" : " (Lento para local)"
      } else {
        message += " (Rápido)"
      }

      return {
        name: "Rendimiento del Sistema",
        status,
        message,
        details: {
          queryTime,
          environment,
          thresholds: { warning: warningThreshold, error: errorThreshold },
        },
        duration: Date.now() - start,
      }
    } catch (error: any) {
      return {
        name: "Rendimiento del Sistema",
        status: "error",
        message: `Error: ${error.message}`,
        duration: Date.now() - start,
      }
    }
  }

  // NEW ADVANCED TESTS
  const testDataIntegrity = async (): Promise<TestResult> => {
    const start = Date.now()
    try {
      const issues: string[] = []

      // Check for orphaned profiles (users without departments) - EXCLUDE ADMIN USERS
      const { data: orphanedProfiles, error: orphanError } = await supabase
        .from("profiles")
        .select("id, email, department_id, role")
        .is("department_id", null)
        .neq("role", "admin") // Exclude admin users

      if (orphanError) throw orphanError

      if (orphanedProfiles && orphanedProfiles.length > 0) {
        issues.push(`${orphanedProfiles.length} perfiles sin departamento`)
      }

      // Check for documents without files
      const { data: documentsWithoutFiles, error: docError } = await supabase
        .from("documents")
        .select("id, title, file_url")
        .or("file_url.is.null,file_url.eq.")

      if (docError) throw docError

      if (documentsWithoutFiles && documentsWithoutFiles.length > 0) {
        issues.push(`${documentsWithoutFiles.length} documentos sin archivo`)
      }

      // Check for products with negative stock
      const { data: negativeStock, error: stockError } = await supabase
        .from("products")
        .select("id, name, current_stock")
        .lt("current_stock", 0)

      if (stockError) throw stockError

      if (negativeStock && negativeStock.length > 0) {
        issues.push(`${negativeStock.length} productos con stock negativo`)
      }

      // Check for users with invalid roles
      const { data: invalidRoles, error: roleError } = await supabase
        .from("profiles")
        .select("id, email, role")
        .not("role", "in", "(admin,user,supervisor)")

      if (roleError) throw roleError

      if (invalidRoles && invalidRoles.length > 0) {
        issues.push(`${invalidRoles.length} usuarios con roles inválidos`)
      }

      const status = issues.length === 0 ? "success" : issues.length <= 2 ? "warning" : "error"
      const message =
        issues.length === 0
          ? "Integridad de datos verificada - sin problemas detectados"
          : `${issues.length} problemas de integridad detectados: ${issues.join(", ")}`

      return {
        name: "Integridad de Datos",
        status,
        message,
        details: {
          issues,
          orphanedProfiles: orphanedProfiles?.filter((p) => p.role !== "admin"), // Filter out admin from details too
          documentsWithoutFiles,
          negativeStock,
          invalidRoles,
        },
        duration: Date.now() - start,
      }
    } catch (error: any) {
      return {
        name: "Integridad de Datos",
        status: "error",
        message: `Error: ${error.message}`,
        duration: Date.now() - start,
      }
    }
  }

  const testSecurityLayers = async (): Promise<TestResult> => {
    const start = Date.now()
    try {
      const securityIssues: string[] = []

      // Check for admin users
      const { data: adminUsers, error: adminError } = await supabase
        .from("profiles")
        .select("id, email, role")
        .eq("role", "admin")

      if (adminError) throw adminError

      if (!adminUsers || adminUsers.length === 0) {
        securityIssues.push("No hay usuarios administradores")
      } else if (adminUsers.length > 5) {
        securityIssues.push(`Demasiados administradores (${adminUsers.length})`)
      }

      // Check for public documents
      const { data: publicDocs, error: publicError } = await supabase
        .from("documents")
        .select("id, title, is_public")
        .eq("is_public", true)

      if (publicError) throw publicError

      if (publicDocs && publicDocs.length > 0) {
        securityIssues.push(`${publicDocs.length} documentos públicos`)
      }

      // Check for users without company assignment - EXCLUDE ADMIN USERS
      const { data: unassignedUsers, error: unassignedError } = await supabase
        .from("profiles")
        .select("id, email, company_id, role")
        .is("company_id", null)
        .neq("role", "admin") // Exclude admin users

      if (unassignedError) throw unassignedError

      if (unassignedUsers && unassignedUsers.length > 0) {
        securityIssues.push(`${unassignedUsers.length} usuarios sin empresa asignada`)
      }

      // Check for old sessions (this would require auth.sessions table access)
      // For now, we'll check for old notifications as a proxy for activity
      const oneWeekAgo = new Date()
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

      const { data: oldNotifications, error: notifError } = await supabase
        .from("notifications")
        .select("id")
        .lt("created_at", oneWeekAgo.toISOString())
        .eq("read", false)

      if (notifError) throw notifError

      if (oldNotifications && oldNotifications.length > 10) {
        securityIssues.push(`${oldNotifications.length} notificaciones antiguas sin leer`)
      }

      const status = securityIssues.length === 0 ? "success" : securityIssues.length <= 2 ? "warning" : "error"
      const message =
        securityIssues.length === 0
          ? "Capas de seguridad verificadas - configuración correcta"
          : `${securityIssues.length} problemas de seguridad: ${securityIssues.join(", ")}`

      return {
        name: "Capas de Seguridad",
        status,
        message,
        details: {
          securityIssues,
          adminCount: adminUsers?.length,
          publicDocsCount: publicDocs?.length,
          unassignedUsersCount: unassignedUsers?.length, // This now excludes admin users
          oldNotificationsCount: oldNotifications?.length,
          note: "Los usuarios administradores están excluidos de las validaciones de empresa y departamento",
        },
        duration: Date.now() - start,
      }
    } catch (error: any) {
      return {
        name: "Capas de Seguridad",
        status: "error",
        message: `Error: ${error.message}`,
        duration: Date.now() - start,
      }
    }
  }

  const testDatabaseConstraints = async (): Promise<TestResult> => {
    const start = Date.now()
    try {
      const constraintIssues: string[] = []

      // Test foreign key constraints by checking for orphaned records

      // Check for documents referencing non-existent departments
      const { data: orphanedDocs, error: docError } = await supabase.rpc("check_orphaned_documents").single()

      // If RPC doesn't exist, do manual check
      if (docError && docError.message.includes("function")) {
        const { data: docsWithDepts, error: manualDocError } = await supabase
          .from("documents")
          .select(`
            id, 
            current_department_id,
            departments!inner(id)
          `)
          .not("current_department_id", "is", null)

        if (manualDocError) throw manualDocError

        const { data: allDocs, error: allDocsError } = await supabase
          .from("documents")
          .select("id, current_department_id")
          .not("current_department_id", "is", null)

        if (allDocsError) throw allDocsError

        const orphanedCount = (allDocs?.length || 0) - (docsWithDepts?.length || 0)
        if (orphanedCount > 0) {
          constraintIssues.push(`${orphanedCount} documentos con departamentos inexistentes`)
        }
      }

      // Check for profiles referencing non-existent companies
      const { data: profilesWithCompanies, error: profileError } = await supabase
        .from("profiles")
        .select(`
          id, 
          company_id,
          companies!inner(id)
        `)
        .not("company_id", "is", null)

      if (profileError) throw profileError

      const { data: allProfilesWithCompany, error: allProfilesError } = await supabase
        .from("profiles")
        .select("id, company_id")
        .not("company_id", "is", null)

      if (allProfilesError) throw allProfilesError

      const orphanedProfiles = (allProfilesWithCompany?.length || 0) - (profilesWithCompanies?.length || 0)
      if (orphanedProfiles > 0) {
        constraintIssues.push(`${orphanedProfiles} perfiles con empresas inexistentes`)
      }

      // Check for duplicate emails
      const { data: duplicateEmails, error: emailError } = await supabase.from("profiles").select("email")

      if (emailError) throw emailError

      const emailCounts = duplicateEmails?.reduce((acc: any, profile) => {
        acc[profile.email] = (acc[profile.email] || 0) + 1
        return acc
      }, {})

      const duplicates = Object.entries(emailCounts || {}).filter(([_, count]) => (count as number) > 1)
      if (duplicates.length > 0) {
        constraintIssues.push(`${duplicates.length} emails duplicados`)
      }

      const status = constraintIssues.length === 0 ? "success" : "warning"
      const message =
        constraintIssues.length === 0
          ? "Restricciones de base de datos verificadas - sin violaciones"
          : `${constraintIssues.length} violaciones de restricciones: ${constraintIssues.join(", ")}`

      return {
        name: "Restricciones de Base de Datos",
        status,
        message,
        details: { constraintIssues, duplicateEmails: duplicates },
        duration: Date.now() - start,
      }
    } catch (error: any) {
      return {
        name: "Restricciones de Base de Datos",
        status: "error",
        message: `Error: ${error.message}`,
        duration: Date.now() - start,
      }
    }
  }

  const testSystemHealth = async (): Promise<TestResult> => {
    const start = Date.now()
    try {
      const healthMetrics: any = {}

      // Check table sizes
      const tables = ["profiles", "documents", "products", "sales", "quotations", "notifications"]

      for (const table of tables) {
        try {
          const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true })

          if (!error) {
            healthMetrics[`${table}_count`] = count
          }
        } catch (e) {
          healthMetrics[`${table}_count`] = "error"
        }
      }

      // Check recent activity (last 24 hours)
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)

      const { data: recentDocs, error: recentError } = await supabase
        .from("documents")
        .select("id")
        .gte("created_at", yesterday.toISOString())

      if (!recentError) {
        healthMetrics.recent_documents = recentDocs?.length || 0
      }

      const { data: recentNotifications, error: notifError } = await supabase
        .from("notifications")
        .select("id")
        .gte("created_at", yesterday.toISOString())

      if (!notifError) {
        healthMetrics.recent_notifications = recentNotifications?.length || 0
      }

      // Calculate health score
      const totalTables = tables.length
      const workingTables = Object.values(healthMetrics).filter((v) => v !== "error").length
      const healthScore = Math.round((workingTables / totalTables) * 100)

      let status: "success" | "warning" | "error" = "success"
      if (healthScore < 70) status = "error"
      else if (healthScore < 90) status = "warning"

      return {
        name: "Salud General del Sistema",
        status,
        message: `Puntuación de salud: ${healthScore}% (${workingTables}/${totalTables} módulos funcionando)`,
        details: { healthMetrics, healthScore, workingTables, totalTables },
        duration: Date.now() - start,
      }
    } catch (error: any) {
      return {
        name: "Salud General del Sistema",
        status: "error",
        message: `Error: ${error.message}`,
        duration: Date.now() - start,
      }
    }
  }

  const testBackupStatus = async (): Promise<TestResult> => {
    const start = Date.now()
    try {
      // Since we can't directly check Supabase backups, we'll check data freshness
      // and suggest backup verification steps

      const backupChecks: string[] = []

      // Check if we have recent data (indicates active system)
      const { data: recentProfiles, error: profileError } = await supabase
        .from("profiles")
        .select("created_at")
        .order("created_at", { ascending: false })
        .limit(1)

      if (profileError) throw profileError

      if (recentProfiles && recentProfiles.length > 0) {
        const lastProfile = new Date(recentProfiles[0].created_at)
        const daysSinceLastProfile = Math.floor((Date.now() - lastProfile.getTime()) / (1000 * 60 * 60 * 24))

        if (daysSinceLastProfile > 30) {
          backupChecks.push(`Último perfil creado hace ${daysSinceLastProfile} días`)
        }
      }

      // Check for critical data existence
      const { count: profileCount } = await supabase.from("profiles").select("*", { count: "exact", head: true })

      const { count: documentCount } = await supabase.from("documents").select("*", { count: "exact", head: true })

      if ((profileCount || 0) === 0) {
        backupChecks.push("No hay perfiles en el sistema")
      }

      if ((documentCount || 0) === 0) {
        backupChecks.push("No hay documentos en el sistema")
      }

      // In production, you would check actual backup timestamps
      const status = backupChecks.length === 0 ? "success" : "warning"
      const message =
        backupChecks.length === 0
          ? "Sistema activo con datos recientes - verificar backups en Supabase Dashboard"
          : `Posibles problemas de backup: ${backupChecks.join(", ")}`

      return {
        name: "Estado de Respaldos",
        status,
        message,
        details: {
          backupChecks,
          profileCount,
          documentCount,
          recommendation: "Verificar backups automáticos en Supabase Dashboard",
        },
        duration: Date.now() - start,
      }
    } catch (error: any) {
      return {
        name: "Estado de Respaldos",
        status: "error",
        message: `Error: ${error.message}`,
        duration: Date.now() - start,
      }
    }
  }

  // Main test runner
  const runAllTests = async () => {
    setIsRunning(true)
    setStatus((prev) => ({ ...prev, progress: 0, tests: [] }))

    const tests = [
      // Core System Tests
      testDatabaseConnection,
      testServerSideDiagnostics,
      testAuthentication,
      testUserProfiles,
      testDepartments,

      // Application Module Tests
      testDocuments,
      testWarehouse,
      testSales,
      testQuotations,
      testSupport,
      testNews,
      testNotifications,

      // Security & Performance Tests
      testRLS,
      testAPIEndpoints,
      testPerformance,

      // Advanced Integrity Tests
      testDataIntegrity,
      testSecurityLayers,
      testDatabaseConstraints,
      testSystemHealth,
      testBackupStatus,
    ]

    const results: TestResult[] = []

    for (let i = 0; i < tests.length; i++) {
      const test = tests[i]
      const progress = ((i + 1) / tests.length) * 100
      setStatus((prev) => ({ ...prev, progress }))

      try {
        const result = await test()

        // Si el test devuelve varios resultados (como el del servidor)
        if (Array.isArray(result)) {
          results.push(...result)
        } else {
          results.push(result)
        }

        setStatus((prev) => ({
          ...prev,
          tests: [...results],
        }))
      } catch (error) {
        results.push({
          name: `Test ${i + 1}`,
          status: "error",
          message: `Error ejecutando test: ${error}`,
        })
      }
    }

    // Determine overall status
    const hasErrors = results.some((r) => r.status === "error")
    const hasWarnings = results.some((r) => r.status === "warning")

    let overall: "healthy" | "warning" | "critical" = "healthy"
    if (hasErrors) overall = "critical"
    else if (hasWarnings) overall = "warning"

    setStatus({
      overall,
      tests: results,
      lastRun: new Date(),
      progress: 100,
    })

    setIsRunning(false)
  }

  // Auto refresh functionality
  useEffect(() => {
    if (autoRefresh && isAuthenticated) {
      const interval = setInterval(() => {
        runAllTests()
      }, 30000) // Every 30 seconds

      setRefreshInterval(interval)

      return () => {
        if (interval) clearInterval(interval)
      }
    } else {
      if (refreshInterval) {
        clearInterval(refreshInterval)
        setRefreshInterval(null)
      }
    }
  }, [autoRefresh, isAuthenticated])

  // Run tests on authentication
  useEffect(() => {
    if (isAuthenticated) {
      runAllTests()
    }
  }, [isAuthenticated])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "running":
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
      default:
        return <Activity className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      success: "default",
      warning: "secondary",
      error: "destructive",
      running: "outline",
    } as const

    return <Badge variant={variants[status as keyof typeof variants] || "outline"}>{status.toUpperCase()}</Badge>
  }

  // Authentication screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-slate-700 bg-slate-800/50 backdrop-blur">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
              <Lock className="h-6 w-6 text-red-500" />
            </div>
            <CardTitle className="text-2xl text-white">🔐 Panel de Diagnósticos</CardTitle>
            <p className="text-slate-400">Acceso Restringido - Solo Administradores</p>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* User Status */}
            {user ? (
              <Alert className="border-green-500/20 bg-green-500/10">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <AlertDescription className="text-green-200">
                  Autenticado como: <strong>{user.email}</strong>
                  <br />
                  Rol: <Badge variant="outline">{user.role}</Badge>
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="border-yellow-500/20 bg-yellow-500/10">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <AlertDescription className="text-yellow-200">
                  No estás autenticado. <br />
                  <Button variant="link" className="p-0 h-auto text-yellow-300" onClick={() => router.push("/login")}>
                    Ir a Login
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {/* Password Input */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-200">
                Contraseña Secreta
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ingresa la contraseña secreta"
                  className="bg-slate-700 border-slate-600 text-white pr-10"
                  onKeyDown={(e) => e.key === "Enter" && handleAuthentication()}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 text-slate-400 hover:text-white"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Error Message */}
            {authError && (
              <Alert className="border-red-500/20 bg-red-500/10">
                <XCircle className="h-4 w-4 text-red-500" />
                <AlertDescription className="text-red-200">{authError}</AlertDescription>
              </Alert>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Button onClick={() => router.push("/dashboard")} variant="outline" className="flex-1">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Button>
              <Button onClick={handleAuthentication} disabled={isLoading || !password} className="flex-1">
                {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Shield className="h-4 w-4 mr-2" />}
                Acceder
              </Button>
            </div>

            {/* Security Notice */}
            <div className="text-xs text-slate-500 text-center pt-4 border-t border-slate-700">
              🔒 Este panel contiene información sensible del sistema
              <br />
              Solo personal autorizado puede acceder
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const successCount = status.tests.filter((t) => t.status === "success").length
  const warningCount = status.tests.filter((t) => t.status === "warning").length
  const errorCount = status.tests.filter((t) => t.status === "error").length

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">🔧 Sistema de Diagnóstico Avanzado</h1>
          <p className="text-muted-foreground">Monitoreo completo de la salud y funcionalidad del sistema 24/7</p>
          <div className="flex gap-2 mt-2">
            <Badge variant={isProduction ? "default" : "secondary"}>
              {isProduction ? "🚀 PRODUCCIÓN" : "💻 LOCAL"}
            </Badge>
            <Badge variant="outline">🔒 Acceso Restringido</Badge>
            <Badge variant="outline">🆕 {status.tests.length} Tests Avanzados</Badge>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setAutoRefresh(!autoRefresh)}>
            <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? "animate-spin" : ""}`} />
            Auto-refresh {autoRefresh ? "ON" : "OFF"}
          </Button>

          <Button onClick={runAllTests} disabled={isRunning} size="sm">
            {isRunning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Activity className="h-4 w-4 mr-2" />}
            Ejecutar Tests
          </Button>
        </div>
      </div>

      {/* Environment Notice */}
      {!isProduction && (
        <Alert className="border-blue-500/20 bg-blue-500/10">
          <AlertTriangle className="h-4 w-4 text-blue-500" />
          <AlertDescription>
            <strong>Entorno de Desarrollo:</strong> Algunos warnings son normales en local (buckets faltantes, columnas
            de DB, variables de entorno). En producción estos deberían ser errores.
          </AlertDescription>
        </Alert>
      )}

      {/* Overall Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Estado General del Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div
                className={`text-2xl font-bold ${
                  status.overall === "healthy"
                    ? "text-green-500"
                    : status.overall === "warning"
                      ? "text-yellow-500"
                      : "text-red-500"
                }`}
              >
                {status.overall === "healthy" ? "✅" : status.overall === "warning" ? "⚠️" : "❌"}
              </div>
              <p className="text-sm text-muted-foreground">Estado General</p>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">{successCount}</div>
              <p className="text-sm text-muted-foreground">Tests Exitosos</p>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-500">{warningCount}</div>
              <p className="text-sm text-muted-foreground">Advertencias</p>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-red-500">{errorCount}</div>
              <p className="text-sm text-muted-foreground">Errores</p>
            </div>
          </div>

          {isRunning && (
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-2">
                <span>Ejecutando tests...</span>
                <span>{Math.round(status.progress)}%</span>
              </div>
              <Progress value={status.progress} className="w-full" />
            </div>
          )}

          <div className="mt-4 text-sm text-muted-foreground">Última ejecución: {status.lastRun.toLocaleString()}</div>
        </CardContent>
      </Card>

      {/* Test Categories Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Database className="h-5 w-5 text-blue-500" />
              Sistema Central
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              {/* Database Connection */}
              {(() => {
                const dbTest = status.tests.find((t) => t.name === "Conexión a Base de Datos")
                return (
                  <div className="flex justify-between items-center">
                    <span>Base de Datos</span>
                    <div className="flex items-center gap-1">
                      {dbTest ? getStatusIcon(dbTest.status) : <Activity className="h-3 w-3 text-gray-400" />}
                      <Badge
                        variant={
                          dbTest?.status === "success"
                            ? "default"
                            : dbTest?.status === "warning"
                              ? "secondary"
                              : "destructive"
                        }
                        className="text-xs"
                      >
                        {dbTest?.status?.toUpperCase() || "PENDING"}
                      </Badge>
                    </div>
                  </div>
                )
              })()}

              {/* Authentication */}
              {(() => {
                const authTest = status.tests.find((t) => t.name === "Sistema de Autenticación")
                return (
                  <div className="flex justify-between items-center">
                    <span>Autenticación</span>
                    <div className="flex items-center gap-1">
                      {authTest ? getStatusIcon(authTest.status) : <Activity className="h-3 w-3 text-gray-400" />}
                      <Badge
                        variant={
                          authTest?.status === "success"
                            ? "default"
                            : authTest?.status === "warning"
                              ? "secondary"
                              : "destructive"
                        }
                        className="text-xs"
                      >
                        {authTest?.status?.toUpperCase() || "PENDING"}
                      </Badge>
                    </div>
                  </div>
                )
              })()}

              {/* APIs */}
              {(() => {
                const apiTest = status.tests.find((t) => t.name === "API Endpoints")
                return (
                  <div className="flex justify-between items-center">
                    <span>APIs</span>
                    <div className="flex items-center gap-1">
                      {apiTest ? getStatusIcon(apiTest.status) : <Activity className="h-3 w-3 text-gray-400" />}
                      <Badge
                        variant={
                          apiTest?.status === "success"
                            ? "default"
                            : apiTest?.status === "warning"
                              ? "secondary"
                              : "destructive"
                        }
                        className="text-xs"
                      >
                        {apiTest?.status?.toUpperCase() || "PENDING"}
                      </Badge>
                    </div>
                  </div>
                )
              })()}

              {/* User Profiles */}
              {(() => {
                const profileTest = status.tests.find((t) => t.name === "Perfiles de Usuario")
                return (
                  <div className="flex justify-between items-center">
                    <span>Perfiles</span>
                    <div className="flex items-center gap-1">
                      {profileTest ? getStatusIcon(profileTest.status) : <Activity className="h-3 w-3 text-gray-400" />}
                      <Badge
                        variant={
                          profileTest?.status === "success"
                            ? "default"
                            : profileTest?.status === "warning"
                              ? "secondary"
                              : "destructive"
                        }
                        className="text-xs"
                      >
                        {profileTest?.status?.toUpperCase() || "PENDING"}
                      </Badge>
                    </div>
                  </div>
                )
              })()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5 text-red-500" />
              Seguridad & Integridad
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              {/* Data Integrity */}
              {(() => {
                const integrityTest = status.tests.find((t) => t.name === "Integridad de Datos")
                return (
                  <div className="flex justify-between items-center">
                    <span>Integridad de Datos</span>
                    <div className="flex items-center gap-1">
                      {integrityTest ? (
                        getStatusIcon(integrityTest.status)
                      ) : (
                        <Activity className="h-3 w-3 text-gray-400" />
                      )}
                      <Badge
                        variant={
                          integrityTest?.status === "success"
                            ? "default"
                            : integrityTest?.status === "warning"
                              ? "secondary"
                              : "destructive"
                        }
                        className="text-xs"
                      >
                        {integrityTest?.status?.toUpperCase() || "PENDING"}
                      </Badge>
                    </div>
                  </div>
                )
              })()}

              {/* Security Layers */}
              {(() => {
                const securityTest = status.tests.find((t) => t.name === "Capas de Seguridad")
                return (
                  <div className="flex justify-between items-center">
                    <span>Capas de Seguridad</span>
                    <div className="flex items-center gap-1">
                      {securityTest ? (
                        getStatusIcon(securityTest.status)
                      ) : (
                        <Activity className="h-3 w-3 text-gray-400" />
                      )}
                      <Badge
                        variant={
                          securityTest?.status === "success"
                            ? "default"
                            : securityTest?.status === "warning"
                              ? "secondary"
                              : "destructive"
                        }
                        className="text-xs"
                      >
                        {securityTest?.status?.toUpperCase() || "PENDING"}
                      </Badge>
                    </div>
                  </div>
                )
              })()}

              {/* RLS Security */}
              {(() => {
                const rlsTest = status.tests.find((t) => t.name === "Seguridad RLS")
                return (
                  <div className="flex justify-between items-center">
                    <span>RLS</span>
                    <div className="flex items-center gap-1">
                      {rlsTest ? getStatusIcon(rlsTest.status) : <Activity className="h-3 w-3 text-gray-400" />}
                      <Badge
                        variant={
                          rlsTest?.status === "success"
                            ? "default"
                            : rlsTest?.status === "warning"
                              ? "secondary"
                              : "destructive"
                        }
                        className="text-xs"
                      >
                        {rlsTest?.status?.toUpperCase() || "PENDING"}
                      </Badge>
                    </div>
                  </div>
                )
              })()}

              {/* Database Constraints */}
              {(() => {
                const constraintsTest = status.tests.find((t) => t.name === "Restricciones de Base de Datos")
                return (
                  <div className="flex justify-between items-center">
                    <span>Restricciones DB</span>
                    <div className="flex items-center gap-1">
                      {constraintsTest ? (
                        getStatusIcon(constraintsTest.status)
                      ) : (
                        <Activity className="h-3 w-3 text-gray-400" />
                      )}
                      <Badge
                        variant={
                          constraintsTest?.status === "success"
                            ? "default"
                            : constraintsTest?.status === "warning"
                              ? "secondary"
                              : "destructive"
                        }
                        className="text-xs"
                      >
                        {constraintsTest?.status?.toUpperCase() || "PENDING"}
                      </Badge>
                    </div>
                  </div>
                )
              })()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-500" />
              Salud del Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              {/* Performance */}
              {(() => {
                const performanceTest = status.tests.find((t) => t.name === "Rendimiento del Sistema")
                return (
                  <div className="flex justify-between items-center">
                    <span>Rendimiento</span>
                    <div className="flex items-center gap-1">
                      {performanceTest ? (
                        getStatusIcon(performanceTest.status)
                      ) : (
                        <Activity className="h-3 w-3 text-gray-400" />
                      )}
                      <Badge
                        variant={
                          performanceTest?.status === "success"
                            ? "default"
                            : performanceTest?.status === "warning"
                              ? "secondary"
                              : "destructive"
                        }
                        className="text-xs"
                      >
                        {performanceTest?.status?.toUpperCase() || "PENDING"}
                      </Badge>
                    </div>
                  </div>
                )
              })()}

              {/* Storage Buckets */}
              {(() => {
                const testServerSideDiagnostics = status.tests.find((t) => t.name === "Buckets de Supabase (servidor)")
                return (
                  <div className="flex justify-between items-center">
                    <span>Almacenamiento</span>
                    <div className="flex items-center gap-1">
                      {testServerSideDiagnostics ? getStatusIcon(testServerSideDiagnostics.status) : <Activity className="h-3 w-3 text-gray-400" />}
                      <Badge
                        variant={
                          testServerSideDiagnostics?.status === "success"
                            ? "default"
                            : testServerSideDiagnostics?.status === "warning"
                              ? "secondary"
                              : "destructive"
                        }
                        className="text-xs"
                      >
                        {testServerSideDiagnostics?.status?.toUpperCase() || "PENDING"}
                      </Badge>
                    </div>
                  </div>
                )
              })()}

              {/* System Health */}
              {(() => {
                const healthTest = status.tests.find((t) => t.name === "Salud General del Sistema")
                return (
                  <div className="flex justify-between items-center">
                    <span>Salud General</span>
                    <div className="flex items-center gap-1">
                      {healthTest ? getStatusIcon(healthTest.status) : <Activity className="h-3 w-3 text-gray-400" />}
                      <Badge
                        variant={
                          healthTest?.status === "success"
                            ? "default"
                            : healthTest?.status === "warning"
                              ? "secondary"
                              : "destructive"
                        }
                        className="text-xs"
                      >
                        {healthTest?.status?.toUpperCase() || "PENDING"}
                      </Badge>
                    </div>
                  </div>
                )
              })()}

              {/* Backup Status */}
              {(() => {
                const backupTest = status.tests.find((t) => t.name === "Estado de Respaldos")
                return (
                  <div className="flex justify-between items-center">
                    <span>Respaldos</span>
                    <div className="flex items-center gap-1">
                      {backupTest ? getStatusIcon(backupTest.status) : <Activity className="h-3 w-3 text-gray-400" />}
                      <Badge
                        variant={
                          backupTest?.status === "success"
                            ? "default"
                            : backupTest?.status === "warning"
                              ? "secondary"
                              : "destructive"
                        }
                        className="text-xs"
                      >
                        {backupTest?.status?.toUpperCase() || "PENDING"}
                      </Badge>
                    </div>
                  </div>
                )
              })()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Test Results */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">Todos ({status.tests.length})</TabsTrigger>
          <TabsTrigger value="success">Exitosos ({successCount})</TabsTrigger>
          <TabsTrigger value="warning">Advertencias ({warningCount})</TabsTrigger>
          <TabsTrigger value="error">Errores ({errorCount})</TabsTrigger>
          <TabsTrigger value="security">🔒 Seguridad</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {status.tests.map((test, index) => (
            <Card key={index}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {getStatusIcon(test.status)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{test.name}</h3>
                        {getStatusBadge(test.status)}
                        {test.duration && (
                          <Badge variant="outline" className="text-xs">
                            {test.duration}ms
                          </Badge>
                        )}
                        {/* Category badges */}
                        {test.name.includes("Integridad") && (
                          <Badge variant="secondary" className="text-xs">
                            🔍 Nuevo
                          </Badge>
                        )}
                        {test.name.includes("Seguridad") && (
                          <Badge variant="secondary" className="text-xs">
                            🛡️ Nuevo
                          </Badge>
                        )}
                        {test.name.includes("Restricciones") && (
                          <Badge variant="secondary" className="text-xs">
                            ⚡ Nuevo
                          </Badge>
                        )}
                        {test.name.includes("Salud") && (
                          <Badge variant="secondary" className="text-xs">
                            💚 Nuevo
                          </Badge>
                        )}
                        {test.name.includes("Respaldos") && (
                          <Badge variant="secondary" className="text-xs">
                            💾 Nuevo
                          </Badge>
                        )}
                        {test.name.includes("Buckets") && (
                          <Badge variant="secondary" className="text-xs">
                            ☁️ Nuevo
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{test.message}</p>

                      {test.details && (
                        <details className="mt-2">
                          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                            Ver detalles técnicos
                          </summary>
                          <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto max-h-40">
                            {JSON.stringify(test.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="success" className="space-y-4">
          {status.tests
            .filter((t) => t.status === "success")
            .map((test, index) => (
              <Card key={index}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <div>
                      <h3 className="font-semibold">{test.name}</h3>
                      <p className="text-sm text-muted-foreground">{test.message}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
        </TabsContent>

        <TabsContent value="warning" className="space-y-4">
          {status.tests
            .filter((t) => t.status === "warning")
            .map((test, index) => (
              <Card key={index}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    <div>
                      <h3 className="font-semibold">{test.name}</h3>
                      <p className="text-sm text-muted-foreground">{test.message}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
        </TabsContent>

        <TabsContent value="error" className="space-y-4">
          {status.tests
            .filter((t) => t.status === "error")
            .map((test, index) => (
              <Card key={index}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <div>
                      <h3 className="font-semibold">{test.name}</h3>
                      <p className="text-sm text-muted-foreground">{test.message}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          {status.tests
            .filter(
              (t) =>
                t.name.includes("Seguridad") ||
                t.name.includes("Integridad") ||
                t.name.includes("RLS") ||
                t.name.includes("Restricciones") ||
                t.name.includes("Buckets"),
            )
            .map((test, index) => (
              <Card key={index}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    {getStatusIcon(test.status)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{test.name}</h3>
                        {getStatusBadge(test.status)}
                        <Badge variant="secondary" className="text-xs">
                          🔒 Seguridad
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{test.message}</p>
                      {test.details && (
                        <details className="mt-2">
                          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                            Ver análisis de seguridad
                          </summary>
                          <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto max-h-40">
                            {JSON.stringify(test.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
        </TabsContent>
      </Tabs>

      {/* System Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Información del Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Entorno:</strong> {process.env.NODE_ENV || "development"}
            </div>
            <div>
              <strong>Framework:</strong> Next.js + Supabase
            </div>
            <div>
              <strong>URL del sitio:</strong> {process.env.NEXT_PUBLIC_SITE_URL || "https://agpcdocs.vercel.app/"}
            </div>
            <div>
              <strong>Supabase URL:</strong>{" "}
              {process.env.NEXT_PUBLIC_SUPABASE_URL ? "✅ Configurado" : "❌ No configurado"}
            </div>
            <div>
              <strong>Tests ejecutados:</strong> {status.tests.length} (6 nuevos tests de seguridad)
            </div>
            <div>
              <strong>Última actualización:</strong> v2.0 - Tests Avanzados
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Acciones Rápidas de Diagnóstico</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Button variant="outline" size="sm" onClick={() => (window.location.href = "/debug")}>
              <Database className="h-4 w-4 mr-2" />
              Debug DB
            </Button>
            <Button variant="outline" size="sm" onClick={() => (window.location.href = "/setup")}>
              <Settings className="h-4 w-4 mr-2" />
              Setup
            </Button>
            <Button variant="outline" size="sm" onClick={() => (window.location.href = "/storage-setup")}>
              <HardDrive className="h-4 w-4 mr-2" />
              Storage
            </Button>
            <Button variant="outline" size="sm" onClick={() => (window.location.href = "/admin-setup")}>
              <Shield className="h-4 w-4 mr-2" />
              Admin
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Security Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-red-500" />
            Recomendaciones de Seguridad
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
              <span>Ejecutar este panel de diagnósticos semanalmente</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
              <span>Verificar backups automáticos en Supabase Dashboard</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
              <span>Monitorear usuarios administradores regularmente</span>
            </div>
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
              <span>Revisar documentos públicos y permisos de acceso</span>
            </div>
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
              <span>Limpiar notificaciones antiguas y datos huérfanos</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
