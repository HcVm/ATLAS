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

const secpass = process.env.NEXT_PUBLIC_SECRET_PASSWORD;

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
  const start = Date.now();
  try {
    const res = await fetch("/api/system-status");
    const json = await res.json();

    const results: TestResult[] = [];

    results.push({
      name: "Variables de Entorno (servidor)",
      status: json.envCheck.status,
      message: json.envCheck.message,
      details: json.envCheck,
      duration: Date.now() - start,
    });

    if (json.bucketCheck) {
      results.push({
        name: "Buckets de Supabase (servidor)",
        status: json.bucketCheck.status,
        message: json.bucketCheck.message,
        details: json.bucketCheck,
        duration: Date.now() - start,
      });
    }

    return results;
  } catch (error: any) {
    return [
      {
        name: "Diagnóstico de servidor",
        status: "error",
        message: `Error al consultar la API: ${error.message}`,
        duration: Date.now() - start,
      },
    ];
  }
};


  
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
      const endpoints = ["/api/departments", "/api/users", "/api/news"]

      const results = await Promise.allSettled(
        endpoints.map((endpoint) =>
          fetch(endpoint, { method: "GET" }).then((res) => ({ endpoint, status: res.status, ok: res.ok })),
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

  // Main test runner
  const runAllTests = async () => {
    setIsRunning(true)
    setStatus((prev) => ({ ...prev, progress: 0, tests: [] }))

    const tests = [
      testDatabaseConnection,
      testServerSideDiagnostics,
      testAuthentication,
      testUserProfiles,
      testDepartments,
      testDocuments,
      testWarehouse,
      testSales,
      testQuotations,
      testSupport,
      testNews,
      testNotifications,
      testRLS,
      testAPIEndpoints,
      testPerformance,
    ]

    const results: TestResult[] = [];

    for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    const progress = ((i + 1) / tests.length) * 100;
    setStatus((prev) => ({ ...prev, progress }));

    try {
        const result = await test();

        // Si el test devuelve varios resultados (como el del servidor)
        if (Array.isArray(result)) {
        results.push(...result);
        } else {
        results.push(result);
        }

        setStatus((prev) => ({
        ...prev,
        tests: [...results],
        }));
    } catch (error) {
        results.push({
        name: `Test ${i + 1}`,
        status: "error",
        message: `Error ejecutando test: ${error}`,
        });
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

      {/* Test Results */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">Todos ({status.tests.length})</TabsTrigger>
          <TabsTrigger value="success">Exitosos ({successCount})</TabsTrigger>
          <TabsTrigger value="warning">Advertencias ({warningCount})</TabsTrigger>
          <TabsTrigger value="error">Errores ({errorCount})</TabsTrigger>
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
                      </div>
                      <p className="text-sm text-muted-foreground">{test.message}</p>

                      {test.details && (
                        <details className="mt-2">
                          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                            Ver detalles
                          </summary>
                          <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto">
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
              <strong>Framework de Desarrollo:</strong> {process.env.npm_package_version || "NEXT JS"}
            </div>
            <div>
              <strong>URL del sitio:</strong> {process.env.NEXT_PUBLIC_SITE_URL || "https://agpcdocs.vercel.app/"}
            </div>
            <div>
              <strong>Supabase URL:</strong>{" "}
              {process.env.NEXT_PUBLIC_SUPABASE_URL ? "✅ Configurado" : "❌ No configurado"}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Acciones Rápidas</CardTitle>
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
    </div>
  )
}
